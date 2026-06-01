import type { Metadata } from 'next';

export const SITE_URL = 'https://uttf.vercel.app';
export const SITE_NAME = 'Under The Tower Factory';
export const ORGANIZATION_NAME = 'Under The Tower Factory';
export const SOCIAL_LINKS = [
  'https://linktr.ee/underthetower',
  'https://www.instagram.com/under_the_tower_factory',
  'https://www.instagram.com/rapfcktory',
  'https://www.tiktok.com',
  'https://www.youtube.com',
  'https://open.spotify.com',
];
export const DEFAULT_DESCRIPTION =
  'Under The Tower Factory e una community creativa di Rozzano: laboratori rap, beat making, arte urbana, galleria a km 0, eventi e progetti per il territorio.';
export const DEFAULT_OG_IMAGE = '/bg-uttf.jpg';

export type PublicRoute = {
  path: string;
  title: string;
  description: string;
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
};

export const publicRoutes: PublicRoute[] = [
  {
    path: '/',
    title: 'Under The Tower Factory',
    description: 'Community creativa a Rozzano per rap, arte urbana, laboratori, eventi, galleria a km 0 e progetti culturali del territorio.',
    changeFrequency: 'weekly',
    priority: 1,
  },
  {
    path: '/feed',
    title: 'News, recensioni e aggiornamenti',
    description: 'Post, recensioni, Instagram, newsletter e aggiornamenti dalla community Under The Tower Factory di Rozzano.',
    changeFrequency: 'weekly',
    priority: 0.85,
  },
  {
    path: '/labs',
    title: 'Laboratori rap e creativi',
    description: 'RAPF*CKTORY, scrittura, open mic, beat making, urban arts e laboratori creativi per ragazzi e community.',
    changeFrequency: 'monthly',
    priority: 0.8,
  },
  {
    path: '/labs/rap-fcktory',
    title: 'RAPF*CKTORY',
    description: 'Dettagli del laboratorio RAPF*CKTORY: scrittura, flow, presenza live e identita artistica dentro Under The Tower Factory.',
    changeFrequency: 'monthly',
    priority: 0.65,
  },
  {
    path: '/labs/beat-making',
    title: 'Beat Making',
    description: 'Dettagli del laboratorio Beat Making: produzione musicale, campionamento, arrangiamento e sviluppo del suono.',
    changeFrequency: 'monthly',
    priority: 0.65,
  },
  {
    path: '/labs/urban-arts',
    title: 'Urban Arts',
    description: 'Dettagli del laboratorio Urban Arts: graffiti, grafica, fotografia e identita visiva dei progetti UTTF.',
    changeFrequency: 'monthly',
    priority: 0.65,
  },
  {
    path: '/labs/community-hub',
    title: 'Community Hub',
    description: 'Dettagli del Community Hub UTTF: incontri, progettazione condivisa e momenti di aggregazione a Rozzano.',
    changeFrequency: 'monthly',
    priority: 0.65,
  },
  {
    path: '/team',
    title: 'Team',
    description: 'Il team creativo e operativo di Under The Tower Factory: artisti, educatori, tecnici e persone attive sul territorio.',
    changeFrequency: 'monthly',
    priority: 0.75,
  },
  {
    path: '/galleria',
    title: 'Arte a KM 0',
    description: 'Galleria d arte a km 0 con opere, processi creativi, artisti locali e contributi visuali nati nel territorio.',
    changeFrequency: 'monthly',
    priority: 0.75,
  },
  {
    path: '/feed/recensioni',
    title: 'Recensioni',
    description: 'Pareri, recensioni e feedback reali della community su laboratori, eventi e attivita Under The Tower Factory.',
    changeFrequency: 'weekly',
    priority: 0.65,
  },
  {
    path: '/stream',
    title: 'Video e live',
    description: 'Archivio video, live, contenuti YouTube e momenti dagli eventi Under The Tower Factory e RAPF*CKTORY.',
    changeFrequency: 'monthly',
    priority: 0.65,
  },
  {
    path: '/privacy',
    title: 'Privacy Policy',
    description: 'Informativa privacy del sito Under The Tower Factory.',
    changeFrequency: 'yearly',
    priority: 0.35,
  },
  {
    path: '/terms',
    title: 'Termini e condizioni',
    description: 'Termini, condizioni e regole d uso del sito Under The Tower Factory.',
    changeFrequency: 'yearly',
    priority: 0.3,
  },
];

export function metadataForPath(path: string): Metadata {
  const route = publicRoutes.find((item) => item.path === path) ?? publicRoutes[0];
  const title = route.title;
  const description = route.description;

  return {
    title,
    description,
    alternates: {
      canonical: route.path,
    },
    openGraph: {
      title: `${title} | UTTF`,
      description,
      url: route.path,
      siteName: SITE_NAME,
      locale: 'it_IT',
      type: 'website',
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 1536,
          height: 1024,
          alt: `${SITE_NAME} - Community hub creativo a Rozzano`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | UTTF`,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export function noIndexMetadata(title: string, description = 'Area riservata Under The Tower Factory.'): Metadata {
  return {
    title: {
      absolute: `${title} | UTTF`,
    },
    description,
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
      },
    },
  };
}

export const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: SITE_NAME,
  alternateName: ['UTTF', ORGANIZATION_NAME],
  legalName: ORGANIZATION_NAME,
  url: SITE_URL,
  sameAs: SOCIAL_LINKS,
  logo: `${SITE_URL}/icons/homelogo.png`,
  image: `${SITE_URL}${DEFAULT_OG_IMAGE}`,
  description: DEFAULT_DESCRIPTION,
  foundingLocation: {
    '@type': 'Place',
    name: 'Rozzano',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Via dei Biancospini, 4',
      addressLocality: 'Rozzano',
      addressRegion: 'MI',
      postalCode: '20089',
      addressCountry: 'IT',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 45.38550393802996,
      longitude: 9.14821617674218,
    },
  },
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Via dei Biancospini, 4',
    addressLocality: 'Rozzano',
    addressRegion: 'MI',
    postalCode: '20089',
    addressCountry: 'IT',
  },
  areaServed: [
    {
      '@type': 'AdministrativeArea',
      name: 'Rozzano e area metropolitana di Milano',
    },
  ],
  knowsAbout: [
    'arte urbana',
    'rap',
    'hip hop',
    'open mic',
    'beat making',
    'RAPF*CKTORY',
    'laboratori creativi',
    'cultura giovanile',
    'community hub',
    'galleria arte a km 0',
    'eventi culturali Rozzano',
  ],
  makesOffer: [
    {
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name: 'Laboratori rap, musica e creativita urbana',
        description: 'Percorsi di rap, scrittura, open mic, beat making, urban arts, galleria a km 0 e aggregazione culturale.',
      },
    },
  ],
};

export const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: SITE_NAME,
  alternateName: 'UTTF',
  url: SITE_URL,
  inLanguage: 'it-IT',
  publisher: {
    '@id': `${SITE_URL}/#organization`,
  },
};
