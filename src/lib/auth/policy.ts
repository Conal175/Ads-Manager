export type AppRole = "viewer" | "operator" | "admin";
export const operatorPages = ["/assets", "/products", "/creatives", "/launcher", "/actions"] as const;
export function canViewPage(role: AppRole | null, pathname: string): boolean {
  if (role === "admin") return true;
  return role === "operator" && operatorPages.some((path) => pathname === path || pathname.startsWith(path + "/"));
}
export function canUseRole(role: AppRole | null, required: AppRole): boolean {
  const rank: Record<AppRole, number> = { viewer: 1, operator: 2, admin: 3 };
  return role !== null && Object.hasOwn(rank, role) && rank[role] >= rank[required];
}
