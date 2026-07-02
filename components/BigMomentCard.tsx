"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import type { MatchEvent, MatchEventType, VerificationResult } from "@/lib/types";
import { mintCard, type MintCardResult } from "@/lib/mintCard";
import { computeRarity, RARITY_META } from "@/lib/rarity";

const EVENT_META: Record<
  MatchEventType,
  { label: string; icon: string; accent: string; color: string }
> = {
  goal: { label: "GOAL", icon: "⚽", accent: "from-pulse/30", color: "#22c55e" },
  red_card: { label: "RED CARD", icon: "🟥", accent: "from-red-500/30", color: "#ef4444" },
  yellow_card: { label: "YELLOW CARD", icon: "🟨", accent: "from-amber-400/30", color: "#f59e0b" },
  penalty: { label: "PENALTY", icon: "🎯", accent: "from-amber-400/30", color: "#f59e0b" },
  substitution: { label: "SUBSTITUTION", icon: "🔁", accent: "from-sky-400/30", color: "#38bdf8" },
  halftime: { label: "HALF TIME", icon: "⏸️", accent: "from-sky-400/30", color: "#38bdf8" },
  fulltime: { label: "FULL TIME", icon: "🏁", accent: "from-violet-400/30", color: "#a78bfa" },
  kickoff: { label: "KICK OFF", icon: "⚽", accent: "from-pulse/30", color: "#22c55e" },
};

interface BigMomentCardProps {
  event: MatchEvent;
  /** Marks the newest card in a feed for a subtle entrance animation. */
  isNew?: boolean;
}

type VerifyState =
  | { status: "idle" | "checking" }
  | { status: "done"; result: VerificationResult };

export default function BigMomentCard({ event, isNew }: BigMomentCardProps) {
  const { publicKey } = useWallet();
  const [mintState, setMintState] = useState<
    "idle" | "minting" | "minted" | "error"
  >("idle");
  const [mintResult, setMintResult] = useState<MintCardResult | null>(null);
  const [verify, setVerify] = useState<VerifyState>({ status: "idle" });

  const meta = EVENT_META[event.type];
  const teamColor = meta.color;
  const verifiable = event.source === "txline" && event.seq != null;
  const rarity = computeRarity(event.type, event.minute);
  const rarityMeta = RARITY_META[rarity];

  const shareText = encodeURIComponent(
    `${meta.icon} ${meta.label} — ${event.team} ${event.minute}'` +
      (event.score ? ` (${event.score.home}-${event.score.away})` : "") +
      ` · caught live on Matchday Pulse, verifiable on @solana #WorldCup`
  );

  // Fetch the on-chain Merkle-proof verification for real TxLINE moments.
  useEffect(() => {
    if (!verifiable) return;
    let cancelled = false;
    setVerify({ status: "checking" });
    fetch(`/api/verify/${event.matchId}/${event.seq}`)
      .then((r) => r.json())
      .then((result: VerificationResult) => {
        if (!cancelled) setVerify({ status: "done", result });
      })
      .catch(() => {
        if (!cancelled)
          setVerify({
            status: "done",
            result: {
              verified: false,
              fixtureId: event.matchId,
              seq: event.seq ?? 0,
              detail: "Verification unavailable.",
            },
          });
      });
    return () => {
      cancelled = true;
    };
  }, [verifiable, event.matchId, event.seq]);

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
      className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br ${meta.accent} to-pitch-900 p-4 shadow-lg ${rarityMeta.ring} ${rarityMeta.glow} ${
        isNew ? "animate-slide-in" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none">{meta.icon}</span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              {meta.label}
            </p>
            <p className="text-sm font-bold" style={{ color: teamColor }}>
              {event.team}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {rarity !== "common" && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-extrabold tracking-widest"
              style={{
                color: rarityMeta.color,
                background: `${rarityMeta.color}1a`,
                border: `1px solid ${rarityMeta.color}55`,
              }}
            >
              {rarityMeta.label}
            </span>
          )}
          <div className="rounded-full bg-black/30 px-2.5 py-1 text-xs font-mono text-slate-200">
            {event.minute}&apos;
          </div>
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

        <div className="flex items-center gap-1.5">
          <a
            href={`https://twitter.com/intent/tweet?text=${shareText}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-white/10"
            title="Share this moment"
          >
            Share
          </a>
          <button
            onClick={handleMint}
            disabled={!publicKey || mintState === "minting" || mintState === "minted"}
            className="rounded-full border border-pulse/40 bg-pulse/10 px-3 py-1.5 text-xs font-semibold text-pulse transition hover:bg-pulse/20 disabled:cursor-not-allowed disabled:opacity-50"
            title={
              publicKey
                ? "Mint this moment as a compressed NFT (gas-free)"
                : "Connect a wallet to mint"
            }
          >
            {mintState === "idle" && "Mint card"}
            {mintState === "minting" && "Minting…"}
            {mintState === "minted" && "Minted ✓"}
            {mintState === "error" && "Retry mint"}
          </button>
        </div>
      </div>

      {/* On-chain verification badge — the trust signal for fans. */}
      {verifiable && (
        <div className="mt-3">
          {verify.status === "checking" && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-slate-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" />
              Verifying on Solana…
            </span>
          )}
          {verify.status === "done" && verify.result.verified && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-pulse/40 bg-pulse/10 px-2.5 py-1 text-[11px] font-semibold text-pulse"
              title={verify.result.detail}
            >
              ✓ Verified on-chain
            </span>
          )}
          {verify.status === "done" && !verify.result.verified && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-slate-400"
              title={verify.result.detail}
            >
              Unverified
            </span>
          )}
        </div>
      )}

      {mintResult && (
        <p className="mt-2 truncate text-[11px] text-slate-400">
          {mintResult.isMock ? "DEMO MINT" : "cNFT minted"} &middot;{" "}
          {mintResult.explorerUrl ? (
            <a
              href={mintResult.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="text-pulse hover:underline"
            >
              view transaction ↗
            </a>
          ) : (
            <span>asset {mintResult.assetId}</span>
          )}
        </p>
      )}

      <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-500">
        {new Date(event.timestamp).toLocaleTimeString()} &middot;{" "}
        {event.source === "txline" ? "TxLINE feed" : "demo feed"} &middot; match{" "}
        {event.matchId}
      </p>
    </div>
  );
}
