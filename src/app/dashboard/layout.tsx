import type { ReactNode } from 'react';
import { noIndexMetadata } from '../seo';

export const metadata = noIndexMetadata('Gestionale staff', 'Dashboard riservata allo staff Under The Tower Factory.');

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return children;
}
