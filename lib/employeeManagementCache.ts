import type {
  BackgroundVerificationDetailRow,
  BackgroundVerificationEmployeeGroup,
  BackgroundVerificationReferenceItem,
  OrgRoleRow,
  OrgUserRow,
  SingleEmployeeData,
} from "@/services/adminUser";
import type { AttendanceHistoryRow } from "@/services/attendanceHistory";
import type { AttendanceQueryRow } from "@/services/attendanceQueries";
import type { EmployeeExitProcessRow } from "@/services/employeeExit";
import type { CompanyShiftRow } from "@/services/organizationSettings";
import type { OrgTeamDetail, OrgTeamRow } from "@/services/orgTeams";

type CacheEntry<T> = {
  data: T;
  cachedAt: number;
};

/** Reuse cached data on route changes; background refresh after this age. */
const STALE_MS = 5 * 60 * 1000;

const memoryCache = new Map<string, CacheEntry<unknown>>();

function readEntry<T>(key: string): CacheEntry<T> | null {
  const fromMemory = memoryCache.get(key);
  if (fromMemory) return fromMemory as CacheEntry<T>;

  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed || typeof parsed.cachedAt !== "number" || parsed.data === undefined) {
      return null;
    }
    memoryCache.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

function writeEntry<T>(key: string, data: T): void {
  const entry: CacheEntry<T> = { data, cachedAt: Date.now() };
  memoryCache.set(key, entry);
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    /* quota / private mode */
  }
}

function clearEntry(key: string): void {
  memoryCache.delete(key);
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function isStale(cachedAt: number): boolean {
  return Date.now() - cachedAt >= STALE_MS;
}

export type CachedEmployeeDetail = {
  data: SingleEmployeeData;
  exitRow: EmployeeExitProcessRow | null;
};

function orgTeamsKey(orgId: number | string): string {
  return `manage_org_teams_v1_${orgId}`;
}

function orgRolesKey(orgId: number | string): string {
  return `manage_org_roles_v1_${orgId}`;
}

function orgUsersKey(orgId: number | string): string {
  return `manage_org_users_v1_${orgId}`;
}

function employeeDetailKey(orgId: number | string, userId: number | string): string {
  return `employee_detail_v1_${orgId}_${userId}`;
}

function employeeBgvKey(orgId: number | string, userId: number | string): string {
  return `employee_bgv_v1_${orgId}_${userId}`;
}

function employeeShiftsKey(orgId: number | string, userId: number | string): string {
  return `employee_shifts_v1_${orgId}_${userId}`;
}

function employeeAttendanceKey(
  orgId: number | string,
  userId: number | string,
  year: number,
  month: number,
  day: number | null,
): string {
  return `employee_attendance_v1_${orgId}_${userId}_${year}_${month}_${day ?? "all"}`;
}

function leaveRequestsKey(orgId: number | string, filterKey: string): string {
  return `leave_requests_v1_${orgId}_${filterKey}`;
}

function attendanceQueriesKey(orgId: number | string, filterKey: string): string {
  return `attendance_queries_v1_${orgId}_${filterKey}`;
}

function bgvListKey(orgId: number | string, filterKey: string): string {
  return `bgv_list_v1_${orgId}_${filterKey}`;
}

function bgvEmployeeDetailKey(orgId: number | string, employeeId: number | string): string {
  return `bgv_employee_detail_v1_${orgId}_${employeeId}`;
}

function employeeFeatureAccessKey(orgId: number | string): string {
  return `employee_feature_access_v1_${orgId}`;
}

function myOrgTeamKey(orgId: number | string, teamId?: string | null): string {
  return `my_org_team_v1_${orgId}_${teamId ?? "default"}`;
}

function ownAttendanceHistoryKey(orgId: number | string, filterKey: string): string {
  return `own_attendance_history_v1_${orgId}_${filterKey}`;
}

function myTasksKey(orgId: number | string, filterKey: string): string {
  return `my_tasks_v1_${orgId}_${filterKey}`;
}

function myTaskDetailKey(orgId: number | string, taskId: number | string): string {
  return `my_task_detail_v1_${orgId}_${taskId}`;
}

export function stableFilterKey(value: unknown): string {
  return encodeURIComponent(JSON.stringify(value));
}

function clearEntriesByPrefix(prefix: string): void {
  for (const key of [...memoryCache.keys()]) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
  if (typeof window === "undefined") return;
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(prefix)) sessionStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}

