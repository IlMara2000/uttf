#!/usr/bin/env python3
"""Verifica completa drive UTTF: dimensione e SHA-256 di ogni file copiato
confrontati con la sorgente in File Temp/Backup.

Stampa su stdout SOLO le differenze (una riga per file, più un riepilogo).
Progresso e tempi vanno su stderr, così `> differenze.txt` resta pulito.

Legge l'indice dell'agente (.uttf-drive/index.json): un file è "copiato"
quando è indicizzato, quindi gli upload in corso non entrano nella verifica.

Seconda passata: elenca i file presenti in Foto/ e Video/ che l'indice non
conosce, cioè i residui parziali degli upload interrotti. Un file che sta
ancora crescendo (upload in corso, non indicizzato perché non finito) viene
escluso dall'elenco e solo annotato su stderr: non è un residuo.

Uso:
    python3 verify-drive.py                 # tutti i file indicizzati
    python3 verify-drive.py --folder Foto   # solo Foto/
    python3 verify-drive.py --folder Video --jobs 2
    python3 verify-drive.py --limit 20      # prova rapida su 20 file
    python3 verify-drive.py --no-cache      # ricalcola tutto da zero

Uscita: 0 = nessuna differenza, 1 = differenze trovate, 2 = errore d'uso.

La cache (verify-drive-cache.json accanto allo script) tiene gli hash già
calcolati, indicizzati per percorso + dimensione + mtime: se lo script viene
interrotto, al riavvio riprende da dove era invece di rileggere 138 GB.
"""

import argparse
import hashlib
import json
import os
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor

# ── dove è montato il disco ─────────────────────────────────────────────
# Stessa logica del driver di ingest: il volume non si chiama sempre allo
# stesso modo dopo uno scollegamento, quindi si risolve dall'UUID con
# fallback sui nomi noti (e DRIVE_VOLUME_PATH / UTTF_VOLUME_UUID se indicati).
VOLUME_UUID = os.environ.get('UTTF_VOLUME_UUID', '77B5C544-2330-3790-89FA-0BEDBCC47CB5')
MOUNT_CANDIDATES = ['/Volumes/HIKSEMI 1', '/Volumes/HIKSEMI']


def resolve_mount():
    env_path = os.environ.get('DRIVE_VOLUME_PATH')
    if env_path:
        return env_path
    try:
        out = subprocess.run(['diskutil', 'info', VOLUME_UUID],
                             capture_output=True, text=True, timeout=20)
        for line in (out.stdout or '').splitlines():
            if 'Mount Point:' in line:
                mp = line.split('Mount Point:', 1)[1].strip()
                if mp and mp != 'Not mounted' and os.path.isdir(mp):
                    return mp
    except (OSError, subprocess.SubprocessError):
        pass
    for candidate in MOUNT_CANDIDATES:
        if os.path.isdir(os.path.join(candidate, 'File Temp', 'Backup')):
            return candidate
    return None


_MOUNT = resolve_mount()
if _MOUNT is None:
    print(f'ERRORE: volume {VOLUME_UUID} non montato (provati {", ".join(MOUNT_CANDIDATES)})',
          file=sys.stderr)
    sys.exit(2)

DRIVE_ROOT = os.path.join(_MOUNT, 'Drive Under the Tower Factory')
SOURCE_ROOT = os.path.join(_MOUNT, 'File Temp', 'Backup')
INDEX_FILE = os.path.join(DRIVE_ROOT, '.uttf-drive', 'index.json')
CACHE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'verify-drive-cache.json')
CHUNK = 8 * 1024 * 1024
COPIES = ('Foto', 'Video')


def human(n):
    for unit in ('B', 'KB', 'MB', 'GB', 'TB'):
        if n < 1000:
            return f'{n:.1f} {unit}'
        n /= 1000
    return f'{n:.1f} PB'


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for block in iter(lambda: f.read(CHUNK), b''):
            h.update(block)
    return h.hexdigest()


def load_cache(path, enabled):
    if not enabled:
        return {}
    try:
        with open(path) as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def save_cache(path, cache):
    tmp = f'{path}.tmp'
    try:
        with open(tmp, 'w') as f:
            json.dump(cache, f)
        os.replace(tmp, path)
    except OSError as error:
        print(f'avviso: cache non salvata ({error})', file=sys.stderr)


