"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Filter,
  RefreshCw,
  Search,
  X,
  XCircle,
  ChevronDown,
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
  if (s === "approved") return "bg-[#E6F4EA] text-[#0F9D58]";
  if (s === "rejected") return "bg-[#FCE8E6] text-[#D93025]";
  return "bg-[#FEF3E6] text-[#E8710A]";
}

function labelCls() {
  return "mb-1 block text-[12px] font-medium text-[#374151]";
}

function filterFieldCls() {
  return "w-full rounded-lg border border-[#E4E7EC] bg-white px-3 py-2 text-[14px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15";
}

function zohoPanelCls() {
  return "overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-sm";
}

function zohoPrimaryBtnCls(full = false) {
  return `inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-[#008CD3] px-4 py-2 text-[14px] font-medium text-white transition active:scale-[0.98] hover:bg-[#0070AA] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full lg:w-auto" : ""}`;
}

function zohoSecondaryBtnCls(full = false) {
  return `inline-flex min-h-[40px] items-center justify-center rounded-lg border border-[#E4E7EC] bg-white px-4 py-2 text-[14px] font-medium text-[#374151] transition hover:bg-[#F9FAFB] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full lg:w-auto" : ""}`;
}

function zohoApproveBtnCls(full = false) {
  return `inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-[#A8DAB5] bg-[#E6F4EA] px-3 py-2 text-[13px] font-medium text-[#0F9D58] transition hover:bg-[#E6F4EA]/80 disabled:cursor-not-allowed disabled:opacity-40 ${full ? "w-full" : ""}`;
}

