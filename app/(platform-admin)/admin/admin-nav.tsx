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
                ? "bg-white/15 font-medium text-white"
                : "text-sky-50 hover:bg-white/10 hover:text-white"
            }`}
          >
            {active && (
              <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-white" />
            )}
            <Icon
              className={`h-4 w-4 shrink-0 ${
                active ? "text-white" : "text-sky-100 group-hover:text-white"
              }`}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
