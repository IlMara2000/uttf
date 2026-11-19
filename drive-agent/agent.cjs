#!/usr/bin/env node
'use strict';

/**
 * UTTF Drive Agent.
 *
 * Il disco e' l'originale: riceve un file in streaming, lo scrive dentro la root
 * del drive, ne calcola lo SHA-256 mentre scrive, genera l'anteprima WebP
 * (sharp per le immagini, ffmpeg per il primo frame dei video) e tiene l'indice
 * in .uttf-drive/index.json. Serve anteprime e originali al gestionale.
 *
 * API (usata anche dal gestionale):
 *   GET    /                 pagina di consultazione e upload
 *   GET    /api/files        indice completo
 *   GET    /api/health       stato agente e spazio disco
 *   POST   /api/files?name=&folder=   body grezzo, risposta 201 { asset, duplicate }
 *   GET    /thumb/:id        anteprima WebP
 *   GET    /file/:id         originale, con Range per i video
 *   DELETE /api/files/:id    sposta nel cestino (.uttf-drive/trash)
 *   PATCH  /api/files/:id?name=Nuovo.jpg   rinomina un file
 *   POST   /api/files/move   body JSON { ids, folder }   sposta i file
 *   POST   /api/files/delete body JSON { ids }           cestina i file
 *   GET    /api/folders      elenco delle cartelle (anche vuote)
 *   POST   /api/folders?folder=Foto/2026   crea la cartella
 *   PATCH  /api/folders?folder=Vecchia&to=Nuova   rinomina la cartella
 *   DELETE /api/folders?folder=Foto/2026   elimina la cartella e lascia i file
 *          nella cartella superiore: il contenuto non si perde mai
 *
 * Ascolta su 127.0.0.1: l'unico modo per arrivare ai file e' il gestionale, che
 * richiede il login staff e firma gli URL di anteprime e originali. Con --host=
 * o DRIVE_HOST lo si puo' esporre, ma allora serve una protezione esterna.
 *
 * Copia di sicurezza: con --mirror-volume= (o DRIVE_MIRROR_VOLUME) ogni file del
 * drive viene copiato su un secondo disco, verificando lo SHA-256. Se il volume
 * non e' montato non si scrive nulla (niente cartelle fantasma sul disco interno).
 * Sul disco di copia resta .uttf-manifest.json con percorsi, dimensioni e hash;
 * `node drive-agent/backup-verify.cjs` lo confronta con l'indice.
 *
 * Accesso diretto (tunnel): con DRIVE_MEDIA_SECRET gli URL /file/:id e gli upload
 * devono portare exp+sig (HMAC-SHA256). DRIVE_ALLOWED_ORIGIN concede il CORS al
 * solo gestionale, cosi' il browser carica e riproduce senza passare da Vercel.
 * Con lo stesso segreto le rotte di controllo (elenco file, cartelle,
 * cancellazioni, pagina) accettano dall'esterno solo l'header `x-drive-token`:
 * le chiamate fatte dal Mac su 127.0.0.1 non hanno bisogno di nulla.
 */

const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { spawn } = require('node:child_process');

const MIB = 1024 * 1024;
const MAX_FOLDER_DEPTH = 8;
const MAX_NAME_LENGTH = 180;
const FFMPEG_TIMEOUT_MS = 60_000;
const FFPROBE_TIMEOUT_MS = 15_000;

const CONFIG = {
  root: process.env.DRIVE_ROOT || '/Volumes/HIKSEMI 1/Drive Under the Tower Factory',
  port: Number(process.env.DRIVE_PORT || 8787),
  // Solo loopback: il gestionale e' l'unica porta d'ingresso.
  host: process.env.DRIVE_HOST || '127.0.0.1',
  // Volume del disco di copia, vuoto = nessuna copia di sicurezza.
  mirrorVolume: process.env.DRIVE_MIRROR_VOLUME || '',
  // Segreto condiviso col gestionale per gli accessi diretti firmati.
  mediaSecret: process.env.DRIVE_MEDIA_SECRET || '',
  // Origine autorizzata a chiamare l'agente dal browser (es. https://app.example).
  allowedOrigin: process.env.DRIVE_ALLOWED_ORIGIN || '',
};

for (const raw of process.argv.slice(2)) {
  const match = /^--([a-z-]+)=(.*)$/.exec(raw);
  if (!match) continue;
  const [, key, value] = match;
  if (key === 'root') CONFIG.root = value;
  else if (key === 'port') CONFIG.port = Number(value);
  else if (key === 'host') CONFIG.host = value;
  else if (key === 'mirror-volume') CONFIG.mirrorVolume = value;
  else if (key === 'media-secret') CONFIG.mediaSecret = value;
  else if (key === 'allowed-origin') CONFIG.allowedOrigin = value;
}

const ROOT = path.resolve(CONFIG.root);
const META_DIR = path.join(ROOT, '.uttf-drive');
const THUMB_DIR = path.join(META_DIR, 'thumbs');
const TMP_DIR = path.join(META_DIR, 'tmp');
const TRASH_DIR = path.join(META_DIR, 'trash');
const INDEX_FILE = path.join(META_DIR, 'index.json');
const MEDIA_SECRET = CONFIG.mediaSecret.trim();
const ALLOWED_ORIGIN = CONFIG.allowedOrigin.trim();

const MIME_BY_EXT = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.pdf': 'application/pdf',
};

const state = { assets: [] };
let saveQueue = Promise.resolve();
let sharp = null;

/* ── utilita' ──────────────────────────────────────────────────────────── */

function log(...args) {
  console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...args);
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

function sendHtml(res, status, html) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(html);
}

function mimeOf(fileName) {
  return MIME_BY_EXT[path.extname(fileName).toLowerCase()] || 'application/octet-stream';
}

function kindOf(mime) {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  return 'other';
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── nomi e percorsi ───────────────────────────────────────────────────── */

function sanitizeName(input) {
  const base = path.basename(String(input || '').replace(/\\/g, '/'));
  const cleaned = base
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '');
  const safe = cleaned || 'file';
  if (safe.length <= MAX_NAME_LENGTH) return safe;
  const ext = path.extname(safe);
  return safe.slice(0, MAX_NAME_LENGTH - ext.length) + ext;
}

