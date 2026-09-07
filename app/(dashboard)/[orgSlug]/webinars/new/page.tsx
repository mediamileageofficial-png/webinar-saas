import { notFound } from "next/navigation";
import { getMembershipForOrgSlug } from "@/lib/auth/session";
import { WebinarForm } from "../webinar-form";
import { createWebinarAction } from "../actions";

export default async function NewWebinarPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const membership = await getMembershipForOrgSlug(orgSlug);
  if (!membership) notFound();
  if (!["organization_owner", "organization_admin", "staff"].includes(membership.role)) {
    notFound();
  }

  const boundAction = createWebinarAction.bind(null, orgSlug);

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">New webinar</h1>
      <p className="mt-1 text-sm text-slate-500">
        You can publish it and attach a registration form afterward.
      </p>
      <div className="mt-6">
        <WebinarForm action={boundAction} submitLabel="Create webinar" />
      </div>
    </div>
  );
}
