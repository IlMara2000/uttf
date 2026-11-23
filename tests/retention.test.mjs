import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, mocks = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, require: name => {
    if (name in mocks) return mocks[name];
    throw new Error('Unexpected dependency: ' + name);
  }, Date, Error, Array, String, console: { error() {} } });
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
  assert.equal(client.tables.activity_registrations.length, 4);
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
  assert.deepEqual(client.tables.activity_registrations.map(row => row.id), ['reg-recent', 'reg-accepted']);
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
    'activity-registrations/received.pdf',
  ]);
});