/** Segmenti nascosti esclusi: nulla puo' finire dentro .uttf-drive o in .. */
function sanitizeFolder(input) {
  if (!input) return '';
  return String(input)
    .split('/')
    .map((segment) =>
      segment
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .replace(/[\\:*?"<>|]/g, '-')
        .trim(),
    )
    .filter((segment) => segment && !segment.startsWith('.'))
    .slice(0, MAX_FOLDER_DEPTH)
    .join('/');
}

/** Percorso assoluto solo se resta dentro la root (l'indice puo' essere modificato a mano). */
function assetPath(relPath) {
  const resolved = path.resolve(ROOT, relPath);
  return resolved === ROOT || resolved.startsWith(ROOT + path.sep) ? resolved : null;
}

/** Crea il file in modo esclusivo: due upload con lo stesso nome non si sovrascrivono. */
async function openUnique(folderAbs, fileName) {
  const ext = path.extname(fileName);
  const stem = path.basename(fileName, ext);
  for (let attempt = 1; attempt <= 9999; attempt += 1) {
    const name = attempt === 1 ? fileName : `${stem} (${attempt})${ext}`;
    const target = path.join(folderAbs, name);
    try {
      const handle = await fsp.open(target, 'wx');
      return { target, stream: handle.createWriteStream() };
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  }
  throw new Error(`troppe copie di ${fileName}`);
}

/** Nome libero per uno spostamento: niente sovrascritture nella cartella di arrivo. */
async function uniqueEntry(dirAbs, name, isDirectory) {
  const ext = isDirectory ? '' : path.extname(name);
  const stem = isDirectory ? name : path.basename(name, ext);
  for (let attempt = 1; attempt <= 9999; attempt += 1) {
    const candidate = attempt === 1 ? name : `${stem} (${attempt})${ext}`;
    const exists = await fsp.stat(path.join(dirAbs, candidate)).catch(() => null);
    if (!exists) return candidate;
  }
  throw new Error(`troppe copie di ${name}`);
}

/* ── corpo JSON ────────────────────────────────────────────────────────── */

/** Corpo JSON delle azioni multiple: piccolo e con un tetto esplicito. */
async function readJsonBody(req, limit = 64 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error('richiesta troppo grande');
    chunks.push(chunk);
  }
  if (size === 0) return null;
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return null;
  }
}

function requestedIds(payload) {
  if (!payload || !Array.isArray(payload.ids)) return [];
  return [...new Set(payload.ids.filter((id) => typeof id === 'string' && id.length > 0))];
}

/* ── indice ────────────────────────────────────────────────────────────── */

function isIndexedAsset(value) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof value.id === 'string' &&
      typeof value.name === 'string' &&
      typeof value.relPath === 'string' &&
      typeof value.sha256 === 'string' &&
      Number.isFinite(value.size),
  );
}

/** Scritture serializzate e atomiche (tmp + rename): l'indice non si corrompe
 * con upload concorrenti, e un errore non blocca i salvataggi successivi. */
function persistIndex() {
  const payload = JSON.stringify(state.assets);
  saveQueue = saveQueue.catch(() => {}).then(async () => {
    const tmp = `${INDEX_FILE}.${process.pid}.tmp`;
    await fsp.writeFile(tmp, payload);
    await fsp.rename(tmp, INDEX_FILE);
  });
  return saveQueue;
}

async function loadIndex() {
  for (const dir of [ROOT, META_DIR, THUMB_DIR, TMP_DIR, TRASH_DIR]) {
    await fsp.mkdir(dir, { recursive: true });
  }

  // Il tmp contiene solo frame temporanei: a processo fermo non serve piu' nulla.
  await fsp.rm(TMP_DIR, { recursive: true, force: true }).catch(() => {});
  await fsp.mkdir(TMP_DIR, { recursive: true });

  let parsed;
  try {
    parsed = JSON.parse(await fsp.readFile(INDEX_FILE, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      log('indice non ancora creato: parto vuoto');
      return;
    }
    // Non sovrascrivere un indice illeggibile: si conserva per recuperarlo a mano.
    const backup = `${INDEX_FILE}.corrotto-${Date.now()}`;
    await fsp.rename(INDEX_FILE, backup).catch(() => {});
    log(`indice illeggibile (${error.message}): copia in ${path.basename(backup)}, riparto vuoto`);
    return;
  }

  const list = Array.isArray(parsed) ? parsed : [];
  state.assets = list.filter(isIndexedAsset);
  if (state.assets.length !== list.length) {
    log(`indice: scartate ${list.length - state.assets.length} righe non valide`);
  }
  log(`indice caricato: ${state.assets.length} file`);
}

/* ── processi esterni ──────────────────────────────────────────────────── */

function runProcess(command, args, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(command, args);
    let out = '';
    let err = '';
    let timedOut = false;
    let settled = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    child.stdout.on('data', (chunk) => {
      out = (out + chunk.toString()).slice(-200_000);
    });
    child.stderr.on('data', (chunk) => {
      err = (err + chunk.toString()).slice(-2000);
    });
    child.on('error', (error) => finish({ ok: false, timedOut: false, out, err: error.message }));
    child.on('close', (code) => finish({ ok: code === 0 && !timedOut, timedOut, out, err }));
  });
}

async function probeVideo(file) {
  const result = await runProcess(
    'ffprobe',
    ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file],
    FFPROBE_TIMEOUT_MS,
  );
  if (!result.ok) {
    log('ffprobe non riuscito:', result.timedOut ? 'timeout' : result.err.slice(-200));
    return null;
  }
  try {
    return JSON.parse(result.out);
  } catch {
    return null;
  }
}

async function extractFrame(file, target, seek) {
  const result = await runProcess(
    'ffmpeg',
    ['-y', '-v', 'error', '-ss', String(seek), '-i', file, '-frames:v', '1', '-vf', 'scale=1280:-2', '-q:v', '3', target],
    FFMPEG_TIMEOUT_MS,
  );
  if (!result.ok) {
    throw new Error(result.timedOut ? 'ffmpeg: timeout' : `ffmpeg: ${result.err.slice(-200)}`);
  }
}

async function getSharp() {
  if (!sharp) sharp = require('sharp');
  return sharp;
}

async function makeThumbnail(asset, absolutePath) {
  const target = path.join(THUMB_DIR, `${asset.id}.webp`);
  const sharpLib = await getSharp();

  if (asset.kind === 'image') {
    const meta = await sharpLib(absolutePath).metadata();
    asset.width = meta.width || null;
    asset.height = meta.height || null;
    await sharpLib(absolutePath)
      .rotate()
      .resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 72 })
      .toFile(target);
    asset.thumb = true;
    return;
  }

  if (asset.kind !== 'video') return;

  const probe = await probeVideo(absolutePath);
  const stream = probe?.streams?.find((item) => item.codec_type === 'video');
  asset.width = stream?.width ?? null;
  asset.height = stream?.height ?? null;
  asset.duration = probe?.format?.duration ? Number(probe.format.duration) : null;

  const duration = Number(asset.duration) || 0;
  const seek = duration > 3 ? Math.min(2, duration / 3) : 0;
  const frame = path.join(TMP_DIR, `${asset.id}.jpg`);
  try {
    await extractFrame(absolutePath, frame, seek);
    await sharpLib(frame)
      .resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 72 })
      .toFile(target);
    asset.thumb = true;
  } finally {
    await fsp.rm(frame, { force: true }).catch(() => {});
  }
}

