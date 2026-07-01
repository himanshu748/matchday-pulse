"use client";

/**
 * mintCard.ts (client)
 * ---------------------------------------------------------------------------
 * Mints a Big Moment as a REAL Metaplex Bubblegum V2 compressed NFT by calling
 * our server route `POST /api/mint` (the mint authority key must stay
 * server-side). Keeps the original `MintCardResult` shape so the call site in
 * `components/BigMomentCard.tsx` is unchanged.
 */

import type { PublicKey } from "@solana/web3.js";
import type { MatchEvent } from "./types";

export interface MintCardInput {
  /** The Big Moment event this card commemorates. */
  event: MatchEvent;
  /** Connected wallet that will own the resulting compressed NFT. */
  ownerWallet: PublicKey;
}

export interface MintCardResult {
  success: boolean;
  /** cNFT asset id (best-effort; may be undefined even on success). */
  assetId?: string;
  /** Transaction signature. */
  signature?: string;
  /** Devnet explorer link for the mint transaction. */
  explorerUrl: string;
  /** Off-chain metadata URI. */
  uri?: string;
  /** False for real mints; kept for UI compatibility. */
  isMock: boolean;
}

export async function mintCard(input: MintCardInput): Promise<MintCardResult> {
  const { event, ownerWallet } = input;
  if (!ownerWallet) {
    throw new Error("mintCard: a connected wallet public key is required");
  }

  const res = await fetch("/api/mint", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, ownerWallet: ownerWallet.toBase58() }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || `Mint failed (${res.status})`);
  }

  return {
    success: true,
    assetId: data.assetId,
    signature: data.signature,
    explorerUrl:
      data.explorerUrl ??
      (data.signature
        ? `https://explorer.solana.com/tx/${data.signature}?cluster=devnet`
        : ""),
    uri: data.uri,
    isMock: Boolean(data.isMock),
  };
}
