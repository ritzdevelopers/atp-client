export type ManageLeavesTab =
  | "leaves"
  | "attendance"
  | "regularization"
  | "compoff";

const VALID_TABS = new Set<ManageLeavesTab>([
  "leaves",
  "attendance",
  "regularization",
  "compoff",
]);

export function parseManageLeavesTab(
  value: string | null | undefined,
): ManageLeavesTab | null {
  if (!value) return null;
  return VALID_TABS.has(value as ManageLeavesTab)
    ? (value as ManageLeavesTab)
    : null;
}

export function manageEmployeeLeavesBasePath(orgId: string): string {
  return `/dashboard/${orgId}/organization-employees/manage-employee-leaves`;
}

export function buildManageLeavesHref(
  orgId: string,
  tab: ManageLeavesTab,
  requestId?: number | string,
): string {
  const params = new URLSearchParams({ tab });
  if (requestId != null && String(requestId).trim() !== "") {
    params.set("id", String(requestId));
  }
  return `${manageEmployeeLeavesBasePath(orgId)}?${params.toString()}`;
}

export function leaveRequestDomId(id: number | string): string {
  return `leave-request-${id}`;
}

export function regularizationRequestDomId(id: number | string): string {
  return `reg-request-${id}`;
}

export function compOffRequestDomId(id: number | string): string {
  return `compoff-request-${id}`;
}