/* ── accesso diretto firmato ────────────────────────────────────────────── */

/** Il gestionale firma `modo|bersaglio|scadenza` con lo stesso segreto: qui si
 * ricostruisce la stringa e si confronta, cosi' un URL scaduto o ritoccato
 * (altro file, altra cartella) non apre nulla. */
function signedValue(mode, target, expiresAt) {
  return crypto
    .createHmac('sha256', MEDIA_SECRET)
    .update(`${mode}|${target}|${expiresAt}`)
    .digest('base64url');
}

function signatureValid(url, mode, target) {
  if (!MEDIA_SECRET) return true; // nessun segreto: uso solo locale

  const expiresAt = Number(url.searchParams.get('exp'));
  const given = Buffer.from(url.searchParams.get('sig') || '', 'base64url');
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now() || given.length === 0) return false;

  const expected = Buffer.from(signedValue(mode, target, expiresAt), 'base64url');
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

/* ── token per le rotte di controllo ───────────────────────────────────── */

/** Richiesta arrivata dall'esterno (tunnel, LAN): non ha l'host di loopback e
 * Cloudflare ci mette i suoi header. Quelle fatte dal Mac restano locali. */
function fromOutside(req) {
  if (req.headers['cf-ray'] || req.headers['cf-connecting-ip']) return true;
  const host = String(req.headers.host || '');
  return !/^(127\.0\.0\.1|localhost|\[::1\])(:|$)/.test(host);
}

/** Elenco file, cartelle, cancellazioni e pagina di consultazione non hanno una
 * firma come /file e /api/files: fuori dal Mac valgono solo col token condiviso
 * col gestionale. Senza DRIVE_MEDIA_SECRET l'agente resta aperto come prima. */
function requiresAgentToken(req, pathname) {
  if (!MEDIA_SECRET) return false;
  if (req.method === 'POST' && pathname === '/api/files') return false; // firma HMAC
  if ((req.method === 'GET' || req.method === 'HEAD') && pathname.startsWith('/file/')) return false;
  if (req.method === 'GET' && pathname === '/api/health') return false; // controllo di stato
  return fromOutside(req);
}

function tokenValid(req) {
  const given = Buffer.from(String(req.headers['x-drive-token'] || ''));
  const expected = Buffer.from(MEDIA_SECRET);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

/* ── upload ────────────────────────────────────────────────────────────── */

async function handleUpload(req, res, url) {
  const requestedName = url.searchParams.get('name');
  if (!requestedName) return sendJson(res, 400, { error: 'parametro name mancante' });

  // Il caricamento diretto dal browser arriva qui: firma su nome e cartella,
  // verificata prima di leggere il corpo.
  const rawFolder = url.searchParams.get('folder') || '';
  if (MEDIA_SECRET && !signatureValid(url, 'upload', `${requestedName}|${rawFolder}`)) {
    return sendJson(res, 403, { error: 'link di caricamento scaduto o non valido' });
  }

  const fileName = sanitizeName(requestedName);
  const folder = sanitizeFolder(url.searchParams.get('folder'));
  const folderAbs = path.join(ROOT, folder);
  await fsp.mkdir(folderAbs, { recursive: true });

  const { target, stream } = await openUnique(folderAbs, fileName);
  const hash = crypto.createHash('sha256');
  let size = 0;

  const counter = new Transform({
    transform(chunk, _encoding, done) {
      hash.update(chunk);
      size += chunk.length;
      done(null, chunk);
    },
  });

  try {
    await pipeline(req, counter, stream);
  } catch (error) {
    stream.destroy();
    await fsp.rm(target, { force: true }).catch(() => {});
    throw error;
  }

  if (size === 0) {
    await fsp.rm(target, { force: true }).catch(() => {});
    return sendJson(res, 400, { error: 'file vuoto' });
  }

  const sha256 = hash.digest('hex');
  const duplicate = state.assets.find((item) => item.sha256 === sha256);
  const mime = mimeOf(target);

  const asset = {
    id: crypto.randomUUID(),
    name: path.basename(target),
    folder,
    relPath: path.relative(ROOT, target),
    size,
    mime,
    kind: kindOf(mime),
    sha256,
    duplicateOf: duplicate ? duplicate.id : null,
    createdAt: new Date().toISOString(),
    width: null,
    height: null,
    duration: null,
    thumb: false,
  };

  try {
    await makeThumbnail(asset, target);
  } catch (error) {
    log('anteprima non riuscita per', asset.name, '-', error.message);
  }

  state.assets.push(asset);
  await persistIndex().catch((error) => log('ERRORE salvataggio indice:', error.message));
  log(`salvato ${asset.relPath} (${(size / MIB).toFixed(1)} MB) anteprima=${asset.thumb}`);

  // La copia di sicurezza non blocca la risposta all'upload.
  queueMirror(asset.relPath);
  void pumpMirror();

  sendJson(res, 201, {
    asset,
    duplicate: duplicate ? { id: duplicate.id, relPath: duplicate.relPath } : null,
  });
}

/* ── download ──────────────────────────────────────────────────────────── */

function parseRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(String(header).trim());
  if (!match) return null;

  const [, startRaw, endRaw] = match;
  if (startRaw === '' && endRaw === '') return null;

  let start;
  let end;
  if (startRaw === '') {
    const length = Number(endRaw);
    if (!length) return null;
    start = Math.max(0, size - length);
    end = size - 1;
  } else {
    start = Number(startRaw);
    end = endRaw === '' ? size - 1 : Math.min(Number(endRaw), size - 1);
  }

  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (start < 0 || start > end || start >= size) return null;
  return { start, end };
}

