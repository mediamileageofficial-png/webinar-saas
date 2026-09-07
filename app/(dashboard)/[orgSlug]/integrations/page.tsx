import Link from "next/link";
import { notFound } from "next/navigation";
import { getMembershipForOrgSlug } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function IntegrationsLandingPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const membership = await getMembershipForOrgSlug(orgSlug);
  if (!membership) notFound();

  const supabase = await createClient();
  const { data: forms } = await supabase
    .from("forms")
    .select("id, name, public_slug, is_published")
    .eq("organization_id", membership.organizationId)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">Integrations</h1>
      <p className="mt-1 text-sm text-slate-500">
        Each form has its own public URL, embed code, React snippet, and QR
        code. Pick a form to view its integration details.
      </p>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Form</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium text-right">Integration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(!forms || forms.length === 0) && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                  No forms yet.{" "}
                  <Link href={`/${orgSlug}/forms/new`} className="underline">
                    Create one
                  </Link>
                  .
                </td>
              </tr>
            )}
            {forms?.map((form) => (
              <tr key={form.id}>
                <td className="px-4 py-3 font-medium text-slate-900">{form.name}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      form.is_published
                        ? "rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                        : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                    }
                  >
                    {form.is_published ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/${orgSlug}/forms/${form.id}/integrations`}
                    className="text-sm font-medium text-slate-600 hover:underline"
                  >
                    View details &rarr;
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
