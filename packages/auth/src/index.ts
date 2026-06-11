export type Role = "student" | "admin" | "teacher" | "super_admin";

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

export interface GoogleOAuthAdapter {
  getAuthUrl(): string;
  verifyCallback(code: string): Promise<AuthUser>;
}

export function requireRole(_role: Role) {
  return true;
}
