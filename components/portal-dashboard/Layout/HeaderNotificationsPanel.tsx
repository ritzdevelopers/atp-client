"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bell,
  CalendarCheck,
  CalendarDays,
  ChevronRight,
  Loader2,
  RefreshCw,
  RotateCcw,
  X,
} from "lucide-react";
import {
  btnBrandCls,
  btnGhostCls,
  dashLabelCls,
  dashSectionMetaCls,
  dashSectionTitleCls,
  iconBadgeCls,
} from "@/components/portal-dashboard/home/dashboardTokens";
import {
  fetchLeavesWhereIAmReviewer,
  leaveDurationLabel,
  type ReviewerLeaveRow,
} from "@/services/employeeLeaveManagement";
import {
  fetchAllRegularizationRequests,
  fetchMyRegularizationHrReviews,
  type RegularizationHrReviewRow,
  type RegularizationManagerRow,
} from "@/services/regularization";
import {
  countPendingRegularizationItems,
  isHrOrAdminRole,
  mergeRegularizationQueues,
  regularizationDisplayStatus,
  type RegularizationTabItem,
} from "@/lib/regularizationQueue";
import { readRoleNameFromToken } from "@/lib/orgAdminAccess";
import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import {
  fetchRMAllCompOffs,
  type CompOffManagerRow,
} from "@/services/compoff";
import {
  buildManageLeavesHref,
} from "@/lib/manageEmployeeLeavesDeepLink";

type NotifTab = "leaves" | "regularization" | "compoff";
type StatusFilter = "" | "pending" | "hr_pending" | "approved" | "rejected";

