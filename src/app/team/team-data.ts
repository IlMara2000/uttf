export type TeamMember = {
  archived?: boolean; id: string; name: string; role: string; image: string; description: string;
  skills: string[]; tags: string[]; link_url: string; link_label: string;
  photo_position: number; sort_order: number; version: number;
};
export type TeamIntro = { id: number; title: string; subtitle: string; accent: string; description: string; version: number };
export const defaultTeamIntro: TeamIntro = {
  id: 1, title: "Le persone.", subtitle: "La nostra", accent: "forza.",
  description: "Siamo artisti, volontari e persone che condividono la passione per l’arte e la cultura hip-hop. Ci incontriamo a Rozzano e mettiamo in comune esperienze e idee.", version: 0,
};

export const defaultTeamMembers: TeamMember[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    sort_order: 1,
    version: 0,
    photo_position: 50,
    link_url: "",
    link_label: "",
    name: "Elle Piò",
    role: "Presidente & Founder",
    image: "/team/elle-pio.jpg",
    description:
      "Presidente e fondatore, porta avanti con tenacia una visione nata da bambino e trasformata in UTTF: un punto di riferimento che accoglie, orienta e fa crescere un gruppo di ragazzi attraverso arte, disciplina e comunità.",
    skills: ["Leadership", "Creative Direction", "Education"],
    tags: ["FOUNDER", "RAP ARTIST", "EDUCAZIONE"],
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    sort_order: 2,
    version: 0,
    photo_position: 50,
    link_url: "",
    link_label: "",
    name: "Drew",
    role: "Video Maker",
    image: "/team/drew.jpg",
    description:
      "Cresciuto professionalmente dentro UTTF, ha trasformato la passione per l'immagine in un mestiere. Oggi lavora come videomaker con artisti riconosciuti, portando tecnica, visione e affidabilità in ogni produzione.",
    skills: ["Video Editing", "Directing", "Color Grading"],
    tags: ["FILMMAKER", "VISUALS", "RAP ARTIST"],
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    sort_order: 3,
    version: 0,
    photo_position: 50,
    link_url: "",
    link_label: "",
    name: "Sarso",
    role: "Vocalist",
    image: "/team/placeholder.svg",
    description:
      "Artista tenace, crede profondamente nel valore della propria arte. Nato oltre 15 anni fa con il beatbox, è diventato MC, presentatore live e giudice di contest hip-hop, con collaborazioni e featuring importanti nella scena.",
    skills: ["Vocal Coaching", "Social Work", "Stage Presence"],
    tags: ["VOCALIST", "ENERGY"],
  },
  {
    id: "00000000-0000-4000-8000-000000000004",
    sort_order: 4,
    version: 0,
    photo_position: 50,
    link_url: "",
    link_label: "",
    name: "Gioitz",
    role: "Produttore / DJ",
    image: "/team/gioitz.jpg",
    description:
      "Studia musica da sempre, cercandone struttura, suono e dettagli. Diplomato come produttore musicale, unisce orecchio preciso e creatività naturale per costruire beat, atmosfere e identità sonore.",
    skills: ["Music Production", "DJing", "Sound Design"],
    tags: ["PRODUCER", "MUSICIAN", "STYLE"],
  },
  {
    id: "00000000-0000-4000-8000-000000000005",
    sort_order: 5,
    version: 0,
    photo_position: 50,
    link_url: "",
    link_label: "",
    name: "Geo",
    role: "Operatrice / Creative Support",
    image: "/team/geo.jpg",
    description:
      "Determinata e caparbia, si mette continuamente in gioco. Lavora nel mondo della moda e porta in UTTF visione estetica, presenza operativa e competenze da social media manager dell'associazione.",
    skills: ["Team Support", "Creative Coordination", "Operational Flow"],
    tags: ["OPERATOR", "CREATIVE SUPPORT", "TEAM FLOW"],
  },
  {
    id: "00000000-0000-4000-8000-000000000006",
    sort_order: 6,
    version: 0,
    photo_position: 50,
    link_url: "",
    link_label: "",
    name: "Den",
    role: "Fonico / SMM",
    image: "/team/den.jpg",
    description:
      "Diplomato in grafica e comunicazione, fotografo, fonico certificato e project manager. È il profilo trasversale che entra dove serve: tecnico, creativo, problem solver e sviluppatore web, creatore di questo sito.",
    skills: ["Audio Engineering", "Social Media", "Graphic Design"],
    tags: ["AUDIO TECH", "SMM", "PROBLEM SOLVER"],
  },
];
