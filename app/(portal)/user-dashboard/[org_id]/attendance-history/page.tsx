"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  formatAttendanceTimeLocal,
  localYmdFromAttendanceValue,
} from "@/lib/attendanceDates";
import {
  clearOwnAttendanceHistoryCaches,
  readOwnAttendanceHistoryCache,
  shouldRefreshOwnAttendanceHistoryCache,
  stableFilterKey,
  writeOwnAttendanceHistoryCache,
} from "@/lib/employeeManagementCache";
import AttendanceRulesNotice from "@/components/portal-dashboard/attendance/AttendanceRulesNotice";
import {
  calculatedStatusBadgeClass,
  computeMonthAnalytics,
  formatCalculatedStatusLabel,
  mapOwnRowsToHistoryRows,
  matchesCalculatedStatusFilter,
  mobileCalculatedStatusBadgeCls,
} from "@/lib/attendanceMonthAnalytics";
import {
  AttendanceDonutChart,
  EnhancedStatusBars,
  KpiStatCard,
  MonthCalendarHeatmap,
  StackedMonthBar,
} from "@/components/portal-dashboard/attendance/AttendanceAnalyticsCharts";
import DailyHoursRechartsChart from "@/app/(portal)/dashboard/[org_id]/attendance-management/manage-attendance/DailyHoursRechartsChart";
import MonthlyActivityRechartsChart from "@/app/(portal)/dashboard/[org_id]/attendance-management/manage-attendance/MonthlyActivityRechartsChart";
import {
  BarChart3,
  RefreshCw,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  TrendingUp,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type AttendanceRow = {
  attendance_id: number | string;
  date?: string;
  check_in?: string | null;
  check_out?: string | null;
  status?: string | null;
  working_time?: string | number | null;
};

type AttendanceApiResponse = {
  success?: boolean;
  page?: number;
  limit?: number;
  data?: AttendanceRow[];
  message?: string;
};

function toNumberWorkingHours(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n / 60;
}

const PAGE_SIZE = 20;

const MONTH_LABELS = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleDateString(undefined, { month: "long" }),
);

function formatMonthYearLabel(month: string, year: string): string {
  const d = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(d.getTime())) return `${month}/${year}`;
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function shiftMonthYear(month: string, year: string, delta: number): { month: string; year: string } {
  const d = new Date(Number(year), Number(month) - 1 + delta, 1);
  return {
    month: String(d.getMonth() + 1),
    year: String(d.getFullYear()),
  };
}

function zohoSelectCls() {
  return "w-full rounded-lg border border-[#E4E7EC] bg-white px-3 py-2.5 text-[15px] text-[#1F2937] outline-none transition focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15 lg:text-sm";
}

function zohoSecondaryBtnCls(full = false) {
  return `inline-flex min-h-[40px] items-center justify-center rounded-lg border border-[#E4E7EC] bg-white px-4 py-2 text-[14px] font-medium text-[#1F2937] transition active:scale-[0.98] hover:bg-[#F5F7FA] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full flex-1" : ""}`;
}

function mobileStatusBadgeCls(status: string | null | undefined): string {
  return mobileCalculatedStatusBadgeCls(status ?? undefined);
}

type MobileAttendanceRowProps = {
  row: AttendanceRow;
  calculatedStatus?: string;
};

