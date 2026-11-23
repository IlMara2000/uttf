# Registro delle attività di trattamento (art. 30 GDPR)

Titolare: **Under The Tower Factory** — Associazione di promozione sociale
Via dei Biancospini, 4 — 20089 Rozzano (MI), Italia
Contatto: ass.uttf@gmail.com

Dati identificativi dell'ente (CF, PEC, numero RUNTS, legale rappresentante) da
completare in `src/lib/legal-entity.ts`: nel registro vanno riportati identici a
quella fonte. Ultima revisione: 23 novembre 2026.

Il registro è interno: non va pubblicato. Va aggiornato quando cambia una
finalità, un fornitore o un termine di conservazione. I termini qui indicati
sono gli stessi pubblicati in `/privacy` (§07) e applicati dal job
`/api/maintenance/retention` (`src/lib/retention.ts`).

## Attività

| # | Attività | Finalità | Interessati | Categorie di dati | Base giuridica | Destinatari | Conservazione |
|---|---|---|---|---|---|---|---|
| 1 | Newsletter | Invio di comunicazioni promozionali e aggiornamenti sulle attività | Iscritti maggiorenni (minori solo con consenso del genitore) | Nome, email, telefono (facoltativo), data e versione del consenso, hash HMAC dell'IP | Art. 6.1.a GDPR + art. 130 D.Lgs. 196/2003 | Supabase (database), Vercel (hosting) | Fino alla revoca; 24 mesi senza interazioni |
| 2 | Recensioni pubblicate | Pubblicazione di feedback sul sito | Clienti e partecipanti che scrivono la recensione | Nome o pseudonimo, testo, valutazione, data | Art. 6.1.a GDPR (consenso alla pubblicazione) | Supabase, Vercel | Fino alla revoca o richiesta di rimozione, max 5 anni |
| 3 | Prenotazioni | Gestione degli appuntamenti e della capienza degli slot | Chi prenota | Nome, email, telefono, numero di persone, note libere, codice prenotazione | Art. 6.1.b GDPR | Supabase, Vercel | 12 mesi dall'appuntamento |
| 4 | Richieste di iscrizione alle attività | Valutazione della richiesta, comunicazioni organizzative, autorizzazioni dei minori | Richiedenti e partecipanti, genitori/tutori per i minori | Dati anagrafici e di contatto, risposte al modulo, eventuali allegati (PDF/immagini), autorizzazioni | Art. 6.1.b GDPR; art. 8 per i minori | Supabase (database e bucket privato `registration-files`), Vercel | Non accolte: 12 mesi. Accolte: durata dell'attività + obblighi amministrativi e assicurativi (di regola 5 anni) |
| 5 | Rapporto associativo ed ETS | Gestione degli associati, adempimenti del terzo settore, trasparenza | Soci, volontari, amministratori | Anagrafica, contatti, quote, presenze, deleghe | Art. 6.1.b e 6.1.c GDPR; artt. 13-14 D.Lgs. 117/2017 | Supabase, Vercel, consulente contabile | Durata del rapporto + termini civilistici e fiscali |
| 6 | Account staff e autorizzati | Accesso all'area riservata e al CRM | Staff, amministratori | Email, ruolo in `authorized_users`, log di accesso | Art. 6.1.b GDPR | Supabase Auth | Fino alla revoca + 30 giorni |
| 7 | Sicurezza e anti-abuso | Limitare richieste abusive, diagnosticare errori | Visitatori delle API pubbliche | IP (in chiaro solo nella richiesta, poi hash HMAC), user agent, timestamp | Art. 6.1.f GDPR (sicurezza) | Supabase, Vercel | Hash: 1 ora (tabelle `*_rate_limits`); log dell'hosting: secondo il fornitore, max 7 giorni |
| 8 | Archivio media su disco locale | Conservazione di foto e video delle attività | Partecipanti ripresi, staff | File multimediali e indice (nome, percorso, tag) | Art. 6.1.a per foto/video; 6.1.f per l'organizzazione dell'archivio | Disco locale (Hiksemi) + indice su Supabase; agent locale | Secondo il consenso; i metadati indicizzati seguono la vita dell'archivio |
| 9 | Corrispondenza email | Risposta a richieste, informazioni, adempimenti | Chi scrive alla casella dell'associazione | Indirizzo, contenuto dei messaggi, allegati | Art. 6.1.b o 6.1.c GDPR | Google (Gmail) | Tempo necessario alla gestione, poi cancellazione periodica |
| 10 | Testi social assistiti da AI | Bozze di contenuti per i canali social, solo su input dello staff | Nessun dato di interessati: si usano testi e brief interni | Testi forniti dallo staff | Art. 6.1.f / attività interna | Groq (inferenza), Vercel | Non conservati oltre la sessione di lavoro |
| 11 | Monitoraggio degli errori applicativi (Sentry) | Diagnosi dei malfunzionamenti e sicurezza del servizio | Visitatori e staff, limitatamente agli errori generati | Messaggio di errore, pagina e stack trace. Esclusi per configurazione: cookie, intestazioni HTTP, body delle richieste, contenuto dei moduli, variabili locali e dati utente | Art. 6.1.f GDPR (sicurezza del servizio) | Functional Software, Inc. (Sentry), Vercel per l'inoltro | 30 giorni secondo il piano del fornitore |

