'use client'

import { motion } from 'framer-motion';

type ManagementBottomLogoProps = {
  className?: string;
};

export default function ManagementBottomLogo({ className = '' }: ManagementBottomLogoProps) {
  return (
    <div className={`flex justify-center mb-16 md:mb-20 px-4 ${className}`}>
      <motion.img
        src="/icons/homelogo.png"
        alt="UTTF Home Logo"
        className="w-full max-w-[300px] sm:max-w-[400px] md:max-w-[600px] aspect-square object-contain rounded-full"
        animate={{
          scale: [1, 1.02, 1],
          opacity: [0.85, 1, 0.85],
          boxShadow: [
            '0 0 0px 0px rgba(255, 145, 77, 0)',
            '0 0 60px 20px rgba(255, 145, 77, 0.15)',
            '0 0 0px 0px rgba(255, 145, 77, 0)',
          ],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  );
}
