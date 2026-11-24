import type { Metadata } from "next";
import React from "react";
import Link from "next/link";
import "@fontsource-variable/outfit";
import "@fontsource/barlow-condensed/latin-800.css";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import DemoSwitcherBar from "@/components/DemoSwitcherBar";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "CampusHub — Verified campus events",
  description:
    "Browse campus events, save your plans and check for schedule conflicts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body className="font-sans antialiased flex flex-col min-h-dvh transition-colors duration-200">
        <AuthProvider>

            <a href="#main-content" className="sr-only z-50 bg-white p-3 text-black focus:not-sr-only focus:absolute">
              Skip to content
            </a>
            <DemoSwitcherBar />
            <Navbar />
            <main id="main-content" className="flex-1">{children}</main>
            <footer className="site-footer">
              <div className="site-width grid gap-8 py-10 sm:grid-cols-2"><div><Link href="/" className="text-xl font-bold">CampusHub<span className="text-red-500">.</span></Link><p className="mt-2 text-sm text-stone-300">More campus life. Less missed plans.</p></div><nav aria-label="Footer navigation" className="flex flex-wrap items-center gap-6 text-sm sm:justify-end"><Link href="/events">Explore events</Link><Link href="/events/create">Host an event</Link><Link href="/schedule">My schedule</Link></nav></div><div className="site-width border-t border-white/15 py-5 text-sm text-stone-400">Built by Squad 83 · CampusHub</div>
            </footer>

        </AuthProvider>
      </body>
    </html>
  );
}