type TabCounts = {
  leaves: number;
  regularization: number;
  compoff: number;
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

function statusBadgeClass(status: string): string {
  const s = String(status).toLowerCase();
  if (s === "approved")
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60";
  if (s === "rejected")
    return "bg-rose-50 text-rose-700 ring-1 ring-rose-200/60";
  if (s === "hr_pending")
    return "bg-violet-50 text-violet-700 ring-1 ring-violet-200/60";
  return "bg-amber-50 text-amber-700 ring-1 ring-amber-200/60";
}

function regTypeLabel(t: string): string {
  if (t === "check_in") return "Check-in";
  if (t === "check_out") return "Check-out";
  if (t === "both") return "Check-in & check-out";
  return t.replace(/_/g, " ");
}

function filterFieldCls() {
  return "w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-[13px] text-slate-900 outline-none transition focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15";
}

function tabBtnCls(active: boolean) {
  return `relative flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[12px] font-semibold transition-all sm:text-[13px] ${
    active
      ? "bg-[#008CD3] text-white shadow-[0_4px_12px_rgba(0,140,211,0.25)]"
      : "text-slate-600 hover:bg-slate-50 hover:text-[#008CD3]"
  }`;
}

export default function HeaderNotificationsPanel() {
  const params = useParams();
  const orgId = String(params?.org_id ?? "");
  const orgIdNum = Number(orgId);
  const dashboardCtx = useManagementDashboardContext();
  const viewerRole =
    dashboardCtx?.user?.user_role_name ?? readRoleNameFromToken();
  const viewerIsHrOrAdmin = isHrOrAdminRole(viewerRole);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<NotifTab>("leaves");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [dateFilter, setDateFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [tabCounts, setTabCounts] = useState<TabCounts>({
    leaves: 0,
    regularization: 0,
    compoff: 0,
  });
  const [leaveRows, setLeaveRows] = useState<ReviewerLeaveRow[]>([]);
  const [regRows, setRegRows] = useState<RegularizationTabItem[]>([]);
  const [compRows, setCompRows] = useState<CompOffManagerRow[]>([]);

  const manageHref = orgId
    ? buildManageLeavesHref(orgId, activeTab)
    : "#";

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadRegularizationRows = useCallback(
    async (
      token: string,
      filters?: {
        reg_status?: StatusFilter;
        action_date?: string;
      },
    ) => {
      const managerFilters: {
        reg_status?: RegularizationManagerRow["reg_status"];
        action_date?: string;
        is_ascending: "DESC";
      } = { is_ascending: "DESC" };

      const hrFilters: {
        hr_action?: "pending" | "approved" | "rejected";
        reg_status?: RegularizationHrReviewRow["reg_status"];
        action_date?: string;
        is_ascending: "DESC";
      } = { is_ascending: "DESC" };

      if (filters?.action_date) {
        managerFilters.action_date = filters.action_date;
        hrFilters.action_date = filters.action_date;
      }

      const status = filters?.reg_status;
      if (status === "pending") {
        managerFilters.reg_status = "pending";
        hrFilters.hr_action = "pending";
        hrFilters.reg_status = "hr_pending";
      } else if (status === "hr_pending") {
        managerFilters.reg_status = "hr_pending";
        hrFilters.reg_status = "hr_pending";
        hrFilters.hr_action = "pending";
      } else if (status === "approved" || status === "rejected") {
        managerFilters.reg_status = status;
        hrFilters.hr_action = status;
        hrFilters.reg_status = status;
      } else if (status) {
        managerFilters.reg_status = status;
        hrFilters.reg_status = status;
      }

      const managerRows = await fetchAllRegularizationRequests(
        token,
        orgIdNum,
        managerFilters,
      );

      let hrRows: RegularizationHrReviewRow[] = [];
      if (viewerIsHrOrAdmin) {
        hrRows = await fetchMyRegularizationHrReviews(token, orgIdNum, hrFilters);
      }

      return mergeRegularizationQueues(managerRows, hrRows);
    },
    [orgIdNum, viewerIsHrOrAdmin],
  );

  const loadPendingCounts = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token || !orgId || Number.isNaN(orgIdNum)) return;

    try {
      const [leaves, managerPending, hrReviews, comp] = await Promise.all([
        fetchLeavesWhereIAmReviewer(token, orgId, {
          my_query_status: "pending",
          is_ascending: "DESC",
        }),
        fetchAllRegularizationRequests(token, orgIdNum, {
          reg_status: "pending",
          is_ascending: "DESC",
        }),
        viewerIsHrOrAdmin
          ? fetchMyRegularizationHrReviews(token, orgIdNum, {
              hr_action: "pending",
              reg_status: "hr_pending",
              is_ascending: "DESC",
            })
          : Promise.resolve([]),
        fetchRMAllCompOffs(token, orgIdNum, {
          query_status: "pending",
          is_ascending: "DESC",
        }),
      ]);

      const mergedReg = mergeRegularizationQueues(managerPending, hrReviews);
      const regPendingCount = countPendingRegularizationItems(mergedReg);
      const counts = {
        leaves: leaves.length,
        regularization: regPendingCount,
        compoff: comp.length,
      };
      setTabCounts(counts);
      setPendingCount(counts.leaves + counts.regularization + counts.compoff);
    } catch {
      /* silent — badge optional */
    }
  }, [orgId, orgIdNum, viewerIsHrOrAdmin]);

  const loadTabData = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token || !orgId || Number.isNaN(orgIdNum)) {
      setError("Not signed in.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (activeTab === "leaves") {
        const leaveStatus =
          statusFilter && statusFilter !== "hr_pending" ? statusFilter : undefined;
        const rows = await fetchLeavesWhereIAmReviewer(token, orgId, {
          my_query_status: leaveStatus,
          created_at: dateFilter || undefined,
          is_ascending: "DESC",
        });
        setLeaveRows(rows);
      } else if (activeTab === "regularization") {
        const rows = await loadRegularizationRows(token, {
          reg_status: statusFilter || undefined,
          action_date: dateFilter || undefined,
        });
        setRegRows(rows);
      } else {
        const compStatus =
          statusFilter && statusFilter !== "hr_pending" ? statusFilter : undefined;
        const rows = await fetchRMAllCompOffs(token, orgIdNum, {
          query_status: compStatus,
          compoff_date: dateFilter || undefined,
          is_ascending: "DESC",
      
        });
        setCompRows(rows);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load requests.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, statusFilter, dateFilter, loadRegularizationRows, orgId, orgIdNum]);

  useEffect(() => {
    void loadPendingCounts();
    const interval = window.setInterval(() => void loadPendingCounts(), 60_000);
    return () => window.clearInterval(interval);
  }, [loadPendingCounts]);

  useEffect(() => {
    if (!open) return;
    void loadTabData();
  }, [open, loadTabData]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onPointer(e: MouseEvent) {
      const target = e.target as Node;
      if (
        panelRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  const activeRows = useMemo(() => {
    if (activeTab === "leaves") return leaveRows;
    if (activeTab === "regularization") return regRows;
    return compRows;
  }, [activeTab, leaveRows, regRows, compRows]);

  const dateLabel =
    activeTab === "leaves"
      ? "Submitted date"
      : activeTab === "regularization"
        ? "Action date"
        : "Comp off date";

  const panel =
    open && mounted ? (
      <div
        ref={panelRef}
        className="notifications-panel-enter fixed right-3 top-[calc(3.5rem+0.5rem)] z-[100050] flex max-h-[min(78vh,640px)] w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_24px_64px_rgba(15,23,42,0.16)] sm:right-5 sm:w-[min(26rem,calc(100vw-2rem))]"
        role="dialog"
        aria-modal="true"
        aria-label="Request notifications"
      >
        <div className="border-b border-slate-100 bg-gradient-to-r from-[#F8FAFC] via-white to-[#F0F9FF]/50 px-4 py-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className={iconBadgeCls("amber")}>
                <Bell className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <h2 className={dashSectionTitleCls}>Request inbox</h2>
                <p className={dashSectionMetaCls}>
                  {pendingCount} pending across all queues
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
              aria-label="Close notifications"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1 border-b border-slate-100 bg-slate-50/60 p-2">
          <button
            type="button"
            onClick={() => setActiveTab("leaves")}
            className={tabBtnCls(activeTab === "leaves")}
          >
            <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">Leave</span>
            {tabCounts.leaves > 0 ? (
              <span
                className={`ml-0.5 rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
                  activeTab === "leaves"
                    ? "bg-white/25 text-white"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {tabCounts.leaves}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("regularization")}
            className={tabBtnCls(activeTab === "regularization")}
          >
            <RotateCcw className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">Reg.</span>
            {tabCounts.regularization > 0 ? (
              <span
                className={`ml-0.5 rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
                  activeTab === "regularization"
                    ? "bg-white/25 text-white"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {tabCounts.regularization}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("compoff")}
            className={tabBtnCls(activeTab === "compoff")}
          >
            <CalendarCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">Comp</span>
            {tabCounts.compoff > 0 ? (
              <span
                className={`ml-0.5 rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
                  activeTab === "compoff"
                    ? "bg-white/25 text-white"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {tabCounts.compoff}
              </span>
            ) : null}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 border-b border-slate-100 px-3 py-3">
          <label className="block">
            <span className={`mb-1 block ${dashLabelCls}`}>Status</span>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as StatusFilter)
              }
              className={filterFieldCls()}
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              {viewerIsHrOrAdmin ? (
                <option value="hr_pending">Awaiting HR</option>
              ) : null}
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
          <label className="block">
            <span className={`mb-1 block ${dashLabelCls}`}>{dateLabel}</span>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className={filterFieldCls()}
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2 [scrollbar-width:thin]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Loader2 className="mb-2 h-6 w-6 animate-spin text-[#008CD3]" />
              <p className="text-[13px]">Loading requests…</p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[13px] text-rose-800">
              {error}
            </div>
          ) : activeRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center">
              <p className="text-[13px] font-medium text-slate-700">
                No requests match your filters
              </p>
              <p className={`mt-1 ${dashSectionMetaCls}`}>
                Try changing status or date, or check back later.
              </p>
            </div>
          ) : (
            <ul className="space-y-2 pb-1">
              {activeTab === "leaves"
                ? leaveRows.map((row) => (
                    <li key={row.id}>
                      <NotificationRow
                        title={row.employee_name || `User #${row.user_id}`}
                        subtitle={leaveDurationLabel(row.leave_duration)}
                        meta={`${formatDate(row.start_date)}${row.end_date ? ` → ${formatDate(row.end_date)}` : ""}`}
                        status={String(row.my_query_status)}
                        href={buildManageLeavesHref(orgId, "leaves", row.id)}
                        onNavigate={() => setOpen(false)}
                      />
                    </li>
                  ))
                : activeTab === "regularization"
                  ? regRows.map((item) => {
                      const managerName =
                        item.queue === "hr"
                          ? (item.row as RegularizationHrReviewRow)
                              .reporting_manager_info?.user_name ??
                            item.row.reporting_manager_name
                          : item.row.reporting_manager_name;
                      return (
                        <li key={`${item.queue}-${item.row.id}`}>
                          <NotificationRow
                            title={item.row.employee_name || `User #${item.row.user_id}`}
                            subtitle={
                              managerName
                                ? `${regTypeLabel(item.row.request_type)} · RM: ${managerName}`
                                : regTypeLabel(item.row.request_type)
                            }
                            meta={formatDate(item.row.action_date)}
                            status={regularizationDisplayStatus(item)}
                            href={buildManageLeavesHref(
                              orgId,
                              "regularization",
                              item.row.id,
                            )}
                            onNavigate={() => setOpen(false)}
                          />
                        </li>
                      );
                    })
                  : compRows.map((row) => (
                      <li key={row.id}>
                        <NotificationRow
                          title={row.employee_name || `User #${row.user_id}`}
                          subtitle={
                            row.work_status === "full_day"
                              ? "Full day"
                              : "Half day"
                          }
                          meta={formatDate(row.compoff_date)}
                          status={row.query_status}
                          href={buildManageLeavesHref(orgId, "compoff", row.id)}
                          onNavigate={() => setOpen(false)}
                        />
                      </li>
                    ))}
            </ul>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/50 px-3 py-3">
          <button
            type="button"
            onClick={() => void loadTabData()}
            disabled={loading}
            className={`${btnGhostCls()} flex-1`}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              aria-hidden
            />
            Refresh
          </button>
          <Link
            href={manageHref}
            onClick={() => setOpen(false)}
            className={`${btnBrandCls()} flex-1`}
          >
            Open hub
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void loadPendingCounts();
        }}
        className={`relative inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-200 active:scale-95 ${
          open
            ? "border-[#008CD3]/30 bg-[#E8F4FB] text-[#008CD3]"
            : "border-slate-200/90 bg-white text-slate-600 hover:border-[#008CD3]/25 hover:bg-sky-50/50 hover:text-[#008CD3]"
        }`}
        aria-label={
          pendingCount > 0
            ? `${pendingCount} pending requests`
            : "Open request notifications"
        }
        aria-expanded={open}
      >
        <Bell className="h-[18px] w-[18px]" aria-hidden />
        {pendingCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
            {pendingCount > 99 ? "99+" : pendingCount}
          </span>
        ) : null}
      </button>
      {panel && typeof document !== "undefined"
        ? createPortal(panel, document.body)
        : null}
    </>
  );
}

function NotificationRow({
  title,
  subtitle,
  meta,
  status,
  href,
  onNavigate,
}: {
  title: string;
  subtitle: string;
  meta: string;
  status: string;
  href: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="group flex items-start gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5 transition hover:border-[#008CD3]/20 hover:bg-[#F8FCFF] hover:shadow-sm"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-slate-900">
          {title}
        </p>
        <p className="mt-0.5 truncate text-[12px] text-slate-500">{subtitle}</p>
        <p className="mt-1 text-[11px] text-slate-400">{meta}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${statusBadgeClass(status)}`}
        >
          {status}
        </span>
        <ChevronRight className="h-3.5 w-3.5 text-slate-300 transition group-hover:text-[#008CD3]" />
      </div>
    </Link>
  );
}
