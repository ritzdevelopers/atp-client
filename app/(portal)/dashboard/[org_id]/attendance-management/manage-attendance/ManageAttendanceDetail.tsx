"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  RefreshCw,
  Loader2,
  AlertCircle,
  Info,
  User,
  ClipboardList,
  BarChart3,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type AttendanceDetailRow = {
  user_id?: number | string;
  attendance_id?: number | string;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  user_role_name?: string;
  attendance_history?: string;
  attendance_date?: string;
  check_in?: string;
  check_out?: string;
  attendance_status?: string;
  working_time?: string | number;
  joining_date?: string;
};

type AttendanceHistoryQuery = {
  month: number;
  year: number;
  date?: number;
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
  });
  if (query.date) {
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

function getDefaultMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getCurrentQueryParts() {
  const now = new Date();
  return {
    date: now.getDate(),
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
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

type MobileLogRowProps = {
  row: AttendanceDetailRow;
};

function MobileAttendanceLogRow({ row }: MobileLogRowProps) {
  const dateValue = row.attendance_date || row.attendance_history;
  const block = dateBlockFromValue(dateValue);
  const statusCls = mobileStatusBadgeCls(row.attendance_status);

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
                {formatStatusLabel(row.attendance_status)}
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
};

function ManageAttendanceDetail({ employeeId }: ManageAttendanceDetailProps) {
  const params = useParams();
  const router = useRouter();
  const orgId = String(params?.org_id ?? "");

  const [rows, setRows] = useState<AttendanceDetailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(getDefaultMonthValue());
  const [selectedDate, setSelectedDate] = useState(String(new Date().getDate()));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [appliedQuery, setAppliedQuery] = useState<AttendanceHistoryQuery>(() => {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  });
  const [mobileMainTab, setMobileMainTab] = useState<"log" | "insights" | "overview">("log");

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
    const now = new Date();
    const current: AttendanceHistoryQuery = {
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    };
    setAppliedQuery(current);
    setSelectedDate(String(now.getDate()));
    setSelectedMonth(`${current.year}-${String(current.month).padStart(2, "0")}`);
    setSelectedYear(String(current.year));
    void loadSingleEmployeeHistory(false, current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, orgId]);

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
      date: Number(selectedDate) || undefined,
    };
    setAppliedQuery(query);
    void loadSingleEmployeeHistory(false, query);
  };

  const refreshWithCurrentQuery = () => {
    const now = new Date();
    const current: AttendanceHistoryQuery = {
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    };
    setAppliedQuery(current);
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

  const monthlyKpi = useMemo(() => {
    let present = 0;
    let late = 0;
    let leave = 0;
    let halfDay = 0;
    let shortLeave = 0;

    for (const row of attendanceRows) {
      const rowMonth = toMonthKey(row.attendance_date || row.attendance_history);
      const appliedMonthKey = `${appliedQuery.year}-${String(appliedQuery.month).padStart(2, "0")}`;
      if (!rowMonth || rowMonth !== appliedMonthKey) continue;
      const bucket = normalizeStatus(row.attendance_status);
      if (bucket === "present") present += 1;
      if (bucket === "late") late += 1;
      if (bucket === "leave") leave += 1;
      if (bucket === "half_day") halfDay += 1;
      if (bucket === "short_leave") shortLeave += 1;
    }

    return { present, late, leave, halfDay, shortLeave };
  }, [appliedQuery.month, appliedQuery.year, attendanceRows]);

  const sortedRows = useMemo(() => {
    return [...attendanceRows].sort((a, b) => {
      const aDate = new Date(a.attendance_date || a.attendance_history || "").getTime();
      const bDate = new Date(b.attendance_date || b.attendance_history || "").getTime();
      return bDate - aDate;
    });
  }, [attendanceRows]);

  const statusDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of attendanceRows) {
      const status = String(row.attendance_status || "unknown").trim() || "unknown";
      counts.set(status, (counts.get(status) || 0) + 1);
    }
    const total = attendanceRows.length || 1;
    return Array.from(counts.entries())
      .map(([status, count]) => ({
        status,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [attendanceRows]);

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

  const maxMonthlyTrend = useMemo(() => {
    return monthlyTrend.reduce((max, item) => Math.max(max, item.count), 1);
  }, [monthlyTrend]);

  const employeeName = profile?.user_name?.trim() || "Employee";
  const hasProfile = Boolean(profile?.user_name);
  const hasAttendance = attendanceRows.length > 0;

  const mobileTabs = [
    { id: "log" as const, label: "Log", count: attendanceRows.length },
    { id: "insights" as const, label: "Insights" },
    { id: "overview" as const, label: "Overview" },
  ];

  return (
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
                    ? `${attendanceRows.length} record${attendanceRows.length === 1 ? "" : "s"} · ${profile?.user_role_name || "employee"}`
                    : `${profile?.user_role_name || "employee"} · no records this period`}
              </p>
            </div>
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
                  onChange={(e) => setSelectedMonth(e.target.value)}
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
            <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${userColorClass(employeeName)}`}
                >
                  {userInitials(employeeName)}
                </span>
                <div className="min-w-0">
                  <p className="text-[16px] font-semibold text-[#1F2937]">{employeeName}</p>
                  <p className="truncate text-[14px] text-[#6B7280]">
                    {profile?.user_email || "No email"}
                  </p>
                  <p className="mt-1 text-[13px] text-[#9CA3AF]">
                    Joined {formatDate(profile?.joining_date)}
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">Present</p>
                <p className="mt-1 text-2xl font-semibold text-[#0F9D58]">{monthlyKpi.present}</p>
              </div>
              <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">Late</p>
                <p className="mt-1 text-2xl font-semibold text-[#E8710A]">{monthlyKpi.late}</p>
              </div>
              <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">Leaves</p>
                <p className="mt-1 text-2xl font-semibold text-[#D93025]">{monthlyKpi.leave}</p>
              </div>
              <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">Half days</p>
                <p className="mt-1 text-2xl font-semibold text-[#008CD3]">{monthlyKpi.halfDay}</p>
              </div>
            </div>
            <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Short leaves
              </p>
              <p className="mt-1 text-2xl font-semibold text-[#F9A825]">{monthlyKpi.shortLeave}</p>
              <p className="mt-1 text-[14px] text-[#6B7280]">
                KPIs for {appliedQuery.month}/{appliedQuery.year}
              </p>
            </div>
            <div className="rounded-xl border border-[#E4E7EC] bg-[#E8F4FB] p-4">
              <div className="flex gap-3">
                <Info className="h-5 w-5 shrink-0 text-[#008CD3]" />
                <p className="text-[14px] leading-relaxed text-[#4B5563]">
                  Monthly KPIs reflect records in the applied query period. Use the Log tab to
                  change date filters and view check-in/out details.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {!loading && !error && hasAttendance && mobileMainTab === "insights" ? (
          <div className="space-y-3 p-4">
            <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[#008CD3]" />
                <h2 className="text-[15px] font-semibold text-[#1F2937]">Status distribution</h2>
              </div>
              <div className="mt-4 space-y-3">
                {statusDistribution.map((item) => (
                  <div key={item.status}>
                    <div className="mb-1 flex items-center justify-between text-[13px]">
                      <span className="font-medium capitalize text-[#1F2937]">{item.status}</span>
                      <span className="text-[#6B7280]">
                        {item.count} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#F5F7FA]">
                      <div
                        className="h-full rounded-full bg-[#008CD3]"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-[#008CD3]" />
                <h2 className="text-[15px] font-semibold text-[#1F2937]">Monthly activity</h2>
              </div>
              <div className="mt-4 space-y-3">
                {monthlyTrend.length === 0 ? (
                  <p className="text-[14px] text-[#6B7280]">No trend data available.</p>
                ) : (
                  monthlyTrend.map((item) => {
                    const width = Math.max(8, Math.round((item.count / maxMonthlyTrend) * 100));
                    return (
                      <div key={item.month}>
                        <div className="mb-1 flex items-center justify-between text-[13px]">
                          <span className="font-medium text-[#1F2937]">{item.month}</span>
                          <span className="text-[#6B7280]">{item.count} records</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#F5F7FA]">
                          <div
                            className="h-full rounded-full bg-[#0F9D58]"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
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
              />
            ))}
          </ul>
        ) : null}
      </div>

      {/* Desktop layout (unchanged) */}
      <section className="hidden space-y-6 p-4 sm:p-6 lg:block">
      <div>
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          ← Back
        </button>
      </div>
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
          Attendance Management
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#0C123A] sm:text-3xl">Employee Full Attendance History</h1>
        <p className="mt-2 text-sm text-slate-600">Detailed attendance timeline and month-wise KPIs for management insights.</p>
      </header>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading attendance history...</div>
      ) : null}

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      {!loading && !error && !hasProfile ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">No attendance history found for this employee.</div>
      ) : null}

      {!loading && !error && hasProfile ? (
        <>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[#0C123A]">{profile?.user_name || "Unknown User"}</h2>
            <p className="text-sm text-slate-600">{profile?.user_email || "No email"}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                {profile?.user_role_name || "employee"}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                Joined {formatDate(profile?.joining_date)}
              </span>
              <button
                type="button"
                onClick={refreshWithCurrentQuery}
                disabled={loading || refreshing}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[#0C123A]">Monthly KPI Snapshot</p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-20 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-indigo-200 focus:ring-2"
                  placeholder="Date"
                />
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-indigo-200 focus:ring-2"
                />
                <input
                  type="number"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-indigo-200 focus:ring-2"
                  placeholder="Year"
                />
                <button
                  type="button"
                  onClick={applySelectedQuery}
                  disabled={loading || refreshing}
                  className="rounded-lg bg-[#0C123A] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#151e59] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Apply Query
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
              <div className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">Present: {monthlyKpi.present}</div>
              <div className="rounded-lg bg-amber-50 px-3 py-2 text-amber-700">Late: {monthlyKpi.late}</div>
              <div className="rounded-lg bg-rose-50 px-3 py-2 text-rose-700">Leaves: {monthlyKpi.leave}</div>
              <div className="rounded-lg bg-violet-50 px-3 py-2 text-violet-700">Half Days: {monthlyKpi.halfDay}</div>
              <div className="rounded-lg bg-sky-50 px-3 py-2 text-sky-700">Short Leaves: {monthlyKpi.shortLeave}</div>
            </div>
          </article>

          <article className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-[#0C123A]">Status Distribution</h3>
              <p className="mt-1 text-xs text-slate-500">Raw status values from attendance records.</p>
              <div className="mt-4 space-y-3">
                {statusDistribution.map((item) => (
                  <div key={item.status}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{item.status}</span>
                      <span className="text-slate-500">
                        {item.count} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[#0C123A]"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-[#0C123A]">Monthly Activity Trend</h3>
              <p className="mt-1 text-xs text-slate-500">Attendance entries by month.</p>
              <div className="mt-4 space-y-3">
                {monthlyTrend.map((item) => {
                  const width = Math.max(8, Math.round((item.count / maxMonthlyTrend) * 100));
                  return (
                    <div key={item.month} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">{item.month}</span>
                        <span className="text-slate-500">{item.count} records</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </article>

          <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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
                  {sortedRows.map((row, index) => (
                    <tr key={`${String(row.attendance_date || row.attendance_history)}-${index}`} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 text-slate-700">{formatDate(row.attendance_date || row.attendance_history)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatTime(row.check_in)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatTime(row.check_out)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatWorkingTime(row.working_time)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusBadgeClass(row.attendance_status)}`}>
                          {formatStatusLabel(row.attendance_status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </>
      ) : null}
    </section>
    </div>
  );
}

export default ManageAttendanceDetail;