"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/** Progressive enhancement: content is visible without JS and with reduced motion. */
export default function FactoryMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const container = root.current;
    if (!container) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | undefined;
    const targets = Array.from(
      container.querySelectorAll<HTMLElement>(
        ".section-heading, .mission-grid, .activity-card, .community-section, .news-card, .diary-invite, .participate-heading, .participate-grid > a, .visit-section, .person-card, .lab-card, .association-cta, .legal-section, .photo-ribbon > div",
      ),
    );
    const reset = () => {
      observer?.disconnect();
      targets.forEach((target) => {
        delete target.dataset.reveal;
        target.style.removeProperty("--reveal-delay");
      });
    };
    const setup = () => {
      reset();
      if (preference.matches || !("IntersectionObserver" in window)) return;
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              (entry.target as HTMLElement).dataset.reveal = "visible";
              observer?.unobserve(entry.target);
            }
          });
        },
        { threshold: 0, rootMargin: "0px 0px -32px 0px" },
      );
      targets.forEach((target) => {
        if (target.getBoundingClientRect().top < window.innerHeight) return;
        const index = Array.from(target.parentElement?.children ?? []).indexOf(
          target,
        );
        target.style.setProperty(
          "--reveal-delay",
          `${Math.min(index, 3) * 65}ms`,
        );
        target.dataset.reveal = "waiting";
        observer?.observe(target);
      });
    };
    const revealFocus = (event: FocusEvent) => {
      if (!(event.target instanceof Element)) return;
      const target = event.target.closest<HTMLElement>(
        '[data-reveal="waiting"]',
      );
      if (target) {
        target.dataset.reveal = "visible";
        observer?.unobserve(target);
      }
    };
    setup();
    preference.addEventListener("change", setup);
    container.addEventListener("focusin", revealFocus);
    return () => {
      reset();
      preference.removeEventListener("change", setup);
      container.removeEventListener("focusin", revealFocus);
    };
  }, [pathname]);

  return (
    <div ref={root} className="factory-motion">
      {children}
    </div>
  );
}