export type CachedAttendanceQueriesPage = {
  queries: AttendanceQueryRow[];
  users: OrgUserRow[];
};

export function readManageOrgUsersCache(orgId: number | string): OrgUserRow[] | null {
  if (!orgId || Number.isNaN(Number(orgId))) return null;
  return readEntry<OrgUserRow[]>(orgUsersKey(orgId))?.data ?? null;
}

export function writeManageOrgUsersCache(orgId: number | string, rows: OrgUserRow[]): void {
  if (!orgId || Number.isNaN(Number(orgId))) return;
  writeEntry(orgUsersKey(orgId), rows);
}

export function clearManageOrgUsersCache(orgId: number | string): void {
  if (!orgId || Number.isNaN(Number(orgId))) return;
  clearEntry(orgUsersKey(orgId));
}

export function readManageOrgTeamsCache(orgId: number | string): OrgTeamRow[] | null {
  if (!orgId || Number.isNaN(Number(orgId))) return null;
  return readEntry<OrgTeamRow[]>(orgTeamsKey(orgId))?.data ?? null;
}

export function writeManageOrgTeamsCache(orgId: number | string, teams: OrgTeamRow[]): void {
  if (!orgId || Number.isNaN(Number(orgId))) return;
  writeEntry(orgTeamsKey(orgId), teams);
}

export function clearManageOrgTeamsCache(orgId: number | string): void {
  if (!orgId || Number.isNaN(Number(orgId))) return;
  clearEntry(orgTeamsKey(orgId));
}

export function shouldRefreshManageOrgTeamsCache(orgId: number | string): boolean {
  if (!orgId || Number.isNaN(Number(orgId))) return true;
  const entry = readEntry<OrgTeamRow[]>(orgTeamsKey(orgId));
  return !entry || isStale(entry.cachedAt);
}

export function readManageOrgRolesCache(orgId: number | string): OrgRoleRow[] | null {
  if (!orgId || Number.isNaN(Number(orgId))) return null;
  return readEntry<OrgRoleRow[]>(orgRolesKey(orgId))?.data ?? null;
}

export function writeManageOrgRolesCache(orgId: number | string, roles: OrgRoleRow[]): void {
  if (!orgId || Number.isNaN(Number(orgId))) return;
  writeEntry(orgRolesKey(orgId), roles);
}

export function clearManageOrgRolesCache(orgId: number | string): void {
  if (!orgId || Number.isNaN(Number(orgId))) return;
  clearEntry(orgRolesKey(orgId));
}

export function shouldRefreshManageOrgRolesCache(orgId: number | string): boolean {
  if (!orgId || Number.isNaN(Number(orgId))) return true;
  const entry = readEntry<OrgRoleRow[]>(orgRolesKey(orgId));
  return !entry || isStale(entry.cachedAt);
}

export function shouldRefreshManageOrgUsersCache(orgId: number | string): boolean {
  if (!orgId || Number.isNaN(Number(orgId))) return true;
  const entry = readEntry<OrgUserRow[]>(orgUsersKey(orgId));
  return !entry || isStale(entry.cachedAt);
}

export function readEmployeeDetailCache(
  orgId: number | string,
  userId: number | string,
): CachedEmployeeDetail | null {
  if (!orgId || !userId) return null;
  return readEntry<CachedEmployeeDetail>(employeeDetailKey(orgId, userId))?.data ?? null;
}

export function writeEmployeeDetailCache(
  orgId: number | string,
  userId: number | string,
  payload: CachedEmployeeDetail,
): void {
  if (!orgId || !userId) return;
  writeEntry(employeeDetailKey(orgId, userId), payload);
}

