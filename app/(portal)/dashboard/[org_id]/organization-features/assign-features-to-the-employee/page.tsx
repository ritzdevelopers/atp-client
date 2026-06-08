"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  Check,
  ChevronDown,
  KeyRound,
  Loader2,
  Puzzle,
  RefreshCw,
  UserPlus,
  Users,
  X,
} from "lucide-react";
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
type AssignmentMode = "view" | "feature" | "sub-feature";

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

export default function AssignFeaturesToEmployeePage() {
  const params = useParams();
  const orgId = String(params?.org_id ?? "");

  const [loadingFeatures, setLoadingFeatures] = useState(true);
  const [featureError, setFeatureError] = useState<string | null>(null);
  const [orgFeatures, setOrgFeatures] = useState<OrgFeatureGroup[]>([]);

  const [assignmentMode, setAssignmentMode] = useState<AssignmentMode>("view");
  const [pendingMode, setPendingMode] = useState<AssignmentMode>("view");
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [employeeError, setEmployeeError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [modalEmployeeId, setModalEmployeeId] = useState<string>("");

  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeOption | null>(null);
  const [expandedFeatureIds, setExpandedFeatureIds] = useState<Set<string>>(new Set());
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<Set<string>>(new Set());
  const [selectedSubByFeature, setSelectedSubByFeature] = useState<
    Record<string, Set<string>>
  >({});
  const [subPermissions, setSubPermissions] = useState<Record<string, Permission[]>>({});

  const [assigning, setAssigning] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

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
    setAssignmentMode("view");
    setPendingMode("view");
    setSelectedEmployee(null);
    resetSelections();
    setActionMessage(null);
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

  async function startAssignmentMode(mode: "feature" | "sub-feature") {
    setPendingMode(mode);
    setModalEmployeeId(selectedEmployee ? String(selectedEmployee.employee_id) : "");
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
    setAssignmentMode(pendingMode);
    resetSelections();
    setExpandedFeatureIds(new Set(orgFeatures.map((f) => String(f.parent_feature_id))));
    setShowEmployeeModal(false);
    setEmployeeError(null);
    setActionMessage(null);
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
    if (assignmentMode !== "feature" || !selectedEmployee) return;
    setSelectedFeatureIds((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  }

  function toggleSubFeature(parentId: string, subId: string) {
    if (assignmentMode !== "sub-feature" || !selectedEmployee) return;
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
      }
      return { ...prev, [parentId]: current };
    });
  }

  function toggleSubPermission(subId: string, perm: Permission) {
    if (assignmentMode !== "sub-feature") return;
    setSubPermissions((prev) => {
      const current = prev[subId] ?? [];
      const has = current.includes(perm);
      const next = has ? current.filter((p) => p !== perm) : [...current, perm];
      return { ...prev, [subId]: next };
    });
  }

  const totalSubFeatureCount = useMemo(
    () =>
      orgFeatures.reduce((sum, f) => sum + (f.sub_features?.length ?? 0), 0),
    [orgFeatures],
  );

  const selectedSubCount = useMemo(() => {
    let count = 0;
    for (const set of Object.values(selectedSubByFeature)) {
      count += set.size;
    }
    return count;
  }, [selectedSubByFeature]);

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

  async function assignParentFeatures() {
    if (!selectedEmployee || selectedFeatureIds.size === 0) {
      setActionMessage("Select at least one feature.");
      return;
    }

    const features_info = orgFeatures
      .filter((f) => selectedFeatureIds.has(String(f.parent_feature_id)))
      .map((f) => ({
        feature_id: Number(f.parent_feature_id),
        access_permission: true,
      }));

    setAssigning(true);
    setActionMessage(null);
    try {
      const res = await fetch(
        `${API_URL}/api/organization-features/assign-feature-access-to-the-employee`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            org_id: Number(orgId),
            employee_id: Number(selectedEmployee.employee_id),
            features_info,
          }),
        },
      );
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message || "Could not assign features");
      setActionMessage("Parent features assigned successfully.");
      resetSelections();
    } catch (e) {
      setActionMessage(e instanceof Error ? e.message : "Assignment failed");
    } finally {
      setAssigning(false);
    }
  }

  async function assignSubFeatures() {
    if (!selectedEmployee || selectedSubCount === 0) {
      setActionMessage("Select at least one sub-feature.");
      return;
    }

    const feature_info = orgFeatures
      .map((f) => {
        const parentId = String(f.parent_feature_id);
        const selectedSubs = selectedSubByFeature[parentId] ?? new Set<string>();
        const sub_features_info = (f.sub_features ?? [])
          .filter((sf) => selectedSubs.has(String(sf.id)))
          .map((sf) => {
            const perms = subPermissions[String(sf.id)] ?? [];
            if (perms.length === 0) {
              throw new Error(`Select permissions for "${sf.sub_feature_name}".`);
            }
            return {
              sub_feature_id: Number(sf.id),
              access_sub_permission: true,
              feature_access: perms.join("-"),
            };
          });
        if (sub_features_info.length === 0) return null;
        return {
          parent_feature_id: Number(f.parent_feature_id),
          access_permission: true,
          sub_features_info,
        };
      })
      .filter(Boolean);

    setAssigning(true);
    setActionMessage(null);
    try {
      const res = await fetch(
        `${API_URL}/api/organization-features/assign-features-to-employee`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            org_id: Number(orgId),
            employee_id: Number(selectedEmployee.employee_id),
            feature_info,
          }),
        },
      );
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message || "Could not assign sub-features");
      setActionMessage("Sub-features assigned successfully.");
      resetSelections();
    } catch (e) {
      setActionMessage(e instanceof Error ? e.message : "Assignment failed");
    } finally {
      setAssigning(false);
    }
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

  function renderSelectableSubFeature(parentId: string, sub: OrgSubFeature) {
    const subId = String(sub.id);
    const checked = selectedSubByFeature[parentId]?.has(subId) ?? false;
    const perms = subPermissions[subId] ?? [];

    return (
      <div
        key={subId}
        className={`rounded-lg border p-3 transition ${
          checked ? "border-[#008CD3] bg-[#E8F4FB]/40" : "border-[#E4E7EC] bg-white"
        }`}
      >
        <button
          type="button"
          onClick={() => toggleSubFeature(parentId, subId)}
          className="flex w-full items-start gap-2 text-left"
        >
          <span
            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
              checked ? "border-[#008CD3] bg-[#008CD3] text-white" : "border-[#CBD5E1] bg-white"
            }`}
          >
            {checked ? <Check className="h-3 w-3" /> : null}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-[#1F2937]">{sub.sub_feature_name}</p>
            <p className="text-[11px] text-[#6B7280]">{sub.sub_feature_path}</p>
          </div>
        </button>
        {checked ? (
          <div className="mt-2 border-t border-[#E4E7EC] pt-2 pl-6">
            <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
              <KeyRound className="h-3 w-3" />
              Permissions
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PERMISSIONS.map((perm) => {
                const on = perms.includes(perm);
                return (
                  <button
                    key={perm}
                    type="button"
                    onClick={() => toggleSubPermission(subId, perm)}
                    className={`rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase transition ${
                      on
                        ? "bg-[#008CD3] text-white"
                        : "bg-[#F5F7FA] text-[#6B7280] ring-1 ring-[#E4E7EC]"
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

  const modeLabel =
    assignmentMode === "feature"
      ? "Assigning parent features"
      : assignmentMode === "sub-feature"
        ? "Assigning sub-features"
        : null;

  return (
    <section className="min-h-full bg-[#F5F7FA] p-4 lg:p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm lg:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-[18px] font-semibold text-[#1F2937]">
                Assign features to employee
              </h1>
              <p className="mt-1 text-[13px] text-[#6B7280]">
                Browse modules and sub-modules, then assign parent features or sub-features
                separately.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void loadOrgFeatures()}
                disabled={loadingFeatures}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E7EC] bg-white px-3 py-2 text-[13px] font-medium text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loadingFeatures ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => void startAssignmentMode("feature")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-semibold transition ${
                  assignmentMode === "feature"
                    ? "bg-[#0070AA] text-white ring-2 ring-[#008CD3]/30"
                    : "bg-[#008CD3] text-white hover:bg-[#0070AA]"
                }`}
              >
                <UserPlus className="h-4 w-4" />
                Assign feature to employee
              </button>
              <button
                type="button"
                onClick={() => void startAssignmentMode("sub-feature")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-semibold transition ${
                  assignmentMode === "sub-feature"
                    ? "bg-[#0B8043] text-white ring-2 ring-[#0F9D58]/30"
                    : "bg-[#0F9D58] text-white hover:bg-[#0B8043]"
                }`}
              >
                <KeyRound className="h-4 w-4" />
                Sub feature assignment
              </button>
            </div>
          </div>

          {assignmentMode !== "view" && selectedEmployee ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#008CD3]/25 bg-[#E8F4FB] px-4 py-3">
              <div className="flex items-center gap-3">
                {selectedEmployee.employee_profile_image ? (
                  <img
                    src={selectedEmployee.employee_profile_image}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[12px] font-semibold text-[#008CD3]">
                    {userInitials(selectedEmployee.employee_name)}
                  </span>
                )}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#008CD3]">
                    {modeLabel}
                  </p>
                  <p className="text-[14px] font-semibold text-[#1F2937]">
                    {selectedEmployee.employee_name}
                  </p>
                  <p className="text-[12px] text-[#6B7280]">
                    ID: {String(selectedEmployee.employee_id)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void startAssignmentMode(assignmentMode)}
                  className="text-[12px] font-medium text-[#008CD3] underline"
                >
                  Change employee
                </button>
                <button
                  type="button"
                  onClick={exitAssignmentMode}
                  className="rounded-lg border border-[#E4E7EC] bg-white px-3 py-1.5 text-[12px] font-medium text-[#374151]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-4 rounded-lg border border-dashed border-[#E4E7EC] bg-[#F9FAFB] px-4 py-3 text-[13px] text-[#6B7280]">
              Click a feature card to view its sub-features. Use the buttons above to start
              assigning parent features or sub-features to an employee.
            </p>
          )}
        </div>

        {featureError ? (
          <div className="rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-4 py-3 text-[13px] text-[#D93025]">
            {featureError}
          </div>
        ) : null}

        {actionMessage ? (
          <div className="rounded-lg border border-[#E4E7EC] bg-white px-4 py-3 text-[13px] text-[#374151]">
            {actionMessage}
          </div>
        ) : null}

        {loadingFeatures ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[#6B7280]">
            <Loader2 className="h-7 w-7 animate-spin text-[#008CD3]" />
            <span>Loading organization features…</span>
          </div>
        ) : null}

        {!loadingFeatures && orgFeatures.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E4E7EC] bg-white px-6 py-14 text-center">
            <Puzzle className="mx-auto h-9 w-9 text-[#9CA3AF]" />
            <p className="mt-2 text-[15px] font-semibold text-[#1F2937]">No features found</p>
          </div>
        ) : null}

        {!loadingFeatures &&
        orgFeatures.length > 0 &&
        assignmentMode === "feature" &&
        selectedEmployee ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#E4E7EC] bg-white px-4 py-3 shadow-sm">
            <button
              type="button"
              onClick={selectAllFeatures}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#008CD3]/30 bg-[#E8F4FB] px-3 py-1.5 text-[12px] font-semibold text-[#008CD3] transition hover:bg-[#D6EDF9]"
            >
              <Check className="h-3.5 w-3.5" />
              {allFeaturesSelected ? "Deselect all features" : "Select all features"}
            </button>
            <span className="text-[12px] text-[#6B7280]">
              {selectedFeatureIds.size} of {orgFeatures.length} selected
            </span>
          </div>
        ) : null}

        {!loadingFeatures &&
        orgFeatures.length > 0 &&
        assignmentMode === "sub-feature" &&
        selectedEmployee ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#E4E7EC] bg-white px-4 py-3 shadow-sm">
            <button
              type="button"
              onClick={selectAllSubFeatures}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#0F9D58]/30 bg-[#E6F4EA] px-3 py-1.5 text-[12px] font-semibold text-[#0F9D58] transition hover:bg-[#D4EDDA]"
            >
              <Check className="h-3.5 w-3.5" />
              {allSubFeaturesSelected ? "Deselect all sub-features" : "Select all sub-features"}
            </button>
            <button
              type="button"
              onClick={markAllPermissionsForSelected}
              disabled={selectedSubCount === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-1.5 text-[12px] font-semibold text-[#374151] transition hover:bg-[#F3F4F6] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <KeyRound className="h-3.5 w-3.5" />
              {allSelectedSubsHaveFullPermissions
                ? "All CRUD permissions set"
                : "Mark all permissions (CRUD)"}
            </button>
            <span className="text-[12px] text-[#6B7280]">
              {selectedSubCount} of {totalSubFeatureCount} sub-features selected
            </span>
          </div>
        ) : null}

        {!loadingFeatures && orgFeatures.length > 0 ? (
          <div className="space-y-3">
            {orgFeatures.map((feature) => {
              const parentId = String(feature.parent_feature_id);
              const title = feature.feature_name || feature.feature_val;
              const isExpanded = expandedFeatureIds.has(parentId);
              const isFeatureSelected = selectedFeatureIds.has(parentId);
              const subs = feature.sub_features ?? [];
              const isFeatureMode = assignmentMode === "feature";
              const isSubMode = assignmentMode === "sub-feature";

              return (
                <article
                  key={parentId}
                  className={`overflow-hidden rounded-xl border bg-white shadow-sm transition ${
                    isFeatureMode && isFeatureSelected
                      ? "border-[#008CD3] ring-1 ring-[#008CD3]/20"
                      : "border-[#E4E7EC]"
                  }`}
                >
                  {isFeatureMode ? (
                    <button
                      type="button"
                      onClick={() => toggleFeatureSelect(parentId)}
                      className="flex w-full items-center gap-3 px-4 py-4 text-left"
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                          isFeatureSelected
                            ? "border-[#008CD3] bg-[#008CD3] text-white"
                            : "border-[#CBD5E1] bg-white"
                        }`}
                      >
                        {isFeatureSelected ? <Check className="h-3.5 w-3.5" /> : null}
                      </span>
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[12px] font-semibold ${moduleColorClass(title)}`}
                      >
                        {title.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold text-[#1F2937]">{title}</p>
                        <p className="text-[12px] text-[#6B7280]">{feature.feature_val}</p>
                        <p className="mt-0.5 text-[11px] text-[#9CA3AF]">
                          {subs.length} sub-feature{subs.length === 1 ? "" : "s"}
                        </p>
                      </div>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleFeatureExpand(parentId)}
                      className="flex w-full items-center gap-3 px-4 py-4 text-left"
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[12px] font-semibold ${moduleColorClass(title)}`}
                      >
                        {title.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold text-[#1F2937]">{title}</p>
                        <p className="text-[12px] text-[#6B7280]">{feature.feature_val}</p>
                        <p className="mt-0.5 text-[11px] text-[#9CA3AF]">
                          {subs.length} sub-feature{subs.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      {subs.length > 0 ? (
                        <ChevronDown
                          className={`h-5 w-5 shrink-0 text-[#9CA3AF] transition ${isExpanded ? "rotate-180" : ""}`}
                        />
                      ) : null}
                    </button>
                  )}

                  {isExpanded && subs.length > 0 ? (
                    <div className="border-t border-[#E4E7EC] bg-[#F9FAFB] px-4 py-3">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                        {isSubMode ? "Select sub-features & permissions" : "Sub-features"}
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {subs.map((sub) =>
                          isSubMode
                            ? renderSelectableSubFeature(parentId, sub)
                            : renderViewSubFeature(sub),
                        )}
                      </div>
                    </div>
                  ) : null}

                  {isFeatureMode && isFeatureSelected && subs.length > 0 ? (
                    <div className="border-t border-[#E4E7EC] bg-[#F9FAFB] px-4 py-3">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                        Sub-features (view only)
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {subs.map((sub) => renderViewSubFeature(sub))}
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : null}

        {assignmentMode === "feature" &&
        selectedEmployee &&
        selectedFeatureIds.size > 0 ? (
          <div className="sticky bottom-4 rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[13px] text-[#6B7280]">
                <span className="font-semibold text-[#1F2937]">
                  {selectedFeatureIds.size}
                </span>{" "}
                parent feature{selectedFeatureIds.size === 1 ? "" : "s"} selected
              </p>
              <button
                type="button"
                disabled={assigning}
                onClick={() => void assignParentFeatures()}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[#008CD3] px-5 py-2 text-[14px] font-semibold text-white hover:bg-[#0070AA] disabled:opacity-60"
              >
                {assigning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Assigning…
                  </>
                ) : (
                  "Assign parent features"
                )}
              </button>
            </div>
          </div>
        ) : null}

        {assignmentMode === "sub-feature" && selectedEmployee && selectedSubCount > 0 ? (
          <div className="sticky bottom-4 rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[13px] text-[#6B7280]">
                <span className="font-semibold text-[#1F2937]">{selectedSubCount}</span>{" "}
                sub-feature{selectedSubCount === 1 ? "" : "s"} selected
              </p>
              <button
                type="button"
                disabled={assigning}
                onClick={() => void assignSubFeatures()}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[#0F9D58] px-5 py-2 text-[14px] font-semibold text-white hover:bg-[#0B8043] disabled:opacity-60"
              >
                {assigning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Assigning…
                  </>
                ) : (
                  "Assign sub-features"
                )}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {showEmployeeModal ? (
        <div className="fixed inset-0 z-[10060] flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowEmployeeModal(false)}
          />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-t-xl border border-[#E4E7EC] bg-white shadow-xl sm:rounded-xl">
            <div className="border-b border-[#E4E7EC] border-t-[3px] border-t-[#008CD3] px-4 py-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#008CD3]">
                    Select employee
                  </p>
                  <h3 className="text-[16px] font-semibold text-[#1F2937]">
                    {pendingMode === "sub-feature"
                      ? "Sub-feature assignment"
                      : "Parent feature assignment"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEmployeeModal(false)}
                  className="rounded-md border border-[#E4E7EC] p-1.5 text-[#6B7280]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[50vh] overflow-y-auto p-4">
              {employeeLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-7 w-7 animate-spin text-[#008CD3]" />
                </div>
              ) : null}

              {employeeError ? (
                <p className="mb-3 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2 text-[12px] text-[#D93025]">
                  {employeeError}
                </p>
              ) : null}

              {!employeeLoading && employees.length === 0 ? (
                <div className="py-10 text-center">
                  <Users className="mx-auto h-8 w-8 text-[#9CA3AF]" />
                  <p className="mt-2 text-[13px] text-[#6B7280]">No employees found</p>
                </div>
              ) : null}

              {!employeeLoading && employees.length > 0 ? (
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-medium text-[#374151]">
                    Employee
                  </span>
                  <select
                    value={modalEmployeeId}
                    onChange={(e) => setModalEmployeeId(e.target.value)}
                    className="w-full rounded-lg border border-[#E4E7EC] bg-white px-3 py-2.5 text-[14px] text-[#1F2937] outline-none focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15"
                  >
                    <option value="">Select an employee…</option>
                    {employees.map((emp) => (
                      <option key={String(emp.employee_id)} value={String(emp.employee_id)}>
                        {emp.employee_name} (ID: {emp.employee_id})
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>

            <div className="border-t border-[#E4E7EC] p-4">
              <button
                type="button"
                onClick={confirmEmployeeSelection}
                disabled={!modalEmployeeId || employeeLoading}
                className="inline-flex w-full min-h-[40px] items-center justify-center rounded-lg bg-[#008CD3] text-[14px] font-semibold text-white hover:bg-[#0070AA] disabled:opacity-50"
              >
                Confirm selected
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
