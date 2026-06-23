"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  formatAttendanceTimeLocal,
  getLocalYmdFromDate,
  localYmdFromAttendanceValue,
} from "@/lib/attendanceDates";
import {
  clearOwnAttendanceHistoryCaches,
  readOwnAttendanceHistoryCache,
  shouldRefreshOwnAttendanceHistoryCache,
  stableFilterKey,
  writeOwnAttendanceHistoryCache,
} from "@/lib/employeeManagementCache";
import {
  BarChart3,
  RefreshCw,
  Loader2,
  AlertCircle,
  Info,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
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

function statusColorClass(status: string | null | undefined): string {
  const s = String(status || "").toLowerCase();
  if (s.includes("late")) return "bg-orange-500 text-white";
  if (s.includes("absent")) return "bg-red-600 text-white";
  if (s.includes("half_day")) return "bg-sky-400 text-white";
  if (s.includes("short_leave")) return "bg-yellow-400 text-slate-900";
  if (s.includes("full_day")) return "bg-emerald-600 text-white";
  return "bg-slate-100 text-slate-700";
}

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
  const s = String(status || "").toLowerCase();
  if (s.includes("late")) return "bg-[#FEF3E6] text-[#E8710A]";
  if (s.includes("absent")) return "bg-[#FCE8E6] text-[#D93025]";
  if (s.includes("half_day")) return "bg-[#E8F4FB] text-[#008CD3]";
  if (s.includes("short_leave")) return "bg-[#FFF8E1] text-[#F9A825]";
  if (s.includes("full_day")) return "bg-[#E6F4EA] text-[#0F9D58]";
  return "bg-[#F5F7FA] text-[#6B7280]";
}

function formatStatusLabel(status: string | null | undefined): string {
  const s = String(status || "").trim();
  if (!s) return "—";
  return s.replace(/_/g, " ");
}

type MobileAttendanceRowProps = {
  row: AttendanceRow;
};

