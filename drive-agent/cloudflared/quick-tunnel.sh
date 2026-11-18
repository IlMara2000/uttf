#!/bin/sh
# Quick Tunnel Cloudflare verso l'agente del drive, tenuto vivo da launchd
# (com.uttf.drive-quick-tunnel). Serve finche' non c'e' un dominio su Cloudflare:
# un tunnel "nominato" avrebbe un URL fisso, questo ne genera uno nuovo a ogni avvio.
#
# Scrive l'URL corrente in ~/.cloudflared/uttf-drive-quick.url e, quando cambia,
# aggiorna da solo DRIVE_AGENT_URL e DRIVE_PUBLIC_URL sul progetto Vercel e rifa'
# il deployment di produzione: senza quel passaggio /drive resta scollegato fino
# a un intervento a mano (Vercel legge le variabili solo creando un deployment).
#
# Il token Vercel sta in "$HOME/Library/Application Support/UTTF/vercel.env"
# (formato KEY=valore, permessi 600), fuori dal repo e fuori dal volume del
# drive:  VERCEL_TOKEN=...  e, se serve, VERCEL_PROJECT_ID / VERCEL_TEAM_ID.
#
# cloudflared si collega in uscita: l'agente resta in ascolto solo su loopback.

set -u

AGENT_URL=${DRIVE_LOCAL_AGENT_URL:-http://127.0.0.1:8787}
CF=${CLOUDFLARED_BIN:-/opt/homebrew/bin/cloudflared}
API=${VERCEL_API_URL:-https://api.vercel.com}
CONFIG_DIR="$HOME/Library/Application Support/UTTF"
CONFIG_FILE="$CONFIG_DIR/vercel.env"
STATE_DIR="$HOME/.cloudflared"
URL_FILE="$STATE_DIR/uttf-drive-quick.url"
LOG_FILE="$HOME/Library/Logs/uttf-drive-tunnel.log"

# Progetto uttf-app (uttf.vercel.app): identificativi non segreti, si possono
# sovrascrivere da vercel.env senza toccare questo file.
PROJECT_ID=${VERCEL_PROJECT_ID:-prj_Q3ddZ89t1HtOqG0xbdFO3RQFA0ip}
TEAM_ID=${VERCEL_TEAM_ID:-team_UVpwFRTzhfxuQSkKJjKFLqXt}
PROJECT_NAME=${VERCEL_PROJECT_NAME:-uttf-app}

notify() {
  command -v osascript >/dev/null 2>&1 &&
    osascript -e "display notification \"$1\" with title \"Drive UTTF\"" >/dev/null 2>&1 || true
}

config_value() {
  [ -f "$CONFIG_FILE" ] || return 1
  value=$(sed -n "s/^$1=//p" "$CONFIG_FILE" 2>/dev/null | head -n 1 | tr -d '\r"')
  [ -n "$value" ] || return 1
  printf '%s' "$value"
}

# Una chiamata all'API Vercel: stampa "codice corpo" e restituisce 0 solo su 2xx.
api() {
  method=$1
  path=$2
  body=${3:-}
  out=$(mktemp "${TMPDIR:-/tmp}/uttf-vercel.XXXXXX") || return 1
  if [ -n "$body" ]; then
    code=$(curl -sS -m 25 -o "$out" -w '%{http_code}' -X "$method" \
      -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
      --data "$body" "$API$path" 2>/dev/null) || code=000
  else
    code=$(curl -sS -m 25 -o "$out" -w '%{http_code}' -X "$method" \
      -H "Authorization: Bearer $TOKEN" "$API$path" 2>/dev/null) || code=000
  fi
  printf '%s %s' "$code" "$(head -c 300 "$out" 2>/dev/null | tr '\n' ' ')"
  rm -f "$out"
  case $code in 2*) return 0 ;; *) return 1 ;; esac
}

# Aggiorna le due variabili e rifa' il deploy di produzione. Non blocca il tunnel:
# se Vercel non risponde si limita a scriverlo nel log e a notificarlo.
sync_vercel() {
  url=$1
  TOKEN=$(config_value VERCEL_TOKEN) || TOKEN=''
  if [ -z "$TOKEN" ]; then
    echo "Vercel non aggiornato: manca VERCEL_TOKEN in $CONFIG_FILE" >&2
    notify "URL del tunnel cambiato. Metti VERCEL_TOKEN in vercel.env per aggiornare Vercel."
    return 1
  fi
  override=$(config_value VERCEL_PROJECT_ID) && PROJECT_ID=$override
  override=$(config_value VERCEL_TEAM_ID) && TEAM_ID=$override

  body="[{\"key\":\"DRIVE_AGENT_URL\",\"value\":\"$url\",\"type\":\"sensitive\",\"target\":[\"production\"]},{\"key\":\"DRIVE_PUBLIC_URL\",\"value\":\"$url\",\"type\":\"sensitive\",\"target\":[\"production\"]}]"

  attempt=1
  while [ "$attempt" -le 3 ]; do
    if result=$(api POST "/v10/projects/$PROJECT_ID/env?upsert=true&teamId=$TEAM_ID" "$body"); then
      echo "Vercel: variabili aggiornate ($url)"
      break
    fi
    echo "Vercel: aggiornamento variabili fallito, tentativo $attempt: $result" >&2
    attempt=$((attempt + 1))
    [ "$attempt" -le 3 ] && sleep 5
  done
  if [ "$attempt" -gt 3 ]; then
    notify "URL del tunnel cambiato ma Vercel non accetta le variabili: vedi uttf-drive-tunnel.err.log"
    return 1
  fi

  # Redeploy dell'ultimo deployment di produzione: prende le variabili appena scritte.
  deployments=$(api GET "/v6/deployments?projectId=$PROJECT_ID&teamId=$TEAM_ID&target=production&state=READY&limit=1") || {
    echo "Vercel: elenco deployment non disponibile: $deployments" >&2
    notify "URL del tunnel cambiato: serve un redeploy a mano su Vercel."
    return 1
  }
  deployment=$(printf '%s' "$deployments" | sed -n 's/.*"uid":"\(dpl_[^"]*\)".*/\1/p' | head -n 1)
  if [ -z "$deployment" ]; then
    echo "Vercel: nessun deployment di produzione da rifare: $deployments" >&2
    notify "URL del tunnel cambiato: serve un redeploy a mano su Vercel."
    return 1
  fi

  if result=$(api POST "/v13/deployments?teamId=$TEAM_ID" "{\"name\":\"$PROJECT_NAME\",\"deploymentId\":\"$deployment\",\"target\":\"production\"}"); then
    echo "Vercel: redeploy di produzione avviato da $deployment"
    notify "Drive UTTF: tunnel aggiornato e sito in redeploy."
    return 0
  fi
  echo "Vercel: redeploy fallito: $result" >&2
  notify "URL del tunnel cambiato: redeploy Vercel fallito, aprilo dal sito."
  return 1
}

# La sola sincronizzazione, per sistemare a mano dopo un guasto:
#   sh quick-tunnel.sh --sync
if [ "${1:-}" = "--sync" ]; then
  url=$(cat "$URL_FILE" 2>/dev/null || true)
  if [ -z "$url" ]; then
    echo "nessun URL in $URL_FILE" >&2
    exit 1
  fi
  sync_vercel "$url"
  exit $?
fi

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
  # Prima il sito, poi il tunnel: se Vercel e' lento l'URL e' gia' nel file.
  if ! sync_vercel "$url"; then
    echo "Vercel non allineato: comando a mano in drive-agent/cloudflared/README.md" >&2
  fi
fi

wait "$tunnel_pid"
