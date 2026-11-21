import Link from "next/link";
import PublicPageIntro from "@/components/PublicPageIntro";
import { LEGAL_ENTITY, legalAddress } from "@/lib/legal-entity";

/**
 * Informativa sul trattamento dei dati personali — artt. 13 e 14 GDPR
 * (Reg. UE 2016/679) e art. 2-quinquies del D.Lgs. 196/2003 come modificato
 * dal D.Lgs. 101/2018.
 *
 * Le sezioni descrivono i trattamenti realmente effettuati dalla piattaforma:
 * newsletter, recensioni, prenotazioni, iscrizioni alle attività (anche minori),
 * area staff, calendario e archivio locale del drive.
 */

const purposes = [
  {
    purpose: "Erogazione del sito, sicurezza e prevenzione degli abusi",
    data: "Indirizzo IP e log tecnici del fornitore di hosting, hash HMAC dell'IP per i limiti di invio, segnalazioni tecniche di errore senza dati dei moduli",
    basis: "Legittimo interesse del titolare alla sicurezza del servizio (art. 6.1.f GDPR)",
  },
  {
    purpose: "Gestione di iscrizioni, prenotazioni e richieste di partecipazione",
    data: "Nome, cognome, data di nascita, recapiti, risposte al modulo, eventuale autorizzazione firmata",
    basis: "Esecuzione di un contratto o di misure precontrattuali su richiesta dell'interessato (art. 6.1.b GDPR)",
  },
  {
    purpose: "Adempimenti amministrativi, contabili, fiscali e assicurativi",
    data: "Dati identificativi e di contatto, documenti di partecipazione, ricevute",
    basis: "Obbligo legale del titolare (art. 6.1.c GDPR)",
  },
  {
    purpose: "Newsletter e comunicazioni informative sulle attività",
    data: "Nome o nickname, email, telefono facoltativo, data e ora del consenso",
    basis: "Consenso dell'interessato (art. 6.1.a GDPR) e art. 130 del Codice privacy",
  },
  {
    purpose: "Pubblicazione di recensioni e contenuti inviati dagli utenti",
    data: "Nome o nickname indicato, valutazione, testo della recensione",
    basis: "Consenso dell'interessato (art. 6.1.a GDPR) manifestato con l'invio",
  },
  {
    purpose: "Riprese foto e video durante le attività e loro pubblicazione",
    data: "Immagine, voce, contenuti audiovisivi",
    basis: "Consenso separato e facoltativo (art. 6.1.a GDPR), art. 96 e 97 L. 633/1941, art. 10 c.c.",
  },
  {
    purpose: "Trattamento dei dati di minori per la partecipazione alle attività",
    data: "Dati del minore, dati del genitore o tutore, autorizzazione firmata",
    basis: "Art. 6.1.b e art. 8 GDPR; art. 2-quinquies D.Lgs. 196/2003; responsabilità genitoriale (artt. 316 e 320 c.c.)",
  },
  {
    purpose: "Accertamento, esercizio o difesa di un diritto in sede giudiziaria",
    data: "Dati pertinenti alla controversia",
    basis: "Legittimo interesse (art. 6.1.f GDPR) e art. 6.1.c per gli obblighi di legge",
  },
  {
    purpose: "Trasparenza e adempimenti dell'ente del terzo settore",
    data: "Dati presenti in bilanci, statuto e documenti pubblici",
    basis: "Art. 6.1.c GDPR e artt. 13 e 14 del D.Lgs. 117/2017",
  },
];

