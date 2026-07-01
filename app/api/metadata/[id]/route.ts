/**
 * GET /api/metadata/[id]
 * ---------------------------------------------------------------------------
 * Serves the off-chain JSON metadata for a Big Moment cNFT. The `id` is the
 * URL-safe card descriptor (see lib/cardMeta.ts). Self-hosted metadata is an
 * accepted, zero-cost pattern for a devnet hackathon build; the `image` points
 * at our dynamic SVG card route so the NFT renders as the actual moment card.
 */

import { NextResponse } from "next/server";
import { decodeCard, EVENT_LABEL } from "@/lib/cardMeta";

export const runtime = "nodejs";

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const d = decodeCard(params.id);
  if (!d) return NextResponse.json({ error: "bad id" }, { status: 400 });

  const label = EVENT_LABEL[d.t] ?? d.t;
  const scoreline =
    d.sh != null && d.sa != null ? `${d.h ?? "Home"} ${d.sh}-${d.sa} ${d.a ?? "Away"}` : undefined;

  const metadata = {
    name: `${label} — ${d.tm} ${d.m}'`,
    symbol: "PULSE",
    description:
      `A Matchday Pulse Big Moment: ${label} for ${d.tm} at minute ${d.m}` +
      (scoreline ? ` (${scoreline}).` : ".") +
      " Captured live from the TxLINE World Cup feed and cryptographically verifiable on Solana.",
    image: `${appUrl()}/api/card-image/${params.id}`,
    external_url: `${appUrl()}/match/${d.fx}`,
    attributes: [
      { trait_type: "Moment", value: label },
      { trait_type: "Team", value: d.tm },
      { trait_type: "Minute", value: d.m },
      ...(scoreline ? [{ trait_type: "Scoreline", value: scoreline }] : []),
      ...(d.p ? [{ trait_type: "Player", value: d.p }] : []),
      { trait_type: "Fixture", value: d.fx },
      { trait_type: "Data Source", value: "TxLINE (World Cup)" },
      { trait_type: "Verifiable", value: d.sq != null ? "On-chain Merkle proof" : "No" },
    ],
    properties: {
      files: [{ uri: `${appUrl()}/api/card-image/${params.id}`, type: "image/svg+xml" }],
      category: "image",
    },
  };

  return NextResponse.json(metadata, {
    headers: { "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
