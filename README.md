# Matchday Pulse

A starter scaffold for **Matchday Pulse**, a fan-experience companion app for
the TxODDS World Cup Hackathon (Consumer & Fan Experiences track). Built with
Next.js 14 (App Router), TypeScript, Tailwind CSS, and Solana wallet-adapter.

Every goal, red card, penalty, or match-defining event turns into a
shareable **Big Moment Card**, collectible as a gas-free compressed NFT on
Solana. A **Live Pulse** meter tracks match hype, and a **prediction
mini-game** lets fans call the next event for fun (no wagering).

This is a **starter scaffold**, not a finished product — it's meant to be
handed off to a developer (or another Claude Code session) to keep building.

---

## What's mocked vs. what's real

| Piece | Status | Where |
|---|---|---|
| Next.js/Tailwind app shell, routing, layout | **Real** | `app/`, `components/` |
| Solana wallet connect (Phantom/Solflare, devnet) | **Real** | `components/SolanaProvider.tsx`, `components/WalletConnectButton.tsx` |
| Match event feed | **Mocked** — fake `MatchEvent`s emitted on an interval | `lib/mockFeed.ts` |
| Big Moment Card UI | **Real** UI, rendering mock or (eventually) real events | `components/BigMomentCard.tsx` |
| Live Pulse meter | **Real** client-side UI, driven by event *count* (not real fan reactions) | `components/LivePulse.tsx` |
| Compressed NFT minting | **Stubbed** — returns a fake asset id after a simulated delay, does not touch Solana | `lib/mintCard.ts` |
| Prediction mini-game | **Real** client-side game logic against the mock feed, in-memory only | `app/predict/page.tsx` |
| Leaderboard | **Mocked** — hardcoded array, not persisted anywhere | `app/predict/page.tsx` |

Nothing in this repo talks to the real TxODDS feed, a real backend, or the
Solana network for minting. Wallet *connection* is real (devnet), but
*minting* is not.

---

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

- `/` — landing page
- `/match/demo-1` — live match page: subscribes to the mock feed, renders
  incoming Big Moment Cards, and shows the Live Pulse meter
- `/predict` — prediction mini-game + mock leaderboard

To build for production:

```bash
npm run build
npm run start
```

No environment variables are required to run the mock version. See
`.env.example` for the variables the *real* integrations will need.

---

## What needs to be wired in next

This scaffold intentionally stops short of the real integrations. In rough
priority order:

1. **Real TxODDS feed** (`lib/mockFeed.ts` → real client)
   - Get the WebSocket URL + auth mechanism from TxODDS once API access is
     granted; put them in `.env` as `TXODDS_WS_URL` / `TXODDS_API_KEY`
     (see `.env.example`).
   - Because the browser can't hold TxODDS credentials, add a small backend
     relay (Node service, or a Supabase Edge Function / Realtime channel)
     that authenticates once server-side and re-broadcasts normalized
     `MatchEvent`s to connected clients.
   - Map the real TxODDS payload schema onto (or replace) the `MatchEvent`
     type in `lib/types.ts` — field names there are a best guess.
   - Keep the `subscribeToMatchFeed(matchId, onEvent)` function signature
     stable so `app/match/[id]/page.tsx` doesn't need to change much.

2. **Metaplex Bubblegum compressed-NFT minting** (`lib/mintCard.ts`)
   - Full implementation plan is written inline as TODO comments in that
     file: create a Merkle tree + optional collection NFT once, then mint
     per-event via Bubblegum's `mintV1`/`mintToCollectionV1` from a
     server-side route (never from the browser, since the tree
     authority/fee-payer key must stay secret).
   - Upload card metadata/image to Arweave/IPFS (e.g. via Irys or
     NFT.Storage) before minting.
   - Look up minted assets via the Metaplex DAS API (compressed NFTs don't
     show up via plain `getAccountInfo`).

3. **Backend for Live Pulse aggregation**
   - Currently the pulse meter just reacts to the *local* event feed. The
     real product concept calls for aggregating actual fan taps/reactions
     across all connected viewers, gas-free via compressed state.
   - Supabase Realtime (broadcast or Postgres changes) is the leanest option
     mentioned in the original concept doc — a `pulse_events` table plus a
     realtime channel per match would let `LivePulse.tsx` subscribe to
     server-aggregated values instead of local counts.

4. **Real leaderboard persistence** (`app/predict/page.tsx`)
   - Replace `MOCK_LEADERBOARD` with a real table (Supabase Postgres is a
     natural fit alongside the pulse aggregation backend) keyed by wallet
     public key, storing points/correct-prediction counts.
   - Persist each round's prediction + outcome so it can be settled
     transparently against TxODDS' **TxLINE** on-chain audit trail, per the
     hackathon concept ("settled transparently on-chain," not a money
     market).
   - Add an API route (e.g. `app/api/predictions/route.ts`) to record
     predictions server-side instead of only in React state.

---

## Project structure

```
matchday-pulse/
├── app/
│   ├── layout.tsx            # Root layout: SolanaProvider + Header
│   ├── page.tsx              # Landing page
│   ├── globals.css
│   ├── match/[id]/page.tsx   # Live match page (mock feed + cards + pulse)
│   └── predict/page.tsx      # Prediction mini-game + mock leaderboard
├── components/
│   ├── SolanaProvider.tsx    # Wallet-adapter context, devnet
│   ├── WalletConnectButton.tsx
│   ├── Header.tsx
│   ├── BigMomentCard.tsx     # Shareable event card + stubbed mint button
│   └── LivePulse.tsx         # Animated hype meter
├── lib/
│   ├── types.ts              # MatchEvent, LeaderboardEntry, etc.
│   ├── mockFeed.ts           # Fake TxODDS-shaped event stream
│   └── mintCard.ts           # Stubbed Bubblegum mint function + TODOs
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── next.config.mjs
└── .env.example
```
