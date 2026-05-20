"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  Filter,
  RefreshCw,
  Search,
  X,
  XCircle,
} from "lucide-react";
import { getAllOrgUsers, type OrgUserRow } from "@/services/adminUser";
import {
  attendanceCategoryLabel,
  fetchAllAttendanceQueries,
  updateAttendanceQueryStatus,
  type AttendanceQueryCategory,
  type AttendanceQueryRow,
} from "@/services/attendanceQueries";

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

type AttFilters = {
  query_status: "" | "pending" | "approved" | "rejected";
  category: "" | AttendanceQueryCategory;
  query_message: string;
  attendance_date: string;
};

const EMPTY_FILTERS: Filters = {
  leave_type: "",
  status: "",
  user_name: "",
  created_at: "",
  is_ascending: "DESC",
};

const EMPTY_ATT_FILTERS: AttFilters = {
  query_status: "",
  category: "",
  query_message: "",
  attendance_date: "",
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

function userDisplayName(
  userId: number,
  users: OrgUserRow[],
): { name: string; email: string } {
  const u = users.find((x) => Number(x.id) === Number(userId));
  if (u) {
    return {
      name: String(u.user_name ?? `User #${userId}`),
      email: String(u.user_email ?? ""),
    };
  }
  return { name: `User #${userId}`, email: "" };
}

function ManageEmployeeLeavesPage() {
  const params = useParams();
  const orgId = String(params?.org_id ?? "");

  const [mainTab, setMainTab] = useState<"leaves" | "attendance">("leaves");

  const [filters, setFilters] = useState<Filters>({ ...EMPTY_FILTERS });
  const [appliedFilters, setAppliedFilters] = useState<Filters>({
    ...EMPTY_FILTERS,
  });
  const [rows, setRows] = useState<LeaveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [attFilters, setAttFilters] = useState<AttFilters>({ ...EMPTY_ATT_FILTERS });
  const [appliedAttFilters, setAppliedAttFilters] = useState<AttFilters>({
    ...EMPTY_ATT_FILTERS,
  });
  const [attRows, setAttRows] = useState<AttendanceQueryRow[]>([]);
  const [orgUsers, setOrgUsers] = useState<OrgUserRow[]>([]);
  const [attLoading, setAttLoading] = useState(false);
  const [attRefreshing, setAttRefreshing] = useState(false);
  const [attError, setAttError] = useState<string | null>(null);
  const [attModal, setAttModal] = useState<{
    id: number;
    action: "approved" | "rejected";
  } | null>(null);
  const [attModalReason, setAttModalReason] = useState("");
  const [attModalSubmitting, setAttModalSubmitting] = useState(false);

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

  const loadAttendance = useCallback(
    async (f: AttFilters, isManualRefresh = false) => {
      const token = localStorage.getItem("token");
      if (!token) {
        setAttError("Not signed in.");
        setAttLoading(false);
        setAttRefreshing(false);
        return;
      }
      const orgIdNum = Number(orgId);
      if (!orgId || Number.isNaN(orgIdNum)) {
        setAttError("Invalid organization.");
        setAttLoading(false);
        setAttRefreshing(false);
        return;
      }

      if (isManualRefresh) setAttRefreshing(true);
      else setAttLoading(true);
      setAttError(null);

      try {
        const [users, queries] = await Promise.all([
          getAllOrgUsers(token),
          fetchAllAttendanceQueries(token, orgIdNum, {
            query_status: f.query_status || undefined,
            category: f.category || undefined,
            query_message: f.query_message.trim() || undefined,
            attendance_date: f.attendance_date.trim() || undefined,
          }),
        ]);
        setOrgUsers(users);
        setAttRows(queries);
      } catch (e) {
        setAttRows([]);
        setOrgUsers([]);
        setAttError(
          e instanceof Error ? e.message : "Could not load attendance queries.",
        );
      } finally {
        setAttLoading(false);
        setAttRefreshing(false);
      }
    },
    [orgId],
  );

  useEffect(() => {
    if (mainTab !== "leaves") return;
    const t = window.setTimeout(() => {
      void loadLeaves(appliedFilters, false);
    }, 0);
    return () => window.clearTimeout(t);
  }, [appliedFilters, loadLeaves, mainTab]);

  useEffect(() => {
    if (mainTab !== "attendance") return;
    const t = window.setTimeout(() => {
      void loadAttendance(appliedAttFilters, false);
    }, 0);
    return () => window.clearTimeout(t);
  }, [appliedAttFilters, loadAttendance, mainTab]);

  const applyFilters = () => {
    setAppliedFilters({ ...filters });
  };

  const resetFilters = () => {
    setFilters({ ...EMPTY_FILTERS });
    setAppliedFilters({ ...EMPTY_FILTERS });
  };

  const applyAttFilters = () => {
    setAppliedAttFilters({ ...attFilters });
  };

  const resetAttFilters = () => {
    setAttFilters({ ...EMPTY_ATT_FILTERS });
    setAppliedAttFilters({ ...EMPTY_ATT_FILTERS });
  };

  const refresh = () => {
    if (mainTab === "leaves") void loadLeaves(appliedFilters, true);
    else void loadAttendance(appliedAttFilters, true);
  };

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

  const openAttModal = (id: number, action: "approved" | "rejected") => {
    setAttModal({ id, action });
    setAttModalReason("");
  };

  const submitAttModal = async () => {
    const token = localStorage.getItem("token");
    if (!token || !attModal) {
      setNotice({ type: "err", text: "Not signed in." });
      return;
    }
    const orgIdNum = Number(orgId);
    if (Number.isNaN(orgIdNum)) return;

    const reason = attModalReason.trim();
    if (!reason) {
      setNotice({ type: "err", text: "Please enter a reason for HR / audit trail." });
      return;
    }

    setAttModalSubmitting(true);
    setNotice(null);
    try {
      await updateAttendanceQueryStatus(token, {
        org_id: orgIdNum,
        query_id: attModal.id,
        query_status: attModal.action === "approved" ? "approved" : "rejected",
        admin_response: reason,
      });
      setNotice({
        type: "ok",
        text:
          attModal.action === "approved"
            ? "Attendance query approved."
            : "Attendance query rejected.",
      });
      setAttModal(null);
      await loadAttendance(appliedAttFilters, false);
    } catch (e) {
      setNotice({
        type: "err",
        text:
          e instanceof Error ? e.message : "Could not update attendance query.",
      });
    } finally {
      setAttModalSubmitting(false);
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

  const attCounts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    for (const r of attRows) {
      const s = String(r.query_status).toLowerCase();
      if (s === "pending") pending += 1;
      else if (s === "approved") approved += 1;
      else if (s === "rejected") rejected += 1;
    }
    return { pending, approved, rejected, total: attRows.length };
  }, [attRows]);

  const isBusy =
    mainTab === "leaves"
      ? loading || refreshing
      : attLoading || attRefreshing;

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
                Leave &amp; attendance requests
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                Switch between leave approvals and attendance correction queues. Approve or
                reject attendance queries with a mandatory note for the record.
              </p>
            </div>
            <button
              type="button"
              onClick={refresh}
              disabled={isBusy}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-900 disabled:cursor-not-allowed disabled:opacity-55"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  (mainTab === "leaves" && refreshing) ||
                  (mainTab === "attendance" && attRefreshing)
                    ? "animate-spin text-indigo-600"
                    : ""
                }`}
                aria-hidden
              />
              {isBusy &&
              (mainTab === "leaves" ? refreshing : attRefreshing)
                ? "Refreshing…"
                : "Refresh"}
            </button>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100/80 pt-5">
            <button
              type="button"
              onClick={() => setMainTab("leaves")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                mainTab === "leaves"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <CalendarDays className="h-4 w-4" aria-hidden />
              Manage leaves
            </button>
            <button
              type="button"
              onClick={() => setMainTab("attendance")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                mainTab === "attendance"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <ClipboardList className="h-4 w-4" aria-hidden />
              Attendance queries
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {mainTab === "leaves" ? (
              <>
                <StatPill label="Pending" value={counts.pending} tone="amber" />
                <StatPill label="Approved" value={counts.approved} tone="emerald" />
                <StatPill label="Rejected" value={counts.rejected} tone="rose" />
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                  {counts.total} leave request{counts.total === 1 ? "" : "s"} in view
                </span>
              </>
            ) : (
              <>
                <StatPill label="Pending" value={attCounts.pending} tone="amber" />
                <StatPill label="Approved" value={attCounts.approved} tone="emerald" />
                <StatPill label="Rejected" value={attCounts.rejected} tone="rose" />
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                  {attCounts.total} attendance quer
                  {attCounts.total === 1 ? "y" : "ies"} in view
                </span>
              </>
            )}
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

      {mainTab === "leaves" ? (
       <>
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
      </>
      ) : (
        <>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2 text-slate-800">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
                <Filter className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <h2 className="text-base font-semibold text-[#0C123A]">Filters</h2>
                <p className="text-xs text-slate-500">
                  Scope attendance correction requests; results use the admin list API.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
              <label className="lg:col-span-2 block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </span>
                <select
                  value={attFilters.query_status}
                  onChange={(e) =>
                    setAttFilters((p) => ({
                      ...p,
                      query_status: e.target.value as AttFilters["query_status"],
                    }))
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
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Issue type
                </span>
                <select
                  value={attFilters.category}
                  onChange={(e) =>
                    setAttFilters((p) => ({
                      ...p,
                      category: e.target.value as AttFilters["category"],
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-800 outline-none ring-indigo-500/20 focus:border-indigo-300 focus:bg-white focus:ring-2"
                >
                  <option value="">All types</option>
                  <option value="forget_punch_in">Forgot punch in</option>
                  <option value="forget_punch_out">Forgot punch out</option>
                  <option value="late_punch_in">Late punch in</option>
                </select>
              </label>
              <label className="lg:col-span-3 block">
                <span className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Search className="h-3 w-3" aria-hidden />
                  Message contains
                </span>
                <input
                  type="text"
                  value={attFilters.query_message}
                  onChange={(e) =>
                    setAttFilters((p) => ({ ...p, query_message: e.target.value }))
                  }
                  placeholder="Search in employee explanation"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 ring-indigo-500/20 focus:border-indigo-300 focus:bg-white focus:ring-2"
                />
              </label>
              <label className="lg:col-span-2 block">
                <span className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <CalendarDays className="h-3 w-3" aria-hidden />
                  Attendance date
                </span>
                <input
                  type="date"
                  value={attFilters.attendance_date}
                  onChange={(e) =>
                    setAttFilters((p) => ({ ...p, attendance_date: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-800 outline-none ring-indigo-500/20 focus:border-indigo-300 focus:bg-white focus:ring-2"
                />
              </label>
              <div className="flex flex-wrap gap-2 lg:col-span-2 lg:justify-end">
                <button
                  type="button"
                  onClick={applyAttFilters}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={resetAttFilters}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {attLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
              <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-indigo-500" aria-hidden />
              Loading attendance queries…
            </div>
          ) : null}

          {attError && !attLoading ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {attError}
            </div>
          ) : null}

          {!attLoading && !attError ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-[960px] w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3.5 sm:px-5">Employee</th>
                      <th className="px-4 py-3.5 sm:px-5">Issue</th>
                      <th className="px-4 py-3.5 sm:px-5">Attendance date</th>
                      <th className="px-4 py-3.5 sm:px-5">Explanation</th>
                      <th className="px-4 py-3.5 sm:px-5">Status</th>
                      <th className="px-4 py-3.5 sm:px-5">Submitted</th>
                      <th className="px-4 py-3.5 text-right sm:px-5">Actions / resolution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-16 text-center text-slate-500">
                          <p className="font-medium text-slate-700">
                            No attendance queries match your filters.
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Adjust filters or refresh. New employee submissions appear here.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      attRows.map((row) => {
                        const emp = userDisplayName(row.user_id, orgUsers);
                        const pending =
                          String(row.query_status).toLowerCase() === "pending";
                        return (
                          <tr key={row.id} className="bg-white transition hover:bg-slate-50/80">
                            <td className="px-4 py-4 sm:px-5">
                              <div className="font-semibold text-slate-900">{emp.name}</div>
                              {emp.email ? (
                                <div className="mt-0.5 text-xs text-slate-500">{emp.email}</div>
                              ) : null}
                            </td>
                            <td className="px-4 py-4 text-slate-700 sm:px-5">
                              {attendanceCategoryLabel(row.category)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-slate-700 sm:px-5">
                              {formatDate(row.attendance_date)}
                            </td>
                            <td className="max-w-[240px] px-4 py-4 text-slate-600 sm:px-5">
                              <p className="line-clamp-3 text-xs sm:text-sm" title={row.query_message}>
                                {row.query_message}
                              </p>
                            </td>
                            <td className="px-4 py-4 sm:px-5">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusBadgeClass(row.query_status)}`}
                              >
                                {row.query_status}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600 sm:px-5">
                              {formatDateTime(row.created_at)}
                            </td>
                            <td className="px-4 py-4 text-right sm:px-5">
                              {pending ? (
                                <div className="inline-flex flex-wrap justify-end gap-1.5">
                                  <button
                                    type="button"
                                    disabled={
                                      attModalSubmitting && attModal?.id === row.id
                                    }
                                    onClick={() => openAttModal(row.id, "approved")}
                                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-100 disabled:opacity-40"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    disabled={
                                      attModalSubmitting && attModal?.id === row.id
                                    }
                                    onClick={() => openAttModal(row.id, "rejected")}
                                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs font-semibold text-rose-900 transition hover:bg-rose-100 disabled:opacity-40"
                                  >
                                    <XCircle className="h-3.5 w-3.5" aria-hidden />
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <div className="max-w-[280px] text-left text-xs leading-relaxed text-slate-600 sm:ml-auto sm:text-right">
                                  {row.approved_by_name ? (
                                    <p className="font-semibold text-slate-800">
                                      By {row.approved_by_name}
                                    </p>
                                  ) : null}
                                  {row.admin_response ? (
                                    <p className="mt-1 text-slate-600">
                                      <span className="font-medium text-slate-700">Note:</span>{" "}
                                      {row.admin_response}
                                    </p>
                                  ) : (
                                    <p className="mt-1 text-slate-400">No admin note on file.</p>
                                  )}
                                  {row.resolved_at ? (
                                    <p className="mt-1 text-[10px] text-slate-400">
                                      Resolved {formatDateTime(row.resolved_at)}
                                    </p>
                                  ) : null}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </>
      )}

      {attModal ? (
        <div
          className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-950/50 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="att-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close"
            onClick={() => !attModalSubmitting && setAttModal(null)}
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 id="att-modal-title" className="text-lg font-semibold text-[#0C123A]">
                  {attModal.action === "approved"
                    ? "Approve attendance query"
                    : "Reject attendance query"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  This note is stored as the admin response and visible to the employee.
                </p>
              </div>
              <button
                type="button"
                disabled={attModalSubmitting}
                onClick={() => setAttModal(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-5 py-4">
              <label className="block">
                <span className="text-xs font-semibold text-slate-700">Reason / response</span>
                <textarea
                  value={attModalReason}
                  onChange={(e) => setAttModalReason(e.target.value)}
                  rows={4}
                  placeholder="Explain the decision (required)…"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none ring-indigo-500/20 focus:border-indigo-300 focus:ring-2"
                />
              </label>
            </div>
            <div className="flex gap-2 border-t border-slate-100 bg-slate-50/90 px-5 py-3">
              <button
                type="button"
                disabled={attModalSubmitting}
                onClick={() => setAttModal(null)}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={attModalSubmitting}
                onClick={() => void submitAttModal()}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50 ${
                  attModal.action === "approved"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {attModalSubmitting
                  ? "Submitting…"
                  : attModal.action === "approved"
                    ? "Submit approval"
                    : "Submit rejection"}
              </button>
            </div>
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
  const isPending = current === "pending";

  return (
    <div className="inline-flex flex-wrap justify-end gap-1.5">
      <button
        type="button"
        disabled={disabled || !isPending}
        onClick={onApprove}
        title={isPending ? "Approve" : "Only pending requests can be approved"}
        className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
        Approve
      </button>
      <button
        type="button"
        disabled={disabled || !isPending}
        onClick={onReject}
        title={isPending ? "Reject" : "Only pending requests can be rejected"}
        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs font-semibold text-rose-900 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <XCircle className="h-3.5 w-3.5" aria-hidden />
        Reject
      </button>
      <button
        type="button"
        disabled={disabled || isPending}
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
