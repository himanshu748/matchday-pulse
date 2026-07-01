/**
 * Shared domain types for Matchday Pulse.
 *
 * The `MatchEvent` shape below is a best-effort approximation of what we
 * expect the real TxODDS real-time feed to look like, based on public
 * TxODDS/TxLINE documentation. Once API access is granted, this file is
 * the first place to update: swap in the real field names from the TxODDS
 * schema and keep `lib/mockFeed.ts` + `lib/mintCard.ts` in sync.
 */

export type MatchEventType = "goal" | "red_card" | "penalty" | "halftime";

export interface MatchEvent {
  /** Unique event id (uuid-ish string in the mock, real feed will provide its own). */
  id: string;
  /** Match/fixture identifier. */
  matchId: string;
  /** Kind of event — extend this union as TxODDS exposes more event types. */
  type: MatchEventType;
  /** Match minute the event occurred at (mock uses 1-90+). */
  minute: number;
  /** Team the event is attributed to (short display name). */
  team: string;
  /** Player involved, when applicable (omitted for e.g. halftime). */
  player?: string;
  /** ISO-8601 timestamp of when the event was emitted. */
  timestamp: string;
  /** Running score snapshot at the time of the event, for card context. */
  score?: {
    home: number;
    away: number;
  };
}

export interface MatchTeams {
  home: { name: string; short: string; color: string };
  away: { name: string; short: string; color: string };
}

export interface LeaderboardEntry {
  rank: number;
  wallet: string;
  points: number;
  correctPredictions: number;
}
