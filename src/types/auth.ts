// Auth Types for the application
export type UserRole = "ADMIN" | "USER";

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  department?: string | null;
}

export interface AuthSession {
  user: AuthUser;
  expires: string;
}

// Type guard to check if user is admin
export function isAdmin(user: AuthUser | undefined | null): boolean {
  return user?.role === "ADMIN";
}

// Type guard to check if user is logged in
export function isLoggedIn(session: AuthSession | null): session is AuthSession {
  return session !== null && !!session.user;
}
