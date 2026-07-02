"use client";

import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { subscribeToMatchFeed, type FeedMode } from "@/lib/feed";
import type { Fixture, MatchEvent, MatchEventType } from "@/lib/types";

/**
 * Prediction mini-game — REAL by default.
 *
 * On load it looks for a World Cup fixture that is live right now (from the
 * real TxLINE fixtures feed) and runs the game on genuine match events; a
 * correct call is settled against the actual next Big Moment and recorded on
 * the persistent leaderboard (Supabase) under your connected wallet.
 *
 * Only when NO match is live does it offer a clearly-labeled practice mode
 * (simulated events, scores not recorded). No fake data anywhere.
 */

const PREDICTABLE_TYPES: MatchEventType[] = [
  "goal",
  "yellow_card",
  "red_card",
  "substitution",
];

const TYPE_LABEL: Record<MatchEventType, string> = {
  goal: "Goal",
  red_card: "Red Card",
  yellow_card: "Yellow Card",
  penalty: "Penalty",
  substitution: "Substitution",
  halftime: "Half Time",
  fulltime: "Full Time",
  kickoff: "Kick Off",
};

/** A fixture is treated as live from kickoff until ~2h45m after. */
const LIVE_WINDOW_MS = 165 * 60 * 1000;

interface LeaderboardEntryRow {
  wallet: string;
  points: number;
  correct: number;
  rounds: number;
}

type RoundResult = "pending" | "correct" | "incorrect";

function shortWallet(w: string): string {
  return w.length > 12 ? `${w.slice(0, 4)}…${w.slice(-4)}` : w;
}

