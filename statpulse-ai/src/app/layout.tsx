import type { Metadata } from "next";
import { Suspense } from "react";
import { Sidebar } from "@/components/Sidebar";
import { DEFAULT_SEED } from "@/lib/data";
import "./globals.css";

export const metadata: Metadata = {
  title: "StatPulse AI · Fantasy Basketball Analytics Companion",
  description: "Turns AI shot-tracking and player-movement telemetry into actionable fantasy basketball advice.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col lg:flex-row">
          <Suspense>
            <Sidebar defaultSeed={DEFAULT_SEED} />
          </Suspense>
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
