const DEFAULT_STATIC_ORG_IDS = ["1", "2"];

export function getStaticOrgIds(): string[] {
  const fromEnv = process.env.STATIC_ORG_IDS?.split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  return fromEnv?.length ? fromEnv : DEFAULT_STATIC_ORG_IDS;
}

export function generateOrgStaticParams() {
  return getStaticOrgIds().map((org_id) => ({ org_id }));
}

/**
 * Placeholder path segment for static export (`output: "export"`).
 * Real record ids are passed as query params, e.g. `.../0?employee_id=42`.
 */
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

type SearchParamsLike = URLSearchParams | { get: (key: string) => string | null };

/**
 * Resolve a dynamic route param on static hosts (Vercel).
 * Prefer query string; fall back to path unless it is the build placeholder.
 */
export function resolveStaticExportId(
  searchParams: SearchParamsLike,
  paramName: string,
  pathValue: string | undefined,
): string {
  const fromQuery = searchParams.get(paramName);
  if (fromQuery) return fromQuery;
  const path = String(pathValue ?? "").trim();
  if (path && path !== STATIC_EXPORT_PLACEHOLDER_ID) return path;
  return path;
}

/** Build a static-export-safe detail URL: `.../0?param=value&...` */
export function buildStaticDetailHref(
  pathPrefix: string,
  query: Record<string, string | number | null | undefined>,
): string {
  const normalizedPrefix = pathPrefix.replace(/\/$/, "");
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    qs.set(key, String(value));
  }
  const queryString = qs.toString();
  return `${normalizedPrefix}/${STATIC_EXPORT_PLACEHOLDER_ID}${queryString ? `?${queryString}` : ""}`;
}

/** First org id used as the static HTML shell on Vercel rewrites. */
export function getStaticExportShellOrgId(): string {
  return getStaticOrgIds()[0] ?? STATIC_EXPORT_PLACEHOLDER_ID;
}
