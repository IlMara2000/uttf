# Tunnel dell'agente del drive

L'agente ascolta solo su `127.0.0.1:8787`: il gestionale su Vercel lo raggiunge
attraverso un tunnel Cloudflare. Finché non c'è un dominio su Cloudflare il tunnel
è un **Quick Tunnel** (`https://<parole>.trycloudflare.com`): niente dominio, niente
Access, e **l'URL cambia ogni volta che il tunnel riparte**. `quick-tunnel.sh` se ne
occupa da solo: quando compare un URL nuovo aggiorna `DRIVE_AGENT_URL` e
`DRIVE_PUBLIC_URL` sul progetto Vercel e rifà il deploy di produzione.

## Cosa gira sul Mac

| LaunchAgent | Cosa fa |
| --- | --- |
| `com.uttf.drive-agent` | l'agente: disco, indice, anteprime, upload |
| `com.uttf.drive-quick-tunnel` | `quick-tunnel.sh`: avvia cloudflared, tiene l'URL corrente in `~/.cloudflared/uttf-drive-quick.url` e allinea le variabili su Vercel quando cambia |

Entrambi si riavviano da soli dopo un riavvio del Mac o un crash. Lo script vive in
`~/Library/Application Support/UTTF/` perché launchd non può leggere file sul volume
esterno del drive. Installazione (dal root del progetto):

```sh
brew install cloudflared
mkdir -p "$HOME/Library/Application Support/UTTF"
cp drive-agent/cloudflared/quick-tunnel.sh "$HOME/Library/Application Support/UTTF/drive-quick-tunnel.sh"
chmod +x "$HOME/Library/Application Support/UTTF/drive-quick-tunnel.sh"
sed "s|__HOME__|$HOME|g" drive-agent/cloudflared/com.uttf.drive-quick-tunnel.plist \
  > ~/Library/LaunchAgents/com.uttf.drive-quick-tunnel.plist
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.uttf.drive-quick-tunnel.plist
```

Dopo una modifica a `quick-tunnel.sh` va ricopiato in `~/Library/Application Support/UTTF/`
e riavviato il job (`launchctl kickstart -k ...`).

## Aggiornamento dell'URL su Vercel (automatico)

A ogni URL nuovo lo script, prima di mettersi in attesa, chiama l'API Vercel:

1. `POST /v10/projects/{id}/env?upsert=true` con `DRIVE_AGENT_URL` e
   `DRIVE_PUBLIC_URL` (target `production`, tipo `sensitive`, come erano);
2. `GET /v6/deployments?target=production&state=READY&limit=1` per l'ultimo
   deployment buono;
3. `POST /v13/deployments` con quel `deploymentId`: il redeploy eredita le
   variabili appena scritte, perché Vercel le legge alla creazione del deployment.

Se l'URL non è cambiato non fa niente. Se qualcosa va storto lo scrive sullo
stderr del job (`uttf-drive-tunnel.err.log`), mostra una notifica e **lascia il
tunnel attivo**: il drive dal sito resta da sistemare a mano, ma il Mac non si
ferma. Sono tre tentativi con 5 secondi fra l'uno; il deploy completo richiede un
paio di minuti.

### Token

Serve un Vercel Access Token in un file fuori dal repo, leggibile solo da te:

```sh
mkdir -p "$HOME/Library/Application Support/UTTF"
read -rs -p 'Token Vercel: ' VERCEL_TOKEN && \
  printf 'VERCEL_TOKEN=%s\n' "$VERCEL_TOKEN" > "$HOME/Library/Application Support/UTTF/vercel.env" && \
  chmod 600 "$HOME/Library/Application Support/UTTF/vercel.env" && \
  sh "$HOME/Library/Application Support/UTTF/drive-quick-tunnel.sh" --sync
```

Il `read` non lascia il token nella history. Il token della sessione CLI (`vercel
login`) non va bene: scade in poche ore e l'API non permette di crearne uno nuovo
con quella sessione (`403 Cannot create tokens for this app`).