function MobileAttendanceRow({ row, calculatedStatus }: MobileAttendanceRowProps) {
  const dateLabel = localYmdFromAttendanceValue(row.date) || "—";
  const [y, m, d] = dateLabel.split("-");
  const dayNum = d ? String(Number(d)).padStart(2, "0") : "--";
  const monLabel = m
    ? new Date(Number(y), Number(m) - 1, 1)
        .toLocaleDateString(undefined, { month: "short" })
        .toUpperCase()
    : "---";
  const hours = toNumberWorkingHours(row.working_time);
  const displayStatus = calculatedStatus ?? row.status ?? "";
  const statusCls = mobileStatusBadgeCls(displayStatus);

  return (
    <li>
      <div className="px-4 py-3.5">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg ${statusCls}`}
          >
            <span className="text-[10px] font-semibold leading-none">{monLabel}</span>
            <span className="text-lg font-bold leading-tight">{dayNum}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[15px] font-medium text-[#1F2937]">{dateLabel}</p>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${statusCls}`}
              >
                {formatCalculatedStatusLabel(displayStatus)}
              </span>
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[13px] text-[#6B7280]">
              <p>
                <span className="text-[#9CA3AF]">In </span>
                {formatAttendanceTimeLocal(row.check_in)}
              </p>
              <p>
                <span className="text-[#9CA3AF]">Out </span>
                {formatAttendanceTimeLocal(row.check_out)}
              </p>
            </div>
            <p className="mt-1 text-[12px] font-medium tabular-nums text-[#008CD3]">
              {hours.toFixed(2)}h recorded
            </p>
          </div>
        </div>
      </div>
    </li>
  );
}

