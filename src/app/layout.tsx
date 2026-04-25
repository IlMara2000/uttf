import './globals.css';
import { Unbounded, Space_Grotesk, Geist_Mono } from 'next/font/google';
import MobileNav from '@/components/MobileNav';

const unbounded = Unbounded({ subsets: ['latin'], variable: '--font-display', weight: ['900'] });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-sans', weight: ['400', '500', '700'] });
const geist = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata = {
  title: 'UTTF | Urban Creative Core',
  description: 'Under The Tower Factory - Urban Art & Culture',
  icons: {
    icon: [
      { url: '/icons/favicon.ico' },
      { url: '/icons/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icons/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png' }],
  },
  manifest: '/icons/site.webmanifest',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className="dark">
      <body className={`${spaceGrotesk.variable} ${unbounded.variable} ${geist.variable} font-sans text-white antialiased bg-black`}>
        
        {/* SFONDO PERENNE - IL TUO BLACK HOLE */}
        <div 
          className="fixed inset-0 z-[-10] w-full h-full bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/bg-uttf.jpg')" }}
        >
          {/* Overlay scuro per far risaltare il contenuto */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"></div>
        </div>

        <div className="relative min-h-screen z-10">
          {children}
          <MobileNav />
        </div>
      </body>
    </html>
  );
}