import { ArrowUpRight } from "lucide-react";
import TeamEditor from "@/components/TeamEditor";
import { loadTeam } from "@/lib/team-server";

export default async function TeamPage() {
  const { members, intro, ready } = await loadTeam();
  return (
    <main className="public-page">
      <TeamEditor initialMembers={members} initialIntro={intro} ready={ready} />
      <div className="content-width">
        <section id="collabora" className="association-cta">
          <div>
            <span className="eyebrow">Facciamo comunità</span>
            <h2>
              C’è posto anche
              <br />
              per il tuo contributo.
            </h2>
            <p>
              Cerchiamo persone con voglia di mettersi in gioco e aiutare gli
              altri a crescere. Porta le tue competenze, il tuo tempo e le tue
              idee nell’associazione.
            </p>
          </div>
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLSerjf1xGTrj08wmLSJhbrqwDV2Czc5Kd6OatIyvdlSwJsRNrw/viewform"
            target="_blank"
            rel="noopener noreferrer"
            className="clay-button light"
          >
            Collabora con noi <ArrowUpRight size={18} />
          </a>
        </section>
      </div>
    </main>
  );
}
