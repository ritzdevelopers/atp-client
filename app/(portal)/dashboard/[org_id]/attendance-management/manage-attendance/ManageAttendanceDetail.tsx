"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import DailyHoursRechartsChart from "./DailyHoursRechartsChart";
import MonthlyActivityRechartsChart from "./MonthlyActivityRechartsChart";
import {
  ChevronLeft,
  RefreshCw,
  Loader2,
  AlertCircle,
  User,
  ClipboardList,
  BarChart3,
  CalendarDays,
  Clock,
  TrendingUp,
  Download,
} from "lucide-react";
import ExportAttendanceHistoryModal from "@/components/portal-dashboard/attendance/ExportAttendanceHistoryModal";
import AttendanceRulesNotice from "@/components/portal-dashboard/attendance/AttendanceRulesNotice";
import type { EmployeeAttendanceRow } from "@/services/attendanceHistory";
import {
  buildMonthAttendanceView,
  calendarHeatmapClass,
  formatCalculatedStatusLabel,
  type CalculatedAttendanceStatus,
} from "@/lib/attendanceRules";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type AttendanceDetailRow = {
  user_id?: number | string;
  attendance_id?: number | string;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  user_role_name?: string;
  emp_code?: string;
  attendance_history?: string;
  attendance_date?: string;
  check_in?: string;
  check_out?: string;
  attendance_status?: string;
  working_time?: string | number;
  joining_date?: string;
};

type AttendanceHistoryScope = "month" | "day";

type AttendanceHistoryQuery = {
  month: number;
  year: number;
  date?: number;
  scope?: AttendanceHistoryScope;
};

type SingleUserAttendanceResponse = {
  success?: boolean;
  data?: AttendanceDetailRow[];
  message?: string;
};

function buildSingleUserHistoryUrl(
  orgId: string,
  employeeId: string,
  query: AttendanceHistoryQuery,
): string {
  const params = new URLSearchParams({
    org_id: orgId,
    employee_id: employeeId,
    month: String(query.month),
    year: String(query.year),
    scope: query.scope || "month",
  });
  if (query.scope === "day" && query.date) {
    params.set("date", String(query.date));
  }
  return `${API_URL}/api/attendance-history/get-single-user-with-attendance-history?${params.toString()}`;
}

