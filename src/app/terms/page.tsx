import PublicPageIntro from "@/components/PublicPageIntro";

const articles = [
  {
    code: "ART_01",
    title: "PROPRIETÀ_INTELLETTUALE",
    content:
      "Ogni asset generato, compilato o archiviato all'interno dei server UTTF (Under The Tower Factory) appartiene esclusivamente al Core Team. La riproduzione non autorizzata comporta l'espulsione immediata dai sistemi.",
  },
  {
    code: "ART_02",
    title: "PROTOCOLLO_DI_RISERVATEZZA",
    content:
      "L'accesso al Vault e al Planner è riservato al personale autorizzato. La condivisione di credenziali o di link diretti a risorse interne è considerata una violazione critica della sicurezza.",
  },
  {
    code: "ART_03",
    title: "OPERAZIONI_DI_PRODUZIONE",
    content:
      "La Factory opera come entità creativa indipendente. Ogni task assegnato nel Planner deve seguire gli standard qualitativi UTTF prima di essere segnato come COMPLETO.",
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
        description="I termini di utilizzo dei sistemi e gli accordi operativi di Under The Tower Factory."
      />
      <div className="content-width legal-sections">
        {articles.map((article) => (
          <section className="legal-section" key={article.code}>
            <span className="eyebrow">{article.code.replaceAll("_", " ")}</span>
            <h2>{article.title.replaceAll("_", " ")}</h2>
            <p>{article.content}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
