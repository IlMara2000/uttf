# Script locali del Mac

Copie degli script che girano da `~/Library/Application Support/UTTF/` (launchd non legge dal volume esterno).
Se li modifichi, aggiorna la copia in quella cartella.

- `drive-agent-root.sh`: ricava la radice del drive per l'agente.
- `uttf-ingest.cjs`: importa i file nel drive (usa `DRIVE_MEDIA_SECRET` dal plist o dall'ambiente).
- `verify-drive.py`: verifica gli hash tra sorgente e drive.
- `../cloudflared/quick-tunnel.sh`: Quick Tunnel; il token Vercel sta solo in `vercel.env` sul Mac, mai nel repo.
