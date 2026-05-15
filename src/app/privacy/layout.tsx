import type { ReactNode } from 'react';
import { metadataForPath } from '../seo';

export const metadata = metadataForPath('/privacy');

export default function PrivacyLayout({ children }: { children: ReactNode }) {
  return children;
}
