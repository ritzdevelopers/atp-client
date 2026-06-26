/**
 * Org ids used only in the URL to select the redesigned employee home UI.
 * API data is still loaded from the user's real organization membership.
 */
export const DASHBOARD_V2_SHELL_ORG_IDS = new Set(["2"]);

export function isDashboardV2ShellOrg(orgId: string | number | null | undefined): boolean {
  return DASHBOARD_V2_SHELL_ORG_IDS.has(String(orgId ?? "").trim());
}
