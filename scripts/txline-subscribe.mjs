/**
 * scripts/txline-subscribe.mjs
 * ---------------------------------------------------------------------------
 * One-time setup for REAL TxLINE access on Solana devnet (free World Cup tier):
 *   1. Load or generate a devnet service keypair; airdrop SOL if needed.
 *   2. Call the on-chain `subscribe(serviceLevelId=1, weeks=4)` instruction
 *      (no TxL payment required for the World Cup tier).
 *   3. Get a guest JWT, sign the activation message, activate the API token.
 *   4. Discover the World Cup competitionId from the fixtures snapshot.
 *   5. Persist everything to .env.local.
 *
 * Run:  node scripts/txline-subscribe.mjs
 */

import * as anchor from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotent,
} from "@solana/spl-token";
import { Connection, Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import nacl from "tweetnacl";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ENV_PATH = path.join(ROOT, ".env.local");

const CONFIG = {
  rpcUrl: "https://api.devnet.solana.com",
  apiOrigin: "https://txline-dev.txodds.com",
  programId: new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J"),
  txlTokenMint: new PublicKey("4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG"),
};
const SERVICE_LEVEL_ID = 1; // World Cup & Int Friendlies (60-second delay), devnet
const DURATION_WEEKS = 4;
const SELECTED_LEAGUES = [];

// ---- tiny .env.local reader/writer -----------------------------------------
function readEnv() {
  const env = {};
  if (fs.existsSync(ENV_PATH)) {
    for (const line of fs.readFileSync(ENV_PATH, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2];
    }
  }
  return env;
}
function upsertEnv(updates) {
  let lines = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, "utf8").split("\n") : [];
  for (const [k, v] of Object.entries(updates)) {
    const idx = lines.findIndex((l) => l.startsWith(`${k}=`));
    const line = `${k}=${v}`;
    if (idx >= 0) lines[idx] = line;
    else lines.push(line);
  }
  fs.writeFileSync(ENV_PATH, lines.filter((l) => l !== "").join("\n") + "\n");
}

