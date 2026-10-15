"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { MotionConfig } from "framer-motion";
import MobileNav from "./MobileNav";
import FactoryMotion from "./FactoryMotion";
import FloatingMenuToggle from "./FloatingMenuToggle";
import floatingMenuStyles from "./FloatingMenuToggle.module.css";

const links = [
  { href: "/team", label: "Chi siamo" },
  { href: "/labs", label: "Laboratori" },
  { href: "/galleria", label: "Arte a km 0" },
  { href: "/feed", label: "Diario" },
];

export default function PublicSiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const isManagement =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname === "/login";
  const menuOpen = menuPath === pathname;

  if (pathname === "/link-in-bio") return <div className="bio-surface">{children}</div>;

  if (isManagement)
    return (
      <MotionConfig reducedMotion="user">
        <div className="management-site">{children}<MobileNav /></div>
      </MotionConfig>
    );

  return (
    <MotionConfig reducedMotion="user">
      <div className="public-site">
        <a className="skip-link" href="#site-content">
          Vai al contenuto
        </a>
        <div className="site-topline">
          <span>
            UNDER THE TOWER FACTORY
          </span>
          <div className="topline-access"><span>Rozzano, Milano</span><Link href="/login" prefetch={false}>Area staff</Link></div>
        </div>
        <header className="site-header">
          <Link
            href="/"
            className="site-brand"
            aria-label="Under The Tower Factory — Home"
            onClick={() => setMenuPath(null)}
          >
            <span className="brand-symbol">
              <Image src="/icons/favicon.svg" width={46} height={46} alt="" />
            </span>
            <span>
              UNDER THE TOWER<span>FACTORY</span>
            </span>
          </Link>
          <nav className="desktop-nav" aria-label="Navigazione principale">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={
                  pathname.startsWith(link.href) ? "page" : undefined
                }
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <Link href="/#partecipa" className="clay-button header-join">
            Partecipa <ArrowUpRight size={17} />
          </Link>
        </header>
        <FloatingMenuToggle
          open={menuOpen}
          onToggle={() => setMenuPath(menuOpen ? null : pathname)}
          onBack={() => {
            setMenuPath(null);
            if (window.history.length > 1) router.back();
            else router.push("/");
          }}
        />
        {menuOpen && (
          <nav
            id="mobile-site-nav"
            className={`mobile-site-nav ${floatingMenuStyles.panel}`}
            aria-label="Navigazione mobile"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setMenuPath(null);
                document
                  .querySelector<HTMLButtonElement>(".menu-toggle")
                  ?.focus();
              }
            }}
          >
            {[
              { href: "/", label: "Home" },
              ...links,
              { href: "/#partecipa", label: "Partecipa" },
              { href: "/link-in-bio", label: "Link in bio" },
              { href: "/login", label: "Area staff" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuPath(null)}
                aria-current={pathname === link.href ? "page" : undefined}
              >
                {link.label}
                <ArrowUpRight size={18} />
              </Link>
            ))}
          </nav>
        )}
        <div
          id="site-content"
          tabIndex={-1}
          className={
            pathname === "/" ? "public-content" : "public-content inner-page"
          }
        >
          <FactoryMotion>{children}</FactoryMotion>
        </div>
        <footer className="site-footer">
          <div className="footer-main">
            <div className="footer-identity">
              <Image
                src="/icons/homelogo.png"
                alt="Under The Tower Factory"
                width={180}
                height={180}
              />
              <p>
                Cultura urbana.
                <br />
                Persone al centro.
                <br />
                <strong>Radici a Rozzano.</strong>
              </p>
            </div>
            <div>
              <span className="eyebrow">Vieni a conoscerci</span>
              <p>
                Via dei Biancospini, 4<br />
                20089 Rozzano (MI)
              </p>
              <a href="mailto:ass.uttf@gmail.com">
                ass.uttf@gmail.com <ArrowUpRight size={15} />
              </a>
            </div>
            <div>
              <span className="eyebrow">Dentro la Factory</span>
              {links.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
              <Link href="/stream">Video e live</Link>
            </div>
            <div>
              <span className="eyebrow">Restiamo in contatto</span>
              <a
                href="https://www.instagram.com/under_the_tower_factory"
                target="_blank"
                rel="noopener noreferrer"
              >
                Instagram <ArrowUpRight size={15} />
              </a>
              <a
                href="/link-in-bio"
              >
                Tutti i nostri canali <ArrowUpRight size={15} />
              </a>
              <Link href="/feed?newsletter=open">
                Iscriviti alla newsletter <ArrowUpRight size={15} />
              </Link>
            </div>
          </div>
          <div className="footer-bottom">
            <span>
              © {new Date().getFullYear()} Under The Tower Factory
            </span>
            <div>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Termini</Link>
              <Link href="/login" prefetch={false}>
                Area staff <ArrowUpRight size={12} />
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}
