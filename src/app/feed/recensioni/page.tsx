'use client'

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2, MessageSquareQuote, Send, UserRound, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ReviewStars from '@/components/ReviewStars';

export default function ReviewsPage() {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [authorName, setAuthorName] = useState('');
  const [comment, setComment] = useState('');
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
      setSubmitError('Seleziona prima un voto.');
      return;
    }

    if (!normalizedComment) {
      setSubmitError('Scrivi un commento prima di inviare.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const { error } = await supabase.from('reviews').insert([
      {
        author_name: normalizedName,
        comment: normalizedComment,
        rating,
      },
    ]);

    if (error) {
      setSubmitError('Recensione non salvata. Controlla la tabella reviews su Supabase.');
      setIsSubmitting(false);
      return;
    }

    router.push('/feed#recensioni');
  };

  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col items-center overflow-x-hidden pb-40 selection:bg-[#FF914D]/30">
      <header className="w-full max-w-5xl px-6 pt-12 pb-16 flex flex-col gap-12">
        <div className="w-full flex justify-start">
          <Link href="/feed" className="nav-tag flex items-center gap-2 !text-[#FF914D] border-[#FF914D]/20">
            <ArrowLeft size={14} className="text-[#FF914D]" /> BACK
          </Link>
        </div>

        <div className="flex flex-col items-center text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-[#FF914D] blur-xl opacity-20 rounded-full animate-pulse"></div>
            <div className="relative p-4 bg-[#FF914D]/10 border border-[#FF914D]/20 rounded-full text-[#FF914D]">
              <MessageSquareQuote size={32} strokeWidth={2.5} />
            </div>
          </div>

          <h1 className="hero-title text-[10vw] md:text-6xl leading-none italic uppercase font-black tracking-tighter">
            UTTF_<span className="text-[#FF914D]">REVIEWS</span>
          </h1>
          <p className="mt-4 max-w-2xl text-[11px] font-mono uppercase tracking-[0.25em] text-zinc-500">
            Dai un voto da 1 a 10 usando le mezze stelle e lascia un commento.
          </p>
        </div>
      </header>

      <main className="w-full max-w-3xl px-6 relative z-10">
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="glass-panel rounded-[2.5rem] border-white/5 bg-black/30 p-8 md:p-10 flex flex-col gap-8"
        >
          <div className="space-y-4">
            <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-zinc-500">
              Valutazione
            </p>
            <div className="flex flex-col items-center gap-4 rounded-[2rem] border border-white/5 bg-black/40 p-6">
              <ReviewStars rating={rating} onChange={setRating} interactive size={36} />
              <p className="text-sm font-black uppercase tracking-[0.2em] text-white">
                {rating === 0 ? 'Seleziona il voto' : `${rating * 2}/10`}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-[0.35em] text-zinc-500">
              Nome e cognome
            </label>
            <div className="relative">
              <UserRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input
                type="text"
                value={authorName}
                onChange={(e) => {
                  setAuthorName(e.target.value);
                  if (showNameHint) setShowNameHint(false);
                }}
                placeholder="Scrivi il tuo nome oppure Anonimo"
                className="w-full rounded-xl border border-white/10 bg-black/50 py-4 pl-11 pr-4 text-[11px] font-mono uppercase text-white outline-none transition-colors placeholder:text-zinc-700 focus:border-[#FF914D]/60"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-[0.35em] text-zinc-500">
              Commento
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
              rows={6}
              placeholder="Scrivi la tua recensione"
              className="w-full rounded-xl border border-white/10 bg-black/50 p-4 text-[12px] text-white outline-none transition-colors placeholder:text-zinc-700 focus:border-[#FF914D]/60"
            />
          </div>

          {submitError ? (
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#FF914D]">
              {submitError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-[#FF914D] py-4 text-[11px] font-black uppercase italic tracking-[0.25em] text-black transition-colors hover:bg-white disabled:opacity-50 disabled:hover:bg-[#FF914D] flex items-center justify-center gap-3"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Invio in corso
              </>
            ) : (
              <>
                <Send size={16} />
                Invia recensione
              </>
            )}
          </button>
        </motion.form>
      </main>

      <AnimatePresence>
        {showNameHint ? (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-sm rounded-[2rem] border border-[#FF914D]/20 bg-zinc-950 p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-[#FF914D]">
                    Nome richiesto
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                    Se non vuoi firmarti, scrivi almeno <span className="font-black text-white">Anonimo</span>.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowNameHint(false)}
                  className="rounded-full p-2 text-zinc-500 transition-colors hover:bg-white/5 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setAuthorName('Anonimo');
                  setShowNameHint(false);
                }}
                className="mt-6 w-full rounded-xl bg-[#FF914D] py-3 text-[10px] font-black uppercase tracking-[0.25em] text-black"
              >
                Usa Anonimo
              </button>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
