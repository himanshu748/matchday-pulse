/**
 * GET /api/card-image/[id]
 * ---------------------------------------------------------------------------
 * Renders a Big Moment Card as an SVG image, so the minted cNFT looks like the
 * actual moment in wallets/explorers. `id` is the card descriptor token.
 */

import { decodeCard, EVENT_LABEL } from "@/lib/cardMeta";

export const runtime = "nodejs";

const ACCENT: Record<string, string> = {
  goal: "#22c55e",
  red_card: "#ef4444",
  yellow_card: "#f59e0b",
  penalty: "#f59e0b",
  substitution: "#38bdf8",
  halftime: "#38bdf8",
  fulltime: "#a78bfa",
  kickoff: "#22c55e",
};

const ICON: Record<string, string> = {
  goal: "⚽",
  red_card: "\u{1f7e5}",
  yellow_card: "\u{1f7e8}",
  penalty: "\u{1f3af}",
  substitution: "\u{1f501}",
  halftime: "⏸",
  fulltime: "\u{1f3c1}",
  kickoff: "⚽",
};

function esc(s: string): string {
  return s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const d = decodeCard(params.id);
  if (!d) return new Response("bad id", { status: 400 });

  const accent = ACCENT[d.t] ?? "#22c55e";
  const label = EVENT_LABEL[d.t] ?? d.t;
  const icon = ICON[d.t] ?? "⚽";
  const scoreline =
    d.sh != null && d.sa != null ? `${d.sh} – ${d.sa}` : "";
  const teams =
    d.h && d.a ? `${d.h}  vs  ${d.a}` : d.tm;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#07230f"/>
      <stop offset="1" stop-color="#04110a"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.8" cy="0.15" r="0.9">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.35"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="600" height="600" fill="url(#bg)"/>
  <rect width="600" height="600" fill="url(#glow)"/>
  <rect x="24" y="24" width="552" height="552" rx="28" fill="#0d3818" fill-opacity="0.35" stroke="${accent}" stroke-opacity="0.5" stroke-width="2"/>
  <text x="56" y="96" font-family="Arial, sans-serif" font-size="22" letter-spacing="4" fill="#94a3b8">MATCHDAY PULSE</text>
  <text x="544" y="96" text-anchor="end" font-family="Arial, sans-serif" font-size="130">${icon}</text>
  <text x="56" y="250" font-family="Arial, sans-serif" font-weight="bold" font-size="72" fill="${accent}">${esc(label)}</text>
  <text x="56" y="320" font-family="Arial, sans-serif" font-weight="bold" font-size="44" fill="#ffffff">${esc(d.tm)}</text>
  <text x="56" y="372" font-family="Arial, sans-serif" font-size="30" fill="#cbd5e1">${esc(teams)}</text>
  ${scoreline ? `<text x="56" y="470" font-family="monospace" font-weight="bold" font-size="86" fill="#ffffff">${esc(scoreline)}</text>` : ""}
  <text x="544" y="470" text-anchor="end" font-family="monospace" font-size="40" fill="#94a3b8">${d.m}'</text>
  <text x="56" y="540" font-family="Arial, sans-serif" font-size="20" fill="#64748b">${d.sq != null ? "✓ Verifiable on Solana · TxLINE feed" : "TxLINE feed"}</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
