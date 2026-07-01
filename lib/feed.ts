"use client";

/**
 * feed.ts (client)
 * ---------------------------------------------------------------------------
 * The single feed entry point used by pages. It subscribes to the REAL
 * TxLINE-backed stream served by our own `/api/feed/[fixtureId]` route
 * (Server-Sent Events), and transparently falls back to the local mock feed
 * (lib/mockFeed.ts) if the real feed is unavailable — so demos never hard-fail.
 *
 * The public `subscribeToMatchFeed` signature matches the original mock so
 * page components barely change; an optional `onStatus` reports whether the
 * live data is real ("txline") or simulated ("mock").
 */

import type { MatchEvent } from "./types";
import {
  subscribeToMatchFeed as subscribeToMockFeed,
  type MatchFeedSubscription,
} from "./mockFeed";

export type FeedMode = "connecting" | "txline" | "mock";
export type MatchFeedListener = (event: MatchEvent) => void;
export type { MatchFeedSubscription } from "./mockFeed";

export interface SubscribeOptions {
  /** Reports the active data source so the UI can badge real-vs-simulated. */
  onStatus?: (mode: FeedMode) => void;
  /** Force the mock feed (used by the demo match id). */
  forceMock?: boolean;
  /** ms to wait for the first real event before falling back to mock. */
  fallbackAfterMs?: number;
}

/** A real TxLINE fixture id is numeric; "demo-*" ids use the mock. */
function isRealFixtureId(matchId: string): boolean {
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
  const { onStatus, forceMock, fallbackAfterMs = 8000 } = options;

  // Mock path: demo ids, forced, or SSE unsupported (e.g. old browsers/SSR).
  if (
    forceMock ||
    !isRealFixtureId(matchId) ||
    typeof window === "undefined" ||
    typeof EventSource === "undefined"
  ) {
    onStatus?.("mock");
    return subscribeToMockFeed(matchId, onEvent);
  }

  onStatus?.("connecting");

  let es: EventSource | null = null;
  let mockSub: MatchFeedSubscription | null = null;
  let gotRealEvent = false;
  let closed = false;

  const startMock = () => {
    if (closed || mockSub) return;
    onStatus?.("mock");
    mockSub = subscribeToMockFeed(matchId, onEvent);
  };

  // If no real event arrives promptly, assume the fixture isn't live and
  // fall back so the page still shows activity.
  const fallbackTimer = setTimeout(() => {
    if (!gotRealEvent) startMock();
  }, fallbackAfterMs);

  try {
    es = new EventSource(`/api/feed/${encodeURIComponent(matchId)}`);
    es.onmessage = (e: MessageEvent) => {
      if (closed) return;
      try {
        const event = JSON.parse(e.data) as MatchEvent;
        if (!gotRealEvent) {
          gotRealEvent = true;
          clearTimeout(fallbackTimer);
          onStatus?.("txline");
        }
        onEvent(event);
      } catch {
        /* ignore malformed keep-alive/comment frames */
      }
    };
    es.onerror = () => {
      // Before any real event: treat as "feed unavailable" → mock fallback.
      // After: let EventSource auto-reconnect.
      if (!gotRealEvent) {
        es?.close();
        es = null;
        clearTimeout(fallbackTimer);
        startMock();
      }
    };
  } catch {
    clearTimeout(fallbackTimer);
    startMock();
  }

  return {
    unsubscribe: () => {
      closed = true;
      clearTimeout(fallbackTimer);
      es?.close();
      mockSub?.unsubscribe();
    },
  };
}
