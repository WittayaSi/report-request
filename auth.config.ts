import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  // Trust the host in production (required for Auth.js v5)
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // JWT callback - ต้องมีเพื่อให้ middleware อ่าน role จาก token ได้
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as any).username;
        token.name = user.name || "";
        token.role = (user as any).role;
        token.department = (user as any).department;
      }
      return token;
    },
    // Session callback - ส่ง role จาก token ไปยัง session
    session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id;
        session.user.username = token.username;
        session.user.name = token.name;
        session.user.role = token.role;
        session.user.department = token.department;
      }
      return session;
    },
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
      const protectedRoutes = ["/dashboard", "/admin", "/profile", "/settings", "/requests"];
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
