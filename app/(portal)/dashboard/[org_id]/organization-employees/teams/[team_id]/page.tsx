"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  ClipboardList,
  Crown,
  Eye,
  Layers,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  Settings2,
  ShieldAlert,
  Trash2,
  UserPlus,
  Users,
  UserMinus,
  ChevronRight,
  X,
} from "lucide-react";
import { getAllOrgUsers, type OrgUserRow } from "@/services/adminUser";
import {
  addMemberToOrgTeam,
  fetchOrgTeamById,
  removeMemberFromOrgTeam,
  updateOrgTeam,
  type OrgTeamDetail,
  type OrgTeamMemberRow,
  type OrgTeamRow,
} from "@/services/orgTeams";
import {
  createEmployeeExitProcess,
  fetchEmployeeExitProcesses,
  type EmployeeExitProcessRow,
} from "@/services/employeeExit";

type ModalKind = null | "add" | "remove" | "admin" | "update";

function displayTeamTitle(raw: string) {
  return raw
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function fmtLong(iso: string | null | undefined) {
  if (iso == null || iso === "") return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function memberInitials(name: string | null | undefined) {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
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

function avatarColorClass(name: string | null | undefined) {
  const n = String(name ?? "?");
  let hash = 0;
  for (let i = 0; i < n.length; i += 1) {
    hash = n.charCodeAt(i) + ((hash << 5) - hash);
  }
  return WA_AVATAR_COLORS[Math.abs(hash) % WA_AVATAR_COLORS.length];
}

function searchFieldCls() {
  return "w-full rounded-lg border-0 bg-[#F0F2F5] py-2.5 pl-10 pr-4 text-[15px] text-[#111B21] outline-none transition placeholder:text-[#8696A0] focus:bg-white focus:ring-1 focus:ring-[#25D366]/40 lg:rounded-xl lg:border lg:border-slate-200/90 lg:bg-white lg:py-2.5 lg:pl-10 lg:pr-4 lg:text-sm lg:shadow-sm lg:focus:border-teal-500/45 lg:focus:ring-2 lg:focus:ring-teal-500/15";
}

function waFieldCls() {
  return "mt-2 w-full rounded-lg border-0 bg-[#F0F2F5] px-3 py-3 text-[15px] text-[#111B21] outline-none focus:bg-white focus:ring-1 focus:ring-[#25D366]/40 lg:rounded-xl lg:border lg:border-slate-200 lg:bg-white lg:py-2.5 lg:text-sm lg:shadow-sm lg:focus:border-teal-500/50 lg:focus:ring-2 lg:focus:ring-teal-500/15";
}

function waPrimaryBtnCls() {
  return "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-[15px] font-medium text-white transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 lg:rounded-xl lg:bg-teal-600 lg:py-2.5 lg:text-sm lg:font-semibold lg:hover:bg-teal-700";
}

function waSecondaryBtnCls() {
  return "inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[#E9EDEF] bg-white px-4 py-2.5 text-[15px] font-medium text-[#111B21] transition active:scale-[0.98] disabled:opacity-50 lg:rounded-xl lg:border-slate-200 lg:py-2.5 lg:text-sm lg:font-semibold lg:text-slate-700 lg:hover:bg-slate-50";
}

function waDangerBtnCls() {
  return "inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-[#FFCDD2] bg-[#FFECEC] px-3 py-2 text-[13px] font-medium text-[#C62828] active:scale-[0.98] lg:rounded-xl lg:border-rose-200/90 lg:bg-gradient-to-b lg:from-white lg:to-rose-50 lg:px-3.5 lg:py-2 lg:text-[11px] lg:font-semibold lg:uppercase lg:tracking-wide";
}

function waExitStatusChip(status: string) {
  const s = String(status).toLowerCase();
  if (s === "approved") return "bg-[#E7FCE3] text-[#0B5E44]";
  if (s === "rejected") return "bg-[#FFECEC] text-[#C62828]";
  if (s === "in_progress") return "bg-[#E3F2FD] text-[#1565C0]";
  return "bg-[#FFF8E1] text-[#8D6E00]";
}

function exitStatusPillClass(status: string) {
  const s = String(status).toLowerCase();
  if (s === "approved") {
    return "bg-emerald-50 text-emerald-800 ring-emerald-200/80";
  }
  if (s === "rejected") {
    return "bg-rose-50 text-rose-800 ring-rose-200/80";
  }
  if (s === "in_progress") {
    return "bg-sky-50 text-sky-800 ring-sky-200/80";
  }
  return "bg-amber-50 text-amber-800 ring-amber-200/80";
}

function detailToRow(d: OrgTeamDetail): OrgTeamRow {
  return {
    team_id: d.team_id,
    team_name: d.team_name,
    team_info: d.team_info,
    total_number_of_members: d.total_number_of_members,
    admin_id: d.admin_id,
    admin_name: d.admin_name,
    members: d.members.map((m) => ({
      team_member_id: m.team_member_id,
      user_id: m.user_id,
      user_name: m.user_name,
      user_email: m.user_email,
      user_phone: m.user_phone,
      joined_date: m.joined_date,
      leave_date: m.leave_date,
      added_by_id: m.added_by_id,
      added_by_name: m.added_by_name,
      removed_by_id: m.removed_by_id,
      removed_by_name: m.removed_by_name,
    })),
  };
}

function modalShell(
  title: string,
  onClose: () => void,
  children: ReactNode,
  footer?: ReactNode,
) {
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-[#111B21]/40 p-0 backdrop-blur-[1px] sm:items-center sm:bg-slate-950/50 sm:p-4 sm:backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="team-detail-modal"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-2xl sm:border sm:border-slate-200/90">
        <div className="flex shrink-0 items-start justify-between bg-[#128C7E] px-4 py-3.5 sm:border-b sm:border-slate-100 sm:bg-white sm:px-5 sm:py-4 sm:[border-top:3px_solid_#0d9488]">
          <h2
            id="team-detail-modal"
            className="pr-8 text-[17px] font-medium leading-snug text-white sm:text-lg sm:font-bold sm:text-slate-900"
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
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:max-h-[min(60vh,500px)] sm:px-5">
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-[#E9EDEF] bg-white px-4 py-3 sm:border-slate-100 sm:bg-slate-50/90 sm:px-5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function TeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = String(params?.org_id ?? "");
  const teamId = String(params?.team_id ?? "");

  const [detail, setDetail] = useState<OrgTeamDetail | null>(null);
  const [orgUsers, setOrgUsers] = useState<OrgUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );
  const [memberTableSearch, setMemberTableSearch] = useState("");

  const [modal, setModal] = useState<ModalKind>(null);
  const [addSearch, setAddSearch] = useState("");
  const [removeSearch, setRemoveSearch] = useState("");
  const [adminSearch, setAdminSearch] = useState("");
  const [updateName, setUpdateName] = useState("");
  const [updateInfo, setUpdateInfo] = useState("");

  const [terminateMember, setTerminateMember] = useState<OrgTeamMemberRow | null>(
    null,
  );
  const [terminateReason, setTerminateReason] = useState("");
  const [terminateExitDate, setTerminateExitDate] = useState("");
  const [terminateLastWorkingDay, setTerminateLastWorkingDay] = useState("");
  const [terminateStatus, setTerminateStatus] = useState<
    "pending" | "approved" | "rejected" | "in_progress"
  >("pending");
  const [terminateInternalNote, setTerminateInternalNote] = useState("");
  const [changeAdminBeforeTerminateOpen, setChangeAdminBeforeTerminateOpen] =
    useState(false);

  const [exitProcesses, setExitProcesses] = useState<EmployeeExitProcessRow[]>([]);
  const [exitListError, setExitListError] = useState<string | null>(null);
  const [exitTotalRecords, setExitTotalRecords] = useState<number | null>(null);

  const [mobileMainTab, setMobileMainTab] = useState<
    "members" | "info" | "exits" | "manage"
  >("members");

  const backHref = `/dashboard/${orgId}/organization-employees/manage-teams`;

  const EXIT_LIST_LIMIT = 100;

  const loadAll = useCallback(async () => {
    if (!teamId || !orgId) return;
    setLoading(true);
    setBanner(null);
    setExitListError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setBanner({ type: "err", text: "Sign in required." });
        return;
      }
      const [d, users] = await Promise.all([
        fetchOrgTeamById(token, teamId),
        getAllOrgUsers(token),
      ]);
      setDetail(d);
      setOrgUsers(users);

      try {
        const exits = await fetchEmployeeExitProcesses(token, {
          org_id: orgId,
          team_id: teamId,
          page: 1,
          limit: EXIT_LIST_LIMIT,
          sort: "desc",
          sort_by: "created_at",
        });
        setExitProcesses(Array.isArray(exits.data) ? exits.data : []);
        setExitTotalRecords(exits.pagination?.total_records ?? null);
      } catch (exitErr) {
        setExitProcesses([]);
        setExitTotalRecords(null);
        setExitListError(
          exitErr instanceof Error ? exitErr.message : "Could not load exit processes.",
        );
      }
    } catch (e) {
      setDetail(null);
      setExitProcesses([]);
      setExitTotalRecords(null);
      setBanner({
        type: "err",
        text: e instanceof Error ? e.message : "Failed to load team.",
      });
    } finally {
      setLoading(false);
    }
  }, [teamId, orgId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const focusRow = useMemo(
    () => (detail ? detailToRow(detail) : null),
    [detail],
  );

  function closeTerminateModal() {
    setTerminateMember(null);
    setTerminateReason("");
    setTerminateExitDate("");
    setTerminateLastWorkingDay("");
    setTerminateStatus("pending");
    setTerminateInternalNote("");
  }

  function closeModal() {
    setModal(null);
    setAddSearch("");
    setRemoveSearch("");
    setAdminSearch("");
    setUpdateName("");
    setUpdateInfo("");
  }

  function closeChangeAdminBeforeTerminatePrompt() {
    setChangeAdminBeforeTerminateOpen(false);
  }

  const inTeamIds = useCallback((row: OrgTeamRow) => {
    const s = new Set<number>();
    for (const m of row.members) s.add(Number(m.user_id));
    return s;
  }, []);

  const addCandidates = useMemo(() => {
    if (!focusRow) return [];
    const ids = inTeamIds(focusRow);
    const q = addSearch.trim().toLowerCase();
    return orgUsers.filter((u) => {
      const id = Number(u.id);
      if (ids.has(id)) return false;
      if (!q) return true;
      const name = String(u.user_name ?? "").toLowerCase();
      const email = String(u.user_email ?? "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [focusRow, orgUsers, addSearch, inTeamIds]);

  const removeCandidates = useMemo(() => {
    if (!focusRow) return [];
    const q = removeSearch.trim().toLowerCase();
    return focusRow.members.filter((m) => {
      if (!q) return true;
      const name = String(m.user_name ?? "").toLowerCase();
      const email = String(m.user_email ?? "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [focusRow, removeSearch]);

  const adminCandidates = useMemo(() => {
    if (!focusRow) return [];
    const q = adminSearch.trim().toLowerCase();
    return focusRow.members.filter((m) => {
      if (!q) return true;
      const name = String(m.user_name ?? "").toLowerCase();
      const email = String(m.user_email ?? "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [focusRow, adminSearch]);

  const filteredTableMembers = useMemo(() => {
    if (!detail) return [];
    const q = memberTableSearch.trim().toLowerCase();
    return detail.members.filter((m) => {
      if (!q) return true;
      const name = String(m.user_name ?? "").toLowerCase();
      const email = String(m.user_email ?? "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [detail, memberTableSearch]);

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

  if (loading && !detail) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-[#F0F2F5] text-[#667781] lg:bg-[#f4f6f9] lg:text-slate-600">
        <Loader2 className="h-9 w-9 animate-spin text-[#128C7E] lg:h-10 lg:w-10 lg:text-teal-600" />
        <p className="text-[15px] lg:text-base">Loading team…</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <p className="text-[15px] text-[#111B21] lg:text-slate-700">Team could not be loaded.</p>
        {banner?.type === "err" ? (
          <p className="mt-2 text-sm text-rose-600">{banner.text}</p>
        ) : null}
        <Link
          href={backHref}
          className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#128C7E] px-4 py-2.5 text-[15px] font-medium text-white active:scale-[0.98] lg:bg-transparent lg:p-0 lg:text-sm lg:font-semibold lg:text-teal-700 lg:hover:text-teal-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to team management
        </Link>
      </div>
    );
  }

  const title = displayTeamTitle(detail.team_name);
  const teamDetail = detail;
  const token = () => localStorage.getItem("token");
  const sessionUserId =
    typeof window !== "undefined" ? localStorage.getItem("user_id") : null;

  function openTerminateForMember(m: OrgTeamMemberRow) {
    const isAdmin = Number(m.user_id) === Number(teamDetail.admin_id);
    if (isAdmin) {
      setChangeAdminBeforeTerminateOpen(true);
      return;
    }
    setTerminateMember(m);
    setTerminateReason("");
    setTerminateExitDate("");
    setTerminateLastWorkingDay("");
    setTerminateStatus("pending");
    setTerminateInternalNote("");
  }

  const mobileTabs: Array<{
    id: "members" | "info" | "exits" | "manage";
    label: string;
    badge?: number;
  }> = [
    { id: "members" as const, label: "Members" },
    { id: "info" as const, label: "Info" },
    {
      id: "exits" as const,
      label: "Exits",
      badge: exitProcesses.length,
    },
    { id: "manage" as const, label: "Manage" },
  ];

  return (
    <div className="min-h-full bg-[#F0F2F5] pb-24 lg:bg-[#f4f6f9]">
      {/* Mobile & tablet: WhatsApp-style shell */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-20 bg-[#128C7E] text-white shadow-sm">
          <div className="flex items-center gap-1 px-1 py-2">
            <button
              type="button"
              onClick={() => router.push(backHref)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full active:bg-white/10"
              aria-label="Back to teams"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1 py-1">
              <h1 className="truncate text-[17px] font-medium leading-tight">{title}</h1>
              <p className="truncate text-[13px] text-white/75">
                {detail.total_number_of_members} members ·{" "}
                {detail.admin_name ?? `User #${detail.admin_id}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadAll()}
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

        {mobileMainTab === "members" ? (
          <div>
            <div className="bg-white px-3 py-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8696A0]" />
                <input
                  type="search"
                  placeholder="Search by name or email"
                  value={memberTableSearch}
                  onChange={(e) => setMemberTableSearch(e.target.value)}
                  className={searchFieldCls()}
                />
              </div>
            </div>
            <ul className="divide-y divide-[#E9EDEF] bg-white">
              {filteredTableMembers.length === 0 ? (
                <li className="px-4 py-12 text-center text-[15px] text-[#667781]">
                  No members match your search.
                </li>
              ) : (
                filteredTableMembers.map((m) => {
                  const isAdmin = Number(m.user_id) === Number(detail.admin_id);
                  const hideTerminate =
                    sessionUserId != null && Number(sessionUserId) === Number(m.user_id);
                  return (
                    <li key={m.team_member_id}>
                      <div className="flex items-center gap-3 px-4 py-3">
                        <span
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                            isAdmin
                              ? "bg-[#FFF8E1] text-[#8D6E00]"
                              : avatarColorClass(m.user_name)
                          }`}
                          aria-hidden
                        >
                          {isAdmin ? (
                            <Crown className="h-5 w-5" />
                          ) : (
                            memberInitials(m.user_name)
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-[17px] text-[#111B21]">{m.user_name}</p>
                            {isAdmin ? (
                              <span className="shrink-0 rounded-full bg-[#FFF8E1] px-2 py-0.5 text-[11px] font-medium text-[#8D6E00]">
                                Admin
                              </span>
                            ) : null}
                          </div>
                          <p className="truncate text-[14px] text-[#667781]">{m.user_email}</p>
                          <p className="truncate text-[13px] text-[#8696A0]">
                            Joined {fmtLong(m.joined_date)}
                          </p>
                        </div>
                        {!hideTerminate ? (
                          <button
                            type="button"
                            onClick={() => openTerminateForMember(m)}
                            className={waDangerBtnCls()}
                          >
                            <ShieldAlert className="h-3.5 w-3.5" />
                            Exit
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        ) : null}

        {mobileMainTab === "info" ? (
          <div className="divide-y divide-[#E9EDEF] bg-white">
            <div className="px-4 py-4">
              <p className="text-[13px] font-medium uppercase tracking-wide text-[#667781]">
                About
              </p>
              <p className="mt-2 text-[15px] leading-relaxed text-[#111B21]">
                {detail.team_info?.trim() ||
                  "No description yet — add context so others know what this team owns."}
              </p>
            </div>
            <div className="px-4 py-3.5">
              <p className="text-[13px] text-[#667781]">Total members</p>
              <p className="mt-0.5 text-[17px] font-medium text-[#111B21]">
                {detail.total_number_of_members}
              </p>
            </div>
            <div className="px-4 py-3.5">
              <p className="text-[13px] text-[#667781]">Team admin</p>
              <p className="mt-0.5 text-[17px] font-medium text-[#111B21]">
                {detail.admin_name ?? `User #${detail.admin_id}`}
              </p>
              <p className="mt-1 text-[14px] text-[#8696A0]">
                Joined {fmtLong(detail.admin_joined_date)}
              </p>
            </div>
            <div className="px-4 py-3.5">
              <p className="text-[13px] text-[#667781]">Added by</p>
              <p className="mt-0.5 text-[15px] text-[#111B21]">
                {detail.admin_added_by_name ?? "—"}
              </p>
            </div>
            <div className="px-4 py-3.5">
              <p className="text-[13px] text-[#667781]">Created</p>
              <p className="mt-0.5 text-[15px] text-[#111B21]">{fmtLong(detail.created_at)}</p>
              <p className="mt-1 text-[14px] text-[#8696A0]">
                By {detail.created_by_name ?? `User #${detail.created_by ?? "—"}`}
              </p>
            </div>
            <div className="px-4 py-3.5">
              <p className="text-[13px] text-[#667781]">Last updated</p>
              <p className="mt-0.5 text-[15px] text-[#111B21]">{fmtLong(detail.updated_at)}</p>
            </div>
          </div>
        ) : null}

        {mobileMainTab === "exits" ? (
          <div>
            {exitListError ? (
              <div className="mx-3 mt-3 rounded-lg bg-[#FFECEC] px-4 py-3 text-[14px] text-[#8B1A1A]">
                {exitListError}
              </div>
            ) : exitProcesses.length === 0 ? (
              <div className="mx-3 mt-4 rounded-lg bg-white px-6 py-16 text-center">
                <ClipboardList className="mx-auto h-10 w-10 text-[#8696A0]" />
                <p className="mt-4 text-[17px] font-medium text-[#111B21]">No exit processes yet</p>
                <p className="mt-2 text-[14px] text-[#667781]">
                  Terminations linked to this team appear here once created.
                </p>
              </div>
            ) : (
              <ul className="mt-1 divide-y divide-[#E9EDEF] bg-white">
                {exitProcesses.map((row) => (
                  <li key={row.id}>
                    <Link
                      href={`/dashboard/${orgId}/organization-employees/teams/${teamId}/exit/${row.id}`}
                      className="flex items-center gap-3 px-4 py-3.5 active:bg-[#F0F2F5]"
                    >
                      <span
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-medium ${avatarColorClass(row.employee_name)}`}
                      >
                        {memberInitials(row.employee_name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[17px] text-[#111B21]">
                          {row.employee_name ?? `Employee #${row.employee_id}`}
                        </p>
                        <p className="truncate text-[14px] capitalize text-[#667781]">
                          {row.action_type}
                        </p>
                        <p className="truncate text-[13px] text-[#8696A0]">
                          Last day:{" "}
                          {row.last_working_day ? fmtLong(row.last_working_day) : "—"}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${waExitStatusChip(row.application_status)}`}
                      >
                        {String(row.application_status).replace(/_/g, " ")}
                      </span>
                      <ChevronRight className="h-5 w-5 shrink-0 text-[#8696A0]" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {mobileMainTab === "manage" ? (
          <ul className="mt-1 divide-y divide-[#E9EDEF] bg-white">
            <li>
              <button
                type="button"
                onClick={() => setModal("add")}
                className="flex w-full items-center gap-4 px-4 py-4 text-left active:bg-[#F0F2F5]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E7FCE3] text-[#0B5E44]">
                  <UserPlus className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[17px] text-[#111B21]">Add members</p>
                  <p className="text-[14px] text-[#667781]">Invite people to this team</p>
                </div>
                <ChevronRight className="h-5 w-5 text-[#8696A0]" />
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setModal("admin")}
                className="flex w-full items-center gap-4 px-4 py-4 text-left active:bg-[#F0F2F5]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFF8E1] text-[#8D6E00]">
                  <Crown className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[17px] text-[#111B21]">Change admin</p>
                  <p className="text-[14px] text-[#667781]">
                    Current: {detail.admin_name ?? `User #${detail.admin_id}`}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-[#8696A0]" />
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => {
                  setUpdateName(detail.team_name);
                  setUpdateInfo(detail.team_info ?? "");
                  setModal("update");
                }}
                className="flex w-full items-center gap-4 px-4 py-4 text-left active:bg-[#F0F2F5]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E3F2FD] text-[#1565C0]">
                  <Settings2 className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[17px] text-[#111B21]">Update info</p>
                  <p className="text-[14px] text-[#667781]">Edit team name and description</p>
                </div>
                <ChevronRight className="h-5 w-5 text-[#8696A0]" />
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setModal("remove")}
                className="flex w-full items-center gap-4 px-4 py-4 text-left active:bg-[#F0F2F5]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFECEC] text-[#C62828]">
                  <UserMinus className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[17px] text-[#C62828]">Remove members</p>
                  <p className="text-[14px] text-[#667781]">Take people off the roster</p>
                </div>
                <ChevronRight className="h-5 w-5 text-[#8696A0]" />
              </button>
            </li>
          </ul>
        ) : null}
      </div>

      {/* Desktop layout (unchanged) */}
      <div className="hidden lg:block">
      <div className="relative isolate overflow-hidden bg-slate-950 px-4 pb-16 pt-8 sm:px-8 sm:pb-20">
        <div className="pointer-events-none absolute -left-20 top-0 h-72 w-72 rounded-full bg-teal-500/20 blur-[90px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-indigo-500/15 blur-[80px]" />

        <div className="relative mx-auto max-w-6xl">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => router.push(backHref)}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-teal-100 transition hover:bg-white/15"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Teams
            </button>
            <button
              type="button"
              onClick={() => void loadAll()}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-teal-100 transition hover:bg-white/15"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-300/90">
                Team workspace
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
                {detail.team_info?.trim() || "No description yet — add context so others know what this team owns."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setModal("add");
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-lg shadow-black/20 transition hover:bg-slate-100"
              >
                <UserPlus className="h-4 w-4" />
                Add members
              </button>
              <button
                type="button"
                onClick={() => setModal("admin")}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
              >
                <Crown className="h-4 w-4 text-amber-300" />
                Change admin
              </button>
              <button
                type="button"
                onClick={() => {
                  setUpdateName(detail.team_name);
                  setUpdateInfo(detail.team_info ?? "");
                  setModal("update");
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
              >
                <Settings2 className="h-4 w-4" />
                Update info
              </button>
              <button
                type="button"
                onClick={() => setModal("remove")}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-400/40 bg-rose-500/15 px-4 py-2.5 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/25"
              >
                <UserMinus className="h-4 w-4" />
                Remove members
              </button>
            </div>
          </div>

          <div className="mt-8 w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.09] via-white/[0.04] to-transparent p-5 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.45)] backdrop-blur-md ring-1 ring-white/10 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold tracking-tight text-white">
                  Admin membership
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  How this person entered the team roster.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3 rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-2.5 ring-1 ring-amber-400/15">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/20">
                  <Crown className="h-5 w-5 text-amber-300" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {detail.admin_name ?? `User #${detail.admin_id}`}
                  </p>
                  <p className="text-[11px] text-amber-200/80">Team admin</p>
                </div>
              </div>
            </div>
            <dl className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Joined team
                </dt>
                <dd className="mt-1.5 text-sm font-medium text-white">
                  {fmtLong(detail.admin_joined_date)}
                </dd>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Added by
                </dt>
                <dd className="mt-1.5 truncate text-sm font-medium text-white">
                  {detail.admin_added_by_name ?? "—"}
                </dd>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 sm:col-span-1">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Team focus
                </dt>
                <dd className="mt-1.5 line-clamp-2 text-sm leading-snug text-slate-300">
                  {detail.team_info?.trim()
                    ? detail.team_info
                    : "No description — capture scope so admins stay aligned."}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-6xl -mt-10 px-4 sm:px-8">
        {banner ? (
          <div
            className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${
              banner.type === "ok"
                ? "border-teal-200 bg-teal-50 text-teal-900"
                : "border-rose-200 bg-rose-50 text-rose-900"
            }`}
          >
            {banner.text}
          </div>
        ) : null}

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-lg shadow-slate-200/30 ring-1 ring-slate-950/[0.04]">
            <div className="flex items-center gap-2 text-slate-500">
              <Users className="h-4 w-4 text-teal-600" />
              <span className="text-[11px] font-semibold uppercase tracking-wide">
                Total members
              </span>
            </div>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-slate-900">
              {detail.total_number_of_members}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-lg shadow-slate-200/30 ring-1 ring-slate-950/[0.04]">
            <div className="flex items-center gap-2 text-slate-500">
              <Crown className="h-4 w-4 text-amber-500" />
              <span className="text-[11px] font-semibold uppercase tracking-wide">
                Team admin
              </span>
            </div>
            <p className="mt-3 truncate text-lg font-semibold text-slate-900">
              {detail.admin_name ?? `User #${detail.admin_id}`}
            </p>
            <p className="mt-1 truncate text-xs text-slate-500">ID { String(detail.admin_id) }</p>
          </div>
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-lg shadow-slate-200/30 ring-1 ring-slate-950/[0.04]">
            <div className="flex items-center gap-2 text-slate-500">
              <CalendarClock className="h-4 w-4 text-teal-600" />
              <span className="text-[11px] font-semibold uppercase tracking-wide">
                Team created
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold leading-snug text-slate-900">
              {fmtLong(detail.created_at)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              By {detail.created_by_name ?? `User #${detail.created_by ?? "—"}`}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-lg shadow-slate-200/30 ring-1 ring-slate-950/[0.04]">
            <div className="flex items-center gap-2 text-slate-500">
              <Layers className="h-4 w-4 text-indigo-500" />
              <span className="text-[11px] font-semibold uppercase tracking-wide">
                Last updated
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold leading-snug text-slate-900">
              {fmtLong(detail.updated_at)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Schema: team record</p>
          </div>
        </div>

        <div className="mt-6 w-full overflow-hidden rounded-[22px] border border-slate-200/90 bg-gradient-to-b from-white via-white to-slate-50/40 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.12)] ring-1 ring-slate-950/[0.04]">
          <div className="relative border-b border-slate-100/90 bg-gradient-to-r from-teal-600/[0.06] via-transparent to-indigo-600/[0.05] px-5 py-5 sm:px-6">
            <div className="pointer-events-none absolute inset-y-0 right-0 w-40 bg-gradient-to-l from-teal-400/10 to-transparent blur-2xl" />
            <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-slate-900">
                  Roster
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Everyone on this team — cards stay easy to scan on any screen width.
                </p>
              </div>
              <div className="relative w-full lg:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  placeholder="Search by name or email…"
                  value={memberTableSearch}
                  onChange={(e) => setMemberTableSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200/90 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none ring-slate-950/[0.03] transition focus:border-teal-500/45 focus:ring-2 focus:ring-teal-500/15"
                />
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {filteredTableMembers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-16 text-center">
                <Users className="mx-auto h-10 w-10 text-slate-300" aria-hidden />
                <p className="mt-3 text-sm font-medium text-slate-600">No members match your search.</p>
                <p className="mt-1 text-xs text-slate-400">Try another keyword or clear the filter.</p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filteredTableMembers.map((m) => {
                  const isAdmin = Number(m.user_id) === Number(detail.admin_id);
                  const hideTerminate =
                    sessionUserId != null && Number(sessionUserId) === Number(m.user_id);
                  return (
                    <article
                      key={m.team_member_id}
                      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-white p-5 shadow-md shadow-slate-200/50 ring-1 ring-slate-950/[0.04] transition duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/10 ${
                        isAdmin
                          ? "border-amber-200/70 hover:border-amber-300/80"
                          : "border-slate-200/90 hover:border-teal-200/70"
                      }`}
                    >
                      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-teal-400/15 to-transparent opacity-0 transition group-hover:opacity-100" />
                      <div className="relative flex gap-4">
                        <div
                          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-inner ${
                            isAdmin
                              ? "bg-gradient-to-br from-amber-500 to-amber-700 shadow-amber-900/25"
                              : "bg-gradient-to-br from-teal-600 to-slate-800 shadow-black/20"
                          }`}
                          aria-hidden
                        >
                          {memberInitials(m.user_name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {isAdmin ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200/80">
                                <Crown className="h-3 w-3" aria-hidden />
                                Admin
                              </span>
                            ) : null}
                            <h3 className="truncate text-[15px] font-semibold text-slate-900">
                              {m.user_name}
                            </h3>
                          </div>
                          <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-600">
                            <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                            <span className="break-all">{m.user_email}</span>
                          </p>
                          {m.user_phone ? (
                            <p className="mt-1 pl-[22px] text-xs text-slate-400">{m.user_phone}</p>
                          ) : null}
                        </div>
                      </div>

                      <dl className="relative mt-5 grid gap-2 rounded-xl bg-slate-50/90 px-3.5 py-3 text-xs ring-1 ring-slate-100">
                        <div className="flex items-start justify-between gap-3">
                          <dt className="shrink-0 text-slate-500">Joined</dt>
                          <dd className="text-right font-medium text-slate-800">{fmtLong(m.joined_date)}</dd>
                        </div>
                        <div className="flex items-start justify-between gap-3 border-t border-slate-200/70 pt-2">
                          <dt className="shrink-0 text-slate-500">Added by</dt>
                          <dd className="max-w-[65%] truncate text-right font-medium text-slate-800">
                            {m.added_by_name ?? "—"}
                          </dd>
                        </div>
                      </dl>

                      <div className="relative mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
                        {hideTerminate ? (
                          <span className="text-[11px] text-slate-400">Your account</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (isAdmin) {
                                setChangeAdminBeforeTerminateOpen(true);
                                return;
                              }
                              setTerminateMember(m);
                              setTerminateReason("");
                              setTerminateExitDate("");
                              setTerminateLastWorkingDay("");
                              setTerminateStatus("pending");
                              setTerminateInternalNote("");
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200/90 bg-gradient-to-b from-white to-rose-50 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-rose-700 shadow-sm shadow-rose-900/[0.06] ring-rose-900/[0.04] transition hover:border-rose-300 hover:from-rose-50 hover:to-rose-100/90 hover:text-rose-900"
                          >
                            <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
                            Terminate
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 w-full overflow-hidden rounded-[22px] border border-slate-200/90 bg-gradient-to-b from-white via-white to-slate-50/40 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.12)] ring-1 ring-slate-950/[0.04]">
          <div className="relative border-b border-slate-100/90 bg-gradient-to-r from-slate-800/[0.04] via-transparent to-rose-600/[0.05] px-5 py-5 sm:px-6">
            <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md shadow-slate-900/20">
                  <ClipboardList className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <h2 className="text-base font-semibold tracking-tight text-slate-900">
                    Exit &amp; offboarding
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Exit processes filed for members of this team (
                    <span className="font-medium text-slate-600">{title}</span>).
                  </p>
                </div>
              </div>
              {exitTotalRecords != null && exitTotalRecords > 0 ? (
                <p className="text-xs font-medium tabular-nums text-slate-500 sm:text-right">
                  {exitTotalRecords} record
                  {exitTotalRecords !== 1 ? "s" : ""}
                  {exitTotalRecords > EXIT_LIST_LIMIT
                    ? ` — showing newest ${EXIT_LIST_LIMIT}`
                    : ""}
                </p>
              ) : null}
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {exitListError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                {exitListError}
              </div>
            ) : exitProcesses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-14 text-center">
                <ClipboardList className="mx-auto h-9 w-9 text-slate-300" aria-hidden />
                <p className="mt-3 text-sm font-medium text-slate-600">
                  No exit processes for this team yet.
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Terminations or resignations linked to this team appear here once created.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-100 ring-1 ring-slate-950/[0.03]">
                <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/90">
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Employee
                      </th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Type
                      </th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Dates
                      </th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Opened
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {exitProcesses.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-slate-100 bg-white transition hover:bg-slate-50/80"
                      >
                        <td className="max-w-[200px] px-4 py-3">
                          <p className="truncate font-semibold text-slate-900">
                            {row.employee_name ?? `Employee #${row.employee_id}`}
                          </p>
                          <p className="truncate text-xs text-slate-500">{row.employee_email}</p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="capitalize text-slate-700">{row.action_type}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ring-1 ${exitStatusPillClass(
                              row.application_status,
                            )}`}
                          >
                            {String(row.application_status).replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          <div className="space-y-0.5">
                            <div>
                              <span className="text-slate-400">Last day: </span>
                              {row.last_working_day
                                ? fmtLong(row.last_working_day)
                                : "—"}
                            </div>
                            <div>
                              <span className="text-slate-400">Exit: </span>
                              {row.exit_date ? fmtLong(row.exit_date) : "—"}
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                          {fmtLong(row.created_at)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/dashboard/${orgId}/organization-employees/teams/${teamId}/exit/${row.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-teal-800 transition hover:border-teal-300 hover:bg-teal-100/80"
                          >
                            <Eye className="h-3.5 w-3.5" aria-hidden />
                            View full info
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {terminateMember ? (
        <div
          className="fixed inset-0 z-[1001] flex items-end justify-center bg-[#111B21]/40 p-0 backdrop-blur-[1px] sm:items-center sm:bg-slate-950/55 sm:p-4 sm:backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="terminate-exit-dialog-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close dialog"
            onClick={() => !busy && closeTerminateModal()}
          />
          <div className="relative flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[92vh] sm:rounded-[22px] sm:border sm:border-white/10 sm:shadow-[0_24px_80px_-12px_rgba(15,23,42,0.45)] sm:ring-1 sm:ring-slate-950/[0.06]">
            <div className="relative shrink-0 overflow-hidden bg-[#128C7E] px-4 py-4 text-white sm:bg-gradient-to-br sm:from-slate-950 sm:via-slate-900 sm:to-rose-950 sm:px-6 sm:pb-8 sm:pt-7">
              <button
                type="button"
                onClick={() => !busy && closeTerminateModal()}
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-white/90 active:bg-white/10 sm:hidden"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="pointer-events-none absolute -right-16 top-0 hidden h-40 w-40 rounded-full bg-rose-500/25 blur-3xl sm:block" />
              <div className="pointer-events-none absolute -left-10 bottom-0 hidden h-32 w-32 rounded-full bg-teal-500/15 blur-3xl sm:block" />
              <div className="relative flex items-start gap-4 pr-8 sm:pr-0">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur">
                  <ShieldAlert className="h-6 w-6 text-rose-200 sm:text-rose-300" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/75 sm:text-teal-300/90">
                    Offboarding
                  </p>
                  <h2
                    id="terminate-exit-dialog-title"
                    className="mt-1 text-[17px] font-medium leading-snug text-white sm:text-xl sm:font-semibold sm:tracking-tight sm:text-2xl"
                  >
                    Initiate termination
                  </h2>
                  <p className="mt-2 max-w-md text-[14px] leading-relaxed text-white/80 sm:text-sm sm:text-slate-300">
                    Opens an employee exit record for HR review. You can refine dates before approvals are finalized.
                  </p>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:max-h-[min(52vh,520px)] sm:px-6 sm:py-5">
              <div className="flex items-center gap-4 rounded-xl border border-[#E9EDEF] bg-[#F0F2F5] p-4 sm:rounded-2xl sm:border-slate-100 sm:bg-gradient-to-r sm:from-slate-50 sm:to-white sm:ring-1 sm:ring-slate-950/[0.03]">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-semibold sm:rounded-2xl sm:bg-gradient-to-br sm:from-slate-800 sm:to-slate-950 sm:text-white sm:shadow-inner sm:shadow-black/30 ${avatarColorClass(terminateMember.user_name)}`}
                >
                  {memberInitials(terminateMember.user_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">{terminateMember.user_name}</p>
                  <p className="truncate text-sm text-slate-500">{terminateMember.user_email}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Team{" "}
                    <span className="font-medium text-slate-600">{displayTeamTitle(detail.team_name)}</span>
                  </p>
                </div>
              </div>

              <div className="mt-5 flex gap-3 rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
                <p className="leading-snug">
                  This creates an exit workflow tied to your organization. Ensure documentation and policies are followed before confirming.
                </p>
              </div>

              <div className="mt-6 space-y-5">
                <div>
                  <label
                    htmlFor="terminate-reason"
                    className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    <span>Termination reason</span>
                    <span className="font-normal normal-case text-slate-400">
                      {terminateReason.trim().length}/2000
                    </span>
                  </label>
                  <textarea
                    id="terminate-reason"
                    rows={4}
                    maxLength={2000}
                    value={terminateReason}
                    onChange={(e) => setTerminateReason(e.target.value)}
                    placeholder="Summarize grounds, policy references, or context for approvers…"
                    className={waFieldCls()}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="terminate-last-day"
                      className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      Last working day
                    </label>
                    <input
                      id="terminate-last-day"
                      type="date"
                      value={terminateLastWorkingDay}
                      onChange={(e) => setTerminateLastWorkingDay(e.target.value)}
                      className={waFieldCls()}
                    />
                    <p className="mt-1.5 text-xs text-slate-500">Final day active on payroll.</p>
                  </div>
                  <div>
                    <label
                      htmlFor="terminate-exit-date"
                      className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      Exit date
                    </label>
                    <input
                      id="terminate-exit-date"
                      type="date"
                      value={terminateExitDate}
                      onChange={(e) => setTerminateExitDate(e.target.value)}
                      className={waFieldCls()}
                    />
                    <p className="mt-1.5 text-xs text-slate-500">Official separation date if different.</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="terminate-status"
                      className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      Initial status
                    </label>
                    <select
                      id="terminate-status"
                      value={terminateStatus}
                      onChange={(e) =>
                        setTerminateStatus(
                          e.target.value as typeof terminateStatus,
                        )
                      }
                      className={waFieldCls()}
                    >
                      <option value="pending">Pending review</option>
                      <option value="in_progress">In progress</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="terminate-internal"
                      className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      Internal note{" "}
                      <span className="font-normal normal-case text-slate-400">(optional)</span>
                    </label>
                    <input
                      id="terminate-internal"
                      type="text"
                      value={terminateInternalNote}
                      onChange={(e) => setTerminateInternalNote(e.target.value)}
                      placeholder="Reference ticket or case ID"
                      className={waFieldCls()}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-[#E9EDEF] bg-white px-4 py-3 sm:flex-row sm:justify-end sm:gap-3 sm:border-slate-100 sm:bg-slate-50/95 sm:px-6 sm:py-4">
              <button
                type="button"
                disabled={busy}
                onClick={() => closeTerminateModal()}
                className={`w-full sm:w-auto ${waSecondaryBtnCls()}`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !terminateReason.trim()}
                onClick={() =>
                  void (async () => {
                    const t = token();
                    if (!t) {
                      setBanner({ type: "err", text: "Sign in required." });
                      return;
                    }
                    if (
                      terminateExitDate &&
                      terminateLastWorkingDay &&
                      new Date(terminateLastWorkingDay) > new Date(terminateExitDate)
                    ) {
                      setBanner({
                        type: "err",
                        text: "Last working day cannot be after exit date.",
                      });
                      return;
                    }
                    setBusy(true);
                    setBanner(null);
                    try {
                      await createEmployeeExitProcess(t, {
                        org_id: orgId,
                        user_id: terminateMember.user_id,
                        team_id: teamId,
                        action_type: "termination",
                        action_reason: terminateReason.trim(),
                        application_status: terminateStatus,
                        exit_date: terminateExitDate || null,
                        last_working_day: terminateLastWorkingDay || null,
                        response_message: terminateInternalNote.trim() || null,
                      });
                      await loadAll();
                      closeTerminateModal();
                      setBanner({
                        type: "ok",
                        text: "Exit process created. The termination workflow is now on file.",
                      });
                    } catch (e) {
                      setBanner({
                        type: "err",
                        text: e instanceof Error ? e.message : "Request failed.",
                      });
                    } finally {
                      setBusy(false);
                    }
                  })()
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-900/25 transition hover:from-rose-500 hover:to-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Submitting…
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-4 w-4" aria-hidden />
                    Confirm termination
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {changeAdminBeforeTerminateOpen
        ? modalShell(
            "Change Admin of the team",
            closeChangeAdminBeforeTerminatePrompt,
            <>
              <p className="text-sm text-slate-700 leading-relaxed">
                This employee is the team admin. Assign a different member as admin
                before you can start termination for them.
              </p>
            </>,
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={closeChangeAdminBeforeTerminatePrompt}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                onClick={() => {
                  closeChangeAdminBeforeTerminatePrompt();
                  setModal("admin");
                }}
              >
                <Crown className="h-4 w-4 text-amber-200" aria-hidden />
                Change admin
              </button>
            </div>,
          )
        : null}

      {modal && focusRow
        ? (() => {
            const team = focusRow;
            if (modal === "add") {
              return modalShell(
                "Add member — " + displayTeamTitle(team.team_name),
                closeModal,
                <>
                  <p className="text-sm text-slate-600">
                    Only people not already on this team are listed.
                  </p>
                  <div className="relative mt-3">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-teal-500/20"
                      placeholder="Search name or email…"
                      value={addSearch}
                      onChange={(e) => setAddSearch(e.target.value)}
                    />
                  </div>
                  <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                    {addCandidates.length === 0 ? (
                      <li className="py-8 text-center text-sm text-slate-500">No matches.</li>
                    ) : (
                      addCandidates.map((u) => (
                        <li
                          key={String(u.id)}
                          className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{u.user_name}</div>
                            <div className="truncate text-xs text-slate-500">{u.user_email}</div>
                          </div>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              run(async () => {
                                const t = token();
                                if (!t) throw new Error("Sign in required.");
                                await addMemberToOrgTeam(t, team.team_id, u.id as number | string);
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
                  <p className="text-sm text-rose-800/90">
                    Soft-removes the member from the active roster.
                  </p>
                  <div className="relative mt-3">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-teal-500/20"
                      placeholder="Search…"
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
                          <div className="text-sm font-medium">{m.user_name}</div>
                          <div className="text-xs text-slate-500">{m.user_email}</div>
                        </div>
                        <button
                          type="button"
                          disabled={Number(m.user_id) === Number(team.admin_id)}
                          title={
                            Number(m.user_id) === Number(team.admin_id)
                              ? "Change admin first."
                              : undefined
                          }
                          onClick={() =>
                            run(async () => {
                              const t = token();
                              if (!t) throw new Error("Sign in required.");
                              await removeMemberFromOrgTeam(t, team.team_id, m.user_id);
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-40"
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
                    New admin must be an active member of this team.
                  </p>
                  <div className="relative mt-3">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-teal-500/20"
                      placeholder="Search member…"
                      value={adminSearch}
                      onChange={(e) => setAdminSearch(e.target.value)}
                    />
                  </div>
                  <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                    {adminCandidates.filter((m) => Number(m.user_id) !== Number(team.admin_id))
                      .length === 0 ? (
                      <li className="py-8 text-center text-sm text-slate-500">
                        No other members to promote.
                      </li>
                    ) : (
                      adminCandidates
                        .filter((m) => Number(m.user_id) !== Number(team.admin_id))
                        .map((m) => (
                          <li
                            key={m.team_member_id}
                            className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2"
                          >
                            <span className="text-sm font-medium">{m.user_name}</span>
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
                    className="mb-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500/20"
                    value={updateName}
                    onChange={(e) => setUpdateName(e.target.value)}
                  />
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                    Description
                  </label>
                  <textarea
                    className="min-h-[100px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500/20"
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
