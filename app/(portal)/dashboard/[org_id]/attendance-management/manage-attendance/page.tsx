"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MdOpenInNew } from "react-icons/md";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type AttendanceRow = {
  user_id?: number | string;
  user_name?: string;
  user_email?: string;
  user_role_name?: string;
  attendance_history?: string;
  attendance_date?: string;
  attendance_status?: string;
};

type UserMonthlySummary = {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  present: number;
  late: number;
  leave: number;
  halfDay: number;
  shortLeave: number;
};

function toMonthKey(dateValue: string | undefined): string | null {
  if (!dateValue) return null;
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function normalizeStatus(status: string | undefined): "present" | "late" | "leave" | "half_day" | "short_leave" | "other" {
  const value = String(status || "").trim().toLowerCase();
  if (!value) return "other";
  if (value.includes("short") && value.includes("leave")) return "short_leave";
  if (value.includes("half")) return "half_day";
  if (value.includes("late")) return "late";
  if (value.includes("present")) return "present";
  if (value.includes("leave")) return "leave";
  return "other";
}

function getDefaultMonthValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function ManageAttendancePage() {
  const params = useParams();
  const orgId = String(params?.org_id ?? "");

  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(getDefaultMonthValue());

  const loadAttendanceRows = useCallback(
    async (isManualRefresh = false) => {
      if (!orgId) {
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

      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const q = encodeURIComponent(orgId);
        const res = await fetch(
          `${API_URL}/api/attendance-history/get-all-users-with-attendance-history?org_id=${q}`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const data = (await res.json()) as { data?: AttendanceRow[]; message?: string };
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
    [orgId],
  );

  useEffect(() => {
    void loadAttendanceRows();
  }, [loadAttendanceRows]);

  const monthlySummary = useMemo(() => {
    const map = new Map<string, UserMonthlySummary>();

    for (const row of rows) {
      const rowDate = row.attendance_date || row.attendance_history;
      const rowMonth = toMonthKey(rowDate);
      if (!rowMonth || rowMonth !== selectedMonth) continue;

      const userId = String(row.user_id ?? "");
      if (!userId) continue;

      const existing =
        map.get(userId) ??
        {
          userId,
          userName: String(row.user_name || "Unknown User"),
          userEmail: String(row.user_email || "No email"),
          userRole: String(row.user_role_name || "employee"),
          present: 0,
          late: 0,
          leave: 0,
          halfDay: 0,
          shortLeave: 0,
        };

      const status = normalizeStatus(row.attendance_status);
      if (status === "present") existing.present += 1;
      if (status === "late") existing.late += 1;
      if (status === "leave") existing.leave += 1;
      if (status === "half_day") existing.halfDay += 1;
      if (status === "short_leave") existing.shortLeave += 1;

      map.set(userId, existing);
    }

    return Array.from(map.values()).sort((a, b) => a.userName.localeCompare(b.userName));
  }, [rows, selectedMonth]);

  return (
    <section className="space-y-6 p-4 sm:p-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
          Attendance Management
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#0C123A] sm:text-3xl">
          Team Attendance Analytics
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Review monthly attendance KPIs for all users and drill into full attendance history.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500" htmlFor="month-filter">
            Month
          </label>
          <input
            id="month-filter"
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-indigo-200 focus:ring-2"
          />
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {monthlySummary.length} User{monthlySummary.length === 1 ? "" : "s"}
          </span>
          <button
            type="button"
            onClick={() => void loadAttendanceRows(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </header>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Loading attendance summary...
        </div>
      ) : null}

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      {!loading && !error && monthlySummary.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
          No attendance records found for the selected month.
        </div>
      ) : null}

      {!loading && !error && monthlySummary.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {monthlySummary.map((user) => (
            <article key={user.userId} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="truncate text-lg font-semibold text-[#0C123A]">{user.userName}</h2>
                <p className="truncate text-xs text-slate-500">{user.userEmail}</p>
                <span className="mt-2 inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                  {user.userRole}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">Present: {user.present}</div>
                <div className="rounded-lg bg-amber-50 px-3 py-2 text-amber-700">Late: {user.late}</div>
                <div className="rounded-lg bg-rose-50 px-3 py-2 text-rose-700">Leaves: {user.leave}</div>
                <div className="rounded-lg bg-violet-50 px-3 py-2 text-violet-700">Half Days: {user.halfDay}</div>
                <div className="col-span-2 rounded-lg bg-sky-50 px-3 py-2 text-sky-700">
                  Short Leaves: {user.shortLeave}
                </div>
              </div>

              <Link
                href={`/dashboard/${orgId}/attendance-management/manage-attendance/${encodeURIComponent(user.userId)}`}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0C123A] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#151e59]"
              >
                <MdOpenInNew className="text-base" />
                View Full History
              </Link>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default ManageAttendancePage;