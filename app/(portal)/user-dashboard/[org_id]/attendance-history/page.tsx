"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  formatAttendanceTimeLocal,
  getLocalYmdFromDate,
  localYmdFromAttendanceValue,
} from "@/lib/attendanceDates";

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

function parseJwtUserId(token: string | null): number | null {
  if (!token) return null;
  try {
    const base64 = token.split(".")[1];
    if (!base64) return null;
    const payload = JSON.parse(atob(base64)) as { user_id?: number | string; id?: number | string };
    const id = Number(payload.user_id ?? payload.id);
    return Number.isNaN(id) ? null : id;
  } catch {
    return null;
  }
}

function toNumberWorkingHours(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
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

export default function AttendanceHistoryPage() {
  const params = useParams();
  const orgId = Number(params?.org_id);

  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const limit = 100;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AttendanceRow[]>([]);

  useEffect(() => {
    async function loadHistory() {
      if (!orgId || Number.isNaN(orgId)) {
        setError("Invalid organization.");
        setLoading(false);
        return;
      }
      const token = localStorage.getItem("token");
      const userId = parseJwtUserId(token);
      if (!token || !userId) {
        setError("Not signed in.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const search = new URLSearchParams({
          userId: String(userId),
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
        setRows(Array.isArray(data.data) ? data.data : []);
      } catch (e) {
        setRows([]);
        setError(e instanceof Error ? e.message : "Could not load attendance history.");
      } finally {
        setLoading(false);
      }
    }
    void loadHistory();
  }, [orgId, month, year, status, page]);

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

  return (
    <section className="w-full max-w-none space-y-6 p-6">
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
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i + 1} value={String(i + 1)}>
                Month {i + 1}
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
  );
}

