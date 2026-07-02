"use client";

/**
 * feed.ts (client)
 * ---------------------------------------------------------------------------
 * The single feed entry point used by pages. Real fixtures subscribe to the
 * REAL TxLINE-backed stream served by `/api/feed/[fixtureId]` (SSE) — and
 * NEVER show simulated events: if a match hasn't kicked off yet the feed
 * reports `waiting` so the UI can render an honest pre-kickoff state.
 *
 * The simulated feed exists ONLY for explicit demo ids (`demo-*`), used by
 * the labeled practice mode. It is never a silent fallback.
 */

import type { MatchEvent } from "./types";
import {
  subscribeToMatchFeed as subscribeToMockFeed,
  type MatchFeedSubscription,
} from "./mockFeed";

export type FeedMode =
  | "connecting" // opening the stream
  | "txline"     // receiving real TxLINE events
  | "waiting"    // stream healthy, no events yet (match not started / quiet)
  | "error"      // feed unreachable
  | "mock";      // explicit demo id only — simulated practice feed

export type MatchFeedListener = (event: MatchEvent) => void;
export type { MatchFeedSubscription } from "./mockFeed";

export interface SubscribeOptions {
  /** Reports the active feed state so the UI can react honestly. */
  onStatus?: (mode: FeedMode) => void;
  /** ms with no events before reporting `waiting` (stream stays open). */
  waitingAfterMs?: number;
}

/** A real TxLINE fixture id is numeric; `demo-*` ids run the practice feed. */
export function isRealFixtureId(matchId: string): boolean {
  return /^\d+$/.test(matchId);
}

export function subscribeToMatchFeed(
  matchId: string,
  onEvent: MatchFeedListener,
  onStatusOrOptions?: SubscribeOptions | ((mode: FeedMode) => void)
): MatchFeedSubscription {
  const options: SubscribeOptions =
    typeof onStatusOrOptions === "function"
      ? { onStatus: onStatusOrOptions }
      : onStatusOrOptions ?? {};
  const { onStatus, waitingAfterMs = 6000 } = options;

  // Explicit demo/practice ids only — clearly labeled simulated events.
  if (!isRealFixtureId(matchId)) {
    onStatus?.("mock");
    return subscribeToMockFeed(matchId, onEvent);
  }

  if (typeof window === "undefined" || typeof EventSource === "undefined") {
    onStatus?.("error");
    return { unsubscribe: () => {} };
  }

  onStatus?.("connecting");

  let es: EventSource | null = null;
  let gotRealEvent = false;
  let closed = false;

  // If the stream is healthy but silent (match not kicked off, or between
  // moments on a quiet replay), tell the UI we're waiting — never simulate.
  const waitingTimer = setTimeout(() => {
    if (!gotRealEvent && !closed) onStatus?.("waiting");
  }, waitingAfterMs);

  try {
    es = new EventSource(`/api/feed/${encodeURIComponent(matchId)}`);
    es.onmessage = (e: MessageEvent) => {
      if (closed) return;
      try {
        const event = JSON.parse(e.data) as MatchEvent;
        if (!gotRealEvent) {
          gotRealEvent = true;
          clearTimeout(waitingTimer);
          onStatus?.("txline");
        }
        onEvent(event);
      } catch {
        /* ignore malformed frames */
      }
    };
    es.onerror = () => {
      if (closed) return;
      // EventSource auto-reconnects; only surface a hard error before any
      // data has flowed AND the connection is fully closed.
      if (!gotRealEvent && es?.readyState === EventSource.CLOSED) {
        clearTimeout(waitingTimer);
        onStatus?.("error");
      }
    };
  } catch {
    clearTimeout(waitingTimer);
    onStatus?.("error");
  }

  return {
    unsubscribe: () => {
      closed = true;
      clearTimeout(waitingTimer);
      es?.close();
    },
  };
}
