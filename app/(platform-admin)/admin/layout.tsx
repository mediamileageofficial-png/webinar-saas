import { notFound, redirect } from "next/navigation";
import { getServerUser, isPlatformAdmin } from "@/lib/auth/session";
import { AdminShell } from "./admin-shell";

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
    <AdminShell
      email={user.email ?? ""}
      userInitial={(user.email ?? "?").charAt(0).toUpperCase()}
    >
      {children}
    </AdminShell>
  );
}
