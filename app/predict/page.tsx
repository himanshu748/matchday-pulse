"use client";

import { useEffect, useState } from "react";
import { subscribeToMatchFeed } from "@/lib/mockFeed";
import type { LeaderboardEntry, MatchEvent, MatchEventType } from "@/lib/types";

/**
 * Prediction mini-game (in-memory, no backend yet).
 *
 * Flow: the player picks what they think the NEXT mock event type will be.
 * When the mock feed emits the next event, we check the guess, award
 * points, then let the player pick again for the following event.
 *
 * TODO(next session, per README): persist scores + leaderboard via a real
 * backend (Supabase table keyed by wallet pubkey) instead of local state,
 * and settle predictions against TxLINE's on-chain audit trail per the
 * hackathon concept doc.
 */

const PREDICTABLE_TYPES: MatchEventType[] = [
  "goal",
  "red_card",
  "penalty",
  "halftime",
];

const TYPE_LABEL: Record<MatchEventType, string> = {
  goal: "Goal",
  red_card: "Red Card",
  penalty: "Penalty",
  halftime: "Half Time",
};

// Mock leaderboard data — no backend/persistence wired up yet.
const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, wallet: "7xKX...v9Qh", points: 340, correctPredictions: 17 },
  { rank: 2, wallet: "3fM1...tRc2", points: 295, correctPredictions: 14 },
  { rank: 3, wallet: "9pLz...w4Ke", points: 210, correctPredictions: 11 },
  { rank: 4, wallet: "Bk2s...Ln8f", points: 180, correctPredictions: 9 },
  { rank: 5, wallet: "Ht7q...Zx3d", points: 120, correctPredictions: 6 },
];

type RoundResult = "pending" | "correct" | "incorrect";

export default function PredictPage() {
  const [pick, setPick] = useState<MatchEventType | null>(null);
  const [lockedPick, setLockedPick] = useState<MatchEventType | null>(null);
  const [lastEvent, setLastEvent] = useState<MatchEvent | null>(null);
  const [result, setResult] = useState<RoundResult>("pending");
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [rounds, setRounds] = useState(0);

  useEffect(() => {
    const subscription = subscribeToMatchFeed("predict-demo", (event) => {
      setLastEvent(event);
      setRounds((r) => r + 1);

      setLockedPick((currentLocked) => {
        if (currentLocked) {
          const correct = currentLocked === event.type;
          setResult(correct ? "correct" : "incorrect");
          setScore((s) => (correct ? s + 10 : s));
          setStreak((s) => (correct ? s + 1 : 0));
        } else {
          setResult("pending");
        }
        return null; // unlock for the next round
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  function handlePick(type: MatchEventType) {
    if (lockedPick) return; // already locked in for this round
    setPick(type);
    setLockedPick(type);
    setResult("pending");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
      <div>
        <h1 className="text-2xl font-bold">Predict the next Big Moment</h1>
        <p className="mt-1 text-sm text-slate-400">
          Pick what you think happens next. A new mock event lands every few
          seconds — get it right for +10 points. This is a fan mini-game, not
          a money market: no wagering, just bragging rights.
        </p>

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
                : "Make your pick above before the next event lands."}
            </span>
            <span className="font-mono text-slate-300">
              round {rounds}
            </span>
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
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <StatBox label="Your score" value={score} />
          <StatBox label="Current streak" value={streak} />
        </div>
      </div>

      <aside>
        <div className="rounded-2xl border border-white/10 bg-pitch-900/60 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-200">Leaderboard</h2>
            <span className="rounded-full bg-black/30 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">
              mock data
            </span>
          </div>
          <ul className="mt-3 divide-y divide-white/5">
            {MOCK_LEADERBOARD.map((entry) => (
              <li
                key={entry.wallet}
                className="flex items-center justify-between py-2 text-sm"
              >
                <span className="flex items-center gap-2 text-slate-300">
                  <span className="w-5 text-right font-mono text-slate-500">
                    {entry.rank}
                  </span>
                  <span className="font-mono">{entry.wallet}</span>
                </span>
                <span className="font-semibold text-slate-100">
                  {entry.points} pts
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-slate-500">
            Not persisted — this list is hardcoded. Real version should read
            from a backend table keyed by wallet address, settled against
            TxLINE&apos;s on-chain audit trail (see README).
          </p>
        </div>
      </aside>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-pitch-900/60 p-4 text-center">
      <p className="text-xs uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-mono text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
