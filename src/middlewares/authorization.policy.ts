export type UserRole = "user" | "admin";

export interface AuthPrincipal {
  userId: number;
  role: UserRole;
}

export const isAdmin = (auth: AuthPrincipal): boolean =>
  auth.role === "admin";

export const mayManageUser = (auth: AuthPrincipal, userId: number): boolean =>
  isAdmin(auth) || auth.userId === userId;

export const mayManageList = (
  auth: AuthPrincipal,
  creatorId: number
): boolean => isAdmin(auth) || auth.userId === creatorId;

export const mayReadList = (
  auth: AuthPrincipal | undefined,
  creatorId: number,
  privacy: string
): boolean =>
  privacy === "public" || (auth !== undefined && mayManageList(auth, creatorId));
