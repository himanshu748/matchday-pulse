"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import CardGallery from "@/components/CardGallery";

export default function CollectionPage() {
  const { publicKey } = useWallet();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Your Big Moment collection</h1>
      <p className="mt-1 text-sm text-slate-400">
        Compressed NFTs you&apos;ve minted from live World Cup moments, read back
        from Solana via the Metaplex DAS API.
      </p>

      <div className="mt-6">
        {publicKey ? (
          <CardGallery />
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">
            Connect your wallet to see your collection.
          </div>
        )}
      </div>
    </div>
  );
}
