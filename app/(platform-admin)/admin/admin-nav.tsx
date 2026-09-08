"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Wallet, BarChart3, type LucideIcon } from "lucide-react";

const NAV_ITEMS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Organizations", href: "/admin/organizations", icon: Building2 },
  { label: "Payouts", href: "/admin/payouts", icon: Wallet },
  { label: "Platform stats", href: "/admin/stats", icon: BarChart3 },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-6 flex flex-col gap-0.5">
      {NAV_ITEMS.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-slate-800 font-medium text-white"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
            }`}
          >
            {active && (
              <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-orange-500" />
            )}
            <Icon
              className={`h-4 w-4 shrink-0 ${
                active ? "text-orange-400" : "text-slate-500 group-hover:text-slate-300"
              }`}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