function contentDisposition(fileName) {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  const encoded = encodeURIComponent(fileName).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `inline; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

async function serveOriginal(req, res, asset) {
  const absolutePath = assetPath(asset.relPath);
  let stat;
  try {
    if (!absolutePath) throw new Error('percorso fuori dalla root');
    stat = await fsp.stat(absolutePath);
  } catch {
    return sendJson(res, 404, { error: 'file non trovato sul disco' });
  }

  const headers = {
    'Content-Type': asset.mime,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, max-age=0, must-revalidate',
    'Content-Disposition': contentDisposition(asset.name),
  };

  const range = req.headers.range ? parseRange(req.headers.range, stat.size) : null;

  if (req.headers.range && !range) {
    res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
    return res.end();
  }

  if (!range) {
    res.writeHead(200, { ...headers, 'Content-Length': stat.size });
    if (req.method === 'HEAD') return res.end();
    return fs.createReadStream(absolutePath).pipe(res);
  }

  res.writeHead(206, {
    ...headers,
    'Content-Range': `bytes ${range.start}-${range.end}/${stat.size}`,
    'Content-Length': range.end - range.start + 1,
  });
  if (req.method === 'HEAD') return res.end();
  return fs.createReadStream(absolutePath, { start: range.start, end: range.end }).pipe(res);
}

/* ── cartelle ──────────────────────────────────────────────────────────── */

/** Cartelle reali sul disco: servono al gestionale per mostrare anche quelle
 * vuote, che l'indice non conosce. */
async function listFolders() {
  const found = [];
  async function walk(dir) {
    const entries = await fsp.readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      const absolute = path.join(dir, entry.name);
      found.push(path.relative(ROOT, absolute));
      await walk(absolute);
    }
  }
  await walk(ROOT);
  return found.sort((a, b) => a.localeCompare(b));
}

async function handleCreateFolder(res, url) {
  const folder = sanitizeFolder(url.searchParams.get('folder'));
  if (!folder) return sendJson(res, 400, { error: 'nome cartella non valido' });

  try {
    await fsp.mkdir(path.join(ROOT, folder), { recursive: true });
  } catch (error) {
    return sendJson(res, 500, { error: `cartella non creata: ${error.message}` });
  }

  log('cartella creata:', folder);
  return sendJson(res, 201, { folder });
}

async function handleRenameFolder(res, url) {
  const from = sanitizeFolder(url.searchParams.get('folder'));
  const to = sanitizeFolder(url.searchParams.get('to'));
  if (!from) return sendJson(res, 400, { error: 'cartella di origine mancante' });
  if (!to) return sendJson(res, 400, { error: 'nuovo nome mancante' });
  if (from === to) return sendJson(res, 400, { error: 'il nome è già questo' });

  const fromAbs = path.join(ROOT, from);
  const toAbs = path.join(ROOT, to);

  let stat;
  try {
    stat = await fsp.stat(fromAbs);
  } catch {
    return sendJson(res, 404, { error: 'cartella non trovata' });
  }
  if (!stat.isDirectory()) return sendJson(res, 400, { error: 'non è una cartella' });

  const destExists = await fsp.stat(toAbs).catch(() => null);
  if (destExists) return sendJson(res, 409, { error: 'esiste già una cartella con questo nome' });

  try {
    await fsp.mkdir(path.dirname(toAbs), { recursive: true });
    await fsp.rename(fromAbs, toAbs);
  } catch (error) {
    return sendJson(res, 500, { error: `rinomina non riuscita: ${error.message}` });
  }

  // Aggiorna l'indice: la cartella e i suoi figli cambiano percorso.
  for (const asset of state.assets) {
    if (asset.folder === from || asset.folder.startsWith(from + '/')) {
      asset.relPath = to + asset.relPath.slice(from.length);
      asset.folder = to + asset.folder.slice(from.length);
    }
  }
  await persistIndex().catch((error) => log('ERRORE salvataggio indice:', error.message));

  log('cartella rinominata:', from, '->', to);
  return sendJson(res, 200, { folder: to });
}

/** Elimina la cartella senza perdere nulla: i file (e le sottocartelle) salgono
 * nella cartella superiore, poi la cartella ormai vuota si toglie dal disco. */
async function handleDeleteFolder(res, url) {
  const folder = sanitizeFolder(url.searchParams.get('folder'));
  if (!folder) return sendJson(res, 400, { error: 'nome cartella mancante' });

  const abs = path.join(ROOT, folder);
  let stat;
  try {
    stat = await fsp.stat(abs);
  } catch {
    return sendJson(res, 404, { error: 'cartella non trovata' });
  }
  if (!stat.isDirectory()) return sendJson(res, 400, { error: 'non è una cartella' });

  const parent = folder.includes('/') ? folder.slice(0, folder.lastIndexOf('/')) : '';
  const parentAbs = path.join(ROOT, parent);
  const moves = [];

  try {
    await fsp.mkdir(parentAbs, { recursive: true });
    const entries = await fsp.readdir(abs, { withFileTypes: true });
    for (const entry of entries) {
      const name = await uniqueEntry(parentAbs, entry.name, entry.isDirectory());
      await fsp.rename(path.join(abs, entry.name), path.join(parentAbs, name));
      moves.push({ from: `${folder}/${entry.name}`, to: parent ? `${parent}/${name}` : name });
    }
  } catch (error) {
    return sendJson(res, 500, { error: `cartella non eliminata: ${error.message}` });
  }

  // Se qualcosa è rimasto (permessi, file bloccati) la cartella resta: meglio un
  // errore che un contenuto sparito.
  try {
    await fsp.rmdir(abs);
  } catch (error) {
    return sendJson(res, 500, {
      error: `cartella non vuota, niente eliminato: ${error.message}`,
    });
  }

  // L'indice segue i file spostati: id, hash e anteprime restano gli stessi.
  for (const asset of state.assets) {
    const move = moves.find(
      (item) => asset.relPath === item.from || asset.relPath.startsWith(item.from + '/'),
    );
    if (!move) continue;
    asset.relPath = move.to + asset.relPath.slice(move.from.length);
    asset.folder = path.posix.dirname(asset.relPath);
    if (asset.folder === '.') asset.folder = '';
  }
  await persistIndex().catch((error) => log('ERRORE salvataggio indice:', error.message));

  log(`cartella eliminata: ${folder} (${moves.length} elementi passati in ${parent || 'radice'})`);
  return sendJson(res, 200, { folder, moved: moves.length, parent });
}

/* ── spostamenti, rinomine e cancellazioni dei file ────────────────────── */

/** Rinomina un singolo file restando nella sua cartella. */
async function renameAsset(res, id, url) {
  const asset = state.assets.find((item) => item.id === id);
  if (!asset) return sendJson(res, 404, { error: 'file non indicizzato' });

  const nextName = sanitizeName(url.searchParams.get('name'));
  if (!nextName || nextName === 'file') return sendJson(res, 400, { error: 'nome non valido' });
  if (nextName === asset.name) return sendJson(res, 400, { error: 'il nome è già questo' });

  const source = assetPath(asset.relPath);
  if (!source) return sendJson(res, 400, { error: 'percorso non valido' });

  const target = path.join(path.dirname(source), nextName);
  if (await fsp.stat(target).catch(() => null)) {
    return sendJson(res, 409, { error: 'esiste già un file con questo nome' });
  }

  try {
    await fsp.rename(source, target);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      return sendJson(res, 500, { error: `rinomina non riuscita: ${error.message}` });
    }
    // File sparito dal disco: l'indice resta coerente col nome nuovo.
  }

  asset.name = nextName;
  asset.relPath = path.relative(ROOT, target);
  asset.mime = mimeOf(nextName);
  asset.kind = kindOf(asset.mime);
  await persistIndex().catch((error) => log('ERRORE salvataggio indice:', error.message));

  log('file rinominato:', id, '->', asset.relPath);
  return sendJson(res, 200, { id: asset.id, name: asset.name, relPath: asset.relPath });
}

/** Sposta i file selezionati in una cartella esistente (o nella radice). */
async function handleMoveAssets(req, res) {
  const payload = await readJsonBody(req);
  const ids = requestedIds(payload);
  if (ids.length === 0) return sendJson(res, 400, { error: 'nessun file selezionato' });

  const folder = sanitizeFolder(payload && payload.folder);
  const destAbs = path.join(ROOT, folder);
  try {
    await fsp.mkdir(destAbs, { recursive: true });
  } catch (error) {
    return sendJson(res, 500, { error: `cartella di destinazione non disponibile: ${error.message}` });
  }

  const moved = [];
  for (const id of ids) {
    const asset = state.assets.find((item) => item.id === id);
    if (!asset || asset.folder === folder) continue;

    const source = assetPath(asset.relPath);
    if (!source) continue;

    const name = await uniqueEntry(destAbs, asset.name, false);
    try {
      await fsp.rename(source, path.join(destAbs, name));
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }

    asset.name = name;
    asset.folder = folder;
    asset.relPath = path.relative(ROOT, path.join(destAbs, name));
    moved.push(asset.id);
  }

  await persistIndex().catch((error) => log('ERRORE salvataggio indice:', error.message));
  log(`spostati ${moved.length} file in ${folder || 'radice'}`);
  return sendJson(res, 200, { moved: moved.length, folder });
}

/** Cestina i file selezionati uno per uno, come la cancellazione singola. */
async function handleDeleteAssets(req, res) {
  const payload = await readJsonBody(req);
  const ids = requestedIds(payload);
  if (ids.length === 0) return sendJson(res, 400, { error: 'nessun file selezionato' });

  const deleted = [];
  for (const id of ids) {
    if (await trashAsset(id)) deleted.push(id);
  }

  await persistIndex().catch((error) => log('ERRORE salvataggio indice:', error.message));
  log(`cestinati ${deleted.length} file`);
  return sendJson(res, 200, { deleted: deleted.length });
}

/* ── copia di sicurezza su un secondo disco ────────────────────────────── */

const MIRROR_SUBDIR = 'Drive Under the Tower Factory';
const MIRROR_SWEEP_MS = 10 * 60 * 1000;
const MANIFEST_NAME = '.uttf-manifest.json';
// FAT32 arrotonda i tempi a 2 s: senza tolleranza una copia appena fatta
// sembrerebbe piu' vecchia dell'originale e verrebbe rifatta a ogni passata.
const MTIME_TOLERANCE_MS = 2000;

/** File da copiare: un Set evita i duplicati senza scandire l'array. */
const mirrorQueue = new Set();
const mirror = { running: false, lastCopyAt: null, lastError: null };

/** Cosa c'e' sul disco di copia: e' il manifest che permette confronto e ripristino. */
const manifest = { files: [], updatedAt: null, loaded: false, changed: false };

function mirrorRoot() {
  return CONFIG.mirrorVolume ? path.join(CONFIG.mirrorVolume, MIRROR_SUBDIR) : '';
}

/** Il volume deve essere davvero montato: senza questo controllo la copia
 * finirebbe sul disco interno creando /Volumes/<nome> a mano. */
function mirrorMounted() {
  if (!CONFIG.mirrorVolume) return false;
  try {
    const volume = fs.statSync(CONFIG.mirrorVolume);
    const parent = fs.statSync(path.dirname(CONFIG.mirrorVolume));
    return volume.isDirectory() && volume.dev !== parent.dev;
  } catch {
    return false;
  }
}

function manifestFile() {
  return path.join(mirrorRoot(), MANIFEST_NAME);
}

function mirrorStatus() {
  return {
    configured: Boolean(CONFIG.mirrorVolume),
    volume: CONFIG.mirrorVolume || null,
    mounted: mirrorMounted(),
    pending: mirrorQueue.size,
    // Dopo un riavvio la data dell'ultima copia sopravvive nel manifest.
    lastCopyAt: mirror.lastCopyAt ?? manifest.updatedAt,
    lastError: mirror.lastError,
    manifest: { path: CONFIG.mirrorVolume ? manifestFile() : null, files: manifest.files.length },
  };
}

function isManifestEntry(value) {
  return Boolean(
    value &&
      typeof value.path === 'string' &&
      Number.isFinite(value.size) &&
      typeof value.sha256 === 'string',
  );
}

async function loadManifest() {
  manifest.files = [];
  manifest.updatedAt = null;
  manifest.changed = false;
  try {
    const parsed = JSON.parse(await fsp.readFile(manifestFile(), 'utf8'));
    if (Array.isArray(parsed.files)) manifest.files = parsed.files.filter(isManifestEntry);
    if (typeof parsed.updatedAt === 'string') manifest.updatedAt = parsed.updatedAt;
  } catch (error) {
    if (error.code !== 'ENOENT') log('manifest illeggibile:', error.message, '- lo ricostruisco');
  }
  manifest.loaded = true;
}

/** Il manifest sta sul disco di copia: se il disco viene collegato dopo l'avvio
 * (o sostituito) si rilegge da li'. */
async function ensureManifest() {
  if (!mirrorMounted()) {
    manifest.loaded = false;
    return false;
  }
  if (!manifest.loaded) await loadManifest();
  return true;
}

function rememberEntry(relPath, size, sha256) {
  const entry = { path: relPath, size, sha256, copiedAt: new Date().toISOString() };
  const at = manifest.files.findIndex((item) => item.path === relPath);
  if (at === -1) manifest.files.push(entry);
  else manifest.files[at] = entry;
  manifest.changed = true;
}

function rememberCopy(relPath, size, sha256) {
  rememberEntry(relPath, size, sha256);
  mirror.lastCopyAt = new Date().toISOString();
}

/** File gia' presente sul backup: si annota con l'hash dell'indice, che e' la
 * fonte di verita' (backup-verify ricontrolla il contenuto reale). */
function rememberExisting(relPath, size) {
  if (manifest.files.some((item) => item.path === relPath && item.size === size)) return;
  const indexed = state.assets.find((asset) => asset.relPath === relPath);
  if (indexed && indexed.size === size) rememberEntry(relPath, size, indexed.sha256);
}

/** Scrive il manifest solo se e' cambiato: su FAT32 ogni scrittura costa. */
async function writeManifest() {
  if (!manifest.changed || !mirrorMounted()) return;

  const updatedAt = mirror.lastCopyAt ?? new Date().toISOString();
  const payload = {
    version: 1,
    disk: ROOT,
    updatedAt,
    totals: {
      files: manifest.files.length,
      bytes: manifest.files.reduce((sum, item) => sum + item.size, 0),
    },
    files: manifest.files.slice().sort((a, b) => a.path.localeCompare(b.path)),
  };

  try {
    const tmp = `${manifestFile()}.part`;
    await fsp.writeFile(tmp, JSON.stringify(payload, null, 2));
    await fsp.rename(tmp, manifestFile());
    manifest.updatedAt = updatedAt;
    manifest.changed = false;
  } catch (error) {
    log('ERRORE scrittura manifest:', error.message);
  }
}

/** true = copiato o gia' presente; false = disco sparito durante la copia,
 * quindi il file resta in coda per il tentativo successivo. */
async function copyToMirror(relPath) {
  const destRoot = mirrorRoot();
  const source = assetPath(relPath);
  if (!destRoot || !source) return true;

  const dest = path.resolve(destRoot, relPath);
  if (!dest.startsWith(path.resolve(destRoot) + path.sep)) return true;

  let stat;
  try {
    stat = await fsp.stat(source);
  } catch {
    return true; // sparito dal drive: niente da copiare
  }
  if (!stat.isFile()) return true;

  const existing = await fsp.stat(dest).catch(() => null);
  if (
    existing?.isFile() &&
    existing.size === stat.size &&
    existing.mtimeMs + MTIME_TOLERANCE_MS >= stat.mtimeMs
  ) {
    rememberExisting(relPath, stat.size);
    await writeManifest();
    mirror.lastError = null; // il disco risponde: l'errore precedente e' superato
    return true;
  }

  const temp = `${dest}.part`;
  const hash = crypto.createHash('sha256');

  try {
    // Copia e hash in un solo passaggio, poi rename: mai file a meta' visibili.
    await fsp.mkdir(path.dirname(dest), { recursive: true });
    await pipeline(
      fs.createReadStream(source),
      new Transform({
        transform(chunk, _encoding, done) {
          hash.update(chunk);
          done(null, chunk);
        },
      }),
      fs.createWriteStream(temp),
    );

    const sha256 = hash.digest('hex');
    const indexed = state.assets.find((asset) => asset.relPath === relPath);
    if (indexed && indexed.sha256 !== sha256) throw new Error('copia non identica (hash diverso)');

    await fsp.rename(temp, dest);
    rememberCopy(relPath, stat.size, sha256);
    await writeManifest();
    mirror.lastError = null;
    log(`copia di sicurezza: ${relPath}`);
    return true;
  } catch (error) {
    await fsp.rm(temp, { force: true }).catch(() => {});
    mirror.lastError =
      error.code === 'EFBIG'
        ? `${relPath}: il disco di copia (FAT32) non accetta file oltre 4 GB`
        : `${relPath}: ${error.message}`;
    log('ERRORE copia di sicurezza:', mirror.lastError);
    // Volume sparito: si ritenta. Per gli altri errori ritentare non serve.
    return mirrorMounted();
  }
}

function queueMirror(relPath) {
  if (CONFIG.mirrorVolume && relPath) mirrorQueue.add(relPath);
}

/** Un solo worker: copia un file alla volta. Se il disco sparisce si ferma
 * lasciando i file in coda, senza perderli. */
async function pumpMirror() {
  if (!CONFIG.mirrorVolume || mirror.running) return;
  mirror.running = true;
  try {
    if (!(await ensureManifest())) return;
    while (mirrorQueue.size) {
      const relPath = mirrorQueue.values().next().value;
      mirrorQueue.delete(relPath);
      if (!(await copyToMirror(relPath))) {
        mirrorQueue.add(relPath);
        break;
      }
    }
  } finally {
    mirror.running = false;
  }
}

/** Passata periodica: recupera anche i file copiati a mano sul drive. */
async function sweepMirror() {
  if (!CONFIG.mirrorVolume || !mirrorMounted()) return;

  const relPaths = [];
  async function walk(dir) {
    const entries = await fsp.readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (entry.name === '.uttf-drive') continue;
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else if (entry.isFile()) relPaths.push(path.relative(ROOT, absolute));
    }
  }

  await walk(ROOT);
  for (const relPath of relPaths) queueMirror(relPath);
  await pumpMirror();
}

/* ── pagina di consultazione ───────────────────────────────────────────── */

function renderIndexPage() {
  const usedBytes = state.assets.reduce((sum, asset) => sum + asset.size, 0);

  let free = null;
  let total = null;
  try {
    const stats = fs.statfsSync(ROOT);
    free = stats.bavail * stats.bsize;
    total = stats.blocks * stats.bsize;
  } catch {
    /* statfs non disponibile */
  }

  const cards = state.assets
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map((asset) => {
      const badge = asset.kind === 'video' ? 'VIDEO' : asset.kind === 'image' ? 'FOTO' : 'FILE';
      const meta = [formatBytes(asset.size), asset.folder || 'radice'];
      if (asset.duration) meta.push(`${Math.round(asset.duration)}s`);
      if (asset.width && asset.height) meta.push(`${asset.width}×${asset.height}`);
      return `
        <a class="card" href="/file/${asset.id}" target="_blank" rel="noreferrer" data-name="${escapeHtml(asset.name.toLowerCase())}">
          <div class="thumb">
            ${asset.thumb ? `<img src="/thumb/${asset.id}" alt="${escapeHtml(asset.name)}" loading="lazy" />` : `<span class="noimg">${badge}</span>`}
            <span class="badge">${badge}</span>
          </div>
          <div class="info">
            <p class="name" title="${escapeHtml(asset.name)}">${escapeHtml(asset.name)}</p>
            <p class="meta">${escapeHtml(meta.join(' · '))}</p>
            <p class="hash">${asset.sha256.slice(0, 12)}${asset.duplicateOf ? ' · duplicato' : ''}</p>
          </div>
        </a>`;
    })
    .join('');

  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Under the Tower Factory — Drive</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #09090b; color: #e4e4e7; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
  header { position: sticky; top: 0; z-index: 10; backdrop-filter: blur(14px); background: rgba(9,9,11,.82); border-bottom: 1px solid #27272a; padding: 14px 20px; }
  .wrap, main, footer { max-width: 1240px; margin: 0 auto; }
  h1 { margin: 0; font-size: 15px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
  h1 span { color: #FF914D; }
  .stats { display: flex; flex-wrap: wrap; gap: 18px; margin-top: 8px; font-size: 11px; color: #71717a; letter-spacing: .06em; text-transform: uppercase; }
  .stats b { color: #d4d4d8; font-variant-numeric: tabular-nums; }
  main { padding: 20px; }
  .toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 18px; flex-wrap: wrap; }
  input[type=search], input[type=text] { flex: 1 1 240px; min-width: 180px; background: #111113; border: 1px solid #27272a; color: #e4e4e7; border-radius: 10px; padding: 11px 14px; font-size: 14px; outline: none; }
  input:focus { border-color: rgba(255,145,77,.5); }
  .upload { display: inline-flex; align-items: center; height: 42px; padding: 0 18px; border-radius: 10px; background: #FF914D; color: #09090b; font-size: 13px; font-weight: 700; cursor: pointer; user-select: none; }
  .status { flex: 1 0 100%; font-size: 11px; color: #a1a1aa; font-family: ui-monospace, monospace; min-height: 14px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 14px; }
  .card { display: flex; flex-direction: column; text-decoration: none; color: inherit; border: 1px solid #27272a; border-radius: 14px; overflow: hidden; background: #0f0f11; transition: border-color .15s, transform .15s; }
  .card:hover { border-color: rgba(255,145,77,.45); transform: translateY(-2px); }
  .thumb { position: relative; aspect-ratio: 4/3; background: #18181b; display: flex; align-items: center; justify-content: center; }
  .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .noimg { font-size: 11px; font-weight: 700; letter-spacing: .2em; color: #52525b; }
  .badge { position: absolute; top: 8px; left: 8px; font-size: 9px; font-weight: 800; letter-spacing: .14em; padding: 4px 7px; border-radius: 6px; background: rgba(9,9,11,.75); color: #FF914D; border: 1px solid rgba(255,145,77,.35); }
  .info { padding: 11px 12px 13px; border-top: 1px solid #1f1f22; }
  .name { margin: 0; font-size: 12.5px; font-weight: 650; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .meta { margin: 5px 0 0; font-size: 10.5px; color: #71717a; }
  .hash { margin: 3px 0 0; font-size: 9.5px; font-family: ui-monospace, monospace; color: #52525b; }
  .empty { border: 1px dashed #27272a; border-radius: 14px; padding: 40px; text-align: center; color: #71717a; font-size: 13px; }
  footer { padding: 8px 20px 40px; font-size: 10.5px; color: #52525b; }
</style>
</head>
<body>
<header><div class="wrap">
  <h1>UndertheTower <span>/ DRIVE</span></h1>
  <div class="stats">
    <span><b>${state.assets.length}</b> file</span>
    <span><b>${formatBytes(usedBytes)}</b> indicizzati</span>
    ${free !== null ? `<span><b>${formatBytes(free)}</b> liberi su ${formatBytes(total)}</span>` : ''}
    <span>cartella <b>${escapeHtml(ROOT)}</b></span>
  </div>
</div></header>
<main>
  <div class="toolbar">
    <input id="q" type="search" placeholder="Cerca per nome file…" />
    <input id="folder" type="text" placeholder="Cartella (es. Foto/2026)" />
    <label class="upload">Carica file<input id="files" type="file" multiple hidden /></label>
    <span class="meta" id="count"></span>
    <p class="status" id="status"></p>
  </div>
  ${state.assets.length ? `<div class="grid" id="grid">${cards}</div>` : `<div class="empty">Nessun file. Caricane uno con:<br /><code>node drive-agent/upload.cjs percorso/file.jpg --folder=Foto</code></div>`}
</main>
<footer>Agente locale · porta ${CONFIG.port} · solo loopback · indice in .uttf-drive/index.json.</footer>
<script>
  const q = document.getElementById('q');
  const cards = Array.from(document.querySelectorAll('.card'));
  const count = document.getElementById('count');
  function apply() {
    const term = q.value.trim().toLowerCase();
    let shown = 0;
    for (const card of cards) {
      const hit = !term || card.dataset.name.includes(term);
      card.style.display = hit ? '' : 'none';
      if (hit) shown += 1;
    }
    count.textContent = shown + ' / ' + cards.length;
  }
  q.addEventListener('input', apply);
  apply();

  const fileInput = document.getElementById('files');
  const folderInput = document.getElementById('folder');
  const status = document.getElementById('status');

  function send(file) {
    return new Promise(function (resolve, reject) {
      const params = new URLSearchParams({ name: file.name });
      const folder = folderInput.value.trim();
      if (folder) params.set('folder', folder);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/files?' + params.toString());
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');
      xhr.upload.onprogress = function (event) {
        if (event.lengthComputable) {
          status.textContent = file.name + ' — ' + Math.round((event.loaded / event.total) * 100) + '%';
        }
      };
      xhr.onload = function () {
        if (xhr.status === 201) return resolve();
        reject(new Error('HTTP ' + xhr.status + ' ' + xhr.responseText.slice(0, 140)));
      };
      xhr.onerror = function () { reject(new Error('errore di rete')); };
      xhr.send(file);
    });
  }

  fileInput.addEventListener('change', async function () {
    const files = Array.from(fileInput.files || []);
    for (const file of files) {
      status.textContent = 'carico ' + file.name;
      try {
        await send(file);
      } catch (error) {
        status.textContent = '✗ ' + file.name + ': ' + error.message;
        return;
      }
    }
    status.textContent = '✓ ' + files.length + ' file caricati';
    setTimeout(function () { location.reload(); }, 400);
  });
</script>
</body>
</html>`;
}

