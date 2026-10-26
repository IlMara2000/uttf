export type BioSection = "main" | "socials" | "contatti";
export const bioSections = {
  main: { label: "Sito e laboratori", path: "/bio" },
  socials: { label: "Contatti", path: "/bio/socials" },
  contatti: { label: "Recensioni & Newsletter", path: "/bio/contatti" },
};
export type BioLink = {
  section?: BioSection;
  id: string;
  title: string;
  url: string;
  description: string;
  visible: boolean;
};
export const defaultBioLinks: BioLink[] = [
  { id: "newsletter", section: "contatti", title: "Iscriviti alla newsletter", url: "/feed?newsletter=open", description: "Le novità della Factory, direttamente nella tua email.", visible: true },
  { id: "reviews", section: "contatti", title: "Lascia una recensione", url: "/feed/recensioni", description: "Raccontaci la tua esperienza.", visible: true },
  {
    id: "site",
    title: "Sito web UTTF",
    url: "/",
    description: "Entra nella Factory.",
    visible: true,
  },
  {
    id: "labs",
    title: "Iscrizione ai laboratori",
    url: "/labs",
    description: "Le idee prendono voce.",
    visible: true,
  },
  {
    id: "instagram",
    title: "Under The Tower Factory",
    url: "https://www.instagram.com/under_the_tower_factory",
    description: "Seguici su Instagram.",
    visible: true,
  },
  {
    id: "rap",
    title: "RAPF*CKTORY",
    url: "https://www.instagram.com/rapfcktory",
    description: "Rap, scrittura e comunità.",
    visible: true,
  },
  {
    id: "tiktok",
    title: "RAPF*CKTORY su TikTok",
    url: "https://www.tiktok.com/@rapfcktory",
    description: "Video e momenti dalla community.",
    visible: true,
  },
  {
    id: "spotify",
    title: "Spotify playlist",
    url: "https://open.spotify.com/user/314eujaiyh7mys322dsnqcvo4ire",
    description: "La musica che ci accompagna.",
    visible: true,
  },
  {
    id: "youtube",
    title: "YouTube channel",
    url: "https://youtube.com/@underthetowerfactory83",
    description: "Video e live della Factory.",
    visible: true,
  },
  {
    id: "sumfest",
    title: "SUMFEST 24 — Archivio",
    url: "https://www.facebook.com/share/EmFuE2mTfGagaWBW/?mibextid=9l3rBW",
    description: "Un evento concluso, una storia da rivedere.",
    visible: true,
  },
  {
    id: "facebook",
    title: "Facebook",
    url: "https://facebook.com/underthetowerfactory",
    description: "La nostra pagina.",
    visible: true,
  },
  {
    id: "whatsapp",
    title: "Contattaci su WhatsApp",
    url: "https://api.whatsapp.com/send?phone=393491188626",
    description: "Restiamo in contatto.",
    visible: true,
  },
  {
    id: "news",
    title: "Diario della Factory",
    url: "/feed",
    description: "Le ultime novità, direttamente da qui.",
    visible: true,
  },
  {
    id: "email",
    title: "Scrivici",
    url: "mailto:ass.uttf@gmail.com",
    description: "Facciamo qualcosa insieme.",
    visible: true,
  },
];
export function isSafeBioUrl(value: string): boolean {
  if (!value || /[\s\\\u0000-\u001f]/.test(value)) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return ["https:", "http:", "mailto:", "tel:"].includes(url.protocol);
  } catch {
    return false;
  }
}

// Legacy documents remain readable; the section is persisted on the next staff save.
export function normalizeBioLinks(links: BioLink[]): BioLink[] {
  return links.map((link) => ({
    ...link,
    section:
      link.section ??
      (["email", "whatsapp"].includes(link.id) ||
      /^(mailto:|tel:|https:\/\/(api\.)?whatsapp\.com|https:\/\/wa\.me)/i.test(
        link.url,
      )
        ? "socials"
        : ["site", "labs", "news"].includes(link.id) ||
            link.url.startsWith("/") ||
            /forms\.gle|docs\.google\.com\/forms/.test(link.url)
          ? "main"
          : "socials"),
    visible: link.id === "news" && !link.section ? false : link.visible,
  }));
}
