"use client";
import { type FormEvent, useState } from "react";
import { ArrowUpRight } from "lucide-react";
export default function GalleryProposal() {
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalEmail, setProposalEmail] = useState("");
  const [proposalSubject, setProposalSubject] = useState("");
  const [proposalBody, setProposalBody] = useState("");
  const [proposalStatus, setProposalStatus] = useState<
    "idle" | "opening" | "ready"
  >("idle");

  const proposalHref = `mailto:ass.uttf@gmail.com?subject=${encodeURIComponent(proposalSubject)}&body=${encodeURIComponent(
    `Mail utente: ${proposalEmail}\n\n${proposalBody}`,
  )}`;

  const handleProposalSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProposalStatus("opening");
    window.setTimeout(() => {
      window.location.href = proposalHref;
      setProposalStatus("ready");
    }, 350);
  };

return <div className="content-width">        <section className="association-cta">
          <div>
            <span className="eyebrow">La galleria cresce con te</span>
            <h2>
              Hai un’idea?
              <br />
              Diamole spazio.
            </h2>
            <p>
              Artisti, progetti e contributi dal territorio: raccontaci cosa
              vorresti costruire insieme.
            </p>
          </div>
          <button
            className="clay-button light"
            aria-expanded={showProposalForm}
            aria-controls="proposal-form"
            onClick={() => setShowProposalForm((value) => !value)}
          >
            Proponi un progetto <ArrowUpRight size={18} />
          </button>
        </section>
        {showProposalForm && (
          <form
            id="proposal-form"
            className="editorial-form proposal-form"
            onSubmit={handleProposalSubmit}
          >
            <h2>Raccontaci la tua idea.</h2>
            <p>
              Il modulo prepara un’email da inviare con la tua applicazione di
              posta.
            </p>
            <label htmlFor="proposal-email">La tua email</label>
            <input
              id="proposal-email"
              type="email"
              required
              autoComplete="email"
              value={proposalEmail}
              onChange={(event) => setProposalEmail(event.target.value)}
              placeholder="nome@esempio.it"
            />
            <label htmlFor="proposal-subject">Oggetto</label>
            <input
              id="proposal-subject"
              required
              value={proposalSubject}
              onChange={(event) => setProposalSubject(event.target.value)}
              placeholder="Il nome del tuo progetto"
            />
            <label htmlFor="proposal-body">La tua proposta</label>
            <textarea
              id="proposal-body"
              required
              rows={6}
              value={proposalBody}
              onChange={(event) => setProposalBody(event.target.value)}
              placeholder="Da quale idea partiamo?"
            />
            <button
              type="submit"
              disabled={proposalStatus === "opening"}
              className="clay-button"
            >
              {proposalStatus === "opening"
                ? "Apro la mail…"
                : "Prepara l’email"}{" "}
              <ArrowUpRight size={17} />
            </button>
            {proposalStatus !== "idle" && (
              <p role="status">
                {proposalStatus === "opening" ? (
                  "Sto aprendo la tua applicazione di posta."
                ) : (
                  <>
                    Email preparata. Se l’applicazione non si è aperta,{" "}
                    <a href={proposalHref}>
                      apri l’email qui <ArrowUpRight size={15} />
                    </a>
                    .
                  </>
                )}
              </p>
            )}
          </form>
        )}
</div>;
}
