'use client'

import { useEffect, useRef, useState } from 'react';
import type { PointerEvent, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { 
  Loader2, 
  X, 
  Play, 
  Maximize2,
  Users,
  Image as ImageIcon,
  MapPin,
  Radio,
  FlaskConical
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import MapSection from '@/components/MapSection';

type Publication = {
  id: string | number;
  created_at: string;
  title: string;
  description: string | null;
  image_url: string;
};

const FALLBACK_PUBLICATIONS: Publication[] = [
  {
    id: 'fallback-factory-update',
    created_at: '2026-03-25T00:00:00.000Z',
    title: 'WORK IN PROGRESS',
    description: 'Presto aggiorneremo la pagina con tutto il programma. Restate sintonizzati.',
    image_url: '/instagram/post2.jpeg',
  },
];

type RevealActionProps = {
  href?: string;
  onClick?: () => void;
  icon: ReactNode;
  eyebrow: string;
  label: string;
  compactLabel: string;
  hint: string;
  className?: string;
  reverse?: boolean;
  center?: boolean;
  delay?: number;
};

type GlassHubActionProps = {
  href: string;
  icon: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  delay?: number;
};

function GlassHubAction({
  href,
  icon,
  eyebrow,
  title,
  description,
  delay = 0,
}: GlassHubActionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ delay, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, scale: 1.015 }}
      whileTap={{ scale: 0.98 }}
      className="min-w-0"
    >
      <Link
        href={href}
        aria-label={`${title}: ${description}`}
        className="group relative isolate flex min-h-[6.7rem] w-full transform-gpu items-center gap-3 overflow-hidden rounded-[1.45rem] border border-[#FF914D]/36 bg-black/68 px-3.5 py-4 text-left shadow-[0_18px_40px_rgba(0,0,0,0.52),0_0_28px_rgba(255,145,77,0.12),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md transition-all duration-500 hover:border-[#FF914D]/72 hover:bg-[#2a1208]/72 hover:shadow-[0_22px_54px_rgba(0,0,0,0.62),0_0_38px_rgba(255,145,77,0.22),inset_0_0_28px_rgba(255,145,77,0.14)] sm:min-h-[7.2rem] sm:gap-4 sm:px-5 sm:py-5 md:min-h-[8.4rem] md:rounded-[1.75rem] md:px-7"
      >
        <span className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_22%_20%,rgba(255,255,255,0.18),transparent_22%),radial-gradient(circle_at_78%_74%,rgba(255,145,77,0.2),transparent_34%),radial-gradient(circle_at_center,rgba(255,145,77,0.08),rgba(18,10,7,0.78)_60%,rgba(0,0,0,0.92))]" />
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute -top-10 bottom-[-2.5rem] w-24 rotate-[24deg] bg-gradient-to-r from-transparent via-white/24 to-transparent blur-sm"
          initial={{ x: '-160%', opacity: 0 }}
          animate={{ x: ['-160%', '420%'], opacity: [0, 0.8, 0] }}
          transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut', delay: delay + 0.35 }}
        />
        <span className="pointer-events-none absolute inset-2 rounded-[1.1rem] border border-white/10 shadow-[inset_0_0_30px_rgba(255,255,255,0.04)] md:inset-3 md:rounded-[1.35rem]" />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-[120%] w-[72%] rounded-full border border-[#FF914D]/14"
          style={{ transform: 'translate(-50%, -50%) rotateX(66deg) rotateZ(-10deg)' }}
        />
        <motion.span
          className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#FF914D]/58 bg-[#FF914D]/18 text-[#FF914D] shadow-[0_0_22px_rgba(255,145,77,0.2),inset_0_0_20px_rgba(255,145,77,0.14)] sm:h-14 sm:w-14"
          animate={{ rotate: [0, -4, 4, 0], scale: [1, 1.035, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay }}
        >
          <span className="absolute inset-1.5 rounded-full bg-white/10 blur-[2px]" />
          <span className="relative z-10">{icon}</span>
        </motion.span>
        <span className="relative z-10 flex min-w-0 flex-1 flex-col">
          <span className="mb-1 truncate whitespace-nowrap font-mono text-[7.5px] uppercase tracking-[0.34em] text-[#FF914D] sm:text-[8px] md:text-[9px]">
            {eyebrow}
          </span>
          <span className="truncate whitespace-nowrap text-[14px] font-black uppercase italic leading-none tracking-tight text-white sm:text-[16px] md:text-[20px]">
            {title}
          </span>
          <span className="mt-1.5 line-clamp-2 font-mono text-[7.5px] uppercase leading-relaxed tracking-[0.12em] text-white/64 transition-colors duration-500 group-hover:text-white/82 sm:text-[8px] md:text-[9px]">
            {description}
          </span>
        </span>
      </Link>
    </motion.div>
  );
}