/* ── server ────────────────────────────────────────────────────────────── */

/** Sposta un file nel cestino e lo toglie dall'indice. false = id sconosciuto. */
async function trashAsset(id) {
  const index = state.assets.findIndex((asset) => asset.id === id);
  if (index === -1) return false;

  const asset = state.assets[index];
  const source = assetPath(asset.relPath);
  const target = path.join(TRASH_DIR, `${Date.now()}-${path.basename(asset.relPath)}`);

  if (source) {
    try {
      // Stesso volume: rename, nessuna copia.
      await fsp.rename(source, target);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      // File gia' sparito dal disco: esce solo dall'indice.
    }
  }

  await fsp.rm(path.join(THUMB_DIR, `${asset.id}.webp`), { force: true }).catch(() => {});
  state.assets.splice(index, 1);
  return true;
}

async function deleteAsset(res, id) {
  if (!(await trashAsset(id))) return sendJson(res, 404, { error: 'file non indicizzato' });
  await persistIndex().catch((error) => log('ERRORE salvataggio indice:', error.message));
  return sendJson(res, 200, { trashed: true });
}

const server = http.createServer(async (req, res) => {
  const started = Date.now();
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  res.on('finish', () => {
    log(`${req.method} ${url.pathname}${url.search ? '?…' : ''} → ${res.statusCode} (${Date.now() - started}ms)`);
  });

  try {
    const { pathname } = url;

    // Browser diretto sul tunnel: solo l'origine del gestionale.
    if (ALLOWED_ORIGIN && req.headers.origin === ALLOWED_ORIGIN) {
      res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'content-type, range');
      res.setHeader('Access-Control-Expose-Headers', 'content-length, content-range, accept-ranges');
      res.setHeader('Access-Control-Max-Age', '600');
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    // Dall'esterno servono il token: elenco, cartelle e cancellazioni non sono
    // protetti da una firma come i file.
    if (requiresAgentToken(req, pathname) && !tokenValid(req)) {
      return sendJson(res, 401, { error: 'token dell’agente mancante o errato' });
    }

    if (req.method === 'POST' && pathname === '/api/files') {
      return await handleUpload(req, res, url);
    }

    if (req.method === 'GET' && pathname === '/api/files') {
      return sendJson(res, 200, { root: ROOT, count: state.assets.length, assets: state.assets });
    }

    if (req.method === 'GET' && pathname === '/api/folders') {
      return sendJson(res, 200, { folders: await listFolders() });
    }

    if (req.method === 'POST' && pathname === '/api/folders') {
      return await handleCreateFolder(res, url);
    }

    if (req.method === 'PATCH' && pathname === '/api/folders') {
      return await handleRenameFolder(res, url);
    }

    if (req.method === 'DELETE' && pathname === '/api/folders') {
      return await handleDeleteFolder(res, url);
    }

    if (req.method === 'POST' && pathname === '/api/files/move') {
      return await handleMoveAssets(req, res);
    }

    if (req.method === 'POST' && pathname === '/api/files/delete') {
      return await handleDeleteAssets(req, res);
    }

    if (req.method === 'PATCH' && pathname.startsWith('/api/files/')) {
      return await renameAsset(res, pathname.slice('/api/files/'.length), url);
    }

    if (req.method === 'GET' && pathname === '/api/health') {
      let disk = null;
      try {
        const stats = await fsp.statfs(ROOT);
        disk = { free: stats.bavail * stats.bsize, total: stats.blocks * stats.bsize };
      } catch {
        /* statfs non disponibile */
      }
      return sendJson(res, 200, {
        ok: true,
        root: ROOT,
        files: state.assets.length,
        bytes: state.assets.reduce((sum, asset) => sum + asset.size, 0),
        disk,
        mirror: mirrorStatus(),
        hostname: os.hostname(),
        uptimeSeconds: Math.round(process.uptime()),
      });
    }

    if (req.method === 'DELETE' && pathname.startsWith('/api/files/')) {
      return await deleteAsset(res, pathname.slice('/api/files/'.length));
    }

    if (req.method === 'GET' && pathname.startsWith('/thumb/')) {
      const id = pathname.slice('/thumb/'.length);
      const asset = state.assets.find((item) => item.id === id);
      if (!asset || !asset.thumb) return sendJson(res, 404, { error: 'anteprima non disponibile' });

      try {
        const data = await fsp.readFile(path.join(THUMB_DIR, `${id}.webp`));
        res.writeHead(200, {
          'Content-Type': 'image/webp',
          'Content-Length': data.length,
          'Cache-Control': 'public, max-age=31536000, immutable',
        });
        return res.end(data);
      } catch {
        return sendJson(res, 404, { error: 'anteprima non disponibile' });
      }
    }

    if ((req.method === 'GET' || req.method === 'HEAD') && pathname.startsWith('/file/')) {
      const id = pathname.slice('/file/'.length);
      if (!signatureValid(url, 'file', id)) {
        return sendJson(res, 403, { error: 'link scaduto o non valido' });
      }
      const asset = state.assets.find((item) => item.id === id);
      if (!asset) return sendJson(res, 404, { error: 'file non indicizzato' });
      return await serveOriginal(req, res, asset);
    }

    if (req.method === 'GET' && pathname === '/') {
      return sendHtml(res, 200, renderIndexPage());
    }

    return sendJson(res, 404, { error: 'rotta non trovata' });
  } catch (error) {
    log('ERRORE', req.method, url.pathname, error.message);
    if (!res.headersSent) return sendJson(res, 500, { error: error.message });
    return res.end();
  }
});

