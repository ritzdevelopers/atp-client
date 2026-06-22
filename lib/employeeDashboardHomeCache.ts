export type CachedUserAddressRow = {
  id?: number | string;
  user_id?: number | string;
  org_id?: number | string;
  country?: string | null;
  state?: string | null;
  district?: string | null;
  city?: string | null;
  is_from_village?: boolean | number | string | null;
  village_name?: string | null;
  street?: string | null;
  house_number?: string | null;
  zip_code?: string | null;
};

export type CachedEmployeeDashboardResponse = {
  message?: string;
  owner?: Record<string, unknown>;
  organization?: Record<string, unknown>;
  employee?: Record<string, unknown>;
  employees?: Record<string, unknown>;
  leave_summary?: Record<string, unknown>;
  employee_leave_balances?: unknown[];
  attendance_history?: unknown[];
  teams?: unknown[];
};

export type EmployeeDashboardHomeCacheEntry = {
  data: CachedEmployeeDashboardResponse;
  addresses: CachedUserAddressRow[];
  addressesError: string | null;
  handoverPendingCount: number;
  cachedAt: number;
};

const CACHE_KEY_PREFIX = "employee_dashboard_home_v1";

function cacheKey(orgId: number | string): string {
  return `${CACHE_KEY_PREFIX}_${orgId}`;
}

export function readEmployeeDashboardHomeCache(
  orgId: number | string,
): EmployeeDashboardHomeCacheEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(cacheKey(orgId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EmployeeDashboardHomeCacheEntry;
    if (!parsed?.data || typeof parsed.cachedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeEmployeeDashboardHomeCache(
  orgId: number | string,
  entry: Omit<EmployeeDashboardHomeCacheEntry, "cachedAt">,
): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      cacheKey(orgId),
      JSON.stringify({ ...entry, cachedAt: Date.now() } satisfies EmployeeDashboardHomeCacheEntry),
    );
  } catch {
    /* quota / private mode */
  }
}

export function clearEmployeeDashboardHomeCache(orgId: number | string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(cacheKey(orgId));
  } catch {
    /* ignore */
  }
}

export function getBootstrappedHomeCache(orgId: number): EmployeeDashboardHomeCacheEntry | null {
  if (!orgId || Number.isNaN(orgId)) return null;
  return readEmployeeDashboardHomeCache(orgId);
}
