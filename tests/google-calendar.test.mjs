import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(file) {
  const exports = {};
  const code = ts.transpileModule(
    fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  vm.runInNewContext(code, { exports, Intl, Date, Object, String, Number, RegExp });
  return exports;
}

const { mapGoogleEvent, previousDay, romeDateTime } = load('src/lib/google-calendar-model.ts');
const plain = (value) => JSON.parse(JSON.stringify(value));

test('converts Google timestamps to Italian wall-clock time across DST', () => {
  assert.deepEqual(plain(romeDateTime('2026-07-01T00:30:00Z')), { date: '2026-07-01', time: '02:30' });
  assert.deepEqual(plain(romeDateTime('2026-01-15T00:30:00Z')), { date: '2026-01-15', time: '01:30' });
  assert.equal(romeDateTime('not-a-date'), null);
  assert.equal(previousDay('2026-03-01'), '2026-02-28');
});

test('imports all-day and multi-day events with the last day included', () => {
  assert.deepEqual(
    plain(
      mapGoogleEvent({
        id: 'all-day',
        summary: 'Festa della Factory',
        start: { date: '2026-11-11' },
        end: { date: '2026-11-14' },
      }),
    ),
    {
      eventId: 'all-day',
      title: 'Festa della Factory',
      description: null,
      startsOn: '2026-11-11',
      endsOn: '2026-11-13',
      startsAt: null,
      htmlLink: null,
    },
  );

  assert.equal(
    mapGoogleEvent({ id: 'single', start: { date: '2026-11-11' }, end: { date: '2026-11-12' } }).endsOn,
    '2026-11-11',
  );
});

test('maps timed events, including those crossing midnight', () => {
  const event = mapGoogleEvent({
    id: 'timed',
    summary: '  ',
    start: { dateTime: '2026-11-10T23:30:00+01:00' },
    end: { dateTime: '2026-11-11T01:00:00+01:00' },
  });
  assert.equal(event.title, 'Evento Google');
  assert.equal(event.startsOn, '2026-11-10');
  assert.equal(event.startsAt, '23:30');
  assert.equal(event.endsOn, '2026-11-11');
});

test('ignores cancelled, declined, non-default and undated events', () => {
  assert.equal(mapGoogleEvent({ id: 'a', status: 'cancelled', start: { date: '2026-11-11' } }), null);
  assert.equal(mapGoogleEvent({ id: 'b', eventType: 'workingLocation', start: { date: '2026-11-11' } }), null);
  assert.equal(
    mapGoogleEvent({
      id: 'c',
      start: { date: '2026-11-11' },
      attendees: [{ self: true, responseStatus: 'declined' }],
    }),
    null,
  );
  assert.equal(mapGoogleEvent({ id: 'd' }), null);
  assert.equal(mapGoogleEvent({ start: { date: '2026-11-11' } }), null);
});
