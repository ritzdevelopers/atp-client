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
  if (s === "verified") return "bg-[#E6F4EA] text-[#0F9D58]";
  if (s === "failed") return "bg-[#FCE8E6] text-[#D93025]";
  if (s === "in_progress") return "bg-[#E8F4FB] text-[#008CD3]";
  if (s === "unable_to_contact") return "bg-[#F3F4F6] text-[#6B7280]";
  return "bg-[#FEF3E6] text-[#E8710A]";
}

function canShowVerifyButton(status: string): boolean {
  const s = String(status).toLowerCase();
  return s !== "verified" && s !== "failed";
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

function compactPrimaryBtnCls() {
  return "inline-flex h-7 shrink-0 items-center gap-1 rounded-md bg-[#008CD3] px-2.5 text-[11px] font-medium text-white transition hover:bg-[#0070AA]";
}

function compactGhostBtnCls() {
  return "inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-[#E4E7EC] bg-white px-2.5 text-[11px] font-medium text-[#374151] transition hover:bg-[#F9FAFB]";
}

function employeeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
      ? "bg-[#E6F4EA] text-[#0F9D58]"
      : tone === "rose"
        ? "bg-[#FCE8E6] text-[#D93025]"
        : tone === "blue"
          ? "bg-[#E8F4FB] text-[#008CD3]"
          : tone === "gray"
            ? "bg-[#F3F4F6] text-[#6B7280]"
            : "bg-[#FEF3E6] text-[#E8710A]";
  return (
    <span
      className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium ${toneCls}`}
    >
      {label}
      <span className="font-semibold">{value}</span>
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
      ? "text-[#0F9D58]"
      : tone === "rose"
        ? "text-[#D93025]"
        : tone === "blue"
          ? "text-[#008CD3]"
          : tone === "gray"
            ? "text-[#6B7280]"
            : "text-[#E8710A]";
  return (
    <div className="rounded-lg border border-[#E4E7EC] bg-[#FAFBFC] px-2 py-2 text-center">
      <p className={`text-[16px] font-semibold ${toneCls}`}>{value}</p>
      <p className="text-[10px] font-medium text-[#6B7280]">{label}</p>
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
    const current = String(reference.verification_status).toLowerCase() as BackgroundVerificationStatus;
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

  return (
    <section className="min-h-full space-y-3 bg-[#F5F7FA] p-0 max-lg:-mx-1 sm:max-lg:-mx-2 lg:mx-auto lg:max-w-7xl lg:space-y-4 lg:p-6">
      {/* Mobile header */}
      <div className="sticky top-0 z-20 border-b border-[#E4E7EC] bg-white px-3 pb-2.5 pt-2.5 shadow-sm sm:px-4 lg:hidden">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
              <ShieldCheck className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Organization · Employees
              </p>
              <h1 className="truncate text-[16px] font-semibold text-[#1F2937]">
                Background verification
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
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              aria-hidden
            />
          </button>
        </div>

        <div className="mt-2.5 grid grid-cols-3 gap-1.5">
          <MobileStatTile label="Pending" value={counts.pending} tone="amber" />
          <MobileStatTile label="In progress" value={counts.inProgress} tone="blue" />
          <MobileStatTile label="Verified" value={counts.verified} tone="emerald" />
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          <MobileStatTile label="Failed" value={counts.failed} tone="rose" />
          <MobileStatTile label="No contact" value={counts.unable} tone="gray" />
        </div>
        <p className="mt-1.5 text-center text-[11px] text-[#6B7280]">
          {counts.employees} employee{counts.employees === 1 ? "" : "s"} · {counts.total}{" "}
          reference{counts.total === 1 ? "" : "s"}
        </p>
      </div>

      {/* Desktop header */}
      <header className={`${zohoPanelCls()} hidden p-4 lg:block`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Organization · Employees
              </p>
              <h1 className="text-[18px] font-semibold text-[#1F2937]">
                Background verification
              </h1>
              <p className="mt-0.5 max-w-2xl text-[13px] text-[#6B7280]">
                Review previous company references submitted by employees and update
                verification status after contacting HR or reporting managers.
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
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              aria-hidden
            />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 border-t border-[#E4E7EC] pt-4">
          <StatPill label="Pending" value={counts.pending} tone="amber" />
          <StatPill label="In progress" value={counts.inProgress} tone="blue" />
          <StatPill label="Verified" value={counts.verified} tone="emerald" />
          <StatPill label="Failed" value={counts.failed} tone="rose" />
          <StatPill label="Unable to contact" value={counts.unable} tone="gray" />
          <span className="inline-flex min-h-[32px] items-center rounded-lg bg-[#F5F7FA] px-2.5 text-[12px] font-medium text-[#6B7280]">
            {counts.employees} employee{counts.employees === 1 ? "" : "s"} · {counts.total}{" "}
            reference{counts.total === 1 ? "" : "s"}
          </span>
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

      {/* Filters */}
      <div className={`${zohoPanelCls()} mx-3 p-3 sm:mx-4 sm:p-4 lg:mx-0 lg:p-5`}>
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
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#008CD3] text-white">
            <Filter className="h-3.5 w-3.5" aria-hidden />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-[#1F2937]">Filters</h2>
            <p className="text-[12px] text-[#6B7280]">
              Narrow the list, then apply to reload from the server.
            </p>
          </div>
        </div>

        <div className={`${mobileFiltersOpen ? "mt-4 block" : "hidden"} lg:mt-5 lg:block`}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
            <label className="lg:col-span-2 block">
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

            <label className="lg:col-span-2 block">
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

            <label className="lg:col-span-2 block">
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

            <label className="lg:col-span-2 block">
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

            <label className="lg:col-span-2 block">
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

            <label className="lg:col-span-2 block">
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
            <button type="button" onClick={clearFilters} className={zohoSecondaryBtnCls(true)}>
              Clear
            </button>
            <button type="button" onClick={applyFilters} className={zohoPrimaryBtnCls(true)}>
              Apply filters
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className={`${zohoPanelCls()} mx-3 sm:mx-4 lg:mx-0`}>
        {loading ? (
          <div className="flex min-h-[200px] items-center justify-center p-8 text-[14px] text-[#6B7280]">
            Loading background verifications…
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <p className="text-[14px] text-[#D93025]">{error}</p>
            <button type="button" onClick={refresh} className={`${zohoPrimaryBtnCls()} mt-4`}>
              Try again
            </button>
          </div>
        ) : employeeGroups.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 p-8 text-center">
            <ShieldCheck className="h-10 w-10 text-[#D1D5DB]" aria-hidden />
            <p className="text-[15px] font-medium text-[#1F2937]">No references found</p>
            <p className="max-w-md text-[13px] text-[#6B7280]">
              Adjust filters or wait for employees to submit previous company references
              during onboarding.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E4E7EC]">
            {employeeGroups.map((group) => (
              <article key={group.employee_id} className="bg-white">
                {/* Employee header — single compact row */}
                <div className="flex items-center gap-2.5 px-3 py-2.5 sm:px-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E8F4FB] text-[11px] font-semibold text-[#008CD3]">
                    {employeeInitials(group.employee_name ?? "E")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <h3 className="truncate text-[13px] font-semibold text-[#1F2937]">
                        {group.employee_name ?? `Employee #${group.employee_id}`}
                      </h3>
                      <span className="rounded bg-[#F5F7FA] px-1.5 py-0.5 text-[10px] font-medium text-[#6B7280]">
                        {group.total_references_count} ref
                        {group.total_references_count === 1 ? "" : "s"}
                      </span>
                    </div>
                    <p className="truncate text-[11px] text-[#9CA3AF]">
                      Joined {formatDate(group.member_since)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => goToEmployee(group.employee_id)}
                    className={compactGhostBtnCls()}
                  >
                    Detail
                    <ChevronRight className="h-3 w-3" aria-hidden />
                  </button>
                </div>

                {/* Reference rows */}
                <div className="border-t border-[#F0F2F5] bg-[#FAFBFC]">
                  {group.references.map((ref) => (
                    <div
                      key={ref.id}
                      className="flex flex-col gap-2 border-b border-[#F0F2F5] px-3 py-2 last:border-b-0 sm:flex-row sm:items-center sm:gap-3 sm:px-4 sm:py-2"
                    >
                      <div className="min-w-0 flex-1 sm:max-w-[28%]">
                        <div className="flex items-center gap-2">
                          <Building2
                            className="h-3.5 w-3.5 shrink-0 text-[#9CA3AF]"
                            aria-hidden
                          />
                          <p className="truncate text-[12px] font-medium text-[#1F2937]">
                            {ref.previous_company_name}
                          </p>
                        </div>
                        {ref.designation ? (
                          <p className="ml-5 truncate text-[10px] text-[#9CA3AF]">
                            {ref.designation}
                          </p>
                        ) : null}
                      </div>

                      <div className="min-w-0 flex-1 sm:max-w-[32%]">
                        <p className="truncate text-[11px] text-[#374151]">{ref.person_name}</p>
                        <p className="truncate text-[10px] text-[#9CA3AF]">
                          {personRoleLabel(ref.person_role)} · {ref.person_contact_email}
                        </p>
                      </div>

                      <div className="hidden min-w-0 shrink-0 text-[10px] text-[#6B7280] md:block md:max-w-[18%]">
                        {formatDate(ref.employment_start_date)} –{" "}
                        {formatDate(ref.employment_end_date)}
                      </div>

                      <div className="flex items-center justify-between gap-2 sm:shrink-0 sm:justify-end">
                        <span
                          className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${statusBadgeClass(ref.verification_status)}`}
                        >
                          {statusLabel(ref.verification_status)}
                        </span>
                        {canShowVerifyButton(ref.verification_status) ? (
                          <button
                            type="button"
                            onClick={() => openVerifyModal(group, ref)}
                            className={compactPrimaryBtnCls()}
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
            ))}
          </div>
        )}
      </div>

      {/* Verification modal */}
      {verifyModal ? (
        <div
          className="fixed inset-0 z-[99999] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="verify-modal-title"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 id="verify-modal-title" className="text-[16px] font-semibold text-[#1F2937]">
                  Update verification
                </h2>
                <p className="mt-0.5 text-[13px] text-[#6B7280]">
                  {verifyModal.employee_name} · {verifyModal.previous_company_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVerifyModal(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280] hover:bg-[#F3F4F6]"
                aria-label="Close"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-[#E4E7EC] bg-[#FAFBFC] p-3 text-[13px]">
                <p className="font-medium text-[#1F2937]">{verifyModal.person_name}</p>
                <p className="text-[#6B7280]">
                  {personRoleLabel(verifyModal.person_role)} ·{" "}
                  {verifyModal.person_contact_email}
                </p>
                <p className="mt-1 text-[#6B7280]">
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

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setVerifyModal(null)}
                disabled={verifySubmitting}
                className={zohoSecondaryBtnCls(true)}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitVerification()}
                disabled={verifySubmitting}
                className={zohoPrimaryBtnCls(true)}
              >
                {verifySubmitting ? "Saving…" : "Save verification"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default BackgroundVerificationPage;
