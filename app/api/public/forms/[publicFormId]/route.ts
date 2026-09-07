import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ publicFormId: string }> }
) {
  const { publicFormId } = await params;

  try {
    const supabase = createAdminClient();

    // Public reads bypass RLS via the service-role client on purpose (there's
    // no anonymous session to scope RLS to) - which means THIS route is the
    // security boundary. It must never return an unpublished form, and must
    // never leak organization_id or other tenant-internal fields.
    const { data: form, error } = await supabase
      .from("forms")
      .select(
        "id, name, description, success_message, submit_button_text, is_paid, price_amount, currency, logo_url"
      )
      .eq("public_slug", publicFormId)
      .eq("is_published", true)
      .maybeSingle();

    if (error || !form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    const { data: fields } = await supabase
      .from("form_fields")
      .select("id, field_type, field_key, label, placeholder, help_text, is_required, options")
      .eq("form_id", form.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    return NextResponse.json({
      form: {
        id: form.id,
        name: form.name,
        description: form.description,
        successMessage: form.success_message,
        submitButtonText: form.submit_button_text,
        isPaid: form.is_paid,
        priceAmount: form.price_amount,
        currency: form.currency,
        logoUrl: form.logo_url,
      },
      fields: fields ?? [],
    });
  } catch {
    // Never leak a raw stack trace / connection error to a public caller.
    return NextResponse.json({ error: "Could not load this form." }, { status: 500 });
  }
}
