"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MdNotificationsNone, MdSearch } from "react-icons/md";
import {
  RefreshCw,
  Loader2,
  AlertCircle,
  Info,
  MapPin,
  CalendarCheck,
  Pencil,
  X,
  Package,
  ChevronRight,
  UsersRound,
} from "lucide-react";
import {
  countPendingHandoverItems,
  fetchHandoverAssignedToMe,
} from "@/services/handoverAssigned";
import { updateMyProfileImage } from "@/services/adminUser";
import {
  formatAttendanceLogLocal,
  formatAttendanceTimeLocal,
  getAttendanceDayVisual,
  getLocalYmdFromDate,
  getTodayLocalYmd,
  localYmdFromAttendanceValue,
  parseAttendanceNaiveLocal,
} from "@/lib/attendanceDates";
import {
  mapEmployeeLeaveBalanceRows,
  summarizeLeaveBalances,
  type EmployeeLeaveBalanceRow,
  type LeaveBalanceDisplayRow,
  type LeaveSummary,
} from "@/lib/leaveBalanceDisplay";
import {
  clearEmployeeDashboardHomeCache,
  getBootstrappedHomeCache,
  writeEmployeeDashboardHomeCache,
} from "@/lib/employeeDashboardHomeCache";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;

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
  added_by_name?: string | null;
};

type AttendanceHistoryRow = {
  id?: number | string;
  attendance_date?: string;
  check_in?: string | null;
  check_out?: string | null;
  attendance_status?: string | null;
  working_time?: string | number | null;
};

