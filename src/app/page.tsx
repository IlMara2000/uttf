'use client'

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence, Variants, useMotionValue, useSpring, useTransform } from 'framer-motion';
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

const SHAKE_DURATION_MS = 3600;

type ShakeIconKey = 'feed' | 'labs' | 'team' | 'gallery' | 'map';
type ShakePoint = readonly [number, number];
type MotionPermissionEvent = typeof DeviceMotionEvent & {
  requestPermission?: () => Promise<PermissionState>;
};

type ShakeAction = {
  key: ShakeIconKey;
  eyebrow: string;
  label: string;
  hint: string;
  home: ShakePoint;
  path: readonly [ShakePoint, ShakePoint, ShakePoint, ShakePoint];
};

const SHAKE_ACTIONS: readonly ShakeAction[] = [
  {
    key: 'feed',
    eyebrow: 'hub',
    label: 'Feed UTTF',
    hint: 'post + stream',
    home: [40, 50],
    path: [[14, 19], [82, 28], [21, 78], [62, 36]],
  },
  {
    key: 'labs',
    eyebrow: 'lab',
    label: 'Rap Lab',
    hint: 'lab rap e call',
    home: [60, 50],
    path: [[84, 16], [18, 34], [78, 76], [39, 27]],
  },
  {
    key: 'team',
    eyebrow: 'team',
    label: 'Team',
    hint: 'chi siamo',
    home: [33, 70],
    path: [[23, 88], [74, 18], [12, 52], [57, 82]],
  },
  {
    key: 'gallery',
    eyebrow: 'arte',
    label: 'KM0',
    hint: 'vetrina',
    home: [67, 70],
    path: [[78, 86], [17, 23], [88, 48], [43, 81]],
  },
  {
    key: 'map',
    eyebrow: 'map',
    label: 'Mappa',
    hint: 'posizione',
    home: [50, 83],
    path: [[50, 15], [12, 62], [88, 66], [48, 31]],
  },
];

function ShakeActionIcon({ icon }: { icon: ShakeIconKey }) {
  switch (icon) {
    case 'feed':
      return <Radio size={18} />;
    case 'labs':
      return <FlaskConical size={18} />;
    case 'team':
      return <Users size={18} />;
    case 'gallery':
      return <ImageIcon size={18} />;
    case 'map':
      return <MapPin size={18} />;
  }
}

