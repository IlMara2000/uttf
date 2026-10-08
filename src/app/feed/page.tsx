"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, X, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Dialog } from "radix-ui";
import PublicPageIntro from "@/components/PublicPageIntro";
import ReviewsSection from "@/components/ReviewsSection";

const instagramPosts = [
  {
    id: "ig1",
    img: "/instagram/post2.jpeg",
    url: "https://www.instagram.com/reel/DWjhrlIDCqL/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    ratio: "portrait",
    caption: (
      <>
        <span className="font-bold mr-2">uttf_factory</span>
        RAP F*CKTORY nasce per chi il rap lo vive, anche quando non sa ancora da
        dove partire.
        <br />
        <br />
        Non è un laboratorio. È uno spazio dove incontrarsi, scrivere, provare.
        <br />
        <br />
        Barrio’s Live – Milano
        <br />
        12/01 | 18–20 | Gratis
        <br />
        <br />
        Passa, ascolta, fai due barre.
        <br />
        <br />
        #RapMilano #HipHopMilano #BarriosLive #RapUnderground #RapItaliano
      </>
    ),
  },
  {
    id: "ig2",
    img: "/instagram/post1.jpeg",
    url: "https://www.instagram.com/reel/DSNFiv_jWYe/",
    ratio: "portrait",
    caption: (
      <>
        <span className="font-bold mr-2">uttf_factory</span>
        Rozzano, Piazza Foglia.
        <br />
        <br />
        Oggi la Factory è scesa in strada per la Festa delle Associazioni.
        Energia pura, connessioni urbane e la prova che la cultura nasce dal
        cemento della nostra città.
        <br />
        <br />
        #UTTF #Rozzano #UrbanCulture #StreetUnit #Community
      </>
    ),
  },
  {
    id: "ig4",
    img: "/instagram/post4.jpeg",
    url: "https://www.instagram.com/reel/DLnEnkMsQpe/",
    ratio: "portrait",
    caption: (
      <>
        <span className="font-bold mr-2">uttf_factory</span>
        Official Video NO LIMIT JAM 2025
        <br />
        <br />
        Un evento organizzato da @comunebuccinasco in collaborazione con
        @werunthestreetsmilano e molti altri.
        <br />
        <br />
        Check full video on YouTube: https://youtu.be/pnL4b4Xhaxg
        <br />
        <br />
        #nolimitjam #buccinasco #werunthestreets #graffiti #musica #trap #milano
      </>
    ),
  },
];

