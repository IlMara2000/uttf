import type { ReactNode } from 'react';
import { metadataForPath } from '../seo';

export const metadata = metadataForPath('/cookie');

export default function CookieLayout({ children }: { children: ReactNode }) {
  return children;
}
