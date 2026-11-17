#!/usr/bin/env node
'use strict';

/**
 * Carica un file sul drive tramite l'agente locale.
 * Va eseguito sul Mac dove gira l'agente (ascolta solo su 127.0.0.1):
 * dagli altri dispositivi si passa dal gestionale, con il login staff.
 *
 *   node drive-agent/upload.cjs foto.jpg --folder=Foto/2026
 *   node drive-agent/upload.cjs video.mov --folder=Video --name=backstage.mp4
 *   node drive-agent/upload.cjs file.pdf --url=http://127.0.0.1:8788
 */

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');

const MIB = 1024 * 1024;
const IDLE_TIMEOUT_MS = 30_000;
const USAGE =
  'Uso: node drive-agent/upload.cjs <file> [--folder=Foto/2026] [--url=http://127.0.0.1:8787] [--name=nome.jpg]';

function fail(message) {
  if (message) console.error(`✗ ${message}`);
  console.error(USAGE);
  process.exit(1);
}

function parseArgs(argv) {
  const options = {
    url: process.env.DRIVE_AGENT_URL || 'http://127.0.0.1:8787',
    folder: '',
    name: '',
  };
  const positional = [];

  for (const raw of argv.slice(2)) {
    const match = /^--([a-z]+)=(.*)$/.exec(raw);
    if (!match) {
      positional.push(raw);
      continue;
    }
    const [, key, value] = match;
    if (key in options) options[key] = value;
  }

  options.file = positional[0];
  return options;
}

const args = parseArgs(process.argv);
if (!args.file) fail();

let source;
let stat;
try {
  source = path.resolve(args.file);
  stat = fs.statSync(source);
} catch (error) {
  fail(`${args.file}: ${error.code === 'ENOENT' ? 'file non trovato' : error.message}`);
}
if (!stat.isFile()) fail(`${args.file} non è un file`);

const endpoint = new URL('/api/files', args.url);
endpoint.searchParams.set('name', args.name || path.basename(source));
if (args.folder) endpoint.searchParams.set('folder', args.folder);

const client = endpoint.protocol === 'https:' ? https : http;
const started = Date.now();
const showProgress = Boolean(process.stdout.isTTY);
let lastProgress = 0;
let sentBytes = 0;

const request = client.request(
  endpoint,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': stat.size,
    },
  },
  (response) => {
    let body = '';
    response.setEncoding('utf8');
    response.on('data', (chunk) => {
      body += chunk;
    });
    response.on('end', () => {
      if (showProgress) process.stdout.write(`\r${' '.repeat(48)}\r`);

      let payload = null;
      try {
        payload = JSON.parse(body);
      } catch {
        /* risposta non JSON: si mostra il corpo grezzo */
      }

      if (response.statusCode !== 201) {
        console.error(`✗ HTTP ${response.statusCode}: ${payload?.error || body.trim() || 'nessun dettaglio'}`);
        process.exit(1);
      }
      if (!payload?.asset) {
        console.error('✗ risposta inattesa dall\'agente:', body.slice(0, 200));
        process.exit(1);
      }

      const { asset, duplicate } = payload;
      console.log(`✓ caricato in ${((Date.now() - started) / 1000).toFixed(1)}s`);
      console.log(`  file:       ${asset.relPath}`);
      console.log(`  dimensione: ${(asset.size / MIB).toFixed(2)} MB`);
      console.log(`  sha256:     ${asset.sha256}`);
      console.log(`  anteprima:  ${asset.thumb ? 'generata' : 'non generata'}`);
      console.log(`  id:         ${asset.id}`);
      if (duplicate) console.log(`  nota:       contenuto identico già presente in ${duplicate.relPath}`);
    });
  },
);

request.setTimeout(IDLE_TIMEOUT_MS, () => {
  console.error(`✗ nessun traffico per ${IDLE_TIMEOUT_MS / 1000}s: upload interrotto`);
  request.destroy();
});

request.on('error', (error) => {
  console.error('✗ errore di rete:', error.message);
  console.error('  L\'agente ascolta solo su 127.0.0.1: esegui questo comando sul Mac del drive.');
  process.exit(1);
});

const stream = fs.createReadStream(source);
stream.on('error', (error) => {
  console.error('✗ lettura del file fallita:', error.message);
  request.destroy();
  process.exit(1);
});
stream.on('data', (chunk) => {
  sentBytes += chunk.length;
  if (!showProgress || stat.size === 0) return;
  const now = Date.now();
  if (now - lastProgress < 400) return;
  lastProgress = now;
  process.stdout.write(
    `\r  invio ${Math.round((sentBytes / stat.size) * 100)}% (${(sentBytes / MIB).toFixed(1)} MB)`,
  );
});
stream.pipe(request);