function ShakeChaosOverlay() {
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[120] overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
    >
      <svg className="absolute inset-0 h-full w-full">
        {SHAKE_ACTIONS.map((action, index) => {
          const points = [action.home, ...action.path, action.home];
          const xs = points.map(([x]) => `${x}%`);
          const ys = points.map(([, y]) => `${y}%`);

          return (
            <motion.line
              key={`${action.key}-wire`}
              x1="50%"
              y1="58%"
              x2={`${action.home[0]}%`}
              y2={`${action.home[1]}%`}
              stroke="#FF914D"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeDasharray="7 9"
              initial={{ opacity: 0 }}
              animate={{ x2: xs, y2: ys, opacity: [0, 0.72, 0.62, 0.68, 0.5, 0] }}
              transition={{
                duration: SHAKE_DURATION_MS / 1000,
                ease: 'easeInOut',
                repeat: 0,
                times: [0, 0.18, 0.38, 0.62, 0.82, 1],
                delay: index * 0.03,
              }}
            />
          );
        })}
      </svg>

      {SHAKE_ACTIONS.map((action, index) => {
        const points = [action.home, ...action.path, action.home];
        const xs = points.map(([x]) => `${x}%`);
        const ys = points.map(([, y]) => `${y}%`);

        return (
          <motion.div
            key={action.key}
            className="fixed flex h-12 w-36 items-center gap-2 rounded-full border border-[#FF914D]/65 bg-black/70 px-2 text-white shadow-[0_20px_45px_rgba(0,0,0,0.7),0_0_34px_rgba(255,145,77,0.24),inset_0_0_18px_rgba(255,145,77,0.12)] backdrop-blur-xl"
            style={{ x: '-50%', y: '-50%', left: `${action.home[0]}%`, top: `${action.home[1]}%` }}
            initial={{ opacity: 0, scale: 0.72, rotate: 0 }}
            animate={{
              left: xs,
              top: ys,
              opacity: [0, 1, 1, 1, 0.96, 0],
              rotate: [0, -18, 16, -10, 12, 0],
              scale: [0.72, 1.06, 0.94, 1.08, 0.98, 0.72],
            }}
            transition={{
              duration: SHAKE_DURATION_MS / 1000,
              ease: 'easeInOut',
              repeat: 0,
              times: [0, 0.18, 0.38, 0.62, 0.82, 1],
              delay: index * 0.03,
            }}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#FF914D]/55 bg-[#FF914D]/18 text-[#FF914D]">
              <ShakeActionIcon icon={action.key} />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="font-mono text-[7px] uppercase tracking-[0.28em] text-[#FF914D]/80">{action.eyebrow}</span>
              <span className="truncate text-[11px] font-black uppercase italic leading-tight">{action.label}</span>
              <span className="truncate font-mono text-[7px] uppercase tracking-[0.08em] text-white/52">{action.hint}</span>
            </span>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

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
    'group relative flex h-16 w-[9.9rem] items-center gap-3 overflow-hidden rounded-full border border-[#FF914D]/42 bg-black/50 px-2.5 text-white shadow-[0_20px_50px_rgba(0,0,0,0.62),inset_0_1px_0_rgba(255,255,255,0.15),inset_0_0_28px_rgba(255,145,77,0.1)] backdrop-blur-2xl sm:w-44 md:h-[4.35rem] md:w-[12.5rem]',
    'transition-[width,border-color,background-color,box-shadow] duration-500 ease-out hover:w-[11.75rem] hover:border-[#FF914D]/80 hover:bg-[#FF914D]/12 hover:shadow-[0_24px_62px_rgba(0,0,0,0.7),0_0_42px_rgba(255,145,77,0.26),inset_0_0_34px_rgba(255,145,77,0.16)] active:w-[11.75rem] focus-visible:w-[11.75rem] sm:hover:w-60 sm:active:w-60 sm:focus-visible:w-60 md:hover:w-72 md:active:w-72 md:focus-visible:w-72',
    reverse ? 'flex-row-reverse text-right' : 'text-left',
  ].join(' ');

  const content = (
    <>
      <span className="pointer-events-none absolute inset-y-2 left-3 w-10 rounded-full bg-[#FF914D]/12 blur-xl transition-opacity duration-500 group-hover:opacity-100" />
      <motion.span
        className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#FF914D]/45 bg-[#FF914D]/16 text-[#FF914D] shadow-[inset_0_0_20px_rgba(255,145,77,0.18)] md:h-12 md:w-12"
        animate={{ rotate: [0, -5, 5, 0], scale: [1, 1.04, 1] }}
        transition={{ duration: 4.4, repeat: Infinity, ease: 'easeInOut', delay }}
      >
        <span className="absolute inset-1 rounded-full bg-white/10 blur-[2px]" />
        <span className="relative z-10">{icon}</span>
      </motion.span>
      <span className={`relative z-10 flex min-w-0 flex-1 flex-col ${reverse ? 'items-end' : 'items-start'}`}>
        <span className="mb-0.5 w-full truncate whitespace-nowrap font-mono text-[7px] uppercase tracking-[0.34em] text-[#FF914D]/72">
          {eyebrow}
        </span>
        <span className="w-full truncate whitespace-nowrap text-[11px] font-black uppercase italic leading-none tracking-tight text-white md:text-xs">
          <span className="group-hover:hidden group-active:hidden group-focus-visible:hidden">{compactLabel}</span>
          <span className="hidden group-hover:inline group-active:inline group-focus-visible:inline">{label}</span>
        </span>
        <span className="mt-1 w-full truncate whitespace-nowrap font-mono text-[7px] uppercase tracking-[0.1em] text-white/50 transition-colors duration-500 group-hover:text-white/72">
          {hint}
        </span>
      </span>
    </>
  );

  const outerClassName = ['pointer-events-auto inline-flex', className].filter(Boolean).join(' ');
  const motionProps = {
    className: outerClassName,
    style: center ? { x: '-50%' } : undefined,
    animate: { y: [0, -5, 0] },
    transition: { duration: 5.2, repeat: Infinity, ease: 'easeInOut' as const, delay },
    whileHover: { scale: 1.035 },
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
  const [isShakeMode, setIsShakeMode] = useState(false);
  const [shakeBurstId, setShakeBurstId] = useState(0);
  const shakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastShakeAtRef = useRef(0);
  const lastMotionMagnitudeRef = useRef<number | null>(null);

  const PROJECT_ID = 'oieqtrfeoyfabyjirrqa'; 
  const BUCKET_NAME = 'publications'; 

  const introPointerX = useMotionValue(0);
  const introPointerY = useMotionValue(0);
  const introTextX = useSpring(useTransform(introPointerX, [-0.5, 0.5], [-12, 12]), { stiffness: 120, damping: 22 });
  const introTextY = useSpring(useTransform(introPointerY, [-0.5, 0.5], [-8, 8]), { stiffness: 120, damping: 22 });
  const introRotateX = useSpring(useTransform(introPointerY, [-0.5, 0.5], [3, -3]), { stiffness: 130, damping: 24 });
  const introRotateY = useSpring(useTransform(introPointerX, [-0.5, 0.5], [-4, 4]), { stiffness: 130, damping: 24 });

  const logoPointerX = useMotionValue(0);
  const logoPointerY = useMotionValue(0);
  const logoRotateX = useSpring(useTransform(logoPointerY, [-0.5, 0.5], [11, -11]), { stiffness: 110, damping: 20 });
  const logoRotateY = useSpring(useTransform(logoPointerX, [-0.5, 0.5], [-15, 15]), { stiffness: 110, damping: 20 });
  const logoImageX = useSpring(useTransform(logoPointerX, [-0.5, 0.5], [-22, 22]), { stiffness: 120, damping: 20 });
  const logoImageY = useSpring(useTransform(logoPointerY, [-0.5, 0.5], [-16, 16]), { stiffness: 120, damping: 20 });

  const triggerShakeBurst = useCallback(() => {
    setShakeBurstId((current) => current + 1);
    setIsShakeMode(true);

    if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
    shakeTimeoutRef.current = setTimeout(() => {
      setIsShakeMode(false);
      shakeTimeoutRef.current = null;
    }, SHAKE_DURATION_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const motionEvent = window.DeviceMotionEvent as MotionPermissionEvent | undefined;
    let motionAttached = false;
    let permissionRequested = false;

    const handleMotion = (event: DeviceMotionEvent) => {
      const acceleration = event.accelerationIncludingGravity ?? event.acceleration;
      if (!acceleration) return;

      const x = acceleration.x ?? 0;
      const y = acceleration.y ?? 0;
      const z = acceleration.z ?? 0;
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const previousMagnitude = lastMotionMagnitudeRef.current ?? magnitude;
      const delta = Math.abs(magnitude - previousMagnitude);
      const now = Date.now();

      lastMotionMagnitudeRef.current = magnitude;

      if (((delta > 12 && magnitude > 18) || magnitude > 32) && now - lastShakeAtRef.current > 1800) {
        lastShakeAtRef.current = now;
        triggerShakeBurst();
      }
    };

    const attachMotion = () => {
      if (motionAttached) return;
      window.addEventListener('devicemotion', handleMotion, { passive: true });
      motionAttached = true;
    };

    const requestMotionAccess = () => {
      if (permissionRequested) return;
      permissionRequested = true;

      if (typeof motionEvent?.requestPermission === 'function') {
        motionEvent.requestPermission()
          .then((permission) => {
            if (permission === 'granted') attachMotion();
          })
          .catch(() => {});
        return;
      }

      attachMotion();
    };

    if (typeof motionEvent?.requestPermission === 'function') {
      window.addEventListener('pointerdown', requestMotionAccess, { passive: true, once: true });
      window.addEventListener('touchstart', requestMotionAccess, { passive: true, once: true });
    } else {
      attachMotion();
    }

    return () => {
      window.removeEventListener('pointerdown', requestMotionAccess);
      window.removeEventListener('touchstart', requestMotionAccess);
      if (motionAttached) window.removeEventListener('devicemotion', handleMotion);
    };
  }, [triggerShakeBurst]);

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

  const isVideo = (url: string) => url?.match(/\.(mp4|webm|ogg|mov)$/i);

  const visiblePublications = publications.length > 0 ? publications : FALLBACK_PUBLICATIONS;

  const getPublicationMediaUrl = (imageUrl: string) => {
    if (!imageUrl) return FALLBACK_PUBLICATIONS[0].image_url;
    if (imageUrl.startsWith('http') || imageUrl.startsWith('/')) return imageUrl;
    return `https://${PROJECT_ID}.supabase.co/storage/v1/object/public/${BUCKET_NAME}/${imageUrl}`;
  };

  const updatePointer = (
    event: PointerEvent<HTMLDivElement>,
    pointerX: typeof introPointerX,
    pointerY: typeof introPointerY
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - rect.left) / rect.width - 0.5);
    pointerY.set((event.clientY - rect.top) / rect.height - 0.5);
  };

  // Tipizzazione esplicita come Variants per risolvere l'errore di build
  const pulseGlow: Variants = {
    animate: {
      boxShadow: [
        "0 0 20px 0px rgba(255, 145, 77, 0.2)",
        "0 0 40px 10px rgba(255, 145, 77, 0.4)",
        "0 0 20px 0px rgba(255, 145, 77, 0.2)"
      ],
      transition: {
        duration: 3,
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
            <h1 className="hero-title text-[13vw] leading-[0.86] text-center mb-10 font-black uppercase italic tracking-tighter sm:text-[14vw] md:mb-16 md:text-[8vw]">
              Under The<br />
              Tower<br />
              <span style={{ color: '#FF914D' }}>Factory</span>
            </h1>

            {/* SEZIONE COS'È - GLASSMORPHISM RESTYLE */}
            <motion.div 
              className="relative isolate w-full max-w-5xl mb-5 overflow-hidden rounded-[1.65rem] border border-[#FF914D]/45 bg-black/70 px-5 py-7 shadow-[0_24px_70px_rgba(0,0,0,0.68),0_0_58px_rgba(255,145,77,0.18),inset_0_1px_0_rgba(255,255,255,0.16),inset_18px_16px_34px_rgba(255,255,255,0.045),inset_-20px_-24px_46px_rgba(0,0,0,0.46)] backdrop-blur-2xl sm:p-8 md:mb-8 md:rounded-[2rem] md:p-14 md:shadow-[0_42px_120px_rgba(0,0,0,0.74),0_0_110px_rgba(255,145,77,0.26),inset_0_1px_0_rgba(255,255,255,0.18),inset_24px_20px_46px_rgba(255,255,255,0.06),inset_-28px_-32px_62px_rgba(0,0,0,0.48)]"
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.5 }}
              variants={pulseGlow}
              animate="animate"
              onPointerMove={(event) => updatePointer(event, introPointerX, introPointerY)}
              onPointerLeave={() => {
                introPointerX.set(0);
                introPointerY.set(0);
              }}
              style={{
                rotateX: introRotateX,
                rotateY: introRotateY,
                transformPerspective: 1100,
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Grain Texture Overlay */}
              <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_34%_24%,rgba(255,255,255,0.2),transparent_18%),radial-gradient(circle_at_74%_72%,rgba(255,145,77,0.22),transparent_31%),radial-gradient(circle_at_center,rgba(255,145,77,0.1),rgba(42,22,18,0.72)_56%,rgba(0,0,0,0.9))]" />
              <div className="absolute inset-0 rounded-[inherit] bg-[url('/images/noise.svg')] opacity-20 mix-blend-soft-light pointer-events-none" />
              <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/55 to-transparent" />
              <div className="pointer-events-none absolute -left-24 -top-28 hidden h-72 w-72 rounded-full bg-white/12 blur-3xl md:block" />
              <div className="pointer-events-none absolute -right-28 bottom-0 hidden h-80 w-80 rounded-full bg-[#FF914D]/24 blur-3xl md:block" />
              <div className="pointer-events-none absolute inset-2 rounded-[1.25rem] border border-white/12 shadow-[inset_0_0_38px_rgba(255,255,255,0.05)] md:inset-4 md:rounded-[1.55rem]" />
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
                style={{
                  x: introTextX,
                  y: introTextY,
                  transformStyle: 'preserve-3d',
                  translateZ: 44,
                }}
              >
                <h3 className="text-[1.45rem] leading-tight md:text-4xl font-black uppercase italic mb-5 md:mb-7 text-center tracking-tighter text-[#FF914D] drop-shadow-[0_0_22px_rgba(255,145,77,0.28)]">
                  COS&apos;È UNDER THE TOWER?
                </h3>
                <p className="text-white text-[10.5px] md:text-lg uppercase text-center tracking-[0.1em] md:tracking-[0.14em] font-sans font-medium leading-[1.8] md:leading-relaxed max-w-3xl mx-auto opacity-90">
                  UN PROGETTO CREATIVO CHE NASCE CON L&apos;OBIETTIVO DI UNIRE PERSONE, IDEE E PASSIONI ALL&apos;INTERNO DI UN ECOSISTEMA DINAMICO. UN COMMUNITY HUB DOVE ARTE, INTRATTENIMENTO E INGEGNO SI INCONTRANO PER CREARE ESPERIENZE IMMERSIVE E COINVOLGENTI.
                </p>
              </motion.div>
            </motion.div>

            <div className="relative z-20 mb-3 flex w-full max-w-5xl flex-col items-center md:mb-8">
              <div className="h-8 w-px bg-gradient-to-b from-[#FF914D]/55 via-[#FF914D]/18 to-transparent md:h-10" />
              <div className="relative flex w-full max-w-[22rem] items-center justify-center gap-2 px-1 sm:max-w-xl sm:gap-6">
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-px w-[72%] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#FF914D]/28 to-transparent" />
                <RevealAction
                  href="/feed"
                  icon={<Radio size={20} />}
                  eyebrow="hub"
                  label="Under The Tower"
                  compactLabel="Feed UTTF"
                  hint="post + stream"
                  className="justify-self-end"
                  delay={0.15}
                />
                <RevealAction
                  href="/labs"
                  icon={<FlaskConical size={20} />}
                  eyebrow="lab"
                  label="RAPF*CKTORY"
                  compactLabel="Rap Lab"
                  hint="lab rap e call"
                  reverse
                  delay={0.55}
                />
              </div>
            </div>
          </motion.div>
        </section>
        
          {/* NUCLEO 3D SOPRA LA SEZIONE NEWS */}
          <div className="relative isolate flex w-full justify-center overflow-visible px-0 pb-20 pt-0 mb-8 md:px-4 md:pb-6 md:pt-2 md:mb-20">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-[48%] -z-10 h-[34rem] w-[185vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,145,77,0.24)_0%,rgba(255,145,77,0.13)_26%,rgba(12,7,4,0.24)_52%,transparent_78%)] blur-2xl md:hidden"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-[48%] -z-10 h-[25rem] w-[118vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.08),rgba(255,145,77,0.1)_34%,transparent_72%)] blur-[54px] md:hidden"
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
              className="pointer-events-none absolute inset-x-[-18vw] -top-20 bottom-[-6rem] -z-10 hidden bg-[radial-gradient(ellipse_at_center,rgba(38,69,97,0.12),transparent_58%)] blur-3xl md:block"
            />
            <div
              className="relative h-[430px] w-full max-w-[680px] sm:h-[500px] md:h-[580px]"
              onPointerMove={(event) => updatePointer(event, logoPointerX, logoPointerY)}
              onPointerLeave={() => {
                logoPointerX.set(0);
                logoPointerY.set(0);
              }}
            >
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
                    duration: 18 + ring * 6,
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
                        ? '0 0 58px rgba(255,145,77,0.26), inset 0 0 38px rgba(255,145,77,0.22)'
                        : '0 0 40px rgba(255,145,77,0.12), inset 0 0 28px rgba(255,145,77,0.1)',
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
                className="absolute left-0 top-[7%] z-40 sm:left-5 md:left-10 md:top-[25%]"
                delay={0.9}
              />

              <RevealAction
                href="/galleria"
                icon={<ImageIcon size={20} />}
                eyebrow="arte"
                label="Arte a KM 0"
                compactLabel="KM0"
                hint="vetrina"
                className="absolute right-0 top-[7%] z-40 sm:right-5 md:right-10 md:top-[25%]"
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
                className="absolute bottom-[3%] left-1/2 z-40 md:bottom-[8%]"
                center
                delay={1.55}
              />

              <motion.div
                className="absolute left-1/2 top-[47%] grid aspect-square w-[286px] place-items-center rounded-full border border-[#FF914D]/38 bg-[radial-gradient(circle_at_34%_25%,rgba(255,255,255,0.36),transparent_15%),radial-gradient(circle_at_68%_74%,rgba(255,145,77,0.35),transparent_27%),radial-gradient(circle_at_center,rgba(255,145,77,0.29),rgba(62,32,22,0.88)_55%,rgba(0,0,0,0.9))] shadow-[0_58px_120px_rgba(0,0,0,0.78),0_0_160px_rgba(255,145,77,0.34),inset_0_0_102px_rgba(255,145,77,0.2),inset_28px_24px_52px_rgba(255,255,255,0.09),inset_-34px_-38px_70px_rgba(0,0,0,0.54)] backdrop-blur-xl sm:w-[360px] md:top-1/2 md:w-[460px]"
                style={{
                  x: '-50%',
                  y: '-50%',
                  rotateX: logoRotateX,
                  rotateY: logoRotateY,
                  transformPerspective: 1200,
                  transformStyle: 'preserve-3d',
                }}
                animate={{
                  scale: [1, 1.025, 1],
                  boxShadow: [
                    '0 58px 120px rgba(0,0,0,0.78),0 0 112px rgba(255,145,77,0.22),inset 0 0 88px rgba(255,145,77,0.16)',
                    '0 72px 150px rgba(0,0,0,0.84),0 0 172px rgba(255,145,77,0.4),inset 0 0 118px rgba(255,145,77,0.26)',
                    '0 58px 120px rgba(0,0,0,0.78),0 0 112px rgba(255,145,77,0.22),inset 0 0 88px rgba(255,145,77,0.16)',
                  ],
                }}
                transition={{
                  duration: 5.8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <div className="absolute inset-[-18%] rounded-full border border-[#FF914D]/24 [transform:rotateX(72deg)_translateZ(20px)]" />
                <div className="absolute inset-[-8%] rounded-full border border-white/8 [transform:rotateX(48deg)_rotateZ(-18deg)]" />
                <div className="absolute inset-0 rounded-full bg-[linear-gradient(135deg,rgba(255,255,255,0.2),transparent_33%,rgba(0,0,0,0.38)_76%)]" />
                <div className="absolute left-[17%] top-[14%] h-[31%] w-[29%] rounded-full bg-white/18 blur-xl" />
                <div className="absolute left-[28%] top-[26%] h-px w-[52%] rotate-[-6deg] bg-gradient-to-r from-transparent via-white/22 to-transparent" />
                <div className="absolute inset-7 rounded-full bg-black/12 shadow-[inset_0_0_58px_rgba(255,145,77,0.24)]" />
                <motion.img
                  src="/icons/homelogo.png"
                  alt="UTTF Home Logo"
                  className="relative z-10 w-[78%] object-contain drop-shadow-[0_26px_34px_rgba(0,0,0,0.88)] sm:w-[84%] md:w-[88%]"
                  style={{
                    x: logoImageX,
                    y: logoImageY,
                    translateZ: 72,
                    transformStyle: 'preserve-3d',
                  }}
                  animate={{
                    opacity: [0.88, 1, 0.88],
                    filter: [
                      'drop-shadow(0 18px 26px rgba(0,0,0,0.82)) drop-shadow(0 0 8px rgba(255,255,255,0.12))',
                      'drop-shadow(0 22px 34px rgba(0,0,0,0.86)) drop-shadow(0 0 18px rgba(255,255,255,0.28))',
                      'drop-shadow(0 18px 26px rgba(0,0,0,0.82)) drop-shadow(0 0 8px rgba(255,255,255,0.12))',
                    ],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              </motion.div>
            </div>
          </div>

        {/* NEWS FEED SECTION */}
        <section className="w-full py-32 mt-10 border-t border-white/5 bg-transparent">
          
          <div className="flex flex-col items-center mb-20 text-center">
             <span className="text-[#FF914D] font-mono text-[10px] tracking-[0.6em] uppercase mb-4">QUA SOTTO GLI ULTIMI AGGIORNAMENTI</span>
             <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter">UTTF_<span className="text-[#FF914D]">NEWS</span></h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
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

      <AnimatePresence>
        {isShakeMode && <ShakeChaosOverlay key={shakeBurstId} />}
      </AnimatePresence>

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
