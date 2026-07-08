"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ChevronRight,
  Crown,
  ExternalLink,
  Info,
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
import {
  avatarCls,
  btnBrandCls,
  btnDangerCls,
  btnGhostCls,
  dashCardCls,
  dashPageCls,
  dashSectionMetaCls,
  iconBadgeCls,
  statBoxCls,
  userInitials,
} from "@/components/portal-dashboard/home/dashboardTokens";

type ModalKind = null | "add" | "remove" | "admin" | "update";

function displayTeamTitle(raw: string) {
  return raw
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function searchFieldCls() {
  return "w-full rounded-xl border border-slate-200/90 bg-white py-2.5 pl-10 pr-3 text-[13px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15 disabled:opacity-60";
}

function Shimmer({ className = "" }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-xl ${className}`} />;
}

function ManageTeamsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading teams">
      <div className={`${dashCardCls} overflow-hidden lg:hidden`}>
        <div className="space-y-3 p-4">
          <div className="flex items-center gap-3">
            <Shimmer className="h-10 w-10 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Shimmer className="h-4 w-28" />
              <Shimmer className="h-3 w-40" />
            </div>
            <Shimmer className="h-9 w-9 rounded-xl" />
          </div>
          <Shimmer className="h-10 w-full" />
        </div>
      </div>

      <div className={`${dashCardCls} hidden overflow-hidden lg:block`}>
        <div className="border-b border-slate-100 bg-gradient-to-r from-[#F8FAFC] via-white to-[#F0F9FF]/40 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <Shimmer className="h-11 w-11 rounded-xl" />
              <div className="space-y-2">
                <Shimmer className="h-3 w-32" />
                <Shimmer className="h-6 w-48" />
                <Shimmer className="h-4 w-72 max-w-full" />
              </div>
            </div>
            <div className="flex gap-2">
              <Shimmer className="h-10 w-24" />
              <Shimmer className="h-10 w-28" />
              <Shimmer className="h-16 w-20" />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 px-6 py-4">
          <Shimmer className="h-4 w-36" />
          <Shimmer className="h-10 w-72 max-w-full" />
        </div>
      </div>

      <div className="space-y-3 lg:hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`${dashCardCls} flex items-center gap-3 p-4`}>
            <Shimmer className="h-12 w-12 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Shimmer className="h-4 w-2/5" />
              <Shimmer className="h-3 w-3/5" />
            </div>
            <Shimmer className="h-5 w-5 rounded" />
          </div>
        ))}
      </div>

      <div className="hidden gap-5 md:grid-cols-2 lg:grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`${dashCardCls} p-5`}>
            <div className="flex items-start gap-3">
              <Shimmer className="h-11 w-11 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Shimmer className="h-5 w-40" />
                <Shimmer className="h-3 w-56" />
              </div>
            </div>
            <Shimmer className="mt-4 h-12 w-full" />
            <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              <Shimmer className="h-9 w-28" />
              <Shimmer className="h-9 w-32" />
              <Shimmer className="h-9 w-28" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function modalShell(
  title: string,
  onClose: () => void,
  children: ReactNode,
  footer?: ReactNode,
) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
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
      <div className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-slate-200/90 bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-2xl">
        <div className="flex shrink-0 items-start justify-between border-b border-slate-100 bg-gradient-to-r from-[#F8FAFC] via-white to-[#F0F9FF]/40 px-4 py-4 sm:px-5">
          <h2
            id="team-modal-title"
            className="pr-10 text-[16px] font-semibold tracking-tight text-slate-900 sm:text-lg"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/90 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:max-h-[min(60vh,480px)] sm:px-5">
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-slate-100 bg-slate-50/80 px-4 py-3 sm:px-5">
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

  const totalMembers = useMemo(
    () => teams.reduce((sum, team) => sum + Number(team.total_number_of_members || 0), 0),
    [teams],
  );

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

  const createTeamHref = `/dashboard/${orgId}/organization-employees/create-team`;
  const showSkeleton = loading && teams.length === 0;

  return (
    <div className={`${dashPageCls} pb-8`}>
      {/* Mobile / tablet sticky header */}
      <div className="sticky top-0 z-20 -mx-3 border-b border-slate-200/80 bg-white/95 px-3 pb-3 pt-3 shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur-md sm:-mx-5 sm:px-4 lg:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className={iconBadgeCls("blue")}>
              <Users className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <h1 className="text-[17px] font-semibold tracking-tight text-slate-900">
                Teams
              </h1>
              <p className={`mt-0.5 ${dashSectionMetaCls}`}>
                {loading
                  ? "Loading workspace…"
                  : `${teams.length} team${teams.length === 1 ? "" : "s"} · organize people & admins`}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => void loadAll({ force: true })}
              className={`${btnGhostCls()} !min-h-[36px] !w-9 !px-0`}
              aria-label="Refresh teams"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Link
              href={createTeamHref}
              className={`${btnBrandCls()} !min-h-[36px] !px-2.5 !text-[11px]`}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              New
            </Link>
          </div>
        </div>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            className={searchFieldCls()}
            placeholder="Search teams, admin, description…"
            value={teamSearch}
            onChange={(e) => setTeamSearch(e.target.value)}
            disabled={showSkeleton}
          />
        </div>
        {!showSkeleton && teams.length > 0 ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <p className={dashSectionMetaCls}>
              <span className="font-semibold text-slate-900">
                {filteredTeams.length}
              </span>{" "}
              shown
            </p>
            <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-0.5 text-[10px] font-semibold text-[#008CD3] ring-1 ring-[#008CD3]/20">
              {totalMembers} members
            </span>
            {teamSearch.trim() ? (
              <button
                type="button"
                onClick={() => setTeamSearch("")}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
              >
                Clear
                <X className="h-3 w-3" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Desktop header */}
      <header className={`${dashCardCls} hidden overflow-hidden lg:block`}>
        <div className="border-b border-slate-100 bg-gradient-to-r from-[#F8FAFC] via-white to-[#F0F9FF]/40 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className={iconBadgeCls("blue")}>
                <Users className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                  Organization · Teams
                </p>
                <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">
                  Team management
                </h1>
                <p className={`mt-1 max-w-2xl ${dashSectionMetaCls}`}>
                  Structure teams, assign admins, and move members without leaving
                  this workspace.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void loadAll({ force: true })}
                className={btnGhostCls()}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <Link href={createTeamHref} className={btnBrandCls()}>
                <PlusCircle className="h-4 w-4" />
                New team
              </Link>
              {!showSkeleton ? (
                <>
                  <div className={`${statBoxCls("sky")} min-w-[88px] text-center`}>
                    <p className="text-lg font-semibold tabular-nums text-[#008CD3]">
                      {teams.length}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Teams
                    </p>
                  </div>
                  <div className={`${statBoxCls("emerald")} min-w-[88px] text-center`}>
                    <p className="text-lg font-semibold tabular-nums text-emerald-700">
                      {totalMembers}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600/80">
                      Members
                    </p>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className={dashSectionMetaCls}>
            {showSkeleton
              ? "Loading teams…"
              : `${filteredTeams.length} of ${teams.length} team${teams.length === 1 ? "" : "s"}`}
          </p>
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              className={searchFieldCls()}
              placeholder="Search teams, admin, description…"
              value={teamSearch}
              onChange={(e) => setTeamSearch(e.target.value)}
              disabled={showSkeleton}
            />
          </div>
        </div>
      </header>

      {banner ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            banner.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
          role="status"
        >
          {banner.text}
        </div>
      ) : null}

      {showSkeleton ? (
        <ManageTeamsSkeleton />
      ) : teams.length === 0 ? (
        banner?.type === "err" ? (
          <div className={`${dashCardCls} px-6 py-14 text-center`}>
            <Info className="mx-auto h-10 w-10 text-slate-400" />
            <p className="mt-4 text-[15px] font-semibold text-slate-800">
              Teams could not be loaded
            </p>
            <p className={`mt-2 ${dashSectionMetaCls}`}>
              Check your connection, then try again.
            </p>
            <button
              type="button"
              onClick={() => void loadAll({ force: true })}
              className={`${btnGhostCls()} mt-6`}
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        ) : (
          <div className={`${dashCardCls} px-6 py-16 text-center`}>
            <span className={`${iconBadgeCls("blue")} mx-auto h-12 w-12`}>
              <Users className="h-5 w-5" />
            </span>
            <p className="mt-4 text-[16px] font-semibold text-slate-900">
              No teams yet
            </p>
            <p className={`mx-auto mt-2 max-w-md ${dashSectionMetaCls}`}>
              Create your first team and assign an admin to start organizing people.
            </p>
            <Link href={createTeamHref} className={`${btnBrandCls()} mt-6`}>
              <PlusCircle className="h-4 w-4" />
              Create team
            </Link>
          </div>
        )
      ) : filteredTeams.length === 0 ? (
        <div className={`${dashCardCls} px-6 py-14 text-center`}>
          <Search className="mx-auto h-9 w-9 text-slate-300" />
          <p className="mt-3 text-[15px] font-semibold text-slate-800">
            No teams match your search
          </p>
          <p className={`mt-1 ${dashSectionMetaCls}`}>
            Try a different name, admin, or description.
          </p>
          <button
            type="button"
            onClick={() => setTeamSearch("")}
            className={`${btnGhostCls()} mt-5`}
          >
            Clear search
          </button>
        </div>
      ) : (
        <>
          {/* Mobile list */}
          <ul className={`${dashCardCls} divide-y divide-slate-100 overflow-hidden lg:hidden`}>
            {filteredTeams.map((team) => {
              const title = displayTeamTitle(team.team_name);
              return (
                <li key={team.team_id}>
                  <button
                    type="button"
                    onClick={() => setMobileActionsTeam(team)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition active:bg-slate-50 hover:bg-slate-50/80"
                  >
                    <span className={avatarCls()} aria-hidden>
                      {userInitials(title)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-slate-900">
                        {title}
                      </p>
                      <p className={`mt-0.5 truncate ${dashSectionMetaCls}`}>
                        {team.total_number_of_members} members ·{" "}
                        {team.admin_name ?? `User #${team.admin_id}`}
                      </p>
                      {team.team_info ? (
                        <p className="mt-0.5 truncate text-[12px] text-slate-400">
                          {team.team_info}
                        </p>
                      ) : null}
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Desktop cards */}
          <div className="hidden gap-5 md:grid-cols-2 lg:grid">
            {filteredTeams.map((team) => {
              const title = displayTeamTitle(team.team_name);
              const teamHref = `/dashboard/${orgId}/organization-employees/teams/0?team_id=${encodeURIComponent(String(team.team_id))}`;
              return (
                <article
                  key={team.team_id}
                  className={`${dashCardCls} flex flex-col p-5 transition hover:border-[#008CD3]/25 hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)]`}
                >
                  <div className="flex items-start gap-3">
                    <span className={avatarCls()} aria-hidden>
                      {userInitials(title)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-[16px] font-semibold tracking-tight text-slate-900">
                        {title}
                      </h2>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                          <Users className="h-3.5 w-3.5" />
                          {team.total_number_of_members} members
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200/70">
                          <Crown className="h-3.5 w-3.5 text-amber-500" />
                          {team.admin_name ?? `User #${team.admin_id}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {team.team_info ? (
                    <p className="mt-4 line-clamp-2 text-[13px] leading-relaxed text-slate-600">
                      {team.team_info}
                    </p>
                  ) : (
                    <p className="mt-4 text-[13px] italic text-slate-400">
                      No description
                    </p>
                  )}

                  <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setFocusTeam(team);
                        setModal("add");
                      }}
                      className={`${btnBrandCls()} !min-h-[36px] !px-3 !text-[12px]`}
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
                      className={`${btnGhostCls()} !min-h-[36px] !px-3 !text-[12px]`}
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
                      className={`${btnGhostCls()} !min-h-[36px] !px-3 !text-[12px]`}
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                      Update
                    </button>
                    <Link
                      href={teamHref}
                      className={`${btnGhostCls()} !min-h-[36px] !px-3 !text-[12px]`}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setFocusTeam(team);
                        setModal("remove");
                      }}
                      className={`${btnDangerCls()} !min-h-[36px] !bg-rose-50 !px-3 !text-[12px] !text-rose-700 hover:!bg-rose-100`}
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {/* Mobile action sheet */}
      {mobileActionsTeam ? (
        <div className="fixed inset-0 z-[999] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
            aria-label="Close menu"
            onClick={() => setMobileActionsTeam(null)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-hidden rounded-t-2xl border border-slate-200/90 bg-white pb-[calc(4.5rem+env(safe-area-inset-bottom))] shadow-2xl">
            <div className="border-b border-slate-100 bg-gradient-to-r from-[#F8FAFC] via-white to-[#F0F9FF]/40 px-4 py-4">
              <div className="flex items-center gap-3">
                <span className={avatarCls()}>
                  {userInitials(displayTeamTitle(mobileActionsTeam.team_name))}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px] font-semibold text-slate-900">
                    {displayTeamTitle(mobileActionsTeam.team_name)}
                  </p>
                  <p className={dashSectionMetaCls}>
                    {mobileActionsTeam.total_number_of_members} members ·{" "}
                    {mobileActionsTeam.admin_name ??
                      `User #${mobileActionsTeam.admin_id}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileActionsTeam(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/90 text-slate-500 hover:bg-slate-50"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <ul className="divide-y divide-slate-100">
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
                  "flex w-full items-center gap-3 px-4 py-3.5 text-left transition active:bg-slate-50";
                const isDanger = "danger" in item && item.danger;
                const content = (
                  <>
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        isDanger
                          ? "bg-rose-50 text-rose-600"
                          : "bg-sky-50 text-[#008CD3]"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span
                      className={`text-[15px] font-medium ${
                        isDanger ? "text-rose-700" : "text-slate-900"
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
                  <p className={dashSectionMetaCls}>
                    Only employees who are not already on this team are listed.
                  </p>
                  <div className="relative mt-3">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      className={searchFieldCls()}
                      placeholder="Search name or email"
                      value={addSearch}
                      onChange={(e) => setAddSearch(e.target.value)}
                    />
                  </div>
                  <ul className="mt-3 max-h-[min(50dvh,320px)] space-y-2 overflow-y-auto">
                    {addCandidates.length === 0 ? (
                      <li className="py-10 text-center text-sm text-slate-500">
                        No matches.
                      </li>
                    ) : (
                      addCandidates.map((u) => {
                        const name = String(u.user_name ?? "Unknown");
                        return (
                          <li
                            key={String(u.id)}
                            className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5"
                          >
                            <span className={`${avatarCls("sm")}`}>
                              {userInitials(name)}
                            </span>
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
                              className={`${btnBrandCls()} !min-h-[34px] !px-3 !text-[12px]`}
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
                  <p className="text-sm text-rose-700/90">
                    Removes the member from this team (historical rows stay on
                    the server).
                  </p>
                  <div className="relative mt-3">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      className={searchFieldCls()}
                      placeholder="Search member"
                      value={removeSearch}
                      onChange={(e) => setRemoveSearch(e.target.value)}
                    />
                  </div>
                  <ul className="mt-3 max-h-[min(50dvh,320px)] space-y-2 overflow-y-auto">
                    {removeCandidates.map((m) => (
                      <li
                        key={m.team_member_id}
                        className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-slate-900">
                            {m.user_name}
                          </div>
                          <div className="truncate text-xs text-slate-500">
                            {m.user_email}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={
                            busy || Number(m.user_id) === Number(team.admin_id)
                          }
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
                          className={`${btnDangerCls()} !min-h-[34px] !px-3 !text-[12px]`}
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
                  <p className={dashSectionMetaCls}>
                    New admin must currently be an active member of the team.
                  </p>
                  <div className="relative mt-3">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      className={searchFieldCls()}
                      placeholder="Search member"
                      value={adminSearch}
                      onChange={(e) => setAdminSearch(e.target.value)}
                    />
                  </div>
                  <ul className="mt-3 max-h-[min(50dvh,320px)] space-y-2 overflow-y-auto">
                    {adminCandidates.filter(
                      (m) => Number(m.user_id) !== Number(team.admin_id),
                    ).length === 0 ? (
                      <li className="py-10 text-center text-sm text-slate-500">
                        No other active members to promote. Add a member first.
                      </li>
                    ) : (
                      adminCandidates
                        .filter(
                          (m) => Number(m.user_id) !== Number(team.admin_id),
                        )
                        .map((m) => (
                          <li
                            key={m.team_member_id}
                            className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5"
                          >
                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">
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
                              className="inline-flex min-h-[34px] items-center justify-center rounded-lg bg-amber-500 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-amber-600 disabled:opacity-40"
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
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Name
                  </label>
                  <input
                    className="mb-4 w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15"
                    value={updateName}
                    onChange={(e) => setUpdateName(e.target.value)}
                  />
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Description
                  </label>
                  <textarea
                    className="min-h-[100px] w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15"
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
                  className={`${btnBrandCls(true)}`}
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
