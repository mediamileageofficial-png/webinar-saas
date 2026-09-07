import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getServerUser, isPlatformAdmin } from "@/lib/auth/session";
import { signOutAction } from "@/lib/auth/actions";

const NAV_ITEMS = [
  { label: "Organizations", href: "/admin/organizations" },
  { label: "Payouts", href: "/admin/payouts" },
  { label: "Platform stats", href: "/admin/stats" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }

  // Platform admin status is resolved server-side from the platform_admins
  // table, never from anything the client sends. Non-admins get a 404, not a
  // 403 - the admin area shouldn't be discoverable as "exists but forbidden".
  const admin = await isPlatformAdmin();
  if (!admin) {
    notFound();
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-56 shrink-0 border-r border-slate-200 bg-white px-3 py-6">
        <div className="px-3 text-sm font-semibold text-slate-900">
          Platform Admin
        </div>
        <nav className="mt-6 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
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
