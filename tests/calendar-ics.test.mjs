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
  vm.runInNewContext(code, { exports, TextEncoder, Date, String, Number });
  return exports;
}

const { buildPlannerIcs, escapeIcsText, foldIcsLine } = load('src/lib/calendar-ics.ts');

test('iCalendar text escapes separators and newlines', () => {
  assert.equal(escapeIcsText('a,b;c\\d\ne'), 'a\\,b\\;c\\\\d\\ne');
});

test('long lines are folded to 75 octets with continuation spaces', () => {
  const original = 'DESCRIPTION:' + 'è'.repeat(90);
  const folded = foldIcsLine(original);
  const lines = folded.split('\r\n');
  assert.ok(lines.length > 1);
  for (const line of lines) assert.ok(new TextEncoder().encode(line).length <= 75);
  for (const line of lines.slice(1)) assert.ok(line.startsWith(' '));
  assert.equal(folded.replace(/\r\n /g, ''), original);
});

test('builds all-day, multi-day, timed and shift events', () => {
  const ics = buildPlannerIcs(
    [
      { id: 'a', kind: 'task', title: 'Prova, task', description: 'Nota;\nriga', date: '2026-11-09' },
      {
        id: 'b',
        kind: 'shift',
        title: 'TURNO IN SEDE - ANNA',
        description: '[[UTTF_SHIFT_SEDE]]\nPorta le chiavi',
        date: '2026-11-10',
        time: '18:30',
      },
      { id: 'c', kind: 'activity', title: 'Workshop', date: '2026-11-11', endDate: '2026-11-13' },
    ],
    { now: new Date('2026-11-09T08:00:00Z'), uidDomain: 'uttf.test' },
  );

  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(ics.trimEnd().endsWith('END:VCALENDAR'));
  assert.ok(ics.includes('DTSTAMP:20261109T080000Z'));
  assert.ok(ics.includes('UID:a@uttf.test'));
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20261109\r\nDTEND;VALUE=DATE:20261110'));
  assert.ok(ics.includes('SUMMARY:Prova\\, task'));
  assert.ok(ics.includes('DTSTART;TZID=Europe/Rome:20261110T183000'));
  assert.ok(ics.includes('DTEND;TZID=Europe/Rome:20261110T193000'));
  assert.ok(ics.includes('SUMMARY:Turno in sede - ANNA'));
  assert.ok(!ics.includes('[[UTTF_SHIFT_SEDE]]'));
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20261111\r\nDTEND;VALUE=DATE:20261114'));
});

test('skips events without a valid calendar date', () => {
  const ics = buildPlannerIcs(
    [
      { id: 'x', kind: 'task', title: 'No date', date: '' },
      { id: 'y', kind: 'task', title: 'Impossible', date: '2026-02-30' },
    ],
    { now: new Date('2026-01-01T00:00:00Z'), uidDomain: 'uttf.test' },
  );

  assert.equal(ics.match(/BEGIN:VEVENT/g), null);
});
