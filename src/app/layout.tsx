import './globals.css';
import { Unbounded, Space_Grotesk, Geist_Mono } from 'next/font/google';
import MobileNav from '@/components/MobileNav';

const unbounded = Unbounded({ subsets: ['latin'], variable: '--font-display', weight: ['900'] });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-sans', weight: ['400', '500', '700'] });
const geist = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className="dark">
      <body className={`${spaceGrotesk.variable} ${unbounded.variable} ${geist.variable} font-sans text-white antialiased`}>
        <div className="relative min-h-screen">
          {children}
        </div>
        <MobileNav />
      </body>
    </html>
  );
}