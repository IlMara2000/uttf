# Iscritti storici della newsletter — come chiudere la pendenza

Aggiornato al 23 novembre 2026. Riguarda le **tre** righe di
`newsletter_subscribers` create il 13 maggio 2026, prima che l'archivio
registrasse la prova del consenso: hanno `consent_at`, `consent_version` e
`consent_ip_hash` a `null`.

## Esito: opzione A eseguita il 23 novembre 2026

Le tre righe sono state cancellate dal database di produzione
(`public.newsletter_subscribers`, filtro `consent_at is null`):

| id | nome | iscritto il |
|---|---|---|
| `d22fcbf5-baac-4a56-bc4b-e85d6922bd3d` | Brando Macchiarella | 13/05/2026 12:44 |
| `dea76d8c-55f5-4ba5-a358-e685415b96f2` | Marco Pagliari | 13/05/2026 15:43 |
| `d90c3bfe-e4fe-466d-b306-c78b35dea47e` | Lorenzo Cennamo | 13/05/2026 15:43 |

Verifica successiva: `select count(*) from public.newsletter_subscribers where
consent_at is null` → **0**; la tabella contiene ora 0 righe, quindi in
dashboard non compare più nessun «Consenso non registrato». Copia di sicurezza
con i valori completi: `newsletter-backup-2026-11-23.json` nella radice del
progetto, esclusa da git (`.gitignore`). Non va pubblicata né committata: serve
solo a ripristinare le righe se emergesse un errore. Trascorsi i termini di
conservazione della corrispondenza, si può eliminare.

## Perché è una pendenza

L'art. 7.1 GDPR chiede che il titolare sia in grado di **dimostrare** il
consenso; l'art. 5.2 ne fa un obbligo generale di responsabilizzazione. Per
queste tre iscrizioni non esiste prova: non sappiamo con quale informativa né
con quale azione sia stato dato il consenso. Finché restano così, ogni invio di
newsletter a quegli indirizzi è un trattamento promozionale senza base
giuridica (art. 6.1.a GDPR e art. 130 del Codice privacy), quindi va chiusa in
un modo o nell'altro. Non esiste una terza opzione: "lasciarli lì e non
scrìvergli" non è una chiusura, perché i dati restano conservati senza
giustificazione.

## Le due strade

| | A. Cancellazione | B. Riconferma via email |
|---|---|---|
| Cosa succede | Si eliminano le 3 righe | Un solo messaggio che chiede di confermare |
| Rischio | Nessuno | Basso, ma va scritto e gestito con attenzione |
| Costo | 1 minuto | 1 email + attesa fino al 24 dicembre + cancellazione dei silenti |
| Cosa resta | Nulla | La risposta "SÌ" in casella, con data, come prova |
| Contatti persi | 3 | Chi non risponde |

**Consiglio: A.** Con tre iscritti il valore dei contatti è trascurabile e la
cancellazione chiude la pratica senza scritture da motivare. B ha senso solo se
quelle tre persone contano davvero per l'associazione.

La riconferma **non è** un modo per continuare a scrivere nel frattempo: può
essere un solo messaggio, con lo scopo esclusivo di ottenere il consenso, senza
contenuto promozionale, senza newsletter, senza promemoria ripetuti. Chi non
risponde entro il termine dichiarato va cancellato.

## A. Cancellazione — passi

1. `newsletter-storici.sql`, blocco **1** e **1b**: elenco e backup JSON da
   salvare in un foglio.
2. Blocco **A**: `delete ... where consent_at is null returning ...`. Annota gli
   id restituiti.
3. Verifica finale: `select count(*) ... where consent_at is null` deve dare 0.
4. Nel registro dei trattamenti non serve una nuova voce: alla voce 1
   (Newsletter) aggiungi una riga nelle note del mese: «23/11/2026 — cancellati
   n. 3 iscritti privi di prova del consenso».

Eseguita da me il 23 novembre 2026 con la stessa via usata per la migrazione
(API di amministrazione Supabase con il token della sessione del pannello).
Questa sezione resta come traccia di cosa è stato fatto e come eventualmente
ripeterlo.

## B. Riconferma — passi (percorso non seguito)

Il 23 novembre 2026 è stata eseguita l'opzione A, quindi i blocchi B e C sono
stati tolti da `newsletter-storici.sql`. Questa sezione resta come traccia del
percorso alternativo, con le query scritte per esteso.

1. Invio dalla casella ufficiale dell'associazione, un destinatario per
   messaggio (niente CC: gli indirizzi non devono vedersi tra loro).
2. Testo pronto, senza contenuto promozionale:

   > **Oggetto:** Conferma la tua iscrizione alla newsletter di Under The Tower Factory
   >
   > Ciao,
   >
   > ti scriviamo una sola volta, e non è una newsletter.
   >
   > Nel nostro archivio la tua iscrizione alla newsletter risulta precedente a
   > maggio 2026 e non abbiamo conservato la prova del consenso. Per rispettare
   > il GDPR non possiamo continuare a scriverti senza quella prova.
   >
   > Se vuoi restare iscritto, rispondi a questa email con «SÌ» entro il
   > 23 dicembre 2026: registreremo la tua conferma con la data della risposta.
   >
   > Se non rispondi, il 24 dicembre 2026 cancelleremo i tuoi dati dall'elenco.
   > Non riceverai altre email e non devi fare nulla.
   >
   > Come trattiamo i dati: https://uttf.vercel.app/privacy
   >
   > Under The Tower Factory

3. Ogni risposta "SÌ": aggiorna la riga con l'indirizzo della persona e la
   data/ora reali della risposta. `consent_version` diventa
   `privacy 2.1 (riconferma via email)`; `consent_ip_hash` resta `null`, perché
   la prova è la risposta conservata in casella.

   ```sql
   update public.newsletter_subscribers
   set consent_at = timestamptz '2026-11-25 09:12:00+01',
       consent_version = 'privacy 2.1 (riconferma via email)'
   where lower(email) = lower('nome@example.com')
     and consent_at is null;
   ```

4. Il 24 dicembre: `delete from public.newsletter_subscribers where
   consent_at is null;` cancella chi non ha risposto.
5. Archivia le risposte: sono la prova. Se un giorno arriva un reclamo, la
   risposta con data è ciò che si mostra.

### Attenzione tecnica

La riconferma **non passa dal form pubblico**: `POST /api/newsletter` con una
email già presente riceve dal database `23505` (indirizzo già iscritto) e
risponde `{"success":true}` senza aggiornare `consent_at`. Quindi il form non
registra la conferma di un iscritto esistente, e la prova va messa a mano con il
blocco B. Se in futuro vuoi una riconferma automatica e tracciata servirebbe un
doppio opt-in (token monouso + endpoint di conferma): è una modifica all'API che
posso fare, ma non serve per tre righe.

### Dopo la scelta

- Se scegli A: nessuna modifica al codice, solo il SQL.
- Se scegli B: nessuna modifica al codice, solo invio email + SQL.
- In entrambi i casi il gestionale smette di mostrare «Consenso non registrato»
  perché le righe spariscono (A) o ricevono una versione (B).
