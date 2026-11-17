#!/bin/sh
# Quick Tunnel Cloudflare verso l'agente del drive, tenuto vivo da launchd
# (com.uttf.drive-quick-tunnel). Serve finche' non c'e' un dominio su Cloudflare:
# un tunnel "nominato" avrebbe un URL fisso, questo ne genera uno nuovo a ogni avvio.
#
# Scrive l'URL corrente in ~/.cloudflared/uttf-drive-quick.url: e' il valore da
# rimettere in DRIVE_AGENT_URL e DRIVE_PUBLIC_URL su Vercel (vedi README.md).
# cloudflared si collega in uscita: l'agente resta in ascolto solo su loopback.

set -u

AGENT_URL=${DRIVE_LOCAL_AGENT_URL:-http://127.0.0.1:8787}
CF=${CLOUDFLARED_BIN:-/opt/homebrew/bin/cloudflared}
STATE_DIR="$HOME/.cloudflared"
URL_FILE="$STATE_DIR/uttf-drive-quick.url"
LOG_FILE="$HOME/Library/Logs/uttf-drive-tunnel.log"

if [ ! -x "$CF" ]; then
  echo "cloudflared non trovato in $CF (brew install cloudflared)" >&2
  exit 1
fi

previous=''
[ -f "$URL_FILE" ] && previous=$(cat "$URL_FILE")

mkdir -p "$STATE_DIR" "$(dirname "$LOG_FILE")"
# Un file per esecuzione: il log non cresce e l'URL corrente e' sempre il primo.
: > "$LOG_FILE"

"$CF" tunnel --url "$AGENT_URL" --no-autoupdate >> "$LOG_FILE" 2>&1 &
tunnel_pid=$!
trap 'kill "$tunnel_pid" 2>/dev/null' EXIT INT TERM

url=''
waited=0
while [ "$waited" -lt 60 ]; do
  url=$(grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG_FILE" | head -n 1)
  [ -n "$url" ] && break
  kill -0 "$tunnel_pid" 2>/dev/null || break
  sleep 1
  waited=$((waited + 1))
done

if [ -z "$url" ]; then
  echo "nessun URL dopo ${waited}s: vedi $LOG_FILE" >&2
  exit 1
fi

printf '%s\n' "$url" > "$URL_FILE"

if [ "$url" = "$previous" ]; then
  echo "tunnel attivo: $url (URL invariato)"
else
  echo "NUOVO URL: $url"
  echo "Aggiorna DRIVE_AGENT_URL e DRIVE_PUBLIC_URL su Vercel: vedi drive-agent/cloudflared/README.md"
  # Avviso best-effort: se la notifica non compare, la fonte e' il file qui sopra.
  command -v osascript >/dev/null 2>&1 &&
    osascript -e 'display notification "URL del tunnel cambiato: aggiorna DRIVE_AGENT_URL e DRIVE_PUBLIC_URL su Vercel." with title "Drive UTTF"' >/dev/null 2>&1 ||
    true
fi

wait "$tunnel_pid"
