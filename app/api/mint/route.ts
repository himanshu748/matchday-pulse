/**
 * POST /api/mint
 * ---------------------------------------------------------------------------
 * Mints a Big Moment as a Metaplex Bubblegum V2 compressed NFT on devnet,
 * signed server-side by the service keypair (tree authority + fee-payer). The
 * fan's wallet is only the `leafOwner`, so the mint is genuinely gas-free for
 * them — no wallet signature required.
 *
 * Body: { event: MatchEvent, ownerWallet: string }
 * Returns: { success, signature, assetId?, explorerUrl, uri, isMock }
 */

import { NextResponse } from "next/server";
import { publicKey, none } from "@metaplex-foundation/umi";
import * as bubblegum from "@metaplex-foundation/mpl-bubblegum";
import { getUmi, merkleTreeAddress, mintingConfigured } from "@/lib/umi";
import { encodeCard, EVENT_LABEL } from "@/lib/cardMeta";
import type { MatchEvent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function POST(req: Request) {
  if (!mintingConfigured()) {
    return NextResponse.json(
      { success: false, error: "Minting not configured on this deployment." },
      { status: 503 }
    );
  }

  let body: { event?: MatchEvent; ownerWallet?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { event, ownerWallet } = body;
  if (!event || !ownerWallet) {
    return NextResponse.json(
      { success: false, error: "event and ownerWallet are required" },
      { status: 400 }
    );
  }

  try {
    const umi = getUmi();
    const token = encodeCard(event);
    const uri = `${appUrl()}/api/metadata/${token}`;
    const label = EVENT_LABEL[event.type] ?? event.type;
    const name = `${label} — ${event.team} ${event.minute}'`.slice(0, 32);

    const mintV2 = (bubblegum as Record<string, unknown>).mintV2 as
      | ((umi: unknown, input: unknown) => { sendAndConfirm: (u: unknown) => Promise<{ signature: Uint8Array }> })
      | undefined;
    if (!mintV2) throw new Error("mintV2 not available in mpl-bubblegum");

    const builder = mintV2(umi, {
      leafOwner: publicKey(ownerWallet),
      merkleTree: publicKey(merkleTreeAddress()),
      metadata: {
        name,
        uri,
        sellerFeeBasisPoints: 0,
        collection: none(),
        creators: [],
      },
    });

    const result = await builder.sendAndConfirm(umi);

    // Signature bytes -> base58 for explorer.
    const bs58 = (await import("bs58")).default;
    const signature = bs58.encode(result.signature);

    // Best-effort asset id extraction (gallery works independently via DAS).
    let assetId: string | undefined;
    try {
      const parse = (bubblegum as Record<string, unknown>)
        .parseLeafFromMintV2Transaction as
        | ((ctx: unknown, sig: Uint8Array) => Promise<{ id?: unknown; nonce?: number | bigint }>)
        | undefined;
      const findPda = (bubblegum as Record<string, unknown>).findLeafAssetIdPda as
        | ((ctx: unknown, seeds: { merkleTree: unknown; leafIndex: number | bigint }) => [unknown])
        | undefined;
      if (parse) {
        const leaf = await parse(umi, result.signature);
        if (leaf?.id != null) {
          assetId = String(leaf.id);
        } else if (leaf?.nonce != null && findPda) {
          const [pda] = findPda(umi, {
            merkleTree: publicKey(merkleTreeAddress()),
            leafIndex: leaf.nonce,
          });
          assetId = String(pda);
        }
      }
    } catch {
      /* non-fatal */
    }

    return NextResponse.json({
      success: true,
      signature,
      assetId,
      uri,
      explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
      isMock: false,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}
