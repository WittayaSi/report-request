import { auth } from "@/auth";
import { redirect } from "next/navigation";

/**
 * Get current session - use in Server Components
 */
export async function getSession() {
  return await auth();
}

/**
 * Get current user - use in Server Components
 */
export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

/**
 * Require authentication - redirect to login if not authenticated
 * Use in Server Components that require authentication
 */
export async function requireAuth(redirectTo = "/login") {
  const session = await auth();
  if (!session?.user) {
    redirect(redirectTo);
  }
  return session;
}

/**
 * Require admin role - redirect to dashboard if not admin
 * Use in Server Components that require admin access
 */
export async function requireAdmin(redirectTo = "/dashboard") {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== "ADMIN") {
    redirect(redirectTo);
  }
  return session;
}
