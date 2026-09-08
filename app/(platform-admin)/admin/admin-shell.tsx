"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { signOutAction } from "@/lib/auth/actions";
import { BrandBackdrop } from "@/components/brand/brand-backdrop";
import { AdminNav } from "./admin-nav";

export function AdminShell({
  email,
  userInitial,
  children,
}: {
  email: string;
  userInitial: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-sm font-bold text-sky-600">
          P
        </span>
        <span className="text-sm font-semibold tracking-tight text-white">
          Platform Admin
        </span>
      </div>

      <div className="mt-3 flex-1 overflow-y-auto">
        <AdminNav />
      </div>

      <div className="mt-4 flex items-center gap-2.5 border-t border-white/20 px-2 pt-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-semibold text-white">
          {userInitial}
        </span>
        <span className="block min-w-0 flex-1 truncate text-xs text-sky-50">
          {email}
        </span>
        <form action={signOutAction}>
          <button
            type="submit"
            title="Log out"
            className="flex h-7 w-7 items-center justify-center rounded-md text-sky-100 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <BrandBackdrop variant="subtle" />
      <aside className="hidden w-60 shrink-0 bg-sky-500 lg:block">
        {sidebarInner}
      </aside>

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
          className={`absolute inset-y-0 left-0 w-64 bg-sky-500 shadow-xl transition-transform duration-200 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="absolute right-2 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-md text-sky-100 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
          {sidebarInner}
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-3 bg-sky-500 px-4 text-white sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              className="-ml-1 flex h-9 w-9 items-center justify-center rounded-md text-white hover:bg-white/10 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="truncate text-sm font-medium text-sky-50">
              Platform Admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-sky-50 sm:inline">{email}</span>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-semibold text-white">
              {userInitial}
            </span>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
