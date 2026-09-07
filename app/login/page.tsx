import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import LoginForm from "./login-form";

export default async function LoginPage() {
  const user = await getServerUser();
  if (user) {
    redirect("/");
  }

  return <LoginForm />;
}
