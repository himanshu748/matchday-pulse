/**
 * mintCard.ts
 * ---------------------------------------------------------------------------
 * Stub for minting a Big Moment Card as a Metaplex Bubblegum compressed NFT
 * (cNFT) on Solana. This function is NOT wired up to devnet — it currently
 * just validates inputs and returns a fake result so UI flows (button
 * states, toasts, "view on explorer" links) can be built against a stable
 * shape before the real minting pipeline exists.
 *
 * --------------------------------------------------------------------------
 * TODO(next session): implement real compressed-NFT minting via Bubblegum.
 *
 * High-level plan:
 *   1. Pre-req (one-time, off-chain setup, likely a script under scripts/):
 *      - Create a Merkle tree account via `@solana/spl-account-compression`
 *        + Bubblegum's `createTree` instruction. Store the resulting tree
 *        address in `MERKLE_TREE_ADDRESS` (see .env.example).
 *      - Optionally create a Collection NFT ("Matchday Pulse — World Cup")
 *        via regular Metaplex Token Metadata, store as
 *        `COLLECTION_MINT_ADDRESS`.
 *
 *   2. Per-mint flow (this function, eventually running server-side in an
 *      API route or edge function — NOT in the browser, since minting
 *      needs a fee-payer/tree-authority keypair that must never ship to
 *      the client):
 *        a. Build cNFT metadata (name, image, attributes) from the
 *           `MatchEvent` + card image/render — see BigMomentCard.tsx for
 *           the visual this should mirror. Upload metadata JSON to
 *           Arweave/IPFS/NFT.Storage (or bundle via Irys) and get a URI.
 *        b. Construct a Bubblegum `mintV1` (or `mintToCollectionV1` if using
 *           a collection) instruction referencing `MERKLE_TREE_ADDRESS`,
 *           the metadata URI, and the connected wallet's public key as
 *           `leafOwner`.
 *        c. Sign with the tree-delegate/authority keypair (server-side
 *           secret) and send the transaction via `@solana/web3.js`
 *           `Connection` + `sendAndConfirmTransaction` (devnet cluster).
 *        d. Return the asset id (derivable from tree + leaf index, or via
 *           the Bubblegum `LeafSchema` event in the tx logs) so the client
 *           can look the cNFT up through the Metaplex DAS (Digital Asset
 *           Standard) API — regular `getAccountInfo` won't show compressed
 *           NFTs.
 *
 *   3. Client-side changes needed once real minting lands:
 *      - This function should become a `fetch("/api/mint", { ... })` call
 *        instead of running inline, since the mint authority key can't be
 *        in browser code.
 *      - Add a loading/optimistic state in the UI while the server mints
 *        and confirms the transaction (devnet confirmation can take a few
 *        seconds).
 *
 * Useful packages when implementing this:
 *   - @metaplex-foundation/mpl-bubblegum
 *   - @metaplex-foundation/umi + @metaplex-foundation/umi-bundle-defaults
 *   - @solana/spl-account-compression
 * --------------------------------------------------------------------------
 */

import type { PublicKey } from "@solana/web3.js";
import type { MatchEvent } from "./types";

export interface MintCardInput {
  /** The Big Moment event this card commemorates. */
  event: MatchEvent;
  /** Connected wallet that will own the resulting compressed NFT. */
  ownerWallet: PublicKey;
  /** Optional pre-rendered card image URL/data URI to embed as NFT media. */
  imageUri?: string;
}

export interface MintCardResult {
  /** Whether the (stubbed) mint "succeeded". Always true in the stub. */
  success: boolean;
  /** Fake asset id — in the real implementation this identifies the cNFT leaf. */
  assetId: string;
  /** Fake devnet explorer link placeholder. */
  explorerUrl: string;
  /** Indicates this is mock data, so calling UI can show a "DEMO MINT" badge. */
  isMock: true;
}

/**
 * Stub mint function — does NOT talk to Solana yet.
 *
 * Replace the body of this function with the real Bubblegum mint flow
 * described in the file-level TODO above. Keep the input/output shape
 * stable if possible so `components/BigMomentCard.tsx` doesn't need to
 * change its call site.
 */
export async function mintCard(input: MintCardInput): Promise<MintCardResult> {
  const { event, ownerWallet } = input;

  if (!ownerWallet) {
    throw new Error("mintCard: a connected wallet public key is required");
  }

  // Simulate network/confirmation latency so UI loading states can be tested.
  await new Promise((resolve) => setTimeout(resolve, 800));

  const fakeAssetId = `MOCK-${event.matchId}-${event.id}`;

  return {
    success: true,
    assetId: fakeAssetId,
    explorerUrl: `https://explorer.solana.com/address/${fakeAssetId}?cluster=devnet`,
    isMock: true,
  };
}