function zohoRejectBtnCls(full = false) {
  return `inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2 text-[13px] font-medium text-[#D93025] transition hover:bg-[#FCE8E6]/80 disabled:cursor-not-allowed disabled:opacity-40 ${full ? "w-full" : ""}`;
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

  const [mainTab, setMainTab] = useState<"leaves" | "attendance">("attendance");

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
    employee_id: number;
    action: "approved" | "rejected";
  } | null>(null);
  const [attModalReason, setAttModalReason] = useState("");
  const [attModalSubmitting, setAttModalSubmitting] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

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
    setMobileFiltersOpen(false);
  };

  const resetFilters = () => {
    setFilters({ ...EMPTY_FILTERS });
    setAppliedFilters({ ...EMPTY_FILTERS });
  };

  const applyAttFilters = () => {
    setAppliedAttFilters({ ...attFilters });
    setMobileFiltersOpen(false);
  };

  const resetAttFilters = () => {
    setAttFilters({ ...EMPTY_ATT_FILTERS });
    setAppliedAttFilters({ ...EMPTY_ATT_FILTERS });
  };

  const refresh = () => {
    if (mainTab === "leaves") void loadLeaves(appliedFilters, true);
    else void loadAttendance(appliedAttFilters, true);
  };

  const updateStatus = async (
    leaveId: number,
    status: Exclude<LeaveStatus, "pending">,
  ) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setNotice({ type: "err", text: "Not signed in." });
      return;
    }
    setNotice(null);
    setUpdatingId(leaveId);
    try {
      const res = await fetch(`${API_URL}/api/user/update-leave-query-status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query_id: leaveId, query_status: status }),
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

  const openAttModal = (
    id: number,
    employeeId: number,
    action: "approved" | "rejected",
  ) => {
    setAttModal({ id, employee_id: employeeId, action });
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
        employee_id: attModal.employee_id,
        query_id: attModal.id,
        updated_query_status: attModal.action,
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

  const activeCounts = mainTab === "leaves" ? counts : attCounts;
  const listTotal = activeCounts.total;

  return (
    <section className="min-h-full space-y-3 bg-[#F5F7FA] p-0 max-lg:-mx-1 sm:max-lg:-mx-2 lg:mx-auto lg:max-w-6xl lg:space-y-4 lg:p-6">
      {/* Mobile & tablet: sticky app header */}
      <div className="sticky top-0 z-20 border-b border-[#E4E7EC] bg-white shadow-sm px-3 pb-2.5 pt-2.5 sm:px-4 lg:hidden">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
              <ClipboardList className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Organization · Employees
              </p>
              <h1 className="truncate text-[16px] font-semibold text-[#1F2937]">
                Leave &amp; attendance
              </h1>
            </div>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={isBusy}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#008CD3] active:bg-[#F5F7FA] disabled:opacity-50"
            aria-label="Refresh list"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                (mainTab === "leaves" && refreshing) ||
                (mainTab === "attendance" && attRefreshing)
                  ? "animate-spin"
                  : ""
              }`}
              aria-hidden
            />
          </button>
        </div>

        <div className="mt-2.5 flex rounded-lg bg-[#F5F7FA] p-0.5">
          <button
            type="button"
            onClick={() => {
              setMainTab("attendance");
              setMobileFiltersOpen(false);
            }}
            className={`flex min-h-[36px] flex-1 items-center justify-center gap-1 rounded-md px-1 py-1.5 text-[11px] font-medium transition sm:text-[12px] ${
              mainTab === "attendance"
                ? "bg-white text-[#008CD3] shadow-sm"
                : "text-[#6B7280]"
            }`}
          >
            <ClipboardList className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
            <span className="truncate">Attendance</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMainTab("leaves");
              setMobileFiltersOpen(false);
            }}
            className={`flex min-h-[36px] flex-1 items-center justify-center gap-1 rounded-md px-1 py-1.5 text-[11px] font-medium transition sm:text-[12px] ${
              mainTab === "leaves"
                ? "bg-white text-[#008CD3] shadow-sm"
                : "text-[#6B7280]"
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
            <span className="truncate">Leave</span>
          </button>
        </div>

        <div className="mt-2.5 grid grid-cols-3 gap-1.5">
          <MobileStatTile label="Pending" value={activeCounts.pending} tone="amber" />
          <MobileStatTile label="Approved" value={activeCounts.approved} tone="emerald" />
          <MobileStatTile label="Rejected" value={activeCounts.rejected} tone="rose" />
        </div>
        <p className="mt-1.5 text-center text-[11px] text-[#6B7280]">
          {listTotal} {mainTab === "leaves" ? "leave request" : "attendance quer"}
          {listTotal === 1 ? (mainTab === "leaves" ? "" : "y") : mainTab === "leaves" ? "s" : "ies"}{" "}
          in view
        </p>
      </div>

      {/* Desktop: page header */}
      <header className={`${zohoPanelCls()} hidden p-4 lg:block`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
              <ClipboardList className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Organization · Employees
              </p>
              <h1 className="text-[18px] font-semibold text-[#1F2937]">
                Leave &amp; attendance requests
              </h1>
              <p className="mt-0.5 max-w-2xl text-[13px] text-[#6B7280]">
                Approve leave and attendance correction queues. Attendance decisions require an
                admin note.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={isBusy}
            className={zohoSecondaryBtnCls()}
          >
            <RefreshCw
              className={`h-4 w-4 ${
                (mainTab === "leaves" && refreshing) ||
                (mainTab === "attendance" && attRefreshing)
                  ? "animate-spin"
                  : ""
              }`}
              aria-hidden
            />
            {isBusy && (mainTab === "leaves" ? refreshing : attRefreshing)
              ? "Refreshing…"
              : "Refresh"}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-[#E4E7EC] pt-4">
          <button
            type="button"
            onClick={() => {
              setMainTab("attendance");
              setMobileFiltersOpen(false);
            }}
            className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${
              mainTab === "attendance"
                ? "bg-[#008CD3] text-white"
                : "border border-[#E4E7EC] bg-white text-[#374151] hover:bg-[#F9FAFB]"
            }`}
          >
            <ClipboardList className="h-4 w-4" aria-hidden />
            Attendance queries
          </button>
          <button
            type="button"
            onClick={() => {
              setMainTab("leaves");
              setMobileFiltersOpen(false);
            }}
            className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${
              mainTab === "leaves"
                ? "bg-[#008CD3] text-white"
                : "border border-[#E4E7EC] bg-white text-[#374151] hover:bg-[#F9FAFB]"
            }`}
          >
            <CalendarDays className="h-4 w-4" aria-hidden />
            Leave queries
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {mainTab === "leaves" ? (
            <>
              <StatPill label="Pending" value={counts.pending} tone="amber" />
              <StatPill label="Approved" value={counts.approved} tone="emerald" />
              <StatPill label="Rejected" value={counts.rejected} tone="rose" />
              <span className="inline-flex min-h-[32px] items-center rounded-lg bg-[#F5F7FA] px-2.5 text-[12px] font-medium text-[#6B7280]">
                {counts.total} leave request{counts.total === 1 ? "" : "s"} in view
              </span>
            </>
          ) : (
            <>
              <StatPill label="Pending" value={attCounts.pending} tone="amber" />
              <StatPill label="Approved" value={attCounts.approved} tone="emerald" />
              <StatPill label="Rejected" value={attCounts.rejected} tone="rose" />
              <span className="inline-flex min-h-[32px] items-center rounded-lg bg-[#F5F7FA] px-2.5 text-[12px] font-medium text-[#6B7280]">
                {attCounts.total} attendance quer
                {attCounts.total === 1 ? "y" : "ies"} in view
              </span>
            </>
          )}
        </div>
      </header>

      {notice ? (
        <div
          role="status"
          className={`mx-3 sm:mx-4 lg:mx-0 ${
            notice.type === "ok"
              ? "rounded-lg border border-[#A8DAB5] bg-[#E6F4EA] px-3 py-2.5 text-[13px] text-[#1F2937]"
              : "rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2.5 text-[13px] text-[#1F2937]"
          }`}
        >
          {notice.text}
        </div>
      ) : null}

      {mainTab === "leaves" ? (
       <>
      <div className={`${zohoPanelCls()} p-3 sm:p-4 lg:p-5 mx-3 sm:mx-4 lg:mx-0`}>
        <button
          type="button"
          onClick={() => setMobileFiltersOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 text-left lg:hidden"
          aria-expanded={mobileFiltersOpen}
        >
          <div className="flex items-center gap-2 text-[#1F2937]">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#008CD3] text-white">
              <Filter className="h-3.5 w-3.5" aria-hidden />
            </span>
            <div>
              <h2 className="text-[14px] font-semibold text-[#1F2937]">Filters</h2>
              <p className="text-[11px] text-[#6B7280]">Tap to {mobileFiltersOpen ? "hide" : "show"}</p>
            </div>
          </div>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-[#9CA3AF] transition ${mobileFiltersOpen ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        <div className="hidden items-center gap-2 text-[#1F2937] lg:flex">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#008CD3] text-white">
            <Filter className="h-3.5 w-3.5" aria-hidden />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-[#1F2937]">Filters</h2>
            <p className="text-[12px] text-[#6B7280]">Narrow the list, then apply to reload from the server.</p>
          </div>
        </div>

        <div className={`${mobileFiltersOpen ? "mt-4 block" : "hidden"} lg:mt-5 lg:block`}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
          <label className="lg:col-span-2 block">
            <span className={labelCls()}>
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
              className={filterFieldCls()}
            >
              <option value="">All types</option>
              <option value="full_day">Full day</option>
              <option value="half_day">Half day</option>
              <option value="short_leave">Short leave</option>
            </select>
          </label>
          <label className="lg:col-span-2 block">
            <span className={labelCls()}>
              Status
            </span>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((p) => ({ ...p, status: e.target.value as Filters["status"] }))
              }
              className={filterFieldCls()}
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
          <label className="lg:col-span-3 block">
            <span className={`${labelCls()} flex items-center gap-1`}>
              <Search className="h-3 w-3" aria-hidden />
              Employee name
            </span>
            <input
              type="text"
              value={filters.user_name}
              onChange={(e) => setFilters((p) => ({ ...p, user_name: e.target.value }))}
              placeholder="Exact match on record"
              className={filterFieldCls()}
            />
          </label>
          <label className="lg:col-span-2 block">
            <span className={`${labelCls()} flex items-center gap-1`}>
              <CalendarDays className="h-3 w-3" aria-hidden />
              Submitted on
            </span>
            <input
              type="date"
              value={filters.created_at}
              onChange={(e) => setFilters((p) => ({ ...p, created_at: e.target.value }))}
              className={filterFieldCls()}
            />
          </label>
          <label className="lg:col-span-2 block">
            <span className={labelCls()}>
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
              className={filterFieldCls()}
            >
              <option value="DESC">Newest first</option>
              <option value="ASC">Oldest first</option>
            </select>
          </label>
          <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-1 lg:flex-row lg:flex-wrap lg:justify-end">
            <button
              type="button"
              onClick={applyFilters}
              className={zohoPrimaryBtnCls(true)}
            >
              Apply
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className={zohoSecondaryBtnCls(true)}
            >
              Reset
            </button>
          </div>
        </div>
        </div>
      </div>

      {loading ? (
        <div className={`${zohoPanelCls()} mx-3 p-10 text-center text-[14px] text-[#6B7280] sm:mx-4 lg:mx-0`}>
          <RefreshCw className="mx-auto mb-2 h-7 w-7 animate-spin text-[#008CD3]" aria-hidden />
          Loading leave requests…
        </div>
      ) : null}

      {error && !loading ? (
        <div className="mx-3 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2.5 text-[13px] text-[#1F2937] sm:mx-4 lg:mx-0">
          {error}
        </div>
      ) : null}

      {!loading && !error ? (
        <div className={`${zohoPanelCls()} p-3 sm:p-4 lg:p-5 mx-3 overflow-hidden sm:mx-4 lg:mx-0 lg:p-0`}>
          {/* Mobile & tablet: card list */}
          <div className="space-y-2.5 lg:hidden lg:p-0">
            {rows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#E4E7EC] bg-[#F9FAFB] px-4 py-10 text-center text-[#6B7280]">
                <p className="font-medium text-[#374151]">No leave requests match your filters.</p>
                <p className="mt-1 text-[12px] text-[#6B7280]">
                  Adjust filters or refresh to see new submissions.
                </p>
              </div>
            ) : (
              rows.map((row) => (
                <LeaveRowCard
                  key={row.id}
                  row={row}
                  disabled={updatingId === row.id}
                  onApprove={() => void updateStatus(row.id, "approved")}
                  onReject={() => void updateStatus(row.id, "rejected")}
                />
              ))
            )}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="min-w-[900px] w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#E4E7EC] bg-[#F9FAFB] text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                  <th className="px-4 py-3.5 sm:px-5">Employee</th>
                  <th className="px-4 py-3.5 sm:px-5">Type</th>
                  <th className="px-4 py-3.5 sm:px-5">Dates</th>
                  <th className="px-4 py-3.5 sm:px-5">Reason</th>
                  <th className="px-4 py-3.5 sm:px-5">Status</th>
                  <th className="px-4 py-3.5 sm:px-5">Submitted</th>
                  <th className="px-4 py-3.5 text-right sm:px-5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E7EC]">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-[#6B7280]">
                      <p className="font-medium text-[#374151]">No leave requests match your filters.</p>
                      <p className="mt-1 text-[12px] text-[#6B7280]">
                        Adjust filters or refresh to see new submissions.
                      </p>
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      key={row.id}
                      className="bg-white transition hover:bg-[#F9FAFB]"
                    >
                      <td className="px-4 py-4 sm:px-5">
                        <div className="text-[14px] font-semibold text-[#1F2937]">{row.user_name}</div>
                        <div className="mt-0.5 text-[12px] text-[#6B7280]">{row.user_email}</div>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#374151] sm:px-5">
                        {leaveTypeLabel(String(row.leave_type))}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#374151] sm:px-5">
                        <div>{formatDate(row.start_date)}</div>
                        {row.end_date ? (
                          <div className="text-[12px] text-[#6B7280]">to {formatDate(row.end_date)}</div>
                        ) : null}
                      </td>
                      <td className="max-w-[220px] px-4 py-3 text-[13px] text-[#6B7280] sm:px-5">
                        <p className="line-clamp-2" title={row.reason || ""}>
                          {row.reason?.trim() ? row.reason : "—"}
                        </p>
                      </td>
                      <td className="px-4 py-4 sm:px-5">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${statusBadgeClass(String(row.status))}`}
                        >
                          {String(row.status)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[12px] text-[#6B7280] sm:px-5">
                        {formatDateTime(row.created_at)}
                      </td>
                      <td className="px-4 py-4 text-right sm:px-5">
                        <LeaveActions
                          current={String(row.status).toLowerCase() as LeaveStatus}
                          disabled={updatingId === row.id}
                          onApprove={() => void updateStatus(row.id, "approved")}
                          onReject={() => void updateStatus(row.id, "rejected")}
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
          <div className={`${zohoPanelCls()} p-3 sm:p-4 lg:p-5 mx-3 sm:mx-4 lg:mx-0`}>
            <button
              type="button"
              onClick={() => setMobileFiltersOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-2 text-left lg:hidden"
              aria-expanded={mobileFiltersOpen}
            >
              <div className="flex items-center gap-2 text-[#1F2937]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#008CD3] text-white">
                  <Filter className="h-3.5 w-3.5" aria-hidden />
                </span>
                <div>
                  <h2 className="text-[14px] font-semibold text-[#1F2937]">Filters</h2>
                  <p className="text-[11px] text-[#6B7280]">Tap to {mobileFiltersOpen ? "hide" : "show"}</p>
                </div>
              </div>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-[#9CA3AF] transition ${mobileFiltersOpen ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>
            <div className="hidden items-center gap-2 text-[#1F2937] lg:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#008CD3] text-white">
                <Filter className="h-3.5 w-3.5" aria-hidden />
              </span>
              <div>
                <h2 className="text-[15px] font-semibold text-[#1F2937]">Filters</h2>
                <p className="text-[12px] text-[#6B7280]">
                  Scope attendance correction requests; results use the admin list API.
                </p>
              </div>
            </div>

            <div className={`${mobileFiltersOpen ? "mt-4 block" : "hidden"} lg:mt-5 lg:block`}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
              <label className="lg:col-span-2 block">
                <span className={labelCls()}>
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
                  className={filterFieldCls()}
                >
                  <option value="">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </label>
              <label className="lg:col-span-3 block">
                <span className={labelCls()}>
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
                  className={filterFieldCls()}
                >
                  <option value="">All types</option>
                  <option value="forget_punch_in">Forgot punch in</option>
                  <option value="forget_punch_out">Forgot punch out</option>
                  <option value="late_punch_in">Late punch in</option>
                </select>
              </label>
              <label className="lg:col-span-3 block">
                <span className={`${labelCls()} flex items-center gap-1`}>
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
                  className={filterFieldCls()}
                />
              </label>
              <label className="lg:col-span-2 block">
                <span className={`${labelCls()} flex items-center gap-1`}>
                  <CalendarDays className="h-3 w-3" aria-hidden />
                  Attendance date
                </span>
                <input
                  type="date"
                  value={attFilters.attendance_date}
                  onChange={(e) =>
                    setAttFilters((p) => ({ ...p, attendance_date: e.target.value }))
                  }
                  className={filterFieldCls()}
                />
              </label>
              <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-2 lg:flex-row lg:flex-wrap lg:justify-end">
                <button
                  type="button"
                  onClick={applyAttFilters}
                  className={zohoPrimaryBtnCls(true)}
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={resetAttFilters}
                  className={zohoSecondaryBtnCls(true)}
                >
                  Reset
                </button>
              </div>
            </div>
            </div>
          </div>

          {attLoading ? (
            <div className={`${zohoPanelCls()} mx-3 p-10 text-center text-[14px] text-[#6B7280] sm:mx-4 lg:mx-0`}>
              <RefreshCw className="mx-auto mb-2 h-7 w-7 animate-spin text-[#008CD3]" aria-hidden />
              Loading attendance queries…
            </div>
          ) : null}

          {attError && !attLoading ? (
            <div className="mx-3 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2.5 text-[13px] text-[#1F2937] sm:mx-4 lg:mx-0">
              {attError}
            </div>
          ) : null}

          {!attLoading && !attError ? (
            <div className={`${zohoPanelCls()} p-3 sm:p-4 lg:p-5 mx-3 overflow-hidden sm:mx-4 lg:mx-0 lg:p-0`}>
              {/* Mobile & tablet: card list */}
              <div className="space-y-2.5 lg:hidden lg:p-0">
                {attRows.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[#E4E7EC] bg-[#F9FAFB] px-4 py-10 text-center text-[#6B7280]">
                    <p className="font-medium text-[#374151]">
                      No attendance queries match your filters.
                    </p>
                    <p className="mt-1 text-[12px] text-[#6B7280]">
                      Adjust filters or refresh. New employee submissions appear here.
                    </p>
                  </div>
                ) : (
                  attRows.map((row) => {
                    const emp = userDisplayName(row.user_id, orgUsers);
                    const pending =
                      String(row.query_status).toLowerCase() === "pending";
                    return (
                      <AttendanceQueryCard
                        key={row.id}
                        row={row}
                        employeeName={emp.name}
                        employeeEmail={emp.email}
                        pending={pending}
                        modalBusy={attModalSubmitting && attModal?.id === row.id}
                        onApprove={() =>
                          openAttModal(row.id, row.user_id, "approved")
                        }
                        onReject={() =>
                          openAttModal(row.id, row.user_id, "rejected")
                        }
                      />
                    );
                  })
                )}
              </div>

              {/* Desktop: table */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-[960px] w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#E4E7EC] bg-[#F9FAFB] text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                      <th className="px-4 py-3.5 sm:px-5">Employee</th>
                      <th className="px-4 py-3.5 sm:px-5">Issue</th>
                      <th className="px-4 py-3.5 sm:px-5">Attendance date</th>
                      <th className="px-4 py-3.5 sm:px-5">Explanation</th>
                      <th className="px-4 py-3.5 sm:px-5">Status</th>
                      <th className="px-4 py-3.5 sm:px-5">Submitted</th>
                      <th className="px-4 py-3.5 text-right sm:px-5">Actions / resolution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E7EC]">
                    {attRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-[#6B7280]">
                          <p className="font-medium text-[#374151]">
                            No attendance queries match your filters.
                          </p>
                          <p className="mt-1 text-[12px] text-[#6B7280]">
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
                          <tr key={row.id} className="bg-white transition hover:bg-[#F9FAFB]">
                            <td className="px-4 py-3 sm:px-5">
                              <div className="text-[14px] font-semibold text-[#1F2937]">{emp.name}</div>
                              {emp.email ? (
                                <div className="mt-0.5 text-[12px] text-[#6B7280]">{emp.email}</div>
                              ) : null}
                            </td>
                            <td className="px-4 py-3 text-[13px] text-[#374151] sm:px-5">
                              {attendanceCategoryLabel(row.category)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-slate-700 sm:px-5">
                              {formatDate(row.attendance_date)}
                            </td>
                            <td className="max-w-[240px] px-4 py-3 text-[13px] text-[#6B7280] sm:px-5">
                              <p className="line-clamp-3" title={row.query_message}>
                                {row.query_message}
                              </p>
                            </td>
                            <td className="px-4 py-4 sm:px-5">
                              <span
                                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${statusBadgeClass(row.query_status)}`}
                              >
                                {row.query_status}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-[12px] text-[#6B7280] sm:px-5">
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
                                    onClick={() =>
                                      openAttModal(row.id, row.user_id, "approved")
                                    }
                                    className={zohoApproveBtnCls()}
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    disabled={
                                      attModalSubmitting && attModal?.id === row.id
                                    }
                                    onClick={() =>
                                      openAttModal(row.id, row.user_id, "rejected")
                                    }
                                    className={zohoRejectBtnCls()}
                                  >
                                    <XCircle className="h-3.5 w-3.5" aria-hidden />
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <div className="max-w-[280px] text-left text-[12px] leading-relaxed text-[#6B7280] sm:ml-auto sm:text-right">
                                  {row.approved_by_name ? (
                                    <p className="font-semibold text-[#374151]">
                                      By {row.approved_by_name}
                                    </p>
                                  ) : null}
                                  {row.admin_response ? (
                                    <p className="mt-1">
                                      <span className="font-medium text-[#374151]">Note:</span>{" "}
                                      {row.admin_response}
                                    </p>
                                  ) : (
                                    <p className="mt-1 text-[#9CA3AF]">No admin note on file.</p>
                                  )}
                                  {row.resolved_at ? (
                                    <p className="mt-1 text-[10px] text-[#9CA3AF]">
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
          className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
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
          <div className="relative w-full max-w-md overflow-hidden rounded-t-xl border border-[#E4E7EC] bg-white shadow-xl sm:rounded-lg">
            <div className="flex items-start justify-between border-b border-[#E4E7EC] px-4 py-3">
              <div>
                <h2 id="att-modal-title" className="text-[16px] font-semibold text-[#1F2937]">
                  {attModal.action === "approved"
                    ? "Approve attendance query"
                    : "Reject attendance query"}
                </h2>
                <p className="mt-0.5 text-[12px] text-[#6B7280]">
                  This note is stored as the admin response and visible to the employee.
                </p>
              </div>
              <button
                type="button"
                disabled={attModalSubmitting}
                onClick={() => setAttModal(null)}
                className="rounded-lg p-1.5 text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#1F2937] disabled:opacity-50"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-4 py-3">
              <label className="block">
                <span className={labelCls()}>Reason / response</span>
                <textarea
                  value={attModalReason}
                  onChange={(e) => setAttModalReason(e.target.value)}
                  rows={4}
                  placeholder="Explain the decision (required)…"
                  className={filterFieldCls()}
                />
              </label>
            </div>
            <div className="flex flex-col gap-2 border-t border-[#E4E7EC] bg-[#F9FAFB] px-3 py-3 sm:flex-row sm:px-4">
              <button
                type="button"
                disabled={attModalSubmitting}
                onClick={() => setAttModal(null)}
                className={`${zohoSecondaryBtnCls(true)} sm:flex-1`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={attModalSubmitting}
                onClick={() => void submitAttModal()}
                className={`${zohoPrimaryBtnCls(true)} sm:flex-1 ${
                  attModal.action === "rejected" ? "!bg-[#D93025] hover:!bg-[#B71C1C]" : ""
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

function MobileStatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "amber" | "emerald" | "rose";
}) {
  const tones = {
    amber: "bg-[#FEF3E6] text-[#E8710A]",
    emerald: "bg-[#E6F4EA] text-[#0F9D58]",
    rose: "bg-[#FCE8E6] text-[#D93025]",
  };
  return (
    <div className={`rounded-lg px-1.5 py-2 text-center ${tones[tone]}`}>
      <p className="text-[9px] font-semibold uppercase tracking-wide">{label}</p>
      <p className="mt-0.5 text-[16px] font-semibold tabular-nums">{value}</p>
    </div>
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
    amber: "border-[#FEF3E6] bg-[#FEF3E6] text-[#E8710A]",
    emerald: "border-[#E6F4EA] bg-[#E6F4EA] text-[#0F9D58]",
    rose: "border-[#FCE8E6] bg-[#FCE8E6] text-[#D93025]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] font-medium ${tones[tone]}`}
    >
      {label}
      <span className="rounded bg-white/90 px-1.5 py-0.5 text-[11px] tabular-nums">
        {value}
      </span>
    </span>
  );
}

function CardField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
        {label}
      </dt>
      <dd className="mt-0.5 text-[13px] text-[#374151]">{children}</dd>
    </div>
  );
}

function LeaveRowCard({
  row,
  disabled,
  onApprove,
  onReject,
}: {
  row: LeaveRow;
  disabled: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <article className="rounded-lg border border-[#E4E7EC] bg-white p-3 transition active:bg-[#F9FAFB]">
      <div className="flex items-start justify-between gap-2 border-b border-[#E4E7EC] pb-2.5">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold text-[#1F2937]">{row.user_name}</h3>
          {row.user_email ? (
            <p className="mt-0.5 truncate text-[12px] text-[#6B7280]">{row.user_email}</p>
          ) : null}
        </div>
        <span
          className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${statusBadgeClass(String(row.status))}`}
        >
          {String(row.status)}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <CardField label="Type">{leaveTypeLabel(String(row.leave_type))}</CardField>
        <CardField label="Dates">
          <span className="block">{formatDate(row.start_date)}</span>
          {row.end_date ? (
            <span className="text-[12px] text-[#6B7280]">to {formatDate(row.end_date)}</span>
          ) : null}
        </CardField>
        <CardField label="Submitted" className="col-span-2 sm:col-span-1">
          {formatDateTime(row.created_at)}
        </CardField>
        <CardField label="Reason" className="col-span-2 sm:col-span-3">
          <p className="text-[13px] text-[#6B7280]">
            {row.reason?.trim() ? row.reason : "—"}
          </p>
        </CardField>
      </dl>
      <div className="mt-3 border-t border-[#E4E7EC] pt-2.5">
        <LeaveActions
          layout="stacked"
          current={String(row.status).toLowerCase() as LeaveStatus}
          disabled={disabled}
          onApprove={onApprove}
          onReject={onReject}
        />
      </div>
    </article>
  );
}

function AttendanceQueryCard({
  row,
  employeeName,
  employeeEmail,
  pending,
  modalBusy,
  onApprove,
  onReject,
}: {
  row: AttendanceQueryRow;
  employeeName: string;
  employeeEmail: string;
  pending: boolean;
  modalBusy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <article className="rounded-lg border border-[#E4E7EC] bg-white p-3 transition active:bg-[#F9FAFB]">
      <div className="flex items-start justify-between gap-2 border-b border-[#E4E7EC] pb-2.5">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold text-[#1F2937]">{employeeName}</h3>
          {employeeEmail ? (
            <p className="mt-0.5 truncate text-[12px] text-[#6B7280]">{employeeEmail}</p>
          ) : null}
        </div>
        <span
          className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${statusBadgeClass(row.query_status)}`}
        >
          {row.query_status}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
        <CardField label="Issue">{attendanceCategoryLabel(row.category)}</CardField>
        <CardField label="Attendance date">{formatDate(row.attendance_date)}</CardField>
        <CardField label="Submitted" className="col-span-2">
          {formatDateTime(row.created_at)}
        </CardField>
        <CardField label="Explanation" className="col-span-2">
          <p className="text-[13px] leading-relaxed text-[#6B7280]">{row.query_message}</p>
        </CardField>
      </dl>
      <div className="mt-3 border-t border-[#E4E7EC] pt-2.5">
        {pending ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={modalBusy}
              onClick={onApprove}
              className={zohoApproveBtnCls(true)}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Approve
            </button>
            <button
              type="button"
              disabled={modalBusy}
              onClick={onReject}
              className={zohoRejectBtnCls(true)}
            >
              <XCircle className="h-4 w-4" aria-hidden />
              Reject
            </button>
          </div>
        ) : (
          <div className="text-[13px] text-[#6B7280]">
            {row.approved_by_name ? (
              <p className="font-semibold text-[#374151]">By {row.approved_by_name}</p>
            ) : null}
            {row.admin_response ? (
              <p className="mt-1">
                <span className="font-medium text-[#374151]">Note:</span> {row.admin_response}
              </p>
            ) : (
              <p className="mt-1 text-[#9CA3AF]">No admin note on file.</p>
            )}
            {row.resolved_at ? (
              <p className="mt-2 text-[12px] text-[#9CA3AF]">
                Resolved {formatDateTime(row.resolved_at)}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </article>
  );
}

function LeaveActions({
  current,
  disabled,
  onApprove,
  onReject,
  layout = "inline",
}: {
  current: LeaveStatus;
  disabled: boolean;
  onApprove: () => void;
  onReject: () => void;
  layout?: "inline" | "stacked";
}) {
  const isPending = current === "pending";
  const stacked = layout === "stacked";
  return (
    <div
      className={
        stacked
          ? "flex flex-col gap-2"
          : "inline-flex flex-wrap justify-end gap-1.5"
      }
    >
      <button
        type="button"
        disabled={disabled || !isPending}
        onClick={onApprove}
        title={isPending ? "Approve" : "Only pending requests can be approved"}
        className={stacked ? zohoApproveBtnCls(true) : zohoApproveBtnCls()}
      >
        <CheckCircle2 className={stacked ? "h-4 w-4" : "h-3.5 w-3.5"} aria-hidden />
        Approve
      </button>
      <button
        type="button"
        disabled={disabled || !isPending}
        onClick={onReject}
        title={isPending ? "Reject" : "Only pending requests can be rejected"}
        className={stacked ? zohoRejectBtnCls(true) : zohoRejectBtnCls()}
      >
        <XCircle className={stacked ? "h-4 w-4" : "h-3.5 w-3.5"} aria-hidden />
        Reject
      </button>
    </div>
  );
}

export default ManageEmployeeLeavesPage;
