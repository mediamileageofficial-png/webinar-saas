import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ registrationId: string }> }
) {
  const { registrationId } = await params;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("registrations")
      .select("status, payment_status")
      .eq("id", registrationId)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ status: data.status, paymentStatus: data.payment_status });
  } catch {
    return NextResponse.json({ error: "Could not check status." }, { status: 500 });
  }
}
