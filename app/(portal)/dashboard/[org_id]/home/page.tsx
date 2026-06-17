"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  Building2,
  ChevronRight,
  MapPin,
  Package,
  Plus,
  UserCircle,
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
import { socket } from "@/lib/socket.io";

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
const mobileValueCls = "text-[13px] font-semibold text-[#1F2937]";
const mobileStatValueCls = "text-lg font-bold tabular-nums tracking-tight";

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
  return `inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-md bg-[#C99237] px-3 py-2 text-[12px] font-semibold text-[#0C123A] transition active:scale-[0.98] hover:bg-[#b87d2e] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full" : ""}`;
}

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
      className="dashboard-enter overflow-hidden rounded-lg border border-[#008CD3]/20 bg-white shadow-sm ring-1 ring-[#E4E7EC] lg:rounded-2xl lg:border-[#008CD3]/15 lg:shadow-md lg:ring-0"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="border-b border-[#E4E7EC] bg-gradient-to-r from-[#E8F4FB] via-white to-[#E6F4EA] px-3 py-3.5 lg:px-5 lg:py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 lg:gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#008CD3] text-white shadow-sm lg:h-11 lg:w-11 lg:rounded-xl">
              <UsersRound className="h-5 w-5 lg:h-6 lg:w-6" aria-hidden />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#008CD3]">
                My teams
              </p>
              <h2 className="mt-0.5 text-[15px] font-semibold text-[#1F2937] lg:text-lg lg:text-[#0C123A]">
                {activeTeams.length === 1
                  ? "1 team assigned"
                  : `${activeTeams.length} teams assigned`}
              </h2>
              <p className={`mt-0.5 ${mobileCaptionCls} lg:text-sm`}>
                Open a team workspace to view members, activity, and HR
                requests.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 lg:p-5">
        {activeTeams.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E4E7EC] bg-[#F9FAFB] px-4 py-8 text-center">
            <UsersRound
              className="mx-auto h-9 w-9 text-[#9CA3AF]"
              aria-hidden
            />
            <p className="mt-2 text-[14px] font-semibold text-[#1F2937]">
              No team assigned yet
            </p>
            <p className={`mt-1 ${mobileCaptionCls}`}>
              Your reporting manager or HR will add you to a team.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
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
                  className="flex h-full flex-col overflow-hidden rounded-xl border border-[#E4E7EC] bg-white shadow-sm transition hover:border-[#008CD3]/35 hover:shadow-md"
                >
                  <div className="border-t-[3px] border-t-[#008CD3] px-4 pb-4 pt-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-[15px] font-semibold text-[#1F2937]">
                          {title}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-[#6B7280]">
                          {team.team_info?.trim() ||
                            "No team description added yet."}
                        </p>
                      </div>
                      {isReportingManager ? (
                        <span className="shrink-0 rounded-full bg-[#E6F4EA] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#0F9D58]">
                          You manage
                        </span>
                      ) : null}
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-[#F9FAFB] px-2.5 py-2">
                        <dt className={mobileLabelCls}>Reporting manager</dt>
                        <dd className={`mt-0.5 ${mobileValueCls} truncate`}>
                          {managerName}
                        </dd>
                      </div>
                      <div className="rounded-lg bg-[#F9FAFB] px-2.5 py-2">
                        <dt className={mobileLabelCls}>Members</dt>
                        <dd className={`mt-0.5 ${mobileValueCls}`}>
                          {memberCount || "—"}
                        </dd>
                      </div>
                      <div className="col-span-2 rounded-lg bg-[#F9FAFB] px-2.5 py-2">
                        <dt className={mobileLabelCls}>Joined on</dt>
                        <dd className={`mt-0.5 ${mobileValueCls}`}>
                          {formatJoinedDate(team.joined_date)}
                        </dd>
                      </div>
                    </dl>

                    <Link
                      href={teamGroupHref(orgId, teamId)}
                      className={`mt-4 ${mobilePrimaryBtnCls(true)} !min-h-[40px] !rounded-lg !text-[13px] !font-semibold lg:!rounded-xl`}
                    >
                      Open {title}
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </div>
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
    <div className="flex items-center justify-between gap-2 border-b border-slate-100/90 py-3 last:border-b-0 last:pb-0 first:pt-0 max-lg:rounded-md max-lg:border-0 max-lg:bg-[#F9FAFB] max-lg:px-2.5 max-lg:py-2 max-lg:first:mt-0 max-lg:last:mb-0 lg:flex-row lg:gap-3 lg:py-3">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF] lg:text-xs lg:font-medium lg:normal-case lg:tracking-normal lg:text-slate-500">
        {label}
      </span>
      <span className="min-w-0 text-right text-[13px] font-semibold text-[#1F2937] lg:text-sm lg:text-[#0C123A]">
        {display}
      </span>
    </div>
  );
}

