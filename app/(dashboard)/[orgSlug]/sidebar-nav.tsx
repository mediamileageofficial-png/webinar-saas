"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Video,
  FileText,
  Users,
  CreditCard,
  Wallet,
  Zap,
  MessageSquare,
  BarChart3,
  Plug,
  Settings,
  type LucideIcon,
} from "lucide-react";

type NavItem = { label: string; href: string; icon: LucideIcon };
type NavGroup = { heading: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    heading: "Overview",
    items: [
      { label: "Dashboard", href: "dashboard", icon: LayoutDashboard },
      { label: "Webinars", href: "webinars", icon: Video },
      { label: "Forms", href: "forms", icon: FileText },
      { label: "Registrations", href: "registrations", icon: Users },
    ],
  },
  {
    heading: "Revenue",
    items: [
      { label: "Payments", href: "payments", icon: CreditCard },
      { label: "Payouts", href: "payouts", icon: Wallet },
    ],
  },
  {
    heading: "Engage",
    items: [
      { label: "Automation", href: "automation", icon: Zap },
      { label: "Messages", href: "messages", icon: MessageSquare },
      { label: "Analytics", href: "analytics", icon: BarChart3 },
    ],
  },
  {
    heading: "Configure",
    items: [
      { label: "Integrations", href: "integrations", icon: Plug },
      { label: "Settings", href: "settings", icon: Settings },
    ],
  },
];

export function SidebarNav({ orgSlug }: { orgSlug: string }) {
  const pathname = usePathname();

  return (
    <nav className="mt-2 flex flex-col gap-5">
      {NAV.map((group) => (
        <div key={group.heading}>
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sky-100">
            {group.heading}
          </p>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const href = `/${orgSlug}/${item.href}`;
              const active = pathname === href || pathname.startsWith(`${href}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={href}
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
                      active
                        ? "text-white"
                        : "text-sky-100 group-hover:text-white"
                    }`}
                  />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
