#!/usr/bin/env node
'use strict';

/**
 * Confronta la copia di sicurezza con l'indice del drive.
 *
 * Per ogni file dell'indice controlla che sul disco di copia ci sia, con la
 * stessa dimensione e lo stesso SHA-256. Riporta:
 *   mancante  il file non e' sul backup
 *   diverso   la dimensione non corrisponde all'indice (copia vecchia o troncata)
 *   corrotto  la dimensione torna ma il contenuto e' cambiato (hash diverso)
 *
 *   node drive-agent/backup-verify.cjs --mirror-volume=<cartella di copia>
 *   node drive-agent/backup-verify.cjs --mirror-volume=<cartella> --root=<cartella drive>
 *   node drive-agent/backup-verify.cjs --size-only    (niente hash: veloce, non vede i corrotti)
 *   node drive-agent/backup-verify.cjs --json
 *
 * Codici di uscita: 0 tutto a posto, 1 problemi trovati, 2 confronto impossibile.
 */

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const MIRROR_SUBDIR = 'Drive Under the Tower Factory';
const MANIFEST_NAME = '.uttf-manifest.json';

const USAGE =
  'Uso: node drive-agent/backup-verify.cjs --mirror-volume=<cartella di copia> [--root=<cartella drive>] [--size-only] [--json]';

const CONFIG = {
  root: process.env.DRIVE_ROOT || '/Volumes/HIKSEMI 1/Drive Under the Tower Factory',
  mirrorVolume: process.env.DRIVE_MIRROR_VOLUME || '',
  hash: true,
  json: false,
  help: false,
};

/** Errore di configurazione: non e' un problema del backup ma un confronto impossibile. */
class SetupError extends Error {}

function parseArgs(argv) {
  for (const raw of argv) {
    if (raw === '--json') {
      CONFIG.json = true;
      continue;
    }
    if (raw === '--size-only') {
      CONFIG.hash = false;
      continue;
    }
    if (raw === '--help' || raw === '-h') {
      CONFIG.help = true;
      continue;
    }

    const match = /^--([a-z-]+)=(.*)$/.exec(raw);
    if (!match || !['root', 'mirror-volume'].includes(match[1])) {
      throw new SetupError(`argomento non riconosciuto: ${raw}`);
    }
    if (match[1] === 'root') CONFIG.root = match[2];
    else CONFIG.mirrorVolume = match[2];
  }
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function shortHash(value) {
  return `${String(value).slice(0, 12)}…`;
}

/** Stesso controllo dell'agente: senza volume montato il confronto non ha senso
 * (una cartella /Volumes/X creata a mano starebbe sul disco interno). */
function isMounted(volumePath) {
  try {
    const volume = fs.statSync(volumePath);
    const parent = fs.statSync(path.dirname(volumePath));
    return volume.isDirectory() && volume.dev !== parent.dev;
  } catch {
    return false;
  }
}

async function hashFile(file) {
  const hash = crypto.createHash('sha256');
  // Iterazione diretta: niente pipeline con un Transform come ultimo stadio,
  // che sui file oltre il buffer resterebbe appeso senza consumatore.
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

function isIndexedAsset(value) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof value.relPath === 'string' &&
      Number.isFinite(value.size) &&
      typeof value.sha256 === 'string',
  );
}

