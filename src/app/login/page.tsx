import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "./_components/login-form";

export default async function LoginPage() {
  // Server-side check - redirect if already logged in
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return <LoginForm />;
}
