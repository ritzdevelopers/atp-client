"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  Calendar,
  Check,
  ChevronRight,
  Clock,
  ExternalLink,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  UserPlus,
  Users,
  X,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const ZOHO = {
  bg: "#F5F7FA",
  border: "#E4E7EC",
  blue: "#008CD3",
  blueSoft: "#E8F4FB",
  success: "#0F9D58",
  successSoft: "#E6F4EA",
};

type DashboardType = "management" | "employee";
type FilterTab = "all" | "unassigned" | DashboardType;

type EmployeeDashboardRow = {
  employee_id: number | string;
  employee_profile_image?: string | null;
  employee_name: string;
  employee_joining_date?: string | null;
  dashboard_type: DashboardType;
  dashboard_assigned_at?: string | null;
  dashboard_updated_at?: string | null;
};

const DASHBOARD_OPTIONS = [
  {
    type: "management" as DashboardType,
    title: "Management dashboard",
    subtitle: "Full admin control",
    desc: "Organization settings, employee management, roles, features, payroll, and reporting.",
    icon: Shield,
    accent: ZOHO.blue,
    soft: ZOHO.blueSoft,
    perks: ["All management modules", "Assign features & roles", "Org-wide reports"],
  },
  {
    type: "employee" as DashboardType,
    title: "Employee dashboard",
    subtitle: "Self-service portal",
    desc: "Personal attendance, leave, team view, documents, and employee workflows.",
    icon: Users,
    accent: ZOHO.success,
    soft: ZOHO.successSoft,
    perks: ["My attendance & leave", "Team & tasks view", "Personal documents"],
  },
] as const;

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function userInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function dashboardBadge(type: DashboardType, size: "sm" | "md" = "sm") {
  const isMgmt = type === "management";
  const cls = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md font-semibold ${cls} ${
        isMgmt ? "bg-[#E8F4FB] text-[#008CD3]" : "bg-[#E6F4EA] text-[#0F9D58]"
      }`}
    >
      {isMgmt ? <Shield className="h-3 w-3" aria-hidden /> : <Users className="h-3 w-3" aria-hidden />}
      {isMgmt ? "Management" : "Employee"}
    </span>
  );
}

function zohoSearchCls() {
  return "w-full rounded-lg border border-[#E4E7EC] bg-white py-2.5 pl-9 pr-3 text-[13px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15";
}

export default function ManageAssignedDashboardsPage() {
  const params = useParams();
  const orgId = String(params?.org_id ?? "");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<EmployeeDashboardRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState(false);

  const loadEmployees = useCallback(async () => {
    if (!orgId) {
      setError("Invalid organization.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setActionMessage(null);
    setActionSuccess(false);

    try {
      const res = await fetch(
        `${API_URL}/api/dashboard-management/get-all-assigned-dashboards?org_id=${encodeURIComponent(orgId)}`,
        { method: "GET", headers: authHeaders() },
      );
      const data = (await res.json()) as {
        data?: EmployeeDashboardRow[];
        message?: string;
      };
      if (!res.ok) throw new Error(data.message || "Could not load dashboard assignments");

      const rows = Array.isArray(data.data) ? data.data : [];
      setEmployees(rows);
      setSelectedEmployeeId((prev) => {
        if (prev != null && rows.some((r) => String(r.employee_id) === String(prev))) {
          return prev;
        }
        return rows[0]?.employee_id ?? null;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load dashboard assignments");
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  const stats = useMemo(() => {
    const management = employees.filter((e) => e.dashboard_type === "management").length;
    const employeeCount = employees.filter((e) => e.dashboard_type === "employee").length;
    const explicitlyAssigned = employees.filter((e) => e.dashboard_assigned_at).length;
    const unassigned = employees.length - explicitlyAssigned;
    return {
      total: employees.length,
      management,
      employee: employeeCount,
      explicitlyAssigned,
      unassigned,
    };
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return employees.filter((emp) => {
      if (filterTab === "unassigned" && emp.dashboard_assigned_at) return false;
      if (filterTab === "management" && emp.dashboard_type !== "management") return false;
      if (filterTab === "employee" && emp.dashboard_type !== "employee") return false;
      if (!q) return true;
      return (
        emp.employee_name.toLowerCase().includes(q) ||
        String(emp.employee_id).includes(q) ||
        emp.dashboard_type.includes(q)
      );
    });
  }, [employees, searchQuery, filterTab]);

  const selectedEmployee = useMemo(
    () =>
      employees.find((e) => String(e.employee_id) === String(selectedEmployeeId)) ?? null,
    [employees, selectedEmployeeId],
  );

  function selectEmployee(emp: EmployeeDashboardRow) {
    setSelectedEmployeeId(emp.employee_id);
    setActionMessage(null);
    setActionSuccess(false);
    setMobileDetailOpen(true);
  }

  async function updateDashboardType(employeeId: number | string, dashboardType: DashboardType) {
    setUpdating(true);
    setActionMessage(null);
    setActionSuccess(false);
    try {
      const res = await fetch(
        `${API_URL}/api/dashboard-management/update-dashboard-from-employee`,
        {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({
            org_id: Number(orgId),
            employee_id: Number(employeeId),
            dashboard_type: dashboardType,
          }),
        },
      );
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message || "Could not update dashboard");

      setActionMessage("Dashboard type updated successfully.");
      setActionSuccess(true);
      await loadEmployees();
    } catch (e) {
      setActionMessage(e instanceof Error ? e.message : "Update failed");
      setActionSuccess(false);
    } finally {
      setUpdating(false);
    }
  }

  function renderAvatar(emp: EmployeeDashboardRow, size: "sm" | "lg" = "sm") {
    const dim = size === "sm" ? "h-10 w-10 text-[11px]" : "h-14 w-14 text-[14px]";
    if (emp.employee_profile_image) {
      return (
        <img
          src={emp.employee_profile_image}
          alt={emp.employee_name}
          className={`${dim} shrink-0 rounded-full object-cover ring-2 ring-white`}
        />
      );
    }
    return (
      <span
        className={`flex ${dim} shrink-0 items-center justify-center rounded-full bg-[#E8F4FB] font-semibold text-[#008CD3]`}
      >
        {userInitials(emp.employee_name)}
      </span>
    );
  }

  function renderDetailPanel(emp: EmployeeDashboardRow) {
    const hasExplicitAssignment = Boolean(emp.dashboard_assigned_at);
    const assignHref = `/dashboard/${orgId}/dashboard-management/assign-dashboard-to-employee`;

    return (
      <div className="flex h-full flex-col">
        <div className="shrink-0 border-b border-[#E4E7EC] bg-white px-4 py-4 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              {renderAvatar(emp, "lg")}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#008CD3]">
                  Dashboard profile
                </p>
                <h2 className="mt-0.5 truncate text-[16px] font-semibold text-[#1F2937]">
                  {emp.employee_name}
                </h2>
                <p className="mt-1 flex items-center gap-1 text-[12px] text-[#6B7280]">
                  <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Joined {formatDate(emp.employee_joining_date)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {dashboardBadge(emp.dashboard_type, "md")}
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      hasExplicitAssignment
                        ? "bg-[#E8F4FB] text-[#008CD3]"
                        : "bg-[#FEF3E6] text-[#E8710A]"
                    }`}
                  >
                    {hasExplicitAssignment ? "Explicit" : "Default"}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#E4E7EC] text-[#6B7280] hover:bg-[#F9FAFB] lg:hidden"
              onClick={() => setMobileDetailOpen(false)}
              aria-label="Close details"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5">
              <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                <LayoutDashboard className="h-3 w-3" aria-hidden />
                Current
              </p>
              <p className="mt-1 capitalize text-[13px] font-semibold text-[#1F2937]">
                {emp.dashboard_type}
              </p>
            </div>
            <div className="rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5">
              <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                <Clock className="h-3 w-3" aria-hidden />
                Last updated
              </p>
              <p className="mt-1 text-[13px] font-semibold text-[#1F2937]">
                {formatDate(emp.dashboard_updated_at ?? emp.dashboard_assigned_at)}
              </p>
            </div>
            <div className="col-span-2 rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5 sm:col-span-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                Employee ID
              </p>
              <p className="mt-1 truncate text-[13px] font-semibold text-[#1F2937]">
                {String(emp.employee_id)}
              </p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#F5F7FA] p-4 sm:p-5">
          {!hasExplicitAssignment ? (
            <div className="mb-4 rounded-xl border border-[#FEF0D8] bg-[#FFFBF5] p-4">
              <p className="text-[13px] font-semibold text-[#1F2937]">Using default dashboard</p>
              <p className="mt-1 text-[12px] leading-relaxed text-[#6B7280]">
                This employee has no explicit record yet. They see the employee dashboard by default.
              </p>
              <Link
                href={assignHref}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#008CD3] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#0070AA]"
              >
                <UserPlus className="h-3.5 w-3.5" aria-hidden />
                Assign dashboard
                <ExternalLink className="h-3 w-3 opacity-80" aria-hidden />
              </Link>
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#008CD3] text-[11px] font-bold text-white">
              <LayoutDashboard className="h-3.5 w-3.5" aria-hidden />
            </span>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
              Switch dashboard type
            </p>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {DASHBOARD_OPTIONS.map((option) => {
              const isActive = emp.dashboard_type === option.type;
              const Icon = option.icon;

              return (
                <button
                  key={option.type}
                  type="button"
                  disabled={updating || isActive || !hasExplicitAssignment}
                  onClick={() => void updateDashboardType(emp.employee_id, option.type)}
                  className={`relative overflow-hidden rounded-xl border bg-white p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-55 ${
                    isActive
                      ? "border-[#008CD3] shadow-[0_0_0_1px_rgba(0,140,211,0.15)]"
                      : "border-[#E4E7EC] hover:border-[#008CD3]/35 hover:shadow-sm"
                  }`}
                >
                  {isActive ? (
                    <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-[#008CD3] text-white">
                      <Check className="h-3.5 w-3.5" aria-hidden />
                    </span>
                  ) : null}

                  <div className="flex items-start gap-3 pr-8">
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: option.soft, color: option.accent }}
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <p className="text-[14px] font-semibold text-[#1F2937]">{option.title}</p>
                      <p className="text-[11px] font-medium text-[#008CD3]">{option.subtitle}</p>
                    </div>
                  </div>

                  <p className="mt-3 text-[12px] leading-relaxed text-[#6B7280]">{option.desc}</p>

                  <ul className="mt-3 space-y-1.5 border-t border-[#E4E7EC] pt-3">
                    {option.perks.map((perk) => (
                      <li
                        key={perk}
                        className="flex items-center gap-2 text-[11px] text-[#374151]"
                      >
                        <Sparkles className="h-3 w-3 shrink-0 text-[#008CD3]" aria-hidden />
                        {perk}
                      </li>
                    ))}
                  </ul>

                  {isActive ? (
                    <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-[#0F9D58]">
                      Active dashboard
                    </p>
                  ) : hasExplicitAssignment ? (
                    <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-[#008CD3]">
                      Tap to switch
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>

          {actionMessage ? (
            <div
              className={`mt-4 rounded-lg border px-4 py-3 text-[13px] ${
                actionSuccess
                  ? "border-[#B7E1C1] bg-[#E6F4EA] text-[#0F9D58]"
                  : "border-[#F5C6C2] bg-[#FCE8E6] text-[#D93025]"
              }`}
            >
              {actionMessage}
            </div>
          ) : null}

          {updating ? (
            <div className="mt-4 flex items-center gap-2 text-[12px] text-[#6B7280]">
              <Loader2 className="h-4 w-4 animate-spin text-[#008CD3]" aria-hidden />
              Updating dashboard assignment…
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  const filterTabs: { id: FilterTab; label: string; count: number }[] = [
    { id: "all", label: "All", count: employees.length },
    { id: "unassigned", label: "Default", count: stats.unassigned },
    { id: "management", label: "Management", count: stats.management },
    { id: "employee", label: "Employee", count: stats.employee },
  ];

  return (
    <section
      className="min-h-full pb-[calc(1rem+env(safe-area-inset-bottom))] [font-family:var(--font-inter),system-ui,sans-serif] lg:p-6"
      style={{ backgroundColor: ZOHO.bg }}
    >
      <div className="mx-auto max-w-7xl space-y-4 lg:space-y-5">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-[#E4E7EC] bg-white px-3 py-3 shadow-sm lg:static lg:overflow-hidden lg:rounded-lg lg:border lg:px-0 lg:shadow-sm">
          <div className="hidden h-[3px] bg-[#008CD3] lg:block" aria-hidden />

          <div className="lg:px-5 lg:py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
                  <LayoutDashboard className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h1 className="text-[16px] font-semibold text-[#1F2937] lg:text-[18px]">
                    Manage assigned dashboards
                  </h1>
                  <p className="text-[12px] text-[#6B7280] lg:text-[13px]">
                    Review and update which dashboard experience each employee sees.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/dashboard/${orgId}/dashboard-management/assign-dashboard-to-employee`}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#008CD3]/30 bg-[#E8F4FB] px-3 py-1.5 text-[13px] font-semibold text-[#008CD3] transition hover:bg-[#D6EDF9]"
                >
                  <UserPlus className="h-4 w-4" aria-hidden />
                  Assign new
                </Link>
                <button
                  type="button"
                  onClick={() => void loadEmployees()}
                  disabled={loading}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#E4E7EC] bg-white px-3 py-1.5 text-[13px] font-medium text-[#374151] transition hover:bg-[#F9FAFB] disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
                  Refresh
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:mt-4">
              {[
                { label: "Employees", value: stats.total, color: "text-[#1F2937]" },
                { label: "Management", value: stats.management, color: "text-[#008CD3]" },
                { label: "Employee", value: stats.employee, color: "text-[#0F9D58]" },
                { label: "Explicitly set", value: stats.explicitlyAssigned, color: "text-[#1F2937]" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                    {item.label}
                  </p>
                  <p className={`mt-0.5 text-lg font-semibold ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {error ? (
          <div className="mx-3 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2 text-[12px] text-[#D93025] lg:mx-0">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-[#6B7280]">
            <Loader2 className="h-8 w-8 animate-spin text-[#008CD3]" aria-hidden />
            <p className="text-[13px]">Loading dashboard assignments…</p>
          </div>
        ) : null}

        {!loading && !error && filteredEmployees.length === 0 ? (
          <div className="mx-3 rounded-lg border border-dashed border-[#E4E7EC] bg-white px-4 py-14 text-center lg:mx-0">
            <Users className="mx-auto h-9 w-9 text-[#9CA3AF]" aria-hidden />
            <p className="mt-2 text-[15px] font-semibold text-[#1F2937]">No employees found</p>
            <p className="mt-1 text-[13px] text-[#6B7280]">
              {employees.length === 0
                ? "No active employees in this organization."
                : "Try a different search or filter."}
            </p>
          </div>
        ) : null}

        {!loading && !error && filteredEmployees.length > 0 ? (
          <div className="grid gap-0 lg:grid-cols-[minmax(300px,360px)_1fr] lg:gap-4 lg:px-0">
            {/* Employee list */}
            <div className="border-[#E4E7EC] bg-white lg:overflow-hidden lg:rounded-lg lg:border lg:shadow-sm">
              <div className="border-b border-[#E4E7EC] px-3 py-3 sm:px-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                  Team members ({filteredEmployees.length})
                </p>
                <div className="relative mt-3">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]"
                    aria-hidden
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, ID, or type…"
                    className={zohoSearchCls()}
                  />
                </div>
                <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {filterTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFilterTab(tab.id)}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                        filterTab === tab.id
                          ? "bg-[#008CD3] text-white"
                          : "border border-[#E4E7EC] bg-white text-[#6B7280] hover:bg-[#F9FAFB]"
                      }`}
                    >
                      {tab.label}
                      <span className="ml-1 opacity-80">({tab.count})</span>
                    </button>
                  ))}
                </div>
              </div>

              <ul className="max-h-[min(52vh,520px)] divide-y divide-[#E4E7EC] overflow-y-auto lg:max-h-[calc(100vh-18rem)]">
                {filteredEmployees.map((emp) => {
                  const isSelected = String(selectedEmployeeId) === String(emp.employee_id);
                  const hasAssignment = Boolean(emp.dashboard_assigned_at);
                  return (
                    <li key={String(emp.employee_id)}>
                      <button
                        type="button"
                        onClick={() => selectEmployee(emp)}
                        className={`flex w-full items-center gap-3 px-3 py-3.5 text-left transition sm:px-4 ${
                          isSelected
                            ? "bg-[#E8F4FB] ring-1 ring-inset ring-[#008CD3]/25"
                            : "hover:bg-[#F9FAFB]"
                        }`}
                      >
                        {renderAvatar(emp)}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-semibold text-[#1F2937]">
                            {emp.employee_name}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#6B7280]">
                            ID {String(emp.employee_id)}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {dashboardBadge(emp.dashboard_type)}
                            {!hasAssignment ? (
                              <span className="rounded-md bg-[#FEF3E6] px-1.5 py-0.5 text-[10px] font-medium text-[#E8710A]">
                                Default
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <ChevronRight
                          className={`h-4 w-4 shrink-0 lg:hidden ${isSelected ? "text-[#008CD3]" : "text-[#9CA3AF]"}`}
                          aria-hidden
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Desktop detail panel */}
            <div className="hidden min-h-[36rem] overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-sm lg:block">
              {selectedEmployee ? (
                renderDetailPanel(selectedEmployee)
              ) : (
                <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8F4FB] text-[#008CD3]">
                    <LayoutDashboard className="h-7 w-7" aria-hidden />
                  </span>
                  <p className="mt-4 text-[15px] font-semibold text-[#1F2937]">
                    Select an employee
                  </p>
                  <p className="mt-1 max-w-xs text-[13px] text-[#6B7280]">
                    Choose a team member to view their dashboard assignment and switch types.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Mobile / tablet bottom sheet */}
      {mobileDetailOpen && selectedEmployee ? (
        <div className="fixed inset-0 z-[10060] flex flex-col justify-end lg:hidden">
          <button
            type="button"
            aria-label="Close details"
            className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
            onClick={() => setMobileDetailOpen(false)}
          />
          <div className="relative z-10 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-2xl border border-[#E4E7EC] bg-white shadow-2xl">
            <div className="flex justify-center pt-2 pb-1" aria-hidden>
              <span className="h-1 w-10 rounded-full bg-[#E4E7EC]" />
            </div>
            {renderDetailPanel(selectedEmployee)}
          </div>
        </div>
      ) : null}
    </section>
  );
}
