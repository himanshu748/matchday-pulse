"use client";

/**
 * SolanaProvider.tsx
 * ---------------------------------------------------------------------------
 * Wraps the app with the Solana wallet-adapter context, configured for
 * devnet. This is real, working wallet-connect infrastructure (not mocked) —
 * once a wallet extension (Phantom, Solflare, etc.) is installed, "Connect
 * Wallet" in the header will actually connect on devnet.
 *
 * What's still missing (see lib/mintCard.ts): the actual mint transaction
 * that would use this connection + connected publicKey.
 */

import { useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";

// Default styles for the wallet-adapter-react-ui modal/buttons.
import "@solana/wallet-adapter-react-ui/styles.css";

const NETWORK = (process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet") as
  | "devnet"
  | "testnet"
  | "mainnet-beta";

export default function SolanaProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const endpoint = useMemo(
    () => process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(NETWORK),
    []
  );

  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