type UserAddressRow = {
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

type EmployeeDashboardResponse = {
  message?: string;
  owner?: {
    user_name?: string;
    user_email?: string;
  };
  organization?: {
    id?: number | string;
    org_name?: string;
    org_email?: string;
    org_phone?: string;
    created_at?: string;
    [key: string]: unknown;
  };
  employee?: {
    id?: number | string;
    user_name?: string;
    user_email?: string;
    user_phone?: string;
    user_address?: string;
    user_emergency_contact?: string;
    user_image?: string;
    user_shift_name?: string;
    user_shift_start_time?: string;
    user_shift_end_time?: string;
    mark_attendance_late_after?: string;
    is_night_shift?: boolean | number;
    total_leaves?: number | string | null;
    used_leaves?: number | string | null;
    remaining_leaves?: number | string | null;
    user_role_name?: string;
    created_at?: string;
    [key: string]: unknown;
  };
  /** Legacy shape */
  employees?: EmployeeDashboardResponse["employee"];
  leave_summary?: LeaveSummary;
  employee_leave_balances?: EmployeeLeaveBalanceRow[];
  attendance_history?: AttendanceHistoryRow[];
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

function formatMinutesAsHours(
  value: string | number | null | undefined,
): string {
  if (value == null || value === "") return "—";
  const minutes = Number(value);
  if (Number.isNaN(minutes) || minutes < 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
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

function userMyTeamHref(orgId: number, teamId: number | string): string {
  return `/user-dashboard/${orgId}/my-team?team_id=${encodeURIComponent(String(teamId))}`;
}

function activeTeamAssignments(
  teams: EmployeeTeamAssignment[] | undefined,
): EmployeeTeamAssignment[] {
  return (teams ?? []).filter((team) => team.leave_date == null || team.leave_date === "");
}

function historyByLocalYmd(
  history: AttendanceHistoryRow[] | undefined,
): Map<string, AttendanceHistoryRow> {
  const map = new Map<string, AttendanceHistoryRow>();
  if (!history) return map;
  for (const row of history) {
    const key = localYmdFromAttendanceValue(row.attendance_date);
    if (key) map.set(key, row);
  }
  return map;
}

function isVillageAddress(value: UserAddressRow["is_from_village"]): boolean {
  return (
    value === true ||
    value === 1 ||
    String(value).toLowerCase() === "true" ||
    String(value) === "1"
  );
}

function joinAddressParts(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");
}

function leaveBalanceRowKey(row: LeaveBalanceDisplayRow, index: number): string {
  return `${row.leave_type_id}-${index}`;
}

function LeaveSummaryStrip({
  summary,
  variant,
}: {
  summary: LeaveSummary;
  variant: "mobile" | "desktop";
}) {
  const isMobile = variant === "mobile";
  return (
    <div
      className={
        isMobile
          ? "mt-3 grid grid-cols-3 gap-1.5 text-center"
          : "mt-4 grid grid-cols-3 gap-3 text-center"
      }
    >
      <div
        className={
          isMobile
            ? "rounded-md border border-[#E4E7EC] bg-[#F9FAFB] px-1.5 py-2"
            : "rounded-lg bg-slate-50 px-2 py-3"
        }
      >
        <p
          className={
            isMobile
              ? "text-lg font-semibold text-[#1F2937]"
              : "text-2xl font-semibold text-slate-800"
          }
        >
          {summary.total_leaves}
        </p>
        <p
          className={
            isMobile
              ? "text-[10px] font-semibold uppercase text-[#9CA3AF]"
              : "text-[11px] text-slate-400"
          }
        >
          Total
        </p>
      </div>
      <div
        className={
          isMobile
            ? "rounded-md border border-[#E4E7EC] bg-[#F9FAFB] px-1.5 py-2"
            : "rounded-lg bg-slate-50 px-2 py-3"
        }
      >
        <p
          className={
            isMobile
              ? "text-lg font-semibold text-[#E8710A]"
              : "text-2xl font-semibold text-amber-700"
          }
        >
          {summary.used_leaves}
        </p>
        <p
          className={
            isMobile
              ? "text-[10px] font-semibold uppercase text-[#9CA3AF]"
              : "text-[11px] text-slate-400"
          }
        >
          Used
        </p>
      </div>
      <div
        className={
          isMobile
            ? "rounded-md border border-[#E4E7EC] bg-[#F9FAFB] px-1.5 py-2"
            : "rounded-lg bg-slate-50 px-2 py-3"
        }
      >
        <p
          className={
            isMobile
              ? "text-lg font-semibold text-[#0F9D58]"
              : "text-2xl font-semibold text-emerald-700"
          }
        >
          {summary.remaining_leaves}
        </p>
        <p
          className={
            isMobile
              ? "text-[10px] font-semibold uppercase text-[#9CA3AF]"
              : "text-[11px] text-slate-400"
          }
        >
          Left
        </p>
      </div>
    </div>
  );
}

function LeaveBalancesPanel({
  summary,
  rows,
  variant,
}: {
  summary: LeaveSummary;
  rows: LeaveBalanceDisplayRow[];
  variant: "mobile" | "desktop";
}) {
  const isMobile = variant === "mobile";

  return (
    <>
      <LeaveSummaryStrip summary={summary} variant={variant} />

      {rows.length === 0 ? (
        <p
          className={
            isMobile
              ? "mt-4 text-[13px] text-[#9CA3AF]"
              : "mt-4 text-xs text-slate-500"
          }
        >
          No leave types assigned yet.
        </p>
      ) : isMobile ? (
        <div className="mt-3 space-y-1.5">
          <p className={mobileLabelCls}>By leave type</p>
          {rows.map((row, index) => (
            <div
              key={leaveBalanceRowKey(row, index)}
              className="rounded-md border border-[#E4E7EC] bg-[#F9FAFB] px-2.5 py-2"
            >
              <p className="text-[13px] font-semibold text-[#1F2937]">
                {row.leave_type_name}
              </p>
              <div className="mt-1.5 grid grid-cols-3 gap-1 text-center text-[11px]">
                <span className="text-[#6B7280]">
                  Total
                  <span className="mt-0.5 block font-semibold text-[#1F2937]">
                    {row.total_leaves}
                  </span>
                </span>
                <span className="text-[#6B7280]">
                  Used
                  <span className="mt-0.5 block font-semibold text-[#E8710A]">
                    {row.used_leaves}
                  </span>
                </span>
                <span className="text-[#6B7280]">
                  Left
                  <span className="mt-0.5 block font-semibold text-[#0F9D58]">
                    {row.remaining_leaves}
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
          <p className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            By leave type
          </p>
          <table className="w-full min-w-[320px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="px-3 py-2.5 font-semibold">Leave type</th>
                <th className="px-3 py-2.5 text-center font-semibold">Total</th>
                <th className="px-3 py-2.5 text-center font-semibold">
                  Remaining
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={leaveBalanceRowKey(row, index)}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="px-3 py-2.5 font-medium text-slate-800">
                    {row.leave_type_name}
                  </td>
                  <td className="px-3 py-2.5 text-center font-semibold text-slate-800">
                    {row.total_leaves}
                  </td>
                  <td className="px-3 py-2.5 text-center font-semibold text-emerald-700">
                    {row.remaining_leaves}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function upsertTodayHistory(
  prev: EmployeeDashboardResponse | null,
  todayYmd: string,
  patch: Partial<AttendanceHistoryRow>,
): EmployeeDashboardResponse | null {
  if (!prev) return null;
  const history = [...(prev.attendance_history || [])];
  const idx = history.findIndex(
    (r) => localYmdFromAttendanceValue(r.attendance_date) === todayYmd,
  );
  if (idx >= 0) {
    history[idx] = { ...history[idx], ...patch };
  } else {
    history.unshift({
      id: patch.id,
      attendance_date: todayYmd,
      check_in: patch.check_in ?? null,
      check_out: patch.check_out ?? null,
      attendance_status: patch.attendance_status ?? undefined,
      working_time: patch.working_time ?? null,
    });
  }
  return { ...prev, attendance_history: history };
}

const LEGEND_ITEMS: {
  sampleClass: string;
  label: string;
  description: string;
}[] = [
  {
    sampleClass: "bg-emerald-600",
    label: "Green",
    description: "Full working day completed",
  },
  {
    sampleClass: "bg-amber-500",
    label: "Amber",
    description: "Checked in on time, partial day (not full shift yet)",
  },
  {
    sampleClass: "bg-orange-500",
    label: "Orange",
    description: "Late arrival",
  },
  {
    sampleClass: "bg-red-600",
    label: "Red",
    description: "Absent or insufficient hours",
  },
  {
    sampleClass: "bg-pink-500",
    label: "Pink",
    description: "Half day",
  },
  {
    sampleClass: "bg-rose-950",
    label: "Maroon",
    description: "Short leave",
  },
  {
    sampleClass: "bg-slate-100 border border-slate-200",
    label: "Gray",
    description: "No attendance record",
  },
];

function zohoPrimaryBtnCls(full = false) {
  return `inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg bg-[#008CD3] px-4 py-2.5 text-[14px] font-medium text-white transition active:scale-[0.98] hover:bg-[#0070AA] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full" : ""}`;
}

function zohoSecondaryBtnCls(full = false) {
  return `inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[#E4E7EC] bg-white px-4 py-2.5 text-[14px] font-medium text-[#1F2937] transition active:scale-[0.98] hover:bg-[#F5F7FA] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full flex-1" : ""}`;
}

function zohoDangerBtnCls(full = false) {
  return `inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#D93025] px-4 py-2.5 text-[14px] font-medium text-white transition active:scale-[0.98] hover:bg-[#B71C1C] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full flex-1" : ""}`;
}

/** Compact Zoho-style mobile dashboard tokens (lg:hidden only). */
const mobileCardCls =
  "rounded-lg border border-[#E4E7EC] bg-white p-3 shadow-sm";
const mobilePagePad = "px-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]";
const mobileSectionGap = "space-y-2";
const mobileLabelCls =
  "text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]";
const mobileValueCls = "text-[13px] font-semibold text-[#1F2937]";
const mobileStatValueCls = "text-lg font-semibold tabular-nums";
const mobileCaptionCls = "text-[11px] leading-snug text-[#6B7280]";

function mobileActionPrimaryBtnCls(full = false) {
  return `inline-flex min-h-[34px] items-center justify-center gap-1 rounded-md bg-[#008CD3] px-2.5 py-1.5 text-[12px] font-medium text-white transition active:scale-[0.98] hover:bg-[#0070AA] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full flex-1" : ""}`;
}

function mobileActionDangerBtnCls(full = false) {
  return `inline-flex min-h-[34px] items-center justify-center gap-1 rounded-md bg-[#D93025] px-2.5 py-1.5 text-[12px] font-medium text-white transition active:scale-[0.98] hover:bg-[#B71C1C] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full flex-1" : ""}`;
}

function mobileActionSecondaryBtnCls(full = false) {
  return `inline-flex min-h-[34px] items-center justify-center gap-1 rounded-md border border-[#E4E7EC] bg-white px-2.5 py-1.5 text-[12px] font-medium text-[#1F2937] transition active:scale-[0.98] hover:bg-[#F5F7FA] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full flex-1" : ""}`;
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-md ${className}`} aria-hidden />;
}

function MobileEmployeeHomeSkeleton() {
  return (
    <div className={`${mobileSectionGap} ${mobilePagePad} pt-2`} aria-busy="true" aria-label="Loading dashboard">
      <div className={mobileCardCls}>
        <div className="flex items-start justify-between gap-2">
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="h-3 w-16" />
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={mobileCardCls}>
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="mt-2 h-6 w-16" />
            <SkeletonBlock className="mt-2 h-3 w-24" />
          </div>
        ))}
      </div>
      <div className={mobileCardCls}>
        <SkeletonBlock className="h-3 w-20" />
        <SkeletonBlock className="mt-2 h-10 w-full" />
        <div className="mt-3 flex gap-1.5">
          <SkeletonBlock className="h-8 flex-1" />
          <SkeletonBlock className="h-8 flex-1" />
          <SkeletonBlock className="h-8 flex-1" />
        </div>
      </div>
      <div className="rounded-md border border-[#E4E7EC] bg-[#E8F4FB] px-3 py-2.5">
        <SkeletonBlock className="h-8 w-full" />
      </div>
    </div>
  );
}

function DesktopEmployeeHomeSkeleton() {
  return (
    <div className="space-y-5 p-6" aria-busy="true" aria-label="Loading dashboard">
      <section className="grid gap-5 xl:grid-cols-[2fr_1fr]">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start gap-4">
            <SkeletonBlock className="h-20 w-20 shrink-0 rounded-xl" />
            <div className="min-w-[240px] flex-1 space-y-3">
              <SkeletonBlock className="h-6 w-48" />
              <SkeletonBlock className="h-4 w-32" />
              <div className="grid gap-3 sm:grid-cols-2">
                <SkeletonBlock className="h-14 w-full" />
                <SkeletonBlock className="h-14 w-full" />
              </div>
              <div className="flex flex-wrap gap-2">
                <SkeletonBlock className="h-8 w-28" />
                <SkeletonBlock className="h-8 w-36" />
                <SkeletonBlock className="h-8 w-32" />
              </div>
            </div>
          </div>
        </article>
        <article className="rounded-xl bg-indigo-700/20 p-5">
          <SkeletonBlock className="h-4 w-24 bg-indigo-200/60" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-8 w-full" />
            ))}
          </div>
        </article>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <SkeletonBlock className="h-4 w-32" />
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </section>
      <section className="grid gap-5 xl:grid-cols-[2fr_1fr]">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <SkeletonBlock className="h-4 w-36" />
            <SkeletonBlock className="h-3 w-20" />
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <SkeletonBlock className="h-4 w-28" />
          <div className="mt-4 grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-8 w-full rounded-md" />
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

const USER_ICON_COLORS = [
  "bg-[#E8F4FB] text-[#008CD3]",
  "bg-[#E6F4EA] text-[#0F9D58]",
  "bg-[#FEF3E6] text-[#E8710A]",
  "bg-[#F3E8FD] text-[#7B1FA2]",
  "bg-[#FCE8E6] text-[#D93025]",
  "bg-[#E8EAF6] text-[#3F51B5]",
];

function userColorClass(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return USER_ICON_COLORS[Math.abs(hash) % USER_ICON_COLORS.length];
}

function userInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    const word = parts[0];
    if (/^\d/.test(word)) return word.slice(0, 2);
    return word.slice(0, 2).toUpperCase();
  }
  const first = parts[0][0] ?? "";
  const last = parts[parts.length - 1][0] ?? "";
  return (first + last).toUpperCase() || "?";
}

function MyTeamsSection({
  teams,
  orgId,
}: {
  teams: EmployeeTeamAssignment[];
  orgId: number;
}) {
  const activeTeams = activeTeamAssignments(teams);

  return (
    <section className="overflow-hidden rounded-lg border border-[#008CD3]/20 bg-white shadow-sm ring-1 ring-[#E4E7EC] lg:rounded-2xl lg:border-[#008CD3]/15 lg:shadow-md lg:ring-0">
      <div className="border-b border-[#E4E7EC] bg-gradient-to-r from-[#E8F4FB] via-white to-[#E6F4EA] px-3 py-3.5 lg:px-5 lg:py-4">
        <div className="flex items-start gap-2.5 lg:gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#008CD3] text-white shadow-sm lg:h-11 lg:w-11 lg:rounded-xl">
            <UsersRound className="h-5 w-5 lg:h-6 lg:w-6" aria-hidden />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#008CD3]">
              My teams
            </p>
            <h2 className="mt-0.5 text-[15px] font-semibold text-[#1F2937] lg:text-lg">
              {activeTeams.length === 1
                ? "1 team assigned"
                : `${activeTeams.length} teams assigned`}
            </h2>
            <p className={`mt-0.5 ${mobileCaptionCls} lg:text-sm`}>
              Open a team to view members, leave requests, and attendance queries.
            </p>
          </div>
        </div>
      </div>

      <div className="p-3 lg:p-5">
        {activeTeams.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E4E7EC] bg-[#F9FAFB] px-4 py-8 text-center">
            <UsersRound className="mx-auto h-9 w-9 text-[#9CA3AF]" aria-hidden />
            <p className="mt-2 text-[14px] font-semibold text-[#1F2937]">No team assigned yet</p>
            <p className={`mt-1 ${mobileCaptionCls}`}>
              Your reporting manager or HR will add you to a team.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
            {activeTeams.map((team) => {
              const teamId = team.team_id;
              const title = displayTeamTitle(team.team_name);
              const managerName = team.team_admin_name?.trim() || "—";
              const memberCount = Number(team.total_number_of_members ?? 0);

              return (
                <li
                  key={String(team.id ?? teamId)}
                  className="flex h-full flex-col overflow-hidden rounded-xl border border-[#E4E7EC] bg-white shadow-sm transition hover:border-[#008CD3]/35 hover:shadow-md"
                >
                  <div className="border-t-[3px] border-t-[#008CD3] px-4 pb-4 pt-3.5">
                    <div className="min-w-0">
                      <h3 className="truncate text-[15px] font-semibold text-[#1F2937]">
                        {title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-[#6B7280]">
                        {team.team_info?.trim() || "No team description added yet."}
                      </p>
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-[#F9FAFB] px-2.5 py-2">
                        <dt className={mobileLabelCls}>Reporting manager</dt>
                        <dd className={`mt-0.5 ${mobileValueCls} truncate`}>{managerName}</dd>
                      </div>
                      <div className="rounded-lg bg-[#F9FAFB] px-2.5 py-2">
                        <dt className={mobileLabelCls}>Members</dt>
                        <dd className={`mt-0.5 ${mobileValueCls}`}>{memberCount || "—"}</dd>
                      </div>
                      <div className="col-span-2 rounded-lg bg-[#F9FAFB] px-2.5 py-2">
                        <dt className={mobileLabelCls}>Joined on</dt>
                        <dd className={`mt-0.5 ${mobileValueCls}`}>
                          {formatJoinedDate(team.joined_date)}
                        </dd>
                      </div>
                    </dl>

                    <Link
                      href={userMyTeamHref(orgId, teamId)}
                      className={`mt-4 ${mobileActionPrimaryBtnCls(true)} !min-h-[40px] !rounded-lg !text-[13px] !font-semibold lg:!rounded-xl`}
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

function patchEmployeeUserImage(
  prev: EmployeeDashboardResponse | null,
  user_image: string,
): EmployeeDashboardResponse | null {
  if (!prev) return prev;
  const merge = (
    emp: EmployeeDashboardResponse["employee"] | undefined,
  ) => (emp ? { ...emp, user_image } : emp);
  return {
    ...prev,
    employee: merge(prev.employee),
    employees: merge(prev.employees),
  };
}

function ProfilePhotoZoomModal({
  open,
  imageUrl,
  alt,
  onClose,
}: {
  open: boolean;
  imageUrl: string;
  alt: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#111B21]/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-photo-zoom-title"
    >
      <button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label="Close profile photo"
      />
      <div className="relative z-[1] w-full max-w-sm sm:max-w-md">
        <button
          type="button"
          onClick={onClose}
          className="absolute -right-1 -top-1 z-[2] flex h-9 w-9 items-center justify-center rounded-full border border-[#E4E7EC] bg-white text-[#1F2937] shadow-lg transition hover:bg-[#F5F7FA] active:scale-95"
          aria-label="Close"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={alt}
          className="max-h-[min(78vh,560px)] w-full rounded-xl bg-white object-contain shadow-2xl ring-1 ring-[#E4E7EC]"
        />
        <p
          id="profile-photo-zoom-title"
          className="mt-2.5 text-center text-[13px] font-medium text-white"
        >
          {alt}
        </p>
      </div>
    </div>
  );
}

function ProfilePhotoWithEdit({
  imageUrl,
  displayName,
  alt,
  size = "md",
  uploading,
  onImageClick,
  onEditClick,
}: {
  imageUrl: string | null;
  displayName: string;
  alt: string;
  size?: "sm" | "md" | "lg";
  uploading?: boolean;
  onImageClick: () => void;
  onEditClick: () => void;
}) {
  const box =
    size === "lg" ? "h-20 w-20" : size === "sm" ? "h-11 w-11" : "h-14 w-14";
  const editBtn =
    size === "lg"
      ? "h-8 w-8 -bottom-0.5 -right-0.5"
      : size === "sm"
        ? "h-6 w-6 -bottom-0.5 -right-0.5"
        : "h-7 w-7 -bottom-1 -right-1";
  const textSize =
    size === "lg" ? "text-lg" : size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className={`relative shrink-0 ${box}`}>
      <button
        type="button"
        onClick={onImageClick}
        disabled={!imageUrl}
        className={`${box} flex items-center justify-center overflow-hidden rounded-xl ring-1 ring-[#E4E7EC] transition active:opacity-90 disabled:cursor-default ${!imageUrl ? userColorClass(displayName) : ""}`}
        aria-label={
          imageUrl ? `View ${alt} profile photo` : `${alt} profile initials`
        }
      >
        {imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className={`font-semibold ${textSize}`}>{userInitials(displayName)}</span>
        )}
      </button>
      <button
        type="button"
        onClick={onEditClick}
        disabled={uploading}
        className={`absolute ${editBtn} flex items-center justify-center rounded-full border-2 border-white bg-[#008CD3] text-white shadow-md transition hover:bg-[#0070AA] disabled:opacity-60`}
        aria-label="Update profile photo"
      >
        {uploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <Pencil className="h-3.5 w-3.5" aria-hidden />
        )}
      </button>
    </div>
  );
}

function Home() {
  const params = useParams();
  const orgIdParam = params?.org_id;
  const orgId = Number(orgIdParam);
  const bootCache = getBootstrappedHomeCache(orgId);

  const [loading, setLoading] = useState(bootCache == null);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EmployeeDashboardResponse | null>(
    (bootCache?.data as EmployeeDashboardResponse | undefined) ?? null,
  );
  const [addresses, setAddresses] = useState<UserAddressRow[]>(
    (bootCache?.addresses as UserAddressRow[] | undefined) ?? [],
  );
  const [addressesError, setAddressesError] = useState<string | null>(
    bootCache?.addressesError ?? null,
  );
  const [checkInSubmitting, setCheckInSubmitting] = useState(false);
  const [checkOutSubmitting, setCheckOutSubmitting] = useState(false);
  const [logSubmitting, setLogSubmitting] = useState(false);
  const [logSuccessMessage, setLogSuccessMessage] = useState<string | null>(null);
  const [attendanceActionError, setAttendanceActionError] = useState<
    string | null
  >(null);
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);
  const [profilePhotoZoomOpen, setProfilePhotoZoomOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const [mobileMainTab, setMobileMainTab] = useState<"today" | "profile" | "overview">("today");
  const [refreshing, setRefreshing] = useState(false);
  const profileFileInputRef = useRef<HTMLInputElement>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(
    null,
  );
  const [profileImageUploading, setProfileImageUploading] = useState(false);
  const [profileImageError, setProfileImageError] = useState<string | null>(null);
  const [profileImageSuccess, setProfileImageSuccess] = useState<string | null>(
    null,
  );
  const [handoverPendingCount, setHandoverPendingCount] = useState(
    bootCache?.handoverPendingCount ?? 0,
  );

  const handoverHref =
    orgIdParam != null && String(orgIdParam) !== ""
      ? `/user-dashboard/${encodeURIComponent(String(orgIdParam))}/asset-handover`
      : "#";

  const loadDashboardData = useCallback(
    async (forceRefresh = false) => {
      await Promise.resolve();
      if (!orgId || Number.isNaN(orgId)) {
        setError("Invalid organization.");
        setLoading(false);
        return;
      }
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Not signed in.");
        setLoading(false);
        return;
      }

      if (!forceRefresh) {
        const cached = getBootstrappedHomeCache(orgId);
        if (cached) {
          setData(cached.data as EmployeeDashboardResponse);
          setAddresses(cached.addresses as UserAddressRow[]);
          setAddressesError(cached.addressesError);
          setHandoverPendingCount(cached.handoverPendingCount ?? 0);
          setError(null);
          setLoading(false);
          setRefreshing(false);
          return;
        }
      } else {
        clearEmployeeDashboardHomeCache(orgId);
      }

      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      let nextData: EmployeeDashboardResponse | null = null;
      let nextAddresses: UserAddressRow[] = [];
      let nextAddressesError: string | null = null;
      let nextHandoverCount = 0;

      try {
        const q = encodeURIComponent(String(orgId));
        const [dashboardRes, handoverResult] = await Promise.all([
          fetch(`${API_URL}/api/employees/get-employees-full-information?org_id=${q}`, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetchHandoverAssignedToMe(token, orgId).catch(() => null),
        ]);

        const result = (await dashboardRes.json()) as EmployeeDashboardResponse;
        if (!dashboardRes.ok) {
          throw new Error(result.message || "Could not load employee information");
        }

        nextData = result;
        setData(result);


    
        if (handoverResult) {
          nextHandoverCount = countPendingHandoverItems(handoverResult);
          setHandoverPendingCount(nextHandoverCount);
        } else {
          setHandoverPendingCount(0);
        }

        const employee = result.employee ?? result.employees;
        const employeeId = employee?.id;
        if (employeeId != null) {
          setAddressesError(null);
          try {
            const addressRes = await fetch(
              `${API_URL}/api/user/get-user-address/${q}/${encodeURIComponent(String(employeeId))}`,
              {
                method: "GET",
                headers: { Authorization: `Bearer ${token}` },
              },
            );
            const addressResult = (await addressRes.json()) as {
              data?: UserAddressRow[];
              message?: string;
            };
            if (!addressRes.ok) {
              throw new Error(addressResult.message || "Could not load employee addresses");
            }
            nextAddresses = Array.isArray(addressResult.data) ? addressResult.data : [];
            setAddresses(nextAddresses);
          } catch (addressError) {
            nextAddresses = [];
            nextAddressesError =
              addressError instanceof Error
                ? addressError.message
                : "Could not load employee addresses";
            setAddresses([]);
            setAddressesError(nextAddressesError);
          }
        } else {
          setAddresses([]);
          setAddressesError(null);
        }

        writeEmployeeDashboardHomeCache(orgId, {
          data: result,
          addresses: nextAddresses,
          addressesError: nextAddressesError,
          handoverPendingCount: nextHandoverCount,
        });
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Could not load employee information",
        );
        setData(null);
        setAddresses([]);
        setHandoverPendingCount(0);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orgId],
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      void loadDashboardData();
    }, 0);
    return () => window.clearTimeout(t);
  }, [loadDashboardData]);

  useEffect(() => {
    if (loading || error || !data || !orgId || Number.isNaN(orgId)) return;
    writeEmployeeDashboardHomeCache(orgId, {
      data,
      addresses,
      addressesError,
      handoverPendingCount,
    });
  }, [loading, error, data, addresses, addressesError, handoverPendingCount, orgId]);

  const emp = data?.employee ?? data?.employees;
  const owner = data?.owner;
  const org = data?.organization;
  const attendanceHistory = data?.attendance_history;

  const now = new Date();
  const todayYmd = getTodayLocalYmd(now);

  const historyMap = useMemo(
    () => historyByLocalYmd(attendanceHistory),
    [attendanceHistory],
  );
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
    : formatMinutesAsHours(todayRecord?.working_time);

  const todayLog = hasCheckedInToday
    ? formatAttendanceLogLocal(todayRecord?.check_in)
    : "—";
  const checkOutTime = hasCheckedOutToday
    ? formatAttendanceTimeLocal(todayRecord?.check_out)
    : "—";
  const checkInTime = hasCheckedInToday
    ? formatAttendanceTimeLocal(todayRecord?.check_in)
    : null;
  const shiftLabel = emp?.user_shift_name?.trim() || "Shift not assigned";

  const attendanceStatusRaw = todayRecord?.attendance_status;
  const attendanceStatus = String(attendanceStatusRaw || "—").toLowerCase();

  const attendanceDays = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - idx));
    const day = d
      .toLocaleDateString(undefined, { weekday: "short" })
      .slice(0, 1);
    const dateNum = String(d.getDate());
    const ymd = getLocalYmdFromDate(d);
    const active = ymd === todayYmd;
    const row = historyMap.get(ymd);
    const visual = getAttendanceDayVisual(row?.attendance_status);
    return { day, dateNum, ymd, active, visual };
  });

  const storedProfileImage =
    emp?.user_image != null && String(emp.user_image).trim() !== ""
      ? String(emp.user_image).trim()
      : null;
  const profileImageUrl = profilePhotoPreview ?? storedProfileImage ?? null;
  const hasProfileImage = profileImageUrl != null;

  useEffect(() => {
    return () => {
      if (profilePhotoPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(profilePhotoPreview);
      }
    };
  }, [profilePhotoPreview]);

  const openProfileImagePicker = useCallback(() => {
    profileFileInputRef.current?.click();
  }, []);

  const openProfilePhotoZoom = useCallback(() => {
    if (!profileImageUrl) return;
    setProfilePhotoZoomOpen(true);
  }, [profileImageUrl]);

  const handleProfileImagePick = useCallback(
    async (file: File | null) => {
      if (!file) return;

      setProfileImageError(null);
      setProfileImageSuccess(null);

      if (!file.type.startsWith("image/")) {
        setProfileImageError("Please choose an image file (JPG, PNG, or WebP).");
        return;
      }
      if (file.size > MAX_PROFILE_IMAGE_BYTES) {
        setProfileImageError("Image must be 5 MB or smaller.");
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        setProfileImageError("Not signed in.");
        return;
      }

      const localPreview = URL.createObjectURL(file);
      setProfilePhotoPreview((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return localPreview;
      });

      setProfileImageUploading(true);
      try {
        const result = await updateMyProfileImage(token, file);
        const newUrl =
          result.user_image != null && String(result.user_image).trim() !== ""
            ? String(result.user_image).trim()
            : null;

        if (!newUrl) {
          throw new Error("Server did not return an image URL.");
        }

        setData((prev) => patchEmployeeUserImage(prev, newUrl));
        setProfilePhotoPreview((prev) => {
          if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
          return newUrl;
        });

        setProfileImageSuccess(
          result.message || "Profile photo updated successfully.",
        );
      } catch (e) {
        setProfilePhotoPreview((prev) => {
          if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
          return storedProfileImage;
        });
        setProfileImageError(
          e instanceof Error ? e.message : "Could not update profile photo.",
        );
      } finally {
        setProfileImageUploading(false);
      }
    },
    [orgId, storedProfileImage],
  );

  const employeeName = emp?.user_name || "Employee";
  const employeeCode =
    emp?.id != null ? `#E-${String(emp.id).padStart(4, "0")}` : "—";
  const emergency = emp?.user_emergency_contact || "+91-9220516777";
  const roleName = emp?.user_role_name || "—";
  const managerName = owner?.user_name || "—";
  const jobType = emp?.is_night_shift ? "NIGHT SHIFT" : "DAY SHIFT";
  const shiftRange =
    emp?.user_shift_start_time && emp?.user_shift_end_time
      ? `${String(emp.user_shift_start_time).slice(0, 5)} - ${String(emp.user_shift_end_time).slice(0, 5)}`
      : "Not assigned";
  const lateAfter = emp?.mark_attendance_late_after
    ? String(emp.mark_attendance_late_after).slice(0, 5)
    : "—";

  const employeeLeaveBalances = useMemo(
    () => data?.employee_leave_balances ?? [],
    [data?.employee_leave_balances],
  );

  const leaveSummary = useMemo((): LeaveSummary => {
    const hasEmployeeTotals =
      emp?.total_leaves != null ||
      emp?.used_leaves != null ||
      emp?.remaining_leaves != null;
    if (hasEmployeeTotals) {
      return {
        total_leaves: Number(emp?.total_leaves ?? 0),
        used_leaves: Number(emp?.used_leaves ?? 0),
        remaining_leaves: Number(emp?.remaining_leaves ?? 0),
      };
    }
    if (data?.leave_summary) return data.leave_summary;
    return summarizeLeaveBalances(employeeLeaveBalances);
  }, [
    emp?.total_leaves,
    emp?.used_leaves,
    emp?.remaining_leaves,
    data?.leave_summary,
    employeeLeaveBalances,
  ]);

  const leaveBalanceRows = useMemo(
    () => mapEmployeeLeaveBalanceRows(employeeLeaveBalances),
    [employeeLeaveBalances],
  );

  const addressCards = useMemo(
    () =>
      addresses.map((address, index) => {
        const fromVillage = isVillageAddress(address.is_from_village);
        return {
          key: String(address.id ?? `${address.user_id}-${index}`),
          label: `Address ${index + 1}`,
          typeLabel: fromVillage ? "Village" : "City",
          lineOne:
            joinAddressParts([
              address.house_number,
              address.street,
              fromVillage ? address.village_name : null,
            ]) || "Address line not provided",
          lineTwo:
            joinAddressParts([
              address.city,
              address.district,
              address.state,
              address.country,
            ]) || "Location not provided",
          zipCode: address.zip_code || "—",
        };
      }),
    [addresses],
  );

  function getCurrentDateAndTime() {
    const n = new Date();
    const yyyy = n.getFullYear();
    const mm = String(n.getMonth() + 1).padStart(2, "0");
    const dd = String(n.getDate()).padStart(2, "0");
    const hh = String(n.getHours()).padStart(2, "0");
    const min = String(n.getMinutes()).padStart(2, "0");
    return {
      user_date: `${yyyy}-${mm}-${dd}`,
      user_time: `${hh}:${min}`,
    };
  }

  async function markCheckIn() {
    if (!orgId || Number.isNaN(orgId)) return;
    const token = localStorage.getItem("token");
    if (!token) {
      setAttendanceActionError("Not signed in.");
      return;
    }
    const { user_date, user_time } = getCurrentDateAndTime();
    setCheckInSubmitting(true);
    setAttendanceActionError(null);
    setLogSuccessMessage(null);
    try {
      const res = await fetch(
        `${API_URL}/api/employees/mark-attendance-check-in`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ org_id: orgId, user_date, user_time }),
        },
      );
      const result = (await res.json()) as {
        message?: string;
        status?: string;
        attendance_id?: number | string;
      };
      if (!res.ok) throw new Error(result.message || "Could not mark check-in");
      const checkInDateTime = `${user_date} ${user_time}:00`;
      setData((prev) =>
        upsertTodayHistory(prev, todayYmd, {
          id: result.attendance_id,
          check_in: checkInDateTime,
          check_out: null,
          attendance_status: result.status || "present",
          working_time: null,
        }),
      );
      setTick(0);
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
    if (!token) {
      setAttendanceActionError("Not signed in.");
      return;
    }
    const { user_date, user_time } = getCurrentDateAndTime();
    setCheckOutSubmitting(true);
    setAttendanceActionError(null);
    setLogSuccessMessage(null);
    try {
      const res = await fetch(
        `${API_URL}/api/employees/mark-attendance-check-out`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ org_id: orgId, user_date, user_time }),
        },
      );
      const result = (await res.json()) as {
        message?: string;
        finalStatus?: string;
        workingMinutes?: number;
      };
      if (!res.ok)
        throw new Error(result.message || "Could not mark check-out");
      setShowCheckoutConfirm(false);
      const wm = result.workingMinutes;
      const workingDisplay =
        wm != null && !Number.isNaN(Number(wm)) ? Number(wm) / 60 : undefined;
      const patch: Partial<AttendanceHistoryRow> = { check_out: `${user_date} ${user_time}:00` };
      if (result.finalStatus != null)
        patch.attendance_status = result.finalStatus;
      if (workingDisplay !== undefined) patch.working_time = workingDisplay;
      setData((prev) => upsertTodayHistory(prev, todayYmd, patch));
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
    if (!token) {
      setAttendanceActionError("Not signed in.");
      return;
    }
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

  const monthYearLabel = now.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const mobileTabs = [
    { id: "today" as const, label: "Today" },
    { id: "profile" as const, label: "Profile" },
    { id: "overview" as const, label: "Overview" },
  ];

  return (
    <div className="min-h-full bg-[#F5F7FA] lg:bg-transparent">
      <input
        ref={profileFileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const picked = e.target.files?.[0] ?? null;
          void handleProfileImagePick(picked);
          e.target.value = "";
        }}
      />

      {/* Mobile & tablet: compact Zoho-style portal */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-20 border-b border-[#E4E7EC] bg-white shadow-sm">
          <div className="flex items-center gap-2 px-3 py-2.5">
            {loading ? (
              <SkeletonBlock className="h-9 w-9 shrink-0 rounded-md" />
            ) : (
              <button
                type="button"
                onClick={openProfilePhotoZoom}
                disabled={!hasProfileImage}
                className={`relative h-9 w-9 shrink-0 overflow-hidden rounded-md ring-1 ring-[#E4E7EC] transition active:opacity-90 ${!hasProfileImage ? `flex items-center justify-center ${userColorClass(employeeName)}` : ""}`}
                aria-label={
                  hasProfileImage
                    ? `View ${employeeName} profile photo`
                    : `${employeeName} profile initials`
                }
              >
                {hasProfileImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={profileImageUrl!}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-semibold">{userInitials(employeeName)}</span>
                )}
              </button>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[15px] font-semibold text-[#1F2937]">
                {loading ? (
                  <SkeletonBlock className="inline-block h-4 w-28 align-middle" />
                ) : (
                  employeeName
                )}
              </h1>
              <p className="truncate text-[11px] text-[#6B7280]">
                {loading ? (
                  <SkeletonBlock className="mt-1 inline-block h-3 w-36 align-middle" />
                ) : (
                  <>
                    {org?.org_name || "Employee home"} · {employeeCode}
                  </>
                )}
              </p>
              {!loading && !error ? (
                <p className="truncate text-[10px] text-[#9CA3AF]">
                  {shiftLabel} · {shiftRange}
                </p>
              ) : null}
            </div>
            <Link
              href={handoverHref}
              className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#E4E7EC] text-[#008CD3] active:bg-[#F5F7FA]"
              aria-label={
                handoverPendingCount > 0
                  ? `${handoverPendingCount} pending asset handovers`
                  : "Asset handover"
              }
            >
              <Package className="h-4 w-4" aria-hidden />
              {handoverPendingCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E8710A] px-1 text-[9px] font-bold text-white">
                  {handoverPendingCount > 9 ? "9+" : handoverPendingCount}
                </span>
              ) : null}
            </Link>
            <button
              type="button"
              onClick={() => void loadDashboardData(true)}
              disabled={loading || refreshing}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#E4E7EC] text-[#008CD3] active:bg-[#F5F7FA] disabled:opacity-50"
              aria-label="Refresh dashboard"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="px-3 pb-2.5">
            <div className="flex rounded-md bg-[#F5F7FA] p-0.5">
              {mobileTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMobileMainTab(tab.id)}
                  className={`flex flex-1 items-center justify-center rounded-[5px] py-1.5 text-[12px] font-medium transition ${
                    mobileMainTab === tab.id
                      ? "bg-white text-[#008CD3] shadow-sm"
                      : "text-[#6B7280]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && !loading ? (
          <div className="mx-3 mt-2 flex items-start gap-2 rounded-md border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2 text-[12px] text-[#D93025]">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {loading ? <MobileEmployeeHomeSkeleton /> : null}

        {!loading && !error && mobileMainTab === "today" ? (
          <div className={`${mobileSectionGap} ${mobilePagePad} pt-2`}>
            <div className={mobileCardCls}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[13px] font-semibold text-[#1F2937]">This week</p>
                  <p className={mobileCaptionCls}>
                    Tap a day for status · today highlighted
                  </p>
                </div>
                <span className="shrink-0 text-[11px] text-[#6B7280]">{monthYearLabel}</span>
              </div>
              <div className="mt-2 grid grid-cols-7 gap-1">
                {attendanceDays.map((day) => (
                  <div
                    key={day.ymd}
                    className={`rounded-md border p-1 text-center text-[9px] font-medium leading-tight ${day.visual.boxClass} ${
                      day.active ? "ring-1 ring-[#008CD3] ring-offset-1" : ""
                    }`}
                    title={day.visual.meaning}
                  >
                    <p className="opacity-90">{day.day}</p>
                    <p className="text-[11px] font-semibold">{day.dateNum}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className={mobileCardCls}>
                <p className={mobileLabelCls}>
                  {showLiveTimer ? "Working (live)" : "Working hours"}
                </p>
                <p className={`mt-0.5 ${mobileStatValueCls} text-[#008CD3]`}>
                  {String(workingHoursDisplay)}
                </p>
                {showLiveTimer && checkInTime ? (
                  <p className={`mt-0.5 ${mobileCaptionCls}`}>Since {checkInTime}</p>
                ) : null}
              </div>
              <div className={mobileCardCls}>
                <p className={mobileLabelCls}>Status</p>
                <p className={`mt-0.5 capitalize ${mobileValueCls}`}>
                  {attendanceStatus === "—"
                    ? "—"
                    : attendanceStatus.replace(/_/g, " ")}
                </p>
                {checkInTime ? (
                  <p className={`mt-0.5 ${mobileCaptionCls}`}>In at {checkInTime}</p>
                ) : (
                  <p className={`mt-0.5 ${mobileCaptionCls}`}>Not checked in</p>
                )}
              </div>
              <div className={mobileCardCls}>
                <p className={mobileLabelCls}>Check out</p>
                <p className={`mt-0.5 ${mobileValueCls}`}>{checkOutTime}</p>
              </div>
              <div className={mobileCardCls}>
                <p className={mobileLabelCls}>Late after</p>
                <p className={`mt-0.5 font-semibold text-[#E8710A] ${mobileStatValueCls}`}>
                  {lateAfter}
                </p>
                <p className={`mt-0.5 ${mobileCaptionCls}`}>{shiftRange}</p>
              </div>
            </div>

            <div className={mobileCardCls}>
              <p className={mobileLabelCls}>Today log</p>
              <p className={`mt-0.5 text-[12px] leading-snug text-[#1F2937]`}>{todayLog}</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => void markCheckIn()}
                  disabled={hasCheckedInToday || checkInSubmitting}
                  className={mobileActionPrimaryBtnCls()}
                >
                  {checkInSubmitting ? "Marking…" : "Check in"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCheckoutConfirm(true)}
                  disabled={hasCheckedOutToday || checkOutSubmitting}
                  className={mobileActionDangerBtnCls()}
                >
                  {hasCheckedOutToday
                    ? "Checked out"
                    : checkOutSubmitting
                      ? "Processing…"
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
                  className={mobileActionSecondaryBtnCls()}
                  title="Log stepping out / back in (washroom, errand, etc.)"
                >
                  {logSubmitting ? "Saving…" : "Mark log"}
                </button>
              </div>
              <p className={`mt-1.5 ${mobileCaptionCls}`}>
                Mark log for short breaks while still on the clock (washroom, errand, etc.).
              </p>
            </div>

            {logSuccessMessage ? (
              <div className="rounded-md border border-[#C8E6C9] bg-[#E6F4EA] px-3 py-2 text-[12px] text-[#0F9D58]">
                {logSuccessMessage}
              </div>
            ) : null}
            {attendanceActionError ? (
              <div className="flex items-start gap-2 rounded-md border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2 text-[12px] text-[#D93025]">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{attendanceActionError}</span>
              </div>
            ) : null}

            <div className="rounded-md border border-[#E4E7EC] bg-[#E8F4FB] px-3 py-2.5">
              <div className="flex gap-2">
                <Info className="h-4 w-4 shrink-0 text-[#008CD3]" />
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-[#1F2937]">Quick guide</p>
                  <p className={`mt-0.5 ${mobileCaptionCls}`}>
                    Green = full day · amber = partial · orange = late · gray = no record.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {!loading && !error && mobileMainTab === "profile" ? (
          <div className={`${mobileSectionGap} ${mobilePagePad} pt-2`}>
            <div className={mobileCardCls}>
              <div className="flex items-start gap-2.5">
                <ProfilePhotoWithEdit
                  imageUrl={profileImageUrl}
                  displayName={employeeName}
                  alt={employeeName}
                  size="sm"
                  uploading={profileImageUploading}
                  onImageClick={openProfilePhotoZoom}
                  onEditClick={openProfileImagePicker}
                />
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-[#1F2937]">{employeeName}</p>
                  <p className="text-[12px] text-[#6B7280]">{employeeCode}</p>
                  <p className="mt-0.5 text-[11px] text-[#9CA3AF]">{roleName}</p>
                  <p className={`mt-1 ${mobileCaptionCls}`}>
                    {hasProfileImage
                      ? "Tap photo to enlarge · pencil to update image."
                      : "Initials shown until you upload a photo · pencil to update."}
                  </p>
                </div>
              </div>
              {profileImageSuccess ? (
                <p className="mt-2 text-[12px] text-[#0F9D58]">{profileImageSuccess}</p>
              ) : null}
              {profileImageError ? (
                <p className="mt-2 text-[12px] text-[#D93025]">{profileImageError}</p>
              ) : null}
            </div>

            <div>
              <p className={`mb-1.5 px-0.5 ${mobileLabelCls}`}>Contact & organization</p>
              <ul className="divide-y divide-[#E4E7EC] rounded-lg border border-[#E4E7EC] bg-white shadow-sm">
                <li className="px-3 py-2.5">
                  <p className={mobileLabelCls}>Email</p>
                  <p className={`mt-0.5 ${mobileValueCls}`}>{emp?.user_email || "—"}</p>
                </li>
                <li className="px-3 py-2.5">
                  <p className={mobileLabelCls}>Phone</p>
                  <p className={`mt-0.5 ${mobileValueCls}`}>{emp?.user_phone || "—"}</p>
                </li>
                <li className="px-3 py-2.5">
                  <p className={mobileLabelCls}>Emergency</p>
                  <p className={`mt-0.5 ${mobileValueCls}`}>{emergency}</p>
                </li>
                <li className="px-3 py-2.5">
                  <p className={mobileLabelCls}>Organization</p>
                  <p className={`mt-0.5 ${mobileValueCls}`}>{org?.org_name || "—"}</p>
                </li>
              </ul>
            </div>

            <div className="overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-[#E4E7EC] px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-[#008CD3]" />
                  <p className="text-[13px] font-semibold text-[#1F2937]">Saved addresses</p>
                </div>
                <span className="rounded-full bg-[#F5F7FA] px-1.5 py-0.5 text-[10px] font-semibold text-[#6B7280]">
                  {addresses.length}
                </span>
              </div>
              {loading ? (
                <p className="px-3 py-4 text-center text-[12px] text-[#6B7280]">Loading addresses…</p>
              ) : null}
              {addressesError ? (
                <p className="px-3 py-3 text-[12px] text-[#D93025]">{addressesError}</p>
              ) : null}
              {!loading && !addressesError && addressCards.length === 0 ? (
                <p className="px-3 py-4 text-center text-[12px] text-[#6B7280]">
                  No address added yet.
                </p>
              ) : null}
              {!loading && !addressesError && addressCards.length > 0 ? (
                <ul className="divide-y divide-[#E4E7EC]">
                  {addressCards.map((address) => (
                    <li key={address.key} className="px-3 py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13px] font-medium text-[#1F2937]">{address.label}</p>
                        <span className="rounded-full bg-[#F5F7FA] px-1.5 py-0.5 text-[10px] font-medium text-[#6B7280]">
                          {address.typeLabel}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[12px] text-[#6B7280]">{address.lineOne}</p>
                      <p className="text-[11px] text-[#9CA3AF]">{address.lineTwo}</p>
                      <p className="mt-0.5 text-[10px] text-[#9CA3AF]">ZIP: {address.zipCode}</p>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        ) : null}

        {!loading && !error && mobileMainTab === "overview" ? (
          <div className={`${mobileSectionGap} ${mobilePagePad} pt-2`}>
            <div className={mobileCardCls}>
              <div className="flex items-start gap-2">
                <CalendarCheck className="h-3.5 w-3.5 shrink-0 text-[#008CD3]" />
                <div>
                  <p className="text-[13px] font-semibold text-[#1F2937]">Leave balance</p>
                  <p className={mobileCaptionCls}>
                    Assigned types and days remaining for this org.
                  </p>
                </div>
              </div>
              <LeaveBalancesPanel
                summary={leaveSummary}
                rows={leaveBalanceRows}
                variant="mobile"
              />
            </div>

            <div>
              <p className={`mb-1.5 px-0.5 ${mobileLabelCls}`}>Work schedule</p>
              <ul className="divide-y divide-[#E4E7EC] rounded-lg border border-[#E4E7EC] bg-white shadow-sm">
                <li className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <span className="text-[12px] text-[#6B7280]">Current shift</span>
                  <span className="rounded-full bg-[#E6F4EA] px-2 py-0.5 text-[11px] font-medium text-[#0F9D58]">
                    {emp?.user_shift_name || "Not assigned"}
                  </span>
                </li>
                <li className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <span className="text-[12px] text-[#6B7280]">Shift timings</span>
                  <span className={`${mobileValueCls} text-[12px]`}>{shiftRange}</span>
                </li>
                <li className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <span className="text-[12px] text-[#6B7280]">Job type</span>
                  <span className={`${mobileValueCls} text-[12px]`}>{jobType}</span>
                </li>
                <li className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <span className="text-[12px] text-[#6B7280]">Admin</span>
                  <span className={`truncate ${mobileValueCls} text-[12px]`}>{managerName}</span>
                </li>
                <li className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <span className="text-[12px] text-[#6B7280]">Joined</span>
                  <span className={`${mobileValueCls} text-[12px]`}>
                    {emp?.created_at
                      ? new Date(String(emp.created_at)).toLocaleDateString()
                      : "—"}
                  </span>
                </li>
              </ul>
            </div>

            <MyTeamsSection teams={data?.teams ?? []} orgId={orgId} />

            <div className={mobileCardCls}>
              <div className="flex items-start gap-2.5">
                <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#FFF4E5] text-[#E8710A]">
                  <Package className="h-4 w-4" />
                  {handoverPendingCount > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E8710A] px-1 text-[9px] font-bold text-white">
                      {handoverPendingCount > 9 ? "9+" : handoverPendingCount}
                    </span>
                  ) : null}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-[#1F2937]">Asset handover</p>
                  <p className={`mt-0.5 ${mobileCaptionCls}`}>
                    Exit custody items and custom tasks assigned to you.
                  </p>
                  <Link
                    href={handoverHref}
                    className={`mt-2 ${mobileActionPrimaryBtnCls(true)}`}
                  >
                    {handoverPendingCount > 0
                      ? `View handovers (${handoverPendingCount} pending)`
                      : "View handovers"}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : null}

      </div>

      {/* Desktop layout (unchanged) */}
      <section className="hidden min-h-screen flex-1 bg-slate-50 lg:block">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-6 py-4 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div className="relative max-w-[420px] flex-1">
            <MdSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search dashboard..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none ring-indigo-200 placeholder:text-slate-400 focus:ring-2"
            />
          </div>
          <Link
            href={handoverHref}
            className="relative rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label={
              handoverPendingCount > 0
                ? `${handoverPendingCount} pending asset handovers`
                : "Asset handover notifications"
            }
            title="Asset handover"
          >
            <MdNotificationsNone className="text-[22px]" />
            {handoverPendingCount > 0 ? (
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                {handoverPendingCount > 9 ? "9+" : handoverPendingCount}
              </span>
            ) : null}
          </Link>
        </div>
      </header>

      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <MyTeamsSection teams={data?.teams ?? []} orgId={orgId} />
        <div className="mt-3 flex flex-col gap-4 rounded-xl border border-amber-100 bg-gradient-to-r from-amber-50 to-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-600 text-white">
              <Package className="h-5 w-5" aria-hidden />
              {handoverPendingCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {handoverPendingCount > 9 ? "9+" : handoverPendingCount}
                </span>
              ) : null}
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Asset handover</h2>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                Review exit assets and custom tasks assigned to you as custodian.
              </p>
            </div>
          </div>
          <Link
            href={handoverHref}
            className="inline-flex w-full items-center justify-center rounded-lg border border-amber-200 bg-white px-4 py-2.5 text-sm font-semibold text-amber-900 shadow-sm transition hover:bg-amber-50 sm:w-auto"
          >
            {handoverPendingCount > 0
              ? `Open handovers (${handoverPendingCount} pending)`
              : "Open handovers"}
          </Link>
        </div>
      </div>

      <div className="space-y-5 p-6">
        {loading ? <DesktopEmployeeHomeSkeleton /> : null}

        {error && !loading ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {!loading && !error ? (
        <>
        <section className="grid gap-5 xl:grid-cols-[2fr_1fr]">
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start gap-4">
              <ProfilePhotoWithEdit
                imageUrl={profileImageUrl}
                displayName={employeeName}
                alt={employeeName}
                size="lg"
                uploading={profileImageUploading}
                onImageClick={openProfilePhotoZoom}
                onEditClick={openProfileImagePicker}
              />
              <div className="min-w-[240px] flex-1">
                <h2 className="text-lg font-semibold text-slate-800">
                  {employeeName}
                </h2>
                <p className="text-sm text-slate-500">
                  Employee ID: {employeeCode}
                </p>
                {profileImageSuccess ? (
                  <p className="mt-2 text-sm text-emerald-600">{profileImageSuccess}</p>
                ) : null}
                {profileImageError ? (
                  <p className="mt-2 text-sm text-red-600">{profileImageError}</p>
                ) : null}
                <div className="mt-4 grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Saved Addresses
                    </p>
                    <p>{addresses.length} address{addresses.length === 1 ? "" : "es"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Emergency Contact
                    </p>
                    <p>{emergency}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
                    {org?.org_name || "Organization"}
                  </span>
                  <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
                    {emp?.user_email || "Email not available"}
                  </span>
                  <span className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700">
                    {emp?.user_phone || "Phone not available"}
                  </span>
                </div>
              </div>
            </div>
          </article>

          <article className="rounded-xl bg-indigo-700 p-5 text-white shadow-sm">
            <h3 className="text-sm font-semibold">Job Details</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between border-b border-indigo-500/70 pb-2">
                <span className="text-indigo-100">Joined</span>
                <span>
                  {emp?.created_at
                    ? new Date(String(emp.created_at)).toLocaleDateString()
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-indigo-500/70 pb-2">
                <span className="text-indigo-100">Role</span>
                <span>{roleName}</span>
              </div>
              <div className="flex items-center justify-between border-b border-indigo-500/70 pb-2">
                <span className="text-indigo-100">Admin</span>
                <span>{managerName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-indigo-100">Type</span>
                <span className="rounded bg-indigo-500 px-2 py-1 text-xs">
                  {jobType}
                </span>
              </div>
            </div>
          </article>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">
                User Address
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                All saved address records for your employee profile.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {addresses.length} saved
            </span>
          </div>

          {loading ? (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              Loading addresses...
            </div>
          ) : null}

          {addressesError ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {addressesError}
            </div>
          ) : null}

          {!loading && !addressesError && addresses.length === 0 ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              No address has been added to your profile yet.
            </div>
          ) : null}

          {!loading && !addressesError && addressCards.length > 0 ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {addressCards.map((address) => (
                <article
                  key={address.key}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">
                      {address.label}
                    </p>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      {address.typeLabel}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    <p className="font-medium text-slate-800">
                      {address.lineOne}
                    </p>
                    <p>{address.lineTwo}</p>
                    <p>
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        ZIP / PIN:
                      </span>{" "}
                      {address.zipCode}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>

        <section className="grid gap-5 xl:grid-cols-[2fr_1fr]">
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">
                Attendance History
              </h3>
              <span className="text-xs text-slate-500">{monthYearLabel}</span>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {attendanceDays.map((day) => (
                <div
                  key={day.ymd}
                  className={`rounded-lg border p-2 text-center text-[10px] font-medium leading-tight ${day.visual.boxClass} ${
                    day.active ? "ring-2 ring-indigo-400 ring-offset-1" : ""
                  }`}
                  title={day.visual.meaning}
                >
                  <p className="opacity-90">{day.day}</p>
                  <p className="text-sm font-semibold">{day.dateNum}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Color key
              </p>
              <ul className="mt-2 space-y-1.5 text-[11px] text-slate-600">
                {LEGEND_ITEMS.map((item) => (
                  <li key={item.label} className="flex items-start gap-2">
                    <span
                      className={`mt-0.5 h-3 w-3 shrink-0 rounded-sm ${item.sampleClass}`}
                      aria-hidden
                    />
                    <span>
                      <span className="font-semibold text-slate-800">
                        {item.label}:
                      </span>{" "}
                      {item.description}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-5">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  Today Log
                </p>
                <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-800">
                  {todayLog}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void markCheckIn()}
                    disabled={hasCheckedInToday || checkInSubmitting}
                    className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {checkInSubmitting ? "Marking..." : "Check In"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCheckoutConfirm(true)}
                    disabled={hasCheckedOutToday || checkOutSubmitting}
                    className="rounded-md bg-rose-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {hasCheckedOutToday
                      ? "Checked Out"
                      : checkOutSubmitting
                        ? "Processing..."
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
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Log stepping out / back in (washroom, errand, etc.)"
                  >
                    {logSubmitting ? "Saving…" : "Mark log"}
                  </button>
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  {showLiveTimer ? "Working (live)" : "Working Hours"}
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-800">
                  {String(workingHoursDisplay)}
                </p>
                {showLiveTimer ? (
                  <p className="mt-1 text-[10px] text-slate-500">
                    Timer runs until you check out
                  </p>
                ) : null}
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  Late After
                </p>
                <p className="mt-1 text-lg font-semibold text-rose-500">
                  {lateAfter}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  Check Out Time
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-800">
                  {checkOutTime}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  Attendance Status
                </p>
                <p
                  className={`mt-1 text-lg font-semibold ${
                    attendanceStatus.includes("absent")
                      ? "text-red-600"
                      : attendanceStatus.includes("half_day")
                        ? "text-pink-600"
                        : attendanceStatus.includes("short_leave")
                          ? "text-rose-900"
                          : attendanceStatus.includes("full_day")
                            ? "text-emerald-600"
                            : attendanceStatus.startsWith("late")
                              ? "text-orange-600"
                              : attendanceStatus === "—"
                                ? "text-slate-500"
                                : "text-amber-600"
                  }`}
                >
                  {attendanceStatus === "—"
                    ? "—"
                    : attendanceStatus.replace(/_/g, " ").toUpperCase()}
                </p>
              </div>
            </div>
            {logSuccessMessage ? (
              <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                {logSuccessMessage}
              </div>
            ) : null}
            {attendanceActionError && (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {attendanceActionError}
              </div>
            )}
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700">
              Leave Balance
            </h3>
            <LeaveBalancesPanel
              summary={leaveSummary}
              rows={leaveBalanceRows}
              variant="desktop"
            />
            <div className="mt-4 space-y-2 text-xs text-slate-600">
              <div className="flex items-center justify-between rounded-md bg-slate-50 p-2">
                <span>Current Shift</span>
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  {emp?.user_shift_name || "NOT ASSIGNED"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-md bg-slate-50 p-2">
                <span>Shift Timings</span>
                <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                  {shiftRange}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-md bg-slate-50 p-2">
                <span>Owner</span>
                <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700">
                  {owner?.user_email || "—"}
                </span>
              </div>
            </div>
          </article>
        </section>
        </>
        ) : null}
      </div>
      </section>
      <ProfilePhotoZoomModal
        open={profilePhotoZoomOpen && hasProfileImage}
        imageUrl={profileImageUrl ?? ""}
        alt={employeeName}
        onClose={() => setProfilePhotoZoomOpen(false)}
      />

      {showCheckoutConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#1F2937]/40 p-0 backdrop-blur-[1px] sm:items-center sm:bg-slate-900/50 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0 sm:bg-slate-900/50 sm:backdrop-blur-sm"
            onClick={() => !checkOutSubmitting && setShowCheckoutConfirm(false)}
          />
          <div className="relative w-full max-w-sm overflow-hidden rounded-t-2xl border border-[#E4E7EC] bg-white p-4 shadow-xl sm:rounded-xl sm:border-slate-200 sm:p-5">
            <h3 className="text-[15px] font-semibold text-[#1F2937] sm:text-base sm:text-slate-800">
              Confirm check out
            </h3>
            <p className="mt-1.5 text-[12px] text-[#6B7280] sm:mt-2 sm:text-sm sm:text-slate-600">
              End your work day? Working time will be calculated from check-in.
            </p>
            <div className="mt-3 flex flex-col-reverse gap-1.5 sm:mt-4 sm:flex-row sm:justify-end sm:gap-2">
              <button
                type="button"
                onClick={() => setShowCheckoutConfirm(false)}
                disabled={checkOutSubmitting}
                className={`${mobileActionSecondaryBtnCls(true)} sm:min-h-[44px] sm:rounded-lg sm:px-4 sm:py-2.5 sm:text-[14px]`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void markCheckOut()}
                disabled={checkOutSubmitting}
                className={`${mobileActionDangerBtnCls(true)} sm:min-h-[44px] sm:rounded-lg sm:px-4 sm:py-2.5 sm:text-[14px]`}
              >
                {checkOutSubmitting ? "Confirming…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
