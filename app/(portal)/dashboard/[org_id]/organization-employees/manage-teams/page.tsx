"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ChevronRight,
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
  X,
} from "lucide-react";
import { getAllOrgUsers, dedupeOrgUserRows, type OrgUserRow } from "@/services/adminUser";
import {
  addMemberToOrgTeam,
  fetchAllOrgTeams,
  removeMemberFromOrgTeam,
  updateOrgTeam,
  type OrgTeamRow,
} from "@/services/orgTeams";
import {
  clearManageTeamsPageCaches,
  readManageOrgTeamsCache,
  readManageOrgUsersCache,
  shouldRefreshManageOrgTeamsCache,
  shouldRefreshManageOrgUsersCache,
  writeManageOrgTeamsCache,
  writeManageOrgUsersCache,
} from "@/lib/employeeManagementCache";

type ModalKind = null | "add" | "remove" | "admin" | "update";

function displayTeamTitle(raw: string) {
  return raw
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function teamInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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

function searchFieldCls() {
  return "w-full rounded-lg border-0 bg-[#F0F2F5] py-2.5 pl-10 pr-4 text-[15px] text-[#111B21] outline-none transition placeholder:text-[#8696A0] focus:bg-white focus:ring-1 focus:ring-[#25D366]/40 lg:rounded-xl lg:border lg:border-slate-200 lg:py-2 lg:pl-10 lg:pr-3 lg:text-sm lg:focus:border-teal-500 lg:focus:ring-2 lg:focus:ring-teal-500/20";
}

function modalShell(
  title: string,
  onClose: () => void,
  children: ReactNode,
  footer?: ReactNode,
) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-[#111B21]/40 p-0 backdrop-blur-[1px] sm:items-center sm:bg-slate-900/45 sm:p-4 sm:backdrop-blur-[2px]"
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
      <div className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-2xl sm:border sm:border-slate-200/90 sm:shadow-slate-400/30">
        <div className="flex shrink-0 items-start justify-between bg-[#128C7E] px-4 py-3.5 sm:border-b sm:border-slate-100 sm:bg-white sm:px-5 sm:py-4 sm:[border-top:3px_solid_#0d9488]">
          <h2
            id="team-modal-title"
            className="pr-8 text-[17px] font-medium leading-snug text-white sm:text-lg sm:font-bold sm:tracking-tight sm:text-slate-900"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-white/90 active:bg-white/10 sm:hidden"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:max-h-[min(60vh,480px)] sm:px-5">
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-[#E9EDEF] bg-white px-4 py-3 sm:border-slate-100 sm:bg-slate-50/80 sm:px-5">
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
  const cachedTeams = orgId ? readManageOrgTeamsCache(orgId) : null;
  const cachedUsers = orgId ? readManageOrgUsersCache(orgId) : null;

  const [teams, setTeams] = useState<OrgTeamRow[]>(() => cachedTeams ?? []);
  const [orgUsers, setOrgUsers] = useState<OrgUserRow[]>(() =>
    cachedUsers ? dedupeOrgUserRows(cachedUsers) : [],
  );
  const [loading, setLoading] = useState(() => !cachedTeams && !cachedUsers);
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
  const [teamSearch, setTeamSearch] = useState("");
  const [mobileActionsTeam, setMobileActionsTeam] = useState<OrgTeamRow | null>(
    null,
  );

  const loadAll = useCallback(async (options?: { force?: boolean }) => {
    const force = options?.force ?? false;
    if (!orgId) {
      setLoading(false);
      setBanner({ type: "err", text: "Invalid organization." });
      return;
    }

    const cachedTeamRows = readManageOrgTeamsCache(orgId);
    const cachedUserRows = readManageOrgUsersCache(orgId);

    if (!force && (cachedTeamRows || cachedUserRows)) {
      if (cachedTeamRows) setTeams(cachedTeamRows);
      if (cachedUserRows) setOrgUsers(dedupeOrgUserRows(cachedUserRows));
      setBanner(null);
      setLoading(false);

      const teamsFresh =
        cachedTeamRows && !shouldRefreshManageOrgTeamsCache(orgId);
      const usersFresh =
        cachedUserRows && !shouldRefreshManageOrgUsersCache(orgId);
      if (teamsFresh && usersFresh) {
        return;
      }
    }

    if (force) {
      clearManageTeamsPageCaches(orgId);
    }

    if (!cachedTeamRows && !cachedUserRows) {
      setLoading(true);
    }
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
      const dedupedUsers = dedupeOrgUserRows(usersRows);
      setTeams(t);
      setOrgUsers(dedupedUsers);
      writeManageOrgTeamsCache(orgId, t);
      writeManageOrgUsersCache(orgId, dedupedUsers);
    } catch (e) {
      setBanner({
        type: "err",
        text: e instanceof Error ? e.message : "Failed to load teams.",
      });
      if (!cachedTeamRows) {
        setTeams([]);
      }
      if (!cachedUserRows) {
        setOrgUsers([]);
      }
    } finally {
      setLoading(false);
    }
  }, [orgId]);

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

  const filteredTeams = useMemo(() => {
    const q = teamSearch.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter((team) => {
      const name = team.team_name.toLowerCase();
      const info = String(team.team_info ?? "").toLowerCase();
      const admin = String(team.admin_name ?? "").toLowerCase();
      return name.includes(q) || info.includes(q) || admin.includes(q);
    });
  }, [teams, teamSearch]);

  function openMobileAction(team: OrgTeamRow, kind: ModalKind) {
    setMobileActionsTeam(null);
    setFocusTeam(team);
    if (kind === "update") {
      setUpdateName(team.team_name);
      setUpdateInfo(team.team_info ?? "");
    }
    setModal(kind);
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setBanner(null);
    try {
      await action();
      await loadAll({ force: true });
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
    <div className="min-h-full bg-[#F0F2F5] lg:bg-gradient-to-b lg:from-slate-50 lg:via-white lg:to-slate-50/90">
      {/* Mobile & tablet: WhatsApp-style header */}
      <div className="sticky top-0 z-20 bg-[#128C7E] text-white shadow-sm lg:hidden">
        <div className="flex items-center gap-1 px-1 py-2">
          <div className="min-w-0 flex-1 px-2 py-1">
            <h1 className="truncate text-[17px] font-medium leading-tight">
              Teams
            </h1>
            <p className="truncate text-[13px] text-white/75">
              {loading
                ? "Loading…"
                : `${teams.length} team${teams.length === 1 ? "" : "s"} in your org`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadAll({ force: true })}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition active:bg-white/10"
            aria-label="Refresh teams"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link
            href={`/dashboard/${orgId}/organization-employees/create-team`}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition active:bg-white/10"
            aria-label="Create new team"
          >
            <PlusCircle className="h-5 w-5" />
          </Link>
        </div>
        <div className="bg-white px-3 py-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8696A0]" />
            <input
              type="search"
              className={searchFieldCls()}
              placeholder="Search teams"
              value={teamSearch}
              onChange={(e) => setTeamSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Desktop header */}
      <div className="hidden border-b border-slate-200/80 bg-white/80 backdrop-blur-md lg:block">
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
                onClick={() => void loadAll({ force: true })}
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

      {/* Mobile content */}
      <div className="lg:hidden">
        {banner ? (
          <div
            className={`mx-3 mt-3 rounded-lg px-4 py-3 text-[14px] ${
              banner.type === "ok"
                ? "bg-[#E7FCE3] text-[#0B5E44]"
                : "bg-[#FFECEC] text-[#8B1A1A]"
            }`}
            role="status"
          >
            {banner.text}
          </div>
        ) : null}

        {loading && teams.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-[#667781]">
            <Loader2 className="h-9 w-9 animate-spin text-[#128C7E]" />
            <p className="text-[15px]">Loading teams…</p>
          </div>
        ) : teams.length === 0 ? (
          banner?.type === "err" ? (
            <div className="mx-3 mt-4 rounded-lg bg-white px-6 py-12 text-center text-[15px] text-[#667781]">
              Teams could not be loaded. Tap refresh or check your connection.
            </div>
          ) : (
            <div className="mx-3 mt-4 rounded-lg bg-white px-6 py-16 text-center">
              <Info className="mx-auto h-10 w-10 text-[#8696A0]" />
              <p className="mt-4 text-[17px] font-medium text-[#111B21]">
                No teams yet
              </p>
              <p className="mt-2 text-[14px] text-[#667781]">
                Create your first team and assign an admin.
              </p>
              <Link
                href={`/dashboard/${orgId}/organization-employees/create-team`}
                className="mt-6 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#25D366] px-5 py-2.5 text-[15px] font-medium text-white active:scale-[0.98]"
              >
                <PlusCircle className="h-4 w-4" />
                Create team
              </Link>
            </div>
          )
        ) : filteredTeams.length === 0 ? (
          <div className="px-4 py-16 text-center text-[15px] text-[#667781]">
            No teams match your search.
          </div>
        ) : (
          <ul className="mt-1 divide-y divide-[#E9EDEF] bg-white">
            {filteredTeams.map((team) => {
              const title = displayTeamTitle(team.team_name);
              return (
                <li key={team.team_id}>
                  <button
                    type="button"
                    onClick={() => setMobileActionsTeam(team)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition active:bg-[#F0F2F5]"
                  >
                    <span
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-medium ${avatarColorClass(title)}`}
                      aria-hidden
                    >
                      {teamInitials(title)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[17px] text-[#111B21]">
                        {title}
                      </p>
                      <p className="truncate text-[14px] text-[#667781]">
                        {team.total_number_of_members} members ·{" "}
                        {team.admin_name ?? `User #${team.admin_id}`}
                      </p>
                      {team.team_info ? (
                        <p className="mt-0.5 truncate text-[13px] text-[#8696A0]">
                          {team.team_info}
                        </p>
                      ) : null}
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-[#8696A0]" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Desktop content */}
      <div className="mx-auto hidden max-w-6xl px-6 py-8 lg:block">
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
                    href={`/dashboard/${orgId}/organization-employees/teams/0?team_id=${encodeURIComponent(String(team.team_id))}`}
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

      {/* Mobile: team action sheet */}
      {mobileActionsTeam ? (
        <div className="fixed inset-0 z-[999] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[#111B21]/40"
            aria-label="Close menu"
            onClick={() => setMobileActionsTeam(null)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-hidden rounded-t-2xl bg-white pb-[calc(4.5rem+env(safe-area-inset-bottom))] shadow-2xl">
            <div className="bg-[#128C7E] px-4 py-4">
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-medium ${avatarColorClass(displayTeamTitle(mobileActionsTeam.team_name))}`}
                >
                  {teamInitials(displayTeamTitle(mobileActionsTeam.team_name))}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[17px] font-medium text-white">
                    {displayTeamTitle(mobileActionsTeam.team_name)}
                  </p>
                  <p className="truncate text-[13px] text-white/75">
                    {mobileActionsTeam.total_number_of_members} members
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileActionsTeam(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-white/90 active:bg-white/10"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <ul className="divide-y divide-[#E9EDEF]">
              {(
                [
                  {
                    label: "Add member",
                    icon: UserPlus,
                    action: () => openMobileAction(mobileActionsTeam, "add"),
                  },
                  {
                    label: "Change admin",
                    icon: Crown,
                    action: () => openMobileAction(mobileActionsTeam, "admin"),
                  },
                  {
                    label: "Update team info",
                    icon: Settings2,
                    action: () => openMobileAction(mobileActionsTeam, "update"),
                  },
                  {
                    label: "View full team",
                    icon: ExternalLink,
                    href: `/dashboard/${orgId}/organization-employees/teams/0?team_id=${encodeURIComponent(String(mobileActionsTeam.team_id))}`,
                  },
                  {
                    label: "Remove member",
                    icon: UserMinus,
                    action: () => openMobileAction(mobileActionsTeam, "remove"),
                    danger: true,
                  },
                ] as const
              ).map((item) => {
                const Icon = item.icon;
                const rowCls =
                  "flex w-full items-center gap-4 px-4 py-4 text-left transition active:bg-[#F0F2F5]";
                const isDanger = "danger" in item && item.danger;
                const content = (
                  <>
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        isDanger
                          ? "bg-[#FFECEC] text-[#C62828]"
                          : "bg-[#F0F2F5] text-[#54656F]"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span
                      className={`text-[16px] ${
                        isDanger ? "text-[#C62828]" : "text-[#111B21]"
                      }`}
                    >
                      {item.label}
                    </span>
                  </>
                );
                if ("href" in item && item.href) {
                  return (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        className={rowCls}
                        onClick={() => setMobileActionsTeam(null)}
                      >
                        {content}
                      </Link>
                    </li>
                  );
                }
                return (
                  <li key={item.label}>
                    <button
                      type="button"
                      className={rowCls}
                      onClick={() => {
                        if ("action" in item) item.action();
                      }}
                    >
                      {content}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}

      {modal && focusTeam
        ? (() => {
            const team = focusTeam;
            const token = () => localStorage.getItem("token");

            if (modal === "add") {
              return modalShell(
                "Add member — " + displayTeamTitle(team.team_name),
                closeModal,
                <>
                  <p className="text-[14px] text-[#667781] lg:text-sm lg:text-slate-600">
                    Only employees who are not already on this team are listed.
                  </p>
                  <div className="relative mt-3">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8696A0]" />
                    <input
                      type="search"
                      className={searchFieldCls()}
                      placeholder="Search name or email"
                      value={addSearch}
                      onChange={(e) => setAddSearch(e.target.value)}
                    />
                  </div>
                  <ul className="mt-3 max-h-[min(50dvh,320px)] divide-y divide-[#E9EDEF] overflow-y-auto lg:max-h-64 lg:space-y-2 lg:divide-y-0">
                    {addCandidates.length === 0 ? (
                      <li className="py-10 text-center text-[15px] text-[#667781] lg:py-8 lg:text-sm lg:text-slate-500">
                        No matches.
                      </li>
                    ) : (
                      addCandidates.map((u) => {
                        const name = String(u.user_name ?? "Unknown");
                        return (
                          <li
                            key={String(u.id)}
                            className="flex items-center gap-3 py-3 lg:justify-between lg:gap-2 lg:rounded-xl lg:border lg:border-slate-100 lg:bg-slate-50/80 lg:px-3 lg:py-2"
                          >
                            <span
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-medium ${avatarColorClass(name)}`}
                            >
                              {teamInitials(name)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[16px] text-[#111B21] lg:text-sm lg:font-medium lg:text-slate-900">
                                {u.user_name}
                              </div>
                              <div className="truncate text-[14px] text-[#667781] lg:text-xs lg:text-slate-500">
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
                              className="shrink-0 rounded-lg bg-[#25D366] px-4 py-2 text-[13px] font-medium text-white active:scale-[0.98] disabled:opacity-50 lg:bg-teal-600 lg:px-3 lg:py-1.5 lg:text-xs lg:font-semibold lg:hover:bg-teal-700"
                            >
                              Add
                            </button>
                          </li>
                        );
                      })
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
                  <p className="text-[14px] text-[#C62828] lg:text-sm lg:text-rose-700/90">
                    Removes the member from this team (historical rows stay on
                    the server).
                  </p>
                  <div className="relative mt-3">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8696A0]" />
                    <input
                      type="search"
                      className={searchFieldCls()}
                      placeholder="Search member"
                      value={removeSearch}
                      onChange={(e) => setRemoveSearch(e.target.value)}
                    />
                  </div>
                  <ul className="mt-3 max-h-[min(50dvh,320px)] divide-y divide-[#E9EDEF] overflow-y-auto lg:max-h-64 lg:space-y-2 lg:divide-y-0">
                    {removeCandidates.map((m) => (
                      <li
                        key={m.team_member_id}
                        className="flex items-center gap-3 py-3 lg:justify-between lg:gap-2 lg:rounded-xl lg:border lg:border-slate-100 lg:bg-slate-50/80 lg:px-3 lg:py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[16px] text-[#111B21] lg:text-sm lg:font-medium lg:text-slate-900">
                            {m.user_name}
                          </div>
                          <div className="truncate text-[14px] text-[#667781] lg:text-xs lg:text-slate-500">
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
                          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#C62828] px-3 py-2 text-[13px] font-medium text-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 lg:bg-rose-600 lg:py-1.5 lg:text-xs lg:font-semibold lg:hover:bg-rose-700"
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
                  <p className="text-[14px] text-[#667781] lg:text-sm lg:text-slate-600">
                    New admin must currently be an active member of the team.
                  </p>
                  <div className="relative mt-3">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8696A0]" />
                    <input
                      type="search"
                      className={searchFieldCls()}
                      placeholder="Search member"
                      value={adminSearch}
                      onChange={(e) => setAdminSearch(e.target.value)}
                    />
                  </div>
                  <ul className="mt-3 max-h-[min(50dvh,320px)] divide-y divide-[#E9EDEF] overflow-y-auto lg:max-h-64 lg:space-y-2 lg:divide-y-0">
                    {adminCandidates.filter(
                      (m) => Number(m.user_id) !== Number(team.admin_id),
                    ).length === 0 ? (
                      <li className="py-10 text-center text-[15px] text-[#667781] lg:py-8 lg:text-sm lg:text-slate-500">
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
                          className="flex items-center gap-3 py-3 lg:justify-between lg:gap-2 lg:rounded-xl lg:border lg:border-slate-100 lg:bg-slate-50/80 lg:px-3 lg:py-2"
                        >
                          <span className="truncate text-[16px] text-[#111B21] lg:text-sm lg:font-medium lg:text-slate-900">
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
                            className="shrink-0 rounded-lg bg-[#FFB74D] px-3 py-2 text-[13px] font-medium text-[#111B21] active:scale-[0.98] disabled:opacity-50 lg:bg-amber-500 lg:py-1.5 lg:text-xs lg:font-semibold lg:hover:bg-amber-400"
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
                  <label className="mb-1 block text-[13px] font-medium uppercase tracking-wide text-[#667781] lg:text-xs lg:font-semibold lg:text-slate-500">
                    Name
                  </label>
                  <input
                    className="mb-4 w-full rounded-lg border-0 bg-[#F0F2F5] px-3 py-3 text-[15px] text-[#111B21] outline-none focus:bg-white focus:ring-1 focus:ring-[#25D366]/40 lg:rounded-xl lg:border lg:border-slate-200 lg:bg-white lg:py-2 lg:text-sm lg:focus:border-teal-500 lg:focus:ring-2 lg:focus:ring-teal-500/20"
                    value={updateName}
                    onChange={(e) => setUpdateName(e.target.value)}
                  />
                  <label className="mb-1 block text-[13px] font-medium uppercase tracking-wide text-[#667781] lg:text-xs lg:font-semibold lg:text-slate-500">
                    Description
                  </label>
                  <textarea
                    className="min-h-[100px] w-full rounded-lg border-0 bg-[#F0F2F5] px-3 py-3 text-[15px] text-[#111B21] outline-none focus:bg-white focus:ring-1 focus:ring-[#25D366]/40 lg:rounded-xl lg:border lg:border-slate-200 lg:bg-white lg:py-2 lg:text-sm lg:focus:border-teal-500 lg:focus:ring-2 lg:focus:ring-teal-500/20"
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
                  className="w-full rounded-lg bg-[#25D366] py-3 text-[15px] font-medium text-white active:scale-[0.98] disabled:opacity-50 lg:rounded-xl lg:bg-teal-600 lg:py-2.5 lg:text-sm lg:font-semibold lg:hover:bg-teal-700"
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
