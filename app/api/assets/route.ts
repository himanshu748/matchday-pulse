/**
 * GET /api/assets?owner=<pubkey>
 * ---------------------------------------------------------------------------
 * Returns the connected wallet's Matchday Pulse cNFTs via the DAS API
 * (getAssetsByOwner). Requires a DAS-capable RPC (Helius) — degrades to an
 * empty list with `dasAvailable: false` when HELIUS_API_KEY isn't set, since
 * the default devnet RPC doesn't support DAS reads.
 */

import { NextResponse } from "next/server";
import { getUmi } from "@/lib/umi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface DasAsset {
  id: string;
  content?: {
    metadata?: { name?: string; symbol?: string };
    links?: { image?: string };
    json_uri?: string;
  };
  compression?: { compressed?: boolean };
}

export async function GET(req: Request) {
  const owner = new URL(req.url).searchParams.get("owner");
  if (!owner) {
    return NextResponse.json({ error: "owner required" }, { status: 400 });
  }
  if (!process.env.HELIUS_API_KEY) {
    return NextResponse.json({ dasAvailable: false, assets: [] });
  }

  try {
    const umi = getUmi();
    // dasApi plugin augments umi.rpc with getAssetsByOwner.
    const rpc = umi.rpc as unknown as {
      getAssetsByOwner: (input: { owner: unknown; limit?: number }) => Promise<{ items: DasAsset[] }>;
    };
    const { publicKey } = await import("@metaplex-foundation/umi");
    const res = await rpc.getAssetsByOwner({ owner: publicKey(owner), limit: 200 });

    const assets = (res.items ?? [])
      .filter((a) => a.compression?.compressed)
      .map((a) => {
        const jsonUri = a.content?.json_uri ?? "";
        // Our metadata id == card-image id, so we can derive the image from the
        // on-chain URI even when the indexer couldn't fetch the JSON (e.g.
        // localhost during dev). Falls back to the indexed image once deployed.
        const derivedImage = jsonUri.includes("/api/metadata/")
          ? jsonUri.replace("/api/metadata/", "/api/card-image/")
          : undefined;
        return {
          id: a.id,
          name: a.content?.metadata?.name ?? "Big Moment",
          symbol: a.content?.metadata?.symbol,
          image: a.content?.links?.image || derivedImage,
          jsonUri,
        };
      })
      // Only our collection's cards (match by on-chain URI or symbol/image).
      .filter(
        (a) =>
          a.jsonUri.includes("/api/metadata/") ||
          a.symbol === "PULSE" ||
          (a.image ?? "").includes("/api/card-image/")
      );

    return NextResponse.json({ dasAvailable: true, assets });
  } catch (err) {
    return NextResponse.json({ dasAvailable: true, assets: [], error: String(err) }, { status: 502 });
  }
}