export function clearEmployeeDetailCache(
  orgId: number | string,
  userId: number | string,
): void {
  if (!orgId || !userId) return;
  clearEntry(employeeDetailKey(orgId, userId));
}

export function shouldRefreshEmployeeDetailCache(
  orgId: number | string,
  userId: number | string,
): boolean {
  if (!orgId || !userId) return true;
  const entry = readEntry<CachedEmployeeDetail>(employeeDetailKey(orgId, userId));
  return !entry || isStale(entry.cachedAt);
}

export function readEmployeeBgvCache(
  orgId: number | string,
  userId: number | string,
): BackgroundVerificationReferenceItem[] | null {
  if (!orgId || !userId) return null;
  return readEntry<BackgroundVerificationReferenceItem[]>(employeeBgvKey(orgId, userId))?.data ?? null;
}

export function writeEmployeeBgvCache(
  orgId: number | string,
  userId: number | string,
  references: BackgroundVerificationReferenceItem[],
): void {
  if (!orgId || !userId) return;
  writeEntry(employeeBgvKey(orgId, userId), references);
}

export function clearEmployeeBgvCache(orgId: number | string, userId: number | string): void {
  if (!orgId || !userId) return;
  clearEntry(employeeBgvKey(orgId, userId));
}

export function shouldRefreshEmployeeBgvCache(
  orgId: number | string,
  userId: number | string,
): boolean {
  if (!orgId || !userId) return true;
  const entry = readEntry<BackgroundVerificationReferenceItem[]>(employeeBgvKey(orgId, userId));
  return !entry || isStale(entry.cachedAt);
}

export function readEmployeeShiftsCache(
  orgId: number | string,
  userId: number | string,
): CompanyShiftRow[] | null {
  if (!orgId || !userId) return null;
  return readEntry<CompanyShiftRow[]>(employeeShiftsKey(orgId, userId))?.data ?? null;
}

export function writeEmployeeShiftsCache(
  orgId: number | string,
  userId: number | string,
  shifts: CompanyShiftRow[],
): void {
  if (!orgId || !userId) return;
  writeEntry(employeeShiftsKey(orgId, userId), shifts);
}

export function clearEmployeeShiftsCache(orgId: number | string, userId: number | string): void {
  if (!orgId || !userId) return;
  clearEntry(employeeShiftsKey(orgId, userId));
}

export function shouldRefreshEmployeeShiftsCache(
  orgId: number | string,
  userId: number | string,
): boolean {
  if (!orgId || !userId) return true;
  const entry = readEntry<CompanyShiftRow[]>(employeeShiftsKey(orgId, userId));
  return !entry || isStale(entry.cachedAt);
}

export function readEmployeeAttendanceCache(
  orgId: number | string,
  userId: number | string,
  year: number,
  month: number,
  day: number | null,
): AttendanceHistoryRow[] | null {
  if (!orgId || !userId) return null;
  return (
    readEntry<AttendanceHistoryRow[]>(employeeAttendanceKey(orgId, userId, year, month, day))
      ?.data ?? null
  );
}

export function writeEmployeeAttendanceCache(
  orgId: number | string,
  userId: number | string,
  year: number,
  month: number,
  day: number | null,
  rows: AttendanceHistoryRow[],
): void {
  if (!orgId || !userId) return;
  writeEntry(employeeAttendanceKey(orgId, userId, year, month, day), rows);
}

export function clearEmployeeAttendanceCache(
  orgId: number | string,
  userId: number | string,
): void {
  if (!orgId || !userId) return;
  for (const key of [...memoryCache.keys()]) {
    if (key.startsWith(`employee_attendance_v1_${orgId}_${userId}_`)) {
      clearEntry(key);
    }
  }
  if (typeof window === "undefined") return;
  try {
    const prefix = `employee_attendance_v1_${orgId}_${userId}_`;
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(prefix)) sessionStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}