export default function PredictPage() {
  const { publicKey } = useWallet();

  const [fixtures, setFixtures] = useState<Fixture[] | null>(null);
  const [practice, setPractice] = useState(false);
  const [mode, setMode] = useState<FeedMode>("connecting");

  const [pick, setPick] = useState<MatchEventType | null>(null);
  const [lockedPick, setLockedPick] = useState<MatchEventType | null>(null);
  const [lastEvent, setLastEvent] = useState<MatchEvent | null>(null);
  const [result, setResult] = useState<RoundResult>("pending");
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [rounds, setRounds] = useState(0);

  const [board, setBoard] = useState<{ available: boolean; entries: LeaderboardEntryRow[] } | null>(null);

  // Real fixtures → find the match that's live right now.
  useEffect(() => {
    fetch("/api/fixtures")
      .then((r) => r.json())
      .then((d: { fixtures: Fixture[] }) => setFixtures(d.fixtures ?? []))
      .catch(() => setFixtures([]));
  }, []);

  const liveFixture = useMemo(() => {
    if (!fixtures) return null;
    const now = Date.now();
    return (
      fixtures.find(
        (f) => f.startTimeMs <= now && now - f.startTimeMs < LIVE_WINDOW_MS
      ) ?? null
    );
  }, [fixtures]);

  const nextFixture = useMemo(() => {
    if (!fixtures) return null;
    const now = Date.now();
    return fixtures.find((f) => f.startTimeMs > now) ?? null;
  }, [fixtures]);

  const gameFeedId = liveFixture ? liveFixture.fixtureId : practice ? "practice" : null;
  const isRealGame = Boolean(liveFixture);

  const refreshBoard = () => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then(setBoard)
      .catch(() => setBoard({ available: false, entries: [] }));
  };
  useEffect(refreshBoard, []);

  // Subscribe to the active game feed (real live match, or explicit practice).
  useEffect(() => {
    if (!gameFeedId) return;
    setLastEvent(null);
    setResult("pending");

    const wallet = publicKey?.toBase58();

    const subscription = subscribeToMatchFeed(
      gameFeedId,
      (event) => {
        // Only predictable Big Moments settle a round.
        if (!PREDICTABLE_TYPES.includes(event.type)) return;
        setLastEvent(event);
        setRounds((r) => r + 1);

        setLockedPick((currentLocked) => {
          if (currentLocked) {
            const correct = currentLocked === event.type;
            setResult(correct ? "correct" : "incorrect");
            setScore((s) => (correct ? s + 10 : s));
            setStreak((s) => (correct ? s + 1 : 0));
            // Real games persist to the real leaderboard.
            if (isRealGame && wallet) {
              fetch("/api/leaderboard", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ wallet, correct }),
              })
                .then(refreshBoard)
                .catch(() => {});
            }
          } else {
            setResult("pending");
          }
          return null; // unlock for the next round
        });
      },
      { onStatus: setMode }
    );

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameFeedId, isRealGame, publicKey?.toBase58()]);

  function handlePick(type: MatchEventType) {
    if (lockedPick || !gameFeedId) return;
    setPick(type);
    setLockedPick(type);
    setResult("pending");
  }

  const loading = fixtures === null;

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Predict the next Big Moment</h1>
          {isRealGame ? (
            <span className="flex items-center gap-1.5 rounded-full border border-pulse/40 px-3 py-1 text-xs font-semibold text-pulse">
              <span className="h-2 w-2 rounded-full bg-pulse" />
              LIVE · {liveFixture!.homeTeam} v {liveFixture!.awayTeam}
            </span>
          ) : practice ? (
            <span className="flex items-center gap-1.5 rounded-full border border-amber-400/40 px-3 py-1 text-xs font-semibold text-amber-300">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Practice · simulated
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-slate-400">
          {isRealGame
            ? "Call the next real event in the live match — goal, card, or sub. +10 points per correct call, recorded to the wallet leaderboard. No wagering, just bragging rights."
            : "Call what happens next. +10 points per correct call. No wagering, just bragging rights."}
        </p>

        {loading && (
          <p className="mt-6 rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
            Checking for a live World Cup match…
          </p>
        )}

        {/* No live match: honest state + labeled practice option. */}
        {!loading && !gameFeedId && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-pitch-900/60 p-8 text-center">
            <p className="text-sm font-semibold text-slate-200">
              No World Cup match is live right now.
            </p>
            {nextFixture && (
              <p className="mt-2 text-sm text-slate-400">
                Next up:{" "}
                <span className="text-white">
                  {nextFixture.homeTeam} v {nextFixture.awayTeam}
                </span>{" "}
                —{" "}
                {new Date(nextFixture.startTimeMs).toLocaleString(undefined, {
                  weekday: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                . Come back at kickoff to play for real leaderboard points.
              </p>
            )}
            <button
              onClick={() => setPractice(true)}
              className="mt-4 rounded-full border border-amber-400/40 bg-amber-400/10 px-5 py-2 text-sm font-semibold text-amber-300 hover:bg-amber-400/20"
            >
              Play practice mode (simulated events)
            </button>
            <p className="mt-2 text-[11px] text-slate-500">
              Practice scores are not recorded to the leaderboard.
            </p>
          </div>
        )}

        {gameFeedId && (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {PREDICTABLE_TYPES.map((type) => {
                const selected = pick === type;
                const disabled = !!lockedPick;
                return (
                  <button
                    key={type}
                    onClick={() => handlePick(type)}
                    disabled={disabled}
                    className={`rounded-2xl border p-4 text-sm font-semibold transition ${
                      selected
                        ? "border-pulse bg-pulse/10 text-pulse"
                        : "border-white/10 bg-pitch-900/60 text-slate-200 hover:border-white/30"
                    } ${disabled && !selected ? "opacity-40" : ""} disabled:cursor-not-allowed`}
                  >
                    {TYPE_LABEL[type]}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-pitch-900/60 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">
                  {lockedPick
                    ? `Locked in: ${TYPE_LABEL[lockedPick]} — waiting for the next event…`
                    : mode === "waiting"
                    ? "Feed connected — waiting for match action…"
                    : "Make your pick before the next event lands."}
                </span>
                <span className="font-mono text-slate-300">round {rounds}</span>
              </div>

              {lastEvent && result !== "pending" && (
                <div
                  className={`mt-3 rounded-xl border p-3 text-sm ${
                    result === "correct"
                      ? "border-pulse/40 bg-pulse/10 text-pulse"
                      : "border-red-500/40 bg-red-500/10 text-red-300"
                  }`}
                >
                  {result === "correct" ? "Correct! " : "Missed — "}
                  it was <strong>{TYPE_LABEL[lastEvent.type]}</strong> at minute{" "}
                  {lastEvent.minute}&apos; ({lastEvent.team}).
                </div>
              )}

              {isRealGame && !publicKey && (
                <p className="mt-3 text-[11px] text-amber-300/80">
                  Connect a wallet to record your points on the leaderboard.
                </p>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <StatBox label="Your score" value={score} />
              <StatBox
                label="Current streak"
                value={streak}
                flare={streak >= 2 ? "🔥".repeat(Math.min(streak, 3)) : undefined}
              />
            </div>
          </>
        )}
      </div>

      <aside>
        <div className="rounded-2xl border border-white/10 bg-pitch-900/60 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-200">Leaderboard</h2>
            <span className="rounded-full bg-pulse/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-pulse">
              live · persistent
            </span>
          </div>

          {!board && <p className="mt-3 text-sm text-slate-500">Loading…</p>}

          {board && !board.available && (
            <p className="mt-3 text-sm text-slate-500">
              Leaderboard backend unavailable right now.
            </p>
          )}

          {board?.available && board.entries.length === 0 && (
            <p className="mt-3 text-sm text-slate-500">
              No scores yet — be the first. Connect a wallet, call a live
              moment correctly, and your points land here for everyone to see.
            </p>
          )}

          {board?.available && board.entries.length > 0 && (
            <ul className="mt-3 divide-y divide-white/5">
              {board.entries.map((entry, i) => {
                const you = publicKey?.toBase58() === entry.wallet;
                return (
                  <li
                    key={entry.wallet}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span className="flex items-center gap-2 text-slate-300">
                      <span className="w-5 text-right font-mono text-slate-500">
                        {i + 1}
                      </span>
                      <span className={`font-mono ${you ? "text-pulse" : ""}`}>
                        {shortWallet(entry.wallet)}
                        {you ? " (you)" : ""}
                      </span>
                    </span>
                    <span className="font-semibold text-slate-100">
                      {entry.points} pts
                      <span className="ml-2 text-[10px] text-slate-500">
                        {entry.correct}/{entry.rounds}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          <p className="mt-3 text-[11px] text-slate-500">
            Stored in Postgres (Supabase), keyed by wallet address. Points are
            only awarded for calls settled against real TxLINE match events.
          </p>
        </div>
      </aside>
    </div>
  );
}

function StatBox({
  label,
  value,
  flare,
}: {
  label: string;
  value: number;
  flare?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-pitch-900/60 p-4 text-center">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p
        key={value}
        className="mt-1 animate-score-pop font-mono text-2xl font-bold text-white"
      >
        {value} {flare && <span className="text-xl">{flare}</span>}
      </p>
    </div>
  );
}
