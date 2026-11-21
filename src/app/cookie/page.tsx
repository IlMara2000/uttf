import Link from "next/link";
import PublicPageIntro from "@/components/PublicPageIntro";
import { LEGAL_ENTITY } from "@/lib/legal-entity";

/**
 * Cookie policy — art. 122 del Codice privacy e art. 5(3) della direttiva
 * ePrivacy, secondo le linee guida del Garante (provv. n. 231/2021).
 */

const technical = [
  {
    name: "Cookie di sessione dello staff (prefisso sb-)",
    owner: "Prima parte — Supabase Auth",
    purpose:
      "Mantengono la sessione autenticata dell'area staff, così l'operatore non deve reinserire le credenziali a ogni pagina. Non vengono creati per i visitatori non autenticati.",
    duration: "Durata della sessione e rinnovo del token; chiusura al logout",
  },
  {
    name: "Memoria locale anti-abuso",
    owner: "Prima parte — localStorage del browser",
    purpose:
      "Registra sul dispositivo un breve intervallo dopo un invio o un tentativo di accesso, per impedire invii ripetuti e tentativi automatici. Non identifica la persona e non viene trasmessa ad altri.",
    duration: "Pochi minuti, cancellabile svuotando i dati del sito",
  },
];

export default function CookiePage() {
  return (
    <main className="public-page">
      <PublicPageIntro
        number="INFO"
        eyebrow="Cookie"
        title={
          <>
            Cosa resta
            <br />
            <span>sul tuo dispositivo.</span>
          </>
        }
        description="Cookie policy del sito Under The Tower Factory: solo strumenti tecnici necessari, nessuna profilazione."
      />
      <div className="content-width legal-sections">
        <section className="legal-section">
          <span className="eyebrow">Versione aggiornata il {LEGAL_ENTITY.cookieUpdated}</span>
          <h2>In breve</h2>
          <p>
            Questo sito <strong>non usa cookie di profilazione</strong>, non installa Google
            Analytics, Meta Pixel o altri strumenti pubblicitari e non profila il comportamento
            dei visitatori. Usiamo solo strumenti tecnici necessari al funzionamento e alla
            sicurezza del servizio. Per questo non trovi un banner di consenso: la normativa
            italiana ed europea non lo richiede quando non ci sono cookie o identificatori non
            necessari.
          </p>
          <p>
            Mappa di Google e video YouTube sono incorporati in modalità &ldquo;clic per
            caricare&rdquo;: finché non premi il pulsante, il contenuto di terze parti non viene
            caricato e nessun cookie di Google o YouTube viene installato. Le immagini di
            Instagram sono semplici link al profilo, non embed.
          </p>
        </section>

        <section className="legal-section">
          <span className="eyebrow">01</span>
          <h2>Quadro normativo</h2>
          <p>
            L&rsquo;art. 122 del D.Lgs. 196/2003, che attua l&rsquo;art. 5(3) della direttiva
            2002/58/CE, richiede il consenso preventivo per l&rsquo;archiviazione di informazioni
            sul dispositivo o l&rsquo;accesso a informazioni già archiviate, salvo che lo strumento
            sia strettamente necessario a erogare un servizio esplicitamente richiesto. Le linee
            guida del Garante (provvedimento n. 231 del 10 giugno 2021) precisano che i cookie
            tecnici e di sicurezza sono esenti da consenso, mentre quelli di profilazione,
            analytics di terze parti e social plugin richiedono un consenso libero, specifico,
            informato e revocabile.
          </p>
        </section>

        <section className="legal-section">
          <span className="eyebrow">02</span>
          <h2>Strumenti tecnici utilizzati</h2>
          <div className="legal-table-wrap">
            <table className="legal-table">
              <thead>
                <tr>
                  <th scope="col">Strumento</th>
                  <th scope="col">Titolare</th>
                  <th scope="col">Finalità</th>
                  <th scope="col">Durata</th>
                </tr>
              </thead>
              <tbody>
                {technical.map((item) => (
                  <tr key={item.name}>
                    <td>{item.name}</td>
                    <td>{item.owner}</td>
                    <td>{item.purpose}</td>
                    <td>{item.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Non utilizziamo cookie &ldquo;di terza parte&rdquo; permanenti. Il fornitore di
            hosting può registrare log tecnici contenenti l&rsquo;indirizzo IP per finalità di
            sicurezza e diagnostica: non sono cookie e sono conservati per il tempo strettamente
            necessario, come descritto nell&rsquo;<Link href="/privacy">informativa privacy</Link>.
          </p>
        </section>

        <section className="legal-section">
          <span className="eyebrow">03</span>
          <h2>Contenuti di terze parti caricati solo con un tuo clic</h2>
          <ul>
            <li>
              <strong>Google Maps.</strong> La mappa della sede è mostrata come anteprima con un
              pulsante. Se scegli di caricarla, Google Ireland Ltd può ricevere il tuo indirizzo
              IP e installare cookie tecnici e di misurazione secondo la propria informativa. In
              alternativa puoi aprire le indicazioni direttamente nell&rsquo;app Mappe del tuo
              dispositivo.
            </li>
            <li>
              <strong>YouTube.</strong> I video della sezione &ldquo;Video e live&rdquo; sono
              mostrati come copertina: il player di YouTube viene caricato solo dopo il clic e in
              quel momento si applicano le condizioni e i cookie di Google Ireland Ltd.
            </li>
          </ul>
        </section>

        <section className="legal-section">
          <span className="eyebrow">04</span>
          <h2>Come gestire o eliminare gli strumenti tecnici</h2>
          <p>
            Puoi eliminare cookie e memoria locale dalle impostazioni del browser, sezione
            privacy e sicurezza, alla voce dedicata ai dati dei siti. L&rsquo;eliminazione dei
            cookie di sessione comporta la disconnessione dall&rsquo;area staff.
          </p>
          <ul>
            <li>Chrome: Impostazioni → Privacy e sicurezza → Cookie e altri dati dei siti.</li>
            <li>Safari: Impostazioni → Privacy → Gestisci dati siti web.</li>
            <li>Firefox: Impostazioni → Privacy e sicurezza → Cookie e dati dei siti.</li>
            <li>Edge: Impostazioni → Cookie e autorizzazioni sito.</li>
          </ul>
          <p>
            Il blocco dei cookie tecnici può impedire l&rsquo;accesso all&rsquo;area staff, ma non
            alla parte pubblica del sito.
          </p>
        </section>

        <section className="legal-section">
          <span className="eyebrow">05</span>
          <h2>Modifiche e contatti</h2>
          <p>
            Se in futuro introdurremo strumenti di misurazione o funzionalità che richiedono il
            consenso, aggiorneremo questa pagina e attiveremo un banner con opzioni granulari,
            senza caricare gli strumenti prima del consenso. Per domande su cookie e dati
            personali scrivi a{" "}
            <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
