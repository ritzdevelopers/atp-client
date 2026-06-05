"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  Check,
  ChevronRight,
  KeyRound,
  Loader2,
  Puzzle,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type UserFeature = {
  feature_id: number | string;
  feature_name?: string | null;
  feature_val?: string | null;
  is_allowed?: number | boolean | null;
};

type UserRow = {
  user_id: number | string;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  created_at?: string;
  user_role_id?: number | string;
  role_name?: string;
  features?: UserFeature[];
};

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

const mobileCaptionCls = "text-[11px] leading-snug text-[#6B7280]";
const mobileValueCls = "text-[13px] font-semibold text-[#1F2937]";

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

function zohoSearchCls() {
  return "w-full rounded-md border border-[#E4E7EC] bg-white py-2 pl-9 pr-3 text-[13px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15 lg:rounded-lg lg:text-[14px]";
}

function zohoPrimaryBtnCls(full = false) {
  return `inline-flex min-h-[40px] items-center justify-center rounded-lg bg-[#008CD3] px-4 py-2 text-[14px] font-medium text-white transition active:scale-[0.98] hover:bg-[#0070AA] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full" : ""}`;
}

function zohoSecondaryBtnCls(full = false) {
  return `inline-flex min-h-[40px] items-center justify-center rounded-lg border border-[#E4E7EC] bg-white px-3 py-2 text-[13px] font-medium text-[#374151] transition hover:bg-[#F9FAFB] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full" : ""}`;
}

function zohoDangerBtnCls(compact = false) {
  const size = compact
    ? "min-h-[32px] px-2 py-1 text-[11px]"
    : "min-h-[36px] px-2.5 py-1 text-[12px]";
  return `inline-flex ${size} shrink-0 items-center justify-center rounded-md border border-[#F5C6C2] bg-[#FCE8E6] font-medium text-[#D93025] transition active:scale-[0.98] hover:bg-[#FCE8E6]/80 disabled:pointer-events-none disabled:opacity-50`;
}

function displayUserName(user: UserRow) {
  return String(user.user_name || "Unknown User");
}

function displayFeatureName(f: UserFeature) {
  return String(f.feature_name || f.feature_val || `Feature #${f.feature_id}`);
}

