/**
 * client.ts (server-only)
 * ---------------------------------------------------------------------------
 * Thin wrapper over the TxLINE REST/SSE API. Holds the guest JWT + activated
 * API token (from env, produced by scripts/txline-subscribe.mjs) and attaches
 * the required `Authorization: Bearer` + `X-Api-Token` headers.
 *
 * NEVER import this into a client component — the tokens must stay server-side.
 * The browser talks to our own /api/* routes, which call these helpers.
 */

import type { Fixture } from "../types";
import type { TxScores } from "./normalize";

const API_ORIGIN =
  process.env.TXLINE_API_ORIGIN ?? "https://txline-dev.txodds.com";
const API_BASE = `${API_ORIGIN}/api`;

export interface TxlineCreds {
  jwt: string;
  apiToken: string;
}

export function getCreds(): TxlineCreds | null {
  const jwt = process.env.TXLINE_JWT;
  const apiToken = process.env.TXLINE_API_TOKEN;
  if (!jwt || !apiToken) return null;
  return { jwt, apiToken };
}

/** Whether real TxLINE access is configured. */
export function txlineConfigured(): boolean {
  return getCreds() != null;
}

function authHeaders(creds: TxlineCreds): Record<string, string> {
  return {
    Authorization: `Bearer ${creds.jwt}`,
    "X-Api-Token": creds.apiToken,
  };
}

/** World Cup 2026 competition id, once discovered. Configurable via env. */
export function worldCupCompetitionId(): number | undefined {
  const v = process.env.TXLINE_WORLDCUP_COMPETITION_ID;
  return v ? Number(v) : undefined;
}

/**
 * The snapshot endpoint returns fixtures starting AT or within 30 days AFTER
 * the given epoch day — so recently *played* matches vanish if we default to
 * today. Look back a few days so finished fixtures keep their team names and
 * stay replayable.
 */
function defaultStartEpochDay(): number {
  return Math.floor(Date.now() / 86_400_000) - 3;
}

interface RawFixture {
  Ts: number;
  StartTime: number;
  Competition: string;
  CompetitionId: number;
  Participant1: string;
  Participant2: string;
  Participant1Id: number;
  Participant2Id: number;
  FixtureId: number;
  Participant1IsHome: boolean;
}

function normalizeFixture(f: RawFixture): Fixture {
  const ms = f.StartTime > 1e12 ? f.StartTime : f.StartTime * 1000;
  return {
    fixtureId: String(f.FixtureId),
    competitionId: f.CompetitionId,
    competition: f.Competition,
    homeTeam: f.Participant1IsHome ? f.Participant1 : f.Participant2,
    awayTeam: f.Participant1IsHome ? f.Participant2 : f.Participant1,
    startTime: new Date(ms).toISOString(),
    startTimeMs: ms,
  };
}

/** Fetch the fixtures snapshot (optionally filtered to a competition). */
export async function fetchFixtures(opts?: {
  competitionId?: number;
  startEpochDay?: number;
}): Promise<Fixture[]> {
  const creds = getCreds();
  if (!creds) throw new Error("TxLINE not configured");

  const url = new URL(`${API_BASE}/fixtures/snapshot`);
  const comp = opts?.competitionId ?? worldCupCompetitionId();
  if (comp != null) url.searchParams.set("competitionId", String(comp));
  url.searchParams.set(
    "startEpochDay",
    String(opts?.startEpochDay ?? defaultStartEpochDay())
  );

  const res = await fetch(url, { headers: authHeaders(creds), cache: "no-store" });
  if (!res.ok) throw new Error(`fixtures ${res.status}: ${await res.text()}`);
  const raw = (await res.json()) as RawFixture[];
  return raw.map(normalizeFixture);
}

/** Return the raw fixture rows (used to keep per-fixture team-name context). */
export async function fetchRawFixtures(competitionId?: number): Promise<RawFixture[]> {
  const creds = getCreds();
  if (!creds) throw new Error("TxLINE not configured");
  const url = new URL(`${API_BASE}/fixtures/snapshot`);
  const comp = competitionId ?? worldCupCompetitionId();
  if (comp != null) url.searchParams.set("competitionId", String(comp));
  url.searchParams.set("startEpochDay", String(defaultStartEpochDay()));
  const res = await fetch(url, { headers: authHeaders(creds), cache: "no-store" });
  if (!res.ok) throw new Error(`fixtures ${res.status}: ${await res.text()}`);
  return (await res.json()) as RawFixture[];
}

/** Snapshot of the current scores state for a fixture (array of Scores). */
export async function fetchScoresSnapshot(fixtureId: string): Promise<TxScores[]> {
  const creds = getCreds();
  if (!creds) throw new Error("TxLINE not configured");
  const res = await fetch(`${API_BASE}/scores/snapshot/${fixtureId}`, {
    headers: authHeaders(creds),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`scores/snapshot ${res.status}`);
  return (await res.json()) as TxScores[];
}

/** Recent scores updates (5-min cache) — the robust serverless polling source. */
export async function fetchScoresUpdates(fixtureId: string): Promise<TxScores[]> {
  const creds = getCreds();
  if (!creds) throw new Error("TxLINE not configured");
  const res = await fetch(`${API_BASE}/scores/updates/${fixtureId}`, {
    headers: authHeaders(creds),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`scores/updates ${res.status}`);
  return (await res.json()) as TxScores[];
}

/**
 * Open the upstream TxLINE SSE scores stream. Returns the raw fetch Response
 * whose body is the text/event-stream to be piped to the browser.
 */
export async function openScoresStream(
  fixtureId: string,
  lastEventId?: string
): Promise<Response> {
  const creds = getCreds();
  if (!creds) throw new Error("TxLINE not configured");
  const url = new URL(`${API_BASE}/scores/stream`);
  url.searchParams.set("fixtureId", fixtureId);
  const headers: Record<string, string> = {
    ...authHeaders(creds),
    Accept: "text/event-stream",
  };
  if (lastEventId) headers["Last-Event-ID"] = lastEventId;
  return fetch(url, { headers, cache: "no-store" });
}

/** Fetch a Merkle-proof validation payload for a specific scores event. */
export async function fetchStatValidation(
  fixtureId: string,
  seq: number,
  statKey = 1
): Promise<unknown> {
  const creds = getCreds();
  if (!creds) throw new Error("TxLINE not configured");
  const url = new URL(`${API_BASE}/scores/stat-validation`);
  url.searchParams.set("fixtureId", fixtureId);
  url.searchParams.set("seq", String(seq));
  url.searchParams.set("statKey", String(statKey));
  const res = await fetch(url, { headers: authHeaders(creds), cache: "no-store" });
  if (!res.ok) throw new Error(`stat-validation ${res.status}: ${await res.text()}`);
  return res.json();
}
