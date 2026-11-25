import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

const nodeRequire = createRequire(import.meta.url);

function load(file, mocks = {}, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, require: name => {
    if (name in mocks) return mocks[name];
    return nodeRequire(name);
  }, Date, Error, Array, String, JSON, Promise, Number, console: { error() {}, info() {} }, ...globals });
  return exports;
}
const { runRetention } = load('src/lib/retention.ts');

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-06-15T12:00:00.000Z');

function timestampDaysAgo(days) {
  return new Date(NOW.getTime() - days * DAY).toISOString();
}

function dateDaysAgo(days) {
  return timestampDaysAgo(days).slice(0, 10);
}

/** Tetto del corpo di risposta PostgREST, che il client finto riproduce. */
const API_PAGE_ROWS = 1000;

/** Client Supabase minimo: filtra e cancella in memoria e registra le chiamate. */
function fakeClient(seed = {}) {
  const tables = structuredClone(seed);
  const calls = [];
  const removed = [];

  function from(table) {
    const filters = [];
    const state = { op: 'select', returning: false, range: null };
    const chain = {
      select() {
        if (state.op === 'delete') state.returning = true;
        return chain;
      },
      delete() {
        state.op = 'delete';
        return chain;
      },
      eq(column, value) {
        filters.push({ column, match: row => row[column] === value });
        return chain;
      },
      in(column, values) {
        filters.push({ column, values, match: row => values.includes(row[column]) });
        return chain;
      },
      lt(column, value) {
        filters.push({ column, value, match: row => row[column] < value });
        return chain;
      },
      order() {
        return chain;
      },
      range(from, to) {
        state.range = [from, to];
        return chain;
      },
      then(resolve, reject) {
        try {
          resolve(execute());
        } catch (error) {
          reject(error);
        }
      },
    };

    function execute() {
      const rows = tables[table] ?? [];
      const matched = rows.filter(row => filters.every(filter => filter.match(row)));
      calls.push({
        table,
        op: state.op,
        filters: filters.map(filter =>
          'values' in filter ? { column: filter.column, values: filter.values } : { column: filter.column, value: filter.value },
        ),
      });
      if (state.op === 'delete') {
        tables[table] = rows.filter(row => !matched.includes(row));
        return {
          data: state.returning ? matched : null,
          count: matched.length,
          error: null,
        };
      }
      // Come l'API vera: il corpo non supera mai il tetto di righe.
      const [from, to] = state.range ?? [0, API_PAGE_ROWS - 1];
      return {
        data: matched.slice(from, to + 1).slice(0, API_PAGE_ROWS),
        count: matched.length,
        error: null,
      };
    }

    return chain;
  }

  return {
    from,
    storage: {
      from(bucket) {
        return {
          async remove(paths) {
            calls.push({ table: `storage:${bucket}`, op: 'remove', filters: [] });
            removed.push(...paths);
            return { data: paths.map(path => ({ name: path })), error: null };
          },
        };
      },
    },
    calls,
    removed,
    tables,
  };
}

/** Gli oggetti restituiti da runRetention nascono in un altro realm: il round-trip li rende confrontabili. */
function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function cutoff(client, table, column) {
  const call = client.calls.find(
    entry => entry.table === table && entry.filters.some(filter => filter.column === column),
  );
  assert.ok(call, `chiamata su ${table} con filtro ${column}`);
  return call.filters.find(filter => filter.column === column).value;
}

