/**
 * Shared domain types for Matchday Pulse.
 *
 * `MatchEvent` is the app's normalized event shape. It is produced from the
 * REAL TxLINE `Scores` feed (see lib/txline/normalize.ts) and, as a fallback
 * only, from lib/mockFeed.ts. Field names here are intentionally UI-friendly;
 * the raw TxLINE schema is mapped onto this in the normalizer.
 */

export type MatchEventType =
  | "goal"
  | "red_card"
  | "yellow_card"
  | "penalty"
  | "substitution"
  | "halftime"
  | "fulltime"
  | "kickoff";

export interface MatchEvent {
  /** Unique event id. For TxLINE events this is `${fixtureId}:${seq}`. */
  id: string;
  /** Match/fixture identifier (stringified TxLINE fixtureId, or a mock id). */
  matchId: string;
  /** Kind of event. */
  type: MatchEventType;
  /** Match minute the event occurred at. */
  minute: number;
  /** Team the event is attributed to (display name). */
  team: string;
  /** Player involved, when applicable. */
  player?: string;
  /** ISO-8601 timestamp of when the event was emitted. */
  timestamp: string;
  /** Running score snapshot at the time of the event, for card context. */
  score?: {
    home: number;
    away: number;
  };
  /**
   * TxLINE sequence number of the underlying `Scores` record within the
   * fixture's history. Present for real events; enables on-chain Merkle-proof
   * verification via GET /api/scores/stat-validation. Absent for mock events.
   */
  seq?: number;
  /** Where this event came from — drives the "verifiable" affordance in the UI. */
  source: "txline" | "mock";
  /** Home/away team display names for the fixture, when known. */
  homeTeam?: string;
  awayTeam?: string;
}

export interface MatchTeams {
  home: { name: string; short: string; color: string };
  away: { name: string; short: string; color: string };
}

/** A World Cup / friendlies fixture, normalized from the TxLINE Fixture schema. */
export interface Fixture {
  fixtureId: string;
  competitionId: number;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  /** Kickoff time, ISO-8601. */
  startTime: string;
  /** Unix ms of kickoff, for sorting / live detection. */
  startTimeMs: number;
}

export interface LeaderboardEntry {
  rank: number;
  wallet: string;
  points: number;
  correctPredictions: number;
}

/**
 * Result of an on-chain Merkle-proof verification for a Big Moment
 * (from GET /api/scores/stat-validation, proved against the batch root
 * published on Solana by TxLINE).
 */
export interface VerificationResult {
  verified: boolean;
  fixtureId: string;
  seq: number;
  /** Human summary, e.g. "Proof anchored to on-chain batch root". */
  detail: string;
  /** The batch/root identifier when available, for display / explorer linking. */
  batchRoot?: string;
}
