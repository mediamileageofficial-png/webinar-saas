import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getServerUser, getMembershipForOrgSlug } from "@/lib/auth/session";
import { signOutAction } from "@/lib/auth/actions";

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

export default async function OrgDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }

  // Membership is resolved server-side from the session + organization_members.
  // The orgSlug in the URL is never trusted as authorization by itself - if
  // the user isn't a member, we 404 rather than leak that the org exists.
  const membership = await getMembershipForOrgSlug(orgSlug);
  if (!membership) {
    notFound();
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-56 shrink-0 border-r border-slate-200 bg-white px-3 py-6">
        <div className="px-3 text-sm font-semibold text-slate-900">
          {orgSlug}
        </div>
        <nav className="mt-6 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={`/${orgSlug}/${item.href}`}
              className="rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <span className="text-sm text-slate-500">
            Signed in as {user.email}
          </span>
          <form action={signOutAction}>
            <button
              type="submit"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Log out
            </button>
          </form>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
