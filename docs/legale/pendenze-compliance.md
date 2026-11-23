# Pendenze aperte — aggiornato al 21 novembre 2026

Questo file elenca **solo** ciò che resta da fare e che non è stato possibile
chiudere io. Tutto il resto è stato fatto e verificato in questa tornata.

---

## 1. Chiuso oggi (con verifica)

- **Next 16.4.5** e **@opennextjs/cloudflare 1.20.18**: la build OpenNext
  completa e il Worker parte in workerd (`opennextjs-cloudflare preview`).
- **`wrangler.jsonc`** con `ASSETS`, self-reference, R2, D1 e Durable Object;
  **`open-next.config.ts`** con cache ISR su R2, tag cache su D1 e coda su DO;
  **`cloudflare/d1-next-tag-cache.sql`** con la tabella `revalidations`.
- **Font senza disco**: `src/lib/registrations/font.ts` legge il TTF da
  `public/fonts`. Provato dentro workerd: 569.208 byte, magic TTF corretto.
- **Immagini**: `unoptimized`, nessun binding `IMAGES`, nessun `sharp` a runtime.
- **Sentry**: configurazione nei tre runtime, raccolta dati chiusa, filtri che
  eliminano email e query string da messaggi e briciole.
- **Informativa privacy 2.1** e cookie policy aggiornate con Sentry; registro
  dei trattamenti (voce 11) e tabella fornitori allineati.
- **Retention in produzione**: `CRON_SECRET` impostato su Vercel Production,
  redeploy dello stesso codice, cron eseguito. Log reale:
  `[retention] dry-run: {"newsletterSubscribers":0,"bookingReservations":0,"reviews":0,"activityRegistrations":0,"registrationFiles":0,"bookingRateLimits":1,"registrationRateLimits":1}`.
  Nessun dato personale scaduto, due righe di rate limit già scadute.

---

## 2. Serve una tua azione: dati del titolare

Campi vuoti in `src/lib/legal-entity.ts`, quindi assenti da `/privacy` e
`/terms`:

- [ ] codice fiscale
- [ ] indirizzo PEC
- [ ] numero di iscrizione al RUNTS
- [ ] nome e cognome del legale rappresentante

Quando li hai, passali qui: li inserisco, porto l'informativa alla versione 2.3
con la data del giorno e rifaccio la build.

---

## 3. Sentry: creare il progetto (10 minuti, gratis)

Non posso registrare un account a tuo nome: serve un'identità (email o accesso
GitHub/Google) e l'accettazione dei termini. Il resto è già pronto.

**Piano Developer — gratis, senza carta di credito, senza scadenza**

| Voce | Limite |
|---|---|
| Errori al mese | 5.000 |
| Utenti | 1 |
| Storico eventi | 30 giorni |
| Monitor uptime / cron inclusi | 1 + 1 |
| Spazio log | 5 GB |

Cosa succede oltre i 5.000 errori: gli eventi vengono **scartati**, non
addebitati; il piano free non ha consumo a pagamento, quindi non arriva una
bolletta. Si perde la visibilità fino al mese successivo: va impostato un avviso
di quota nella dashboard.

Passi:

1. `sentry.io` → sign up (piano Developer).
2. Crea un progetto di tipo **Next.js**, copia il **DSN**.
3. Incollalo qui oppure impostalo tu:
   `printf '%s' "<DSN>" | npx vercel env add NEXT_PUBLIC_SENTRY_DSN production`
4. Fai il push: il deploy successivo carica il DSN e Sentry inizia a ricevere.
5. Nella dashboard del progetto attiva l'opzione che **non conserva gli IP**.
6. Accetta il DPA e archiviane il PDF; verifica la certificazione DPF (o SCC).
7. Verifica con la pagina "Issue" di prova che arrivi un evento e che non
   contenga email, header o body.

---

## 4. Migrazione del consenso newsletter (Supabase) — chiusa

Applicata il 21 novembre 2026 dall'**SQL Editor** del progetto
`oieqtrfeoyfabyjirrqa` ("UTTF HUB"): è l'unica via per eseguire SQL senza la
password del database, perché i segreti su Vercel sono di tipo Secret e
`vercel env pull` li restituisce come `[SENSITIVE]`.

Stato prima: 5 colonne (`id`, `created_at`, `name`, `email`, `phone`).
Dopo la `alter table ... add column if not exists`: `Success. No rows returned`.

Verifica su `information_schema.columns` per `newsletter_subscribers`:

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `consent_at` | timestamp with time zone | YES | NULL |
| `consent_ip_hash` | text | YES | NULL |
| `consent_version` | text | YES | NULL |

Nessun dato toccato: le colonne nascono vuote, le righe storiche restano senza
prova del consenso, come previsto.

- [x] verifica che le tre colonne esistano
- [x] iscritti storici: **cancellati** il 23 novembre 2026 (opzione A).
      Eliminate 3 righe con `consent_at is null`, tutte del 13 maggio 2026:
      `d22fcbf5-baac-4a56-bc4b-e85d6922bd3d`, `dea76d8c-55f5-4ba5-a358-e685415b96f2`,
      `d90c3bfe-e4fe-466d-b306-c78b35dea47e`. Copia di sicurezza in
      `newsletter-backup-2026-11-23.json` (fuori dal versionamento).
      Verifica: `select count(*) ... where consent_at is null` → **0**; la tabella
      ora contiene 0 righe. Dettagli in `docs/legale/newsletter-iscritti-storici.md`.

Nota: applicata a mano, quindi non compare in
`supabase_migrations.schema_migrations`. Non è un problema: il file
`supabase/migrations/20261119120000_newsletter_consent.sql` usa
`add column if not exists`, perciò è ripetibile anche con un futuro
`supabase db push` (che resta bloccato dalla password del database).

