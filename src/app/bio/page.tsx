import BioPage from "@/components/BioPage";
import { getBioPageData } from "@/lib/bio-page-data";

export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await getBioPageData();
  return (
    <BioPage
      key="main"
      section="main"
      initialLinks={data?.links}
      initialVersion={data?.version}
    />
  );
}