function seed() {
  return {
    newsletter_subscribers: [
      { id: 'news-old', created_at: timestampDaysAgo(731) },
      { id: 'news-edge', created_at: timestampDaysAgo(730) },
      { id: 'news-recent', created_at: timestampDaysAgo(90) },
    ],
    booking_slots: [
      { id: 'slot-old', date: dateDaysAgo(366) },
      { id: 'slot-edge', date: dateDaysAgo(365) },
      { id: 'slot-recent', date: dateDaysAgo(7) },
    ],
    booking_reservations: [
      { id: 'res-old', slot_id: 'slot-old' },
      { id: 'res-edge', slot_id: 'slot-edge' },
      { id: 'res-recent', slot_id: 'slot-recent' },
    ],
    reviews: [
      { id: 'review-old', created_at: timestampDaysAgo(1827) },
      { id: 'review-edge', created_at: timestampDaysAgo(1826) },
      { id: 'review-recent', created_at: timestampDaysAgo(30) },
    ],
    activity_registrations: [
      {
        id: 'reg-old',
        status: 'pending',
        created_at: timestampDaysAgo(400),
        files: [{ path: 'activity-registrations/old-a.pdf' }, { path: 'activity-registrations/old-b.pdf' }],
      },
      {
        id: 'reg-recent',
        status: 'pending',
        created_at: timestampDaysAgo(100),
        files: [{ path: 'activity-registrations/recent.pdf' }],
      },
      {
        id: 'reg-received',
        status: 'received',
        created_at: timestampDaysAgo(400),
        files: [{ path: 'activity-registrations/received.pdf' }],
      },
      {
        id: 'reg-declined',
        status: 'declined',
        created_at: timestampDaysAgo(400),
        files: [{ path: 'activity-registrations/declined.pdf' }],
      },
      {
        id: 'reg-declined-recent',
        status: 'declined',
        created_at: timestampDaysAgo(100),
        files: [{ path: 'activity-registrations/declined-recent.pdf' }],
      },
      {
        id: 'reg-accepted',
        status: 'reviewed',
        created_at: timestampDaysAgo(400),
        files: [{ path: 'activity-registrations/accepted.pdf' }],
      },
    ],
  };
}

const expired = {
  newsletterSubscribers: 1,
  bookingReservations: 1,
  reviews: 1,
  activityRegistrations: 2,
  registrationFiles: 3,
  bookingRateLimits: 0,
  registrationRateLimits: 0,
};

test('Retention in dry-run counts expired rows without deleting or touching storage', async () => {
  const client = fakeClient(seed());
  const report = await runRetention(client, { now: NOW });

  assert.equal(report.mode, 'dry-run');
  assert.equal(report.executedAt, NOW.toISOString());
  assert.deepEqual(plain(report.errors), []);
  assert.deepEqual(plain(report.deleted), expired);
  assert.equal(client.calls.filter(call => call.op === 'delete' || call.op === 'remove').length, 0);
  assert.equal(client.tables.newsletter_subscribers.length, 3);
  assert.equal(client.tables.booking_reservations.length, 3);
  assert.equal(client.tables.reviews.length, 3);
  assert.equal(client.tables.activity_registrations.length, 6);
  assert.deepEqual(client.removed, []);
});

test('Retention windows use 24 months for newsletter, 12 for bookings and 5 years for reviews', async () => {
  const client = fakeClient(seed());
  await runRetention(client, { enabled: true, now: NOW });

  assert.equal(cutoff(client, 'newsletter_subscribers', 'created_at'), timestampDaysAgo(730));
  assert.equal(cutoff(client, 'booking_slots', 'date'), dateDaysAgo(365));
  assert.equal(cutoff(client, 'reviews', 'created_at'), timestampDaysAgo(1826));
  assert.equal(cutoff(client, 'activity_registrations', 'created_at'), timestampDaysAgo(365));
  const bookingDelete = client.calls.find(
    call => call.op === 'delete' && call.table === 'booking_reservations',
  );
  assert.equal(bookingDelete.filters[0].column, 'slot_id');
});

test('Retention deletes only rows past the thresholds and keeps booking slots', async () => {
  const client = fakeClient(seed());
  const report = await runRetention(client, { enabled: true, now: NOW });

  assert.equal(report.mode, 'delete');
  assert.deepEqual(plain(report.errors), []);
  assert.deepEqual(plain(report.deleted), expired);
  assert.deepEqual(client.tables.newsletter_subscribers.map(row => row.id), ['news-edge', 'news-recent']);
  assert.deepEqual(client.tables.booking_reservations.map(row => row.id), ['res-edge', 'res-recent']);
  assert.deepEqual(client.tables.reviews.map(row => row.id), ['review-edge', 'review-recent']);
  assert.deepEqual(client.tables.activity_registrations.map(row => row.id), [
    'reg-recent',
    'reg-received',
    'reg-declined-recent',
    'reg-accepted',
  ]);
  assert.equal(client.tables.booking_slots.length, 3);
  // La traccia conserva gli ID cancellati per l'audit.
  assert.deepEqual(plain(report.ids.newsletterSubscribers), ['news-old']);
  assert.deepEqual(plain(report.ids.bookingReservations), ['res-old']);
  assert.deepEqual(plain(report.ids.reviews), ['review-old']);
  assert.deepEqual(plain(report.ids.activityRegistrations).sort(), ['reg-old', 'reg-declined'].sort());
  assert.equal(report.ids.registrationFiles.length, 3);
});

