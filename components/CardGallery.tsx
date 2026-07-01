"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

interface GalleryAsset {
  id: string;
  name: string;
  image?: string;
}

interface AssetsResponse {
  dasAvailable: boolean;
  assets: GalleryAsset[];
}

/**
 * Shows the connected wallet's minted Big Moment cNFTs, read back from the
 * Solana DAS API via /api/assets. Renders nothing until a wallet is connected.
 */
export default function CardGallery() {
  const { publicKey } = useWallet();
  const [data, setData] = useState<AssetsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!publicKey) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/assets?owner=${publicKey.toBase58()}`);
      setData(await res.json());
    } catch {
      setData({ dasAvailable: true, assets: [] });
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!publicKey) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-pitch-900/60 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          Your Big Moments
        </h3>
        <button
          onClick={load}
          className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-white/5"
        >
          {loading ? "…" : "Refresh"}
        </button>
      </div>

      {data && !data.dasAvailable && (
        <p className="mt-2 text-[11px] text-slate-500">
          Set <code className="rounded bg-black/30 px-1">HELIUS_API_KEY</code> to read
          compressed NFTs back via the DAS API.
        </p>
      )}

      {data?.dasAvailable && data.assets.length === 0 && !loading && (
        <p className="mt-2 text-[11px] text-slate-500">
          No cards yet — mint a Big Moment to start your collection.
        </p>
      )}

      {data && data.assets.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {data.assets.map((a) => (
            <div key={a.id} className="overflow-hidden rounded-xl border border-white/10">
              {a.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.image} alt={a.name} className="aspect-square w-full object-cover" />
              ) : (
                <div className="flex aspect-square items-center justify-center bg-black/30 text-xs text-slate-500">
                  {a.name}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
