"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

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

  return (
    <section className="space-y-6 bg-slate-50/60 p-4 sm:p-6">
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
            <p className="mt-1 text-2xl font-bold text-[#0C123A]">
              {visibleUsers.length}
            </p>
            <p className="text-xs text-slate-500">Admin users are hidden for security.</p>
          </div>
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700">Accessible features</p>
            <p className="mt-1 text-2xl font-bold text-indigo-900">
              {totalFeatures}
            </p>
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
        {actionMessage ? <p className="mt-3 text-sm font-medium text-slate-700">{actionMessage}</p> : null}
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
                    <p className="truncate text-xs text-slate-500">{String(user.user_email || "No email")}</p>
                    <p className="mt-1 text-xs text-slate-500">{String(user.user_phone || "No phone")}</p>
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
                      setOpenUserId((prev) => (String(prev) === String(user.user_id) ? null : user.user_id))
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
                            <p className="text-[11px] text-slate-500">Feature ID: {String(f.feature_id)}</p>
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
    </section>
  );
}