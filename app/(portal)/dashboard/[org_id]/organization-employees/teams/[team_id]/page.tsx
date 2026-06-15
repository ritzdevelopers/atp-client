"use client";

import { useCallback, useEffect, useMemo, useState, Suspense, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CalendarClock,
  ClipboardList,
  Crown,
  Eye,
  Layers,
  Loader2,
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
import TeamMemberAttendancePanel from "../../team-group/TeamMemberAttendancePanel";
import TeamDetailDesktopLayout from "./TeamDetailDesktopLayout";

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

function profileImageUrlFromRow(userImage: unknown): string | null {
  const image = String(userImage ?? "").trim();
  return image || null;
}

function dicebearAvatar(seed: string) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

function resolveMemberAvatarSrc(
  userImage: unknown,
  name: string | null | undefined,
): string {
  const image = profileImageUrlFromRow(userImage);
  if (image) return image;
  return dicebearAvatar(String(name ?? "?"));
}

const mobileLabelCls =
  "text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]";
const mobileCaptionCls = "text-[11px] leading-snug text-[#6B7280]";

function ProfilePhotoZoomModal({
  open,
  imageUrl,
  alt,
  onClose,
}: {
  open: boolean;
  imageUrl: string;
  alt: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10060] flex items-center justify-center bg-[#111B21]/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="team-member-photo-zoom-title"
    >
      <button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label="Close profile photo"
      />
      <div className="relative z-[1] w-full max-w-sm">
        <button
          type="button"
          onClick={onClose}
          className="absolute -right-1 -top-1 z-[2] flex h-9 w-9 items-center justify-center rounded-full border border-[#E4E7EC] bg-white text-[#1F2937] shadow-lg active:scale-95"
          aria-label="Close"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={alt}
          className="max-h-[min(78vh,560px)] w-full rounded-xl bg-white object-contain shadow-2xl ring-1 ring-[#E4E7EC]"
        />
        <p
          id="team-member-photo-zoom-title"
          className="mt-2.5 text-center text-[13px] font-medium text-white"
        >
          {alt}
        </p>
      </div>
    </div>
  );
}

function TeamMemberAvatar({
  name,
  userImage,
  isAdmin = false,
  size = "md",
  onZoom,
}: {
  name: string | null | undefined;
  userImage?: unknown;
  isAdmin?: boolean;
  size?: "sm" | "md";
  onZoom: (url: string, alt: string) => void;
}) {
  const profileUrl = profileImageUrlFromRow(userImage);
  const displayName = String(name ?? "Member");
  const box = size === "sm" ? "h-10 w-10" : "h-11 w-11";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  const img = (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={resolveMemberAvatarSrc(userImage, name)}
      alt=""
      className="h-full w-full object-cover object-top"
      onError={(e) => {
        e.currentTarget.src = dicebearAvatar(displayName);
      }}
    />
  );

  const adminBadge =
    isAdmin && profileUrl ? (
      <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#FFF8E1] ring-2 ring-white">
        <Crown className="h-2.5 w-2.5 text-[#8D6E00]" aria-hidden />
      </span>
    ) : null;

  if (profileUrl) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onZoom(profileUrl, displayName);
        }}
        className={`relative ${box} shrink-0 overflow-hidden rounded-full ring-2 ring-[#E4E7EC] transition active:opacity-90`}
        aria-label={`View ${displayName} profile photo`}
      >
        {img}
        {adminBadge}
      </button>
    );
  }

  return (
    <span
      className={`relative flex ${box} shrink-0 items-center justify-center rounded-full font-semibold ring-2 ring-[#E4E7EC] ${textSize} ${
        isAdmin ? "bg-[#FFF8E1] text-[#8D6E00]" : avatarColorClass(name)
      }`}
      aria-hidden
    >
      {isAdmin ? <Crown className="h-5 w-5" /> : memberInitials(name)}
      {adminBadge}
    </span>
  );
}

