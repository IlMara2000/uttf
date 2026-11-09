import HomePageClient from "@/components/HomePageClient";
import { loadHomePhoto } from "@/lib/home-photo";

// La foto cambia raramente: la pagina resta statica e si rigenera ogni minuto.
export const revalidate = 60;

export default async function HomePage() {
  const initialPhoto = await loadHomePhoto();
  return <HomePageClient initialPhoto={initialPhoto} />;
}