---

## 5. Uptime monitor (UptimeRobot, gratis)

Va creato **dopo** il deploy del nuovo codice, perché `/api/health` oggi non è
ancora in produzione.

1. Account free su `uptimerobot.com` (50 monitor, 5 minuti, uso commerciale
   ammesso, nessuna carta).
2. New monitor → HTTP(s) → `https://uttf.vercel.app/api/health` → 5 minuti.
3. Alert alla tua email.
4. Consigliato: tipo **Keyword** con `"ok":true`.

Serve anche a non far andare in pausa il progetto Supabase free (7 giorni senza
richieste).

---

## 6. Retention: attiva

Fatto il 21 novembre 2026: `RETENTION_ENABLED=true` su Vercel Production,
redeploy e primo giro reale. Log del giro: `delete` con
`newsletterSubscribers:0, bookingReservations:0, reviews:0,
activityRegistrations:0, registrationFiles:0, bookingRateLimits:1,
registrationRateLimits:1`. Il giro successivo ha riportato tutto a zero, quindi
la cancellazione è effettiva e il job è idempotente.

- [x] Cancellazione abilitata e verificata

Il cron gira ogni giorno alle 04:00 UTC. Da qui in avanti cancella davvero
iscritti oltre 24 mesi, prenotazioni oltre 12 mesi, recensioni oltre 5 anni e
richieste di iscrizione non accolte (`declined`) o mai completate (`pending`)
oltre 12 mesi.

`received` (invio completato, in attesa di verifica) non viene più trattato
come un rifiuto: la cartella resta finché lo staff non la chiude come `reviewed`
o `declined`. `reviewed` non significa "accolta" ma "documenti verificati": è
lo stato che conserva la cartella per gli obblighi amministrativi.

- [x] Stato `declined` («non accolta») aggiunto il 23 novembre 2026: vincolo
      `activity_registrations_status_check`, PATCH dell'API e pulsante in
      dashboard. Retrocompatibile: le righe esistenti restano `received` o
      `reviewed`.

### Termine per le richieste in attesa: chiuso con avviso e chiusura manuale

Una richiesta `received` non scade da sola, perché non è un rifiuto. Per non
lasciare dati in archivio senza limite, la soluzione adottata è **la più
prudente**: nessuna cancellazione automatica di cartelle ancora aperte, ma un
avviso allo staff dopo 12 mesi dalla richiesta.

- [x] `src/lib/registrations/waiting.ts` calcola la soglia (365 giorni);
      `GET /api/registrations` restituisce `waitingTooLong` (conteggio) e
      `stale` su ogni riga.
- [x] La dashboard iscrizioni mostra un banner con il numero di cartelle da
      chiudere e la segnalazione su ogni scheda.

Perché non la cancellazione automatica a 24 mesi: avrebbe distrutto documenti
(e relative autorizzazioni firmate) di richieste che lo staff non aveva ancora
esaminato, e avrebbe richiesto una nuova versione dell'informativa per un
termine mai pubblicato. L'avviso invece rende visibile il caso e lascia la
chiusura a chi conosce la richiesta; nessun termine pubblicato cambia, quindi
l'informativa resta 2.2.

- [ ] Verificare nei primi mesi che l'avviso venga effettivamente gestito: se le
      cartelle si accumulano, si passa alla cancellazione automatica con
      informativa 2.3.

---

## 7. DPA e trasferimenti extra-UE

Da fare con chi vi segue legalmente; a me servono solo le date per tenerne
traccia.

- [ ] Sentry / Functional Software, Inc. — DPA + DPF o SCC + opzione IP
- [ ] Supabase — DPA incorporato nei ToS
- [ ] Vercel — DPA
- [ ] Cloudflare — DPA **prima** di attivare tunnel o Worker
- [ ] GitHub — DPA
- [ ] Google — DPA Workspace/Gmail e Cloud
- [ ] Groq — DPA
- [ ] Valutazione d'impatto del trasferimento (TIA) aggiornata

---

## 8. Fase 2 Cloudflare: risorse da creare

Il codice è pronto e verificato in locale; mancano le risorse e il deploy.

- [ ] `npx wrangler r2 bucket create uttf-crm-opennext-cache`
- [ ] `npx wrangler d1 create uttf-tag-cache`
- [ ] applicare `cloudflare/d1-next-tag-cache.sql` al D1
- [ ] sostituire in `wrangler.jsonc` l'id D1 segnaposto
      (`00000000-0000-0000-0000-000000000000`) con quello reale
- [ ] `npx wrangler secret put` per i segreti (stessi nomi di `.env.example`)
- [ ] `npx opennextjs-cloudflare deploy` su un dominio `*.workers.dev`
- [ ] verificare su Cloudflare: login staff, upload allegati, PDF di
      autorizzazione, cron di retention, cache ISR
- [ ] ricordare che la coda Durable Object non è emulata in locale: va provata
      con le risorse reali
- [ ] il middleware Node (`src/proxy.ts`) è sperimentale su Cloudflare:
      ricontrollare il redirect al login

---

## 9. Rischi da tenere d'occhio

- **Messaggi di errore.** I filtri rimuovono email e query string, ma un codice
  di errore esterno può contenere altri valori. Controlla i primi eventi reali.
- **Quota Sentry** (5.000/mese): imposta l'avviso.
- **Nessun backup automatico** su Supabase free: serve un `pg_dump` periodico.
- **Vercel Hobby** è per uso non commerciale e può essere sospeso: è un ponte.
- **Allergia o dati sanitari** nei campi liberi: vanno cancellati appena cessata
  l'esigenza.
