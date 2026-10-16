"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, GripVertical, Menu, Share2, X } from "lucide-react";
import styles from "./FloatingMenuToggle.module.css";

type Position = { x: number; y: number; edge: "left" | "right" | null };
const WIDTH = 248;
const HEIGHT = 64;
const PEEK = 40;
const MARGIN = 16;
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(value, Math.max(min, max)));

export default function FloatingMenuToggle({
  open,
  onToggle,
  onBack,
}: {
  open: boolean;
  onToggle: () => void;
  onBack: () => void;
}) {
  const dock = useRef<HTMLElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [dragging, setDragging] = useState(false);
  const gesture = useRef<{
    id: number; x: number; y: number; origin: Position; moved: boolean;
  } | null>(null);
  const suppressClick = useRef(false);

  function bounds() {
    const element = layer.current!;
    const css = getComputedStyle(element);
    return {
      width: element.clientWidth,
      top: MARGIN + parseFloat(css.paddingTop),
      bottom: element.clientHeight - HEIGHT - MARGIN - parseFloat(css.paddingBottom),
    };
  }

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      const { width, top, bottom } = bounds();
      if (!width) return;
      setPosition((previous) => previous && ({
        ...previous,
        x: previous.edge === "left" ? PEEK - WIDTH
          : previous.edge === "right" ? width - PEEK
          : clamp(previous.x, MARGIN, width - WIDTH - MARGIN),
        y: clamp(previous.y, top, bottom),
      }));
    });
    observer.observe(layer.current!);
    return () => observer.disconnect();
  }, []);

  function start(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    const rect = dock.current!.getBoundingClientRect();
    gesture.current = {
      id: event.pointerId, x: event.clientX, y: event.clientY,
      origin: position ?? { x: rect.left, y: rect.top, edge: null }, moved: false,
    };
    suppressClick.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function move(event: PointerEvent<HTMLButtonElement>) {
    const active = gesture.current;
    if (!active || active.id !== event.pointerId) return;
    const dx = event.clientX - active.x;
    const dy = event.clientY - active.y;
    if (!active.moved && Math.hypot(dx, dy) < 8) return;
    active.moved = true;
    suppressClick.current = true;
    setDragging(true);
    const { width, top, bottom } = bounds();
    setPosition({
      x: clamp(active.origin.x + dx, PEEK - WIDTH, width - PEEK),
      y: clamp(active.origin.y + dy, top, bottom),
      edge: active.origin.edge,
    });
  }

  function finish(event: PointerEvent<HTMLButtonElement>, cancelled = false) {
    const active = gesture.current;
    if (!active || active.id !== event.pointerId) return;
    gesture.current = null;
    setDragging(false);
    if (cancelled) {
      suppressClick.current = true;
      setPosition(active.origin);
    } else if (active.moved) {
      const { width } = bounds();
      setPosition((current) => {
        if (!current) return current;
        const edge = current.x < 0 ? "left" : current.x + WIDTH > width ? "right" : null;
        return { ...current, edge, x: edge === "left" ? PEEK - WIDTH
          : edge === "right" ? width - PEEK
          : clamp(current.x, MARGIN, width - WIDTH - MARGIN) };
      });
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function restore() {
    const { width } = bounds();
    setPosition((current) => current && ({
      ...current, edge: null, x: clamp(current.x, MARGIN, width - WIDTH - MARGIN),
    }));
  }

  const tucked = position?.edge;
  const dragHandlers = {
    onPointerDown: start,
    onPointerMove: move,
    onPointerUp: (event: PointerEvent<HTMLButtonElement>) => finish(event),
    onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => finish(event, true),
    onLostPointerCapture: (event: PointerEvent<HTMLButtonElement>) => finish(event, true),
  };

  return (
    <div ref={layer} className={styles.layer}>
      <nav
        ref={dock}
        className={styles.dock}
        aria-label="Navigazione rapida"
        style={position ? { left: position.x, top: position.y, right: "auto", bottom: "auto" } : undefined}
        data-dragging={dragging}
        data-edge={tucked ?? undefined}
        onKeyDown={(event) => {
          if (event.key === "Escape" && open) onToggle();
        }}
      >
        {tucked ? (
          <button
            type="button"
            className={styles.restore}
            aria-label="Mostra barra di navigazione"
            {...dragHandlers}
            onClick={(event) => {
              if (suppressClick.current && event.detail !== 0) {
                suppressClick.current = false;
                return;
              }
              restore();
            }}
          >
            {tucked === "left" ? <ChevronRight size={22} /> : <ChevronLeft size={22} />}
          </button>
        ) : (
          <>
            <button
              type="button"
              className={styles.grip}
              aria-label="Sposta barra; premi per nasconderla sul bordo"
              title="Trascina la barra o tocca per nasconderla"
              {...dragHandlers}
              onClick={(event) => {
                if (suppressClick.current && event.detail !== 0) {
                  suppressClick.current = false;
                  return;
                }
                const { width } = bounds();
                const rect = dock.current!.getBoundingClientRect();
                const edge = rect.x + WIDTH / 2 < width / 2 ? "left" : "right";
                setPosition({ x: edge === "left" ? PEEK - WIDTH : width - PEEK, y: rect.y, edge });
              }}
            >
              <GripVertical size={19} aria-hidden="true" />
            </button>
            <button type="button" className={styles.action} onClick={onBack}>
              <ArrowLeft size={21} aria-hidden="true" />
              <span>Indietro</span>
            </button>
            <button
              type="button"
              className={`${styles.action} ${styles.menu} menu-toggle`}
              aria-label={open ? "Chiudi menu" : "Apri menu"}
              aria-expanded={open}
              aria-controls="mobile-site-nav"
              onClick={onToggle}
            >
              {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
              <span>{open ? "Chiudi" : "Menu"}</span>
            </button>
            <a
              className={styles.action}
              href="/bio"
              aria-label="Condividi: apri il link in bio UTTF"
            >
              <Share2 size={20} aria-hidden="true" />
              <span>Condividi</span>
            </a>
          </>
        )}
      </nav>
    </div>
  );
}