function DashboardCard({
  icon: Icon,
  title,
  delayMs,
  children,
  id,
}: {
  icon: typeof Building2;
  title: string;
  delayMs: number;
  children: ReactNode;
  id: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="dashboard-enter overflow-hidden rounded-3xl bg-white shadow-md ring-1 ring-slate-200/70 transition-all duration-300 max-lg:rounded-lg max-lg:shadow-sm max-lg:ring-[#E4E7EC] max-lg:p-0 lg:rounded-2xl lg:border lg:border-slate-200/90 lg:p-6 lg:shadow-sm lg:ring-0 lg:hover:border-slate-300 lg:hover:shadow-md"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="flex items-center gap-2 border-b border-[#E4E7EC] px-3 py-2.5 max-lg:bg-[#F9FAFB] lg:gap-3 lg:border-slate-100/80 lg:px-0 lg:py-0 lg:bg-transparent">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#C99237]/15 lg:h-10 lg:w-10 lg:rounded-xl">
          <Icon
            className="h-4 w-4 shrink-0 text-[#C99237] lg:h-5 lg:w-5"
            aria-hidden
          />
        </span>
        <h2
          id={`${id}-title`}
          className="text-[13px] font-semibold text-[#1F2937] lg:text-base lg:text-[#0C123A]"
        >
          {title}
        </h2>
      </div>
      <div className="hidden border-t border-slate-100 lg:my-4 lg:block" />
      <div className="flex flex-col gap-1 px-2.5 py-2.5 max-lg:gap-1 lg:gap-0 lg:px-0 lg:py-0">
        {children}
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
      className="dashboard-enter overflow-hidden rounded-3xl bg-white shadow-md ring-1 ring-slate-200/70 max-lg:rounded-lg max-lg:ring-[#E4E7EC] lg:rounded-2xl lg:border lg:border-slate-200/90 lg:p-6 lg:shadow-sm lg:ring-0"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[#E4E7EC] px-3 py-2.5 max-lg:bg-[#F9FAFB] lg:gap-3 lg:border-slate-100/80 lg:px-0 lg:py-0 lg:pb-4">
        <div className="flex items-center gap-2 lg:gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#C99237]/15 lg:h-10 lg:w-10 lg:rounded-xl">
            <MapPin
              className="h-4 w-4 shrink-0 text-[#C99237] lg:h-5 lg:w-5"
              aria-hidden
            />
          </span>
          <div>
            <h2
              id="dash-addresses-title"
              className="text-[13px] font-semibold text-[#1F2937] lg:text-base lg:text-[#0C123A]"
            >
              Organization addresses
            </h2>
            <p className="text-[11px] text-[#6B7280] lg:text-xs lg:text-slate-500 lg:text-sm">
              {hasAddresses
                ? `${addresses.length} registered location${addresses.length === 1 ? "" : "s"}`
                : "No locations on file yet"}
            </p>
          </div>
        </div>
        {hasAddresses ? (
          <Link
            href={manageHref}
            className="shrink-0 text-xs font-semibold text-[#C99237] underline-offset-2 hover:underline lg:text-sm"
          >
            Manage
          </Link>
        ) : null}
      </div>

      <div className="px-2.5 py-2.5 max-lg:pb-3 lg:px-0 lg:py-0">
        {!hasAddresses ? (
          <div className="rounded-lg border border-dashed border-[#E4E7EC] bg-[#F9FAFB] px-3 py-8 text-center max-lg:mx-0 lg:rounded-2xl lg:border-slate-200 lg:py-10">
            <MapPin
              className="mx-auto h-8 w-8 text-[#9CA3AF] lg:h-9 lg:w-9 lg:text-slate-300"
              aria-hidden
            />
            <p className="mt-2 text-[13px] font-semibold text-[#1F2937] lg:mt-3 lg:text-sm lg:text-[#0C123A]">
              No address added yet
            </p>
            <p
              className={`mt-1 ${mobileCaptionCls} lg:text-sm lg:text-slate-500`}
            >
              Add your office or branch locations for this organization.
            </p>
            <Link
              href={manageHref}
              className={`mt-4 ${mobileGoldBtnCls()} lg:mt-5 lg:min-h-[44px] lg:rounded-xl lg:px-5 lg:py-2.5 lg:text-sm lg:font-bold`}
            >
              <Plus className="h-3.5 w-3.5 lg:h-4 lg:w-4" aria-hidden />
              Add organization address
            </Link>
          </div>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:gap-3">
            {addresses.map((addr, index) => (
              <li
                key={String(addr.id ?? index)}
                className="rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] p-3 lg:rounded-xl lg:border-slate-200/90 lg:bg-slate-50/60 lg:p-4"
              >
                <p className={mobileLabelCls}>
                  {addressLocationLabel(addr, index)}
                </p>
                <p className="mt-1.5 whitespace-pre-line text-[12px] leading-snug text-[#1F2937] lg:mt-2 lg:text-sm lg:leading-relaxed lg:text-[#0C123A]">
                  {formatOrganizationAddress(addr)}
                </p>
              </li>
            ))}
          </ul>
        )}
        {hasAddresses ? (
          <Link
            href={manageHref}
            className={`mt-3 ${mobileGoldBtnCls(true)} border border-dashed border-[#C99237]/40 !bg-[#C99237]/5 !text-[#0C123A] hover:!bg-[#C99237]/10 lg:mt-4 lg:min-h-[44px] lg:rounded-xl lg:px-4 lg:py-3 lg:text-sm`}
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

  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [attendanceActionError, setAttendanceActionError] = useState<
    string | null
  >(null);
  const [attendanceData, setAttendanceData] =
    useState<EmployeeDashboardResponse | null>(null);
  const [checkInSubmitting, setCheckInSubmitting] = useState(false);
  const [checkOutSubmitting, setCheckOutSubmitting] = useState(false);
  const [logSubmitting, setLogSubmitting] = useState(false);
  const [logSuccessMessage, setLogSuccessMessage] = useState<string | null>(
    null,
  );
  const [tick, setTick] = useState(0);
  const [handoverPendingCount, setHandoverPendingCount] = useState(0);

  const handoverHref =
    orgId && !Number.isNaN(orgId)
      ? `/dashboard/${encodeURIComponent(String(orgId))}/asset-handover`
      : "#";

  const loadHandoverPendingCount = useCallback(async () => {
    if (!orgId || Number.isNaN(orgId)) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const result = await fetchHandoverAssignedToMe(token, orgId);
      setHandoverPendingCount(countPendingHandoverItems(result));
    } catch {
      setHandoverPendingCount(0);
    }
  }, [orgId]);

  useEffect(() => {
    void loadHandoverPendingCount();
  }, [loadHandoverPendingCount]);

  useEffect(() => {
    async function loadAttendance() {
      if (!showAttendance || !orgId || Number.isNaN(orgId)) return;
      const token = localStorage.getItem("token");
      if (!token) return;
      setAttendanceLoading(true);
      setAttendanceError(null);
      try {
        const q = encodeURIComponent(String(orgId));
        const res = await fetch(
          `${API_URL}/api/employees/get-employees-full-information?org_id=${q}`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const result = (await res.json()) as EmployeeDashboardResponse & {
          message?: string;
        };
        if (!res.ok)
          throw new Error(result.message || "Could not load attendance");
        setAttendanceData(result);
      } catch (e) {
        setAttendanceError(
          e instanceof Error ? e.message : "Could not load attendance",
        );
      } finally {
        setAttendanceLoading(false);
      }
    }
    void loadAttendance();
  }, [orgId, showAttendance]);

  const todayYmd = getTodayLocalYmd(new Date());
  const historyMap = useMemo(() => {
    const map = new Map<string, AttendanceHistoryRow>();
    for (const row of attendanceData?.attendance_history ?? []) {
      const key = localYmdFromAttendanceValue(row.attendance_date);
      if (key) map.set(key, row);
    }
    return map;
  }, [attendanceData?.attendance_history]);
  const todayRecord = historyMap.get(todayYmd);
  const hasCheckedInToday = Boolean(todayRecord?.check_in);
  const hasCheckedOutToday = Boolean(todayRecord?.check_out);
  const checkInInstant = parseAttendanceNaiveLocal(todayRecord?.check_in);
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
    : formatWorkingTimeDisplay(todayRecord?.working_time);
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
      const q = encodeURIComponent(String(orgId));
      const refresh = await fetch(
        `${API_URL}/api/employees/get-employees-full-information?org_id=${q}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const refreshData =
        (await refresh.json()) as EmployeeDashboardResponse & {
          message?: string;
        };
      if (refresh.ok) setAttendanceData(refreshData);
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
      const q = encodeURIComponent(String(orgId));
      const refresh = await fetch(
        `${API_URL}/api/employees/get-employees-full-information?org_id=${q}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const refreshData =
        (await refresh.json()) as EmployeeDashboardResponse & {
          message?: string;
        };
      if (refresh.ok) setAttendanceData(refreshData);
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

  const statusLabel = todayRecord?.attendance_status
    ? String(todayRecord.attendance_status).replace(/_/g, " ")
    : "No status";
  const statusTone = String(todayRecord?.attendance_status || "")
    .toLowerCase()
    .includes("late")
    ? "bg-orange-500/20 text-orange-100"
    : String(todayRecord?.attendance_status || "")
          .toLowerCase()
          .includes("full_day")
      ? "bg-emerald-500/20 text-emerald-100"
      : "bg-white/10 text-slate-200";
  const dayVisual = getAttendanceDayVisual(todayRecord?.attendance_status);

  return (
    <div className="-mx-1 space-y-2.5 max-lg:bg-[#F5F7FA] max-lg:px-1 max-lg:pb-2 sm:-mx-2 sm:space-y-3 lg:mx-0 lg:space-y-8 lg:bg-transparent lg:px-0 lg:pb-0">
      {/* Mobile & tablet: Zoho-style compact hero */}
      <header
        className="dashboard-enter overflow-hidden rounded-lg border border-[#0C123A]/20 bg-gradient-to-br from-[#0C123A] via-[#151f52] to-[#0C123A] px-3 py-3.5 shadow-md lg:hidden"
        style={{ animationDelay: "0ms" }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#C99237]">
              {greetingForHour()}
            </p>
            <h1 className="mt-0.5 flex items-center gap-1.5 text-[16px] font-bold leading-tight text-white">
              <span className="truncate">{displayName}</span>
              <MdWorkspacePremium
                className="h-5 w-5 shrink-0 text-[#C99237]"
                aria-hidden
              />
            </h1>
            <p className="mt-0.5 truncate text-[11px] text-slate-300">
              {orgTitle}
            </p>
            <p className="mt-1 text-[10px] text-slate-400">
              Management dashboard · quick overview
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${roleBadgeClass}`}
          >
            {roleBadgeLabel}
          </span>
        </div>
      </header>

      {/* Desktop: original welcome card */}
      <header
        className="dashboard-enter hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8 lg:block"
        style={{ animationDelay: "0ms" }}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-3 text-2xl font-bold tracking-tight text-[#0C123A] sm:text-3xl">
              <span>
                {greetingForHour()}, {displayName}
              </span>
              <MdWorkspacePremium
                className="h-8 w-8 shrink-0 text-[#C99237] sm:h-9 sm:w-9"
                aria-hidden
              />
            </h1>
            <p className="mt-2 text-sm text-slate-500">{orgTitle}</p>
          </div>
          <span
            className={`inline-flex w-fit shrink-0 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide ${roleBadgeClass}`}
          >
            {roleBadgeLabel}
          </span>
        </div>
      </header>

      {roleKey !== "admin" ? (
        <MyTeamsSection
          teams={attendanceData?.teams ?? []}
          orgId={orgId}
          currentUserName={user.user_name?.trim() || displayName}
          delayMs={50}
        />
      ) : null}

      <section
        className="dashboard-enter overflow-hidden rounded-lg border border-amber-200/80 bg-gradient-to-r from-amber-50 to-white p-3 shadow-sm ring-1 ring-amber-100 sm:p-4 lg:rounded-2xl lg:p-6"
        style={{ animationDelay: "75ms" }}
      >
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          <div className="flex items-start gap-2.5 lg:gap-3">
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-800 lg:h-11 lg:w-11 lg:rounded-xl">
              <Package className="h-5 w-5 lg:h-6 lg:w-6" aria-hidden />
              {handoverPendingCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E8710A] px-1 text-[9px] font-bold text-white">
                  {handoverPendingCount > 9 ? "9+" : handoverPendingCount}
                </span>
              ) : null}
            </span>
            <div className="min-w-0">
              <h2 className="text-[13px] font-semibold text-[#0C123A] lg:text-base">
                Asset handover
              </h2>
              <p
                className={`mt-0.5 max-lg:line-clamp-2 ${mobileCaptionCls} lg:mt-1 lg:text-sm lg:leading-relaxed lg:max-w-xl`}
              >
                Exit assets and custom tasks assigned to you as custodian.
              </p>
            </div>
          </div>
          <Link
            href={handoverHref}
            className={`${mobileGoldBtnCls(true)} !bg-[#008CD3] !text-white hover:!bg-[#0070AA] lg:inline-flex lg:w-auto lg:shrink-0 lg:rounded-xl lg:px-5 lg:py-2.5 lg:text-sm lg:shadow-md`}
          >
            {handoverPendingCount > 0
              ? `Open handovers (${handoverPendingCount} pending)`
              : "Open asset handover"}
          </Link>
        </div>
      </section>

      <div
        className={`grid grid-cols-1 gap-2 sm:gap-2.5 lg:gap-6 ${ownerMatchesUser ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}
      >
        <DashboardCard
          icon={Building2}
          title="Organization"
          delayMs={100}
          id="dash-org-card"
        >
          <InfoRow label="Name" value={organization.org_name} />
          <InfoRow label="Email" value={organization.org_email} />
          <InfoRow label="Phone" value={organization.org_phone} />
        </DashboardCard>

        {!ownerMatchesUser ? (
          <DashboardCard
            icon={UserCircle}
            title="Owner"
            delayMs={200}
            id="dash-owner-card"
          >
            <InfoRow label="Name" value={ownerName} />
            <InfoRow label="Email" value={ownerEmail} />
            <InfoRow label="Phone" value={ownerPhone} />
          </DashboardCard>
        ) : null}

        <DashboardCard
          icon={BarChart3}
          title={ownerMatchesUser ? "Owner account" : "Your account"}
          delayMs={ownerMatchesUser ? 200 : 300}
          id="dash-account-card"
        >
          <InfoRow label="Full name" value={user.user_name} />
          <InfoRow label="Email" value={user.user_email} />
          <InfoRow label="Phone" value={user.user_phone} />
          <InfoRow label="Role" value={formatRoleLabel(user.user_role_name)} />
          <InfoRow
            label="Member since"
            value={formatJoinedDate(user.user_created_at)}
          />
        </DashboardCard>
      </div>

      <OrganizationAddressesSection
        addresses={organizationAddresses}
        orgId={orgId}
        delayMs={125}
      />

      {showAttendance ? (
        <section
          className="dashboard-enter overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-[#E4E7EC] lg:rounded-2xl lg:border lg:border-slate-200/90 lg:p-6 lg:shadow-sm lg:ring-0"
          style={{ animationDelay: "150ms" }}
        >
          {/* Mobile & tablet: Zoho-style attendance hub */}
          <div className="lg:hidden">
            <div className="border-b border-[#E4E7EC] bg-gradient-to-br from-[#0C123A] via-[#151f52] to-[#0C123A] px-3 py-3.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-[13px] font-semibold text-white">
                    Today&apos;s attendance
                  </h2>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    Mark in, out, or break logs
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${statusTone}`}
                >
                  {statusLabel}
                </span>
              </div>
              <p className={`mt-2 ${mobileLabelCls} !text-slate-400`}>
                {showLiveTimer ? "Working (live)" : "Working hours"}
              </p>
              <p className={`mt-0.5 ${mobileStatValueCls} text-white`}>
                {String(workingHoursDisplay)}
              </p>
              {showLiveTimer ? (
                <p className={`mt-0.5 ${mobileCaptionCls} !text-slate-400`}>
                  Updates until you check out
                </p>
              ) : null}
              {attendanceLoading ? (
                <p className={`mt-1 ${mobileCaptionCls} !text-slate-400`}>
                  Loading attendance…
                </p>
              ) : null}
              {attendanceError ? (
                <p className="mt-1 text-[11px] text-rose-300">
                  {attendanceError}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-1.5 p-2.5">
              <div className="rounded-md border border-[#E4E7EC] bg-[#F9FAFB] px-2.5 py-2">
                <p className={mobileLabelCls}>Check in</p>
                <p className={`mt-0.5 ${mobileValueCls}`}>
                  {hasCheckedInToday
                    ? formatAttendanceLogLocal(todayRecord?.check_in)
                    : "—"}
                </p>
              </div>
              <div className="rounded-md border border-[#E4E7EC] bg-[#F9FAFB] px-2.5 py-2">
                <p className={mobileLabelCls}>Check out</p>
                <p className={`mt-0.5 ${mobileValueCls}`}>
                  {hasCheckedOutToday
                    ? formatAttendanceTimeLocal(todayRecord?.check_out)
                    : "—"}
                </p>
              </div>
              <div className="rounded-md border border-[#E4E7EC] bg-[#F9FAFB] px-2.5 py-2">
                <p className={mobileLabelCls}>Late after</p>
                <p className="mt-0.5 text-[13px] font-semibold text-[#E8710A]">
                  {lateAfter}
                </p>
              </div>
              <div className="rounded-md border border-[#E4E7EC] bg-[#F9FAFB] px-2.5 py-2">
                <p className={mobileLabelCls}>Day status</p>
                <span
                  className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${dayVisual.boxClass}`}
                >
                  {dayVisual.meaning}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 border-t border-[#E4E7EC] px-2.5 py-2.5">
              <button
                type="button"
                onClick={() => void markCheckIn()}
                disabled={hasCheckedInToday || checkInSubmitting}
                className={mobilePrimaryBtnCls(true)}
              >
                {checkInSubmitting
                  ? "Marking…"
                  : hasCheckedInToday
                    ? "Checked in"
                    : "Check in"}
              </button>
              <button
                type="button"
                onClick={() => void markCheckOut()}
                disabled={
                  !hasCheckedInToday || hasCheckedOutToday || checkOutSubmitting
                }
                className={mobileDangerBtnCls(true)}
              >
                {checkOutSubmitting
                  ? "Processing…"
                  : hasCheckedOutToday
                    ? "Checked out"
                    : "Check out"}
              </button>
              <button
                type="button"
                onClick={() => void markAttendanceLog()}
                disabled={
                  !hasCheckedInToday ||
                  hasCheckedOutToday ||
                  logSubmitting ||
                  todayRecord?.id == null ||
                  todayRecord?.id === ""
                }
                className={mobileSecondaryBtnCls(true)}
                title="Log stepping out / back in (washroom, errand, etc.)"
              >
                {logSubmitting ? "Saving…" : "Mark log"}
              </button>
            </div>
            {logSuccessMessage ? (
              <p className="border-t border-[#E4E7EC] px-3 py-2 text-[12px] text-[#0F9D58]">
                {logSuccessMessage}
              </p>
            ) : null}
            {attendanceActionError ? (
              <p className="border-t border-[#E4E7EC] px-3 pb-2.5 text-[12px] text-[#D93025]">
                {attendanceActionError}
              </p>
            ) : null}
          </div>

          {/* Desktop: original attendance panel */}
          <div className="hidden p-6 lg:block">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-[#0C123A]">
                Attendance
              </h2>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  String(todayRecord?.attendance_status || "")
                    .toLowerCase()
                    .includes("late")
                    ? "bg-orange-100 text-orange-700"
                    : String(todayRecord?.attendance_status || "")
                          .toLowerCase()
                          .includes("full_day")
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-700"
                }`}
              >
                {todayRecord?.attendance_status
                  ? String(todayRecord.attendance_status)
                      .replace(/_/g, " ")
                      .toUpperCase()
                  : "NO STATUS"}
              </span>
            </div>
            {attendanceLoading ? (
              <p className="mt-3 text-sm text-slate-500">
                Loading attendance...
              </p>
            ) : null}
            {attendanceError ? (
              <p className="mt-3 text-sm text-red-600">{attendanceError}</p>
            ) : null}
            <div className="mt-4 grid gap-3 sm:grid-cols-5">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  Today Log
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {hasCheckedInToday
                    ? formatAttendanceLogLocal(todayRecord?.check_in)
                    : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  {showLiveTimer ? "Working (live)" : "Working Hours"}
                </p>
                <p className="mt-1 text-sm font-semibold tabular-nums text-slate-800">
                  {String(workingHoursDisplay)}
                </p>
                {showLiveTimer ? (
                  <p className="mt-1 text-[10px] text-slate-500">
                    Timer runs until you check out
                  </p>
                ) : null}
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  Late After
                </p>
                <p className="mt-1 text-sm font-semibold text-rose-500">
                  {lateAfter}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  Check Out Time
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {hasCheckedOutToday
                    ? formatAttendanceTimeLocal(todayRecord?.check_out)
                    : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  Day Color
                </p>
                <span
                  className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-semibold ${dayVisual.boxClass}`}
                >
                  {dayVisual.meaning}
                </span>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void markCheckIn()}
                disabled={hasCheckedInToday || checkInSubmitting}
                className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {checkInSubmitting ? "Marking..." : "Check In"}
              </button>
              <button
                type="button"
                onClick={() => void markCheckOut()}
                disabled={
                  !hasCheckedInToday || hasCheckedOutToday || checkOutSubmitting
                }
                className="rounded-md bg-rose-600 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {checkOutSubmitting
                  ? "Processing..."
                  : hasCheckedOutToday
                    ? "Checked Out"
                    : "Check Out"}
              </button>
              <button
                type="button"
                onClick={() => void markAttendanceLog()}
                disabled={
                  !hasCheckedInToday ||
                  hasCheckedOutToday ||
                  logSubmitting ||
                  todayRecord?.id == null ||
                  todayRecord?.id === ""
                }
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                title="Log stepping out / back in (washroom, errand, etc.)"
              >
                {logSubmitting ? "Saving…" : "Mark log"}
              </button>
            </div>
            {logSuccessMessage ? (
              <p className="mt-2 text-sm text-emerald-700">
                {logSuccessMessage}
              </p>
            ) : null}
            {attendanceActionError ? (
              <p className="mt-3 text-sm text-red-600">
                {attendanceActionError}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}
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
      <div
        className="dashboard-enter rounded-lg bg-white p-6 shadow-sm ring-1 ring-[#E4E7EC] max-lg:mx-0 max-lg:p-5 lg:rounded-2xl lg:border lg:border-slate-200 lg:p-8 lg:shadow-md lg:ring-slate-200/70"
        style={{ animationDelay: "0ms" }}
      >
        <p className="text-[13px] font-medium text-[#1F2937] lg:text-base lg:text-[#0C123A]">
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
