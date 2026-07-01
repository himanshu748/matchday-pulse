/**
 * mockFeed.ts
 * ---------------------------------------------------------------------------
 * Stand-in for the real TxODDS real-time WebSocket feed.
 *
 * WHAT THIS IS: a client-safe fake event source that emits plausible,
 * TxODDS-shaped match events on an interval, so the rest of the app (Big
 * Moment Cards, Live Pulse meter, minting flow) can be built and demoed
 * before TxODDS grants API access.
 *
 * WHAT THIS IS NOT: a real network client. There is no WebSocket here.
 *
 * --------------------------------------------------------------------------
 * TODO(next session): replace this module's internals with a real TxODDS
 * WebSocket client:
 *   1. Connect to `process.env.TXODDS_WS_URL` with the granted API key
 *      (see .env.example) — likely via a signed query param or auth header
 *      per TxODDS' docs.
 *   2. Map incoming TxODDS payloads into the `MatchEvent` shape in
 *      lib/types.ts (field names here are our best guess and WILL need
 *      adjusting once we see the real schema).
 *   3. Because browsers can't hold TxODDS credentials, the real feed should
 *      be proxied through a small backend/edge relay (Node service or
 *      Supabase Realtime channel) that authenticates once and re-broadcasts
 *      normalized events to connected clients. Keep the public interface
 *      of `subscribeToMatchFeed` the same so page components don't change.
 * --------------------------------------------------------------------------
 */

import type { MatchEvent, MatchEventType } from "./types";

const EVENT_TYPES: MatchEventType[] = ["goal", "red_card", "penalty", "halftime"];

const TEAMS = ["Atlas FC", "Coral Union", "River Point"] as const;

const PLAYERS: Record<(typeof TEAMS)[number], string[]> = {
  "Atlas FC": ["J. Marín", "T. Adeyemi", "K. Novak"],
  "Coral Union": ["R. Silva", "H. Bekker", "M. Tanaka"],
  "River Point": ["D. O'Connor", "L. Fontaine", "S. Petrov"],
};

let score = { home: 0, away: 0 };
let minute = 1;
let idCounter = 0;

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function nextId(): string {
  idCounter += 1;
  return `mock-evt-${Date.now()}-${idCounter}`;
}

function buildEvent(matchId: string): MatchEvent {
  // Bias toward goals/halftime slightly less often than generic play to feel
  // plausible; this is a demo heuristic, not a real distribution.
  const type = pick(EVENT_TYPES);
  const team = pick(TEAMS);
  minute = Math.min(90, minute + Math.floor(Math.random() * 6) + 1);

  if (type === "goal") {
    if (team === "Atlas FC") score.home += 1;
    else score.away += 1;
  }

  const event: MatchEvent = {
    id: nextId(),
    matchId,
    type,
    minute,
    team,
    player: type === "halftime" ? undefined : pick(PLAYERS[team]),
    timestamp: new Date().toISOString(),
    score: { ...score },
    source: "mock",
    homeTeam: "Atlas FC",
    awayTeam: "Coral Union",
  };

  return event;
}

export type MatchFeedListener = (event: MatchEvent) => void;

export interface MatchFeedSubscription {
  /** Stop receiving events and clear the underlying interval. */
  unsubscribe: () => void;
}

/**
 * Subscribe to the mock match feed for a given matchId.
 *
 * Client-component usage:
 *
 *   useEffect(() => {
 *     const sub = subscribeToMatchFeed(matchId, (event) => {
 *       setEvents((prev) => [event, ...prev]);
 *     });
 *     return () => sub.unsubscribe();
 *   }, [matchId]);
 *
 * @param matchId     match/fixture id (any string works for the mock)
 * @param onEvent     callback invoked with each new MatchEvent
 * @param intervalMs  time between fake events (default 4500ms, tuned for demo pacing)
 */
export function subscribeToMatchFeed(
  matchId: string,
  onEvent: MatchFeedListener,
  intervalMs = 4500
): MatchFeedSubscription {
  // Reset per-subscription demo state so refreshing the page (e.g. Fast
  // Refresh in dev) starts a fresh, plausible match from 0-0.
  score = { home: 0, away: 0 };
  minute = 1;

  const timer = setInterval(() => {
    onEvent(buildEvent(matchId));
  }, intervalMs);

  return {
    unsubscribe: () => clearInterval(timer),
  };
}

/**
 * Async-generator variant of the same mock feed, useful for server-side or
 * script-style consumers that prefer `for await...of` over callbacks.
 *
 * Example:
 *   for await (const event of mockMatchEventGenerator("match-123")) {
 *     console.log(event);
 *   }
 */
export async function* mockMatchEventGenerator(
  matchId: string,
  intervalMs = 4500
): AsyncGenerator<MatchEvent> {
  score = { home: 0, away: 0 };
  minute = 1;

  while (true) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    yield buildEvent(matchId);
  }
}

/** Team display metadata used by BigMomentCard for colors/short names. */
export const MOCK_TEAM_META: Record<
  (typeof TEAMS)[number],
  { short: string; color: string }
> = {
  "Atlas FC": { short: "ATL", color: "#22c55e" },
  "Coral Union": { short: "COR", color: "#f97316" },
  "River Point": { short: "RVP", color: "#38bdf8" },
};
