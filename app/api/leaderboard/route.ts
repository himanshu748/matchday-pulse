/**
 * /api/leaderboard
 * ---------------------------------------------------------------------------
 * REAL leaderboard persistence (Supabase Postgres via PostgREST — no client
 * SDK needed). GET returns the top players; POST records a settled prediction
 * round for a wallet (atomic upsert via the matchday_record_round function).
 *
 * When Supabase env isn't configured the route reports `available: false`
 * and the UI shows an honest empty state — never fake data.
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function config(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

function headers(key: string): Record<string, string> {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

export interface LeaderboardRow {
  wallet: string;
  points: number;
  correct: number;
  rounds: number;
}

export async function GET() {
  const cfg = config();
  if (!cfg) return NextResponse.json({ available: false, entries: [] });

  try {
    const res = await fetch(
      `${cfg.url}/rest/v1/matchday_leaderboard?select=wallet,points,correct,rounds&order=points.desc,correct.desc&limit=20`,
      { headers: headers(cfg.key), cache: "no-store" }
    );
    if (!res.ok) throw new Error(`postgrest ${res.status}`);
    const entries = (await res.json()) as LeaderboardRow[];
    return NextResponse.json({ available: true, entries });
  } catch (err) {
    return NextResponse.json(
      { available: false, entries: [], error: String(err) },
      { status: 502 }
    );
  }
}

export async function POST(req: Request) {
  const cfg = config();
  if (!cfg) {
    return NextResponse.json({ available: false }, { status: 503 });
  }

  let body: { wallet?: string; correct?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const wallet = (body.wallet ?? "").trim();
  // Base58 Solana pubkey shape — reject junk before it reaches the table.
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet)) {
    return NextResponse.json({ error: "valid wallet required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${cfg.url}/rest/v1/rpc/matchday_record_round`, {
      method: "POST",
      headers: headers(cfg.key),
      body: JSON.stringify({ p_wallet: wallet, p_correct: Boolean(body.correct) }),
    });
    if (!res.ok) throw new Error(`postgrest ${res.status}: ${await res.text()}`);
    const rows = (await res.json()) as LeaderboardRow[];
    return NextResponse.json({ available: true, entry: rows[0] ?? null });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
