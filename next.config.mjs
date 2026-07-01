/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Solana wallet-adapter + Metaplex UMI packages ship mixed CJS/ESM builds;
  // transpile them so Next.js can bundle them cleanly.
  transpilePackages: [
    "@solana/wallet-adapter-react",
    "@solana/wallet-adapter-react-ui",
    "@solana/wallet-adapter-wallets",
    "@solana/wallet-adapter-base",
    "@metaplex-foundation/umi",
    "@metaplex-foundation/umi-bundle-defaults",
    "@metaplex-foundation/mpl-bubblegum",
    "@metaplex-foundation/digital-asset-standard-api",
  ],
};

export default nextConfig;