export function shouldRefreshEmployeeAttendanceCache(
  orgId: number | string,
  userId: number | string,
  year: number,
  month: number,
  day: number | null,
): boolean {
  if (!orgId || !userId) return true;
  const entry = readEntry<AttendanceHistoryRow[]>(
    employeeAttendanceKey(orgId, userId, year, month, day),
  );
  return !entry || isStale(entry.cachedAt);
}

export function clearManageTeamsPageCaches(orgId: number | string): void {
  clearManageOrgTeamsCache(orgId);
  clearManageOrgUsersCache(orgId);
}

export function readLeaveRequestsCache<T>(
  orgId: number | string,
  filterKey: string,
): T[] | null {
  if (!orgId || !filterKey) return null;
  return readEntry<T[]>(leaveRequestsKey(orgId, filterKey))?.data ?? null;
}

export function writeLeaveRequestsCache<T>(
  orgId: number | string,
  filterKey: string,
  rows: T[],
): void {
  if (!orgId || !filterKey) return;
  writeEntry(leaveRequestsKey(orgId, filterKey), rows);
}

export function clearLeaveRequestsCaches(orgId: number | string): void {
  if (!orgId) return;
  clearEntriesByPrefix(`leave_requests_v1_${orgId}_`);
}

export function shouldRefreshLeaveRequestsCache(
  orgId: number | string,
  filterKey: string,
): boolean {
  if (!orgId || !filterKey) return true;
  const entry = readEntry<unknown[]>(leaveRequestsKey(orgId, filterKey));
  return !entry || isStale(entry.cachedAt);
}

export function readAttendanceQueriesCache(
  orgId: number | string,
  filterKey: string,
): CachedAttendanceQueriesPage | null {
  if (!orgId || !filterKey) return null;
  return readEntry<CachedAttendanceQueriesPage>(attendanceQueriesKey(orgId, filterKey))?.data ?? null;
}

export function writeAttendanceQueriesCache(
  orgId: number | string,
  filterKey: string,
  payload: CachedAttendanceQueriesPage,
): void {
  if (!orgId || !filterKey) return;
  writeEntry(attendanceQueriesKey(orgId, filterKey), payload);
}

export function clearAttendanceQueriesCaches(orgId: number | string): void {
  if (!orgId) return;
  clearEntriesByPrefix(`attendance_queries_v1_${orgId}_`);
}

export function shouldRefreshAttendanceQueriesCache(
  orgId: number | string,
  filterKey: string,
): boolean {
  if (!orgId || !filterKey) return true;
  const entry = readEntry<CachedAttendanceQueriesPage>(attendanceQueriesKey(orgId, filterKey));
  return !entry || isStale(entry.cachedAt);
}

export function readBgvListCache(
  orgId: number | string,
  filterKey: string,
): BackgroundVerificationEmployeeGroup[] | null {
  if (!orgId || !filterKey) return null;
  return readEntry<BackgroundVerificationEmployeeGroup[]>(bgvListKey(orgId, filterKey))?.data ?? null;
}

export function writeBgvListCache(
  orgId: number | string,
  filterKey: string,
  groups: BackgroundVerificationEmployeeGroup[],
): void {
  if (!orgId || !filterKey) return;
  writeEntry(bgvListKey(orgId, filterKey), groups);
}

export function clearBgvListCaches(orgId: number | string): void {
  if (!orgId) return;
  clearEntriesByPrefix(`bgv_list_v1_${orgId}_`);
}

export function shouldRefreshBgvListCache(
  orgId: number | string,
  filterKey: string,
): boolean {
  if (!orgId || !filterKey) return true;
  const entry = readEntry<BackgroundVerificationEmployeeGroup[]>(bgvListKey(orgId, filterKey));
  return !entry || isStale(entry.cachedAt);
}

export function readBgvEmployeeDetailCache(
  orgId: number | string,
  employeeId: number | string,
): BackgroundVerificationDetailRow[] | null {
  if (!orgId || !employeeId) return null;
  return readEntry<BackgroundVerificationDetailRow[]>(bgvEmployeeDetailKey(orgId, employeeId))?.data ?? null;
}

