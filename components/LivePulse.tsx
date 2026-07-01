"use client";

import { useEffect, useRef, useState } from "react";

/**
 * LivePulse
 * ---------------------------------------------------------------------------
 * A simple animated "hype meter" that ticks up whenever `pulseValue`
 * increases (driven by incoming match events in the parent page). This is
 * a purely client-side, in-memory visualization — the real product spec
 * calls for aggregating actual fan taps/reactions server-side (see README
 * "what needs to be wired in next").
 */
interface LivePulseProps {
  /** Monotonically-increasing counter; each increase triggers a pulse tick. */
  pulseValue: number;
}

const HISTORY_LENGTH = 24;

export default function LivePulse({ pulseValue }: LivePulseProps) {
  const [history, setHistory] = useState<number[]>(() =>
    Array(HISTORY_LENGTH).fill(0)
  );
  const [flash, setFlash] = useState(false);
  const prevValue = useRef(pulseValue);

  useEffect(() => {
    if (pulseValue === prevValue.current) return;

    const delta = pulseValue - prevValue.current;
    prevValue.current = pulseValue;

    setHistory((prev) => {
      const spike = Math.min(100, 30 + delta * 25 + Math.random() * 15);
      const next = [...prev.slice(1), spike];
      return next;
    });

    setFlash(true);
    const t = setTimeout(() => setFlash(false), 350);
    return () => clearTimeout(t);
  }, [pulseValue]);

  // Gentle idle decay so the bar chart doesn't look frozen between events.
  useEffect(() => {
    const decay = setInterval(() => {
      setHistory((prev) => {
        const next = [...prev.slice(1), Math.max(4, prev[prev.length - 1] * 0.85)];
        return next;
      });
    }, 1200);
    return () => clearInterval(decay);
  }, []);

  return (
    <div className="rounded-2xl border border-white/10 bg-pitch-900/60 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-pulse" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-pulse" />
          </span>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Live Pulse
          </h3>
        </div>
        <span
          className={`font-mono text-sm text-slate-300 transition-colors ${
            flash ? "text-pulse" : ""
          }`}
        >
          {pulseValue} events
        </span>
      </div>

      <div className="mt-3 flex h-16 items-end gap-1">
        {history.map((value, i) => (
          <div
            key={i}
            className="flex-1 rounded-t bg-gradient-to-t from-pulse/80 to-pulse-soft transition-all duration-500"
            style={{ height: `${value}%` }}
          />
        ))}
      </div>
    </div>
  );
}