const retention = [
  ["Richieste di iscrizione non accolte o ritirate", "Fino a 12 mesi dalla chiusura dell'attività"],
  ["Iscrizioni accolte, autorizzazioni e deleghe al ritiro", "Per la durata dell'attività e per il tempo necessario agli obblighi amministrativi e assicurativi applicabili (di regola 5 anni per la documentazione contabile)"],
  ["Prenotazioni e relativi contatti", "12 mesi dall'appuntamento, salvo obblighi di legge"],
  ["Recensioni pubblicate", "Fino alla revoca del consenso o alla richiesta di rimozione, e comunque non oltre 5 anni dalla pubblicazione"],
  ["Iscritti alla newsletter", "Fino alla revoca del consenso; in assenza di interazioni, cancellazione dopo 24 mesi"],
  ["Hash dell'IP per la prova del consenso newsletter", "Fino alla cancellazione dell'iscrizione: l'IP non è conservato in chiaro"],
  ["Log tecnici di hosting e sicurezza", "Secondo i tempi del fornitore (da poche ore a 7 giorni), salvo necessità di indagine"],
  ["Errori tecnici applicativi (monitoraggio)", "Secondo il piano del fornitore (30 giorni), senza cookie né contenuti dei moduli"],
  ["Hash dell'IP per i limiti anti-abuso", "Finestra di 1 ora, poi cancellato"],
  ["Account dello staff", "Fino alla revoca dell'autorizzazione e per i 30 giorni successivi"],
  ["Documenti contabili e ricevute", "10 anni (art. 2220 c.c. e norme fiscali)"],
];