server.on('clientError', (error, socket) => {
  log('clientError', error.message);
  if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    log(`porta ${CONFIG.port} gia' occupata: un altro agente e' attivo?`);
  } else {
    log('errore server:', error.message);
  }
  process.exit(1);
});

function lanAddresses() {
  const found = [];
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries || []) {
      if (entry.family === 'IPv4' && !entry.internal) found.push(entry.address);
    }
  }
  return found;
}

function shutdown(signal) {
  log(`arresto (${signal})…`);
  server.close();
  const done = () => process.exit(0);
  // Aspetta l'ultimo salvataggio dell'indice, senza restare appeso.
  setTimeout(done, 3000).unref();
  saveQueue.catch(() => {}).then(done);
}

// Un upload da 1,9 GB su questo disco va a ~1 MB/s, cioè molto oltre i 5
// minuti: il requestTimeout predefinito di Node (300 s) chiudeva la
// connessione a metà e l'upload abortiva sempre. Il limite resta, ma largo
// abbastanza per il file più grosso: un'ora di richiesta (header esclusi) più
// il doppio del tempo che serve a 1 MB/s per un file da 3 GB, e se il client
// muore la connessione non resta occupata per sempre.
server.requestTimeout = 60 * 60 * 1000;
server.headersTimeout = 60 * 1000;

