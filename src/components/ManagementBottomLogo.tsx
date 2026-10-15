import Image from 'next/image';
import Link from 'next/link';

export default function ManagementBottomLogo({ className = '' }: { className?: string }) {
  return (
    <footer className={`staff-footer ${className}`}>
      <Image src="/icons/homelogo.png" alt="Under The Tower Factory" width={72} height={72} />
      <span>Rozzano. Persone, prima di tutto.</span>
      <Link href="/">Vai al sito</Link>
    </footer>
  );
}
