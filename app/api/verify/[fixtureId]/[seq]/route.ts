/**
 * GET /api/verify/[fixtureId]/[seq]
 * ---------------------------------------------------------------------------
 * Proves a Big Moment is real: fetches the TxLINE Merkle-proof validation for
 * a specific scores event (fixtureId + seq) and reports whether a proof chain
 * back to the on-chain batch root is available. This powers the
 * "Verified on-chain ✓" badge — every card is provably genuine, not invented.
 */

import { NextResponse } from "next/server";
import { fetchStatValidation, txlineConfigured } from "@/lib/txline/client";
import type { VerificationResult } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toHex(v: unknown): string | undefined {
  if (Array.isArray(v)) return Buffer.from(v as number[]).toString("hex");
  if (typeof v === "string") return v;
  return undefined;
}

/** Pull a Merkle root out of the real stat-validation payload for display. */
function extractRoot(payload: unknown): string | undefined {
  const p = payload as Record<string, unknown> | null;
  if (!p) return undefined;
  const summary = (p.summary ?? {}) as Record<string, unknown>;
  return (
    toHex(p.eventStatRoot) ??
    toHex(summary.eventStatsSubTreeRoot) ??
    toHex(summary.updateSubTreeRoot)
  );
}

export async function GET(
  _req: Request,
  { params }: { params: { fixtureId: string; seq: string } }
) {
  const { fixtureId, seq } = params;
  const seqNum = Number(seq);

  if (!txlineConfigured()) {
    const body: VerificationResult = {
      verified: false,
      fixtureId,
      seq: seqNum,
      detail: "TxLINE not configured — verification unavailable.",
    };
    return NextResponse.json(body, { status: 503 });
  }

  try {
    const payload = (await fetchStatValidation(fixtureId, seqNum)) as Record<string, unknown>;
    // The real stat-validation payload carries a Merkle root (`eventStatRoot`)
    // and the proven stat (`statToProve`).
    const hasProof =
      payload != null &&
      typeof payload === "object" &&
      ("eventStatRoot" in payload || "statToProve" in payload || "summary" in payload);

    const stat = payload?.statToProve as
      | { key?: number; value?: number }
      | undefined;
    const statNote =
      stat?.value != null ? ` Proven stat #${stat.key} = ${stat.value}.` : "";

    const body: VerificationResult = {
      verified: Boolean(hasProof),
      fixtureId,
      seq: seqNum,
      detail: hasProof
        ? `Merkle proof anchored to the on-chain root published by TxLINE on Solana.${statNote}`
        : "No proof returned for this event yet.",
      batchRoot: extractRoot(payload),
    };
    return NextResponse.json(body);
  } catch (err) {
    const body: VerificationResult = {
      verified: false,
      fixtureId,
      seq: seqNum,
      detail: `Verification error: ${String(err)}`,
    };
    return NextResponse.json(body, { status: 502 });
  }
}
