import type { ReactNode } from 'react';
import { metadataForPath } from '../seo';

export const metadata = metadataForPath('/terms');

export default function TermsLayout({ children }: { children: ReactNode }) {
  return children;
}
