"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  Calendar,
  ChevronRight,
  KeyRound,
  Layers,
  LayoutGrid,
  Loader2,
  Puzzle,
  RefreshCw,
  Search,
  Shield,
  Users,
  X,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const ZOHO = {
  blue: "#008CD3",
  blueDark: "#0070AA",
  blueSoft: "#E8F4FB",
  bg: "#F5F7FA",
  border: "#E4E7EC",
  text: "#1F2937",
  muted: "#6B7280",
  success: "#0F9D58",
  successSoft: "#E6F4EA",
};

type SubFeatureAccess = {
  sub_feature_id: number | string;
  sub_feature_name: string;
  sub_feature_value: string;
  sub_feature_permissions: string[];
};

type FeatureAccess = {
  feature_id: number | string;
  feature_name: string;
  feature_value: string;
  sub_features: SubFeatureAccess[];
};

type EmployeeRow = {
  employee_id: number | string;
  employee_profile_image?: string | null;
  employee_name: string;
  employee_joining_date?: string | null;
  features_access: FeatureAccess[];
};

const PERMISSION_COLORS: Record<string, string> = {
  create: "bg-[#E8F4FB] text-[#008CD3]",
  read: "bg-[#E6F4EA] text-[#0F9D58]",
  update: "bg-[#FEF3E6] text-[#E8710A]",
  delete: "bg-[#FCE8E6] text-[#D93025]",
};

const MODULE_ICON_COLORS = [
  "bg-[#E8F4FB] text-[#008CD3]",
  "bg-[#E6F4EA] text-[#0F9D58]",
  "bg-[#FEF3E6] text-[#E8710A]",
  "bg-[#F3E8FD] text-[#7B1FA2]",
  "bg-[#FCE8E6] text-[#D93025]",
  "bg-[#E8EAF6] text-[#3F51B5]",
];

function moduleColorClass(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return MODULE_ICON_COLORS[Math.abs(hash) % MODULE_ICON_COLORS.length];
}

function userInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatJoinDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function countSubFeatures(employee: EmployeeRow) {
  return (employee.features_access ?? []).reduce(
    (sum, f) => sum + (f.sub_features?.length ?? 0),
    0,
  );
}

function displayFeatureName(feature: FeatureAccess) {
  return feature.feature_name || feature.feature_value || "Untitled feature";
}

function zohoSearchCls() {
  return "w-full rounded-lg border border-[#E4E7EC] bg-white py-2 pl-9 pr-3 text-[13px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15";
}

