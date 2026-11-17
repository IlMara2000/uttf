# Resend — email di conferma prenotazione

Il pannello prenotazioni invia due email via Resend (REST API, nessuna dipendenza da installare):

1. **Cliente** → conferma con giorno, orario, indirizzo e codice prenotazione.
2. **Staff** (`booking_settings.staff_email`, default `ass.uttf@gmail.com`) → notifica con i dati della prenotazione.

Senza chiave, le prenotazioni si salvano lo stesso e l'invio viene saltato senza errori.

## 1. Crea account e verifica il mittente (dominio)

Resend invia solo da **domini verificati** (SPF/DKIM): un indirizzo Gmail/Outlook come mittente viene rifiutato.

1. Vai su <https://resend.com> e crea l'account.
2. Dashboard Resend → **Domains** → **Add Domain** → inserisci un dominio che controlli (es. un vostro dominio, non `uttf.vercel.app`).
3. Aggiungi nel DNS del dominio i record mostrati da Resend (tipicamente TXT/ DKIM + MX per le risposte). Aspetta che lo stato diventi **Verified** (da pochi minuti a qualche ora).
4. Scegli il mittente, es. `prenotazioni@TUODOMINIO.it`.

> Alternativa solo per testare: `onboarding@resend.dev` invia **solo** all'email dell'account Resend. Non usare in produzione.

## 2. Crea la chiave API

Resend → **API Keys** → **Create API Key** (permesso *Sending access*) → copia la chiave (`re_...`). **Copialla subito**: viene mostrata una sola volta.

## 3. Variabili su Vercel (progetto `uttf-app`)

Vercel → progetto **uttf-app** → **Settings** → **Environment Variables** (ambiente **Production** e, se vuoi testare, anche **Preview**):

| Variabile | Valore |
|---|---|
| `RESEND_API_KEY` | la chiave `re_...` |
| `BOOKING_FROM_EMAIL` | `"Under The Tower Factory <prenotazioni@TUODOMINIO.it>"` (dominio verificato) |
| `BOOKING_REPLY_TO_EMAIL` | `ass.uttf@gmail.com` (opzionale; le risposte dei clienti arrivano qui) |

Poi **Redeploy** (Deployments → ⋯ → Redeploy) perché le env var entrano in vigore solo al deploy successivo.

## 4. Test

1. Apri la pagina del sito → sezione *Il nostro punto di incontro* → **Vieni a trovarci, dai**.
2. Prenota uno slot con la tua email (e una seconda con l'email staff).
3. Controlla: posta in arrivo (anche spam) + Resend → **Emails** (log di invio) e Vercel → **Logs** (eventuali errori `[bookings]`).

## Problemi comuni

- **`BOOKING_FROM_EMAIL` non impostata** nei log → variabile mancante su Vercel o deploy fatto prima di aggiungerla.
- **Resend rifiuta il mittente** (errore `... domain is not verified` nei log) → dominio non verificato oppure mittente su Gmail/Outlook.
- **Email arrivate in spam** → di solito si sistema quando SPF/DKIM sono verificati; evita parole "spam" nell'oggetto.
- **Prenotazione salvata ma nessuna email** → è il comportamento previsto senza chiave.

## Cosa significa il flag `emailAccepted`

La risposta dell'API e il pannello espongono `emailAccepted`, non `emailSent`: è `true` quando Resend ha **accettato** la richiesta di invio (HTTP 2xx), **non** quando l'email è stata consegnata. La consegna arriva dopo, in modo asincrono, e può finire in `queued`, `bounced` o `complained` sulla dashboard.

Nei log Vercel (`[bookings]`) trovi:

- `Email accettata da Resend (non = consegnata) — to=... id=...` → cercando quell'`id` in Resend → Emails vedi lo stato reale di consegna.
- `Email NON accettata da Resend — to=... status=... body=...` → Resend ha rifiutato (mittente non verificato, dominio non valido, chiave senza permessi).
- `RESEND_API_KEY non impostata` / `BOOKING_FROM_EMAIL non impostata` → invio saltato per configurazione mancante.
- `Email prenotazione UTTF-XXXX: cliente=... id=... | staff=... id=...` → riga di sintesi per ogni prenotazione.

Quindi: `emailAccepted: true` + `bounced` su Resend significa che il codice ha fatto la sua parte e il problema è lato dominio mittente/verifica DNS, non lato applicazione.
