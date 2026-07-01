/**
 * scripts/create-tree.mjs
 * ---------------------------------------------------------------------------
 * Creates the Bubblegum V2 Merkle tree once (the container for all Big Moment
 * compressed NFTs) and writes MERKLE_TREE_ADDRESS to .env.local. Uses the same
 * devnet service keypair (TXLINE_SERVICE_SECRET) as tree authority / fee-payer.
 *
 * Run:  node scripts/create-tree.mjs
 */

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplBubblegum, createTreeV2 } from "@metaplex-foundation/mpl-bubblegum";
import { generateSigner, keypairIdentity } from "@metaplex-foundation/umi";
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ENV_PATH = path.join(ROOT, ".env.local");

function readEnv() {
  const env = {};
  if (fs.existsSync(ENV_PATH))
    for (const line of fs.readFileSync(ENV_PATH, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2];
    }
  return env;
}
function upsertEnv(updates) {
  let lines = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, "utf8").split("\n") : [];
  for (const [k, v] of Object.entries(updates)) {
    const idx = lines.findIndex((l) => l.startsWith(`${k}=`));
    if (idx >= 0) lines[idx] = `${k}=${v}`;
    else lines.push(`${k}=${v}`);
  }
  fs.writeFileSync(ENV_PATH, lines.filter((l) => l !== "").join("\n") + "\n");
}

async function ensureFunds(secret, rpc, minSol = 0.4) {
  const kp = Keypair.fromSecretKey(new Uint8Array(secret));
  const connection = new Connection(rpc, "confirmed");
  let bal = await connection.getBalance(kp.publicKey);
  let tries = 0;
  while (bal < minSol * LAMPORTS_PER_SOL && tries < 3) {
    console.log(`Balance ${bal / LAMPORTS_PER_SOL} SOL — requesting airdrop…`);
    try {
      const sig = await connection.requestAirdrop(kp.publicKey, 1 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig, "confirmed");
    } catch (e) {
      console.warn("airdrop attempt failed:", String(e));
    }
    bal = await connection.getBalance(kp.publicKey);
    tries++;
  }
  console.log("Balance:", bal / LAMPORTS_PER_SOL, "SOL", "→", kp.publicKey.toBase58());
  return bal;
}

async function main() {
  const env = readEnv();
  if (!env.TXLINE_SERVICE_SECRET) {
    console.error("TXLINE_SERVICE_SECRET missing — run scripts/txline-subscribe.mjs first.");
    process.exit(1);
  }
  if (env.MERKLE_TREE_ADDRESS) {
    console.log("MERKLE_TREE_ADDRESS already set:", env.MERKLE_TREE_ADDRESS, "— nothing to do.");
    return;
  }

  const rpc = env.HELIUS_API_KEY
    ? `https://devnet.helius-rpc.com/?api-key=${env.HELIUS_API_KEY}`
    : "https://api.devnet.solana.com";

  const secret = JSON.parse(env.TXLINE_SERVICE_SECRET);
  await ensureFunds(secret, rpc, 0.4);

  const umi = createUmi(rpc).use(mplBubblegum());
  const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secret));
  umi.use(keypairIdentity(keypair));

  const merkleTree = generateSigner(umi);
  console.log("Creating Bubblegum V2 tree:", merkleTree.publicKey);

  const builder = await createTreeV2(umi, {
    merkleTree,
    maxDepth: 14, // up to 16,384 Big Moments
    maxBufferSize: 64,
    canopyDepth: 0, // minting doesn't need a canopy; keeps devnet rent low
    public: false, // only the tree authority (our server) may mint
  });
  await builder.sendAndConfirm(umi);

  upsertEnv({ MERKLE_TREE_ADDRESS: merkleTree.publicKey });
  console.log("\n✅ Tree created. Wrote MERKLE_TREE_ADDRESS =", merkleTree.publicKey);
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
