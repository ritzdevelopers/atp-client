"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  Check,
  ChevronDown,
  KeyRound,
  LayoutGrid,
  Loader2,
  Puzzle,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import AssignFeaturesPageSkeleton from "@/components/portal-dashboard/organization-features/AssignFeaturesSkeleton";
import {
  btnBrandCls,
  btnGhostCls,
  dashCardCls,
  dashLabelCls,
  dashPageCls,
  dashSectionBodyCls,
  dashSectionHeadCls,
  dashSectionMetaCls,
  dashSectionTitleCls,
  iconBadgeCls,
  statBoxCls,
  userInitials as dashUserInitials,
} from "@/components/portal-dashboard/home/dashboardTokens";
import PortalResponseModal, {
  type PortalResponseVariant,
} from "@/components/portal-dashboard/ui/PortalResponseModal";
import {
  fetchOrganizationFeatureGroups,
  persistOrganizationFeatureAccess,
  readOrganizationFeatureSnapshot,
  shouldRefreshOrganizationFeatureSnapshot,
  type OrgFeatureGroup,
  type OrgSubFeature,
} from "@/lib/orgFeatureAccess";
import {
  clearEmployeeFeatureAccessCache,
  readEmployeeFeatureAccessCache,
  shouldRefreshEmployeeFeatureAccessCache,
  writeEmployeeFeatureAccessCache,
} from "@/lib/employeeManagementCache";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const PERMISSIONS = ["create", "read", "update", "delete"] as const;
type Permission = (typeof PERMISSIONS)[number];

const PERMISSION_COLORS: Record<Permission, string> = {
  create: "bg-[#E8F4FB] text-[#008CD3] ring-[#008CD3]/20",
  read: "bg-[#E6F4EA] text-[#0F9D58] ring-[#0F9D58]/20",
  update: "bg-[#FEF3E6] text-[#E8710A] ring-[#E8710A]/20",
  delete: "bg-[#FCE8E6] text-[#D93025] ring-[#D93025]/20",
};

type EmployeeOption = {
  employee_id: number | string;
  employee_name: string;
  employee_profile_image?: string | null;
};

type EmployeeFeatureAccessRow = EmployeeOption;