function zohoPrimaryBtnCls() {
  return "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#008CD3] px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 sm:w-auto";
}

function zohoSecondaryBtnCls() {
  return "inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-[#E4E7EC] bg-white px-4 py-2.5 text-[14px] font-medium text-[#1F2937] transition active:scale-[0.98] disabled:opacity-50 sm:w-auto";
}

function searchFieldCls() {
  return "w-full rounded-lg border border-[#E4E7EC] bg-white py-2 pl-9 pr-3 text-[13px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15 lg:rounded-xl lg:py-2.5 lg:pl-10 lg:pr-4 lg:text-sm lg:shadow-sm";
}

function zohoCardCls() {
  return "overflow-hidden rounded-2xl border border-[#E4E7EC] bg-white shadow-sm";
}

function zohoDesktopPrimaryBtnCls() {
  return "inline-flex items-center justify-center gap-2 rounded-xl bg-[#008CD3] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#008CD3]/20 transition hover:bg-[#0070AA] disabled:opacity-50";
}

function zohoDesktopSecondaryBtnCls() {
  return "inline-flex items-center justify-center gap-2 rounded-xl border border-[#E4E7EC] bg-white px-4 py-2.5 text-sm font-semibold text-[#374151] transition hover:bg-[#F9FAFB] disabled:opacity-50";
}

function zohoDesktopDangerBtnCls() {
  return "inline-flex items-center justify-center gap-2 rounded-xl border border-[#FFCDD2] bg-[#FCE8E6] px-4 py-2.5 text-sm font-semibold text-[#C62828] transition hover:bg-[#FFEBEE] disabled:opacity-50";
}

