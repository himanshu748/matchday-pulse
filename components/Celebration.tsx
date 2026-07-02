"use client";

/**
 * Celebration.tsx
 * ---------------------------------------------------------------------------
 * Full-screen celebration overlay for live Big Moments — a stadium-style
 * flash, a springing headline, and a confetti burst. Pure CSS animations,
 * auto-dismisses, pointer-events-none so it never blocks the UI.
 */

import { useEffect, useMemo, useState } from "react";
import type { MatchEvent } from "@/lib/types";

const HEADLINE: Partial<Record<MatchEvent["type"], string>> = {
  goal: "GOOOAL!",
  red_card: "RED CARD!",
  penalty: "PENALTY!",
  fulltime: "FULL TIME",
};

const FLASH: Partial<Record<MatchEvent["type"], string>> = {
  goal: "rgba(34,197,94,0.25)",
  red_card: "rgba(239,68,68,0.25)",
  penalty: "rgba(245,158,11,0.25)",
  fulltime: "rgba(167,139,250,0.2)",
};

const CONFETTI_COLORS = ["#22c55e", "#4ade80", "#fbbf24", "#38bdf8", "#f472b6", "#ffffff"];

interface CelebrationProps {
  /** The event to celebrate; re-fires whenever its id changes. Null hides it. */
  event: MatchEvent | null;
}

export default function Celebration({ event }: CelebrationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!event) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 2200);
    return () => clearTimeout(t);
  }, [event?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stable-per-event random confetti layout.
  const pieces = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.45,
        duration: 1.3 + Math.random() * 1.1,
        size: 6 + Math.random() * 8,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        tilt: Math.random() > 0.5 ? "50%" : "2px",
      })),
    [event?.id] // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (!visible || !event) return null;
  const headline = HEADLINE[event.type];
  if (!headline) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 animate-goal-flash"
        style={{ background: FLASH[event.type] }}
      />
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 block"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.tilt,
            animation: `confetti ${p.duration}s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}
      <div className="flex h-full items-center justify-center">
        <div className="animate-goal-text text-center">
          <p
            className="text-6xl font-extrabold tracking-tight text-white sm:text-8xl"
            style={{ textShadow: "0 0 40px rgba(34,197,94,0.8), 0 4px 0 rgba(0,0,0,0.4)" }}
          >
            {headline}
          </p>
          <p className="mt-2 text-xl font-bold text-white/90">
            {event.team}
            {event.score ? ` · ${event.score.home}–${event.score.away}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
