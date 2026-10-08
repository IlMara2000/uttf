"use client";

import Image from "next/image";
import type { PointerEvent } from "react";

export default function FactoryScene() {
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (
      event.pointerType !== "mouse" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty(
      "--scene-x",
      String((event.clientX - rect.left) / rect.width - 0.5),
    );
    event.currentTarget.style.setProperty(
      "--scene-y",
      String((event.clientY - rect.top) / rect.height - 0.5),
    );
  };
  return (
    <div
      className="hero-visual factory-scene"
      onPointerMove={move}
      onPointerLeave={(event) => {
        event.currentTarget.style.setProperty("--scene-x", "0");
        event.currentTarget.style.setProperty("--scene-y", "0");
      }}
    >
      <span className="scene-edition">UTTF / DAL TERRITORIO</span>
      <div className="hero-photo">
        <Image
          src="/labs/foto1.jpeg"
          alt="Il gruppo Under The Tower Factory allo stand dell’associazione"
          fill
          preload
          sizes="(min-width: 900px) 48vw, 100vw"
        />
        <span className="photo-caption">Rozzano. Persone, prima di tutto.</span>
      </div>
      <div className="scene-inset">
        <Image
          src="/labs/foto3.jpeg"
          alt="Un laboratorio rap: ascolto, confronto e voci della Factory"
          fill
          sizes="(min-width: 800px) 200px, 130px"
        />
        <span>VOCI / IN CIRCOLO</span>
      </div>
      <div className="scene-statement">
        POCO COMPOSTI.
        <br />
        MOLTO PRESENTI.
      </div>
      <div className="scene-logo">
        <Image
          src="/icons/homelogo.png"
          alt="Under The Tower Factory"
          width={190}
          height={190}
        />
      </div>
      <span className="photo-index">HIP-HOP / ARTE / COMUNITÀ</span>
    </div>
  );
}
