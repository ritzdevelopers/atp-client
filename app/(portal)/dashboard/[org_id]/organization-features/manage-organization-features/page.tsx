"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type FeatureRow = {
  id: number | string;
  feature_name?: string;
  feature_key?: string;
  feature_description?: string;
  created_at?: string;
  [key: string]: unknown;
};

type EmployeeFeatureRow = {
  user_id: number | string;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  user_role_id?: number | string;
  user_role_name?: string;
  feature_id?: number | string | null;
  feature_is_allowed?: number | boolean | null;
  feature_name?: string | null;
  feature_val?: string | null;
};

type EmployeeCard = {
  user_id: number | string;
  user_name: string;
  user_email: string;
  user_phone: string;
  user_role_name: string;
  features: string[];
};

export default function ManageOrganizationFeaturesPage() {
  const params = useParams();
  const orgId = Number(params?.org_id);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [features, setFeatures] = useState<FeatureRow[]>([]);
  const [assignFeature, setAssignFeature] = useState<FeatureRow | null>(null);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [employeeError, setEmployeeError] = useState<string | null>(null);
  const [employeeRows, setEmployeeRows] = useState<EmployeeFeatureRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadFeatures() {
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
        const res = await fetch(`${API_URL}/api/organization-features/get-organization-features?org_id=${q}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = (await res.json()) as { features?: FeatureRow[]; message?: string };
        if (!res.ok) {
          throw new Error(data.message || "Could not load organization features");
        }
        setFeatures(Array.isArray(data.features) ? data.features : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load organization features");
        setFeatures([]);
      } finally {
        setLoading(false);
      }
    }

    void loadFeatures();
  }, [orgId]);

  const totalFeatures = useMemo(() => features.length, [features.length]);

  const employeeCards = useMemo(() => {
    const grouped = new Map<string, EmployeeCard>();
    for (const row of employeeRows) {
      const role = String(row.user_role_name || "").toLowerCase();
      if (role === "admin") continue;
      const key = String(row.user_id);
      if (!grouped.has(key)) {
        grouped.set(key, {
          user_id: row.user_id,
          user_name: String(row.user_name || "Unknown User"),
          user_email: String(row.user_email || "No email"),
          user_phone: String(row.user_phone || "No phone"),
          user_role_name: String(row.user_role_name || "employee"),
          features: [],
        });
      }
      const card = grouped.get(key)!;
      const featureName = String(row.feature_name || row.feature_val || "").trim();
      if (featureName && !card.features.includes(featureName)) {
        card.features.push(featureName);
      }
    }
    return Array.from(grouped.values());
  }, [employeeRows]);

  const filteredEmployeeCards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return employeeCards;
    return employeeCards.filter((u) => {
      return (
        u.user_name.toLowerCase().includes(q) ||
        u.user_email.toLowerCase().includes(q) ||
        u.user_phone.toLowerCase().includes(q) ||
        u.user_role_name.toLowerCase().includes(q) ||
        u.features.some((f) => f.toLowerCase().includes(q))
      );
    });
  }, [employeeCards, searchQuery]);

  async function openAssignModal(feature: FeatureRow) {
    setAssignFeature(feature);
    setSearchQuery("");
    setEmployeeError(null);
    setEmployeeLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not signed in.");
      const q = encodeURIComponent(String(orgId));
      const res = await fetch(
        `${API_URL}/api/organization-features/get-all-employees-with-accessible-features?org_id=${q}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = (await res.json()) as { employees?: EmployeeFeatureRow[]; message?: string };
      if (!res.ok) {
        throw new Error(data.message || "Could not load employees.");
      }
      setEmployeeRows(Array.isArray(data.employees) ? data.employees : []);
    } catch (e) {
      setEmployeeRows([]);
      setEmployeeError(e instanceof Error ? e.message : "Could not load employees.");
    } finally {
      setEmployeeLoading(false);
    }
  }

  function closeAssignModal() {
    setAssignFeature(null);
    setEmployeeError(null);
    setEmployeeRows([]);
    setSearchQuery("");
  }

  return (
    <section className="space-y-6 p-4 sm:p-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
          Organization Features
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#0C123A] sm:text-3xl">
          Manage Organization Features
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Review all features available for this organization and assign modules as needed.
        </p>
        <div className="mt-4 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {totalFeatures} Feature{totalFeatures === 1 ? "" : "s"}
        </div>
      </header>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Loading features...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      {!loading && !error && features.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
          No features found for this organization.
        </div>
      ) : null}

      {!loading && !error && features.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={String(feature.id)}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Feature #{String(feature.id)}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-[#0C123A]">
                {feature.feature_name || feature.feature_key || "Untitled Feature"}
              </h2>
              <p className="mt-2 min-h-[40px] text-sm text-slate-600">
                {feature.feature_description || "No description available for this feature."}
              </p>

              <button
                type="button"
                onClick={() => void openAssignModal(feature)}
                className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-[#0C123A] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#151e59]"
              >
                Assign
              </button>
            </article>
          ))}
        </div>
      ) : null}

      {assignFeature ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Close assign popup"
            className="absolute inset-0 bg-[#0C123A]/50 backdrop-blur-sm"
            onClick={closeAssignModal}
          />
          <div className="relative z-10 flex h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:h-auto sm:max-h-[80vh] sm:max-w-4xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Assign Feature
                </p>
                <h3 className="text-lg font-bold text-[#0C123A]">
                  {assignFeature.feature_name || assignFeature.feature_key || `Feature #${assignFeature.id}`}
                </h3>
              </div>
              <button
                type="button"
                className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                onClick={closeAssignModal}
              >
                Close
              </button>
            </div>

            <div className="border-b border-slate-100 px-4 py-3 sm:px-6">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                type="text"
                placeholder="Search by name, email, role, phone, feature..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring-2"
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
              {employeeLoading ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
                  Loading employees...
                </div>
              ) : null}

              {employeeError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {employeeError}
                </div>
              ) : null}

              {!employeeLoading && !employeeError && filteredEmployeeCards.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-500">
                  No employee matched your search.
                </div>
              ) : null}

              {!employeeLoading && !employeeError && filteredEmployeeCards.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {filteredEmployeeCards.map((user) => (
                    <article
                      key={String(user.user_id)}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src={`https://i.pravatar.cc/120?u=${encodeURIComponent(String(user.user_id))}`}
                          alt={user.user_name}
                          className="h-12 w-12 rounded-full object-cover ring-1 ring-slate-200"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#0C123A]">{user.user_name}</p>
                          <p className="truncate text-xs text-slate-500">{user.user_email}</p>
                          <p className="mt-1 text-xs text-slate-500">{user.user_phone}</p>
                          <span className="mt-2 inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                            {user.user_role_name}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Assigned Features
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {user.features.length > 0 ? (
                            user.features.slice(0, 5).map((f) => (
                              <span
                                key={f}
                                className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700"
                              >
                                {f}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-500">No features assigned</span>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}