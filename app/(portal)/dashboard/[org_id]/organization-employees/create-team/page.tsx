"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Crown,
  Loader2,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { getAllOrgUsers, orgUserListKey, type OrgUserRow } from "@/services/adminUser";
import { createOrgTeam } from "@/services/orgTeams";
import {
  avatarCls,
  btnBrandCls,
  btnGhostCls,
  dashCardCls,
  dashPageCls,
  dashSectionMetaCls,
  iconBadgeCls,
  statBoxCls,
  userInitials,
} from "@/components/portal-dashboard/home/dashboardTokens";

function formatPickerName(row: OrgUserRow) {
  return String(row.user_name ?? "Unknown");
}

function fieldCls() {
  return "w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15";
}

function searchFieldCls() {
  return "w-full rounded-xl border border-slate-200/90 bg-white py-2.5 pl-10 pr-3 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15 disabled:opacity-60";
}

function Shimmer({ className = "" }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-xl ${className}`} />;
}

function PersonListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul className="space-y-2" aria-busy="true" aria-label="Loading people">
      {Array.from({ length: count }).map((_, i) => (
        <li
          key={i}
          className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5"
        >
          <Shimmer className="h-9 w-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Shimmer className="h-3.5 w-2/5" />
            <Shimmer className="h-3 w-3/5" />
          </div>
          <Shimmer className="h-5 w-5 rounded-full" />
        </li>
      ))}
    </ul>
  );
}

function CreateTeamPageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading create team form">
      <div className={`${dashCardCls} overflow-hidden lg:hidden`}>
        <div className="space-y-3 p-4">
          <div className="flex items-center gap-3">
            <Shimmer className="h-9 w-9 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Shimmer className="h-4 w-28" />
              <Shimmer className="h-3 w-40" />
            </div>
            <Shimmer className="h-9 w-16 rounded-xl" />
          </div>
          <div className="flex gap-2">
            <Shimmer className="h-9 flex-1" />
            <Shimmer className="h-9 flex-1" />
            <Shimmer className="h-9 flex-1" />
          </div>
          <Shimmer className="h-10 w-full" />
          <Shimmer className="h-20 w-full" />
        </div>
      </div>

      <div className={`${dashCardCls} hidden overflow-hidden lg:block`}>
        <div className="border-b border-slate-100 bg-gradient-to-r from-[#F8FAFC] via-white to-[#F0F9FF]/40 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <Shimmer className="h-11 w-11 rounded-xl" />
              <div className="space-y-2">
                <Shimmer className="h-3 w-28" />
                <Shimmer className="h-6 w-44" />
                <Shimmer className="h-4 w-64 max-w-full" />
              </div>
            </div>
            <div className="flex gap-2">
              <Shimmer className="h-16 w-20" />
              <Shimmer className="h-16 w-20" />
            </div>
          </div>
        </div>
        <div className="grid gap-0 xl:grid-cols-12">
          <div className="space-y-4 border-b border-slate-100 p-6 xl:col-span-5 xl:border-b-0 xl:border-r">
            <Shimmer className="h-4 w-32" />
            <Shimmer className="h-10 w-full" />
            <Shimmer className="h-24 w-full" />
            <Shimmer className="h-32 w-full" />
          </div>
          <div className="space-y-4 p-6 xl:col-span-7">
            <Shimmer className="h-10 w-full" />
            <PersonListSkeleton count={4} />
            <Shimmer className="h-10 w-full" />
            <PersonListSkeleton count={4} />
          </div>
        </div>
      </div>
    </div>
  );
}

function UserAvatar({
  name,
  selected,
}: {
  name: string;
  selected?: boolean;
}) {
  return (
    <span
      className={`${avatarCls("sm")} ${
        selected
          ? "!bg-[#008CD3] !from-[#008CD3] !to-[#0070AA] text-white"
          : ""
      }`}
      aria-hidden
    >
      {userInitials(name)}
    </span>
  );
}

export default function CreateTeamPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = String(params?.org_id ?? "");

  const [users, setUsers] = useState<OrgUserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    id: number;
    type: "success" | "error";
    message: string;
  } | null>(null);

  const pushToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ id: Date.now(), type, message });
  }, []);

  useEffect(() => {
    if (!toast || toast.type !== "error") return;
    const t = window.setTimeout(() => setToast(null), 6500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const [teamName, setTeamName] = useState("");
  const [teamInfo, setTeamInfo] = useState("");
  const [adminId, setAdminId] = useState<string>("");
  const [memberSearch, setMemberSearch] = useState("");
  const [adminSearch, setAdminSearch] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [mobileTab, setMobileTab] = useState<"details" | "admin" | "members">(
    "details",
  );

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        pushToast("error", "Sign in required.");
        return;
      }
      const rows = await getAllOrgUsers(token);
      setUsers(rows);
    } catch (e) {
      pushToast(
        "error",
        e instanceof Error ? e.message : "Failed to load employees.",
      );
    } finally {
      setLoadingUsers(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredAdmins = useMemo(() => {
    const q = adminSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const name = formatPickerName(u).toLowerCase();
      const email = String(u.user_email ?? "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [users, adminSearch]);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    let list = users;
    if (adminId) {
      list = list.filter((u) => String(u.id) !== adminId);
    }
    if (!q) return list;
    return list.filter((u) => {
      const name = formatPickerName(u).toLowerCase();
      const email = String(u.user_email ?? "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [users, memberSearch, adminId]);

  const selectedAdmin = useMemo(
    () => users.find((u) => String(u.id) === adminId),
    [users, adminId],
  );

  const rosterTotal = 1 + selectedMemberIds.size;

  function toggleMember(id: string) {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAdmin(id: string) {
    setAdminId(id);
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!teamName.trim()) {
      pushToast("error", "Team name is required.");
      return;
    }
    if (!adminId) {
      pushToast("error", "Select a team admin.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      pushToast("error", "Sign in required.");
      return;
    }
    setSubmitting(true);
    try {
      const memberIds = Array.from(selectedMemberIds).filter(
        (id) => id !== adminId,
      );
      const result = await createOrgTeam(token, {
        admin_id: adminId,
        team_name: teamName.trim(),
        team_info: teamInfo.trim() || null,
        team_members: memberIds,
      });
      pushToast(
        "success",
        result.message?.trim() || "Team created successfully.",
      );
      window.setTimeout(() => {
        router.push(
          `/dashboard/${orgId}/organization-employees/manage-teams`,
        );
      }, 1400);
    } catch (err) {
      pushToast(
        "error",
        err instanceof Error ? err.message : "Could not create the team.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const backHref = `/dashboard/${orgId}/organization-employees/manage-teams`;
  const canSubmit =
    Boolean(teamName.trim()) && Boolean(adminId) && !submitting && !loadingUsers;

  const mobileTabCls = (active: boolean) =>
    `relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[12px] font-semibold transition ${
      active
        ? "bg-white text-[#008CD3] shadow-sm"
        : "text-slate-500 hover:text-slate-700"
    }`;

  const personRowCls = (active: boolean) =>
    `flex w-full min-w-0 items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
      active
        ? "border-[#008CD3]/35 bg-[#E8F4FB]"
        : "border-slate-100 bg-white hover:bg-slate-50"
    }`;

  return (
    <div className={`${dashPageCls} pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-8`}>
      {/* Mobile sticky header */}
      <div className="sticky top-0 z-20 -mx-3 border-b border-slate-200/80 bg-white/95 px-3 pb-3 pt-3 shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur-md sm:-mx-5 sm:px-4 lg:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <button
              type="button"
              onClick={() => router.push(backHref)}
              className={`${btnGhostCls()} !min-h-[36px] !w-9 !px-0`}
              aria-label="Back to team management"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-[17px] font-semibold tracking-tight text-slate-900">
                New team
              </h1>
              <p className={`mt-0.5 ${dashSectionMetaCls}`}>
                {adminId
                  ? `${rosterTotal} participant${rosterTotal === 1 ? "" : "s"} ready`
                  : "Details, admin & members"}
              </p>
            </div>
          </div>
          <button
            type="submit"
            form="create-team-form"
            disabled={!canSubmit}
            className={`${btnBrandCls()} !min-h-[36px] !px-3 !text-[12px]`}
            aria-label="Create team"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                Save
              </>
            )}
          </button>
        </div>

        <div className="mt-3 flex gap-1 rounded-xl bg-slate-100/80 p-1">
          {(
            [
              { id: "details" as const, label: "Details" },
              { id: "admin" as const, label: "Admin" },
              { id: "members" as const, label: "Members" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMobileTab(tab.id)}
              className={mobileTabCls(mobileTab === tab.id)}
            >
              {tab.label}
              {tab.id === "members" && selectedMemberIds.size > 0 ? (
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E8F4FB] px-1 text-[10px] font-bold text-[#008CD3]">
                  {selectedMemberIds.size}
                </span>
              ) : null}
              {tab.id === "admin" && adminId ? (
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop header */}
      <header className={`${dashCardCls} hidden overflow-hidden lg:block`}>
        <div className="border-b border-slate-100 bg-gradient-to-r from-[#F8FAFC] via-white to-[#F0F9FF]/40 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <button
                type="button"
                onClick={() => router.push(backHref)}
                className={`${btnGhostCls()} !min-h-[40px] !w-10 !px-0`}
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <span className={iconBadgeCls("blue")}>
                <Users className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                  Organization · Teams
                </p>
                <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">
                  Create team
                </h1>
                <p className={`mt-1 max-w-xl ${dashSectionMetaCls}`}>
                  Name the team, assign an admin, and add day-one members.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className={`${statBoxCls("sky")} min-w-[88px] text-center`}>
                <p className="text-lg font-semibold tabular-nums text-[#008CD3]">
                  {loadingUsers ? "—" : users.length}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Roster
                </p>
              </div>
              <div className={`${statBoxCls("emerald")} min-w-[88px] text-center`}>
                <p className="text-lg font-semibold tabular-nums text-emerald-700">
                  {adminId ? rosterTotal : "—"}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600/80">
                  Draft
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {loadingUsers && users.length === 0 ? (
        <CreateTeamPageSkeleton />
      ) : (
        <form
          id="create-team-form"
          onSubmit={handleSubmit}
          className={`${dashCardCls} overflow-hidden`}
        >
          {/* Mobile tab panels */}
          <div className="lg:hidden">
            {mobileTab === "details" ? (
              <div className="p-4">
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="team_name_mobile"
                      className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                    >
                      Team name
                    </label>
                    <input
                      id="team_name_mobile"
                      className={fieldCls()}
                      placeholder="e.g. Field Operations"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="team_info_mobile"
                      className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                    >
                      Description{" "}
                      <span className="font-normal normal-case tracking-normal text-slate-400">
                        (optional)
                      </span>
                    </label>
                    <textarea
                      id="team_info_mobile"
                      className={`min-h-[80px] resize-none ${fieldCls()}`}
                      placeholder="Purpose or scope of this team"
                      value={teamInfo}
                      onChange={(e) => setTeamInfo(e.target.value)}
                    />
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Summary
                  </p>
                  <div className="mt-3 space-y-2.5 text-[13px]">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">Admin</span>
                      <span className="min-w-0 truncate text-right font-medium text-slate-900">
                        {selectedAdmin
                          ? formatPickerName(selectedAdmin)
                          : "Not selected"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">Members</span>
                      <span className="font-medium tabular-nums text-slate-900">
                        {adminId ? `${rosterTotal} total` : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">Org roster</span>
                      <span className="font-medium tabular-nums text-slate-900">
                        {users.length} people
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {mobileTab === "admin" ? (
              <div className="p-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    className={searchFieldCls()}
                    placeholder="Search name or email"
                    value={adminSearch}
                    onChange={(e) => setAdminSearch(e.target.value)}
                    disabled={loadingUsers}
                  />
                </div>
                <p className={`mt-3 mb-2 ${dashSectionMetaCls}`}>
                  Choose one team admin
                </p>
                {loadingUsers ? (
                  <PersonListSkeleton />
                ) : (
                  <ul className="max-h-[calc(100dvh-14rem-env(safe-area-inset-bottom))] space-y-2 overflow-y-auto overscroll-contain">
                    {filteredAdmins.length === 0 ? (
                      <li className="rounded-xl border border-dashed border-slate-200 px-3 py-10 text-center text-sm text-slate-500">
                        No people match your search.
                      </li>
                    ) : (
                      filteredAdmins.map((u) => {
                        const id = String(u.id ?? "");
                        const picked = adminId === id;
                        const name = formatPickerName(u);
                        return (
                          <li key={orgUserListKey(u, "adm")}>
                            <button
                              type="button"
                              onClick={() => selectAdmin(id)}
                              className={personRowCls(picked)}
                            >
                              <UserAvatar name={name} selected={picked} />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[14px] font-medium text-slate-900">
                                  {name}
                                </p>
                                <p className="truncate text-[12px] text-slate-500">
                                  {u.user_email}
                                </p>
                              </div>
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                                  picked
                                    ? "border-[#008CD3] bg-[#008CD3] text-white"
                                    : "border-slate-300 bg-white"
                                }`}
                                aria-hidden
                              >
                                {picked ? (
                                  <Check className="h-3 w-3" strokeWidth={3} />
                                ) : null}
                              </span>
                            </button>
                          </li>
                        );
                      })
                    )}
                  </ul>
                )}
              </div>
            ) : null}

            {mobileTab === "members" ? (
              <div className="p-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    className={searchFieldCls()}
                    placeholder="Search name or email"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    disabled={loadingUsers}
                  />
                </div>
                <p className={`mt-3 mb-2 ${dashSectionMetaCls}`}>
                  Add members
                  {selectedMemberIds.size > 0
                    ? ` · ${selectedMemberIds.size} selected`
                    : ""}
                </p>
                {loadingUsers ? (
                  <PersonListSkeleton />
                ) : (
                  <ul className="max-h-[calc(100dvh-14rem-env(safe-area-inset-bottom))] space-y-2 overflow-y-auto overscroll-contain">
                    {filteredMembers.length === 0 ? (
                      <li className="rounded-xl border border-dashed border-slate-200 px-3 py-10 text-center text-sm text-slate-500">
                        {users.length === 0
                          ? "No employees in this organization."
                          : "No one left to add, or nothing matches your search."}
                      </li>
                    ) : (
                      filteredMembers.map((u) => {
                        const id = String(u.id ?? "");
                        const on = selectedMemberIds.has(id);
                        const name = formatPickerName(u);
                        return (
                          <li key={orgUserListKey(u, "m")}>
                            <label className={`${personRowCls(on)} cursor-pointer`}>
                              <UserAvatar name={name} selected={on} />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[14px] font-medium text-slate-900">
                                  {name}
                                </p>
                                <p className="truncate text-[12px] text-slate-500">
                                  {u.user_email}
                                </p>
                              </div>
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${
                                  on
                                    ? "border-[#008CD3] bg-[#008CD3] text-white"
                                    : "border-slate-300 bg-white"
                                }`}
                              >
                                {on ? (
                                  <Check className="h-3 w-3" strokeWidth={3} />
                                ) : null}
                              </span>
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={on}
                                onChange={() => toggleMember(id)}
                              />
                            </label>
                          </li>
                        );
                      })
                    )}
                  </ul>
                )}
              </div>
            ) : null}
          </div>

          {/* Desktop two-column form */}
          <div className="hidden lg:block">
            <div className="grid divide-y divide-slate-100 xl:grid-cols-12 xl:divide-x xl:divide-y-0">
              <div className="space-y-5 p-6 xl:col-span-5">
                <div className="flex items-start gap-3">
                  <span className={iconBadgeCls("blue")}>
                    <Users className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">
                      Team details
                    </h2>
                    <p className={dashSectionMetaCls}>
                      Shown in dashboards and member directory.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label
                      className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                      htmlFor="team_name"
                    >
                      Team name
                    </label>
                    <input
                      id="team_name"
                      className={fieldCls()}
                      placeholder="e.g. Revenue Operations"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <label
                      className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                      htmlFor="team_info"
                    >
                      Description{" "}
                      <span className="font-normal normal-case tracking-normal text-slate-400">
                        (optional)
                      </span>
                    </label>
                    <textarea
                      id="team_info"
                      className={`min-h-[96px] resize-y ${fieldCls()}`}
                      placeholder="Purpose, scope, or how this team works with others"
                      value={teamInfo}
                      onChange={(e) => setTeamInfo(e.target.value)}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Summary
                  </p>
                  <div className="mt-3 space-y-2.5 text-[13px]">
                    <div className="flex justify-between gap-3 border-b border-slate-100 pb-2.5">
                      <span className="text-slate-500">Team</span>
                      <span className="truncate text-right font-medium text-slate-900">
                        {teamName.trim() || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3 border-b border-slate-100 pb-2.5">
                      <span className="text-slate-500">Admin</span>
                      <span className="truncate text-right font-medium text-slate-900">
                        {selectedAdmin
                          ? formatPickerName(selectedAdmin)
                          : "Not selected"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">Starting roster</span>
                      <span className="font-medium tabular-nums text-slate-900">
                        {adminId ? `${rosterTotal} people` : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6 p-6 xl:col-span-7">
                <section>
                  <div className="flex items-center gap-3">
                    <span className={iconBadgeCls("amber")}>
                      <Crown className="h-4 w-4" />
                    </span>
                    <div>
                      <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">
                        Team admin
                      </h2>
                      <p className={dashSectionMetaCls}>
                        One owner for approvals and visibility.
                      </p>
                    </div>
                  </div>

                  <div className="relative mt-3">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      className={searchFieldCls()}
                      placeholder="Search by name or email"
                      value={adminSearch}
                      onChange={(e) => setAdminSearch(e.target.value)}
                      disabled={loadingUsers}
                    />
                  </div>

                  {loadingUsers ? (
                    <div className="mt-3">
                      <PersonListSkeleton count={4} />
                    </div>
                  ) : (
                    <ul className="mt-3 max-h-[min(260px,38vh)] space-y-2 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]">
                      {filteredAdmins.length === 0 ? (
                        <li className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500">
                          No people match your search.
                        </li>
                      ) : (
                        filteredAdmins.map((u) => {
                          const id = String(u.id ?? "");
                          const picked = adminId === id;
                          const name = formatPickerName(u);
                          return (
                            <li key={orgUserListKey(u, "adm")}>
                              <button
                                type="button"
                                onClick={() => selectAdmin(id)}
                                className={personRowCls(picked)}
                              >
                                <UserAvatar name={name} selected={picked} />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[13px] font-medium text-slate-900">
                                    {name}
                                  </p>
                                  <p className="truncate text-[12px] text-slate-500">
                                    {u.user_email}
                                  </p>
                                </div>
                                <span
                                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                                    picked
                                      ? "border-[#008CD3] bg-[#008CD3] text-white"
                                      : "border-slate-300 bg-white"
                                  }`}
                                  aria-hidden
                                >
                                  {picked ? (
                                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                                  ) : null}
                                </span>
                              </button>
                            </li>
                          );
                        })
                      )}
                    </ul>
                  )}
                </section>

                <section>
                  <div className="flex items-center gap-3">
                    <span className={iconBadgeCls("slate")}>
                      <UserPlus className="h-4 w-4" />
                    </span>
                    <div>
                      <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">
                        Additional members
                      </h2>
                      <p className={dashSectionMetaCls}>
                        Admin is included automatically. Add others as needed.
                      </p>
                    </div>
                  </div>

                  <div className="relative mt-3">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      className={searchFieldCls()}
                      placeholder="Filter roster"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      disabled={loadingUsers}
                    />
                  </div>

                  {loadingUsers ? (
                    <div className="mt-3">
                      <PersonListSkeleton count={4} />
                    </div>
                  ) : (
                    <ul className="mt-3 max-h-[min(260px,38vh)] space-y-2 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]">
                      {filteredMembers.length === 0 ? (
                        <li className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500">
                          {users.length === 0
                            ? "No employees in this organization."
                            : "No one left to add, or nothing matches your search."}
                        </li>
                      ) : (
                        filteredMembers.map((u) => {
                          const id = String(u.id ?? "");
                          const on = selectedMemberIds.has(id);
                          const name = formatPickerName(u);
                          return (
                            <li key={orgUserListKey(u, "m")}>
                              <label className={`${personRowCls(on)} cursor-pointer`}>
                                <UserAvatar name={name} selected={on} />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[13px] font-medium text-slate-900">
                                    {name}
                                  </p>
                                  <p className="truncate text-[12px] text-slate-500">
                                    {u.user_email}
                                  </p>
                                </div>
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-[#008CD3] focus:ring-[#008CD3]/20"
                                  checked={on}
                                  onChange={() => toggleMember(id)}
                                />
                              </label>
                            </li>
                          );
                        })
                      )}
                    </ul>
                  )}

                  {!loadingUsers && selectedMemberIds.size > 0 ? (
                    <p className="mt-3 flex items-center gap-1.5 text-[12px] text-slate-500">
                      <Users className="h-3.5 w-3.5 text-[#008CD3]" />
                      <span>
                        <strong className="font-semibold text-slate-700">
                          {selectedMemberIds.size}
                        </strong>{" "}
                        selected for day-one roster
                      </span>
                    </p>
                  ) : null}
                </section>
              </div>
            </div>
          </div>

          {/* Mobile bottom bar */}
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/95 px-3 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
            <button
              type="submit"
              disabled={!canSubmit}
              className={btnBrandCls(true)}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" strokeWidth={2.5} />
              )}
              Create team
            </button>
          </div>

          {/* Desktop footer */}
          <div className="hidden items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4 lg:flex">
            <button
              type="button"
              onClick={() => router.push(backHref)}
              className={btnGhostCls()}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={btnBrandCls()}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create team
            </button>
          </div>
        </form>
      )}

      {toast && typeof document !== "undefined"
        ? createPortal(
            <div
              className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[10000] flex justify-center px-3 lg:bottom-6"
              role="status"
              aria-live="polite"
            >
              <div
                className={`pointer-events-auto flex max-w-md items-start gap-2.5 rounded-2xl border bg-white px-3 py-2.5 shadow-xl sm:min-w-[320px] ${
                  toast.type === "success"
                    ? "border-emerald-200"
                    : "border-rose-200"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                    toast.type === "success"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-rose-50 text-rose-600"
                  }`}
                >
                  {toast.type === "success" ? (
                    <CheckCircle2 className="h-5 w-5" strokeWidth={2} />
                  ) : (
                    <AlertCircle className="h-5 w-5" strokeWidth={2} />
                  )}
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-[13px] font-semibold text-slate-900">
                    {toast.type === "success" ? "All set" : "Something went wrong"}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-snug text-slate-500">
                    {toast.message}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setToast(null)}
                  className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                  aria-label="Dismiss notification"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
