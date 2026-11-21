# Procedura per le violazioni di dati personali (artt. 33-34 GDPR)

Vale per qualsiasi evento che porti alla distruzione, perdita, modifica o
divulgazione non autorizzata di dati personali trattati dall'associazione:
accesso indebito a un account, database esposto, email inviata al destinatario
sbagliato, furto del disco con l'archivio media, perdita di una chiave.

La procedura è scritta per essere eseguita da una persona sola, senza riunioni:
chi si accorge dell'evento apre il registro e segue i passi.

## Ruoli

- **Referente incidenti**: chi gestisce l'evento (di norma chi amministra il
  sito). Tiene il registro e decide le notifiche.
- **Legale rappresentante**: approva la notifica al Garante e quella agli
  interessati; è il firmatario.
- **Fornitori** (Supabase, Vercel, Google, Cloudflare): notificano gli incidenti
  che li riguardano secondo il loro DPA. Le loro comunicazioni vanno allegate al
  registro.

## Tempi

| Momento | Cosa fare |
|---|---|
| **T0 — rilevazione** | Annotare data e ora, chi ha rilevato, cosa si vede. Non cancellare tracce: salvare log e schermate. |
| **T0 + 1 ora** | Contenere: revocare credenziali e sessioni, ruotare le chiavi esposte, chiudere l'accesso pubblico, sospendere il job o l'integrazione coinvolta. |
| **T0 + 24 ore** | Valutare il rischio: quali dati, quante persone, dati particolari sì/no, rischio di danno (identità, reputazione, libertà). Scrivere la valutazione nel registro. |
| **T0 + 72 ore** | Se il rischio per i diritti è **non basso**, notificare il Garante con il modello sotto. Se il rischio è basso, motivare nel registro perché non si notifica. |
| **T0 + 72 ore** | Se il rischio è **elevato**, comunicare l'evento agli interessati con linguaggio semplice: cosa è successo, quali dati, cosa fare, contatto. |
| **T0 + 30 giorni** | Chiudere l'evento: causa, rimedi tecnici, aggiornamento delle misure, verifica che il rimedio funzioni. |

La notifica tardiva è ammessa solo se motivata (art. 33.1). Meglio notificare
entro le 72 ore con informazioni parziali e integrarle dopo, che notificare in
ritardo.

## Cosa contiene la notifica al Garante

1. Natura della violazione: categorie e numero approssimativo di interessati e di
   record coinvolti.
2. Contatto del referente e del legale rappresentante.
3. Conseguenze probabili.
4. Misure adottate o proposte, comprese quelle per attenuare gli effetti.
5. Se le informazioni non sono tutte disponibili, indicare cosa manca e quando
   arriverà.

Canale: servizi online del Garante per la protezione dei dati personali
(garanteprivacy.it). Conservare ricevuta e protocollo.

## Modello di comunicazione agli interessati

> Oggetto: comunicazione di un incidente che ha riguardato i tuoi dati
>
> Gentile [nome],
> il [data] abbiamo rilevato [descrizione breve]. Sono stati coinvolti
> [categorie di dati]. Non sono stati coinvolti [dati non coinvolti, se utile].
> Abbiamo [azione immediata: revoca accessi, rotazione chiavi, ripristino].
> Ti chiediamo di [azione concreta: cambiare password, segnalare email sospette].
> Per informazioni puoi scrivere a ass.uttf@gmail.com.
> [Firma: legale rappresentante]

## Registro degli incidenti (art. 33.5)

Tenere un file, anche un foglio di calcolo, con una riga per evento:

| Data e ora | Rilevato da | Descrizione | Dati e persone coinvolte | Rischio | Notifica al Garante (sì/no, protocollo) | Comunicazione agli interessati (sì/no) | Misure adottate | Chiusura |
|---|---|---|---|---|---|---|---|---|

Il registro va conservato anche quando non si notifica: è la prova che la
valutazione è stata fatta. Non inserire nel registro il contenuto dei dati
personali coinvolti, solo le categorie.

## Misure che riducono il rischio di incidente

- `SUPABASE_SERVICE_ROLE_KEY` e le chiavi dei fornitori solo su Vercel (o
  Cloudflare) come variabili server, mai nel repository o nel browser.
- Bucket privati e URL firmati a scadenza breve; nessun URL firmato salvato nel
  database.
- Ruolo staff verificato a ogni richiesta tramite `authorized_users`.
- Rotazione delle chiavi dopo ogni rimozione di una persona dallo staff.
- MFA sugli account dei fornitori; accesso al repository limitato.
- Retention automatica attiva, così i dati vecchi non restano dove non servono.
- Prova annuale: simulare un accesso indebito e cronometrare la procedura.
