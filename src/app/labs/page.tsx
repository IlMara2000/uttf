'use client'
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function LabsWIP() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
      <Link href="/" className="nav-tag absolute top-10 left-10 flex items-center gap-2">
        <ArrowLeft size={14} /> BACK
      </Link>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="hero-title text-6xl mb-4">LIVE_LABS</h1>
        <p className="text-orange-600 font-mono tracking-[0.5em] text-[10px] uppercase">Under Construction // Unit_03</p>
      </motion.div>
    </div>
  );
}