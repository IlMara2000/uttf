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

/** Client Supabase minimo: filtra e cancella in memoria e registra le chiamate. */
function fakeClient(seed = {}) {
  const tables = structuredClone(seed);
  const calls = [];
  const removed = [];

  function from(table) {
    const filters = [];
    const state = { op: 'select', head: false };
    const chain = {
      select(_columns, options = {}) {
        state.op = 'select';
        state.head = options.head === true;
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
        head: state.head,
        filters: filters.map(filter =>
          'values' in filter ? { column: filter.column, values: filter.values } : { column: filter.column, value: filter.value },
        ),
      });
      if (state.op === 'delete') {
        tables[table] = rows.filter(row => !matched.includes(row));
        return { data: null, count: matched.length, error: null };
      }
      return { data: matched, count: matched.length, error: null };
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
    ...overrides,
  };
}

/** Storage finto: bucket, upload di snapshot e latest, con guasti iniettabili. */
function traceClient({ bucketError = null, uploadError = null } = {}) {
  const uploads = [];
  const created = [];
  return {
    uploads,
    created,
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
  assert.match(snapshot.recordedAt, /^\d{4}-\d{2}-\d{2}T/);
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

function retentionRoute({ report = emptyReport(), bucketError = null, uploadError = null } = {}) {
  const client = traceClient({ bucketError, uploadError });
  const api = load(
    'src/app/api/maintenance/retention/route.ts',
    {
      'next/server': {
        NextResponse: { json: (body, init) => Response.json(body, init) },
      },
      '@supabase/supabase-js': { createClient: () => client },
      '@/lib/retention': { runRetention: async () => report },
      '@/lib/retention-trace': load('src/lib/retention-trace.ts'),
    },
    { process, Buffer },
  );
  return { api, client };
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
    assert.equal(JSON.parse(client.uploads[0].body).outcome, 'ok');
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
