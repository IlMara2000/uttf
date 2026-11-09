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
  vm.runInNewContext(code, { exports, URLSearchParams, RegExp, String });
  return exports;
}

const { parseFeedFilter, eventMatchesFilter } = load('src/lib/calendar-filter.ts');
const plain = (value) => JSON.parse(JSON.stringify(value));

const person = '6c1f0f0e-9d0f-4a2b-8f3c-1d2e3f4a5b6c';
const other = 'a1b2c3d4-1111-4222-8333-444455556666';

test('feed filters default to everything and reject invalid values', () => {
  assert.deepEqual(plain(parseFeedFilter(new URLSearchParams())), {
    scope: 'all',
    assignee: null,
  });
  assert.deepEqual(plain(parseFeedFilter(new URLSearchParams('scope=shifts'))), {
    scope: 'shifts',
    assignee: null,
  });
  assert.deepEqual(plain(parseFeedFilter(new URLSearchParams(`assignee=${person}`))), {
    scope: 'all',
    assignee: person,
  });
  assert.equal(parseFeedFilter(new URLSearchParams('scope=everything')), null);
  assert.equal(parseFeedFilter(new URLSearchParams('assignee=mario')), null);
});

test('filters combine scope and assignee', () => {
  const all = { scope: 'all', assignee: null };
  const shiftsOnly = { scope: 'shifts', assignee: null };
  const tasksOnly = { scope: 'tasks', assignee: null };
  const personOnly = { scope: 'all', assignee: person };

  const shift = { kind: 'shift', assignedTo: [person] };
  const task = { kind: 'task', assignedTo: [person] };
  const foreign = { kind: 'task', assignedTo: [other] };
  const activity = { kind: 'activity', assignedTo: [person] };
  const google = { kind: 'google', assignedTo: null };

  assert.ok(eventMatchesFilter(shift, all));
  assert.ok(eventMatchesFilter(google, all));

  assert.ok(eventMatchesFilter(shift, shiftsOnly));
  assert.ok(!eventMatchesFilter(task, shiftsOnly));
  assert.ok(!eventMatchesFilter(activity, shiftsOnly));

  assert.ok(eventMatchesFilter(task, tasksOnly));
  assert.ok(!eventMatchesFilter(shift, tasksOnly));

  assert.ok(eventMatchesFilter(shift, personOnly));
  assert.ok(eventMatchesFilter(task, personOnly));
  assert.ok(eventMatchesFilter(activity, personOnly));
  assert.ok(!eventMatchesFilter(foreign, personOnly));
  assert.ok(!eventMatchesFilter(google, personOnly));
});
