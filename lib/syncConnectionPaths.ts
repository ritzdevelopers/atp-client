export function getSyncConnectionBase(
  pathname: string | null,
  orgId: string,
): string {
  if (pathname?.includes("/user-dashboard/")) {
    return `/user-dashboard/${orgId}/sync-connection`;
  }
  return `/dashboard/${orgId}/sync-connection`;
}
