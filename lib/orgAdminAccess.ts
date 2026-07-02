export function readRoleNameFromToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const part = token.split(".")[1];
    if (!part) return null;
    const payload = JSON.parse(atob(part)) as { user_role_name?: string };
    return payload.user_role_name ?? null;
  } catch {
    return null;
  }
}

export function isOrgAdminRole(roleName: string | null | undefined): boolean {
  return (
    String(roleName || "")
      .trim()
      .toLowerCase() === "admin"
  );
}

export function isCurrentUserOrgAdmin(contextRole?: string | null): boolean {
  return isOrgAdminRole(contextRole ?? readRoleNameFromToken());
}
