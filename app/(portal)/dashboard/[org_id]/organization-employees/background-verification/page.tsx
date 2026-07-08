"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Filter,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  X,
} from "lucide-react";
import {
  getAllUserBackgroundVerifications,
  updateEmployeeBackgroundVerificationStatus,
  type BackgroundVerificationEmployeeGroup,
  type BackgroundVerificationPersonRole,
  type BackgroundVerificationReferenceItem,
  type BackgroundVerificationStatus,
} from "@/services/adminUser";
import {
  clearBgvOrgCaches,
  readBgvListCache,
  shouldRefreshBgvListCache,
  stableFilterKey,
  writeBgvListCache,
} from "@/lib/employeeManagementCache";
import {
  avatarCls,
  btnBrandCls,
  btnGhostCls,
  dashCardCls,
  dashPageCls,
  dashSectionMetaCls,
  iconBadgeCls,
  statBoxCls,
  userInitials,
} from "@/components/portal-dashboard/home/dashboardTokens";

type VerifyTarget = BackgroundVerificationReferenceItem & {
  employee_id: number;
  employee_name: string | null;
};

type Filters = {
  status: "" | BackgroundVerificationStatus;
  employee_name: string;
  previous_company_name: string;
  person_role: "" | BackgroundVerificationPersonRole;
  joining_date: string;
  is_ascending: "ASC" | "DESC";
};

const EMPTY_FILTERS: Filters = {
  status: "",
  employee_name: "",
  previous_company_name: "",
  person_role: "",
  joining_date: "",
  is_ascending: "DESC",
};

const STATUS_OPTIONS: { value: BackgroundVerificationStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "verified", label: "Verified" },
  { value: "failed", label: "Failed" },
  { value: "unable_to_contact", label: "Unable to contact" },
];

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

function personRoleLabel(role: string): string {
  if (role === "hr") return "HR";
  if (role === "reporting_manager") return "Reporting manager";
  return role;
}

function statusLabel(status: string): string {
  const found = STATUS_OPTIONS.find((o) => o.value === status);
  return found?.label ?? status.replace(/_/g, " ");
}

function statusBadgeClass(status: string): string {
  const s = String(status).toLowerCase();
  if (s === "verified") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70";
  if (s === "failed") return "bg-rose-50 text-rose-700 ring-1 ring-rose-200/70";
  if (s === "in_progress") return "bg-[#E8F4FB] text-[#008CD3] ring-1 ring-[#008CD3]/20";
  if (s === "unable_to_contact") return "bg-slate-100 text-slate-600 ring-1 ring-slate-200/80";
  return "bg-amber-50 text-amber-700 ring-1 ring-amber-200/70";
}

function canShowVerifyButton(status: string): boolean {
  const s = String(status).toLowerCase();
  return s !== "verified" && s !== "failed";
}

function labelCls() {
  return "mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500";
}

function filterFieldCls() {
  return "w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15";
}

function Shimmer({ className = "" }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-xl ${className}`} />;
}

function BgvPageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading background verifications">
      <div className={`${dashCardCls} overflow-hidden lg:hidden`}>
        <div className="space-y-3 p-4">
          <div className="flex items-center gap-3">
            <Shimmer className="h-10 w-10 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Shimmer className="h-4 w-40" />
              <Shimmer className="h-3 w-28" />
            </div>
            <Shimmer className="h-9 w-9 rounded-xl" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Shimmer className="h-14" />
            <Shimmer className="h-14" />
            <Shimmer className="h-14" />
          </div>
        </div>
      </div>

      <div className={`${dashCardCls} hidden overflow-hidden lg:block`}>
        <div className="border-b border-slate-100 bg-gradient-to-r from-[#F8FAFC] via-white to-[#F0F9FF]/40 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <Shimmer className="h-11 w-11 rounded-xl" />
              <div className="space-y-2">
                <Shimmer className="h-3 w-32" />
                <Shimmer className="h-6 w-56" />
                <Shimmer className="h-4 w-80 max-w-full" />
              </div>
            </div>
            <Shimmer className="h-10 w-28" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 px-6 py-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Shimmer key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
      </div>

      <div className={`${dashCardCls} space-y-4 p-4 sm:p-5`}>
        <Shimmer className="h-5 w-24" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Shimmer key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>

      <div className={`${dashCardCls} divide-y divide-slate-100 overflow-hidden`}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4">
            <div className="flex items-center gap-3">
              <Shimmer className="h-10 w-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Shimmer className="h-4 w-40" />
                <Shimmer className="h-3 w-28" />
              </div>
              <Shimmer className="h-8 w-20" />
            </div>
            <div className="mt-3 space-y-2 rounded-xl bg-slate-50/80 p-3">
              <Shimmer className="h-8 w-full" />
              <Shimmer className="h-8 w-full" />
            </div>
          </div>
        ))}
      </div>
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
  tone: "amber" | "blue" | "emerald" | "rose" | "gray";
}) {
  const toneCls =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200/70"
      : tone === "rose"
        ? "bg-rose-50 text-rose-700 ring-rose-200/70"
        : tone === "blue"
          ? "bg-[#E8F4FB] text-[#008CD3] ring-[#008CD3]/20"
          : tone === "gray"
            ? "bg-slate-100 text-slate-600 ring-slate-200/80"
            : "bg-amber-50 text-amber-700 ring-amber-200/70";
  return (
    <span
      className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold ring-1 ${toneCls}`}
    >
      {label}
      <span className="tabular-nums">{value}</span>
    </span>
  );
}

function MobileStatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "amber" | "blue" | "emerald" | "rose" | "gray";
}) {
  const toneCls =
    tone === "emerald"
      ? "text-emerald-600"
      : tone === "rose"
        ? "text-rose-600"
        : tone === "blue"
          ? "text-[#008CD3]"
          : tone === "gray"
            ? "text-slate-500"
            : "text-amber-600";
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-2 py-2 text-center">
      <p className={`text-[16px] font-semibold tabular-nums ${toneCls}`}>{value}</p>
      <p className="text-[10px] font-medium text-slate-500">{label}</p>
    </div>
  );
}

function BackgroundVerificationPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = String(params?.org_id ?? "");
  const initialFilterKey = stableFilterKey(EMPTY_FILTERS);
  const cachedGroups = orgId ? readBgvListCache(orgId, initialFilterKey) : null;

  const [filters, setFilters] = useState<Filters>({ ...EMPTY_FILTERS });
  const [appliedFilters, setAppliedFilters] = useState<Filters>({ ...EMPTY_FILTERS });
  const [employeeGroups, setEmployeeGroups] = useState<BackgroundVerificationEmployeeGroup[]>(
    () => cachedGroups ?? [],
  );
  const [loading, setLoading] = useState(() => !cachedGroups);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [verifyModal, setVerifyModal] = useState<VerifyTarget | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<BackgroundVerificationStatus>("in_progress");
  const [verifyNotes, setVerifyNotes] = useState("");
  const [verifySubmitting, setVerifySubmitting] = useState(false);

  const loadReferences = useCallback(
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

      const filterKey = stableFilterKey(f);
      const cached = readBgvListCache(orgId, filterKey);

      if (cached && !isManualRefresh) {
        setEmployeeGroups(cached);
        setError(null);
        setLoading(false);
        if (!shouldRefreshBgvListCache(orgId, filterKey)) {
          return;
        }
        setRefreshing(true);
      } else {
        if (isManualRefresh) {
          clearBgvOrgCaches(orgId);
        }
        if (isManualRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);
      }

      try {
        const result = await getAllUserBackgroundVerifications(token, orgId, {
          status: f.status || undefined,
          employee_name: f.employee_name,
          previous_company_name: f.previous_company_name,
          person_role: f.person_role || undefined,
          joining_date: f.joining_date || undefined,
          is_ascending: f.is_ascending,
        });
        const groups = Array.isArray(result.data) ? result.data : [];
        setEmployeeGroups(groups);
        writeBgvListCache(orgId, filterKey, groups);
      } catch (e) {
        if (!cached || isManualRefresh) {
          setEmployeeGroups([]);
        }
        setError(
          e instanceof Error ? e.message : "Could not load background verifications.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orgId],
  );

  useEffect(() => {
    void loadReferences(appliedFilters);
  }, [appliedFilters, loadReferences]);

  useEffect(() => {
    if (!notice || notice.type !== "ok") return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  const counts = useMemo(() => {
    let pending = 0;
    let inProgress = 0;
    let verified = 0;
    let failed = 0;
    let unable = 0;
    let totalReferences = 0;
    for (const group of employeeGroups) {
      for (const r of group.references) {
        totalReferences += 1;
        const s = String(r.verification_status).toLowerCase();
        if (s === "pending") pending += 1;
        else if (s === "in_progress") inProgress += 1;
        else if (s === "verified") verified += 1;
        else if (s === "failed") failed += 1;
        else if (s === "unable_to_contact") unable += 1;
      }
    }
    return {
      pending,
      inProgress,
      verified,
      failed,
      unable,
      total: totalReferences,
      employees: employeeGroups.length,
    };
  }, [employeeGroups]);

  const applyFilters = () => {
    setAppliedFilters({ ...filters });
    setMobileFiltersOpen(false);
  };

  const clearFilters = () => {
    setFilters({ ...EMPTY_FILTERS });
    setAppliedFilters({ ...EMPTY_FILTERS });
    setMobileFiltersOpen(false);
  };

  const refresh = () => {
    void loadReferences(appliedFilters, true);
  };

  const openVerifyModal = (
    group: BackgroundVerificationEmployeeGroup,
    reference: BackgroundVerificationReferenceItem,
  ) => {
    setVerifyModal({
      ...reference,
      employee_id: group.employee_id,
      employee_name: group.employee_name,
    });
    const current = String(
      reference.verification_status,
    ).toLowerCase() as BackgroundVerificationStatus;
    setVerifyStatus(
      STATUS_OPTIONS.some((o) => o.value === current) ? current : "in_progress",
    );
    setVerifyNotes(reference.verification_notes ?? "");
  };

  const submitVerification = async () => {
    if (!verifyModal) return;
    const token = localStorage.getItem("token");
    if (!token) {
      setNotice({ type: "err", text: "Not signed in." });
      return;
    }

    setVerifySubmitting(true);
    try {
      await updateEmployeeBackgroundVerificationStatus(token, {
        org_id: orgId,
        employee_id: verifyModal.employee_id,
        verification_info: {
          verification_id: verifyModal.id,
          verification_status: verifyStatus,
          verification_notes: verifyNotes.trim() || null,
        },
      });
      setNotice({ type: "ok", text: "Verification status updated." });
      setVerifyModal(null);
      clearBgvOrgCaches(orgId);
      await loadReferences(appliedFilters, true);
    } catch (e) {
      setNotice({
        type: "err",
        text: e instanceof Error ? e.message : "Could not update verification.",
      });
    } finally {
      setVerifySubmitting(false);
    }
  };

  const goToEmployee = (employeeId: number) => {
    router.push(
      `/dashboard/${orgId}/organization-employees/background-verification/0?employee_id=${encodeURIComponent(String(employeeId))}`,
    );
  };

  const isBusy = loading || refreshing;
  const showSkeleton = loading && employeeGroups.length === 0;

  return (
    <div className={`${dashPageCls} pb-8`}>
      {/* Mobile sticky header */}
      <div className="sticky top-0 z-20 -mx-3 border-b border-slate-200/80 bg-white/95 px-3 pb-3 pt-3 shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur-md sm:-mx-5 sm:px-4 lg:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className={iconBadgeCls("blue")}>
              <ShieldCheck className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-[17px] font-semibold tracking-tight text-slate-900">
                Background verification
              </h1>
              <p className={`mt-0.5 truncate ${dashSectionMetaCls}`}>
                {showSkeleton
                  ? "Loading workspace…"
                  : `${counts.employees} employee${counts.employees === 1 ? "" : "s"} · ${counts.total} reference${counts.total === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={isBusy}
            className={`${btnGhostCls()} !min-h-[36px] !w-9 !px-0`}
            aria-label="Refresh list"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              aria-hidden
            />
          </button>
        </div>

        {!showSkeleton ? (
          <>
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              <MobileStatTile label="Pending" value={counts.pending} tone="amber" />
              <MobileStatTile label="In progress" value={counts.inProgress} tone="blue" />
              <MobileStatTile label="Verified" value={counts.verified} tone="emerald" />
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              <MobileStatTile label="Failed" value={counts.failed} tone="rose" />
              <MobileStatTile label="No contact" value={counts.unable} tone="gray" />
            </div>
          </>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            <Shimmer className="h-14" />
            <Shimmer className="h-14" />
            <Shimmer className="h-14" />
          </div>
        )}
      </div>

      {/* Desktop header */}
      <header className={`${dashCardCls} hidden overflow-hidden lg:block`}>
        <div className="border-b border-slate-100 bg-gradient-to-r from-[#F8FAFC] via-white to-[#F0F9FF]/40 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className={iconBadgeCls("blue")}>
                <ShieldCheck className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                  Organization · Employees
                </p>
                <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">
                  Background verification
                </h1>
                <p className={`mt-1 max-w-2xl ${dashSectionMetaCls}`}>
                  Review previous company references and update verification status after
                  contacting HR or reporting managers.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={refresh}
                disabled={isBusy}
                className={btnGhostCls()}
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  aria-hidden
                />
                {refreshing ? "Refreshing…" : "Refresh"}
              </button>
              {!showSkeleton ? (
                <>
                  <div className={`${statBoxCls("amber")} min-w-[80px] text-center`}>
                    <p className="text-lg font-semibold tabular-nums text-amber-700">
                      {counts.pending}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600/80">
                      Pending
                    </p>
                  </div>
                  <div className={`${statBoxCls("sky")} min-w-[80px] text-center`}>
                    <p className="text-lg font-semibold tabular-nums text-[#008CD3]">
                      {counts.inProgress}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Active
                    </p>
                  </div>
                  <div className={`${statBoxCls("emerald")} min-w-[80px] text-center`}>
                    <p className="text-lg font-semibold tabular-nums text-emerald-700">
                      {counts.verified}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600/80">
                      Verified
                    </p>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
        {!showSkeleton ? (
          <div className="flex flex-wrap gap-2 px-6 py-4">
            <StatPill label="Pending" value={counts.pending} tone="amber" />
            <StatPill label="In progress" value={counts.inProgress} tone="blue" />
            <StatPill label="Verified" value={counts.verified} tone="emerald" />
            <StatPill label="Failed" value={counts.failed} tone="rose" />
            <StatPill label="Unable to contact" value={counts.unable} tone="gray" />
            <span className="inline-flex min-h-[32px] items-center rounded-full bg-slate-100 px-2.5 text-[12px] font-semibold text-slate-600 ring-1 ring-slate-200/80">
              {counts.employees} employee{counts.employees === 1 ? "" : "s"} · {counts.total}{" "}
              reference{counts.total === 1 ? "" : "s"}
            </span>
          </div>
        ) : null}
      </header>

      {notice ? (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${
            notice.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          {notice.text}
        </div>
      ) : null}

      {showSkeleton ? (
        <BgvPageSkeleton />
      ) : (
        <>
          {/* Filters */}
          <div className={`${dashCardCls} overflow-hidden`}>
            <button
              type="button"
              onClick={() => setMobileFiltersOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-2 px-4 py-3.5 text-left lg:hidden"
              aria-expanded={mobileFiltersOpen}
            >
              <div className="flex items-center gap-3">
                <span className={iconBadgeCls("blue")}>
                  <Filter className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <h2 className="text-[14px] font-semibold text-slate-900">Filters</h2>
                  <p className={dashSectionMetaCls}>
                    Tap to {mobileFiltersOpen ? "hide" : "show"}
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-slate-400 transition ${mobileFiltersOpen ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>

            <div className="hidden items-center gap-3 border-b border-slate-100 px-5 py-4 lg:flex">
              <span className={iconBadgeCls("blue")}>
                <Filter className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">
                  Filters
                </h2>
                <p className={dashSectionMetaCls}>
                  Narrow the list, then apply to reload from the server.
                </p>
              </div>
            </div>

            <div
              className={`${mobileFiltersOpen ? "block border-t border-slate-100" : "hidden"} px-4 py-4 sm:px-5 lg:block`}
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
                <label className="block lg:col-span-2">
                  <span className={labelCls()}>Status</span>
                  <select
                    value={filters.status}
                    onChange={(e) =>
                      setFilters((p) => ({
                        ...p,
                        status: e.target.value as Filters["status"],
                      }))
                    }
                    className={filterFieldCls()}
                  >
                    <option value="">All statuses</option>
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block lg:col-span-2">
                  <span className={labelCls()}>Contact role</span>
                  <select
                    value={filters.person_role}
                    onChange={(e) =>
                      setFilters((p) => ({
                        ...p,
                        person_role: e.target.value as Filters["person_role"],
                      }))
                    }
                    className={filterFieldCls()}
                  >
                    <option value="">All roles</option>
                    <option value="hr">HR</option>
                    <option value="reporting_manager">Reporting manager</option>
                  </select>
                </label>

                <label className="block lg:col-span-2">
                  <span className={`${labelCls()} flex items-center gap-1`}>
                    <Search className="h-3 w-3" aria-hidden />
                    Employee name
                  </span>
                  <input
                    type="text"
                    value={filters.employee_name}
                    onChange={(e) =>
                      setFilters((p) => ({ ...p, employee_name: e.target.value }))
                    }
                    placeholder="Search by employee"
                    className={filterFieldCls()}
                  />
                </label>

                <label className="block lg:col-span-2">
                  <span className={`${labelCls()} flex items-center gap-1`}>
                    <Building2 className="h-3 w-3" aria-hidden />
                    Previous company
                  </span>
                  <input
                    type="text"
                    value={filters.previous_company_name}
                    onChange={(e) =>
                      setFilters((p) => ({
                        ...p,
                        previous_company_name: e.target.value,
                      }))
                    }
                    placeholder="Search company name"
                    className={filterFieldCls()}
                  />
                </label>

                <label className="block lg:col-span-2">
                  <span className={labelCls()}>Joined on</span>
                  <input
                    type="date"
                    value={filters.joining_date}
                    onChange={(e) =>
                      setFilters((p) => ({ ...p, joining_date: e.target.value }))
                    }
                    className={filterFieldCls()}
                  />
                </label>

                <label className="block lg:col-span-2">
                  <span className={labelCls()}>Sort by submitted</span>
                  <select
                    value={filters.is_ascending}
                    onChange={(e) =>
                      setFilters((p) => ({
                        ...p,
                        is_ascending: e.target.value as Filters["is_ascending"],
                      }))
                    }
                    className={filterFieldCls()}
                  >
                    <option value="DESC">Newest first</option>
                    <option value="ASC">Oldest first</option>
                  </select>
                </label>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  className={`${btnGhostCls(true)} sm:w-auto`}
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={applyFilters}
                  className={`${btnBrandCls(true)} sm:w-auto`}
                >
                  Apply filters
                </button>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className={`${dashCardCls} overflow-hidden`}>
            {error ? (
              <div className="px-6 py-14 text-center">
                <p className="text-[14px] font-medium text-rose-700">{error}</p>
                <button
                  type="button"
                  onClick={refresh}
                  className={`${btnBrandCls()} mt-5`}
                >
                  Try again
                </button>
              </div>
            ) : employeeGroups.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 px-6 py-14 text-center">
                <span className={`${iconBadgeCls("blue")} h-12 w-12`}>
                  <ShieldCheck className="h-5 w-5" aria-hidden />
                </span>
                <p className="mt-2 text-[15px] font-semibold text-slate-900">
                  No references found
                </p>
                <p className={`max-w-md ${dashSectionMetaCls}`}>
                  Adjust filters or wait for employees to submit previous company
                  references during onboarding.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {employeeGroups.map((group) => {
                  const name = group.employee_name ?? `Employee #${group.employee_id}`;
                  return (
                    <article key={group.employee_id}>
                      <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                        <span className={avatarCls("sm")} aria-hidden>
                          {userInitials(name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-[14px] font-semibold text-slate-900">
                              {name}
                            </h3>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                              {group.total_references_count} ref
                              {group.total_references_count === 1 ? "" : "s"}
                            </span>
                          </div>
                          <p className={`truncate ${dashSectionMetaCls}`}>
                            Joined {formatDate(group.member_since)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => goToEmployee(group.employee_id)}
                          className={`${btnGhostCls()} !min-h-[32px] !px-2.5 !text-[11px]`}
                        >
                          Detail
                          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </div>

                      <div className="border-t border-slate-50 bg-slate-50/50">
                        {group.references.map((ref) => (
                          <div
                            key={ref.id}
                            className="flex flex-col gap-2.5 border-b border-slate-100/80 px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-3 sm:px-5"
                          >
                            <div className="min-w-0 flex-1 sm:max-w-[28%]">
                              <div className="flex items-center gap-2">
                                <Building2
                                  className="h-3.5 w-3.5 shrink-0 text-slate-400"
                                  aria-hidden
                                />
                                <p className="truncate text-[13px] font-medium text-slate-900">
                                  {ref.previous_company_name}
                                </p>
                              </div>
                              {ref.designation ? (
                                <p className="ml-5 truncate text-[11px] text-slate-400">
                                  {ref.designation}
                                </p>
                              ) : null}
                            </div>

                            <div className="min-w-0 flex-1 sm:max-w-[32%]">
                              <p className="truncate text-[12px] font-medium text-slate-700">
                                {ref.person_name}
                              </p>
                              <p className="truncate text-[11px] text-slate-400">
                                {personRoleLabel(ref.person_role)} · {ref.person_contact_email}
                              </p>
                            </div>

                            <div className="hidden min-w-0 shrink-0 text-[11px] text-slate-500 md:block md:max-w-[18%]">
                              {formatDate(ref.employment_start_date)} –{" "}
                              {formatDate(ref.employment_end_date)}
                            </div>

                            <div className="flex items-center justify-between gap-2 sm:shrink-0 sm:justify-end">
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadgeClass(ref.verification_status)}`}
                              >
                                {statusLabel(ref.verification_status)}
                              </span>
                              {canShowVerifyButton(ref.verification_status) ? (
                                <button
                                  type="button"
                                  onClick={() => openVerifyModal(group, ref)}
                                  className={`${btnBrandCls()} !min-h-[30px] !px-2.5 !text-[11px]`}
                                >
                                  <UserCheck className="h-3 w-3" aria-hidden />
                                  Verify
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Verification modal */}
      {verifyModal ? (
        <div
          className="fixed inset-0 z-[99999] flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="verify-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close dialog backdrop"
            onClick={() => !verifySubmitting && setVerifyModal(null)}
          />
          <div className="relative max-h-[92dvh] w-full max-w-lg overflow-hidden rounded-t-2xl border border-slate-200/90 bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-[#F8FAFC] via-white to-[#F0F9FF]/40 px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <h2
                  id="verify-modal-title"
                  className="text-[16px] font-semibold tracking-tight text-slate-900"
                >
                  Update verification
                </h2>
                <p className={`mt-0.5 truncate ${dashSectionMetaCls}`}>
                  {verifyModal.employee_name} · {verifyModal.previous_company_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVerifyModal(null)}
                disabled={verifySubmitting}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 text-slate-500 transition hover:bg-slate-50"
                aria-label="Close"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="max-h-[min(60vh,480px)] space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 text-[13px]">
                <p className="font-semibold text-slate-900">{verifyModal.person_name}</p>
                <p className="text-slate-500">
                  {personRoleLabel(verifyModal.person_role)} ·{" "}
                  {verifyModal.person_contact_email}
                </p>
                <p className="mt-1 text-slate-500">
                  {verifyModal.person_contact_number1}
                  {verifyModal.person_contact_number2
                    ? ` · ${verifyModal.person_contact_number2}`
                    : ""}
                </p>
              </div>

              <label className="block">
                <span className={labelCls()}>Verification status</span>
                <select
                  value={verifyStatus}
                  onChange={(e) =>
                    setVerifyStatus(e.target.value as BackgroundVerificationStatus)
                  }
                  className={filterFieldCls()}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className={labelCls()}>Verification notes</span>
                <textarea
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  rows={4}
                  placeholder="Record outcome of HR/manager call, documents received, etc."
                  className={filterFieldCls()}
                />
              </label>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/80 px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
              <button
                type="button"
                onClick={() => setVerifyModal(null)}
                disabled={verifySubmitting}
                className={`${btnGhostCls(true)} sm:w-auto`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitVerification()}
                disabled={verifySubmitting}
                className={`${btnBrandCls(true)} sm:w-auto`}
              >
                {verifySubmitting ? "Saving…" : "Save verification"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default BackgroundVerificationPage;
