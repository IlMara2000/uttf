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
  vm.runInNewContext(code, {
    exports,
    require: name => {
      if (name in mocks) return mocks[name];
      return nodeRequire(name);
    },
    Date,
    Error,
    Array,
    String,
    JSON,
    Promise,
    Number,
    console: { error() {}, info() {} },
    ...globals,
  });
  return exports;
}

const { auditRegistrationFiles, FILES_AUDIT_SAMPLE } = load('src/lib/files-audit.ts');

/** Client minimo: bucket a cartelle e tabelle righe con paginazione a `range`. */
function fakeClient({ objects = {}, rows = [] } = {}) {
  return {
    storage: {
      from() {
        return {
          async list(prefix) {
            return { data: objects[prefix] ?? [], error: null };
          },
        };
      },
    },
    from() {
      let start = 0;
      const chain = {
        select: () => chain,
        order: () => chain,
        range(from) {
          start = from;
          return chain;
        },
        then(resolve) {
          resolve({ data: rows.slice(start), count: rows.length, error: null });
        },
      };
      return chain;
    },
  };
}

const folder = name => ({ name, id: null });
const object = name => ({ name, id: `obj-${name}`, metadata: { size: 10 }, updated_at: '2026-11-20T10:00:00Z' });

test('Files audit separates orphan objects from paths that no longer exist', async () => {
  const client = fakeClient({
    objects: {
      '': [folder('row-1')],
      'row-1': [object('citato.pdf'), object('orfano.pdf')],
    },
    rows: [
      {
        id: 'row-1',
        files: [{ name: 'citato.pdf', path: 'row-1/citato.pdf' }, { name: 'sparito.pdf', path: 'row-1/sparito.pdf' }],
      },
    ],
  });

  const audit = await auditRegistrationFiles(client, { now: new Date('2026-11-25T04:00:00Z') });

  assert.equal(audit.error, null);
  assert.equal(audit.executedAt, '2026-11-25T04:00:00.000Z');
  assert.equal(audit.bucketObjects, 2);
  assert.equal(audit.registrations, 1);
  assert.equal(audit.citedPaths, 2);
  assert.equal(audit.orphans.count, 1);
  assert.equal(audit.orphans.sample.join(','), 'row-1/orfano.pdf');
  assert.equal(audit.missing.count, 1);
  // Gli oggetti nascono in un altro realm: si confrontano come stringhe.
  assert.equal(
    audit.missing.sample
      .map(entry => `${entry.path} → ${entry.registrations.join('+')}`)
      .join('|'),
    'row-1/sparito.pdf → row-1',
  );
  assert.equal(audit.unreadable.count, 0);
});

test('Files audit reports rows whose files field cannot be read', async () => {
  const client = fakeClient({
    objects: { '': [] },
    rows: [
      { id: 'row-json', files: '{non json' },
      { id: 'row-text', files: 'testo' },
      { id: 'row-ok', files: [{ name: 'a.pdf', path: 'row-ok/a.pdf' }] },
    ],
  });

  const audit = await auditRegistrationFiles(client);

  assert.equal(audit.registrations, 3);
  assert.equal(audit.unreadable.count, 2);
  assert.equal(audit.unreadable.sample.map(row => row.id).sort().join(','), 'row-json,row-text');
  assert.equal(audit.missing.count, 1, 'la riga leggibile resta nella verifica');
});

test('Files audit keeps exact counts while capping the samples', async () => {
  const entries = Array.from({ length: FILES_AUDIT_SAMPLE + 5 }, (_, index) => object(`orfano-${index}.pdf`));
  const client = fakeClient({ objects: { '': [folder('row-1')], 'row-1': entries }, rows: [] });

  const audit = await auditRegistrationFiles(client);

  assert.equal(audit.orphans.count, FILES_AUDIT_SAMPLE + 5);
  assert.equal(audit.orphans.sample.length, FILES_AUDIT_SAMPLE);
});

/** Route del cron: storage finto con createBucket e upload controllabili. */
function auditRoute({ audit = null, bucketError = null, uploadError = null } = {}) {
  const uploads = [];
  const client = {
    storage: {
      async createBucket() {
        return { data: 'retention-runs', error: bucketError };
      },
      from() {
        return {
          async upload(path, body, options) {
            if (uploadError) return { data: null, error: uploadError };
            uploads.push({ path, body, options });
            return { data: { path }, error: null };
          },
        };
      },
    },
  };
  const api = load(
    'src/app/api/maintenance/files-audit/route.ts',
    {
      'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
      '@supabase/supabase-js': { createClient: () => client },
      '@/lib/files-audit': {
        auditRegistrationFiles: async () => audit,
        FILES_AUDIT_TRACE_KEY: 'files-audit.json',
      },
      '@/lib/maintenance-auth': load('src/lib/maintenance-auth.ts', {}, { process, Buffer }),
      '@/lib/retention-trace': { RETENTION_TRACE_BUCKET: 'retention-runs' },
    },
    { process, Buffer, Response },
  );
  return { api, uploads };
}

function sampleAudit(overrides = {}) {
  return {
    executedAt: '2026-11-25T04:00:00.000Z',
    bucketObjects: 3,
    registrations: 2,
    citedPaths: 2,
    orphans: { count: 1, sample: ['row-1/orfano.pdf'] },
    missing: { count: 1, sample: [{ path: 'row-1/sparito.pdf', registrations: ['row-1'] }] },
    unreadable: { count: 0, sample: [] },
    error: null,
    ...overrides,
  };
}

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
  NEXT_PUBLIC_SUPABASE_URL: 'https://prova.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role',
};

const cronCall = (token = 'cron-token') =>
  new Request('https://local/api/maintenance/files-audit', {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });

test('Files audit endpoint writes the weekly trace and answers 200', async () => {
  await withEnv(jobEnv, async () => {
    const { api, uploads } = auditRoute({ audit: sampleAudit() });

    const res = await api.GET(cronCall());
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.outcome, 'ok');
    assert.equal(body.trace, 'files-audit.json');
    assert.equal(body.orphans.count, 1);
    assert.deepEqual(uploads.map(entry => entry.path), ['files-audit.json']);
    assert.equal(uploads[0].options.upsert, true);
    assert.equal(JSON.parse(uploads[0].body).missing.count, 1);
  });
});

test('Files audit endpoint rejects a missing or wrong token', async () => {
  await withEnv(jobEnv, async () => {
    const { api, uploads } = auditRoute({ audit: sampleAudit() });
    for (const request of [cronCall(''), cronCall('sbagliato')]) {
      const res = await api.GET(request);
      assert.equal(res.status, 401);
    }
    assert.equal(uploads.length, 0);
  });
});

test('Files audit endpoint answers 500 when the trace cannot be written', async () => {
  await withEnv(jobEnv, async () => {
    const { api } = auditRoute({
      audit: sampleAudit(),
      uploadError: { message: 'quota superata' },
    });

    const res = await api.POST(cronCall());
    const body = await res.json();

    assert.equal(res.status, 500);
    assert.equal(body.outcome, 'error');
    assert.equal(body.trace, null);
    assert.match(body.errors.join(' | '), /trace: quota superata/);
  });
});
