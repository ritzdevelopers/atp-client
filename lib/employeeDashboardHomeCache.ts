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

/** Reuse cached data on route changes; background refresh after this age. */
const STALE_MS = 5 * 60 * 1000;
const CACHE_KEY_PREFIX = "employee_dashboard_home_v2";

const memoryCache = new Map<string, EmployeeDashboardHomeCacheEntry>();

function cacheKey(orgId: number | string): string {
  return `${CACHE_KEY_PREFIX}_${orgId}`;
}

function readEntry(orgId: number | string): EmployeeDashboardHomeCacheEntry | null {
  if (!orgId || Number.isNaN(Number(orgId))) return null;

  const key = cacheKey(orgId);
  const fromMemory = memoryCache.get(key);
  if (fromMemory) return fromMemory;

  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EmployeeDashboardHomeCacheEntry;
    if (!parsed?.data || typeof parsed.cachedAt !== "number") return null;
    memoryCache.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

function writeEntry(orgId: number | string, entry: EmployeeDashboardHomeCacheEntry): void {
  if (!orgId || Number.isNaN(Number(orgId))) return;

  memoryCache.set(cacheKey(orgId), entry);
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(cacheKey(orgId), JSON.stringify(entry));
  } catch {
    /* quota / private mode */
  }
}

export function readEmployeeDashboardHomeCache(
  orgId: number | string,
): EmployeeDashboardHomeCacheEntry | null {
  return readEntry(orgId);
}

export function writeEmployeeDashboardHomeCache(
  orgId: number | string,
  entry: Omit<EmployeeDashboardHomeCacheEntry, "cachedAt">,
): void {
  writeEntry(orgId, { ...entry, cachedAt: Date.now() });
}

export function clearEmployeeDashboardHomeCache(orgId: number | string): void {
  if (!orgId || Number.isNaN(Number(orgId))) return;
  memoryCache.delete(cacheKey(orgId));
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(cacheKey(orgId));
  } catch {
    /* ignore */
  }
}

export function shouldRefreshEmployeeDashboardHomeCache(orgId: number | string): boolean {
  const entry = readEntry(orgId);
  return !entry || Date.now() - entry.cachedAt >= STALE_MS;
}

export function getBootstrappedHomeCache(orgId: number): EmployeeDashboardHomeCacheEntry | null {
  if (!orgId || Number.isNaN(orgId)) return null;
  return readEmployeeDashboardHomeCache(orgId);
}

export function patchEmployeeDashboardHomeCache(
  orgId: number | string,
  patch: Partial<Omit<EmployeeDashboardHomeCacheEntry, "cachedAt">>,
): void {
  const existing = readEntry(orgId);
  writeEmployeeDashboardHomeCache(orgId, {
    data: patch.data ?? existing?.data ?? {},
    addresses: patch.addresses ?? existing?.addresses ?? [],
    addressesError: patch.addressesError ?? existing?.addressesError ?? null,
    handoverPendingCount:
      patch.handoverPendingCount ?? existing?.handoverPendingCount ?? 0,
  });
}
