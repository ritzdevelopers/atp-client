"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  ChevronRight,
  MapPin,
  Package,
  Plus,
  UsersRound,
} from "lucide-react";
import {
  countPendingHandoverItems,
  fetchHandoverAssignedToMe,
} from "@/services/handoverAssigned";
import type { OrganizationAddress } from "@/services/organization";
import { MdWorkspacePremium } from "react-icons/md";
import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import type {
  RightMainSideOrganization,
  RightMainSideUser,
} from "@/components/portal-dashboard/Layout/RightMainSide";
import {
  formatAttendanceLogLocal,
  formatAttendanceTimeLocal,
  formatWorkingTimeDisplay,
  getAttendanceDayVisual,
  getTodayLocalYmd,
  localYmdFromAttendanceValue,
  parseAttendanceNaiveLocal,
} from "@/lib/attendanceDates";
import {
  clearEmployeeDashboardHomeCache,
  patchEmployeeDashboardHomeCache,
  readEmployeeDashboardHomeCache,
  shouldRefreshEmployeeDashboardHomeCache,
  writeEmployeeDashboardHomeCache,
} from "@/lib/employeeDashboardHomeCache";
import OrgLiveUsersPanel from "@/components/portal-dashboard/home/OrgLiveUsersPanel";
import BiometricLiveAttendanceFeed from "@/components/portal-dashboard/home/BiometricLiveAttendanceFeed";
import { useDeviceLiveAttendance } from "@/hooks/useDeviceLiveAttendance";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type AttendanceHistoryRow = {
  id?: number | string;
  attendance_date?: string;
  check_in?: string | null;
  check_out?: string | null;
  attendance_status?: string | null;
  working_time?: string | number | null;
};

type EmployeeTeamAssignment = {
  id?: number | string;
  user_id?: number | string;
  team_id: number | string;
  org_id?: number | string;
  joined_date?: string | null;
  leave_date?: string | null;
  team_name?: string | null;
  team_info?: string | null;
  total_number_of_members?: number | null;
  team_admin_name?: string | null;
};

type EmployeeDashboardResponse = {
  attendance_history?: AttendanceHistoryRow[];
  employee?: {
    mark_attendance_late_after?: string | null;
    user_name?: string | null;
  };
  employees?: {
    mark_attendance_late_after?: string | null;
  };
  teams?: EmployeeTeamAssignment[];
};

function formatElapsedDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

