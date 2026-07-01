"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import type { MatchEvent, MatchEventType } from "@/lib/types";
import { MOCK_TEAM_META } from "@/lib/mockFeed";
import { mintCard, type MintCardResult } from "@/lib/mintCard";

const EVENT_META: Record<
  MatchEventType,
  { label: string; icon: string; accent: string }
> = {
  goal: { label: "GOAL", icon: "⚽", accent: "from-pulse/30" },
  red_card: { label: "RED CARD", icon: "🟥", accent: "from-red-500/30" },
  penalty: { label: "PENALTY", icon: "🎯", accent: "from-amber-400/30" },
  halftime: { label: "HALF TIME", icon: "⏸️", accent: "from-sky-400/30" },
};

interface BigMomentCardProps {
  event: MatchEvent;
  /** Marks the newest card in a feed for a subtle entrance animation. */
  isNew?: boolean;
}

export default function BigMomentCard({ event, isNew }: BigMomentCardProps) {
  const { publicKey } = useWallet();
  const [mintState, setMintState] = useState<
    "idle" | "minting" | "minted" | "error"
  >("idle");
  const [mintResult, setMintResult] = useState<MintCardResult | null>(null);

  const meta = EVENT_META[event.type];
  const teamMeta = MOCK_TEAM_META[event.team as keyof typeof MOCK_TEAM_META];
  const teamColor = teamMeta?.color ?? "#22c55e";

  async function handleMint() {
    if (!publicKey) return;
    setMintState("minting");
    try {
      const result = await mintCard({ event, ownerWallet: publicKey });
      setMintResult(result);
      setMintState("minted");
    } catch (err) {
      console.error(err);
      setMintState("error");
    }
  }

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${meta.accent} to-pitch-900 p-4 shadow-lg ${
        isNew ? "animate-slide-in" : ""
      }`}
      style={{ borderColor: `${teamColor}33` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none">{meta.icon}</span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              {meta.label}
            </p>
            <p
              className="text-sm font-bold"
              style={{ color: teamColor }}
            >
              {event.team}
            </p>
          </div>
        </div>
        <div className="rounded-full bg-black/30 px-2.5 py-1 text-xs font-mono text-slate-200">
          {event.minute}&apos;
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between">
        <div>
          {event.player && (
            <p className="text-lg font-semibold text-white">{event.player}</p>
          )}
          {event.score && (
            <p className="mt-0.5 font-mono text-2xl font-bold text-white/90">
              {event.score.home} &ndash; {event.score.away}
            </p>
          )}
        </div>

        <button
          onClick={handleMint}
          disabled={!publicKey || mintState === "minting" || mintState === "minted"}
          className="rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          title={
            publicKey
              ? "Mint this moment as a compressed NFT (demo)"
              : "Connect a wallet to mint"
          }
        >
          {mintState === "idle" && "Mint card"}
          {mintState === "minting" && "Minting…"}
          {mintState === "minted" && "Minted ✓"}
          {mintState === "error" && "Retry mint"}
        </button>
      </div>

      {mintResult && (
        <p className="mt-2 truncate text-[11px] text-slate-400">
          DEMO MINT &middot; asset {mintResult.assetId}
        </p>
      )}

      <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-500">
        {new Date(event.timestamp).toLocaleTimeString()} &middot; match{" "}
        {event.matchId}
      </p>
    </div>
  );
}
