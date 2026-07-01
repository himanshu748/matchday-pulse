/**
 * normalize.ts
 * ---------------------------------------------------------------------------
 * Maps raw TxLINE `Scores` records (from /api/scores) onto our UI `MatchEvent`.
 *
 * IMPORTANT: the live feed serializes fields in PascalCase (Action, Score,
 * Data, Seq, GameState, Clock, Ts) — not the camelCase shown in the OpenAPI
 * spec. The event kind is given directly by `Action` (e.g. "goal",
 * "yellow_card", "red_card", "substitution", "kickoff", "game_finalised").
 *
 * Each record only carries the side of `Score` that just changed, so running
 * home/away goals must be accumulated across the ordered stream — hence the
 * stateful `makeScoresNormalizer` factory (one instance per feed connection).
 */

import type { MatchEvent, MatchEventType } from "../types";

/** Subset of the raw (PascalCase) TxLINE Scores record we read. */
export interface TxScores {
  FixtureId: number;
  GameState?: string;
  Action?: string;
  Seq: number;
  Ts?: number;
  Participant1IsHome?: boolean;
  Participant1Id?: number;
  Participant2Id?: number;
  Clock?: { Running?: boolean; Seconds?: number };
  Data?: {
    Participant?: number;
    PlayerId?: number;
    PlayerInId?: number;
    PlayerOutId?: number;
    Minutes?: number;
    GoalType?: string;
    Type?: string;
  };
  Score?: {
    Participant1?: TxSideScore;
    Participant2?: TxSideScore;
  };
}
interface TxSideScore {
  Total?: { Goals?: number; YellowCards?: number; RedCards?: number; Corners?: number };
}

export interface FixtureContext {
  fixtureId: string | number;
  participant1?: string;
  participant2?: string;
  participant1IsHome?: boolean;
  homeTeam?: string;
  awayTeam?: string;
}

/** TxLINE Action → our Big Moment type. Anything absent here is not a moment. */
const ACTION_TYPE: Record<string, MatchEventType> = {
  goal: "goal",
  red_card: "red_card",
  yellow_card: "yellow_card",
  penalty: "penalty",
  substitution: "substitution",
  kickoff: "kickoff",
  halftime_finalised: "halftime",
  game_finalised: "fulltime",
};

function participantIndex(s: TxScores): 1 | 2 | undefined {
  const p = s.Data?.Participant;
  if (p === 1 || p === 2) return p;
  const p1 = s.Score?.Participant1;
  const p2 = s.Score?.Participant2;
  if (p1 && !p2) return 1;
  if (p2 && !p1) return 2;
  return undefined;
}

export interface ScoresNormalizer {
  (s: TxScores): MatchEvent | null;
}

/**
 * Create a stateful normalizer for one fixture connection. Feed records in
 * arrival/sequence order; running home/away goals accumulate across calls.
 */
export function makeScoresNormalizer(ctx?: FixtureContext): ScoresNormalizer {
  let g1 = 0; // Participant1 running goals
  let g2 = 0; // Participant2 running goals

  return (s: TxScores): MatchEvent | null => {
    // Accumulate running goals from whichever side is present.
    const s1 = s.Score?.Participant1?.Total?.Goals;
    const s2 = s.Score?.Participant2?.Total?.Goals;
    if (typeof s1 === "number") g1 = s1;
    if (typeof s2 === "number") g2 = s2;

    const action = (s.Action ?? "").toLowerCase();
    const type = ACTION_TYPE[action];
    if (!type) return null;

    const p1IsHome = ctx?.participant1IsHome ?? s.Participant1IsHome ?? true;
    const pIndex = participantIndex(s);
    const p1Name = ctx?.participant1 ?? ctx?.homeTeam ?? "Home";
    const p2Name = ctx?.participant2 ?? ctx?.awayTeam ?? "Away";
    const homeTeam = p1IsHome ? p1Name : p2Name;
    const awayTeam = p1IsHome ? p2Name : p1Name;
    const team = pIndex === 2 ? p2Name : pIndex === 1 ? p1Name : homeTeam;

    const minute =
      s.Data?.Minutes ??
      (s.Clock?.Seconds != null ? Math.floor(s.Clock.Seconds / 60) : 0);

    const fixtureId = String(s.FixtureId);
    const ts = s.Ts ?? Date.now();

    return {
      id: `${fixtureId}:${s.Seq}`,
      matchId: fixtureId,
      type,
      minute,
      team,
      player: s.Data?.PlayerId != null ? `Player #${s.Data.PlayerId}` : undefined,
      timestamp: new Date(ts > 1e12 ? ts : ts * 1000).toISOString(),
      score: { home: p1IsHome ? g1 : g2, away: p1IsHome ? g2 : g1 },
      seq: s.Seq,
      source: "txline",
      homeTeam,
      awayTeam,
    };
  };
}

/** Stateless single-record normalize (used where accumulation isn't needed). */
export function normalizeScores(s: TxScores, ctx?: FixtureContext): MatchEvent | null {
  return makeScoresNormalizer(ctx)(s);
}
