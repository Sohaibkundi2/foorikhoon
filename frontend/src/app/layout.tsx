import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ForiKhoon — Blood Donation Platform",
  description: "Connecting blood donors with hospitals across Pakistan",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} min-h-full flex flex-col bg-[#0A0A0A] text-white`}>
        <Navbar />
        <div className="flex-1 pt-[65px]">
          {children}
        </div>
      </body>
    </html>
  );
}