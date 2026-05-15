import type { ReactNode } from 'react';
import { metadataForPath } from '../seo';

export const metadata = metadataForPath('/team');

export default function TeamLayout({ children }: { children: ReactNode }) {
  return children;
}
