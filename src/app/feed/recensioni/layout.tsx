import type { ReactNode } from 'react';
import { metadataForPath } from '../../seo';

export const metadata = metadataForPath('/feed/recensioni');

export default function ReviewsLayout({ children }: { children: ReactNode }) {
  return children;
}