function RevealAction({
  href,
  onClick,
  icon,
  eyebrow,
  label,
  compactLabel,
  hint,
  className = '',
  reverse = false,
  center = false,
  delay = 0,
}: RevealActionProps) {
  const actionClass = [
    'group relative flex h-[4.25rem] w-[10.4rem] items-center gap-3 overflow-hidden rounded-full border border-[#FF914D]/68 bg-[#2a1208]/72 px-3 text-white shadow-[0_18px_38px_rgba(0,0,0,0.58),0_0_24px_rgba(255,145,77,0.14),inset_0_1px_0_rgba(255,255,255,0.16),inset_0_0_24px_rgba(255,145,77,0.16)] backdrop-blur-md sm:w-[11.6rem] md:h-[4.55rem] md:w-[12.7rem]',
    'transition-[width,border-color,background-color,box-shadow] duration-500 ease-out hover:w-[12.6rem] hover:border-[#FF914D] hover:bg-[#FF914D]/22 hover:shadow-[0_24px_52px_rgba(0,0,0,0.64),0_0_36px_rgba(255,145,77,0.34),inset_0_0_28px_rgba(255,145,77,0.2)] active:w-[12.6rem] focus-visible:w-[12.6rem] sm:hover:w-[15.7rem] sm:active:w-[15.7rem] sm:focus-visible:w-[15.7rem] md:hover:w-[18.2rem] md:active:w-[18.2rem] md:focus-visible:w-[18.2rem]',
    reverse ? 'flex-row-reverse text-right' : 'text-left',
  ].join(' ');

  const content = (
    <>
      <span className={`pointer-events-none absolute inset-y-2 w-12 rounded-full bg-[#FF914D]/24 blur-lg transition-opacity duration-500 group-hover:opacity-100 ${reverse ? 'right-3' : 'left-3'}`} />
      <motion.span
        className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#FF914D]/70 bg-[#FF914D]/28 text-[#FF914D] shadow-[0_0_18px_rgba(255,145,77,0.22),inset_0_0_18px_rgba(255,145,77,0.22)] md:h-[3.15rem] md:w-[3.15rem]"
        animate={{ rotate: [0, -5, 5, 0], scale: [1, 1.04, 1] }}
        transition={{ duration: 6.2, repeat: Infinity, ease: 'easeInOut', delay }}
      >
        <span className="absolute inset-1 rounded-full bg-white/14 blur-[2px]" />
        <span className="relative z-10">{icon}</span>
      </motion.span>
      <span className={`relative z-10 flex min-w-0 flex-1 flex-col ${reverse ? 'items-end pl-1' : 'items-start pr-1'}`}>
        <span className="mb-0.5 w-full truncate whitespace-nowrap font-mono text-[7.7px] uppercase tracking-[0.3em] text-[#FF914D]">
          {eyebrow}
        </span>
        <span className="w-full truncate whitespace-nowrap text-[12px] font-black uppercase italic leading-none tracking-tight text-white md:text-[13px]">
          <span className="group-hover:hidden group-active:hidden group-focus-visible:hidden">{compactLabel}</span>
          <span className="hidden group-hover:inline group-active:inline group-focus-visible:inline">{label}</span>
        </span>
        <span className="mt-1 w-full truncate whitespace-nowrap font-mono text-[7.7px] uppercase tracking-[0.08em] text-white/62 transition-colors duration-500 group-hover:text-white/82">
          {hint}
        </span>
      </span>
    </>
  );

  const outerClassName = ['pointer-events-auto inline-flex', className].filter(Boolean).join(' ');
  const motionProps = {
    className: outerClassName,
    style: center ? { x: '-50%' } : undefined,
    animate: { y: [0, -3, 0] },
    transition: { duration: 6.8, repeat: Infinity, ease: 'easeInOut' as const, delay },
    whileHover: { scale: 1.025 },
    whileTap: { scale: 0.97 },
  };

  if (href) {
    return (
      <motion.div {...motionProps}>
        <Link href={href} aria-label={`${label}: ${hint}`} className={actionClass}>
          {content}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div {...motionProps}>
      <button type="button" aria-label={`${label}: ${hint}`} onClick={onClick} className={actionClass}>
        {content}
      </button>
    </motion.div>
  );
}

export default function HomePage() {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Publication | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const logoSceneRef = useRef<HTMLDivElement | null>(null);
  const logoPointerFrameRef = useRef<number | null>(null);

  const PROJECT_ID = 'oieqtrfeoyfabyjirrqa'; 
  const BUCKET_NAME = 'publications'; 

  useEffect(() => {
    async function fetchPublications() {
      try {
        const { data, error } = await supabase
          .from('publications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(6);
        if (!error && data?.length) setPublications(data as Publication[]);
      } finally {
        setLoading(false);
      }
    }
    fetchPublications();
  }, []);

  useEffect(() => {
    return () => {
      if (logoPointerFrameRef.current) cancelAnimationFrame(logoPointerFrameRef.current);
    };
  }, []);

  const isVideo = (url: string) => url?.match(/\.(mp4|webm|ogg|mov)$/i);

  const visiblePublications = publications.length > 0 ? publications : FALLBACK_PUBLICATIONS;

  const getPublicationMediaUrl = (imageUrl: string) => {
    if (!imageUrl) return FALLBACK_PUBLICATIONS[0].image_url;
    if (imageUrl.startsWith('http') || imageUrl.startsWith('/')) return imageUrl;
    return `https://${PROJECT_ID}.supabase.co/storage/v1/object/public/${BUCKET_NAME}/${imageUrl}`;
  };

  const updateLogoPointer = (event: PointerEvent<HTMLDivElement>) => {
    const scene = logoSceneRef.current;
    if (!scene) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;

    if (logoPointerFrameRef.current) cancelAnimationFrame(logoPointerFrameRef.current);
    logoPointerFrameRef.current = requestAnimationFrame(() => {
      scene.style.setProperty('--pointer-x', pointerX.toFixed(3));
      scene.style.setProperty('--pointer-y', pointerY.toFixed(3));
    });
  };

  const resetLogoPointer = () => {
    const scene = logoSceneRef.current;
    if (!scene) return;

    if (logoPointerFrameRef.current) cancelAnimationFrame(logoPointerFrameRef.current);
    logoPointerFrameRef.current = requestAnimationFrame(() => {
      scene.style.setProperty('--pointer-x', '0');
      scene.style.setProperty('--pointer-y', '0');
    });
  };

  // Tipizzazione esplicita come Variants per risolvere l'errore di build
  const pulseGlow: Variants = {
    animate: {
      boxShadow: [
        "0 0 18px 0px rgba(255, 145, 77, 0.12)",
        "0 0 30px 4px rgba(255, 145, 77, 0.22)",
        "0 0 18px 0px rgba(255, 145, 77, 0.12)"
      ],
      transition: {
        duration: 5,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col items-center overflow-x-hidden pb-52 md:pb-40">
      
      {/* HEADER */}
      <header className="pt-16 pb-8 flex flex-col items-center gap-5 md:pt-24 md:pb-12 md:gap-6">
        <Image
          src="/icons/favicon.svg" 
          alt="UTTF" 
          width={120}
          height={120}
          priority
          className="w-25 h-25 md:w-30 md:h-30 transition-transform hover:scale-110 duration-500" 
          onError={(e) => (e.currentTarget.src = '/favicon.ico')}
        />
        <Link href="/login" className="btn-urban opacity-80 hover:opacity-100 transition-opacity animate-pulse flex items-center gap-3 border border-[#FF914D]/20 px-6 py-3 rounded-full font-mono text-[10px] tracking-[0.3em] uppercase italic font-bold">
          <div className="w-1.5 h-1.5 rounded-full bg-[#FF914D]"></div>
          ACCESSO STAFF
        </Link>
      </header>

      {/* MAIN CONTENT */}
      <main className="w-full max-w-7xl px-4 flex flex-col items-center md:px-6">
        
        {/* HERO SECTION */}
        <section className="py-6 w-full flex flex-col items-center md:py-12">
          <motion.div 
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="w-full flex flex-col items-center"
          >
            <h1 className="hero-title animate-shine text-[13vw] leading-[0.86] text-center mb-10 font-black uppercase italic tracking-tighter sm:text-[14vw] md:mb-16 md:text-[8vw]">
              Under The<br />
              Tower<br />
              <span style={{ color: '#FF914D' }}>Factory</span>
            </h1>

            {/* SEZIONE COS'È - GLASSMORPHISM RESTYLE */}
            <motion.div 
              className="relative isolate flex min-h-[280px] w-full max-w-5xl items-center overflow-hidden rounded-[1.65rem] border border-[#FF914D]/36 bg-black/68 px-5 py-10 shadow-[0_20px_48px_rgba(0,0,0,0.58),0_0_34px_rgba(255,145,77,0.12),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md sm:min-h-[300px] sm:px-8 sm:py-12 md:mb-8 md:min-h-[330px] md:rounded-[2rem] md:px-14 md:py-20"
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.5 }}
              variants={pulseGlow}
              animate="animate"
              whileHover={{ y: -4, rotateX: 1.2, rotateY: -1.2 }}
              transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Grain Texture Overlay */}
              <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_34%_24%,rgba(255,255,255,0.2),transparent_18%),radial-gradient(circle_at_74%_72%,rgba(255,145,77,0.22),transparent_31%),radial-gradient(circle_at_center,rgba(255,145,77,0.1),rgba(42,22,18,0.72)_56%,rgba(0,0,0,0.9))]" />
              <div className="absolute inset-0 rounded-[inherit] bg-[url('/images/noise.svg')] opacity-20 mix-blend-soft-light pointer-events-none" />
              <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/55 to-transparent" />
              <div className="pointer-events-none absolute -left-24 -top-28 hidden h-72 w-72 rounded-full bg-white/8 blur-2xl md:block" />
              <div className="pointer-events-none absolute -right-28 bottom-0 hidden h-80 w-80 rounded-full bg-[#FF914D]/14 blur-2xl md:block" />
              <div className="pointer-events-none absolute inset-2 rounded-[1.25rem] border border-white/12 shadow-[inset_0_0_38px_rgba(255,255,255,0.05)] md:inset-4 md:rounded-[1.55rem]" />
              <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-[-20%] left-[-25%] w-[42%] rotate-[18deg] bg-gradient-to-r from-transparent via-white/16 to-transparent blur-md"
                animate={{ x: ['0%', '330%'], opacity: [0, 0.85, 0] }}
                transition={{ duration: 5.6, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/2 h-[135%] w-[66%] rounded-full border border-[#FF914D]/16"
                style={{ transform: 'translate(-50%, -50%) rotateX(68deg) rotateZ(-9deg)' }}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/2 h-[126%] w-[52%] rounded-full border border-white/8"
                style={{ transform: 'translate(-50%, -50%) rotateX(66deg) rotateZ(18deg)' }}
              />
              
              <motion.div
                className="relative z-10 mx-auto max-w-4xl"
              >
                <h3 className="text-[1.45rem] leading-tight md:text-4xl font-black uppercase italic mb-5 md:mb-7 text-center tracking-tighter text-[#FF914D] drop-shadow-[0_0_22px_rgba(255,145,77,0.28)]">
                  COS&apos;È UNDER THE TOWER?
                </h3>
                <p className="text-white text-[10.5px] md:text-lg uppercase text-center tracking-[0.1em] md:tracking-[0.14em] font-sans font-medium leading-[1.8] md:leading-relaxed max-w-3xl mx-auto opacity-90">
                  UN PROGETTO CREATIVO CHE NASCE CON L&apos;OBIETTIVO DI UNIRE PERSONE, IDEE E PASSIONI ALL&apos;INTERNO DI UN ECOSISTEMA DINAMICO. UN COMMUNITY HUB DOVE ARTE, INTRATTENIMENTO E INGEGNO SI INCONTRANO PER CREARE ESPERIENZE IMMERSIVE E COINVOLGENTI.
                </p>
              </motion.div>
            </motion.div>

            <div className="relative z-[110] mt-2 w-full max-w-5xl pt-9 sm:pt-10 md:mt-0 md:pt-12">
              <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-9 w-px -translate-x-1/2 bg-gradient-to-b from-[#FF914D]/65 to-[#FF914D]/10 sm:h-10 md:h-12" />
              <div aria-hidden="true" className="pointer-events-none absolute left-[25%] right-[25%] top-9 h-px bg-gradient-to-r from-transparent via-[#FF914D]/38 to-transparent sm:top-10 md:top-12" />
              <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-7 h-2 w-2 -translate-x-1/2 rounded-full bg-[#FF914D] shadow-[0_0_22px_rgba(255,145,77,0.9)] sm:top-8 md:top-10"
                animate={{ scale: [0.8, 1.35, 0.8], opacity: [0.45, 1, 0.45] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div className="grid w-full grid-cols-2 gap-3 sm:gap-5 md:gap-6">
                <GlassHubAction
                  href="/feed"
                  icon={<Radio size={21} />}
                  eyebrow="hub"
                  title="Feed UTTF"
                  description="Post e stream"
                  delay={0.08}
                />
                <GlassHubAction
                  href="/labs"
                  icon={<FlaskConical size={22} />}
                  eyebrow="workshop"
                  title="Labs"
                  description="Workshop e attività"
                  delay={0.16}
                />
              </div>
            </div>

          </motion.div>
        </section>
        
          {/* NUCLEO 3D SOPRA LA SEZIONE NEWS */}
          <div
            className="relative isolate flex w-full justify-center overflow-visible px-0 pb-20 pt-0 mb-8 md:px-4 md:pb-6 md:pt-2 md:mb-20"
            onPointerMove={updateLogoPointer}
            onPointerLeave={resetLogoPointer}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-[48%] -z-10 h-[32rem] w-[170vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,145,77,0.18)_0%,rgba(255,145,77,0.1)_28%,rgba(12,7,4,0.2)_52%,transparent_78%)] blur-xl md:hidden"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-[48%] -z-10 h-[23rem] w-[108vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.06),rgba(255,145,77,0.08)_34%,transparent_72%)] blur-2xl md:hidden"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-[-32vw] -top-36 bottom-[-12rem] -z-10 hidden bg-[radial-gradient(circle_at_50%_42%,rgba(255,145,77,0.18),rgba(255,145,77,0.07)_28%,rgba(0,0,0,0.38)_56%,transparent_82%),linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.44)_18%,rgba(0,0,0,0.54)_68%,transparent_100%)] md:block"
              style={{
                maskImage: 'linear-gradient(to bottom, transparent 0%, black 16%, black 84%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 16%, black 84%, transparent 100%)',
              }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-[-18vw] -top-20 bottom-[-6rem] -z-10 hidden bg-[radial-gradient(ellipse_at_center,rgba(38,69,97,0.09),transparent_58%)] blur-2xl md:block"
            />
            <div
              ref={logoSceneRef}
              className="relative h-[500px] w-full max-w-[760px] sm:h-[540px] md:h-[640px]"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-[47%] hidden h-[72%] w-[112%] rounded-full border border-white/10 opacity-60 transition-transform duration-150 ease-out md:block"
                style={{
                  transform: 'translate(calc(-50% + var(--pointer-x, 0) * -18px), calc(-50% + var(--pointer-y, 0) * -12px)) rotateX(66deg) rotateZ(-8deg)',
                  boxShadow: '0 0 42px rgba(255,145,77,0.08), inset 0 0 32px rgba(255,255,255,0.04)',
                }}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-[47%] hidden h-[58%] w-[92%] rounded-full border border-[#FF914D]/18 opacity-70 transition-transform duration-150 ease-out md:block"
                style={{
                  transform: 'translate(calc(-50% + var(--pointer-x, 0) * 16px), calc(-50% + var(--pointer-y, 0) * 10px)) rotateX(58deg) rotateZ(16deg)',
                  boxShadow: '0 0 36px rgba(255,145,77,0.12)',
                }}
              />
              {[0, 1].map((dot) => (
                <motion.div
                  key={`orbit-dot-${dot}`}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 top-[47%] h-px origin-left"
                  style={{
                    width: dot === 0 ? 260 : 340,
                    transform: `translate(calc(var(--pointer-x, 0) * ${dot === 0 ? -8 : 10}px), calc(var(--pointer-y, 0) * ${dot === 0 ? -5 : 7}px)) rotateX(${dot === 0 ? 66 : 58}deg)`,
                  }}
                  animate={{ rotate: dot === 0 ? 360 : -360 }}
                  transition={{ duration: dot === 0 ? 22 : 34, repeat: Infinity, ease: 'linear' }}
                >
                  <span className="absolute right-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[#FF914D] shadow-[0_0_18px_rgba(255,145,77,0.75)]" />
                </motion.div>
              ))}
              {[0, 1, 2, 3].map((ring) => (
                <motion.div
                  key={ring}
                  aria-hidden="true"
                  className="absolute left-1/2 top-1/2"
                  style={{
                    width: `${260 + ring * 82}px`,
                    height: `${260 + ring * 82}px`,
                    marginLeft: `${-(260 + ring * 82) / 2}px`,
                    marginTop: `${-(260 + ring * 82) / 2}px`,
                  }}
                  animate={{ rotate: ring % 2 === 0 ? 360 : -360 }}
                  transition={{
                    duration: 28 + ring * 8,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                >
                  <div
                    className="h-full w-full rounded-full border"
                    style={{
                      borderColor: ring === 1 ? 'rgba(255,145,77,0.52)' : 'rgba(255,145,77,0.24)',
                      transform: `rotateX(${62 + ring * 4}deg) rotateZ(${ring * 18}deg)`,
                      boxShadow: ring === 1
                        ? '0 0 34px rgba(255,145,77,0.18), inset 0 0 24px rgba(255,145,77,0.16)'
                        : '0 0 24px rgba(255,145,77,0.08), inset 0 0 18px rgba(255,145,77,0.08)',
                    }}
                  />
                </motion.div>
              ))}

              <RevealAction
                href="/team"
                icon={<Users size={20} />}
                eyebrow="team"
                label="Conosci il nostro team"
                compactLabel="Team"
                hint="chi siamo"
                className="absolute left-[2%] top-[10%] z-40 sm:left-[7%] md:left-[5%] md:top-[20%]"
                delay={0.9}
              />

              <RevealAction
                href="/galleria"
                icon={<ImageIcon size={20} />}
                eyebrow="arte"
                label="Arte a KM 0"
                compactLabel="KM0"
                hint="vetrina"
                className="absolute right-[2%] top-[10%] z-40 sm:right-[7%] md:right-[5%] md:top-[20%]"
                reverse
                delay={1.2}
              />

              <RevealAction
                onClick={() => setIsMapOpen(true)}
                icon={<MapPin size={20} />}
                eyebrow="map"
                label="Vieni a trovarci"
                compactLabel="Mappa"
                hint="posizione"
                className="absolute bottom-[3%] left-1/2 z-40 md:bottom-[6%]"
                center
                delay={1.55}
              />

              <div
                className="absolute left-1/2 top-[47%] grid aspect-square w-[292px] place-items-center transition-transform duration-150 ease-out sm:w-[368px] md:top-[48%] md:w-[460px]"
                style={{
                  transform: 'translate(-50%, -50%) perspective(1200px) rotateX(calc(var(--pointer-y, 0) * -5deg)) rotateY(calc(var(--pointer-x, 0) * 7deg))',
                  transformStyle: 'preserve-3d',
                }}
              >
              <motion.div
                className="relative grid h-full w-full place-items-center overflow-hidden rounded-full border border-[#FF914D]/32 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.42),transparent_13%),radial-gradient(circle_at_72%_76%,rgba(255,145,77,0.42),transparent_30%),radial-gradient(circle_at_48%_45%,rgba(255,145,77,0.28),transparent_44%),radial-gradient(circle_at_center,rgba(255,145,77,0.34),rgba(72,30,17,0.86)_56%,rgba(7,5,4,0.95))] shadow-[0_46px_90px_rgba(0,0,0,0.72),0_0_96px_rgba(255,145,77,0.34),inset_0_0_68px_rgba(255,255,255,0.08),inset_0_0_100px_rgba(255,145,77,0.22),inset_24px_22px_42px_rgba(255,255,255,0.1),inset_-30px_-34px_58px_rgba(0,0,0,0.54)] backdrop-blur-md"
                animate={{
                  scale: [1, 1.015, 1],
                }}
                transition={{
                  duration: 7.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <div className="absolute inset-[-18%] rounded-full border border-[#FF914D]/34 [transform:rotateX(72deg)_translateZ(20px)]" />
                <div className="absolute inset-[-8%] rounded-full border border-[#FF914D]/18 [transform:rotateX(48deg)_rotateZ(-18deg)]" />
                <div className="absolute inset-0 rounded-full bg-[linear-gradient(135deg,rgba(255,255,255,0.24),transparent_31%,rgba(0,0,0,0.43)_76%)]" />
                <div className="absolute inset-[2.5%] rounded-full border border-white/20 shadow-[inset_0_0_28px_rgba(255,255,255,0.08)]" />
                <div className="absolute left-[14%] top-[10%] h-[34%] w-[30%] rotate-[-18deg] rounded-full bg-white/20 blur-xl" />
                <div className="absolute right-[18%] bottom-[18%] h-[18%] w-[26%] rotate-[-22deg] rounded-full bg-[#FF914D]/16 blur-lg" />
                <div className="absolute left-[24%] top-[23%] h-px w-[58%] rotate-[-7deg] bg-gradient-to-r from-transparent via-white/32 to-transparent" />
                <div className="absolute left-[18%] top-[32%] h-px w-[68%] rotate-[11deg] bg-gradient-to-r from-transparent via-[#FF914D]/16 to-transparent" />
                <div className="absolute inset-7 rounded-full bg-black/10 shadow-[inset_0_0_48px_rgba(255,145,77,0.2),inset_0_0_26px_rgba(255,255,255,0.05)]" />
                <motion.img
                  src="/icons/homelogo.png"
                  alt="UTTF Home Logo"
                  className="relative z-10 mt-[-18%] w-[58%] object-contain drop-shadow-[0_22px_30px_rgba(0,0,0,0.88)] transition-transform duration-150 ease-out sm:w-[60%] md:w-[62%]"
                  style={{
                    transform: 'translate3d(calc(var(--pointer-x, 0) * 14px), calc(var(--pointer-y, 0) * 10px), 0)',
                  }}
                  animate={{
                    opacity: [0.88, 1, 0.88],
                  }}
                  transition={{
                    duration: 5.8,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              </motion.div>
              </div>
            </div>
          </div>

        {/* NEWS FEED SECTION */}
        <section className="w-full py-32 mt-10 border-t border-white/5 bg-transparent">
          
          <div className="flex flex-col items-center mb-20 text-center">
             <span className="text-[#FF914D] font-mono text-[10px] tracking-[0.6em] uppercase mb-4">QUA SOTTO GLI ULTIMI AGGIORNAMENTI</span>
             <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter">UTTF_<span className="text-[#FF914D]">NEWS</span></h2>
          </div>

          <div className="mx-auto grid w-full max-w-[24rem] grid-cols-1 gap-8 md:max-w-[49rem] md:grid-cols-2 lg:max-w-none lg:grid-cols-3">
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="h-80 glass-panel animate-pulse flex items-center justify-center border border-white/5 bg-white/5 rounded-3xl">
                  <Loader2 className="animate-spin text-zinc-800" size={32} />
                </div>
              ))
            ) : (
              visiblePublications.map((post) => {
                const imageUrl = getPublicationMediaUrl(post.image_url);
                return (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }} 
                    whileInView={{ opacity: 1, scale: 1 }} 
                    viewport={{ once: true }} 
                    key={post.id} 
                    onClick={() => setSelectedPost({...post, image_url: imageUrl})} 
                    className="glass-panel group overflow-hidden flex flex-col border border-white/5 bg-[#0a0a0a] rounded-[2rem] hover:border-[#FF914D]/30 transition-all duration-500 cursor-pointer"
                  >
                    <div className="p-5 flex items-center gap-3 border-b border-white/5">
                      <div className="w-6 h-6 rounded-full bg-[#FF914D] flex items-center justify-center text-black text-[8px] font-black italic">UT</div>
                      <span className="text-[10px] font-bold uppercase tracking-widest italic">{post.title}</span>
                    </div>
                    <div className="relative aspect-square w-full overflow-hidden bg-zinc-900">
                      {isVideo(imageUrl) ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <video src={imageUrl} className="w-full h-full object-cover opacity-60" muted />
                          <Play className="absolute text-white/50 group-hover:text-[#FF914D] transition-colors" size={40} fill="currentColor" />
                        </div>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element -- Post media can come from Supabase paths outside the static image allowlist.
                        <img src={imageUrl} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out" />
                      )}
                    </div>
                    <div className="p-6">
                      <p className="text-zinc-500 text-[11px] uppercase tracking-wide leading-relaxed font-mono line-clamp-2">{post.description || "FACTORY_LOG_ENTRY_ALPHA"}</p>
                      <div className="flex justify-between items-center pt-4 mt-4 border-t border-white/5 font-mono text-[8px] text-zinc-700">
                        <span>{new Date(post.created_at).toLocaleDateString('it-IT')}</span>
                        <Maximize2 size={12} className="group-hover:text-[#FF914D] transition-colors" />
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </section>
      </main>

      {/* MODALS */}
      <AnimatePresence>
        {selectedPost && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 backdrop-blur-md bg-black/80" onClick={() => setSelectedPost(null)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="relative max-w-4xl w-full bg-zinc-950 rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl flex flex-col md:flex-row max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setSelectedPost(null)} className="absolute top-5 right-5 z-10 p-2 bg-black/50 text-white rounded-full hover:text-[#FF914D] transition-all"><X size={24} /></button>
              <div className="w-full md:w-3/5 bg-black flex items-center justify-center">
                {isVideo(selectedPost.image_url) ? (
                  <video src={selectedPost.image_url} controls autoPlay className="w-full max-h-[80vh]" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- Modal preview preserves exact Supabase media URL and sizing.
                  <img src={selectedPost.image_url} className="w-full h-full object-contain" alt="" />
                )}
              </div>
              <div className="w-full md:w-2/5 p-8 flex flex-col bg-zinc-950">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-full bg-[#FF914D] flex items-center justify-center text-black font-black italic text-xs">UT</div>
                  <h3 className="text-lg font-black italic uppercase tracking-tighter">{selectedPost.title}</h3>
                </div>
                <p className="text-zinc-400 text-sm font-mono uppercase leading-relaxed">{selectedPost.description || "Nessuna specifica tecnica registrata."}</p>
                <div className="pt-6 mt-6 border-t border-white/5 text-[9px] font-mono text-zinc-600 uppercase">Log_Date: {new Date(selectedPost.created_at).toLocaleString('it-IT')}</div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMapOpen && <MapSection isOpen={isMapOpen} onClose={() => setIsMapOpen(false)} />}
      </AnimatePresence>

      <footer className="py-24 text-center opacity-30">
        <p className="text-[9px] font-mono uppercase tracking-[1em] text-zinc-600">UTTF_SYSTEM_V.2.0</p>
      </footer>
    </div>
  );
}
