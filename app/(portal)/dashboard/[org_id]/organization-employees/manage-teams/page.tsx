"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Crown,
  ExternalLink,
  Info,
  Loader2,
  PlusCircle,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { getAllOrgUsers, type OrgUserRow } from "@/services/adminUser";
import {
  addMemberToOrgTeam,
  fetchAllOrgTeams,
  removeMemberFromOrgTeam,
  updateOrgTeam,
  type OrgTeamRow,
} from "@/services/orgTeams";

type ModalKind = null | "add" | "remove" | "admin" | "update";

function displayTeamTitle(raw: string) {
  return raw
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function modalShell(
  title: string,
  onClose: () => void,
  children: ReactNode,
  footer?: ReactNode,
) {
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-900/45 p-4 backdrop-blur-[2px] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="team-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close dialog backdrop"
        onClick={onClose}
      />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-400/30">
        <div
          className="border-b border-slate-100 px-5 py-4"
          style={{ borderTop: "3px solid #0d9488" }}
        >
          <h2
            id="team-modal-title"
            className="text-lg font-bold tracking-tight text-slate-900"
          >
            {title}
          </h2>
        </div>
        <div className="max-h-[min(60vh,480px)] overflow-y-auto px-5 py-4">
          {children}
        </div>
        {footer ? (
          <div className="border-t border-slate-100 bg-slate-50/80 px-5 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function ManageTeamsPage() {
  const params = useParams();
  const orgId = String(params?.org_id ?? "");

  const [teams, setTeams] = useState<OrgTeamRow[]>([]);
  const [orgUsers, setOrgUsers] = useState<OrgUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const [modal, setModal] = useState<ModalKind>(null);
  const [focusTeam, setFocusTeam] = useState<OrgTeamRow | null>(null);

  const [addSearch, setAddSearch] = useState("");
  const [removeSearch, setRemoveSearch] = useState("");
  const [adminSearch, setAdminSearch] = useState("");
  const [updateName, setUpdateName] = useState("");
  const [updateInfo, setUpdateInfo] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    setBanner(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setBanner({ type: "err", text: "Sign in required." });
        return;
      }
      const [{ teams: t }, usersRows] = await Promise.all([
        fetchAllOrgTeams(token),
        getAllOrgUsers(token),
      ]);
      setTeams(t);
      setOrgUsers(usersRows);
    } catch (e) {
      setBanner({
        type: "err",
        text: e instanceof Error ? e.message : "Failed to load teams.",
      });
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  function closeModal() {
    setModal(null);
    setFocusTeam(null);
    setAddSearch("");
    setRemoveSearch("");
    setAdminSearch("");
    setUpdateName("");
    setUpdateInfo("");
  }

  const inTeamIds = useCallback((team: OrgTeamRow) => {
    const s = new Set<number>();
    for (const m of team.members) {
      s.add(Number(m.user_id));
    }
    return s;
  }, []);

  const addCandidates = useMemo(() => {
    if (!focusTeam) return [];
    const ids = inTeamIds(focusTeam);
    const q = addSearch.trim().toLowerCase();
    return orgUsers.filter((u) => {
      const id = Number(u.id);
      if (ids.has(id)) return false;
      if (!q) return true;
      const name = String(u.user_name ?? "").toLowerCase();
      const email = String(u.user_email ?? "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [focusTeam, orgUsers, addSearch, inTeamIds]);

  const removeCandidates = useMemo(() => {
    if (!focusTeam) return [];
    const q = removeSearch.trim().toLowerCase();
    return focusTeam.members.filter((m) => {
      if (!q) return true;
      const name = String(m.user_name ?? "").toLowerCase();
      const email = String(m.user_email ?? "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [focusTeam, removeSearch]);

  const adminCandidates = useMemo(() => {
    if (!focusTeam) return [];
    const q = adminSearch.trim().toLowerCase();
    return focusTeam.members.filter((m) => {
      if (!q) return true;
      const name = String(m.user_name ?? "").toLowerCase();
      const email = String(m.user_email ?? "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [focusTeam, adminSearch]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setBanner(null);
    try {
      await action();
      await loadAll();
      closeModal();
      setBanner({ type: "ok", text: "Saved." });
    } catch (e) {
      setBanner({
        type: "err",
        text: e instanceof Error ? e.message : "Something went wrong.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 via-white to-slate-50/90">
      <div className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-teal-500/20">
                <Users className="h-3.5 w-3.5" />
                Organization teams
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                Team management
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Create clarity with structured teams, delegated admins, and fast
                member moves — without leaving this workspace.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void loadAll()}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
              <Link
                href={`/dashboard/${orgId}/organization-employees/create-team`}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-teal-600/25 transition hover:from-teal-700 hover:to-teal-600"
              >
                <PlusCircle className="h-4 w-4" />
                New team
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {banner ? (
          <div
            className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
              banner.type === "ok"
                ? "border-teal-200 bg-teal-50 text-teal-900"
                : "border-rose-200 bg-rose-50 text-rose-900"
            }`}
            role="status"
          >
            {banner.text}
          </div>
        ) : null}

        {loading && teams.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-500">
            <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
            Loading teams…
          </div>
        ) : teams.length === 0 ? (
          banner?.type === "err" ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-8 py-12 text-center text-sm text-slate-600 shadow-sm">
              Teams could not be loaded. Use Refresh or check your connection.
            </div>
          ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 px-8 py-16 text-center shadow-inner">
            <Info className="mx-auto h-10 w-10 text-slate-400" />
            <p className="mt-4 text-base font-semibold text-slate-800">
              No teams yet
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Start by creating your first team and assigning an admin.
            </p>
            <Link
              href={`/dashboard/${orgId}/organization-employees/create-team`}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-teal-700"
            >
              Create team
            </Link>
          </div>
          )
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {teams.map((team) => (
              <article
                key={team.team_id}
                className="group flex flex-col rounded-2xl border border-slate-200/90 bg-white p-6 shadow-lg shadow-slate-200/40 ring-1 ring-slate-100 transition hover:shadow-xl hover:shadow-slate-200/50"
                style={{ borderTop: "3px solid #0d9488" }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {displayTeamTitle(team.team_name)}
                    </h2>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                        <Users className="h-3.5 w-3.5" />
                        {team.total_number_of_members} members
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Crown className="h-3.5 w-3.5 text-amber-500" />
                        {team.admin_name ?? `User #${team.admin_id}`}
                      </span>
                    </p>
                  </div>
                </div>
                {team.team_info ? (
                  <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                    {team.team_info}
                  </p>
                ) : (
                  <p className="mt-3 text-sm italic text-slate-400">
                    No description
                  </p>
                )}

                <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setFocusTeam(team);
                      setModal("add");
                    }}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 min-[400px]:flex-none"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Add member
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFocusTeam(team);
                      setModal("admin");
                    }}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50 min-[400px]:flex-none"
                  >
                    <Crown className="h-3.5 w-3.5 text-amber-500" />
                    Change admin
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFocusTeam(team);
                      setUpdateName(team.team_name);
                      setUpdateInfo(team.team_info ?? "");
                      setModal("update");
                    }}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50 min-[400px]:flex-none"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    Update info
                  </button>
                  <Link
                    href={`/dashboard/${orgId}/organization-employees/teams/${team.team_id}`}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50 min-[400px]:flex-none"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View full
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setFocusTeam(team);
                      setModal("remove");
                    }}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-100 min-[400px]:flex-none"
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                    Remove member
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {modal && focusTeam
        ? (() => {
            const team = focusTeam;
            const token = () => localStorage.getItem("token");

            if (modal === "add") {
              return modalShell(
                "Add member — " + displayTeamTitle(team.team_name),
                closeModal,
                <>
                  <p className="text-sm text-slate-600">
                    Only employees who are not already on this team are listed.
                  </p>
                  <div className="relative mt-3">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                      placeholder="Search name or email…"
                      value={addSearch}
                      onChange={(e) => setAddSearch(e.target.value)}
                    />
                  </div>
                  <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                    {addCandidates.length === 0 ? (
                      <li className="py-8 text-center text-sm text-slate-500">
                        No matches.
                      </li>
                    ) : (
                      addCandidates.map((u) => (
                        <li
                          key={String(u.id)}
                          className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-slate-900">
                              {u.user_name}
                            </div>
                            <div className="truncate text-xs text-slate-500">
                              {u.user_email}
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              run(async () => {
                                const t = token();
                                if (!t) throw new Error("Sign in required.");
                                await addMemberToOrgTeam(
                                  t,
                                  team.team_id,
                                  u.id as number | string,
                                );
                              })
                            }
                            className="shrink-0 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                          >
                            Add
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </>,
                null,
              );
            }

            if (modal === "remove") {
              return modalShell(
                "Remove member — " + displayTeamTitle(team.team_name),
                closeModal,
                <>
                  <p className="text-sm text-rose-700/90">
                    Removes the member from this team (historical rows stay on
                    the server).
                  </p>
                  <div className="relative mt-3">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                      placeholder="Search member…"
                      value={removeSearch}
                      onChange={(e) => setRemoveSearch(e.target.value)}
                    />
                  </div>
                  <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                    {removeCandidates.map((m) => (
                      <li
                        key={m.team_member_id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2"
                      >
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {m.user_name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {m.user_email}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={Number(m.user_id) === Number(team.admin_id)}
                          title={
                            Number(m.user_id) === Number(team.admin_id)
                              ? "Assign another admin before removing."
                              : undefined
                          }
                          onClick={() =>
                            run(async () => {
                              const t = token();
                              if (!t) throw new Error("Sign in required.");
                              await removeMemberFromOrgTeam(
                                t,
                                team.team_id,
                                m.user_id,
                              );
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 className="h-3 w-3" />
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </>,
                null,
              );
            }

            if (modal === "admin") {
              return modalShell(
                "Change admin — " + displayTeamTitle(team.team_name),
                closeModal,
                <>
                  <p className="text-sm text-slate-600">
                    New admin must currently be an active member of the team.
                  </p>
                  <div className="relative mt-3">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                      placeholder="Search member…"
                      value={adminSearch}
                      onChange={(e) => setAdminSearch(e.target.value)}
                    />
                  </div>
                  <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                    {adminCandidates.filter(
                      (m) => Number(m.user_id) !== Number(team.admin_id),
                    ).length === 0 ? (
                      <li className="py-8 text-center text-sm text-slate-500">
                        No other active members to promote. Add a member first.
                      </li>
                    ) : (
                      adminCandidates
                        .filter(
                          (m) =>
                            Number(m.user_id) !== Number(team.admin_id),
                        )
                        .map((m) => (
                        <li
                          key={m.team_member_id}
                          className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2"
                        >
                          <span className="text-sm font-medium text-slate-900">
                            {m.user_name}
                          </span>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              run(async () => {
                                const t = token();
                                if (!t) throw new Error("Sign in required.");
                                await updateOrgTeam(t, {
                                  team_id: team.team_id,
                                  new_admin_id: m.user_id,
                                });
                              })
                            }
                            className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-amber-400 disabled:opacity-50"
                          >
                            Make admin
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </>,
                null,
              );
            }

            if (modal === "update") {
              return modalShell(
                "Update team — " + displayTeamTitle(team.team_name),
                closeModal,
                <>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                    Name
                  </label>
                  <input
                    className="mb-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                    value={updateName}
                    onChange={(e) => setUpdateName(e.target.value)}
                  />
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                    Description
                  </label>
                  <textarea
                    className="min-h-[100px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                    value={updateInfo}
                    onChange={(e) => setUpdateInfo(e.target.value)}
                  />
                </>,
                <button
                  type="button"
                  disabled={busy || !updateName.trim()}
                  onClick={() =>
                    run(async () => {
                      const t = token();
                      if (!t) throw new Error("Sign in required.");
                      await updateOrgTeam(t, {
                        team_id: team.team_id,
                        team_name: updateName.trim(),
                        team_info: updateInfo.trim(),
                      });
                    })
                  }
                  className="w-full rounded-xl bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  Save changes
                </button>,
              );
            }

            return null;
          })()
        : null}
    </div>
  );
}
