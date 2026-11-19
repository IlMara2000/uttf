#!/usr/bin/env node
'use strict';

/**
 * Copia Foto/Video di Backup dentro il drive UTTF passando dall'API di upload
 * dell'agente (firma HMAC), così i file finiscono indicizzati nell'indice.
 * Non sposta niente: la sorgente resta intatta.
 *
 *   INGEST_CONCURRENCY=1 node "$HOME/Library/Application Support/UTTF/uttf-ingest.cjs"
 *
 * Rilanciabile quando vuoi: salta i file già indicizzati dall'agente, quindi
 * riprende sempre da dove si era fermato. La skip list dei duplicati viene
 * letta da uttf-skip.json nella stessa cartella (o da INGEST_SKIP).
 */

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { execSync } = require('node:child_process');

function readSecret() {
  if (process.env.DRIVE_MEDIA_SECRET) return process.env.DRIVE_MEDIA_SECRET;
  const { execSync } = require('node:child_process');
  const plist = `${process.env.HOME}/Library/LaunchAgents/com.uttf.drive-agent.plist`;
  return execSync(`plutil -extract EnvironmentVariables.DRIVE_MEDIA_SECRET raw "${plist}"`, { encoding: 'utf8' }).trim();
}

const SECRET = readSecret();
if (!SECRET) {
  console.error('DRIVE_MEDIA_SECRET mancante');
  process.exit(1);
}

// Duplicati già individuati dall'analisi SHA-256: si copia una sola copia per gruppo.
function readSkipList() {
  const fromEnv = process.env.INGEST_SKIP;
  const file = fromEnv || path.join(__dirname, 'uttf-skip.json');
  if (!file || !fs.existsSync(file)) {
    if (fromEnv) {
      console.error(`skip list indicata ma assente: ${file}`);
      process.exit(1);
    }
    return new Set();
  }
  try {
    // Chiavi relative ("Foto/..."): la skip list resta valida anche se il
    // volume viene rimontato con un nome diverso.
    const marker = '/File Temp/Backup/';
    return new Set(JSON.parse(fs.readFileSync(file, 'utf8')).map((entry) => {
      const at = entry.indexOf(marker);
      return at >= 0 ? entry.slice(at + marker.length) : entry;
    }));
  } catch (error) {
    console.error(`skip list illeggibile (${file}): ${error.message}`);
    process.exit(1);
  }
}
const SKIP = readSkipList();

// Byte spediti all'agente e non ancora contabilizzati come file completati.
let bytesInFlight = 0;

let skippedDup = 0;

const AGENT = { host: '127.0.0.1', port: 8787 };

/* ── dove è montato il disco ─────────────────────────────────────────────
 * Il volume non si chiama sempre allo stesso modo: dopo uno scollegamento
 * macOS può rimontarlo come "/Volumes/HIKSEMI" invece di "/Volumes/HIKSEMI 1".
 * Percorsi fissi rompevano la copia appena cambiava il nome, quindi il mount
 * si risolve dall'UUID del volume (o da DRIVE_VOLUME_PATH se indicato).
 */

const VOLUME_UUID = process.env.UTTF_VOLUME_UUID || '77B5C544-2330-3790-89FA-0BEDBCC47CB5';
const MOUNT_CANDIDATES = ['/Volumes/HIKSEMI 1', '/Volumes/HIKSEMI'];