function waFieldCls() {
  return "mt-2 w-full rounded-lg border border-[#E4E7EC] bg-white px-3 py-2.5 text-[14px] text-[#1F2937] outline-none focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15 lg:rounded-xl lg:py-2.5 lg:text-sm lg:shadow-sm";
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

function memberHasExitProcess(m: OrgTeamMemberRow): boolean {
  return (
    m.exit_process_application_status != null &&
    String(m.exit_process_application_status).trim() !== ""
  );
}

function exitStatusLabel(status: string | null | undefined): string {
  return String(status ?? "unknown")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function MemberExitStatusBadge({
  status,
  mobile = false,
}: {
  status: string;
  mobile?: boolean;
}) {
  if (mobile) {
    return (
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${waExitStatusChip(status)}`}
      >
        {exitStatusLabel(status)}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ${exitStatusPillClass(status)}`}
    >
      {exitStatusLabel(status)}
    </span>
  );
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
      exit_process_action_type: m.exit_process_action_type ?? null,
      exit_process_application_status: m.exit_process_application_status ?? null,
      user_image: m.user_image ?? null,
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
      className="fixed inset-0 z-[10050] flex items-end justify-center bg-[#111B21]/50 p-0 sm:items-center sm:p-4"
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
      <div className="relative flex max-h-[min(92dvh,100%)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[min(90vh,720px)] sm:rounded-2xl sm:border sm:border-slate-200/90">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#E4E7EC] bg-gradient-to-r from-[#008CD3] to-[#0070AA] px-4 py-3 sm:border-slate-100 sm:bg-white sm:px-5 sm:py-4 sm:[border-top:3px_solid_#0d9488]">
          <h2
            id="team-detail-modal"
            className="min-w-0 flex-1 pr-2 text-[15px] font-semibold leading-snug text-white sm:text-lg sm:font-bold sm:text-slate-900"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/25 bg-white/10 text-white active:bg-white/20 sm:border-slate-200 sm:bg-white sm:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          {children}
        </div>
        {footer ? (
          <div
            className="shrink-0 border-t border-[#E4E7EC] bg-[#F9FAFB] px-4 pt-3 sm:bg-slate-50/90 sm:px-5"
            style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function TeamDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <p className="text-sm">Loading team…</p>
        </div>
      }
    >
      <TeamDetailPageContent />
    </Suspense>
  );
}

function TeamDetailPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const orgId = String(params?.org_id ?? "");
  const teamId =
    searchParams.get("team_id") ||
    (String(params?.team_id ?? "") !== "0" ? String(params?.team_id ?? "") : "");

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
  const [photoZoom, setPhotoZoom] = useState<{
    imageUrl: string;
    alt: string;
  } | null>(null);
  const [attendancePanelMember, setAttendancePanelMember] = useState<{
    user_id: number;
    user_name: string;
  } | null>(null);

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
  const token = () => localStorage.getItem("token");

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

  const openPhotoZoom = (imageUrl: string, alt: string) => {
    setPhotoZoom({ imageUrl, alt });
  };

  const openAttendancePanel = (member: { user_id: number; user_name: string }) => {
    setAttendancePanelMember(member);
  };

  const closeAttendancePanel = () => {
    setAttendancePanelMember(null);
  };

  return (
    <div className="min-h-full bg-[#F5F7FA] pb-6 lg:overflow-hidden lg:pb-0">
      {/* Mobile & tablet: Zoho-style shell */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-20 border-b border-[#E4E7EC] bg-white/95 shadow-sm backdrop-blur">
          <div className="bg-gradient-to-r from-[#008CD3] via-[#007EBF] to-[#0070AA] px-3 pb-3 pt-2.5 text-white">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push(backHref)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 active:bg-white/25"
                aria-label="Back to teams"
              >
                <ArrowLeft className="h-[18px] w-[18px]" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/75">
                  Team
                </p>
                <h1 className="truncate text-[16px] font-bold leading-tight">{title}</h1>
                <p className="truncate text-[12px] text-white/80">
                  {detail.total_number_of_members} members ·{" "}
                  {detail.admin_name ?? `User #${detail.admin_id}`}
                  {detail.members.some((m) => profileImageUrlFromRow(m.user_image))
                    ? " · tap photo to enlarge"
                    : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadAll()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 active:bg-white/25"
                aria-label="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
          <div className="bg-white px-3 pb-2.5 pt-2">
            <div className="flex rounded-lg bg-[#F5F7FA] p-0.5">
              {mobileTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMobileMainTab(tab.id)}
                  className={`relative flex flex-1 items-center justify-center gap-1 rounded-md py-2 text-[11px] font-semibold transition ${
                    mobileMainTab === tab.id
                      ? "bg-white text-[#008CD3] shadow-sm ring-1 ring-[#E4E7EC]"
                      : "text-[#6B7280]"
                  }`}
                >
                  {tab.label}
                  {tab.badge != null && tab.badge > 0 ? (
                    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#008CD3]/15 px-1 text-[9px] font-bold text-[#008CD3]">
                      {tab.badge > 9 ? "9+" : tab.badge}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </div>

        {banner ? (
          <div
            className={`mx-3 mt-2 rounded-lg px-3 py-2.5 text-[12px] leading-snug ${
              banner.type === "ok"
                ? "border border-[#C8E6C9] bg-[#E6F4EA] text-[#0F9D58]"
                : "border border-[#F5C6C2] bg-[#FCE8E6] text-[#D93025]"
            }`}
            role="status"
          >
            {banner.text}
          </div>
        ) : null}

        {mobileMainTab === "members" ? (
          <div className="space-y-2 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type="search"
                placeholder="Search by name or email"
                value={memberTableSearch}
                onChange={(e) => setMemberTableSearch(e.target.value)}
                className={searchFieldCls()}
              />
            </div>
            <ul className="overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-sm">
              {filteredTableMembers.length === 0 ? (
                <li className="px-4 py-10 text-center text-[13px] text-[#6B7280]">
                  No members match your search.
                </li>
              ) : (
                filteredTableMembers.map((m) => {
                  const isAdmin = Number(m.user_id) === Number(detail.admin_id);
                  return (
                    <li
                      key={m.team_member_id}
                      className="border-b border-[#EEF2F6] last:border-b-0"
                    >
                      <div className="flex items-start gap-2.5 px-3 py-2.5">
                        <TeamMemberAvatar
                          name={m.user_name}
                          userImage={m.user_image}
                          isAdmin={isAdmin}
                          onZoom={openPhotoZoom}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="truncate text-[13px] font-semibold text-[#1F2937]">
                              {m.user_name}
                            </p>
                            {isAdmin ? (
                              <span className="shrink-0 rounded-full bg-[#FFF8E1] px-2 py-0.5 text-[10px] font-semibold text-[#8D6E00]">
                                Admin
                              </span>
                            ) : null}
                          </div>
                          <p className="truncate text-[12px] text-[#6B7280]">{m.user_email}</p>
                          <p className={`mt-0.5 ${mobileCaptionCls}`}>
                            Joined {fmtLong(m.joined_date)}
                          </p>
                          {memberHasExitProcess(m) ? (
                            <div className="mt-2">
                              <MemberExitStatusBadge
                                mobile
                                status={String(m.exit_process_application_status)}
                              />
                            </div>
                          ) : null}
                          <button
                            type="button"
                            onClick={() =>
                              openAttendancePanel({
                                user_id: Number(m.user_id),
                                user_name: m.user_name,
                              })
                            }
                            className="mt-2 inline-flex items-center gap-1 rounded-lg border border-[#B8DDF0] bg-[#E8F4FB] px-2.5 py-1.5 text-[11px] font-semibold text-[#0070AA] active:scale-[0.98]"
                          >
                            <BarChart3 className="h-3.5 w-3.5" />
                            View attendance
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        ) : null}

        {mobileMainTab === "info" ? (
          <div className="space-y-2 p-3">
            <section className="overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-sm">
              <div className="border-b border-[#EEF2F6] bg-[#F9FAFB] px-3 py-2">
                <p className={`${mobileLabelCls}`}>About</p>
              </div>
              <p className="px-3 py-3 text-[13px] leading-relaxed text-[#1F2937]">
                {detail.team_info?.trim() ||
                  "No description yet — add context so others know what this team owns."}
              </p>
            </section>
            <section className="overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-sm">
              {[
                ["Total members", String(detail.total_number_of_members)],
                [
                  "Team admin",
                  detail.admin_name ?? `User #${detail.admin_id}`,
                  `Joined ${fmtLong(detail.admin_joined_date)}`,
                ],
                ["Added by", detail.admin_added_by_name ?? "—"],
                [
                  "Created",
                  fmtLong(detail.created_at),
                  `By ${detail.created_by_name ?? `User #${detail.created_by ?? "—"}`}`,
                ],
                ["Last updated", fmtLong(detail.updated_at)],
              ].map(([label, value, sub]) => (
                <div
                  key={label}
                  className="border-b border-[#EEF2F6] px-3 py-2.5 last:border-b-0"
                >
                  <p className={mobileLabelCls}>{label}</p>
                  <p className="mt-0.5 text-[13px] font-semibold text-[#1F2937]">{value}</p>
                  {sub ? <p className={`mt-0.5 ${mobileCaptionCls}`}>{sub}</p> : null}
                </div>
              ))}
            </section>
          </div>
        ) : null}

        {mobileMainTab === "exits" ? (
          <div className="p-3">
            {exitListError ? (
              <div className="rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2.5 text-[12px] text-[#D93025]">
                {exitListError}
              </div>
            ) : exitProcesses.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#E4E7EC] bg-white px-4 py-12 text-center">
                <ClipboardList className="mx-auto h-9 w-9 text-[#9CA3AF]" />
                <p className="mt-3 text-[14px] font-semibold text-[#1F2937]">
                  No exit processes yet
                </p>
                <p className={`mt-1 ${mobileCaptionCls}`}>
                  Terminations linked to this team appear here once created.
                </p>
              </div>
            ) : (
              <ul className="overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-sm">
                {exitProcesses.map((row) => {
                  const memberForExit = detail.members.find(
                    (m) => Number(m.user_id) === Number(row.employee_id),
                  );
                  return (
                    <li key={row.id} className="border-b border-[#EEF2F6] last:border-b-0">
                      <Link
                        href={`/dashboard/${orgId}/organization-employees/teams/0/exit/0?team_id=${encodeURIComponent(teamId)}&exit_process_id=${encodeURIComponent(String(row.id))}`}
                        className="flex items-center gap-2.5 px-3 py-2.5 active:bg-[#F5F7FA]"
                      >
                        <TeamMemberAvatar
                          name={row.employee_name}
                          userImage={memberForExit?.user_image}
                          size="sm"
                          onZoom={openPhotoZoom}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold text-[#1F2937]">
                            {row.employee_name ?? `Employee #${row.employee_id}`}
                          </p>
                          <p className="truncate text-[12px] capitalize text-[#6B7280]">
                            {row.action_type}
                          </p>
                          <p className={`truncate ${mobileCaptionCls}`}>
                            Last day:{" "}
                            {row.last_working_day ? fmtLong(row.last_working_day) : "—"}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${waExitStatusChip(row.application_status)}`}
                        >
                          {String(row.application_status).replace(/_/g, " ")}
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-[#9CA3AF]" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : null}

        {mobileMainTab === "manage" ? (
          <ul className="m-3 overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-sm">
            {[
              {
                key: "add",
                onClick: () => setModal("add"),
                icon: UserPlus,
                iconCls: "bg-[#E6F4EA] text-[#0F9D58]",
                title: "Add members",
                sub: "Invite people to this team",
                titleCls: "text-[#1F2937]",
              },
              {
                key: "admin",
                onClick: () => setModal("admin"),
                icon: Crown,
                iconCls: "bg-[#FFF8E1] text-[#8D6E00]",
                title: "Change admin",
                sub: `Current: ${detail.admin_name ?? `User #${detail.admin_id}`}`,
                titleCls: "text-[#1F2937]",
              },
              {
                key: "update",
                onClick: () => {
                  setUpdateName(detail.team_name);
                  setUpdateInfo(detail.team_info ?? "");
                  setModal("update");
                },
                icon: Settings2,
                iconCls: "bg-[#E8F4FB] text-[#008CD3]",
                title: "Update team info",
                sub: "Edit team name and description",
                titleCls: "text-[#1F2937]",
              },
              {
                key: "remove",
                onClick: () => setModal("remove"),
                icon: UserMinus,
                iconCls: "bg-[#FFECEC] text-[#C62828]",
                title: "Remove members",
                sub: "Take people off the roster",
                titleCls: "text-[#C62828]",
              },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <li key={action.key} className="border-b border-[#EEF2F6] last:border-b-0">
                  <button
                    type="button"
                    onClick={action.onClick}
                    className="flex w-full items-center gap-3 px-3 py-3 text-left active:bg-[#F5F7FA]"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${action.iconCls}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[13px] font-semibold ${action.titleCls}`}>
                        {action.title}
                      </p>
                      <p className={mobileCaptionCls}>{action.sub}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#9CA3AF]" />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      {attendancePanelMember ? (
        <div className="fixed inset-0 z-[10040] flex flex-col bg-[#F5F7FA] p-3 lg:hidden">
          <TeamMemberAttendancePanel
            orgId={orgId}
            teamId={detail.team_id}
            employeeId={attendancePanelMember.user_id}
            employeeName={attendancePanelMember.user_name}
            onClose={closeAttendancePanel}
            accessMode="org_admin"
          />
        </div>
      ) : null}

      <TeamDetailDesktopLayout
        orgId={orgId}
        teamId={teamId}
        title={title}
        detail={detail}
        loading={loading}
        banner={banner}
        memberTableSearch={memberTableSearch}
        onMemberSearchChange={setMemberTableSearch}
        filteredMembers={filteredTableMembers}
        exitProcesses={exitProcesses}
        exitListError={exitListError}
        exitTotalRecords={exitTotalRecords}
        exitListLimit={EXIT_LIST_LIMIT}
        attendancePanelMember={attendancePanelMember}
        onOpenAttendance={openAttendancePanel}
        onCloseAttendance={closeAttendancePanel}
        onBack={() => router.push(backHref)}
        onRefresh={() => void loadAll()}
        onAddMembers={() => setModal("add")}
        onChangeAdmin={() => setModal("admin")}
        onUpdateInfo={() => {
          setUpdateName(detail.team_name);
          setUpdateInfo(detail.team_info ?? "");
          setModal("update");
        }}
        onRemoveMembers={() => setModal("remove")}
        fmtLong={fmtLong}
        memberInitials={memberInitials}
        memberHasExitProcess={memberHasExitProcess}
        MemberExitStatusBadge={MemberExitStatusBadge}
        exitStatusPillClass={exitStatusPillClass}
        zohoCardCls={zohoCardCls}
        zohoDesktopPrimaryBtnCls={zohoDesktopPrimaryBtnCls}
        zohoDesktopSecondaryBtnCls={zohoDesktopSecondaryBtnCls}
        zohoDesktopDangerBtnCls={zohoDesktopDangerBtnCls}
        searchFieldCls={searchFieldCls}
        mobileLabelCls={mobileLabelCls}
        mobileCaptionCls={mobileCaptionCls}
      />

      {terminateMember ? (
        <div
          className="fixed inset-0 z-[10050] flex items-end justify-center bg-[#111B21]/50 p-0 sm:items-center sm:p-4"
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
          <div className="relative flex max-h-[min(92dvh,100%)] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[min(92vh,720px)] sm:rounded-[22px] sm:border sm:border-white/10 sm:shadow-[0_24px_80px_-12px_rgba(15,23,42,0.45)] sm:ring-1 sm:ring-slate-950/[0.06]">
            <div className="relative shrink-0 overflow-hidden bg-gradient-to-r from-[#008CD3] to-[#0070AA] px-4 py-3.5 text-white sm:bg-gradient-to-br sm:from-slate-950 sm:via-slate-900 sm:to-rose-950 sm:px-6 sm:pb-8 sm:pt-7">
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

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex items-center gap-3 rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] p-3 sm:gap-4 sm:rounded-2xl sm:border-slate-100 sm:bg-gradient-to-r sm:from-slate-50 sm:to-white sm:p-4 sm:ring-1 sm:ring-slate-950/[0.03]">
                <TeamMemberAvatar
                  name={terminateMember.user_name}
                  userImage={terminateMember.user_image}
                  onZoom={openPhotoZoom}
                />
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

            <div
              className="flex shrink-0 flex-col-reverse gap-2 border-t border-[#E4E7EC] bg-[#F9FAFB] px-4 pt-3 sm:flex-row sm:justify-end sm:gap-3 sm:border-slate-100 sm:bg-slate-50/95 sm:px-6 sm:py-4"
              style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
            >
              <button
                type="button"
                disabled={busy}
                onClick={() => closeTerminateModal()}
                className={zohoSecondaryBtnCls()}
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
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-rose-600 to-rose-700 px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:rounded-xl sm:px-5 sm:text-sm"
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
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2">
              <button
                type="button"
                className={zohoSecondaryBtnCls()}
                onClick={closeChangeAdminBeforeTerminatePrompt}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`${zohoPrimaryBtnCls()} gap-2`}
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
                  className={zohoPrimaryBtnCls()}
                >
                  Save changes
                </button>,
              );
            }
            return null;
          })()
        : null}

      <ProfilePhotoZoomModal
        open={photoZoom != null}
        imageUrl={photoZoom?.imageUrl ?? ""}
        alt={photoZoom?.alt ?? ""}
        onClose={() => setPhotoZoom(null)}
      />
    </div>
  );
}
