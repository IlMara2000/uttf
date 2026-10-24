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
  }, Request, Response, TextDecoder, Uint8Array, URL, process, console: { error() {} } });
  return exports;
}
const { escapeCsvCell } = load('src/lib/csv.ts');
const { readJson } = load('src/lib/request-json.ts');
const { getStaffRole } = load('src/lib/staff-access.ts');
const user = { id: 'user', email: 'staff@example.test', email_confirmed_at: '2026-01-01', is_anonymous: false };
function client(role, error = null) {
  return { from(name) {
    assert.equal(name, 'authorized_users');
    return { select() { return this; }, eq(field, value) { assert.equal(field, 'email'); assert.equal(value, user.email); return this; },
      async maybeSingle() { return { data: role ? { role } : null, error }; } };
  } };
}
test('CSV quotes values and neutralizes formulas including leading control whitespace', () => {
  assert.equal(escapeCsvCell('a;"b'), '"a;""b"');
  for (const value of ['=1+1', '+1', '-1', '@SUM(A1)', ' \t=1', '\rhello']) {
    assert.ok(escapeCsvCell(value).startsWith('"\''));
  }
  assert.equal(escapeCsvCell(null), '""');
});
test('Only current confirmed staff/admin memberships grant access', async () => {
  assert.equal(await getStaffRole(client('staff'), user), 'staff');
  assert.equal(await getStaffRole(client('admin'), user), 'admin');
  assert.equal(await getStaffRole(client(null), user), null);
  assert.equal(await getStaffRole(client('owner'), user), null);
  assert.equal(await getStaffRole(client('staff'), { ...user, is_anonymous: true }), null);
  assert.equal(await getStaffRole(client('staff'), { ...user, email_confirmed_at: null }), null);
  await assert.rejects(getStaffRole(client('admin', { message: 'unavailable' }), user));
});
test('JSON reader rejects oversized chunked input and malformed JSON', async () => {
  assert.deepEqual(JSON.parse(JSON.stringify(await readJson(new Request('https://local', { method: 'POST', body: '{"ok":true}' })))), { ok: true });
  await assert.rejects(readJson(new Request('https://local', { method: 'POST', body: 'x'.repeat(17000) })));
  await assert.rejects(readJson(new Request('https://local', { method: 'POST', body: '{' })));
});
const nextMock = { NextResponse: { json: (value, init) => Response.json(value, init) } };
function api(name, role = null) {
  const supabase = client(role);
  supabase.auth = { getUser: async () => ({ data: { user }, error: null }) };
  return load(`src/app/api/${name}/route.ts`, {
    'next/server': nextMock, '@supabase/supabase-js': { createClient: () => supabase },
    '@/lib/staff-access': { getStaffRole }, '@/lib/request-json': { readJson },
    'groq-sdk': { default: class { constructor() { throw new Error('Must not reach Groq'); } } },
  });
}
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-placeholder';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-placeholder';
test('Newsletter rejects null JSON without an unhandled exception', async () => {
  const response = await api('newsletter').POST(new Request('https://local/api/newsletter', { method: 'POST', body: 'null' }));
  assert.equal(response.status, 400);
});
test('Privileged APIs reject missing tokens and valid nonstaff identities before data access', async () => {
  for (const [name, method] of [['newsletter', 'GET'], ['reviews', 'DELETE'], ['generate-post', 'POST']]) {
    const handler = api(name)[method];
    assert.equal((await handler(new Request(`https://local/api/${name}?id=1`, { method }))).status, 401);
    assert.equal((await handler(new Request(`https://local/api/${name}?id=1`, { method, headers: { authorization: 'Bearer test' } }))).status, 403);
  }
});
test('Publication signing cannot turn private note paths or foreign URLs into signed reads', async () => {
  const signed = [];
  const { factoryAssetPath, resolvePublicationUrl } = load('src/lib/storage-media.ts', {
    './supabase': { supabase: { storage: { from() { return { async createSignedUrl(path) { signed.push(path); return { data: { signedUrl: 'https://signed.test' }, error: null }; } }; } } } },
  });
  assert.equal(factoryAssetPath('https://evil.test/storage/v1/object/public/factory-assets/notes/x'), null);
  assert.equal(await resolvePublicationUrl('notes/private.pdf'), '');
  assert.equal(await resolvePublicationUrl('publications/../notes/private.pdf'), '');
  assert.equal(await resolvePublicationUrl('https://example.supabase.co/storage/v1/object/public/factory-assets/publications/photo.jpg'), 'https://signed.test');
  assert.deepEqual(signed, ['publications/photo.jpg']);
});
