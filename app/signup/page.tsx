import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import SignupForm from "./signup-form";

export default async function SignupPage() {
  const user = await getServerUser();
  if (user) {
    redirect("/");
  }

  return <SignupForm />;
}
