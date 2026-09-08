"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOut, Menu, Search, X } from "lucide-react";
import { signOutAction } from "@/lib/auth/actions";
import { SidebarNav } from "./sidebar-nav";

export function DashboardShell({
  orgSlug,
  email,
  roleLabel,
  orgInitial,
  userInitial,
  children,
}: {
  orgSlug: string;
  email: string;
  roleLabel: string;
  orgInitial: string;
  userInitial: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const pathname = usePathname();
  const router = useRouter();

  // Close the mobile drawer on navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape closes it; lock body scroll while it's open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const sidebarInner = (
    <div className="flex h-full flex-col px-3 py-5">
      <div className="flex items-center gap-2.5 px-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-orange-500 text-sm font-bold text-white">
          {orgInitial}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold tracking-tight text-white">
            {orgSlug}
          </span>
          <span className="block text-xs text-slate-500">{roleLabel}</span>
        </span>
      </div>

      <div className="mt-5 flex-1 overflow-y-auto">
        <SidebarNav orgSlug={orgSlug} />
      </div>

      <div className="mt-4 flex items-center gap-2.5 border-t border-slate-800 px-2 pt-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-slate-100">
          {userInitial}
        </span>
        <span className="block min-w-0 flex-1 truncate text-xs text-slate-300">
          {email}
        </span>
        <form action={signOutAction}>
          <button
            type="submit"
            title="Log out"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-800 hover:text-orange-400"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar — static */}
      <aside className="hidden w-60 shrink-0 border-r border-slate-800 bg-slate-900 lg:block">
        {sidebarInner}
      </aside>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${
          open ? "" : "pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        <div
          className={`absolute inset-0 bg-slate-900/50 transition-opacity duration-200 ${
            open ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setOpen(false)}
        />
        <aside
          className={`absolute inset-y-0 left-0 w-64 border-r border-slate-800 bg-slate-900 shadow-xl transition-transform duration-200 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="absolute right-2 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
          {sidebarInner}
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              className="-ml-1 flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="truncate text-sm font-medium text-slate-500">
              {orgSlug}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const term = q.trim();
                router.push(
                  `/${orgSlug}/registrations${
                    term ? `?q=${encodeURIComponent(term)}` : ""
                  }`
                );
              }}
              className="relative hidden md:block"
            >
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search registrations…"
                className="w-56 rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </form>
            <Link
              href={`/${orgSlug}/messages`}
              aria-label="Message activity"
              className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            >
              <Bell className="h-4 w-4" />
            </Link>
            <span className="hidden text-sm text-slate-500 lg:inline">
              {email}
            </span>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
              {userInitial}
            </span>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
