import type { ReactNode } from 'react';
import { metadataForPath } from '../seo';

export const metadata = metadataForPath('/feed');

export default function FeedLayout({ children }: { children: ReactNode }) {
  return children;
}
