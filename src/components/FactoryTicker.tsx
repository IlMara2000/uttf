"use client";

import { useEffect, useRef, useState } from "react";

const words = [
  "LE ETICHETTE, FUORI",
  "LE PERSONE, DENTRO",
  "RISPETTO RECIPROCO",
  "ROZZANO, CASA NOSTRA",
];
export default function FactoryTicker() {
  const [paused, setPaused] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    let inView = false;
    const sync = () => {
      node.dataset.visible = String(
        inView && document.visibilityState === "visible",
      );
    };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      sync();
    });
    observer.observe(node);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);
  return (
    <div className="factory-ticker" ref={root} data-paused={paused}>
      <div className="ticker-window">
        <div className="ticker-track">
          {[0, 1].map((copy) => (
            <div
              className="ticker-copy"
              key={copy}
              aria-hidden={copy === 1 ? true : undefined}
            >
              {words.map((word) => (
                <span key={word}>{word}</span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="ticker-control"
        aria-label={
          paused
            ? "Riprendi la fascia in movimento"
            : "Metti in pausa la fascia in movimento"
        }
        aria-pressed={paused}
        onClick={() => setPaused((value) => !value)}
      >
        {paused ? "Riprendi" : "Pausa"}
      </button>
    </div>
  );
}