export function writeBgvEmployeeDetailCache(
  orgId: number | string,
  employeeId: number | string,
  references: BackgroundVerificationDetailRow[],
): void {
  if (!orgId || !employeeId) return;
  writeEntry(bgvEmployeeDetailKey(orgId, employeeId), references);
}

export function clearBgvEmployeeDetailCache(
  orgId: number | string,
  employeeId: number | string,
): void {
  if (!orgId || !employeeId) return;
  clearEntry(bgvEmployeeDetailKey(orgId, employeeId));
}

export function shouldRefreshBgvEmployeeDetailCache(
  orgId: number | string,
  employeeId: number | string,
): boolean {
  if (!orgId || !employeeId) return true;
  const entry = readEntry<BackgroundVerificationDetailRow[]>(
    bgvEmployeeDetailKey(orgId, employeeId),
  );
  return !entry || isStale(entry.cachedAt);
}

export function clearBgvOrgCaches(orgId: number | string): void {
  if (!orgId) return;
  clearBgvListCaches(orgId);
  clearEntriesByPrefix(`bgv_employee_detail_v1_${orgId}_`);
}

export function readEmployeeFeatureAccessCache<T>(orgId: number | string): T[] | null {
  if (!orgId || Number.isNaN(Number(orgId))) return null;
  return readEntry<T[]>(employeeFeatureAccessKey(orgId))?.data ?? null;
}

export function writeEmployeeFeatureAccessCache<T>(
  orgId: number | string,
  rows: T[],
): void {
  if (!orgId || Number.isNaN(Number(orgId))) return;
  writeEntry(employeeFeatureAccessKey(orgId), rows);
}

export function clearEmployeeFeatureAccessCache(orgId: number | string): void {
  if (!orgId || Number.isNaN(Number(orgId))) return;
  clearEntry(employeeFeatureAccessKey(orgId));
}

export function shouldRefreshEmployeeFeatureAccessCache(orgId: number | string): boolean {
  if (!orgId || Number.isNaN(Number(orgId))) return true;
  const entry = readEntry<unknown[]>(employeeFeatureAccessKey(orgId));
  return !entry || isStale(entry.cachedAt);
}

export type CachedMyOrgTeamResult = {
  team: OrgTeamDetail | null;
  noTeam: boolean;
};

export type CachedOwnAttendanceHistoryResult<T> = {
  rows: T[];
  meta: { page: number; limit: number };
};

export function readMyOrgTeamCache(
  orgId: number | string,
  teamId?: string | null,
): CachedMyOrgTeamResult | null {
  if (!orgId || Number.isNaN(Number(orgId))) return null;
  return readEntry<CachedMyOrgTeamResult>(myOrgTeamKey(orgId, teamId))?.data ?? null;
}

export function writeMyOrgTeamCache(
  orgId: number | string,
  teamId: string | null | undefined,
  result: CachedMyOrgTeamResult,
): void {
  if (!orgId || Number.isNaN(Number(orgId))) return;
  writeEntry(myOrgTeamKey(orgId, teamId), result);
}

export function clearMyOrgTeamCache(
  orgId: number | string,
  teamId?: string | null,
): void {
  if (!orgId || Number.isNaN(Number(orgId))) return;
  if (teamId !== undefined) {
    clearEntry(myOrgTeamKey(orgId, teamId));
    return;
  }
  clearEntriesByPrefix(`my_org_team_v1_${orgId}_`);
}

export function shouldRefreshMyOrgTeamCache(
  orgId: number | string,
  teamId?: string | null,
): boolean {
  if (!orgId || Number.isNaN(Number(orgId))) return true;
  const entry = readEntry<CachedMyOrgTeamResult>(myOrgTeamKey(orgId, teamId));
  return !entry || isStale(entry.cachedAt);
}