export default function FeedPage() {
  const [isNewsletterOpen, setIsNewsletterOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [subscriberName, setSubscriberName] = useState("");
  const [subscriberEmail, setSubscriberEmail] = useState("");
  const [subscriberPhone, setSubscriberPhone] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const newsletterTrigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const frame = requestAnimationFrame(() => {
      if (params.get("newsletter") === "open") {
        setIsNewsletterOpen(true);
        params.delete("newsletter");
        const query = params.toString();
        window.history.replaceState(
          null,
          "",
          window.location.pathname +
            (query ? `?${query}` : "") +
            window.location.hash,
        );
      }
    });
    return () => {
      cancelAnimationFrame(frame);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const closeNewsletterModal = () => {
    setIsNewsletterOpen(false);
    setIsSubmitting(false);
    setIsSuccess(false);
    setSubmitError(null);
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
  };

  const handleNewsletterSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (!privacyAccepted) {
      setSubmitError("Accetta l’informativa privacy per iscriverti.");
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: subscriberName,
          email: subscriberEmail,
          phone: subscriberPhone,
          privacyAccepted,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok)
        throw new Error(
          data.error ||
            "Salvataggio non riuscito. Riprova tra qualche istante.",
        );
      setIsSuccess(true);
      setSubscriberName("");
      setSubscriberEmail("");
      setSubscriberPhone("");
      setPrivacyAccepted(false);
      closeTimeoutRef.current = setTimeout(closeNewsletterModal, 3000);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Iscrizione non riuscita. Riprova tra qualche istante.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="public-page">
      <PublicPageIntro
        number="04"
        eyebrow="Il diario"
        title={
          <>
            La Factory.
            <br />
            <span>Giorno per giorno.</span>
          </>
        }
        description="Le storie, le voci e gli incontri della nostra comunità. Segui quello che succede dentro e fuori i laboratori e resta in contatto con l’associazione."
      />
      <div className="content-width">
        <section className="diary-actions" aria-label="Esplora e partecipa">
          <Link href="/stream">
            <span className="diary-action-index">01</span>
            <span>Video e live</span>
            <ArrowUpRight size={19} />
          </Link>
          <button
            ref={newsletterTrigger}
            onClick={() => setIsNewsletterOpen(true)}
          >
            <span className="diary-action-index">02</span>
            <span>Ricevi aggiornamenti</span>
            <ArrowUpRight size={19} />
          </button>
          <Link href="/feed/recensioni">
            <span className="diary-action-index">03</span>
            <span>Racconta la tua esperienza</span>
            <ArrowUpRight size={19} />
          </Link>
        </section>
        <section className="instagram-section">
          <div className="section-heading">
            <h2>
              Momenti da
              <br />
              condividere.
            </h2>
            <a
              className="text-link"
              href="https://www.instagram.com/under_the_tower_factory"
              target="_blank"
              rel="noopener noreferrer"
            >
              Seguici su Instagram <ArrowUpRight size={17} />
            </a>
          </div>
          <div className="people-grid">
            {instagramPosts.map((ig, index) => (
              <a
                href={ig.url}
                target="_blank"
                rel="noopener noreferrer"
                className="person-card instagram-card"
                key={ig.id}
              >
                <div className="instagram-card-header">
                  <Image
                    src="/icons/favicon.svg"
                    alt=""
                    width={28}
                    height={28}
                  />
                  <span>under_the_tower_factory</span>
                  <ArrowUpRight size={17} />
                </div>
                <div className="instagram-photo">
                  <Image
                    src={ig.img}
                    alt={
                      [
                        "Rap F*cktory: incontri e musica",
                        "La Factory alla Festa delle Associazioni di Rozzano",
                        "No Limit Jam 2025",
                      ][index]
                    }
                    fill
                    sizes="(min-width: 1100px) 33vw, (min-width: 520px) 50vw, 100vw"
                  />
                </div>
                <div className="instagram-caption">{ig.caption}</div>
                <span className="instagram-read">
                  Continua su Instagram <ArrowUpRight size={16} />
                </span>
              </a>
            ))}
          </div>
        </section>
        <div className="reviews-area">
          <ReviewsSection />
        </div>
      </div>
      <Dialog.Root
        open={isNewsletterOpen}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) closeNewsletterModal();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="editorial-modal-overlay" />
          <Dialog.Content
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              newsletterTrigger.current?.focus();
            }}
            className="editorial-modal newsletter-modal"
            onEscapeKeyDown={(event) => {
              if (isSubmitting) event.preventDefault();
            }}
            onPointerDownOutside={(event) => {
              if (isSubmitting) event.preventDefault();
            }}
          >
            <Dialog.Close
              className="modal-close"
              disabled={isSubmitting}
              aria-label="Chiudi iscrizione newsletter"
            >
              <X size={22} />
            </Dialog.Close>
            {isSuccess ? (
              <div className="newsletter-success">
                <span className="eyebrow">Iscrizione confermata</span>
                <Dialog.Title>Ci sei anche tu.</Dialog.Title>
                <Dialog.Description>
                  Abbiamo salvato il tuo contatto. Ti scriveremo quando ci
                  saranno novità, incontri o eventi.
                </Dialog.Description>
              </div>
            ) : (
              <>
                <Dialog.Title>Restiamo in contatto.</Dialog.Title>
                <Dialog.Description>
                  Le novità della Factory, i laboratori e i prossimi incontri.
                  Direttamente nella tua casella di posta.
                </Dialog.Description>
                <form
                  onSubmit={handleNewsletterSubmit}
                  className="editorial-form"
                >
                  <label htmlFor="newsletter-name">Il tuo nome</label>
                  <input
                    id="newsletter-name"
                    name="name"
                    autoComplete="name"
                    required
                    disabled={isSubmitting}
                    value={subscriberName}
                    onChange={(e) => setSubscriberName(e.target.value)}
                    placeholder="Nome o nickname"
                  />
                  <label htmlFor="newsletter-email">Indirizzo email</label>
                  <input
                    id="newsletter-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    disabled={isSubmitting}
                    value={subscriberEmail}
                    onChange={(e) => setSubscriberEmail(e.target.value)}
                    placeholder="nome@esempio.it"
                  />
                  <label htmlFor="newsletter-phone">
                    Cellulare (facoltativo)
                  </label>
                  <input
                    id="newsletter-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    disabled={isSubmitting}
                    value={subscriberPhone}
                    onChange={(e) => setSubscriberPhone(e.target.value)}
                    placeholder="+39"
                  />
                  <label className="consent-label">
                    <input
                      type="checkbox"
                      name="privacy-consent"
                      required
                      disabled={isSubmitting}
                      checked={privacyAccepted}
                      onChange={(e) => setPrivacyAccepted(e.target.checked)}
                    />
                    <span>
                      Ho letto e accetto la{" "}
                      <Link href="/privacy" target="_blank">
                        Privacy / GDPR
                      </Link>
                      .
                    </span>
                  </label>
                  {submitError && <p role="alert">{submitError}</p>}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="clay-button"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin" size={17} /> Invio in
                        corso…
                      </>
                    ) : (
                      <>Iscrivimi alla newsletter</>
                    )}
                  </button>
                </form>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  );
}
