import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";
import { verifyExternalUser } from "@/utils/verify-external-user";
import { getOrCreateLocalUser } from "@/utils/local-user";
import { authConfig } from "./auth.config";
import { logAudit } from "@/app/actions/audit.action";

// Extend types for NextAuth
declare module "next-auth" {
  interface User {
    id: string;
    username: string;
    name: string;
    role: "ADMIN" | "USER";
    department?: string | null;
  }

  interface Session {
    user: {
      id: string;
      username: string;
      name: string;
      role: "ADMIN" | "USER";
      department?: string | null;
    };
    accessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    name: string;
    role: "ADMIN" | "USER";
    department?: string | null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  // Trust the host in production (required for Auth.js v5)
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
  },
  providers: [
    Credentials({
      id: "credentials",
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        try {
          if (!credentials?.username || !credentials?.password) {
            return null;
          }

          const username = credentials.username as string;
          const password = credentials.password as string;

          // 1. ตรวจสอบ Local User ก่อน (สำหรับ built-in admin)
          const { db } = await import("@/db/app.db");
          const { localUsers } = await import("@/db/app.schema");
          const { eq } = await import("drizzle-orm");
          const crypto = await import("crypto");

          const localUserCheck = await db
            .select()
            .from(localUsers)
            .where(eq(localUsers.externalUsername, username))
            .limit(1);

          if (localUserCheck.length > 0 && localUserCheck[0].passwordHash) {
            // มี local user และมี password hash -> ใช้ local auth
            const md5Hash = crypto.createHash("md5").update(password).digest("hex");
            
            if (localUserCheck[0].passwordHash.toLowerCase() === md5Hash.toLowerCase()) {
              return {
                id: String(localUserCheck[0].id),
                username: localUserCheck[0].externalUsername,
                name: localUserCheck[0].name || "User",
                role: localUserCheck[0].role,
                department: localUserCheck[0].department,
              };
            }
          }

          // 2. ถ้าไม่ใช่ local user -> Verify จาก External MySQL (hr_person table)
          const externalUser = await verifyExternalUser(username, password);

          if (!externalUser) {
            return null;
          }

          // 3. Get หรือ Create local user (สำหรับ role management)
          const localUser = await getOrCreateLocalUser(externalUser);

          // 4. Return user object
          return {
            id: String(localUser.id),
            username: externalUser.hr_username,
            name: `${externalUser.hr_fname} ${externalUser.hr_lname}`.trim(),
            role: localUser.role,
            department: externalUser.department_name,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    // Route protection callback (from authConfig)
    authorized: authConfig.callbacks.authorized,
    async jwt({ token, user, trigger, session }) {
      // Initial sign in - เพิ่ม user info เข้า token
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.name = user.name || "";
        token.role = user.role;
        token.department = user.department;
      }

      // Update session if triggered
      if (trigger === "update" && session) {
        token.name = session.name ?? token.name;
        token.role = session.role ?? token.role;
      }

      return token;
    },
    async session({ session, token }) {
      // ส่ง user info จาก token ไปยัง session
      if (session.user) {
        session.user.id = token.id;
        session.user.username = token.username;
        session.user.name = token.name;
        session.user.role = token.role;
        session.user.department = token.department;
      }

      return session;
    },
    async redirect({ url, baseUrl }) {
      // Handle redirect after sign in/out
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/dashboard`;
    },
  },
  events: {
    async signIn({ user }) {
      console.log(`User signed in: ${user.username}`);
      try {
        if (user.id) {
          await logAudit({
            userId: parseInt(user.id, 10),
            action: "LOGIN",
            resourceType: "SYSTEM",
            details: { username: user.username },
          });
        }
      } catch (error) {
        console.error("Failed to log login:", error);
      }
    },
    async signOut() {
      console.log("User signed out");
      // Note: signOut event often lacks user context in JWT strategy
    },
  },
  debug: process.env.NODE_ENV === "development",
});
