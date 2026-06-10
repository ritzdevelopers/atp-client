"use client";

import { useCallback, useEffect, useMemo, useState, Suspense, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  Crown,
  HelpCircle,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import { getAllOrgUsers, type OrgUserRow } from "@/services/adminUser";
import {
  applyForLeave,
  fetchMyLeaveQueries,
  respondToLeaveRequest,
  validateLeaveApplication,
  type LeaveQueryRow as EmployeeLeaveRow,
} from "@/services/employeeLeaves";
import AssignedLeaveTypeSelect from "@/components/portal-dashboard/user-layout/AssignedLeaveTypeSelect";
import { useAssignedLeaveTypes } from "@/hooks/useAssignedLeaveTypes";
import {
  addMemberToOrgTeam,
  fetchMyOrgTeam,
  fetchTeamActivityFeed,
  removeMemberFromOrgTeam,
  type OrgTeamDetail,
  type OrgTeamRow,
  type TeamActivityNotification,
  type TeamExitProcessFeedRow,
  type TeamLeaveQueryRow,
} from "@/services/orgTeams";
import {
  attendanceCategoryLabel,
  fetchAllAttendanceQueries,
  fetchMyAttendanceQueries,
  raiseAttendanceQuery,
  updateAttendanceQueryStatus,
  type AttendanceQueryCategory,
  type AttendanceQueryRow,
} from "@/services/attendanceQueries";
import TeamMemberExitProcessReportPage from "./exit-process-report/[user_id]/page";
import TeamMemberAttendancePanel from "./TeamMemberAttendancePanel";

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

function fmtDateOnly(value: string | null | undefined) {
  if (value == null || value === "") return "—";
  const raw = String(value);
  const ymd = raw.length >= 10 ? raw.slice(0, 10) : raw;
  const d = new Date(ymd);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function attendeeFromQuery(
  row: AttendanceQueryRow,
  detail: OrgTeamDetail,
  users: OrgUserRow[],
): { name: string; email: string; phone: string | null } {
  const member = detail.members.find(
    (m) => Number(m.user_id) === Number(row.user_id),
  );
  if (member) {
    return {
      name: member.user_name,
      email: member.user_email,
      phone: member.user_phone ?? null,
    };
  }
  const u = users.find((x) => Number(x.id) === Number(row.user_id));
  if (u) {
    return {
      name: String(u.user_name ?? ""),
      email: String(u.user_email ?? ""),
      phone: null,
    };
  }
  return {
    name: `User #${row.user_id}`,
    email: "",
    phone: null,
  };
}

function exitFeedActionHeadline(actionType: string | null | undefined): string {
  const s = String(actionType ?? "").trim().toLowerCase();
  if (s === "termination") return "Termination — in progress";
  if (s === "resignation") return "Resignation — in progress";
  if (!s) return "Employee exit — in progress";
  return `${s.replace(/_/g, " ")} — in progress`;
}

function actionLabel(type: string): string {
  switch (type) {
    case "CREATE_ORG_TEAM":
      return "Team created";
    case "UPDATE_ORG_TEAM":
      return "Team updated";
    case "ADD_MEMBER_TO_TEAM":
      return "Member added";
    case "REMOVE_MEMBER_FROM_TEAM":
      return "Member removed";
    default:
      return type.replace(/_/g, " ");
  }
}

function leaveTypeLabel(t: string): string {
  return t.replace(/_/g, " ");
}

function leaveStatusChipClass(status: string): string {
  const s = String(status).toLowerCase();
  if (s === "approved") return "bg-emerald-500/15 text-emerald-800 ring-emerald-500/25";
  if (s === "rejected") return "bg-rose-500/15 text-rose-800 ring-rose-500/25";
  return "bg-amber-500/15 text-amber-900 ring-amber-500/25";
}

function initialsFromName(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0]![0] ?? "?").toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase() || "?";
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

function profileImageUrlFromRow(userImage: unknown): string | null {
  const image = String(userImage ?? "").trim();
  return image || null;
}

function dicebearAvatar(seed: string) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

function resolveAvatarSrc(userImage: string | null | undefined, name: string) {
  const image = profileImageUrlFromRow(userImage);
  if (image) return image;
  return dicebearAvatar(name);
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
      aria-labelledby="team-group-photo-zoom-title"
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
          id="team-group-photo-zoom-title"
          className="mt-2.5 text-center text-[13px] font-medium text-white"
        >
          {alt}
        </p>
      </div>
    </div>
  );
}

function UserAvatarButton({
  name,
  userImage,
  isAdmin = false,
  size = "md",
  onZoom,
}: {
  name: string;
  userImage?: string | null;
  isAdmin?: boolean;
  size?: "sm" | "md" | "lg";
  onZoom: (url: string, alt: string) => void;
}) {
  const profileUrl = profileImageUrlFromRow(userImage);
  const displayName = String(name || "Member");
  const box =
    size === "lg" ? "h-14 w-14" : size === "sm" ? "h-10 w-10" : "h-11 w-11";
  const textSize = size === "lg" ? "text-base" : size === "sm" ? "text-xs" : "text-sm";

  const img = (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={resolveAvatarSrc(userImage, displayName)}
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
      {isAdmin ? <Crown className="h-5 w-5" /> : initialsFromName(name)}
    </span>
  );
}

function searchFieldCls() {
  return "w-full rounded-lg border border-[#E4E7EC] bg-white py-2.5 pl-9 pr-3 text-[13px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15";
}

function zohoCardCls() {
  return "overflow-hidden rounded-2xl border border-[#E4E7EC] bg-white shadow-sm";
}

function zohoSectionHeadCls() {
  return "border-b border-[#E4E7EC] bg-gradient-to-r from-[#E8F4FB] via-white to-[#E6F4EA] px-4 py-4 sm:px-5";
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

function desktopRightPrimaryTabCls(active: boolean) {
  return `relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-all duration-200 ease-out ${
    active
      ? "bg-white text-[#008CD3] shadow-sm ring-1 ring-[#E4E7EC]"
      : "text-[#6B7280] hover:bg-white/70 hover:text-[#374151]"
  }`;
}

function waFieldCls() {
  return "mt-1.5 w-full rounded-lg border border-[#E4E7EC] bg-white px-3 py-2.5 text-[14px] text-[#1F2937] outline-none focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15 lg:rounded-xl lg:py-2.5 lg:text-sm lg:shadow-sm lg:focus:border-[#C99237]/60 lg:focus:ring-2 lg:focus:ring-[#C99237]/25";
}

function zohoPrimaryBtnCls() {
  return "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#008CD3] px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm transition active:scale-[0.98] hover:bg-[#0070AA] disabled:opacity-50 sm:w-auto lg:rounded-xl";
}

function zohoSecondaryBtnCls() {
  return "inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-[#E4E7EC] bg-white px-4 py-2.5 text-[14px] font-medium text-[#1F2937] transition active:scale-[0.98] disabled:opacity-50 sm:w-auto lg:rounded-xl lg:border-slate-200 lg:hover:bg-slate-50";
}

function waPrimaryBtnCls() {
  return zohoPrimaryBtnCls();
}

function waSecondaryBtnCls() {
  return zohoSecondaryBtnCls();
}

function waModalShellClass() {
  return "fixed inset-0 z-[10050] flex items-end justify-center bg-[#111B21]/50 p-0 sm:items-center sm:p-4";
}

function waModalPanelClass() {
  return "relative flex max-h-[min(92dvh,100%)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[min(90vh,720px)] sm:rounded-2xl sm:border sm:border-slate-200/90";
}

function waModalHeaderClass() {
  return "flex shrink-0 items-center justify-between gap-2 border-b border-[#E4E7EC] border-t-[3px] border-t-[#008CD3] bg-gradient-to-r from-[#E8F4FB] to-white px-4 py-4 sm:px-5";
}

function waModalFooterClass() {
  return "flex shrink-0 flex-col-reverse gap-2 border-t border-[#E4E7EC] bg-[#F9FAFB] px-4 pt-3 sm:flex-row sm:justify-end sm:gap-2 sm:border-slate-100 sm:bg-slate-50/90 sm:px-5";
}

function waStatusChip(status: string) {
  const s = String(status).toLowerCase();
  if (s === "approved")
    return "bg-[#E7FCE3] text-[#0B5E44]";
  if (s === "rejected")
    return "bg-[#FFECEC] text-[#C62828]";
  return "bg-[#FFF8E1] text-[#8D6E00]";
}

function jwtRoleName(token: string | null): string {
  if (!token) return "";
  try {
    const payload = JSON.parse(atob(token.split(".")[1] || "")) as {
      user_role_name?: string;
    };
    return String(payload.user_role_name || "").toLowerCase();
  } catch {
    return "";
  }
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
      className={waModalShellClass()}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close"
        onClick={onClose}
      />
      <div className={`${waModalPanelClass()} max-w-md`}>
        <div className={waModalHeaderClass()}>
          <h2 className="min-w-0 flex-1 pr-2 text-[15px] font-semibold leading-snug text-white sm:text-lg sm:font-bold sm:tracking-tight sm:text-[#0C123A]">
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
            className={waModalFooterClass()}
            style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function TeamGroupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <p className="text-sm">Loading team group…</p>
        </div>
      }
    >
      <TeamGroupPageRouter />
    </Suspense>
  );
}

function TeamGroupPageRouter() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("user_id");
  if (userId) {
    return <TeamMemberExitProcessReportPage />;
  }
  return <TeamGroupPageContent />;
}

function TeamGroupPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedTeamId = searchParams.get("team_id");
  const orgId = String(params?.org_id ?? "");
  const orgIdNum = useMemo(() => {
    const n = Number(orgId);
    return Number.isNaN(n) ? undefined : n;
  }, [orgId]);

  const [detail, setDetail] = useState<OrgTeamDetail | null>(null);
  const [noTeam, setNoTeam] = useState(false);
  const [notifications, setNotifications] = useState<TeamActivityNotification[]>([]);
  const [exitProcessesReports, setExitProcessesReports] = useState<
    TeamExitProcessFeedRow[]
  >([]);
  const [leaveQueries, setLeaveQueries] = useState<TeamLeaveQueryRow[]>([]);
  const [activityTab, setActivityTab] = useState<
    "notifications" | "leaves" | "attendance"
  >("notifications");
  const [desktopRightTab, setDesktopRightTab] = useState<"activity" | "hr">(
    "activity",
  );
  const [leaveBusyId, setLeaveBusyId] = useState<number | null>(null);
  const [attendanceQueries, setAttendanceQueries] = useState<
    AttendanceQueryRow[]
  >([]);
  const [attendanceListError, setAttendanceListError] = useState<string | null>(
    null,
  );
  const [attResolveModal, setAttResolveModal] = useState<{
    id: number;
    employee_id: number;
    action: "approved" | "rejected";
  } | null>(null);
  const [attResolveNote, setAttResolveNote] = useState("");
  const [attResolveSubmitting, setAttResolveSubmitting] = useState(false);
  const [orgUsers, setOrgUsers] = useState<OrgUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [tableSearch, setTableSearch] = useState("");
  const [mobileMainTab, setMobileMainTab] = useState<
    "members" | "activity" | "info" | "hr"
  >("members");

  const [modal, setModal] = useState<null | "add" | "remove">(null);
  const [addSearch, setAddSearch] = useState("");
  const [removeSearch, setRemoveSearch] = useState("");

  const [myLeaveRows, setMyLeaveRows] = useState<EmployeeLeaveRow[]>([]);
  const [myAttRows, setMyAttRows] = useState<AttendanceQueryRow[]>([]);
  const [myRequestsError, setMyRequestsError] = useState<string | null>(null);

  const [adminLeaveModalOpen, setAdminLeaveModalOpen] = useState(false);
  const [adminAttModalOpen, setAdminAttModalOpen] = useState(false);
  const {
    options: assignedLeaveOptions,
    selectedLeaveTypeId,
    setSelectedLeaveTypeId,
    loading: assignedLeavesLoading,
    error: assignedLeavesError,
  } = useAssignedLeaveTypes(orgIdNum, adminLeaveModalOpen);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [leaveFormError, setLeaveFormError] = useState<string | null>(null);
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);

  const [attCategory, setAttCategory] =
    useState<AttendanceQueryCategory>("forget_punch_in");
  const [attDate, setAttDate] = useState("");
  const [attMessage, setAttMessage] = useState("");
  const [attFormError, setAttFormError] = useState<string | null>(null);
  const [attSubmitting, setAttSubmitting] = useState(false);
  const [photoZoom, setPhotoZoom] = useState<{
    imageUrl: string;
    alt: string;
  } | null>(null);
  const [attendancePanelMember, setAttendancePanelMember] = useState<{
    user_id: number;
    user_name: string;
  } | null>(null);

  const backHref = `/dashboard/${orgId}/home`;

  const loadPersonalHrRequests = useCallback(
    async (token: string, orgIdNum: number) => {
      try {
        const [ml, ma] = await Promise.all([
          fetchMyLeaveQueries(token, orgIdNum),
          fetchMyAttendanceQueries(token, orgIdNum),
        ]);
        setMyLeaveRows(ml);
        setMyAttRows(ma);
        setMyRequestsError(null);
      } catch (e) {
        setMyLeaveRows([]);
        setMyAttRows([]);
        setMyRequestsError(
          e instanceof Error ? e.message : "Could not load your HR requests.",
        );
      }
    },
    [],
  );

  const clearAdminFeedState = useCallback(() => {
    setOrgUsers([]);
    setNotifications([]);
    setExitProcessesReports([]);
    setLeaveQueries([]);
    setAttendanceQueries([]);
    setAttendanceListError(null);
  }, []);

  const loadAdminTeamFeed = useCallback(
    async (token: string, orgIdNum: number, team: OrgTeamDetail) => {
      try {
        const users = await getAllOrgUsers(token);
        setOrgUsers(users);
      } catch {
        setOrgUsers([]);
      }

      try {
        const feed = await fetchTeamActivityFeed(token, team.team_id, orgIdNum);
        setNotifications(feed.notifications);
        setExitProcessesReports(feed.exit_processes_reports);
        setLeaveQueries(feed.leave_queries);
      } catch {
        setNotifications([]);
        setExitProcessesReports([]);
        setLeaveQueries([]);
      }

      try {
        const rows = await fetchAllAttendanceQueries(token, orgIdNum, {
          team_id: team.team_id,
        });
        setAttendanceQueries(rows);
        setAttendanceListError(null);
      } catch (attErr) {
        setAttendanceQueries([]);
        setAttendanceListError(
          attErr instanceof Error
            ? attErr.message
            : "Could not load attendance queries.",
        );
      }

      await loadPersonalHrRequests(token, orgIdNum);
    },
    [loadPersonalHrRequests],
  );

  const loadMemberTeamData = useCallback(
    async (token: string, orgIdNum: number) => {
      clearAdminFeedState();
      await loadPersonalHrRequests(token, orgIdNum);
    },
    [clearAdminFeedState, loadPersonalHrRequests],
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    setBanner(null);
    setNoTeam(false);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setBanner({ type: "err", text: "Sign in required." });
        return;
      }
      const orgIdNum = Number(orgId);
      if (!orgId || Number.isNaN(orgIdNum)) {
        setBanner({ type: "err", text: "Invalid organization." });
        return;
      }

      let my: OrgTeamDetail;
      try {
        my = await fetchMyOrgTeam(
          token,
          orgIdNum,
          selectedTeamId ?? undefined,
        );
      } catch (e) {
        const err = e as { status?: number; message?: string };
        if (err.status === 404) {
          setNoTeam(true);
          setDetail(null);
          clearAdminFeedState();
          setMyLeaveRows([]);
          setMyAttRows([]);
          setMyRequestsError(null);
          return;
        }
        setDetail(null);
        setBanner({
          type: "err",
          text: e instanceof Error ? e.message : "Could not load team.",
        });
        return;
      }

      setDetail(my);
      setNoTeam(false);

      if (my.is_admin) {
        await loadAdminTeamFeed(token, orgIdNum, my);
      } else {
        await loadMemberTeamData(token, orgIdNum);
      }
    } finally {
      setLoading(false);
    }
  }, [orgId, selectedTeamId, clearAdminFeedState, loadAdminTeamFeed, loadMemberTeamData]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const refreshActivityFeed = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token || !detail?.is_admin) return;
    const orgIdNum = Number(orgId);
    if (Number.isNaN(orgIdNum)) return;
    await loadAdminTeamFeed(token, orgIdNum, detail);
  }, [detail, orgId, loadAdminTeamFeed]);

  const focusRow = useMemo(() => (detail ? detailToRow(detail) : null), [detail]);
  const isTeamAdmin = Boolean(detail?.is_admin);
  const showTeamActivity = isTeamAdmin;
  const showMemberHrSection = true;
  const showDesktopRightPanel =
    showMemberHrSection || showTeamActivity || (isTeamAdmin && attendancePanelMember);

  useEffect(() => {
    if (mobileMainTab === "activity" && !showTeamActivity) {
      setMobileMainTab("hr");
    }
  }, [mobileMainTab, showTeamActivity]);

  useEffect(() => {
    if (desktopRightTab === "activity" && !showTeamActivity) {
      setDesktopRightTab("hr");
    }
  }, [desktopRightTab, showTeamActivity]);

  const pendingLeaveCount = useMemo(
    () =>
      leaveQueries.filter((q) => String(q.status).toLowerCase() === "pending")
        .length,
    [leaveQueries],
  );

  const pendingAttendanceCount = useMemo(
    () =>
      attendanceQueries.filter(
        (q) => String(q.query_status).toLowerCase() === "pending",
      ).length,
    [attendanceQueries],
  );

  const pendingExitReportsCount = useMemo(
    () => exitProcessesReports.length,
    [exitProcessesReports],
  );

  const myPendingLeaveCount = useMemo(
    () =>
      myLeaveRows.filter((r) => String(r.status).toLowerCase() === "pending")
        .length,
    [myLeaveRows],
  );

  const myPendingAttCount = useMemo(
    () =>
      myAttRows.filter(
        (r) => String(r.query_status).toLowerCase() === "pending",
      ).length,
    [myAttRows],
  );

  function roleCanApproveLeaves(): boolean {
    const t =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const role = jwtRoleName(t);
    return ["admin", "hr", "manager"].includes(role);
  }

  /** Matches `leaveResponseController`: admin, HR, or manager only (not team-admin alone). */
  const showLeaveApproveButtons = roleCanApproveLeaves();

  const orgUserImageById = useMemo(() => {
    const map: Record<number, string> = {};
    for (const u of orgUsers) {
      const id = Number(u.id);
      const img = profileImageUrlFromRow(
        (u as { user_image?: unknown }).user_image,
      );
      if (!Number.isNaN(id) && img) map[id] = img;
    }
    if (detail) {
      for (const m of detail.members) {
        const id = Number(m.user_id);
        const img = profileImageUrlFromRow(m.user_image);
        if (!Number.isNaN(id) && img) map[id] = img;
      }
    }
    return map;
  }, [orgUsers, detail]);

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

  const filteredMembers = useMemo(() => {
    if (!detail) return [];
    const q = tableSearch.trim().toLowerCase();
    return detail.members.filter((m) => {
      if (!q) return true;
      const name = String(m.user_name ?? "").toLowerCase();
      const email = String(m.user_email ?? "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [detail, tableSearch]);

  function closeModal() {
    setModal(null);
    setAddSearch("");
    setRemoveSearch("");
  }

  async function runAction(action: () => Promise<void>) {
    setBusy(true);
    setBanner(null);
    try {
      await action();
      await loadAll();
      closeModal();
      setBanner({ type: "ok", text: "Updated." });
    } catch (e) {
      setBanner({
        type: "err",
        text: e instanceof Error ? e.message : "Something went wrong.",
      });
    } finally {
      setBusy(false);
    }
  }

  function openAttResolveModal(
    queryId: number,
    employeeId: number,
    action: "approved" | "rejected",
  ) {
    setAttResolveModal({ id: queryId, employee_id: employeeId, action });
    setAttResolveNote("");
    setBanner(null);
  }

  async function submitAttResolveModal() {
    const t = localStorage.getItem("token");
    if (!t || !attResolveModal) {
      setBanner({ type: "err", text: "Sign in required." });
      return;
    }
    const orgIdNum = Number(orgId);
    if (Number.isNaN(orgIdNum)) return;

    const note = attResolveNote.trim();
    if (!note) {
      setBanner({
        type: "err",
        text: "Please enter a management note (visible to the employee).",
      });
      return;
    }


    setAttResolveSubmitting(true);
    setBanner(null);
    try {
      await updateAttendanceQueryStatus(t, {
        org_id: orgIdNum,
        employee_id: attResolveModal.employee_id,
        query_id: attResolveModal.id,
        updated_query_status: attResolveModal.action,
        admin_response: note,
      });
      setBanner({
        type: "ok",
        text:
          attResolveModal.action === "approved"
            ? "Attendance query approved."
            : "Attendance query rejected.",
      });
      setAttResolveModal(null);
      await refreshActivityFeed();
    } catch (e) {
      setBanner({
        type: "err",
        text:
          e instanceof Error
            ? e.message
            : "Could not update attendance query.",
      });
    } finally {
      setAttResolveSubmitting(false);
    }
  }

  async function handleLeaveResponse(
    leaveId: number,
    status: "approved" | "rejected",
  ) {
    const t = localStorage.getItem("token");
    if (!t) {
      setBanner({ type: "err", text: "Sign in required." });
      return;
    }
    const orgIdNum = Number(orgId);
    if (Number.isNaN(orgIdNum)) return;
    setLeaveBusyId(leaveId);
    setBanner(null);
    try {
      await respondToLeaveRequest(t, {
        leave_id: leaveId,
        org_id: orgIdNum,
        status,
      });
      setBanner({
        type: "ok",
        text: status === "approved" ? "Leave approved." : "Leave rejected.",
      });
      await refreshActivityFeed();
    } catch (e) {
      setBanner({
        type: "err",
        text: e instanceof Error ? e.message : "Could not update leave.",
      });
    } finally {
      setLeaveBusyId(null);
    }
  }

  function openAdminLeaveModal() {
    setStartDate("");
    setEndDate("");
    setReason("");
    setLeaveFormError(null);
    setAdminLeaveModalOpen(true);
  }

  async function onSubmitAdminLeave(e: FormEvent) {
    e.preventDefault();
    setLeaveFormError(null);
    const t = localStorage.getItem("token");
    if (!t || !detail) {
      setLeaveFormError("Sign in required.");
      return;
    }
    if (orgIdNum == null) {
      setLeaveFormError("Invalid organization.");
      return;
    }
    const validationError = validateLeaveApplication({
      startDate,
      endDate,
      selectedLeaveTypeId,
      assignedOptions: assignedLeaveOptions,
    });
    if (validationError) {
      setLeaveFormError(validationError);
      return;
    }
    setLeaveSubmitting(true);
    try {
      await applyForLeave(t, {
        org_id: orgIdNum,
        leave_type_id: selectedLeaveTypeId,
        start_date: startDate,
        end_date: endDate || null,
        reason: reason.trim() || null,
        team_id: detail.team_id,
      });
      setAdminLeaveModalOpen(false);
      setBanner({ type: "ok", text: "Your leave request was submitted." });
      await loadPersonalHrRequests(t, orgIdNum);
    } catch (err) {
      setLeaveFormError(
        err instanceof Error ? err.message : "Could not submit leave.",
      );
    } finally {
      setLeaveSubmitting(false);
    }
  }

  function openAdminAttModal() {
    setAttCategory("forget_punch_in");
    setAttDate("");
    setAttMessage("");
    setAttFormError(null);
    setAdminAttModalOpen(true);
  }

  async function onSubmitAdminAtt(e: FormEvent) {
    e.preventDefault();
    setAttFormError(null);
    const t = localStorage.getItem("token");
    if (!t || !detail) {
      setAttFormError("Sign in required.");
      return;
    }
    const orgIdNum = Number(orgId);
    if (Number.isNaN(orgIdNum)) return;
    if (!attDate) {
      setAttFormError("Attendance date is required.");
      return;
    }
    const msg = attMessage.trim();
    if (!msg) {
      setAttFormError("Please describe what happened.");
      return;
    }
    setAttSubmitting(true);
    try {
      await raiseAttendanceQuery(t, {
        org_id: orgIdNum,
        category: attCategory,
        query_message: msg,
        attendance_date: attDate.slice(0, 10),
      });
      setAdminAttModalOpen(false);
      setBanner({ type: "ok", text: "Attendance query submitted to HR." });
      await loadPersonalHrRequests(t, orgIdNum);
    } catch (err) {
      setAttFormError(
        err instanceof Error ? err.message : "Could not submit query.",
      );
    } finally {
      setAttSubmitting(false);
    }
  }

  const token = () => localStorage.getItem("token");

  if (loading && !detail && !noTeam) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 bg-[#F5F7FA] text-[#6B7280] lg:bg-[#f5f6fa] lg:text-slate-600">
        <Loader2 className="h-9 w-9 animate-spin text-[#008CD3] lg:h-10 lg:w-10" />
        <p className="text-[15px] lg:text-base">Opening your team…</p>
      </div>
    );
  }

  if (noTeam) {
    return (
      <div className="mx-auto max-w-md bg-[#F0F2F5] px-6 py-20 text-center lg:bg-transparent">
        <Users className="mx-auto h-12 w-12 text-[#8696A0] lg:text-slate-300" />
        <h1 className="mt-4 text-xl font-semibold text-[#111B21] lg:text-[#0C123A]">
          No team assigned
        </h1>
        <p className="mt-2 text-sm text-[#667781] lg:text-slate-600">
          You are not on an active team roster yet. Ask your organization admin to add you to a team.
        </p>
        <Link
          href={backHref}
          className="mt-8 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#008CD3] px-5 py-2.5 text-[15px] font-medium text-white active:scale-[0.98] lg:rounded-xl lg:text-sm lg:font-semibold lg:hover:bg-[#0070AA]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="mx-auto max-w-md bg-[#F0F2F5] px-6 py-20 text-center lg:bg-transparent">
        <AlertCircle className="mx-auto h-12 w-12 text-[#D93025]" />
        <h1 className="mt-4 text-xl font-semibold text-[#111B21] lg:text-[#0C123A]">
          Could not load team
        </h1>
        <p className="mt-2 text-sm text-[#667781] lg:text-slate-600">
          {banner?.text ?? "Something went wrong while loading your team."}
        </p>
        <button
          type="button"
          onClick={() => void loadAll()}
          className="mt-8 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#008CD3] px-5 py-2.5 text-[15px] font-medium text-white"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      </div>
    );
  }

  const title = displayTeamTitle(detail.team_name);
  const mobileActivityBadge =
    pendingLeaveCount + pendingAttendanceCount + pendingExitReportsCount;
  const mobileHrBadge = myPendingLeaveCount + myPendingAttCount;

  const openPhotoZoom = (imageUrl: string, alt: string) => {
    setPhotoZoom({ imageUrl, alt });
  };

  const openAttendancePanel = (member: { user_id: number; user_name: string }) => {
    setAttendancePanelMember(member);
    setDesktopRightTab("activity");
  };

  const closeAttendancePanel = () => {
    setAttendancePanelMember(null);
  };

  const imageForUserId = (userId: number | null | undefined) => {
    if (userId == null) return null;
    return orgUserImageById[Number(userId)] ?? null;
  };

  const mobileMainTabs: Array<{
    id: "members" | "activity" | "info" | "hr";
    label: string;
    badge?: number;
  }> = [
    { id: "members", label: "Members" },
    ...(showTeamActivity
      ? [{ id: "activity" as const, label: "Activity", badge: mobileActivityBadge }]
      : []),
    { id: "info", label: "Info" },
    ...(showMemberHrSection
      ? [{ id: "hr" as const, label: "My HR", badge: mobileHrBadge }]
      : []),
  ];

  return (
    <div className="min-h-full bg-[#F5F7FA] lg:relative lg:overflow-x-hidden lg:bg-[#f0f2f8] lg:overflow-hidden lg:pb-0">
      {/* Mobile & tablet: Zoho-style shell */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-20 border-b border-[#E4E7EC] bg-white/95 shadow-sm backdrop-blur">
          <div className="bg-gradient-to-r from-[#008CD3] via-[#007EBF] to-[#0070AA] px-3 pb-3 pt-2.5 text-white">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push(backHref)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 active:bg-white/25"
                aria-label="Back to home"
              >
                <ArrowLeft className="h-[18px] w-[18px]" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/75">
                  My team
                </p>
                <h1 className="truncate text-[16px] font-bold leading-tight">{title}</h1>
                <p className="truncate text-[12px] text-white/85">
                  {detail.total_number_of_members} members
                  {isTeamAdmin
                    ? " · Reporting manager (you)"
                    : ` · ${detail.admin_name ?? "Reporting manager"}`}
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
              {mobileMainTabs.map((tab) => (
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
            {isTeamAdmin ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setModal("add")}
                  className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#008CD3] text-[13px] font-semibold text-white shadow-sm active:scale-[0.98]"
                >
                  <UserPlus className="h-4 w-4" />
                  Add member
                </button>
                <button
                  type="button"
                  onClick={() => setModal("remove")}
                  className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#FFCDD2] bg-white text-[13px] font-semibold text-[#C62828] active:scale-[0.98]"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              </div>
            ) : null}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type="search"
                placeholder="Search by name or email"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className={searchFieldCls()}
              />
            </div>
            <ul className="overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-sm">
              {filteredMembers.length === 0 ? (
                <li className="px-4 py-10 text-center text-[13px] text-[#6B7280]">
                  No members match your search.
                </li>
              ) : (
                filteredMembers.map((m) => {
                  const isAdminMember =
                    Number(m.user_id) === Number(detail.admin_id);
                  return (
                    <li
                      key={m.team_member_id}
                      className="border-b border-[#EEF2F6] last:border-b-0"
                    >
                      <div className="flex items-start gap-2.5 px-3 py-2.5">
                        <UserAvatarButton
                          name={m.user_name}
                          userImage={m.user_image}
                          isAdmin={isAdminMember}
                          onZoom={openPhotoZoom}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="truncate text-[13px] font-semibold text-[#1F2937]">
                              {m.user_name}
                            </p>
                            {isAdminMember ? (
                              <span className="shrink-0 rounded-full bg-[#E6F4EA] px-2 py-0.5 text-[10px] font-semibold text-[#0F9D58]">
                                Reporting manager
                              </span>
                            ) : null}
                          </div>
                          <p className="truncate text-[12px] text-[#6B7280]">
                            {m.user_email}
                          </p>
                          <p className={`mt-0.5 ${mobileCaptionCls}`}>
                            Joined {fmtDateOnly(m.joined_date)}
                          </p>
                          {isTeamAdmin ? (
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
                          ) : null}
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
                <p className={mobileLabelCls}>About</p>
              </div>
              <p className="px-3 py-3 text-[13px] leading-relaxed text-[#1F2937]">
                {detail.team_info?.trim() ||
                  "No description added for this team yet."}
              </p>
            </section>
            <section className="overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-sm">
              {[
                ["Reporting manager", detail.admin_name ?? `User #${detail.admin_id}`],
                ["Created", fmtDateOnly(detail.created_at)],
                ["Last updated", fmtDateOnly(detail.updated_at)],
                ["Members", String(detail.total_number_of_members)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-3 border-b border-[#EEF2F6] px-3 py-2.5 last:border-b-0"
                >
                  <p className={mobileLabelCls}>{label}</p>
                  <p className="max-w-[58%] truncate text-right text-[13px] font-semibold text-[#1F2937]">
                    {value}
                  </p>
                </div>
              ))}
            </section>
          </div>
        ) : null}

        {mobileMainTab === "hr" && showMemberHrSection ? (
          <div className="space-y-2 p-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={openAdminLeaveModal}
                className="flex min-h-[68px] flex-col items-start justify-center rounded-lg border border-[#E4E7EC] bg-white px-3 py-2.5 text-left shadow-sm active:scale-[0.98]"
              >
                <CalendarDays className="h-5 w-5 text-[#008CD3]" />
                <span className="mt-1 text-[13px] font-semibold text-[#1F2937]">
                  Request leave
                </span>
              </button>
              <button
                type="button"
                onClick={openAdminAttModal}
                className="flex min-h-[68px] flex-col items-start justify-center rounded-lg border border-[#E4E7EC] bg-white px-3 py-2.5 text-left shadow-sm active:scale-[0.98]"
              >
                <ClipboardList className="h-5 w-5 text-[#008CD3]" />
                <span className="mt-1 text-[13px] font-semibold text-[#1F2937]">
                  Attendance query
                </span>
              </button>
            </div>
            {myRequestsError ? (
              <p className="rounded-lg border border-[#FFE082] bg-[#FFF8E1] px-3 py-2 text-[12px] text-[#8D6E00]">
                {myRequestsError}
              </p>
            ) : null}
            <p className={`px-1 ${mobileLabelCls}`}>Your leave ({myLeaveRows.length})</p>
            <ul className="overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-sm">
              {myLeaveRows.length === 0 ? (
                <li className="px-4 py-8 text-center text-[13px] text-[#6B7280]">
                  Nothing submitted yet.
                </li>
              ) : (
                myLeaveRows.map((r) => (
                  <li
                    key={r.id}
                    className="border-b border-[#EEF2F6] px-3 py-2.5 last:border-b-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[13px] font-semibold capitalize text-[#1F2937]">
                          {leaveTypeLabel(r.leave_type)}
                        </p>
                        <p className={`mt-0.5 ${mobileCaptionCls}`}>
                          {fmtDateOnly(r.start_date)}
                          {r.end_date ? ` – ${fmtDateOnly(r.end_date)}` : ""}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${waStatusChip(r.status)}`}
                      >
                        {r.status}
                      </span>
                    </div>
                  </li>
                ))
              )}
            </ul>
            <p className={`px-1 ${mobileLabelCls}`}>
              Your attendance ({myAttRows.length})
            </p>
            <ul className="overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-sm">
              {myAttRows.length === 0 ? (
                <li className="px-4 py-8 text-center text-[13px] text-[#6B7280]">
                  No queries yet.
                </li>
              ) : (
                myAttRows.map((r) => (
                  <li
                    key={r.id}
                    className="border-b border-[#EEF2F6] px-3 py-2.5 last:border-b-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[13px] font-semibold text-[#1F2937]">
                          {attendanceCategoryLabel(r.category)}
                        </p>
                        <p className={`mt-0.5 ${mobileCaptionCls}`}>
                          {fmtDateOnly(r.attendance_date)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${waStatusChip(r.query_status)}`}
                      >
                        {r.query_status}
                      </span>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : null}

        {mobileMainTab === "activity" && showTeamActivity ? (
          <div className="space-y-2 p-3">
            <div className="flex rounded-lg bg-[#F5F7FA] p-0.5">
              {(
                [
                  { id: "notifications" as const, label: "Alerts" },
                  { id: "leaves" as const, label: "Leaves", badge: pendingLeaveCount },
                  {
                    id: "attendance" as const,
                    label: "Attendance",
                    badge: pendingAttendanceCount,
                  },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActivityTab(tab.id)}
                  className={`relative flex flex-1 items-center justify-center gap-1 rounded-md py-2 text-[10px] font-semibold ${
                    activityTab === tab.id
                      ? "bg-white text-[#008CD3] shadow-sm ring-1 ring-[#E4E7EC]"
                      : "text-[#6B7280]"
                  }`}
                >
                  {tab.label}
                  {"badge" in tab && tab.badge > 0 ? (
                    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#008CD3]/15 px-1 text-[9px] font-bold text-[#008CD3]">
                      {tab.badge > 9 ? "9+" : tab.badge}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            {activityTab === "notifications" ? (
              <ul className="overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-sm">
                {exitProcessesReports.map((ep) => {
                  const exitMember = detail.members.find(
                    (m) => Number(m.user_id) === Number(ep.employee_id),
                  );
                  const exitName =
                    ep.employee_name?.trim() || `Employee #${ep.employee_id}`;
                  return (
                    <li
                      key={`exit-${ep.id}`}
                      className="border-b border-[#EEF2F6] border-l-4 border-l-[#C62828] last:border-b-0"
                    >
                      <div className="flex items-start gap-2.5 px-3 py-2.5">
                        <UserAvatarButton
                          name={exitName}
                          userImage={
                            exitMember?.user_image ??
                            imageForUserId(ep.employee_id)
                          }
                          size="sm"
                          onZoom={openPhotoZoom}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-semibold uppercase text-[#C62828]">
                            {exitFeedActionHeadline(ep.action_type)}
                          </p>
                          <p className="mt-0.5 text-[13px] font-semibold text-[#1F2937]">
                            {exitName}
                          </p>
                          <Link
                            href={`/dashboard/${orgId}/organization-employees/team-group?user_id=${encodeURIComponent(String(ep.employee_id))}`}
                            className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-semibold text-[#008CD3]"
                          >
                            View details
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </div>
                    </li>
                  );
                })}
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className="border-b border-[#EEF2F6] px-3 py-2.5 last:border-b-0"
                  >
                    <p className="text-[10px] font-semibold uppercase text-[#008CD3]">
                      {actionLabel(n.action_type)}
                    </p>
                    <p className="mt-0.5 text-[13px] text-[#1F2937]">{n.action_reason}</p>
                    <p className={`mt-1 ${mobileCaptionCls}`}>{fmtLong(n.created_at)}</p>
                  </li>
                ))}
                {notifications.length === 0 && exitProcessesReports.length === 0 ? (
                  <li className="px-4 py-10 text-center text-[13px] text-[#6B7280]">
                    No alerts yet.
                  </li>
                ) : null}
              </ul>
            ) : null}

            {activityTab === "leaves" ? (
              <ul className="overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-sm">
                {leaveQueries.length === 0 ? (
                  <li className="px-4 py-10 text-center text-[13px] text-[#6B7280]">
                    No leave requests yet.
                  </li>
                ) : (
                  leaveQueries.map((q) => {
                    const pending = String(q.status).toLowerCase() === "pending";
                    return (
                      <li
                        key={q.id}
                        className="border-b border-[#EEF2F6] px-3 py-2.5 last:border-b-0"
                      >
                        <div className="flex items-start gap-2.5">
                          <UserAvatarButton
                            name={q.user_name}
                            userImage={imageForUserId(q.user_id)}
                            size="sm"
                            onZoom={openPhotoZoom}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-[13px] font-semibold text-[#1F2937]">
                                  {q.user_name}
                                </p>
                                <p className={`capitalize ${mobileCaptionCls}`}>
                                  {leaveTypeLabel(q.leave_type)}
                                </p>
                              </div>
                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${waStatusChip(q.status)}`}
                              >
                                {q.status}
                              </span>
                            </div>
                            {pending && showLeaveApproveButtons ? (
                              <div className="mt-2.5 flex gap-2">
                                <button
                                  type="button"
                                  disabled={leaveBusyId === q.id}
                                  onClick={() =>
                                    void handleLeaveResponse(q.id, "rejected")
                                  }
                                  className="flex-1 rounded-md border border-[#FFCDD2] py-2 text-[12px] font-semibold text-[#C62828] active:scale-[0.98]"
                                >
                                  Reject
                                </button>
                                <button
                                  type="button"
                                  disabled={leaveBusyId === q.id}
                                  onClick={() =>
                                    void handleLeaveResponse(q.id, "approved")
                                  }
                                  className="flex-1 rounded-md bg-[#008CD3] py-2 text-[12px] font-semibold text-white active:scale-[0.98]"
                                >
                                  Approve
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>
            ) : null}

            {activityTab === "attendance" ? (
              attendanceListError ? (
                <p className="rounded-lg border border-[#FFE082] bg-[#FFF8E1] px-3 py-2.5 text-center text-[12px] text-[#8D6E00]">
                  {attendanceListError}
                </p>
              ) : (
                <ul className="overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-sm">
                  {attendanceQueries.length === 0 ? (
                    <li className="px-4 py-10 text-center text-[13px] text-[#6B7280]">
                      No attendance queries yet.
                    </li>
                  ) : (
                    attendanceQueries.map((row) => {
                      const pending =
                        String(row.query_status).toLowerCase() === "pending";
                      const who = attendeeFromQuery(row, detail, orgUsers);
                      const memberImg = detail.members.find(
                        (m) => Number(m.user_id) === Number(row.user_id),
                      )?.user_image;
                      return (
                        <li
                          key={row.id}
                          className="border-b border-[#EEF2F6] px-3 py-2.5 last:border-b-0"
                        >
                          <div className="flex items-start gap-2.5">
                            <UserAvatarButton
                              name={who.name}
                              userImage={
                                memberImg ?? imageForUserId(row.user_id)
                              }
                              size="sm"
                              onZoom={openPhotoZoom}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate text-[13px] font-semibold text-[#1F2937]">
                                    {who.name}
                                  </p>
                                  <p className={mobileCaptionCls}>
                                    {attendanceCategoryLabel(row.category)}
                                  </p>
                                </div>
                                <span
                                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${waStatusChip(row.query_status)}`}
                                >
                                  {row.query_status}
                                </span>
                              </div>
                              {pending && showLeaveApproveButtons ? (
                                <div className="mt-2.5 flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openAttResolveModal(
                                        row.id,
                                        row.user_id,
                                        "rejected",
                                      )
                                    }
                                    className="flex-1 rounded-md border border-[#FFCDD2] py-2 text-[12px] font-semibold text-[#C62828] active:scale-[0.98]"
                                  >
                                    Reject
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openAttResolveModal(
                                        row.id,
                                        row.user_id,
                                        "approved",
                                      )
                                    }
                                    className="flex-1 rounded-md bg-[#008CD3] py-2 text-[12px] font-semibold text-white active:scale-[0.98]"
                                  >
                                    Approve
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </li>
                      );
                    })
                  )}
                </ul>
              )
            ) : null}
          </div>
        ) : null}
      </div>

      {attendancePanelMember && isTeamAdmin && detail ? (
        <div className="fixed inset-0 z-[10040] flex flex-col bg-[#F5F7FA] p-3 lg:hidden">
          <TeamMemberAttendancePanel
            orgId={orgId}
            teamId={detail.team_id}
            employeeId={attendancePanelMember.user_id}
            employeeName={attendancePanelMember.user_name}
            onClose={closeAttendancePanel}
          />
        </div>
      ) : null}

      {/* Desktop: wide split — headers left, activity/HR tabs right */}
      <div className="hidden lg:block lg:h-[calc(100vh-4rem)] lg:overflow-hidden">
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @keyframes teamGroupPanelIn {
                from { opacity: 0; transform: translateY(8px); }
                to { opacity: 1; transform: translateY(0); }
              }
              .team-group-panel-in {
                animation: teamGroupPanelIn 0.24s cubic-bezier(0.22, 1, 0.36, 1) both;
              }
              @media (prefers-reduced-motion: reduce) {
                .team-group-panel-in { animation: none; }
              }
            `,
          }}
        />
        <div className="mx-auto flex h-full w-full max-w-none flex-col gap-3 px-5 py-3 xl:px-10 xl:py-4">
        {banner ? (
          <div
            className={`flex shrink-0 items-start gap-3 rounded-xl border px-4 py-2.5 text-sm ${
              banner.type === "ok"
                ? "border-[#0F9D58]/30 bg-[#E6F4EA] text-[#0B8043]"
                : "border-[#F5C6C2] bg-[#FCE8E6] text-[#D93025]"
            }`}
          >
            {banner.type === "ok" ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            ) : (
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            )}
            <p className="min-w-0 font-medium leading-snug">{banner.text}</p>
          </div>
        ) : null}

        <div
          className={
            showDesktopRightPanel
              ? "grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(520px,42%)] gap-6"
              : "min-h-0 flex-1"
          }
        >
          {/* LEFT — all section headers & primary content */}
          <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-0.5">
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <span className="h-7 w-1 shrink-0 rounded-full bg-[#008CD3]" aria-hidden />
              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] font-semibold tracking-tight text-[#1F2937]">
                  Team overview
                </h2>
                <p className="text-[11px] text-[#6B7280]">
                  {title} · {detail.total_number_of_members} members
                  {isTeamAdmin ? " · You are reporting manager" : ` · Manager: ${detail.admin_name ?? "—"}`}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => router.push(backHref)}
                  className={zohoDesktopSecondaryBtnCls()}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => void loadAll()}
                  className={zohoDesktopSecondaryBtnCls()}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
                {isTeamAdmin ? (
                  <>
                    <button type="button" onClick={() => setModal("add")} className={zohoDesktopPrimaryBtnCls()}>
                      <UserPlus className="h-4 w-4" />
                      Add
                    </button>
                    <button type="button" onClick={() => setModal("remove")} className={zohoDesktopDangerBtnCls()}>
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  </>
                ) : null}
              </div>
            </div>

            <div className={`${zohoCardCls()} shrink-0`}>
              <div className="flex flex-wrap items-center gap-4 px-5 py-3.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#008CD3] text-white shadow-sm">
                  <UsersRound className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <h1 className="text-[22px] font-semibold tracking-tight text-[#1F2937]">{title}</h1>
                  <p className="mt-0.5 line-clamp-2 text-[13px] text-[#6B7280]">
                    {detail.team_info?.trim() ||
                      "Team roster, HR requests, and updates in one workspace."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F4FB] px-2.5 py-1 text-[11px] font-semibold text-[#008CD3]">
                    <Users className="h-3 w-3" />
                    {detail.total_number_of_members}
                  </span>
                  {isTeamAdmin ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#E6F4EA] px-2.5 py-1 text-[11px] font-semibold text-[#0F9D58]">
                      <Crown className="h-3 w-3" />
                      Manager (you)
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-y divide-[#E4E7EC] border-t border-[#E4E7EC] xl:grid-cols-4 xl:divide-y-0">
                <div className="px-4 py-2.5">
                  <p className={mobileLabelCls}>Team size</p>
                  <p className="mt-0.5 text-[18px] font-bold tabular-nums text-[#008CD3]">
                    {detail.total_number_of_members}
                  </p>
                </div>
                <div className="px-4 py-2.5">
                  <p className={mobileLabelCls}>Created</p>
                  <p className="mt-0.5 text-[13px] font-semibold text-[#1F2937]">
                    {fmtDateOnly(detail.created_at)}
                  </p>
                  <p className={`${mobileCaptionCls} truncate`}>By {detail.created_by_name ?? "—"}</p>
                </div>
                <div className="px-4 py-2.5">
                  <p className={mobileLabelCls}>Updated</p>
                  <p className="mt-0.5 text-[13px] font-semibold text-[#1F2937]">
                    {fmtDateOnly(detail.updated_at)}
                  </p>
                </div>
                <div className="px-4 py-2.5">
                  <p className={mobileLabelCls}>Reporting manager</p>
                  <p className="mt-0.5 truncate text-[13px] font-semibold text-[#1F2937]">
                    {detail.admin_name ?? "—"}
                  </p>
                  <p className={mobileCaptionCls}>Joined {fmtDateOnly(detail.admin_joined_date)}</p>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 pt-0.5">
              <div className="flex items-center gap-2.5">
                <span className="h-7 w-1 shrink-0 rounded-full bg-[#008CD3]" aria-hidden />
                <div>
                  <h2 className="text-[15px] font-semibold text-[#1F2937]">Team roster</h2>
                  <p className="text-[11px] text-[#6B7280]">
                    {attendancePanelMember && isTeamAdmin
                      ? `Viewing ${attendancePanelMember.user_name}'s attendance on the right`
                      : showDesktopRightPanel
                        ? "All members on the left · activity & My HR on the right"
                        : "Browse all team members"}
                  </p>
                </div>
              </div>
              <div className="relative w-full max-w-xs sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="search"
                  placeholder="Search members…"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className={searchFieldCls()}
                />
              </div>
            </div>

            <div className={`${zohoCardCls()} flex min-h-0 min-w-0 flex-1 flex-col`}>
              <div className="flex shrink-0 items-center gap-2 border-b border-[#E4E7EC] bg-[#F9FAFB] px-4 py-2.5">
                <Users className="h-4 w-4 shrink-0 text-[#008CD3]" aria-hidden />
                <h3 className="text-[13px] font-semibold text-[#1F2937]">
                  All members ({detail.total_number_of_members})
                </h3>
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#E4E7EC] bg-[#F9FAFB] text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                      <th className="px-4 py-2">Member</th>
                      <th className="px-4 py-2">Contact</th>
                      <th className="px-4 py-2">Joined</th>
                      <th className="px-4 py-2">Added by</th>
                      {isTeamAdmin ? <th className="px-4 py-2">Actions</th> : null}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF2F6]">
                    {filteredMembers.length === 0 ? (
                      <tr>
                        <td colSpan={isTeamAdmin ? 5 : 4} className="px-5 py-12 text-center">
                          <div className="mx-auto flex max-w-xs flex-col items-center gap-2">
                            <Search className="h-8 w-8 text-[#CBD5E1]" aria-hidden />
                            <p className="text-sm font-medium text-[#374151]">No members found</p>
                            <p className="text-xs text-[#6B7280]">
                              Try another search or clear the filter.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredMembers.map((m) => (
                        <tr
                          key={m.team_member_id}
                          className="transition hover:bg-[#F9FAFB]"
                        >
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-3">
                              <UserAvatarButton
                                name={m.user_name}
                                userImage={m.user_image}
                                isAdmin={Number(m.user_id) === Number(detail.admin_id)}
                                size="sm"
                                onZoom={openPhotoZoom}
                              />
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="truncate font-semibold text-[#1F2937]">
                                    {m.user_name}
                                  </span>
                                  {Number(m.user_id) === Number(detail.admin_id) ? (
                                    <span className="rounded-full bg-[#E6F4EA] px-2 py-0.5 text-[10px] font-semibold text-[#0F9D58]">
                                      Reporting manager
                                    </span>
                                  ) : null}
                                </div>
                                <p className="truncate text-[11px] text-[#6B7280]">
                                  ID #{m.user_id}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="min-w-0 px-4 py-2 text-xs text-[#6B7280]">
                            <div className="truncate" title={m.user_email}>
                              {m.user_email}
                            </div>
                            {m.user_phone ? (
                              <div className="truncate text-[#9CA3AF]">{m.user_phone}</div>
                            ) : null}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 text-[#374151]">
                            {fmtDateOnly(m.joined_date)}
                          </td>
                          <td className="px-4 py-2 text-[#374151]">
                            {m.added_by_name ?? (
                              <span className="text-[#9CA3AF]">—</span>
                            )}
                          </td>
                          {isTeamAdmin ? (
                            <td className="px-4 py-2">
                              <button
                                type="button"
                                onClick={() =>
                                  openAttendancePanel({
                                    user_id: Number(m.user_id),
                                    user_name: m.user_name,
                                  })
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-[#B8DDF0] bg-[#E8F4FB] px-2.5 py-1.5 text-[11px] font-semibold text-[#0070AA] transition hover:bg-[#008CD3] hover:text-white"
                              >
                                <BarChart3 className="h-3.5 w-3.5" />
                                View attendance
                              </button>
                            </td>
                          ) : null}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* RIGHT — Team activity / My HR / Member attendance */}
          {showDesktopRightPanel ? (
            <div className="flex min-h-0 min-w-0 flex-col">
            {attendancePanelMember && isTeamAdmin && detail ? (
              <TeamMemberAttendancePanel
                orgId={orgId}
                teamId={detail.team_id}
                employeeId={attendancePanelMember.user_id}
                employeeName={attendancePanelMember.user_name}
                onClose={closeAttendancePanel}
              />
            ) : (
            <div className={`${zohoCardCls()} flex min-h-0 flex-1 flex-col`}>
              <div className="shrink-0 border-b border-[#E4E7EC] bg-[#F9FAFB] p-2">
                <div className="flex gap-1 rounded-lg bg-[#F5F7FA] p-0.5" role="tablist" aria-label="Right panel">
                  {showTeamActivity ? (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={desktopRightTab === "activity"}
                      onClick={() => setDesktopRightTab("activity")}
                      className={desktopRightPrimaryTabCls(desktopRightTab === "activity")}
                    >
                      <Bell className="h-4 w-4 shrink-0" />
                      <span className="truncate">Team activity</span>
                      {pendingLeaveCount + pendingAttendanceCount + pendingExitReportsCount > 0 ? (
                        <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#D93025] px-1 text-[9px] font-bold text-white">
                          {pendingLeaveCount + pendingAttendanceCount + pendingExitReportsCount > 9
                            ? "9+"
                            : pendingLeaveCount + pendingAttendanceCount + pendingExitReportsCount}
                        </span>
                      ) : null}
                    </button>
                  ) : null}
                  {showMemberHrSection ? (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={desktopRightTab === "hr"}
                      onClick={() => setDesktopRightTab("hr")}
                      className={desktopRightPrimaryTabCls(desktopRightTab === "hr")}
                    >
                      <Sparkles className="h-4 w-4 shrink-0" />
                      <span className="truncate">My HR</span>
                      {myPendingLeaveCount + myPendingAttCount > 0 ? (
                        <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#008CD3] px-1 text-[9px] font-bold text-white">
                          {myPendingLeaveCount + myPendingAttCount > 9
                            ? "9+"
                            : myPendingLeaveCount + myPendingAttCount}
                        </span>
                      ) : null}
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="relative min-h-0 flex-1 overflow-hidden">
                {desktopRightTab === "activity" && showTeamActivity ? (
                <div key="desktop-activity" className="team-group-panel-in absolute inset-0 flex flex-col">
              <div className="shrink-0 border-b border-[#E4E7EC] bg-white p-2">
                <div className="flex gap-1 rounded-lg bg-[#F5F7FA] p-0.5">
                  <button
                    type="button"
                    onClick={() => setActivityTab("notifications")}
                    className={`relative flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-2 text-[12px] font-semibold transition ${
                      activityTab === "notifications"
                        ? "bg-white text-[#008CD3] shadow-sm ring-1 ring-[#E4E7EC]"
                        : "text-[#6B7280] hover:text-[#374151]"
                    }`}
                  >
                    <Bell className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Alerts</span>
                    {pendingExitReportsCount > 0 ? (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#D93025] px-1 text-[9px] font-bold text-white">
                        {pendingExitReportsCount > 9 ? "9+" : pendingExitReportsCount}
                      </span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivityTab("leaves")}
                    className={`relative flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-2 text-[12px] font-semibold transition ${
                      activityTab === "leaves"
                        ? "bg-white text-[#008CD3] shadow-sm ring-1 ring-[#E4E7EC]"
                        : "text-[#6B7280] hover:text-[#374151]"
                    }`}
                  >
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Leaves</span>
                    {pendingLeaveCount > 0 ? (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#0F9D58] px-1 text-[9px] font-bold text-white">
                        {pendingLeaveCount > 9 ? "9+" : pendingLeaveCount}
                      </span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivityTab("attendance")}
                    className={`relative flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-2 text-[12px] font-semibold transition ${
                      activityTab === "attendance"
                        ? "bg-white text-[#008CD3] shadow-sm ring-1 ring-[#E4E7EC]"
                        : "text-[#6B7280] hover:text-[#374151]"
                    }`}
                  >
                    <ClipboardList className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Attendance</span>
                    {pendingAttendanceCount > 0 ? (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#008CD3] px-1 text-[9px] font-bold text-white">
                        {pendingAttendanceCount > 9
                          ? "9+"
                          : pendingAttendanceCount}
                      </span>
                    ) : null}
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {activityTab === "notifications" ? (
                  <>
                    {exitProcessesReports.length > 0 && detail ? (
                      <ul className="divide-y divide-slate-100 border-b border-slate-200/90 bg-white">
                        {exitProcessesReports.map((ep) => (
                          <li
                            key={`exit-report-${ep.id}`}
                            className="relative border-l-[3px] border-l-rose-500/75 px-4 py-3 transition hover:bg-rose-50/40"
                          >
                            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-rose-700">
                              <ShieldAlert className="h-3 w-3" aria-hidden />
                              {exitFeedActionHeadline(ep.action_type)}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-[#0C123A]">
                              {ep.employee_name?.trim() || `Employee #${ep.employee_id}`}
                            </p>
                            {ep.employee_email ? (
                              <p className="text-[11px] text-slate-600">{ep.employee_email}</p>
                            ) : null}
                            <div className="mt-1.5 flex flex-wrap gap-x-2 text-[11px] text-slate-500">
                              {ep.last_working_day ? (
                                <span>Last day {fmtDateOnly(ep.last_working_day)}</span>
                              ) : null}
                              {ep.exit_date ? (
                                <span>
                                  {ep.last_working_day ? " · " : null}
                                  Exit {fmtDateOnly(ep.exit_date)}
                                </span>
                              ) : null}
                            </div>
                            {ep.action_performed_by_name ? (
                              <p className="mt-1 text-[10px] text-slate-500">
                                Opened by {ep.action_performed_by_name}
                              </p>
                            ) : null}
                            <div className="mt-3">
                              <Link
                                href={`/dashboard/${orgId}/organization-employees/team-group?user_id=${encodeURIComponent(String(ep.employee_id))}`}
                                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#008CD3] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#0070AA]"
                              >
                                View more
                                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                              </Link>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {notifications.length === 0 && exitProcessesReports.length === 0 ? (
                      <p className="px-4 py-10 text-center text-sm text-slate-500">
                        No alerts yet. Roster updates and open exits appear here when present.
                      </p>
                    ) : notifications.length > 0 ? (
                      <>
                        {exitProcessesReports.length > 0 ? (
                          <p className="border-b border-slate-100 bg-slate-50/80 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                            Roster log
                          </p>
                        ) : null}
                        <ul className="divide-y divide-slate-100">
                          {notifications.map((n) => (
                            <li
                              key={n.id}
                              className="relative border-l-[3px] border-l-[#008CD3]/70 pl-4 pr-4 py-3 transition hover:bg-[#F9FAFB]"
                            >
                              <p className="text-[10px] font-bold uppercase tracking-wide text-[#008CD3]">
                                {actionLabel(n.action_type)}
                              </p>
                              <p className="mt-1 text-sm font-medium text-[#1F2937]">
                                {n.action_reason}
                              </p>
                              <div className="mt-1.5 flex flex-wrap gap-x-2 text-[11px] text-slate-500">
                                <span>{fmtLong(n.created_at)}</span>
                                {n.performed_by_name ? (
                                  <span>· {n.performed_by_name}</span>
                                ) : null}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : exitProcessesReports.length > 0 ? (
                      <p className="px-4 py-8 text-center text-[11px] text-slate-500">
                        No roster log entries yet.
                      </p>
                    ) : null}
                  </>
                ) : null}

                {activityTab === "leaves" ? (
                  leaveQueries.length === 0 ? (
                    <p className="px-4 py-10 text-center text-sm text-slate-500">
                      No leave requests for this team yet.
                    </p>
                  ) : (
                    <ul className="space-y-3 p-3">
                      {leaveQueries.map((q) => {
                        const pending =
                          String(q.status).toLowerCase() === "pending";
                        return (
                          <li
                            key={q.id}
                            className="rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] p-3 shadow-sm"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-semibold text-[#1F2937]">
                                  {q.user_name}
                                </p>
                                <p className="text-[11px] text-[#6B7280]">
                                  {q.user_email}
                                  {q.user_phone ? ` · ${q.user_phone}` : ""}
                                </p>
                              </div>
                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${leaveStatusChipClass(q.status)}`}
                              >
                                {q.status}
                              </span>
                            </div>
                            <p className="mt-2 text-sm font-medium capitalize text-slate-800">
                              {leaveTypeLabel(q.leave_type)}
                            </p>
                            <p className="text-xs text-slate-600">
                              {fmtLong(q.start_date)}
                              {q.end_date ? ` → ${fmtLong(q.end_date)}` : ""}
                            </p>
                            {q.reason ? (
                              <p className="mt-1 line-clamp-3 text-xs text-slate-600">
                                {q.reason}
                              </p>
                            ) : null}
                            <p className="mt-1 text-[10px] text-slate-400">
                              Submitted {fmtLong(q.created_at)}
                            </p>
                            {pending && showLeaveApproveButtons ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  disabled={leaveBusyId === q.id}
                                  onClick={() =>
                                    void handleLeaveResponse(q.id, "rejected")
                                  }
                                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50 sm:flex-initial"
                                >
                                  <X className="h-3.5 w-3.5" />
                                  Reject
                                </button>
                                <button
                                  type="button"
                                  disabled={leaveBusyId === q.id}
                                  onClick={() =>
                                    void handleLeaveResponse(q.id, "approved")
                                  }
                                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50 sm:flex-initial"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  Approve
                                </button>
                              </div>
                            ) : null}
                            {pending && !showLeaveApproveButtons ? (
                              <p className="mt-2 text-[11px] text-amber-800/90">
                                Pending — only organization admin, HR, or manager
                                can approve or reject.
                              </p>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )
                ) : null}

                {activityTab === "attendance" ? (
                  attendanceListError ? (
                    <p className="px-4 py-6 text-center text-sm text-amber-800">
                      {attendanceListError}
                    </p>
                  ) : attendanceQueries.length === 0 ? (
                    <p className="px-4 py-10 text-center text-sm text-slate-500">
                      No attendance queries for this team yet.
                    </p>
                  ) : (
                    <ul className="space-y-3 p-3">
                      {attendanceQueries.map((row) => {
                        const pending =
                          String(row.query_status).toLowerCase() === "pending";
                        const who = attendeeFromQuery(row, detail, orgUsers);
                        return (
                          <li
                            key={row.id}
                            className="rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] p-3 shadow-sm"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-semibold text-[#1F2937]">
                                  {who.name}
                                </p>
                                {who.email ? (
                                  <p className="text-[11px] text-[#6B7280]">
                                    {who.email}
                                    {who.phone ? ` · ${who.phone}` : ""}
                                  </p>
                                ) : null}
                              </div>
                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${leaveStatusChipClass(row.query_status)}`}
                              >
                                {row.query_status}
                              </span>
                            </div>
                            <p className="mt-2 text-sm font-medium text-slate-800">
                              {attendanceCategoryLabel(row.category)}
                            </p>
                            <p className="text-xs text-slate-600">
                              Date: {fmtDateOnly(row.attendance_date)}
                            </p>
                            <p className="mt-1 text-sm text-slate-700">
                              {row.query_message}
                            </p>
                            {row.admin_response ? (
                              <p className="mt-2 rounded-lg border border-slate-100 bg-white px-2.5 py-2 text-xs text-slate-600">
                                <span className="font-semibold text-slate-800">
                                  Response
                                </span>
                                {" — "}
                                {row.admin_response}
                                {row.approved_by_name ? (
                                  <span className="mt-1 block text-[11px] text-slate-500">
                                    — {row.approved_by_name}
                                    {row.resolved_at
                                      ? ` · ${fmtLong(row.resolved_at)}`
                                      : ""}
                                  </span>
                                ) : null}
                              </p>
                            ) : null}
                            <p className="mt-1 text-[10px] text-slate-400">
                              Submitted {fmtLong(row.created_at)}
                            </p>
                            {pending && showLeaveApproveButtons ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  disabled={
                                    attResolveSubmitting &&
                                    attResolveModal?.id === row.id
                                  }
                                  onClick={() =>
                                    openAttResolveModal(
                                      row.id,
                                      row.user_id,
                                      "rejected",
                                    )
                                  }
                                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50 sm:flex-initial"
                                >
                                  <X className="h-3.5 w-3.5" />
                                  Reject
                                </button>
                                <button
                                  type="button"
                                  disabled={
                                    attResolveSubmitting &&
                                    attResolveModal?.id === row.id
                                  }
                                  onClick={() =>
                                    openAttResolveModal(
                                      row.id,
                                      row.user_id,
                                      "approved",
                                    )
                                  }
                                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50 sm:flex-initial"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  Approve
                                </button>
                              </div>
                            ) : null}
                            {pending && !showLeaveApproveButtons ? (
                              <p className="mt-2 text-[11px] text-amber-800/90">
                                Pending — only organization admin, HR, or manager
                                can approve or reject.
                              </p>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )
                ) : null}
              </div>
                </div>
                ) : null}

                {desktopRightTab === "hr" && showMemberHrSection ? (
                <div key="desktop-hr" className="team-group-panel-in absolute inset-0 flex flex-col overflow-y-auto">
                  <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#E4E7EC] bg-[#F9FAFB] px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[#008CD3]" aria-hidden />
                      <h3 className="text-[13px] font-semibold text-[#1F2937]">My HR requests</h3>
                    </div>
                    <div className="flex gap-2 text-[10px] font-semibold text-[#6B7280]">
                      <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-[#E4E7EC]">
                        Leave {myPendingLeaveCount}
                      </span>
                      <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-[#E4E7EC]">
                        Attendance {myPendingAttCount}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2 border-b border-[#E4E7EC] p-3">
                    <button
                      type="button"
                      onClick={openAdminLeaveModal}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#008CD3] px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-[#0070AA]"
                    >
                      <CalendarDays className="h-3.5 w-3.5" />
                      Request leave
                    </button>
                    <button
                      type="button"
                      onClick={openAdminAttModal}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#E4E7EC] bg-white px-3 py-2 text-[12px] font-semibold text-[#374151] transition hover:bg-[#F9FAFB]"
                    >
                      <ClipboardList className="h-3.5 w-3.5" />
                      Attendance query
                    </button>
                  </div>

                  {myRequestsError ? (
                    <div className="mx-3 mt-2 flex items-start gap-2 rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                      <span>{myRequestsError}</span>
                    </div>
                  ) : null}

                  <div className="grid min-h-0 flex-1 grid-cols-1 divide-y divide-[#E4E7EC] sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                    <div className="flex min-h-0 flex-col p-3">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF]">
                        Your leave ({myLeaveRows.length})
                      </p>
                      <div className="min-h-0 flex-1 overflow-y-auto">
                      {myLeaveRows.length === 0 ? (
                        <p className="py-6 text-center text-[11px] text-[#9CA3AF]">Nothing submitted yet</p>
                      ) : (
                        <ul className="space-y-2">
                          {myLeaveRows.map((r) => (
                            <li
                              key={r.id}
                              className="rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] px-2.5 py-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <span className="text-[12px] font-semibold capitalize text-[#1F2937]">
                                    {leaveTypeLabel(r.leave_type)}
                                  </span>
                                  <p className="mt-0.5 text-[10px] text-[#6B7280]">
                                    {fmtDateOnly(r.start_date)}
                                    {r.end_date ? ` – ${fmtDateOnly(r.end_date)}` : ""}
                                  </p>
                                </div>
                                <span
                                  className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${leaveStatusChipClass(r.status)}`}
                                >
                                  {r.status}
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                      </div>
                    </div>
                    <div className="flex min-h-0 flex-col p-3">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF]">
                        Your attendance ({myAttRows.length})
                      </p>
                      <div className="min-h-0 flex-1 overflow-y-auto">
                      {myAttRows.length === 0 ? (
                        <p className="py-6 text-center text-[11px] text-[#9CA3AF]">No queries yet</p>
                      ) : (
                        <ul className="space-y-2">
                          {myAttRows.map((r) => (
                            <li
                              key={r.id}
                              className="rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] px-2.5 py-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <span className="text-[12px] font-semibold text-[#1F2937]">
                                    {attendanceCategoryLabel(r.category)}
                                  </span>
                                  <p className="mt-0.5 text-[10px] text-[#6B7280]">
                                    {fmtDateOnly(r.attendance_date)}
                                  </p>
                                </div>
                                <span
                                  className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${leaveStatusChipClass(r.query_status)}`}
                                >
                                  {r.query_status}
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                      </div>
                    </div>
                  </div>
                </div>
                ) : null}
              </div>
            </div>
            )}
            </div>
          ) : null}
        </div>
        </div>
      </div>

      {adminLeaveModalOpen ? (
        <div
          className={waModalShellClass()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-leave-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close"
            onClick={() => !leaveSubmitting && setAdminLeaveModalOpen(false)}
          />
          <div className={waModalPanelClass()}>
            <div className={waModalHeaderClass()}>
              <div className="min-w-0 flex-1 pr-2">
                <h2
                  id="admin-leave-title"
                  className="text-[15px] font-semibold text-[#1F2937] sm:text-lg sm:font-bold"
                >
                  Request leave
                </h2>
                <p className="mt-0.5 text-[12px] text-[#6B7280] sm:text-xs">
                  Submitted to HR for this organization (linked to your team).
                </p>
              </div>
              <button
                type="button"
                disabled={leaveSubmitting}
                onClick={() => setAdminLeaveModalOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] bg-white text-[#6B7280] transition hover:bg-[#F5F7FA] disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              onSubmit={onSubmitAdminLeave}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
                {leaveFormError ? (
                  <p className="rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] p-3 text-sm text-[#D93025]">
                    {leaveFormError}
                  </p>
                ) : null}
                <AssignedLeaveTypeSelect
                  options={assignedLeaveOptions}
                  loading={assignedLeavesLoading}
                  error={assignedLeavesError}
                  selectedLeaveTypeId={selectedLeaveTypeId}
                  onSelectLeaveTypeId={setSelectedLeaveTypeId}
                  className={waFieldCls()}
                  labelClassName="text-[12px] font-semibold text-[#6B7280] sm:text-xs sm:text-slate-600"
                />
                <label className="block">
                  <span className="text-[12px] font-semibold text-[#6B7280] sm:text-xs sm:text-slate-600">
                    Start date
                  </span>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={waFieldCls()}
                  />
                </label>
                <label className="block">
                  <span className="text-[12px] font-semibold text-[#6B7280] sm:text-xs sm:text-slate-600">
                    End date{" "}
                    <span className="font-normal text-[#9CA3AF]">(optional)</span>
                  </span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={waFieldCls()}
                  />
                </label>
                <label className="block">
                  <span className="text-[12px] font-semibold text-[#6B7280] sm:text-xs sm:text-slate-600">
                    Reason{" "}
                    <span className="font-normal text-[#9CA3AF]">(optional)</span>
                  </span>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="Context for HR…"
                    className={waFieldCls()}
                  />
                </label>
              </div>
              <div
                className={`${waModalFooterClass()} flex-row sm:flex-row`}
                style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
              >
                <button
                  type="button"
                  disabled={leaveSubmitting}
                  onClick={() => setAdminLeaveModalOpen(false)}
                  className={zohoSecondaryBtnCls()}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    leaveSubmitting ||
                    assignedLeavesLoading ||
                    assignedLeaveOptions.length === 0 ||
                    !selectedLeaveTypeId
                  }
                  className={zohoPrimaryBtnCls()}
                >
                  {leaveSubmitting ? "Submitting…" : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {adminAttModalOpen ? (
        <div
          className={waModalShellClass()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-att-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close"
            onClick={() => !attSubmitting && setAdminAttModalOpen(false)}
          />
          <div className={waModalPanelClass()}>
            <div className={waModalHeaderClass()}>
              <div className="min-w-0 flex-1 pr-2">
                <h2
                  id="admin-att-title"
                  className="text-[15px] font-semibold text-white sm:text-lg sm:font-bold sm:text-[#0C123A]"
                >
                  Attendance query to HR
                </h2>
                <p className="mt-0.5 text-[12px] text-white/80 sm:text-xs sm:text-slate-500">
                  Report a missed punch or timing issue for a specific day.
                </p>
              </div>
              <button
                type="button"
                disabled={attSubmitting}
                onClick={() => setAdminAttModalOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] bg-white text-[#6B7280] transition hover:bg-[#F5F7FA] disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              onSubmit={onSubmitAdminAtt}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
                {attFormError ? (
                  <p className="rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] p-3 text-sm text-[#D93025]">
                    {attFormError}
                  </p>
                ) : null}
                <label className="block">
                  <span className="text-[12px] font-semibold text-[#6B7280] sm:text-xs sm:text-slate-600">
                    Issue type
                  </span>
                  <select
                    value={attCategory}
                    onChange={(e) =>
                      setAttCategory(e.target.value as AttendanceQueryCategory)
                    }
                    className={waFieldCls()}
                  >
                    <option value="forget_punch_in">Forgot punch in</option>
                    <option value="forget_punch_out">Forgot punch out</option>
                    <option value="late_punch_in">Late punch in</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-[12px] font-semibold text-[#6B7280] sm:text-xs sm:text-slate-600">
                    Attendance date
                  </span>
                  <input
                    type="date"
                    required
                    value={attDate}
                    onChange={(e) => setAttDate(e.target.value)}
                    className={waFieldCls()}
                  />
                </label>
                <label className="block">
                  <span className="text-[12px] font-semibold text-[#6B7280] sm:text-xs sm:text-slate-600">
                    Explanation
                  </span>
                  <textarea
                    value={attMessage}
                    onChange={(e) => setAttMessage(e.target.value)}
                    rows={4}
                    required
                    placeholder="What happened? Include times if relevant."
                    className={waFieldCls()}
                  />
                </label>
              </div>
              <div
                className={`${waModalFooterClass()} flex-row sm:flex-row`}
                style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
              >
                <button
                  type="button"
                  disabled={attSubmitting}
                  onClick={() => setAdminAttModalOpen(false)}
                  className={zohoSecondaryBtnCls()}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={attSubmitting}
                  className={zohoPrimaryBtnCls()}
                >
                  {attSubmitting ? "Submitting…" : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {attResolveModal ? (
        <div
          className={waModalShellClass()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="att-resolve-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close"
            onClick={() => !attResolveSubmitting && setAttResolveModal(null)}
          />
          <div className={`${waModalPanelClass()} max-w-md`}>
            <div className={waModalHeaderClass()}>
              <div className="min-w-0 flex-1 pr-2">
                <h2
                  id="att-resolve-title"
                  className="text-[15px] font-semibold text-white sm:text-lg sm:font-bold sm:text-[#0C123A]"
                >
                  {attResolveModal.action === "approved"
                    ? "Approve attendance query"
                    : "Reject attendance query"}
                </h2>
                <p className="mt-0.5 text-[12px] text-white/80 sm:text-xs sm:text-slate-500">
                  Your note is saved as the admin response and shown to the
                  employee.
                </p>
              </div>
              <button
                type="button"
                disabled={attResolveSubmitting}
                onClick={() => setAttResolveModal(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] bg-white text-[#6B7280] transition hover:bg-[#F5F7FA] disabled:opacity-50"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
              <label className="block">
                <span className="text-[12px] font-semibold text-[#6B7280]">
                  Management note
                </span>
                <textarea
                  value={attResolveNote}
                  onChange={(e) => setAttResolveNote(e.target.value)}
                  rows={4}
                  placeholder="Explain the decision (required)…"
                  className={`${waFieldCls()} mt-1.5`}
                />
              </label>
            </div>
            <div
              className={`${waModalFooterClass()} flex-row sm:flex-row`}
              style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
            >
              <button
                type="button"
                disabled={attResolveSubmitting}
                onClick={() => setAttResolveModal(null)}
                className={zohoSecondaryBtnCls()}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={attResolveSubmitting}
                onClick={() => void submitAttResolveModal()}
                className={
                  attResolveModal.action === "approved"
                    ? zohoPrimaryBtnCls()
                    : "inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-[#C62828] px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-50 sm:w-auto"
                }
              >
                {attResolveSubmitting
                  ? "Submitting…"
                  : attResolveModal.action === "approved"
                    ? "Submit approval"
                    : "Submit rejection"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {modal && focusRow && isTeamAdmin
        ? (() => {
            const team = focusRow;
            if (modal === "add") {
              return modalShell(
                "Add member",
                closeModal,
                <>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8696A0]" />
                    <input
                      type="search"
                      className={searchFieldCls()}
                      placeholder="Search name or email"
                      value={addSearch}
                      onChange={(e) => setAddSearch(e.target.value)}
                    />
                  </div>
                  <ul className="mt-4 max-h-[min(50dvh,320px)] divide-y divide-[#E9EDEF] overflow-y-auto lg:max-h-64 lg:space-y-2 lg:divide-y-0">
                    {addCandidates.length === 0 ? (
                      <li className="py-10 text-center text-[15px] text-[#667781] lg:py-8 lg:text-sm lg:text-slate-500">
                        No one to add.
                      </li>
                    ) : (
                      addCandidates.map((u) => (
                        <li
                          key={String(u.id)}
                          className="flex items-center gap-2.5 py-3 lg:justify-between lg:gap-2 lg:rounded-xl lg:border lg:border-slate-100 lg:bg-slate-50 lg:px-3 lg:py-2"
                        >
                          <UserAvatarButton
                            name={String(u.user_name ?? "User")}
                            userImage={profileImageUrlFromRow(
                              (u as { user_image?: unknown }).user_image,
                            )}
                            size="sm"
                            onZoom={openPhotoZoom}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] font-semibold text-[#1F2937] lg:text-sm">
                              {u.user_name}
                            </div>
                            <div className={`truncate ${mobileCaptionCls} lg:text-xs`}>
                              {u.user_email}
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              runAction(async () => {
                                const t = token();
                                if (!t) throw new Error("Sign in required.");
                                await addMemberToOrgTeam(t, team.team_id, u.id as number | string);
                              })
                            }
                            className="shrink-0 rounded-lg bg-[#008CD3] px-3 py-2 text-[12px] font-semibold text-white active:scale-[0.98] disabled:opacity-50 lg:bg-[#0C123A] lg:px-3 lg:py-1.5 lg:text-xs lg:hover:bg-[#151f52]"
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
                "Remove member",
                closeModal,
                <>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8696A0]" />
                    <input
                      type="search"
                      className={searchFieldCls()}
                      placeholder="Search member"
                      value={removeSearch}
                      onChange={(e) => setRemoveSearch(e.target.value)}
                    />
                  </div>
                  <ul className="mt-4 max-h-[min(50dvh,320px)] divide-y divide-[#E9EDEF] overflow-y-auto lg:max-h-64 lg:space-y-2 lg:divide-y-0">
                    {removeCandidates.map((m) => (
                      <li
                        key={m.team_member_id}
                        className="flex items-center gap-2.5 py-3 lg:justify-between lg:gap-2 lg:rounded-xl lg:border lg:border-slate-100 lg:bg-slate-50 lg:px-3 lg:py-2"
                      >
                        <UserAvatarButton
                          name={m.user_name}
                          userImage={m.user_image}
                          size="sm"
                          onZoom={openPhotoZoom}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-semibold text-[#1F2937] lg:text-sm">
                            {m.user_name}
                          </div>
                          <div className={`truncate ${mobileCaptionCls} lg:text-xs`}>
                            {m.user_email}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={Number(m.user_id) === Number(team.admin_id)}
                          onClick={() =>
                            runAction(async () => {
                              const t = token();
                              if (!t) throw new Error("Sign in required.");
                              await removeMemberFromOrgTeam(t, team.team_id, m.user_id);
                            })
                          }
                          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#C62828] px-3 py-2 text-[12px] font-semibold text-white active:scale-[0.98] disabled:opacity-40 lg:bg-rose-600 lg:py-1.5 lg:text-xs lg:hover:bg-rose-700"
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
            return null;
          })()
        : null}
    </div>
  );
}
