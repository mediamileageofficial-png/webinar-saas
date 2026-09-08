import { notFound, redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { getServerUser, getMembershipForOrgSlug } from "@/lib/auth/session";
import { signOutAction } from "@/lib/auth/actions";
import { SidebarNav } from "./sidebar-nav";

const ROLE_LABELS: Record<string, string> = {
  organization_owner: "Owner",
  organization_admin: "Admin",
  staff: "Staff",
  viewer: "Viewer",
};

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

  const orgInitial = orgSlug.charAt(0).toUpperCase();
  const userInitial = (user.email ?? "?").charAt(0).toUpperCase();
  const roleLabel = ROLE_LABELS[membership.role] ?? membership.role;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-900 px-3 py-5">
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
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs text-slate-300">
              {user.email}
            </span>
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
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
          <span className="text-sm font-medium text-slate-500">{orgSlug}</span>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">
              {user.email}
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
              {userInitial}
            </span>
          </div>
        </header>
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
