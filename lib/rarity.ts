/**
 * rarity.ts
 * ---------------------------------------------------------------------------
 * Rarity tiers for Big Moment Cards — the collectible hook. Rarity is derived
 * deterministically from the event facts (type + minute), so the same moment
 * always gets the same tier, in the UI and in the minted NFT's attributes.
 *
 * Tiers (drama-based, football logic):
 *  - Legendary: 90'+ goals (stoppage-time drama) and penalty goals
 *  - Epic:      red cards, penalties, late goals (75'+)
 *  - Rare:      any other goal
 *  - Common:    everything else (cards, subs, period markers)
 */

import type { MatchEventType } from "./types";

export type Rarity = "legendary" | "epic" | "rare" | "common";

export function computeRarity(type: MatchEventType, minute: number): Rarity {
  if (type === "goal" && minute >= 90) return "legendary";
  if (type === "goal" && minute >= 75) return "epic";
  if (type === "red_card" || type === "penalty") return "epic";
  if (type === "goal") return "rare";
  return "common";
}

export const RARITY_META: Record<
  Rarity,
  { label: string; color: string; glow: string; ring: string }
> = {
  legendary: {
    label: "LEGENDARY",
    color: "#fbbf24",
    glow: "shadow-[0_0_24px_2px_rgba(251,191,36,0.35)]",
    ring: "border-amber-400/60",
  },
  epic: {
    label: "EPIC",
    color: "#c084fc",
    glow: "shadow-[0_0_20px_1px_rgba(192,132,252,0.3)]",
    ring: "border-purple-400/50",
  },
  rare: {
    label: "RARE",
    color: "#4ade80",
    glow: "shadow-[0_0_16px_1px_rgba(74,222,128,0.25)]",
    ring: "border-pulse/50",
  },
  common: {
    label: "COMMON",
    color: "#94a3b8",
    glow: "",
    ring: "border-white/10",
  },
};
