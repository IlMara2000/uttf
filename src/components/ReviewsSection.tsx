"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/errors";
import ReviewStars from "@/components/ReviewStars";
import type { Review } from "@/types/database";

export default function ReviewsSection() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [staffAccessToken, setStaffAccessToken] = useState<string | null>(null);
  const [deletingReviewId, setDeletingReviewId] = useState<number | null>(null);

  const fetchReviews = useCallback(async () => {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setLoadError("Non riesco a caricare le recensioni in questo momento.");
      setReviews([]);
    } else if (data) {
      setLoadError(null);
      setReviews(data);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchReviews();
  }, [fetchReviews]);

  useEffect(() => {
    let isMounted = true;

    async function syncStaffSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (isMounted) {
        setStaffAccessToken(session?.access_token ?? null);
      }
    }

    void syncStaffSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setStaffAccessToken(session?.access_token ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const featuredReviews = useMemo(
    () =>
      [...reviews]
        .sort((a, b) => {
          if (b.rating !== a.rating) return b.rating - a.rating;
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        })
        .slice(0, 3),
    [reviews],
  );

  const recentReviews = useMemo(() => {
    const featuredIds = new Set(featuredReviews.map((review) => review.id));

    return [...reviews]
      .filter((review) => !featuredIds.has(review.id))
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  }, [featuredReviews, reviews]);

  const handleDeleteReview = async (id: number) => {
    if (!staffAccessToken) return;
    if (!confirm("Vuoi eliminare questa recensione?")) return;

    setDeletingReviewId(id);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token || staffAccessToken;

      if (!token) {
        throw new Error("Sessione staff non valida.");
      }

      const response = await fetch(`/api/reviews?id=${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Cancellazione recensione non riuscita.");
      }

      await fetchReviews();
    } catch (error) {
      alert(
        `Non sono riuscito a eliminare la recensione: ${getErrorMessage(error)}`,
      );
    } finally {
      setDeletingReviewId(null);
    }
  };

  const renderReview = (review: Review) => (
    <article className="review-card" key={review.id}>
      <div className="review-heading">
        <h3>{review.author_name}</h3>
        <span>{review.rating}/5</span>
      </div>
      <ReviewStars rating={review.rating} size={23} />
      <p>{review.comment}</p>
      <div className="review-footer">
        <time dateTime={review.created_at}>
          {new Date(review.created_at).toLocaleDateString("it-IT")}
        </time>
        {staffAccessToken && (
          <button
            type="button"
            onClick={() => handleDeleteReview(review.id)}
            disabled={deletingReviewId === review.id}
            aria-label={`Elimina la recensione di ${review.author_name}`}
          >
            {deletingReviewId === review.id ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Trash2 size={15} />
            )}{" "}
            Elimina
          </button>
        )}
      </div>
    </article>
  );

  return (
    <section id="recensioni" className="community-reviews">
      <div className="section-kicker">
        <span>Le voci della comunità</span>
        <span>Esperienze condivise</span>
      </div>
      <div className="section-heading">
        <h2>
          La Factory,
          <br />
          vista da voi.
        </h2>
        <Link href="/feed/recensioni" className="text-link">
          Racconta la tua esperienza <ArrowUpRight size={17} />
        </Link>
      </div>
      {loading ? (
        <div className="review-empty" role="status">
          <Loader2 size={24} className="animate-spin" /> Caricamento delle
          recensioni…
        </div>
      ) : loadError ? (
        <div className="review-empty" role="status">
          <p>{loadError}</p>
          <button
            className="text-link"
            onClick={() => {
              setLoading(true);
              void fetchReviews();
            }}
          >
            Riprova <ArrowUpRight size={16} />
          </button>
        </div>
      ) : reviews.length === 0 ? (
        <div className="review-empty">
          <p>
            Non ci sono ancora recensioni. Hai partecipato a un’attività?
            Raccontaci com’è andata.
          </p>
        </div>
      ) : (
        <>
          <div className="review-grid">{featuredReviews.map(renderReview)}</div>
          {recentReviews.length > 0 && (
            <div className="more-reviews">
              <h3>Altre esperienze, dalla più recente</h3>
              <div className="review-grid">
                {recentReviews.map(renderReview)}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
