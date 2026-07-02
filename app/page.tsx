"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Fixture } from "@/lib/types";

interface FixturesResponse {
  configured: boolean;
  fixtures: Fixture[];
}

/** A match is "live" from kickoff until ~2h45m after (covers ET + pens). */
const LIVE_WINDOW_MS = 2.75 * 60 * 60 * 1000;

function fixtureState(f: Fixture, now: number): "live" | "upcoming" | "played" {
  if (now >= f.startTimeMs && now - f.startTimeMs < LIVE_WINDOW_MS) return "live";
  return now < f.startTimeMs ? "upcoming" : "played";
}

function countdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
}

export default function HomePage() {
  const [data, setData] = useState<FixturesResponse | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    fetch("/api/fixtures")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ configured: false, fixtures: [] }));
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const fixtures = data?.fixtures ?? [];
  const live = fixtures.filter((f) => fixtureState(f, now) === "live");
  const nextUp = fixtures
    .filter((f) => fixtureState(f, now) === "upcoming")
    .sort((a, b) => a.startTimeMs - b.startTimeMs)[0];

  return (
    <div className="flex flex-col gap-10">
      <section className="text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-pulse">
          TxODDS World Cup Hackathon &middot; Consumer &amp; Fan Experiences
        </p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
          Matchday Pulse
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-slate-300">
          Every goal, red card, and penalty from the live{" "}
          <span className="text-pulse">TxLINE</span> feed becomes a shareable Big
          Moment Card — verifiable on-chain and collectible as a gas-free
          compressed NFT on Solana. Feel the hype with the Live Pulse, and test
          your instincts in the prediction mini-game.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/predict"
            className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-slate-100 hover:bg-white/5"
          >
            Try the prediction game
          </Link>
          <Link
            href="/collection"
            className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-slate-100 hover:bg-white/5"
          >
            My collection
          </Link>
        </div>
      </section>

      {/* Live-now banner + next kickoff countdown */}
      {(live.length > 0 || nextUp) && (
        <section className="flex flex-col gap-2 sm:flex-row">
          {live.map((f) => (
            <Link
              key={f.fixtureId}
              href={`/match/${f.fixtureId}`}
              className="flex flex-1 items-center justify-between rounded-2xl border border-red-500/40 bg-red-500/10 p-4 transition hover:border-red-400"
            >
              <div>
                <span className="flex items-center gap-1.5 text-[10px] font-extrabold tracking-widest text-red-400">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-red-500" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                  </span>
                  LIVE NOW
                </span>
                <p className="mt-1 text-lg font-bold text-white">
                  {f.homeTeam} <span className="text-slate-500">v</span> {f.awayTeam}
                </p>
              </div>
              <span className="text-sm font-semibold text-red-300">Watch →</span>
            </Link>
          ))}
          {nextUp && live.length === 0 && (
            <Link
              href={`/match/${nextUp.fixtureId}`}
              className="flex flex-1 items-center justify-between rounded-2xl border border-pulse/40 bg-pulse/5 p-4 transition hover:border-pulse"
            >
              <div>
                <span className="text-[10px] font-extrabold tracking-widest text-pulse">
                  NEXT KICKOFF
                </span>
                <p className="mt-1 text-lg font-bold text-white">
                  {nextUp.homeTeam} <span className="text-slate-500">v</span>{" "}
                  {nextUp.awayTeam}
                </p>
              </div>
              <span className="font-mono text-xl font-bold text-pulse">
                {countdown(nextUp.startTimeMs - now)}
              </span>
            </Link>
          )}
        </section>
      )}

      {/* Live / upcoming fixtures from the real TxLINE feed */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Fixtures</h2>
          {data && (
            <span className="text-xs text-slate-500">
              {data.configured
                ? `${data.fixtures.length} from TxLINE`
                : "TxLINE not configured"}
            </span>
          )}
        </div>

        {!data && (
          <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
            Loading fixtures…
          </p>
        )}

        {data && data.fixtures.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {data.fixtures.slice(0, 12).map((f) => {
              const state = fixtureState(f, now);
              return (
                <Link
                  key={f.fixtureId}
                  href={`/match/${f.fixtureId}`}
                  className={`flex items-center justify-between rounded-2xl border bg-pitch-900/60 p-4 transition hover:border-pulse/40 ${
                    state === "live" ? "border-red-500/40" : "border-white/10"
                  }`}
                >
                  <div>
                    <p className="font-semibold text-white">
                      {f.homeTeam} <span className="text-slate-500">v</span>{" "}
                      {f.awayTeam}
                    </p>
                    <p className="text-xs text-slate-500">{f.competition}</p>
                  </div>
                  {state === "live" ? (
                    <span className="flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-[10px] font-extrabold tracking-widest text-red-400">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                      LIVE
                    </span>
                  ) : state === "played" ? (
                    <span className="rounded-full bg-black/30 px-2.5 py-1 text-[10px] font-bold tracking-widest text-slate-400">
                      FT · replay
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">
                      {new Date(f.startTime).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {data && data.fixtures.length === 0 && (
          <Link
            href="/match/demo-1"
            className="flex items-center justify-between rounded-2xl border border-amber-400/30 bg-pitch-900/60 p-4 transition hover:border-amber-400/60"
          >
            <div>
              <p className="font-semibold text-white">Demo match</p>
              <p className="text-xs text-slate-500">
                Simulated feed — {data.configured ? "no live fixtures right now" : "TxLINE credentials not set"}
              </p>
            </div>
            <span className="text-xs text-amber-300">Watch demo →</span>
          </Link>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <FeatureCard
          title="Big Moment Cards"
          body="Auto-generated shareable cards for every match-defining event, mintable as gas-free compressed NFTs."
        />
        <FeatureCard
          title="Verified on-chain"
          body="Every moment carries a TxLINE Merkle proof anchored to Solana — provably real, not invented."
        />
        <FeatureCard
          title="Predict & Compete"
          body="Call the next event before it happens — no money, just bragging rights and a leaderboard."
        />
      </section>
    </div>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-pitch-900/60 p-4">
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="mt-1.5 text-sm text-slate-400">{body}</p>
    </div>
  );
}
