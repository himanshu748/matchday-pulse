"use client";

import { use, useEffect, useState } from "react";
import BigMomentCard from "@/components/BigMomentCard";
import LivePulse from "@/components/LivePulse";
import { subscribeToMatchFeed } from "@/lib/mockFeed";
import type { MatchEvent } from "@/lib/types";

const MAX_FEED_LENGTH = 25;

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
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    setEvents([]);
    setConnected(true);

    const subscription = subscribeToMatchFeed(matchId, (event) => {
      setEvents((prev) => [event, ...prev].slice(0, MAX_FEED_LENGTH));
    });

    return () => {
      subscription.unsubscribe();
      setConnected(false);
    };
  }, [matchId]);

  const latestScore = events[0]?.score;

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400">
              Live match
            </p>
            <h1 className="text-2xl font-bold">Match {matchId}</h1>
          </div>
          <span
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
              connected
                ? "border-pulse/40 text-pulse"
                : "border-white/20 text-slate-400"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                connected ? "bg-pulse" : "bg-slate-500"
              }`}
            />
            {connected ? "Live (mock feed)" : "Disconnected"}
          </span>
        </div>

        {latestScore && (
          <div className="mb-4 rounded-2xl border border-white/10 bg-pitch-900/60 p-4 text-center">
            <p className="font-mono text-4xl font-bold">
              {latestScore.home} &ndash; {latestScore.away}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {events.length === 0 && (
            <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
              Waiting for the first Big Moment&hellip; (mock events arrive
              every few seconds)
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
            Events on this page come from{" "}
            <code className="rounded bg-black/30 px-1 py-0.5">
              lib/mockFeed.ts
            </code>
            , a fake generator standing in for the real TxODDS WebSocket feed
            until API access is confirmed.
          </p>
        </div>
      </aside>
    </div>
  );
}
