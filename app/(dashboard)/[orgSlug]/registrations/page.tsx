import Link from "next/link";
import { notFound } from "next/navigation";
import { getMembershipForOrgSlug } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AttendanceButtons } from "./attendance-buttons";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  confirmed: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-600",
};

const PAYMENT_STYLES: Record<string, string> = {
  success: "bg-green-50 text-green-700",
  pending: "bg-amber-50 text-amber-700",
  failed: "bg-red-50 text-red-600",
  not_applicable: "bg-slate-100 text-slate-500",
};

export default async function RegistrationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ q?: string; webinarId?: string; paymentStatus?: string }>;
}) {
  const { orgSlug } = await params;
  const { q, webinarId, paymentStatus } = await searchParams;
  const membership = await getMembershipForOrgSlug(orgSlug);
  if (!membership) notFound();

  const canMarkAttendance = ["organization_owner", "organization_admin", "staff"].includes(
    membership.role
  );

  const supabase = await createClient();

  const { data: webinarOptions } = await supabase
    .from("webinars")
    .select("id, name")
    .eq("organization_id", membership.organizationId)
    .order("start_time", { ascending: false });

  let query = supabase
    .from("registrations")
    .select(
      "id, full_name, email, mobile, status, payment_status, utm_source, created_at, webinar_id, webinars(name), forms(name)"
    )
    .eq("organization_id", membership.organizationId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (webinarId) query = query.eq("webinar_id", webinarId);
  if (paymentStatus) query = query.eq("payment_status", paymentStatus);
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,mobile.ilike.%${q}%`);

  const { data: registrations, error } = await query;

  const registrationIds = (registrations ?? []).map((r) => r.id);
  const { data: attendanceRows } = registrationIds.length
    ? await supabase
        .from("attendance")
        .select("registration_id, attended")
        .in("registration_id", registrationIds)
    : { data: [] };
  const attendanceByRegistration = new Map(
    (attendanceRows ?? []).map((a) => [a.registration_id, a.attended])
  );

  const exportParams = new URLSearchParams({ orgSlug });
  if (webinarId) exportParams.set("webinarId", webinarId);
  if (paymentStatus) exportParams.set("paymentStatus", paymentStatus);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Registrations</h1>
        <a
          href={`/api/registrations/export?${exportParams.toString()}`}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Export CSV
        </a>
      </div>

      <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">Search</label>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Name, email, or mobile"
            className="w-56 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">Webinar</label>
          <select
            name="webinarId"
            defaultValue={webinarId ?? ""}
            className="w-48 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            <option value="">All webinars</option>
            {webinarOptions?.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">Payment</label>
          <select
            name="paymentStatus"
            defaultValue={paymentStatus ?? ""}
            className="w-40 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            <option value="">Any</option>
            <option value="success">Success</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="not_applicable">Free (N/A)</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600"
        >
          Filter
        </button>
        {(q || webinarId || paymentStatus) && (
          <Link
            href={`/${orgSlug}/registrations`}
            className="text-sm text-slate-500 hover:underline"
          >
            Clear
          </Link>
        )}
      </form>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Contact</th>
              <th className="px-4 py-2 font-medium">Webinar</th>
              <th className="px-4 py-2 font-medium">Form</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Payment</th>
              <th className="px-4 py-2 font-medium">Source</th>
              <th className="px-4 py-2 font-medium">Registered</th>
              {canMarkAttendance && <th className="px-4 py-2 font-medium text-right">Attendance</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {error && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-red-600">
                  Could not load registrations.
                </td>
              </tr>
            )}
            {!error && registrations?.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-slate-400">
                  No registrations match these filters.
                </td>
              </tr>
            )}
            {registrations?.map((r) => {
              const webinar = Array.isArray(r.webinars) ? r.webinars[0] : r.webinars;
              const form = Array.isArray(r.forms) ? r.forms[0] : r.forms;
              const attended = attendanceByRegistration.get(r.id) ?? null;

              return (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{r.full_name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">
                    <div>{r.email ?? "—"}</div>
                    <div className="text-xs text-slate-400">{r.mobile ?? ""}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{webinar?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{form?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_STYLES[r.status] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        PAYMENT_STYLES[r.payment_status] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {r.payment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{r.utm_source ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                  {canMarkAttendance && (
                    <td className="px-4 py-3 text-right">
                      {r.webinar_id && r.status === "confirmed" ? (
                        <AttendanceButtons
                          orgSlug={orgSlug}
                          webinarId={r.webinar_id}
                          registrationId={r.id}
                          currentlyAttended={attended}
                        />
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