## Categorie particolari (art. 9)

Il sito chiede esplicitamente di **non** inserire dati sanitari o copie di
documenti di identità nei campi liberi. Se arrivassero dati di questo tipo
(per esempio un certificato medico allegato a una richiesta), vanno trattati
solo per la finalità di partecipazione e cancellati appena superati gli
obblighi di legge. Non è previsto un trattamento sistematico di categorie
particolari e non è stata effettuata una DPIA.

## Misure di sicurezza

- RLS attiva su tutte le tabelle esposte; scritture pubbliche solo tramite API
  server con `service_role`, mai dal browser.
- Bucket `factory-assets` e `registration-files` privati; lettura con URL
  firmati o proxy server.
- Ruoli staff/admin in `authorized_users`, verificati a ogni richiesta; la
  rimozione revoca l'accesso anche con token ancora valido.
- IP salvati come HMAC (chiave `SUPABASE_SERVICE_ROLE_KEY`) per i limiti
  anti-abuso e la prova del consenso.
- Consenso newsletter separato dalla presa visione dell'informativa, con data,
  versione e hash.
- Segreti solo in variabili d'ambiente server (`SUPABASE_SERVICE_ROLE_KEY`,
  `GROQ_API_KEY`, `CALENDAR_*`, `DRIVE_*`, `CF_ACCESS_*`), mai in `NEXT_PUBLIC_*`.

## Punti aperti (da chiudere)

- Compilare CF, PEC, RUNTS e legale rappresentante in `src/lib/legal-entity.ts`.
- Archiviare i DPA dei fornitori (vedi `fornitori-dpa.md`).
- Applicare `supabase/migrations/20261119120000_newsletter_consent.sql` per la
  prova del consenso.
- Abilitare `RETENTION_ENABLED=true` dopo un primo giro in dry-run.
- Verificare che gli account Supabase, Vercel, GitHub e Google dell'ente abbiano
  MFA attiva e che l'accesso sia limitato a chi serve.
- Accettare e archiviare il DPA di Sentry (Functional Software, Inc.), verificare
  la certificazione DPF o le SCC e attivare nella dashboard Sentry l'opzione che
  non conserva gli indirizzi IP negli eventi.

## Cronologia delle operazioni

- **23/11/2026** — voce 1 (Newsletter): cancellati 3 iscritti del 13/05/2026
  privi di prova del consenso (art. 7.1 e 5.2 GDPR). Nessun dato conservato;
  copia di sicurezza locale esclusa dal versionamento.
