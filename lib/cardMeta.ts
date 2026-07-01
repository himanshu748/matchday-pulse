/**
 * cardMeta.ts
 * ---------------------------------------------------------------------------
 * Stateless codec for a Big Moment Card descriptor. We encode the event facts
 * into a URL-safe token so the NFT's metadata `uri` and image can be served
 * from stateless routes (no database). Used by the mint route (to build the
 * uri), the metadata route, and the SVG card-image route.
 */

import type { MatchEvent, MatchEventType } from "./types";

export interface CardDescriptor {
  /** event type */ t: MatchEventType;
  /** minute */ m: number;
  /** team */ tm: string;
  /** home team */ h?: string;
  /** away team */ a?: string;
  /** score home */ sh?: number;
  /** score away */ sa?: number;
  /** player */ p?: string;
  /** fixtureId */ fx: string;
  /** seq (for verification) */ sq?: number;
}

function toBase64Url(s: string): string {
  const b64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(s, "utf8").toString("base64")
      : btoa(unescape(encodeURIComponent(s)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  return typeof Buffer !== "undefined"
    ? Buffer.from(b64, "base64").toString("utf8")
    : decodeURIComponent(escape(atob(b64)));
}

export function encodeCard(event: MatchEvent): string {
  const d: CardDescriptor = {
    t: event.type,
    m: event.minute,
    tm: event.team,
    h: event.homeTeam,
    a: event.awayTeam,
    sh: event.score?.home,
    sa: event.score?.away,
    p: event.player,
    fx: event.matchId,
    sq: event.seq,
  };
  return toBase64Url(JSON.stringify(d));
}

export function decodeCard(token: string): CardDescriptor | null {
  try {
    return JSON.parse(fromBase64Url(token)) as CardDescriptor;
  } catch {
    return null;
  }
}

export const EVENT_LABEL: Record<MatchEventType, string> = {
  goal: "GOAL",
  red_card: "RED CARD",
  yellow_card: "YELLOW CARD",
  penalty: "PENALTY",
  substitution: "SUBSTITUTION",
  halftime: "HALF TIME",
  fulltime: "FULL TIME",
  kickoff: "KICK OFF",
};
