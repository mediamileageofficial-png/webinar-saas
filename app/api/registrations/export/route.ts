import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOrgRole, UnauthorizedError } from "@/lib/auth/guards";

function csvEscape(value: unknown): string {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const orgSlug = url.searchParams.get("orgSlug");
  if (!orgSlug) {
    return NextResponse.json({ error: "orgSlug is required" }, { status: 400 });
  }

  try {
    // Any member role can export (matches "view registrations" permission
    // from the role matrix) - requireOrgRole with no role list just confirms
    // membership in THIS org, which is what actually matters here.
    const membership = await requireOrgRole(orgSlug);
    const supabase = await createClient();

    let query = supabase
      .from("registrations")
      .select(
        "full_name, email, mobile, status, payment_status, utm_source, created_at, webinars(name), forms(name)"
      )
      .eq("organization_id", membership.organizationId)
      .order("created_at", { ascending: false });

    const webinarId = url.searchParams.get("webinarId");
    if (webinarId) query = query.eq("webinar_id", webinarId);
    const paymentStatus = url.searchParams.get("paymentStatus");
    if (paymentStatus) query = query.eq("payment_status", paymentStatus);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: "Could not export registrations." }, { status: 500 });
    }

    const header = [
      "Name",
      "Email",
      "Mobile",
      "Webinar",
      "Form",
      "Status",
      "Payment Status",
      "Source",
      "Registered At",
    ];
    const rows = (data ?? []).map((r) => {
      const webinar = Array.isArray(r.webinars) ? r.webinars[0] : r.webinars;
      const form = Array.isArray(r.forms) ? r.forms[0] : r.forms;
      return [
        r.full_name ?? "",
        r.email ?? "",
        r.mobile ?? "",
        webinar?.name ?? "",
        form?.name ?? "",
        r.status,
        r.payment_status,
        r.utm_source ?? "",
        r.created_at,
      ];
    });

    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="registrations-${orgSlug}.csv"`,
      },
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Could not export registrations." }, { status: 500 });
  }
}
