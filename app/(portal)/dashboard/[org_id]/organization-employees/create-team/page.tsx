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
  Sparkles,
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
  return "w-full rounded-lg border-0 bg-[#F0F2F5] px-4 py-3 text-[15px] text-[#111B21] outline-none transition placeholder:text-[#8696A0] focus:bg-white focus:ring-1 focus:ring-[#25D366]/40 lg:rounded-2xl lg:border lg:border-slate-200/90 lg:bg-white lg:shadow-sm lg:ring-slate-950/[0.04] lg:focus:border-teal-500/70 lg:focus:ring-2 lg:focus:ring-teal-500/20";
}

function searchFieldCls() {
  return "w-full rounded-lg border-0 bg-[#F0F2F5] py-2.5 pl-10 pr-4 text-[15px] text-[#111B21] outline-none transition placeholder:text-[#8696A0] focus:bg-white focus:ring-1 focus:ring-[#25D366]/40 lg:rounded-2xl lg:border lg:border-slate-200/90 lg:bg-slate-50/80 lg:py-3.5 lg:pl-11 lg:focus:border-teal-500/60 lg:focus:bg-white lg:focus:ring-2 lg:focus:ring-teal-500/15";
}

function mobilePanelCls() {
  return "bg-white lg:rounded-3xl lg:border lg:border-slate-200/90 lg:shadow-[0_24px_72px_-12px_rgba(15,23,42,0.18)] lg:ring-1 lg:ring-slate-950/[0.04]";
}