Meglio se **scoped al progetto `uttf-app`**: [vercel.com/account/tokens](https://vercel.com/account/tokens)
→ Create Token, Scope `uttf-app`. Lo script legge solo `VERCEL_TOKEN`; gli
identificativi di progetto e team sono già dentro (`prj_Q3ddZ89…`,
`team_UVpwFRT…`) e si possono sovrascrivere nello stesso file con
`VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID`, `VERCEL_PROJECT_NAME`.

Il token non viene mai stampato: se il file manca lo script notifica "metti
VERCEL_TOKEN in vercel.env" e non tocca Vercel. Per ruotarlo basta riscrivere il
file e fare `sh quick-tunnel.sh --sync`.

### Riallineamento a mano

Con il file già presente, senza riavviare il tunnel:

```sh
sh "$HOME/Library/Application Support/UTTF/drive-quick-tunnel.sh" --sync
```

`--sync` prende l'URL da `~/.cloudflared/uttf-drive-quick.url` e rifà solo i tre
passi Vercel, stampando l'esito (codice HTTP e corpo in caso di errore). In
alternativa, dal root del progetto, i comandi CLI equivalenti:

```sh
URL=$(cat ~/.cloudflared/uttf-drive-quick.url)
npx vercel env add DRIVE_AGENT_URL production --force --value "$URL"
npx vercel env add DRIVE_PUBLIC_URL production --force --value "$URL"
npx vercel redeploy https://uttf.vercel.app
```

Dopo un riavvio l'hostname nuovo può impiegare un minuto o due prima di rispondere:
se `curl` dà `000` per risoluzione DNS, aspetta e riprova.
`DRIVE_MEDIA_SECRET` **non** va toccato: deve restare identico sul Mac
(LaunchAgent `com.uttf.drive-agent`) e su Vercel, altrimenti upload e file diretti
vengono rifiutati con 403.

## Controlli

```sh
cat ~/.cloudflared/uttf-drive-quick.url                      # URL corrente
curl -s "$(cat ~/.cloudflared/uttf-drive-quick.url)/api/health"   # deve dare "ok":true
tail -5 ~/Library/Logs/uttf-drive-tunnel.log                 # log cloudflared
tail -5 ~/Library/Logs/uttf-drive-tunnel.out.log             # messaggi di quick-tunnel.sh
cat ~/Library/Logs/uttf-drive-tunnel.err.log                 # errori (Vercel compreso)
launchctl print gui/$(id -u)/com.uttf.drive-quick-tunnel | head -20
launchctl kickstart -k gui/$(id -u)/com.uttf.drive-quick-tunnel  # riavvio a mano
```

## Limiti e passaggio al dominio

Con `DRIVE_MEDIA_SECRET` impostato, le rotte che non hanno una firma propria
(elenco file, cartelle, cancellazioni, pagina dell'agente) accettano dall'esterno
solo l'header `x-drive-token` con quel segreto: è quello che manda il gestionale
di Vercel. Upload e `/file/` restano protetti dalla firma HMAC a scadenza. Senza
il segreto l'agente è aperto a chiunque abbia l'URL: non lanciarlo senza.

```sh
# controllo dall'esterno: senza token 401, con token 200
curl -s -o /dev/null -w '%{http_code}\n' "$URL/api/files"
curl -s -o /dev/null -w '%{http_code}\n' -H "x-drive-token: $SECRET" "$URL/api/files"
```

`/api/health` resta invece senza token, così i controlli qui sopra funzionano
senza esporre l'elenco dei file.

Con un dominio su Cloudflare si passa al tunnel nominato — `config.yml.example` e
`com.uttf.drive-tunnel.plist` descrivono già `drive.<dominio>` (service token) e
`media.<dominio>` (bypass su `/file/*` e `/api/files`, protetto dalla firma):
l'URL diventa fisso, il ripristino qui sopra non serve più e su Vercel restano da
impostare solo `CF_ACCESS_CLIENT_ID` e `CF_ACCESS_CLIENT_SECRET`.
