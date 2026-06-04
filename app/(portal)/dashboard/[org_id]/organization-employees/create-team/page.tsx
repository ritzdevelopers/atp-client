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

function formatPickerName(row: OrgUserRow) {
  return String(row.user_name ?? "Unknown");
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function fieldCls() {
  return "w-full rounded-lg border border-[#E4E7EC] bg-white px-3 py-2 text-[14px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15";
}

function searchFieldCls() {
  return "w-full rounded-lg border border-[#E4E7EC] bg-white py-2 pl-9 pr-3 text-[14px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15";
}

function panelCls() {
  return "overflow-hidden bg-white lg:rounded-lg lg:border lg:border-[#E4E7EC] lg:shadow-sm";
}

function btnPrimaryCls(full = true) {
  return `inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-[#008CD3] px-4 py-2 text-[14px] font-medium text-white transition hover:bg-[#0070AA] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full" : ""}`;
}

function btnSecondaryCls() {
  return "inline-flex min-h-[40px] items-center justify-center rounded-lg border border-[#E4E7EC] bg-white px-4 py-2 text-[14px] font-medium text-[#374151] transition hover:bg-[#F9FAFB] disabled:opacity-50";
}

const AVATAR_COLORS = [
  "bg-[#E8F4FB] text-[#008CD3]",
  "bg-[#E6F4EA] text-[#0F9D58]",
  "bg-[#FEF3E6] text-[#E8710A]",
  "bg-[#F3E8FD] text-[#7B1FA2]",
  "bg-[#FCE8E6] text-[#D93025]",
  "bg-[#E8EAF6] text-[#3F51B5]",
];

function avatarColorClass(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function UserAvatar({
  name,
  selected,
  mobile = false,
}: {
  name: string;
  selected?: boolean;
  mobile?: boolean;
}) {
  const ini = initialsFromName(name);
  const size = mobile ? "h-9 w-9 text-[12px] rounded-full" : "h-9 w-9 text-[11px] rounded-lg";
  return (
    <span
      className={`flex shrink-0 items-center justify-center font-semibold ${size} ${
        selected ? "bg-[#008CD3] text-white" : avatarColorClass(name)
      }`}
      aria-hidden
    >
      {ini}
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

  return (
    <div className="min-h-full bg-[#F5F7FA] pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-10">
      {/* Mobile & tablet header */}
      <div className="sticky top-0 z-20 border-b border-[#E4E7EC] bg-white shadow-sm lg:hidden">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <button
            type="button"
            onClick={() => router.push(backHref)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#374151] active:bg-[#F5F7FA]"
            aria-label="Back to team management"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[16px] font-semibold text-[#1F2937]">New team</h1>
            <p className="truncate text-[12px] text-[#6B7280]">
              {adminId
                ? `${rosterTotal} participant${rosterTotal === 1 ? "" : "s"}`
                : "Details, admin & members"}
            </p>
          </div>
          <button
            type="submit"
            form="create-team-form"
            disabled={!canSubmit}
            className="flex h-9 shrink-0 items-center justify-center rounded-lg bg-[#008CD3] px-3 text-[13px] font-medium text-white disabled:opacity-40"
            aria-label="Create team"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Check className="h-4 w-4" strokeWidth={2.5} />
                <span className="ml-1 hidden min-[380px]:inline">Save</span>
              </>
            )}
          </button>
        </div>

        <div className="flex border-t border-[#E4E7EC] bg-[#F9FAFB] px-1">
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
              className={`flex flex-1 items-center justify-center gap-1 py-2 text-[12px] font-medium transition ${
                mobileTab === tab.id
                  ? "border-b-2 border-[#008CD3] text-[#008CD3] bg-white"
                  : "border-b-2 border-transparent text-[#6B7280]"
              }`}
            >
              {tab.label}
              {tab.id === "members" && selectedMemberIds.size > 0 ? (
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E8F4FB] px-1 text-[10px] font-semibold text-[#008CD3]">
                  {selectedMemberIds.size}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop header */}
      <header className="hidden border-b border-[#E4E7EC] bg-white lg:block">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-8 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => router.push(backHref)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#374151] hover:bg-[#F9FAFB]"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-[18px] font-semibold text-[#1F2937]">Create team</h1>
              <p className="text-[13px] text-[#6B7280]">
                Name the team, assign an admin, and add members
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-4 text-[13px]">
            <div className="text-right">
              <p className="text-[11px] font-medium uppercase tracking-wide text-[#9CA3AF]">Roster</p>
              <p className="font-semibold tabular-nums text-[#1F2937]">
                {loadingUsers ? "—" : users.length}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-medium uppercase tracking-wide text-[#9CA3AF]">Draft</p>
              <p className="font-semibold tabular-nums text-[#1F2937]">
                {adminId ? rosterTotal : "—"}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl lg:px-6 lg:pt-6">
        <form id="create-team-form" onSubmit={handleSubmit} className={panelCls()}>
          {/* Mobile & tablet tab panels */}
          <div className="lg:hidden">
            {mobileTab === "details" ? (
              <div className="bg-white">
                <div className="space-y-3 border-b border-[#E4E7EC] p-3">
                  <div>
                    <label htmlFor="team_name_mobile" className="mb-1 block text-[12px] font-medium text-[#374151]">
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
                    <label htmlFor="team_info_mobile" className="mb-1 block text-[12px] font-medium text-[#374151]">
                      Description <span className="font-normal text-[#9CA3AF]">(optional)</span>
                    </label>
                    <textarea
                      id="team_info_mobile"
                      className={`min-h-[64px] resize-none ${fieldCls()}`}
                      placeholder="Purpose or scope of this team"
                      value={teamInfo}
                      onChange={(e) => setTeamInfo(e.target.value)}
                    />
                  </div>
                </div>
                <div className="bg-[#F9FAFB] px-3 py-1.5">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[#6B7280]">
                    Summary
                  </p>
                </div>
                <div className="divide-y divide-[#E4E7EC]">
                  <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <span className="shrink-0 text-[13px] text-[#374151]">Admin</span>
                    <span className="min-w-0 truncate text-right text-[13px] text-[#6B7280]">
                      {selectedAdmin ? formatPickerName(selectedAdmin) : "Not selected"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <span className="text-[13px] text-[#374151]">Members</span>
                    <span className="text-[13px] text-[#6B7280]">
                      {adminId ? `${rosterTotal} total` : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <span className="text-[13px] text-[#374151]">Org roster</span>
                    <span className="text-[13px] text-[#6B7280]">
                      {loadingUsers ? "…" : `${users.length} people`}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            {mobileTab === "admin" ? (
              <div>
                <div className="border-b border-[#E4E7EC] bg-white p-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                    <input
                      type="search"
                      className={searchFieldCls()}
                      placeholder="Search name or email"
                      value={adminSearch}
                      onChange={(e) => setAdminSearch(e.target.value)}
                    />
                  </div>
                </div>
                <p className="bg-[#F9FAFB] px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-[#6B7280]">
                  Choose team admin
                </p>
                {loadingUsers ? (
                  <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-[#6B7280]">
                    <Loader2 className="h-4 w-4 animate-spin text-[#008CD3]" />
                    Loading…
                  </div>
                ) : (
                  <ul className="max-h-[calc(100dvh-11.5rem-env(safe-area-inset-bottom))] divide-y divide-[#E4E7EC] overflow-y-auto overscroll-contain">
                    {filteredAdmins.length === 0 ? (
                      <li className="px-3 py-10 text-center text-[13px] text-[#6B7280]">
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
                              onClick={() => {
                                setAdminId(id);
                                setSelectedMemberIds((prev) => {
                                  const next = new Set(prev);
                                  next.delete(id);
                                  return next;
                                });
                              }}
                              className={`flex w-full min-w-0 items-center gap-2.5 px-3 py-2.5 text-left transition active:bg-[#F5F7FA] ${
                                picked ? "bg-[#E8F4FB]" : "bg-white"
                              }`}
                            >
                              <UserAvatar name={name} selected={picked} mobile />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[14px] font-medium text-[#1F2937]">{name}</p>
                                <p className="truncate text-[12px] text-[#6B7280]">{u.user_email}</p>
                              </div>
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                                  picked
                                    ? "border-[#008CD3] bg-[#008CD3] text-white"
                                    : "border-[#D1D5DB] bg-white"
                                }`}
                                aria-hidden
                              >
                                {picked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
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
              <div>
                <div className="border-b border-[#E4E7EC] bg-white p-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                    <input
                      type="search"
                      className={searchFieldCls()}
                      placeholder="Search name or email"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                    />
                  </div>
                </div>
                <p className="bg-[#F9FAFB] px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-[#6B7280]">
                  Add members
                  {selectedMemberIds.size > 0 ? ` · ${selectedMemberIds.size} selected` : ""}
                </p>
                {!loadingUsers ? (
                  <ul className="max-h-[calc(100dvh-11.5rem-env(safe-area-inset-bottom))] divide-y divide-[#E4E7EC] overflow-y-auto overscroll-contain">
                    {filteredMembers.length === 0 ? (
                      <li className="px-3 py-10 text-center text-[13px] text-[#6B7280]">
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
                            <label
                              className={`flex min-w-0 cursor-pointer items-center gap-2.5 px-3 py-2.5 transition active:bg-[#F5F7FA] ${
                                on ? "bg-[#E8F4FB]" : "bg-white"
                              }`}
                            >
                              <UserAvatar name={name} selected={on} mobile />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[14px] font-medium text-[#1F2937]">{name}</p>
                                <p className="truncate text-[12px] text-[#6B7280]">{u.user_email}</p>
                              </div>
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${
                                  on
                                    ? "border-[#008CD3] bg-[#008CD3] text-white"
                                    : "border-[#D1D5DB] bg-white"
                                }`}
                              >
                                {on ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
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
                ) : (
                  <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-[#6B7280]">
                    <Loader2 className="h-4 w-4 animate-spin text-[#008CD3]" />
                    Loading…
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Desktop two-column form */}
          <div className="hidden lg:block">
            <div className="grid divide-y divide-[#E4E7EC] xl:grid-cols-12 xl:divide-x xl:divide-y-0">
              <div className="space-y-5 p-6 xl:col-span-5">
                <div>
                  <h2 className="text-[14px] font-semibold text-[#1F2937]">Team details</h2>
                  <p className="mt-0.5 text-[12px] text-[#6B7280]">
                    Shown in dashboards and member directory.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-[#374151]" htmlFor="team_name">
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
                    <label className="mb-1 block text-[12px] font-medium text-[#374151]" htmlFor="team_info">
                      Description <span className="font-normal text-[#9CA3AF]">(optional)</span>
                    </label>
                    <textarea
                      id="team_info"
                      className={`min-h-[88px] resize-y ${fieldCls()}`}
                      placeholder="Purpose, scope, or how this team works with others"
                      value={teamInfo}
                      onChange={(e) => setTeamInfo(e.target.value)}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] p-4">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[#6B7280]">Summary</p>
                  <div className="mt-3 space-y-2.5 text-[13px]">
                    <div className="flex justify-between gap-3 border-b border-[#E4E7EC] pb-2">
                      <span className="text-[#6B7280]">Team</span>
                      <span className="truncate text-right font-medium text-[#1F2937]">
                        {teamName.trim() || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3 border-b border-[#E4E7EC] pb-2">
                      <span className="text-[#6B7280]">Admin</span>
                      <span className="truncate text-right font-medium text-[#1F2937]">
                        {selectedAdmin ? formatPickerName(selectedAdmin) : "Not selected"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-[#6B7280]">Starting roster</span>
                      <span className="font-medium tabular-nums text-[#1F2937]">
                        {adminId ? `${rosterTotal} people` : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6 p-6 xl:col-span-7">
                <section>
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
                      <Crown className="h-4 w-4" strokeWidth={2} />
                    </span>
                    <div>
                      <h2 className="text-[14px] font-semibold text-[#1F2937]">Team admin</h2>
                      <p className="text-[12px] text-[#6B7280]">One owner for approvals and visibility.</p>
                    </div>
                  </div>

                  <div className="relative mt-3">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                    <input
                      type="search"
                      className={searchFieldCls()}
                      placeholder="Search by name or email"
                      value={adminSearch}
                      onChange={(e) => setAdminSearch(e.target.value)}
                    />
                  </div>

                  {loadingUsers ? (
                    <div className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-dashed border-[#E4E7EC] py-10 text-[13px] text-[#6B7280]">
                      <Loader2 className="h-4 w-4 animate-spin text-[#008CD3]" />
                      Loading directory…
                    </div>
                  ) : (
                    <ul className="mt-3 max-h-[min(260px,38vh)] space-y-1.5 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]">
                      {filteredAdmins.length === 0 ? (
                        <li className="rounded-lg border border-dashed border-[#E4E7EC] py-8 text-center text-[13px] text-[#6B7280]">
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
                                onClick={() => {
                                  setAdminId(id);
                                  setSelectedMemberIds((prev) => {
                                    const next = new Set(prev);
                                    next.delete(id);
                                    return next;
                                  });
                                }}
                                className={`flex w-full min-w-0 items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition ${
                                  picked
                                    ? "border-[#008CD3]/40 bg-[#E8F4FB]"
                                    : "border-[#E4E7EC] bg-white hover:bg-[#F9FAFB]"
                                }`}
                              >
                                <UserAvatar name={name} selected={picked} />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[13px] font-medium text-[#1F2937]">{name}</p>
                                  <p className="truncate text-[12px] text-[#6B7280]">{u.user_email}</p>
                                </div>
                                <span
                                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                                    picked
                                      ? "border-[#008CD3] bg-[#008CD3] text-white"
                                      : "border-[#D1D5DB] bg-white"
                                  }`}
                                  aria-hidden
                                >
                                  {picked ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
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
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F3F4F6] text-[#374151]">
                      <UserPlus className="h-4 w-4" strokeWidth={2} />
                    </span>
                    <div>
                      <h2 className="text-[14px] font-semibold text-[#1F2937]">Additional members</h2>
                      <p className="text-[12px] text-[#6B7280]">
                        Admin is included automatically. Add others as needed.
                      </p>
                    </div>
                  </div>

                  <div className="relative mt-3">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                    <input
                      type="search"
                      className={searchFieldCls()}
                      placeholder="Filter roster"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                    />
                  </div>

                  {!loadingUsers ? (
                    <ul className="mt-3 max-h-[min(260px,38vh)] space-y-1.5 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]">
                      {filteredMembers.length === 0 ? (
                        <li className="rounded-lg border border-dashed border-[#E4E7EC] py-8 text-center text-[13px] text-[#6B7280]">
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
                              <label
                                className={`flex min-w-0 cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 transition ${
                                  on
                                    ? "border-[#008CD3]/40 bg-[#E8F4FB]"
                                    : "border-[#E4E7EC] bg-white hover:bg-[#F9FAFB]"
                                }`}
                              >
                                <UserAvatar name={name} selected={on} />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[13px] font-medium text-[#1F2937]">{name}</p>
                                  <p className="truncate text-[12px] text-[#6B7280]">{u.user_email}</p>
                                </div>
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 shrink-0 cursor-pointer rounded border-[#D1D5DB] text-[#008CD3] focus:ring-[#008CD3]/20"
                                  checked={on}
                                  onChange={() => toggleMember(id)}
                                />
                              </label>
                            </li>
                          );
                        })
                      )}
                    </ul>
                  ) : null}

                  {!loadingUsers && selectedMemberIds.size > 0 ? (
                    <p className="mt-2 flex items-center gap-1.5 text-[12px] text-[#6B7280]">
                      <Users className="h-3.5 w-3.5" />
                      <span>
                        <strong className="font-semibold text-[#374151]">
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

          {/* Mobile & tablet bottom bar */}
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E4E7EC] bg-white px-3 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] lg:hidden">
            <button type="submit" disabled={!canSubmit} className={btnPrimaryCls()}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" strokeWidth={2.5} />
              )}
              Create team
            </button>
          </div>

          {/* Desktop footer */}
          <div className="hidden items-center justify-between gap-3 border-t border-[#E4E7EC] bg-[#F9FAFB] px-6 py-4 lg:flex">
            <button type="button" onClick={() => router.push(backHref)} className={btnSecondaryCls()}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={btnPrimaryCls(false)}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create team
            </button>
          </div>
        </form>
      </div>

      {toast && typeof document !== "undefined"
        ? createPortal(
            <div
              className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[10000] flex justify-center px-3 lg:bottom-6"
              role="status"
              aria-live="polite"
            >
              <div
                className={`pointer-events-auto flex max-w-md items-start gap-2.5 rounded-lg border px-3 py-2.5 shadow-lg sm:min-w-[320px] ${
                  toast.type === "success"
                    ? "border-[#A8DAB5] bg-white text-[#1F2937]"
                    : "border-[#F5C6C2] bg-white text-[#1F2937]"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    toast.type === "success"
                      ? "bg-[#E6F4EA] text-[#0F9D58]"
                      : "bg-[#FCE8E6] text-[#D93025]"
                  }`}
                >
                  {toast.type === "success" ? (
                    <CheckCircle2 className="h-5 w-5" strokeWidth={2} />
                  ) : (
                    <AlertCircle className="h-5 w-5" strokeWidth={2} />
                  )}
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-[13px] font-semibold text-[#1F2937]">
                    {toast.type === "success" ? "All set" : "Something went wrong"}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-snug text-[#6B7280]">{toast.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setToast(null)}
                  className="shrink-0 rounded-lg p-1 text-[#9CA3AF] transition hover:bg-[#F3F4F6] hover:text-[#374151]"
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