function resolveMount() {
  if (process.env.DRIVE_VOLUME_PATH) return process.env.DRIVE_VOLUME_PATH;
  try {
    const info = execSync(`diskutil info ${VOLUME_UUID}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const match = /Mount Point:\s+(.+)/.exec(info);
    if (match && match[1].trim() && match[1].trim() !== 'Not mounted') return match[1].trim();
  } catch {
    /* disco non collegato */
  }
  for (const candidate of MOUNT_CANDIDATES) {
    if (fs.existsSync(path.join(candidate, 'File Temp', 'Backup'))) return candidate;
  }
  return null;
}

const MOUNT = resolveMount();
const BACKUP_ROOT = MOUNT ? path.join(MOUNT, 'File Temp', 'Backup') : null;
const DRIVE_ROOT = MOUNT ? path.join(MOUNT, 'Drive Under the Tower Factory') : null;

const SOURCES = BACKUP_ROOT
  ? [
      { dir: path.join(BACKUP_ROOT, 'Foto'), dest: 'Foto' },
      { dir: path.join(BACKUP_ROOT, 'Video'), dest: 'Video' },
    ]
  : [];
const TYPES = new Set([
  '.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp', '.gif', '.tif', '.tiff', '.bmp', '.avif',
  '.mp4', '.mov', '.m4v', '.avi', '.mkv', '.webm', '.mts', '.m2ts', '.3gp',
]);

function log(msg) {
  console.log(`${new Date().toISOString()} ${msg}`);
}

function collect(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) collect(abs, out);
    else if (e.isFile() && TYPES.has(path.extname(e.name).toLowerCase())) out.push(abs);
  }
  return out;
}

function uploadOnce(file, dest, relDir) {
  return new Promise((resolve) => {
    const name = path.basename(file);
    const folder = relDir ? `${dest}/${relDir}` : dest;
    const exp = Date.now() + 10 * 60 * 1000;
    const sig = crypto.createHmac('sha256', SECRET).update(`upload|${name}|${folder}|${exp}`).digest('base64url');
    const url = new URL(`http://${AGENT.host}:${AGENT.port}/api/files`);
    url.searchParams.set('name', name);
    url.searchParams.set('folder', folder);
    url.searchParams.set('exp', String(exp));
    url.searchParams.set('sig', sig);

    let size;
    try {
      size = fs.statSync(file).size;
    } catch (error) {
      return resolve({ ok: false, error: error.message, file });
    }

    const req = http.request(url, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream', 'Content-Length': size } }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        if (res.statusCode === 201) {
          let asset = null;
          try { asset = JSON.parse(body).asset; } catch { /* niente */ }
          return resolve({ ok: true, file, relPath: asset?.relPath, size: asset?.size, thumb: asset?.thumb });
        }
        resolve({ ok: false, status: res.statusCode, error: body.slice(0, 200), file });
      });
    });
    // Con il disco che va a 0,5 MB/s uno stallo può superare i 2 minuti senza
    // che passi un byte: 120 s uccidevano l'upload di IMG_0340 (1,9 GB).
    req.setTimeout(Number(process.env.INGEST_TIMEOUT_MS || 1800000), () => {
      req.destroy(new Error('timeout'));
    });
    req.on('error', (error) => resolve({ ok: false, error: error.message, file }));
    const stream = fs.createReadStream(file);
    // Byte già passati all'agente: senza questo, con un file da 1,9 GB la
    // velocità resta a zero nel log finché il file non è finito.
    stream.on('data', (chunk) => { bytesInFlight += chunk.length; });
    stream.on('error', (error) => { req.destroy(error); });
    stream.pipe(req);
  });
}

/* ── una sola istanza alla volta ───────────────────────────────────────── */

const LOCK_FILE = path.join(__dirname, 'uttf-ingest.lock');

/** Lock con pid: se c'è già un ingest vivo, esce senza duplicarlo. */
function acquireLock() {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const fd = fs.openSync(LOCK_FILE, 'wx');
      fs.writeSync(fd, String(process.pid));
      fs.closeSync(fd);
      const release = () => {
        try {
          if (Number(fs.readFileSync(LOCK_FILE, 'utf8')) === process.pid) fs.unlinkSync(LOCK_FILE);
        } catch {
          /* già rimosso */
        }
      };
      process.on('exit', release);
      return;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      let other = 0;
      try {
        other = Number(fs.readFileSync(LOCK_FILE, 'utf8'));
      } catch {
        /* lock illeggibile: si tratta come orfano */
      }
      let alive = false;
      if (other) {
        try {
          process.kill(other, 0);
          alive = true;
        } catch {
          alive = false;
        }
      }
      if (alive) {
        log(`già in esecuzione (pid ${other}): esco senza duplicare il processo`);
        process.exit(0);
      }
      log(`lock orfano (pid ${other} non attivo): lo rimuovo`);
      try {
        fs.unlinkSync(LOCK_FILE);
      } catch {
        /* niente da fare */
      }
    }
  }
  console.error(`impossibile acquisire il lock ${LOCK_FILE}`);
  process.exit(1);
}

