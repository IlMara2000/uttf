import type { ReactNode } from 'react';
import { metadataForPath } from '../seo';

export const metadata = metadataForPath('/galleria');

export default function GalleryLayout({ children }: { children: ReactNode }) {
  return children;
}
