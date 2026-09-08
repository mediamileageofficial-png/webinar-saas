import Link from "next/link";
import { notFound } from "next/navigation";
import { getMembershipForOrgSlug } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { DeleteWebinarButton } from "./delete-webinar-button";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  published: "bg-slate-100 text-slate-700",
  registration_open: "bg-green-50 text-green-700",
  registration_closed: "bg-amber-50 text-amber-700",
  completed: "bg-slate-100 text-slate-500",
  cancelled: "bg-red-50 text-red-600",
};

export default async function WebinarsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const membership = await getMembershipForOrgSlug(orgSlug);
  if (!membership) notFound();

  const supabase = await createClient();
  // Explicit organization_id filter is mandatory here - RLS alone would
  // return webinars from every org this user belongs to, not just this one.
  const { data: webinars, error } = await supabase
    .from("webinars")
    .select("id, name, event_date, start_time, status")
    .eq("organization_id", membership.organizationId)
    .order("start_time", { ascending: false });

  const canWrite = ["organization_owner", "organization_admin", "staff"].includes(
    membership.role
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Webinars</h1>
        {canWrite && (
          <Link
            href={`/${orgSlug}/webinars/new`}
            className="rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600"
          >
            New webinar
          </Link>
        )}
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {error && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-red-600">
                  Could not load webinars.
                </td>
              </tr>
            )}
            {!error && webinars?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  No webinars yet.
                </td>
              </tr>
            )}
            {webinars?.map((webinar) => (
              <tr key={webinar.id}>
                <td className="px-4 py-3 font-medium text-slate-900">
                  <Link
                    href={`/${orgSlug}/webinars/${webinar.id}`}
                    className="hover:underline"
                  >
                    {webinar.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {new Date(webinar.start_time).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATUS_STYLES[webinar.status] ?? "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {webinar.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {canWrite && webinar.status === "draft" && (
                    <DeleteWebinarButton orgSlug={orgSlug} webinarId={webinar.id} />
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