def cached_hash(cache, key, role, path, stat):
    """Hash in cache solo se dimensione e mtime coincidono ancora."""
    entry = cache.get(key, {}).get(role)
    if entry and entry['size'] == stat.st_size and entry['mtime'] == int(stat.st_mtime):
        return entry['sha256'], True
    digest = sha256_file(path)
    cache.setdefault(key, {})[role] = {
        'size': stat.st_size,
        'mtime': int(stat.st_mtime),
        'sha256': digest,
    }
    return digest, False


def index_relpaths():
    try:
        with open(INDEX_FILE) as f:
            return {a.get('relPath') for a in json.load(f)}
    except (OSError, ValueError):
        return set()


def open_for_writing(path):
    """True se un processo tiene il file aperto (upload in corso)."""
    try:
        import subprocess
        out = subprocess.run(['lsof', '-F', 'f', '--', path],
                             capture_output=True, text=True, timeout=20).stdout
        return any(line.startswith('f') for line in out.splitlines())
    except (OSError, subprocess.SubprocessError):
        return False


def scan_orphans(folders, known, settle=8):
    """File in Foto/ e Video/ che l'indice non conosce.

    Un upload in corso non è ancora indicizzato e non deve diventare un falso
    positivo. Con un disco lento la dimensione può restare ferma per più dei
    secondi di attesa, quindi il candidato viene scartato se, dopo `settle`
    secondi: è finito nell'indice, è cresciuto, o è ancora aperto in scrittura.
    """
    candidates = []
    for folder in folders:
        base = os.path.join(DRIVE_ROOT, folder)
        for root, dirs, files in os.walk(base):
            dirs[:] = [d for d in dirs if not d.startswith('.')]
            for name in files:
                if name.startswith('.'):
                    continue
                path = os.path.join(root, name)
                rel = os.path.relpath(path, DRIVE_ROOT).replace(os.sep, '/')
                if rel in known:
                    continue
                try:
                    candidates.append((rel, path, os.path.getsize(path)))
                except OSError:
                    candidates.append((rel, path, -1))

    if not candidates:
        print('passata fuori indice: nessun file estraneo', file=sys.stderr)
        return []

    print(f'passata fuori indice: {len(candidates)} candidati, controllo se crescono…',
          file=sys.stderr)
    if settle:
        time.sleep(settle)

    fresh = index_relpaths()
    out = []
    in_progress = 0
    for rel, path, size in candidates:
        if rel in fresh:
            in_progress += 1
            print(f'  indicizzato durante il controllo, escluso: {rel}', file=sys.stderr)
            continue
        try:
            now = os.path.getsize(path)
        except OSError:
            now = size
        if now != size:
            in_progress += 1
            print(f'  in scrittura, escluso: {rel} ({human(size)} → {human(now)})', file=sys.stderr)
            continue
        if open_for_writing(path):
            in_progress += 1
            print(f'  aperto in scrittura, escluso: {rel}', file=sys.stderr)
            continue
        out.append(f'FUORI INDICE\t{rel}\t{human(now)} non indicizzato (residuo di upload interrotto?)')
    if in_progress:
        print(f'  {in_progress} candidati esclusi perché in corso', file=sys.stderr)
    return out