test('Retention dry-run lists the eligible record ids without deleting anything', async () => {
  const client = fakeClient(seed());
  const report = await runRetention(client, { now: NOW });

  assert.equal(report.mode, 'dry-run');
  assert.deepEqual(plain(report.ids.newsletterSubscribers), ['news-old']);
  assert.deepEqual(plain(report.ids.bookingReservations), ['res-old']);
  assert.deepEqual(plain(report.ids.reviews), ['review-old']);
  assert.deepEqual(plain(report.ids.activityRegistrations).sort(), ['reg-old', 'reg-declined'].sort());
  assert.deepEqual(
    plain(report.ids.registrationFiles).sort(),
    [
      'activity-registrations/old-a.pdf',
      'activity-registrations/old-b.pdf',
      'activity-registrations/declined.pdf',
    ].sort(),
  );
  assert.equal(client.calls.filter(call => call.op === 'delete' || call.op === 'remove').length, 0);
});

test('Retention deletes activity registrations in chunks of 100 ids', async () => {
  const client = fakeClient({
    activity_registrations: Array.from({ length: 250 }, (_, index) => ({
      id: `reg-${index}`,
      status: 'pending',
      created_at: timestampDaysAgo(400),
      files: [],
    })),
  });
  const report = await runRetention(client, { enabled: true, now: NOW });

  const deletes = client.calls.filter(
    call => call.op === 'delete' && call.table === 'activity_registrations',
  );
  assert.deepEqual(
    deletes.map(call => call.filters[0].values.length),
    [100, 100, 50],
  );
  assert.equal(report.deleted.activityRegistrations, 250);
  assert.equal(client.tables.activity_registrations.length, 0);
});

test('Retention dry-run counts registrations and attachments beyond the API page limit', async () => {
  const total = 1200;
  const client = fakeClient({
    activity_registrations: Array.from({ length: total }, (_, index) => ({
      id: `reg-${String(index).padStart(4, '0')}`,
      status: index % 2 === 0 ? 'declined' : 'pending',
      created_at: timestampDaysAgo(400),
      files: [
        { path: `activity-registrations/${index}-a.pdf` },
        { path: `activity-registrations/${index}-b.pdf` },
      ],
    })),
  });

  const report = await runRetention(client, { now: NOW });

  assert.equal(report.mode, 'dry-run');
  assert.equal(report.deleted.activityRegistrations, total);
  assert.equal(report.deleted.registrationFiles, total * 2);
  assert.equal(report.ids.activityRegistrations.length, total);
  assert.equal(report.ids.registrationFiles.length, total * 2);
  const selects = client.calls.filter(
    call => call.op === 'select' && call.table === 'activity_registrations',
  );
  assert.equal(selects.length, 2, 'il dry-run pagina finché il count non è raggiunto');
  assert.equal(client.calls.filter(call => call.op === 'delete' || call.op === 'remove').length, 0);
});

test('Retention deletes every eligible registration beyond the API page limit and its files', async () => {
  const total = 1200;
  const client = fakeClient({
    activity_registrations: Array.from({ length: total }, (_, index) => ({
      id: `reg-${String(index).padStart(4, '0')}`,
      status: index % 2 === 0 ? 'declined' : 'pending',
      created_at: timestampDaysAgo(400),
      files: [
        { path: `activity-registrations/${index}-a.pdf` },
        { path: `activity-registrations/${index}-b.pdf` },
      ],
    })),
  });

  const report = await runRetention(client, { enabled: true, now: NOW });

  assert.equal(report.mode, 'delete');
  assert.deepEqual(plain(report.errors), []);
  assert.equal(report.deleted.activityRegistrations, total);
  assert.equal(report.deleted.registrationFiles, total * 2);
  assert.equal(report.ids.activityRegistrations.length, total);
  assert.equal(client.removed.length, total * 2);
  assert.equal(client.tables.activity_registrations.length, 0, 'nessuna riga idonea resta');
  const selects = client.calls.filter(
    call => call.op === 'select' && call.table === 'activity_registrations',
  );
  assert.equal(selects.length, 2, 'la lettura pagina finché il count non è raggiunto');
});

