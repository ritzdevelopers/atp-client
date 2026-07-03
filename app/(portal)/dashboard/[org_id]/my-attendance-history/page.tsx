"use client";

import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import AttendanceSheetOverview from "@/components/portal-dashboard/attendance/AttendanceSheetOverview";
import { MonthCalendarHeatmap } from "@/components/portal-dashboard/attendance/AttendanceAnalyticsCharts";
import {
  formatCalculatedStatusLabel,
  mobileCalculatedStatusBadgeCls,
} from "@/lib/attendanceMonthAnalytics";
import { useAttendanceSheetCalculation } from "@/hooks/useAttendanceSheetCalculation";
import {
  formatAttendanceTimeLocal,
  getLocalYmdFromDate,
  localYmdFromAttendanceValue,
} from "@/lib/attendanceDates";
import { BarChart3, Eye, RefreshCw, Loader2, AlertCircle, Info, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

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

function getDefaultMonthValue(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function formatMonthYearLabel(ym: string): string {
  const [y, m] = ym.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  if (Number.isNaN(d.getTime())) return ym;
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function shiftMonthYear(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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

function formatStatusLabel(status: string | null | undefined): string {
  return formatCalculatedStatusLabel(status ?? undefined);
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
                {formatStatusLabel(displayStatus)}
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

export default function MyAttendanceHistoryPage() {
  const params = useParams();
  const orgId = String(params?.org_id ?? "");
  const dashboardCtx = useManagementDashboardContext();
  const displayName = dashboardCtx?.user?.user_name?.trim() || "You";

  const [monthYear, setMonthYear] = useState(getDefaultMonthValue);
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<"DESC" | "ASC">("DESC");
  const [page, setPage] = useState(1);
  const limit = 100;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [meta, setMeta] = useState<{ page: number; limit: number }>({ page: 1, limit });
  const [mobileMainTab, setMobileMainTab] = useState<"log" | "calendar" | "overview">("log");

  const [yStr, mStr] = monthYear.split("-");
  const year = Number(yStr) || new Date().getFullYear();
  const month = Number(mStr) || new Date().getMonth() + 1;
  const employeeId = dashboardCtx?.user?.user_id;

  const {
    analytics,
    statusByDate,
    sheetReport,
    loading: sheetLoading,
    error: sheetError,
    reload: reloadSheet,
  } = useAttendanceSheetCalculation({
    orgId,
    employeeId,
    month,
    year,
    enabled: Boolean(orgId && employeeId),
  });

  const getCalculatedStatus = useCallback(
    (row: AttendanceRow) => {
      const ymd = localYmdFromAttendanceValue(row.date);
      if (!ymd) return row.status ?? "";
      return statusByDate.get(ymd) ?? row.status ?? "";
    },
    [statusByDate],
  );

  const loadHistory = useCallback(
    async (isRefresh = false) => {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Not signed in.");
        setLoading(false);
        setRefreshing(false);
        return;
      }
      if (!orgId) {
        setError("Invalid organization.");
        setLoading(false);
        setRefreshing(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const search = new URLSearchParams({
          month: String(Number(month)),
          year: String(Number(year)),
          page: String(page),
          limit: String(limit),
          sort,
        });
        if (status) search.set("status", status);
        const res = await fetch(
          `${API_URL}/api/attendance-history/get-attendance-history-of-employee?${search.toString()}`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const data = (await res.json()) as AttendanceApiResponse;
        if (!res.ok) throw new Error(data.message || "Could not load attendance history.");
        setRows(Array.isArray(data.data) ? data.data : []);
        setMeta({
          page: data.page ?? page,
          limit: data.limit ?? limit,
        });
      } catch (e) {
        setRows([]);
        setError(e instanceof Error ? e.message : "Could not load attendance history.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [month, year, orgId, page, sort, status, limit],
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      void loadHistory(false);
    }, 0);
    return () => window.clearTimeout(t);
  }, [loadHistory]);

  const monthAnalytics = analytics?.monthAnalytics;

  const monthCalendar = monthAnalytics?.calendarCells ?? [];

  const hasNextPage = rows.length >= limit;

  const mobileTabs = [
    { id: "log" as const, label: "Log", count: rows.length },
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
              <h1 className="truncate text-[17px] font-semibold text-[#1F2937]">My attendance</h1>
              <p className="truncate text-[13px] text-[#6B7280]">
                {loading
                  ? "Loading…"
                  : `${displayName} · ${formatMonthYearLabel(monthYear)}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                void loadHistory(true);
                void reloadSheet();
              }}
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
                  setMonthYear(e.target.value);
                  setPage(1);
                }}
                className={zohoSelectCls()}
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                  className={zohoSelectCls()}
                >
                  <option value="">All statuses</option>
                  <option value="full_day">Full day</option>
                  <option value="late">Late</option>
                  <option value="absent">Absent</option>
                  <option value="half_day">Half day</option>
                  <option value="short_leave">Short leave</option>
                </select>
                <select
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value as "DESC" | "ASC");
                    setPage(1);
                  }}
                  className={zohoSelectCls()}
                >
                  <option value="DESC">Newest first</option>
                  <option value="ASC">Oldest first</option>
                </select>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mx-4 mt-3 flex items-start gap-2 rounded-lg border border-[#B3E5FC] bg-[#E8F4FB] px-3 py-2.5 text-[13px] text-[#0277BD]">
          <Eye className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            <span className="font-semibold">View only.</span> Personal attendance records — filters
            reload your history from the server.
          </p>
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
            <p className="text-[15px]">Loading your attendance…</p>
          </div>
        ) : null}

        {!loading && !error && mobileMainTab === "overview" ? (
          <div className="space-y-3 p-4">
            {sheetError ? (
              <div className="flex items-start gap-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-4 py-3 text-[14px] text-[#D93025]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{sheetError}</span>
              </div>
            ) : null}
            {sheetLoading && !sheetReport ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-[#6B7280]">
                <Loader2 className="h-8 w-8 animate-spin text-[#008CD3]" />
                <p className="text-[14px]">Calculating attendance summary…</p>
              </div>
            ) : null}
            {sheetReport && analytics ? (
              <AttendanceSheetOverview
                sheetReport={sheetReport}
                kpiSegments={analytics.kpiSegments}
                kpiTotal={analytics.monthAnalytics.kpiTotal}
                compact
              />
            ) : null}
            <div className="rounded-xl border border-[#E4E7EC] bg-[#E8F4FB] p-4">
              <div className="flex gap-3">
                <Info className="h-5 w-5 shrink-0 text-[#008CD3]" />
                <p className="text-[14px] leading-relaxed text-[#4B5563]">
                  Summary is calculated on the server from punches, approved leaves, regularization, and comp off balance.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {!loading && !error && mobileMainTab === "calendar" ? (
          <div className="space-y-3 p-4">
            <div className="rounded-xl border border-[#E4E7EC] bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-[#E4E7EC] px-4 py-3">
                <div>
                  <p className="text-[15px] font-semibold text-[#1F2937]">
                    {formatMonthYearLabel(monthYear)}
                  </p>
                  <p className="text-[13px] text-[#6B7280]">Color-coded by status</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMonthYear(shiftMonthYear(monthYear, -1));
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
                      setMonthYear(shiftMonthYear(monthYear, 1));
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
                <MonthCalendarHeatmap year={year} month={month} cells={monthCalendar} />
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-[#E4E7EC] px-4 py-3 text-[12px] text-[#6B7280]">
                <p>
                  <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-[#0F9D58]" />
                  Full day
                </p>
                <p>
                  <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-[#E8710A]" />
                  Late
                </p>
                <p>
                  <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-[#D93025]" />
                  Absent
                </p>
                <p>
                  <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-[#008CD3]" />
                  Half day
                </p>
                <p className="col-span-2">
                  <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-[#F9A825]" />
                  Short leave
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {!loading && !error && mobileMainTab === "log" && rows.length === 0 ? (
          <div className="mx-4 mt-4 rounded-xl border border-dashed border-[#E4E7EC] bg-white px-6 py-16 text-center">
            <CalendarDays className="mx-auto h-10 w-10 text-[#9CA3AF]" />
            <p className="mt-4 text-[17px] font-semibold text-[#1F2937]">No records found</p>
            <p className="mt-2 text-[14px] text-[#6B7280]">
              Try another month or status filter.
            </p>
          </div>
        ) : null}

        {!loading && !error && mobileMainTab === "log" && rows.length > 0 ? (
          <>
            <ul className="mt-1 divide-y divide-[#E4E7EC] border-t border-[#E4E7EC] bg-white">
              {rows.map((row) => (
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

      {/* Desktop layout (unchanged) */}
      <section className="mx-auto hidden max-w-[1400px] space-y-6 p-4 sm:p-6 lg:block lg:p-8">
      <header className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-900/[0.03] via-white to-indigo-600/[0.06] px-6 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-600/90">
                Personal · Read only
              </p>
              <h1 className="mt-2 flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight text-[#0C123A] sm:text-3xl">
                <BarChart3 className="hidden h-8 w-8 text-indigo-600 sm:inline" aria-hidden />
                My attendance analytics
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                Signed in as <span className="font-semibold text-slate-800">{displayName}</span>. This
                workspace shows only your own records from the attendance ledger. HR and managers use
                it for self-service insights; team actions stay in Attendance Management.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                void loadHistory(true);
                void reloadSheet();
              }}
              disabled={loading || refreshing}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/60 disabled:cursor-not-allowed disabled:opacity-55"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin text-indigo-600" : ""}`} aria-hidden />
              {refreshing ? "Refreshing…" : "Refresh data"}
            </button>
          </div>
        </div>
      </header>

      <div
        className="flex items-start gap-3 rounded-xl border border-sky-200/80 bg-sky-50/90 px-4 py-3 text-sm text-sky-950"
        role="note"
      >
        <Eye className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" aria-hidden />
        <p>
          <span className="font-semibold">View only.</span> You cannot edit attendance from this page.
          Filters and refresh only reload your personal history from the server.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-sm font-semibold text-[#0C123A]">Filters</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <label className="block lg:col-span-2">
            <span className="mb-1 block text-xs font-medium text-slate-500">Month</span>
            <input
              type="month"
              value={monthYear}
              onChange={(e) => {
                setMonthYear(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm outline-none ring-indigo-500/20 focus:border-indigo-300 focus:bg-white focus:ring-2"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Status</span>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm outline-none ring-indigo-500/20 focus:border-indigo-300 focus:bg-white focus:ring-2"
            >
              <option value="">All statuses</option>
              <option value="full_day">Full day</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
              <option value="half_day">Half day</option>
              <option value="short_leave">Short leave</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Sort</span>
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as "DESC" | "ASC");
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm outline-none ring-indigo-500/20 focus:border-indigo-300 focus:bg-white focus:ring-2"
            >
              <option value="DESC">Newest first</option>
              <option value="ASC">Oldest first</option>
            </select>
          </label>
          <div className="flex items-end gap-2 lg:col-span-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span className="flex flex-1 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-600">
              Page {meta.page}
            </span>
            <button
              type="button"
              disabled={!hasNextPage || loading}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
          <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-indigo-500" aria-hidden />
          Loading your attendance…
        </div>
      ) : null}

      {error && !loading ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
      ) : null}

      {!loading && !error && sheetReport && analytics ? (
        <AttendanceSheetOverview
          sheetReport={sheetReport}
          kpiSegments={analytics.kpiSegments}
          kpiTotal={analytics.monthAnalytics.kpiTotal}
        />
      ) : null}

      {!loading && !error ? (
        <>
          <section className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
            <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-sm font-semibold text-slate-800">Working time by day</h2>
              <p className="mt-1 text-xs text-slate-500">Server-calculated hours from punches and regularization.</p>
              <div className="mt-5 space-y-3">
                {(analytics?.monthAnalytics.dailyHours ?? []).length === 0 ? (
                  <p className="text-sm text-slate-500">No rows for these filters.</p>
                ) : (
                  analytics!.monthAnalytics.dailyHours.map((point) => {
                    const pct = Math.max(
                      4,
                      Math.round(
                        (point.hours / (analytics!.monthAnalytics.maxDailyHours || 1)) * 100,
                      ),
                    );
                    return (
                      <div key={point.day} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-700">Day {point.day}</span>
                          <span className="tabular-nums text-slate-500">{point.hours.toFixed(2)}h</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full bg-indigo-600 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-sm font-semibold text-slate-800">Month map</h2>
              <p className="mt-1 text-xs text-slate-500">Server-calculated status per calendar day.</p>
              <div className="mt-4">
                <MonthCalendarHeatmap year={year} month={month} cells={monthCalendar} />
              </div>
            </article>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-sm font-semibold text-slate-800">Detailed log</h2>
            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Check in</th>
                    <th className="px-4 py-3">Check out</th>
                    <th className="px-4 py-3">Hours</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                        No attendance rows for this view.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={String(r.attendance_id)} className="bg-white hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {localYmdFromAttendanceValue(r.date) || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {formatAttendanceTimeLocal(r.check_in)}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {formatAttendanceTimeLocal(r.check_out)}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-slate-600">
                          {toNumberWorkingHours(r.working_time).toFixed(2)}h
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${mobileStatusBadgeCls(getCalculatedStatus(r))}`}
                          >
                            {formatStatusLabel(getCalculatedStatus(r))}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </section>
    </div>
  );
}
