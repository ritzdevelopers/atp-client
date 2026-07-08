"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, Suspense, type ReactNode } from "react";
import {
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Eye,
  Filter,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  X,
  XCircle,
  ChevronDown,
} from "lucide-react";
import { getAllOrgUsers, dedupeOrgUserRows, type OrgUserRow } from "@/services/adminUser";
import {
  attendanceCategoryLabel,
  fetchAllAttendanceQueries,
  updateAttendanceQueryStatus,
  type AttendanceQueryCategory,
  type AttendanceQueryRow,
} from "@/services/attendanceQueries";
import {
  approvalRoleLabel,
  canActOnReviewerLeave,
  fetchLeavesWhereIAmReviewer,
  leaveDurationLabel,
  performLeaveReview,
  type LeaveDuration,
  type LeaveStatus as EmployeeLeaveStatus,
  type ReviewerLeaveRow,
} from "@/services/employeeLeaveManagement";
import {
  fetchAllRegularizationRequests,
  fetchRegularizationRequestById,
  updateRegularizationRequest,
  type RegularizationManagerRow,
  type RegularizationRequestType,
} from "@/services/regularization";
import {
  fetchManagerCompOffById,
  fetchRMAllCompOffs,
  updateCompOffStatus,
  type CompOffManagerRow,
} from "@/services/compoff";
import {
  clearAttendanceQueriesCaches,
  clearLeaveRequestsCaches,
  readAttendanceQueriesCache,
  readLeaveRequestsCache,
  readManageOrgUsersCache,
  shouldRefreshAttendanceQueriesCache,
  shouldRefreshLeaveRequestsCache,
  stableFilterKey,
  writeAttendanceQueriesCache,
  writeLeaveRequestsCache,
  writeManageOrgUsersCache,
} from "@/lib/employeeManagementCache";
import {
  buildManageLeavesHref,
  compOffRequestDomId,
  leaveRequestDomId,
  parseManageLeavesTab,
  regularizationRequestDomId,
  type ManageLeavesTab,
} from "@/lib/manageEmployeeLeavesDeepLink";
import {
  btnBrandCls,
  btnGhostCls,
  dashLabelCls,
  dashPageCls,
  dashSectionMetaCls,
  dashSectionTitleCls,
  iconBadgeCls,
  statBoxCls,
} from "@/components/portal-dashboard/home/dashboardTokens";

type LeaveStatus = EmployeeLeaveStatus;
type LeaveType = LeaveDuration;

export type LeaveRow = ReviewerLeaveRow;

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

type RegFilters = {
  reg_status: "" | "pending" | "approved" | "rejected";
  request_type: "" | RegularizationRequestType;
  action_date: string;
  is_ascending: "ASC" | "DESC";
};

