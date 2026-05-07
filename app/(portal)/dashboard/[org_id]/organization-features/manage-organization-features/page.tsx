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

type EmployeeApiEmployee = {
  user_id: number | string;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  user_role_id?: number | string;
  user_role_name?: string;
  features_access?: Array<{
    feature_id?: number | string | null;
    feature_is_allowed?: number | boolean | null;
    feature_name?: string | null;
    feature_val?: string | null;
  }>;
};

type EmployeeCard = {
  user_id: number | string;
  user_name: string;
  user_email: string;
  user_phone: string;
  user_role_name: string;
  user_role_id: number | string | undefined;
  features: string[];
  featureAccessById: Record<string, number | boolean | null | undefined>;
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
  const [employeeRows, setEmployeeRows] = useState<EmployeeApiEmployee[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [assigningUserId, setAssigningUserId] = useState<number | string | null>(null);
  const [assignInlineError, setAssignInlineError] = useState<string | null>(null);
  const [openUserId, setOpenUserId] = useState<number | string | null>(null);

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
    const cards: EmployeeCard[] = [];
    for (const emp of employeeRows) {
      const role = String(emp.user_role_name || "").toLowerCase();
      if (role === "admin") continue;
      const features: string[] = [];
      const featureAccessById: Record<string, number | boolean | null | undefined> = {};
      for (const f of emp.features_access ?? []) {
        const name = String(f.feature_name ?? f.feature_val ?? "").trim();
        if (name && !features.includes(name)) features.push(name);
        const fId = f.feature_id;
        if (fId !== undefined && fId !== null && fId !== "") {
          featureAccessById[String(fId)] = f.feature_is_allowed;
        }
      }
      cards.push({
        user_id: emp.user_id,
        user_name: String(emp.user_name || "Unknown User"),
        user_email: String(emp.user_email || "No email"),
        user_phone: String(emp.user_phone || "No phone"),
        user_role_name: String(emp.user_role_name || "employee"),
        user_role_id: emp.user_role_id,
        features,
        featureAccessById,
      });
    }
    return cards;
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

  async function loadEmployeesForModal() {
    setEmployeeLoading(true);
    setEmployeeError(null);
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
      const data = (await res.json()) as { employees?: EmployeeApiEmployee[]; message?: string };
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

  async function openAssignModal(feature: FeatureRow) {
    setAssignFeature(feature);
    setSearchQuery("");
    setAssignInlineError(null);
    await loadEmployeesForModal();
  }

  async function assignFeatureToUser(user: EmployeeCard) {
    if (!assignFeature) return;
    const roleId = user.user_role_id;
    if (roleId === undefined || roleId === null || roleId === "") {
      setAssignInlineError("This user has no role id; cannot assign.");
      return;
    }
    setAssigningUserId(user.user_id);
    setAssignInlineError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not signed in.");
      const res = await fetch(`${API_URL}/api/organization-features/assign-feature-to-employee`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          org_id: orgId,
          user_id: user.user_id,
          user_role_id: roleId,
          feature_id: assignFeature.id,
        }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.message || data.error || "Could not assign feature.");
      }
      await loadEmployeesForModal();
    } catch (e) {
      setAssignInlineError(e instanceof Error ? e.message : "Could not assign feature.");
    } finally {
      setAssigningUserId(null);
    }
  }

  async function reassignFeatureToUser(user: EmployeeCard) {
    if (!assignFeature) return;
    setAssigningUserId(user.user_id);
    setAssignInlineError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not signed in.");
      const res = await fetch(`${API_URL}/api/organization-features/update-feature-of-employee`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          org_id: orgId,
          user_id: user.user_id,
          feature_id: assignFeature.id,
          is_allowed: 1,
        }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.message || data.error || "Could not assign again.");
      }
      await loadEmployeesForModal();
    } catch (e) {
      setAssignInlineError(e instanceof Error ? e.message : "Could not assign again.");
    } finally {
      setAssigningUserId(null);
    }
  }

  async function removeFeatureAccessFromUser(user: EmployeeCard) {
    if (!assignFeature) return;
    setAssigningUserId(user.user_id);
    setAssignInlineError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not signed in.");
      const res = await fetch(`${API_URL}/api/organization-features/update-feature-of-employee`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          org_id: orgId,
          user_id: user.user_id,
          feature_id: assignFeature.id,
          is_allowed: 0,
        }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.message || data.error || "Could not remove access.");
      }
      await loadEmployeesForModal();
    } catch (e) {
      setAssignInlineError(e instanceof Error ? e.message : "Could not remove access.");
    } finally {
      setAssigningUserId(null);
    }
  }

  function closeAssignModal() {
    setAssignFeature(null);
    setEmployeeError(null);
    setEmployeeRows([]);
    setSearchQuery("");
    setAssignInlineError(null);
    setAssigningUserId(null);
    setOpenUserId(null);
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
              {assignInlineError ? (
                <p className="mt-2 text-sm text-red-600">{assignInlineError}</p>
              ) : null}
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
                      {(() => {
                        const selectedFeatureStatus = assignFeature
                          ? user.featureAccessById[String(assignFeature.id)]
                          : undefined;
                        const canAssignAgain =
                          selectedFeatureStatus === 0 || selectedFeatureStatus === false;
                        return (
                          <>
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

                      <button
                        type="button"
                        onClick={() =>
                          setOpenUserId((prev) =>
                            String(prev) === String(user.user_id) ? null : user.user_id,
                          )
                        }
                        className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        {String(openUserId) === String(user.user_id)
                          ? "Hide feature controls"
                          : "Show feature controls"}
                      </button>

                      {String(openUserId) === String(user.user_id) ? (
                        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                            Selected Feature
                          </p>
                          <div className="mt-2 rounded-md border border-slate-200 bg-white p-3">
                            <p className="text-xs font-semibold text-[#0C123A]">
                              {assignFeature?.feature_name ||
                                assignFeature?.feature_key ||
                                `Feature #${assignFeature?.id ?? ""}`}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-500">
                              Status:{" "}
                              {selectedFeatureStatus === 1 || selectedFeatureStatus === true
                                ? "Assigned and allowed"
                                : selectedFeatureStatus === 0 || selectedFeatureStatus === false
                                  ? "Assigned but disabled"
                                  : "Not assigned"}
                            </p>
                            <button
                              type="button"
                              disabled={
                                assigningUserId !== null ||
                                user.user_role_id === undefined ||
                                user.user_role_id === null ||
                                user.user_role_id === ""
                              }
                              onClick={() => {
                                if (selectedFeatureStatus === 1 || selectedFeatureStatus === true) {
                                  void removeFeatureAccessFromUser(user);
                                  return;
                                }
                                if (selectedFeatureStatus === 0 || selectedFeatureStatus === false) {
                                  void reassignFeatureToUser(user);
                                  return;
                                }
                                void assignFeatureToUser(user);
                              }}
                              className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-[#0C123A] bg-white px-3 py-2 text-sm font-semibold text-[#0C123A] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {assigningUserId !== null && String(assigningUserId) === String(user.user_id)
                                ? "Updating…"
                                : selectedFeatureStatus === 1 || selectedFeatureStatus === true
                                  ? "Remove access"
                                  : selectedFeatureStatus === 0 || selectedFeatureStatus === false
                                    ? "Assign again"
                                    : "Assign user feature"}
                            </button>
                          </div>
                        </div>
                      ) : null}
                          </>
                        );
                      })()}
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