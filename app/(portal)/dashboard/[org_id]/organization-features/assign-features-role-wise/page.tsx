"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  Check,
  ChevronRight,
  Loader2,
  Puzzle,
  RefreshCw,
  Search,
  Shield,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type RoleRow = {
  id: number | string;
  role_name?: string;
  org_id?: number | string;
};

type FeatureRow = {
  id: number | string;
  feature_name?: string;
  feature_key?: string;
  feature_description?: string;
};

type MappingRow = {
  mapping_id?: number | string;
  feature_id: number | string;
  is_allowed?: number | boolean | null;
  feature_name?: string | null;
  feature_val?: string | null;
};

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

function isAdminRoleName(roleName: string | undefined | null): boolean {
  return String(roleName || "").trim().toLowerCase() === "admin";
}

function rolesVisibleInUi(rolesList: RoleRow[]): RoleRow[] {
  return rolesList.filter((r) => !isAdminRoleName(r.role_name));
}

const AVATAR_COLORS = [
  "bg-[#E8F4FB] text-[#008CD3]",
  "bg-[#E6F4EA] text-[#0F9D58]",
  "bg-[#FEF3E6] text-[#E8710A]",
  "bg-[#F3E8FD] text-[#7B1FA2]",
  "bg-[#FCE8E6] text-[#D93025]",
  "bg-[#E8EAF6] text-[#3F51B5]",
];

const MODULE_ICON_COLORS = [
  "bg-[#E8F4FB] text-[#008CD3]",
  "bg-[#E6F4EA] text-[#0F9D58]",
  "bg-[#FEF3E6] text-[#E8710A]",
  "bg-[#F3E8FD] text-[#7B1FA2]",
];

const mobileCaptionCls = "text-[11px] leading-snug text-[#6B7280]";
const mobileValueCls = "text-[13px] font-semibold text-[#1F2937]";

