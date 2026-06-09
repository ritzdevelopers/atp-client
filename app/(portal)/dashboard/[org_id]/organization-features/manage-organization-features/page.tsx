"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
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

const mobileCaptionCls = "text-[11px] leading-snug text-[#6B7280]";
const mobileValueCls = "text-[13px] font-semibold text-[#1F2937]";

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
  return "w-full rounded-lg border border-[#E4E7EC] bg-white py-2.5 pl-9 pr-3 text-[13px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15";
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
  const [mobileMainTab, setMobileMainTab] = useState<"members" | "access">("members");

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
    setMobileMainTab("access");
  }

  function renderPermissionChips(permissions: string[]) {
    if (!permissions?.length) {
      return (
        <span className="text-[12px] text-[#9CA3AF]">No permissions assigned</span>
      );
    }
    return (
      <div className="flex flex-wrap gap-1.5">
        {permissions.map((perm) => (
          <span
            key={perm}
            className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              PERMISSION_COLORS[perm] ?? "bg-[#F5F7FA] text-[#6B7280]"
            }`}
          >
            {perm}
          </span>
        ))}
      </div>
    );
  }

  function renderEmployeeAvatar(emp: EmployeeRow, size: "sm" | "md" | "lg" = "md") {
    const dim =
      size === "sm"
        ? "h-10 w-10 text-[11px]"
        : size === "lg"
          ? "h-14 w-14 text-[14px]"
          : "h-11 w-11 text-[12px]";
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

  function renderFeatureDetailPanel(emp: EmployeeRow, variant: "desktop" | "mobile" = "desktop") {
    const featureCount = emp.features_access?.length ?? 0;
    const subCount = countSubFeatures(emp);

    return (
      <div className="flex h-full flex-col">
        <div className="shrink-0 border-b border-[#E4E7EC] bg-white px-4 py-4 sm:px-5">
          <div className="flex items-start gap-3">
            {variant === "mobile" ? (
              <button
                type="button"
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#008CD3] active:bg-[#F5F7FA] lg:hidden"
                onClick={() => setMobileMainTab("members")}
                aria-label="Back to members"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : null}
            {renderEmployeeAvatar(emp, variant === "mobile" ? "md" : "lg")}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#008CD3]">
                Feature access profile
              </p>
              <h2 className="mt-0.5 truncate text-[16px] font-semibold text-[#1F2937] sm:text-[17px]">
                {emp.employee_name}
              </h2>
              <p className="mt-1 flex items-center gap-1 text-[12px] text-[#6B7280]">
                <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Joined {formatJoinDate(emp.employee_joining_date)}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5">
              <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                <Layers className="h-3 w-3" aria-hidden />
                Features
              </p>
              <p className="mt-1 text-xl font-semibold text-[#008CD3]">{featureCount}</p>
            </div>
            <div className="rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5">
              <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                <Puzzle className="h-3 w-3" aria-hidden />
                Sub features
              </p>
              <p className="mt-1 text-xl font-semibold text-[#0F9D58]">{subCount}</p>
            </div>
            <div className="col-span-2 rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5 sm:col-span-1">
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
          {featureCount === 0 ? (
            <div className="rounded-xl border border-dashed border-[#E4E7EC] bg-white px-4 py-14 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5F7FA] text-[#9CA3AF]">
                <Shield className="h-6 w-6" aria-hidden />
              </span>
              <p className="mt-3 text-[15px] font-semibold text-[#1F2937]">No features assigned</p>
              <p className="mt-1 text-[12px] text-[#6B7280]">
                This employee has no accessible features yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#008CD3] text-white">
                  <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
                </span>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
                  Feature access breakdown
                </p>
              </div>
              {emp.features_access.map((feature) => {
                const isOpen = String(expandedFeatureId) === String(feature.feature_id);
                const title = displayFeatureName(feature);
                const subLen = feature.sub_features?.length ?? 0;
                return (
                  <article
                    key={String(feature.feature_id)}
                    className={`overflow-hidden rounded-xl border bg-white transition ${
                      isOpen
                        ? "border-[#008CD3]/40 shadow-[0_0_0_1px_rgba(0,140,211,0.12)]"
                        : "border-[#E4E7EC] shadow-sm"
                    }`}
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
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-[#F9FAFB] active:bg-[#F5F7FA]"
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[11px] font-semibold ${moduleColorClass(title)}`}
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
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F4FB] px-2 py-0.5 text-[10px] font-semibold text-[#008CD3]">
                          {subLen} sub{subLen === 1 ? "" : "s"}
                        </span>
                        <ChevronRight
                          className={`ml-auto mt-1 h-4 w-4 text-[#9CA3AF] transition ${isOpen ? "rotate-90 text-[#008CD3]" : ""}`}
                          aria-hidden
                        />
                      </div>
                    </button>

                    {isOpen ? (
                      <div className="border-t border-[#E4E7EC] bg-[#FAFBFC] px-4 py-3">
                        {subLen === 0 ? (
                          <p className="text-[12px] text-[#6B7280]">
                            No sub-features under this module.
                          </p>
                        ) : (
                          <ul className="space-y-2.5">
                            {feature.sub_features.map((sub) => (
                              <li
                                key={String(sub.sub_feature_id)}
                                className="rounded-xl border border-[#E4E7EC] bg-white p-3.5 shadow-sm"
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
                                  <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F4FB] px-2.5 py-1 text-[10px] font-semibold text-[#008CD3]">
                                    <KeyRound className="h-3 w-3" aria-hidden />
                                    {sub.sub_feature_permissions?.length ?? 0} permission
                                    {(sub.sub_feature_permissions?.length ?? 0) === 1 ? "" : "s"}
                                  </span>
                                </div>
                                <div className="mt-3 border-t border-[#E4E7EC] pt-3">
                                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                                    Access permissions
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

  function renderEmployeeListItem(emp: EmployeeRow) {
    const isSelected = String(selectedEmployeeId) === String(emp.employee_id);
    const featCount = emp.features_access?.length ?? 0;
    const subCount = countSubFeatures(emp);

    return (
      <li key={String(emp.employee_id)}>
        <button
          type="button"
          onClick={() => selectEmployee(emp)}
          className={`flex w-full items-center gap-3 px-3 py-3.5 text-left transition sm:px-4 ${
            isSelected
              ? "bg-[#E8F4FB] ring-1 ring-inset ring-[#008CD3]/25"
              : "hover:bg-[#F9FAFB] active:bg-[#F5F7FA]"
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
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F4FB] px-2 py-0.5 text-[10px] font-semibold text-[#008CD3]">
                <Layers className="h-3 w-3" aria-hidden />
                {featCount} feature{featCount === 1 ? "" : "s"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E6F4EA] px-2 py-0.5 text-[10px] font-semibold text-[#0F9D58]">
                <Puzzle className="h-3 w-3" aria-hidden />
                {subCount} sub{subCount === 1 ? "" : "s"}
              </span>
            </div>
          </div>
          <ChevronRight
            className={`h-4 w-4 shrink-0 lg:hidden ${isSelected ? "text-[#008CD3]" : "text-[#9CA3AF]"}`}
            aria-hidden
          />
        </button>
      </li>
    );
  }

  const mobileTabs: Array<{
    id: "members" | "access";
    label: string;
    badge?: number;
  }> = [
    { id: "members", label: "Members", badge: filteredEmployees.length },
    {
      id: "access",
      label: "Access",
      badge: selectedEmployee ? countSubFeatures(selectedEmployee) : undefined,
    },
  ];

  const statCards = [
    {
      label: "Employees",
      value: overviewStats.totalEmployees,
      color: "text-[#1F2937]",
      icon: Users,
    },
    {
      label: "Features",
      value: overviewStats.totalFeatures,
      color: "text-[#008CD3]",
      icon: Layers,
    },
    {
      label: "Sub features",
      value: overviewStats.totalSubFeatures,
      color: "text-[#0F9D58]",
      icon: Puzzle,
    },
  ];

  return (
    <section
      className="min-h-full pb-[calc(0.75rem+env(safe-area-inset-bottom))] [font-family:var(--font-inter),system-ui,sans-serif] lg:p-6"
      style={{ backgroundColor: ZOHO.bg }}
    >
      <div className="mx-auto max-w-7xl space-y-4 lg:space-y-5">
        {/* Desktop header */}
        <div className="hidden lg:block">
          <div className="overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-sm">
            <div className="h-[3px] bg-[#008CD3]" aria-hidden />
            <div className="px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
                    <LayoutGrid className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <h1 className="text-[18px] font-semibold text-[#1F2937]">
                      Employee feature access
                    </h1>
                    <p className="text-[13px] text-[#6B7280]">
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

              <div className="mt-4 grid grid-cols-3 gap-2">
                {statCards.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5"
                    >
                      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                        <Icon className="h-3 w-3" aria-hidden />
                        {item.label}
                      </p>
                      <p className={`mt-1 text-lg font-semibold ${item.color}`}>{item.value}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile & tablet header */}
        <div className="sticky top-0 z-20 border-b border-[#E4E7EC] bg-white shadow-sm lg:hidden">
          <div className="flex items-center gap-2.5 px-3 py-2.5 sm:px-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
              <LayoutGrid className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[15px] font-semibold text-[#1F2937] sm:text-[16px]">
                Feature access
              </h1>
              <p className={`truncate ${mobileCaptionCls}`}>
                {loading
                  ? "Loading…"
                  : selectedEmployee
                    ? `${selectedEmployee.employee_name} · ${selectedEmployee.features_access?.length ?? 0} modules`
                    : `${employees.length} members · ${overviewStats.totalSubFeatures} sub-features`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadEmployees()}
              disabled={loading}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#008CD3] transition active:bg-[#F5F7FA] disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 px-3 pb-2 sm:px-4">
            {statCards.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] px-2 py-1.5 text-center sm:px-2.5 sm:py-2"
              >
                <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-[#9CA3AF] sm:text-[10px]">
                  {item.label}
                </p>
                <p className={`text-base font-semibold sm:text-lg ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>

          <div className="px-3 pb-2.5 sm:px-4">
            <div className="flex w-full rounded-lg bg-[#F5F7FA] p-0.5">
              {mobileTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMobileMainTab(tab.id)}
                  className={`flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md px-2 py-2 text-[12px] font-semibold transition active:scale-[0.98] sm:text-[13px] ${
                    mobileMainTab === tab.id
                      ? "bg-white text-[#008CD3] shadow-sm"
                      : "text-[#6B7280]"
                  }`}
                >
                  {tab.label}
                  {tab.badge != null && tab.badge > 0 ? (
                    <span
                      className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[10px] ${
                        mobileMainTab === tab.id
                          ? "bg-[#E8F4FB] text-[#008CD3]"
                          : "bg-[#E4E7EC] text-[#6B7280]"
                      }`}
                    >
                      {tab.badge > 99 ? "99+" : tab.badge}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error ? (
          <div className="mx-3 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2.5 text-[12px] text-[#D93025] lg:mx-0">
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
          <div className="mx-3 rounded-xl border border-dashed border-[#E4E7EC] bg-white px-4 py-14 text-center lg:mx-0">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5F7FA] text-[#9CA3AF]">
              <Users className="h-6 w-6" aria-hidden />
            </span>
            <p className="mt-3 text-[15px] font-semibold text-[#1F2937]">No employees found</p>
            <p className="mt-1 text-[13px] text-[#6B7280]">
              {employees.length === 0
                ? "No active employees in this organization."
                : "Try a different search term."}
            </p>
          </div>
        ) : null}

        {/* Mobile & tablet content */}
        {!loading && !error && filteredEmployees.length > 0 ? (
          <div className="lg:hidden">
            {mobileMainTab === "members" ? (
              <div className="border-t border-[#E4E7EC] bg-white">
                <div className="border-b border-[#E4E7EC] px-3 py-2.5 sm:px-4">
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9CA3AF]"
                      aria-hidden
                    />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search employees, features…"
                      className={zohoSearchCls()}
                    />
                  </div>
                </div>
                <ul className="divide-y divide-[#E4E7EC]">
                  {filteredEmployees.map((emp) => renderEmployeeListItem(emp))}
                </ul>
              </div>
            ) : null}

            {mobileMainTab === "access" ? (
              <div className="min-h-[calc(100dvh-14rem)] border-t border-[#E4E7EC] bg-white">
                {selectedEmployee ? (
                  renderFeatureDetailPanel(selectedEmployee, "mobile")
                ) : (
                  <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8F4FB] text-[#008CD3]">
                      <Users className="h-6 w-6" aria-hidden />
                    </span>
                    <p className={`mt-3 ${mobileValueCls}`}>Select a member</p>
                    <p className={`mt-1 max-w-xs ${mobileCaptionCls}`}>
                      Choose a team member from the Members tab to view their feature access.
                    </p>
                    <button
                      type="button"
                      onClick={() => setMobileMainTab("members")}
                      className="mt-4 inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#008CD3] px-4 py-2 text-[13px] font-semibold text-white transition active:scale-[0.98] hover:bg-[#0070AA]"
                    >
                      <Users className="h-4 w-4" aria-hidden />
                      Browse members
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Desktop master-detail */}
        {!loading && !error && filteredEmployees.length > 0 ? (
          <div className="hidden gap-4 lg:grid lg:grid-cols-[minmax(300px,360px)_1fr]">
            <div className="overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-sm">
              <div className="border-b border-[#E4E7EC] px-4 py-3">
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
                    placeholder="Search employees, features, or sub-features…"
                    className={zohoSearchCls()}
                  />
                </div>
              </div>
              <ul className="max-h-[calc(100vh-18rem)] divide-y divide-[#E4E7EC] overflow-y-auto">
                {filteredEmployees.map((emp) => {
                  const isSelected = String(selectedEmployeeId) === String(emp.employee_id);
                  const featCount = emp.features_access?.length ?? 0;
                  const subCount = countSubFeatures(emp);
                  return (
                    <li key={String(emp.employee_id)}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEmployeeId(emp.employee_id);
                          setExpandedFeatureId(emp.features_access?.[0]?.feature_id ?? null);
                        }}
                        className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition ${
                          isSelected
                            ? "bg-[#E8F4FB] ring-1 ring-inset ring-[#008CD3]/25"
                            : "hover:bg-[#F9FAFB]"
                        }`}
                      >
                        {renderEmployeeAvatar(emp, "sm")}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-semibold text-[#1F2937]">
                            {emp.employee_name}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#6B7280]">
                            ID {String(emp.employee_id)} · Joined{" "}
                            {formatJoinDate(emp.employee_joining_date)}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F4FB] px-2 py-0.5 text-[10px] font-semibold text-[#008CD3]">
                              <Layers className="h-3 w-3" aria-hidden />
                              {featCount}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#E6F4EA] px-2 py-0.5 text-[10px] font-semibold text-[#0F9D58]">
                              <Puzzle className="h-3 w-3" aria-hidden />
                              {subCount}
                            </span>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="min-h-[36rem] overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-sm">
              {selectedEmployee ? (
                renderFeatureDetailPanel(selectedEmployee, "desktop")
              ) : (
                <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8F4FB] text-[#008CD3]">
                    <LayoutGrid className="h-7 w-7" aria-hidden />
                  </span>
                  <p className="mt-4 text-[15px] font-semibold text-[#1F2937]">
                    Select an employee
                  </p>
                  <p className="mt-1 max-w-xs text-[13px] text-[#6B7280]">
                    Choose a team member to view their feature and sub-feature access.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

    </section>
  );
}
