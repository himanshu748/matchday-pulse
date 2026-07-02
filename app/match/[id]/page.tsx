"use client";

import { use, useEffect, useRef, useState } from "react";
import BigMomentCard from "@/components/BigMomentCard";
import LivePulse from "@/components/LivePulse";
import CardGallery from "@/components/CardGallery";
import Celebration from "@/components/Celebration";
import { subscribeToMatchFeed, type FeedMode } from "@/lib/feed";
import type { MatchEvent } from "@/lib/types";

const MAX_FEED_LENGTH = 25;
/** Events arriving within this window after subscribe are replayed history — don't celebrate them. */
const SEED_WINDOW_MS = 2500;
const CELEBRATED_TYPES = new Set(["goal", "red_card", "penalty", "fulltime"]);

export default function MatchPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  // Support both the Next.js 15 async-params shape and the plain object
  // shape used in Next 14, so this scaffold keeps working across upgrades.
  const resolvedParams =
    typeof (params as Promise<{ id: string }>).then === "function"
      ? use(params as Promise<{ id: string }>)
      : (params as { id: string });
  const matchId = resolvedParams.id;

  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [mode, setMode] = useState<FeedMode>("connecting");
  const [celebrate, setCelebrate] = useState<MatchEvent | null>(null);
  const subscribedAt = useRef(0);

  useEffect(() => {
    setEvents([]);
    setMode("connecting");
    setCelebrate(null);
    subscribedAt.current = Date.now();

    const subscription = subscribeToMatchFeed(
      matchId,
      (event) => {
        setEvents((prev) => {
          if (prev.some((e) => e.id === event.id)) return prev;
          // Celebrate moments that land live (after the seeded history replay).
          if (
            Date.now() - subscribedAt.current > SEED_WINDOW_MS &&
            CELEBRATED_TYPES.has(event.type)
          ) {
            setCelebrate(event);
          }
          return [event, ...prev].slice(0, MAX_FEED_LENGTH);
        });
      },
      { onStatus: setMode }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [matchId]);

  const latest = events[0];
  const latestScore = latest?.score;
  const homeTeam = latest?.homeTeam;
  const awayTeam = latest?.awayTeam;

  const badge =
    mode === "txline"
      ? { text: "Live · TxLINE", cls: "border-pulse/40 text-pulse", dot: "bg-pulse" }
      : mode === "mock"
      ? { text: "Live · demo feed", cls: "border-amber-400/40 text-amber-300", dot: "bg-amber-400" }
      : { text: "Connecting…", cls: "border-white/20 text-slate-400", dot: "bg-slate-500" };

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Celebration event={celebrate} />
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400">
              Live match
            </p>
            <h1 className="text-2xl font-bold">
              {homeTeam && awayTeam ? `${homeTeam} vs ${awayTeam}` : `Match ${matchId}`}
            </h1>
          </div>
          <span
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${badge.cls}`}
          >
            <span className={`h-2 w-2 rounded-full ${badge.dot}`} />
            {badge.text}
          </span>
        </div>

        {latestScore && (
          <div className="mb-4 rounded-2xl border border-white/10 bg-pitch-900/60 p-4 text-center">
            <p
              key={`${latestScore.home}-${latestScore.away}`}
              className="animate-score-pop font-mono text-4xl font-bold"
            >
              {latestScore.home} &ndash; {latestScore.away}
            </p>
            {homeTeam && awayTeam && (
              <p className="mt-1 text-xs uppercase tracking-widest text-slate-500">
                {homeTeam} · {awayTeam}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {events.length === 0 && (
            <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
              {mode === "connecting"
                ? "Connecting to the live feed…"
                : "Waiting for the first Big Moment…"}
            </p>
          )}
          {events.map((event, i) => (
            <BigMomentCard key={event.id} event={event} isNew={i === 0} />
          ))}
        </div>
      </div>

      <aside className="flex flex-col gap-4">
        <LivePulse pulseValue={events.length} />
        <div className="rounded-2xl border border-white/10 bg-pitch-900/60 p-4 text-xs text-slate-400">
          <p className="font-semibold text-slate-200">About this feed</p>
          <p className="mt-1">
            {mode === "txline" ? (
              <>
                Events are streamed live from the{" "}
                <span className="text-pulse">TxLINE</span> World Cup feed and are
                cryptographically verifiable on Solana.
              </>
            ) : mode === "mock" ? (
              <>
                Showing the built-in <span className="text-amber-300">demo feed</span>{" "}
                (no live TxLINE fixture for this id). Open a real fixture from the
                home page to see the live TxLINE stream.
              </>
            ) : (
              "Connecting…"
            )}
          </p>
        </div>
        <CardGallery />
      </aside>
    </div>
  );
}