/* ── l'agente può essere spento: si aspetta che torni ─────────────────── */

const WAIT_SECONDS = Number(process.env.INGEST_WAIT_SECONDS || 120);

function fetchHealth() {
  return new Promise((resolve) => {
    const req = http.get({ host: AGENT.host, port: AGENT.port, path: '/api/health', timeout: 5000 }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve(null);
        }
      });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
    req.on('error', () => resolve(null));
  });
}

async function probeHealth() {
  const health = await fetchHealth();
  return Boolean(health && health.ok);
}

/** Se il volume è stato rimontato con un altro nome, l'agente resta
 *  puntato al vecchio percorso: si riavvia per fargli risolvere l'UUID. */
async function ensureAgentRoot() {
  const health = await fetchHealth();
  if (health && health.root && fs.existsSync(health.root)) return;
  if (!health) return;
  log(`l'agente punta a ${health.root || 'una root sconosciuta'}, che non esiste: lo riavvio`);
  try {
    execSync(`launchctl kickstart -k gui/${process.getuid()}/com.uttf.drive-agent`, { stdio: 'ignore' });
  } catch (error) {
    log(`riavvio dell'agente non riuscito: ${error.message}`);
  }
}

async function waitForAgent() {
  const deadline = Date.now() + WAIT_SECONDS * 1000;
  for (;;) {
    if (await probeHealth()) return true;
    if (Date.now() >= deadline) return false;
    await new Promise((done) => setTimeout(done, 3000));
  }
}

