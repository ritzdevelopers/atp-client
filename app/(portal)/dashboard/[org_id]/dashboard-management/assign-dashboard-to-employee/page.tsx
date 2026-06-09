"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  Check,
  ChevronRight,
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
  blueDark: "#0070AA",
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
    desc: "Organization settings, employee management, roles, features, payroll, and reporting modules.",
    icon: Shield,
    accent: ZOHO.blue,
    soft: ZOHO.blueSoft,
    perks: ["All management modules", "Assign features & roles", "Org-wide reports"],
  },
  {
    type: "employee" as DashboardType,
    title: "Employee dashboard",
    subtitle: "Self-service portal",
    desc: "Personal attendance, leave, team view, documents, and employee-focused workflows only.",
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

function dashboardBadge(type: DashboardType, size: "sm" | "md" = "sm") {
  const isMgmt = type === "management";
  const cls =
    size === "sm"
      ? "px-2 py-0.5 text-[10px]"
      : "px-2.5 py-1 text-[11px]";
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

export default function AssignDashboardToEmployeePage() {
  const params = useParams();
  const orgId = String(params?.org_id ?? "");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<EmployeeDashboardRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [dashboardType, setDashboardType] = useState<DashboardType>("employee");
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  const loadEmployees = useCallback(async () => {
    if (!orgId) {
      setError("Invalid organization.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${API_URL}/api/dashboard-management/get-all-assigned-dashboards?org_id=${encodeURIComponent(orgId)}`,
        { method: "GET", headers: authHeaders() },
      );
      const data = (await res.json()) as {
        data?: EmployeeDashboardRow[];
        message?: string;
      };
      if (!res.ok) throw new Error(data.message || "Could not load employees");

      setEmployees(Array.isArray(data.data) ? data.data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load employees");
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  const stats = useMemo(() => {
    const assigned = employees.filter((e) => e.dashboard_assigned_at).length;
    const management = employees.filter((e) => e.dashboard_type === "management").length;
    const unassigned = employees.length - assigned;
    return { total: employees.length, assigned, management, unassigned };
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
        String(emp.employee_id).includes(q)
      );
    });
  }, [employees, searchQuery, filterTab]);

  const selectedEmployee = useMemo(
    () => employees.find((e) => String(e.employee_id) === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId],
  );

  const isUpdateMode = Boolean(selectedEmployee?.dashboard_assigned_at);
  const typeChanged =
    selectedEmployee != null && selectedEmployee.dashboard_type !== dashboardType;

  useEffect(() => {
    if (selectedEmployee) {
      setDashboardType(selectedEmployee.dashboard_type);
    }
  }, [selectedEmployee]);

  function selectEmployee(emp: EmployeeDashboardRow) {
    setSelectedEmployeeId(String(emp.employee_id));
    setActionMessage(null);
    setActionSuccess(false);
    setMobilePanelOpen(true);
  }

  function clearSelection() {
    setSelectedEmployeeId("");
    setMobilePanelOpen(false);
    setActionMessage(null);
    setActionSuccess(false);
  }

  async function handleSubmit() {
    if (!selectedEmployeeId) {
      setActionMessage("Select an employee first.");
      setActionSuccess(false);
      return;
    }

    setSubmitting(true);
    setActionMessage(null);
    setActionSuccess(false);

    const payload = {
      org_id: Number(orgId),
      employee_id: Number(selectedEmployeeId),
      dashboard_type: dashboardType,
    };

    try {
      const endpoint = isUpdateMode
        ? `${API_URL}/api/dashboard-management/update-dashboard-from-employee`
        : `${API_URL}/api/dashboard-management/assign-dashboard-to-employee`;

      const res = await fetch(endpoint, {
        method: isUpdateMode ? "PATCH" : "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message || "Operation failed");

      setActionMessage(
        isUpdateMode
          ? "Dashboard type updated successfully."
          : "Dashboard assigned to employee successfully.",
      );
      setActionSuccess(true);
      await loadEmployees();
    } catch (e) {
      setActionMessage(e instanceof Error ? e.message : "Operation failed");
      setActionSuccess(false);
    } finally {
      setSubmitting(false);
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

  function renderAssignmentPanel() {
    return (
      <div className="flex h-full flex-col">
        <div className="shrink-0 border-b border-[#E4E7EC] bg-white px-4 py-4 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#008CD3]">
                Assignment workspace
              </p>
              <h2 className="mt-1 text-[16px] font-semibold text-[#1F2937]">
                {selectedEmployee ? selectedEmployee.employee_name : "Select an employee"}
              </h2>
              <p className="mt-1 text-[12px] text-[#6B7280]">
                {selectedEmployee
                  ? isUpdateMode
                    ? "Update the dashboard type for this team member."
                    : "Assign a dashboard type for the first time."
                  : "Pick someone from the list to configure their dashboard."}
              </p>
            </div>
            {selectedEmployee ? (
              <button
                type="button"
                onClick={clearSelection}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#E4E7EC] text-[#6B7280] hover:bg-[#F9FAFB] lg:hidden"
                aria-label="Clear selection"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          {selectedEmployee ? (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] p-3">
              {renderAvatar(selectedEmployee, "lg")}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-[#1F2937]">
                  {selectedEmployee.employee_name}
                </p>
                <p className="text-[11px] text-[#6B7280]">
                  ID {String(selectedEmployee.employee_id)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {dashboardBadge(selectedEmployee.dashboard_type, "md")}
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      isUpdateMode
                        ? "bg-[#E8F4FB] text-[#008CD3]"
                        : "bg-[#FEF3E6] text-[#E8710A]"
                    }`}
                  >
                    {isUpdateMode ? "Explicit assignment" : "Default only"}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#F5F7FA] p-4 sm:p-5">
          {!selectedEmployee ? (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-[#E4E7EC] bg-white px-6 py-12 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8F4FB] text-[#008CD3]">
                <UserPlus className="h-7 w-7" aria-hidden />
              </span>
              <p className="mt-4 text-[15px] font-semibold text-[#1F2937]">
                No employee selected
              </p>
              <p className="mt-1 max-w-xs text-[13px] text-[#6B7280]">
                Select a team member from the left panel to assign or update their dashboard.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#008CD3] text-[11px] font-bold text-white">
                  1
                </span>
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                  Choose dashboard experience
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {DASHBOARD_OPTIONS.map((option) => {
                  const isActive = dashboardType === option.type;
                  const Icon = option.icon;
                  const isCurrent =
                    selectedEmployee.dashboard_type === option.type && !typeChanged;

                  return (
                    <button
                      key={option.type}
                      type="button"
                      onClick={() => setDashboardType(option.type)}
                      className={`relative overflow-hidden rounded-xl border bg-white p-4 text-left transition ${
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
                          <p className="text-[14px] font-semibold text-[#1F2937]">
                            {option.title}
                          </p>
                          <p className="text-[11px] font-medium text-[#008CD3]">
                            {option.subtitle}
                          </p>
                        </div>
                      </div>

                      <p className="mt-3 text-[12px] leading-relaxed text-[#6B7280]">
                        {option.desc}
                      </p>

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

                      {isCurrent ? (
                        <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-[#0F9D58]">
                          Current assignment
                        </p>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {actionMessage ? (
                <div
                  className={`rounded-lg border px-4 py-3 text-[13px] ${
                    actionSuccess
                      ? "border-[#B7E1C1] bg-[#E6F4EA] text-[#0F9D58]"
                      : "border-[#F5C6C2] bg-[#FCE8E6] text-[#D93025]"
                  }`}
                >
                  {actionMessage}
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-[#E4E7EC] bg-white px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2 text-[12px] text-[#6B7280] sm:items-center">
              <LayoutDashboard className="mt-0.5 h-4 w-4 shrink-0 text-[#008CD3] sm:mt-0" aria-hidden />
              {selectedEmployee ? (
                <span className="leading-snug">
                  Assign{" "}
                  <strong className="text-[#1F2937]">{selectedEmployee.employee_name}</strong>{" "}
                  to{" "}
                  <strong className="text-[#008CD3]">{dashboardType}</strong> dashboard
                  {isUpdateMode && typeChanged ? " · will update existing record" : ""}
                </span>
              ) : (
                <span>Select an employee to enable assignment</span>
              )}
            </div>
            <button
              type="button"
              disabled={!selectedEmployeeId || submitting || (isUpdateMode && !typeChanged)}
              onClick={() => void handleSubmit()}
              className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-lg bg-[#008CD3] px-5 py-2.5 text-[14px] font-semibold text-white transition hover:bg-[#0070AA] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                <>
                  {isUpdateMode ? "Update dashboard" : "Assign dashboard"}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filterTabs: { id: FilterTab; label: string; count: number }[] = [
    { id: "all", label: "All", count: employees.length },
    { id: "unassigned", label: "Default", count: stats.unassigned },
    { id: "management", label: "Management", count: stats.management },
    { id: "employee", label: "Employee", count: employees.filter((e) => e.dashboard_type === "employee").length },
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
                  <UserPlus className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h1 className="text-[16px] font-semibold text-[#1F2937] lg:text-[18px]">
                    Assign dashboard to employee
                  </h1>
                  <p className="text-[12px] text-[#6B7280] lg:text-[13px]">
                    Configure management or employee dashboard access per team member.
                  </p>
                </div>
              </div>
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

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:mt-4">
              {[
                { label: "Employees", value: stats.total, color: "text-[#1F2937]" },
                { label: "Assigned", value: stats.assigned, color: "text-[#008CD3]" },
                { label: "Management", value: stats.management, color: "text-[#008CD3]" },
                { label: "Using default", value: stats.unassigned, color: "text-[#0F9D58]" },
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
            <p className="text-[13px]">Loading team members…</p>
          </div>
        ) : null}

        {!loading && !error ? (
          <div className="grid gap-0 lg:grid-cols-[minmax(300px,360px)_1fr] lg:gap-4 lg:px-0">
            {/* Employee list */}
            <div className="border-[#E4E7EC] bg-white lg:overflow-hidden lg:rounded-lg lg:border lg:shadow-sm">
              <div className="border-b border-[#E4E7EC] px-3 py-3 sm:px-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                  Team members
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
                    placeholder="Search by name or ID…"
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

              {filteredEmployees.length === 0 ? (
                <div className="px-4 py-14 text-center">
                  <Users className="mx-auto h-9 w-9 text-[#9CA3AF]" aria-hidden />
                  <p className="mt-2 text-[14px] font-semibold text-[#1F2937]">No matches</p>
                  <p className="mt-1 text-[12px] text-[#6B7280]">Try another search or filter.</p>
                </div>
              ) : (
                <ul className="max-h-[min(52vh,520px)] divide-y divide-[#E4E7EC] overflow-y-auto lg:max-h-[calc(100vh-18rem)]">
                  {filteredEmployees.map((emp) => {
                    const isSelected = selectedEmployeeId === String(emp.employee_id);
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
                            className={`h-4 w-4 shrink-0 ${isSelected ? "text-[#008CD3]" : "text-[#9CA3AF]"} lg:hidden`}
                            aria-hidden
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Desktop assignment panel */}
            <div className="hidden min-h-[36rem] overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-sm lg:block">
              {renderAssignmentPanel()}
            </div>
          </div>
        ) : null}
      </div>

      {/* Mobile / tablet bottom sheet */}
      {mobilePanelOpen && selectedEmployee ? (
        <div className="fixed inset-0 z-[10060] flex flex-col justify-end lg:hidden">
          <button
            type="button"
            aria-label="Close assignment panel"
            className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
            onClick={() => setMobilePanelOpen(false)}
          />
          <div className="relative z-10 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-2xl border border-[#E4E7EC] bg-white shadow-2xl">
            <div className="flex justify-center pt-2 pb-1" aria-hidden>
              <span className="h-1 w-10 rounded-full bg-[#E4E7EC]" />
            </div>
            {renderAssignmentPanel()}
          </div>
        </div>
      ) : null}
    </section>
  );
}