async function main() {
  parseArgs(process.argv.slice(2));
  if (CONFIG.help) {
    console.log(USAGE);
    return 0;
  }

  if (!CONFIG.mirrorVolume) {
    throw new SetupError(
      'nessun disco di copia indicato: passa --mirror-volume=<cartella> (oppure imposta DRIVE_MIRROR_VOLUME)',
    );
  }

  const root = path.resolve(CONFIG.root);
  const indexFile = path.join(root, '.uttf-drive', 'index.json');
  const mirrorRoot = path.join(CONFIG.mirrorVolume, MIRROR_SUBDIR);
  const manifestFile = path.join(mirrorRoot, MANIFEST_NAME);

  if (!isMounted(CONFIG.mirrorVolume)) {
    throw new SetupError(
      `disco di copia non collegato: ${CONFIG.mirrorVolume} (collega il disco e riprova)`,
    );
  }

  let assets;
  try {
    const parsed = JSON.parse(await fsp.readFile(indexFile, 'utf8'));
    assets = (Array.isArray(parsed) ? parsed : []).filter(isIndexedAsset);
  } catch (error) {
    throw new SetupError(
      error.code === 'ENOENT'
        ? `indice non trovato in ${indexFile}: l'agente ha mai salvato qualcosa?`
        : `indice illeggibile in ${indexFile}: ${error.message}`,
    );
  }

  let manifest = null;
  try {
    manifest = JSON.parse(await fsp.readFile(manifestFile, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`! manifest illeggibile (${error.message}): confronto solo con l'indice`);
    }
  }
  const manifestFiles = new Map(
    (Array.isArray(manifest?.files) ? manifest.files : [])
      .filter((entry) => entry && typeof entry.path === 'string' && Number.isFinite(entry.size))
      .map((entry) => [entry.path, entry]),
  );

  const missing = [];
  const different = [];
  const corrupted = [];
  const unlisted = [];
  let ok = 0;
  let hashed = 0;

  for (const asset of assets) {
    const dest = path.join(mirrorRoot, asset.relPath);

    let stat;
    try {
      stat = await fsp.stat(dest);
    } catch {
      missing.push({ path: asset.relPath, expectedBytes: asset.size });
      continue;
    }

    if (!stat.isFile()) {
      missing.push({ path: asset.relPath, expectedBytes: asset.size });
      continue;
    }

    if (stat.size !== asset.size) {
      different.push({ path: asset.relPath, expectedBytes: asset.size, actualBytes: stat.size });
      continue;
    }

    if (!CONFIG.hash) {
      ok += 1;
      continue;
    }

    const digest = await hashFile(dest);
    hashed += 1;
    if (digest !== asset.sha256) {
      corrupted.push({
        path: asset.relPath,
        bytes: stat.size,
        expectedSha256: asset.sha256,
        actualSha256: digest,
      });
    } else {
      ok += 1;
    }
  }

  // File presenti sulla copia ma non nell'indice (es. cancellati dal drive dopo
  // la copia): non sono un errore, ma vanno mostrati perche' occupano spazio.
  // I nomi che iniziano con "." sono servizio del filesystem (FAT32 crea ._nome),
  // non file del drive.
  const mirrorPaths = [];
  async function walk(dir) {
    const entries = await fsp.readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else if (entry.isFile()) mirrorPaths.push(path.relative(mirrorRoot, absolute));
    }
  }
  await walk(mirrorRoot);

  const indexed = new Set(assets.map((asset) => asset.relPath));
  for (const relPath of mirrorPaths) {
    if (!indexed.has(relPath)) unlisted.push({ path: relPath });
  }
  const onDisk = new Set(mirrorPaths);
  const staleManifest = [...manifestFiles.keys()].filter((relPath) => !onDisk.has(relPath));

  const problems = missing.length + different.length + corrupted.length;
  const indexBytes = assets.reduce((sum, asset) => sum + asset.size, 0);

  if (CONFIG.json) {
    console.log(
      JSON.stringify(
        {
          mirror: mirrorRoot,
          index: { files: assets.length, bytes: indexBytes },
          manifest: manifest
            ? {
                files: manifestFiles.size,
                updatedAt: manifest.updatedAt || null,
                totals: manifest.totals || null,
              }
            : null,
          mode: CONFIG.hash ? 'sha256' : 'size',
          hashed,
          ok,
          missing,
          different,
          corrupted,
          unlisted,
          staleManifest,
          problems,
        },
        null,
        2,
      ),
    );
    return problems ? 1 : 0;
  }

  console.log(`Copia di sicurezza: ${mirrorRoot}`);
  console.log(
    `Manifest:           ${manifestFiles.size} file${
      manifest?.updatedAt ? `, aggiornato ${manifest.updatedAt}` : ' (non ancora scritto)'
    }`,
  );
  console.log(`Indice:             ${assets.length} file, ${formatBytes(indexBytes)}`);
  console.log(`Confronto:          ${CONFIG.hash ? 'dimensione + SHA-256' : 'solo dimensione'}`);
  console.log('');

  for (const item of missing) {
    console.log(`✗ mancante   ${item.path} (${formatBytes(item.expectedBytes)})`);
  }
  for (const item of different) {
    console.log(
      `✗ diverso    ${item.path} — sul backup ${formatBytes(item.actualBytes)}, nell'indice ${formatBytes(item.expectedBytes)}`,
    );
  }
  for (const item of corrupted) {
    console.log(
      `✗ corrotto   ${item.path} — hash del backup ${shortHash(item.actualSha256)}, atteso ${shortHash(item.expectedSha256)}`,
    );
  }
  for (const item of unlisted) {
    console.log(`· solo backup ${item.path} (non piu' nell'indice)`);
  }
  for (const relPath of staleManifest) {
    console.log(`· manifest    ${relPath} (annotato, file assente dal backup)`);
  }
  if (problems || unlisted.length || staleManifest.length) console.log('');

  const checked = CONFIG.hash ? `hash di ${hashed} file` : `${assets.length} file per dimensione`;
  if (!problems) {
    console.log(`✓ Tutto a posto: ${ok} file verificati (${checked}).`);
  } else {
    console.log(
      `Esito: ${ok} ok, ${missing.length} mancanti, ${different.length} diversi, ${corrupted.length} corrotti (${checked}).`,
    );
    console.log('');
    console.log("Per riportare la copia sul drive (non sovrascrive cio' che c'e' gia'):");
    console.log(`  rsync -a --ignore-existing ${JSON.stringify(`${mirrorRoot}/`)} ${JSON.stringify(`${root}/`)}`);
    console.log(
      'I file corrotti o diversi vanno cancellati dal backup: la passata successiva li ricopia dal drive.',
    );
  }

  if (!manifest) {
    console.log('');
    console.log("! Nessun manifest sul disco di copia: l'agente lo scrive alla prossima copia.");
  }
  if (unlisted.length) {
    console.log('');
    console.log('· I file "solo backup" restano utili: sono copie di file poi rimossi dal drive.');
  }

  return problems ? 1 : 0;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error) => {
    const message = error instanceof SetupError ? error.message : `errore inatteso: ${error.message}`;
    if (CONFIG.json) console.log(JSON.stringify({ error: message }, null, 2));
    else console.error(`✗ ${message}`);
    if (error instanceof SetupError) console.error(USAGE);
    process.exitCode = 2;
  },
);
