/**
 * umi.ts (server-only)
 * ---------------------------------------------------------------------------
 * Metaplex UMI instance configured for Solana devnet with the Bubblegum
 * (compressed NFT) + DAS API plugins, signing as the service keypair.
 *
 * The service keypair is the Bubblegum tree authority / fee-payer, so mints
 * cost the *fan* nothing (their wallet is only the `leafOwner`, not a signer).
 * The secret lives in TXLINE_SERVICE_SECRET (a JSON byte array) and must never
 * reach the client bundle — only import this from server code (API routes/scripts).
 */

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplBubblegum } from "@metaplex-foundation/mpl-bubblegum";
import { dasApi } from "@metaplex-foundation/digital-asset-standard-api";
import { keypairIdentity, type Umi } from "@metaplex-foundation/umi";

/** Devnet RPC. Helius is used when available so the DAS API (gallery) works. */
export function devnetRpcUrl(): string {
  const key = process.env.HELIUS_API_KEY;
  return key
    ? `https://devnet.helius-rpc.com/?api-key=${key}`
    : "https://api.devnet.solana.com";
}

let cached: Umi | null = null;

export function getUmi(): Umi {
  if (cached) return cached;

  const secret = process.env.TXLINE_SERVICE_SECRET;
  if (!secret) throw new Error("TXLINE_SERVICE_SECRET is not set");

  const umi = createUmi(devnetRpcUrl());
  umi.use(mplBubblegum());
  umi.use(dasApi());

  const bytes = new Uint8Array(JSON.parse(secret) as number[]);
  const keypair = umi.eddsa.createKeypairFromSecretKey(bytes);
  umi.use(keypairIdentity(keypair));

  cached = umi;
  return umi;
}

export function merkleTreeAddress(): string {
  const addr = process.env.MERKLE_TREE_ADDRESS;
  if (!addr) throw new Error("MERKLE_TREE_ADDRESS is not set");
  return addr;
}

export function mintingConfigured(): boolean {
  return Boolean(process.env.TXLINE_SERVICE_SECRET && process.env.MERKLE_TREE_ADDRESS);
}
