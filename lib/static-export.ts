const DEFAULT_STATIC_ORG_IDS = ["1"];

export function getStaticOrgIds(): string[] {
  const fromEnv = process.env.STATIC_ORG_IDS?.split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  return fromEnv?.length ? fromEnv : DEFAULT_STATIC_ORG_IDS;
}

export function generateOrgStaticParams() {
  return getStaticOrgIds().map((org_id) => ({ org_id }));
}

/** Placeholder segment for static export; real IDs use `?employee_id=` (etc.). */
export const STATIC_EXPORT_PLACEHOLDER_ID = "0";

export function generatePlaceholderStaticParams(
  paramName: string,
  value = STATIC_EXPORT_PLACEHOLDER_ID,
) {
  return [{ [paramName]: value }];
}

/** For nested routes under `[org_id]` with static export (Next.js 16+). */
export function generateOrgScopedPlaceholderStaticParams(
  paramName: string,
  value = STATIC_EXPORT_PLACEHOLDER_ID,
) {
  return getStaticOrgIds().map((org_id) => ({
    org_id,
    [paramName]: value,
  }));
}