export function readOwnAttendanceHistoryCache<T>(
  orgId: number | string,
  filterKey: string,
): CachedOwnAttendanceHistoryResult<T> | null {
  if (!orgId || Number.isNaN(Number(orgId))) return null;
  return (
    readEntry<CachedOwnAttendanceHistoryResult<T>>(ownAttendanceHistoryKey(orgId, filterKey))
      ?.data ?? null
  );
}

export function writeOwnAttendanceHistoryCache<T>(
  orgId: number | string,
  filterKey: string,
  result: CachedOwnAttendanceHistoryResult<T>,
): void {
  if (!orgId || Number.isNaN(Number(orgId))) return;
  writeEntry(ownAttendanceHistoryKey(orgId, filterKey), result);
}

export function clearOwnAttendanceHistoryCaches(orgId: number | string): void {
  if (!orgId || Number.isNaN(Number(orgId))) return;
  clearEntriesByPrefix(`own_attendance_history_v1_${orgId}_`);
}

export function shouldRefreshOwnAttendanceHistoryCache(
  orgId: number | string,
  filterKey: string,
): boolean {
  if (!orgId || Number.isNaN(Number(orgId))) return true;
  const entry = readEntry<CachedOwnAttendanceHistoryResult<unknown>>(
    ownAttendanceHistoryKey(orgId, filterKey),
  );
  return !entry || isStale(entry.cachedAt);
}

export function readMyTasksCache<T>(
  orgId: number | string,
  filterKey: string,
): T[] | null {
  if (!orgId || Number.isNaN(Number(orgId))) return null;
  return readEntry<T[]>(myTasksKey(orgId, filterKey))?.data ?? null;
}

export function writeMyTasksCache<T>(
  orgId: number | string,
  filterKey: string,
  rows: T[],
): void {
  if (!orgId || Number.isNaN(Number(orgId))) return;
  writeEntry(myTasksKey(orgId, filterKey), rows);
}

export function clearMyTasksCaches(orgId: number | string): void {
  if (!orgId || Number.isNaN(Number(orgId))) return;
  clearEntriesByPrefix(`my_tasks_v1_${orgId}_`);
}

export function shouldRefreshMyTasksCache(
  orgId: number | string,
  filterKey: string,
): boolean {
  if (!orgId || Number.isNaN(Number(orgId))) return true;
  const entry = readEntry<unknown[]>(myTasksKey(orgId, filterKey));
  return !entry || isStale(entry.cachedAt);
}

export function readMyTaskDetailCache<T>(
  orgId: number | string,
  taskId: number | string,
): T | null {
  if (!orgId || !taskId || Number.isNaN(Number(orgId))) return null;
  return readEntry<T>(myTaskDetailKey(orgId, taskId))?.data ?? null;
}

export function writeMyTaskDetailCache<T>(
  orgId: number | string,
  taskId: number | string,
  task: T,
): void {
  if (!orgId || !taskId || Number.isNaN(Number(orgId))) return;
  writeEntry(myTaskDetailKey(orgId, taskId), task);
}

export function clearMyTaskDetailCache(
  orgId: number | string,
  taskId: number | string,
): void {
  if (!orgId || !taskId || Number.isNaN(Number(orgId))) return;
  clearEntry(myTaskDetailKey(orgId, taskId));
}

export function clearMyTaskDetailCaches(orgId: number | string): void {
  if (!orgId || Number.isNaN(Number(orgId))) return;
  clearEntriesByPrefix(`my_task_detail_v1_${orgId}_`);
}

export function shouldRefreshMyTaskDetailCache(
  orgId: number | string,
  taskId: number | string,
): boolean {
  if (!orgId || !taskId || Number.isNaN(Number(orgId))) return true;
  const entry = readEntry<unknown>(myTaskDetailKey(orgId, taskId));
  return !entry || isStale(entry.cachedAt);
}

export function clearEmployeeCaches(orgId: number | string, userId: number | string): void {
  clearEmployeeDetailCache(orgId, userId);
  clearEmployeeBgvCache(orgId, userId);
  clearEmployeeShiftsCache(orgId, userId);
  clearEmployeeAttendanceCache(orgId, userId);
}
