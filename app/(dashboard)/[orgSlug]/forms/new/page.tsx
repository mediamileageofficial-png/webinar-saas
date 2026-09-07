import { notFound } from "next/navigation";
import { getMembershipForOrgSlug } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { FormSettingsForm } from "../form-settings-form";
import { createFormAction } from "../actions";

export default async function NewFormPage({
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

  const supabase = await createClient();
  const { data: webinars } = await supabase
    .from("webinars")
    .select("id, name")
    .eq("organization_id", membership.organizationId)
    .order("start_time", { ascending: false });

  const boundAction = createFormAction.bind(null, orgSlug);

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">New form</h1>
      <p className="mt-1 text-sm text-slate-500">
        Add fields and publish it once it&apos;s ready.
      </p>
      <div className="mt-6">
        <FormSettingsForm
          action={boundAction}
          submitLabel="Create form"
          webinarOptions={webinars ?? []}
        />
      </div>
    </div>
  );
}
