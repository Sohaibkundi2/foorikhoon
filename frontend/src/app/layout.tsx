import type { Metadata } from "next";
import { Inter, Instrument_Serif, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

// Three faces, each with one job. Inter reads; Instrument Serif italic carries the
// one line per page that has to land; IBM Plex Mono handles eyebrows, field labels,
// figures and enum statuses.
//
// The serif and mono loaders publish CSS variables rather than class names, and the
// variables they publish are the ones Tailwind's own `font-serif` / `font-mono`
// utilities read — so `className="font-mono"` anywhere under <body> resolves to Plex
// Mono without every page having to thread a font object down to it.
const inter = Inter({ subsets: ["latin"] });

const displaySerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "ForiKhoon — Blood Donation Platform",
  description: "Connecting blood donors with hospitals across Pakistan",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${inter.className} ${displaySerif.variable} ${mono.variable} flex min-h-full flex-col bg-ink text-bone`}
      >
        <Navbar />
        <div className="flex-1 pt-[65px]">
          {children}
        </div>
      </body>
    </html>
  );
}
