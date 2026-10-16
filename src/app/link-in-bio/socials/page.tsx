import BioPage from "@/components/BioPage";
import { metadataForPath } from "../../seo";
export const metadata = metadataForPath("/link-in-bio/socials");
export default function Page() {
  return <BioPage key="socials" section="socials" />;
}
