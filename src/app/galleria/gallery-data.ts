import type { TeamMember, TeamIntro } from '../team/team-data';
const artworks = [
  {
    title: "Muro Vivo",
    type: "Urban Canvas",
    image: "/instagram/post1.jpeg",
    description:
      "Opera nata dal territorio, tra segni rapidi, materia urbana e identita locale. Un frammento visivo della factory lasciato respirare a pochi passi da casa.",
    techniques: ["Street Art", "Mixed Media", "Local Roots"],
    tags: ["KM0", "URBAN", "COMMUNITY"],
  },
  {
    title: "Factory Signs",
    type: "Visual Archive",
    image: "/instagram/post2.jpeg",
    description:
      "Tracce, dettagli e simboli raccolti dentro il flusso creativo UTTF. Ogni immagine conserva il rumore buono delle idee nate sul posto.",
    techniques: ["Photography", "Archive", "Composition"],
    tags: ["ARCHIVE", "DETAILS", "UTTF"],
  },
  {
    title: "Linea Locale",
    type: "Handmade Piece",
    image: "/instagram/post3.jpeg",
    description:
      "Un lavoro costruito con mani vicine, materiali accessibili e visione diretta. Arte a km0 significa partire da quello che abbiamo intorno.",
    techniques: ["Handmade", "Texture", "Color Study"],
    tags: ["HANDMADE", "LOCAL", "RAW"],
  },
  {
    title: "Sotto La Torre",
    type: "Community Work",
    image: "/instagram/post4.jpeg",
    description:
      "Un pezzo che tiene insieme luogo, persone e memoria. La galleria diventa mappa emotiva di quello che succede sotto la torre.",
    techniques: ["Community Art", "Storytelling", "Visual Map"],
    tags: ["PLACE", "PEOPLE", "MEMORY"],
  },
  {
    title: "Lab Session 01",
    type: "Creative Process",
    image: "/labs/foto1.jpeg",
    description:
      "Scatto dal processo creativo: prove, tentativi, strumenti e intuizioni. Qui la galleria mostra anche quello che arriva prima del risultato.",
    techniques: ["Process", "Workshop", "Experiment"],
    tags: ["LAB", "PROCESS", "SESSION"],
  },
  {
    title: "Lab Session 02",
    type: "Local Experiment",
    image: "/labs/foto2.jpeg",
    description:
      "Esperimento visivo nato in laboratorio, con energia diretta e spirito artigianale. Nessuna distanza: solo idee lavorate vicino alla community.",
    techniques: ["Experiment", "Craft", "Culture"],
    tags: ["LOCAL", "CRAFT", "CULTURE"],
  },
];
export const defaultGalleryMembers: TeamMember[] = artworks.map((art, index) => ({id: `10000000-0000-4000-8000-${String(index+1).padStart(12, '0')}`, name: art.title, role: art.type, image: art.image, description: art.description, skills: art.techniques, tags: art.tags, photo_position: 50, sort_order: index+1, version: 0, link_url: '', link_label: '', archived: false}));
export const defaultGalleryIntro: TeamIntro = {id: 1, title: 'L’arte nasce', subtitle: '', accent: 'qui vicino.', description: 'Immagini, processi e frammenti creativi dal territorio. La nostra galleria racconta quello che nasce quando le persone hanno lo spazio per esprimersi.', version: 0};
