import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("organization_members")
    .select("organizations(slug)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const organization = Array.isArray(data?.organizations)
    ? data?.organizations[0]
    : data?.organizations;

  if (organization?.slug) {
    redirect(`/${organization.slug}/dashboard`);
  }

  redirect("/onboarding");
}