function btnPrimaryCls() {
  return "inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-6 py-3 text-[15px] font-medium text-white transition active:scale-[0.98] hover:bg-[#20BD5A] disabled:pointer-events-none disabled:opacity-50 lg:min-h-0 lg:w-auto lg:rounded-2xl lg:bg-slate-900 lg:px-8 lg:py-3.5 lg:text-sm lg:font-semibold lg:shadow-lg lg:shadow-slate-900/20 lg:hover:bg-slate-800";
}

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
  if (mobile) {
    return (
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
          selected
            ? "bg-[#25D366] text-white"
            : avatarColorClass(name)
        }`}
        aria-hidden
      >
        {ini}
      </span>
    );
  }
  return (
    <span
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xs font-bold tracking-wide ${
        selected
          ? "bg-gradient-to-br from-teal-400 to-teal-700 text-white shadow-md shadow-teal-600/30"
          : "bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 ring-1 ring-slate-200/80"
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
    <div className="min-h-full bg-[#F0F2F5] pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:bg-[#f4f6f9] lg:pb-0">
      {/* Mobile & tablet: WhatsApp-style header */}
      <div className="sticky top-0 z-20 bg-[#128C7E] text-white shadow-sm lg:hidden">
        <div className="flex items-center gap-1 px-1 py-2">
          <button
            type="button"
            onClick={() => router.push(backHref)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition active:bg-white/10"
            aria-label="Back to team management"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1 py-1">
            <h1 className="truncate text-[17px] font-medium leading-tight">
              New team
            </h1>
            <p className="truncate text-[13px] text-white/75">
              {adminId
                ? `${rosterTotal} participant${rosterTotal === 1 ? "" : "s"}`
                : "Add team details and people"}
            </p>
          </div>
          <button
            type="submit"
            form="create-team-form"
            disabled={!canSubmit}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition enabled:active:bg-white/10 disabled:opacity-40"
            aria-label="Create team"
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Check className="h-5 w-5" strokeWidth={2.5} />
            )}
          </button>
        </div>

        <div className="flex border-t border-white/10">
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
              className={`flex-1 py-3 text-[13px] font-medium transition ${
                mobileTab === tab.id
                  ? "border-b-2 border-white text-white"
                  : "border-b-2 border-transparent text-white/70"
              }`}
            >
              {tab.label}
              {tab.id === "members" && selectedMemberIds.size > 0 ? (
                <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1 text-[11px]">
                  {selectedMemberIds.size}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop: hero header */}
      <header className="relative isolate hidden overflow-hidden bg-slate-950 px-4 pb-28 pt-8 sm:px-6 sm:pb-32 sm:pt-10 lg:block">
        <div
          className="pointer-events-none absolute -left-32 top-0 h-80 w-80 rounded-full bg-teal-500/25 blur-[100px]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-24 top-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-[90px]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.4] bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(45,212,191,0.45),transparent_55%)]"
          aria-hidden
        />

        <div className="relative mx-auto max-w-5xl">
          <button
            type="button"
            onClick={() => router.push(backHref)}
            className="group mb-8 inline-flex items-center gap-2 text-sm font-medium text-teal-100/90 transition hover:text-white"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15 transition group-hover:bg-white/15">
              <ArrowLeft className="h-4 w-4" />
            </span>
            Team management
          </button>

          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-200/95">
                <Sparkles className="h-3.5 w-3.5 text-teal-300" />
                New team
              </p>
              <h1 className="mt-4 text-[1.75rem] font-semibold leading-[1.15] tracking-tight text-white sm:text-4xl sm:leading-[1.1]">
                Create a team your org{" "}
                <span className="bg-gradient-to-r from-teal-200 to-cyan-200 bg-clip-text text-transparent">
                  can rely on
                </span>
              </h1>
              <p className="mt-4 text-[15px] leading-relaxed text-slate-400 sm:text-base">
                Name the team, assign one admin, and optionally add members now.
                Everything stays editable from team management later.
              </p>
            </div>

            <div className="flex shrink-0 gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm sm:min-w-[240px]">
              <div className="flex flex-1 flex-col justify-center border-r border-white/10 pr-4">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Org roster
                </span>
                <span className="mt-1 text-3xl font-semibold tabular-nums text-white">
                  {loadingUsers ? "—" : users.length}
                </span>
                <span className="text-xs text-slate-500">employees</span>
              </div>
              <div className="flex flex-1 flex-col justify-center pl-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Draft size
                </span>
                <span className="mt-1 text-3xl font-semibold tabular-nums text-white">
                  {adminId ? rosterTotal : "—"}
                </span>
                <span className="text-xs text-slate-500">incl. admin</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-5xl lg:px-6 lg:pb-16 lg:pt-0 lg:-mt-20">
        <form
          id="create-team-form"
          onSubmit={handleSubmit}
          className={`${mobilePanelCls()} overflow-hidden`}
        >
          {/* Mobile: WhatsApp-style tab panels */}
          <div className="lg:hidden">
            {mobileTab === "details" ? (
              <div className="bg-white">
                <div className="border-b border-[#E9EDEF] px-4 py-3">
                  <label htmlFor="team_name_mobile" className="sr-only">
                    Team name
                  </label>
                  <input
                    id="team_name_mobile"
                    className="w-full border-0 bg-transparent py-2 text-[17px] text-[#111B21] outline-none placeholder:text-[#8696A0]"
                    placeholder="Team name"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div className="border-b border-[#E9EDEF] px-4 py-3">
                  <label htmlFor="team_info_mobile" className="sr-only">
                    Description
                  </label>
                  <textarea
                    id="team_info_mobile"
                    className="min-h-[72px] w-full resize-none border-0 bg-transparent py-1 text-[15px] leading-relaxed text-[#111B21] outline-none placeholder:text-[#8696A0]"
                    placeholder="Description (optional)"
                    value={teamInfo}
                    onChange={(e) => setTeamInfo(e.target.value)}
                  />
                </div>
                <div className="bg-[#F0F2F5] px-4 py-2">
                  <p className="text-[13px] font-medium uppercase tracking-wide text-[#667781]">
                    Summary
                  </p>
                </div>
                <div className="divide-y divide-[#E9EDEF] bg-white">
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <span className="text-[15px] text-[#111B21]">Admin</span>
                    <span className="max-w-[55%] truncate text-[15px] text-[#667781]">
                      {selectedAdmin
                        ? formatPickerName(selectedAdmin)
                        : "Not selected"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <span className="text-[15px] text-[#111B21]">Members</span>
                    <span className="text-[15px] text-[#667781]">
                      {adminId ? `${rosterTotal} total` : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <span className="text-[15px] text-[#111B21]">Org roster</span>
                    <span className="text-[15px] text-[#667781]">
                      {loadingUsers ? "…" : `${users.length} people`}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            {mobileTab === "admin" ? (
              <div>
                <div className="bg-white px-3 py-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8696A0]" />
                    <input
                      type="search"
                      className={searchFieldCls()}
                      placeholder="Search name or email"
                      value={adminSearch}
                      onChange={(e) => setAdminSearch(e.target.value)}
                    />
                  </div>
                </div>
                <p className="bg-[#F0F2F5] px-4 py-2 text-[13px] font-medium uppercase tracking-wide text-[#667781]">
                  Choose team admin
                </p>
                {loadingUsers ? (
                  <div className="flex items-center justify-center gap-2 bg-white py-16 text-[15px] text-[#667781]">
                    <Loader2 className="h-5 w-5 animate-spin text-[#128C7E]" />
                    Loading contacts…
                  </div>
                ) : (
                  <ul className="max-h-[calc(100dvh-16rem-env(safe-area-inset-bottom))] divide-y divide-[#E9EDEF] overflow-y-auto overscroll-contain bg-white">
                    {filteredAdmins.length === 0 ? (
                      <li className="px-4 py-12 text-center text-[15px] text-[#667781]">
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
                              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-[#F0F2F5] ${
                                picked ? "bg-[#E7FCE3]" : "bg-white"
                              }`}
                            >
                              <UserAvatar name={name} selected={picked} mobile />
                              <div className="min-w-0 flex-1 border-b border-transparent pb-0.5">
                                <p className="truncate text-[17px] text-[#111B21]">
                                  {name}
                                </p>
                                <p className="truncate text-[14px] text-[#667781]">
                                  {u.user_email}
                                </p>
                              </div>
                              <span
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                                  picked
                                    ? "border-[#25D366] bg-[#25D366] text-white"
                                    : "border-[#8696A0] bg-transparent"
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
              </div>
            ) : null}

            {mobileTab === "members" ? (
              <div>
                <div className="bg-white px-3 py-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8696A0]" />
                    <input
                      type="search"
                      className={searchFieldCls()}
                      placeholder="Search name or email"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                    />
                  </div>
                </div>
                <p className="bg-[#F0F2F5] px-4 py-2 text-[13px] font-medium uppercase tracking-wide text-[#667781]">
                  Add participants
                  {selectedMemberIds.size > 0
                    ? ` · ${selectedMemberIds.size} selected`
                    : ""}
                </p>
                {!loadingUsers ? (
                  <ul className="max-h-[calc(100dvh-16rem-env(safe-area-inset-bottom))] divide-y divide-[#E9EDEF] overflow-y-auto overscroll-contain bg-white">
                    {filteredMembers.length === 0 ? (
                      <li className="px-4 py-12 text-center text-[15px] text-[#667781]">
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
                              className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition active:bg-[#F0F2F5] ${
                                on ? "bg-[#E7FCE3]" : "bg-white"
                              }`}
                            >
                              <UserAvatar name={name} selected={on} mobile />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[17px] text-[#111B21]">
                                  {name}
                                </p>
                                <p className="truncate text-[14px] text-[#667781]">
                                  {u.user_email}
                                </p>
                              </div>
                              <span
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${
                                  on
                                    ? "border-[#25D366] bg-[#25D366] text-white"
                                    : "border-[#8696A0] bg-transparent"
                                }`}
                              >
                                {on ? (
                                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
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
                ) : (
                  <div className="flex items-center justify-center gap-2 bg-white py-16 text-[15px] text-[#667781]">
                    <Loader2 className="h-5 w-5 animate-spin text-[#128C7E]" />
                    Loading contacts…
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Desktop: original two-column form */}
          <div className="hidden lg:block">
          <div className="grid divide-y divide-slate-100 xl:grid-cols-12 xl:divide-x xl:divide-y-0">
            <div className="space-y-6 rounded-2xl bg-gradient-to-b from-slate-50/90 to-white p-4 ring-1 ring-slate-200/60 sm:space-y-8 sm:p-6 lg:rounded-none lg:p-10 lg:ring-0 xl:col-span-5">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Team identity
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Shown in dashboards and member directory.
                </p>
              </div>

              <div className="space-y-5">
                <div>
                  <label
                    className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400"
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
                    className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400"
                    htmlFor="team_info"
                  >
                    Description
                    <span className="ml-1.5 font-normal normal-case tracking-normal text-slate-400">
                      optional
                    </span>
                  </label>
                  <textarea
                    id="team_info"
                    className={`min-h-[120px] resize-y ${fieldCls()}`}
                    placeholder="Purpose, scope, or how this team works with others…"
                    value={teamInfo}
                    onChange={(e) => setTeamInfo(e.target.value)}
                  />
                </div>
              </div>

              <div className="hidden rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/80 lg:block lg:border lg:border-slate-200/80 lg:bg-white lg:p-5 lg:shadow-sm lg:ring-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                  Summary
                </p>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                    <span className="text-slate-500">Team</span>
                    <span className="truncate text-right font-medium text-slate-900">
                      {teamName.trim() || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                    <span className="text-slate-500">Admin</span>
                    <span className="truncate text-right font-medium text-slate-900">
                      {selectedAdmin
                        ? formatPickerName(selectedAdmin)
                        : "Not selected"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Starting roster</span>
                    <span className="font-medium tabular-nums text-slate-900">
                      {adminId ? `${rosterTotal} people` : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8 p-4 sm:space-y-10 sm:p-6 lg:p-10 xl:col-span-7">
              <section className="rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200/60 lg:rounded-none lg:bg-transparent lg:p-0 lg:ring-0">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm shadow-teal-600/25">
                        <Crown className="h-4 w-4" strokeWidth={2} />
                      </span>
                      <div>
                        <h2 className="text-sm font-semibold text-slate-900">
                          Team admin
                        </h2>
                        <p className="text-xs text-slate-500">
                          One owner for approvals and visibility.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative mt-5">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    className={searchFieldCls()}
                    placeholder="Search by name or email…"
                    value={adminSearch}
                    onChange={(e) => setAdminSearch(e.target.value)}
                  />
                </div>

                {loadingUsers ? (
                  <div className="mt-5 flex items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-14 text-sm text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
                    Loading directory…
                  </div>
                ) : (
                  <ul className="mt-4 max-h-[min(320px,50vh)] space-y-2 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin] lg:max-h-[min(280px,40vh)]">
                    {filteredAdmins.length === 0 ? (
                      <li className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center text-sm text-slate-500">
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
                              className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3.5 text-left transition active:scale-[0.995] ${
                                picked
                                  ? "border-teal-500/50 bg-teal-50/90 shadow-sm shadow-teal-600/10 ring-2 ring-teal-500/20"
                                  : "border-slate-200/80 bg-white ring-1 ring-slate-200/60 hover:border-slate-300 hover:bg-slate-50/80"
                              }`}
                            >
                              <UserAvatar name={name} selected={picked} />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-slate-900">
                                  {name}
                                </p>
                                <p className="truncate text-xs text-slate-500">
                                  {u.user_email}
                                </p>
                              </div>
                              <span
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition ${
                                  picked
                                    ? "border-teal-600 bg-teal-600 text-white"
                                    : "border-slate-200 bg-white text-transparent"
                                }`}
                                aria-hidden
                              >
                                <Check className="h-4 w-4" strokeWidth={3} />
                              </span>
                            </button>
                          </li>
                        );
                      })
                    )}
                  </ul>
                )}
              </section>

              <section className="rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200/60 lg:rounded-none lg:bg-transparent lg:p-0 lg:ring-0">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                    <UserPlus className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">
                      Additional members
                    </h2>
                    <p className="text-xs text-slate-500">
                      Admin is included automatically. Add others as needed.
                    </p>
                  </div>
                </div>

                <div className="relative mt-5">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    className={searchFieldCls()}
                    placeholder="Filter roster…"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                  />
                </div>

                {!loadingUsers ? (
                  <ul className="mt-4 max-h-[min(320px,45vh)] space-y-2 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]">
                    {filteredMembers.length === 0 ? (
                      <li className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center text-sm text-slate-500">
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
                              className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-3 py-3.5 transition active:scale-[0.995] ${
                                on
                                  ? "border-teal-500/40 bg-teal-50/50 shadow-sm shadow-teal-600/5 ring-2 ring-teal-500/15"
                                  : "border-slate-200/80 bg-white ring-1 ring-slate-200/60 hover:border-slate-300 hover:bg-slate-50/80"
                              }`}
                            >
                              <UserAvatar name={name} selected={on} />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-slate-900">
                                  {name}
                                </p>
                                <p className="truncate text-xs text-slate-500">
                                  {u.user_email}
                                </p>
                              </div>
                              <input
                                type="checkbox"
                                className="h-5 w-5 shrink-0 cursor-pointer rounded-md border-slate-300 text-teal-600 focus:ring-teal-500/30"
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
                  <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <Users className="h-3.5 w-3.5" />
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

          {/* Mobile: WhatsApp-style bottom bar */}
          <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 border-t border-[#E9EDEF] bg-white px-4 py-3 lg:hidden">
            <button
              type="submit"
              disabled={!canSubmit}
              className={btnPrimaryCls()}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" strokeWidth={2.5} />
              )}
              Create team
            </button>
          </div>

          {/* Desktop: inline footer */}
          <div className="hidden flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-10 lg:flex">
            <button
              type="button"
              onClick={() => router.push(backHref)}
              className="rounded-2xl px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || loadingUsers}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/25 transition hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Create team
            </button>
          </div>
        </form>
      </div>

      {toast && typeof document !== "undefined"
        ? createPortal(
            <div
              className="pointer-events-none fixed inset-x-0 bottom-[calc(7.5rem+env(safe-area-inset-bottom))] z-[10000] flex justify-center px-4 lg:bottom-0 lg:p-6"
              role="status"
              aria-live="polite"
            >
              <div
                className={`pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.35)] backdrop-blur-md sm:min-w-[380px] ${
                  toast.type === "success"
                    ? "border-teal-200/80 bg-white/95 text-teal-950 ring-1 ring-teal-500/15"
                    : "border-rose-200/90 bg-white/95 text-rose-950 ring-1 ring-rose-500/15"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    toast.type === "success"
                      ? "bg-teal-100 text-teal-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {toast.type === "success" ? (
                    <CheckCircle2 className="h-5 w-5" strokeWidth={2} />
                  ) : (
                    <AlertCircle className="h-5 w-5" strokeWidth={2} />
                  )}
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-[13px] font-semibold leading-snug text-slate-900">
                    {toast.type === "success" ? "All set" : "Something went wrong"}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    {toast.message}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setToast(null)}
                  className={`shrink-0 rounded-lg p-1.5 transition hover:bg-slate-100 ${
                    toast.type === "success"
                      ? "text-teal-800/70"
                      : "text-rose-800/70"
                  }`}
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