(async () => {
  acquireLock();

  if (!MOUNT) {
    log(`disco non collegato: nessun mount valido per ${VOLUME_UUID} ` +
        `(provati ${MOUNT_CANDIDATES.join(', ')}). Esco con codice 3: launchd riprova.`);
    process.exit(3);
  }
  log(`volume montato in ${MOUNT} — drive: ${DRIVE_ROOT}`);

  await ensureAgentRoot();

  if (!(await waitForAgent())) {
    log(`agente non raggiungibile su ${AGENT.host}:${AGENT.port} dopo ${WAIT_SECONDS}s: ` +
        'esco con codice 3, così launchd riprova quando l\'agente torna');
    process.exit(3);
  }

  const jobs = [];
  for (const s of SOURCES) {
    const files = collect(s.dir);
    log(`sorgente ${s.dest}: ${files.length} file da ${s.dir}`);
    for (const f of files) {
      const rel = path.relative(s.dir, f);
      if (SKIP.has(`${s.dest}/${rel}`)) { skippedDup += 1; continue; }
      jobs.push({ file: f, dest: s.dest, relDir: path.dirname(rel) === '.' ? '' : path.dirname(rel) });
    }
  }
  log(`totale da copiare: ${jobs.length} (duplicati saltati per analisi hash: ${skippedDup})`);

  // Salta quello che l'indice già conosce: un riavvio riprende da dove era.
  const existing = await new Promise((resolve) => {
    http.get(`http://${AGENT.host}:${AGENT.port}/api/files`, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        try {
          const assets = JSON.parse(body).assets || [];
          resolve(new Set(assets.map((a) => a.relPath)));
        } catch {
          resolve(new Set());
        }
      });
    }).on('error', () => resolve(new Set()));
  });

  let ok = 0;
  let failed = 0;
  let skipped = 0;
  let bytes = 0;
  let done = 0;
  const errors = [];
  const started = Date.now();
  const CONCURRENCY = Number(process.env.INGEST_CONCURRENCY || 6);

  const pending = jobs.filter((job) => {
    const target = job.relDir ? `${job.dest}/${job.relDir}/${path.basename(job.file)}` : `${job.dest}/${path.basename(job.file)}`;
    if (existing.has(target)) { skipped += 1; return false; }
    return true;
  });
  // I file vanno da 40 KB a 1 GB: un ETA sul numero di file non dice niente.
  // Si pesano i byte di ogni job e si stima sui byte ancora da processare.
  let pendingBytes = 0;
  for (const job of pending) {
    try {
      job.size = fs.statSync(job.file).size;
    } catch {
      job.size = 0;
    }
    pendingBytes += job.size;
  }
  log(`da copiare adesso: ${pending.length} (già presenti: ${skipped}) — ${(pendingBytes / 1e9).toFixed(2)} GB — ${CONCURRENCY} worker`);

  let cursor = 0;
  let processedBytes = 0;
  let consecutiveErrors = 0;
  let aborted = false;
  const progress = setInterval(() => {
    const elapsed = (Date.now() - started) / 1000;
    // Velocità = byte spediti (anche più volte, se c'è un ritentativo);
    // resto = byte dei file non ancora completati, senza doppi conteggi.
    const rate = elapsed > 0 ? bytesInFlight / 1e6 / elapsed : 0;
    const remaining = Math.max(0, pendingBytes - processedBytes);
    let eta = '? h';
    if (rate > 0) {
      const etaMin = remaining / 1e6 / rate / 60;
      eta = etaMin >= 120 ? `${(etaMin / 60).toFixed(1)} h` : `${etaMin.toFixed(0)} min`;
    }
    log(`progresso ${done}/${pending.length} file — ok=${ok} errori=${failed} — ${(bytes / 1e9).toFixed(2)} GB copiati — ${rate.toFixed(1)} MB/s — restano ${(remaining / 1e9).toFixed(2)} GB — ETA ${eta}`);
  }, 30000);

  async function worker() {
    for (;;) {
      if (aborted) return;
      const my = cursor;
      cursor += 1;
      if (my >= pending.length) return;
      const job = pending[my];
      let res = await uploadOnce(job.file, job.dest, job.relDir);
      if (!res.ok) res = await uploadOnce(job.file, job.dest, job.relDir); // un ritentativo
      if (res.ok) {
        ok += 1;
        bytes += res.size || 0;
        consecutiveErrors = 0;
      } else {
        failed += 1;
        errors.push(`${job.file} -> ${res.status || ''} ${res.error || ''}`);
        log(`ERRORE ${job.file}: ${res.status || ''} ${res.error || ''}`);
        // Agente giù: senza questo, un buco di 50 secondi brucia migliaia di
        // file in un secondo (ECONNREFUSED istantaneo) e svuota la coda.
        if (/ECONNREFUSED|EHOSTUNREACH|ECONNRESET|socket hang up/i.test(String(res.error || ''))) {
          consecutiveErrors += 1;
          if (consecutiveErrors >= 5 && !aborted) {
            aborted = true;
            log(`STOP: agente irraggiungibile (${consecutiveErrors} errori di connessione ` +
                'consecutivi). Nessun file perso: i non copiati restano in coda. ' +
                'Riavvia lo script quando /api/health risponde.');
          }
        } else {
          consecutiveErrors = 0;
        }
      }
      processedBytes += job.size || 0;
      done += 1;
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  clearInterval(progress);

  log(`FINE: copiati=${ok} saltati=${skipped} falliti=${failed} byte=${(bytes / 1e9).toFixed(2)} GB`);
  if (errors.length) {
    log('primi errori:');
    for (const e of errors.slice(0, 10)) log(`  ${e}`);
  }

  if (aborted) {
    // Agente caduto a metà: codice 3 = "riprova più tardi", non un successo.
    process.exit(3);
  }
})();
