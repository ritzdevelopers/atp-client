"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Filter,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type LeaveStatus = "pending" | "approved" | "rejected";
type LeaveType = "full_day" | "half_day" | "short_leave";

export type LeaveRow = {
  id: number;
  user_id: number | null;
  user_name: string;
  user_email: string;
  org_id: number;
  leave_type: LeaveType | string;
  start_date: string;
  end_date: string | null;
  reason: string | null;
  status: LeaveStatus | string;
  approved_by: number | null;
  created_at?: string;
};

type Filters = {
  leave_type: "" | LeaveType;
  status: "" | LeaveStatus;
  user_name: string;
  created_at: string;
  is_ascending: "ASC" | "DESC";
};

const EMPTY_FILTERS: Filters = {
  leave_type: "",
  status: "",
  user_name: "",
  created_at: "",
  is_ascending: "DESC",
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function leaveTypeLabel(t: string): string {
  if (t === "full_day") return "Full day";
  if (t === "half_day") return "Half day";
  if (t === "short_leave") return "Short leave";
  return t;
}

function statusBadgeClass(status: string): string {
  const s = String(status).toLowerCase();
  if (s === "approved")
    return "bg-emerald-50 text-emerald-800 ring-emerald-600/15";
  if (s === "rejected") return "bg-rose-50 text-rose-800 ring-rose-600/15";
  return "bg-amber-50 text-amber-900 ring-amber-600/15";
}

function ManageEmployeeLeavesPage() {
  const params = useParams();
  const orgId = String(params?.org_id ?? "");

  const [filters, setFilters] = useState<Filters>({ ...EMPTY_FILTERS });
  const [appliedFilters, setAppliedFilters] = useState<Filters>({ ...EMPTY_FILTERS });
  const [rows, setRows] = useState<LeaveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const buildQueryString = useCallback((f: Filters) => {
    const q = new URLSearchParams();
    if (f.leave_type) q.set("leave_type", f.leave_type);
    if (f.status) q.set("status", f.status);
    if (f.user_name.trim()) q.set("user_name", f.user_name.trim());
    if (f.created_at) q.set("created_at", f.created_at);
    q.set("is_ascending", f.is_ascending);
    return q.toString();
  }, []);

  const loadLeaves = useCallback(
    async (f: Filters, isManualRefresh = false) => {
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

      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const qs = buildQueryString(f);
        const res = await fetch(`${API_URL}/api/user/get-all-leaves?${qs}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json()) as { data?: LeaveRow[]; message?: string };
        if (!res.ok) {
          throw new Error(data.message || "Could not load leave requests.");
        }
        setRows(Array.isArray(data.data) ? data.data : []);
      } catch (e) {
        setRows([]);
        setError(e instanceof Error ? e.message : "Could not load leave requests.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [buildQueryString, orgId],
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      void loadLeaves(appliedFilters, false);
    }, 0);
    return () => window.clearTimeout(t);
  }, [appliedFilters, loadLeaves]);

  const applyFilters = () => {
    setAppliedFilters({ ...filters });
  };

  const resetFilters = () => {
    setFilters({ ...EMPTY_FILTERS });
    setAppliedFilters({ ...EMPTY_FILTERS });
  };

  const refresh = () => void loadLeaves(appliedFilters, true);

  const updateStatus = async (leaveId: number, status: LeaveStatus) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setNotice({ type: "err", text: "Not signed in." });
      return;
    }
    setNotice(null);
    setUpdatingId(leaveId);
    try {
      const res = await fetch(`${API_URL}/api/user/update-leave-status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ leave_id: leaveId, status }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        throw new Error(data.message || "Update failed.");
      }
      setNotice({ type: "ok", text: data.message || "Leave updated." });
      await loadLeaves(appliedFilters, false);
    } catch (e) {
      setNotice({
        type: "err",
        text: e instanceof Error ? e.message : "Update failed.",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    if (!notice || notice.type !== "ok") return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  const counts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    for (const r of rows) {
      const s = String(r.status).toLowerCase();
      if (s === "pending") pending += 1;
      else if (s === "approved") approved += 1;
      else if (s === "rejected") rejected += 1;
    }
    return { pending, approved, rejected, total: rows.length };
  }, [rows]);

  return (
    <section className="min-h-full space-y-6 bg-gradient-to-b from-slate-50/80 to-white p-4 sm:p-6 lg:p-8">
      <header className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40">
        <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-600/5 via-white to-sky-600/5 px-5 py-6 sm:px-8 sm:py-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-600/90">
            Organization · Employees
          </p>
          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#0C123A] sm:text-3xl">
                Leave management
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                Review employee leave requests, filter by type or status, and approve or reject
                without leaving this workspace. Use refresh to sync the latest data.
              </p>
            </div>
            <button
              type="button"
              onClick={refresh}
              disabled={loading || refreshing}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-900 disabled:cursor-not-allowed disabled:opacity-55"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin text-indigo-600" : ""}`}
                aria-hidden
              />
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <StatPill label="Pending" value={counts.pending} tone="amber" />
            <StatPill label="Approved" value={counts.approved} tone="emerald" />
            <StatPill label="Rejected" value={counts.rejected} tone="rose" />
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              {counts.total} request{counts.total === 1 ? "" : "s"} in view
            </span>
          </div>
        </div>
      </header>

      {notice ? (
        <div
          role="status"
          className={
            notice.type === "ok"
              ? "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
              : "rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
          }
        >
          {notice.text}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2 text-slate-800">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
            <Filter className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-base font-semibold text-[#0C123A]">Filters</h2>
            <p className="text-xs text-slate-500">Narrow the list, then apply to reload from the server.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
          <label className="lg:col-span-2 block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Leave type
            </span>
            <select
              value={filters.leave_type}
              onChange={(e) =>
                setFilters((p) => ({
                  ...p,
                  leave_type: e.target.value as Filters["leave_type"],
                }))
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-800 outline-none ring-indigo-500/20 focus:border-indigo-300 focus:bg-white focus:ring-2"
            >
              <option value="">All types</option>
              <option value="full_day">Full day</option>
              <option value="half_day">Half day</option>
              <option value="short_leave">Short leave</option>
            </select>
          </label>
          <label className="lg:col-span-2 block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Status
            </span>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((p) => ({ ...p, status: e.target.value as Filters["status"] }))
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-800 outline-none ring-indigo-500/20 focus:border-indigo-300 focus:bg-white focus:ring-2"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
          <label className="lg:col-span-3 block">
            <span className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Search className="h-3 w-3" aria-hidden />
              Employee name
            </span>
            <input
              type="text"
              value={filters.user_name}
              onChange={(e) => setFilters((p) => ({ ...p, user_name: e.target.value }))}
              placeholder="Exact match on record"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 ring-indigo-500/20 focus:border-indigo-300 focus:bg-white focus:ring-2"
            />
          </label>
          <label className="lg:col-span-2 block">
            <span className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <CalendarDays className="h-3 w-3" aria-hidden />
              Submitted on
            </span>
            <input
              type="date"
              value={filters.created_at}
              onChange={(e) => setFilters((p) => ({ ...p, created_at: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-800 outline-none ring-indigo-500/20 focus:border-indigo-300 focus:bg-white focus:ring-2"
            />
          </label>
          <label className="lg:col-span-2 block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Sort by submitted
            </span>
            <select
              value={filters.is_ascending}
              onChange={(e) =>
                setFilters((p) => ({
                  ...p,
                  is_ascending: e.target.value as "ASC" | "DESC",
                }))
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-800 outline-none ring-indigo-500/20 focus:border-indigo-300 focus:bg-white focus:ring-2"
            >
              <option value="DESC">Newest first</option>
              <option value="ASC">Oldest first</option>
            </select>
          </label>
          <div className="flex flex-wrap gap-2 lg:col-span-1 lg:justify-end">
            <button
              type="button"
              onClick={applyFilters}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
          <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-indigo-500" aria-hidden />
          Loading leave requests…
        </div>
      ) : null}

      {error && !loading ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
      ) : null}

      {!loading && !error ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3.5 sm:px-5">Employee</th>
                  <th className="px-4 py-3.5 sm:px-5">Type</th>
                  <th className="px-4 py-3.5 sm:px-5">Dates</th>
                  <th className="px-4 py-3.5 sm:px-5">Reason</th>
                  <th className="px-4 py-3.5 sm:px-5">Status</th>
                  <th className="px-4 py-3.5 sm:px-5">Submitted</th>
                  <th className="px-4 py-3.5 text-right sm:px-5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center text-slate-500">
                      <p className="font-medium text-slate-700">No leave requests match your filters.</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Adjust filters or refresh to see new submissions.
                      </p>
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      key={row.id}
                      className="bg-white transition hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-4 sm:px-5">
                        <div className="font-semibold text-slate-900">{row.user_name}</div>
                        <div className="mt-0.5 text-xs text-slate-500">{row.user_email}</div>
                      </td>
                      <td className="px-4 py-4 text-slate-700 sm:px-5">
                        {leaveTypeLabel(String(row.leave_type))}
                      </td>
                      <td className="px-4 py-4 text-slate-700 sm:px-5">
                        <div>{formatDate(row.start_date)}</div>
                        {row.end_date ? (
                          <div className="text-xs text-slate-500">to {formatDate(row.end_date)}</div>
                        ) : null}
                      </td>
                      <td className="max-w-[220px] px-4 py-4 text-slate-600 sm:px-5">
                        <p className="line-clamp-2 text-xs sm:text-sm" title={row.reason || ""}>
                          {row.reason?.trim() ? row.reason : "—"}
                        </p>
                      </td>
                      <td className="px-4 py-4 sm:px-5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusBadgeClass(String(row.status))}`}
                        >
                          {String(row.status)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600 sm:px-5">
                        {formatDateTime(row.created_at)}
                      </td>
                      <td className="px-4 py-4 text-right sm:px-5">
                        <LeaveActions
                          current={String(row.status).toLowerCase() as LeaveStatus}
                          disabled={updatingId === row.id}
                          onApprove={() => void updateStatus(row.id, "approved")}
                          onReject={() => void updateStatus(row.id, "rejected")}
                          onPending={() => void updateStatus(row.id, "pending")}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function StatPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "amber" | "emerald" | "rose";
}) {
  const tones = {
    amber: "border-amber-200/80 bg-amber-50 text-amber-950",
    emerald: "border-emerald-200/80 bg-emerald-50 text-emerald-950",
    rose: "border-rose-200/80 bg-rose-50 text-rose-950",
  };
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${tones[tone]}`}
    >
      {label}
      <span className="rounded-md bg-white/80 px-1.5 py-0.5 text-[11px] tabular-nums shadow-sm">
        {value}
      </span>
    </span>
  );
}

function LeaveActions({
  current,
  disabled,
  onApprove,
  onReject,
  onPending,
}: {
  current: LeaveStatus;
  disabled: boolean;
  onApprove: () => void;
  onReject: () => void;
  onPending: () => void;
}) {
  return (
    <div className="inline-flex flex-wrap justify-end gap-1.5">
      <button
        type="button"
        disabled={disabled || current === "approved"}
        onClick={onApprove}
        title="Approve"
        className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
        Approve
      </button>
      <button
        type="button"
        disabled={disabled || current === "rejected"}
        onClick={onReject}
        title="Reject"
        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs font-semibold text-rose-900 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <XCircle className="h-3.5 w-3.5" aria-hidden />
        Reject
      </button>
      <button
        type="button"
        disabled={disabled || current === "pending"}
        onClick={onPending}
        title="Set back to pending"
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Clock className="h-3.5 w-3.5" aria-hidden />
        Pending
      </button>
    </div>
  );
}

export default ManageEmployeeLeavesPage;
