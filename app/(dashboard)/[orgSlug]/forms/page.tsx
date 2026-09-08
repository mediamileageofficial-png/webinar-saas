import Link from "next/link";
import { notFound } from "next/navigation";
import { getMembershipForOrgSlug } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { FormRowActions } from "./form-row-actions";

export default async function FormsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const membership = await getMembershipForOrgSlug(orgSlug);
  if (!membership) notFound();

  const supabase = await createClient();
  // Explicit organization_id filter - see note in webinars/page.tsx: RLS
  // alone scopes to "any org this user belongs to", not this org slug.
  const { data: forms, error } = await supabase
    .from("forms")
    .select("id, name, public_slug, is_published, is_paid, price_amount, currency, created_at")
    .eq("organization_id", membership.organizationId)
    .order("created_at", { ascending: false });

  const canWrite = ["organization_owner", "organization_admin", "staff"].includes(
    membership.role
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Forms</h1>
        {canWrite && (
          <Link
            href={`/${orgSlug}/forms/new`}
            className="rounded-md bg-sky-500 px-3 py-2 text-sm font-medium text-white hover:bg-sky-600"
          >
            New form
          </Link>
        )}
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[42rem] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {error && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-red-600">
                  Could not load forms.
                </td>
              </tr>
            )}
            {!error && forms?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  No forms yet.
                </td>
              </tr>
            )}
            {forms?.map((form) => (
              <tr key={form.id}>
                <td className="px-4 py-3 font-medium text-slate-900">
                  <Link
                    href={`/${orgSlug}/forms/${form.id}/builder`}
                    className="hover:underline"
                  >
                    {form.name}
                  </Link>
                  <div className="text-xs font-normal text-slate-400">
                    /f/{form.public_slug}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {form.is_paid ? `${form.currency} ${form.price_amount}` : "Free"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      form.is_published
                        ? "rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700"
                        : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                    }
                  >
                    {form.is_published ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {canWrite && (
                    <FormRowActions
                      orgSlug={orgSlug}
                      formId={form.id}
                      isPublished={form.is_published}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