function avatarColorClass(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function moduleColorClass(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return MODULE_ICON_COLORS[Math.abs(hash) % MODULE_ICON_COLORS.length];
}

function roleInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function featureInitials(name: string) {
  const cleaned = name.trim();
  if (!cleaned) return "?";
  return cleaned.slice(0, 2).toUpperCase();
}

function zohoSearchCls() {
  return "w-full rounded-md border border-[#E4E7EC] bg-white py-2 pl-9 pr-3 text-[13px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15 lg:rounded-lg lg:text-[14px]";
}

function zohoPrimaryBtnCls(full = false, compact = false) {
  const size = compact
    ? "min-h-[36px] px-3 py-1.5 text-[12px]"
    : "min-h-[40px] px-4 py-2 text-[14px]";
  return `inline-flex ${size} shrink-0 items-center justify-center rounded-lg bg-[#008CD3] font-medium text-white transition active:scale-[0.98] hover:bg-[#0070AA] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full" : ""}`;
}

function zohoSecondaryBtnCls(full = false) {
  return `inline-flex min-h-[40px] items-center justify-center rounded-lg border border-[#E4E7EC] bg-white px-3 py-2 text-[13px] font-medium text-[#374151] transition hover:bg-[#F9FAFB] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full" : ""}`;
}

function zohoDangerBtnCls(compact = false) {
  const size = compact
    ? "min-h-[36px] px-3 py-1.5 text-[12px]"
    : "min-h-[40px] px-4 py-2 text-[14px]";
  return `inline-flex ${size} shrink-0 items-center justify-center rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] font-medium text-[#D93025] transition active:scale-[0.98] hover:bg-[#FCE8E6]/80 disabled:pointer-events-none disabled:opacity-50`;
}

function displayRoleName(role: RoleRow) {
  return role.role_name || `Role #${role.id}`;
}

function displayFeatureTitle(feature: FeatureRow) {
  return feature.feature_name || feature.feature_key || `Feature #${feature.id}`;
}

export default function AssignFeaturesRoleWisePage() {
  const params = useParams();
  const orgId = Number(params?.org_id);

  const [pageError, setPageError] = useState<string | null>(null);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [features, setFeatures] = useState<FeatureRow[]>([]);
  const [featuresLoading, setFeaturesLoading] = useState(true);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [mappings, setMappings] = useState<MappingRow[]>([]);
  const [mappingsLoading, setMappingsLoading] = useState(false);
  const [mappingsError, setMappingsError] = useState<string | null>(null);

  const [assigningFeatureId, setAssigningFeatureId] = useState<number | string | null>(null);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [mobileMainTab, setMobileMainTab] = useState<"roles" | "features">("roles");

  const mappingByFeatureId = useMemo(() => {
    const m = new Map<number, MappingRow>();
    for (const row of mappings) {
      const fid = Number(row.feature_id);
      if (!Number.isNaN(fid)) m.set(fid, row);
    }
    return m;
  }, [mappings]);

  const selectedRole = useMemo(
    () => roles.find((r) => Number(r.id) === selectedRoleId) ?? null,
    [roles, selectedRoleId],
  );

  const filteredFeatures = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return features;
    return features.filter((f) => {
      const name = String(f.feature_name ?? f.feature_key ?? "").toLowerCase();
      const desc = String(f.feature_description ?? "").toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [features, searchQuery]);

  const loadRoles = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Not signed in.");
    const q = encodeURIComponent(String(orgId));
    const res = await fetch(`${API_URL}/api/organization-features/get-all-roles-of-organization?org_id=${q}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await res.json()) as { roles?: RoleRow[]; message?: string };
    if (!res.ok) throw new Error(data.message || "Could not load roles.");
    return Array.isArray(data.roles) ? data.roles : [];
  }, [orgId]);

  const loadFeatures = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Not signed in.");
    const q = encodeURIComponent(String(orgId));
    const res = await fetch(`${API_URL}/api/organization-features/get-organization-features?org_id=${q}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await res.json()) as { features?: FeatureRow[]; message?: string };
    if (!res.ok) throw new Error(data.message || "Could not load organization features.");
    return Array.isArray(data.features) ? data.features : [];
  }, [orgId]);

  const loadMappings = useCallback(
    async (roleId: number) => {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not signed in.");
      const o = encodeURIComponent(String(orgId));
      const r = encodeURIComponent(String(roleId));
      const res = await fetch(
        `${API_URL}/api/organization-features/get-role-feature-mappings?org_id=${o}&role_id=${r}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = (await res.json()) as { mappings?: MappingRow[]; message?: string };
      if (!res.ok) throw new Error(data.message || "Could not load role features.");
      return Array.isArray(data.mappings) ? data.mappings : [];
    },
    [orgId],
  );

  useEffect(() => {
    if (!orgId || Number.isNaN(orgId)) {
      setPageError("Invalid organization.");
      setRolesLoading(false);
      setFeaturesLoading(false);
      return;
    }

    let cancelled = false;
    setPageError(null);
    setRolesLoading(true);
    setFeaturesLoading(true);

    (async () => {
      try {
        const [rolesData, featuresData] = await Promise.all([loadRoles(), loadFeatures()]);
        if (cancelled) return;
        const visibleRoles = rolesVisibleInUi(rolesData);
        setRoles(visibleRoles);
        setFeatures(featuresData);
        setSelectedRoleId((prev) => {
          if (visibleRoles.length === 0) return null;
          if (prev != null && visibleRoles.some((r) => Number(r.id) === prev)) return prev;
          return Number(visibleRoles[0].id);
        });
      } catch (e) {
        if (!cancelled) {
          setPageError(e instanceof Error ? e.message : "Could not load page data.");
          setRoles([]);
          setFeatures([]);
        }
      } finally {
        if (!cancelled) {
          setRolesLoading(false);
          setFeaturesLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orgId, loadRoles, loadFeatures]);

  useEffect(() => {
    if (selectedRoleId === null) {
      setMappings([]);
      return;
    }

    let cancelled = false;
    setMappingsLoading(true);
    setMappingsError(null);

    (async () => {
      try {
        const rows = await loadMappings(selectedRoleId);
        if (!cancelled) setMappings(rows);
      } catch (e) {
        if (!cancelled) {
          setMappings([]);
          setMappingsError(e instanceof Error ? e.message : "Could not load mappings.");
        }
      } finally {
        if (!cancelled) setMappingsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedRoleId, loadMappings]);

  async function assignFeatureToRole(featureId: number | string) {
    if (selectedRoleId === null) return;
    setAssigningFeatureId(featureId);
    setActionMessage(null);
    try {
      const res = await fetch(`${API_URL}/api/organization-features/assign-feature-to-role`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          org_id: orgId,
          role_id: selectedRoleId,
          feature_id: featureId,
        }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.message || data.error || "Could not assign feature.");
      }
      setActionMessage(data.message || "Feature linked to role.");
      const rows = await loadMappings(selectedRoleId);
      setMappings(rows);
    } catch (e) {
      setActionMessage(e instanceof Error ? e.message : "Assignment failed.");
    } finally {
      setAssigningFeatureId(null);
    }
  }

  async function removeFeatureAccessFromRole(featureId: number | string) {
    if (selectedRoleId === null) return;
    const key = `${selectedRoleId}:${featureId}`;
    setUpdatingKey(key);
    setActionMessage(null);
    try {
      const res = await fetch(`${API_URL}/api/organization-features/update-feature-of-role`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          org_id: orgId,
          role_id: selectedRoleId,
          feature_id: featureId,
          is_allowed: 0,
        }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.message || data.error || "Could not remove feature access.");
      }
      setActionMessage(data.message || "Feature removed from role.");
      const rows = await loadMappings(selectedRoleId);
      setMappings(rows);
    } catch (e) {
      setActionMessage(e instanceof Error ? e.message : "Remove failed.");
    } finally {
      setUpdatingKey(null);
    }
  }

  const initialLoading = rolesLoading || featuresLoading;

  async function refreshAll() {
    if (!orgId || Number.isNaN(orgId)) return;
    setPageError(null);
    setRolesLoading(true);
    setFeaturesLoading(true);
    try {
      const [rolesData, featuresData] = await Promise.all([loadRoles(), loadFeatures()]);
      const visibleRoles = rolesVisibleInUi(rolesData);
      setRoles(visibleRoles);
      setFeatures(featuresData);
      setSelectedRoleId((prev) => {
        if (visibleRoles.length === 0) return null;
        if (prev != null && visibleRoles.some((r) => Number(r.id) === prev)) return prev;
        return Number(visibleRoles[0].id);
      });
    } catch (e) {
      setPageError(e instanceof Error ? e.message : "Could not load page data.");
      setRoles([]);
      setFeatures([]);
    } finally {
      setRolesLoading(false);
      setFeaturesLoading(false);
    }
  }

  function selectRole(id: number) {
    setSelectedRoleId(id);
    setMobileMainTab("features");
  }

  const assignedFeatureCount = mappings.length;

  const mobileTabs: Array<{
    id: "roles" | "features";
    label: string;
    badge?: number;
  }> = [
    { id: "roles", label: "Roles", badge: roles.length },
    {
      id: "features",
      label: "Features",
      badge: selectedRole ? assignedFeatureCount : undefined,
    },
  ];

  function renderFeatureActions(feature: FeatureRow, compact = false) {
    const fid = Number(feature.id);
    const mapping = !Number.isNaN(fid) ? mappingByFeatureId.get(fid) : undefined;
    const updating =
      updatingKey === `${selectedRoleId}:${feature.id}` ||
      updatingKey === `${selectedRoleId}:${fid}`;

    if (mapping) {
      return (
        <button
          type="button"
          disabled={updating || assigningFeatureId !== null}
          onClick={() => void removeFeatureAccessFromRole(feature.id)}
          className={zohoDangerBtnCls(compact)}
        >
          {updating ? "Removing…" : "Remove"}
        </button>
      );
    }

    return (
      <button
        type="button"
        disabled={assigningFeatureId !== null}
        onClick={() => void assignFeatureToRole(feature.id)}
        className={zohoPrimaryBtnCls(false, compact)}
      >
        {assigningFeatureId !== null && String(assigningFeatureId) === String(feature.id)
          ? "Assigning…"
          : "Assign"}
      </button>
    );
  }

  return (
    <section className="min-h-full bg-[#F5F7FA] pb-3 [font-family:var(--font-inter),system-ui,sans-serif] max-lg:-mx-1 sm:max-lg:-mx-2 lg:space-y-5 lg:p-6 lg:pb-8">
      {/* Mobile & tablet: Zoho-style */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-20 border-b border-[#E4E7EC] bg-white shadow-sm">
          <div className="flex items-center gap-2 px-3 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
              <Shield className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[15px] font-semibold text-[#1F2937]">
                Role module access
              </h1>
              <p className={`truncate ${mobileCaptionCls}`}>
                {initialLoading
                  ? "Loading…"
                  : selectedRole
                    ? `${displayRoleName(selectedRole)} · ${assignedFeatureCount} assigned`
                    : `${roles.length} roles · ${features.length} modules`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refreshAll()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#E4E7EC] text-[#008CD3] active:bg-[#F5F7FA]"
              aria-label="Refresh"
            >
              <RefreshCw
                className={`h-4 w-4 ${initialLoading || mappingsLoading ? "animate-spin" : ""}`}
                aria-hidden
              />
            </button>
          </div>
          <div className="px-3 pb-2.5">
            <div className="flex w-full gap-0.5 rounded-md bg-[#F5F7FA] p-0.5">
              {mobileTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMobileMainTab(tab.id)}
                  className={`flex min-w-0 flex-1 items-center justify-center gap-1 rounded-[5px] px-2 py-1.5 text-[12px] font-medium transition active:scale-[0.98] ${
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
                      {tab.badge > 9 ? "9+" : tab.badge}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </div>

        {pageError ? (
          <div className="mx-3 mt-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2 text-[12px] text-[#D93025]">
            {pageError}
          </div>
        ) : null}

        {actionMessage ? (
          <div className="mx-3 mt-2 rounded-lg border border-[#A8DAB5] bg-[#E6F4EA] px-3 py-2 text-[12px] text-[#0F9D58]">
            {actionMessage}
          </div>
        ) : null}

        {initialLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-[#6B7280]">
            <Loader2 className="h-7 w-7 animate-spin text-[#008CD3]" aria-hidden />
            <p className="text-[13px]">Loading roles and modules…</p>
          </div>
        ) : null}

        {!initialLoading && !pageError && mobileMainTab === "roles" ? (
          <ul className="divide-y divide-[#E4E7EC] bg-white">
            {roles.length === 0 ? (
              <li className="px-3 py-12 text-center">
                <Shield className="mx-auto h-8 w-8 text-[#9CA3AF]" aria-hidden />
                <p className={`mt-3 ${mobileValueCls}`}>No roles found</p>
                <p className={`mt-1 ${mobileCaptionCls}`}>
                  Create roles for this organization first.
                </p>
              </li>
            ) : (
              roles.map((role) => {
                const id = Number(role.id);
                const active = selectedRoleId !== null && id === selectedRoleId;
                const name = displayRoleName(role);
                return (
                  <li key={String(role.id)}>
                    <button
                      type="button"
                      onClick={() => selectRole(id)}
                      className="flex w-full items-center gap-2.5 px-3 py-3 text-left active:bg-[#F5F7FA]"
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${avatarColorClass(name)}`}
                      >
                        {roleInitials(name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate ${mobileValueCls}`}>{name}</p>
                        <p className={mobileCaptionCls}>
                          {active ? "Currently selected" : "Tap to manage modules"}
                        </p>
                      </div>
                      {active ? (
                        <Check className="h-4 w-4 shrink-0 text-[#008CD3]" aria-hidden />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-[#9CA3AF]" aria-hidden />
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        ) : null}

        {!initialLoading && !pageError && mobileMainTab === "features" ? (
          <div>
            {!selectedRole || roles.length === 0 ? (
              <div className="mx-3 mt-3 rounded-lg border border-[#E4E7EC] bg-white px-4 py-12 text-center">
                <Shield className="mx-auto h-8 w-8 text-[#9CA3AF]" aria-hidden />
                <p className={`mt-3 ${mobileValueCls}`}>Select a role first</p>
                <p className={`mt-1 ${mobileCaptionCls}`}>
                  Go to Roles and pick a role to configure modules.
                </p>
                <button
                  type="button"
                  onClick={() => setMobileMainTab("roles")}
                  className={`mt-4 ${zohoPrimaryBtnCls(true)}`}
                >
                  Choose role
                </button>
              </div>
            ) : (
              <>
                <div className="border-b border-[#E4E7EC] bg-[#E8F4FB]/50 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#008CD3]">
                    Modules for role
                  </p>
                  <p className={mobileValueCls}>{displayRoleName(selectedRole)}</p>
                </div>
                <div className="border-b border-[#E4E7EC] bg-white px-3 py-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9CA3AF]" aria-hidden />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search modules…"
                      className={zohoSearchCls()}
                    />
                  </div>
                </div>

                {mappingsLoading ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-14 text-[#6B7280]">
                    <Loader2 className="h-7 w-7 animate-spin text-[#008CD3]" aria-hidden />
                    <p className="text-[13px]">Loading assignments…</p>
                  </div>
                ) : null}

                {mappingsError ? (
                  <div className="mx-3 mt-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2 text-[12px] text-[#D93025]">
                    {mappingsError}
                  </div>
                ) : null}

                {!mappingsLoading && !mappingsError && features.length === 0 ? (
                  <div className="mx-3 mt-3 rounded-lg border border-dashed border-[#E4E7EC] bg-white px-4 py-12 text-center">
                    <Puzzle className="mx-auto h-8 w-8 text-[#9CA3AF]" aria-hidden />
                    <p className={`mt-3 ${mobileValueCls}`}>No modules yet</p>
                    <p className={`mt-1 ${mobileCaptionCls}`}>
                      Add organization modules before assigning them to roles.
                    </p>
                  </div>
                ) : null}

                {!mappingsLoading && !mappingsError && features.length > 0 ? (
                  <ul className="divide-y divide-[#E4E7EC] bg-white">
                    {filteredFeatures.length === 0 ? (
                      <li className="px-3 py-10 text-center text-[13px] text-[#6B7280]">
                        No modules match your search.
                      </li>
                    ) : (
                      filteredFeatures.map((feature) => {
                        const fid = Number(feature.id);
                        const mapping = !Number.isNaN(fid)
                          ? mappingByFeatureId.get(fid)
                          : undefined;
                        const title = displayFeatureTitle(feature);

                        return (
                          <li key={String(feature.id)}>
                            <div className="flex items-start gap-2 px-3 py-3">
                              <span
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold ${
                                  mapping
                                    ? "bg-[#E6F4EA] text-[#0F9D58]"
                                    : moduleColorClass(title)
                                }`}
                              >
                                {mapping ? (
                                  <Check className="h-4 w-4" aria-hidden />
                                ) : (
                                  featureInitials(title)
                                )}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className={`truncate ${mobileValueCls}`}>{title}</p>
                                <p className={`line-clamp-2 ${mobileCaptionCls}`}>
                                  {feature.feature_description || "No description."}
                                </p>
                                {mapping ? (
                                  <p className="mt-0.5 text-[11px] font-medium text-[#0F9D58]">
                                    Assigned to role
                                  </p>
                                ) : null}
                                <div className="mt-2">
                                  {renderFeatureActions(feature, true)}
                                </div>
                              </div>
                            </div>
                          </li>
                        );
                      })
                    )}
                  </ul>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>

      {/* Desktop: Zoho-style */}
      <div className="mx-auto hidden max-w-6xl space-y-5 lg:block">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
              <Shield className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h1 className="text-[18px] font-semibold text-[#1F2937]">
                Assign modules by role
              </h1>
              <p className="max-w-xl text-[13px] text-[#6B7280]">
                Choose a role, then grant or remove organization module access for that role.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex rounded-md bg-[#F5F7FA] px-2 py-0.5 text-[12px] font-medium text-[#374151]">
                  {roles.length} role{roles.length === 1 ? "" : "s"}
                </span>
                <span className="inline-flex rounded-md bg-[#E8F4FB] px-2 py-0.5 text-[12px] font-medium text-[#008CD3]">
                  {features.length} module{features.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void refreshAll()}
            disabled={initialLoading}
            className={zohoSecondaryBtnCls()}
            aria-label="Refresh"
          >
            <RefreshCw
              className={`h-4 w-4 ${initialLoading || mappingsLoading ? "animate-spin" : ""}`}
              aria-hidden
            />
            Refresh
          </button>
        </div>

        {pageError ? (
          <div className="rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-4 py-3 text-[13px] text-[#D93025]">
            {pageError}
          </div>
        ) : null}

        {actionMessage ? (
          <div className="rounded-lg border border-[#A8DAB5] bg-[#E6F4EA] px-4 py-3 text-[13px] text-[#0F9D58]">
            {actionMessage}
          </div>
        ) : null}

        {initialLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-[#E4E7EC] bg-white py-16 text-[#6B7280]">
            <Loader2 className="h-7 w-7 animate-spin text-[#008CD3]" aria-hidden />
            <p className="text-[13px]">Loading roles and modules…</p>
          </div>
        ) : null}

        {!initialLoading && !pageError ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(240px,280px)_1fr]">
            <aside className="h-fit rounded-lg border border-[#E4E7EC] bg-white p-3 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                Roles
              </p>
              <p className={`mt-0.5 ${mobileCaptionCls}`}>
                Select a role to manage module access.
              </p>
              <ul className="mt-3 space-y-1.5">
                {roles.length === 0 ? (
                  <li className="rounded-md border border-dashed border-[#E4E7EC] bg-[#F9FAFB] px-3 py-4 text-center text-[12px] text-[#6B7280]">
                    No roles found for this organization.
                  </li>
                ) : (
                  roles.map((role) => {
                    const id = Number(role.id);
                    const active = selectedRoleId !== null && id === selectedRoleId;
                    const name = displayRoleName(role);
                    return (
                      <li key={String(role.id)}>
                        <button
                          type="button"
                          onClick={() => setSelectedRoleId(id)}
                          className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition ${
                            active
                              ? "border-[#008CD3] bg-[#E8F4FB] text-[#008CD3]"
                              : "border-[#E4E7EC] bg-white text-[#1F2937] hover:bg-[#F9FAFB]"
                          }`}
                        >
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                              active ? "bg-white text-[#008CD3]" : avatarColorClass(name)
                            }`}
                          >
                            {roleInitials(name)}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                            {name}
                          </span>
                          {active ? (
                            <Check className="h-4 w-4 shrink-0" aria-hidden />
                          ) : null}
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </aside>

            <div className="min-w-0 rounded-lg border border-[#E4E7EC] bg-white p-4 shadow-sm">
              {!selectedRole || roles.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#E4E7EC] bg-[#F9FAFB] px-4 py-12 text-center text-[13px] text-[#6B7280]">
                  Select a role from the list to configure modules.
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-2 border-b border-[#E4E7EC] pb-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                        Modules for role
                      </p>
                      <h2 className="mt-0.5 text-[16px] font-semibold text-[#1F2937]">
                        {displayRoleName(selectedRole)}
                      </h2>
                    </div>
                    <div className="relative w-full sm:max-w-xs">
                      <Search
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]"
                        aria-hidden
                      />
                      <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search modules…"
                        className={zohoSearchCls()}
                      />
                    </div>
                  </div>

                  {mappingsLoading ? (
                    <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] py-10 text-[#6B7280]">
                      <Loader2 className="h-6 w-6 animate-spin text-[#008CD3]" aria-hidden />
                      <p className="text-[13px]">Loading assignments…</p>
                    </div>
                  ) : null}

                  {mappingsError ? (
                    <div className="mt-3 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2 text-[13px] text-[#D93025]">
                      {mappingsError}
                    </div>
                  ) : null}

                  {!mappingsLoading && !mappingsError && features.length === 0 ? (
                    <div className="mt-4 rounded-lg border border-dashed border-[#E4E7EC] bg-[#F9FAFB] px-4 py-10 text-center text-[13px] text-[#6B7280]">
                      No organization modules available. Add modules to the organization first.
                    </div>
                  ) : null}

                  {!mappingsLoading && !mappingsError && features.length > 0 ? (
                    <ul className="mt-4 space-y-2">
                      {filteredFeatures.length === 0 ? (
                        <li className="rounded-lg border border-dashed border-[#E4E7EC] bg-[#F9FAFB] px-4 py-8 text-center text-[13px] text-[#6B7280]">
                          No modules match your search.
                        </li>
                      ) : (
                        filteredFeatures.map((feature) => {
                          const fid = Number(feature.id);
                          const mapping = !Number.isNaN(fid)
                            ? mappingByFeatureId.get(fid)
                            : undefined;
                          const title = displayFeatureTitle(feature);

                          return (
                            <li key={String(feature.id)}>
                              <article className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] p-3">
                                <div className="flex min-w-0 flex-1 items-start gap-2.5">
                                  <span
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold ${
                                      mapping
                                        ? "bg-[#E6F4EA] text-[#0F9D58]"
                                        : moduleColorClass(title)
                                    }`}
                                  >
                                    {mapping ? (
                                      <Check className="h-4 w-4" aria-hidden />
                                    ) : (
                                      featureInitials(title)
                                    )}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[14px] font-medium text-[#1F2937]">
                                      {title}
                                    </p>
                                    <p className="line-clamp-2 text-[12px] text-[#6B7280]">
                                      {feature.feature_description || "No description."}
                                    </p>
                                    {mapping ? (
                                      <p className="mt-0.5 text-[11px] font-medium text-[#0F9D58]">
                                        Assigned to role
                                      </p>
                                    ) : null}
                                  </div>
                                </div>
                                <div className="shrink-0">
                                  {renderFeatureActions(feature, false)}
                                </div>
                              </article>
                            </li>
                          );
                        })
                      )}
                    </ul>
                  ) : null}
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
