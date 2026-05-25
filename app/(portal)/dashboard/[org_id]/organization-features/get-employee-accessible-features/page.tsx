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

function searchFieldCls() {
  return "w-full rounded-lg border-0 bg-[#F0F2F5] py-2.5 pl-10 pr-4 text-[15px] text-[#111B21] outline-none transition placeholder:text-[#8696A0] focus:bg-white focus:ring-1 focus:ring-[#25D366]/40 lg:rounded-lg lg:border lg:border-slate-200 lg:bg-white lg:py-2 lg:pl-3 lg:text-sm lg:focus:ring-2 lg:focus:ring-indigo-200";
}

function waPrimaryBtnCls() {
  return "inline-flex min-h-[40px] items-center justify-center rounded-lg bg-[#25D366] px-4 py-2 text-[14px] font-medium text-white transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";
}

function waDangerBtnCls() {
  return "inline-flex min-h-[36px] shrink-0 items-center justify-center rounded-lg border border-[#FFCDD2] bg-[#FFECEC] px-3 py-1.5 text-[13px] font-medium text-[#C62828] transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 lg:rounded-md lg:border-red-200 lg:bg-red-50 lg:text-[11px] lg:font-semibold lg:hover:bg-red-100";
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
    <section className="min-h-full bg-[#F0F2F5] lg:bg-slate-50/60 lg:space-y-6 lg:p-4 lg:sm:p-6">
      {/* Mobile & tablet: WhatsApp-style shell */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-20 bg-[#128C7E] text-white shadow-sm">
          <div className="flex items-center gap-1 px-1 py-2">
            <div className="min-w-0 flex-1 px-2 py-1">
              <h1 className="truncate text-[17px] font-medium leading-tight">
                Feature access
              </h1>
              <p className="truncate text-[13px] text-white/75">
                {loading
                  ? "Loading…"
                  : mobileSelectedUser
                    ? `${displayUserName(mobileSelectedUser)} · ${mobileSelectedUser.features?.length ?? 0} features`
                    : `${visibleUsers.length} members · ${totalFeatures} features`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refreshAll()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full active:bg-white/10"
              aria-label="Refresh"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
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

        {error ? (
          <div className="mx-3 mt-3 rounded-lg bg-[#FFECEC] px-4 py-3 text-[14px] text-[#8B1A1A]">
            {error}
          </div>
        ) : null}

        {actionMessage ? (
          <div className="mx-3 mt-3 rounded-lg bg-[#E7FCE3] px-4 py-3 text-[14px] text-[#0B5E44]">
            {actionMessage}
          </div>
        ) : null}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-[#667781]">
            <Loader2 className="h-9 w-9 animate-spin text-[#128C7E]" />
            <p className="text-[15px]">Loading users…</p>
          </div>
        ) : null}

        {!loading && !error && mobileMainTab === "members" ? (
          <div>
            <div className="bg-white px-3 py-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8696A0]" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search members"
                  className={searchFieldCls()}
                />
              </div>
            </div>
            <ul className="mt-1 divide-y divide-[#E9EDEF] bg-white">
              {filteredUsers.length === 0 ? (
                <li className="px-4 py-16 text-center">
                  <Users className="mx-auto h-10 w-10 text-[#8696A0]" />
                  <p className="mt-4 text-[17px] font-medium text-[#111B21]">No members found</p>
                  <p className="mt-2 text-[14px] text-[#667781]">
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
                        className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-[#F0F2F5]"
                      >
                        <span
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-medium ${avatarColorClass(name)}`}
                        >
                          {userInitials(name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[17px] text-[#111B21]">{name}</p>
                          <p className="truncate text-[14px] text-[#667781]">
                            {String(user.user_email || "No email")}
                          </p>
                          <p className="truncate text-[13px] text-[#8696A0]">
                            {String(user.role_name || "employee")} · {featureCount} feature
                            {featureCount === 1 ? "" : "s"}
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
          </div>
        ) : null}

        {!loading && !error && mobileMainTab === "access" ? (
          <div>
            {!mobileSelectedUser ? (
              <div className="mx-3 mt-4 rounded-lg bg-white px-6 py-16 text-center">
                <Users className="mx-auto h-10 w-10 text-[#8696A0]" />
                <p className="mt-4 text-[17px] font-medium text-[#111B21]">Select a member first</p>
                <p className="mt-2 text-[14px] text-[#667781]">
                  Go to the Members tab and pick someone to view their feature access.
                </p>
                <button
                  type="button"
                  onClick={() => setMobileMainTab("members")}
                  className={`mt-6 ${waPrimaryBtnCls()}`}
                >
                  Choose member
                </button>
              </div>
            ) : (
              <>
                <div className="bg-[#128C7E]/10 px-4 py-3">
                  <p className="text-[13px] text-[#667781]">Feature access for</p>
                  <p className="text-[17px] font-medium text-[#111B21]">
                    {displayUserName(mobileSelectedUser)}
                  </p>
                  <p className="mt-0.5 truncate text-[14px] text-[#667781]">
                    {String(mobileSelectedUser.user_email || "No email")} ·{" "}
                    {String(mobileSelectedUser.role_name || "employee")}
                  </p>
                </div>

                {(mobileSelectedUser.features ?? []).length === 0 ? (
                  <div className="mx-3 mt-4 rounded-lg bg-white px-6 py-16 text-center">
                    <Puzzle className="mx-auto h-10 w-10 text-[#8696A0]" />
                    <p className="mt-4 text-[17px] font-medium text-[#111B21]">No features assigned</p>
                    <p className="mt-2 text-[14px] text-[#667781]">
                      This member has no accessible organization features yet.
                    </p>
                  </div>
                ) : (
                  <ul className="mt-1 divide-y divide-[#E9EDEF] bg-white">
                    {(mobileSelectedUser.features ?? []).map((f) => {
                      const key = `${mobileSelectedUser.user_id}:${f.feature_id}`;
                      const removing = removingKey === key;
                      const title = displayFeatureName(f);
                      return (
                        <li key={String(f.feature_id)}>
                          <div className="flex items-center gap-3 px-4 py-3.5">
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#E7FCE3] text-sm font-medium text-[#0B5E44]">
                              {featureInitials(title)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[17px] text-[#111B21]">{title}</p>
                              <p className="text-[13px] text-[#8696A0]">
                                ID {String(f.feature_id)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                void removeFeatureAccess(mobileSelectedUser.user_id, f.feature_id)
                              }
                              disabled={removing || removingKey !== null}
                              className={waDangerBtnCls()}
                            >
                              {removing ? "Removing…" : "Remove"}
                            </button>
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

      {/* Desktop layout (unchanged) */}
      <div className="hidden space-y-6 lg:block">
        <header className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-indigo-50 p-5 shadow-sm sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
            Organization Features
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#0C123A] sm:text-3xl">
            Employee Feature Access
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            View all organization users with their roles and feature access. Expand a user card to see feature
            dropdown and remove access.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Members shown</p>
              <p className="mt-1 text-2xl font-bold text-[#0C123A]">{visibleUsers.length}</p>
              <p className="text-xs text-slate-500">Admin users are hidden for security.</p>
            </div>
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
                Accessible features
              </p>
              <p className="mt-1 text-2xl font-bold text-indigo-900">{totalFeatures}</p>
              <p className="text-xs text-indigo-700">Across all visible users.</p>
            </div>
            <span className="hidden" aria-hidden>
              {totalFeatures} Accessible Feature{totalFeatures === 1 ? "" : "s"}
            </span>
          </div>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by user, email, phone, role, feature..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring-2"
            />
            <span className="inline-flex shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {filteredUsers.length} Result{filteredUsers.length === 1 ? "" : "s"}
            </span>
          </div>
          {actionMessage ? (
            <p className="mt-3 text-sm font-medium text-slate-700">{actionMessage}</p>
          ) : null}
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Loading users...
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : null}

        {!loading && !error && filteredUsers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            No users found.
          </div>
        ) : null}

        {!loading && !error && filteredUsers.length > 0 ? (
          <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredUsers.map((user) => {
              const userFeatures = user.features ?? [];
              const isOpen = String(openUserId) === String(user.user_id);
              return (
                <article
                  key={String(user.user_id)}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={`https://i.pravatar.cc/120?u=${encodeURIComponent(String(user.user_id))}`}
                      alt={String(user.user_name || "User")}
                      className="h-12 w-12 rounded-full object-cover ring-1 ring-slate-200"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#0C123A]">
                        {String(user.user_name || "Unknown User")}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {String(user.user_email || "No email")}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {String(user.user_phone || "No phone")}
                      </p>
                      <span className="mt-2 inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                        {String(user.role_name || "employee")}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Feature Access
                    </p>
                    <button
                      type="button"
                      disabled={userFeatures.length === 0}
                      onClick={() =>
                        setOpenUserId((prev) =>
                          String(prev) === String(user.user_id) ? null : user.user_id,
                        )
                      }
                      className="inline-flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {userFeatures.length === 0
                        ? "No accessible features"
                        : isOpen
                          ? `Hide features (${userFeatures.length})`
                          : `Show features (${userFeatures.length})`}
                    </button>
                  </div>

                  {isOpen ? (
                    <div className="mt-3 space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
                      {userFeatures.map((f) => {
                        const key = `${user.user_id}:${f.feature_id}`;
                        const removing = removingKey === key;
                        return (
                          <div
                            key={String(f.feature_id)}
                            className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-[#0C123A]">
                                {String(f.feature_name || f.feature_val || `Feature #${f.feature_id}`)}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                Feature ID: {String(f.feature_id)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => void removeFeatureAccess(user.user_id, f.feature_id)}
                              disabled={removing || removingKey !== null}
                              className="shrink-0 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {removing ? "Removing..." : "Remove access"}
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
