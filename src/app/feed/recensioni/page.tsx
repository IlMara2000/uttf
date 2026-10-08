"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Loader2 } from "lucide-react";
import PublicPageIntro from "@/components/PublicPageIntro";
import { supabase } from "@/lib/supabase";
import ReviewStars from "@/components/ReviewStars";

export default function ReviewsPage() {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [authorName, setAuthorName] = useState("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNameHint, setShowNameHint] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const normalizedName = authorName.trim();
    const normalizedComment = comment.trim();

    if (!normalizedName) {
      setShowNameHint(true);
      return;
    }

    if (rating === 0) {
      setSubmitError("Seleziona prima un voto.");
      return;
    }

    if (!normalizedComment) {
      setSubmitError("Scrivi un commento prima di inviare.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const { error } = await supabase.from("reviews").insert([
      {
        author_name: normalizedName,
        comment: normalizedComment,
        rating,
      },
    ]);

    if (error) {
      setSubmitError(
        "Non siamo riusciti a salvare la recensione. Riprova tra qualche istante.",
      );
      setIsSubmitting(false);
      return;
    }

    router.push("/feed#recensioni");
  };

  return (
    <main className="public-page">
      <PublicPageIntro
        number="DIARIO"
        eyebrow="La tua esperienza"
        title={
          <>
            La tua voce
            <br />
            <span>conta.</span>
          </>
        }
        description="Hai partecipato a un laboratorio o a un evento? Raccontaci com’è andata. Il tuo parere aiuta la comunità a crescere."
      >
        <Link href="/feed#recensioni" className="text-link">
          Leggi le recensioni <ArrowUpRight size={17} />
        </Link>
      </PublicPageIntro>
      <div className="content-width">
        <form onSubmit={handleSubmit} className="editorial-form review-form">
          <fieldset disabled={isSubmitting}>
            <legend>La tua valutazione</legend>
            <div className="rating-control">
              <ReviewStars
                rating={rating}
                onChange={setRating}
                interactive
                size={40}
              />
              <span aria-live="polite">
                {rating === 0 ? "Scegli un voto da 1 a 5" : `${rating} su 5`}
              </span>
            </div>
          </fieldset>
          <label htmlFor="review-author">Nome o nickname</label>
          <input
            id="review-author"
            disabled={isSubmitting}
            value={authorName}
            onChange={(e) => {
              setAuthorName(e.target.value);
              setShowNameHint(false);
            }}
            placeholder="Il tuo nome, oppure Anonimo"
            aria-invalid={showNameHint}
            aria-describedby={showNameHint ? "name-hint" : undefined}
          />
          {showNameHint && (
            <p id="name-hint" role="alert">
              Scrivi il tuo nome o usa “Anonimo” se preferisci.
            </p>
          )}
          <label htmlFor="review-comment">La tua esperienza</label>
          <textarea
            id="review-comment"
            disabled={isSubmitting}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
            rows={6}
            placeholder="Raccontaci un momento, un’idea, quello che ti è rimasto."
          />
          <p>
            Il nome e la recensione saranno pubblici.{" "}
            <Link href="/privacy">Leggi l’informativa privacy.</Link>
          </p>
          {submitError && <p role="alert">{submitError}</p>}
          <button type="submit" disabled={isSubmitting} className="clay-button">
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={17} /> Invio in corso…
              </>
            ) : (
              <>Pubblica la recensione</>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
