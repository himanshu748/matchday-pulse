import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-10">
      <section className="text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-pulse">
          TxODDS World Cup Hackathon &middot; Consumer &amp; Fan Experiences
        </p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
          Matchday Pulse
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-slate-300">
          Every goal, red card, and penalty becomes a shareable Big Moment
          Card the instant it happens — collectible as a free compressed NFT
          on Solana. Feel the crowd&apos;s hype with the Live Pulse meter, and
          test your instincts in the prediction mini-game.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/match/demo-1"
            className="rounded-full bg-pulse px-5 py-2.5 text-sm font-semibold text-pitch-950 hover:bg-pulse-soft"
          >
            Watch the demo match
          </Link>
          <Link
            href="/predict"
            className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-slate-100 hover:bg-white/5"
          >
            Try the prediction game
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <FeatureCard
          title="Big Moment Cards"
          body="Auto-generated shareable cards for every match-defining event, mintable as gas-free compressed NFTs."
        />
        <FeatureCard
          title="Live Pulse"
          body="A real-time hype meter for the match, driven by incoming events (fan reactions to come)."
        />
        <FeatureCard
          title="Predict & Compete"
          body="Call the next event before it happens — no money, just bragging rights and a leaderboard."
        />
      </section>

      <section className="rounded-2xl border border-white/10 bg-pitch-900/60 p-4 text-sm text-slate-400">
        <strong className="text-slate-200">Hackathon status:</strong> this is
        a starter scaffold. The match feed, wallet connect UI, and prediction
        game are wired up end-to-end against mock data. See{" "}
        <code className="rounded bg-black/30 px-1 py-0.5">README.md</code> for
        exactly what&apos;s mocked vs. real and what needs to be wired in
        next.
      </section>
    </div>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-pitch-900/60 p-4">
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="mt-1.5 text-sm text-slate-400">{body}</p>
    </div>
  );
}
