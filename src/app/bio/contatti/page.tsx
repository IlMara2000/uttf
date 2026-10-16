import BioPage from "@/components/BioPage";
import { metadataForPath } from "../../seo";
export const metadata = metadataForPath("/bio/contatti");
export default function Page() {
  return <BioPage key="contatti" section="contatti" />;
}
