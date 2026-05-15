import type { ReactNode } from 'react';
import { noIndexMetadata } from '../seo';

export const metadata = noIndexMetadata('Area admin', 'Area amministrativa riservata Under The Tower Factory.');

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