(async () => {
  await loadIndex();
  server.listen(CONFIG.port, CONFIG.host, () => {
    log('──────────────────────────────────────────────');
    log('UTTF DRIVE AGENT attivo');
    log('cartella disco:', ROOT);
    if (CONFIG.host === '0.0.0.0' || CONFIG.host === '::') {
      for (const address of lanAddresses()) log('raggiungibile in rete:', 'http://' + address + ':' + CONFIG.port);
      log('attenzione: esposto sulla rete, senza autenticazione');
    } else {
      log('raggiungibile solo da questo Mac:', 'http://' + CONFIG.host + ':' + CONFIG.port);
    }
    if (CONFIG.mirrorVolume) {
      log('copia di sicurezza:', mirrorMounted() ? mirrorRoot() : `${CONFIG.mirrorVolume} non collegato`);
    } else {
      log('copia di sicurezza: disattivata');
    }
    log('──────────────────────────────────────────────');

    if (CONFIG.mirrorVolume) {
      // Carica subito il manifest: dopo un riavvio lo stato non deve risultare vuoto.
      void ensureManifest();
      setTimeout(() => void sweepMirror(), 5000).unref();
      setInterval(() => void sweepMirror(), MIRROR_SWEEP_MS).unref();
    }
  });
})();

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => shutdown(signal));
}

process.on('unhandledRejection', (error) => {
  log('promise non gestita:', error instanceof Error ? error.message : String(error));
});
