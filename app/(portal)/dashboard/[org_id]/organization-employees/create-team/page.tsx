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
import { getAllOrgUsers, type OrgUserRow } from "@/services/adminUser";
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

function UserAvatar({
  name,
  selected,
}: {
  name: string;
  selected?: boolean;
}) {
  const ini = initialsFromName(name);
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

  return (
    <div className="min-h-full bg-[#f4f6f9]">
      <header className="relative isolate overflow-hidden bg-slate-950 px-4 pb-28 pt-8 sm:px-6 sm:pt-10 sm:pb-32">
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

      <div className="relative z-10 mx-auto max-w-5xl -mt-20 px-4 pb-16 sm:px-6">
        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_24px_72px_-12px_rgba(15,23,42,0.18)] ring-1 ring-slate-950/[0.04]"
        >
          <div className="grid divide-y divide-slate-100 xl:grid-cols-12 xl:divide-x xl:divide-y-0">
            <div className="space-y-8 bg-gradient-to-b from-slate-50/90 to-white p-6 sm:p-10 xl:col-span-5">
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
                    className="w-full rounded-2xl border border-slate-200/90 bg-white px-4 py-3.5 text-[15px] text-slate-900 shadow-sm outline-none ring-slate-950/[0.04] transition placeholder:text-slate-400 focus:border-teal-500/70 focus:ring-2 focus:ring-teal-500/20"
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
                    className="min-h-[120px] w-full resize-y rounded-2xl border border-slate-200/90 bg-white px-4 py-3.5 text-[15px] leading-relaxed text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500/70 focus:ring-2 focus:ring-teal-500/20"
                    placeholder="Purpose, scope, or how this team works with others…"
                    value={teamInfo}
                    onChange={(e) => setTeamInfo(e.target.value)}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
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

            <div className="space-y-10 p-6 sm:p-10 xl:col-span-7">
              <section>
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
                    className="w-full rounded-2xl border border-slate-200/90 bg-slate-50/80 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-teal-500/60 focus:bg-white focus:ring-2 focus:ring-teal-500/15"
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
                  <ul className="mt-4 max-h-[min(280px,40vh)] space-y-2 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]">
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
                          <li key={id || `adm-${String(u.user_email)}`}>
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
                              className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                                picked
                                  ? "border-teal-500/50 bg-teal-50/90 shadow-sm shadow-teal-600/10 ring-2 ring-teal-500/20"
                                  : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/80"
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

              <section>
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
                    className="w-full rounded-2xl border border-slate-200/90 bg-slate-50/80 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-teal-500/60 focus:bg-white focus:ring-2 focus:ring-teal-500/15"
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
                          <li key={`m-${id}`}>
                            <label
                              className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-3 py-3 transition ${
                                on
                                  ? "border-teal-500/40 bg-teal-50/50 shadow-sm shadow-teal-600/5"
                                  : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/80"
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

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-10">
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
              className="pointer-events-none fixed inset-x-0 bottom-0 z-[10000] flex justify-center p-4 sm:p-6"
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
