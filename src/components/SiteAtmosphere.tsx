'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
} from 'framer-motion';

const ambientNodes = [
  { left: '6%', top: '18%', size: 5, delay: 0.2, duration: 8.5 },
  { left: '17%', top: '74%', size: 3, delay: 1.1, duration: 7.8 },
  { left: '35%', top: '28%', size: 4, delay: 0.6, duration: 9.2 },
  { left: '51%', top: '82%', size: 6, delay: 1.7, duration: 8.9 },
  { left: '68%', top: '22%', size: 3, delay: 0.9, duration: 7.3 },
  { left: '82%', top: '62%', size: 5, delay: 1.4, duration: 9.7 },
  { left: '93%', top: '36%', size: 4, delay: 0.4, duration: 8.1 },
];

export default function SiteAtmosphere() {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const pointerX = useMotionValue(50);
  const pointerY = useMotionValue(38);
  const springX = useSpring(pointerX, { stiffness: 70, damping: 24, mass: 0.35 });
  const springY = useSpring(pointerY, { stiffness: 70, damping: 24, mass: 0.35 });
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.25 });
  const spotlight = useMotionTemplate`radial-gradient(circle at ${springX}% ${springY}%, rgba(255,145,77,0.18), rgba(255,145,77,0.07) 16%, transparent 36%)`;

  const isManagementRoute =
    pathname?.startsWith('/dashboard') ||
    pathname?.startsWith('/admin') ||
    pathname === '/login';

  useEffect(() => {
    if (prefersReducedMotion || isManagementRoute) return;

    const handlePointerMove = (event: PointerEvent) => {
      pointerX.set((event.clientX / window.innerWidth) * 100);
      pointerY.set((event.clientY / window.innerHeight) * 100);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [isManagementRoute, pointerX, pointerY, prefersReducedMotion]);

  if (isManagementRoute) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <motion.div
        className="absolute inset-0 mix-blend-screen"
        style={{ background: spotlight }}
      />
      <motion.div
        className="fixed left-0 top-0 z-[80] h-[2px] w-full origin-left bg-gradient-to-r from-transparent via-[#FF914D] to-white/80 shadow-[0_0_18px_rgba(255,145,77,0.72)]"
        style={{ scaleX: progress }}
      />
      <motion.div
        className="absolute left-1/2 top-[12%] h-[28rem] w-[28rem] -translate-x-1/2 rounded-full border border-[#FF914D]/10 blur-[0.4px]"
        animate={
          prefersReducedMotion
            ? undefined
            : {
                rotate: 360,
                scale: [1, 1.08, 1],
              }
        }
        transition={{ duration: 32, repeat: Infinity, ease: 'linear' }}
        style={{ transformStyle: 'preserve-3d' }}
      />
      <motion.div
        className="absolute -right-32 top-1/4 h-[34rem] w-[34rem] rounded-full border border-white/8"
        animate={
          prefersReducedMotion
            ? undefined
            : {
                rotate: -360,
                x: [0, -18, 0],
                y: [0, 24, 0],
              }
        }
        transition={{ duration: 44, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -left-40 bottom-8 h-[30rem] w-[30rem] rounded-full border border-[#FF914D]/12"
        animate={
          prefersReducedMotion
            ? undefined
            : {
                rotate: 360,
                x: [0, 24, 0],
                y: [0, -18, 0],
              }
        }
        transition={{ duration: 38, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,145,77,0.035)_50%,transparent_100%)] opacity-70" />
      <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.025)_0_1px,transparent_1px_82px)] opacity-35" />
      {!prefersReducedMotion &&
        ambientNodes.map((node) => (
          <motion.span
            key={`${node.left}-${node.top}`}
            className="absolute rounded-full bg-[#FF914D] shadow-[0_0_18px_rgba(255,145,77,0.8)]"
            style={{
              left: node.left,
              top: node.top,
              width: node.size,
              height: node.size,
            }}
            animate={{
              opacity: [0.15, 0.9, 0.15],
              y: [0, -18, 0],
              scale: [0.75, 1.35, 0.75],
            }}
            transition={{
              delay: node.delay,
              duration: node.duration,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
    </div>
  );
}
