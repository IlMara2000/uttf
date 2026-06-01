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
    description: 'Sessioni di scrittura creativa e tecnica del flow. Un laboratorio dove il rap diventa strumento di espressione e narrazione del quotidiano.',
    detailIntro: 'Percorso dedicato a scrittura, metrica, presenza live e identita artistica. Qui raccoglieremo programma, calendario, requisiti e materiali utili.',
    tags: ['WRITING', 'FLOW', 'LIVE'],
  },
  {
    slug: 'beat-making',
    title: 'BEAT MAKING',
    description: 'Dalla creazione del sample alla struttura del beat. I ragazzi imparano a produrre le proprie basi utilizzando software professionali.',
    detailIntro: 'Laboratorio per entrare nel processo produttivo: ritmo, campionamento, arrangiamento, ascolto e sviluppo di un suono personale.',
    tags: ['PRODUCTION', 'DAW', 'SOUND'],
  },
  {
    slug: 'urban-arts',
    title: 'URBAN ARTS',
    description: "Non solo musica. Esploriamo il mondo dei graffiti, della grafica e della fotografia per dare un'identità visiva ai progetti della Factory.",
    detailIntro: 'Spazio dedicato a linguaggi visivi, immagine, fotografia, grafica e interventi urbani. La pagina diventera il riferimento per attivita e proposte.',
    tags: ['GRAFFITI', 'GRAPHIC', 'PHOTO'],
  },
  {
    slug: 'community-hub',
    title: 'COMMUNITY HUB',
    description: 'Incontri aperti, dibattiti e momenti di aggregazione. Il laboratorio fisico dove le idee circolano e nascono nuove collaborazioni.',
    detailIntro: 'Area pensata per incontri, confronto e progettazione condivisa. Qui verranno raccolte modalita di partecipazione, appuntamenti e obiettivi.',
    tags: ['MEETING', 'ROZZANO', 'CO-WORKING'],
  },
];

export function getLabCategory(slug: string) {
  return labCategories.find((lab) => lab.slug === slug);
}