test('Retention removes registration attachments before deleting their rows', async () => {
  const client = fakeClient(seed());
  await runRetention(client, { enabled: true, now: NOW });

  const removeIndex = client.calls.findIndex(call => call.op === 'remove');
  const deleteIndex = client.calls.findIndex(
    call => call.op === 'delete' && call.table === 'activity_registrations',
  );
  assert.ok(removeIndex >= 0, 'allegati rimossi');
  assert.ok(deleteIndex >= 0, 'righe cancellate');
  assert.ok(removeIndex < deleteIndex);
  assert.equal(client.calls[removeIndex].table, 'storage:registration-files');
  assert.deepEqual(client.removed, [
    'activity-registrations/old-a.pdf',
    'activity-registrations/old-b.pdf',
    'activity-registrations/declined.pdf',
  ]);
});

const { saveRetentionTrace } = load('src/lib/retention-trace.ts');

function emptyReport(overrides = {}) {
  return {
    mode: 'delete',
    executedAt: '2026-11-25T03:04:05.678Z',
    deleted: {
      newsletterSubscribers: 0,
      bookingReservations: 0,
      reviews: 0,
      activityRegistrations: 0,
      registrationFiles: 0,
      bookingRateLimits: 0,
      registrationRateLimits: 0,
    },
    errors: [],
    ids: {
      newsletterSubscribers: [],
      bookingReservations: [],
      reviews: [],
      activityRegistrations: [],
      registrationFiles: [],
      bookingRateLimits: [],
      registrationRateLimits: [],
    },
    ...overrides,
  };
}

/** Storage finto: bucket, upload di snapshot e latest, con guasti iniettabili. */
function traceClient({
  bucketError = null,
  uploadError = null,
  runs = [],
  listError = null,
  removeError = null,
} = {}) {
  const uploads = [];
  const created = [];
  const removed = [];
  return {
    uploads,
    created,
    removed,
    storage: {
      async createBucket(name, options) {
        created.push({ name, options });
        return { data: name, error: bucketError };
      },
      from(name) {
        return {
          async upload(path, body, options) {
            if (uploadError) return { data: null, error: uploadError };
            uploads.push({ bucket: name, path, body, options });
            return { data: { path }, error: null };
          },
          async list(prefix) {
            if (listError) return { data: null, error: listError };
            return {
              data: runs.map(entry => ({ name: entry })),
              error: null,
            };
          },
          async remove(paths) {
            if (removeError) return { data: null, error: removeError };
            removed.push(...paths);
            return { data: paths.map(path => ({ name: path })), error: null };
          },
        };
      },
    },
  };
}

