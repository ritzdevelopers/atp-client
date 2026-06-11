"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  Check,
  ChevronDown,
  KeyRound,
  Puzzle,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import PortalPageLoader from "@/components/portal-dashboard/ui/PortalPageLoader";
import PortalResponseModal, {
  type PortalResponseVariant,
} from "@/components/portal-dashboard/ui/PortalResponseModal";
import {
  fetchOrganizationFeatureGroups,
  persistOrganizationFeatureAccess,
  readOrganizationFeatureSnapshot,
  type OrgFeatureGroup,
  type OrgSubFeature,
} from "@/lib/orgFeatureAccess";

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

function moduleColorClass(name: string) {
  const colors = [
    "bg-[#E8F4FB] text-[#008CD3]",
    "bg-[#E6F4EA] text-[#0F9D58]",
    "bg-[#FEF3E6] text-[#E8710A]",
    "bg-[#F3E8FD] text-[#7B1FA2]",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function zohoInputCls() {
  return "w-full rounded-lg border border-[#E4E7EC] bg-white py-2.5 pl-9 pr-3 text-[13px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15";
}

export default function AssignFeaturesToEmployeePage() {
  const params = useParams();
  const orgId = String(params?.org_id ?? "");

  const [loadingFeatures, setLoadingFeatures] = useState(true);
  const [featureError, setFeatureError] = useState<string | null>(null);
  const [orgFeatures, setOrgFeatures] = useState<OrgFeatureGroup[]>([]);
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

  const loadOrgFeatures = useCallback(async () => {
    if (!orgId) return;
    setLoadingFeatures(true);
    setFeatureError(null);

    const cached = readOrganizationFeatureSnapshot(orgId);
    const hadCache = Boolean(cached?.groups?.length);
    if (hadCache) {
      setOrgFeatures(cached!.groups);
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not signed in.");
      const groups = await fetchOrganizationFeatureGroups(orgId, token);
      setOrgFeatures(groups);
      persistOrganizationFeatureAccess(orgId, groups, []);
    } catch (e) {
      if (!hadCache) {
        setFeatureError(e instanceof Error ? e.message : "Could not load features");
        setOrgFeatures([]);
      }
    } finally {
      setLoadingFeatures(false);
    }
  }, [orgId]);

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

  async function loadEmployees() {
    setEmployeeLoading(true);
    setEmployeeError(null);
    try {
      const res = await fetch(
        `${API_URL}/api/organization-features/get-all-employees-with-accessible-features-and-sub-features-info?org_id=${encodeURIComponent(orgId)}`,
        { method: "GET", headers: authHeaders() },
      );
      const data = (await res.json()) as {
        data?: Array<{
          employee_id: number | string;
          employee_name: string;
          employee_profile_image?: string | null;
        }>;
        message?: string;
      };
      if (!res.ok) throw new Error(data.message || "Could not load employees");
      const rows = Array.isArray(data.data) ? data.data : [];
      setEmployees(
        rows.map((r) => ({
          employee_id: r.employee_id,
          employee_name: r.employee_name,
          employee_profile_image: r.employee_profile_image,
        })),
      );
    } catch (e) {
      setEmployeeError(e instanceof Error ? e.message : "Could not load employees");
      setEmployees([]);
    } finally {
      setEmployeeLoading(false);
    }
  }

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
            : "border-[#E4E7EC] bg-white hover:border-[#008CD3]/40 hover:shadow-sm"
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
            <p className="text-[13px] font-semibold text-[#1F2937]">
              {sub.sub_feature_name}
            </p>
            <p className="mt-0.5 text-[11px] text-[#6B7280]">{sub.sub_feature_path}</p>
          </div>
        </button>
        {checked ? (
          <div className="mt-3 border-t border-[#E4E7EC]/80 pt-3 pl-[30px]">
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
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
                        : "bg-[#F9FAFB] text-[#9CA3AF] ring-[#E4E7EC] hover:text-[#6B7280]"
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
        className="rounded-lg border border-[#E4E7EC] bg-white px-3 py-2.5"
      >
        <p className="text-[13px] font-medium text-[#1F2937]">{sub.sub_feature_name}</p>
        <p className="text-[11px] text-[#6B7280]">{sub.sub_feature_path}</p>
      </div>
    );
  }

  return (
    <section className="min-h-full bg-[#F5F7FA] p-4 lg:p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        {/* Hero header */}
        <div className="overflow-hidden rounded-2xl border border-[#E4E7EC] bg-white shadow-sm">
          <div className="border-b border-[#E4E7EC] bg-gradient-to-r from-[#E8F4FB] via-white to-[#E6F4EA] px-5 py-5 lg:px-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#008CD3] text-white shadow-md shadow-[#008CD3]/25">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <h1 className="text-[20px] font-semibold tracking-tight text-[#1F2937]">
                    Assign access to employee
                  </h1>
                  <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-[#6B7280]">
                    Select an employee, choose modules and sub-modules in one flow, and
                    assign parent features with CRUD permissions in a single save.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void loadOrgFeatures()}
                  disabled={loadingFeatures}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E7EC] bg-white px-3 py-2 text-[13px] font-medium text-[#374151] shadow-sm transition hover:bg-[#F9FAFB] disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loadingFeatures ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>
                {!isAssignmentActive ? (
                  <button
                    type="button"
                    onClick={() => void openAssignmentFlow()}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#008CD3] px-4 py-2 text-[13px] font-semibold text-white shadow-md shadow-[#008CD3]/25 transition hover:bg-[#0070AA]"
                  >
                    <UserPlus className="h-4 w-4" />
                    Start assignment
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={exitAssignmentMode}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#E4E7EC] bg-white px-4 py-2 text-[13px] font-semibold text-[#374151] shadow-sm transition hover:bg-[#F9FAFB]"
                  >
                    <X className="h-4 w-4" />
                    Cancel assignment
                  </button>
                )}
              </div>
            </div>
          </div>

          {isAssignmentActive && selectedEmployee ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E4E7EC] bg-white px-5 py-4 lg:px-6">
              <div className="flex items-center gap-3">
                {selectedEmployee.employee_profile_image ? (
                  <img
                    src={selectedEmployee.employee_profile_image}
                    alt=""
                    className="h-11 w-11 rounded-full object-cover ring-2 ring-[#008CD3]/20"
                  />
                ) : (
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E8F4FB] text-[13px] font-bold text-[#008CD3] ring-2 ring-[#008CD3]/20">
                    {userInitials(selectedEmployee.employee_name)}
                  </span>
                )}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#008CD3]">
                    Assigning to
                  </p>
                  <p className="text-[15px] font-semibold text-[#1F2937]">
                    {selectedEmployee.employee_name}
                  </p>
                  <p className="text-[12px] text-[#6B7280]">
                    Employee ID · {String(selectedEmployee.employee_id)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void openAssignmentFlow()}
                className="rounded-lg border border-[#008CD3]/25 bg-[#E8F4FB] px-3 py-1.5 text-[12px] font-semibold text-[#008CD3] transition hover:bg-[#D6EDF9]"
              >
                Change employee
              </button>
            </div>
          ) : (
            <div className="px-5 py-4 lg:px-6">
              <div className="flex items-start gap-3 rounded-xl border border-dashed border-[#E4E7EC] bg-[#F9FAFB] px-4 py-3.5">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#008CD3]" />
                <p className="text-[13px] leading-relaxed text-[#6B7280]">
                  Browse modules below. Click{" "}
                  <span className="font-semibold text-[#374151]">Start assignment</span> to
                  pick an employee and turn feature cards into selectable modules with
                  sub-feature permissions.
                </p>
              </div>
            </div>
          )}
        </div>

        {featureError ? (
          <div className="rounded-xl border border-[#F5C6C2] bg-[#FCE8E6] px-4 py-3 text-[13px] text-[#D93025]">
            {featureError}
          </div>
        ) : null}

        {!loadingFeatures && orgFeatures.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E4E7EC] bg-white px-6 py-16 text-center shadow-sm">
            <Puzzle className="mx-auto h-10 w-10 text-[#9CA3AF]" />
            <p className="mt-3 text-[16px] font-semibold text-[#1F2937]">No features found</p>
            <p className="mt-1 text-[13px] text-[#6B7280]">
              This organization has no assignable modules yet.
            </p>
          </div>
        ) : null}

        {!loadingFeatures && orgFeatures.length > 0 ? (
          <>
            <div className="flex flex-col gap-3 rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="relative min-w-0 flex-1 sm:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="search"
                  value={featureSearch}
                  onChange={(e) => setFeatureSearch(e.target.value)}
                  placeholder="Search modules or sub-modules…"
                  className={zohoInputCls()}
                />
              </div>

              {isAssignmentActive && selectedEmployee ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllFeatures}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#008CD3]/25 bg-[#E8F4FB] px-3 py-1.5 text-[12px] font-semibold text-[#008CD3] transition hover:bg-[#D6EDF9]"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {allFeaturesSelected ? "Deselect modules" : "Select all modules"}
                  </button>
                  <button
                    type="button"
                    onClick={selectAllSubFeatures}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#0F9D58]/25 bg-[#E6F4EA] px-3 py-1.5 text-[12px] font-semibold text-[#0F9D58] transition hover:bg-[#D4EDDA]"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {allSubFeaturesSelected
                      ? "Deselect sub-modules"
                      : "Select all sub-modules"}
                  </button>
                  <button
                    type="button"
                    onClick={markAllPermissionsForSelected}
                    disabled={selectedSubCount === 0}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-1.5 text-[12px] font-semibold text-[#374151] transition hover:bg-[#F3F4F6] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    {allSelectedSubsHaveFullPermissions ? "Full CRUD set" : "Grant full CRUD"}
                  </button>
                </div>
              ) : null}
            </div>

            {isAssignmentActive && selectedEmployee ? (
              <div className="grid gap-2 rounded-xl border border-[#008CD3]/15 bg-[#E8F4FB]/50 px-4 py-3 sm:grid-cols-3">
                <div className="text-center sm:text-left">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
                    Modules
                  </p>
                  <p className="text-[18px] font-bold text-[#008CD3]">
                    {selectedFeatureCount}
                    <span className="text-[13px] font-medium text-[#6B7280]">
                      {" "}
                      / {orgFeatures.length}
                    </span>
                  </p>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
                    Sub-modules
                  </p>
                  <p className="text-[18px] font-bold text-[#0F9D58]">
                    {selectedSubCount}
                    <span className="text-[13px] font-medium text-[#6B7280]">
                      {" "}
                      / {totalSubFeatureCount}
                    </span>
                  </p>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
                    Ready to save
                  </p>
                  <p className="text-[18px] font-bold text-[#1F2937]">
                    {hasAnySelection ? "Yes" : "No"}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="space-y-3">
              {filteredFeatures.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#E4E7EC] bg-white px-6 py-10 text-center">
                  <p className="text-[14px] font-medium text-[#1F2937]">No matching modules</p>
                  <p className="mt-1 text-[13px] text-[#6B7280]">
                    Try a different search term.
                  </p>
                </div>
              ) : null}

              {filteredFeatures.map((feature) => {
                const parentId = String(feature.parent_feature_id);
                const title = feature.feature_name || feature.feature_val;
                const isExpanded = expandedFeatureIds.has(parentId);
                const isFeatureSelected = selectedFeatureIds.has(parentId);
                const subs = feature.sub_features ?? [];
                const selectedSubsInFeature = selectedSubByFeature[parentId]?.size ?? 0;
                const inAssignment = isAssignmentActive && selectedEmployee;

                return (
                  <article
                    key={parentId}
                    className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-200 ${
                      inAssignment && isFeatureSelected
                        ? "border-[#008CD3] ring-2 ring-[#008CD3]/15"
                        : inAssignment && selectedSubsInFeature > 0
                          ? "border-[#0F9D58]/40 ring-1 ring-[#0F9D58]/10"
                          : "border-[#E4E7EC] hover:shadow-md"
                    }`}
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
                              : "border-[#E4E7EC] bg-[#F9FAFB] hover:bg-[#E8F4FB]/60"
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
                        <span
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[12px] font-bold shadow-sm ${moduleColorClass(title)}`}
                        >
                          {title.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[15px] font-semibold text-[#1F2937]">{title}</p>
                            {inAssignment && selectedSubsInFeature > 0 ? (
                              <span className="rounded-full bg-[#E6F4EA] px-2 py-0.5 text-[10px] font-semibold text-[#0F9D58]">
                                {selectedSubsInFeature} sub-module
                                {selectedSubsInFeature === 1 ? "" : "s"}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-[12px] text-[#6B7280]">{feature.feature_val}</p>
                          <p className="mt-0.5 text-[11px] text-[#9CA3AF]">
                            {subs.length} sub-module{subs.length === 1 ? "" : "s"}
                          </p>
                        </div>
                        {subs.length > 0 ? (
                          <ChevronDown
                            className={`h-5 w-5 shrink-0 text-[#9CA3AF] transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                          />
                        ) : null}
                      </button>
                    </div>

                    {isExpanded && subs.length > 0 ? (
                      <div className="border-t border-[#E4E7EC] bg-gradient-to-b from-[#F9FAFB] to-white px-4 py-4">
                        <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
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
          <div className="sticky bottom-4 z-20 overflow-hidden rounded-2xl border border-[#E4E7EC] bg-white shadow-xl shadow-black/10">
            <div className="border-t-[3px] border-t-[#008CD3] bg-gradient-to-r from-[#E8F4FB]/80 via-white to-[#E6F4EA]/50 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#008CD3]">
                    Review &amp; assign
                  </p>
                  <p className="mt-0.5 text-[14px] text-[#374151]">
                    <span className="font-bold text-[#1F2937]">{selectedFeatureCount}</span>{" "}
                    module{selectedFeatureCount === 1 ? "" : "s"},{" "}
                    <span className="font-bold text-[#0F9D58]">{selectedSubCount}</span>{" "}
                    sub-module{selectedSubCount === 1 ? "" : "s"}
                  </p>
                  <p className="text-[12px] text-[#6B7280]">
                    for {selectedEmployee.employee_name}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={assigning}
                  onClick={() => void assignAccess()}
                  className="inline-flex min-h-[44px] min-w-[180px] items-center justify-center gap-2 rounded-xl bg-[#008CD3] px-6 py-2.5 text-[14px] font-semibold text-white shadow-lg shadow-[#008CD3]/25 transition hover:bg-[#0070AA] disabled:opacity-60"
                >
                  <ShieldCheck className="h-4 w-4" />
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
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={() => setShowEmployeeModal(false)}
          />
          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-t-2xl border border-[#E4E7EC] bg-white shadow-2xl sm:rounded-2xl">
            <div className="border-b border-[#E4E7EC] border-t-[3px] border-t-[#008CD3] bg-gradient-to-r from-[#E8F4FB] to-white px-5 py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#008CD3]">
                    Step 1 · Select employee
                  </p>
                  <h3 className="mt-0.5 text-[18px] font-semibold text-[#1F2937]">
                    Who receives this access?
                  </h3>
                  <p className="mt-1 text-[13px] text-[#6B7280]">
                    Choose one employee, then select modules and sub-modules on the next
                    screen.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEmployeeModal(false)}
                  className="rounded-lg border border-[#E4E7EC] p-2 text-[#6B7280] transition hover:bg-[#F9FAFB]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[55vh] overflow-y-auto p-5">
              {employeeLoading ? (
                <div className="flex justify-center py-10">
                  <PortalPageLoader size="sm" message="Loading employees…" />
                </div>
              ) : null}

              {employeeError ? (
                <p className="mb-3 rounded-xl border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2.5 text-[12px] text-[#D93025]">
                  {employeeError}
                </p>
              ) : null}

              {!employeeLoading && employees.length === 0 ? (
                <div className="py-12 text-center">
                  <Users className="mx-auto h-9 w-9 text-[#9CA3AF]" />
                  <p className="mt-2 text-[14px] font-medium text-[#1F2937]">
                    No employees found
                  </p>
                </div>
              ) : null}

              {!employeeLoading && employees.length > 0 ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                    <input
                      type="search"
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                      placeholder="Search by name or ID…"
                      className={zohoInputCls()}
                    />
                  </div>

                  <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
                    {filteredEmployees.length === 0 ? (
                      <p className="py-6 text-center text-[13px] text-[#6B7280]">
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
                              : "border-[#E4E7EC] bg-white hover:border-[#008CD3]/40 hover:bg-[#F9FAFB]"
                          }`}
                        >
                          {emp.employee_profile_image ? (
                            <img
                              src={emp.employee_profile_image}
                              alt=""
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F3F4F6] text-[12px] font-bold text-[#374151]">
                              {userInitials(emp.employee_name)}
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[14px] font-semibold text-[#1F2937]">
                              {emp.employee_name}
                            </p>
                            <p className="text-[12px] text-[#6B7280]">ID · {emp.employee_id}</p>
                          </div>
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                              selected
                                ? "border-[#008CD3] bg-[#008CD3] text-white"
                                : "border-[#CBD5E1] bg-white"
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

            <div className="border-t border-[#E4E7EC] bg-[#F9FAFB] p-5">
              <button
                type="button"
                onClick={confirmEmployeeSelection}
                disabled={!modalEmployeeId || employeeLoading}
                className="inline-flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#008CD3] text-[14px] font-semibold text-white shadow-md shadow-[#008CD3]/20 transition hover:bg-[#0070AA] disabled:opacity-50"
              >
                Continue to module selection
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {loadingFeatures ? (
        <PortalPageLoader overlay message="Loading organization features…" />
      ) : null}

      {assigning ? (
        <PortalPageLoader overlay message="Assigning feature access…" />
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
