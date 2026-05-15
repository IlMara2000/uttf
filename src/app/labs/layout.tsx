import type { ReactNode } from 'react';
import { metadataForPath } from '../seo';

export const metadata = metadataForPath('/labs');

export default function LabsLayout({ children }: { children: ReactNode }) {
  return children;
}
