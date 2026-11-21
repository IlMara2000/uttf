import type { ReactNode } from 'react';
import { metadataForPath } from '../seo';

export const metadata = metadataForPath('/accessibilita');

export default function AccessibilitaLayout({ children }: { children: ReactNode }) {
  return children;
}
