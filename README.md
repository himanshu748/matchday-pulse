# Matchday Pulse

**Live World Cup moments → on-chain-verified, gas-free collectibles on Solana.**

Matchday Pulse is a fan-experience app for the **TxODDS × Solana World Cup Hackathon**
(Consumer & Fan Experiences track). It streams the **real TxLINE** World Cup feed:
every goal, card, and penalty becomes a shareable **Big Moment Card** that is

- **provably real** — each moment carries a TxLINE **Merkle proof anchored to Solana**
  ("✓ Verified on-chain"), not invented data, and
- **collectible** — mintable as a **gas-free Metaplex Bubblegum compressed NFT**
  (the fan's wallet is only the recipient; the app pays), viewable in a wallet gallery.

Plus a **Live Pulse** hype meter and a **prediction mini-game** played against the real feed.

> TxLINE is the **primary data input**: the feed, the verification badges, and the
> minted cards' metadata all derive from live TxLINE World Cup data.

---

## How it works

```
TxLINE (devnet, free World Cup tier)
  guest JWT ──► on-chain subscribe() ──► activate ──► X-Api-Token
        │
        ▼  (server holds the token; browser never sees it)
  /api/feed/[fixtureId]  ── SSE relay, normalizes Scores → MatchEvent
  /api/fixtures          ── live World Cup fixtures
  /api/verify/[id]/[seq] ── Merkle-proof "verified on-chain" badge
        │
        ▼
  Big Moment Card ──► /api/mint ──► Bubblegum V2 cNFT (server-signed, gas-free)
                                     └─ /api/metadata + /api/card-image (the card IS the NFT art)
        ▼
  /api/assets (DAS) ──► "Your Big Moments" gallery
```

| Piece | Status | Where |
|---|---|---|
| TxLINE live feed (SSE relay + poll fallback) | **Real** | `app/api/feed/*`, `lib/txline/*` |
| On-chain Merkle-proof verification badge | **Real** | `app/api/verify/*`, `components/BigMomentCard.tsx` |
| Compressed-NFT minting (Bubblegum V2, gas-free) | **Real** | `app/api/mint/*`, `lib/umi.ts`, `scripts/create-tree.mjs` |
| cNFT gallery (DAS `getAssetsByOwner`) | **Real** (needs Helius key) | `app/api/assets/*`, `components/CardGallery.tsx` |
| Wallet connect (Phantom/Solflare, devnet) | **Real** | `components/SolanaProvider.tsx` |
| Prediction game + leaderboard | Real game vs. real feed; leaderboard is mock | `app/predict/page.tsx` |
| Mock feed | **Fallback only** (demo id / no live fixture) | `lib/mockFeed.ts` |

---

## Setup

```bash
npm install
cp .env.example .env.local
```

**1. Get real TxLINE access + service keypair (devnet, free):**

```bash
node scripts/txline-subscribe.mjs
```

This generates a devnet service keypair, airdrops SOL, sends the on-chain
`subscribe()` (free World Cup tier — no TxL payment), activates the API token,
discovers the World Cup `competitionId`, and writes everything to `.env.local`.
If the devnet faucet is rate-limited, fund the printed address at
<https://faucet.solana.com/> (devnet) and re-run.

**2. Create the Bubblegum tree (once):**

```bash
node scripts/create-tree.mjs   # writes MERKLE_TREE_ADDRESS
```

**3. (Optional) Gallery read-back:** add a free `HELIUS_API_KEY` from
<https://helius.dev> to `.env.local` so `/collection` can list minted cNFTs
(the default devnet RPC can't serve DAS queries).

**4. Run:**

```bash
npm run dev      # http://localhost:3000
```

- `/` — live World Cup fixtures (from TxLINE)
- `/match/[fixtureId]` — live Big Moments + verification badges + Live Pulse + mint
- `/predict` — prediction mini-game against the real feed
- `/collection` — your minted cNFTs

Without TxLINE credentials the app still runs: it falls back to a simulated feed
and disables real minting, so it never hard-fails during a demo.

---

## Environment

See `.env.example`. Secrets (`TXLINE_SERVICE_SECRET`, `TXLINE_JWT`,
`TXLINE_API_TOKEN`) live only in `.env.local` (gitignored) and are used
**server-side only** — they never reach the browser bundle.

## Tech

Next.js 14 (App Router) · TypeScript · Tailwind · Solana wallet-adapter ·
Metaplex UMI + Bubblegum V2 + DAS API · TxLINE (TxODDS) real-time feed.

## Deploy

Deployable to Vercel (Node.js runtime for the API routes). Set the same env
vars in the Vercel project and point `NEXT_PUBLIC_APP_URL` at the deployed URL.
Note: the SSE relay is bounded (~4 min) and the client auto-reconnects; the
route also has a polling fallback that is robust on serverless.
