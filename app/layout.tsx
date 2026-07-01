import type { Metadata } from "next";
import "./globals.css";
import SolanaProvider from "@/components/SolanaProvider";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "Matchday Pulse",
  description:
    "A live fan companion for the World Cup — Big Moment Cards, a live pulse meter, and prediction mini-games, built on Solana.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-pitch-950">
        <SolanaProvider>
          <Header />
          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        </SolanaProvider>
      </body>
    </html>
  );
}
