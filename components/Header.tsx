import Link from "next/link";
import WalletConnectButton from "./WalletConnectButton";

export default function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-pitch-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-pulse shadow-[0_0_12px_2px_rgba(34,197,94,0.7)]" />
          <span className="text-lg font-bold tracking-tight">
            Matchday Pulse
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-slate-300 sm:flex">
          <Link href="/match/demo-1" className="hover:text-white">
            Live Match
          </Link>
          <Link href="/predict" className="hover:text-white">
            Predict
          </Link>
        </nav>

        <WalletConnectButton />
      </div>
    </header>
  );
}
