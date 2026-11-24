"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import KalviumLogo from "./KalviumLogo";

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const links = [{ href: "/events", label: "Events" }];
  if (user) links.push({ href: "/events/ask", label: "Find by interest" });
  if (user?.role === "STUDENT") links.push(
    { href: "/schedule", label: "My schedule" },
    { href: "/dashboard/student", label: "Overview" },
  );
  if (user?.role === "ORGANIZER") links.push(
    { href: "/dashboard/organizer", label: "My events" },
    { href: "/drafts", label: "Drafts" },
  );
  if (user?.role === "CAMPUS_MANAGER") links.push({ href: "/dashboard/manager", label: "Review queue" });

  return (
    <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="site-width flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-3">
        <Link href="/" className="inline-flex items-center gap-2 text-lg font-bold">
          <KalviumLogo size={25} className="text-rose-900 dark:text-rose-300" /> CampusHub
        </Link>
        <nav aria-label="Main navigation" className="order-last flex w-full flex-wrap items-center gap-x-1 lg:order-none lg:w-auto">
          {links.map(({ href, label }) => (
            <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}
              className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-stone-100 aria-[current=page]:bg-rose-50 aria-[current=page]:text-rose-900 dark:hover:bg-stone-800 dark:aria-[current=page]:bg-rose-950 dark:aria-[current=page]:text-rose-200">
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <button type="button" onClick={logout} className="btn btn-sm site-secondary">Sign out</button>
          ) : (
            <Link href="/login" className="btn btn-sm site-secondary">Sign in</Link>
          )}
        </div>
      </div>
    </header>
  );
}
