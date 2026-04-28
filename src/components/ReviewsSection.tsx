'use client'

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { MessageSquareQuote, Star, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ReviewStars from '@/components/ReviewStars';
import type { Review } from '@/types/database';

export default function ReviewsSection() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReviews() {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setReviews(data);
      }

      setLoading(false);
    }

    fetchReviews();
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
    () =>
      [...reviews].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [reviews]
  );

  return (
    <section id="recensioni" className="space-y-10">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex items-center gap-3 text-[#FF914D]">
          <MessageSquareQuote size={20} />
          <span className="font-mono text-[10px] uppercase tracking-[0.5em]">
            UTTF_REVIEWS
          </span>
        </div>
        <h2 className="text-2xl md:text-4xl font-black uppercase italic tracking-tighter">
          PARERI <span className="text-[#FF914D]">REALI</span>
        </h2>
        <p className="max-w-2xl text-[11px] font-mono uppercase tracking-[0.25em] text-zinc-500">
          In alto vedi le 3 recensioni piu forti. Se scorri, sotto trovi tutta la
          timeline completa dalla piu recente alla piu vecchia.
        </p>
      </div>

      {loading ? (
        <div className="glass-panel rounded-[2rem] border-white/5 bg-black/30 p-8 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-[#FF914D]" />
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
                      Top Review
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

                <p className="mt-auto text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-600">
                  {new Date(review.created_at).toLocaleDateString('it-IT')}
                </p>
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
                      Lascia_Recensione
                    </span>
                    <ArrowRight size={14} className="text-zinc-300 group-hover:text-white transition-colors" />
                  </div>
                </div>
              </Link>
            </div>

            <div className="mt-6 max-h-[28rem] overflow-y-auto custom-scrollbar pr-2 space-y-4">
              {recentReviews.map((review) => (
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

                    <div className="text-left md:text-right">
                      <p className="text-[10px] font-black uppercase text-[#FF914D]">
                        {Number(review.rating).toFixed(0)}/5
                      </p>
                      <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-600">
                        {new Date(review.created_at).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-zinc-300">
                    {review.comment}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
