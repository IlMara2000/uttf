import './globals.css';
import type { Metadata } from 'next';
import { Unbounded, Space_Grotesk, Geist_Mono } from 'next/font/google';
import MobileNav from '@/components/MobileNav';
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  ORGANIZATION_NAME,
  SITE_NAME,
  SITE_URL,
  organizationJsonLd,
  websiteJsonLd,
} from './seo';

const unbounded = Unbounded({ subsets: ['latin'], variable: '--font-display', weight: ['900'] });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-sans', weight: ['400', '500', '700'] });
const geist = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${ORGANIZATION_NAME} | Associazione di volontariato`,
    template: `%s | UTTF ODV`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'Under The Tower Factory',
    'UTTF',
    'associazione di volontariato',
    'ODV Rozzano',
    'laboratori creativi Rozzano',
    'arte urbana',
    'rap',
    'beat making',
    'community hub',
  ],
  authors: [{ name: ORGANIZATION_NAME, url: SITE_URL }],
  creator: ORGANIZATION_NAME,
  publisher: ORGANIZATION_NAME,
  category: 'Nonprofit organization',
  alternates: {
    canonical: '/',
    languages: {
      'it-IT': '/',
    },
  },
  openGraph: {
    title: `${ORGANIZATION_NAME} | Associazione di volontariato`,
    description: DEFAULT_DESCRIPTION,
    url: '/',
    siteName: SITE_NAME,
    locale: 'it_IT',
    type: 'website',
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1536,
        height: 1024,
        alt: `${SITE_NAME} - ODV a Rozzano`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${ORGANIZATION_NAME} | Associazione di volontariato`,
    description: DEFAULT_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
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

const jsonLd = JSON.stringify([organizationJsonLd, websiteJsonLd]).replace(/</g, '\\u003c');

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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      </body>
    </html>
  );
}
