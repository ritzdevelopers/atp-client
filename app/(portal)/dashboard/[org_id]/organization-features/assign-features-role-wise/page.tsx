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

const WA_AVATAR_COLORS = [
  "bg-[#DFE5E7] text-[#54656F]",
  "bg-[#FFD279] text-[#7A4F01]",
  "bg-[#FEAA57] text-[#7A3E00]",
  "bg-[#A5B337] text-[#3D4A0A]",
  "bg-[#35CD96] text-[#0B5E44]",
  "bg-[#53BDEB] text-[#0B4F6E]",
  "bg-[#E67EAB] text-[#6B2348]",
  "bg-[#7F66FF] text-[#2E1F7A]",
];

function avatarColorClass(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return WA_AVATAR_COLORS[Math.abs(hash) % WA_AVATAR_COLORS.length];
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

function searchFieldCls() {
  return "w-full rounded-lg border-0 bg-[#F0F2F5] py-2.5 pl-10 pr-4 text-[15px] text-[#111B21] outline-none transition placeholder:text-[#8696A0] focus:bg-white focus:ring-1 focus:ring-[#25D366]/40 lg:rounded-lg lg:border lg:border-slate-200 lg:bg-white lg:py-2 lg:pl-3 lg:text-sm lg:focus:ring-2 lg:focus:ring-indigo-200";
}

function waPrimaryBtnCls() {
  return "inline-flex min-h-[40px] shrink-0 items-center justify-center rounded-lg bg-[#25D366] px-4 py-2 text-[14px] font-medium text-white transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 lg:rounded-lg lg:bg-[#0C123A] lg:px-4 lg:py-2 lg:text-sm lg:font-semibold lg:hover:bg-[#151e59]";
}

function waDangerBtnCls() {
  return "inline-flex min-h-[40px] shrink-0 items-center justify-center rounded-lg border border-[#FFCDD2] bg-[#FFECEC] px-4 py-2 text-[14px] font-medium text-[#C62828] transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 lg:rounded-lg lg:border-red-200 lg:bg-red-50 lg:text-sm lg:font-semibold lg:text-red-800 lg:hover:bg-red-100";
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

  function renderFeatureActions(feature: FeatureRow) {
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
          className={waDangerBtnCls()}
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
        className={waPrimaryBtnCls()}
      >
        {assigningFeatureId !== null && String(assigningFeatureId) === String(feature.id)
          ? "Assigning…"
          : "Assign"}
      </button>
    );
  }

  return (
    <section className="min-h-full bg-[#F0F2F5] lg:bg-transparent lg:space-y-6 lg:p-4 lg:sm:p-6">
      {/* Mobile & tablet: WhatsApp-style shell */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-20 bg-[#128C7E] text-white shadow-sm">
          <div className="flex items-center gap-1 px-1 py-2">
            <div className="min-w-0 flex-1 px-2 py-1">
              <h1 className="truncate text-[17px] font-medium leading-tight">
                Role features
              </h1>
              <p className="truncate text-[13px] text-white/75">
                {initialLoading
                  ? "Loading…"
                  : selectedRole
                    ? `${displayRoleName(selectedRole)} · ${assignedFeatureCount} assigned`
                    : `${roles.length} roles · ${features.length} features`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refreshAll()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full active:bg-white/10"
              aria-label="Refresh"
            >
              <RefreshCw
                className={`h-5 w-5 ${initialLoading || mappingsLoading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
          <div className="flex overflow-x-auto border-t border-white/10 [scrollbar-width:none]">
            {mobileTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMobileMainTab(tab.id)}
                className={`relative shrink-0 px-4 py-3 text-[13px] font-medium transition ${
                  mobileMainTab === tab.id
                    ? "border-b-2 border-white text-white"
                    : "border-b-2 border-transparent text-white/70"
                }`}
              >
                {tab.label}
                {tab.badge != null && tab.badge > 0 ? (
                  <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1 text-[11px]">
                    {tab.badge > 9 ? "9+" : tab.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {pageError ? (
          <div className="mx-3 mt-3 rounded-lg bg-[#FFECEC] px-4 py-3 text-[14px] text-[#8B1A1A]">
            {pageError}
          </div>
        ) : null}

        {actionMessage ? (
          <div className="mx-3 mt-3 rounded-lg bg-[#E7FCE3] px-4 py-3 text-[14px] text-[#0B5E44]">
            {actionMessage}
          </div>
        ) : null}

        {initialLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-[#667781]">
            <Loader2 className="h-9 w-9 animate-spin text-[#128C7E]" />
            <p className="text-[15px]">Loading roles and features…</p>
          </div>
        ) : null}

        {!initialLoading && !pageError && mobileMainTab === "roles" ? (
          <ul className="mt-1 divide-y divide-[#E9EDEF] bg-white">
            {roles.length === 0 ? (
              <li className="px-4 py-16 text-center">
                <Shield className="mx-auto h-10 w-10 text-[#8696A0]" />
                <p className="mt-4 text-[17px] font-medium text-[#111B21]">No roles found</p>
                <p className="mt-2 text-[14px] text-[#667781]">
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
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-[#F0F2F5]"
                    >
                      <span
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-medium ${avatarColorClass(name)}`}
                      >
                        {roleInitials(name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[17px] text-[#111B21]">{name}</p>
                        <p className="text-[14px] text-[#667781]">
                          {active ? "Currently selected" : "Tap to manage features"}
                        </p>
                      </div>
                      {active ? (
                        <Check className="h-5 w-5 shrink-0 text-[#25D366]" />
                      ) : (
                        <ChevronRight className="h-5 w-5 shrink-0 text-[#8696A0]" />
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
              <div className="mx-3 mt-4 rounded-lg bg-white px-6 py-16 text-center">
                <Shield className="mx-auto h-10 w-10 text-[#8696A0]" />
                <p className="mt-4 text-[17px] font-medium text-[#111B21]">Select a role first</p>
                <p className="mt-2 text-[14px] text-[#667781]">
                  Go to the Roles tab and pick a role to configure features.
                </p>
                <button
                  type="button"
                  onClick={() => setMobileMainTab("roles")}
                  className={`mt-6 ${waPrimaryBtnCls()}`}
                >
                  Choose role
                </button>
              </div>
            ) : (
              <>
                <div className="bg-[#128C7E]/10 px-4 py-3">
                  <p className="text-[13px] text-[#667781]">Managing features for</p>
                  <p className="text-[17px] font-medium text-[#111B21]">
                    {displayRoleName(selectedRole)}
                  </p>
                </div>
                <div className="bg-white px-3 py-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8696A0]" />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search features"
                      className={searchFieldCls()}
                    />
                  </div>
                </div>

                {mappingsLoading ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-16 text-[#667781]">
                    <Loader2 className="h-8 w-8 animate-spin text-[#128C7E]" />
                    <p className="text-[15px]">Loading assignments…</p>
                  </div>
                ) : null}

                {mappingsError ? (
                  <div className="mx-3 mt-3 rounded-lg bg-[#FFECEC] px-4 py-3 text-[14px] text-[#8B1A1A]">
                    {mappingsError}
                  </div>
                ) : null}

                {!mappingsLoading && !mappingsError && features.length === 0 ? (
                  <div className="mx-3 mt-4 rounded-lg bg-white px-6 py-16 text-center">
                    <Puzzle className="mx-auto h-10 w-10 text-[#8696A0]" />
                    <p className="mt-4 text-[17px] font-medium text-[#111B21]">No features yet</p>
                    <p className="mt-2 text-[14px] text-[#667781]">
                      Add organization features before assigning them to roles.
                    </p>
                  </div>
                ) : null}

                {!mappingsLoading && !mappingsError && features.length > 0 ? (
                  <ul className="mt-1 divide-y divide-[#E9EDEF] bg-white">
                    {filteredFeatures.length === 0 ? (
                      <li className="px-4 py-12 text-center text-[15px] text-[#667781]">
                        No features match your search.
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
                            <div className="flex items-center gap-3 px-4 py-3.5">
                              <span
                                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                                  mapping
                                    ? "bg-[#E7FCE3] text-[#0B5E44]"
                                    : avatarColorClass(title)
                                }`}
                              >
                                {mapping ? (
                                  <Check className="h-5 w-5" />
                                ) : (
                                  featureInitials(title)
                                )}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[17px] text-[#111B21]">{title}</p>
                                <p className="line-clamp-2 text-[14px] text-[#667781]">
                                  {feature.feature_description || "No description."}
                                </p>
                                {mapping ? (
                                  <p className="mt-0.5 text-[13px] font-medium text-[#25D366]">
                                    Assigned to role
                                  </p>
                                ) : null}
                              </div>
                              {renderFeatureActions(feature)}
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

      {/* Desktop layout (unchanged) */}
      <div className="hidden space-y-6 lg:block">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
          Organization Features
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#0C123A] sm:text-3xl">
          Assign features by role
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Choose a role, then grant organization features to that role. Remove access to unlink a feature from the role.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {roles.length} Role{roles.length === 1 ? "" : "s"}
          </span>
          <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-800">
            {features.length} Org feature{features.length === 1 ? "" : "s"}
          </span>
        </div>
      </header>

      {pageError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{pageError}</div>
      ) : null}

      {initialLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading roles and features…
        </div>
      ) : null}

      {!initialLoading && !pageError ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(260px,300px)_1fr]">
          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Roles</p>
            <p className="mt-1 text-xs text-slate-500">Select a role to manage its feature access.</p>
            <ul className="mt-4 space-y-2">
              {roles.length === 0 ? (
                <li className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
                  No roles found for this organization.
                </li>
              ) : (
                roles.map((role) => {
                  const id = Number(role.id);
                  const active = selectedRoleId !== null && id === selectedRoleId;
                  return (
                    <li key={String(role.id)}>
                      <button
                        type="button"
                        onClick={() => setSelectedRoleId(id)}
                        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition ${
                          active
                            ? "border-[#0C123A] bg-[#0C123A] text-white shadow-sm"
                            : "border-slate-200 bg-white text-[#0C123A] hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <span className="truncate">{role.role_name || `Role #${role.id}`}</span>
                        {active ? (
                          <span className="ml-2 shrink-0 text-[10px] font-medium uppercase tracking-wide text-white/90">
                            Active
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </aside>

          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            {!selectedRole || roles.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
                Select a role from the list to configure features.
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Features for role
                    </p>
                    <h2 className="mt-1 text-lg font-bold text-[#0C123A]">
                      {selectedRole.role_name || `Role #${selectedRole.id}`}
                    </h2>
                  </div>
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search features…"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring-2 sm:max-w-xs"
                  />
                </div>

                {actionMessage ? (
                  <p className="mt-3 text-sm text-slate-700">{actionMessage}</p>
                ) : null}

                {mappingsLoading ? (
                  <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                    Loading role assignments…
                  </div>
                ) : null}

                {mappingsError ? (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {mappingsError}
                  </div>
                ) : null}

                {!mappingsLoading && !mappingsError && features.length === 0 ? (
                  <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                    No organization features available. Add features to the organization first.
                  </div>
                ) : null}

                {!mappingsLoading && !mappingsError && features.length > 0 ? (
                  <ul className="mt-6 space-y-3">
                    {filteredFeatures.length === 0 ? (
                      <li className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                        No features match your search.
                      </li>
                    ) : (
                      filteredFeatures.map((feature) => {
                        const fid = Number(feature.id);
                        const mapping = !Number.isNaN(fid) ? mappingByFeatureId.get(fid) : undefined;
                        const title =
                          feature.feature_name || feature.feature_key || `Feature #${feature.id}`;
                        const updating =
                          updatingKey === `${selectedRoleId}:${feature.id}` ||
                          updatingKey === `${selectedRoleId}:${fid}`;

                        return (
                          <li key={String(feature.id)}>
                            <article className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-[#0C123A]">{title}</p>
                                <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                                  {feature.feature_description || "No description."}
                                </p>
                              </div>

                              <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                                {mapping ? (
                                  <button
                                    type="button"
                                    disabled={updating || assigningFeatureId !== null}
                                    onClick={() => void removeFeatureAccessFromRole(feature.id)}
                                    className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {updating ? "Removing…" : "Remove feature access"}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={assigningFeatureId !== null}
                                    onClick={() => void assignFeatureToRole(feature.id)}
                                    className="inline-flex items-center justify-center rounded-lg bg-[#0C123A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#151e59] disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {assigningFeatureId !== null &&
                                    String(assigningFeatureId) === String(feature.id)
                                      ? "Assigning…"
                                      : "Assign to role"}
                                  </button>
                                )}
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
