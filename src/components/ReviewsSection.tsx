'use client'

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { MessageSquareQuote, Star, ArrowRight, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/errors';
import ReviewStars from '@/components/ReviewStars';
import type { Review } from '@/types/database';

export default function ReviewsSection() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [staffAccessToken, setStaffAccessToken] = useState<string | null>(null);
  const [deletingReviewId, setDeletingReviewId] = useState<number | null>(null);

  const fetchReviews = useCallback(async () => {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setLoadError('Non riesco a caricare le recensioni in questo momento.');
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
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        })
        .slice(0, 3),
    [reviews]
  );

  const recentReviews = useMemo(
    () => {
      const featuredIds = new Set(featuredReviews.map((review) => review.id));

      return [...reviews]
        .filter((review) => !featuredIds.has(review.id))
        .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    },
    [featuredReviews, reviews]
  );

  const handleDeleteReview = async (id: number) => {
    if (!staffAccessToken) return;
    if (!confirm('Vuoi eliminare questa recensione?')) return;

    setDeletingReviewId(id);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token || staffAccessToken;

      if (!token) {
        throw new Error('Sessione staff non valida.');
      }

      const response = await fetch(`/api/reviews?id=${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || 'Cancellazione recensione non riuscita.');
      }

      await fetchReviews();
    } catch (error) {
      alert(`Non sono riuscito a eliminare la recensione: ${getErrorMessage(error)}`);
    } finally {
      setDeletingReviewId(null);
    }
  };

  return (
    <section id="recensioni" className="space-y-10">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex items-center gap-3 text-[#FF914D]">
          <MessageSquareQuote size={20} />
          <span className="font-mono text-[10px] uppercase tracking-[0.5em]">
            Voci dalla community
          </span>
        </div>
        <h2 className="text-2xl md:text-4xl font-black uppercase italic tracking-tighter">
          PARERI <span className="text-[#FF914D]">REALI</span>
        </h2>
        <p className="max-w-2xl text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-500">
          Qui trovi i pareri piu belli della community. Scorrendo trovi anche tutte
          le altre recensioni, dalle ultime arrivate a quelle piu vecchie.
        </p>
      </div>

      {loading ? (
        <div className="glass-panel rounded-[2rem] border-white/5 bg-black/30 p-8 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-[#FF914D]" />
        </div>
      ) : loadError ? (
        <div className="glass-panel rounded-[2rem] border-red-500/10 bg-red-950/10 p-10 text-center">
          <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-red-300">
          Recensioni non disponibili
          </p>
          <p className="mt-3 text-xs font-mono uppercase tracking-[0.2em] text-zinc-500">
            {loadError}
          </p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="glass-panel rounded-[2rem] border-white/5 bg-black/30 p-10 text-center">
          <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-zinc-500">
            Nessuna recensione disponibile.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {featuredReviews.map((review) => (
              <article
                key={`featured-${review.id}`}
                className="glass-panel rounded-[2rem] border-white/5 bg-black/30 p-6 flex flex-col gap-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-zinc-500">
                      In evidenza
                    </p>
                    <h3 className="mt-2 text-lg font-black uppercase italic tracking-tight">
                      {review.author_name}
                    </h3>
                  </div>
                  <div className="rounded-full border border-[#FF914D]/20 bg-[#FF914D]/10 px-3 py-1 text-[10px] font-black uppercase text-[#FF914D]">
                    {Number(review.rating).toFixed(0)}/5
                  </div>
                </div>

                <ReviewStars rating={review.rating} size={22} />

                <p className="text-sm leading-relaxed text-zinc-300">
                  {review.comment}
                </p>

                <div className="mt-auto flex items-center justify-between gap-3">
                  <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-600">
                    {new Date(review.created_at).toLocaleDateString('it-IT')}
                  </p>
                  {staffAccessToken ? (
                    <button
                      type="button"
                      onClick={() => handleDeleteReview(review.id)}
                      disabled={deletingReviewId === review.id}
                      className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.15em] text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                    >
                      {deletingReviewId === review.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Trash2 size={12} />
                      )}
                      Elimina
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          <div className="glass-panel rounded-[2rem] border-white/5 bg-black/30 p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-white/5">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-zinc-500">
                  Timeline completa
                </p>
                <h3 className="mt-2 text-xl font-black uppercase italic tracking-tight">
                  Dalla piu recente alla piu vecchia
                </h3>
              </div>

              <Link href="/feed/recensioni" className="group self-start md:self-auto">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-orange-400 via-[#FF914D] to-orange-600 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                  <div className="relative inline-flex items-center gap-3 px-6 py-3 bg-[#FF914D]/15 backdrop-blur-xl border-2 border-[#FF914D]/40 rounded-full text-white">
                    <Star size={16} className="text-white" />
                    <span className="font-mono text-[10px] font-bold tracking-[0.3em] uppercase">
                      Lascia una recensione
                    </span>
                    <ArrowRight size={14} className="text-zinc-300 group-hover:text-white transition-colors" />
                  </div>
                </div>
              </Link>
            </div>

            <div className="mt-6 max-h-[28rem] overflow-y-auto custom-scrollbar pr-2 space-y-4">
              {recentReviews.length > 0 ? (
                recentReviews.map((review) => (
                  <article
                    key={review.id}
                    className="rounded-[1.5rem] border border-white/5 bg-black/40 p-5"
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="space-y-3">
                        <h4 className="text-sm font-black uppercase tracking-wide">
                          {review.author_name}
                        </h4>
                        <ReviewStars rating={review.rating} size={18} />
                      </div>

                      <div className="flex flex-col items-start gap-3 md:items-end">
                        <div className="text-left md:text-right">
                          <p className="text-[10px] font-black uppercase text-[#FF914D]">
                            {Number(review.rating).toFixed(0)}/5
                          </p>
                          <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-600">
                            {new Date(review.created_at).toLocaleDateString('it-IT')}
                          </p>
                        </div>
                        {staffAccessToken ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteReview(review.id)}
                            disabled={deletingReviewId === review.id}
                            className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.15em] text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                          >
                            {deletingReviewId === review.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Trash2 size={12} />
                            )}
                            Elimina
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-relaxed text-zinc-300">
                      {review.comment}
                    </p>
                  </article>
                ))
              ) : (
                <div className="rounded-[1.5rem] border border-white/5 bg-black/40 p-5 text-center">
                  <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-600">
                    Nessuna altra recensione da mostrare.
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
