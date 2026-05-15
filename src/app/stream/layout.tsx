import type { ReactNode } from 'react';
import { metadataForPath } from '../seo';

export const metadata = metadataForPath('/stream');

export default function StreamLayout({ children }: { children: ReactNode }) {
  return children;
}
