import BioPage from "@/components/BioPage";
import { getBioPageData } from "@/lib/bio-page-data";
import { metadataForPath } from "../../seo";
export const metadata = metadataForPath("/bio/contatti");

export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await getBioPageData();
  return (
    <BioPage
      key="contatti"
      section="contatti"
      initialLinks={data?.links}
      initialVersion={data?.version}
    />
  );
}
