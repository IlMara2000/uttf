import type { Metadata } from 'next';

export const SITE_URL = 'https://uttf.vercel.app';
export const SITE_NAME = 'Under The Tower Factory';
export const ORGANIZATION_NAME = 'Under The Tower Factory ODV';
export const DEFAULT_DESCRIPTION =
  'Under The Tower Factory e una Organizzazione di Volontariato a Rozzano: laboratori creativi, arte urbana, rap, cultura e progetti di comunita.';
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
    title: 'Under The Tower Factory ODV',
    description: DEFAULT_DESCRIPTION,
    changeFrequency: 'weekly',
    priority: 1,
  },
  {
    path: '/feed',
    title: 'Feed e aggiornamenti',
    description: 'News, post e aggiornamenti ufficiali di Under The Tower Factory ODV.',
    changeFrequency: 'weekly',
    priority: 0.85,
  },
  {
    path: '/labs',
    title: 'Laboratori creativi',
    description: 'Laboratori di rap, beat making, urban arts e community hub curati da Under The Tower Factory ODV.',
    changeFrequency: 'monthly',
    priority: 0.8,
  },
  {
    path: '/team',
    title: 'Team',
    description: 'Il team operativo e creativo di Under The Tower Factory ODV.',
    changeFrequency: 'monthly',
    priority: 0.75,
  },
  {
    path: '/galleria',
    title: 'Arte a KM 0',
    description: 'Galleria locale, opere e processi creativi nati intorno alla community di Under The Tower Factory ODV.',
    changeFrequency: 'monthly',
    priority: 0.75,
  },
  {
    path: '/feed/recensioni',
    title: 'Recensioni',
    description: 'Recensioni e feedback della community su Under The Tower Factory ODV.',
    changeFrequency: 'weekly',
    priority: 0.65,
  },
  {
    path: '/stream',
    title: 'Stream',
    description: 'Archivio streaming, contenuti live e broadcast della community Under The Tower Factory ODV.',
    changeFrequency: 'monthly',
    priority: 0.65,
  },
  {
    path: '/privacy',
    title: 'Privacy Policy',
    description: 'Informativa privacy di Under The Tower Factory ODV.',
    changeFrequency: 'yearly',
    priority: 0.35,
  },
  {
    path: '/terms',
    title: 'Termini e condizioni',
    description: 'Termini, condizioni e regole d uso del sito Under The Tower Factory ODV.',
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
      title: `${title} | UTTF ODV`,
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
          alt: `${SITE_NAME} - Associazione di volontariato a Rozzano`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | UTTF ODV`,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export function noIndexMetadata(title: string, description = 'Area riservata Under The Tower Factory.'): Metadata {
  return {
    title,
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
  '@type': 'NGO',
  '@id': `${SITE_URL}/#organization`,
  name: SITE_NAME,
  alternateName: ['UTTF', ORGANIZATION_NAME],
  legalName: ORGANIZATION_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/icons/homelogo.png`,
  image: `${SITE_URL}${DEFAULT_OG_IMAGE}`,
  description: DEFAULT_DESCRIPTION,
  nonprofitStatus: 'https://schema.org/ITVolunteerAssociationCharity',
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
    'volontariato',
    'arte urbana',
    'rap',
    'beat making',
    'laboratori creativi',
    'cultura giovanile',
    'community hub',
  ],
  makesOffer: [
    {
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name: 'Laboratori creativi e musicali',
        description: 'Percorsi di rap, scrittura, beat making, urban arts e aggregazione culturale.',
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
