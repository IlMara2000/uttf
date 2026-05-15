import type { ReactNode } from 'react';
import { noIndexMetadata } from '../seo';

export const metadata = noIndexMetadata('Accesso staff', 'Accesso riservato allo staff Under The Tower Factory.');

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}
