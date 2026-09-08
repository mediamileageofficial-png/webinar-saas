import { createClient } from "@/lib/supabase/server";
import { CreateOrgForm } from "./create-org-form";
import { OrgStatusButton } from "./org-status-button";

export default async function AdminOrganizationsPage() {
  const supabase = await createClient();
  const { data: organizations, error } = await supabase
    .from("organizations")
    .select("id, name, slug, status, created_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">Organizations</h1>
      <p className="mt-1 text-sm text-slate-500">
        Every tenant on the platform. Suspending an organization blocks its
        members from accessing their dashboard and public forms.
      </p>

      <div className="mt-6">
        <CreateOrgForm />
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[42rem] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Slug</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Created</th>
              <th className="px-4 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {error && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-red-600">
                  Could not load organizations.
                </td>
              </tr>
            )}
            {!error && organizations?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  No organizations yet.
                </td>
              </tr>
            )}
            {organizations?.map((org) => (
              <tr key={org.id}>
                <td className="px-4 py-3 font-medium text-slate-900">
                  {org.name}
                </td>
                <td className="px-4 py-3 text-slate-500">/{org.slug}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      org.status === "active"
                        ? "rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700"
                        : "rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600"
                    }
                  >
                    {org.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {new Date(org.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <OrgStatusButton
                    organizationId={org.id}
                    status={org.status as "active" | "suspended"}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
