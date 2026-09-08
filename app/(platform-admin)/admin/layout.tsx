import { notFound, redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { getServerUser, isPlatformAdmin } from "@/lib/auth/session";
import { signOutAction } from "@/lib/auth/actions";
import { AdminNav } from "./admin-nav";

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

  const userInitial = (user.email ?? "?").charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-900 px-3 py-5">
        <div className="flex items-center gap-2.5 px-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-orange-500 text-sm font-bold text-white">
            P
          </span>
          <span className="text-sm font-semibold tracking-tight text-white">
            Platform Admin
          </span>
        </div>

        <div className="mt-3 flex-1">
          <AdminNav />
        </div>

        <div className="mt-4 flex items-center gap-2.5 border-t border-slate-800 px-2 pt-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-slate-100">
            {userInitial}
          </span>
          <span className="block min-w-0 flex-1 truncate text-xs text-slate-300">
            {user.email}
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
          <span className="text-sm font-medium text-slate-500">
            Platform Admin
          </span>
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