function toMonthKey(dateValue: string | undefined): string | null {
  if (!dateValue) return null;
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatDate(dateValue: string | undefined): string {
  if (!dateValue) return "-";
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return String(dateValue);
  const day = d.getDate();
  const month = d.toLocaleDateString(undefined, { month: "short" });
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatTime(dateValue: string | undefined): string {
  if (!dateValue) return "-";
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return String(dateValue);
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}


function getCurrentQueryParts() {
  const now = new Date();
  return {
    date: now.getDate(),
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

function normalizeCalculatedStatus(
  status: string | undefined,
): CalculatedAttendanceStatus | "other" {
  const value = String(status || "").trim().toLowerCase();
  if (!value) return "other";
  if (value === "present_full_day") return "present_full_day";
  if (value === "short_leave") return "short_leave";
  if (value === "half_day") return "half_day";
  if (value === "weekly_off") return "weekly_off";
  if (value === "late") return "late";
  if (value === "absent") return "absent";
  if (value === "present") return "present";
  return "other";
}

function calculatedStatusBadgeClass(status: string | undefined): string {
  const bucket = normalizeCalculatedStatus(status);
  if (bucket === "present" || bucket === "present_full_day") return "bg-emerald-50 text-emerald-700";
  if (bucket === "late") return "bg-amber-50 text-amber-700";
  if (bucket === "absent") return "bg-red-50 text-red-700";
  if (bucket === "half_day") return "bg-violet-50 text-violet-700";
  if (bucket === "short_leave") return "bg-sky-50 text-sky-700";
  if (bucket === "weekly_off") return "bg-slate-100 text-slate-600";
  return "bg-slate-100 text-slate-700";
}

function mobileCalculatedStatusBadgeCls(status: string | undefined): string {
  const bucket = normalizeCalculatedStatus(status);
  if (bucket === "present" || bucket === "present_full_day") return "bg-[#E6F4EA] text-[#0F9D58]";
  if (bucket === "late") return "bg-[#FEF3E6] text-[#E8710A]";
  if (bucket === "absent") return "bg-[#FEE2E2] text-[#DC2626]";
  if (bucket === "half_day") return "bg-[#E8F4FB] text-[#008CD3]";
  if (bucket === "short_leave") return "bg-[#FFF8E1] text-[#F9A825]";
  if (bucket === "weekly_off") return "bg-[#E5E7EB] text-[#6B7280]";
  return "bg-[#F5F7FA] text-[#6B7280]";
}

function calculatedStatusChartColor(status: string | undefined): string {
  const bucket = normalizeCalculatedStatus(status);
  if (bucket === "present") return "#0F9D58";
  if (bucket === "present_full_day") return "#047857";
  if (bucket === "late") return "#E8710A";
  if (bucket === "absent") return "#DC2626";
  if (bucket === "half_day") return "#008CD3";
  if (bucket === "short_leave") return "#F9A825";
  if (bucket === "weekly_off") return "#9CA3AF";
  return "#9CA3AF";
}

function normalizeStatus(
  status: string | undefined,
): "present" | "late" | "leave" | "half_day" | "short_leave" | "other" {
  const value = String(status || "").trim().toLowerCase();
  if (!value) return "other";
  if (value.includes("short") && value.includes("leave")) return "short_leave";
  if (value.includes("half")) return "half_day";
  if (value.includes("late")) return "late";
  if (value.includes("present")) return "present";
  if (value.includes("leave") || value.includes("absent")) return "leave";
  return "other";
}

function statusBadgeClass(status: string | undefined): string {
  const bucket = normalizeStatus(status);
  if (bucket === "present") return "bg-emerald-50 text-emerald-700";
  if (bucket === "late") return "bg-amber-50 text-amber-700";
  if (bucket === "leave") return "bg-rose-50 text-rose-700";
  if (bucket === "half_day") return "bg-violet-50 text-violet-700";
  if (bucket === "short_leave") return "bg-sky-50 text-sky-700";
  return "bg-slate-100 text-slate-700";
}

function formatWorkingTime(minutesValue: string | number | undefined): string {
  if (minutesValue === undefined || minutesValue === null || minutesValue === "") return "-";
  const minutesNum = Number(minutesValue);
  if (Number.isNaN(minutesNum) || minutesNum < 0) return String(minutesValue);
  const hours = Math.floor(minutesNum / 60);
  const minutes = minutesNum % 60;
  return `${hours}h ${minutes}m`;
}

function zohoSelectCls() {
  return "w-full rounded-lg border border-[#E4E7EC] bg-white px-3 py-2.5 text-[15px] text-[#1F2937] outline-none transition focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15 lg:text-sm";
}

function zohoPrimaryBtnCls(full = false) {
  return `inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-[#008CD3] px-4 py-2 text-[14px] font-medium text-white transition active:scale-[0.98] hover:bg-[#0070AA] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full" : ""}`;
}

function zohoSecondaryBtnCls(full = false) {
  return `inline-flex min-h-[40px] items-center justify-center rounded-lg border border-[#E4E7EC] bg-white px-4 py-2 text-[14px] font-medium text-[#1F2937] transition active:scale-[0.98] hover:bg-[#F5F7FA] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full flex-1" : ""}`;
}

function mobileStatusBadgeCls(status: string | undefined): string {
  const bucket = normalizeStatus(status);
  if (bucket === "present") return "bg-[#E6F4EA] text-[#0F9D58]";
  if (bucket === "late") return "bg-[#FEF3E6] text-[#E8710A]";
  if (bucket === "leave") return "bg-[#FCE8E6] text-[#D93025]";
  if (bucket === "half_day") return "bg-[#E8F4FB] text-[#008CD3]";
  if (bucket === "short_leave") return "bg-[#FFF8E1] text-[#F9A825]";
  return "bg-[#F5F7FA] text-[#6B7280]";
}

function formatStatusLabel(status: string | undefined): string {
  const raw = String(status || "").trim();
  if (!raw) return "N/A";
  return raw.replace(/_/g, " ");
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
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function dateBlockFromValue(dateValue: string | undefined) {
  if (!dateValue) return { day: "--", mon: "---" };
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return { day: "--", mon: "---" };
  return {
    day: String(d.getDate()).padStart(2, "0"),
    mon: d.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
  };
}

function workingMinutes(value: string | number | undefined): number {
  const n = Number(value);
  return Number.isNaN(n) || n < 0 ? 0 : n;
}

function statusChartColor(status: string | undefined): string {
  const bucket = normalizeStatus(status);
  if (bucket === "present") return "#0F9D58";
  if (bucket === "late") return "#E8710A";
  if (bucket === "leave") return "#D93025";
  if (bucket === "half_day") return "#008CD3";
  if (bucket === "short_leave") return "#F9A825";
  return "#9CA3AF";
}

function statusHeatmapClass(status: string | undefined): string {
  const bucket = normalizeStatus(status);
  if (bucket === "present") return "bg-[#0F9D58] text-white";
  if (bucket === "late") return "bg-[#E8710A] text-white";
  if (bucket === "leave") return "bg-[#D93025] text-white";
  if (bucket === "half_day") return "bg-[#008CD3] text-white";
  if (bucket === "short_leave") return "bg-[#F9A825] text-white";
  return "bg-[#F1F5F9] text-[#9CA3AF]";
}

function formatMonthYearLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function formatAppliedPeriodLabel(query: AttendanceHistoryQuery): string {
  if (query.scope === "day" && query.date) {
    return new Date(query.year, query.month - 1, query.date).toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  return formatMonthYearLabel(query.year, query.month);
}

function buildInitialAttendanceQuery(
  initialQuery?: Partial<AttendanceHistoryQuery>,
): AttendanceHistoryQuery {
  const now = new Date();
  const scope = initialQuery?.scope === "day" ? "day" : "month";
  return {
    month: initialQuery?.month || now.getMonth() + 1,
    year: initialQuery?.year || now.getFullYear(),
    scope,
    ...(scope === "day" && initialQuery?.date
      ? { date: initialQuery.date }
      : scope === "day"
        ? { date: now.getDate() }
        : {}),
  };
}

function buildConicGradient(
  segments: { count: number; color: string }[],
  total: number,
): string {
  if (total <= 0) return "conic-gradient(#E4E7EC 0% 100%)";
  let acc = 0;
  const parts = segments.map((s) => {
    const pct = (s.count / total) * 100;
    const start = acc;
    acc += pct;
    return `${s.color} ${start}% ${acc}%`;
  });
  return `conic-gradient(${parts.join(", ")})`;
}

type KpiSegment = { key: string; label: string; count: number; color: string };

type KpiStatCardProps = {
  label: string;
  value: number;
  color: string;
  bg: string;
  accent: string;
  share?: number;
};

function KpiStatCard({ label, value, color, bg, accent, share }: KpiStatCardProps) {
  return (
    <div className={`rounded-xl border border-[#E4E7EC] p-4 shadow-sm ${bg}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums sm:text-3xl ${color}`}>{value}</p>
      {share != null && share > 0 ? (
        <div className="mt-2.5">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/70">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${share}%`, backgroundColor: accent }}
            />
          </div>
          <p className="mt-1 text-[11px] font-medium text-[#6B7280]">{share}% of month</p>
        </div>
      ) : null}
    </div>
  );
}

function AttendanceDonutChart({
  segments,
  total,
  centerLabel,
  centerValue,
  size = 140,
}: {
  segments: KpiSegment[];
  total: number;
  centerLabel: string;
  centerValue: string;
  size?: number;
}) {
  const active = segments.filter((s) => s.count > 0);
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <div
          className="h-full w-full rounded-full shadow-inner"
          style={{ background: buildConicGradient(active, total) }}
          aria-hidden
        />
        <div className="absolute inset-[18%] flex flex-col items-center justify-center rounded-full bg-white text-center shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
            {centerLabel}
          </p>
          <p className="text-xl font-bold tabular-nums text-[#1F2937]">{centerValue}</p>
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-2 sm:flex-1">
        {active.map((seg) => (
          <li key={seg.key} className="flex items-center justify-between gap-2 text-[13px]">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: seg.color }}
              />
              <span className="truncate font-medium text-[#1F2937]">{seg.label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-[#6B7280]">
              {seg.count} ({total > 0 ? Math.round((seg.count / total) * 100) : 0}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MonthCalendarHeatmap({
  year,
  month,
  cells,
}: {
  year: number;
  month: number;
  cells: { day: number | null; status?: string; isSunday?: boolean; isWeekend?: boolean }[];
}) {
  const weekdays = ["S", "M", "T", "W", "T", "F", "S"];
  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-[#9CA3AF]">
        {weekdays.map((d, i) => (
          <span key={`${d}-${i}`}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) =>
          cell.day == null ? (
            <div key={`empty-${i}`} className="aspect-square" />
          ) : (
            <div
              key={`day-${cell.day}`}
              title={`Day ${cell.day}: ${formatCalculatedStatusLabel(cell.status)}`}
              className={`flex aspect-square items-center justify-center rounded-md text-[11px] font-semibold tabular-nums ${calendarHeatmapClass(cell.status, cell.isWeekend ?? cell.isSunday)}`}
            >
              {cell.day}
            </div>
          ),
        )}
      </div>
      <p className="mt-3 text-[12px] font-medium text-[#1F2937]">
        {formatMonthYearLabel(year, month)}
      </p>
    </div>
  );
}

function EnhancedStatusBars({
  items,
}: {
  items: { status: string; count: number; percentage: number }[];
}) {
  if (items.length === 0) {
    return <p className="text-[13px] text-[#6B7280]">No status data for this period.</p>;
  }
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.status}>
          <div className="mb-1 flex items-center justify-between gap-2 text-[13px]">
            <span className="flex min-w-0 items-center gap-2 font-medium text-[#1F2937]">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: calculatedStatusChartColor(item.status) }}
              />
              <span className="truncate capitalize">{formatCalculatedStatusLabel(item.status)}</span>
            </span>
            <span className="shrink-0 tabular-nums text-[#6B7280]">
              {item.count} ({item.percentage}%)
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[#F5F7FA]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${item.percentage}%`,
                backgroundColor: calculatedStatusChartColor(item.status),
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function StackedMonthBar({ segments, total }: { segments: KpiSegment[]; total: number }) {
  if (total <= 0) {
    return (
      <div className="h-3 overflow-hidden rounded-full bg-[#F5F7FA]">
        <div className="h-full w-full bg-[#E4E7EC]" />
      </div>
    );
  }
  return (
    <div className="flex h-3 overflow-hidden rounded-full bg-[#F5F7FA]">
      {segments
        .filter((s) => s.count > 0)
        .map((seg) => (
          <div
            key={seg.key}
            className="h-full transition-all duration-500"
            style={{
              width: `${(seg.count / total) * 100}%`,
              backgroundColor: seg.color,
            }}
            title={`${seg.label}: ${seg.count}`}
          />
        ))}
    </div>
  );
}

type MobileLogRowProps = {
  row: AttendanceDetailRow;
  calculatedStatus?: string;
};

function MobileAttendanceLogRow({ row, calculatedStatus }: MobileLogRowProps) {
  const dateValue = row.attendance_date || row.attendance_history;
  const block = dateBlockFromValue(dateValue);
  const displayStatus = calculatedStatus ?? row.attendance_status;
  const statusCls = mobileCalculatedStatusBadgeCls(displayStatus);

  return (
    <li>
      <div className="px-4 py-3.5">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg ${statusCls}`}
          >
            <span className="text-[10px] font-semibold leading-none">{block.mon}</span>
            <span className="text-lg font-bold leading-tight">{block.day}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[15px] font-medium text-[#1F2937]">{formatDate(dateValue)}</p>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${statusCls}`}
              >
                {formatCalculatedStatusLabel(displayStatus)}
              </span>
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[13px] text-[#6B7280]">
              <p>
                <span className="text-[#9CA3AF]">In </span>
                {formatTime(row.check_in)}
              </p>
              <p>
                <span className="text-[#9CA3AF]">Out </span>
                {formatTime(row.check_out)}
              </p>
            </div>
            <p className="mt-1 text-[12px] font-medium text-[#008CD3]">
              {formatWorkingTime(row.working_time)} worked
            </p>
          </div>
        </div>
      </div>
    </li>
  );
}

type ManageAttendanceDetailProps = {
  employeeId: string;
  initialQuery?: Partial<AttendanceHistoryQuery>;
};

function ManageAttendanceDetail({
  employeeId,
  initialQuery,
}: ManageAttendanceDetailProps) {
  const params = useParams();
  const router = useRouter();
  const orgId = String(params?.org_id ?? "");

  const [rows, setRows] = useState<AttendanceDetailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterScope, setFilterScope] = useState<AttendanceHistoryScope>(
    () => buildInitialAttendanceQuery(initialQuery).scope || "month",
  );
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const query = buildInitialAttendanceQuery(initialQuery);
    return `${query.year}-${String(query.month).padStart(2, "0")}`;
  });
  const [selectedDate, setSelectedDate] = useState(() => {
    const query = buildInitialAttendanceQuery(initialQuery);
    return String(query.date ?? new Date().getDate());
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    const query = buildInitialAttendanceQuery(initialQuery);
    return String(query.year);
  });
  const [appliedQuery, setAppliedQuery] = useState<AttendanceHistoryQuery>(() =>
    buildInitialAttendanceQuery(initialQuery),
  );
  const [mobileMainTab, setMobileMainTab] = useState<"log" | "insights" | "overview">("log");
  const [exportOpen, setExportOpen] = useState(false);

  const loadSingleEmployeeHistory = useCallback(
    async (
      isManualRefresh = false,
      queryOverride?: AttendanceHistoryQuery,
    ) => {
      if (!orgId || !employeeId) {
        setError("Invalid organization or employee.");
        setLoading(false);
        return;
      }
      const queryParts = queryOverride ?? appliedQuery;
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Not signed in.");
        setLoading(false);
        return;
      }

      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const res = await fetch(buildSingleUserHistoryUrl(orgId, employeeId, queryParts), {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json()) as SingleUserAttendanceResponse;
        if (!res.ok || data.success === false) {
          throw new Error(data.message || "Could not load attendance history.");
        }
        setRows(Array.isArray(data.data) ? data.data : []);
      } catch (e) {
        setRows([]);
        setError(e instanceof Error ? e.message : "Could not load attendance history.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [appliedQuery, employeeId, orgId],
  );

  useEffect(() => {
    const current = buildInitialAttendanceQuery(initialQuery);
    setAppliedQuery(current);
    setFilterScope(current.scope || "month");
    setSelectedDate(String(current.date ?? new Date().getDate()));
    setSelectedMonth(`${current.year}-${String(current.month).padStart(2, "0")}`);
    setSelectedYear(String(current.year));
    void loadSingleEmployeeHistory(false, current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, orgId, initialQuery?.month, initialQuery?.year, initialQuery?.scope, initialQuery?.date]);

  const selectedMonthValue = useMemo(() => {
    const [year, month] = selectedMonth.split("-");
    return {
      month: Number(month) || getCurrentQueryParts().month,
      year: Number(selectedYear || year) || getCurrentQueryParts().year,
    };
  }, [selectedMonth, selectedYear]);

  const applySelectedQuery = () => {
    const query: AttendanceHistoryQuery = {
      month: selectedMonthValue.month,
      year: selectedMonthValue.year,
      scope: filterScope,
      ...(filterScope === "day"
        ? { date: Number(selectedDate) || undefined }
        : {}),
    };
    setAppliedQuery(query);
    void loadSingleEmployeeHistory(false, query);
  };

  const refreshWithCurrentQuery = () => {
    const now = new Date();
    const current: AttendanceHistoryQuery = {
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      scope: "month",
    };
    setAppliedQuery(current);
    setFilterScope("month");
    setSelectedDate(String(now.getDate()));
    setSelectedMonth(`${current.year}-${String(current.month).padStart(2, "0")}`);
    setSelectedYear(String(current.year));
    void loadSingleEmployeeHistory(true, current);
  };

  const profile = rows[0];

  const attendanceRows = useMemo(
    () => rows.filter((row) => Boolean(row.attendance_date || row.attendance_history)),
    [rows],
  );

  const monthAttendance = useMemo(
    () =>
      buildMonthAttendanceView(
        appliedQuery.year,
        appliedQuery.month,
        attendanceRows,
      ),
    [appliedQuery.month, appliedQuery.year, attendanceRows],
  );

  const monthlyKpi = monthAttendance.summary;

  const sortedRows = useMemo(() => {
    return [...attendanceRows].sort((a, b) => {
      const aDate = new Date(a.attendance_date || a.attendance_history || "").getTime();
      const bDate = new Date(b.attendance_date || b.attendance_history || "").getTime();
      return bDate - aDate;
    });
  }, [attendanceRows]);

  const statusDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    for (const day of monthAttendance.days) {
      if (
        day.is_future ||
        day.attendance_status === "weekly_off" ||
        (day.is_weekend && !day.check_in)
      ) {
        continue;
      }
      const status = String(day.attendance_status || "absent");
      counts.set(status, (counts.get(status) || 0) + 1);
    }
    const total = monthAttendance.summary.kpiTotal || 1;
    return Array.from(counts.entries())
      .map(([status, count]) => ({
        status,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [monthAttendance]);

  const monthlyTrend = useMemo(() => {
    const bucket = new Map<string, number>();
    for (const row of attendanceRows) {
      const month = toMonthKey(row.attendance_date || row.attendance_history);
      if (!month) continue;
      bucket.set(month, (bucket.get(month) || 0) + 1);
    }
    return Array.from(bucket.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [attendanceRows]);

  const monthAnalytics = useMemo(() => {
    const appliedMonthKey = `${appliedQuery.year}-${String(appliedQuery.month).padStart(2, "0")}`;
    const dayMap = new Map<string, { minutes: number; status?: string }>();
    let totalMinutes = monthAttendance.summary.totalWorkingMinutes;

    for (const row of attendanceRows) {
      const dateVal = row.attendance_date || row.attendance_history;
      const rowMonth = toMonthKey(dateVal);
      if (!rowMonth || rowMonth !== appliedMonthKey || !dateVal) continue;
      const d = new Date(dateVal);
      if (Number.isNaN(d.getTime())) continue;
      const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const mins = workingMinutes(row.working_time);
      const calculatedStatus = monthAttendance.statusByDate.get(dayKey);
      dayMap.set(dayKey, {
        minutes: mins,
        status: calculatedStatus ?? row.attendance_status,
      });
    }

    const daysInMonth = new Date(appliedQuery.year, appliedQuery.month, 0).getDate();
    const kpiTotal = monthAttendance.summary.kpiTotal;
    const attendanceRate =
      kpiTotal > 0
        ? Math.round((monthlyKpi.daysPresent / kpiTotal) * 100)
        : 0;
    const onTimeRate =
      kpiTotal > 0
        ? Math.round(
            ((monthlyKpi.present + monthlyKpi.presentFullDay) / kpiTotal) * 100,
          )
        : 0;

    const dailyHours = Array.from(dayMap.entries())
      .map(([key, entry]) => {
        const day = Number(key.split("-")[2]);
        return {
          day,
          hours: entry.minutes / 60,
          status: entry.status,
        };
      })
      .sort((a, b) => a.day - b.day);

    const maxDailyHours = dailyHours.reduce((max, p) => Math.max(max, p.hours), 0);

    return {
      totalMinutes,
      totalHours: totalMinutes / 60,
      daysWithRecord: dayMap.size,
      daysInMonth,
      kpiTotal,
      attendanceRate,
      onTimeRate,
      dailyHours,
      maxDailyHours,
      calendarCells: monthAttendance.calendarCells,
      dayMap,
    };
  }, [appliedQuery.month, appliedQuery.year, attendanceRows, monthAttendance, monthlyKpi]);

  const kpiSegments = useMemo<KpiSegment[]>(
    () => {
      const onTimeDays = monthlyKpi.present + monthlyKpi.presentFullDay;
      return [
        ...(onTimeDays > 0
          ? [{ key: "onTime", label: "On-time", count: onTimeDays, color: "#0F9D58" }]
          : []),
        { key: "late", label: "Late", count: monthlyKpi.late, color: "#E8710A" },
        {
          key: "lateDerivedLeaves",
          label: "Leave (from lates)",
          count: monthlyKpi.lateDerivedLeaves,
          color: "#BE185D",
        },
        {
          key: "absent",
          label: "Absent (incl. leave from lates)",
          count: monthlyKpi.totalAbsentWithLateLeaves,
          color: "#DC2626",
        },
        { key: "halfDay", label: "Half day", count: monthlyKpi.halfDay, color: "#008CD3" },
        {
          key: "shortLeave",
          label: "Short leave",
          count: monthlyKpi.shortLeave,
          color: "#F9A825",
        },
      ].filter((s) => s.count > 0);
    },
    [monthlyKpi],
  );

  const sharePct = (count: number) =>
    monthAnalytics.kpiTotal > 0 ? Math.round((count / monthAnalytics.kpiTotal) * 100) : 0;

  const employeeName = profile?.user_name?.trim() || "Employee";
  const employeeCode = profile?.emp_code?.trim() || "";
  const hasProfile = Boolean(profile?.user_name);
  const hasAttendance = attendanceRows.length > 0;

  const exportEmployee = useMemo<EmployeeAttendanceRow | null>(() => {
    if (!employeeId) return null;
    return {
      employee_id: employeeId,
      user_id: profile?.user_id ?? employeeId,
      emp_code: employeeCode,
      biometric_employee_code: employeeCode,
      employee_name: profile?.user_name?.trim() || "Employee",
      employee_email: profile?.user_email || "",
      org_id: orgId,
      employee_designation: profile?.user_role_name || "",
      employee_profile_img: "",
      employee_phone: profile?.user_phone || "",
      attendance_check_in_time: "",
      attendance_check_out_time: "",
      employee_working_hours: 0,
      employee_attendance_status: "",
      attendance_date: "",
      is_active_employee: true,
      total_attendance_days: 0,
      total_present_days: 0,
      total_absent_days: 0,
      total_on_leave_days: 0,
      total_check_in_on_time_days: 0,
      total_check_in_late_days: 0,
    };
  }, [employeeId, orgId, profile]);

  const mobileTabs = [
    { id: "log" as const, label: "Log", count: attendanceRows.length },
    { id: "insights" as const, label: "Insights" },
    { id: "overview" as const, label: "Overview" },
  ];

  return (
    <>
    <div className="min-h-full bg-[#F5F7FA] lg:bg-transparent">
      {/* Mobile & tablet: Zoho admin portal style */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-20 border-b border-[#E4E7EC] bg-white shadow-sm">
          <div className="flex items-center gap-2 px-3 py-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#6B7280] active:bg-[#F5F7FA]"
              aria-label="Go back"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${userColorClass(employeeName)}`}
            >
              {userInitials(employeeName)}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[17px] font-semibold text-[#1F2937]">{employeeName}</h1>
              <p className="truncate text-[13px] text-[#6B7280]">
                {loading
                  ? "Loading…"
                  : hasAttendance
                    ? `${attendanceRows.length} record${attendanceRows.length === 1 ? "" : "s"} · ${profile?.user_role_name || "employee"}${employeeCode ? ` · ID ${employeeCode}` : ""}`
                    : `${profile?.user_role_name || "employee"}${employeeCode ? ` · ID ${employeeCode}` : ""} · no records this period`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setExportOpen(true)}
              disabled={loading || !exportEmployee}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#008CD3] active:bg-[#F5F7FA] disabled:opacity-50"
              aria-label="Export attendance"
            >
              <Download className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={refreshWithCurrentQuery}
              disabled={loading || refreshing}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#008CD3] active:bg-[#F5F7FA] disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="px-4 pb-3">
            <div className="flex rounded-lg bg-[#F5F7FA] p-1">
              {mobileTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMobileMainTab(tab.id)}
                  className={`flex flex-1 items-center justify-center gap-1 rounded-md py-2 text-[12px] font-medium transition sm:text-[13px] ${
                    mobileMainTab === tab.id
                      ? "bg-white text-[#008CD3] shadow-sm"
                      : "text-[#6B7280]"
                  }`}
                >
                  {tab.label}
                  {"count" in tab && tab.count != null ? (
                    <span
                      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] ${
                        mobileMainTab === tab.id
                          ? "bg-[#E8F4FB] text-[#008CD3]"
                          : "bg-[#E4E7EC] text-[#6B7280]"
                      }`}
                    >
                      {tab.count > 99 ? "99+" : tab.count}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          {mobileMainTab === "log" ? (
            <div className="space-y-2.5 border-t border-[#E4E7EC] px-4 py-2.5">
              <div className="flex rounded-lg bg-[#F5F7FA] p-1">
                <button
                  type="button"
                  onClick={() => setFilterScope("month")}
                  className={`flex-1 rounded-md py-2 text-[12px] font-medium transition ${
                    filterScope === "month"
                      ? "bg-white text-[#008CD3] shadow-sm"
                      : "text-[#6B7280]"
                  }`}
                >
                  Full month
                </button>
                <button
                  type="button"
                  onClick={() => setFilterScope("day")}
                  className={`flex-1 rounded-md py-2 text-[12px] font-medium transition ${
                    filterScope === "day"
                      ? "bg-white text-[#008CD3] shadow-sm"
                      : "text-[#6B7280]"
                  }`}
                >
                  Single day
                </button>
              </div>

              {filterScope === "month" ? (
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(e.target.value);
                      const [year] = e.target.value.split("-");
                      if (year) setSelectedYear(year);
                    }}
                    className={zohoSelectCls()}
                    aria-label="Month"
                  />
                  <button
                    type="button"
                    onClick={applySelectedQuery}
                    disabled={loading || refreshing}
                    className={zohoPrimaryBtnCls()}
                  >
                    Apply
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className={zohoSelectCls()}
                      placeholder="Day"
                      aria-label="Day"
                    />
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => {
                        setSelectedMonth(e.target.value);
                        const [year] = e.target.value.split("-");
                        if (year) setSelectedYear(year);
                      }}
                      className={`col-span-2 ${zohoSelectCls()}`}
                      aria-label="Month"
                    />
                  </div>
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <input
                      type="number"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className={zohoSelectCls()}
                      placeholder="Year"
                      aria-label="Year"
                    />
                    <button
                      type="button"
                      onClick={applySelectedQuery}
                      disabled={loading || refreshing}
                      className={zohoPrimaryBtnCls()}
                    >
                      Apply
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="mx-4 mt-3 flex items-start gap-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-4 py-3 text-[14px] text-[#D93025]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-[#6B7280]">
            <Loader2 className="h-9 w-9 animate-spin text-[#008CD3]" />
            <p className="text-[15px]">Loading attendance history…</p>
          </div>
        ) : null}

        {!loading && !error && !hasProfile ? (
          <div className="mx-4 mt-4 rounded-xl border border-dashed border-[#E4E7EC] bg-white px-6 py-16 text-center">
            <ClipboardList className="mx-auto h-10 w-10 text-[#9CA3AF]" />
            <p className="mt-4 text-[17px] font-semibold text-[#1F2937]">No history found</p>
            <p className="mt-2 text-[14px] text-[#6B7280]">
              Try adjusting the date query filters.
            </p>
          </div>
        ) : null}

        {!loading && !error && hasProfile && mobileMainTab === "overview" ? (
          <div className="space-y-3 p-4">
            <div className="overflow-hidden rounded-xl border border-[#E4E7EC] bg-gradient-to-br from-[#008CD3] to-[#0070AA] p-4 text-white shadow-sm">
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/20 text-sm font-semibold text-white backdrop-blur-sm`}
                >
                  {userInitials(employeeName)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-semibold">{employeeName}</p>
                  <p className="truncate text-[13px] text-white/85">
                    {profile?.user_email || "No email"}
                  </p>
                  <p className="mt-1 text-[12px] text-white/70">
                    {profile?.user_role_name || "employee"} · Joined{" "}
                    {formatDate(profile?.joining_date)}
                    {employeeCode ? ` · ID ${employeeCode}` : ""}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/20 pt-4">
                <div className="text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">
                    Attendance
                  </p>
                  <p className="mt-0.5 text-xl font-bold tabular-nums">
                    {monthAnalytics.attendanceRate}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">
                    On time
                  </p>
                  <p className="mt-0.5 text-xl font-bold tabular-nums">
                    {monthAnalytics.onTimeRate}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">
                    Hours
                  </p>
                  <p className="mt-0.5 text-xl font-bold tabular-nums">
                    {monthAnalytics.totalHours.toFixed(1)}h
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-[13px] font-semibold text-[#1F2937]">
                  {formatMonthYearLabel(appliedQuery.year, appliedQuery.month)} breakdown
                </p>
                <span className="rounded-full bg-[#E8F4FB] px-2 py-0.5 text-[11px] font-semibold text-[#008CD3]">
                  {monthAnalytics.daysWithRecord}/{monthAnalytics.daysInMonth} days
                </span>
              </div>
              <StackedMonthBar segments={kpiSegments} total={monthAnalytics.kpiTotal} />
              <div className="mt-4 grid grid-cols-2 gap-3">
                <KpiStatCard
                  label="Present"
                  value={monthlyKpi.daysPresent}
                  color="text-[#0F9D58]"
                  bg="bg-[#E6F4EA]/40"
                  accent="#0F9D58"
                  share={sharePct(monthlyKpi.daysPresent)}
                />
                <KpiStatCard
                  label="Full day"
                  value={monthlyKpi.presentFullDay}
                  color="text-[#047857]"
                  bg="bg-[#D1FAE5]/40"
                  accent="#047857"
                  share={sharePct(monthlyKpi.presentFullDay)}
                />
                <KpiStatCard
                  label="Late"
                  value={monthlyKpi.late}
                  color="text-[#E8710A]"
                  bg="bg-[#FEF3E6]/50"
                  accent="#E8710A"
                  share={sharePct(monthlyKpi.late)}
                />
                <KpiStatCard
                  label="Leave (from lates)"
                  value={monthlyKpi.lateDerivedLeaves}
                  color="text-[#BE185D]"
                  bg="bg-[#FCE7F3]/50"
                  accent="#BE185D"
                  share={sharePct(monthlyKpi.lateDerivedLeaves)}
                />
                <KpiStatCard
                  label="Absent (incl. leave from lates)"
                  value={monthlyKpi.totalAbsentWithLateLeaves}
                  color="text-[#DC2626]"
                  bg="bg-[#FEE2E2]/40"
                  accent="#DC2626"
                  share={sharePct(monthlyKpi.totalAbsentWithLateLeaves)}
                />
                <KpiStatCard
                  label="Half days"
                  value={monthlyKpi.halfDay}
                  color="text-[#008CD3]"
                  bg="bg-[#E8F4FB]/50"
                  accent="#008CD3"
                  share={sharePct(monthlyKpi.halfDay)}
                />
                <KpiStatCard
                  label="Short leave"
                  value={monthlyKpi.shortLeave}
                  color="text-[#F9A825]"
                  bg="bg-[#FFF8E1]/50"
                  accent="#F9A825"
                  share={sharePct(monthlyKpi.shortLeave)}
                />
              </div>
            </div>

            <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#008CD3]" />
                <h2 className="text-[15px] font-semibold text-[#1F2937]">Status mix</h2>
              </div>
              <AttendanceDonutChart
                segments={kpiSegments}
                total={monthAnalytics.kpiTotal}
                centerLabel="Records"
                centerValue={String(monthAnalytics.kpiTotal)}
                size={120}
              />
            </div>

            <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[#008CD3]" />
                <h2 className="text-[15px] font-semibold text-[#1F2937]">Month calendar</h2>
              </div>
              <MonthCalendarHeatmap
                year={appliedQuery.year}
                month={appliedQuery.month}
                cells={monthAnalytics.calendarCells}
              />
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#EEF2F6] pt-3 text-[11px] text-[#6B7280]">
                <p>
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-[#0F9D58]" />
                  Present
                </p>
                <p>
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-[#E8710A]" />
                  Late
                </p>
                <p>
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-[#DC2626]" />
                  Absent
                </p>
                <p>
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-[#E5E7EB]" />
                  Sunday
                </p>
              </div>
            </div>

            <AttendanceRulesNotice lateCount={monthlyKpi.late} className="border-[#E4E7EC] bg-[#E8F4FB]" />
          </div>
        ) : null}

        {!loading && !error && hasAttendance && mobileMainTab === "insights" ? (
          <div className="space-y-3 p-4">
            <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#008CD3]" />
                <h2 className="text-[15px] font-semibold text-[#1F2937]">Daily hours</h2>
              </div>
              <p className="mt-1 text-[13px] text-[#6B7280]">
                {formatMonthYearLabel(appliedQuery.year, appliedQuery.month)} ·{" "}
                {monthAnalytics.totalHours.toFixed(1)}h total
              </p>
              <div className="mt-4">
                <DailyHoursRechartsChart
                  year={appliedQuery.year}
                  month={appliedQuery.month}
                  daysInMonth={monthAnalytics.daysInMonth}
                  points={monthAnalytics.dailyHours}
                />
              </div>
            </div>

            <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[#008CD3]" />
                <h2 className="text-[15px] font-semibold text-[#1F2937]">Status distribution</h2>
              </div>
              <div className="mt-4">
                <EnhancedStatusBars items={statusDistribution} />
              </div>
            </div>

            <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-[#008CD3]" />
                <h2 className="text-[15px] font-semibold text-[#1F2937]">Monthly activity</h2>
              </div>
              <div className="mt-4">
                <MonthlyActivityRechartsChart items={monthlyTrend} />
              </div>
            </div>
          </div>
        ) : null}

        {!loading && !error && hasProfile && !hasAttendance && mobileMainTab === "log" ? (
          <div className="mx-4 mt-4 rounded-xl border border-dashed border-[#E4E7EC] bg-white px-6 py-16 text-center">
            <ClipboardList className="mx-auto h-10 w-10 text-[#9CA3AF]" />
            <p className="mt-4 text-[17px] font-semibold text-[#1F2937]">No history found</p>
            <p className="mt-2 text-[14px] text-[#6B7280]">
              Try adjusting the date query filters.
            </p>
          </div>
        ) : null}

        {!loading && !error && hasAttendance && mobileMainTab === "log" ? (
          <ul className="mt-1 divide-y divide-[#E4E7EC] border-t border-[#E4E7EC] bg-white">
            {sortedRows.map((row, index) => (
              <MobileAttendanceLogRow
                key={`${String(row.attendance_date || row.attendance_history)}-${index}`}
                row={row}
                calculatedStatus={monthAttendance.statusByDate.get(
                  String(row.attendance_date || row.attendance_history || "").slice(0, 10),
                )}
              />
            ))}
          </ul>
        ) : null}
      </div>

      {/* Desktop layout */}
      <section className="hidden space-y-6 p-4 sm:p-6 lg:block">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={() => setExportOpen(true)}
          disabled={loading || !exportEmployee}
          className="inline-flex items-center gap-2 rounded-lg border border-[#008CD3]/30 bg-[#E8F4FB] px-3 py-2 text-sm font-semibold text-[#008CD3] transition hover:bg-[#D6EBF8] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Export Excel
        </button>
      </div>
      <header className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-[#0C123A] via-[#151e59] to-[#008CD3] p-6 text-white shadow-sm sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/70">
          Attendance Management
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          Employee Attendance Analytics
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-white/85">
          Visual breakdown of attendance patterns, working hours, and status distribution for
          management decisions.
        </p>
        {!loading && hasProfile ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">
                Attendance rate
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{monthAnalytics.attendanceRate}%</p>
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">
                On-time rate
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{monthAnalytics.onTimeRate}%</p>
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">
                Total hours
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {monthAnalytics.totalHours.toFixed(1)}h
              </p>
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">
                Days logged
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {monthAnalytics.daysWithRecord}/{monthAnalytics.daysInMonth}
              </p>
            </div>
          </div>
        ) : null}
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-16 text-sm text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-[#008CD3]" />
          Loading attendance history…
        </div>
      ) : null}

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      {!loading && !error && !hasProfile ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">No attendance history found for this employee.</div>
      ) : null}

      {!loading && !error && hasProfile ? (
        <>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <span
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-base font-semibold ${userColorClass(employeeName)}`}
                >
                  {userInitials(employeeName)}
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-[#0C123A]">
                    {profile?.user_name || "Unknown User"}
                  </h2>
                  <p className="text-sm text-slate-600">{profile?.user_email || "No email"}</p>
                  {employeeCode ? (
                    <p className="text-sm font-medium text-[#008CD3]">Employee ID {employeeCode}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                      {profile?.user_role_name || "employee"}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                      Joined {formatDate(profile?.joining_date)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExportOpen(true)}
                  disabled={loading || !exportEmployee}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#008CD3]/30 bg-[#E8F4FB] px-4 py-2 text-sm font-semibold text-[#008CD3] transition hover:bg-[#D6EBF8] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  Export Excel
                </button>
                <button
                  type="button"
                  onClick={refreshWithCurrentQuery}
                  disabled={loading || refreshing}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Refreshing…" : "Refresh"}
              </button>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#0C123A]">Query filters</p>
                <p className="text-xs text-slate-500">
                  Period: {formatAppliedPeriodLabel(appliedQuery)}
                  {appliedQuery.scope === "month" ? " (full month)" : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => setFilterScope("month")}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                      filterScope === "month"
                        ? "bg-white text-[#0C123A] shadow-sm"
                        : "text-slate-600"
                    }`}
                  >
                    Full month
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterScope("day")}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                      filterScope === "day"
                        ? "bg-white text-[#0C123A] shadow-sm"
                        : "text-slate-600"
                    }`}
                  >
                    Single day
                  </button>
                </div>
                {filterScope === "day" ? (
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-20 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-indigo-200 focus:ring-2"
                    placeholder="Date"
                    aria-label="Day"
                  />
                ) : null}
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(e.target.value);
                    const [year] = e.target.value.split("-");
                    if (year) setSelectedYear(year);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-indigo-200 focus:ring-2"
                  aria-label="Month"
                />
                {filterScope === "day" ? (
                  <input
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-indigo-200 focus:ring-2"
                    placeholder="Year"
                    aria-label="Year"
                  />
                ) : null}
                <button
                  type="button"
                  onClick={applySelectedQuery}
                  disabled={loading || refreshing}
                  className="rounded-lg bg-[#0C123A] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#151e59] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Apply Query
                </button>
              </div>
            </div>
            <div className="mb-4">
              <StackedMonthBar segments={kpiSegments} total={monthAnalytics.kpiTotal} />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <KpiStatCard
                label="Present"
                value={monthlyKpi.daysPresent}
                color="text-emerald-700"
                bg="bg-emerald-50/80"
                accent="#0F9D58"
                share={sharePct(monthlyKpi.daysPresent)}
              />
              <KpiStatCard
                label="Full day"
                value={monthlyKpi.presentFullDay}
                color="text-emerald-800"
                bg="bg-emerald-100/80"
                accent="#047857"
                share={sharePct(monthlyKpi.presentFullDay)}
              />
              <KpiStatCard
                label="Late"
                value={monthlyKpi.late}
                color="text-amber-700"
                bg="bg-amber-50/80"
                accent="#E8710A"
                share={sharePct(monthlyKpi.late)}
              />
              <KpiStatCard
                label="Leave (from lates)"
                value={monthlyKpi.lateDerivedLeaves}
                color="text-rose-700"
                bg="bg-rose-50/80"
                accent="#BE185D"
                share={sharePct(monthlyKpi.lateDerivedLeaves)}
              />
              <KpiStatCard
                label="Absent (incl. leave from lates)"
                value={monthlyKpi.totalAbsentWithLateLeaves}
                color="text-red-700"
                bg="bg-red-50/80"
                accent="#DC2626"
                share={sharePct(monthlyKpi.totalAbsentWithLateLeaves)}
              />
              <KpiStatCard
                label="Half days"
                value={monthlyKpi.halfDay}
                color="text-sky-700"
                bg="bg-sky-50/80"
                accent="#008CD3"
                share={sharePct(monthlyKpi.halfDay)}
              />
              <KpiStatCard
                label="Short leave"
                value={monthlyKpi.shortLeave}
                color="text-yellow-700"
                bg="bg-yellow-50/80"
                accent="#F9A825"
                share={sharePct(monthlyKpi.shortLeave)}
              />
            </div>
          </article>

          <AttendanceRulesNotice lateCount={monthlyKpi.late} />

          <article className="grid gap-4 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-1">
              <h3 className="text-sm font-semibold text-[#0C123A]">Status composition</h3>
              <p className="mt-1 text-xs text-slate-500">Share of each attendance type this period.</p>
              <div className="mt-5">
                <AttendanceDonutChart
                  segments={kpiSegments}
                  total={monthAnalytics.kpiTotal}
                  centerLabel="Records"
                  centerValue={String(monthAnalytics.kpiTotal)}
                  size={160}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-[#0C123A]">Daily working hours</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Line trend of recorded hours across the month with average and peak markers.
                  </p>
                </div>
                <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                  {monthAnalytics.totalHours.toFixed(1)}h total
                </span>
              </div>
              <div className="mt-3">
                <DailyHoursRechartsChart
                  year={appliedQuery.year}
                  month={appliedQuery.month}
                  daysInMonth={monthAnalytics.daysInMonth}
                  points={monthAnalytics.dailyHours}
                />
              </div>
            </div>
          </article>

          <article className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-[#0C123A]">Status distribution</h3>
              <p className="mt-1 text-xs text-slate-500">All status values from loaded records.</p>
              <div className="mt-4">
                <EnhancedStatusBars items={statusDistribution} />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-[#0C123A]">Monthly activity trend</h3>
              <p className="mt-1 text-xs text-slate-500">
                Bar chart of attendance records per month with average and month-over-month context.
              </p>
              <div className="mt-5">
                <MonthlyActivityRechartsChart items={monthlyTrend} />
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-[#0C123A]">Month calendar heatmap</h3>
                <p className="text-xs text-slate-500">Color-coded attendance status by day.</p>
              </div>
            </div>
            <div className="max-w-md">
              <MonthCalendarHeatmap
                year={appliedQuery.year}
                month={appliedQuery.month}
                cells={monthAnalytics.calendarCells}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-4 border-t border-slate-100 pt-4 text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-[#0F9D58]" /> Present
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-[#E8710A]" /> Late
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-[#DC2626]" /> Absent
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-[#008CD3]" /> Half day
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-[#F9A825]" /> Short leave
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-[#E5E7EB]" /> Sunday
              </span>
            </div>
          </article>

          <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
              <h3 className="text-sm font-semibold text-[#0C123A]">Attendance log</h3>
              <p className="text-xs text-slate-500">
                {sortedRows.length} record{sortedRows.length === 1 ? "" : "s"} in current query
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Check In</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Check Out</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Working Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {sortedRows.map((row, index) => {
                    const dateKey = String(row.attendance_date || row.attendance_history || "").slice(0, 10);
                    const calculatedStatus = monthAttendance.statusByDate.get(dateKey);
                    return (
                    <tr
                      key={`${String(row.attendance_date || row.attendance_history)}-${index}`}
                      className="transition hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {formatDate(row.attendance_date || row.attendance_history)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatTime(row.check_in)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatTime(row.check_out)}</td>
                      <td className="px-4 py-3 font-medium text-[#008CD3]">
                        {formatWorkingTime(row.working_time)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${calculatedStatusBadgeClass(calculatedStatus)}`}>
                          {formatCalculatedStatusLabel(calculatedStatus)}
                        </span>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </article>
        </>
      ) : null}
    </section>
    </div>

    <ExportAttendanceHistoryModal
      open={exportOpen}
      onClose={() => setExportOpen(false)}
      orgId={orgId}
      employee={exportEmployee}
    />
    </>
  );
}

export default ManageAttendanceDetail;