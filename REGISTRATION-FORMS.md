# Moduli delle attività

## Gestione

Accedere all’Area Staff, poi aprire Laboratori. Ogni attività ha **Modifica**; la tessera **Aggiungi attività** crea un nuovo pannello. Il tipo di modulo può essere Laboratorio, Evento, Attività esterna o Collaborazione / volontariato. Il cambio di tipo sostituisce le domande suggerite: le domande personalizzate possono essere aggiunte e rese obbligatorie.

Compilare programma, luogo, costi/gratuità, materiali e istruzioni; controllare le condizioni, l’informativa e il testo facoltativo relativo a foto/video. Provare **Anteprima modulo**, quindi selezionare **Apri le iscrizioni** e salvare. L’attività deve anche essere attiva. Le attività esistenti hanno ricevuto una bozza senza alterare titoli, fotografie, stato e contenuti impostati dallo staff. Non sono stati inventati date, prezzi o materiali.

I testi iniziali sono modelli organizzativi, non una certificazione di conformità legale. L’associazione deve adattarli alle condizioni effettive dell’attività e far verificare informativa, conservazione, fornitori/trasferimenti, autorizzazioni e modalità di firma dal proprio referente competente. La soglia di 18 anni serve a distinguere la richiesta di partecipazione dell’adulto dalla richiesta del genitore/tutore; non viene confusa con la soglia del consenso digitale. Non si raccolgono genere, documenti di identità o dati sanitari per impostazione predefinita.

## Iscrizione

Le card collegano alla pagina interna dell’attività. Il modulo adatta i campi alla data di nascita. Per i minori richiede genitore/tutore e documento firmato; per gli adulti il documento firmato è configurabile. La delega al ritiro è facoltativa e attivabile dallo staff. Il consenso foto/video è separato e non obbligatorio. Il PDF riporta attività, programma, partecipante, condizioni, privacy, scelta immagini ed eventuale delega, con spazi per le firme. Non è una firma digitale e non verifica da solo l’identità del firmatario.

Il partecipante scarica il PDF, lo firma e lo allega in PDF/JPG/PNG (massimo 2 MB). Se cambia dati o scelte, il precedente allegato viene scartato per richiedere il documento aggiornato. L’invio registra una richiesta da verificare, non conferma automaticamente un posto.

## Archivio

Area Staff → **Risposte laboratori**. Cartelle virtuali per nome/cognome, attività, data e riferimento univoco; omonimi non si sovrascrivono. Filtri per nome e attività, paginazione e stato documenti da verificare/verificati. Ogni cartella contiene `risposte.txt`, `autorizzazione-generata.pdf` ed eventualmente `autorizzazione-firmata.pdf/jpg/png`. La cartella è scaricabile come ZIP. Risposte e testi sono fotografati al momento dell’invio, quindi le successive modifiche al modulo non riscrivono le vecchie pratiche.

I dati sono in `activity_registrations`; gli allegati sono nel bucket privato `registration-files`, con percorsi UUID. Non ci sono letture dirette per utenti anonimi o browser autenticati: l’API verifica ogni richiesta contro l’allowlist dello staff. La chiave service-role rimane sul server. Gli ZIP vengono generati solo dopo l’autorizzazione staff.

## Configurazione tecnica

Applicare `registration-tables.sql` una sola volta e `registration-bio-link.sql` per il collegamento della bio. Ambiente server: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (già usata dalle API newsletter/recensioni). Il font Noto Sans, con licenza OFL inclusa, è distribuito localmente e incluso nel bundle server del generatore PDF. Non si inviano dati a servizi PDF esterni.

Le API controllano dimensione effettiva del corpo, campi, formato dell’allegato, versione del modulo, stato dell’attività e obblighi per minori. Il limite invii è persistente e usa un hash HMAC dell’indirizzo di rete, con finestra di un’ora; non registra l’IP in chiaro. Gli invii hanno un identificativo idempotente. Se un caricamento fallisce, la pratica incompleta e i file già caricati vengono rimossi. Se un processo viene interrotto bruscamente può rimanere una pratica `pending`, non mostrata nell’archivio; va riconciliata amministrativamente con i file nel bucket prima di qualsiasi cancellazione.

Il sistema non applica ancora scadenze automatiche di cancellazione: lo staff deve gestire la conservazione secondo l’informativa effettivamente adottata. La verifica dei documenti, la conferma di partecipazione e le eventuali risposte agli interessati restano allo staff.

## Verifiche

`npm test` include validazione età, dati e autorizzazioni, consenso facoltativo, generazione PDF, idempotenza, rollback su errore upload e rifiuto accessi non staff. `npm run build` verifica la compilazione. Il percorso di anteprima usato durante lo sviluppo è temporaneo e non viene pubblicato.