export default function ManageOrganizationFeaturesPage() {
  const params = useParams();
  const orgId = Number(params?.org_id);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | string | null>(null);
  const [expandedFeatureId, setExpandedFeatureId] = useState<number | string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const loadEmployees = useCallback(async () => {
    if (!orgId || Number.isNaN(orgId)) {
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

    setLoading(true);
    setError(null);
    try {
      const q = encodeURIComponent(String(orgId));
      const res = await fetch(
        `${API_URL}/api/organization-features/get-all-employees-with-accessible-features-and-sub-features-info?org_id=${q}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = (await res.json()) as {
        data?: EmployeeRow[];
        message?: string;
      };
      if (!res.ok) {
        throw new Error(data.message || "Could not load employees");
      }
      const rows = Array.isArray(data.data) ? data.data : [];
      setEmployees(rows);
      setSelectedEmployeeId((prev) => {
        if (prev != null && rows.some((r) => String(r.employee_id) === String(prev))) {
          return prev;
        }
        return rows[0]?.employee_id ?? null;
      });
      setExpandedFeatureId(rows[0]?.features_access?.[0]?.feature_id ?? null);
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

  const filteredEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((emp) => {
      const featureText = (emp.features_access ?? [])
        .flatMap((f) => [
          f.feature_name,
          f.feature_value,
          ...(f.sub_features ?? []).flatMap((sf) => [
            sf.sub_feature_name,
            sf.sub_feature_value,
          ]),
        ])
        .join(" ")
        .toLowerCase();
      return (
        emp.employee_name.toLowerCase().includes(q) ||
        featureText.includes(q)
      );
    });
  }, [employees, searchQuery]);

  const selectedEmployee = useMemo(
    () =>
      employees.find((e) => String(e.employee_id) === String(selectedEmployeeId)) ??
      null,
    [employees, selectedEmployeeId],
  );

  const overviewStats = useMemo(() => {
    const totalEmployees = employees.length;
    const totalFeatures = employees.reduce(
      (sum, e) => sum + (e.features_access?.length ?? 0),
      0,
    );
    const totalSubFeatures = employees.reduce((sum, e) => sum + countSubFeatures(e), 0);
    return { totalEmployees, totalFeatures, totalSubFeatures };
  }, [employees]);

  function selectEmployee(emp: EmployeeRow) {
    setSelectedEmployeeId(emp.employee_id);
    setExpandedFeatureId(emp.features_access?.[0]?.feature_id ?? null);
    setMobileDetailOpen(true);
  }

  function renderPermissionChips(permissions: string[]) {
    if (!permissions?.length) {
      return (
        <span className="text-[12px] text-[#9CA3AF]">No permissions assigned</span>
      );
    }
    return (
      <div className="flex flex-wrap gap-1">
        {permissions.map((perm) => (
          <span
            key={perm}
            className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
              PERMISSION_COLORS[perm] ?? "bg-[#F5F7FA] text-[#6B7280]"
            }`}
          >
            {perm}
          </span>
        ))}
      </div>
    );
  }

  function renderEmployeeAvatar(emp: EmployeeRow, size: "sm" | "md" = "md") {
    const dim = size === "sm" ? "h-9 w-9 text-[11px]" : "h-11 w-11 text-[12px]";
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

  function renderFeatureDetailPanel(emp: EmployeeRow) {
    const featureCount = emp.features_access?.length ?? 0;
    const subCount = countSubFeatures(emp);

    return (
      <div className="flex h-full flex-col">
        <div className="shrink-0 border-b border-[#E4E7EC] bg-white px-4 py-4 sm:px-5">
          <div className="flex items-start gap-3">
            {renderEmployeeAvatar(emp, "md")}
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[16px] font-semibold text-[#1F2937]">
                {emp.employee_name}
              </h2>
              <p className="mt-0.5 flex items-center gap-1 text-[12px] text-[#6B7280]">
                <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Joined {formatJoinDate(emp.employee_joining_date)}
              </p>
            </div>
            <button
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#E4E7EC] text-[#6B7280] lg:hidden"
              onClick={() => setMobileDetailOpen(false)}
              aria-label="Close details"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                Features
              </p>
              <p className="mt-0.5 text-xl font-semibold text-[#008CD3]">{featureCount}</p>
            </div>
            <div className="rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                Sub features
              </p>
              <p className="mt-0.5 text-xl font-semibold text-[#0F9D58]">{subCount}</p>
            </div>
            <div className="col-span-2 rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5 sm:col-span-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                Employee ID
              </p>
              <p className="mt-0.5 truncate text-[14px] font-semibold text-[#1F2937]">
                {String(emp.employee_id)}
              </p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#F5F7FA] p-4 sm:p-5">
          {featureCount === 0 ? (
            <div className="rounded-lg border border-dashed border-[#E4E7EC] bg-white px-4 py-12 text-center">
              <Shield className="mx-auto h-8 w-8 text-[#9CA3AF]" aria-hidden />
              <p className="mt-2 text-[14px] font-medium text-[#1F2937]">No features assigned</p>
              <p className="mt-1 text-[12px] text-[#6B7280]">
                This employee has no accessible features yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                Feature access breakdown
              </p>
              {emp.features_access.map((feature) => {
                const isOpen = String(expandedFeatureId) === String(feature.feature_id);
                const title = displayFeatureName(feature);
                const subLen = feature.sub_features?.length ?? 0;
                return (
                  <article
                    key={String(feature.feature_id)}
                    className="overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedFeatureId((prev) =>
                          String(prev) === String(feature.feature_id)
                            ? null
                            : feature.feature_id,
                        )
                      }
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[#F9FAFB]"
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold ${moduleColorClass(title)}`}
                      >
                        {title.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold text-[#1F2937]">
                          {title}
                        </p>
                        <p className="truncate text-[12px] text-[#6B7280]">
                          {feature.feature_value}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[11px] font-medium text-[#008CD3]">
                          {subLen} sub{subLen === 1 ? "" : "s"}
                        </p>
                        <ChevronRight
                          className={`ml-auto mt-0.5 h-4 w-4 text-[#9CA3AF] transition ${isOpen ? "rotate-90" : ""}`}
                          aria-hidden
                        />
                      </div>
                    </button>

                    {isOpen ? (
                      <div className="border-t border-[#E4E7EC] bg-[#F9FAFB] px-4 py-3">
                        {subLen === 0 ? (
                          <p className="text-[12px] text-[#6B7280]">
                            No sub-features under this module.
                          </p>
                        ) : (
                          <ul className="space-y-2">
                            {feature.sub_features.map((sub) => (
                              <li
                                key={String(sub.sub_feature_id)}
                                className="rounded-lg border border-[#E4E7EC] bg-white p-3"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="text-[13px] font-semibold text-[#1F2937]">
                                      {sub.sub_feature_name}
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-[#9CA3AF]">
                                      {sub.sub_feature_value}
                                    </p>
                                  </div>
                                  <span className="inline-flex items-center gap-1 rounded-md bg-[#E8F4FB] px-2 py-0.5 text-[10px] font-medium text-[#008CD3]">
                                    <KeyRound className="h-3 w-3" aria-hidden />
                                    {sub.sub_feature_permissions?.length ?? 0} permission
                                    {(sub.sub_feature_permissions?.length ?? 0) === 1 ? "" : "s"}
                                  </span>
                                </div>
                                <div className="mt-2 border-t border-[#E4E7EC] pt-2">
                                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                                    Access
                                  </p>
                                  {renderPermissionChips(sub.sub_feature_permissions ?? [])}
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <section
      className="min-h-full [font-family:var(--font-inter),system-ui,sans-serif] lg:p-6"
      style={{ backgroundColor: ZOHO.bg }}
    >
      <div className="mx-auto max-w-7xl space-y-4 lg:space-y-5">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-[#E4E7EC] bg-white px-3 py-3 shadow-sm lg:static lg:rounded-lg lg:border lg:px-5 lg:shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
                <LayoutGrid className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h1 className="text-[16px] font-semibold text-[#1F2937] lg:text-[18px]">
                  Employee feature access
                </h1>
                <p className="text-[12px] text-[#6B7280] lg:text-[13px]">
                  View team members and their assigned features & sub-features.
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

          <div className="mt-3 grid grid-cols-3 gap-2 lg:mt-4">
            <div className="rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2">
              <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                <Users className="h-3 w-3" aria-hidden />
                Employees
              </p>
              <p className="mt-0.5 text-lg font-semibold text-[#1F2937]">
                {overviewStats.totalEmployees}
              </p>
            </div>
            <div className="rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2">
              <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                <Layers className="h-3 w-3" aria-hidden />
                Features
              </p>
              <p className="mt-0.5 text-lg font-semibold text-[#008CD3]">
                {overviewStats.totalFeatures}
              </p>
            </div>
            <div className="rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2">
              <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                <Puzzle className="h-3 w-3" aria-hidden />
                Sub features
              </p>
              <p className="mt-0.5 text-lg font-semibold text-[#0F9D58]">
                {overviewStats.totalSubFeatures}
              </p>
            </div>
          </div>

          <div className="relative mt-3">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]"
              aria-hidden
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search employees, features, or sub-features…"
              className={zohoSearchCls()}
            />
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
            <p className="text-[13px]">Loading employee access…</p>
          </div>
        ) : null}

        {!loading && !error && filteredEmployees.length === 0 ? (
          <div className="mx-3 rounded-lg border border-dashed border-[#E4E7EC] bg-white px-4 py-14 text-center lg:mx-0">
            <Users className="mx-auto h-9 w-9 text-[#9CA3AF]" aria-hidden />
            <p className="mt-2 text-[15px] font-semibold text-[#1F2937]">No employees found</p>
            <p className="mt-1 text-[13px] text-[#6B7280]">
              {employees.length === 0
                ? "No active employees in this organization."
                : "Try a different search term."}
            </p>
          </div>
        ) : null}

        {!loading && !error && filteredEmployees.length > 0 ? (
          <div className="grid gap-0 lg:grid-cols-[minmax(280px,340px)_1fr] lg:gap-4 lg:px-0">
            {/* Employee list */}
            <div className="border-[#E4E7EC] bg-white lg:overflow-hidden lg:rounded-lg lg:border lg:shadow-sm">
              <div className="hidden border-b border-[#E4E7EC] px-4 py-3 lg:block">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                  Team members ({filteredEmployees.length})
                </p>
              </div>
              <ul className="divide-y divide-[#E4E7EC]">
                {filteredEmployees.map((emp) => {
                  const isSelected =
                    String(selectedEmployeeId) === String(emp.employee_id);
                  const featCount = emp.features_access?.length ?? 0;
                  const subCount = countSubFeatures(emp);
                  return (
                    <li key={String(emp.employee_id)}>
                      <button
                        type="button"
                        onClick={() => selectEmployee(emp)}
                        className={`flex w-full items-center gap-3 px-3 py-3 text-left transition sm:px-4 ${
                          isSelected
                            ? "bg-[#E8F4FB] ring-1 ring-inset ring-[#008CD3]/20"
                            : "hover:bg-[#F9FAFB]"
                        }`}
                      >
                        {renderEmployeeAvatar(emp, "sm")}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-semibold text-[#1F2937]">
                            {emp.employee_name}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#6B7280]">
                            Joined {formatJoinDate(emp.employee_joining_date)}
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-md bg-[#E8F4FB] px-1.5 py-0.5 text-[10px] font-medium text-[#008CD3]">
                              <Layers className="h-3 w-3" aria-hidden />
                              {featCount} feature{featCount === 1 ? "" : "s"}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-md bg-[#E6F4EA] px-1.5 py-0.5 text-[10px] font-medium text-[#0F9D58]">
                              <Puzzle className="h-3 w-3" aria-hidden />
                              {subCount} sub{subCount === 1 ? "" : "s"}
                            </span>
                          </div>
                        </div>
                        <ChevronRight
                          className={`h-4 w-4 shrink-0 text-[#9CA3AF] lg:hidden ${isSelected ? "text-[#008CD3]" : ""}`}
                          aria-hidden
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Desktop detail panel */}
            <div className="hidden min-h-[32rem] overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-sm lg:block">
              {selectedEmployee ? (
                renderFeatureDetailPanel(selectedEmployee)
              ) : (
                <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
                  <Users className="h-10 w-10 text-[#9CA3AF]" aria-hidden />
                  <p className="mt-3 text-[15px] font-semibold text-[#1F2937]">
                    Select an employee
                  </p>
                  <p className="mt-1 text-[13px] text-[#6B7280]">
                    Choose a team member to view their feature and sub-feature access.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Mobile detail sheet */}
      {mobileDetailOpen && selectedEmployee ? (
        <div className="fixed inset-0 z-[10060] flex flex-col justify-end lg:hidden">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileDetailOpen(false)}
          />
          <div className="relative z-10 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-xl border border-[#E4E7EC] bg-white shadow-xl">
            {renderFeatureDetailPanel(selectedEmployee)}
          </div>
        </div>
      ) : null}
    </section>
  );
}
