import PublicPageIntro from "@/components/PublicPageIntro";

const privacySections = [
  {
    title: "Titolare del trattamento / Data controller",
    it: "Il titolare del trattamento dei dati raccolti tramite questo sito e i moduli collegati e Under The Tower Factory. Per richieste relative ai dati personali puoi usare i contatti ufficiali dell’associazione.",
    en: "The data controller for the personal data collected through this website and its related forms is Under The Tower Factory. For requests regarding personal data, you can use the association official contact channels.",
  },
  {
    title: "Dati raccolti / Data collected",
    it: "Attraverso la newsletter e le recensioni possiamo raccogliere nome, cognome o nickname, indirizzo email, numero di telefono e ogni testo inserito volontariamente nei campi del modulo.",
    en: "Through the newsletter and review forms, we may collect first name, last name or nickname, email address, phone number, and any text voluntarily entered in the form fields.",
  },
  {
    title: "Finalita / Purposes",
    it: "I dati vengono raccolti per gestire iscrizioni, richieste di contatto, aggiornamenti sulle attivita, gestione delle recensioni e organizzazione delle comunicazioni con il pubblico interessato ai progetti UTTF.",
    en: "The data is collected to manage subscriptions, contact requests, activity updates, review handling, and communication workflows with people interested in UTTF projects.",
  },
  {
    title: "Base giuridica / Legal basis",
    it: "La base giuridica del trattamento e il consenso espresso dall’utente tramite invio del modulo e accettazione della privacy, oltre al legittimo interesse organizzativo per la gestione tecnica del servizio.",
    en: "The legal basis for processing is the user consent expressed through form submission and privacy acceptance, together with the legitimate organizational interest required to technically manage the service.",
  },
  {
    title: "Conservazione / Retention",
    it: "I dati sono conservati per il tempo necessario a gestire il servizio o fino a richiesta di cancellazione, salvo diversi obblighi di legge o esigenze amministrative documentate.",
    en: "Data is retained for the time necessary to manage the service or until a deletion request is received, except where different legal obligations or documented administrative needs apply.",
  },
  {
    title: "Condivisione / Sharing",
    it: "I dati possono essere trattati attraverso fornitori tecnici usati per il funzionamento del sito, dell’hosting e del database. Non vengono venduti a terzi.",
    en: "Data may be processed through technical providers used to operate the website, hosting, and database infrastructure. It is not sold to third parties.",
  },
  {
    title: "Diritti dell’utente / User rights",
    it: "L’utente puo richiedere accesso, rettifica, aggiornamento, cancellazione, limitazione del trattamento o opposizione nei limiti previsti dalla normativa applicabile, incluso il GDPR.",
    en: "Users may request access, correction, update, deletion, restriction of processing, or objection within the limits provided by the applicable law, including the GDPR.",
  },
  {
    title: "Recensioni pubbliche / Public reviews",
    it: "Le recensioni inviate possono essere pubblicate sul sito con il nome indicato nel modulo. Se non desideri essere identificato, puoi usare una dicitura neutra come “Anonimo”.",
    en: "Submitted reviews may be published on the website with the name provided in the form. If you do not wish to be identified, you may use a neutral label such as “Anonymous”.",
  },
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
        description="Informativa bilingue sul trattamento dei dati per newsletter, recensioni e moduli pubblici dell’associazione."
      />
      <div className="content-width legal-sections">
        {privacySections.map((section, index) => (
          <section key={section.title} className="legal-section">
            <span className="eyebrow">0{index + 1}</span>
            <h2>{section.title}</h2>
            <div className="legal-languages">
              <div>
                <span className="eyebrow">Italiano</span>
                <p>{section.it}</p>
              </div>
              <div lang="en">
                <span className="eyebrow">English</span>
                <p>{section.en}</p>
              </div>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
