import Link from "next/link";
import PublicPageIntro from "@/components/PublicPageIntro";
import { LEGAL_ENTITY, legalAddress } from "@/lib/legal-entity";

/**
 * Termini e condizioni d'uso del sito e dei servizi dell'associazione.
 * Informazioni sul prestatore: art. 7 D.Lgs. 70/2003.
 * Rapporti con i consumatori: D.Lgs. 206/2005 (Codice del consumo).
 */

const providerDetails = [
  LEGAL_ENTITY.taxCode ? `Codice fiscale: ${LEGAL_ENTITY.taxCode}` : null,
  LEGAL_ENTITY.vat ? `Partita IVA: ${LEGAL_ENTITY.vat}` : null,
  LEGAL_ENTITY.pec ? `PEC: ${LEGAL_ENTITY.pec}` : null,
  LEGAL_ENTITY.runts ? `Iscrizione RUNTS: ${LEGAL_ENTITY.runts}` : null,
  LEGAL_ENTITY.legalRep ? `Legale rappresentante: ${LEGAL_ENTITY.legalRep}` : null,
].filter((detail): detail is string => detail !== null);

const articles = [
  {
    id: "prestatore",
    code: "01",
    title: "Chi siamo e informazioni sul prestatore",
    body: (
      <>
        <p>
          Il sito {LEGAL_ENTITY.siteUrl} e i servizi collegati sono gestiti da{" "}
          <strong>{LEGAL_ENTITY.name}</strong>, {LEGAL_ENTITY.legalForm.toLowerCase()}, con sede
          in {legalAddress()}, email <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>.
        </p>
        {providerDetails.length > 0 ? (
          <ul>
            {providerDetails.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        ) : null}
        <p>
          Le informazioni sono fornite anche ai sensi dell&rsquo;art. 7 del D.Lgs. 9 aprile 2003,
          n. 70. L&rsquo;associazione non svolge attività commerciale di vendita online: le
          attività con contributo di partecipazione sono descritte di volta in volta nella
          rispettiva scheda.
        </p>
      </>
    ),
  },
  {
    id: "oggetto",
    code: "02",
    title: "Oggetto e ambito di applicazione",
    body: (
      <>
        <p>
          Questi termini regolano l&rsquo;uso del sito, la consultazione dei contenuti, l&rsquo;invio
          di recensioni e richieste, la prenotazione di appuntamenti e l&rsquo;iscrizione alle
          attività culturali e creative organizzate dall&rsquo;associazione. L&rsquo;uso del sito
          implica l&rsquo;accettazione di queste condizioni nella versione pubblicata al momento
          dell&rsquo;uso.
        </p>
        <p>
          Restano fermi i diritti inderogabili riconosciuti ai consumatori dal Codice del consumo
          e dalle altre norme applicabili: nessuna clausola di questi termini può limitarli.
        </p>
      </>
    ),
  },
  {
    id: "uso",
    code: "03",
    title: "Uso consentito del sito",
    body: (
      <>
        <p>Puoi consultare il sito e usarne le funzioni per finalità personali e informative. Non è consentito:</p>
        <ul>
          <li>accedere a aree riservate senza autorizzazione o condividere credenziali di staff;</li>
          <li>estrarre in modo massivo contenuti o dati (scraping, crawling aggressivo, uso di bot);</li>
          <li>tentare di aggirare i limiti di invio, i controlli di sicurezza o le misure di protezione;</li>
          <li>caricare file malevoli, contenuti illeciti, offensivi o che violino diritti di terzi;</li>
          <li>pubblicare recensioni false, diffamatorie o relative a esperienze non vissute.</li>
        </ul>
        <p>
          In caso di violazione possiamo sospendere l&rsquo;accesso, rimuovere i contenuti e
          rivolgerci all&rsquo;autorità competente, fermo il risarcimento del danno.
        </p>
      </>
    ),
  },
  {
    id: "iscrizioni",
    code: "04",
    title: "Iscrizioni alle attività",
    body: (
      <>
        <p>
          L&rsquo;invio del modulo registra una <strong>richiesta di partecipazione</strong> e non
          conferma automaticamente il posto. La conferma arriva dallo staff dopo la verifica dei
          dati e, per i minori, dell&rsquo;autorizzazione firmata. Le informazioni su programma,
          luogo, materiali e costi sono quelle pubblicate nella scheda dell&rsquo;attività al
          momento dell&rsquo;iscrizione; eventuali modifiche organizzative sono comunicate ai
          recapiti indicati.
        </p>
        <p>
          <strong>Minori.</strong> Per chi ha meno di 18 anni l&rsquo;iscrizione deve essere
          presentata da chi esercita la responsabilità genitoriale, con autorizzazione firmata e
          l&rsquo;eventuale delega al ritiro. Il genitore o tutore risponde delle informazioni
          fornite e si impegna a comunicare tempestivamente condizioni rilevanti per la sicurezza
          del partecipante.
        </p>
        <p>
          <strong>Contributi di partecipazione.</strong> Quando è previsto un contributo, l&rsquo;importo
          e le modalità di pagamento sono indicati nella scheda. Il pagamento non è mai richiesto
          tramite messaggi o link non ufficiali. Su richiesta rilasciamo ricevuta o documentazione
          fiscalmente valida secondo la natura dell&rsquo;attività.
        </p>
        <p>
          <strong>Recesso e rimborsi.</strong> Se l&rsquo;attività è riservata a consumatori e il
          contratto è concluso a distanza, hai diritto di recedere entro 14 giorni senza
          motivazione e senza costi, ai sensi degli artt. 52-55 del Codice del consumo. Il diritto
          di recesso non si applica ai servizi ricreativi, culturali o di svago offerti in una
          data specifica, ai sensi dell&rsquo;art. 59, comma 1, lettera n), del Codice del consumo:
          in questo caso la rinuncia è indicata nella scheda prima dell&rsquo;iscrizione. Se
          annulliamo noi l&rsquo;attività, restituiamo integralmente il contributo versato. Per
          rinunce comunicate prima dell&rsquo;attività possiamo, se indicato nella scheda,
          trattenere i costi già sostenuti e documentabili.
        </p>
      </>
    ),
  },
  {
    id: "prenotazioni",
    code: "05",
    title: "Prenotazioni e appuntamenti",
    body: (
      <p>
        Le prenotazioni sono soggette alla disponibilità degli slot e alla capienza dei locali.
        Il codice ricevuto serve a gestire l&rsquo;appuntamento. In caso di impossibilità a
        partecipare chiediamo di disdire con congruo preavviso, così il posto può essere
        riassegnato. Le prenotazioni ripetutamente disattese possono comportare la limitazione
        dell&rsquo;accesso al servizio di prenotazione.
      </p>
    ),
  },
  {
    id: "recensioni",
    code: "06",
    title: "Recensioni e contenuti inviati dagli utenti",
    body: (
      <>
        <p>
          Inviando una recensione confermi che l&rsquo;esperienza è reale e che il contenuto non
          viola diritti di terzi. Concedi all&rsquo;associazione una licenza non esclusiva,
          gratuita e revocabile per pubblicare il testo, il nome o nickname e la valutazione sul
          sito e sui canali ufficiali, per la sola finalità di documentare le attività.
        </p>
        <p>
          Non pubblichiamo recensioni che contengono dati personali di terzi, accuse non
          verificabili, contenuti offensivi o spam. Possiamo moderare, accorciare per esigenze di
          impaginazione o rimuovere i contenuti, dandone comunicazione quando possibile. Puoi
          chiedere la rimozione in qualsiasi momento scrivendo al titolare.
        </p>
      </>
    ),
  },
  {
    id: "immagini",
    code: "07",
    title: "Foto, video e diritti d'immagine",
    body: (
      <p>
        Durante le attività possono essere realizzate fotografie e video. La pubblicazione avviene
        solo con il consenso separato e facoltativo dell&rsquo;interessato e, per i minori, del
        genitore o tutore. Il consenso riguarda i canali ufficiali indicati nella pagina Contatti
        e non comprende la cessione a terzi per finalità pubblicitarie estranee
        all&rsquo;associazione. Puoi revocare il consenso per gli utilizzi futuri scrivendo a{" "}
        <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>: rimuoveremo i contenuti
        dai canali che gestiamo, nei tempi tecnici necessari.
      </p>
    ),
  },
  {
    id: "proprieta",
    code: "08",
    title: "Proprietà intellettuale",
    body: (
      <>
        <p>
          Il nome, il marchio, il logo, i testi, la grafica e l&rsquo;impianto del sito appartengono
          all&rsquo;associazione o sono utilizzati con autorizzazione. Le opere degli artisti
          restano di proprietà dei rispettivi autori: la loro pubblicazione in galleria non
          trasferisce alcun diritto e non consente riproduzioni commerciali.
        </p>
        <p>
          Puoi condividere i link alle pagine e citare i contenuti indicando la fonte. Ogni altro
          uso, in particolare la riproduzione sistematica o l&rsquo;uso commerciale, richiede
          un&rsquo;autorizzazione scritta.
        </p>
      </>
    ),
  },
  {
    id: "terzi",
    code: "09",
    title: "Link e servizi di terze parti",
    body: (
      <p>
        Il sito contiene link a piattaforme esterne (Instagram, YouTube, Spotify, TikTok, Google
        Maps). Non controlliamo quei servizi e non rispondiamo dei loro contenuti, delle loro
        condizioni o del trattamento dei dati che effettuano: si applicano le rispettive
        informative. Mappa e video sono caricati solo dopo un clic dell&rsquo;utente.
      </p>
    ),
  },
  {
    id: "responsabilita",
    code: "10",
    title: "Disponibilità del servizio e responsabilità",
    body: (
      <>
        <p>
          Ci impegniamo a mantenere il sito disponibile e aggiornato, ma non garantiamo
          l&rsquo;assenza di interruzioni, errori o manutenzioni. Non rispondiamo dei disservizi
          causati da fornitori di connettività, hosting o piattaforme esterne, da forza maggiore
          o da uso improprio del sito.
        </p>
        <p>
          Nei limiti consentiti dall&rsquo;art. 1229 del codice civile, la responsabilità
          dell&rsquo;associazione per danni derivanti dall&rsquo;uso del sito è limitata al danno
          diretto e prevedibile. Restano esclusi i danni indiretti e il lucro cessante. Questa
          limitazione non si applica in caso di dolo o colpa grave, né ai diritti inderogabili
          dei consumatori, e non esclude la responsabilità per danni alla persona o per la
          perdita di oggetti personali affidati al personale, che resta regolata dalla legge e
          dalle condizioni dell&rsquo;attività.
        </p>
        <p>
          Le attività si svolgono in ambienti controllati ma non sono esenti da rischi ordinari
          legati ad attività creative e manuali: i partecipanti e, per i minori, i genitori
          ricevono le indicazioni di sicurezza e sono tenuti a rispettarle.
        </p>
      </>
    ),
  },
  {
    id: "privacy",
    code: "11",
    title: "Dati personali",
    body: (
      <p>
        Il trattamento dei dati personali è descritto nell&rsquo;
        <Link href="/privacy">informativa privacy</Link> e nella{" "}
        <Link href="/cookie">cookie policy</Link>, che formano parte integrante di questi termini.
      </p>
    ),
  },
  {
    id: "accessibilita",
    code: "12",
    title: "Accessibilità",
    body: (
      <p>
        Puntiamo allo standard WCAG 2.2 livello AA. Segnalazioni e richieste di contenuti in
        formato alternativo si inviano tramite la{" "}
        <Link href="/accessibilita">dichiarazione di accessibilità</Link>.
      </p>
    ),
  },
  {
    id: "modifiche",
    code: "13",
    title: "Modifiche dei termini",
    body: (
      <p>
        Possiamo aggiornare questi termini per esigenze organizzative o normative. La versione
        applicabile è quella pubblicata al momento dell&rsquo;uso o dell&rsquo;iscrizione. Le
        modifiche non si applicano retroattivamente alle iscrizioni già perfezionate, salvo
        necessità di legge o migliori condizioni per l&rsquo;utente.
      </p>
    ),
  },
  {
    id: "legge",
    code: "14",
    title: "Legge applicabile, foro e reclami",
    body: (
      <>
        <p>
          Questi termini sono regolati dalla legge italiana. Per le controversie con i consumatori
          è competente il foro del luogo di residenza o domicilio del consumatore, ai sensi
          dell&rsquo;art. 66-bis del Codice del consumo. Negli altri casi è competente il foro di
          Milano, salvo diversa disposizione inderogabile.
        </p>
        <p>
          Prima di agire in giudizio puoi scrivere a{" "}
          <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a> per una soluzione
          amichevole. Per le controversie di consumo è possibile rivolgersi a un organismo di
          mediazione iscritto al registro tenuto dal Ministero della Giustizia e, per le
          controversie transfrontaliere, alla piattaforma europea di risoluzione delle
          controversie online. La mediazione non è obbligatoria per l&rsquo;utente se non nei casi
          previsti dalla legge.
        </p>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <main className="public-page">
      <PublicPageIntro
        number="INFO"
        eyebrow="Termini e condizioni"
        title={
          <>
            Le regole
            <br />
            <span>condivise.</span>
          </>
        }
        description="Condizioni d'uso del sito, delle iscrizioni alle attività e delle prenotazioni di Under The Tower Factory."
      />
      <div className="content-width legal-sections">
        <section className="legal-section">
          <span className="eyebrow">Versione aggiornata il {LEGAL_ENTITY.termsUpdated}</span>
          <h2>Come leggere questi termini</h2>
          <p>
            Queste condizioni valgono per il sito e per le attività dell&rsquo;associazione. Sono
            scritte per essere comprensibili: se qualcosa non è chiaro scrivi a{" "}
            <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a> prima di iscriverti o
            prenotare. Le clausole che limitano diritti del consumatore si applicano solo nei
            limiti consentiti dalla legge.
          </p>
        </section>
        {articles.map((article) => (
          <section className="legal-section" id={article.id} key={article.code}>
            <span className="eyebrow">{article.code}</span>
            <h2>{article.title}</h2>
            {article.body}
          </section>
        ))}
      </div>
    </main>
  );
}
