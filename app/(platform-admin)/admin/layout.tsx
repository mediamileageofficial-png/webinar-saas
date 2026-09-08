import { notFound, redirect } from "next/navigation";
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

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-56 shrink-0 border-r border-slate-800 bg-slate-900 px-3 py-6">
        <div className="flex items-center gap-2 px-3">
          <span className="h-2 w-2 shrink-0 rounded-full bg-orange-500" />
          <span className="text-sm font-semibold tracking-tight text-white">
            Platform Admin
          </span>
        </div>
        <AdminNav />
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-3">
          <span className="text-sm text-slate-400">
            Signed in as <span className="text-slate-200">{user.email}</span>
          </span>
          <form action={signOutAction}>
            <button
              type="submit"
              className="text-sm font-medium text-slate-300 transition-colors hover:text-orange-400"
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