def main():
    parser = argparse.ArgumentParser(description='Verifica hash dei file copiati nel drive UTTF.')
    parser.add_argument('--folder', choices=COPIES, action='append',
                        help='limita a Foto e/o Video (ripetibile)')
    parser.add_argument('--limit', type=int, default=0, help='fermati dopo N file (0 = tutti)')
    parser.add_argument('--match', default='',
                        help='solo i file il cui percorso contiene questa stringa')
    parser.add_argument('--jobs', type=int, default=2, help='letture in parallelo (default 2)')
    parser.add_argument('--no-cache', action='store_true', help='ignora la cache degli hash')
    parser.add_argument('--cache', default=CACHE_FILE, help='file di cache (default accanto allo script)')
    parser.add_argument('--no-orphans', action='store_true',
                        help='salta la passata sui file fuori indice')
    args = parser.parse_args()

    try:
        with open(INDEX_FILE) as f:
            assets = json.load(f)
    except (OSError, ValueError) as error:
        print(f'ERRORE: indice non leggibile ({INDEX_FILE}): {error}', file=sys.stderr)
        return 2

    wanted = set(args.folder) if args.folder else set(COPIES)
    targets = [a for a in assets if a.get('relPath', '').split('/')[0] in wanted]
    if args.match:
        targets = [a for a in targets if args.match in a['relPath']]
    targets.sort(key=lambda a: a['relPath'])
    if args.limit:
        targets = targets[:args.limit]

    if not targets:
        print(f'nessun file da verificare (indice: {len(assets)} voci)', file=sys.stderr)
        return 0

    cache = load_cache(args.cache, not args.no_cache)
    total_bytes = sum(a.get('size') or 0 for a in targets)
    print(f'verifica di {len(targets)} file, {human(total_bytes)} per lato '
          f'({human(total_bytes * 2)} di letture) — {args.jobs} letture in parallelo', file=sys.stderr)

    started = time.time()
    read_bytes = 0
    done = 0
    differences = []
    lock_free_counter = {'bytes': 0}

    def check(asset):
        rel = asset['relPath']
        src = os.path.join(SOURCE_ROOT, rel)
        dst = os.path.join(DRIVE_ROOT, rel)
        key = rel
        problems = []

        if not os.path.exists(src):
            problems.append(('SORGENTE ASSENTE', f'sorgente non trovata: {src}', 0))
            return rel, problems, 0
        if not os.path.exists(dst):
            problems.append(('COPIA ASSENTE', f'file indicizzato ma non presente nel drive', 0))
            return rel, problems, 0

        s_stat = os.stat(src)
        d_stat = os.stat(dst)
        read = s_stat.st_size + d_stat.st_size

        # 1. dimensione dichiarata dall'indice
        if asset.get('size') is not None and asset['size'] != d_stat.st_size:
            problems.append(('DIMENSIONE INDICE', f'indice={asset["size"]} disco={d_stat.st_size}', read))
        # 2. dimensione fra sorgente e copia
        if s_stat.st_size != d_stat.st_size:
            problems.append(('DIMENSIONE', f'sorgente={s_stat.st_size} drive={d_stat.st_size}', read))
        # 3. sha256 (si calcola comunque: serve a distinguere corruzione da metadati sbagliati)
        try:
            s_sha, s_cached = cached_hash(cache, key, 'source', src, s_stat)
            d_sha, d_cached = cached_hash(cache, key, 'drive', dst, d_stat)
        except OSError as error:
            problems.append(('LETTURA FALLITA', str(error), read))
            return rel, problems, read

        if s_sha != d_sha:
            problems.append(('SHA-256', f'sorgente={s_sha} drive={d_sha}', read))
        # 4. hash registrato dall'agente durante l'upload
        agent_sha = asset.get('sha256')
        if agent_sha and agent_sha != s_sha:
            problems.append(('SHA-256 INDICE', f'indice={agent_sha} sorgente={s_sha}', 0))

        lock_free_counter['bytes'] += read if not (s_cached and d_cached) else 0
        return rel, problems, 0

    def report_progress():
        elapsed = time.time() - started
        rate = lock_free_counter['bytes'] / elapsed if elapsed else 0
        remaining = total_bytes * 2 - lock_free_counter['bytes']
        eta = remaining / rate if rate > 0 else 0
        print(f'  {done}/{len(targets)} file — {human(lock_free_counter["bytes"])} letti — '
              f'{rate / 1e6:.1f} MB/s — mancano {human(remaining)} — ETA '
              f'{eta / 3600:.1f} h — differenze: {len(differences)}', file=sys.stderr)

    last_report = time.time()
    with ThreadPoolExecutor(max_workers=max(1, args.jobs)) as pool:
        for rel, problems, _ in pool.map(check, targets):
            done += 1
            if problems:
                for kind, detail, _ in problems:
                    differences.append(f'{kind}\t{rel}\t{detail}')
            if done % 200 == 0:
                save_cache(args.cache, cache)
            if time.time() - last_report > 30:
                last_report = time.time()
                report_progress()

    save_cache(args.cache, cache)

    # Con --match si guardano file specifici: la passata sui fuori indice non c'entra.
    if not args.no_orphans and not args.match:
        known = {a.get('relPath') for a in assets}
        differences.extend(scan_orphans(wanted, known))

    for line in differences:
        print(line)

    elapsed = time.time() - started
    status = 'OK: nessuna differenza' if not differences else f'{len(differences)} DIFFERENZE'
    print(f'\n{status} — {len(targets)} file controllati, {human(lock_free_counter["bytes"])} '
          f'letti in {elapsed / 60:.1f} min', file=sys.stderr)
    return 0 if not differences else 1


if __name__ == '__main__':
    sys.exit(main())
