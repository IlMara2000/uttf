"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";

export default function VideoEmbed({
  title,
  embedUrl,
}: {
  title: string;
  embedUrl: string;
}) {
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
      className="video-launch"
      aria-label={`Riproduci ${title}`}
    >
      <span>ARCHIVIO VIDEO / UNDER THE TOWER</span>
      <span>
        Riproduci <ArrowUpRight size={30} />
      </span>
    </button>
  );
}
