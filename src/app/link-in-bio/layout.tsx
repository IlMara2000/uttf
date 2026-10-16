import "./style.css";
import { metadataForPath } from "../seo";
export const metadata = metadataForPath("/link-in-bio");
export default function BioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
