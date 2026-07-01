"use client";

import dynamic from "next/dynamic";

/**
 * The wallet-adapter-react-ui button touches `window`, so it must be
 * rendered client-side only. `dynamic(..., { ssr: false })` avoids
 * hydration mismatches during `next build`'s static/prerender pass.
 */
const WalletMultiButtonDynamic = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export default function WalletConnectButton() {
  return (
    <WalletMultiButtonDynamic className="!bg-pulse !text-pitch-950 !rounded-full !text-sm !h-10 !font-semibold hover:!bg-pulse-soft" />
  );
}
