import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function PublicPageIntro({
  number,
  eyebrow,
  title,
  description,
  children,
}: {
  number: string;
  eyebrow: string;
  title: ReactNode;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-intro content-width">
      <div className="section-kicker">
        <span>
          {number} / {eyebrow}
        </span>
        <Link href="/">
          Under The Tower <ArrowUpRight size={14} />
        </Link>
      </div>
      <div className="page-intro-grid">
        <h1>{title}</h1>
        <div>
          <p>{description}</p>
          {children}
        </div>
      </div>
    </header>
  );
}
