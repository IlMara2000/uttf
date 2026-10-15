export type LabCategory = {
  slug: string;
  title: string;
  description: string;
  detailIntro: string;
  tags: string[];
};

export const labCategories: LabCategory[] = [
  {
    slug: 'rap-fcktory',
    title: 'RAP_F*CKTORY',
    description: 'Rap, scrittura e condivisione. Uno spazio per esprimersi attraverso le parole e incontrare altre persone con la stessa passione.',
    detailIntro: 'Per sapere quali attività sono disponibili e come partecipare, contattaci. I laboratori sono aperti a tutti.',
    tags: ['RAP', 'SCRITTURA', 'INCONTRI'],
  },
  {
    slug: 'rastapower',
    title: 'RASTAPOWER',
    description: 'Iniziative sporadiche della Factory, senza un calendario continuativo. Scrivici per sapere se ci sono appuntamenti in programma.',
    detailIntro: 'Gli appuntamenti RASTAPOWER vengono organizzati in modo sporadico. Contattaci per conoscere le prossime iniziative, quando disponibili.',
    tags: ['INIZIATIVE SPORADICHE', 'RASTAPOWER'],
  },
  {
    slug: 'graffiti',
    title: 'GRAFFITI',
    description: 'Iniziative sporadiche dedicate ai graffiti. Occasioni per condividere questa passione, quando vengono organizzate.',
    detailIntro: 'Le iniziative sui graffiti sono occasionali e non costituiscono un corso continuativo. Scrivici per sapere se ci sono attività in programma.',
    tags: ['GRAFFITI', 'INIZIATIVE SPORADICHE'],
  },
  {
    slug: 'community-hub',
    title: 'INCONTRARSI',
    description: 'La Factory è anche un posto dove conoscersi e condividere la passione per la cultura urbana. Aperto a tutti.',
    detailIntro: 'Vuoi conoscere la Factory? Scrivici per concordare un incontro e scoprire quello che facciamo.',
    tags: ['INCONTRI', 'CONDIVISIONE', 'ROZZANO'],
  },
];

export function getLabCategory(slug: string) {
  return labCategories.find((lab) => lab.slug === slug);
}
