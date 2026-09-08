"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Dashboard", href: "dashboard" },
  { label: "Webinars", href: "webinars" },
  { label: "Forms", href: "forms" },
  { label: "Registrations", href: "registrations" },
  { label: "Payments", href: "payments" },
  { label: "Payouts", href: "payouts" },
  { label: "Automation", href: "automation" },
  { label: "Messages", href: "messages" },
  { label: "Analytics", href: "analytics" },
  { label: "Integrations", href: "integrations" },
  { label: "Settings", href: "settings" },
];

export function SidebarNav({ orgSlug }: { orgSlug: string }) {
  const pathname = usePathname();

  return (
    <nav className="mt-6 flex flex-col gap-0.5">
      {NAV_ITEMS.map((item) => {
        const href = `/${orgSlug}/${item.href}`;
        const active =
          pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={item.href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative rounded-md px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-slate-800 font-medium text-white"
                : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            {active && (
              <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-orange-500" />
            )}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
