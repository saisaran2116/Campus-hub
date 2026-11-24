import type { Metadata } from "next";
import React from "react";
import "@fontsource-variable/outfit";
import "@fontsource/barlow-condensed/latin-800.css";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('campushub_theme')||'light';document.documentElement.classList.remove('dark','light');document.documentElement.classList.add(t);}catch(e){}})()`,
          }}
        />
      </head>
      <body className="font-sans antialiased flex flex-col min-h-dvh transition-colors duration-200">
        <AuthProvider>
          <ThemeProvider>
            <a href="#main-content" className="sr-only z-50 bg-white p-3 text-black focus:not-sr-only focus:absolute">
              Skip to content
            </a>
            <DemoSwitcherBar />
            <Navbar />
            <main id="main-content" className="flex-1">{children}</main>
            <footer className="border-t border-neutral-300 dark:border-neutral-700">
              <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-3 px-5 py-6 text-sm sm:px-8">
                <span className="font-semibold">CampusHub</span>
                <span className="text-neutral-600 dark:text-neutral-300">Built by Squad 83</span>
              </div>
            </footer>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