export default function PrivacyPage() {
  return (
    <main className="public-page">
      <PublicPageIntro
        number="INFO"
        eyebrow="Privacy"
        title={
          <>
            I tuoi dati.
            <br />
            <span>Con chiarezza.</span>
          </>
        }
        description="Informativa sul trattamento dei dati personali ai sensi degli articoli 13 e 14 del Regolamento (UE) 2016/679."
      />
      <div className="content-width legal-sections">
        <section className="legal-section" id="sintesi">
          <span className="eyebrow">Versione {LEGAL_ENTITY.privacyVersion} · aggiornata il {LEGAL_ENTITY.privacyUpdated}</span>
          <h2>Prima di tutto, in breve</h2>
          <p>
            Trattiamo i dati che ci fornisci per gestire la newsletter, le recensioni, le
            prenotazioni e le iscrizioni alle attività della Factory. Non vendiamo dati, non
            facciamo profilazione pubblicitaria e non usiamo strumenti di analisi statistica dei
            visitatori. Usiamo solo un servizio di monitoraggio degli errori tecnici, configurato
            per non raccogliere cookie né il contenuto dei moduli e per non associare gli eventi
            a una persona. Per foto e video
            chiediamo un consenso separato che puoi rifiutare senza
            perdere il posto. Puoi chiedere accesso, correzione, cancellazione e revoca in
            qualsiasi momento scrivendo a <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>.
          </p>
          <p lang="en">
            <strong>English summary.</strong> We process the data you send us to run our
            newsletter, reviews, bookings and workshop registrations. We do not sell data, we
            do not run advertising profiling and we do not use third-party analytics. We only
            use an error-monitoring service configured not to collect cookies or form data and
            not to link events to a person. Photo and video consent is separate and optional. You can exercise your rights at any
            time by writing to {LEGAL_ENTITY.email}. The Italian version of this notice
            prevails.
          </p>
        </section>

        <section className="legal-section" id="titolare">
          <span className="eyebrow">01</span>
          <h2>Titolare del trattamento e contatti</h2>
          <p>
            Il titolare del trattamento è <strong>{LEGAL_ENTITY.name}</strong>,{" "}
            {LEGAL_ENTITY.legalForm.toLowerCase()}, con sede in {legalAddress()}.
          </p>
          <ul>
            <li>Email per privacy e diritti: <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a></li>
            {LEGAL_ENTITY.pec ? <li>PEC: {LEGAL_ENTITY.pec}</li> : null}
            {LEGAL_ENTITY.taxCode || LEGAL_ENTITY.vat ? (
              <li>
                {LEGAL_ENTITY.taxCode ? <>Codice fiscale: {LEGAL_ENTITY.taxCode}</> : null}
                {LEGAL_ENTITY.taxCode && LEGAL_ENTITY.vat ? " · " : null}
                {LEGAL_ENTITY.vat ? <>Partita IVA: {LEGAL_ENTITY.vat}</> : null}
              </li>
            ) : null}
            {LEGAL_ENTITY.runts ? <li>Numero di iscrizione al RUNTS: {LEGAL_ENTITY.runts}</li> : null}
            {LEGAL_ENTITY.legalRep ? <li>Legale rappresentante: {LEGAL_ENTITY.legalRep}</li> : null}
          </ul>
          <p>
            Non è stato nominato un Responsabile della protezione dei dati (DPO), perché non
            ricorrono i presupposti dell&rsquo;art. 37 GDPR: le attività non sono svolte da
            un&rsquo;autorità pubblica, non consistono in un monitoraggio regolare e sistematico
            su larga scala e non riguardano categorie particolari di dati in misura rilevante.
            Le richieste relative ai dati personali sono gestite direttamente dal titolare,
            anche tramite i volontari e lo staff autorizzati.
          </p>
        </section>

        <section className="legal-section" id="dati">
          <span className="eyebrow">02</span>
          <h2>Quali dati trattiamo, per quale servizio</h2>
          <ul>
            <li>
              <strong>Navigazione del sito.</strong> Il fornitore di hosting registra dati
              tecnici (indirizzo IP, data e ora, pagina richiesta, user agent) per erogare il
              servizio e contrastare abusi. Non utilizziamo Google Analytics, pixel pubblicitari
              o altri strumenti di tracciamento. Se si verifica un errore tecnico, il messaggio
              di errore viene inviato a un servizio di monitoraggio senza cookie, senza il
              contenuto dei moduli e senza associarlo a una persona. La mappa di Google e i video
              YouTube vengono
              caricati solo dopo un tuo clic.
            </li>
            <li>
              <strong>Newsletter.</strong> Nome o nickname, indirizzo email, numero di telefono
              se lo fornisci, data e ora del consenso e versione dell&rsquo;informativa
              accettata, oltre a un hash crittografico dell&rsquo;IP usato per limitare gli
              invii automatici. L&rsquo;IP non viene conservato in chiaro.
            </li>
            <li>
              <strong>Recensioni.</strong> Nome o nickname da pubblicare, email di contatto,
              valutazione e testo. L&rsquo;email non viene pubblicata.
            </li>
            <li>
              <strong>Prenotazioni.</strong> Nome, email, telefono, numero di persone, eventuali
              note e codice di prenotazione.
            </li>
            <li>
              <strong>Iscrizioni alle attività.</strong> Dati anagrafici del partecipante, data
              di nascita, risposte alle domande del modulo, dati del genitore o tutore quando il
              partecipante è minorenne, eventuale delega al ritiro, autorizzazione firmata
              caricata in PDF, JPG o PNG e scelta facoltativa su foto e video. Il sistema non
              richiede documenti di identità né il genere.
            </li>
            <li>
              <strong>Area staff.</strong> Indirizzo email, credenziali gestite dal fornitore di
              autenticazione, sessioni e ruolo assegnato. L&rsquo;accesso ai dati è consentito
              solo alle persone presenti nell&rsquo;elenco autorizzato.
            </li>
            <li>
              <strong>Calendario e archivio locale.</strong> Se lo staff attiva il collegamento
              con Google Calendar, trattiamo gli eventi e i token di autorizzazione, cifrati a
              riposo. Le foto e i video dell&rsquo;archivio restano sul disco locale della sede:
              nei sistemi online sono conservati solo i metadati necessari a ritrovarli.
            </li>
          </ul>
          <p>
            <strong>Categorie particolari di dati.</strong> Non raccogliamo per impostazione
            predefinita dati sanitari, biometrici, religiosi, politici o sindacali. Ti chiediamo
            di non inserire informazioni di questo tipo nei campi liberi: se un&rsquo;attività
            richiede necessariamente un&rsquo;informazione sanitaria (per esempio un&rsquo;allergia
            rilevante), la raccogliamo solo con consenso esplicito ai sensi dell&rsquo;art. 9.2.a
            GDPR e la trattiamo per la sola finalità di sicurezza della persona. Non adottiamo
            processi decisionali automatizzati né profilazione ai sensi dell&rsquo;art. 22 GDPR.
          </p>
        </section>

        <section className="legal-section" id="finalita">
          <span className="eyebrow">03</span>
          <h2>Finalità e basi giuridiche</h2>
          <div className="legal-table-wrap">
            <table className="legal-table">
              <thead>
                <tr>
                  <th scope="col">Finalità</th>
                  <th scope="col">Dati</th>
                  <th scope="col">Base giuridica</th>
                </tr>
              </thead>
              <tbody>
                {purposes.map((row) => (
                  <tr key={row.purpose}>
                    <td>{row.purpose}</td>
                    <td>{row.data}</td>
                    <td>{row.basis}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="legal-section" id="conferimento">
          <span className="eyebrow">04</span>
          <h2>Conferimento dei dati: cosa è obbligatorio</h2>
          <p>
            I campi contrassegnati come obbligatori sono necessari per gestire la richiesta:
            senza di essi non possiamo iscriverti, prenotare o risponderti. Il conferimento di
            telefono, note e risposte facoltative è sempre libero. Il consenso a foto e video è
            separato e facoltativo: rifiutarlo non pregiudica la partecipazione all&rsquo;attività.
            Puoi revocare in ogni momento i consensi facoltativi senza che questo pregiudichi la
            liceità del trattamento già svolto.
          </p>
        </section>

        <section className="legal-section" id="destinatari">
          <span className="eyebrow">05</span>
          <h2>A chi possono essere comunicati i dati</h2>
          <p>
            I dati sono trattati dal personale autorizzato dell&rsquo;associazione e dai fornitori
            tecnici che agiscono come responsabili del trattamento ai sensi dell&rsquo;art. 28
            GDPR, sulla base di un contratto o delle condizioni di servizio che includono gli
            obblighi di protezione dei dati:
          </p>
          <ul>
            <li><strong>Supabase Inc.</strong> — database, autenticazione e archiviazione dei file.</li>
            <li><strong>Vercel Inc.</strong> — hosting dell&rsquo;applicazione, CDN e log tecnici.</li>
            <li>
              <strong>Functional Software, Inc. (Sentry)</strong> — monitoraggio degli errori
              tecnici del sito e dell&rsquo;applicazione. Riceve messaggio di errore, pagina e
              stack trace; la configurazione esclude cookie, intestazioni HTTP, contenuti dei
              moduli e dati identificativi dell&rsquo;utente, e non è usata per analisi statistiche
              o profilazione.
            </li>
            <li><strong>Cloudflare Inc.</strong> — tunnel e controllo degli accessi verso l&rsquo;archivio locale della sede.</li>
            <li><strong>Google Ireland Ltd / Google LLC</strong> — calendario, se attivato dallo staff, e mappe caricate solo su tua richiesta.</li>
            <li><strong>Groq Inc.</strong> — modello linguistico usato esclusivamente per riformulare testi redazionali scritti dallo staff. Non inviamo a questo fornitore dati di iscritti, partecipanti o recensioni inserite dal pubblico.</li>
          </ul>
          <p>
            I dati possono inoltre essere comunicati al consulente contabile e fiscale, alla
            compagnia assicurativa, al medico o ai servizi di emergenza in caso di necessità
            durante un&rsquo;attività, e alle autorità pubbliche quando la legge lo impone. Non
            vendiamo dati personali e non li cediamo a terzi per finalità di marketing.
          </p>
        </section>

        <section className="legal-section" id="trasferimenti">
          <span className="eyebrow">06</span>
          <h2>Trasferimenti fuori dallo Spazio economico europeo</h2>
          <p>
            Alcuni fornitori hanno sede negli Stati Uniti. Il trasferimento avviene sulla base
            della decisione di adeguatezza della Commissione europea relativa al quadro
            EU-US Data Privacy Framework (decisione di esecuzione (UE) 2023/1795), quando il
            fornitore è certificato per i dati trattati, e in ogni caso sulla base delle clausole
            contrattuali standard approvate dalla Commissione con decisione (UE) 2021/914,
            integrate da una valutazione d&rsquo;impatto del trasferimento. Le clausole e
            l&rsquo;elenco aggiornato dei fornitori sono disponibili su richiesta scrivendo al
            titolare. Se il quadro di adeguatezza dovesse essere modificato o annullato,
            aggiorneremo le garanzie e questa informativa.
          </p>
        </section>

        <section className="legal-section" id="conservazione">
          <span className="eyebrow">07</span>
          <h2>Per quanto tempo conserviamo i dati</h2>
          <p>
            Applichiamo il principio di minimizzazione e conserviamo i dati solo per il tempo
            necessario alla finalità. I termini indicati sono il criterio ordinario: se una
            legge impone un termine diverso, prevale quello di legge.
          </p>
          <div className="legal-table-wrap">
            <table className="legal-table">
              <thead>
                <tr>
                  <th scope="col">Categoria</th>
                  <th scope="col">Conservazione</th>
                </tr>
              </thead>
              <tbody>
                {retention.map(([label, term]) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td>{term}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Alla scadenza i dati sono cancellati o resi anonimi in modo irreversibile. Le
            richieste di cancellazione sono evase nei limiti degli obblighi di conservazione
            previsti dalla legge, per esempio per documenti contabili o per la tutela di diritti
            in sede giudiziaria.
          </p>
        </section>

        <section className="legal-section" id="diritti">
          <span className="eyebrow">08</span>
          <h2>I tuoi diritti</h2>
          <p>
            Puoi esercitare in qualsiasi momento i diritti previsti dagli articoli 15-22 GDPR:
          </p>
          <ul>
            <li>accesso ai dati e alle informazioni sul trattamento;</li>
            <li>rettifica dei dati inesatti e integrazione di quelli incompleti;</li>
            <li>cancellazione dei dati, nei casi previsti dall&rsquo;art. 17;</li>
            <li>limitazione del trattamento, nei casi previsti dall&rsquo;art. 18;</li>
            <li>portabilità dei dati forniti, quando il trattamento è automatizzato e basato su consenso o contratto;</li>
            <li>opposizione al trattamento basato sul legittimo interesse;</li>
            <li>revoca del consenso in qualsiasi momento, senza pregiudicare la liceità del trattamento precedente.</li>
          </ul>
          <p>
            Scrivi a <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a> indicando la
            richiesta e un recapito per la risposta. Rispondiamo entro un mese, prorogabile di
            due mesi in caso di richieste complesse, dandone motivazione. La richiesta è gratuita,
            salvo casi di manifesta infondatezza o eccessività ai sensi dell&rsquo;art. 12.5 GDPR.
            Per tutelare i dati di altre persone possiamo chiederti un elemento di verifica
            dell&rsquo;identità, senza raccogliere più dati del necessario.
          </p>
          <p>
            Se ritieni che il trattamento violi la normativa puoi proporre reclamo al{" "}
            <strong>Garante per la protezione dei dati personali</strong>, Piazza Venezia 11,
            00187 Roma — sito <a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer">garanteprivacy.it</a>,
            PEC protocollo@gpdp.it — oppure ricorrere all&rsquo;autorità giudiziaria. Prima di
            rivolgersi al Garante puoi scriverci: molte questioni si risolvono direttamente.
          </p>
        </section>

        <section className="legal-section" id="minori">
          <span className="eyebrow">09</span>
          <h2>Minori</h2>
          <p>
            Le attività della Factory sono aperte anche a ragazze e ragazzi. Per l&rsquo;iscrizione
            di una persona di età inferiore a 18 anni chiediamo i dati del genitore o di chi
            esercita la responsabilità genitoriale, un&rsquo;autorizzazione firmata e,
            facoltativamente, una delega al ritiro. Il consenso per foto e video del minore deve
            essere confermato nell&rsquo;autorizzazione firmata.
          </p>
          <p>
            Il consenso al trattamento dei dati raccolti direttamente dal minore tramite i
            servizi della società dell&rsquo;informazione è valido a partire dai 14 anni (art. 8
            GDPR e art. 2-quinquies del D.Lgs. 196/2003). Sotto i 14 anni il trattamento è
            consentito solo con il consenso di chi esercita la responsabilità genitoriale. La
            soglia dei 18 anni serve invece a distinguere la richiesta di partecipazione
            presentata dall&rsquo;adulto da quella presentata dal genitore o tutore: non è una
            soglia di consenso digitale.
          </p>
          <p>
            Non inviamo comunicazioni di marketing diretto a minori di 18 anni e non pubblichiamo
            immagini che consentano di identificare un minore insieme a informazioni personali,
            salvo consenso specifico del genitore o tutore. Se veniamo a conoscenza di un
            trattamento di dati di minori non conforme, cancelliamo i dati e, se necessario,
            informiamo l&rsquo;autorità.
          </p>
        </section>

        <section className="legal-section" id="recensioni">
          <span className="eyebrow">10</span>
          <h2>Recensioni e contenuti pubblicati</h2>
          <p>
            Le recensioni sono pubblicate con il nome o il nickname indicato nel modulo. Puoi
            scegliere una dicitura neutra come &ldquo;Anonimo&rdquo;. Pubblichiamo i contenuti
            pertinenti all&rsquo;esperienza e rimuoviamo quelli offensivi, diffamatori, che
            contengono dati di terzi o informazioni personali non necessarie. Se hai pubblicato
            una recensione e vuoi rimuoverla, scrivi al titolare: la cancellazione avviene nei
            tempi tecnici necessari, salvo obblighi di conservazione. La rimozione non elimina
            eventuali copie indicizzate dai motori di ricerca, per le quali puoi agire
            direttamente presso il gestore del motore.
          </p>
        </section>

        <section className="legal-section" id="cookie">
          <span className="eyebrow">11</span>
          <h2>Cookie e tecnologie simili</h2>
          <p>
            Il sito usa solo cookie tecnici necessari all&rsquo;autenticazione dello staff e una
            memoria locale per limitare gli invii ripetuti. Non ci sono cookie di profilazione né
            strumenti di analisi di terze parti. Il dettaglio, con la durata e le modalità di
            gestione, è nella <Link href="/cookie">cookie policy</Link>.
          </p>
        </section>

        <section className="legal-section" id="sicurezza">
          <span className="eyebrow">12</span>
          <h2>Sicurezza e violazioni dei dati</h2>
          <p>
            Adottiamo misure tecniche e organizzative ai sensi dell&rsquo;art. 32 GDPR: connessione
            cifrata, accesso ai dati riservato a un elenco di persone autorizzate verificato a
            ogni richiesta, ruoli distinti per staff e amministrazione, archivi privati con link
            firmati a scadenza, chiavi di servizio mantenute solo sul server, validazione e
            limiti di dimensione sugli invii, registro degli accessi dell&rsquo;archivio documenti.
          </p>
          <p>
            In caso di violazione dei dati personali valutiamo il rischio e, quando ricorrono i
            presupposti degli articoli 33 e 34 GDPR, notifichiamo il Garante entro 72 ore
dal momento in cui ne veniamo a conoscenza e informiamo gli interessati se il rischio è
            elevato. Conserviamo comunque una documentazione interna di tutte le violazioni.
            Per segnalare un problema di sicurezza scrivi a{" "}
            <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>.
          </p>
        </section>

        <section className="legal-section" id="modifiche">
          <span className="eyebrow">13</span>
          <h2>Modifiche a questa informativa</h2>
          <p>
            Aggiorniamo l&rsquo;informativa quando cambiano i trattamenti, i fornitori o la
            normativa. La versione vigente è sempre pubblicata su questa pagina, con data e
            numero di versione. Le modifiche sostanziali sono comunicate agli iscritti alla
            newsletter via email quando il consenso lo consente. Le versioni precedenti sono
            disponibili su richiesta.
          </p>
        </section>

        <section className="legal-section" id="riferimenti">
          <span className="eyebrow">14</span>
          <h2>Riferimenti normativi</h2>
          <ul>
            <li>Regolamento (UE) 2016/679 (GDPR), in particolare artt. 5, 6, 8, 12-22, 28, 30-34.</li>
            <li>D.Lgs. 30 giugno 2003, n. 196 (Codice in materia di protezione dei dati personali), come modificato dal D.Lgs. 101/2018, artt. 2-quinquies, 122 e 130.</li>
            <li>Direttiva 2002/58/CE (ePrivacy) e linee guida del Garante su cookie e altri identificatori (provvedimento n. 231 del 10 giugno 2021).</li>
            <li>D.Lgs. 9 aprile 2003, n. 70, art. 7 (informazioni sul prestatore di servizi).</li>
            <li>D.Lgs. 6 settembre 2005, n. 206 (Codice del consumo), artt. 49-59 e 66-bis.</li>
            <li>D.Lgs. 3 luglio 2017, n. 117 (Codice del Terzo settore), artt. 13 e 14.</li>
            <li>Legge 22 aprile 1941, n. 633, artt. 96 e 97, e art. 10 del codice civile (immagine).</li>
            <li>Regolamento (UE) 2024/1689 (intelligenza artificiale), art. 50, per i contenuti generati con supporto di sistemi di IA.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