function MobileAttendanceRow({ row }: MobileAttendanceRowProps) {
  const dateLabel = localYmdFromAttendanceValue(row.date) || "—";
  const [y, m, d] = dateLabel.split("-");
  const dayNum = d ? String(Number(d)).padStart(2, "0") : "--";
  const monLabel = m
    ? new Date(Number(y), Number(m) - 1, 1)
        .toLocaleDateString(undefined, { month: "short" })
        .toUpperCase()
    : "---";
  const hours = toNumberWorkingHours(row.working_time);
  const statusCls = mobileStatusBadgeCls(row.status);

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
                {formatStatusLabel(row.status)}
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
    status,
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
        status,
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
    [orgId, month, year, status, page, limit],
  );

  useEffect(() => {
    void loadHistory(false);
  }, [loadHistory]);

  const stats = useMemo(() => {
    let fullDay = 0;
    let late = 0;
    let absent = 0;
    let halfDay = 0;
    let shortLeave = 0;
    let totalHours = 0;
    for (const r of rows) {
      const s = String(r.status || "").toLowerCase();
      if (s.includes("full_day")) fullDay += 1;
      if (s.includes("late")) late += 1;
      if (s.includes("absent")) absent += 1;
      if (s.includes("half_day")) halfDay += 1;
      if (s.includes("short_leave")) shortLeave += 1;
      totalHours += toNumberWorkingHours(r.working_time);
    }
    return { fullDay, late, absent, halfDay, shortLeave, totalHours };
  }, [rows]);

  const maxHours = useMemo(() => {
    let m = 1;
    for (const r of rows) {
      const h = toNumberWorkingHours(r.working_time);
      if (h > m) m = h;
    }
    return m;
  }, [rows]);

  const monthCalendar = useMemo(() => {
    const y = Number(year);
    const m = Number(month);
    if (Number.isNaN(y) || Number.isNaN(m)) return [];
    const first = new Date(y, m - 1, 1);
    const total = new Date(y, m, 0).getDate();
    const firstWeekday = first.getDay();
    const map = new Map<string, AttendanceRow>();
    for (const r of rows) {
      const key = localYmdFromAttendanceValue(r.date);
      if (key) map.set(key, r);
    }
    const cells: Array<{ dateNum: number | null; row?: AttendanceRow }> = [];
    for (let i = 0; i < firstWeekday; i += 1) cells.push({ dateNum: null });
    for (let d = 1; d <= total; d += 1) {
      const date = new Date(y, m - 1, d);
      const key = getLocalYmdFromDate(date);
      cells.push({ dateNum: d, row: map.get(key) });
    }
    return cells;
  }, [rows, month, year]);

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
              <h1 className="truncate text-[17px] font-semibold text-[#1F2937]">Attendance history</h1>
              <p className="truncate text-[13px] text-[#6B7280]">
                {loading
                  ? "Loading…"
                  : `${rows.length} record${rows.length === 1 ? "" : "s"} · ${formatMonthYearLabel(month, year)}`}
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
                <option value="full_day">Full day</option>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">Full day</p>
                <p className="mt-1 text-2xl font-semibold text-[#0F9D58]">{stats.fullDay}</p>
              </div>
              <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">Late</p>
                <p className="mt-1 text-2xl font-semibold text-[#E8710A]">{stats.late}</p>
              </div>
              <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">Absent</p>
                <p className="mt-1 text-2xl font-semibold text-[#D93025]">{stats.absent}</p>
              </div>
              <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">Half day</p>
                <p className="mt-1 text-2xl font-semibold text-[#008CD3]">{stats.halfDay}</p>
              </div>
            </div>
            <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Recorded hours (page)
              </p>
              <p className="mt-1 text-3xl font-semibold text-[#008CD3]">{stats.totalHours.toFixed(1)}h</p>
              <p className="mt-1 text-[14px] text-[#6B7280]">
                Short leave: {stats.shortLeave} · Page {meta.page}
              </p>
            </div>
            <div className="rounded-xl border border-[#E4E7EC] bg-[#E8F4FB] p-4">
              <div className="flex gap-3">
                <Info className="h-5 w-5 shrink-0 text-[#008CD3]" />
                <p className="text-[14px] leading-relaxed text-[#4B5563]">
                  Stats reflect the currently loaded page (up to {limit} rows). Use the Log tab for
                  check-in/out details and the Calendar tab for a month heatmap.
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
                    {formatMonthYearLabel(month, year)}
                  </p>
                  <p className="text-[13px] text-[#6B7280]">Color-coded by status</p>
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
                <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold text-[#6B7280]">
                  {["S", "M", "T", "W", "T", "F", "S"].map((d, idx) => (
                    <span key={`${d}-${idx}`}>{d}</span>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-7 gap-1.5">
                  {monthCalendar.map((cell, idx) => (
                    <div
                      key={idx}
                      className={`flex aspect-square items-center justify-center rounded-lg text-[13px] font-semibold ${
                        cell.dateNum == null
                          ? "bg-transparent text-transparent"
                          : statusColorClass(cell.row?.status)
                      }`}
                      title={cell.row?.status ? String(cell.row.status) : "No record"}
                    >
                      {cell.dateNum ?? ""}
                    </div>
                  ))}
                </div>
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
                <MobileAttendanceRow key={String(row.attendance_id)} row={row} />
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
      <section className="hidden w-full max-w-none space-y-6 p-6 lg:block">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">Attendance</p>
          <h1 className="mt-1 text-2xl font-bold text-[#0C123A]">Attendance History Analytics</h1>
          <p className="mt-2 text-sm text-slate-600">
            Filter by month, year and status. Track work hours and day-wise attendance distribution.
          </p>
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
              <option value="">All Status</option>
              <option value="full_day">Full Day</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
              <option value="half_day">Half Day</option>
              <option value="short_leave">Short Leave</option>
            </select>
            <button
              type="button"
              onClick={() => setPage(1)}
              className="rounded-lg bg-[#0C123A] px-4 py-2 text-sm font-semibold text-white"
            >
              Apply Filters
            </button>
          </div>
        </section>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Loading attendance history...
          </div>
        ) : null}
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : null}

        {!loading && !error ? (
          <>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-500">Full Day</p>
                <p className="mt-1 text-xl font-bold text-emerald-600">{stats.fullDay}</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-500">Late</p>
                <p className="mt-1 text-xl font-bold text-orange-500">{stats.late}</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-500">Absent</p>
                <p className="mt-1 text-xl font-bold text-red-600">{stats.absent}</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-500">Half Day</p>
                <p className="mt-1 text-xl font-bold text-sky-500">{stats.halfDay}</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-500">Short Leave</p>
                <p className="mt-1 text-xl font-bold text-yellow-500">{stats.shortLeave}</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-500">Total Hours</p>
                <p className="mt-1 text-xl font-bold text-[#0C123A]">{stats.totalHours.toFixed(1)}</p>
              </article>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
              <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-700">Working Hours Bar</h2>
                <div className="mt-4 space-y-3">
                  {rows.length === 0 ? (
                    <p className="text-sm text-slate-500">No attendance records for selected filters.</p>
                  ) : (
                    rows.slice(0, 20).map((r) => {
                      const hours = toNumberWorkingHours(r.working_time);
                      const pct = Math.max(4, Math.round((hours / maxHours) * 100));
                      const dateLabel = localYmdFromAttendanceValue(r.date) || "N/A";
                      return (
                        <div key={String(r.attendance_id)} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-700">{dateLabel}</span>
                            <span className="text-slate-500">{hours.toFixed(2)}h</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100">
                            <div className="h-2 rounded-full bg-indigo-600" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-700">Attendance Calendar</h2>
                <div className="mt-4 grid grid-cols-7 gap-2 text-center text-[11px] text-slate-500">
                  {["S", "M", "T", "W", "T", "F", "S"].map((d, idx) => (
                    <span key={`${d}-${idx}`}>{d}</span>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-7 gap-2">
                  {monthCalendar.map((cell, idx) => (
                    <div
                      key={idx}
                      className={`flex h-9 items-center justify-center rounded-md text-xs font-semibold ${
                        cell.dateNum == null ? "bg-transparent text-transparent" : statusColorClass(cell.row?.status)
                      }`}
                      title={cell.row?.status ? String(cell.row.status) : "No record"}
                    >
                      {cell.dateNum ?? "-"}
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <p><span className="inline-block h-2 w-2 rounded bg-orange-500" /> Late</p>
                  <p><span className="inline-block h-2 w-2 rounded bg-red-600" /> Absent</p>
                  <p><span className="inline-block h-2 w-2 rounded bg-sky-400" /> Half Day</p>
                  <p><span className="inline-block h-2 w-2 rounded bg-yellow-400" /> Short Leave</p>
                  <p><span className="inline-block h-2 w-2 rounded bg-emerald-600" /> Full Day</p>
                </div>
              </article>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-700">Attendance Logs</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                      <th className="px-2 py-2">Date</th>
                      <th className="px-2 py-2">Check In</th>
                      <th className="px-2 py-2">Check Out</th>
                      <th className="px-2 py-2">Working Hours</th>
                      <th className="px-2 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={String(r.attendance_id)} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-2 py-2 font-medium text-slate-700">
                          {localYmdFromAttendanceValue(r.date) || "—"}
                        </td>
                        <td className="px-2 py-2 text-slate-600">{formatAttendanceTimeLocal(r.check_in)}</td>
                        <td className="px-2 py-2 text-slate-600">{formatAttendanceTimeLocal(r.check_out)}</td>
                        <td className="px-2 py-2 text-slate-600">{toNumberWorkingHours(r.working_time).toFixed(2)}h</td>
                        <td className="px-2 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusColorClass(r.status)}`}>
                            {String(r.status || "N/A").replace(/_/g, " ")}
                          </span>
                        </td>
                      </tr>
                    ))}
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
