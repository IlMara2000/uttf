# Tunnel dell'agente del drive

L'agente ascolta solo su `127.0.0.1:8787`: il gestionale su Vercel lo raggiunge
attraverso un tunnel Cloudflare. Finché non c'è un dominio su Cloudflare il tunnel
è un **Quick Tunnel** (`https://<parole>.trycloudflare.com`): niente dominio, niente
Access, e **l'URL cambia ogni volta che il tunnel riparte**. Per questo le due
variabili su Vercel vanno riallineate a mano quando succede.

## Cosa gira sul Mac

| LaunchAgent | Cosa fa |
| --- | --- |
| `com.uttf.drive-agent` | l'agente: disco, indice, anteprime, upload |
| `com.uttf.drive-quick-tunnel` | `quick-tunnel.sh`: avvia cloudflared e tiene l'URL corrente in `~/.cloudflared/uttf-drive-quick.url` |

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

## Ripristino dell'URL su Vercel

Dopo un riavvio del tunnel `/drive` mostra "agente non raggiungibile": il tunnel
funziona, è Vercel che punta al vecchio indirizzo. Dal root del progetto:

```sh
URL=$(cat ~/.cloudflared/uttf-drive-quick.url)
npx vercel env add DRIVE_AGENT_URL production --force --value "$URL"
npx vercel env add DRIVE_PUBLIC_URL production --force --value "$URL"
npx vercel redeploy https://uttf.vercel.app
```

Il redeploy è necessario: Vercel legge le variabili solo alla creazione del
deployment. Dopo un riavvio l'hostname nuovo può impiegare un minuto o due prima di
rispondere: se `curl` dà `000` per risoluzione DNS, aspetta e riprova.
`DRIVE_MEDIA_SECRET` **non** va toccato: deve restare identico sul Mac
(LaunchAgent `com.uttf.drive-agent`) e su Vercel, altrimenti upload e file diretti
vengono rifiutati con 403.

## Controlli

```sh
cat ~/.cloudflared/uttf-drive-quick.url                      # URL corrente
curl -s "$(cat ~/.cloudflared/uttf-drive-quick.url)/api/health"   # deve dare "ok":true
tail -5 ~/Library/Logs/uttf-drive-tunnel.log                 # log cloudflared
tail -5 ~/Library/Logs/uttf-drive-tunnel.out.log             # messaggi di quick-tunnel.sh
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
