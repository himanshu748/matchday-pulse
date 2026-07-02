"use client";

import { useEffect, useRef, useState } from "react";

/**
 * LivePulse
 * ---------------------------------------------------------------------------
 * An animated "hype meter" that spikes when `pulseValue` increases — driven by
 * incoming match events AND by fans smashing the Hype button. Tap bursts feed
 * the same meter, so the crowd literally moves the chart. (Server-side
 * aggregation across all fans is the natural next step — see README.)
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
  const [hype, setHype] = useState(0);
  const [tapAnim, setTapAnim] = useState(0);
  const prevValue = useRef(pulseValue);

  const total = pulseValue + hype;

  useEffect(() => {
    if (total === prevValue.current) return;

    const delta = total - prevValue.current;
    prevValue.current = total;

    setHistory((prev) => {
      const spike = Math.min(100, 30 + delta * 25 + Math.random() * 15);
      return [...prev.slice(1), spike];
    });

    setFlash(true);
    const t = setTimeout(() => setFlash(false), 350);
    return () => clearTimeout(t);
  }, [total]);

  // Gentle idle decay so the bar chart doesn't look frozen between events.
  useEffect(() => {
    const decay = setInterval(() => {
      setHistory((prev) => [
        ...prev.slice(1),
        Math.max(4, prev[prev.length - 1] * 0.85),
      ]);
    }, 1200);
    return () => clearInterval(decay);
  }, []);

  function handleHype() {
    setHype((h) => h + 1);
    setTapAnim((k) => k + 1);
  }

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
          {total} hype
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

      <button
        key={tapAnim}
        onClick={handleHype}
        className={`mt-3 w-full rounded-xl border border-pulse/40 bg-pulse/10 py-2.5 text-sm font-extrabold tracking-wide text-pulse transition hover:bg-pulse/20 active:scale-95 ${
          tapAnim ? "animate-hype-tap" : ""
        }`}
      >
        🔥 SEND HYPE
      </button>
      <p className="mt-1.5 text-center text-[10px] text-slate-500">
        Smash it when the match gets spicy — your taps move the meter.
      </p>
    </div>
  );
}
