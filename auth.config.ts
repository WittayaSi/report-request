import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  // Trust the host in production (required for Auth.js v5)
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      // Public routes - ไม่ต้อง login
      const publicRoutes = ["/"];
      const isPublicRoute = publicRoutes.includes(pathname);

      // Auth routes - หน้า login/register
      const authRoutes = ["/login", "/register", "/forgot-password"];
      const isAuthRoute = authRoutes.some((route) =>
        pathname.startsWith(route)
      );

      // Protected routes - ต้อง login
      const protectedRoutes = ["/dashboard", "/admin", "/profile", "/settings"];
      const isProtectedRoute = protectedRoutes.some((route) =>
        pathname.startsWith(route)
      );

      // Admin only routes
      const adminRoutes = ["/admin"];
      const isAdminRoute = adminRoutes.some((route) =>
        pathname.startsWith(route)
      );

      // 1. ถ้า login แล้วพยายามเข้าหน้า auth (login, register) -> redirect ไป dashboard
      if (isAuthRoute && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      // 2. ถ้ายังไม่ login พยายามเข้า protected route -> redirect ไป login
      if (isProtectedRoute && !isLoggedIn) {
        const callbackUrl = encodeURIComponent(pathname);
        return Response.redirect(
          new URL(`/login?callbackUrl=${callbackUrl}`, nextUrl)
        );
      }

      // 3. ถ้าเป็น admin route แต่ไม่ใช่ ADMIN -> redirect ไป dashboard
      if (isAdminRoute && isLoggedIn && auth?.user?.role !== "ADMIN") {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      // 4. อนุญาตให้เข้าถึง
      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
