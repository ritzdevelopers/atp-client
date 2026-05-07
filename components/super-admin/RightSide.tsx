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

function RightSide({ children }: { children: React.ReactNode }) {
  const [featureName, setFeatureName] = useState("");
  const [featureVal, setFeatureVal] = useState("");
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
      setAllFeatures(Array.isArray(data.data) ? data.data : []);
    } catch (e) {
      setActionMessage(e instanceof Error ? e.message : "Could not load features");
      setAllFeatures([]);
    } finally {
      setLoadingFeatures(false);
    }
  }

  useEffect(() => {
    void loadOrganizations();
  }, []);

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

  async function createFeature() {
    if (!featureName.trim() || !featureVal.trim()) {
      setActionMessage("Feature name and value are required.");
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
          feature_val: featureVal.trim(),
        }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.message || data.error || "Could not create feature");
      setActionMessage(data.message || "Feature created successfully.");
      setFeatureName("");
      setFeatureVal("");
      if (showAssignModal) await loadFeatures();
    } catch (e) {
      setActionMessage(e instanceof Error ? e.message : "Could not create feature");
    } finally {
      setCreating(false);
    }
  }

  async function openAssignModal(org: OrgRow) {
    setSelectedOrg(org);
    setFeatureSearch("");
    setSelectedFeatureIds([]);
    setShowAssignModal(true);
    await loadFeatures();
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
            value={featureVal}
            onChange={(e) => setFeatureVal(e.target.value)}
            placeholder="Feature value (e.g. manage-employees)"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring-2"
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
        <h2 className="text-xl font-bold text-[#0C123A]">Organizations</h2>
        <p className="mt-1 text-sm text-slate-600">Assign features to organizations.</p>
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
                <button
                  type="button"
                  onClick={() => void openAssignModal(org)}
                  className="mt-3 inline-flex rounded-lg border border-[#0C123A] bg-white px-3 py-1.5 text-xs font-semibold text-[#0C123A] transition hover:bg-slate-100"
                >
                  Assign a feature
                </button>
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