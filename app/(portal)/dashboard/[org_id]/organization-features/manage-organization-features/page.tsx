"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ChevronRight,
  LayoutGrid,
  Loader2,
  Puzzle,
  RefreshCw,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

/** Zoho admin portal–inspired palette */
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
  danger: "#D93025",
  dangerSoft: "#FCE8E6",
};

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

const MODULE_ICON_COLORS = [
  "bg-[#E8F4FB] text-[#008CD3]",
  "bg-[#E6F4EA] text-[#0F9D58]",
  "bg-[#FEF3E6] text-[#E8710A]",
  "bg-[#F3E8FD] text-[#7B1FA2]",
  "bg-[#FCE8E6] text-[#D93025]",
  "bg-[#E8EAF6] text-[#3F51B5]",
  "bg-[#E0F2F1] text-[#00796B]",
  "bg-[#FFF8E1] text-[#F9A825]",
];

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

function featureInitials(name: string) {
  const cleaned = name.trim();
  if (!cleaned) return "?";
  return cleaned.slice(0, 2).toUpperCase();
}

function displayFeatureTitle(feature: FeatureRow) {
  return feature.feature_name || feature.feature_key || "Untitled Feature";
}

const mobileCaptionCls = "text-[11px] leading-snug text-[#6B7280]";
const mobileValueCls = "text-[13px] font-semibold text-[#1F2937]";

function zohoSearchCls() {
  return "w-full rounded-md border border-[#E4E7EC] bg-white py-2 pl-9 pr-3 text-[13px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15 lg:rounded-lg lg:py-2 lg:text-[14px]";
}

function zohoPrimaryBtnCls(full = false, compact = false) {
  const size = compact
    ? "min-h-[36px] px-3 py-1.5 text-[12px]"
    : "min-h-[40px] px-4 py-2 text-[14px]";
  return `inline-flex ${size} items-center justify-center gap-1.5 rounded-lg bg-[#008CD3] font-medium text-white transition active:scale-[0.98] hover:bg-[#0070AA] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full" : ""}`;
}

