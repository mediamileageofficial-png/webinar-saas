import type { createAdminClient } from "@/lib/supabase/admin";

export interface RegistrationVariables {
  registration: {
    id: string;
    full_name: string | null;
    email: string | null;
    mobile: string | null;
    form_id: string;
    webinar_id: string | null;
    organization_id: string;
  };
  variables: Record<string, string>;
}

export async function buildRegistrationVariables(
  supabase: ReturnType<typeof createAdminClient>,
  registrationId: string
): Promise<RegistrationVariables | null> {
  const { data: registration } = await supabase
    .from("registrations")
    .select("id, full_name, email, mobile, form_id, webinar_id, organization_id")
    .eq("id", registrationId)
    .maybeSingle();

  if (!registration) return null;

  let webinar: { name: string; start_time: string; join_url: string | null } | null = null;
  if (registration.webinar_id) {
    const { data } = await supabase
      .from("webinars")
      .select("name, start_time, join_url")
      .eq("id", registration.webinar_id)
      .maybeSingle();
    webinar = data;
  }

  const startDate = webinar ? new Date(webinar.start_time) : null;

  return {
    registration,
    variables: {
      name: registration.full_name ?? "",
      email: registration.email ?? "",
      mobile: registration.mobile ?? "",
      webinar_name: webinar?.name ?? "",
      date: startDate ? startDate.toLocaleDateString() : "",
      time: startDate ? startDate.toLocaleTimeString() : "",
      join_link: webinar?.join_url ?? "",
      registration_id: registration.id,
    },
  };
}
