"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type AttendanceDetailRow = {
  user_name?: string;
  user_email?: string;
  user_role_name?: string;
  attendance_history?: string;
  attendance_date?: string;
  check_in?: string;
  check_out?: string;
  attendance_status?: string;
  working_time?: string | number;
  joining_date?: string;
};

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

function statusBadgeClass(status: string | undefined): string {
  const value = String(status || "").trim().toLowerCase();
  if (value === "present") return "bg-emerald-50 text-emerald-700";
  if (value === "late") return "bg-amber-50 text-amber-700";
  if (value === "leave") return "bg-rose-50 text-rose-700";
  if (value === "half_day") return "bg-violet-50 text-violet-700";
  if (value === "short_leave") return "bg-sky-50 text-sky-700";
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

function ManageAttendancePage() {
  const params = useParams();
  const router = useRouter();
  const orgId = String(params?.org_id ?? "");
  const employeeId = String(params?.employee_id ?? "");

  const [rows, setRows] = useState<AttendanceDetailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(getDefaultMonthValue());
  const [selectedDate, setSelectedDate] = useState(String(new Date().getDate()));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [appliedQuery, setAppliedQuery] = useState(getCurrentQueryParts());

  const loadSingleEmployeeHistory = useCallback(
    async (
      isManualRefresh = false,
      queryOverride?: { date: number; month: number; year: number },
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
        const qOrg = encodeURIComponent(orgId);
        const qEmp = encodeURIComponent(employeeId);
        const res = await fetch(
          `${API_URL}/api/attendance-history/get-single-user-with-attendance-history?org_id=${qOrg}&employee_id=${qEmp}&date=${queryParts.date}&month=${queryParts.month}&year=${queryParts.year}`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const data = (await res.json()) as { data?: AttendanceDetailRow[]; message?: string };
        if (!res.ok) {
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
    const current = getCurrentQueryParts();
    setAppliedQuery(current);
    setSelectedDate(String(current.date));
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
    const query = {
      date: Number(selectedDate) || 1,
      month: selectedMonthValue.month,
      year: selectedMonthValue.year,
    };
    setAppliedQuery(query);
    void loadSingleEmployeeHistory(false, query);
  };

  const refreshWithCurrentQuery = () => {
    const current = getCurrentQueryParts();
    setAppliedQuery(current);
    setSelectedDate(String(current.date));
    setSelectedMonth(`${current.year}-${String(current.month).padStart(2, "0")}`);
    setSelectedYear(String(current.year));
    void loadSingleEmployeeHistory(true, current);
  };

  const profile = rows[0];

  const monthlyKpi = useMemo(() => {
    let present = 0;
    let late = 0;
    let leave = 0;
    let halfDay = 0;
    let shortLeave = 0;

    for (const row of rows) {
      const rowMonth = toMonthKey(row.attendance_date || row.attendance_history);
      const appliedMonthKey = `${appliedQuery.year}-${String(appliedQuery.month).padStart(2, "0")}`;
      if (!rowMonth || rowMonth !== appliedMonthKey) continue;
      const status = String(row.attendance_status || "").trim().toLowerCase();
      if (status === "present") present += 1;
      if (status === "late") late += 1;
      if (status === "leave") leave += 1;
      if (status === "half_day") halfDay += 1;
      if (status === "short_leave") shortLeave += 1;
    }

    return { present, late, leave, halfDay, shortLeave };
  }, [appliedQuery.month, appliedQuery.year, rows]);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aDate = new Date(a.attendance_date || a.attendance_history || "").getTime();
      const bDate = new Date(b.attendance_date || b.attendance_history || "").getTime();
      return bDate - aDate;
    });
  }, [rows]);

  const statusDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const status = String(row.attendance_status || "unknown").trim() || "unknown";
      counts.set(status, (counts.get(status) || 0) + 1);
    }
    const total = rows.length || 1;
    return Array.from(counts.entries())
      .map(([status, count]) => ({
        status,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [rows]);

  const monthlyTrend = useMemo(() => {
    const bucket = new Map<string, number>();
    for (const row of rows) {
      const month = toMonthKey(row.attendance_date || row.attendance_history);
      if (!month) continue;
      bucket.set(month, (bucket.get(month) || 0) + 1);
    }
    return Array.from(bucket.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [rows]);

  const maxMonthlyTrend = useMemo(() => {
    return monthlyTrend.reduce((max, item) => Math.max(max, item.count), 1);
  }, [monthlyTrend]);

  return (
    <section className="space-y-6 p-4 sm:p-6">
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

      {!loading && !error && rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">No attendance history found for this employee.</div>
      ) : null}

      {!loading && !error && rows.length > 0 ? (
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
                          {row.attendance_status || "N/A"}
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
  );
}

export default ManageAttendancePage;