export default function GetEmployeeAccessibleFeaturesPage() {
  const params = useParams();
  const orgId = Number(params?.org_id);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [openUserId, setOpenUserId] = useState<number | string | null>(null);
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [mobileMainTab, setMobileMainTab] = useState<"members" | "access">("members");
  const [mobileSelectedUserId, setMobileSelectedUserId] = useState<number | string | null>(
    null,
  );

  const visibleUsers = useMemo(
    () => users.filter((u) => String(u.role_name ?? "").trim().toLowerCase() !== "admin"),
    [users],
  );

  const totalFeatures = useMemo(
    () => visibleUsers.reduce((acc, u) => acc + (u.features?.length ?? 0), 0),
    [visibleUsers],
  );

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return visibleUsers;
    return visibleUsers.filter((u) => {
      const featureNames = (u.features ?? [])
        .map((f) => String(f.feature_name ?? f.feature_val ?? "").toLowerCase())
        .join(" ");
      return (
        String(u.user_name ?? "").toLowerCase().includes(q) ||
        String(u.user_email ?? "").toLowerCase().includes(q) ||
        String(u.user_phone ?? "").toLowerCase().includes(q) ||
        String(u.role_name ?? "").toLowerCase().includes(q) ||
        featureNames.includes(q)
      );
    });
  }, [searchQuery, visibleUsers]);

  const mobileSelectedUser = useMemo(
    () =>
      mobileSelectedUserId != null
        ? (visibleUsers.find((u) => String(u.user_id) === String(mobileSelectedUserId)) ?? null)
        : null,
    [visibleUsers, mobileSelectedUserId],
  );

  const loadUsers = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Not signed in.");
    const q = encodeURIComponent(String(orgId));
    const res = await fetch(
      `${API_URL}/api/organization-features/get-all-organization-members-with-accessible-features-and-roles?org_id=${q}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    const data = (await res.json()) as { users?: UserRow[]; message?: string };
    if (!res.ok) {
      throw new Error(data.message || "Could not load users.");
    }
    setUsers(Array.isArray(data.users) ? data.users : []);
  }, [orgId]);

  useEffect(() => {
    if (!orgId || Number.isNaN(orgId)) {
      setLoading(false);
      setError("Invalid organization.");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setActionMessage(null);

    (async () => {
      try {
        await loadUsers();
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load users.");
          setUsers([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadUsers, orgId]);

  async function refreshAll() {
    setLoading(true);
    setError(null);
    setActionMessage(null);
    try {
      await loadUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load users.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  function selectMobileUser(userId: number | string) {
    setMobileSelectedUserId(userId);
    setMobileMainTab("access");
  }

  async function removeFeatureAccess(userId: number | string, featureId: number | string) {
    const key = `${userId}:${featureId}`;
    setRemovingKey(key);
    setActionMessage(null);
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
          user_id: userId,
          feature_id: featureId,
          is_allowed: 0,
        }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to remove feature access.");
      }
      setActionMessage(data.message || "Feature access removed.");
      await loadUsers();
    } catch (e) {
      setActionMessage(e instanceof Error ? e.message : "Failed to remove feature access.");
    } finally {
      setRemovingKey(null);
    }
  }

  const mobileTabs: Array<{
    id: "members" | "access";
    label: string;
    badge?: number;
  }> = [
    { id: "members", label: "Members", badge: visibleUsers.length },
    {
      id: "access",
      label: "Access",
      badge: mobileSelectedUser?.features?.length,
    },
  ];

  return (
    <section className="min-h-full bg-[#F5F7FA] pb-3 [font-family:var(--font-inter),system-ui,sans-serif] max-lg:-mx-1 sm:max-lg:-mx-2 lg:space-y-5 lg:p-6 lg:pb-8">
      {/* Mobile & tablet: Zoho-style */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-20 border-b border-[#E4E7EC] bg-white shadow-sm">
          <div className="flex items-center gap-2 px-3 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
              <KeyRound className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[15px] font-semibold text-[#1F2937]">
                Feature access
              </h1>
              <p className={`truncate ${mobileCaptionCls}`}>
                {loading
                  ? "Loading…"
                  : mobileSelectedUser
                    ? `${displayUserName(mobileSelectedUser)} · ${mobileSelectedUser.features?.length ?? 0} modules`
                    : `${visibleUsers.length} members · ${totalFeatures} modules`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refreshAll()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#E4E7EC] text-[#008CD3] active:bg-[#F5F7FA]"
              aria-label="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
          <div className="flex gap-0.5 px-3 pb-2.5">
            <div className="flex w-full rounded-md bg-[#F5F7FA] p-0.5">
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

        {error ? (
          <div className="mx-3 mt-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2 text-[12px] text-[#D93025]">
            {error}
          </div>
        ) : null}

        {actionMessage ? (
          <div className="mx-3 mt-2 rounded-lg border border-[#A8DAB5] bg-[#E6F4EA] px-3 py-2 text-[12px] text-[#0F9D58]">
            {actionMessage}
          </div>
        ) : null}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-[#6B7280]">
            <Loader2 className="h-7 w-7 animate-spin text-[#008CD3]" aria-hidden />
            <p className="text-[13px]">Loading members…</p>
          </div>
        ) : null}

        {!loading && !error && mobileMainTab === "members" ? (
          <div>
            <div className="border-b border-[#E4E7EC] bg-white px-3 py-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9CA3AF]" aria-hidden />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search members…"
                  className={zohoSearchCls()}
                />
              </div>
            </div>
            <ul className="divide-y divide-[#E4E7EC] bg-white">
              {filteredUsers.length === 0 ? (
                <li className="px-3 py-12 text-center">
                  <Users className="mx-auto h-8 w-8 text-[#9CA3AF]" aria-hidden />
                  <p className={`mt-3 ${mobileValueCls}`}>No members found</p>
                  <p className={`mt-1 ${mobileCaptionCls}`}>
                    Try another search or refresh the list.
                  </p>
                </li>
              ) : (
                filteredUsers.map((user) => {
                  const name = displayUserName(user);
                  const featureCount = user.features?.length ?? 0;
                  const active =
                    mobileSelectedUserId != null &&
                    String(mobileSelectedUserId) === String(user.user_id);
                  return (
                    <li key={String(user.user_id)}>
                      <button
                        type="button"
                        onClick={() => selectMobileUser(user.user_id)}
                        className="flex w-full items-center gap-2.5 px-3 py-3 text-left active:bg-[#F5F7FA]"
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${avatarColorClass(name)}`}
                        >
                          {userInitials(name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={`truncate ${mobileValueCls}`}>{name}</p>
                          <p className={`truncate ${mobileCaptionCls}`}>
                            {String(user.user_email || "No email")}
                          </p>
                          <p className="truncate text-[10px] text-[#9CA3AF]">
                            {String(user.role_name || "employee")} · {featureCount} module
                            {featureCount === 1 ? "" : "s"}
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
          </div>
        ) : null}

        {!loading && !error && mobileMainTab === "access" ? (
          <div>
            {!mobileSelectedUser ? (
              <div className="mx-3 mt-3 rounded-lg border border-[#E4E7EC] bg-white px-4 py-12 text-center">
                <Users className="mx-auto h-8 w-8 text-[#9CA3AF]" aria-hidden />
                <p className={`mt-3 ${mobileValueCls}`}>Select a member first</p>
                <p className={`mt-1 ${mobileCaptionCls}`}>
                  Go to Members and pick someone to view their module access.
                </p>
                <button
                  type="button"
                  onClick={() => setMobileMainTab("members")}
                  className={`mt-4 ${zohoPrimaryBtnCls(true)}`}
                >
                  Choose member
                </button>
              </div>
            ) : (
              <>
                <div className="border-b border-[#E4E7EC] bg-[#E8F4FB]/50 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#008CD3]">
                    Module access for
                  </p>
                  <p className={mobileValueCls}>{displayUserName(mobileSelectedUser)}</p>
                  <p className={`mt-0.5 truncate ${mobileCaptionCls}`}>
                    {String(mobileSelectedUser.user_email || "No email")} ·{" "}
                    {String(mobileSelectedUser.role_name || "employee")}
                  </p>
                </div>

                {(mobileSelectedUser.features ?? []).length === 0 ? (
                  <div className="mx-3 mt-3 rounded-lg border border-dashed border-[#E4E7EC] bg-white px-4 py-12 text-center">
                    <Puzzle className="mx-auto h-8 w-8 text-[#9CA3AF]" aria-hidden />
                    <p className={`mt-3 ${mobileValueCls}`}>No modules assigned</p>
                    <p className={`mt-1 ${mobileCaptionCls}`}>
                      This member has no accessible organization modules yet.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-[#E4E7EC] bg-white">
                    {(mobileSelectedUser.features ?? []).map((f) => {
                      const key = `${mobileSelectedUser.user_id}:${f.feature_id}`;
                      const removing = removingKey === key;
                      const title = displayFeatureName(f);
                      return (
                        <li key={String(f.feature_id)}>
                          <div className="flex items-start gap-2 px-3 py-3">
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold ${moduleColorClass(title)}`}
                            >
                              {featureInitials(title)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className={`truncate ${mobileValueCls}`}>{title}</p>
                              <p className="text-[10px] text-[#9CA3AF]">
                                ID {String(f.feature_id)}
                              </p>
                              <button
                                type="button"
                                onClick={() =>
                                  void removeFeatureAccess(
                                    mobileSelectedUser.user_id,
                                    f.feature_id,
                                  )
                                }
                                disabled={removing || removingKey !== null}
                                className={`mt-2 ${zohoDangerBtnCls()}`}
                              >
                                {removing ? "Removing…" : "Remove access"}
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
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
              <KeyRound className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h1 className="text-[18px] font-semibold text-[#1F2937]">
                Employee feature access
              </h1>
              <p className="text-[13px] text-[#6B7280]">
                View roles and module access. Expand a member to remove access.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void refreshAll()}
            disabled={loading}
            className={zohoSecondaryBtnCls()}
            aria-label="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
            Refresh
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-[#E4E7EC] bg-white px-4 py-3 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
              Members shown
            </p>
            <p className="mt-0.5 text-2xl font-semibold text-[#1F2937]">{visibleUsers.length}</p>
            <p className="text-[12px] text-[#6B7280]">Admin users are hidden.</p>
          </div>
          <div className="rounded-lg border border-[#E4E7EC] bg-white px-4 py-3 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#008CD3]">
              Accessible modules
            </p>
            <p className="mt-0.5 text-2xl font-semibold text-[#1F2937]">{totalFeatures}</p>
            <p className="text-[12px] text-[#6B7280]">Across all visible members.</p>
          </div>
        </div>

        <div className="rounded-lg border border-[#E4E7EC] bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]"
                aria-hidden
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search user, email, role, module…"
                className={zohoSearchCls()}
              />
            </div>
            <span className="inline-flex shrink-0 rounded-md bg-[#E8F4FB] px-2 py-1 text-[12px] font-medium text-[#008CD3]">
              {filteredUsers.length} result{filteredUsers.length === 1 ? "" : "s"}
            </span>
          </div>
          {actionMessage ? (
            <p className="mt-2 rounded-lg border border-[#A8DAB5] bg-[#E6F4EA] px-3 py-2 text-[13px] text-[#0F9D58]">
              {actionMessage}
            </p>
          ) : null}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-[#E4E7EC] bg-white py-16 text-[#6B7280]">
            <Loader2 className="h-7 w-7 animate-spin text-[#008CD3]" aria-hidden />
            <p className="text-[13px]">Loading members…</p>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-4 py-3 text-[13px] text-[#D93025]">
            {error}
          </div>
        ) : null}

        {!loading && !error && filteredUsers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#E4E7EC] bg-white px-6 py-14 text-center">
            <Users className="mx-auto h-9 w-9 text-[#9CA3AF]" aria-hidden />
            <p className="mt-3 text-[15px] font-semibold text-[#1F2937]">No members found</p>
            <p className="mt-1 text-[13px] text-[#6B7280]">Try a different search term.</p>
          </div>
        ) : null}

        {!loading && !error && filteredUsers.length > 0 ? (
          <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredUsers.map((user) => {
              const userFeatures = user.features ?? [];
              const isOpen = String(openUserId) === String(user.user_id);
              const name = displayUserName(user);
              return (
                <article
                  key={String(user.user_id)}
                  className="rounded-lg border border-[#E4E7EC] bg-white p-3 shadow-sm transition hover:border-[#008CD3]/25"
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${avatarColorClass(name)}`}
                    >
                      {userInitials(name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-[#1F2937]">{name}</p>
                      <p className="truncate text-[12px] text-[#6B7280]">
                        {String(user.user_email || "No email")}
                      </p>
                      <p className="truncate text-[12px] text-[#9CA3AF]">
                        {String(user.user_phone || "No phone")}
                      </p>
                      <span className="mt-1 inline-flex rounded-md bg-[#F5F7FA] px-1.5 py-0.5 text-[10px] font-medium uppercase text-[#6B7280]">
                        {String(user.role_name || "employee")}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                      Module access
                    </p>
                    <button
                      type="button"
                      disabled={userFeatures.length === 0}
                      onClick={() =>
                        setOpenUserId((prev) =>
                          String(prev) === String(user.user_id) ? null : user.user_id,
                        )
                      }
                      className={`${zohoSecondaryBtnCls(true)} disabled:opacity-50`}
                    >
                      {userFeatures.length === 0
                        ? "No modules assigned"
                        : isOpen
                          ? `Hide modules (${userFeatures.length})`
                          : `View modules (${userFeatures.length})`}
                    </button>
                  </div>

                  {isOpen ? (
                    <div className="mt-2 space-y-1.5 rounded-md border border-[#E4E7EC] bg-[#F9FAFB] p-2.5">
                      {userFeatures.map((f) => {
                        const key = `${user.user_id}:${f.feature_id}`;
                        const removing = removingKey === key;
                        const title = displayFeatureName(f);
                        return (
                          <div
                            key={String(f.feature_id)}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#E4E7EC] bg-white px-2 py-1.5"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[12px] font-medium text-[#1F2937]">
                                {title}
                              </p>
                              <p className="text-[10px] text-[#9CA3AF]">
                                ID {String(f.feature_id)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => void removeFeatureAccess(user.user_id, f.feature_id)}
                              disabled={removing || removingKey !== null}
                              className={zohoDangerBtnCls(true)}
                            >
                              {removing ? "Removing…" : "Remove"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