async function main() {
  const env = readEnv();
  const rpcUrl = env.HELIUS_API_KEY
    ? `https://devnet.helius-rpc.com/?api-key=${env.HELIUS_API_KEY}`
    : CONFIG.rpcUrl;
  const connection = new Connection(rpcUrl, "confirmed");

  // 1. Keypair
  let keypair;
  let newKeypair = false;
  if (env.TXLINE_SERVICE_SECRET) {
    keypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(env.TXLINE_SERVICE_SECRET)));
    console.log("Using existing service keypair:", keypair.publicKey.toBase58());
  } else {
    keypair = Keypair.generate();
    newKeypair = true;
    console.log("Generated new service keypair:", keypair.publicKey.toBase58());
  }

  // 2. Fund (devnet)
  let bal = await connection.getBalance(keypair.publicKey);
  console.log("Balance:", bal / LAMPORTS_PER_SOL, "SOL");
  if (bal < 0.05 * LAMPORTS_PER_SOL) {
    console.log("Requesting devnet airdrop…");
    try {
      const sig = await connection.requestAirdrop(keypair.publicKey, 1 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig, "confirmed");
      bal = await connection.getBalance(keypair.publicKey);
      console.log("Funded. Balance:", bal / LAMPORTS_PER_SOL, "SOL");
    } catch (e) {
      console.error(
        "Airdrop failed (devnet faucet is rate-limited). Fund this address manually and re-run:\n ",
        keypair.publicKey.toBase58(),
        "\n  https://faucet.solana.com/ (select devnet)"
      );
      if (newKeypair) upsertEnv({ TXLINE_SERVICE_SECRET: `[${keypair.secretKey.toString()}]` });
      process.exit(1);
    }
  }

  // 3. On-chain subscribe
  const wallet = new anchor.Wallet(keypair);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);
  const idl = JSON.parse(
    fs.readFileSync(path.join(__dirname, "idl", "txoracle-devnet.json"), "utf8")
  );
  const program = new anchor.Program(idl, provider);

  const [pricingMatrixPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pricing_matrix")],
    CONFIG.programId
  );
  const [tokenTreasuryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("token_treasury_v2")],
    CONFIG.programId
  );
  const tokenTreasuryVault = getAssociatedTokenAddressSync(
    CONFIG.txlTokenMint,
    tokenTreasuryPda,
    true,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  const userTokenAccount = getAssociatedTokenAddressSync(
    CONFIG.txlTokenMint,
    keypair.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  // The program expects the user's TxL Token-2022 ATA to already exist
  // (free tier holds a 0 balance). Create it idempotently first.
  console.log("Ensuring user TxL token account exists…");
  await createAssociatedTokenAccountIdempotent(
    connection,
    keypair, // payer
    CONFIG.txlTokenMint,
    keypair.publicKey, // owner
    {},
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  console.log(`Subscribing (serviceLevel=${SERVICE_LEVEL_ID}, weeks=${DURATION_WEEKS})…`);
  const txSig = await program.methods
    .subscribe(SERVICE_LEVEL_ID, DURATION_WEEKS)
    .accounts({
      user: keypair.publicKey,
      pricingMatrix: pricingMatrixPda,
      tokenMint: CONFIG.txlTokenMint,
      userTokenAccount,
      tokenTreasuryVault,
      tokenTreasuryPda,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .rpc();
  console.log("Subscribed. tx:", txSig);

  // 4. Guest JWT + activate
  const authRes = await fetch(`${CONFIG.apiOrigin}/auth/guest/start`, { method: "POST" });
  const { token: jwt } = await authRes.json();

  const messageString = `${txSig}:${SELECTED_LEAGUES.join(",")}:${jwt}`;
  const signature = nacl.sign.detached(new TextEncoder().encode(messageString), keypair.secretKey);
  const walletSignature = Buffer.from(signature).toString("base64");

  const actRes = await fetch(`${CONFIG.apiOrigin}/api/token/activate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({ txSig, walletSignature, leagues: SELECTED_LEAGUES }),
  });
  if (!actRes.ok) {
    console.error("Activation failed:", actRes.status, await actRes.text());
    process.exit(1);
  }
  const actText = (await actRes.text()).trim();
  let apiToken;
  try {
    apiToken = JSON.parse(actText).token ?? actText;
  } catch {
    apiToken = actText;
  }
  console.log("Activated API token:", apiToken.slice(0, 12) + "…");

  // 5. Discover World Cup competitionId
  let wcId = env.TXLINE_WORLDCUP_COMPETITION_ID ?? "";
  try {
    const fxRes = await fetch(`${CONFIG.apiOrigin}/api/fixtures/snapshot`, {
      headers: { Authorization: `Bearer ${jwt}`, "X-Api-Token": apiToken },
    });
    if (fxRes.ok) {
      const fixtures = await fxRes.json();
      const wc = fixtures.find((f) => /world\s*cup/i.test(f.Competition ?? ""));
      if (wc) {
        wcId = String(wc.CompetitionId);
        console.log(`World Cup competitionId=${wcId} (${wc.Competition})`);
      } else {
        const comps = [...new Set(fixtures.map((f) => `${f.CompetitionId}:${f.Competition}`))];
        console.log("No 'World Cup' fixture found right now. Competitions seen:", comps.slice(0, 20));
      }
    }
  } catch (e) {
    console.warn("competitionId discovery skipped:", String(e));
  }

  // Persist
  const updates = {
    TXLINE_API_ORIGIN: CONFIG.apiOrigin,
    TXLINE_JWT: jwt,
    TXLINE_API_TOKEN: apiToken,
  };
  if (wcId) updates.TXLINE_WORLDCUP_COMPETITION_ID = wcId;
  if (newKeypair || !env.TXLINE_SERVICE_SECRET)
    updates.TXLINE_SERVICE_SECRET = `[${keypair.secretKey.toString()}]`;
  if (!env.NEXT_PUBLIC_APP_URL) updates.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  upsertEnv(updates);
  console.log("\n✅ Wrote credentials to .env.local");
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