export default function AttendanceHistoryPage() {
  const params = useParams();
  const orgId = Number(params?.org_id);

  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const limit = 100;

  const historyFilterKey = stableFilterKey({
    month,
    year,
    page,
    limit,
    sort: "DESC",
  });
  const cachedHistory =
    orgId && !Number.isNaN(orgId)
      ? readOwnAttendanceHistoryCache<AttendanceRow>(orgId, historyFilterKey)
      : null;

  const [loading, setLoading] = useState(() => !cachedHistory);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AttendanceRow[]>(() => cachedHistory?.rows ?? []);
  const [meta, setMeta] = useState<{ page: number; limit: number }>(
    () => cachedHistory?.meta ?? { page: 1, limit },
  );
  const [mobileMainTab, setMobileMainTab] = useState<"log" | "calendar" | "overview">("log");

  const monthYear = `${year}-${String(Number(month)).padStart(2, "0")}`;

  const loadHistory = useCallback(
    async (force = false) => {
      if (!orgId || Number.isNaN(orgId)) {
        setError("Invalid organization.");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const filterKey = stableFilterKey({
        month,
        year,
        page,
        limit,
        sort: "DESC",
      });
      const cached = readOwnAttendanceHistoryCache<AttendanceRow>(orgId, filterKey);

      if (cached && !force) {
        setRows(cached.rows);
        setMeta(cached.meta);
        setError(null);
        setLoading(false);
        if (!shouldRefreshOwnAttendanceHistoryCache(orgId, filterKey)) {
          return;
        }
        setRefreshing(true);
      } else {
        if (force) {
          clearOwnAttendanceHistoryCaches(orgId);
        }
        if (force) setRefreshing(true);
        else setLoading(true);
        setError(null);
      }

      const token = localStorage.getItem("token");
      if (!token) {
        setError("Not signed in.");
        setLoading(false);
        setRefreshing(false);
        if (!cached) setRows([]);
        return;
      }

      try {
        const search = new URLSearchParams({
          month: String(month),
          year: String(year),
          page: String(page),
          limit: String(limit),
          sort: "DESC",
        });
        const res = await fetch(
          `${API_URL}/api/attendance-history/get-attendance-history-of-employee?${search.toString()}`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const data = (await res.json()) as AttendanceApiResponse;
        if (!res.ok) throw new Error(data.message || "Could not load attendance history.");
        const nextRows = Array.isArray(data.data) ? data.data : [];
        const nextMeta = {
          page: data.page ?? page,
          limit: data.limit ?? limit,
        };
        setRows(nextRows);
        setMeta(nextMeta);
        writeOwnAttendanceHistoryCache(orgId, filterKey, { rows: nextRows, meta: nextMeta });
      } catch (e) {
        if (!cached || force) {
          setRows([]);
        }
        setError(e instanceof Error ? e.message : "Could not load attendance history.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orgId, month, year, page, limit],
  );

  useEffect(() => {
    void loadHistory(false);
  }, [loadHistory]);

  const historyRows = useMemo(() => mapOwnRowsToHistoryRows(rows), [rows]);
  const yearNum = Number(year);
  const monthNum = Number(month);

  const analytics = useMemo(
    () => computeMonthAnalytics(yearNum, monthNum, historyRows),
    [yearNum, monthNum, historyRows],
  );

  const { monthlyKpi, monthAnalytics, kpiSegments, statusDistribution, monthlyTrend } =
    analytics;

  const sharePct = (count: number) =>
    monthAnalytics.kpiTotal > 0 ? Math.round((count / monthAnalytics.kpiTotal) * 100) : 0;

  const getCalculatedStatus = useCallback(
    (row: AttendanceRow) => {
      const ymd = localYmdFromAttendanceValue(row.date);
      if (!ymd) return row.status ?? "";
      return analytics.monthAttendance.statusByDate.get(ymd) ?? row.status ?? "";
    },
    [analytics.monthAttendance.statusByDate],
  );

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => matchesCalculatedStatusFilter(getCalculatedStatus(row), status)),
    [rows, status, getCalculatedStatus],
  );

  const pagedRows = useMemo(
    () => filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredRows, page],
  );

  const hasNextPage = page * PAGE_SIZE < filteredRows.length;

  const mobileTabs = [
    { id: "log" as const, label: "Log", count: filteredRows.length },
    { id: "calendar" as const, label: "Calendar" },
    { id: "overview" as const, label: "Overview" },
  ];

  return (
    <div className="min-h-full bg-[#F5F7FA] lg:bg-transparent">
      {/* Mobile & tablet: Zoho admin portal style */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-20 border-b border-[#E4E7EC] bg-white shadow-sm">
          <div className="flex items-center gap-2 px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
              <BarChart3 className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[17px] font-semibold text-[#1F2937]">Attendance history</h1>
              <p className="truncate text-[13px] text-[#6B7280]">
                {loading
                  ? "Loading…"
                  : `${filteredRows.length} record${filteredRows.length === 1 ? "" : "s"} · ${formatMonthYearLabel(month, year)} · ${monthAnalytics.attendanceRate}% attendance`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadHistory(true)}
              disabled={loading || refreshing}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#008CD3] active:bg-[#F5F7FA] disabled:opacity-50"
              aria-label="Refresh attendance"
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
              <input
                type="month"
                value={monthYear}
                onChange={(e) => {
                  const [y, m] = e.target.value.split("-");
                  if (y) setYear(y);
                  if (m) setMonth(String(Number(m)));
                  setPage(1);
                }}
                className={zohoSelectCls()}
                aria-label="Select month"
              />
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className={zohoSelectCls()}
              >
                <option value="">All statuses</option>
                <option value="present">Present</option>
                <option value="present_full_day">Full day</option>
                <option value="late">Late</option>
                <option value="absent">Absent</option>
                <option value="half_day">Half day</option>
                <option value="short_leave">Short leave</option>
              </select>
            </div>
          ) : null}
        </div>

        {error && !loading ? (
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

        {!loading && !error && mobileMainTab === "overview" ? (
          <div className="space-y-3 p-4">
            <div className="overflow-hidden rounded-xl border border-[#E4E7EC] bg-gradient-to-br from-[#008CD3] to-[#0070AA] p-4 text-white shadow-sm">
              <div className="grid grid-cols-3 gap-2 border-b border-white/20 pb-4">
                <div className="text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">Attendance</p>
                  <p className="mt-0.5 text-xl font-bold tabular-nums">{monthAnalytics.attendanceRate}%</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">On time</p>
                  <p className="mt-0.5 text-xl font-bold tabular-nums">{monthAnalytics.onTimeRate}%</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">Hours</p>
                  <p className="mt-0.5 text-xl font-bold tabular-nums">{monthAnalytics.totalHours.toFixed(1)}h</p>
                </div>
              </div>
              <p className="mt-3 text-center text-[12px] text-white/80">
                {monthAnalytics.daysWithRecord}/{monthAnalytics.daysInMonth} days logged · calculated from check-in/out rules
              </p>
            </div>

            <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
              <p className="text-[13px] font-semibold text-[#1F2937]">Month breakdown</p>
              <div className="mt-3">
                <StackedMonthBar segments={kpiSegments} total={monthAnalytics.kpiTotal} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <KpiStatCard
                  label="Present"
                  value={monthlyKpi.present}
                  color="text-[#0F9D58]"
                  bg="bg-white"
                  accent="#0F9D58"
                  share={sharePct(monthlyKpi.present)}
                />
                <KpiStatCard
                  label="Full day"
                  value={monthlyKpi.presentFullDay}
                  color="text-[#047857]"
                  bg="bg-white"
                  accent="#047857"
                  share={sharePct(monthlyKpi.presentFullDay)}
                />
                <KpiStatCard
                  label="Late"
                  value={monthlyKpi.late}
                  color="text-[#E8710A]"
                  bg="bg-white"
                  accent="#E8710A"
                  share={sharePct(monthlyKpi.late)}
                />
                <KpiStatCard
                  label="Leave (from lates)"
                  value={monthlyKpi.lateDerivedLeaves}
                  color="text-[#BE185D]"
                  bg="bg-white"
                  accent="#BE185D"
                  share={sharePct(monthlyKpi.lateDerivedLeaves)}
                />
                <KpiStatCard
                  label="Absent (incl. leave from lates)"
                  value={monthlyKpi.totalAbsentWithLateLeaves}
                  color="text-[#DC2626]"
                  bg="bg-white"
                  accent="#DC2626"
                  share={sharePct(monthlyKpi.totalAbsentWithLateLeaves)}
                />
              </div>
            </div>

            <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
              <p className="text-[13px] font-semibold text-[#1F2937]">Status distribution</p>
              <div className="mt-4">
                <AttendanceDonutChart
                  segments={kpiSegments}
                  total={monthAnalytics.kpiTotal}
                  centerLabel="Work days"
                  centerValue={String(monthAnalytics.kpiTotal)}
                  size={120}
                />
              </div>
            </div>

            <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#008CD3]" />
                <p className="text-[13px] font-semibold text-[#1F2937]">Daily working hours</p>
              </div>
              <DailyHoursRechartsChart
                year={yearNum}
                month={monthNum}
                daysInMonth={monthAnalytics.daysInMonth}
                points={monthAnalytics.dailyHours}
              />
            </div>

            <AttendanceRulesNotice lateCount={monthlyKpi.late} />
          </div>
        ) : null}

        {!loading && !error && mobileMainTab === "calendar" ? (
          <div className="space-y-3 p-4">
            <div className="rounded-xl border border-[#E4E7EC] bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-[#E4E7EC] px-4 py-3">
                <div>
                  <p className="text-[15px] font-semibold text-[#1F2937]">
                    {formatMonthYearLabel(month, year)}
                  </p>
                  <p className="text-[13px] text-[#6B7280]">Calculated status · Sat/Sun week off</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const next = shiftMonthYear(month, year, -1);
                      setMonth(next.month);
                      setYear(next.year);
                      setPage(1);
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#6B7280] active:bg-[#F5F7FA]"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = shiftMonthYear(month, year, 1);
                      setMonth(next.month);
                      setYear(next.year);
                      setPage(1);
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#6B7280] active:bg-[#F5F7FA]"
                    aria-label="Next month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="px-4 py-3">
                <MonthCalendarHeatmap
                  year={yearNum}
                  month={monthNum}
                  cells={monthAnalytics.calendarCells}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-[#E4E7EC] px-4 py-3 text-[12px] text-[#6B7280]">
                <p>
                  <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-[#0F9D58]" />
                  Present
                </p>
                <p>
                  <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-[#E8710A]" />
                  Late
                </p>
                <p>
                  <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-[#DC2626]" />
                  Absent
                </p>
                <p>
                  <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-[#008CD3]" />
                  Half day
                </p>
                <p className="col-span-2">
                  <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-[#E5E7EB]" />
                  Sat / Sun off
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {!loading && !error && mobileMainTab === "log" && filteredRows.length === 0 ? (
          <div className="mx-4 mt-4 rounded-xl border border-dashed border-[#E4E7EC] bg-white px-6 py-16 text-center">
            <CalendarDays className="mx-auto h-10 w-10 text-[#9CA3AF]" />
            <p className="mt-4 text-[17px] font-semibold text-[#1F2937]">No records found</p>
            <p className="mt-2 text-[14px] text-[#6B7280]">
              Try another month or status filter.
            </p>
          </div>
        ) : null}

        {!loading && !error && mobileMainTab === "log" && filteredRows.length > 0 ? (
          <>
            <ul className="mt-1 divide-y divide-[#E4E7EC] border-t border-[#E4E7EC] bg-white">
              {pagedRows.map((row) => (
                <MobileAttendanceRow
                  key={String(row.attendance_id)}
                  row={row}
                  calculatedStatus={getCalculatedStatus(row)}
                />
              ))}
            </ul>
            <div className="flex items-center gap-2 border-t border-[#E4E7EC] bg-white px-4 py-3">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={zohoSecondaryBtnCls(true)}
              >
                Previous
              </button>
              <span className="flex flex-1 items-center justify-center text-[13px] font-medium text-[#6B7280]">
                Page {meta.page}
              </span>
              <button
                type="button"
                disabled={!hasNextPage || loading}
                onClick={() => setPage((p) => p + 1)}
                className={zohoSecondaryBtnCls(true)}
              >
                Next
              </button>
            </div>
          </>
        ) : null}
      </div>

      {/* Desktop layout */}
      <section className="hidden w-full max-w-none space-y-6 p-6 lg:block">
        <header className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-[#0C123A] via-[#151e59] to-[#008CD3] p-6 text-white shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/70">My attendance</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Attendance History Analytics</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/85">
            Status is calculated from your check-in and check-out times using company rules — same as admin manage-attendance.
          </p>
          {!loading ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">Attendance rate</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{monthAnalytics.attendanceRate}%</p>
              </div>
              <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">On-time rate</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{monthAnalytics.onTimeRate}%</p>
              </div>
              <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">Total hours</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{monthAnalytics.totalHours.toFixed(1)}h</p>
              </div>
              <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">Days logged</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">
                  {monthAnalytics.daysWithRecord}/{monthAnalytics.daysInMonth}
                </p>
              </div>
            </div>
          ) : null}
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-4">
            <select
              value={month}
              onChange={(e) => {
                setMonth(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {MONTH_LABELS.map((label, i) => (
                <option key={i + 1} value={String(i + 1)}>
                  {label}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={year}
              onChange={(e) => {
                setYear(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Year"
            />
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">All statuses</option>
              <option value="present">Present</option>
              <option value="present_full_day">Full day</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
              <option value="half_day">Half day</option>
              <option value="short_leave">Short leave</option>
            </select>
            <button
              type="button"
              onClick={() => void loadHistory(true)}
              disabled={loading || refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#008CD3] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </section>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-16 text-sm text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-[#008CD3]" />
            Loading attendance history…
          </div>
        ) : null}
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : null}

        {!loading && !error ? (
          <>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <KpiStatCard label="Present" value={monthlyKpi.present} color="text-emerald-600" bg="bg-white" accent="#0F9D58" share={sharePct(monthlyKpi.present)} />
              <KpiStatCard label="Full day" value={monthlyKpi.presentFullDay} color="text-emerald-700" bg="bg-white" accent="#047857" share={sharePct(monthlyKpi.presentFullDay)} />
              <KpiStatCard label="Late" value={monthlyKpi.late} color="text-orange-500" bg="bg-white" accent="#E8710A" share={sharePct(monthlyKpi.late)} />
              <KpiStatCard label="Leave (from lates)" value={monthlyKpi.lateDerivedLeaves} color="text-rose-600" bg="bg-white" accent="#BE185D" share={sharePct(monthlyKpi.lateDerivedLeaves)} />
              <KpiStatCard label="Absent (incl. leave from lates)" value={monthlyKpi.totalAbsentWithLateLeaves} color="text-red-600" bg="bg-white" accent="#DC2626" share={sharePct(monthlyKpi.totalAbsentWithLateLeaves)} />
              <KpiStatCard label="Half day" value={monthlyKpi.halfDay} color="text-sky-500" bg="bg-white" accent="#008CD3" share={sharePct(monthlyKpi.halfDay)} />
              <KpiStatCard label="Short leave" value={monthlyKpi.shortLeave} color="text-yellow-600" bg="bg-white" accent="#F9A825" share={sharePct(monthlyKpi.shortLeave)} />
            </section>

            <AttendanceRulesNotice lateCount={monthlyKpi.late} />

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-700">Month status mix</p>
              <div className="mt-4">
                <StackedMonthBar segments={kpiSegments} total={monthAnalytics.kpiTotal} />
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-700">Status distribution</h2>
                <div className="mt-4">
                  <AttendanceDonutChart
                    segments={kpiSegments}
                    total={monthAnalytics.kpiTotal}
                    centerLabel="Work days"
                    centerValue={String(monthAnalytics.kpiTotal)}
                  />
                </div>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-700">Status breakdown bars</h2>
                <div className="mt-4">
                  <EnhancedStatusBars items={statusDistribution} />
                </div>
              </article>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
              <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-slate-700">Daily working hours</h2>
                  <span className="text-xs text-slate-500">{monthAnalytics.totalHours.toFixed(1)}h total</span>
                </div>
                <DailyHoursRechartsChart
                  year={yearNum}
                  month={monthNum}
                  daysInMonth={monthAnalytics.daysInMonth}
                  points={monthAnalytics.dailyHours}
                />
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-700">Attendance calendar</h2>
                <div className="mt-4">
                  <MonthCalendarHeatmap
                    year={yearNum}
                    month={monthNum}
                    cells={monthAnalytics.calendarCells}
                  />
                </div>
              </article>
            </section>

            {monthlyTrend.length > 1 ? (
              <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-[#008CD3]" />
                  <h2 className="text-sm font-semibold text-slate-700">Monthly activity trend</h2>
                </div>
                <MonthlyActivityRechartsChart items={monthlyTrend} />
              </article>
            ) : null}

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-700">Attendance logs</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                      <th className="px-2 py-2">Date</th>
                      <th className="px-2 py-2">Check in</th>
                      <th className="px-2 py-2">Check out</th>
                      <th className="px-2 py-2">Working hours</th>
                      <th className="px-2 py-2">Calculated status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRows.map((r) => {
                      const calcStatus = getCalculatedStatus(r);
                      return (
                        <tr key={String(r.attendance_id)} className="border-b border-slate-100 last:border-b-0">
                          <td className="px-2 py-2 font-medium text-slate-700">
                            {localYmdFromAttendanceValue(r.date) || "—"}
                          </td>
                          <td className="px-2 py-2 text-slate-600">{formatAttendanceTimeLocal(r.check_in)}</td>
                          <td className="px-2 py-2 text-slate-600">{formatAttendanceTimeLocal(r.check_out)}</td>
                          <td className="px-2 py-2 text-slate-600">{toNumberWorkingHours(r.working_time).toFixed(2)}h</td>
                          <td className="px-2 py-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${calculatedStatusBadgeClass(calcStatus)}`}>
                              {formatCalculatedStatusLabel(calcStatus)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filteredRows.length > PAGE_SIZE ? (
                <div className="mt-4 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-slate-500">
                    Page {page} · {filteredRows.length} records
                  </span>
                  <button
                    type="button"
                    disabled={!hasNextPage}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </section>
          </>
        ) : null}
      </section>
    </div>
  );
}