test('Retention trace writes one immutable object per run plus latest.json', async () => {
  const client = traceClient();
  const report = emptyReport();

  const { path, error } = await saveRetentionTrace(client, report);

  assert.equal(error, null);
  assert.equal(path, 'runs/2026-11-25T03-04-05-678Z.json');
  assert.deepEqual(client.created.map(entry => entry.name), ['retention-runs']);
  assert.equal(client.created[0].options.public, false);
  assert.deepEqual(client.uploads.map(entry => entry.path), [path, 'latest.json']);
  assert.equal(client.uploads[0].options.upsert, false);
  assert.equal(client.uploads[1].options.upsert, true);
  assert.equal(client.uploads[0].options.contentType, 'application/json');
  const snapshot = JSON.parse(client.uploads[0].body);
  assert.equal(snapshot.outcome, 'ok');
  assert.equal(snapshot.source, 'cron');
  assert.equal(snapshot.mode, 'delete');
  assert.equal(snapshot.executedAt, report.executedAt);
  assert.deepEqual(snapshot.deleted, report.deleted);
  assert.deepEqual(snapshot.ids, report.ids);
  assert.equal(snapshot.pruned, 0);
  assert.equal(snapshot.alerts.length, 0);
  assert.match(snapshot.recordedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test('Retention trace records pruned rows and alerted channels', async () => {
  const client = traceClient();

  const { error } = await saveRetentionTrace(client, emptyReport(), {
    pruned: 7,
    alerts: ['webhook'],
  });

  assert.equal(error, null);
  const snapshot = JSON.parse(client.uploads[0].body);
  assert.equal(snapshot.pruned, 7);
  assert.equal(snapshot.alerts.join(','), 'webhook');
  assert.equal(JSON.parse(client.uploads[1].body).pruned, 7);
});

test('Retention trace tolerates an existing bucket and marks failures as outcome error', async () => {
  const client = traceClient({
    bucketError: { message: 'The resource already exists' },
  });
  const report = emptyReport({ errors: ['newsletterSubscribers: timeout'] });

  const { path, error } = await saveRetentionTrace(client, report);

  assert.equal(error, null);
  assert.ok(path);
  const snapshot = JSON.parse(client.uploads[0].body);
  assert.equal(snapshot.outcome, 'error');
  assert.deepEqual(snapshot.errors, ['newsletterSubscribers: timeout']);
});

test('Retention trace reports a broken bucket and a failed upload', async () => {
  const brokenBucket = await saveRetentionTrace(
    traceClient({ bucketError: { message: 'permesso negato' } }),
    emptyReport(),
  );
  assert.equal(brokenBucket.path, null);
  assert.match(brokenBucket.error, /bucket retention-runs: permesso negato/);

  const brokenUpload = await saveRetentionTrace(
    traceClient({ uploadError: { message: 'quota superata' } }),
    emptyReport(),
  );
  assert.equal(brokenUpload.path, null);
  assert.match(brokenUpload.error, /trace: quota superata/);
});

/** Isola le variabili d'ambiente del job e le ripristina comunque. */
async function withEnv(env, run) {
  const saved = new Map();
  for (const [key, value] of Object.entries(env)) {
    saved.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return await run();
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

const jobEnv = {
  CRON_SECRET: 'cron-token',
  RETENTION_ENABLED: 'false',
  NEXT_PUBLIC_SUPABASE_URL: 'https://prova.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role',
};

function retentionRoute({
  report = emptyReport(),
  bucketError = null,
  uploadError = null,
  runs = [],
  listError = null,
  removeError = null,
  alert = { sent: [], error: null },
} = {}) {
  const client = traceClient({ bucketError, uploadError, runs, listError, removeError });
  const sentAlerts = [];
  const runOptions = [];
  const api = load(
    'src/app/api/maintenance/retention/route.ts',
    {
      'next/server': {
        NextResponse: { json: (body, init) => Response.json(body, init) },
      },
      '@supabase/supabase-js': { createClient: () => client },
      '@/lib/retention': {
        runRetention: async (_client, options) => {
          runOptions.push(options);
          return report;
        },
      },
      '@/lib/retention-trace': load('src/lib/retention-trace.ts'),
      '@/lib/retention-alert': {
        alertRetentionFailure: async (failedReport, failures) => {
          sentAlerts.push({ report: failedReport, failures: [...failures] });
          return alert;
        },
      },
    },
    { process, Buffer, URL },
  );
  return { api, client, sentAlerts, runOptions };
}

const cronCall = (token = 'cron-token') =>
  new Request('https://local/api/maintenance/retention', {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });

test('Retention endpoint stores the run trace and answers 200 on success', async () => {
  await withEnv(jobEnv, async () => {
    const { api, client } = retentionRoute();

    const res = await api.GET(cronCall());
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.outcome, 'ok');
    assert.equal(body.trace, 'runs/2026-11-25T03-04-05-678Z.json');
    assert.deepEqual(body.errors, []);
    assert.deepEqual(client.uploads.map(entry => entry.path), [body.trace, 'latest.json']);
    const snapshot = JSON.parse(client.uploads[0].body);
    assert.equal(snapshot.outcome, 'ok');
    assert.equal(snapshot.pruned, 0);
    assert.equal(snapshot.alerts.length, 0);
    assert.deepEqual(snapshot.errors, []);
  });
});

test('Retention endpoint honours RETENTION_ENABLED and forces a dry run with ?dry=1', async () => {
  await withEnv({ ...jobEnv, RETENTION_ENABLED: 'true' }, async () => {
    const { api, runOptions } = retentionRoute();

    await api.GET(cronCall());
    await api.GET(
      new Request('https://local/api/maintenance/retention?dry=1', {
        headers: { authorization: 'Bearer cron-token' },
      }),
    );

    assert.equal(runOptions[0].enabled, true);
    assert.equal(runOptions[1].enabled, false);
  });
});

test('Retention endpoint answers 500 when a step fails and still leaves the trace', async () => {
  await withEnv(jobEnv, async () => {
    const report = emptyReport({ errors: ['newsletterSubscribers: timeout'] });
    const { api, client } = retentionRoute({ report });

    const res = await api.POST(cronCall());
    const body = await res.json();

    assert.equal(res.status, 500);
    assert.equal(body.outcome, 'error');
    assert.deepEqual(body.errors, ['newsletterSubscribers: timeout']);
    assert.ok(body.trace);
    assert.equal(JSON.parse(client.uploads[0].body).outcome, 'error');
  });
});

test('Retention endpoint answers 500 when the trace cannot be written', async () => {
  await withEnv(jobEnv, async () => {
    const { api, client } = retentionRoute({ uploadError: { message: 'quota superata' } });

    const res = await api.GET(cronCall());
    const body = await res.json();

    assert.equal(res.status, 500);
    assert.equal(body.outcome, 'error');
    assert.equal(body.trace, null);
    assert.match(body.errors[0], /trace: quota superata/);
    assert.equal(client.uploads.length, 0);
  });
});

test('Retention endpoint rejects missing or wrong tokens without writing anything', async () => {
  await withEnv(jobEnv, async () => {
    const { api, client } = retentionRoute();
    for (const request of [cronCall(''), cronCall('token-sbagliato')]) {
      const res = await api.GET(request);
      assert.equal(res.status, 401);
      assert.equal((await res.json()).error, 'Non autorizzato.');
    }
    assert.equal(client.created.length, 0);
    assert.equal(client.uploads.length, 0);
  });
});

test('Retention endpoint says it is not configured when both secrets are missing', async () => {
  await withEnv({ ...jobEnv, CRON_SECRET: undefined, RETENTION_TOKEN: undefined }, async () => {
    const { api } = retentionRoute();
    const res = await api.GET(cronCall(''));
    assert.equal(res.status, 503);
    assert.match((await res.json()).error, /CRON_SECRET o RETENTION_TOKEN/);
  });
});

const { pruneRetentionTraces } = load('src/lib/retention-trace.ts');

test('Retention pruning removes only the runs older than 90 days', async () => {
  const client = traceClient({
    runs: [
      '2026-08-01T03-00-00-000Z.json',
      '2026-11-20T03-00-00-000Z.json',
      'latest.json',
      'nome-inatteso.json',
    ],
  });

  const result = await pruneRetentionTraces(client, {
    now: new Date('2026-11-25T12:00:00.000Z'),
  });

  assert.equal(result.error, null);
  assert.equal(result.removed, 1);
  assert.deepEqual(client.removed, ['runs/2026-08-01T03-00-00-000Z.json']);
});

test('Retention pruning keeps the recent runs and honours a custom window', async () => {
  const client = traceClient({
    runs: ['2026-11-20T03-00-00-000Z.json', '2026-11-24T03-00-00-000Z.json'],
  });

  const result = await pruneRetentionTraces(client, {
    now: new Date('2026-11-25T00:00:00.000Z'),
    keepDays: 1,
  });

  assert.equal(result.removed, 1);
  assert.deepEqual(client.removed, ['runs/2026-11-20T03-00-00-000Z.json']);
});

test('Retention pruning reports listing and removal failures', async () => {
  const listFails = await pruneRetentionTraces(
    traceClient({ listError: { message: 'timeout' } }),
  );
  assert.equal(listFails.removed, 0);
  assert.match(listFails.error, /elenco tracce: timeout/);

  const removeFails = await pruneRetentionTraces(
    traceClient({
      runs: ['2026-01-01T03-00-00-000Z.json'],
      removeError: { message: 'negato' },
    }),
  );
  assert.equal(removeFails.removed, 0);
  assert.match(removeFails.error, /potatura tracce: negato/);
});

function loadAlert(fetchImpl) {
  const captured = [];
  const alertModule = load(
    'src/lib/retention-alert.ts',
    {
      '@sentry/nextjs': {
        captureMessage: (message, context) => captured.push({ message, context }),
      },
    },
    { fetch: fetchImpl, process },
  );
  return { ...alertModule, captured };
}

test('A failed run reaches Sentry with counts and errors', async () => {
  const calls = [];
  const alert = loadAlert(async (...args) => {
    calls.push(args);
    return { ok: true, status: 200 };
  });

  const result = await alert.alertRetentionFailure(emptyReport(), [
    'newsletterSubscribers: timeout',
  ]);

  assert.equal(result.error, null);
  assert.equal(result.sent.length, 0, 'senza webhook nessun canale');
  assert.equal(calls.length, 0, 'senza webhook configurato non parte nessuna fetch');
  assert.equal(alert.captured.length, 1);
  assert.equal(alert.captured[0].context.level, 'error');
  assert.equal(alert.captured[0].context.tags.job, 'retention');
  assert.match(alert.captured[0].message, /Retention fallita \(delete\)/);
  assert.match(alert.captured[0].message, /newsletterSubscribers=0/);
  assert.match(alert.captured[0].message, /newsletterSubscribers: timeout/);
});

test('A configured webhook receives the alert and is reported as sent', async () => {
  const calls = [];
  const alert = loadAlert(async (url, init) => {
    calls.push({ url, init });
    return { ok: true, status: 200 };
  });

  const result = await withEnv(
    { RETENTION_ALERT_WEBHOOK_URL: 'https://hooks.example.test/uttf' },
    () => alert.alertRetentionFailure(emptyReport(), ['reviews: boom']),
  );

  assert.equal(result.error, null);
  assert.equal(result.sent.join(','), 'webhook');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://hooks.example.test/uttf');
  assert.equal(calls[0].init.method, 'POST');
  const body = JSON.parse(calls[0].init.body);
  assert.match(body.text, /reviews: boom/);
  assert.equal(body.content, body.text);
});

test('A broken webhook is reported without swallowing the failure', async () => {
  const rejected = loadAlert(async () => ({ ok: false, status: 500 }));
  const rejectedResult = await withEnv(
    { RETENTION_ALERT_WEBHOOK_URL: 'https://hooks.example.test/uttf' },
    () => rejected.alertRetentionFailure(emptyReport(), ['reviews: boom']),
  );
  assert.equal(rejectedResult.sent.length, 0);
  assert.match(rejectedResult.error, /avviso non recapitato: HTTP 500/);

  const broken = loadAlert(async () => {
    throw new Error('rete giu');
  });
  const brokenResult = await withEnv(
    { RETENTION_ALERT_WEBHOOK_URL: 'https://hooks.example.test/uttf' },
    () => broken.alertRetentionFailure(emptyReport(), ['reviews: boom']),
  );
  assert.match(brokenResult.error, /avviso non recapitato: rete giu/);
});

test('Retention endpoint alerts once on failure and reports the channels', async () => {
  await withEnv(jobEnv, async () => {
    const report = emptyReport({ errors: ['reviews: timeout'] });
    const { api, sentAlerts } = retentionRoute({
      report,
      alert: { sent: ['webhook'], error: null },
    });

    const res = await api.GET(cronCall());
    const body = await res.json();

    assert.equal(res.status, 500);
    assert.equal(sentAlerts.length, 1);
    assert.deepEqual(sentAlerts[0].failures, ['reviews: timeout']);
    assert.deepEqual(body.alerts, ['webhook']);
  });
});

test('Retention endpoint surfaces a failed alert delivery', async () => {
  await withEnv(jobEnv, async () => {
    const report = emptyReport({ errors: ['reviews: timeout'] });
    const { api } = retentionRoute({
      report,
      alert: { sent: [], error: 'avviso non recapitato: HTTP 500' },
    });

    const res = await api.GET(cronCall());
    const body = await res.json();

    assert.equal(res.status, 500);
    assert.deepEqual(body.alerts, []);
    assert.match(body.errors.join(' | '), /avviso non recapitato/);
  });
});

test('Retention endpoint prunes old traces and fails when pruning breaks', async () => {
  await withEnv(jobEnv, async () => {
    const cleaned = retentionRoute({ runs: ['2026-01-01T03-00-00-000Z.json'] });
    const ok = await cleaned.api.GET(cronCall());
    const okBody = await ok.json();
    assert.equal(ok.status, 200);
    assert.equal(okBody.pruned, 1);
    assert.deepEqual(cleaned.client.removed, ['runs/2026-01-01T03-00-00-000Z.json']);

    const broken = retentionRoute({ listError: { message: 'timeout' } });
    const res = await broken.api.GET(cronCall());
    const body = await res.json();
    assert.equal(res.status, 500);
    assert.match(body.errors.join(' | '), /elenco tracce: timeout/);
  });
});

test('A failing run writes pruned rows and alert channels into the trace', async () => {
  await withEnv(jobEnv, async () => {
    const report = emptyReport({ errors: ['reviews: timeout'] });
    const { api, client, sentAlerts } = retentionRoute({
      report,
      runs: ['2026-01-01T03-00-00-000Z.json'],
      alert: { sent: ['webhook'], error: null },
    });

    const res = await api.GET(cronCall());
    const body = await res.json();

    assert.equal(res.status, 500);
    assert.equal(body.pruned, 1);
    assert.deepEqual(body.alerts, ['webhook']);
    assert.equal(sentAlerts.length, 1);
    const snapshot = JSON.parse(client.uploads[0].body);
    assert.equal(snapshot.outcome, 'error');
    assert.equal(snapshot.pruned, 1);
    assert.equal(snapshot.alerts.join(','), 'webhook');
    assert.deepEqual(snapshot.errors, ['reviews: timeout']);
  });
});

function statusRoute({ latest = null, downloadError = null, denied = false } = {}) {
  return load(
    'src/app/api/maintenance/retention/status/route.ts',
    {
      'next/server': {
        NextResponse: { json: (body, init) => Response.json(body, init) },
      },
      '@/lib/registrations/server': {
        requireRegistrationStaff: async () => {
          if (denied) throw new Response('Accesso staff richiesto.', { status: 403 });
          return {
            storage: {
              from: () => ({
                download: async () =>
                  downloadError
                    ? { data: null, error: downloadError }
                    : { data: { text: async () => latest }, error: null },
              }),
            },
          };
        },
      },
      '@/lib/retention-trace': { RETENTION_TRACE_BUCKET: 'retention-runs' },
    },
    { process, Buffer, Response },
  );
}

test('Retention status exposes a failed last run to the staff banner', async () => {
  const trace = {
    outcome: 'error',
    executedAt: '2026-11-25T03:04:05.678Z',
    mode: 'delete',
    errors: ['reviews: timeout', 42, {}],
    pruned: 3,
    alerts: ['webhook', null],
  };
  const api = statusRoute({ latest: JSON.stringify(trace) });

  const res = await api.GET(new Request('https://local/api/maintenance/retention/status'));
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'private, no-store');
  assert.equal(body.outcome, 'error');
  assert.equal(body.executedAt, '2026-11-25T03:04:05.678Z');
  assert.deepEqual(body.errors, ['reviews: timeout']);
  assert.equal(body.pruned, 3);
  assert.equal(body.alerts.join(','), 'webhook');
  assert.equal(body.stale, false);
});

test('Retention status hides the banner when there is no usable trace', async () => {
  const missing = statusRoute({ downloadError: { message: 'not found' } });
  const missingRes = await missing.GET(new Request('https://local/x'));
  assert.equal(missingRes.status, 200);
  const missingBody = await missingRes.json();
  assert.equal(missingBody.outcome, null);
  assert.equal(missingBody.stale, true);

  const unknown = statusRoute({ latest: JSON.stringify({ qualcosa: 'altro' }) });
  const unknownRes = await unknown.GET(new Request('https://local/x'));
  assert.equal(unknownRes.status, 200);
  const unknownBody = await unknownRes.json();
  assert.equal(unknownBody.outcome, null);
  assert.equal(unknownBody.stale, true);

  const corrupt = statusRoute({ latest: '{non json' });
  const corruptRes = await corrupt.GET(new Request('https://local/x'));
  assert.equal(corruptRes.status, 500);
});

test('Retention status is reserved to staff', async () => {
  const api = statusRoute({ denied: true });
  const res = await api.GET(new Request('https://local/x'));
  assert.equal(res.status, 403);
});

test('Retention status marks a run older than 36 hours as stale', async () => {
  const old = new Date(Date.now() - 37 * 60 * 60 * 1000).toISOString();
  const api = statusRoute({
    latest: JSON.stringify({ outcome: 'ok', executedAt: old, mode: 'delete' }),
  });
  const res = await api.GET(new Request('https://local/x'));
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.outcome, 'ok');
  assert.equal(body.stale, true);
});

test('Retention status is not stale within 36 hours', async () => {
  const recent = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const api = statusRoute({
    latest: JSON.stringify({ outcome: 'ok', executedAt: recent, mode: 'delete' }),
  });
  const res = await api.GET(new Request('https://local/x'));
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.stale, false);
});