function formatJoinedDate(value: string | Date | null | undefined): string {
  if (value == null || value === "") return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function displayTeamTitle(raw: string | null | undefined): string {
  if (!raw?.trim()) return "Team";
  return raw
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function teamGroupHref(orgId: number, teamId: number | string): string {
  return `/dashboard/${orgId}/organization-employees/team-group?team_id=${encodeURIComponent(String(teamId))}`;
}

function activeTeamAssignments(
  teams: EmployeeTeamAssignment[] | undefined,
): EmployeeTeamAssignment[] {
  return (teams ?? []).filter(
    (team) => team.leave_date == null || team.leave_date === "",
  );
}

function greetingForHour(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function displayNameFromEmail(email: string | null | undefined): string {
  if (!email?.trim()) return "there";
  const local = email.split("@")[0] ?? "";
  const cleaned = local.replace(/[._-]+/g, " ").trim();
  if (!cleaned) return "there";
  return cleaned
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function formatOrganizationAddress(addr: OrganizationAddress): string {
  const parts = [
    addr.address_line?.trim(),
    [addr.city, addr.district, addr.state].filter(Boolean).join(", "),
    [addr.country, addr.zip_code?.trim()].filter(Boolean).join(" "),
  ].filter((p): p is string => !!p && p.length > 0);
  return parts.join("\n");
}

function addressLocationLabel(
  addr: OrganizationAddress,
  index: number,
): string {
  const cityState = [addr.city, addr.state].filter(Boolean).join(", ");
  return cityState.trim() || `Location ${index + 1}`;
}

function formatRoleLabel(role: string | null | undefined): string {
  const r = (role ?? "").trim().toLowerCase();
  if (r === "admin") return "Admin";
  if (r === "hr") return "HR";
  if (r === "manager" || r === "manger") return "Manager";
  if (!r) return "Member";
  return r.charAt(0).toUpperCase() + r.slice(1).toLowerCase();
}

/** Zoho-style density for mobile & tablet (max-lg). Desktop uses existing classes. */
const mobileLabelCls =
  "text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]";
const mobileCaptionCls = "text-[11px] leading-snug text-[#6B7280]";

function mobilePrimaryBtnCls(full = false) {
  return `inline-flex min-h-[34px] items-center justify-center gap-1 rounded-md bg-[#008CD3] px-2.5 py-1.5 text-[12px] font-medium text-white transition active:scale-[0.98] hover:bg-[#0070AA] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full" : ""}`;
}

function mobileDangerBtnCls(full = false) {
  return `inline-flex min-h-[34px] items-center justify-center gap-1 rounded-md bg-[#D93025] px-2.5 py-1.5 text-[12px] font-medium text-white transition active:scale-[0.98] hover:bg-[#B71C1C] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full" : ""}`;
}

function mobileSecondaryBtnCls(full = false) {
  return `inline-flex min-h-[34px] items-center justify-center gap-1 rounded-md border border-[#E4E7EC] bg-white px-2.5 py-1.5 text-[12px] font-medium text-[#1F2937] transition active:scale-[0.98] hover:bg-[#F5F7FA] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full flex-1" : ""}`;
}

function mobileGoldBtnCls(full = false) {
  return `inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg bg-[#C99237] px-3 py-2 text-[12px] font-semibold text-[#0C123A] transition active:scale-[0.98] hover:bg-[#b87d2e] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full" : ""}`;
}

const dashCardCls =
  "dashboard-enter relative overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-sm";
const dashCardAccent =
  "pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[#008CD3] via-[#0C123A] to-[#C99237]";
const dashSectionHeadCls =
  "flex items-center gap-2 border-b border-[#E8EBF0] bg-[#FAFBFC] px-3 py-2";
const dashSectionBodyCls = "p-3";

function MyTeamsSection({
  teams,
  orgId,
  currentUserName,
  delayMs,
}: {
  teams: EmployeeTeamAssignment[];
  orgId: number;
  currentUserName: string;
  delayMs: number;
}) {
  const activeTeams = activeTeamAssignments(teams);

  return (
    <section
      className={`${dashCardCls}`}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className={dashCardAccent} />
      <div className={`${dashSectionHeadCls} bg-gradient-to-r from-[#F0F7FC] to-white`}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#008CD3] text-white">
          <UsersRound className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-[#0C123A]">
            My teams · {activeTeams.length}
          </h2>
        </div>
      </div>

      <div className={dashSectionBodyCls}>
        {activeTeams.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#E4E7EC] bg-[#F9FAFB] px-3 py-5 text-center">
            <UsersRound className="mx-auto h-7 w-7 text-[#9CA3AF]" aria-hidden />
            <p className="mt-1.5 text-xs font-semibold text-[#374151]">No team assigned</p>
            <p className={`mt-1 ${mobileCaptionCls}`}>
              Your reporting manager or HR will add you to a team.
            </p>
          </div>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {activeTeams.map((team) => {
              const teamId = team.team_id;
              const title = displayTeamTitle(team.team_name);
              const managerName = team.team_admin_name?.trim() || "—";
              const isReportingManager =
                !!currentUserName &&
                !!managerName &&
                currentUserName.trim().toLowerCase() ===
                  managerName.toLowerCase();
              const memberCount = Number(team.total_number_of_members ?? 0);

              return (
                <li
                  key={String(team.id ?? teamId)}
                  className="rounded-lg border border-[#E8EBF0] bg-[#FAFBFC] p-3 transition hover:border-[#008CD3]/30 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold text-[#0C123A]">
                        {title}
                      </h3>
                      <p className="mt-0.5 text-[11px] text-[#6B7280]">
                        {managerName} · {memberCount || "—"} members
                      </p>
                    </div>
                    {isReportingManager ? (
                      <span className="shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-700">
                        Lead
                      </span>
                    ) : null}
                  </div>
                  <Link
                    href={teamGroupHref(orgId, teamId)}
                    className={`mt-2.5 ${mobilePrimaryBtnCls(true)} !min-h-[32px] !py-1.5 !text-xs`}
                  >
                    Open team
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  const display =
    value != null && String(value).length > 0 ? String(value) : "—";
  return (
    <div className="flex items-center justify-between gap-2 border-b border-[#F1F3F6] py-2 last:border-0">
      <span className="text-[11px] text-[#6B7280]">{label}</span>
      <span className="min-w-0 truncate text-right text-[12px] font-medium text-[#0C123A]">
        {display}
      </span>
    </div>
  );
}

function ProfileSummaryCard({
  organization,
  user,
  ownerName,
  ownerEmail,
  ownerPhone,
  ownerMatchesUser,
  delayMs,
}: {
  organization: RightMainSideOrganization;
  user: RightMainSideUser;
  ownerName: string | null | undefined;
  ownerEmail: string | null | undefined;
  ownerPhone: string | null | undefined;
  ownerMatchesUser: boolean;
  delayMs: number;
}) {
  return (
    <section className={dashCardCls} style={{ animationDelay: `${delayMs}ms` }}>
      <div className={dashCardAccent} />
      <div className={dashSectionHeadCls}>
        <Building2 className="h-4 w-4 text-[#008CD3]" aria-hidden />
        <h2 className="text-sm font-semibold text-[#0C123A]">Company & profile</h2>
      </div>
      <div className={`${dashSectionBodyCls} grid gap-3 sm:grid-cols-2`}>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#008CD3]">
            Organization
          </p>
          <InfoRow label="Name" value={organization.org_name} />
          <InfoRow label="Email" value={organization.org_email} />
          <InfoRow label="Phone" value={organization.org_phone} />
        </div>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#008CD3]">
            {ownerMatchesUser ? "Your account" : "You"}
          </p>
          <InfoRow label="Name" value={user.user_name} />
          <InfoRow label="Email" value={user.user_email} />
          <InfoRow label="Role" value={formatRoleLabel(user.user_role_name)} />
          <InfoRow label="Since" value={formatJoinedDate(user.user_created_at)} />
        </div>
        {!ownerMatchesUser ? (
          <div className="sm:col-span-2">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#C99237]">
              Owner
            </p>
            <div className="grid gap-0 sm:grid-cols-3">
              <InfoRow label="Name" value={ownerName} />
              <InfoRow label="Email" value={ownerEmail} />
              <InfoRow label="Phone" value={ownerPhone} />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function OrganizationAddressesSection({
  addresses,
  orgId,
  delayMs,
}: {
  addresses: OrganizationAddress[];
  orgId: number;
  delayMs: number;
}) {
  const manageHref = `/dashboard/${orgId}/organization-settings/manage-organization-information`;
  const hasAddresses = addresses.length > 0;

  return (
    <section
      id="dash-addresses"
      aria-labelledby="dash-addresses-title"
      className={dashCardCls}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className={dashCardAccent} />
      <div className={`${dashSectionHeadCls} justify-between`}>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[#C99237]" aria-hidden />
          <h2 id="dash-addresses-title" className="text-sm font-semibold text-[#0C123A]">
            Addresses · {hasAddresses ? addresses.length : 0}
          </h2>
        </div>
        {hasAddresses ? (
          <Link
            href={manageHref}
            className="shrink-0 text-xs font-semibold text-[#008CD3] hover:underline"
          >
            Manage
          </Link>
        ) : null}
      </div>

      <div className={dashSectionBodyCls}>
        {!hasAddresses ? (
          <div className="rounded-xl border border-dashed border-[#E4E7EC] bg-[#F8FAFC] px-4 py-8 text-center">
            <MapPin className="mx-auto h-8 w-8 text-[#9CA3AF]" aria-hidden />
            <p className="mt-2 text-sm font-semibold text-[#0C123A]">No address added yet</p>
            <p className={`mt-1 ${mobileCaptionCls}`}>
              Add office or branch locations for this organization.
            </p>
            <Link href={manageHref} className={`mt-4 ${mobilePrimaryBtnCls()}`}>
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Add address
            </Link>
          </div>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {addresses.map((addr, index) => (
              <li
                key={String(addr.id ?? index)}
                className="rounded-lg border border-[#EEF1F5] bg-[#F8FAFC] p-3"
              >
                <p className={mobileLabelCls}>{addressLocationLabel(addr, index)}</p>
                <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-[#0C123A]">
                  {formatOrganizationAddress(addr)}
                </p>
              </li>
            ))}
          </ul>
        )}
        {hasAddresses ? (
          <Link
            href={manageHref}
            className={`mt-3 ${mobileSecondaryBtnCls(true)} !border-dashed !border-[#C99237]/40 !text-[#0C123A]`}
          >
            <Plus className="h-4 w-4 text-[#C99237]" aria-hidden />
            Add another address
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function HomeOverview({
  organization,
  user,
  orgId,
  organizationAddresses,
}: {
  organization: RightMainSideOrganization;
  user: RightMainSideUser;
  orgId: number;
  organizationAddresses: OrganizationAddress[];
}) {
  const roleKey = user.user_role_name?.trim().toLowerCase() ?? "";
  const roleBadgeLabel = formatRoleLabel(user.user_role_name);
  const displayName =
    user.user_name?.trim() || displayNameFromEmail(user.user_email);
  const orgTitle = organization.org_name?.trim() || "Your organization";
  const ownerName = organization.owner_name ?? organization.owner_info?.name;
  const ownerEmail = organization.owner_email ?? organization.owner_info?.email;
  const ownerPhone = organization.owner_phone;

  const normalized = (v: string | number | null | undefined) =>
    String(v ?? "")
      .trim()
      .toLowerCase();
  const ownerMatchesUser =
    (organization.owner_id != null &&
      String(organization.owner_id) === String(user.user_id)) ||
    (!!normalized(ownerEmail) &&
      normalized(ownerEmail) === normalized(user.user_email)) ||
    (!!normalized(ownerPhone) &&
      normalized(ownerPhone) === normalized(user.user_phone)) ||
    (!!normalized(ownerName) &&
      normalized(ownerName) === normalized(user.user_name));
  const showAttendance = roleKey !== "admin";
  const cachedHome =
    orgId && !Number.isNaN(orgId) ? readEmployeeDashboardHomeCache(orgId) : null;

  const [attendanceLoading, setAttendanceLoading] = useState(() => {
    if (!showAttendance) return false;
    return !cachedHome;
  });
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [attendanceActionError, setAttendanceActionError] = useState<
    string | null
  >(null);
  const [attendanceData, setAttendanceData] =
    useState<EmployeeDashboardResponse | null>(
      () => (cachedHome?.data as EmployeeDashboardResponse | undefined) ?? null,
    );
  const [checkInSubmitting, setCheckInSubmitting] = useState(false);
  const [checkOutSubmitting, setCheckOutSubmitting] = useState(false);
  const [logSubmitting, setLogSubmitting] = useState(false);
  const [logSuccessMessage, setLogSuccessMessage] = useState<string | null>(
    null,
  );
  const [tick, setTick] = useState(0);
  const [handoverPendingCount, setHandoverPendingCount] = useState(
    () => cachedHome?.handoverPendingCount ?? 0,
  );

  const handoverHref =
    orgId && !Number.isNaN(orgId)
      ? `/dashboard/${encodeURIComponent(String(orgId))}/asset-handover`
      : "#";

  const loadHomeOverviewData = useCallback(
    async (forceRefresh = false) => {
      if (!orgId || Number.isNaN(orgId)) return;
      const token = localStorage.getItem("token");
      if (!token) return;

      const cached = readEmployeeDashboardHomeCache(orgId);
      if (cached && !forceRefresh) {
        if (showAttendance) {
          setAttendanceData(cached.data as EmployeeDashboardResponse);
        }
        setHandoverPendingCount(cached.handoverPendingCount ?? 0);
        setAttendanceError(null);
        setAttendanceLoading(false);
        if (!shouldRefreshEmployeeDashboardHomeCache(orgId)) {
          return;
        }
      } else if (forceRefresh) {
        clearEmployeeDashboardHomeCache(orgId);
      }

      if (showAttendance && (!cached || forceRefresh)) {
        setAttendanceLoading(true);
      }
      setAttendanceError(null);

      try {
        const q = encodeURIComponent(String(orgId));
        const [dashboardRes, handoverResult] = await Promise.all([
          showAttendance
            ? fetch(
                `${API_URL}/api/employees/get-employees-full-information?org_id=${q}`,
                {
                  method: "GET",
                  headers: { Authorization: `Bearer ${token}` },
                },
              )
            : Promise.resolve(null),
          fetchHandoverAssignedToMe(token, orgId).catch(() => null),
        ]);

        let nextData = cached?.data as EmployeeDashboardResponse | undefined;
        if (dashboardRes) {
          const result = (await dashboardRes.json()) as EmployeeDashboardResponse & {
            message?: string;
          };
          if (!dashboardRes.ok) {
            throw new Error(result.message || "Could not load attendance");
          }
          nextData = result;
          setAttendanceData(result);
        }

        const nextHandoverCount = handoverResult
          ? countPendingHandoverItems(handoverResult)
          : 0;
        setHandoverPendingCount(nextHandoverCount);

        if (nextData || handoverResult) {
          writeEmployeeDashboardHomeCache(orgId, {
            data: nextData ?? cached?.data ?? {},
            addresses: cached?.addresses ?? [],
            addressesError: cached?.addressesError ?? null,
            handoverPendingCount: nextHandoverCount,
          });
        }
      } catch (e) {
        if (!cached || forceRefresh) {
          if (showAttendance) {
            setAttendanceData(null);
          }
          setHandoverPendingCount(0);
        }
        setAttendanceError(
          e instanceof Error ? e.message : "Could not load attendance",
        );
      } finally {
        setAttendanceLoading(false);
      }
    },
    [orgId, showAttendance],
  );

  useEffect(() => {
    void loadHomeOverviewData();
  }, [loadHomeOverviewData]);

  async function refreshAttendanceData(token: string) {
    if (!orgId || Number.isNaN(orgId) || !showAttendance) return;
    const q = encodeURIComponent(String(orgId));
    const refresh = await fetch(
      `${API_URL}/api/employees/get-employees-full-information?org_id=${q}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    const refreshData = (await refresh.json()) as EmployeeDashboardResponse & {
      message?: string;
    };
    if (refresh.ok) {
      setAttendanceData(refreshData);
      patchEmployeeDashboardHomeCache(orgId, { data: refreshData });
    }
  }

  const todayYmd = getTodayLocalYmd(new Date());
  const { attendance: deviceAttendance } = useDeviceLiveAttendance(
    orgId ? String(orgId) : undefined,
  );
  const historyMap = useMemo(() => {
    const map = new Map<string, AttendanceHistoryRow>();
    for (const row of attendanceData?.attendance_history ?? []) {
      const key = localYmdFromAttendanceValue(row.attendance_date);
      if (key) map.set(key, row);
    }
    return map;
  }, [attendanceData?.attendance_history]);
  const todayRecord = historyMap.get(todayYmd);
  const effectiveTodayRecord = useMemo(() => {
    if (!deviceAttendance?.check_in) return todayRecord;
    return {
      ...todayRecord,
      attendance_date: deviceAttendance.attendance_date ?? todayYmd,
      check_in: deviceAttendance.check_in,
      check_out: deviceAttendance.check_out ?? todayRecord?.check_out ?? null,
      attendance_status: todayRecord?.attendance_status ?? "present",
    };
  }, [deviceAttendance, todayRecord, todayYmd]);
  const hasCheckedInToday = Boolean(effectiveTodayRecord?.check_in);
  const hasCheckedOutToday = Boolean(effectiveTodayRecord?.check_out);
  const latestMachinePunch = deviceAttendance?.latest_punch_at ?? null;
  const machinePunchCount = deviceAttendance?.punch_count ?? 0;
  const showLatestMachinePunch = Boolean(
    hasCheckedInToday &&
      !hasCheckedOutToday &&
      machinePunchCount > 1 &&
      latestMachinePunch &&
      latestMachinePunch !== effectiveTodayRecord?.check_out,
  );
  const checkInInstant = parseAttendanceNaiveLocal(effectiveTodayRecord?.check_in);
  const checkInValid =
    checkInInstant && !Number.isNaN(checkInInstant.getTime());
  const showLiveTimer = Boolean(
    checkInValid && hasCheckedInToday && !hasCheckedOutToday,
  );

  useEffect(() => {
    if (!showLiveTimer) return;
    const firstTick = window.setTimeout(() => setTick(Date.now()), 0);
    const id = window.setInterval(() => setTick(Date.now()), 1000);
    return () => {
      window.clearTimeout(firstTick);
      window.clearInterval(id);
    };
  }, [showLiveTimer]);

  const liveElapsedMs =
    showLiveTimer && checkInValid && tick > 0
      ? tick - checkInInstant.getTime()
      : 0;
  const workingHoursDisplay = showLiveTimer
    ? formatElapsedDuration(liveElapsedMs)
    : formatWorkingTimeDisplay(effectiveTodayRecord?.working_time);
  const attendanceEmployee =
    attendanceData?.employee ?? attendanceData?.employees;
  const lateAfter = attendanceEmployee?.mark_attendance_late_after
    ? String(attendanceEmployee.mark_attendance_late_after).slice(0, 5)
    : "—";

  async function markCheckIn() {
    if (!orgId || Number.isNaN(orgId)) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    setCheckInSubmitting(true);
    setAttendanceActionError(null);
    setLogSuccessMessage(null);
    try {
      const n = new Date();
      const yyyy = n.getFullYear();
      const mm = String(n.getMonth() + 1).padStart(2, "0");
      const dd = String(n.getDate()).padStart(2, "0");
      const hh = String(n.getHours()).padStart(2, "0");
      const min = String(n.getMinutes()).padStart(2, "0");
      const res = await fetch(
        `${API_URL}/api/employees/mark-attendance-check-in`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            org_id: orgId,
            user_date: `${yyyy}-${mm}-${dd}`,
            user_time: `${hh}:${min}`,
          }),
        },
      );
      const result = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(result.message || "Could not mark check-in");
      await refreshAttendanceData(token);
    } catch (e) {
      setAttendanceActionError(
        e instanceof Error ? e.message : "Could not mark check-in.",
      );
    } finally {
      setCheckInSubmitting(false);
    }
  }

  async function markCheckOut() {
    if (!orgId || Number.isNaN(orgId)) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    setCheckOutSubmitting(true);
    setAttendanceActionError(null);
    setLogSuccessMessage(null);
    try {
      const n = new Date();
      const yyyy = n.getFullYear();
      const mm = String(n.getMonth() + 1).padStart(2, "0");
      const dd = String(n.getDate()).padStart(2, "0");
      const hh = String(n.getHours()).padStart(2, "0");
      const min = String(n.getMinutes()).padStart(2, "0");
      const res = await fetch(
        `${API_URL}/api/employees/mark-attendance-check-out`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            org_id: orgId,
            user_date: `${yyyy}-${mm}-${dd}`,
            user_time: `${hh}:${min}`,
          }),
        },
      );
      const result = (await res.json()) as { message?: string };
      if (!res.ok)
        throw new Error(result.message || "Could not mark check-out");
      await refreshAttendanceData(token);
    } catch (e) {
      setAttendanceActionError(
        e instanceof Error ? e.message : "Could not mark check-out.",
      );
    } finally {
      setCheckOutSubmitting(false);
    }
  }

  async function markAttendanceLog() {
    if (!orgId || Number.isNaN(orgId)) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    const attendanceId = todayRecord?.id;
    if (attendanceId == null || attendanceId === "") {
      setAttendanceActionError("No attendance row for today. Check in first.");
      return;
    }
    setLogSubmitting(true);
    setAttendanceActionError(null);
    setLogSuccessMessage(null);
    try {
      const res = await fetch(`${API_URL}/api/employees/add-attendance-log`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ org_id: orgId, attendance_id: attendanceId }),
      });
      const result = (await res.json()) as {
        success?: boolean;
        message?: string;
        data?: { action_type?: string; message?: string };
      };
      if (!res.ok)
        throw new Error(result.message || "Could not mark attendance log");
      const action = result.data?.action_type;
      setLogSuccessMessage(
        action
          ? `Recorded: ${action}`
          : (result.data?.message ?? result.message ?? "Log saved."),
      );
    } catch (e) {
      setAttendanceActionError(
        e instanceof Error ? e.message : "Could not mark attendance log.",
      );
    } finally {
      setLogSubmitting(false);
    }
  }

  const roleBadgeClass =
    roleKey === "admin"
      ? "bg-[#C99237] text-[#0C123A]"
      : roleKey === "hr"
        ? "bg-[#0C123A] text-white"
        : roleKey === "manager" || roleKey === "manger"
          ? "border-2 border-[#C99237] bg-white text-[#0C123A]"
          : "bg-slate-200 text-[#0C123A]";

  const statusLabel = effectiveTodayRecord?.attendance_status
    ? String(effectiveTodayRecord.attendance_status).replace(/_/g, " ")
    : "No status";
  const statusTone = String(effectiveTodayRecord?.attendance_status || "")
    .toLowerCase()
    .includes("late")
    ? "bg-orange-500/20 text-orange-100"
    : String(effectiveTodayRecord?.attendance_status || "")
          .toLowerCase()
          .includes("full_day")
      ? "bg-emerald-500/20 text-emerald-100"
      : "bg-white/10 text-slate-200";
  const dayVisual = getAttendanceDayVisual(effectiveTodayRecord?.attendance_status);

  return (
    <div className="flex flex-col gap-2 lg:gap-3">
      {/* Mobile */}
      <header className={`${dashCardCls} overflow-hidden lg:hidden`} style={{ animationDelay: "0ms" }}>
        <div className="bg-[#0C123A] px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-wide text-[#C99237]">{greetingForHour()}</p>
              <h1 className="mt-0.5 flex items-center gap-1 text-base font-bold text-white">
                <span className="truncate">{displayName}</span>
                <MdWorkspacePremium className="h-4 w-4 shrink-0 text-[#C99237]" aria-hidden />
              </h1>
              <p className="truncate text-[11px] text-slate-400">{orgTitle}</p>
            </div>
            <span className={`shrink-0 rounded px-2 py-0.5 text-[8px] font-bold uppercase ${roleBadgeClass}`}>{roleBadgeLabel}</span>
          </div>
        </div>
      </header>
      <div className="lg:hidden">
        <OrgLiveUsersPanel orgId={String(orgId)} className="w-full" />
      </div>
      <div className="lg:hidden">
        <BiometricLiveAttendanceFeed orgId={String(orgId)} className="w-full" />
      </div>

      {/* Desktop hero — compact, no dead space */}
      <div
        className={`${dashCardCls} hidden lg:grid lg:h-[280px] lg:grid-cols-[1fr_300px_300px]`}
        style={{ animationDelay: "0ms" }}
      >
        <div className={dashCardAccent} />
        <div className="flex flex-col justify-center border-r border-[#E8EBF0] bg-[#0C123A] px-5 py-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#C99237]">{greetingForHour()}</p>
          <h1 className="mt-1 flex items-center gap-2 text-xl font-bold text-white">
            {displayName}
            <MdWorkspacePremium className="h-5 w-5 text-[#C99237]" aria-hidden />
          </h1>
          <p className="mt-1 text-sm text-slate-300">{orgTitle}</p>
          <span className={`mt-3 inline-flex w-fit rounded px-2.5 py-1 text-[9px] font-bold uppercase ${roleBadgeClass}`}>
            {roleBadgeLabel}
          </span>
        </div>
        <OrgLiveUsersPanel orgId={String(orgId)} embedded className="h-full" />
        <BiometricLiveAttendanceFeed orgId={String(orgId)} embedded className="h-full" />
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-12 lg:gap-3">
        {showAttendance ? (
          <section className={`${dashCardCls} lg:col-span-8`} style={{ animationDelay: "50ms" }}>
            <div className={dashCardAccent} />
            <div className="flex flex-col sm:flex-row">
              <div className="shrink-0 border-b border-[#E8EBF0] bg-[#0C123A] px-4 py-3 sm:w-44 sm:border-b-0 sm:border-r">
                <p className="text-[9px] font-bold uppercase text-[#C99237]">Today</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-white">{String(workingHoursDisplay)}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">{showLiveTimer ? "Live timer" : "Working hours"}</p>
                <span className={`mt-2 inline-block rounded px-2 py-0.5 text-[9px] font-bold uppercase ${statusTone}`}>{statusLabel}</span>
                {attendanceError ? <p className="mt-1 text-[10px] text-rose-300">{attendanceError}</p> : null}
              </div>
              <div className="min-w-0 flex-1 p-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-md bg-[#F8FAFC] px-2 py-1.5">
                    <p className={mobileLabelCls}>Check in</p>
                    <p className="mt-0.5 text-xs font-semibold text-[#0C123A]">{hasCheckedInToday ? formatAttendanceLogLocal(effectiveTodayRecord?.check_in) : "—"}</p>
                  </div>
                  <div className="rounded-md bg-[#F8FAFC] px-2 py-1.5">
                    <p className={mobileLabelCls}>Check out</p>
                    <p className="mt-0.5 text-xs font-semibold text-[#0C123A]">{hasCheckedOutToday ? formatAttendanceTimeLocal(effectiveTodayRecord?.check_out) : "—"}</p>
                  </div>
                  {showLatestMachinePunch ? (
                    <div className="rounded-md bg-[#F8FAFC] px-2 py-1.5">
                      <p className={mobileLabelCls}>Last machine punch</p>
                      <p className="mt-0.5 text-xs font-semibold text-[#008CD3]">
                        {formatAttendanceTimeLocal(latestMachinePunch)}
                      </p>
                    </div>
                  ) : null}
                  <div className="rounded-md bg-[#F8FAFC] px-2 py-1.5">
                    <p className={mobileLabelCls}>Late after</p>
                    <p className="mt-0.5 text-xs font-semibold text-[#E8710A]">{lateAfter}</p>
                  </div>
                  <div className="rounded-md bg-[#F8FAFC] px-2 py-1.5">
                    <p className={mobileLabelCls}>Status</p>
                    <span className={`mt-0.5 inline-block rounded px-1 py-0.5 text-[9px] font-semibold ${dayVisual.boxClass}`}>{dayVisual.meaning}</span>
                  </div>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => void markCheckIn()} disabled={hasCheckedInToday || checkInSubmitting} className={mobilePrimaryBtnCls()}>
                    {checkInSubmitting ? "…" : hasCheckedInToday ? "Checked in" : "Check in"}
                  </button>
                  <button type="button" onClick={() => void markCheckOut()} disabled={!hasCheckedInToday || hasCheckedOutToday || checkOutSubmitting} className={mobileDangerBtnCls()}>
                    {checkOutSubmitting ? "…" : hasCheckedOutToday ? "Out" : "Check out"}
                  </button>
                  <button type="button" onClick={() => void markAttendanceLog()} disabled={!hasCheckedInToday || hasCheckedOutToday || logSubmitting || todayRecord?.id == null || todayRecord?.id === ""} className={mobileSecondaryBtnCls()} title="Mark log">
                    {logSubmitting ? "…" : "Log"}
                  </button>
                </div>
                {logSuccessMessage ? <p className="mt-1.5 text-[11px] text-emerald-600">{logSuccessMessage}</p> : null}
                {attendanceActionError ? <p className="mt-1.5 text-[11px] text-red-600">{attendanceActionError}</p> : null}
              </div>
            </div>
          </section>
        ) : null}

        <section
          className={`${dashCardCls} ${showAttendance ? "lg:col-span-4" : "lg:col-span-12"}`}
          style={{ animationDelay: "75ms" }}
        >
          <div className={dashCardAccent} />
          <div className={`${dashSectionHeadCls} justify-between`}>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-amber-600" aria-hidden />
              <h2 className="text-sm font-semibold text-[#0C123A]">Asset handover</h2>
              {handoverPendingCount > 0 ? (
                <span className="rounded-full bg-[#E8710A] px-1.5 py-0.5 text-[9px] font-bold text-white">{handoverPendingCount}</span>
              ) : null}
            </div>
            <Link href={handoverHref} className={`${mobilePrimaryBtnCls()} !py-1 !text-[11px]`}>
              Open
            </Link>
          </div>
        </section>

        {roleKey !== "admin" ? (
          <div className="lg:col-span-6">
            <MyTeamsSection teams={attendanceData?.teams ?? []} orgId={orgId} currentUserName={user.user_name?.trim() || displayName} delayMs={100} />
          </div>
        ) : null}

        <div className={roleKey !== "admin" ? "lg:col-span-6" : "lg:col-span-12"}>
          <ProfileSummaryCard
            organization={organization}
            user={user}
            ownerName={ownerName}
            ownerEmail={ownerEmail}
            ownerPhone={ownerPhone}
            ownerMatchesUser={ownerMatchesUser}
            delayMs={125}
          />
        </div>

        <div className="lg:col-span-12">
          <OrganizationAddressesSection addresses={organizationAddresses} orgId={orgId} delayMs={150} />
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const ctx = useManagementDashboardContext();
  const params = useParams();
  const orgId = Number(params?.org_id);
 
  if (!ctx) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-[#0C123A]">Home</p>
      </div>
    );
  }

  const { organization, user, organizationAddresses, loading } = ctx;

  if (loading || !organization || !user) {
    return (
      <div className={`${dashCardCls} p-6`} style={{ animationDelay: "0ms" }}>
        <div className={dashCardAccent} />
        <p className="text-sm font-medium text-[#0C123A]">
          {loading ? "Loading dashboard…" : "Could not load organization."}
        </p>
      </div>
    );
  }

  return (
    <HomeOverview
      organization={organization}
      user={user}
      orgId={orgId}
      organizationAddresses={organizationAddresses}
    />
  );
}
