/**
 * GET /api/feed/[fixtureId]
 * ---------------------------------------------------------------------------
 * Server-Sent Events relay for a single fixture. Browsers can't attach the
 * TxLINE auth headers to an EventSource, so this route holds the credentials,
 * subscribes to the upstream TxLINE scores stream, normalizes each `Scores`
 * record into our `MatchEvent`, and re-emits it to the browser.
 *
 * Resilience: if the upstream SSE isn't available it falls back to polling
 * `/api/scores/updates` (5-min cache) and de-duplicates by `seq`. If TxLINE
 * isn't configured at all, responds 503 so the client drops to its mock feed.
 */

import { NextRequest } from "next/server";
import {
  txlineConfigured,
  openScoresStream,
  fetchScoresUpdates,
  fetchScoresSnapshot,
  fetchRawFixtures,
} from "@/lib/txline/client";
import { makeScoresNormalizer, type TxScores, type FixtureContext } from "@/lib/txline/normalize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LIFETIME_MS = 4 * 60 * 1000; // bound the stream for serverless safety
const POLL_INTERVAL_MS = 4000;

async function loadFixtureContext(fixtureId: string): Promise<FixtureContext | undefined> {
  try {
    const rows = await fetchRawFixtures();
    const f = rows.find((r) => String(r.FixtureId) === fixtureId);
    if (!f) return undefined;
    return {
      fixtureId,
      participant1: f.Participant1,
      participant2: f.Participant2,
      participant1IsHome: f.Participant1IsHome,
      homeTeam: f.Participant1IsHome ? f.Participant1 : f.Participant2,
      awayTeam: f.Participant1IsHome ? f.Participant2 : f.Participant1,
    };
  } catch {
    return undefined;
  }
}

/** Extract the JSON `data:` payload from one upstream SSE block (skip heartbeats). */
function extractDataPayloads(block: string): string | null {
  const dataLines = block
    .split("\n")
    .filter((l) => l.startsWith("data:"))
    .map((l) => l.slice(5).trim());
  if (dataLines.length === 0) return null;
  const isHeartbeat = /(^|\n)event:\s*heartbeat/i.test(block);
  if (isHeartbeat) return null;
  return dataLines.join("\n");
}

export async function GET(
  req: NextRequest,
  { params }: { params: { fixtureId: string } }
) {
  const fixtureId = params.fixtureId;

  if (!txlineConfigured()) {
    return new Response("TxLINE not configured", { status: 503 });
  }

  const encoder = new TextEncoder();
  const ctx = await loadFixtureContext(fixtureId);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const seen = new Set<number>();

      const send = (event: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      const comment = (text: string) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`: ${text}\n\n`));
      };

      const cleanup = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      req.signal.addEventListener("abort", cleanup);
      const lifetime = setTimeout(cleanup, MAX_LIFETIME_MS);

      comment("connected");

      const normalize = makeScoresNormalizer(ctx);
      const emitFromScores = (s: TxScores) => {
        // Always run through the normalizer (it accumulates running score),
        // but only emit each Seq once.
        const event = normalize(s);
        if (s.Seq != null) {
          if (seen.has(s.Seq)) return;
          seen.add(s.Seq);
        }
        if (event) send(event);
      };
      const emitSorted = (arr: TxScores[]) =>
        [...arr].sort((a, b) => (a.Seq ?? 0) - (b.Seq ?? 0)).forEach(emitFromScores);

      // Seed with the full match snapshot so every match (live or finished)
      // immediately shows its Big Moments and a correct running score.
      try {
        emitSorted(await fetchScoresSnapshot(fixtureId));
      } catch {
        comment("snapshot-unavailable");
      }

      // --- Preferred path: proxy the upstream SSE stream ---
      let usedStream = false;
      try {
        const upstream = await openScoresStream(fixtureId);
        if (upstream.ok && upstream.body) {
          usedStream = true;
          const reader = upstream.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          while (!closed) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let idx: number;
            while ((idx = buffer.indexOf("\n\n")) !== -1) {
              const block = buffer.slice(0, idx);
              buffer = buffer.slice(idx + 2);
              const payload = extractDataPayloads(block);
              if (!payload) {
                comment("hb");
                continue;
              }
              try {
                const parsed = JSON.parse(payload) as TxScores | TxScores[];
                emitSorted(Array.isArray(parsed) ? parsed : [parsed]);
              } catch {
                /* ignore non-JSON frames */
              }
            }
          }
        }
      } catch {
        /* fall through to polling */
      }

      // --- Fallback path: poll the 5-min updates cache ---
      if (!usedStream && !closed) {
        comment("polling");
        try {
          const seed = await fetchScoresUpdates(fixtureId);
          emitSorted(seed);
        } catch {
          /* ignore */
        }
        while (!closed) {
          await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
          if (closed) break;
          try {
            const updates = await fetchScoresUpdates(fixtureId);
            emitSorted(updates);
          } catch {
            comment("poll-error");
          }
        }
      }

      clearTimeout(lifetime);
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