function mapEmployeeRows(
  rows: Array<{
    employee_id: number | string;
    employee_name: string;
    employee_profile_image?: string | null;
  }>,
): EmployeeOption[] {
  return rows.map((r) => ({
    employee_id: r.employee_id,
    employee_name: r.employee_name,
    employee_profile_image: r.employee_profile_image,
  }));
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function userInitials(name: string) {
  return dashUserInitials(name);
}

const MODULE_ICON_THEMES: Record<
  string,
  { variant: "blue" | "amber" | "emerald" | "violet" | "slate"; label: string }
> = {
  "employee-management": { variant: "violet", label: "EM" },
  "employees-roles-management": { variant: "amber", label: "RO" },
  "employees-features-management": { variant: "emerald", label: "AC" },
  "payroll-management": { variant: "blue", label: "PR" },
  "task-management": { variant: "violet", label: "TK" },
  "company-attendance-management": { variant: "emerald", label: "AT" },
  "company-leave-management": { variant: "amber", label: "LV" },
};

function moduleMeta(featureVal: string, featureName: string) {
  const key = featureVal.trim().toLowerCase();
  const themed = MODULE_ICON_THEMES[key];
  if (themed) return themed;
  const label = (featureName || featureVal).slice(0, 2).toUpperCase();
  const variants = ["blue", "emerald", "amber", "violet"] as const;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = key.charCodeAt(i) + ((hash << 5) - hash);
  return { variant: variants[Math.abs(hash) % variants.length], label };
}

function inputCls() {
  return "w-full rounded-xl border border-slate-200/90 bg-white py-2.5 pl-10 pr-3 text-[14px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15";
}

function listCardCls(selected = false, partial = false) {
  const ring = selected
    ? "border-[#008CD3] ring-2 ring-[#008CD3]/15"
    : partial
      ? "border-emerald-200 ring-1 ring-emerald-100"
      : "border-slate-200/90";
  return `card-fade-in overflow-hidden rounded-2xl border bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition hover:border-[#008CD3]/20 hover:shadow-[0_4px_20px_rgba(15,23,42,0.08)] ${ring}`;
}

function errorBannerCls() {
  return "rounded-2xl border border-rose-200/80 bg-rose-50 px-4 py-3 text-[13px] text-rose-800";
}

function infoBannerCls() {
  return "flex items-start gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3.5";
}

function modalShellCls() {
  return "relative z-10 w-full max-w-lg overflow-hidden rounded-t-2xl border border-slate-200/90 bg-white shadow-2xl sm:rounded-2xl";
}

export default function AssignFeaturesToEmployeePage() {
  const params = useParams();
  const orgId = String(params?.org_id ?? "");

  const featureSnapshot = orgId ? readOrganizationFeatureSnapshot(orgId) : null;

  const [loadingFeatures, setLoadingFeatures] = useState(() => !featureSnapshot?.groups?.length);
  const [refreshingFeatures, setRefreshingFeatures] = useState(false);
  const [featureError, setFeatureError] = useState<string | null>(null);
  const [orgFeatures, setOrgFeatures] = useState<OrgFeatureGroup[]>(
    () => featureSnapshot?.groups ?? [],
  );
  const [featureSearch, setFeatureSearch] = useState("");

  const [isAssignmentActive, setIsAssignmentActive] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [employeeError, setEmployeeError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [modalEmployeeId, setModalEmployeeId] = useState<string>("");

  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeOption | null>(null);
  const [expandedFeatureIds, setExpandedFeatureIds] = useState<Set<string>>(new Set());
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<Set<string>>(new Set());
  const [selectedSubByFeature, setSelectedSubByFeature] = useState<
    Record<string, Set<string>>
  >({});
  const [subPermissions, setSubPermissions] = useState<Record<string, Permission[]>>({});

  const [assigning, setAssigning] = useState(false);
  const [responseModal, setResponseModal] = useState<{
    open: boolean;
    variant: PortalResponseVariant;
    title: string;
    message: string;
    detail?: string;
  }>({
    open: false,
    variant: "success",
    title: "",
    message: "",
  });

  function showResponse(
    variant: PortalResponseVariant,
    title: string,
    message: string,
    detail?: string,
  ) {
    setResponseModal({ open: true, variant, title, message, detail });
  }

  function closeResponseModal() {
    setResponseModal((prev) => ({ ...prev, open: false }));
  }

  const loadOrgFeatures = useCallback(
    async (force = false) => {
      if (!orgId) return;

      const cached = readOrganizationFeatureSnapshot(orgId);
      const hadCache = Boolean(cached?.groups?.length);

      if (hadCache && !force) {
        setOrgFeatures(cached!.groups);
        setFeatureError(null);
        setLoadingFeatures(false);
        if (!shouldRefreshOrganizationFeatureSnapshot(orgId)) {
          return;
        }
        setRefreshingFeatures(true);
      } else {
        if (force) setRefreshingFeatures(true);
        else setLoadingFeatures(true);
        setFeatureError(null);
      }

      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Not signed in.");
        const groups = await fetchOrganizationFeatureGroups(orgId, token);
        setOrgFeatures(groups);
        persistOrganizationFeatureAccess(
          orgId,
          groups,
          readOrganizationFeatureSnapshot(orgId)?.allowedPaths ?? [],
        );
      } catch (e) {
        if (!hadCache || force) {
          setFeatureError(e instanceof Error ? e.message : "Could not load features");
          setOrgFeatures([]);
        }
      } finally {
        setLoadingFeatures(false);
        setRefreshingFeatures(false);
      }
    },
    [orgId],
  );

  useEffect(() => {
    void loadOrgFeatures();
  }, [loadOrgFeatures]);

  function resetSelections() {
    setSelectedFeatureIds(new Set());
    setSelectedSubByFeature({});
    setSubPermissions({});
  }

  function exitAssignmentMode() {
    setIsAssignmentActive(false);
    setSelectedEmployee(null);
    resetSelections();
    closeResponseModal();
    setFeatureSearch("");
  }

  const loadEmployees = useCallback(
    async (force = false) => {
      if (!orgId) return;

      const cached = readEmployeeFeatureAccessCache<EmployeeFeatureAccessRow>(orgId);
      if (cached?.length && !force) {
        setEmployees(mapEmployeeRows(cached));
        setEmployeeError(null);
        setEmployeeLoading(false);
        if (!shouldRefreshEmployeeFeatureAccessCache(orgId)) {
          return;
        }
      } else {
        setEmployeeLoading(true);
        setEmployeeError(null);
      }

      try {
        const res = await fetch(
          `${API_URL}/api/organization-features/get-all-employees-with-accessible-features-and-sub-features-info?org_id=${encodeURIComponent(orgId)}`,
          { method: "GET", headers: authHeaders() },
        );
        const data = (await res.json()) as {
          data?: EmployeeFeatureAccessRow[];
          message?: string;
        };
        if (!res.ok) throw new Error(data.message || "Could not load employees");
        const rows = Array.isArray(data.data) ? data.data : [];
        writeEmployeeFeatureAccessCache(orgId, rows);
        setEmployees(mapEmployeeRows(rows));
      } catch (e) {
        if (!cached?.length || force) {
          setEmployeeError(e instanceof Error ? e.message : "Could not load employees");
          setEmployees([]);
        }
      } finally {
        setEmployeeLoading(false);
      }
    },
    [orgId],
  );

  async function openAssignmentFlow() {
    setModalEmployeeId(selectedEmployee ? String(selectedEmployee.employee_id) : "");
    setEmployeeSearch("");
    setShowEmployeeModal(true);
    await loadEmployees();
  }

  function confirmEmployeeSelection() {
    if (!modalEmployeeId) {
      setEmployeeError("Select one employee.");
      return;
    }
    const emp = employees.find((e) => String(e.employee_id) === modalEmployeeId);
    if (!emp) return;

    setSelectedEmployee(emp);
    setIsAssignmentActive(true);
    resetSelections();
    setExpandedFeatureIds(new Set(orgFeatures.map((f) => String(f.parent_feature_id))));
    setShowEmployeeModal(false);
    setEmployeeError(null);
  }

  function toggleFeatureExpand(parentId: string) {
    setExpandedFeatureIds((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  }

  function toggleFeatureSelect(parentId: string) {
    if (!isAssignmentActive || !selectedEmployee) return;
    setSelectedFeatureIds((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  }

  function toggleSubFeature(parentId: string, subId: string) {
    if (!isAssignmentActive || !selectedEmployee) return;
    setSelectedSubByFeature((prev) => {
      const current = new Set(prev[parentId] ?? []);
      if (current.has(subId)) {
        current.delete(subId);
        setSubPermissions((perms) => {
          const copy = { ...perms };
          delete copy[subId];
          return copy;
        });
      } else {
        current.add(subId);
        setSubPermissions((perms) => ({
          ...perms,
          [subId]: perms[subId]?.length ? perms[subId] : ["read"],
        }));
        setExpandedFeatureIds((prevExpanded) => new Set(prevExpanded).add(parentId));
      }
      return { ...prev, [parentId]: current };
    });
  }

  function toggleSubPermission(subId: string, perm: Permission) {
    if (!isAssignmentActive) return;
    setSubPermissions((prev) => {
      const current = prev[subId] ?? [];
      const has = current.includes(perm);
      const next = has ? current.filter((p) => p !== perm) : [...current, perm];
      return { ...prev, [subId]: next };
    });
  }

  const filteredFeatures = useMemo(() => {
    const q = featureSearch.trim().toLowerCase();
    if (!q) return orgFeatures;
    return orgFeatures.filter((feature) => {
      const parentText = `${feature.feature_name} ${feature.feature_val}`.toLowerCase();
      const subText = (feature.sub_features ?? [])
        .map((sf) => `${sf.sub_feature_name} ${sf.sub_feature_path}`)
        .join(" ")
        .toLowerCase();
      return parentText.includes(q) || subText.includes(q);
    });
  }, [orgFeatures, featureSearch]);

  const filteredEmployees = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (emp) =>
        emp.employee_name.toLowerCase().includes(q) ||
        String(emp.employee_id).includes(q),
    );
  }, [employees, employeeSearch]);

  const totalSubFeatureCount = useMemo(
    () => orgFeatures.reduce((sum, f) => sum + (f.sub_features?.length ?? 0), 0),
    [orgFeatures],
  );

  const selectedSubCount = useMemo(() => {
    let count = 0;
    for (const set of Object.values(selectedSubByFeature)) {
      count += set.size;
    }
    return count;
  }, [selectedSubByFeature]);

  const selectedFeatureCount = selectedFeatureIds.size;

  const hasAnySelection = selectedFeatureCount > 0 || selectedSubCount > 0;

  const allFeaturesSelected =
    orgFeatures.length > 0 &&
    orgFeatures.every((f) => selectedFeatureIds.has(String(f.parent_feature_id)));

  const allSubFeaturesSelected =
    totalSubFeatureCount > 0 && selectedSubCount === totalSubFeatureCount;

  const allSelectedSubsHaveFullPermissions = useMemo(() => {
    const fullPerms: Permission[] = [...PERMISSIONS];
    for (const [, subSet] of Object.entries(selectedSubByFeature)) {
      for (const subId of subSet) {
        const current = subPermissions[subId] ?? [];
        if (!fullPerms.every((p) => current.includes(p))) return false;
      }
    }
    return selectedSubCount > 0;
  }, [selectedSubByFeature, subPermissions, selectedSubCount]);

  function selectAllFeatures() {
    if (allFeaturesSelected) {
      setSelectedFeatureIds(new Set());
      return;
    }
    setSelectedFeatureIds(
      new Set(orgFeatures.map((f) => String(f.parent_feature_id))),
    );
  }

  function selectAllSubFeatures() {
    if (allSubFeaturesSelected) {
      setSelectedSubByFeature({});
      setSubPermissions({});
      return;
    }
    const nextSubs: Record<string, Set<string>> = {};
    const nextPerms: Record<string, Permission[]> = {};
    for (const feature of orgFeatures) {
      const parentId = String(feature.parent_feature_id);
      const ids = new Set<string>();
      for (const sub of feature.sub_features ?? []) {
        const subId = String(sub.id);
        ids.add(subId);
        nextPerms[subId] = subPermissions[subId]?.length
          ? subPermissions[subId]
          : ["read"];
      }
      if (ids.size > 0) nextSubs[parentId] = ids;
    }
    setSelectedSubByFeature(nextSubs);
    setSubPermissions(nextPerms);
    setExpandedFeatureIds(
      new Set(orgFeatures.map((f) => String(f.parent_feature_id))),
    );
  }

  function markAllPermissionsForSelected() {
    const next: Record<string, Permission[]> = { ...subPermissions };
    for (const [, subSet] of Object.entries(selectedSubByFeature)) {
      for (const subId of subSet) {
        next[subId] = [...PERMISSIONS];
      }
    }
    setSubPermissions(next);
  }

  function buildFeaturesPayload() {
    const features_data: Array<{
      feature_id: number;
      access_permission: boolean;
      sub_features_data: Array<{
        sub_feature_id: number;
        access_permission: boolean;
        feature_access: Permission[];
      }>;
    }> = [];

    for (const feature of orgFeatures) {
      const parentId = String(feature.parent_feature_id);
      const parentSelected = selectedFeatureIds.has(parentId);
      const selectedSubs = selectedSubByFeature[parentId] ?? new Set<string>();

      if (!parentSelected && selectedSubs.size === 0) continue;

      const sub_features_data = (feature.sub_features ?? [])
        .filter((sf) => selectedSubs.has(String(sf.id)))
        .map((sf) => {
          const perms = subPermissions[String(sf.id)] ?? [];
          if (perms.length === 0) {
            throw new Error(
              `Select at least one permission for "${sf.sub_feature_name}".`,
            );
          }
          return {
            sub_feature_id: Number(sf.id),
            access_permission: true,
            feature_access: perms,
          };
        });

      features_data.push({
        feature_id: Number(feature.parent_feature_id),
        access_permission: parentSelected || sub_features_data.length > 0,
        sub_features_data,
      });
    }

    return features_data;
  }

  async function assignAccess() {
    if (!selectedEmployee) {
      showResponse(
        "error",
        "Employee required",
        "Select an employee before assigning access.",
      );
      return;
    }
    if (!hasAnySelection) {
      showResponse(
        "error",
        "Nothing selected",
        "Select at least one module or sub-module to assign.",
      );
      return;
    }

    let features_data;
    try {
      features_data = buildFeaturesPayload();
    } catch (e) {
      showResponse(
        "error",
        "Invalid selection",
        e instanceof Error ? e.message : "Please review your selections.",
      );
      return;
    }

    if (features_data.length === 0) {
      showResponse(
        "error",
        "Nothing selected",
        "Select at least one module or sub-module to assign.",
      );
      return;
    }

    setAssigning(true);
    try {
      const res = await fetch(
        `${API_URL}/api/organization-features/assign-features-and-sub-features-to-the-employee`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            org_id: Number(orgId),
            employee_id: Number(selectedEmployee.employee_id),
            features_data,
          }),
        },
      );
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message || "Could not assign access");
      clearEmployeeFeatureAccessCache(orgId);
      showResponse(
        "success",
        "Access assigned",
        "Feature and sub-feature access was assigned successfully.",
        `Assigned to ${selectedEmployee.employee_name}.`,
      );
      resetSelections();
    } catch (e) {
      showResponse(
        "error",
        "Assignment failed",
        e instanceof Error ? e.message : "Something went wrong. Please try again.",
      );
    } finally {
      setAssigning(false);
    }
  }

  function renderSelectableSubFeature(parentId: string, sub: OrgSubFeature) {
    const subId = String(sub.id);
    const checked = selectedSubByFeature[parentId]?.has(subId) ?? false;
    const perms = subPermissions[subId] ?? [];

    return (
      <div
        key={subId}
        className={`group rounded-xl border p-3.5 transition-all duration-200 ${
          checked
            ? "border-[#008CD3] bg-gradient-to-br from-[#E8F4FB] to-white shadow-sm ring-1 ring-[#008CD3]/15"
            : "border-slate-200/90 bg-white hover:border-[#008CD3]/30 hover:shadow-sm"
        }`}
      >
        <button
          type="button"
          onClick={() => toggleSubFeature(parentId, subId)}
          className="flex w-full items-start gap-3 text-left"
        >
          <span
            className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border transition ${
              checked
                ? "border-[#008CD3] bg-[#008CD3] text-white shadow-sm"
                : "border-[#CBD5E1] bg-white group-hover:border-[#008CD3]/50"
            }`}
          >
            {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-slate-900">
              {sub.sub_feature_name}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">{sub.sub_feature_path}</p>
          </div>
        </button>
        {checked ? (
          <div className="mt-3 border-t border-slate-100 pt-3 pl-[30px]">
            <p className={`mb-2 flex items-center gap-1.5 ${dashLabelCls} font-semibold uppercase tracking-wider`}>
              <KeyRound className="h-3 w-3" />
              CRUD permissions
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PERMISSIONS.map((perm) => {
                const on = perms.includes(perm);
                return (
                  <button
                    key={perm}
                    type="button"
                    onClick={() => toggleSubPermission(subId, perm)}
                    className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 transition ${
                      on
                        ? PERMISSION_COLORS[perm]
                        : "bg-slate-50 text-slate-400 ring-slate-200 hover:text-slate-600"
                    }`}
                  >
                    {perm}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  function renderViewSubFeature(sub: OrgSubFeature) {
    return (
      <div
        key={String(sub.id)}
        className="rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 transition hover:border-[#008CD3]/20 hover:bg-sky-50/30"
      >
        <p className="text-[13px] font-medium text-slate-900">{sub.sub_feature_name}</p>
        <p className="text-[11px] text-slate-500">{sub.sub_feature_path}</p>
      </div>
    );
  }

  if (loadingFeatures && orgFeatures.length === 0) {
    return (
      <section className={`${dashPageCls} relative min-h-full pb-8`}>
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[320px] bg-gradient-to-b from-[#FDE8F3]/25 via-[#F4F6F9] to-transparent"
          aria-hidden
        />
        <AssignFeaturesPageSkeleton />
      </section>
    );
  }

  return (
    <section className={`${dashPageCls} relative min-h-full pb-8`}>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[320px] bg-gradient-to-b from-[#FDE8F3]/25 via-[#F4F6F9] to-transparent"
        aria-hidden
      />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 lg:gap-5">
        {/* Page header */}
        <header className={`${dashCardCls} overflow-hidden`}>
          <div className="border-b border-slate-100 bg-gradient-to-r from-[#F8FAFC] via-white to-[#F0F9FF]/40 px-5 py-5 lg:px-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3 sm:gap-4">
                <span className={iconBadgeCls("emerald")}>
                  <ShieldCheck className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                    Organization · Features
                  </p>
                  <h1 className={`mt-0.5 ${dashSectionTitleCls} text-[20px] sm:text-[22px]`}>
                    Assign access to employee
                  </h1>
                  <p className={`mt-1.5 max-w-2xl ${dashSectionMetaCls}`}>
                    Select an employee, choose modules and sub-modules, then assign parent
                    features with CRUD permissions in one save.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void loadOrgFeatures(true)}
                  disabled={loadingFeatures || refreshingFeatures}
                  className={btnGhostCls()}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loadingFeatures || refreshingFeatures ? "animate-spin" : ""}`}
                    aria-hidden
                  />
                  Refresh
                </button>
                {!isAssignmentActive ? (
                  <button
                    type="button"
                    onClick={() => void openAssignmentFlow()}
                    className={btnBrandCls()}
                  >
                    <UserPlus className="h-4 w-4" aria-hidden />
                    Start assignment
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={exitAssignmentMode}
                    className={btnGhostCls()}
                  >
                    <X className="h-4 w-4" aria-hidden />
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          {isAssignmentActive && selectedEmployee ? (
            <div className={`${dashSectionHeadCls} flex-wrap justify-between gap-3 bg-white`}>
              <div className="flex items-center gap-3">
                {selectedEmployee.employee_profile_image ? (
                  <img
                    src={selectedEmployee.employee_profile_image}
                    alt=""
                    className="h-11 w-11 rounded-full object-cover ring-2 ring-[#008CD3]/20"
                  />
                ) : (
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-50 text-[13px] font-bold text-[#008CD3] ring-2 ring-[#008CD3]/20">
                    {userInitials(selectedEmployee.employee_name)}
                  </span>
                )}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#008CD3]">
                    Assigning to
                  </p>
                  <p className="text-[15px] font-semibold text-slate-900">
                    {selectedEmployee.employee_name}
                  </p>
                  <p className={dashSectionMetaCls}>
                    Employee ID · {String(selectedEmployee.employee_id)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void openAssignmentFlow()}
                className={btnGhostCls()}
              >
                Change employee
              </button>
            </div>
          ) : (
            <div className={dashSectionBodyCls}>
              <div className={infoBannerCls()}>
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#008CD3]" aria-hidden />
                <p className={dashSectionMetaCls}>
                  Browse modules below. Click{" "}
                  <span className="font-semibold text-slate-800">Start assignment</span> to
                  pick an employee and configure module access with sub-feature permissions.
                </p>
              </div>
            </div>
          )}
        </header>

        {featureError ? (
          <div className={errorBannerCls()} role="alert">
            {featureError}
          </div>
        ) : null}

        {!loadingFeatures && orgFeatures.length === 0 ? (
          <div className={`${dashCardCls} px-6 py-16 text-center`}>
            <Puzzle className="mx-auto h-10 w-10 text-slate-300" aria-hidden />
            <p className="mt-3 text-[16px] font-semibold text-slate-900">No features found</p>
            <p className={`mt-1 ${dashSectionMetaCls}`}>
              This organization has no assignable modules yet.
            </p>
          </div>
        ) : null}

        {!loadingFeatures && orgFeatures.length > 0 ? (
          <>
            <div className={`${dashCardCls} flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between`}>
              <div className="relative min-w-0 flex-1 sm:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                <input
                  type="search"
                  value={featureSearch}
                  onChange={(e) => setFeatureSearch(e.target.value)}
                  placeholder="Search modules or sub-modules…"
                  className={inputCls()}
                />
              </div>

              {isAssignmentActive && selectedEmployee ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllFeatures}
                    className={`${btnGhostCls()} !min-h-[36px] !px-3 !text-[12px]`}
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden />
                    {allFeaturesSelected ? "Deselect modules" : "Select all modules"}
                  </button>
                  <button
                    type="button"
                    onClick={selectAllSubFeatures}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-emerald-200/80 bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-700 transition hover:bg-emerald-100"
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden />
                    {allSubFeaturesSelected
                      ? "Deselect sub-modules"
                      : "Select all sub-modules"}
                  </button>
                  <button
                    type="button"
                    onClick={markAllPermissionsForSelected}
                    disabled={selectedSubCount === 0}
                    className={`${btnGhostCls()} !min-h-[36px] !px-3 !text-[12px] disabled:opacity-50`}
                  >
                    <KeyRound className="h-3.5 w-3.5" aria-hidden />
                    {allSelectedSubsHaveFullPermissions ? "Full CRUD set" : "Grant full CRUD"}
                  </button>
                </div>
              ) : null}
            </div>

            {isAssignmentActive && selectedEmployee ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <div className={statBoxCls("sky")}>
                  <p className={dashLabelCls}>Modules</p>
                  <p className="mt-1 text-xl font-bold tabular-nums text-[#008CD3]">
                    {selectedFeatureCount}
                    <span className="text-[13px] font-medium text-slate-500">
                      {" "}
                      / {orgFeatures.length}
                    </span>
                  </p>
                </div>
                <div className={statBoxCls("emerald")}>
                  <p className={dashLabelCls}>Sub-modules</p>
                  <p className="mt-1 text-xl font-bold tabular-nums text-emerald-700">
                    {selectedSubCount}
                    <span className="text-[13px] font-medium text-slate-500">
                      {" "}
                      / {totalSubFeatureCount}
                    </span>
                  </p>
                </div>
                <div className={statBoxCls("default")}>
                  <p className={dashLabelCls}>Ready to save</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {hasAnySelection ? "Yes" : "No"}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="space-y-3">
              {filteredFeatures.length === 0 ? (
                <div className={`${dashCardCls} px-6 py-10 text-center`}>
                  <LayoutGrid className="mx-auto h-8 w-8 text-slate-300" aria-hidden />
                  <p className="mt-2 text-[14px] font-medium text-slate-900">No matching modules</p>
                  <p className={`mt-1 ${dashSectionMetaCls}`}>Try a different search term.</p>
                </div>
              ) : null}

              {filteredFeatures.map((feature, index) => {
                const parentId = String(feature.parent_feature_id);
                const title = feature.feature_name || feature.feature_val;
                const meta = moduleMeta(feature.feature_val, title);
                const isExpanded = expandedFeatureIds.has(parentId);
                const isFeatureSelected = selectedFeatureIds.has(parentId);
                const subs = feature.sub_features ?? [];
                const selectedSubsInFeature = selectedSubByFeature[parentId]?.size ?? 0;
                const inAssignment = isAssignmentActive && selectedEmployee;

                return (
                  <article
                    key={parentId}
                    className={listCardCls(
                      Boolean(inAssignment && isFeatureSelected),
                      Boolean(inAssignment && !isFeatureSelected && selectedSubsInFeature > 0),
                    )}
                    style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
                  >
                    <div className="flex items-stretch">
                      {inAssignment ? (
                        <button
                          type="button"
                          onClick={() => toggleFeatureSelect(parentId)}
                          aria-label={`Select module ${title}`}
                          className={`flex w-12 shrink-0 items-center justify-center border-r transition ${
                            isFeatureSelected
                              ? "border-[#008CD3]/20 bg-[#E8F4FB]"
                              : "border-slate-100 bg-slate-50 hover:bg-sky-50/50"
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-md border transition ${
                              isFeatureSelected
                                ? "border-[#008CD3] bg-[#008CD3] text-white"
                                : "border-[#CBD5E1] bg-white"
                            }`}
                          >
                            {isFeatureSelected ? (
                              <Check className="h-3.5 w-3.5" strokeWidth={3} />
                            ) : null}
                          </span>
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => toggleFeatureExpand(parentId)}
                        className="flex min-w-0 flex-1 items-center gap-3 px-4 py-4 text-left"
                      >
                        <span className={`${iconBadgeCls(meta.variant)} !h-11 !w-11 text-[11px] font-bold`}>
                          {meta.label}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[15px] font-semibold text-slate-900">{title}</p>
                            {inAssignment && selectedSubsInFeature > 0 ? (
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                                {selectedSubsInFeature} sub-module
                                {selectedSubsInFeature === 1 ? "" : "s"}
                              </span>
                            ) : null}
                          </div>
                          <p className={dashSectionMetaCls}>{feature.feature_val}</p>
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            {subs.length} sub-module{subs.length === 1 ? "" : "s"}
                          </p>
                        </div>
                        {subs.length > 0 ? (
                          <ChevronDown
                            className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                          />
                        ) : null}
                      </button>
                    </div>

                    {isExpanded && subs.length > 0 ? (
                      <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50/80 to-white px-4 py-4">
                        <p className={`mb-3 flex items-center gap-1.5 ${dashLabelCls} font-semibold uppercase tracking-wider`}>
                          {inAssignment ? (
                            <>
                              <KeyRound className="h-3.5 w-3.5" />
                              Select sub-modules &amp; permissions
                            </>
                          ) : (
                            "Sub-modules"
                          )}
                        </p>
                        <div className="grid gap-2.5 sm:grid-cols-2">
                          {subs.map((sub) =>
                            inAssignment
                              ? renderSelectableSubFeature(parentId, sub)
                              : renderViewSubFeature(sub),
                          )}
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </>
        ) : null}

        {isAssignmentActive && selectedEmployee && hasAnySelection ? (
          <div className={`${dashCardCls} sticky bottom-4 z-20 overflow-hidden shadow-[0_12px_40px_rgba(15,23,42,0.12)]`}>
            <div className="border-t-[3px] border-t-[#008CD3] bg-gradient-to-r from-[#E8F4FB]/80 via-white to-emerald-50/40 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#008CD3]">
                    Review &amp; assign
                  </p>
                  <p className="mt-0.5 text-[14px] text-slate-600">
                    <span className="font-bold text-slate-900">{selectedFeatureCount}</span>{" "}
                    module{selectedFeatureCount === 1 ? "" : "s"},{" "}
                    <span className="font-bold text-emerald-700">{selectedSubCount}</span>{" "}
                    sub-module{selectedSubCount === 1 ? "" : "s"}
                  </p>
                  <p className={dashSectionMetaCls}>for {selectedEmployee.employee_name}</p>
                </div>
                <button
                  type="button"
                  disabled={assigning}
                  onClick={() => void assignAccess()}
                  className={`${btnBrandCls()} min-h-[44px] min-w-[180px] !rounded-xl !text-[14px] shadow-lg shadow-[#008CD3]/20`}
                >
                  {assigning ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <ShieldCheck className="h-4 w-4" aria-hidden />
                  )}
                  Assign access
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {showEmployeeModal ? (
        <div className="fixed inset-0 z-[10060] flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            onClick={() => setShowEmployeeModal(false)}
          />
          <div className={modalShellCls()}>
            <div className="border-b border-slate-100 border-t-[3px] border-t-[#008CD3] bg-gradient-to-r from-[#F8FAFC] via-white to-[#F0F9FF]/40 px-5 py-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className={iconBadgeCls("blue")}>
                    <Users className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#008CD3]">
                      Step 1 · Select employee
                    </p>
                    <h3 className={`mt-0.5 ${dashSectionTitleCls} text-lg`}>
                      Who receives this access?
                    </h3>
                    <p className={`mt-1 ${dashSectionMetaCls}`}>
                      Choose one employee, then select modules and permissions.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEmployeeModal(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[55vh] overflow-y-auto p-5">
              {employeeLoading ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-500">
                  <Loader2 className="h-6 w-6 animate-spin text-[#008CD3]" aria-hidden />
                  <p className="text-[13px]">Loading employees…</p>
                </div>
              ) : null}

              {employeeError ? (
                <p className={`mb-3 ${errorBannerCls()}`}>{employeeError}</p>
              ) : null}

              {!employeeLoading && employees.length === 0 ? (
                <div className="py-12 text-center">
                  <Users className="mx-auto h-9 w-9 text-slate-300" aria-hidden />
                  <p className="mt-2 text-[14px] font-medium text-slate-900">
                    No employees found
                  </p>
                </div>
              ) : null}

              {!employeeLoading && employees.length > 0 ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                    <input
                      type="search"
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                      placeholder="Search by name or ID…"
                      className={inputCls()}
                    />
                  </div>

                  <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
                    {filteredEmployees.length === 0 ? (
                      <p className={`py-6 text-center ${dashSectionMetaCls}`}>
                        No employees match your search.
                      </p>
                    ) : null}
                    {filteredEmployees.map((emp) => {
                      const id = String(emp.employee_id);
                      const selected = modalEmployeeId === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setModalEmployeeId(id)}
                          className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                            selected
                              ? "border-[#008CD3] bg-[#E8F4FB] ring-2 ring-[#008CD3]/15"
                              : "border-slate-200/90 bg-white hover:border-[#008CD3]/30 hover:bg-slate-50"
                          }`}
                        >
                          {emp.employee_profile_image ? (
                            <img
                              src={emp.employee_profile_image}
                              alt=""
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-[12px] font-bold text-slate-700">
                              {userInitials(emp.employee_name)}
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[14px] font-semibold text-slate-900">
                              {emp.employee_name}
                            </p>
                            <p className={dashSectionMetaCls}>ID · {emp.employee_id}</p>
                          </div>
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                              selected
                                ? "border-[#008CD3] bg-[#008CD3] text-white"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {selected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="border-t border-slate-100 bg-slate-50/80 p-5">
              <button
                type="button"
                onClick={confirmEmployeeSelection}
                disabled={!modalEmployeeId || employeeLoading}
                className={`${btnBrandCls(true)} !min-h-[44px] !rounded-xl !text-[14px]`}
              >
                Continue to module selection
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {assigning ? (
        <div className="fixed inset-0 z-[10070] flex items-center justify-center bg-slate-900/30 backdrop-blur-[2px]">
          <div className={`${dashCardCls} flex items-center gap-3 px-6 py-4`}>
            <Loader2 className="h-5 w-5 animate-spin text-[#008CD3]" aria-hidden />
            <p className="text-[14px] font-medium text-slate-800">Assigning feature access…</p>
          </div>
        </div>
      ) : null}

      <PortalResponseModal
        open={responseModal.open}
        variant={responseModal.variant}
        title={responseModal.title}
        message={responseModal.message}
        detail={responseModal.detail}
        confirmLabel="Got it"
        onClose={closeResponseModal}
      />
    </section>
  );
}