function zohoSecondaryBtnCls(full = false) {
  return `inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-[#E4E7EC] bg-white px-3 py-2 text-[13px] font-medium text-[#374151] transition hover:bg-[#F9FAFB] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full" : ""}`;
}

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
  const [featureSearchQuery, setFeatureSearchQuery] = useState("");
  const [assigningUserId, setAssigningUserId] = useState<number | string | null>(null);
  const [assignInlineError, setAssignInlineError] = useState<string | null>(null);
  const [openUserId, setOpenUserId] = useState<number | string | null>(null);
  const [mobileMainTab, setMobileMainTab] = useState<"features" | "overview">("features");

  const loadFeatures = useCallback(async () => {
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
        `${API_URL}/api/organization-features/get-organization-features?org_id=${q}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
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
  }, [orgId]);

  useEffect(() => {
    void loadFeatures();
  }, [loadFeatures]);

  const totalFeatures = useMemo(() => features.length, [features.length]);

  const filteredFeatures = useMemo(() => {
    const q = featureSearchQuery.trim().toLowerCase();
    if (!q) return features;
    return features.filter((f) => {
      const name = displayFeatureTitle(f).toLowerCase();
      const desc = String(f.feature_description ?? "").toLowerCase();
      const key = String(f.feature_key ?? "").toLowerCase();
      return name.includes(q) || desc.includes(q) || key.includes(q);
    });
  }, [features, featureSearchQuery]);

  const employeeCards = useMemo(() => {
    const cards: EmployeeCard[] = [];
    for (const emp of employeeRows) {
      const role = String(emp.user_role_name || "").toLowerCase();
      if (role === "admin") continue;
      const featNames: string[] = [];
      const featureAccessById: Record<string, number | boolean | null | undefined> = {};
      for (const f of emp.features_access ?? []) {
        const name = String(f.feature_name ?? f.feature_val ?? "").trim();
        if (name && !featNames.includes(name)) featNames.push(name);
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
        features: featNames,
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
          headers: { Authorization: `Bearer ${token}` },
        },
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

  function closeAssignModal() {
    setAssignFeature(null);
    setEmployeeError(null);
    setEmployeeRows([]);
    setSearchQuery("");
    setAssignInlineError(null);
    setAssigningUserId(null);
    setOpenUserId(null);
  }

  function renderAssignButton(user: EmployeeCard) {
    if (!assignFeature) return null;
    const selectedFeatureStatus = user.featureAccessById[String(assignFeature.id)];
    const isAssigned = selectedFeatureStatus === 1 || selectedFeatureStatus === true;
    const canReassign = selectedFeatureStatus === 0 || selectedFeatureStatus === false;
    const isBusy = assigningUserId !== null && String(assigningUserId) === String(user.user_id);
    const noRole =
      user.user_role_id === undefined ||
      user.user_role_id === null ||
      user.user_role_id === "";

    return (
      <button
        type="button"
        disabled={assigningUserId !== null || isAssigned || noRole}
        onClick={() => {
          if (canReassign) {
            void reassignFeatureToUser(user);
            return;
          }
          void assignFeatureToUser(user);
        }}
        className={
          isAssigned
            ? "inline-flex min-h-[36px] shrink-0 items-center justify-center rounded-lg bg-[#E6F4EA] px-2.5 py-1 text-[12px] font-medium text-[#0F9D58]"
            : zohoPrimaryBtnCls(false, true)
        }
      >
        {isBusy ? "Assigning…" : isAssigned ? "Assigned" : "Assign"}
      </button>
    );
  }

  const mobileTabs = [
    { id: "features" as const, label: "Modules", count: totalFeatures },
    { id: "overview" as const, label: "Overview" },
  ];

  return (
    <section
      className="min-h-full pb-3 [font-family:var(--font-inter),system-ui,sans-serif] max-lg:-mx-1 sm:max-lg:-mx-2 lg:space-y-5 lg:p-6 lg:pb-8"
      style={{ backgroundColor: ZOHO.bg }}
    >
      {/* Mobile & tablet: Zoho admin portal style */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-20 border-b border-[#E4E7EC] bg-white shadow-sm">
          <div className="flex items-center gap-2 px-3 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
              <LayoutGrid className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[15px] font-semibold text-[#1F2937]">
                Organization modules
              </h1>
              <p className={`truncate ${mobileCaptionCls}`}>
                {loading
                  ? "Loading modules…"
                  : `${totalFeatures} module${totalFeatures === 1 ? "" : "s"}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadFeatures()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#E4E7EC] text-[#008CD3] active:bg-[#F5F7FA]"
              aria-label="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="px-3 pb-2.5">
            <div className="flex gap-0.5 rounded-md bg-[#F5F7FA] p-0.5">
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
                  {"count" in tab && tab.count != null ? (
                    <span
                      className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[10px] ${
                        mobileMainTab === tab.id
                          ? "bg-[#E8F4FB] text-[#008CD3]"
                          : "bg-[#E4E7EC] text-[#6B7280]"
                      }`}
                    >
                      {tab.count > 99 ? "99+" : tab.count}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          {mobileMainTab === "features" ? (
            <div className="border-t border-[#E4E7EC] px-3 py-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="search"
                  value={featureSearchQuery}
                  onChange={(e) => setFeatureSearchQuery(e.target.value)}
                  placeholder="Search modules"
                  className={zohoSearchCls()}
                />
              </div>
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="mx-3 mt-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2 text-[12px] text-[#D93025]">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-[#6B7280]">
            <Loader2 className="h-7 w-7 animate-spin text-[#008CD3]" aria-hidden />
            <p className="text-[13px]">Loading modules…</p>
          </div>
        ) : null}

        {!loading && !error && mobileMainTab === "overview" ? (
          <div className="space-y-2 p-3">
            <div className="rounded-lg border border-[#E4E7EC] bg-white p-3 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                Organization modules
              </p>
              <p className="mt-0.5 text-2xl font-semibold text-[#1F2937]">{totalFeatures}</p>
              <p className={`mt-0.5 ${mobileCaptionCls}`}>
                Features enabled for this organization.
              </p>
            </div>
            <div className="rounded-lg border border-[#E4E7EC] bg-white p-3 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                How it works
              </p>
              <ul className="mt-2 space-y-2 text-[12px] text-[#4B5563]">
                <li className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E8F4FB] text-[11px] font-semibold text-[#008CD3]">
                    1
                  </span>
                  Browse modules under the Modules tab.
                </li>
                <li className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E8F4FB] text-[11px] font-semibold text-[#008CD3]">
                    2
                  </span>
                  Tap Assign to open the employee picker.
                </li>
                <li className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E8F4FB] text-[11px] font-semibold text-[#008CD3]">
                    3
                  </span>
                  Grant access to individual team members.
                </li>
              </ul>
            </div>
          </div>
        ) : null}

        {!loading && !error && mobileMainTab === "features" && features.length === 0 ? (
          <div className="mx-3 mt-3 rounded-lg border border-dashed border-[#E4E7EC] bg-white px-4 py-12 text-center">
            <Puzzle className="mx-auto h-8 w-8 text-[#9CA3AF]" aria-hidden />
            <p className={`mt-3 ${mobileValueCls}`}>No modules found</p>
            <p className={`mt-1 ${mobileCaptionCls}`}>
              No features are configured for this organization yet.
            </p>
          </div>
        ) : null}

        {!loading && !error && mobileMainTab === "features" && features.length > 0 ? (
          <ul className="mt-1 divide-y divide-[#E4E7EC] border-t border-[#E4E7EC] bg-white">
            {filteredFeatures.length === 0 ? (
              <li className="px-3 py-10 text-center text-[13px] text-[#6B7280]">
                No modules match your search.
              </li>
            ) : (
              filteredFeatures.map((feature) => {
                const title = displayFeatureTitle(feature);
                return (
                  <li key={String(feature.id)}>
                    <div className="flex items-start gap-2.5 px-3 py-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold ${moduleColorClass(title)}`}
                      >
                        {featureInitials(title)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={mobileValueCls}>{title}</p>
                        <p className={`mt-0.5 line-clamp-2 ${mobileCaptionCls}`}>
                          {feature.feature_description || "No description available."}
                        </p>
                        <p className="mt-0.5 text-[10px] text-[#9CA3AF]">
                          ID {String(feature.id)}
                        </p>
                        <button
                          type="button"
                          onClick={() => void openAssignModal(feature)}
                          className={`mt-2 ${zohoPrimaryBtnCls(true)}`}
                        >
                          <UserPlus className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          Assign to employee
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        ) : null}
      </div>

      {/* Desktop: Zoho-style */}
      <div className="mx-auto hidden max-w-6xl space-y-5 lg:block">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
              <LayoutGrid className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h1 className="text-[18px] font-semibold text-[#1F2937]">
                Organization modules
              </h1>
              <p className="text-[13px] text-[#6B7280]">
                Review features and assign access to team members.
              </p>
              <span className="mt-2 inline-flex rounded-md bg-[#E8F4FB] px-2 py-0.5 text-[12px] font-medium text-[#008CD3]">
                {totalFeatures} module{totalFeatures === 1 ? "" : "s"}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full min-w-[14rem] sm:max-w-xs">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]"
                aria-hidden
              />
              <input
                type="search"
                value={featureSearchQuery}
                onChange={(e) => setFeatureSearchQuery(e.target.value)}
                placeholder="Search modules…"
                disabled={loading || !!error}
                className={zohoSearchCls()}
              />
            </div>
            <button
              type="button"
              onClick={() => void loadFeatures()}
              disabled={loading}
              className={zohoSecondaryBtnCls()}
              aria-label="Refresh modules"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-[#E4E7EC] bg-white py-16 text-[#6B7280]">
            <Loader2 className="h-7 w-7 animate-spin text-[#008CD3]" aria-hidden />
            <p className="text-[13px]">Loading modules…</p>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-4 py-3 text-[13px] text-[#D93025]">
            {error}
          </div>
        ) : null}

        {!loading && !error && features.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#E4E7EC] bg-white px-6 py-14 text-center">
            <Puzzle className="mx-auto h-9 w-9 text-[#9CA3AF]" aria-hidden />
            <p className="mt-3 text-[15px] font-semibold text-[#1F2937]">No modules found</p>
            <p className="mt-1 text-[13px] text-[#6B7280]">
              No features are configured for this organization yet.
            </p>
          </div>
        ) : null}

        {!loading && !error && features.length > 0 && filteredFeatures.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-[#6B7280]">
            No modules match your search.
          </p>
        ) : null}

        {!loading && !error && filteredFeatures.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredFeatures.map((feature) => {
              const title = displayFeatureTitle(feature);
              return (
                <article
                  key={String(feature.id)}
                  className="flex flex-col rounded-lg border border-[#E4E7EC] bg-white p-4 shadow-sm transition hover:border-[#008CD3]/25"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[12px] font-semibold ${moduleColorClass(title)}`}
                    >
                      {featureInitials(title)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-[#9CA3AF]">
                        Module #{String(feature.id)}
                      </p>
                      <h2 className="mt-0.5 text-[15px] font-semibold text-[#1F2937]">{title}</h2>
                    </div>
                  </div>
                  <p className="mt-2 min-h-[2.5rem] flex-1 text-[13px] leading-snug text-[#6B7280]">
                    {feature.feature_description || "No description available."}
                  </p>
                  <button
                    type="button"
                    onClick={() => void openAssignModal(feature)}
                    className={`mt-3 ${zohoPrimaryBtnCls(true)}`}
                  >
                    <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
                    Assign to employee
                  </button>
                </article>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* Assign modal — Zoho-style */}
      {assignFeature ? (
        <div className="fixed inset-0 z-[10060] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Close assign popup"
            className="absolute inset-0 bg-black/50"
            onClick={closeAssignModal}
          />
          <div className="relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-lg border border-[#E4E7EC] bg-white shadow-xl sm:max-h-[85vh] sm:max-w-4xl sm:rounded-lg">
            <div className="shrink-0 border-b border-[#E4E7EC] border-t-[3px] border-t-[#008CD3] bg-white px-3 py-2.5 sm:px-5 sm:py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#008CD3]">
                    Assign module
                  </p>
                  <h3 className="truncate text-[15px] font-semibold text-[#1F2937] sm:text-[16px]">
                    {displayFeatureTitle(assignFeature)}
                  </h3>
                  <p className={`mt-0.5 ${mobileCaptionCls} sm:text-[13px]`}>
                    Select employees to grant access
                  </p>
                </div>
                <button
                  type="button"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#E4E7EC] text-[#6B7280] hover:bg-[#F9FAFB] sm:h-9 sm:w-auto sm:gap-1 sm:px-3"
                  onClick={closeAssignModal}
                  aria-label="Close"
                >
                  <X className="h-4 w-4 sm:shrink-0" aria-hidden />
                  <span className="hidden text-[13px] font-medium sm:inline">Close</span>
                </button>
              </div>
            </div>

            <div className="shrink-0 border-b border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5 sm:bg-white sm:px-5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9CA3AF] sm:h-4 sm:w-4" aria-hidden />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  type="search"
                  placeholder="Search employees…"
                  className={zohoSearchCls()}
                />
              </div>
              {assignInlineError ? (
                <p className="mt-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2 text-[12px] text-[#D93025]">
                  {assignInlineError}
                </p>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-[#F5F7FA] sm:px-5 sm:py-4">
              {employeeLoading ? (
                <div className="flex flex-col items-center justify-center gap-2 py-14 text-[#6B7280]">
                  <Loader2 className="h-7 w-7 animate-spin text-[#008CD3]" aria-hidden />
                  <p className="text-[13px]">Loading employees…</p>
                </div>
              ) : null}

              {employeeError ? (
                <div className="mx-3 mt-3 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2 text-[12px] text-[#D93025] sm:mx-0">
                  {employeeError}
                </div>
              ) : null}

              {!employeeLoading && !employeeError && filteredEmployeeCards.length === 0 ? (
                <div className="mx-3 mt-3 rounded-lg border border-dashed border-[#E4E7EC] bg-white px-4 py-10 text-center sm:mx-0">
                  <Users className="mx-auto h-8 w-8 text-[#9CA3AF]" aria-hidden />
                  <p className="mt-2 text-[14px] font-medium text-[#1F2937]">No employees found</p>
                  <p className={`mt-0.5 ${mobileCaptionCls}`}>Try a different search term.</p>
                </div>
              ) : null}

              {!employeeLoading && !employeeError && filteredEmployeeCards.length > 0 ? (
                <>
                  {/* Mobile & tablet: flat Zoho list */}
                  <ul className="divide-y divide-[#E4E7EC] bg-white lg:hidden">
                    {filteredEmployeeCards.map((user) => {
                      const isExpanded = String(openUserId) === String(user.user_id);
                      return (
                        <li key={String(user.user_id)}>
                          <div className="px-3 py-3">
                            <div className="flex items-start gap-2">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E8F4FB] text-[11px] font-semibold text-[#008CD3]">
                                {userInitials(user.user_name)}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-1">
                                  <div className="min-w-0 flex-1">
                                    <p className={`truncate ${mobileValueCls}`}>{user.user_name}</p>
                                    <p className={`truncate ${mobileCaptionCls}`}>{user.user_email}</p>
                                    <span className="mt-0.5 inline-flex rounded-md bg-[#F5F7FA] px-1.5 py-0.5 text-[10px] font-medium uppercase text-[#6B7280]">
                                      {user.user_role_name}
                                    </span>
                                  </div>
                                  <div className="shrink-0">{renderAssignButton(user)}</div>
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setOpenUserId((prev) =>
                                  String(prev) === String(user.user_id) ? null : user.user_id,
                                )
                              }
                              className="mt-2 flex w-full items-center justify-between rounded-md border border-[#E4E7EC] bg-[#F9FAFB] px-2.5 py-1.5 text-[12px] font-medium text-[#4B5563]"
                            >
                              <span>
                                {user.features.length} module
                                {user.features.length === 1 ? "" : "s"}
                              </span>
                              <ChevronRight
                                className={`h-3.5 w-3.5 shrink-0 transition ${isExpanded ? "rotate-90" : ""}`}
                                aria-hidden
                              />
                            </button>
                            {isExpanded ? (
                              <div className="mt-1.5 flex flex-wrap gap-1 rounded-md border border-[#E4E7EC] bg-[#F9FAFB] p-2">
                                {user.features.length > 0 ? (
                                  user.features.map((f) => (
                                    <span
                                      key={f}
                                      className="rounded-md bg-white px-1.5 py-0.5 text-[11px] font-medium text-[#4B5563] ring-1 ring-[#E4E7EC]"
                                    >
                                      {f}
                                    </span>
                                  ))
                                ) : (
                                  <span className={mobileCaptionCls}>No modules assigned yet</span>
                                )}
                              </div>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  {/* Desktop: Zoho card grid */}
                  <div className="hidden gap-3 sm:grid-cols-2 lg:grid">
                    {filteredEmployeeCards.map((user) => {
                      const selectedFeatureStatus = assignFeature
                        ? user.featureAccessById[String(assignFeature.id)]
                        : undefined;
                      const isAssigned =
                        selectedFeatureStatus === 1 || selectedFeatureStatus === true;
                      const isExpanded = String(openUserId) === String(user.user_id);
                      const isBusy =
                        assigningUserId !== null &&
                        String(assigningUserId) === String(user.user_id);
                      const noRole =
                        user.user_role_id === undefined ||
                        user.user_role_id === null ||
                        user.user_role_id === "";

                      return (
                        <article
                          key={String(user.user_id)}
                          className="rounded-lg border border-[#E4E7EC] bg-white p-3 shadow-sm"
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E8F4FB] text-[12px] font-semibold text-[#008CD3]">
                              {userInitials(user.user_name)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[14px] font-semibold text-[#1F2937]">
                                {user.user_name}
                              </p>
                              <p className="truncate text-[12px] text-[#6B7280]">{user.user_email}</p>
                              <p className="truncate text-[12px] text-[#9CA3AF]">{user.user_phone}</p>
                              <span className="mt-1 inline-flex rounded-md bg-[#F5F7FA] px-1.5 py-0.5 text-[10px] font-medium uppercase text-[#6B7280]">
                                {user.user_role_name}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setOpenUserId((prev) =>
                                  String(prev) === String(user.user_id) ? null : user.user_id,
                                )
                              }
                              className={zohoSecondaryBtnCls()}
                            >
                              {isExpanded ? "Hide modules" : "View modules"}
                            </button>
                            <button
                              type="button"
                              disabled={assigningUserId !== null || isAssigned || noRole}
                              onClick={() => {
                                if (
                                  selectedFeatureStatus === 0 ||
                                  selectedFeatureStatus === false
                                ) {
                                  void reassignFeatureToUser(user);
                                  return;
                                }
                                void assignFeatureToUser(user);
                              }}
                              className={
                                isAssigned
                                  ? "inline-flex min-h-[40px] items-center justify-center rounded-lg bg-[#E6F4EA] px-3 py-2 text-[13px] font-medium text-[#0F9D58]"
                                  : zohoPrimaryBtnCls()
                              }
                            >
                              {isBusy
                                ? "Assigning…"
                                : isAssigned
                                  ? "Assigned"
                                  : "Assign"}
                            </button>
                          </div>

                          {isExpanded ? (
                            <div className="mt-2 rounded-md border border-[#E4E7EC] bg-[#F9FAFB] p-2.5">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                                Assigned modules
                              </p>
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {user.features.length > 0 ? (
                                  user.features.map((f) => (
                                    <span
                                      key={f}
                                      className="rounded-md bg-white px-1.5 py-0.5 text-[11px] font-medium text-[#4B5563] ring-1 ring-[#E4E7EC]"
                                    >
                                      {f}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[12px] text-[#6B7280]">
                                    No modules assigned yet
                                  </span>
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
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
