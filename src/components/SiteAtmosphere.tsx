'use client';

import { usePathname } from 'next/navigation';

export default function SiteAtmosphere() {
  const pathname = usePathname();
  if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin') || pathname === '/login') {
    return null;
  }

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(255,145,77,0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.018)_0_1px,transparent_1px_82px)]" />
    </div>
  );
}