type CompFilters = {
  query_status: "" | "pending" | "approved" | "rejected";
  compoff_date: string;
  is_ascending: "ASC" | "DESC";
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

const EMPTY_REG_FILTERS: RegFilters = {
  reg_status: "",
  request_type: "",
  action_date: "",
  is_ascending: "DESC",
};

const EMPTY_COMP_FILTERS: CompFilters = {
  query_status: "",
  compoff_date: "",
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
  if (t === "full_day" || t === "half_day" || t === "short_leave") {
    return leaveDurationLabel(t as LeaveDuration);
  }
  return t;
}

function regRequestTypeLabel(t: string): string {
  if (t === "check_in") return "Check-in";
  if (t === "check_out") return "Check-out";
  if (t === "both") return "Check-in & check-out";
  return t.replace(/_/g, " ");
}

function compWorkStatusLabel(t: string): string {
  if (t === "full_day") return "Full day (1.0)";
  if (t === "half_day") return "Half day (0.5)";
  return t.replace(/_/g, " ");
}

function formatTimeShort(value: string | null | undefined): string {
  if (!value) return "—";
  return value.slice(0, 5);
}

function statusBadgeClass(status: string): string {
  const s = String(status).toLowerCase();
  if (s === "approved")
    return "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60";
  if (s === "rejected")
    return "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-rose-50 text-rose-700 ring-1 ring-rose-200/60";
  return "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200/60";
}

function labelCls() {
  return `mb-1.5 block ${dashLabelCls}`;
}

function filterFieldCls() {
  return "w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-[14px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15";
}

function mainTabCls(active: boolean) {
  return `inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-all duration-200 ${
    active
      ? "bg-[#008CD3] text-white shadow-[0_4px_14px_rgba(0,140,211,0.28)]"
      : "border border-slate-200/90 bg-white text-slate-700 hover:border-[#008CD3]/25 hover:bg-slate-50 hover:text-[#008CD3]"
  }`;
}

function mobileMainTabCls(active: boolean) {
  return `flex min-h-[40px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-semibold transition-all duration-200 sm:flex-row sm:gap-1.5 sm:text-[11px] ${
    active
      ? "bg-white text-[#008CD3] shadow-sm ring-1 ring-[#008CD3]/15"
      : "text-slate-500 hover:text-slate-700"
  }`;
}

function zohoApproveBtnCls(full = false) {
  return `inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40 ${full ? "w-full" : ""}`;
}

function zohoRejectBtnCls(full = false) {
  return `inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40 ${full ? "w-full" : ""}`;
}

function listCardCls() {
  return "card-fade-in overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]";
}

function mobileRowCardCls() {
  return "rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)] active:scale-[0.995]";
}

function tableHeadCls() {
  return "border-b border-slate-100 bg-slate-50/80 text-[10px] font-semibold uppercase tracking-wide text-slate-500";
}

function modalShellCls() {
  return "fixed inset-0 z-[100000] flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4";
}

function modalPanelCls() {
  return "w-full max-h-[90vh] overflow-y-auto rounded-t-2xl border border-slate-200/90 bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-2xl";
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

function ManageEmployeeLeavesPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = String(params?.org_id ?? "");
  const initialAttFilterKey = stableFilterKey(EMPTY_ATT_FILTERS);
  const cachedAttendance = orgId
    ? readAttendanceQueriesCache(orgId, initialAttFilterKey)
    : null;
  const cachedOrgUsers = orgId ? readManageOrgUsersCache(orgId) : null;
  const deepLinkHandledRef = useRef<string | null>(null);
  const deepLinkRetryRef = useRef(false);

  const [mainTab, setMainTab] = useState<
    "leaves" | "attendance" | "regularization" | "compoff"
  >(() => parseManageLeavesTab(searchParams.get("tab")) ?? "attendance");
  const [highlightedLeaveId, setHighlightedLeaveId] = useState<number | null>(null);

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
  const [attRows, setAttRows] = useState<AttendanceQueryRow[]>(
    () => cachedAttendance?.queries ?? [],
  );
  const [orgUsers, setOrgUsers] = useState<OrgUserRow[]>(() => {
    if (cachedAttendance?.users?.length) {
      return dedupeOrgUserRows(cachedAttendance.users);
    }
    return cachedOrgUsers ? dedupeOrgUserRows(cachedOrgUsers) : [];
  });
  const [attLoading, setAttLoading] = useState(() => !cachedAttendance);
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

  const [regFilters, setRegFilters] = useState<RegFilters>({ ...EMPTY_REG_FILTERS });
  const [appliedRegFilters, setAppliedRegFilters] = useState<RegFilters>({
    ...EMPTY_REG_FILTERS,
  });
  const [regRows, setRegRows] = useState<RegularizationManagerRow[]>([]);
  const [regLoading, setRegLoading] = useState(false);
  const [regRefreshing, setRegRefreshing] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regModal, setRegModal] = useState<{
    id: number;
    action: "approved" | "rejected";
  } | null>(null);
  const [regModalReason, setRegModalReason] = useState("");
  const [regModalSubmitting, setRegModalSubmitting] = useState(false);
  const [regDetail, setRegDetail] = useState<RegularizationManagerRow | null>(null);
  const [regDetailLoading, setRegDetailLoading] = useState(false);

  const [compFilters, setCompFilters] = useState<CompFilters>({ ...EMPTY_COMP_FILTERS });
  const [appliedCompFilters, setAppliedCompFilters] = useState<CompFilters>({
    ...EMPTY_COMP_FILTERS,
  });
  const [compRows, setCompRows] = useState<CompOffManagerRow[]>([]);
  const [compLoading, setCompLoading] = useState(false);
  const [compRefreshing, setCompRefreshing] = useState(false);
  const [compError, setCompError] = useState<string | null>(null);
  const [compModal, setCompModal] = useState<{
    id: number;
    action: "approved" | "rejected";
  } | null>(null);
  const [compModalReason, setCompModalReason] = useState("");
  const [compModalSubmitting, setCompModalSubmitting] = useState(false);
  const [compDetail, setCompDetail] = useState<CompOffManagerRow | null>(null);
  const [compDetailLoading, setCompDetailLoading] = useState(false);

  const buildQueryString = useCallback((f: Filters) => {
    const q = new URLSearchParams();
    if (f.leave_type) q.set("leave_duration", f.leave_type);
    if (f.status) q.set("leave_status", f.status);
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

      const filterKey = buildQueryString(f);
      const cached = readLeaveRequestsCache<LeaveRow>(orgId, filterKey);

      if (cached && !isManualRefresh) {
        setRows(cached);
        setError(null);
        setLoading(false);
        if (!shouldRefreshLeaveRequestsCache(orgId, filterKey)) {
          return;
        }
        setRefreshing(true);
      } else {
        if (isManualRefresh) {
          clearLeaveRequestsCaches(orgId);
        }
        if (isManualRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);
      }

      try {
        const nextRows = await fetchLeavesWhereIAmReviewer(token, orgId, {
          leave_duration: f.leave_type || undefined,
          leave_status: f.status || undefined,
          user_name: f.user_name.trim() || undefined,
          created_at: f.created_at || undefined,
          is_ascending: f.is_ascending,
        });
        setRows(nextRows);
        writeLeaveRequestsCache(orgId, filterKey, nextRows);
      } catch (e) {
        if (!cached || isManualRefresh) {
          setRows([]);
        }
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

      const filterKey = stableFilterKey(f);
      const cached = readAttendanceQueriesCache(orgId, filterKey);

      if (cached && !isManualRefresh) {
        setAttRows(cached.queries);
        setOrgUsers(dedupeOrgUserRows(cached.users));
        setAttError(null);
        setAttLoading(false);
        if (!shouldRefreshAttendanceQueriesCache(orgId, filterKey)) {
          return;
        }
        setAttRefreshing(true);
      } else {
        if (isManualRefresh) {
          clearAttendanceQueriesCaches(orgId);
        }
        if (isManualRefresh) setAttRefreshing(true);
        else setAttLoading(true);
        setAttError(null);
      }

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
        const dedupedUsers = dedupeOrgUserRows(users);
        setOrgUsers(dedupedUsers);
        setAttRows(queries);
        writeAttendanceQueriesCache(orgId, filterKey, {
          queries,
          users: dedupedUsers,
        });
        writeManageOrgUsersCache(orgId, dedupedUsers);
      } catch (e) {
        if (!cached || isManualRefresh) {
          setAttRows([]);
          setOrgUsers([]);
        }
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

  const loadRegularization = useCallback(
    async (f: RegFilters, isManualRefresh = false) => {
      const token = localStorage.getItem("token");
      if (!token) {
        setRegError("Not signed in.");
        setRegLoading(false);
        setRegRefreshing(false);
        return;
      }
      const orgIdNum = Number(orgId);
      if (!orgId || Number.isNaN(orgIdNum)) {
        setRegError("Invalid organization.");
        setRegLoading(false);
        setRegRefreshing(false);
        return;
      }

      if (isManualRefresh) setRegRefreshing(true);
      else setRegLoading(true);
      setRegError(null);

      try {
        const rows = await fetchAllRegularizationRequests(token, orgIdNum, {
          reg_status: f.reg_status || undefined,
          request_type: f.request_type || undefined,
          action_date: f.action_date.trim() || undefined,
          is_ascending: f.is_ascending,
        });
        setRegRows(rows);
      } catch (e) {
        if (isManualRefresh) setRegRows([]);
        setRegError(
          e instanceof Error ? e.message : "Could not load regularization requests.",
        );
      } finally {
        setRegLoading(false);
        setRegRefreshing(false);
      }
    },
    [orgId],
  );

  const loadCompOff = useCallback(
    async (f: CompFilters, isManualRefresh = false) => {
      const token = localStorage.getItem("token");
      if (!token) {
        setCompError("Not signed in.");
        setCompLoading(false);
        setCompRefreshing(false);
        return;
      }
      const orgIdNum = Number(orgId);
      if (!orgId || Number.isNaN(orgIdNum)) {
        setCompError("Invalid organization.");
        setCompLoading(false);
        setCompRefreshing(false);
        return;
      }

      if (isManualRefresh) setCompRefreshing(true);
      else setCompLoading(true);
      setCompError(null);

      try {
        const rows = await fetchRMAllCompOffs(token, orgIdNum, {
          query_status: f.query_status || undefined,
          compoff_date: f.compoff_date.trim() || undefined,
          is_ascending: f.is_ascending,
        });
        setCompRows(rows);
      } catch (e) {
        if (isManualRefresh) setCompRows([]);
        setCompError(
          e instanceof Error ? e.message : "Could not load comp off requests.",
        );
      } finally {
        setCompLoading(false);
        setCompRefreshing(false);
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

  useEffect(() => {
    if (mainTab !== "regularization") return;
    const t = window.setTimeout(() => {
      void loadRegularization(appliedRegFilters, false);
    }, 0);
    return () => window.clearTimeout(t);
  }, [appliedRegFilters, loadRegularization, mainTab]);

  useEffect(() => {
    if (mainTab !== "compoff") return;
    const t = window.setTimeout(() => {
      void loadCompOff(appliedCompFilters, false);
    }, 0);
    return () => window.clearTimeout(t);
  }, [appliedCompFilters, loadCompOff, mainTab]);

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

  const applyRegFilters = () => {
    setAppliedRegFilters({ ...regFilters });
    setMobileFiltersOpen(false);
  };

  const resetRegFilters = () => {
    setRegFilters({ ...EMPTY_REG_FILTERS });
    setAppliedRegFilters({ ...EMPTY_REG_FILTERS });
  };

  const applyCompFilters = () => {
    setAppliedCompFilters({ ...compFilters });
    setMobileFiltersOpen(false);
  };

  const resetCompFilters = () => {
    setCompFilters({ ...EMPTY_COMP_FILTERS });
    setAppliedCompFilters({ ...EMPTY_COMP_FILTERS });
  };

  const clearDeepLinkParams = useCallback(
    (tab: ManageLeavesTab) => {
      router.replace(buildManageLeavesHref(orgId, tab), { scroll: false });
    },
    [orgId, router],
  );

  useEffect(() => {
    const tab = parseManageLeavesTab(searchParams.get("tab"));
    if (tab) setMainTab(tab);
  }, [searchParams]);

  const refresh = () => {
    if (mainTab === "leaves") void loadLeaves(appliedFilters, true);
    else if (mainTab === "attendance") void loadAttendance(appliedAttFilters, true);
    else if (mainTab === "regularization") void loadRegularization(appliedRegFilters, true);
    else void loadCompOff(appliedCompFilters, true);
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
      const data = await performLeaveReview(token, orgId, {
        leave_id: leaveId,
        action: status,
      });
      setNotice({ type: "ok", text: data.message || "Leave updated." });
      clearLeaveRequestsCaches(orgId);
      await loadLeaves(appliedFilters, true);
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
      clearAttendanceQueriesCaches(orgId);
      await loadAttendance(appliedAttFilters, true);
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

  const openRegModal = (id: number, action: "approved" | "rejected") => {
    setRegModal({ id, action });
    setRegModalReason("");
  };

  const submitRegModal = async () => {
    const token = localStorage.getItem("token");
    if (!token || !regModal) {
      setNotice({ type: "err", text: "Not signed in." });
      return;
    }
    const orgIdNum = Number(orgId);
    if (Number.isNaN(orgIdNum)) return;

    const reason = regModalReason.trim();
    if (regModal.action === "rejected" && !reason) {
      setNotice({
        type: "err",
        text: "Please enter a review comment when rejecting.",
      });
      return;
    }

    setRegModalSubmitting(true);
    setNotice(null);
    try {
      await updateRegularizationRequest(token, orgIdNum, regModal.id, {
        reg_status: regModal.action,
        review_comment: reason || undefined,
      });
      setNotice({
        type: "ok",
        text:
          regModal.action === "approved"
            ? "Regularization request approved."
            : "Regularization request rejected.",
      });
      setRegModal(null);
      if (regDetail?.id === regModal.id) {
        setRegDetail(null);
      }
      await loadRegularization(appliedRegFilters, true);
    } catch (e) {
      setNotice({
        type: "err",
        text:
          e instanceof Error ? e.message : "Could not update regularization request.",
      });
    } finally {
      setRegModalSubmitting(false);
    }
  };

  const openRegDetail = async (id: number) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setNotice({ type: "err", text: "Not signed in." });
      return;
    }
    const orgIdNum = Number(orgId);
    if (Number.isNaN(orgIdNum)) return;

    setRegDetailLoading(true);
    setRegDetail(null);
    try {
      const row = await fetchRegularizationRequestById(token, orgIdNum, id);
      setRegDetail(row);
    } catch (e) {
      setNotice({
        type: "err",
        text:
          e instanceof Error ? e.message : "Could not load regularization request.",
      });
    } finally {
      setRegDetailLoading(false);
    }
  };

  const openCompModal = (id: number, action: "approved" | "rejected") => {
    setCompModal({ id, action });
    setCompModalReason("");
  };

  const submitCompModal = async () => {
    const token = localStorage.getItem("token");
    if (!token || !compModal) {
      setNotice({ type: "err", text: "Not signed in." });
      return;
    }
    const orgIdNum = Number(orgId);
    if (Number.isNaN(orgIdNum)) return;

    const reason = compModalReason.trim();
    if (compModal.action === "rejected" && !reason) {
      setNotice({
        type: "err",
        text: "Please enter a review comment when rejecting.",
      });
      return;
    }

    setCompModalSubmitting(true);
    setNotice(null);
    try {
      const data = await updateCompOffStatus(token, orgIdNum, compModal.id, {
        query_status: compModal.action,
        review_comment: reason || undefined,
      });
      const creditNote =
        compModal.action === "approved" && data.credited_amount != null
          ? ` ${data.credited_amount} day credit added to employee balance.`
          : "";
      setNotice({
        type: "ok",
        text:
          (data.message ??
            (compModal.action === "approved"
              ? "Comp off request approved."
              : "Comp off request rejected.")) + creditNote,
      });
      setCompModal(null);
      if (compDetail?.id === compModal.id) {
        setCompDetail(null);
      }
      await loadCompOff(appliedCompFilters, true);
    } catch (e) {
      setNotice({
        type: "err",
        text:
          e instanceof Error ? e.message : "Could not update comp off request.",
      });
    } finally {
      setCompModalSubmitting(false);
    }
  };

  const openCompDetail = async (id: number) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setNotice({ type: "err", text: "Not signed in." });
      return;
    }
    const orgIdNum = Number(orgId);
    if (Number.isNaN(orgIdNum)) return;

    setCompDetailLoading(true);
    setCompDetail(null);
    try {
      const row = await fetchManagerCompOffById(token, orgIdNum, id);
      setCompDetail(row);
    } catch (e) {
      setNotice({
        type: "err",
        text:
          e instanceof Error ? e.message : "Could not load comp off request.",
      });
    } finally {
      setCompDetailLoading(false);
    }
  };

  useEffect(() => {
    const tab = parseManageLeavesTab(searchParams.get("tab"));
    const idRaw = searchParams.get("id");
    if (!tab || !idRaw) return;
    const id = Number(idRaw);
    if (Number.isNaN(id)) return;

    const key = `${tab}:${id}`;
    if (deepLinkHandledRef.current === key) return;

    if (tab === "regularization") {
      if (mainTab !== "regularization") return;
      deepLinkHandledRef.current = key;
      void openRegDetail(id).finally(() => clearDeepLinkParams("regularization"));
      return;
    }

    if (tab === "compoff") {
      if (mainTab !== "compoff") return;
      deepLinkHandledRef.current = key;
      void openCompDetail(id).finally(() => clearDeepLinkParams("compoff"));
      return;
    }

    if (tab === "leaves") {
      if (mainTab !== "leaves" || loading) return;
      const found = rows.some((row) => Number(row.id) === id);
      if (!found && !deepLinkRetryRef.current) {
        deepLinkRetryRef.current = true;
        setFilters({ ...EMPTY_FILTERS });
        setAppliedFilters({ ...EMPTY_FILTERS });
        return;
      }

      const scrollToLeave = () => {
        const el = document.getElementById(leaveRequestDomId(id));
        if (!el) return false;
        deepLinkHandledRef.current = key;
        setHighlightedLeaveId(id);
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        window.setTimeout(() => setHighlightedLeaveId(null), 4500);
        clearDeepLinkParams("leaves");
        return true;
      };

      if (scrollToLeave()) return;
      window.setTimeout(() => {
        if (!scrollToLeave()) {
          deepLinkHandledRef.current = key;
          clearDeepLinkParams("leaves");
        }
      }, 350);
    }
  }, [mainTab, loading, rows, searchParams, clearDeepLinkParams]);

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
      const s = String(r.my_query_status).toLowerCase();
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

  const regCounts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    for (const r of regRows) {
      const s = String(r.reg_status).toLowerCase();
      if (s === "pending") pending += 1;
      else if (s === "approved") approved += 1;
      else if (s === "rejected") rejected += 1;
    }
    return { pending, approved, rejected, total: regRows.length };
  }, [regRows]);

  const compCounts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    for (const r of compRows) {
      const s = String(r.query_status).toLowerCase();
      if (s === "pending") pending += 1;
      else if (s === "approved") approved += 1;
      else if (s === "rejected") rejected += 1;
    }
    return { pending, approved, rejected, total: compRows.length };
  }, [compRows]);

  const isBusy =
    mainTab === "leaves"
      ? loading || refreshing
      : mainTab === "attendance"
        ? attLoading || attRefreshing
        : mainTab === "regularization"
          ? regLoading || regRefreshing
          : compLoading || compRefreshing;

  const activeCounts =
    mainTab === "leaves"
      ? counts
      : mainTab === "attendance"
        ? attCounts
        : mainTab === "regularization"
          ? regCounts
          : compCounts;
  const listTotal = activeCounts.total;

  return (
    <div className={`${dashPageCls} relative min-h-full pb-6`}>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[360px] bg-gradient-to-b from-[#FDE8F3]/30 via-[#F4F6F9] to-transparent"
        aria-hidden
      />
      <section className="flex flex-col gap-4 lg:gap-6">
      {/* Mobile & tablet: sticky app header */}
      <div className="sticky top-0 z-20 -mx-3 border-b border-slate-200/80 bg-white/95 px-3 pb-3 pt-3 shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur-md sm:-mx-5 sm:px-4 lg:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className={iconBadgeCls("violet")}>
              <ClipboardList className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                Organization · Employees
              </p>
              <h1 className="truncate text-[17px] font-semibold tracking-tight text-slate-900">
                Leave &amp; attendance
              </h1>
            </div>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={isBusy}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-[#008CD3] shadow-sm transition hover:border-[#008CD3]/30 active:scale-95 disabled:opacity-50"
            aria-label="Refresh list"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                (mainTab === "leaves" && refreshing) ||
                (mainTab === "attendance" && attRefreshing) ||
                (mainTab === "regularization" && regRefreshing) ||
                (mainTab === "compoff" && compRefreshing)
                  ? "animate-spin"
                  : ""
              }`}
              aria-hidden
            />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-1 rounded-2xl bg-slate-100/80 p-1">
          <button
            type="button"
            onClick={() => {
              setMainTab("attendance");
              setMobileFiltersOpen(false);
            }}
            className={mobileMainTabCls(mainTab === "attendance")}
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
            className={mobileMainTabCls(mainTab === "leaves")}
          >
            <CalendarDays className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
            <span className="truncate">Leave</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMainTab("regularization");
              setMobileFiltersOpen(false);
            }}
            className={mobileMainTabCls(mainTab === "regularization")}
          >
            <RotateCcw className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
            <span className="truncate">Reg.</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMainTab("compoff");
              setMobileFiltersOpen(false);
            }}
            className={mobileMainTabCls(mainTab === "compoff")}
          >
            <CalendarCheck className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
            <span className="truncate">Comp</span>
          </button>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <MobileStatTile label="Pending" value={activeCounts.pending} tone="amber" />
          <MobileStatTile label="Approved" value={activeCounts.approved} tone="emerald" />
          <MobileStatTile label="Rejected" value={activeCounts.rejected} tone="rose" />
        </div>
        <p className={`mt-2 text-center ${dashSectionMetaCls}`}>
          {listTotal}{" "}
          {mainTab === "leaves"
            ? `leave request${listTotal === 1 ? "" : "s"}`
            : mainTab === "attendance"
              ? `attendance quer${listTotal === 1 ? "y" : "ies"}`
              : mainTab === "regularization"
                ? `regularization request${listTotal === 1 ? "" : "s"}`
                : `comp off request${listTotal === 1 ? "" : "s"}`}{" "}
          in view
        </p>
      </div>

      {/* Desktop: page header */}
      <header className={`${listCardCls()} hidden overflow-hidden lg:block`}>
        <div className="border-b border-slate-100 bg-gradient-to-r from-[#F8FAFC] via-white to-[#F0F9FF]/40 px-5 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <span className={iconBadgeCls("violet")}>
              <ClipboardList className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                Organization · Employees
              </p>
              <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">
                Leave &amp; attendance requests
              </h1>
              <p className={`mt-1 max-w-2xl ${dashSectionMetaCls}`}>
                Approve leave, attendance correction, regularization, and comp off queues.
                Approved comp off credits employee balance (0.5 or 1.0 day).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={isBusy}
            className={btnGhostCls()}
          >
            <RefreshCw
              className={`h-4 w-4 ${
                (mainTab === "leaves" && refreshing) ||
                (mainTab === "attendance" && attRefreshing) ||
                (mainTab === "regularization" && regRefreshing) ||
                (mainTab === "compoff" && compRefreshing)
                  ? "animate-spin"
                  : ""
              }`}
              aria-hidden
            />
            {isBusy &&
            ((mainTab === "leaves" && refreshing) ||
              (mainTab === "attendance" && attRefreshing) ||
              (mainTab === "regularization" && regRefreshing) ||
              (mainTab === "compoff" && compRefreshing))
              ? "Refreshing…"
              : "Refresh"}
          </button>
        </div>
        </div>

        <div className="flex flex-wrap gap-2 px-5 py-4">
          <button
            type="button"
            onClick={() => {
              setMainTab("attendance");
              setMobileFiltersOpen(false);
            }}
            className={mainTabCls(mainTab === "attendance")}
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
            className={mainTabCls(mainTab === "leaves")}
          >
            <CalendarDays className="h-4 w-4" aria-hidden />
            Leave queries
          </button>
          <button
            type="button"
            onClick={() => {
              setMainTab("regularization");
              setMobileFiltersOpen(false);
            }}
            className={mainTabCls(mainTab === "regularization")}
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Regularization
          </button>
          <button
            type="button"
            onClick={() => {
              setMainTab("compoff");
              setMobileFiltersOpen(false);
            }}
            className={mainTabCls(mainTab === "compoff")}
          >
            <CalendarCheck className="h-4 w-4" aria-hidden />
            Comp off
          </button>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-3">
          {mainTab === "leaves" ? (
            <>
              <StatPill label="Pending" value={counts.pending} tone="amber" />
              <StatPill label="Approved" value={counts.approved} tone="emerald" />
              <StatPill label="Rejected" value={counts.rejected} tone="rose" />
              <span className={`inline-flex min-h-[32px] items-center rounded-xl bg-white px-3 text-[12px] font-medium text-slate-500 ring-1 ring-slate-200/80`}>
                {counts.total} leave request{counts.total === 1 ? "" : "s"} in view
              </span>
            </>
          ) : mainTab === "attendance" ? (
            <>
              <StatPill label="Pending" value={attCounts.pending} tone="amber" />
              <StatPill label="Approved" value={attCounts.approved} tone="emerald" />
              <StatPill label="Rejected" value={attCounts.rejected} tone="rose" />
              <span className={`inline-flex min-h-[32px] items-center rounded-xl bg-white px-3 text-[12px] font-medium text-slate-500 ring-1 ring-slate-200/80`}>
                {attCounts.total} attendance quer
                {attCounts.total === 1 ? "y" : "ies"} in view
              </span>
            </>
          ) : mainTab === "regularization" ? (
            <>
              <StatPill label="Pending" value={regCounts.pending} tone="amber" />
              <StatPill label="Approved" value={regCounts.approved} tone="emerald" />
              <StatPill label="Rejected" value={regCounts.rejected} tone="rose" />
              <span className={`inline-flex min-h-[32px] items-center rounded-xl bg-white px-3 text-[12px] font-medium text-slate-500 ring-1 ring-slate-200/80`}>
                {regCounts.total} regularization request
                {regCounts.total === 1 ? "" : "s"} in view
              </span>
            </>
          ) : (
            <>
              <StatPill label="Pending" value={compCounts.pending} tone="amber" />
              <StatPill label="Approved" value={compCounts.approved} tone="emerald" />
              <StatPill label="Rejected" value={compCounts.rejected} tone="rose" />
              <span className={`inline-flex min-h-[32px] items-center rounded-xl bg-white px-3 text-[12px] font-medium text-slate-500 ring-1 ring-slate-200/80`}>
                {compCounts.total} comp off request
                {compCounts.total === 1 ? "" : "s"} in view
              </span>
            </>
          )}
        </div>
      </header>

      {notice ? (
        <div
          role="status"
          className={
            notice.type === "ok"
              ? "rounded-2xl border border-emerald-200/80 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-900"
              : "rounded-2xl border border-rose-200/80 bg-rose-50 px-4 py-3 text-[13px] text-rose-900"
          }
        >
          {notice.text}
        </div>
      ) : null}

      {mainTab === "leaves" ? (
       <>
      <div className={`${listCardCls()} p-4 sm:p-5`}>
        <button
          type="button"
          onClick={() => setMobileFiltersOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 text-left lg:hidden"
          aria-expanded={mobileFiltersOpen}
        >
          <div className="flex items-center gap-2 text-[#1F2937]">
            <span className={iconBadgeCls("blue")}>
              <Filter className="h-3.5 w-3.5" aria-hidden />
            </span>
            <div>
              <h2 className={dashSectionTitleCls}>Filters</h2>
              <p className={dashSectionMetaCls}>Tap to {mobileFiltersOpen ? "hide" : "show"}</p>
            </div>
          </div>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-[#9CA3AF] transition ${mobileFiltersOpen ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        <div className="hidden items-center gap-2 text-[#1F2937] lg:flex">
          <span className={iconBadgeCls("blue")}>
            <Filter className="h-3.5 w-3.5" aria-hidden />
          </span>
          <div>
            <h2 className={dashSectionTitleCls}>Filters</h2>
            <p className="text-[12px] text-[#6B7280]">
              Leave requests assigned to you as a reviewer. Apply filters to reload from the server.
            </p>
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
              className={btnBrandCls(true)}
            >
              Apply
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className={btnGhostCls(true)}
            >
              Reset
            </button>
          </div>
        </div>
        </div>
      </div>

      {loading ? (
        <div className={`${listCardCls()} p-10 text-center text-[14px] text-slate-500`}>
          <RefreshCw className="mx-auto mb-2 h-7 w-7 animate-spin text-[#008CD3]" aria-hidden />
          Loading leave requests…
        </div>
      ) : null}

      {error && !loading ? (
        <div className="rounded-2xl border border-rose-200/80 bg-rose-50 px-4 py-3 text-[13px] text-rose-900">
          {error}
        </div>
      ) : null}

      {!loading && !error ? (
        <div className={`${listCardCls()} p-4 sm:p-5 overflow-hidden lg:p-0`}>
          {/* Mobile & tablet: card list */}
          <div className="space-y-3 lg:hidden lg:p-0">
            {rows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-12 text-center text-slate-500">
                <p className="font-medium text-[#374151]">No leave requests match your filters.</p>
                <p className="mt-1 text-[12px] text-[#6B7280]">
                  Adjust filters or refresh to see new submissions.
                </p>
              </div>
            ) : (
              rows.map((row) => (
                <LeaveRowCard
                  key={row.id}
                  domId={leaveRequestDomId(row.id)}
                  highlighted={highlightedLeaveId === Number(row.id)}
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
                <tr className={tableHeadCls()}>
                  <th className="px-4 py-3.5 sm:px-5">Employee</th>
                  <th className="px-4 py-3.5 sm:px-5">Your role</th>
                  <th className="px-4 py-3.5 sm:px-5">Type</th>
                  <th className="px-4 py-3.5 sm:px-5">Dates</th>
                  <th className="px-4 py-3.5 sm:px-5">Reason</th>
                  <th className="px-4 py-3.5 sm:px-5">Leave status</th>
                  <th className="px-4 py-3.5 sm:px-5">Your review</th>
                  <th className="px-4 py-3.5 sm:px-5">Submitted</th>
                  <th className="px-4 py-3.5 text-right sm:px-5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-[#6B7280]">
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
                      id={leaveRequestDomId(row.id)}
                      className={`bg-white transition hover:bg-slate-50/80 ${
                        highlightedLeaveId === Number(row.id)
                          ? "bg-[#E8F4FB] ring-2 ring-inset ring-[#008CD3]/25"
                          : ""
                      }`}
                    >
                      <td className="px-4 py-4 sm:px-5">
                        <div className="text-[14px] font-semibold text-[#1F2937]">
                          {row.employee_name || `User #${row.user_id}`}
                        </div>
                        <div className="mt-0.5 text-[12px] text-[#6B7280]">
                          {row.employee_email || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#374151] sm:px-5">
                        {row.my_designation ||
                          approvalRoleLabel(row.my_approval_role)}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#374151] sm:px-5">
                        {leaveTypeLabel(String(row.leave_duration))}
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
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${statusBadgeClass(String(row.leave_status))}`}
                        >
                          {String(row.leave_status)}
                        </span>
                      </td>
                      <td className="px-4 py-4 sm:px-5">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${statusBadgeClass(String(row.my_query_status))}`}
                        >
                          {String(row.my_query_status)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[12px] text-[#6B7280] sm:px-5">
                        {formatDateTime(row.created_at)}
                      </td>
                      <td className="px-4 py-4 text-right sm:px-5">
                        <LeaveActions
                          row={row}
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
      ) : mainTab === "attendance" ? (
        <>
          <div className={`${listCardCls()} p-4 sm:p-5`}>
            <button
              type="button"
              onClick={() => setMobileFiltersOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-2 text-left lg:hidden"
              aria-expanded={mobileFiltersOpen}
            >
              <div className="flex items-center gap-2 text-[#1F2937]">
                <span className={iconBadgeCls("blue")}>
                  <Filter className="h-3.5 w-3.5" aria-hidden />
                </span>
                <div>
                  <h2 className={dashSectionTitleCls}>Filters</h2>
                  <p className={dashSectionMetaCls}>Tap to {mobileFiltersOpen ? "hide" : "show"}</p>
                </div>
              </div>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-[#9CA3AF] transition ${mobileFiltersOpen ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>
            <div className="hidden items-center gap-2 text-[#1F2937] lg:flex">
              <span className={iconBadgeCls("blue")}>
                <Filter className="h-3.5 w-3.5" aria-hidden />
              </span>
              <div>
                <h2 className={dashSectionTitleCls}>Filters</h2>
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
                  className={btnBrandCls(true)}
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={resetAttFilters}
                  className={btnGhostCls(true)}
                >
                  Reset
                </button>
              </div>
            </div>
            </div>
          </div>

          {attLoading ? (
            <div className={`${listCardCls()} p-10 text-center text-[14px] text-slate-500`}>
              <RefreshCw className="mx-auto mb-2 h-7 w-7 animate-spin text-[#008CD3]" aria-hidden />
              Loading attendance queries…
            </div>
          ) : null}

          {attError && !attLoading ? (
            <div className="rounded-2xl border border-rose-200/80 bg-rose-50 px-4 py-3 text-[13px] text-rose-900">
              {attError}
            </div>
          ) : null}

          {!attLoading && !attError ? (
            <div className={`${listCardCls()} p-4 sm:p-5 overflow-hidden lg:p-0`}>
              {/* Mobile & tablet: card list */}
              <div className="space-y-3 lg:hidden lg:p-0">
                {attRows.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-12 text-center text-slate-500">
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
                    <tr className={tableHeadCls()}>
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
                          <tr key={row.id} className="bg-white transition hover:bg-slate-50/80">
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
      ) : mainTab === "regularization" ? (
        <>
          <div className={`${listCardCls()} p-4 sm:p-5`}>
            <button
              type="button"
              onClick={() => setMobileFiltersOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-2 text-left lg:hidden"
              aria-expanded={mobileFiltersOpen}
            >
              <div className="flex items-center gap-2 text-[#1F2937]">
                <span className={iconBadgeCls("blue")}>
                  <Filter className="h-3.5 w-3.5" aria-hidden />
                </span>
                <div>
                  <h2 className={dashSectionTitleCls}>Filters</h2>
                  <p className="text-[11px] text-[#6B7280]">
                    Tap to {mobileFiltersOpen ? "hide" : "show"}
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-[#9CA3AF] transition ${mobileFiltersOpen ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>
            <div className="hidden items-center gap-2 text-[#1F2937] lg:flex">
              <span className={iconBadgeCls("blue")}>
                <Filter className="h-3.5 w-3.5" aria-hidden />
              </span>
              <div>
                <h2 className={dashSectionTitleCls}>Filters</h2>
                <p className="text-[12px] text-[#6B7280]">
                  Regularization requests assigned to you as reporting manager.
                </p>
              </div>
            </div>

            <div className={`${mobileFiltersOpen ? "mt-4 block" : "hidden"} lg:mt-5 lg:block`}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
                <label className="lg:col-span-2 block">
                  <span className={labelCls()}>Status</span>
                  <select
                    value={regFilters.reg_status}
                    onChange={(e) =>
                      setRegFilters((p) => ({
                        ...p,
                        reg_status: e.target.value as RegFilters["reg_status"],
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
                  <span className={labelCls()}>Request type</span>
                  <select
                    value={regFilters.request_type}
                    onChange={(e) =>
                      setRegFilters((p) => ({
                        ...p,
                        request_type: e.target.value as RegFilters["request_type"],
                      }))
                    }
                    className={filterFieldCls()}
                  >
                    <option value="">All types</option>
                    <option value="check_in">Check-in</option>
                    <option value="check_out">Check-out</option>
                    <option value="both">Both</option>
                  </select>
                </label>
                <label className="lg:col-span-3 block">
                  <span className={`${labelCls()} flex items-center gap-1`}>
                    <CalendarDays className="h-3 w-3" aria-hidden />
                    Action date
                  </span>
                  <input
                    type="date"
                    value={regFilters.action_date}
                    onChange={(e) =>
                      setRegFilters((p) => ({ ...p, action_date: e.target.value }))
                    }
                    className={filterFieldCls()}
                  />
                </label>
                <label className="lg:col-span-2 block">
                  <span className={labelCls()}>Sort</span>
                  <select
                    value={regFilters.is_ascending}
                    onChange={(e) =>
                      setRegFilters((p) => ({
                        ...p,
                        is_ascending: e.target.value as RegFilters["is_ascending"],
                      }))
                    }
                    className={filterFieldCls()}
                  >
                    <option value="DESC">Newest first</option>
                    <option value="ASC">Oldest first</option>
                  </select>
                </label>
                <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-2 lg:flex-row lg:flex-wrap lg:justify-end">
                  <button
                    type="button"
                    onClick={applyRegFilters}
                    className={btnBrandCls(true)}
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={resetRegFilters}
                    className={btnGhostCls(true)}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>

          {regLoading ? (
            <div className={`${listCardCls()} p-10 text-center text-[14px] text-slate-500`}>
              <RefreshCw className="mx-auto mb-2 h-7 w-7 animate-spin text-[#008CD3]" aria-hidden />
              Loading regularization requests…
            </div>
          ) : null}

          {regError && !regLoading ? (
            <div className="rounded-2xl border border-rose-200/80 bg-rose-50 px-4 py-3 text-[13px] text-rose-900">
              {regError}
            </div>
          ) : null}

          {!regLoading && !regError ? (
            <div className={`${listCardCls()} p-4 sm:p-5 overflow-hidden lg:p-0`}>
              <div className="space-y-3 lg:hidden lg:p-0">
                {regRows.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-12 text-center text-slate-500">
                    <p className="font-medium text-[#374151]">
                      No regularization requests match your filters.
                    </p>
                  </div>
                ) : (
                  regRows.map((row) => {
                    const pending = String(row.reg_status).toLowerCase() === "pending";
                    return (
                      <RegularizationRequestCard
                        key={row.id}
                        domId={regularizationRequestDomId(row.id)}
                        row={row}
                        pending={pending}
                        modalBusy={regModalSubmitting && regModal?.id === row.id}
                        onView={() => void openRegDetail(row.id)}
                        onApprove={() => openRegModal(row.id, "approved")}
                        onReject={() => openRegModal(row.id, "rejected")}
                      />
                    );
                  })
                )}
              </div>

              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-[1040px] w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className={tableHeadCls()}>
                      <th className="px-4 py-3.5 sm:px-5">Employee</th>
                      <th className="px-4 py-3.5 sm:px-5">Type</th>
                      <th className="px-4 py-3.5 sm:px-5">Action date</th>
                      <th className="px-4 py-3.5 sm:px-5">Times</th>
                      <th className="px-4 py-3.5 sm:px-5">Reason</th>
                      <th className="px-4 py-3.5 sm:px-5">Balance</th>
                      <th className="px-4 py-3.5 sm:px-5">Status</th>
                      <th className="px-4 py-3.5 sm:px-5">Submitted</th>
                      <th className="px-4 py-3.5 text-right sm:px-5">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {regRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-[#6B7280]">
                          <p className="font-medium text-[#374151]">
                            No regularization requests match your filters.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      regRows.map((row) => {
                        const pending = String(row.reg_status).toLowerCase() === "pending";
                        return (
                          <tr
                            key={row.id}
                            id={regularizationRequestDomId(row.id)}
                            className="bg-white transition hover:bg-slate-50/80"
                          >
                            <td className="px-4 py-3 sm:px-5">
                              <div className="text-[14px] font-semibold text-[#1F2937]">
                                {row.employee_name || `User #${row.user_id}`}
                              </div>
                              {row.employee_email ? (
                                <div className="mt-0.5 text-[12px] text-[#6B7280]">
                                  {row.employee_email}
                                </div>
                              ) : null}
                            </td>
                            <td className="px-4 py-3 text-[13px] text-[#374151] sm:px-5">
                              {regRequestTypeLabel(row.request_type)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-slate-700 sm:px-5">
                              {formatDate(row.action_date)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-[12px] text-[#6B7280] sm:px-5">
                              {(row.request_type === "check_in" ||
                                row.request_type === "both") &&
                              row.check_in_time
                                ? `In ${formatTimeShort(row.check_in_time)}`
                                : null}
                              {(row.request_type === "check_out" ||
                                row.request_type === "both") &&
                              row.check_out_time ? (
                                <span className="block">
                                  Out {formatTimeShort(row.check_out_time)}
                                </span>
                              ) : null}
                            </td>
                            <td className="max-w-[200px] px-4 py-3 text-[13px] text-[#6B7280] sm:px-5">
                              <p className="line-clamp-2" title={row.reason}>
                                {row.reason}
                              </p>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-[12px] text-[#6B7280] sm:px-5">
                              {row.regularization_balance != null
                                ? `${Math.max(0, (row.regularization_balance ?? 0) - (row.regularization_used ?? 0))} / ${row.regularization_balance} left`
                                : "—"}
                            </td>
                            <td className="px-4 py-4 sm:px-5">
                              <span
                                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${statusBadgeClass(row.reg_status)}`}
                              >
                                {row.reg_status}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-[12px] text-[#6B7280] sm:px-5">
                              {formatDateTime(row.created_at)}
                            </td>
                            <td className="px-4 py-4 text-right sm:px-5">
                              <div className="inline-flex flex-wrap justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => void openRegDetail(row.id)}
                                  className={btnGhostCls()}
                                >
                                  <Eye className="h-3.5 w-3.5" aria-hidden />
                                  View
                                </button>
                                {pending ? (
                                  <>
                                    <button
                                      type="button"
                                      disabled={
                                        regModalSubmitting && regModal?.id === row.id
                                      }
                                      onClick={() => openRegModal(row.id, "approved")}
                                      className={zohoApproveBtnCls()}
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      disabled={
                                        regModalSubmitting && regModal?.id === row.id
                                      }
                                      onClick={() => openRegModal(row.id, "rejected")}
                                      className={zohoRejectBtnCls()}
                                    >
                                      <XCircle className="h-3.5 w-3.5" aria-hidden />
                                      Reject
                                    </button>
                                  </>
                                ) : (
                                  <div className="max-w-[220px] text-left text-[12px] text-[#6B7280] sm:text-right">
                                    {row.approved_by_name ? (
                                      <p className="font-semibold text-[#374151]">
                                        By {row.approved_by_name}
                                      </p>
                                    ) : null}
                                    {row.review_comment ? (
                                      <p className="mt-1">{row.review_comment}</p>
                                    ) : null}
                                  </div>
                                )}
                              </div>
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
      ) : (
        <>
          <div className={`${listCardCls()} p-4 sm:p-5`}>
            <button
              type="button"
              onClick={() => setMobileFiltersOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-2 text-left lg:hidden"
              aria-expanded={mobileFiltersOpen}
            >
              <div className="flex items-center gap-2 text-[#1F2937]">
                <span className={iconBadgeCls("blue")}>
                  <Filter className="h-3.5 w-3.5" aria-hidden />
                </span>
                <div>
                  <h2 className={dashSectionTitleCls}>Filters</h2>
                  <p className="text-[11px] text-[#6B7280]">
                    Tap to {mobileFiltersOpen ? "hide" : "show"}
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-[#9CA3AF] transition ${mobileFiltersOpen ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>
            <div className="hidden items-center gap-2 text-[#1F2937] lg:flex">
              <span className={iconBadgeCls("blue")}>
                <Filter className="h-3.5 w-3.5" aria-hidden />
              </span>
              <div>
                <h2 className={dashSectionTitleCls}>Filters</h2>
                <p className="text-[12px] text-[#6B7280]">
                  Comp off requests assigned to you as reporting manager.
                </p>
              </div>
            </div>

            <div className={`${mobileFiltersOpen ? "mt-4 block" : "hidden"} lg:mt-5 lg:block`}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
                <label className="lg:col-span-3 block">
                  <span className={labelCls()}>Status</span>
                  <select
                    value={compFilters.query_status}
                    onChange={(e) =>
                      setCompFilters((p) => ({
                        ...p,
                        query_status: e.target.value as CompFilters["query_status"],
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
                <label className="lg:col-span-4 block">
                  <span className={`${labelCls()} flex items-center gap-1`}>
                    <CalendarDays className="h-3 w-3" aria-hidden />
                    Comp off date
                  </span>
                  <input
                    type="date"
                    value={compFilters.compoff_date}
                    onChange={(e) =>
                      setCompFilters((p) => ({ ...p, compoff_date: e.target.value }))
                    }
                    className={filterFieldCls()}
                  />
                </label>
                <label className="lg:col-span-2 block">
                  <span className={labelCls()}>Sort</span>
                  <select
                    value={compFilters.is_ascending}
                    onChange={(e) =>
                      setCompFilters((p) => ({
                        ...p,
                        is_ascending: e.target.value as CompFilters["is_ascending"],
                      }))
                    }
                    className={filterFieldCls()}
                  >
                    <option value="DESC">Newest first</option>
                    <option value="ASC">Oldest first</option>
                  </select>
                </label>
                <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-3 lg:flex-row lg:flex-wrap lg:justify-end">
                  <button
                    type="button"
                    onClick={applyCompFilters}
                    className={btnBrandCls(true)}
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={resetCompFilters}
                    className={btnGhostCls(true)}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>

          {compLoading ? (
            <div className={`${listCardCls()} p-10 text-center text-[14px] text-slate-500`}>
              <RefreshCw className="mx-auto mb-2 h-7 w-7 animate-spin text-[#008CD3]" aria-hidden />
              Loading comp off requests…
            </div>
          ) : null}

          {compError && !compLoading ? (
            <div className="rounded-2xl border border-rose-200/80 bg-rose-50 px-4 py-3 text-[13px] text-rose-900">
              {compError}
            </div>
          ) : null}

          {!compLoading && !compError ? (
            <div className={`${listCardCls()} p-4 sm:p-5 overflow-hidden lg:p-0`}>
              <div className="space-y-3 lg:hidden lg:p-0">
                {compRows.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-12 text-center text-slate-500">
                    <p className="font-medium text-[#374151]">
                      No comp off requests match your filters.
                    </p>
                  </div>
                ) : (
                  compRows.map((row) => {
                    const pending = String(row.query_status).toLowerCase() === "pending";
                    return (
                      <CompOffRequestCard
                        key={row.id}
                        domId={compOffRequestDomId(row.id)}
                        row={row}
                        pending={pending}
                        modalBusy={compModalSubmitting && compModal?.id === row.id}
                        onView={() => void openCompDetail(row.id)}
                        onApprove={() => openCompModal(row.id, "approved")}
                        onReject={() => openCompModal(row.id, "rejected")}
                      />
                    );
                  })
                )}
              </div>

              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-[1040px] w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className={tableHeadCls()}>
                      <th className="px-4 py-3.5 sm:px-5">Employee</th>
                      <th className="px-4 py-3.5 sm:px-5">Comp off date</th>
                      <th className="px-4 py-3.5 sm:px-5">Times</th>
                      <th className="px-4 py-3.5 sm:px-5">Work status</th>
                      <th className="px-4 py-3.5 sm:px-5">Reason</th>
                      <th className="px-4 py-3.5 sm:px-5">Balance</th>
                      <th className="px-4 py-3.5 sm:px-5">Status</th>
                      <th className="px-4 py-3.5 sm:px-5">Submitted</th>
                      <th className="px-4 py-3.5 text-right sm:px-5">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {compRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-[#6B7280]">
                          <p className="font-medium text-[#374151]">
                            No comp off requests match your filters.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      compRows.map((row) => {
                        const pending = String(row.query_status).toLowerCase() === "pending";
                        return (
                          <tr
                            key={row.id}
                            id={compOffRequestDomId(row.id)}
                            className="bg-white transition hover:bg-slate-50/80"
                          >
                            <td className="px-4 py-3 sm:px-5">
                              <div className="text-[14px] font-semibold text-[#1F2937]">
                                {row.employee_name || `User #${row.user_id}`}
                              </div>
                              {row.employee_code || row.emp_code ? (
                                <div className="mt-0.5 text-[11px] font-medium text-[#008CD3]">
                                  {row.employee_code ?? row.emp_code}
                                </div>
                              ) : null}
                              {row.employee_email ? (
                                <div className="mt-0.5 text-[12px] text-[#6B7280]">
                                  {row.employee_email}
                                </div>
                              ) : null}
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-slate-700 sm:px-5">
                              {formatDate(row.compoff_date)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-[12px] text-[#6B7280] sm:px-5">
                              In {formatTimeShort(row.check_in)}
                              <span className="block">Out {formatTimeShort(row.check_out)}</span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-[13px] text-[#374151] sm:px-5">
                              {compWorkStatusLabel(row.work_status)}
                            </td>
                            <td className="max-w-[200px] px-4 py-3 text-[13px] text-[#6B7280] sm:px-5">
                              <p className="line-clamp-2" title={row.reason}>
                                {row.reason}
                              </p>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-[12px] text-[#6B7280] sm:px-5">
                              {row.compoff_balance != null
                                ? `${Math.max(0, (row.compoff_balance ?? 0) - (row.compoff_used ?? 0))} / ${row.compoff_balance} left`
                                : "—"}
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
                              <div className="inline-flex flex-wrap justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => void openCompDetail(row.id)}
                                  className={btnGhostCls()}
                                >
                                  <Eye className="h-3.5 w-3.5" aria-hidden />
                                  View
                                </button>
                                {pending ? (
                                  <>
                                    <button
                                      type="button"
                                      disabled={
                                        compModalSubmitting && compModal?.id === row.id
                                      }
                                      onClick={() => openCompModal(row.id, "approved")}
                                      className={zohoApproveBtnCls()}
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      disabled={
                                        compModalSubmitting && compModal?.id === row.id
                                      }
                                      onClick={() => openCompModal(row.id, "rejected")}
                                      className={zohoRejectBtnCls()}
                                    >
                                      <XCircle className="h-3.5 w-3.5" aria-hidden />
                                      Reject
                                    </button>
                                  </>
                                ) : null}
                              </div>
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
          className={modalShellCls()}
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
          <div className={`relative ${modalPanelCls()}`}>
            <div className="flex items-start justify-between border-b border-slate-100 px-1 pb-4">
              <div>
                <h2 id="att-modal-title" className={dashSectionTitleCls}>
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
            <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/60 px-1 py-4 sm:flex-row">
              <button
                type="button"
                disabled={attModalSubmitting}
                onClick={() => setAttModal(null)}
                className={`${btnGhostCls(true)} sm:flex-1`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={attModalSubmitting}
                onClick={() => void submitAttModal()}
                className={`${btnBrandCls(true)} sm:flex-1 ${
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

      {regModal ? (
        <div
          className={modalShellCls()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reg-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close"
            onClick={() => !regModalSubmitting && setRegModal(null)}
          />
          <div className={`relative ${modalPanelCls()}`}>
            <div className="flex items-start justify-between border-b border-slate-100 px-1 pb-4">
              <div>
                <h2 id="reg-modal-title" className="text-[16px] font-semibold text-[#1F2937]">
                  {regModal.action === "approved"
                    ? "Approve regularization"
                    : "Reject regularization"}
                </h2>
                <p className="mt-0.5 text-[12px] text-[#6B7280]">
                  {regModal.action === "rejected"
                    ? "Review comment is required when rejecting."
                    : "Optional review comment for the employee."}
                </p>
              </div>
              <button
                type="button"
                disabled={regModalSubmitting}
                onClick={() => setRegModal(null)}
                className="rounded-lg p-1.5 text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#1F2937] disabled:opacity-50"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-4 py-3">
              <label className="block">
                <span className={labelCls()}>
                  Review comment{regModal.action === "rejected" ? " (required)" : ""}
                </span>
                <textarea
                  value={regModalReason}
                  onChange={(e) => setRegModalReason(e.target.value)}
                  rows={4}
                  placeholder={
                    regModal.action === "rejected"
                      ? "Explain why this request is rejected…"
                      : "Optional note for the employee…"
                  }
                  className={filterFieldCls()}
                />
              </label>
            </div>
            <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/60 px-1 py-4 sm:flex-row">
              <button
                type="button"
                disabled={regModalSubmitting}
                onClick={() => setRegModal(null)}
                className={`${btnGhostCls(true)} sm:flex-1`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={regModalSubmitting}
                onClick={() => void submitRegModal()}
                className={`${btnBrandCls(true)} sm:flex-1 ${
                  regModal.action === "rejected" ? "!bg-[#D93025] hover:!bg-[#B71C1C]" : ""
                }`}
              >
                {regModalSubmitting
                  ? "Submitting…"
                  : regModal.action === "approved"
                    ? "Submit approval"
                    : "Submit rejection"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {regDetailLoading || (regDetail && !regModal) ? (
        <div
          className={modalShellCls()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reg-detail-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close"
            onClick={() => !regDetailLoading && setRegDetail(null)}
          />
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-slate-200/90 bg-white p-5 shadow-2xl sm:rounded-2xl">
            <div className="sticky top-0 flex items-start justify-between border-b border-[#E4E7EC] bg-white px-4 py-3">
              <div>
                <h2 id="reg-detail-title" className="text-[16px] font-semibold text-[#1F2937]">
                  Regularization request
                </h2>
                {regDetail ? (
                  <p className="mt-0.5 text-[12px] text-[#6B7280]">
                    #{regDetail.id} · {regRequestTypeLabel(regDetail.request_type)}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                disabled={regDetailLoading}
                onClick={() => setRegDetail(null)}
                className="rounded-lg p-1.5 text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#1F2937]"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-4 py-4">
              {regDetailLoading ? (
                <div className="flex items-center justify-center py-10 text-[#6B7280]">
                  <RefreshCw className="mr-2 h-5 w-5 animate-spin text-[#008CD3]" />
                  Loading…
                </div>
              ) : regDetail ? (
                <>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <CardField label="Employee" className="col-span-2">
                      {regDetail.employee_name || `User #${regDetail.user_id}`}
                      {regDetail.employee_email ? (
                        <span className="block text-[12px] text-[#6B7280]">
                          {regDetail.employee_email}
                        </span>
                      ) : null}
                    </CardField>
                    <CardField label="Action date">{formatDate(regDetail.action_date)}</CardField>
                    <CardField label="Status">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${statusBadgeClass(regDetail.reg_status)}`}
                      >
                        {regDetail.reg_status}
                      </span>
                    </CardField>
                    {(regDetail.request_type === "check_in" ||
                      regDetail.request_type === "both") &&
                    regDetail.check_in_time ? (
                      <CardField label="Check-in">
                        {formatTimeShort(regDetail.check_in_time)}
                      </CardField>
                    ) : null}
                    {(regDetail.request_type === "check_out" ||
                      regDetail.request_type === "both") &&
                    regDetail.check_out_time ? (
                      <CardField label="Check-out">
                        {formatTimeShort(regDetail.check_out_time)}
                      </CardField>
                    ) : null}
                    <CardField label="Balance">
                      {regDetail.regularization_balance != null
                        ? `${Math.max(0, (regDetail.regularization_balance ?? 0) - (regDetail.regularization_used ?? 0))} of ${regDetail.regularization_balance} left`
                        : "—"}
                    </CardField>
                    <CardField label="Submitted">
                      {formatDateTime(regDetail.created_at)}
                    </CardField>
                    <CardField label="Reason" className="col-span-2">
                      {regDetail.reason}
                    </CardField>
                    {regDetail.review_comment ? (
                      <CardField label="Review comment" className="col-span-2">
                        {regDetail.review_comment}
                      </CardField>
                    ) : null}
                  </dl>
                  {String(regDetail.reg_status).toLowerCase() === "pending" ? (
                    <div className="mt-4 flex flex-col gap-2 border-t border-[#E4E7EC] pt-4 sm:flex-row">
                      <button
                        type="button"
                        disabled={regModalSubmitting}
                        onClick={() => openRegModal(regDetail.id, "approved")}
                        className={zohoApproveBtnCls(true)}
                      >
                        <CheckCircle2 className="h-4 w-4" aria-hidden />
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={regModalSubmitting}
                        onClick={() => openRegModal(regDetail.id, "rejected")}
                        className={zohoRejectBtnCls(true)}
                      >
                        <XCircle className="h-4 w-4" aria-hidden />
                        Reject
                      </button>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {compModal ? (
        <div
          className={modalShellCls()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="comp-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close"
            onClick={() => !compModalSubmitting && setCompModal(null)}
          />
          <div className={`relative ${modalPanelCls()}`}>
            <div className="flex items-start justify-between border-b border-slate-100 px-1 pb-4">
              <div>
                <h2 id="comp-modal-title" className="text-[16px] font-semibold text-[#1F2937]">
                  {compModal.action === "approved"
                    ? "Approve comp off"
                    : "Reject comp off"}
                </h2>
                <p className="mt-0.5 text-[12px] text-[#6B7280]">
                  {compModal.action === "approved"
                    ? "Credits 0.5 or 1.0 day to employee comp off balance."
                    : "Review comment is required when rejecting."}
                </p>
              </div>
              <button
                type="button"
                disabled={compModalSubmitting}
                onClick={() => setCompModal(null)}
                className="rounded-lg p-1.5 text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#1F2937] disabled:opacity-50"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-4 py-3">
              <label className="block">
                <span className={labelCls()}>
                  Review comment{compModal.action === "rejected" ? " (required)" : ""}
                </span>
                <textarea
                  value={compModalReason}
                  onChange={(e) => setCompModalReason(e.target.value)}
                  rows={4}
                  placeholder={
                    compModal.action === "rejected"
                      ? "Explain why this request is rejected…"
                      : "Optional note for the employee…"
                  }
                  className={filterFieldCls()}
                />
              </label>
            </div>
            <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/60 px-1 py-4 sm:flex-row">
              <button
                type="button"
                disabled={compModalSubmitting}
                onClick={() => setCompModal(null)}
                className={`${btnGhostCls(true)} sm:flex-1`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={compModalSubmitting}
                onClick={() => void submitCompModal()}
                className={`${btnBrandCls(true)} sm:flex-1 ${
                  compModal.action === "rejected" ? "!bg-[#D93025] hover:!bg-[#B71C1C]" : ""
                }`}
              >
                {compModalSubmitting
                  ? "Submitting…"
                  : compModal.action === "approved"
                    ? "Submit approval"
                    : "Submit rejection"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {compDetailLoading || (compDetail && !compModal) ? (
        <div
          className={modalShellCls()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="comp-detail-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close"
            onClick={() => !compDetailLoading && setCompDetail(null)}
          />
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-slate-200/90 bg-white p-5 shadow-2xl sm:rounded-2xl">
            <div className="sticky top-0 flex items-start justify-between border-b border-[#E4E7EC] bg-white px-4 py-3">
              <div>
                <h2 id="comp-detail-title" className="text-[16px] font-semibold text-[#1F2937]">
                  Comp off request
                </h2>
                {compDetail ? (
                  <p className="mt-0.5 text-[12px] text-[#6B7280]">
                    #{compDetail.id} · {compWorkStatusLabel(compDetail.work_status)}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                disabled={compDetailLoading}
                onClick={() => setCompDetail(null)}
                className="rounded-lg p-1.5 text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#1F2937]"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-4 py-4">
              {compDetailLoading ? (
                <div className="flex items-center justify-center py-10 text-[#6B7280]">
                  <RefreshCw className="mr-2 h-5 w-5 animate-spin text-[#008CD3]" />
                  Loading…
                </div>
              ) : compDetail ? (
                <>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <CardField label="Employee" className="col-span-2">
                      {compDetail.employee_name || `User #${compDetail.user_id}`}
                      {compDetail.employee_code || compDetail.emp_code ? (
                        <span className="block text-[12px] font-medium text-[#008CD3]">
                          {compDetail.employee_code ?? compDetail.emp_code}
                        </span>
                      ) : null}
                      {compDetail.employee_email ? (
                        <span className="block text-[12px] text-[#6B7280]">
                          {compDetail.employee_email}
                        </span>
                      ) : null}
                    </CardField>
                    <CardField label="Comp off date">
                      {formatDate(compDetail.compoff_date)}
                    </CardField>
                    <CardField label="Status">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${statusBadgeClass(compDetail.query_status)}`}
                      >
                        {compDetail.query_status}
                      </span>
                    </CardField>
                    <CardField label="Check-in">
                      {formatTimeShort(compDetail.check_in)}
                    </CardField>
                    <CardField label="Check-out">
                      {formatTimeShort(compDetail.check_out)}
                    </CardField>
                    <CardField label="Work status">
                      {compWorkStatusLabel(compDetail.work_status)}
                    </CardField>
                    <CardField label="Balance">
                      {compDetail.compoff_balance != null
                        ? `${Math.max(0, (compDetail.compoff_balance ?? 0) - (compDetail.compoff_used ?? 0))} of ${compDetail.compoff_balance} left`
                        : "—"}
                    </CardField>
                    <CardField label="Submitted">
                      {formatDateTime(compDetail.created_at)}
                    </CardField>
                    <CardField label="Reason" className="col-span-2">
                      {compDetail.reason}
                    </CardField>
                    {compDetail.review_comment ? (
                      <CardField label="Review comment" className="col-span-2">
                        {compDetail.review_comment}
                      </CardField>
                    ) : null}
                  </dl>
                  {String(compDetail.query_status).toLowerCase() === "pending" ? (
                    <div className="mt-4 flex flex-col gap-2 border-t border-[#E4E7EC] pt-4 sm:flex-row">
                      <button
                        type="button"
                        disabled={compModalSubmitting}
                        onClick={() => openCompModal(compDetail.id, "approved")}
                        className={zohoApproveBtnCls(true)}
                      >
                        <CheckCircle2 className="h-4 w-4" aria-hidden />
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={compModalSubmitting}
                        onClick={() => openCompModal(compDetail.id, "rejected")}
                        className={zohoRejectBtnCls(true)}
                      >
                        <XCircle className="h-4 w-4" aria-hidden />
                        Reject
                      </button>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
    </div>
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
    amber: statBoxCls("amber") + " text-amber-700",
    emerald: statBoxCls("emerald") + " text-emerald-700",
    rose: "rounded-xl bg-rose-50/70 px-2 py-2.5 text-center text-rose-700",
  };
  return (
    <div className={tones[tone]}>
      <p className="text-[9px] font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-0.5 text-[18px] font-semibold tabular-nums">{value}</p>
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
    amber: "border-amber-200/80 bg-amber-50 text-amber-700",
    emerald: "border-emerald-200/80 bg-emerald-50 text-emerald-700",
    rose: "border-rose-200/80 bg-rose-50 text-rose-700",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[12px] font-semibold ${tones[tone]}`}
    >
      {label}
      <span className="rounded-lg bg-white/90 px-1.5 py-0.5 text-[11px] tabular-nums shadow-sm">
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
      <dt className={dashLabelCls}>{label}</dt>
      <dd className="mt-1 text-[13px] font-medium text-slate-800">{children}</dd>
    </div>
  );
}

function LeaveRowCard({
  row,
  domId,
  highlighted = false,
  disabled,
  onApprove,
  onReject,
}: {
  row: LeaveRow;
  domId?: string;
  highlighted?: boolean;
  disabled: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <article
      id={domId}
      className={`${mobileRowCardCls()} ${
        highlighted ? "ring-2 ring-[#008CD3]/40 shadow-md" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold text-[#1F2937]">
            {row.employee_name || `User #${row.user_id}`}
          </h3>
          {row.employee_email ? (
            <p className="mt-0.5 truncate text-[12px] text-[#6B7280]">{row.employee_email}</p>
          ) : null}
          <p className="mt-1 text-[11px] font-medium text-[#008CD3]">
            Reviewing as{" "}
            {row.my_designation || approvalRoleLabel(row.my_approval_role)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${statusBadgeClass(String(row.leave_status))}`}
          >
            Leave: {String(row.leave_status)}
          </span>
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${statusBadgeClass(String(row.my_query_status))}`}
          >
            You: {String(row.my_query_status)}
          </span>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <CardField label="Type">{leaveTypeLabel(String(row.leave_duration))}</CardField>
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
      <div className="mt-4 border-t border-slate-100 pt-3">
        <LeaveActions
          layout="stacked"
          row={row}
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
    <article className={mobileRowCardCls()}>
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
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
      <div className="mt-4 border-t border-slate-100 pt-3">
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

function CompOffRequestCard({
  row,
  domId,
  pending,
  modalBusy,
  onView,
  onApprove,
  onReject,
}: {
  row: CompOffManagerRow;
  domId?: string;
  pending: boolean;
  modalBusy: boolean;
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <article id={domId} className={mobileRowCardCls()}>
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold text-[#1F2937]">
            {row.employee_name || `User #${row.user_id}`}
          </h3>
          {row.employee_code || row.emp_code ? (
            <p className="mt-0.5 text-[11px] font-medium text-[#008CD3]">
              {row.employee_code ?? row.emp_code}
            </p>
          ) : null}
          {row.employee_email ? (
            <p className="mt-0.5 truncate text-[12px] text-[#6B7280]">{row.employee_email}</p>
          ) : null}
        </div>
        <span
          className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${statusBadgeClass(row.query_status)}`}
        >
          {row.query_status}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
        <CardField label="Comp off date">{formatDate(row.compoff_date)}</CardField>
        <CardField label="Work status">{compWorkStatusLabel(row.work_status)}</CardField>
        <CardField label="Times" className="col-span-2">
          In {formatTimeShort(row.check_in)} · Out {formatTimeShort(row.check_out)}
        </CardField>
        <CardField label="Reason" className="col-span-2">
          <p className="text-[13px] leading-relaxed text-[#6B7280]">{row.reason}</p>
        </CardField>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
        <button type="button" onClick={onView} className={btnGhostCls()}>
          <Eye className="h-4 w-4" aria-hidden />
          View
        </button>
        {pending ? (
          <>
            <button
              type="button"
              disabled={modalBusy}
              onClick={onApprove}
              className={zohoApproveBtnCls()}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Approve
            </button>
            <button
              type="button"
              disabled={modalBusy}
              onClick={onReject}
              className={zohoRejectBtnCls()}
            >
              <XCircle className="h-4 w-4" aria-hidden />
              Reject
            </button>
          </>
        ) : null}
      </div>
    </article>
  );
}

function RegularizationRequestCard({
  row,
  domId,
  pending,
  modalBusy,
  onView,
  onApprove,
  onReject,
}: {
  row: RegularizationManagerRow;
  domId?: string;
  pending: boolean;
  modalBusy: boolean;
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <article id={domId} className={mobileRowCardCls()}>
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold text-[#1F2937]">
            {row.employee_name || `User #${row.user_id}`}
          </h3>
          {row.employee_email ? (
            <p className="mt-0.5 truncate text-[12px] text-[#6B7280]">{row.employee_email}</p>
          ) : null}
        </div>
        <span
          className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${statusBadgeClass(row.reg_status)}`}
        >
          {row.reg_status}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
        <CardField label="Type">{regRequestTypeLabel(row.request_type)}</CardField>
        <CardField label="Action date">{formatDate(row.action_date)}</CardField>
        <CardField label="Times" className="col-span-2">
          {(row.request_type === "check_in" || row.request_type === "both") &&
          row.check_in_time
            ? `In ${formatTimeShort(row.check_in_time)}`
            : null}
          {(row.request_type === "check_out" || row.request_type === "both") &&
          row.check_out_time
            ? ` · Out ${formatTimeShort(row.check_out_time)}`
            : null}
        </CardField>
        <CardField label="Reason" className="col-span-2">
          <p className="text-[13px] leading-relaxed text-[#6B7280]">{row.reason}</p>
        </CardField>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
        <button type="button" onClick={onView} className={btnGhostCls()}>
          <Eye className="h-4 w-4" aria-hidden />
          View
        </button>
        {pending ? (
          <>
            <button
              type="button"
              disabled={modalBusy}
              onClick={onApprove}
              className={zohoApproveBtnCls()}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Approve
            </button>
            <button
              type="button"
              disabled={modalBusy}
              onClick={onReject}
              className={zohoRejectBtnCls()}
            >
              <XCircle className="h-4 w-4" aria-hidden />
              Reject
            </button>
          </>
        ) : null}
      </div>
    </article>
  );
}

function LeaveActions({
  row,
  disabled,
  onApprove,
  onReject,
  layout = "inline",
}: {
  row: LeaveRow;
  disabled: boolean;
  onApprove: () => void;
  onReject: () => void;
  layout?: "inline" | "stacked";
}) {
  const canAct = canActOnReviewerLeave(row);
  const stacked = layout === "stacked";
  return (
    <div
      className={
        stacked
          ? "flex flex-col gap-2"
          : "inline-flex flex-wrap justify-end gap-1.5"
      }
    >
      {canAct ? (
        <>
          <button
            type="button"
            disabled={disabled}
            onClick={onApprove}
            title="Approve"
            className={stacked ? zohoApproveBtnCls(true) : zohoApproveBtnCls()}
          >
            <CheckCircle2 className={stacked ? "h-4 w-4" : "h-3.5 w-3.5"} aria-hidden />
            Approve
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onReject}
            title="Reject"
            className={stacked ? zohoRejectBtnCls(true) : zohoRejectBtnCls()}
          >
            <XCircle className={stacked ? "h-4 w-4" : "h-3.5 w-3.5"} aria-hidden />
            Reject
          </button>
        </>
      ) : (
        <div className="text-left text-[12px] text-[#6B7280] sm:text-right">
          {row.my_query_status !== "pending" ? (
            <p>
              You {row.my_query_status} this request
              {row.my_review_comment ? `: ${row.my_review_comment}` : "."}
            </p>
          ) : row.my_approval_role === "reporting_manager" ? (
            <p className="text-[#9CA3AF]">Awaiting your review.</p>
          ) : (
            <p className="text-[#9CA3AF]">
              Waiting for reporting manager approval before HR/admin review.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ManageEmployeeLeavesPage() {
  return (
    <Suspense
      fallback={
        <div className={`${dashPageCls} flex flex-col items-center justify-center gap-3 py-24 text-slate-500`}>
          <Loader2 className="h-8 w-8 animate-spin text-[#008CD3]" aria-hidden />
          <p className="text-[14px]">Loading leave management…</p>
        </div>
      }
    >
      <ManageEmployeeLeavesPageContent />
    </Suspense>
  );
}
