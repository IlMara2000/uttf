'use client';

import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import type { MouseEvent } from 'react';

const destination = encodeURIComponent('Via dei Biancospini, 4, 20089 Rozzano MI, Italia');
const directions = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;

function openDirections(event: MouseEvent<HTMLAnchorElement>) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const agent = navigator.userAgent;
  if (/Android/i.test(agent)) {
    event.preventDefault();
    window.location.href = `geo:0,0?q=${destination}`;
  } else if (/iPhone|iPad|iPod|Macintosh/i.test(agent)) {
    event.preventDefault();
    window.location.href = `https://maps.apple.com/?daddr=${destination}`;
  }
}

export default function VisitSection() {
  return (
    <section className="visit-stage" aria-labelledby="visit-title">
      <Image src="/bg-uttf.jpg" alt="" fill sizes="100vw" className="visit-background" />
      <div className="visit-section content-width">
        <div>
          <span className="eyebrow">Ci vediamo a Rozzano</span>
          <h2 id="visit-title">Il nostro punto<br />di incontro.</h2>
          <p>Via dei Biancospini, 4 · Rozzano (MI)</p>
          <a className="text-link" href="mailto:ass.uttf@gmail.com">
            Scrivici da qui via Mail <ArrowUpRight size={17} />
          </a>
        </div>
        <div className="visit-map">
          <iframe
            title="Mappa della sede: Via dei Biancospini 4, Rozzano"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2802.48206105437!2d9.14821617674218!3d45.38550393802996!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4786e3955e840703%3A0xcf953330dfde366f!2sVia%20dei%20Biancospini%2C%204%2C%2020089%20Rozzano%20MI!5e0!3m2!1sit!2sit!4v1710000000000!5m2!1sit!2sit"
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />
          <div className="visit-map-actions">
            <a className="clay-button light" href={directions} onClick={openDirections}>
              Come raggiungerci <ArrowUpRight size={18} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
