'use client';
import Image from 'next/image';
import { useState, type ReactNode } from 'react';
import { ArrowUpRight, Heart, MessageCircle, Send, Bookmark } from 'lucide-react';

export default function InstagramPost({ id, img, url, caption, alt }: { id: string; img: string; url: string; caption: ReactNode; alt: string }) {
  const [expanded, setExpanded] = useState(false);
  return <article className="ig-post">
    <header className="ig-post-header">
      <a className="ig-avatar" href="https://www.instagram.com/under_the_tower_factory/" target="_blank" rel="noopener noreferrer" aria-label="Profilo Instagram della Factory"><Image src="/icons/favicon.svg" alt="" width={28} height={28} /></a>
      <a className="ig-account" href="https://www.instagram.com/under_the_tower_factory/" target="_blank" rel="noopener noreferrer">under_the_tower_factory<span>Under The Tower Factory</span></a>
      <a href={url} target="_blank" rel="noopener noreferrer" aria-label="Apri il post su Instagram"><ArrowUpRight size={20} /></a>
    </header>
    <a className="ig-media" href={url} target="_blank" rel="noopener noreferrer"><Image src={img} alt={alt} fill sizes="(min-width: 1100px) 33vw, (min-width: 640px) 50vw, 100vw" /></a>
    <div className="ig-post-actions">
      <a href={url} target="_blank" rel="noopener noreferrer" aria-label="Metti mi piace su Instagram" title="Mi piace su Instagram"><Heart /></a>
      <a href={url} target="_blank" rel="noopener noreferrer" aria-label="Commenta su Instagram" title="Commenta su Instagram"><MessageCircle /></a>
      <a href={url} target="_blank" rel="noopener noreferrer" aria-label="Condividi il post su Instagram" title="Condividi su Instagram"><Send /></a>
      <a href={url} target="_blank" rel="noopener noreferrer" aria-label="Salva il post su Instagram" title="Salva su Instagram"><Bookmark /></a>
    </div>
    <div className="ig-post-copy"><div id={`caption-${id}`} className={`ig-post-caption${expanded ? ' is-expanded' : ''}`}>{caption}</div><button type="button" className="ig-caption-toggle" aria-expanded={expanded} aria-controls={`caption-${id}`} onClick={() => setExpanded(value => !value)}>{expanded ? 'Mostra meno' : 'Leggi tutto'}</button></div>
    <a className="ig-post-footer" href={url} target="_blank" rel="noopener noreferrer">Apri su Instagram<ArrowUpRight size={15} /></a>
  </article>;
}
