'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';

export default function VideoEmbed({ title, embedUrl }: { title: string; embedUrl: string }) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <iframe
        src={`${embedUrl}?autoplay=1`}
        title={title}
        className="absolute inset-0 h-full w-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[linear-gradient(rgba(0,0,0,.45),rgba(0,0,0,.8)),url('/bg-uttf.jpg')] bg-cover bg-center text-white transition-colors hover:text-[#FF914D]"
      aria-label={`Riproduci ${title}`}
    >
      <span className="rounded-full border border-[#FF914D]/60 bg-black/70 p-6 shadow-[0_0_40px_rgba(255,145,77,.3)]">
        <Play size={36} fill="currentColor" />
      </span>
      <span className="font-mono text-xs font-bold uppercase tracking-[.25em]">Guarda il video</span>
    </button>
  );
}
