/**
 * GET /api/fixtures
 * ---------------------------------------------------------------------------
 * Returns the current World Cup / International Friendlies fixtures from the
 * real TxLINE feed, normalized for the UI. Reports `configured: false` (with
 * an empty list) when TxLINE credentials aren't set, so the client can show a
 * graceful state and offer the demo (mock) match instead.
 */

import { NextResponse } from "next/server";
import { fetchFixtures, txlineConfigured } from "@/lib/txline/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!txlineConfigured()) {
    return NextResponse.json({ configured: false, fixtures: [] });
  }
  try {
    const fixtures = await fetchFixtures();
    // Soonest-first so live / upcoming matches surface at the top.
    fixtures.sort((a, b) => a.startTimeMs - b.startTimeMs);
    return NextResponse.json({ configured: true, fixtures });
  } catch (err) {
    return NextResponse.json(
      { configured: true, fixtures: [], error: String(err) },
      { status: 502 }
    );
  }
}
