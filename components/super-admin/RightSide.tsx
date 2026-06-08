"use client";

import { useEffect, useMemo, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type FeatureRow = {
  id: number | string;
  feature_name: string;
  feature_val: string;
};

type OrgRow = {
  id: number | string;
  organization_name?: string;
  org_name?: string;
  org_email?: string;
  org_phone?: string;
};

type SubFeatureRow = {
  id: number | string;
  sub_feature_name: string;
  sub_feature_path: string;
  parent_feature_id: number | string;
  feature_name?: string;
  feature_val?: string;
};

/** Turns "Get Organization Info" into "get-organization-info". */
function slugifyFeatureName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function dedupeFeatures(features: FeatureRow[]): FeatureRow[] {
  const seen = new Set<string>();
  return features.filter((feature) => {
    const key = String(feature.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function RightSide({ children }: { children: React.ReactNode }) {
  const [featureName, setFeatureName] = useState("");
  const [creating, setCreating] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [organizations, setOrganizations] = useState<OrgRow[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<OrgRow | null>(null);
  const [allFeatures, setAllFeatures] = useState<FeatureRow[]>([]);
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  const [featureSearch, setFeatureSearch] = useState("");
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<number[]>([]);
  const [assigning, setAssigning] = useState(false);

  const [parentFeatures, setParentFeatures] = useState<FeatureRow[]>([]);
  const [loadingParentFeatures, setLoadingParentFeatures] = useState(true);
  const [selectedParentFeature, setSelectedParentFeature] = useState<FeatureRow | null>(null);
  const [subFeatureName, setSubFeatureName] = useState("");
  const [creatingSubFeature, setCreatingSubFeature] = useState(false);
  const [parentSubFeatures, setParentSubFeatures] = useState<SubFeatureRow[]>([]);
  const [loadingParentSubFeatures, setLoadingParentSubFeatures] = useState(false);
  const [editingSubFeature, setEditingSubFeature] = useState<SubFeatureRow | null>(null);
  const [editSubFeatureName, setEditSubFeatureName] = useState("");
  const [editParentFeatureId, setEditParentFeatureId] = useState<number | "">("");
  const [updatingSubFeature, setUpdatingSubFeature] = useState(false);

  const [showAssignSubFeaturesModal, setShowAssignSubFeaturesModal] = useState(false);
  const [allSubFeatures, setAllSubFeatures] = useState<SubFeatureRow[]>([]);
  const [loadingAllSubFeatures, setLoadingAllSubFeatures] = useState(false);
  const [subFeatureSearch, setSubFeatureSearch] = useState("");
  const [selectedSubFeatureIds, setSelectedSubFeatureIds] = useState<number[]>([]);
  const [assigningSubFeatures, setAssigningSubFeatures] = useState(false);

  const authHeaders = (): Record<string, string> => {
    const token = localStorage.getItem("token");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  };

  async function loadOrganizations() {
    setLoadingOrgs(true);
    try {
      const res = await fetch(`${API_URL}/api/super-admin/get-all-organizations`, {
        method: "GET",
        headers: authHeaders(),
      });
      const data = (await res.json()) as { data?: OrgRow[]; message?: string };
      if (!res.ok) throw new Error(data.message || "Could not load organizations");
      setOrganizations(Array.isArray(data.data) ? data.data : []);
    } catch (e) {
      setActionMessage(e instanceof Error ? e.message : "Could not load organizations");
      setOrganizations([]);
    } finally {
      setLoadingOrgs(false);
    }
  }

  async function loadFeatures() {
    setLoadingFeatures(true);
    try {
      const res = await fetch(`${API_URL}/api/super-admin/get-all-features`, {
        method: "GET",
        headers: authHeaders(),
      });
      const data = (await res.json()) as { data?: FeatureRow[]; message?: string };
      if (!res.ok) throw new Error(data.message || "Could not load features");
      setAllFeatures(dedupeFeatures(Array.isArray(data.data) ? data.data : []));
    } catch (e) {
      setActionMessage(e instanceof Error ? e.message : "Could not load features");
      setAllFeatures([]);
    } finally {
      setLoadingFeatures(false);
    }
  }

  async function loadParentFeatures() {
    setLoadingParentFeatures(true);
    try {
      const res = await fetch(`${API_URL}/api/super-admin/get-all-features`, {
        method: "GET",
        headers: authHeaders(),
      });
      const data = (await res.json()) as { data?: FeatureRow[]; message?: string };
      if (!res.ok) throw new Error(data.message || "Could not load parent features");
      setParentFeatures(dedupeFeatures(Array.isArray(data.data) ? data.data : []));
    } catch (e) {
      setActionMessage(e instanceof Error ? e.message : "Could not load parent features");
      setParentFeatures([]);
    } finally {
      setLoadingParentFeatures(false);
    }
  }

  async function loadAllSubFeatures() {
    setLoadingAllSubFeatures(true);
    try {
      const res = await fetch(`${API_URL}/api/sub-features/get-all-sub-features`, {
        method: "GET",
        headers: authHeaders(),
      });
      const data = (await res.json()) as { data?: SubFeatureRow[]; message?: string };
      if (!res.ok) throw new Error(data.message || "Could not load sub features");
      setAllSubFeatures(Array.isArray(data.data) ? data.data : []);
    } catch (e) {
      setActionMessage(e instanceof Error ? e.message : "Could not load sub features");
      setAllSubFeatures([]);
    } finally {
      setLoadingAllSubFeatures(false);
    }
  }

  async function loadSubFeaturesForParent(parentFeatureId: number | string) {
    setLoadingParentSubFeatures(true);
    try {
      const res = await fetch(`${API_URL}/api/sub-features/get-all-sub-features`, {
        method: "GET",
        headers: authHeaders(),
      });
      const data = (await res.json()) as { data?: SubFeatureRow[]; message?: string };
      if (!res.ok) throw new Error(data.message || "Could not load sub features");
      const all = Array.isArray(data.data) ? data.data : [];
      setParentSubFeatures(
        all.filter((sf) => Number(sf.parent_feature_id) === Number(parentFeatureId)),
      );
    } catch (e) {
      setActionMessage(e instanceof Error ? e.message : "Could not load sub features");
      setParentSubFeatures([]);
    } finally {
      setLoadingParentSubFeatures(false);
    }
  }

  useEffect(() => {
    void loadOrganizations();
    void loadParentFeatures();
  }, []);

  const filteredSubFeatures = useMemo(() => {
    const q = subFeatureSearch.trim().toLowerCase();
    if (!q) return allSubFeatures;
    return allSubFeatures.filter((sf) => {
      return (
        String(sf.sub_feature_name || "")
          .toLowerCase()
          .includes(q) ||
        String(sf.sub_feature_path || "")
          .toLowerCase()
          .includes(q) ||
        String(sf.feature_name || "")
          .toLowerCase()
          .includes(q) ||
        String(sf.feature_val || "")
          .toLowerCase()
          .includes(q)
      );
    });
  }, [allSubFeatures, subFeatureSearch]);

  const groupedSubFeatures = useMemo(() => {
    const groups = new Map<
      number,
      {
        parentId: number;
        parentName: string;
        parentVal: string;
        items: SubFeatureRow[];
      }
    >();

    for (const subFeature of filteredSubFeatures) {
      const parentId = Number(subFeature.parent_feature_id);
      if (!groups.has(parentId)) {
        groups.set(parentId, {
          parentId,
          parentName: subFeature.feature_name || `Feature ${parentId}`,
          parentVal: subFeature.feature_val || "",
          items: [],
        });
      }
      groups.get(parentId)?.items.push(subFeature);
    }

    return Array.from(groups.values());
  }, [filteredSubFeatures]);

  const filteredFeatures = useMemo(() => {
    const q = featureSearch.trim().toLowerCase();
    if (!q) return allFeatures;
    return allFeatures.filter((f) => {
      return (
        String(f.feature_name || "")
          .toLowerCase()
          .includes(q) ||
        String(f.feature_val || "")
          .toLowerCase()
          .includes(q)
      );
    });
  }, [allFeatures, featureSearch]);

  const featureVal = useMemo(() => slugifyFeatureName(featureName), [featureName]);

  const subFeaturePath = useMemo(
    () => slugifyFeatureName(subFeatureName),
    [subFeatureName],
  );

  const editSubFeaturePath = useMemo(
    () => slugifyFeatureName(editSubFeatureName),
    [editSubFeatureName],
  );

  async function createFeature() {
    const slug = slugifyFeatureName(featureName);
    if (!featureName.trim() || !slug) {
      setActionMessage("Feature name is required (must produce a valid feature value).");
      return;
    }
    setCreating(true);
    setActionMessage(null);
    try {
      const res = await fetch(`${API_URL}/api/super-admin/create-feature`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          feature_name: featureName.trim(),
          feature_val: slug,
        }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.message || data.error || "Could not create feature");
      setActionMessage(data.message || "Feature created successfully.");
      setFeatureName("");
      await loadParentFeatures();
      if (showAssignModal) await loadFeatures();
    } catch (e) {
      setActionMessage(e instanceof Error ? e.message : "Could not create feature");
    } finally {
      setCreating(false);
    }
  }

  function selectParentFeature(feature: FeatureRow) {
    setSelectedParentFeature(feature);
    setSubFeatureName("");
    setEditingSubFeature(null);
    setEditSubFeatureName("");
    setEditParentFeatureId("");
    void loadSubFeaturesForParent(feature.id);
  }

  function startEditSubFeature(subFeature: SubFeatureRow) {
    setEditingSubFeature(subFeature);
    setEditSubFeatureName(subFeature.sub_feature_name);
    setEditParentFeatureId(Number(subFeature.parent_feature_id));
  }

  function cancelEditSubFeature() {
    setEditingSubFeature(null);
    setEditSubFeatureName("");
    setEditParentFeatureId("");
  }

  async function updateSubFeature() {
    if (!editingSubFeature || !selectedParentFeature) return;
    const slug = slugifyFeatureName(editSubFeatureName);
    const path = editSubFeaturePath;
    if (!editSubFeatureName.trim() || !slug || !path) {
      setActionMessage("Sub feature name is required (must produce a valid path).");
      return;
    }
    if (!editParentFeatureId) {
      setActionMessage("Select a parent feature for this sub feature.");
      return;
    }
    setUpdatingSubFeature(true);
    setActionMessage(null);
    try {
      const res = await fetch(`${API_URL}/api/sub-features/update-sub-feature`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          id: Number(editingSubFeature.id),
          sub_feature_name: editSubFeatureName.trim(),
          parent_feature_id: Number(editParentFeatureId),
          sub_feature_path: path,
        }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.message || data.error || "Could not update sub feature");
      setActionMessage(data.message || "Sub feature updated successfully.");
      cancelEditSubFeature();
      await loadSubFeaturesForParent(selectedParentFeature.id);
    } catch (e) {
      setActionMessage(e instanceof Error ? e.message : "Could not update sub feature");
    } finally {
      setUpdatingSubFeature(false);
    }
  }

  async function createSubFeature() {
    if (!selectedParentFeature) {
      setActionMessage("Select a parent feature first.");
      return;
    }
    const slug = slugifyFeatureName(subFeatureName);
    const path = subFeaturePath;
    if (!subFeatureName.trim() || !slug || !path) {
      setActionMessage("Sub feature name is required (must produce a valid path).");
      return;
    }
    setCreatingSubFeature(true);
    setActionMessage(null);
    try {
      const res = await fetch(`${API_URL}/api/sub-features/create-new-sub-feature`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          sub_feature_name: subFeatureName.trim(),
          parent_feature_id: Number(selectedParentFeature.id),
          sub_feature_path: path,
        }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.message || data.error || "Could not create sub feature");
      setActionMessage(data.message || "Sub feature created successfully.");
      setSubFeatureName("");
      await loadSubFeaturesForParent(selectedParentFeature.id);
    } catch (e) {
      setActionMessage(e instanceof Error ? e.message : "Could not create sub feature");
    } finally {
      setCreatingSubFeature(false);
    }
  }

  async function openAssignModal(org: OrgRow) {
    setSelectedOrg(org);
    setFeatureSearch("");
    setSelectedFeatureIds([]);
    setShowAssignModal(true);
    await loadFeatures();
  }

  async function openAssignSubFeaturesModal(org: OrgRow) {
    setSelectedOrg(org);
    setSubFeatureSearch("");
    setSelectedSubFeatureIds([]);
    setShowAssignSubFeaturesModal(true);
    await loadAllSubFeatures();
  }

  async function assignSubFeaturesToOrg() {
    if (!selectedOrg) return;
    if (selectedSubFeatureIds.length === 0) {
      setActionMessage("Select at least one sub feature.");
      return;
    }

    const featuresInfoMap = new Map<number, number[]>();
    for (const subFeature of allSubFeatures) {
      const subFeatureId = Number(subFeature.id);
      if (!selectedSubFeatureIds.includes(subFeatureId)) continue;
      const parentFeatureId = Number(subFeature.parent_feature_id);
      const existing = featuresInfoMap.get(parentFeatureId) || [];
      existing.push(subFeatureId);
      featuresInfoMap.set(parentFeatureId, existing);
    }

    const features_info = Array.from(featuresInfoMap.entries()).map(
      ([parent_feature_id, sub_features_ids]) => ({
        parent_feature_id,
        sub_features_ids,
      }),
    );

    setAssigningSubFeatures(true);
    setActionMessage(null);
    try {
      const res = await fetch(
        `${API_URL}/api/sub-features/assign-sub-features-to-an-organization`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            org_id: selectedOrg.id,
            features_info,
          }),
        },
      );
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.message || data.error || "Could not assign sub features");
      setActionMessage(data.message || "Sub features assigned successfully.");
      setShowAssignSubFeaturesModal(false);
      setSelectedOrg(null);
      setSelectedSubFeatureIds([]);
    } catch (e) {
      setActionMessage(e instanceof Error ? e.message : "Could not assign sub features");
    } finally {
      setAssigningSubFeatures(false);
    }
  }

  async function assignFeaturesToOrg() {
    if (!selectedOrg) return;
    if (selectedFeatureIds.length === 0) {
      setActionMessage("Select at least one feature.");
      return;
    }
    setAssigning(true);
    setActionMessage(null);
    try {
      const res = await fetch(`${API_URL}/api/super-admin/assign-features-to-an-organization`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          org_id: selectedOrg.id,
          feature_ids: selectedFeatureIds,
        }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.message || data.error || "Could not assign features");
      setActionMessage(data.message || "Features assigned successfully.");
      setShowAssignModal(false);
      setSelectedOrg(null);
      setSelectedFeatureIds([]);
    } catch (e) {
      setActionMessage(e instanceof Error ? e.message : "Could not assign features");
    } finally {
      setAssigning(false);
    }
  }
  return (
    <div className="w-full space-y-6 p-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Super Admin</p>
        <h2 className="mt-1 text-xl font-bold text-[#0C123A]">Add New Feature</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            type="text"
            value={featureName}
            onChange={(e) => setFeatureName(e.target.value)}
            placeholder="Feature name (e.g. Manage Employees)"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring-2"
          />
          <input
            type="text"
            readOnly
            aria-readonly="true"
            value={featureVal}
            placeholder="Auto-generated from feature name"
            title="Generated from the feature name; not editable"
            className="cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => void createFeature()}
          disabled={creating}
          className="mt-4 inline-flex rounded-lg bg-[#0C123A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1a2564] disabled:opacity-60"
        >
          {creating ? "Creating..." : "Create Feature"}
        </button>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Super Admin</p>
        <h2 className="mt-1 text-xl font-bold text-[#0C123A]">Add Sub Feature</h2>
        <p className="mt-1 text-sm text-slate-600">
          Select a parent feature, then add a sub feature under it.
        </p>
        {loadingParentFeatures ? (
          <p className="mt-4 text-sm text-slate-500">Loading parent features...</p>
        ) : null}
        {!loadingParentFeatures && parentFeatures.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No parent features found. Create a feature first.</p>
        ) : null}
        {!loadingParentFeatures && parentFeatures.length > 0 ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {parentFeatures.map((feature) => {
              const isSelected = Number(selectedParentFeature?.id) === Number(feature.id);
              return (
                <button
                  key={String(feature.id)}
                  type="button"
                  onClick={() => selectParentFeature(feature)}
                  className={`rounded-xl border p-4 text-left transition ${
                    isSelected
                      ? "border-[#0C123A] bg-[#0C123A]/5 ring-2 ring-[#0C123A]/20"
                      : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  <p className="text-xs text-slate-500">Feature ID: {String(feature.id)}</p>
                  <p className="mt-1 text-sm font-semibold text-[#0C123A]">{feature.feature_name}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{feature.feature_val}</p>
                </button>
              );
            })}
          </div>
        ) : null}

        {selectedParentFeature ? (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Selected parent</p>
            <p className="mt-1 text-sm font-semibold text-[#0C123A]">{selectedParentFeature.feature_name}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input
                type="text"
                value={subFeatureName}
                onChange={(e) => setSubFeatureName(e.target.value)}
                placeholder="Sub feature name (e.g. Add Employee)"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring-2"
              />
              <input
                type="text"
                readOnly
                aria-readonly="true"
                value={subFeaturePath}
                placeholder="Auto-generated path"
                title="Generated from the sub feature name"
                className="cursor-not-allowed rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => void createSubFeature()}
              disabled={creatingSubFeature}
              className="mt-4 inline-flex rounded-lg bg-[#0C123A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1a2564] disabled:opacity-60"
            >
              {creatingSubFeature ? "Creating..." : "Create Sub Feature"}
            </button>

            <div className="mt-5 border-t border-slate-200 pt-4">
              <p className="text-sm font-semibold text-[#0C123A]">Existing sub features</p>
              {loadingParentSubFeatures ? (
                <p className="mt-2 text-sm text-slate-500">Loading sub features...</p>
              ) : null}
              {!loadingParentSubFeatures && parentSubFeatures.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No sub features yet for this parent.</p>
              ) : null}
              {!loadingParentSubFeatures && parentSubFeatures.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {parentSubFeatures.map((sf) => {
                    const isEditing = Number(editingSubFeature?.id) === Number(sf.id);
                    return (
                      <li
                        key={String(sf.id)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                      >
                        {!isEditing ? (
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[#0C123A]">{sf.sub_feature_name}</p>
                              <p className="truncate text-xs text-slate-500">{sf.sub_feature_path}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => startEditSubFeature(sf)}
                              className="shrink-0 rounded-lg border border-[#0C123A] px-2.5 py-1 text-xs font-semibold text-[#0C123A] transition hover:bg-slate-100"
                            >
                              Edit
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                              Update sub feature family
                            </p>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-slate-600">
                                Parent feature
                              </label>
                              <select
                                value={editParentFeatureId}
                                onChange={(e) =>
                                  setEditParentFeatureId(
                                    e.target.value ? Number(e.target.value) : "",
                                  )
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring-2"
                              >
                                <option value="">Select parent feature</option>
                                {parentFeatures.map((feature) => (
                                  <option key={String(feature.id)} value={Number(feature.id)}>
                                    {feature.feature_name} ({feature.feature_val})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              <input
                                type="text"
                                value={editSubFeatureName}
                                onChange={(e) => setEditSubFeatureName(e.target.value)}
                                placeholder="Sub feature name"
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring-2"
                              />
                              <input
                                type="text"
                                readOnly
                                aria-readonly="true"
                                value={editSubFeaturePath}
                                placeholder="Auto-generated path"
                                title="Generated from the sub feature name"
                                className="cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none"
                              />
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => void updateSubFeature()}
                                disabled={updatingSubFeature}
                                className="inline-flex rounded-lg bg-[#0C123A] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1a2564] disabled:opacity-60"
                              >
                                {updatingSubFeature ? "Saving..." : "Save changes"}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditSubFeature}
                                disabled={updatingSubFeature}
                                className="inline-flex rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-[#0C123A]">Organizations</h2>
        <p className="mt-1 text-sm text-slate-600">
          Assign parent features first, then assign sub features under those parents.
        </p>
        {loadingOrgs ? <p className="mt-4 text-sm text-slate-500">Loading organizations...</p> : null}
        {!loadingOrgs && organizations.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No organizations found.</p>
        ) : null}
        {!loadingOrgs && organizations.length > 0 ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {organizations.map((org) => (
              <article
                key={String(org.id)}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <p className="text-xs text-slate-500">Org ID: {String(org.id)}</p>
                <h3 className="mt-1 text-sm font-semibold text-[#0C123A]">
                  {org.org_name || org.organization_name || "Unknown Organization"}
                </h3>
                <p className="mt-1 text-xs text-slate-600">
                  <span className="font-semibold text-slate-500">Email:</span>{" "}
                  {org.org_email || "No email"}
                </p>
                <p className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-500">Phone:</span>{" "}
                  {org.org_phone || "No phone"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void openAssignModal(org)}
                    className="inline-flex rounded-lg border border-[#0C123A] bg-white px-3 py-1.5 text-xs font-semibold text-[#0C123A] transition hover:bg-slate-100"
                  >
                    Assign a feature
                  </button>
                  <button
                    type="button"
                    onClick={() => void openAssignSubFeaturesModal(org)}
                    className="inline-flex rounded-lg border border-[#0C123A] bg-white px-3 py-1.5 text-xs font-semibold text-[#0C123A] transition hover:bg-slate-100"
                  >
                    Assign sub features
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      {actionMessage ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {actionMessage}
        </div>
      ) : null}

      {showAssignSubFeaturesModal ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-[#0C123A]/50"
            onClick={() => {
              if (assigningSubFeatures) return;
              setShowAssignSubFeaturesModal(false);
              setSelectedOrg(null);
            }}
          />
          <div className="relative z-10 flex h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:h-auto sm:max-h-[85vh] sm:max-w-3xl sm:rounded-2xl">
            <div className="border-b border-slate-200 px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Assign Sub Features
              </p>
              <h3 className="text-lg font-bold text-[#0C123A]">
                {selectedOrg?.org_name || selectedOrg?.organization_name || "Organization"}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Parent feature must already be assigned to this organization.
              </p>
            </div>
            <div className="border-b border-slate-100 px-5 py-3">
              <input
                type="text"
                value={subFeatureSearch}
                onChange={(e) => setSubFeatureSearch(e.target.value)}
                placeholder="Search by sub feature, path, or parent feature..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring-2"
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {loadingAllSubFeatures ? (
                <p className="text-sm text-slate-500">Loading sub features...</p>
              ) : null}
              {!loadingAllSubFeatures && groupedSubFeatures.length === 0 ? (
                <p className="text-sm text-slate-500">No sub features found.</p>
              ) : null}
              {!loadingAllSubFeatures && groupedSubFeatures.length > 0 ? (
                <div className="space-y-4">
                  {groupedSubFeatures.map((group) => (
                    <div key={String(group.parentId)} className="space-y-2">
                      <div className="rounded-lg bg-slate-100 px-3 py-2">
                        <p className="text-sm font-semibold text-[#0C123A]">{group.parentName}</p>
                        <p className="text-xs text-slate-500">{group.parentVal}</p>
                      </div>
                      <div className="space-y-2 pl-1">
                        {group.items.map((subFeature) => {
                          const idNum = Number(subFeature.id);
                          const checked = selectedSubFeatureIds.includes(idNum);
                          return (
                            <label
                              key={String(subFeature.id)}
                              className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const isChecked = e.target.checked;
                                  setSelectedSubFeatureIds((prev) => {
                                    if (isChecked) return [...prev, idNum];
                                    return prev.filter((x) => x !== idNum);
                                  });
                                }}
                                className="mt-0.5 h-4 w-4 rounded border-slate-300"
                              />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[#0C123A]">
                                  {subFeature.sub_feature_name}
                                </p>
                                <p className="truncate text-xs text-slate-500">
                                  {subFeature.sub_feature_path}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="border-t border-slate-200 px-5 py-3">
              <button
                type="button"
                disabled={assigningSubFeatures}
                onClick={() => void assignSubFeaturesToOrg()}
                className="inline-flex w-full items-center justify-center rounded-lg bg-[#0C123A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1a2564] disabled:opacity-60"
              >
                {assigningSubFeatures
                  ? "Assigning..."
                  : `Submit (${selectedSubFeatureIds.length})`}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showAssignModal ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-[#0C123A]/50"
            onClick={() => {
              if (assigning) return;
              setShowAssignModal(false);
              setSelectedOrg(null);
            }}
          />
          <div className="relative z-10 flex h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:h-auto sm:max-h-[85vh] sm:max-w-3xl sm:rounded-2xl">
            <div className="border-b border-slate-200 px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Assign Features</p>
              <h3 className="text-lg font-bold text-[#0C123A]">
                {selectedOrg?.org_name || selectedOrg?.organization_name || "Organization"}
              </h3>
            </div>
            <div className="border-b border-slate-100 px-5 py-3">
              <input
                type="text"
                value={featureSearch}
                onChange={(e) => setFeatureSearch(e.target.value)}
                placeholder="Search by feature name or value..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring-2"
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {loadingFeatures ? <p className="text-sm text-slate-500">Loading features...</p> : null}
              {!loadingFeatures && filteredFeatures.length === 0 ? (
                <p className="text-sm text-slate-500">No features found.</p>
              ) : null}
              {!loadingFeatures && filteredFeatures.length > 0 ? (
                <div className="space-y-2">
                  {filteredFeatures.map((feature) => {
                    const idNum = Number(feature.id);
                    const checked = selectedFeatureIds.includes(idNum);
                    return (
                      <label
                        key={String(feature.id)}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setSelectedFeatureIds((prev) => {
                              if (isChecked) return [...prev, idNum];
                              return prev.filter((x) => x !== idNum);
                            });
                          }}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#0C123A]">{feature.feature_name}</p>
                          <p className="truncate text-xs text-slate-500">{feature.feature_val}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              ) : null}
            </div>
            <div className="border-t border-slate-200 px-5 py-3">
              <button
                type="button"
                disabled={assigning}
                onClick={() => void assignFeaturesToOrg()}
                className="inline-flex w-full items-center justify-center rounded-lg bg-[#0C123A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1a2564] disabled:opacity-60"
              >
                {assigning ? "Assigning..." : `Submit (${selectedFeatureIds.length})`}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {children}
    </div>
  );
}

export default RightSide;