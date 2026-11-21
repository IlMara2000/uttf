import Link from "next/link";
import PublicPageIntro from "@/components/PublicPageIntro";
import { LEGAL_ENTITY } from "@/lib/legal-entity";

/**
 * Dichiarazione di accessibilità.
 * Riferimenti: legge 9 gennaio 2004 n. 4 (legge Stanca), art. 9 del D.Lgs.
 * 82/2022 che attua la direttiva (UE) 2019/882 (European Accessibility Act),
 * linee guida WCAG 2.2 livello AA del W3C.
 */

export default function AccessibilitaPage() {
  return (
    <main className="public-page">
      <PublicPageIntro
        number="INFO"
        eyebrow="Accessibilità"
        title={
          <>
            Un sito
            <br />
            <span>per tutti.</span>
          </>
        }
        description="Dichiarazione di accessibilità del sito Under The Tower Factory: obiettivi, stato di conformità, limitazioni note e canale di segnalazione."
      />
      <div className="content-width legal-sections">
        <section className="legal-section">
          <span className="eyebrow">Aggiornata il {LEGAL_ENTITY.accessibilityUpdated}</span>
          <h2>Il nostro impegno</h2>
          <p>
            {LEGAL_ENTITY.name} vuole che il sito e i moduli di iscrizione siano utilizzabili da
            chiunque, comprese le persone che usano lettori di schermo, tastiera, zoom o
            impostazioni di contrasto elevato. Il nostro riferimento tecnico è lo standard{" "}
            <strong>WCAG 2.2 livello AA</strong>, richiamato dalla legge 9 gennaio 2004, n. 4 e dal
            D.Lgs. 82/2022 che attua la direttiva (UE) 2019/882 sull&rsquo;accessibilità dei
            prodotti e dei servizi.
          </p>
        </section>

        <section className="legal-section">
          <span className="eyebrow">01</span>
          <h2>Stato di conformità</h2>
          <p>
            <strong>Parzialmente conforme ai WCAG 2.2 livello AA.</strong> La struttura del sito,
            la navigazione principale, i testi, i moduli e le pagine informative sono progettati
            per essere accessibili. Restano alcune limitazioni tecniche elencate qui sotto, che
            stiamo correggendo. La conformità non è dichiarata come completa finché le limitazioni
            non saranno rimosse o sostituite da alternative equivalenti.
          </p>
        </section>

        <section className="legal-section">
          <span className="eyebrow">02</span>
          <h2>Misure adottate</h2>
          <ul>
            <li>lingua della pagina dichiarata e struttura dei contenuti con titoli gerarchici;</li>
            <li>link &ldquo;Vai al contenuto&rdquo; per saltare la navigazione da tastiera;</li>
            <li>navigazione completa da tastiera, con indicazione visiva del focus;</li>
            <li>menu mobile apribile e chiudibile con il tasto Esc;</li>
            <li>testi alternativi per le immagini informative e decorativi per le immagini puramente estetiche;</li>
            <li>rispetto dell&rsquo;impostazione di sistema per la riduzione delle animazioni;</li>
            <li>forme e controlli dei moduli con etichette associate e messaggi di errore testuali;</li>
            <li>layout responsivo senza perdita di contenuti con lo zoom al 200%;</li>
            <li>contenuti di terze parti (mappa e video) caricati solo dopo un clic, senza tracciamento automatico.</li>
          </ul>
        </section>

        <section className="legal-section">
          <span className="eyebrow">03</span>
          <h2>Limitazioni note</h2>
          <ul>
            <li>
              <strong>Documenti PDF generati.</strong> Le autorizzazioni prodotte dal sistema non
              sono PDF &ldquo;taggati&rdquo;: possono risultare meno leggibili con un lettore di
              schermo. Su richiesta inviamo il contenuto in testo semplice o in formato accessibile.
            </li>
            <li>
              <strong>Mappa della sede.</strong> La mappa di Google non è controllabile da tastiera
              in tutte le sue funzioni. Indirizzo, indicazioni e link alle app di mappe sono sempre
              disponibili in formato testuale nella pagina Contatti.
            </li>
            <li>
              <strong>Video di terze parti.</strong> I video ospitati su YouTube possono non avere
              sottotitoli o trascrizioni complete: dipendono dalla piattaforma e dai materiali
              originali. Su richiesta forniamo una descrizione testuale del contenuto.
            </li>
            <li>
              <strong>Immagini d&rsquo;archivio.</strong> Alcune fotografie storiche hanno una
              risoluzione o un contrasto limitati e non è possibile ricostruire il testo in esse
              contenuto.
            </li>
          </ul>
        </section>

        <section className="legal-section">
          <span className="eyebrow">04</span>
          <h2>Segnalazioni e richieste</h2>
          <p>
            Se trovi una barriera, un contenuto non leggibile o un modulo che non riesci a
            completare, scrivi a{" "}
            <a href={`mailto:${LEGAL_ENTITY.email}?subject=Accessibilita`}>{LEGAL_ENTITY.email}</a>{" "}
            indicando la pagina, il dispositivo o il programma di supporto che usi e cosa non
            funziona. Rispondiamo entro 30 giorni e, quando possibile, forniamo subito il contenuto
            in un formato alternativo.
          </p>
          <p>
            Se la risposta non ti soddisfa puoi rivolgerti all&rsquo;Autorità per le garanzie nelle
            comunicazioni (AGCOM), che vigila sul rispetto degli obblighi di accessibilità, secondo
            le modalità indicate sul sito dell&rsquo;Autorità.
          </p>
        </section>

        <section className="legal-section">
          <span className="eyebrow">05</span>
          <h2>Contenuti collegati</h2>
          <p>
            Il trattamento dei dati inviati con le segnalazioni è descritto nell&rsquo;
            <Link href="/privacy">informativa privacy</Link>. Le condizioni d&rsquo;uso del sito sono
            nei <Link href="/terms">termini e condizioni</Link>.
          </p>
        </section>
      </div>
    </main>
  );
}
