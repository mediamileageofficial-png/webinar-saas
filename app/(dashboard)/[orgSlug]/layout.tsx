import { notFound, redirect } from "next/navigation";
import { getServerUser, getMembershipForOrgSlug } from "@/lib/auth/session";
import { DashboardShell } from "./dashboard-shell";

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

  return (
    <DashboardShell
      orgSlug={orgSlug}
      email={user.email ?? ""}
      roleLabel={ROLE_LABELS[membership.role] ?? membership.role}
      orgInitial={orgSlug.charAt(0).toUpperCase()}
      userInitial={(user.email ?? "?").charAt(0).toUpperCase()}
    >
      {children}
    </DashboardShell>
  );
}
