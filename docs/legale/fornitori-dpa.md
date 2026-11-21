# Fornitori e nomine art. 28 GDPR (DPA)

Elenco dei fornitori che trattano dati personali per conto dell'associazione.
Per ognuno va **scaricato e archiviato** il contratto di trattamento (DPA) o i
termini che lo incorporano, insieme alla data di accettazione. Il DPA non si
"firma" sul sito del fornitore: va conservato in PDF nella cartella degli atti.

Ultima verifica: 21 novembre 2026.

| Fornitore | Ruolo | Dati trattati | Sede / trasferimento | Documento da archiviare |
|---|---|---|---|---|
| **Supabase Inc.** | Responsabile — database Postgres, autenticazione, storage dei file | Tutti i dati del sito: iscritti, recensioni, prenotazioni, richieste, account staff, bucket privati | USA. Clausole contrattuali standard + valutazione del trasferimento | DPA Supabase (incorporato nei Terms of Service) |
| **Vercel Inc.** | Responsabile — hosting, CDN, funzioni server, log tecnici | Richieste HTTP, IP nei log, contenuti delle pagine | USA. SCC + DPF (decisione 2023/1795) | DPA Vercel |
| **Google Ireland Ltd / Google LLC** | Responsabile — API Google Calendar, mappe incorporate | Eventi del calendario, contatti degli eventi; per la mappa l'IP di chi clicca "Carica la mappa" | Irlanda (UE) per i clienti UE; possibili accessi USA | DPA Google Cloud / Google Workspace |
| **Groq Inc.** | Responsabile — inferenza AI per le bozze dei testi social | Solo testi e istruzioni scritti dallo staff, nessun dato degli interessati | USA. SCC | DPA Groq |
| **Cloudflare Inc.** | Responsabile (previsto) — tunnel e Access per l'archivio su disco; futura piattaforma di hosting | Richieste verso l'agente locale, log di accesso, file serviti dal tunnel | USA. SCC + DPF | DPA Cloudflare (da accettare prima di attivare il tunnel) |
| **GitHub Inc.** | Responsabile — repository del codice | Codice e cronologia commit; nessun dato personale degli interessati | USA. SCC | DPA GitHub |
| **Google (Gmail)** | Responsabile — casella ass.uttf@gmail.com | Corrispondenza e allegati | Irlanda/USA | DPA Google Workspace (o condizioni Gmail) |

## Cosa verificare per ciascun fornitore

1. Il DPA è accettato e scaricato, con data.
2. Il fornitore dichiara i sub-responsabili (Supabase usa AWS; Vercel usa AWS e
   Cloudflare come CDN) e l'associazione ne è informata.
3. Esiste una base per il trasferimento extra-UE: DPF se il fornitore è
   certificato, altrimenti SCC più valutazione del rischio.
4. Le misure di sicurezza dichiarate coprono almeno: cifratura in transito e a
   riposo, backup, accesso limitato, notifica di violazione.
5. Il fornitore notifica gli incidenti senza ritardo ingiustificato: la notifica
   deve permettere all'associazione di rispettare le 72 ore dell'art. 33.

## Trasferimenti extra-UE

Il DPF (Data Privacy Framework) è in vigore: la decisione di adeguatezza del 10
luglio 2023 è stata confermata dal Tribunale UE il 3 settembre 2025 (causa
T-553/23); l'appello C-703/25 P è pendente. Finché il quadro regge, i fornitori
certificati DPF possono ricevere dati senza SCC aggiuntive. Per prudenza le SCC
restano archiviate insieme al DPA: se il DPF cadesse, il trasferimento non si
interrompe.

## Nota sulla migrazione a Cloudflare

Se il sito passa su Cloudflare Workers, Cloudflare diventa responsabile per
hosting e cache. R2, D1 e il tunnel sono coperti dallo stesso DPA: va aggiornato
l'elenco dei sub-responsabili e la voce nel registro dei trattamenti.
Supabase può restare il database anche dopo la migrazione: in quel caso il
trasferimento dei dati verso gli USA non cambia.
