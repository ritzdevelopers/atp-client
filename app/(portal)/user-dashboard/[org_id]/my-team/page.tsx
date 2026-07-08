"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CalendarDays,
  ClipboardList,
  Loader2,
  Mail,
  Pencil,
  RefreshCw,
  Shield,
  UserRound,
  Users,
  X,
} from "lucide-react";
import type { ApiError } from "@/services/auth";
import type { LeaveQueryRow } from "@/services/employeeLeaves";
import {
  attendanceCategoryLabel,
  correctAttendanceQuery,
  raiseAttendanceQuery,
  type AttendanceQueryCategory,
  type AttendanceQueryRow,
} from "@/services/attendanceQueries";
import { fetchMyOrgTeam } from "@/services/orgTeams";
import type {
  OrgTeamDetail,
  OrgTeamMemberRow,
  TeamAttendanceQueryRow,
  TeamLeaveQueryRow,
} from "@/services/orgTeams";
import {
  clearMyOrgTeamCache,
  readMyOrgTeamCache,
  shouldRefreshMyOrgTeamCache,
  writeMyOrgTeamCache,
} from "@/lib/employeeManagementCache";

function formatDate(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function initialsFromName(name: string | null | undefined): string {
  if (name == null || !String(name).trim()) return "?";
  const parts = String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((p) => p[0]!.toUpperCase()).join("") || "?";
}

function normalizeTeamLeaveRows(rows: TeamLeaveQueryRow[] | undefined): LeaveQueryRow[] {
  return (rows ?? []).map((row) => ({
    id: Number(row.id),
    user_id: row.user_id != null ? Number(row.user_id) : null,
    user_name: String(row.user_name ?? ""),
    user_email: String(row.user_email ?? ""),
    org_id: Number(row.org_id),
    leave_type: String(row.leave_type ?? "Leave"),
    start_date: String(row.start_date),
    end_date: row.end_date != null ? String(row.end_date) : null,
    reason: row.reason != null ? String(row.reason) : null,
    status: String(row.status ?? "pending").toLowerCase() as LeaveQueryRow["status"],
    approved_by: row.approved_by != null ? Number(row.approved_by) : null,
    approved_by_name:
      row.approved_by_name != null && String(row.approved_by_name).trim() !== ""
        ? String(row.approved_by_name)
        : null,
    team_id: row.team_id != null ? Number(row.team_id) : null,
    created_at: String(row.created_at),
    updated_at: row.updated_at != null ? String(row.updated_at) : null,
  }));
}

function normalizeTeamAttendanceRows(
  rows: TeamAttendanceQueryRow[] | undefined,
): AttendanceQueryRow[] {
  return (rows ?? []).map((row) => ({
    id: Number(row.id),
    user_id: Number(row.user_id),
    org_id: Number(row.org_id),
    team_id: row.team_id != null ? Number(row.team_id) : null,
    query_status: String(row.query_status ?? "pending"),
    category: String(row.category),
    query_message: String(row.query_message ?? ""),
    attendance_date: String(row.attendance_date),
    approved_by: row.approved_by != null ? Number(row.approved_by) : null,
    approved_by_name:
      row.approved_by_name != null && String(row.approved_by_name).trim() !== ""
        ? String(row.approved_by_name)
        : null,
    admin_response:
      row.admin_response != null ? String(row.admin_response) : null,
    resolved_at: row.resolved_at != null ? String(row.resolved_at) : null,
    created_at: String(row.created_at),
    updated_at: row.updated_at != null ? String(row.updated_at) : null,
  }));
}

function leaveStatusTone(
  status: string,
): "emerald" | "rose" | "amber" {
  const s = String(status).toLowerCase();
  if (s === "approved") return "emerald";
  if (s === "rejected") return "rose";
  return "amber";
}

function attendanceStatusTone(
  status: string,
): "emerald" | "rose" | "amber" {
  return leaveStatusTone(status);
}

const toneChip: Record<"emerald" | "rose" | "amber", string> = {
  emerald: "bg-[#E8F5E9] text-[#1B7F3B]",
  rose: "bg-[#FDECEA] text-[#C5221F]",
  amber: "bg-[#FEF7E0] text-[#E37400]",
};

const accentBar: Record<"emerald" | "rose" | "amber", string> = {
  emerald: "border-l-[3px] border-l-[#1B7F3B]",
  rose: "border-l-[3px] border-l-[#C5221F]",
  amber: "border-l-[3px] border-l-[#E37400]",
};

const panelClass =
  "overflow-hidden rounded-md border border-[#DDE4EE] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]";

const desktopLabelCls =
  "text-[11px] font-medium uppercase tracking-[0.04em] text-[#8A94A6]";
const desktopCaptionCls = "text-[13px] leading-relaxed text-[#5C6978]";
const desktopValueCls = "text-[15px] font-semibold text-[#2B2B2B]";

function zohoPrimaryBtnCls(full = false) {
  return `inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-md bg-[#0088DD] px-4 py-2 text-[14px] font-medium text-white shadow-sm transition hover:bg-[#0070B8] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full flex-1" : ""}`;
}

function zohoSecondaryBtnCls(full = false) {
  return `inline-flex min-h-[40px] items-center justify-center rounded-md border border-[#DDE4EE] bg-white px-4 py-2 text-[14px] font-medium text-[#2B2B2B] shadow-sm transition hover:border-[#C5CED9] hover:bg-[#F8FAFC] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full flex-1" : ""}`;
}

/** Sits above the layout bottom tab bar (z-[55]) on mobile/tablet. */
const mobileActionBarCls =
  "fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-[54] border-t border-[#DDE4EE] bg-white/98 px-3 py-3 shadow-[0_-4px_16px_rgba(16,24,40,0.08)] backdrop-blur-md";
const mobileContentBottomPad = "pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))]";
const mobileCardCls =
  "overflow-hidden rounded-md border border-[#DDE4EE] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]";
const mobileCardInnerCls = "p-4 sm:p-5";
const mobileSectionGap = "space-y-3 sm:space-y-4";
const mobileLabelCls =
  "text-[11px] font-medium uppercase tracking-[0.04em] text-[#8A94A6]";
const mobileCaptionCls = "text-[12px] leading-relaxed text-[#5C6978]";
const mobileValueCls = "text-[14px] font-semibold text-[#2B2B2B]";

function mobileActionPrimaryBtnCls(full = false) {
  return `inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-md bg-[#0088DD] px-3.5 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#0070B8] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full flex-1" : ""}`;
}

function mobileActionSecondaryBtnCls(full = false) {
  return `inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-md border border-[#DDE4EE] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#2B2B2B] shadow-sm transition hover:bg-[#F8FAFC] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full flex-1" : ""}`;
}

function zohoInputCls() {
  return "mt-1.5 w-full rounded-md border border-[#DDE4EE] bg-white px-3 py-2.5 text-[14px] text-[#2B2B2B] outline-none transition placeholder:text-[#8A94A6] focus:border-[#0088DD] focus:ring-2 focus:ring-[#0088DD]/15 lg:text-[15px]";
}

function zohoUnderlineTabCls(active: boolean) {
  return `relative flex min-w-0 flex-1 items-center justify-center gap-1.5 px-2 py-3 text-[13px] font-medium transition sm:px-3 sm:text-[14px] ${
    active
      ? "text-[#0088DD] after:absolute after:inset-x-2 after:bottom-0 after:h-[2px] after:rounded-full after:bg-[#0088DD] sm:after:inset-x-3"
      : "text-[#5C6978] hover:text-[#2B2B2B]"
  }`;
}

function jwtUserId(token: string | null): number | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1] || "")) as {
      id?: number | string;
      user_id?: number | string;
    };
    const raw = payload.id ?? payload.user_id;
    if (raw == null || raw === "") return null;
    const n = Number(raw);
    return Number.isNaN(n) ? null : n;
  } catch {
    return null;
  }
}

function memberImageUrl(value: string | null | undefined): string | null {
  const url = value?.trim();
  return url ? url : null;
}

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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#111B21]/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="team-photo-zoom-title"
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
          className="absolute -right-1 -top-1 z-[2] flex h-9 w-9 items-center justify-center rounded-full border border-[#DDE4EE] bg-white text-[#2B2B2B] shadow-lg active:scale-95"
          aria-label="Close"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={alt}
          className="max-h-[min(78vh,560px)] w-full rounded-md bg-white object-contain shadow-2xl ring-1 ring-[#DDE4EE]"
        />
        <p
          id="team-photo-zoom-title"
          className="mt-2.5 text-center text-[13px] font-medium text-white"
        >
          {alt}
        </p>
      </div>
    </div>
  );
}

function MemberAvatarButton({
  name,
  userImage,
  size = "md",
  onZoom,
}: {
  name: string;
  userImage?: string | null;
  size?: "sm" | "md";
  onZoom: (imageUrl: string, alt: string) => void;
}) {
  const img = memberImageUrl(userImage);
  const box = size === "sm" ? "h-9 w-9" : "h-10 w-10";
  const label = name?.trim() || "Team member";

  if (img) {
    return (
      <button
        type="button"
        onClick={() => onZoom(img, label)}
        className={`${box} shrink-0 overflow-hidden rounded-full ring-2 ring-white shadow-sm transition active:opacity-90`}
        aria-label={`View ${label} profile photo`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img} alt="" className="h-full w-full object-cover" />
      </button>
    );
  }

  return (
    <span
      className={`flex ${box} shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-2 ring-white ${memberColorClass(label)}`}
      aria-hidden
    >
      {initialsFromName(label)}
    </span>
  );
}

function mobileStatusCls(tone: "emerald" | "rose" | "amber"): string {
  if (tone === "emerald") return "bg-[#E8F5E9] text-[#1B7F3B]";
  if (tone === "rose") return "bg-[#FDECEA] text-[#C5221F]";
  return "bg-[#FEF7E0] text-[#E37400]";
}

const MOBILE_ICON_COLORS = [
  "bg-[#E8F4FC] text-[#0088DD]",
  "bg-[#E8F5E9] text-[#1B7F3B]",
  "bg-[#FEF3E6] text-[#E37400]",
  "bg-[#F3E8FD] text-[#7B1FA2]",
  "bg-[#FDECEA] text-[#C5221F]",
];

function memberColorClass(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return MOBILE_ICON_COLORS[Math.abs(hash) % MOBILE_ICON_COLORS.length];
}

function MobileMemberRow({
  member,
  onZoomPhoto,
}: {
  member: OrgTeamMemberRow;
  onZoomPhoto: (imageUrl: string, alt: string) => void;
}) {
  return (
    <li>
      <div className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-[#F8FAFC] sm:px-5">
        <MemberAvatarButton
          name={member.user_name}
          userImage={member.user_image}
          size="md"
          onZoom={onZoomPhoto}
        />
        <div className="min-w-0 flex-1">
          <p className={`truncate ${mobileValueCls}`}>{member.user_name}</p>
          {member.user_email ? (
            <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-[#5C6978]">
              <Mail className="h-3 w-3 shrink-0 text-[#8A94A6]" aria-hidden />
              {member.user_email}
            </p>
          ) : null}
          <p className={`mt-1 flex items-center gap-1 ${mobileCaptionCls}`}>
            <Calendar className="h-3 w-3 shrink-0 text-[#8A94A6]" aria-hidden />
            Joined {formatDate(member.joined_date)}
          </p>
        </div>
      </div>
    </li>
  );
}

function MobileLeaveRow({ row }: { row: LeaveQueryRow }) {
  const tone = leaveStatusTone(row.status);
  const accentBorder =
    tone === "emerald"
      ? "border-l-[#1B7F3B]"
      : tone === "rose"
        ? "border-l-[#C5221F]"
        : "border-l-[#E37400]";
  return (
    <li className="px-3 py-1.5 sm:px-4">
      <div
        className={`rounded-md border border-[#DDE4EE] border-l-[3px] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${accentBorder}`}
      >
        <div className="flex items-start justify-between gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${mobileStatusCls(tone)}`}
          >
            {row.status}
          </span>
          <time
            className="text-[10px] tabular-nums text-[#8A94A6]"
            dateTime={row.created_at ?? undefined}
          >
            {formatDate(row.created_at)}
          </time>
        </div>
        <p className="mt-2 text-[14px] font-semibold capitalize text-[#2B2B2B]">
          {row.leave_type.replace(/_/g, " ")}
        </p>
        <p className={`mt-1 flex items-center gap-1 ${mobileCaptionCls}`}>
          <CalendarDays className="h-3 w-3 shrink-0 text-[#0088DD]" aria-hidden />
          {formatDate(row.start_date)}
          {row.end_date ? ` → ${formatDate(row.end_date)}` : ""}
        </p>
        {row.reason ? (
          <p className={`mt-2 line-clamp-2 rounded-md bg-[#F8FAFC] px-2.5 py-2 ${mobileCaptionCls}`}>
            {row.reason}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function MobileAttendanceRow({
  row,
  onEdit,
}: {
  row: AttendanceQueryRow;
  onEdit: () => void;
}) {
  const tone = attendanceStatusTone(row.query_status);
  const pending = String(row.query_status).toLowerCase() === "pending";
  const accentBorder =
    tone === "emerald"
      ? "border-l-[#1B7F3B]"
      : tone === "rose"
        ? "border-l-[#C5221F]"
        : "border-l-[#E37400]";
  return (
    <li className="px-3 py-1.5 sm:px-4">
      <div
        className={`rounded-md border border-[#DDE4EE] border-l-[3px] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${accentBorder}`}
      >
        <div className="flex items-start justify-between gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${mobileStatusCls(tone)}`}
          >
            {row.query_status}
          </span>
          {pending ? (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1 rounded-md border border-[#DDE4EE] bg-[#F8FAFC] px-2.5 py-1 text-[11px] font-semibold text-[#0088DD] transition hover:border-[#0088DD]/30 hover:bg-[#E8F4FC]"
            >
              <Pencil className="h-3 w-3" aria-hidden />
              Edit
            </button>
          ) : null}
        </div>
        <p className={`mt-2 ${mobileValueCls}`}>{attendanceCategoryLabel(row.category)}</p>
        <p className={`mt-1 flex items-center gap-1 ${mobileCaptionCls}`}>
          <Calendar className="h-3 w-3 shrink-0 text-[#0088DD]" aria-hidden />
          {formatDate(row.attendance_date)}
        </p>
        <p className={`mt-2 line-clamp-3 rounded-md bg-[#F8FAFC] px-2.5 py-2 ${mobileCaptionCls}`}>
          {row.query_message}
        </p>
        {row.admin_response ? (
          <div className="mt-2 rounded-md border border-[#DDE4EE] bg-[#F4F6F9] px-2.5 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8A94A6]">
              Response
            </p>
            <p className={`mt-0.5 ${mobileCaptionCls}`}>{row.admin_response}</p>
          </div>
        ) : null}
      </div>
    </li>
  );
}

export default function UserMyTeamPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-[#5C6978]">
          <Loader2 className="h-8 w-8 animate-spin text-[#0088DD]" />
        </div>
      }
    >
      <UserMyTeamPageContent />
    </Suspense>
  );
}

function UserMyTeamPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedTeamId = searchParams.get("team_id");
  const orgIdParam = params?.org_id;
  const orgId = Number(orgIdParam);

  const cachedTeam =
    orgId && !Number.isNaN(orgId) ? readMyOrgTeamCache(orgId, selectedTeamId) : null;

  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => !cachedTeam);
  const [refreshing, setRefreshing] = useState(false);
  const [team, setTeam] = useState<OrgTeamDetail | null>(() => cachedTeam?.team ?? null);
  const [noTeam, setNoTeam] = useState(() => cachedTeam?.noTeam ?? false);
  const [teamError, setTeamError] = useState<string | null>(null);

  const leaveRows = useMemo(
    () => normalizeTeamLeaveRows(team?.my_leave_queries),
    [team],
  );
  const attendanceRows = useMemo(
    () => normalizeTeamAttendanceRows(team?.my_attendance_related_queries),
    [team],
  );

  function openLeaveApplication() {
    const teamQuery = team?.team_id ?? selectedTeamId;
    const query = new URLSearchParams({ apply: "1" });
    if (teamQuery != null && String(teamQuery).trim() !== "") {
      query.set("team_id", String(teamQuery));
    }
    router.push(
      `/user-dashboard/${orgIdParam}/my-leaves?${query.toString()}`,
    );
  }

  const [attModalOpen, setAttModalOpen] = useState(false);
  const [attEditRow, setAttEditRow] = useState<AttendanceQueryRow | null>(null);
  const [attCategory, setAttCategory] =
    useState<AttendanceQueryCategory>("forget_punch_in");
  const [attDate, setAttDate] = useState("");
  const [attMessage, setAttMessage] = useState("");
  const [attSubmitting, setAttSubmitting] = useState(false);
  const [attFormError, setAttFormError] = useState<string | null>(null);
  const [attFormSuccess, setAttFormSuccess] = useState<string | null>(null);
  const [mobileMainTab, setMobileMainTab] = useState<
    "team" | "leave" | "corrections"
  >("team");
  const [photoZoom, setPhotoZoom] = useState<{
    imageUrl: string;
    alt: string;
  } | null>(null);

  const openPhotoZoom = useCallback((imageUrl: string, alt: string) => {
    setPhotoZoom({ imageUrl, alt });
  }, []);

  const loadData = useCallback(
    async (force = false) => {
      if (!orgId || Number.isNaN(orgId)) {
        setLoading(false);
        setRefreshing(false);
        setTeamError("Invalid organization.");
        return;
      }

      const cached = readMyOrgTeamCache(orgId, selectedTeamId);
      if (cached && !force) {
        setTeam(cached.team);
        setNoTeam(cached.noTeam);
        setTeamError(null);
        setLoading(false);
        if (!shouldRefreshMyOrgTeamCache(orgId, selectedTeamId)) {
          return;
        }
        setRefreshing(true);
      } else {
        if (force) {
          clearMyOrgTeamCache(orgId, selectedTeamId);
        }
        if (force) setRefreshing(true);
        else setLoading(true);
        setTeamError(null);
      }

      const t = localStorage.getItem("token");
      if (!t) {
        setLoading(false);
        setRefreshing(false);
        setTeamError("Not signed in.");
        if (!cached) {
          setTeam(null);
          setNoTeam(false);
        }
        return;
      }
      setToken(t);

      try {
        const data = await fetchMyOrgTeam(t, orgId, selectedTeamId ?? undefined);
        setTeam(data);
        setNoTeam(false);
        writeMyOrgTeamCache(orgId, selectedTeamId, { team: data, noTeam: false });
      } catch (e) {
        const err = e as ApiError;
        if (err.status === 404) {
          setTeam(null);
          setNoTeam(true);
          writeMyOrgTeamCache(orgId, selectedTeamId, { team: null, noTeam: true });
        } else {
          if (!cached || force) {
            setTeam(null);
            setNoTeam(false);
          }
          setTeamError(err.message || "Could not load team.");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orgId, selectedTeamId],
  );

  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  const pendingLeaveCount = useMemo(
    () => leaveRows.filter((r) => String(r.status).toLowerCase() === "pending")
      .length,
    [leaveRows],
  );
  const pendingAttCount = useMemo(
    () =>
      attendanceRows.filter(
        (r) => String(r.query_status).toLowerCase() === "pending",
      ).length,
    [attendanceRows],
  );

  function openNewAttendanceModal() {
    setAttEditRow(null);
    setAttCategory("forget_punch_in");
    setAttDate("");
    setAttMessage("");
    setAttFormError(null);
    setAttFormSuccess(null);
    setAttModalOpen(true);
  }

  function openEditAttendanceModal(row: AttendanceQueryRow) {
    setAttEditRow(row);
    setAttCategory(row.category as AttendanceQueryCategory);
    const d = row.attendance_date;
    setAttDate(
      d && String(d).length >= 10 ? String(d).slice(0, 10) : String(d ?? ""),
    );
    setAttMessage(row.query_message ?? "");
    setAttFormError(null);
    setAttFormSuccess(null);
    setAttModalOpen(true);
  }

  async function onSubmitAttendance(e: React.FormEvent) {
    e.preventDefault();
    setAttFormError(null);
    setAttFormSuccess(null);
    const t = token ?? localStorage.getItem("token");
    if (!t) {
      setAttFormError("Not signed in.");
      return;
    }
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
      if (attEditRow) {
        const body: Parameters<typeof correctAttendanceQuery>[1] = {
          org_id: orgId,
          query_id: attEditRow.id,
        };
        if (attCategory !== attEditRow.category) body.category = attCategory;
        if (msg !== attEditRow.query_message) body.query_message = msg;
        const dNorm = attDate.slice(0, 10);
        const prev =
          attEditRow.attendance_date &&
          String(attEditRow.attendance_date).length >= 10
            ? String(attEditRow.attendance_date).slice(0, 10)
            : "";
        if (dNorm !== prev) body.attendance_date = dNorm;
        if (
          body.category === undefined &&
          body.query_message === undefined &&
          body.attendance_date === undefined
        ) {
          setAttFormError("No changes to save.");
          setAttSubmitting(false);
          return;
        }
        await correctAttendanceQuery(t, body);
        setAttFormSuccess("Request updated successfully.");
      } else {
        await raiseAttendanceQuery(t, {
          org_id: orgId,
          category: attCategory,
          query_message: msg,
          attendance_date: attDate.slice(0, 10),
        });
        setAttFormSuccess("Attendance query submitted.");
        setAttDate("");
        setAttMessage("");
        setAttCategory("forget_punch_in");
      }
      const refreshed = await fetchMyOrgTeam(t, orgId, selectedTeamId ?? undefined);
      setTeam(refreshed);
      setNoTeam(false);
      writeMyOrgTeamCache(orgId, selectedTeamId, { team: refreshed, noTeam: false });
    } catch (err) {
      setAttFormError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setAttSubmitting(false);
    }
  }

  const adminMember: OrgTeamMemberRow | undefined = team
    ? team.members.find((m) => Number(m.user_id) === Number(team.admin_id))
    : undefined;

  const myTeamMember = useMemo(() => {
    if (!team || !token) return undefined;
    const uid = jwtUserId(token);
    if (uid == null) return undefined;
    return team.members.find((m) => Number(m.user_id) === uid);
  }, [team, token]);

  const myProfileImage = memberImageUrl(myTeamMember?.user_image);

  const otherMembers =
    team?.members.filter((m) => Number(m.user_id) !== Number(team.admin_id)) ??
    [];

  const mobileTabs = [
    { id: "team" as const, label: "Team", count: team?.members.length },
    { id: "leave" as const, label: "Leave", count: leaveRows.length },
    { id: "corrections" as const, label: "Corrections", count: attendanceRows.length },
  ];

  return (
    <div className="min-h-full bg-[#F4F6F9] [font-family:var(--font-inter),system-ui,sans-serif]">
      {/* Mobile & tablet: Zoho People style */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-20 border-b border-[#DDE4EE] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
          <div className="flex items-center gap-2.5 px-3 py-2.5 sm:px-4 md:px-5">
            <Link
              href={`/user-dashboard/${orgIdParam}/home`}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#DDE4EE] text-[#5C6978] transition hover:bg-[#F8FAFC] hover:text-[#2B2B2B]"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            {myProfileImage && !loading ? (
              <button
                type="button"
                onClick={() =>
                  openPhotoZoom(myProfileImage, myTeamMember?.user_name ?? "You")
                }
                className="h-9 w-9 shrink-0 overflow-hidden rounded-full ring-2 ring-[#E8F4FC] active:opacity-90"
                aria-label="View your profile photo"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={myProfileImage}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </button>
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#E8F4FC] text-[#0088DD]">
                <Users className="h-4 w-4" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium text-[#0088DD]">
                Home / My Team
              </p>
              <h1 className="truncate text-[16px] font-semibold text-[#2B2B2B] sm:text-[17px]">
                My team
              </h1>
              <p className={`truncate ${mobileCaptionCls}`}>
                {loading
                  ? "Loading…"
                  : team
                    ? team.team_name
                    : noTeam
                      ? "No team assigned"
                      : "Team workspace"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadData(true)}
              disabled={loading || refreshing}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#DDE4EE] text-[#0088DD] transition hover:bg-[#F8FAFC] disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>

          {!loading ? (
            <div className="grid grid-cols-3 gap-2 px-3 pb-3 sm:px-4 md:grid-cols-3 md:gap-3 md:px-5">
              <div className="rounded-md border border-[#DDE4EE] border-l-[3px] border-l-[#2B2B2B] bg-white px-2.5 py-2 text-center shadow-sm sm:px-3 sm:py-2.5">
                <p className="truncate text-[10px] font-medium uppercase tracking-wide text-[#8A94A6]">
                  Members
                </p>
                <p className="text-lg font-semibold text-[#2B2B2B] sm:text-xl">
                  {team?.members.length ?? 0}
                </p>
              </div>
              <div className="rounded-md border border-[#DDE4EE] border-l-[3px] border-l-[#E37400] bg-white px-2.5 py-2 text-center shadow-sm sm:px-3 sm:py-2.5">
                <p className="truncate text-[10px] font-medium uppercase tracking-wide text-[#8A94A6]">
                  Leave
                </p>
                <p className="text-lg font-semibold text-[#E37400] sm:text-xl">
                  {pendingLeaveCount}
                </p>
              </div>
              <div className="rounded-md border border-[#DDE4EE] border-l-[3px] border-l-[#0088DD] bg-white px-2.5 py-2 text-center shadow-sm sm:px-3 sm:py-2.5">
                <p className="truncate text-[10px] font-medium uppercase tracking-wide text-[#8A94A6]">
                  Corrections
                </p>
                <p className="text-lg font-semibold text-[#0088DD] sm:text-xl">
                  {pendingAttCount}
                </p>
              </div>
            </div>
          ) : null}

          <div className="border-t border-[#DDE4EE] px-3 sm:px-4 md:px-5">
            <div className="flex w-full">
              {mobileTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMobileMainTab(tab.id)}
                  className={zohoUnderlineTabCls(mobileMainTab === tab.id)}
                >
                  {tab.label}
                  {"count" in tab && tab.count != null ? (
                    <span
                      className={`inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold ${
                        mobileMainTab === tab.id
                          ? "bg-[#E8F4FC] text-[#0088DD]"
                          : "bg-[#EEF2F6] text-[#5C6978]"
                      }`}
                    >
                      {tab.count > 99 ? "99+" : tab.count}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </div>

        {!loading && (pendingLeaveCount > 0 || pendingAttCount > 0) ? (
          <div className="mx-3 mt-3 flex flex-wrap gap-2 sm:mx-4 md:mx-5">
            {pendingLeaveCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-[#F9E4B2] bg-[#FEF7E0] px-2.5 py-1 text-[11px] font-semibold text-[#E37400]">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                {pendingLeaveCount} leave pending
              </span>
            ) : null}
            {pendingAttCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-[#B8DAF2] bg-[#E8F4FC] px-2.5 py-1 text-[11px] font-semibold text-[#0088DD]">
                <ClipboardList className="h-3.5 w-3.5" aria-hidden />
                {pendingAttCount} correction pending
              </span>
            ) : null}
          </div>
        ) : null}

        {teamError && !loading && !noTeam ? (
          <div className="mx-3 mt-3 rounded-md border border-[#F5C6C2] bg-[#FDECEA] px-3.5 py-3 text-[13px] text-[#C5221F] sm:mx-4 md:mx-5">
            <span>{teamError}</span>
          </div>
        ) : null}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-[#5C6978]">
            <span className="flex h-12 w-12 items-center justify-center rounded-md bg-[#E8F4FC]">
              <Loader2 className="h-6 w-6 animate-spin text-[#0088DD]" aria-hidden />
            </span>
            <p className="text-[14px] font-medium">Loading your team…</p>
          </div>
        ) : null}

        {!loading && mobileMainTab === "team" && noTeam ? (
          <div className="mx-3 mt-4 rounded-md border border-dashed border-[#DDE4EE] bg-white px-5 py-14 text-center sm:mx-4 md:mx-5">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-[#F4F6F9] text-[#8A94A6]">
              <Building2 className="h-6 w-6" aria-hidden />
            </span>
            <p className="mt-3 text-[16px] font-semibold text-[#2B2B2B]">No team yet</p>
            <p className={`mt-1.5 max-w-xs mx-auto ${mobileCaptionCls}`}>
              When HR adds you to a roster, it will appear here. You can still submit leave and
              corrections from other tabs.
            </p>
            <Link
              href={`/user-dashboard/${orgIdParam}/home`}
              className={`mt-5 ${mobileActionPrimaryBtnCls()}`}
            >
              Back to home
            </Link>
          </div>
        ) : null}

        {!loading && mobileMainTab === "team" && team ? (
          <div className={`${mobileSectionGap} px-3 pt-4 sm:px-4 md:px-5 ${mobileContentBottomPad}`}>
            <div className={mobileCardCls}>
              <div className={`${mobileCardInnerCls} border-b border-[#DDE4EE] bg-[#F8FAFC]`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#0088DD]">
                      Team overview
                    </p>
                    <p className={`mt-1 ${mobileValueCls} text-[17px]`}>{team.team_name}</p>
                  </div>
                  {team.is_admin ? (
                    <span className="shrink-0 rounded-md bg-[#0088DD] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Admin
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[#DDE4EE] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#5C6978]">
                      <Shield className="h-3 w-3" aria-hidden />
                      Member
                    </span>
                  )}
                </div>
                {team.team_info?.trim() ? (
                  <p className={`mt-2 ${mobileCaptionCls}`}>{team.team_info}</p>
                ) : (
                  <p className={`mt-2 ${mobileCaptionCls}`}>
                    Collaboration hub for your organization.
                  </p>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="rounded-md border border-[#DDE4EE] bg-white px-3 py-2.5">
                    <p className={mobileLabelCls}>Members</p>
                    <p className="mt-0.5 text-[15px] font-semibold text-[#2B2B2B]">
                      {team.members.length}
                    </p>
                  </div>
                  <div className="rounded-md border border-[#DDE4EE] bg-white px-3 py-2.5">
                    <p className={mobileLabelCls}>Created</p>
                    <p className="mt-0.5 text-[13px] font-semibold text-[#2B2B2B]">
                      {formatDate(team.created_at ?? null)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className={mobileCardCls}>
              <div className={mobileCardInnerCls}>
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#0088DD] text-white">
                    <UserRound className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-[#5C6978]">
                    Team lead
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-3 rounded-md border border-[#DDE4EE] bg-[#F8FAFC] p-3.5">
                  <MemberAvatarButton
                    name={team.admin_name ?? "Team lead"}
                    userImage={adminMember?.user_image}
                    size="md"
                    onZoom={openPhotoZoom}
                  />
                  <div className="min-w-0">
                    <p className={mobileValueCls}>{team.admin_name ?? "—"}</p>
                    <p className={`mt-0.5 flex items-center gap-1 ${mobileCaptionCls}`}>
                      <Calendar className="h-3 w-3 shrink-0" aria-hidden />
                      Joined {formatDate(adminMember?.joined_date ?? null)}
                    </p>
                    {adminMember?.user_email ? (
                      <p className={`mt-0.5 flex items-center gap-1 truncate ${mobileCaptionCls}`}>
                        <Mail className="h-3 w-3 shrink-0" aria-hidden />
                        {adminMember.user_email}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className={mobileCardCls}>
              <div className="border-b border-[#DDE4EE] px-4 py-3.5 sm:px-5">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#1B7F3B] text-white">
                    <Users className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <div>
                    <p className={mobileValueCls}>Roster</p>
                    <p className={mobileCaptionCls}>Tap a photo to enlarge</p>
                  </div>
                </div>
              </div>
              {otherMembers.length === 0 ? (
                <p className={`px-4 py-10 text-center ${mobileCaptionCls}`}>
                  No other members on this roster yet.
                </p>
              ) : (
                <ul className="divide-y divide-[#EEF2F6]">
                  {otherMembers.map((m) => (
                    <MobileMemberRow
                      key={m.team_member_id}
                      member={m}
                      onZoomPhoto={openPhotoZoom}
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}

        {!loading && mobileMainTab === "leave" ? (
          <div className={`pt-4 ${mobileContentBottomPad}`}>
            <div className="mx-3 mb-3 flex items-center gap-2.5 sm:mx-4 md:mx-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#E8F4FC] text-[#0088DD]">
                <CalendarDays className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className={mobileValueCls}>Leave requests</p>
                <p className={mobileCaptionCls}>For this team · {leaveRows.length} total</p>
              </div>
            </div>
            {leaveRows.length === 0 ? (
              <div className="mx-3 mt-2 rounded-md border border-dashed border-[#DDE4EE] bg-white px-5 py-14 text-center sm:mx-4 md:mx-5">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-[#F4F6F9] text-[#8A94A6]">
                  <CalendarDays className="h-6 w-6" aria-hidden />
                </span>
                <p className="mt-3 text-[16px] font-semibold text-[#2B2B2B]">No leave requests</p>
                <p className={`mt-1.5 max-w-xs mx-auto ${mobileCaptionCls}`}>
                  Leave raised for this team will appear here.
                </p>
              </div>
            ) : (
              <ul className="space-y-1">
                {leaveRows.map((row) => (
                  <MobileLeaveRow key={row.id} row={row} />
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {!loading && mobileMainTab === "corrections" ? (
          <div className={`pt-4 ${mobileContentBottomPad}`}>
            <div className="mx-3 mb-3 flex items-center gap-2.5 sm:mx-4 md:mx-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#E8F5E9] text-[#1B7F3B]">
                <ClipboardList className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className={mobileValueCls}>Attendance corrections</p>
                <p className={mobileCaptionCls}>For this team · {attendanceRows.length} total</p>
              </div>
            </div>
            {attendanceRows.length === 0 ? (
              <div className="mx-3 mt-2 rounded-md border border-dashed border-[#DDE4EE] bg-white px-5 py-14 text-center sm:mx-4 md:mx-5">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-[#F4F6F9] text-[#8A94A6]">
                  <ClipboardList className="h-6 w-6" aria-hidden />
                </span>
                <p className="mt-3 text-[16px] font-semibold text-[#2B2B2B]">No corrections yet</p>
                <p className={`mt-1.5 max-w-xs mx-auto ${mobileCaptionCls}`}>
                  Attendance queries raised for this team will appear here.
                </p>
              </div>
            ) : (
              <ul className="space-y-1">
                {attendanceRows.map((row) => (
                  <MobileAttendanceRow
                    key={row.id}
                    row={row}
                    onEdit={() => openEditAttendanceModal(row)}
                  />
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {!loading && !attModalOpen ? (
          <div className={mobileActionBarCls}>
            <div className="mx-auto flex max-w-lg gap-2">
              <button
                type="button"
                onClick={openLeaveApplication}
                className={mobileActionPrimaryBtnCls(true)}
              >
                <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
                Request time off
              </button>
              <button
                type="button"
                onClick={openNewAttendanceModal}
                className={mobileActionSecondaryBtnCls(true)}
              >
                <ClipboardList className="h-4 w-4 shrink-0" aria-hidden />
                Correction
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Desktop layout — Zoho People style */}
      <section className="hidden min-h-full lg:block lg:p-5 xl:p-6">
        <div className="mx-auto max-w-7xl space-y-4 xl:space-y-5">
          <div className={panelClass}>
            <div className="border-b border-[#DDE4EE] px-5 py-4 xl:px-6">
              <p className="text-[12px] font-medium text-[#0088DD]">Home / My Team</p>
              <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <Link
                    href={`/user-dashboard/${orgIdParam}/home`}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#DDE4EE] text-[#5C6978] transition hover:bg-[#F8FAFC] hover:text-[#2B2B2B]"
                    aria-label="Back to dashboard"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden />
                  </Link>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#E8F4FC] text-[#0088DD]">
                    <Users className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <h1 className="text-[20px] font-semibold text-[#2B2B2B]">My team</h1>
                    <p className="mt-0.5 text-[14px] text-[#5C6978]">
                      {loading
                        ? "Loading your roster and requests…"
                        : team
                          ? team.team_name
                          : noTeam
                            ? "No team assigned yet"
                            : "Roster, leave, and attendance requests"}
                    </p>
                    {!loading && team ? (
                      <p className={`mt-1 ${desktopCaptionCls}`}>
                        Roster, approvals, and attendance corrections in one place.
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void loadData(true)}
                    disabled={loading || refreshing}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-md border border-[#DDE4EE] bg-white px-3.5 py-2 text-[13px] font-medium text-[#2B2B2B] shadow-sm transition hover:bg-[#F8FAFC] disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                      aria-hidden
                    />
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={openLeaveApplication}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-md bg-[#0088DD] px-3.5 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#0070B8]"
                  >
                    <CalendarDays className="h-4 w-4" aria-hidden />
                    Request time off
                  </button>
                  <button
                    type="button"
                    onClick={openNewAttendanceModal}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-md border border-[#DDE4EE] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#2B2B2B] shadow-sm transition hover:bg-[#F8FAFC]"
                  >
                    <ClipboardList className="h-4 w-4" aria-hidden />
                    Correction
                  </button>
                </div>
              </div>

              {!loading ? (
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:gap-3">
                  {[
                    {
                      label: "Members",
                      value: team?.members.length ?? 0,
                      color: "text-[#2B2B2B]",
                      border: "border-l-[#2B2B2B]",
                      icon: Users,
                    },
                    {
                      label: "Leave pending",
                      value: pendingLeaveCount,
                      color: "text-[#E37400]",
                      border: "border-l-[#E37400]",
                      icon: CalendarDays,
                    },
                    {
                      label: "Corrections pending",
                      value: pendingAttCount,
                      color: "text-[#0088DD]",
                      border: "border-l-[#0088DD]",
                      icon: ClipboardList,
                    },
                    {
                      label: "Total requests",
                      value: leaveRows.length + attendanceRows.length,
                      color: "text-[#1B7F3B]",
                      border: "border-l-[#1B7F3B]",
                      icon: Calendar,
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className={`rounded-md border border-[#DDE4EE] border-l-[3px] bg-white px-3 py-2.5 shadow-sm ${item.border}`}
                      >
                        <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[#8A94A6]">
                          <Icon className="h-3.5 w-3.5" aria-hidden />
                          {item.label}
                        </p>
                        <p className={`mt-1 text-xl font-semibold ${item.color}`}>
                          {item.value}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>

          {loading ? (
            <div className={`flex min-h-[40vh] flex-col items-center justify-center gap-3 ${panelClass} p-14`}>
              <span className="flex h-14 w-14 items-center justify-center rounded-md bg-[#E8F4FC]">
                <Loader2 className="h-7 w-7 animate-spin text-[#0088DD]" aria-hidden />
              </span>
              <div className="text-center">
                <p className={desktopValueCls}>Preparing your workspace</p>
                <p className={`mt-1 ${desktopCaptionCls}`}>
                  Fetching team roster and your recent requests.
                </p>
              </div>
            </div>
          ) : null}

          {!loading && teamError && !noTeam ? (
            <div className="rounded-md border border-[#F5C6C2] bg-[#FDECEA] px-4 py-3 text-[13px] text-[#C5221F]">
              <p className="font-semibold">Something went wrong</p>
              <p className="mt-1">{teamError}</p>
            </div>
          ) : null}

          {!loading && noTeam ? (
            <div className="grid items-start gap-4 lg:grid-cols-1 xl:grid-cols-[1fr_minmax(380px,420px)]">
              <section className={`${panelClass} flex flex-col items-center px-8 py-14 text-center`}>
                <span className="flex h-16 w-16 items-center justify-center rounded-md bg-[#F4F6F9] text-[#8A94A6]">
                  <Building2 className="h-8 w-8" aria-hidden />
                </span>
                <h2 className="mt-5 text-[18px] font-semibold text-[#2B2B2B]">
                  You&apos;re not on a team yet
                </h2>
                <p className={`mx-auto mt-2 max-w-md ${desktopCaptionCls}`}>
                  When HR or your manager adds you to a roster, it will show up here. You can
                  still submit and track leave and attendance corrections from the panel on the
                  right.
                </p>
                <Link
                  href={`/user-dashboard/${orgIdParam}/home`}
                  className="mt-6 inline-flex min-h-[40px] items-center rounded-md bg-[#0088DD] px-5 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#0070B8]"
                >
                  Back to dashboard
                </Link>
              </section>
              <ActivityColumn
                leaveRows={leaveRows}
                attendanceRows={attendanceRows}
                onEditAttendance={openEditAttendanceModal}
              />
            </div>
          ) : null}

          {!loading && team ? (
            <div className="grid items-start gap-4 lg:grid-cols-1 xl:grid-cols-[1fr_minmax(380px,420px)]">
              <div className="min-w-0 space-y-4">
                <section className={panelClass}>
                  <div className="border-b border-[#DDE4EE] bg-[#F8FAFC] px-5 py-5 xl:px-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#0088DD]">
                          Team overview
                        </p>
                        <h2 className="mt-1 text-[22px] font-semibold text-[#2B2B2B]">
                          {team.team_name}
                        </h2>
                        {team.team_info?.trim() ? (
                          <p className={`mt-2 max-w-2xl ${desktopCaptionCls}`}>
                            {team.team_info}
                          </p>
                        ) : (
                          <p className={`mt-2 ${desktopCaptionCls}`}>
                            Collaboration hub for this organization.
                          </p>
                        )}
                      </div>
                      {team.is_admin ? (
                        <span className="shrink-0 rounded-md bg-[#0088DD] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                          Team admin
                        </span>
                      ) : (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[#DDE4EE] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#5C6978]">
                          <Shield className="h-3 w-3" aria-hidden />
                          Member
                        </span>
                      )}
                    </div>

                    <dl className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      {[
                        {
                          label: "Created",
                          value: formatDate(team.created_at ?? null),
                          icon: Calendar,
                          soft: "bg-[#E8F4FC] text-[#0088DD]",
                        },
                        {
                          label: "Created by",
                          value: team.created_by_name ?? "—",
                          icon: UserRound,
                          soft: "bg-[#F3E8FD] text-[#7B1FA2]",
                        },
                        {
                          label: "Members",
                          value: `${team.members.length} active`,
                          icon: Users,
                          soft: "bg-[#E8F5E9] text-[#1B7F3B]",
                        },
                        {
                          label: "Last updated",
                          value: formatDate(team.updated_at ?? null),
                          icon: RefreshCw,
                          soft: "bg-[#F4F6F9] text-[#5C6978]",
                        },
                      ].map((stat) => {
                        const Icon = stat.icon;
                        return (
                          <div
                            key={stat.label}
                            className="flex gap-3 rounded-md border border-[#DDE4EE] bg-white px-3 py-2.5"
                          >
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${stat.soft}`}
                            >
                              <Icon className="h-4 w-4" aria-hidden />
                            </span>
                            <div className="min-w-0">
                              <dt className={desktopLabelCls}>{stat.label}</dt>
                              <dd className={`mt-0.5 truncate ${desktopValueCls}`}>
                                {stat.value}
                              </dd>
                            </div>
                          </div>
                        );
                      })}
                    </dl>
                  </div>

                  <div className="px-5 py-5 xl:px-6">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#0088DD] text-white">
                        <UserRound className="h-3.5 w-3.5" aria-hidden />
                      </span>
                      <p className="text-[12px] font-semibold uppercase tracking-wide text-[#5C6978]">
                        Team lead
                      </p>
                    </div>
                    <div className="mt-3 flex items-center gap-4 rounded-md border border-[#DDE4EE] bg-[#F8FAFC] p-4">
                      <MemberAvatarButton
                        name={team.admin_name ?? "Team lead"}
                        userImage={adminMember?.user_image}
                        size="md"
                        onZoom={openPhotoZoom}
                      />
                      <div className="min-w-0">
                        <p className={desktopValueCls}>{team.admin_name ?? "—"}</p>
                        <p className={`mt-1 flex items-center gap-1 ${desktopCaptionCls}`}>
                          <Calendar className="h-3.5 w-3.5 shrink-0 text-[#8A94A6]" aria-hidden />
                          Joined {formatDate(adminMember?.joined_date ?? null)}
                          {adminMember?.added_by_name
                            ? ` · Added by ${adminMember.added_by_name}`
                            : ""}
                        </p>
                        {adminMember?.user_email ? (
                          <p className={`mt-0.5 flex items-center gap-1 truncate ${desktopCaptionCls}`}>
                            <Mail className="h-3.5 w-3.5 shrink-0 text-[#8A94A6]" aria-hidden />
                            {adminMember.user_email}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#1B7F3B] text-white">
                          <Users className="h-3.5 w-3.5" aria-hidden />
                        </span>
                        <div>
                          <h3 className={desktopValueCls}>Roster</h3>
                          <p className={desktopCaptionCls}>
                            Everyone on your team except the lead.
                          </p>
                        </div>
                      </div>

                      {/* Card list for narrower desktop widths */}
                      <div className="mt-3 space-y-2 xl:hidden">
                        {otherMembers.length === 0 ? (
                          <p className={`rounded-md border border-dashed border-[#DDE4EE] px-4 py-10 text-center ${desktopCaptionCls}`}>
                            No other members on this roster yet.
                          </p>
                        ) : (
                          otherMembers.map((m) => (
                            <div
                              key={m.team_member_id}
                              className="flex items-start gap-3 rounded-md border border-[#DDE4EE] bg-white p-3.5 shadow-sm"
                            >
                              <MemberAvatarButton
                                name={m.user_name}
                                userImage={m.user_image}
                                size="sm"
                                onZoom={openPhotoZoom}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-[#2B2B2B]">{m.user_name}</p>
                                <p className={`mt-1 flex items-center gap-1 break-all ${desktopCaptionCls}`}>
                                  <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                  {m.user_email}
                                </p>
                                <p className={`mt-1 ${desktopCaptionCls}`}>
                                  Joined {formatDate(m.joined_date)}
                                  {m.added_by_name ? ` · Added by ${m.added_by_name}` : ""}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="mt-3 hidden overflow-hidden rounded-md border border-[#DDE4EE] xl:block">
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-[13px]">
                            <thead>
                              <tr className="border-b border-[#DDE4EE] bg-[#F8FAFC] text-left">
                                <th className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#8A94A6]">
                                  Member
                                </th>
                                <th className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#8A94A6]">
                                  Contact
                                </th>
                                <th className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#8A94A6]">
                                  Joined
                                </th>
                                <th className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#8A94A6]">
                                  Added by
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#EEF2F6] bg-white">
                              {otherMembers.length === 0 ? (
                                <tr>
                                  <td
                                    colSpan={4}
                                    className={`px-4 py-12 text-center ${desktopCaptionCls}`}
                                  >
                                    No other members on this roster yet.
                                  </td>
                                </tr>
                              ) : (
                                otherMembers.map((m) => (
                                  <tr
                                    key={m.team_member_id}
                                    className="transition hover:bg-[#F8FAFC]"
                                  >
                                    <td className="px-4 py-3.5">
                                      <div className="flex items-center gap-3">
                                        <MemberAvatarButton
                                          name={m.user_name}
                                          userImage={m.user_image}
                                          size="sm"
                                          onZoom={openPhotoZoom}
                                        />
                                        <span className="font-semibold text-[#2B2B2B]">
                                          {m.user_name}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3.5">
                                      <div className="flex items-center gap-1.5 text-[#2B2B2B]">
                                        <Mail className="h-3.5 w-3.5 shrink-0 text-[#8A94A6]" aria-hidden />
                                        <span className="break-all">{m.user_email}</span>
                                      </div>
                                      {m.user_phone ? (
                                        <p className={`mt-1 pl-5 ${desktopCaptionCls}`}>
                                          {m.user_phone}
                                        </p>
                                      ) : null}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3.5 text-[#5C6978]">
                                      {formatDate(m.joined_date)}
                                    </td>
                                    <td className="px-4 py-3.5 text-[#5C6978]">
                                      {m.added_by_name ?? "—"}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <ActivityColumn
                leaveRows={leaveRows}
                attendanceRows={attendanceRows}
                onEditAttendance={openEditAttendanceModal}
              />
            </div>
          ) : null}
        </div>
      </section>

      <ProfilePhotoZoomModal
        open={photoZoom != null}
        imageUrl={photoZoom?.imageUrl ?? ""}
        alt={photoZoom?.alt ?? ""}
        onClose={() => setPhotoZoom(null)}
      />

      {/* Attendance modal */}
      {attModalOpen ? (
        <ModalScrim
          onClose={() => {
            setAttModalOpen(false);
            setAttEditRow(null);
          }}
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-xl bg-white shadow-[0_24px_80px_-12px_rgba(16,24,40,0.28)] ring-1 ring-[#DDE4EE] lg:rounded-md lg:border-t-[3px] lg:border-t-[#0088DD]">
            <div className="flex justify-center pt-2.5 pb-0 lg:hidden" aria-hidden>
              <span className="h-1 w-10 rounded-full bg-[#DDE4EE]" />
            </div>
            <div className="sticky top-0 z-[1] flex items-center justify-between border-b border-[#DDE4EE] bg-white px-4 py-4 lg:px-6">
              <div>
                <h2 className="text-lg font-semibold text-[#2B2B2B]">
                  {attEditRow
                    ? "Edit attendance request"
                    : "Attendance correction"}
                </h2>
                <p className="text-xs text-[#5C6978]">
                  {attEditRow
                    ? "Only pending requests can be updated."
                    : "Report missed punch or timing issues for a specific day."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAttModalOpen(false);
                  setAttEditRow(null);
                }}
                className="rounded-md p-2 text-[#8A94A6] hover:bg-[#F8FAFC] hover:text-[#2B2B2B]"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={onSubmitAttendance} className="space-y-4 p-4 lg:p-6">
              {attFormError ? (
                <p className="rounded-md border border-[#F5C6C2] bg-[#FDECEA] p-3 text-[14px] text-[#C5221F]">
                  {attFormError}
                </p>
              ) : null}
              {attFormSuccess ? (
                <p className="rounded-md border border-[#B7DFC3] bg-[#E8F5E9] p-3 text-[14px] text-[#1B7F3B]">
                  {attFormSuccess}
                </p>
              ) : null}
              <label className="block">
                <span className="text-[13px] font-medium text-[#2B2B2B]">
                  Issue type
                </span>
                <select
                  value={attCategory}
                  onChange={(e) =>
                    setAttCategory(e.target.value as AttendanceQueryCategory)
                  }
                  className={zohoInputCls()}
                >
                  <option value="forget_punch_in">Forgot punch in</option>
                  <option value="forget_punch_out">Forgot punch out</option>
                  <option value="late_punch_in">Late punch in</option>
                </select>
              </label>
              <label className="block">
                <span className="text-[13px] font-medium text-[#2B2B2B]">
                  Attendance date
                </span>
                <input
                  type="date"
                  required
                  value={attDate}
                  onChange={(e) => setAttDate(e.target.value)}
                  className={zohoInputCls()}
                />
              </label>
              <label className="block">
                <span className="text-[13px] font-medium text-[#2B2B2B]">
                  Explanation
                </span>
                <textarea
                  value={attMessage}
                  onChange={(e) => setAttMessage(e.target.value)}
                  rows={4}
                  required
                  placeholder="What happened? Include times if relevant."
                  className={zohoInputCls()}
                />
              </label>
              <div className="flex flex-col-reverse gap-2 border-t border-[#DDE4EE] pt-4 lg:flex-row lg:gap-3 lg:border-0 lg:pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAttModalOpen(false);
                    setAttEditRow(null);
                  }}
                  className={zohoSecondaryBtnCls(true)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={attSubmitting}
                  className={zohoPrimaryBtnCls(true)}
                >
                  {attSubmitting
                    ? "Saving…"
                    : attEditRow
                      ? "Save changes"
                      : "Submit request"}
                </button>
              </div>
            </form>
          </div>
        </ModalScrim>
      ) : null}
    </div>
  );
}

function ModalScrim({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#2B2B2B]/40 p-0 backdrop-blur-[2px] lg:items-center lg:p-4 lg:backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg">{children}</div>
    </div>
  );
}

function ActivityColumn({
  leaveRows,
  attendanceRows,
  onEditAttendance,
}: {
  leaveRows: LeaveQueryRow[];
  attendanceRows: AttendanceQueryRow[];
  onEditAttendance: (row: AttendanceQueryRow) => void;
}) {
  return (
    <aside className="grid min-w-0 gap-4 lg:grid-cols-2 xl:sticky xl:top-6 xl:grid-cols-1 xl:self-start">
      <div className={panelClass}>
        <div className="flex items-start gap-3 border-b border-[#DDE4EE] bg-[#F8FAFC] px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#E8F4FC] text-[#0088DD]">
            <CalendarDays className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className={desktopValueCls}>Leave requests</h2>
            <p className={`mt-0.5 ${desktopCaptionCls}`}>
              For this team · {leaveRows.length} total
            </p>
          </div>
        </div>
        <div className="max-h-[min(48vh,400px)] overflow-y-auto p-4">
          {leaveRows.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-md bg-[#F4F6F9] text-[#8A94A6]">
                <CalendarDays className="h-6 w-6" aria-hidden />
              </span>
              <p className={`mt-3 ${desktopValueCls}`}>No leave requests yet</p>
              <p className={`mt-1 max-w-[220px] ${desktopCaptionCls}`}>
                Leave raised for this team will appear here.
              </p>
            </div>
          ) : null}
          <ul className="space-y-2.5">
            {leaveRows.map((row) => {
              const tone = leaveStatusTone(row.status);
              return (
                <li
                  key={row.id}
                  className={`rounded-md border border-[#DDE4EE] bg-white p-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${accentBar[tone]}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${toneChip[tone]}`}
                    >
                      {row.status}
                    </span>
                    <time
                      className="text-[10px] tabular-nums text-[#8A94A6]"
                      dateTime={row.created_at ?? undefined}
                    >
                      {formatDate(row.created_at)}
                    </time>
                  </div>
                  <p className="mt-2 text-[14px] font-semibold capitalize text-[#2B2B2B]">
                    {row.leave_type.replace(/_/g, " ")}
                  </p>
                  <p className={`mt-1 flex items-center gap-1 ${desktopCaptionCls}`}>
                    <CalendarDays className="h-3 w-3 shrink-0 text-[#0088DD]" aria-hidden />
                    {formatDate(row.start_date)}
                    {row.end_date ? ` → ${formatDate(row.end_date)}` : ""}
                  </p>
                  {row.reason ? (
                    <p className={`mt-2 line-clamp-3 rounded-md bg-[#F8FAFC] px-2.5 py-2 ${desktopCaptionCls}`}>
                      {row.reason}
                    </p>
                  ) : null}
                  {row.approved_by_name ? (
                    <p className={`mt-2 ${desktopCaptionCls}`}>
                      Reviewer: {row.approved_by_name}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className={panelClass}>
        <div className="flex items-start gap-3 border-b border-[#DDE4EE] bg-[#F8FAFC] px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#E8F5E9] text-[#1B7F3B]">
            <ClipboardList className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className={desktopValueCls}>Attendance corrections</h2>
            <p className={`mt-0.5 ${desktopCaptionCls}`}>
              For this team · {attendanceRows.length} total
            </p>
          </div>
        </div>
        <div className="max-h-[min(48vh,400px)] overflow-y-auto p-4">
          {attendanceRows.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-md bg-[#F4F6F9] text-[#8A94A6]">
                <ClipboardList className="h-6 w-6" aria-hidden />
              </span>
              <p className={`mt-3 ${desktopValueCls}`}>No corrections yet</p>
              <p className={`mt-1 max-w-[240px] ${desktopCaptionCls}`}>
                Attendance queries raised for this team will appear here.
              </p>
            </div>
          ) : null}
          <ul className="space-y-2.5">
            {attendanceRows.map((row) => {
              const tone = attendanceStatusTone(row.query_status);
              const pending =
                String(row.query_status).toLowerCase() === "pending";
              return (
                <li
                  key={row.id}
                  className={`rounded-md border border-[#DDE4EE] bg-white p-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${accentBar[tone]}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${toneChip[tone]}`}
                    >
                      {row.query_status}
                    </span>
                    {pending ? (
                      <button
                        type="button"
                        onClick={() => onEditAttendance(row)}
                        className="inline-flex items-center gap-1 rounded-md border border-[#DDE4EE] bg-[#F8FAFC] px-2.5 py-1 text-[11px] font-semibold text-[#0088DD] transition hover:border-[#0088DD]/30 hover:bg-[#E8F4FC]"
                      >
                        <Pencil className="h-3 w-3" aria-hidden />
                        Edit
                      </button>
                    ) : null}
                  </div>
                  <p className={`mt-2 ${desktopValueCls}`}>
                    {attendanceCategoryLabel(row.category)}
                  </p>
                  <p className={`mt-1 flex items-center gap-1 ${desktopCaptionCls}`}>
                    <Calendar className="h-3 w-3 shrink-0 text-[#0088DD]" aria-hidden />
                    {formatDate(row.attendance_date)}
                  </p>
                  <p className={`mt-2 line-clamp-3 rounded-md bg-[#F8FAFC] px-2.5 py-2 ${desktopCaptionCls}`}>
                    {row.query_message}
                  </p>
                  {row.admin_response ? (
                    <div className="mt-2 rounded-md border border-[#DDE4EE] bg-[#F4F6F9] px-2.5 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8A94A6]">
                        Response
                      </p>
                      <p className={`mt-0.5 ${desktopCaptionCls}`}>{row.admin_response}</p>
                      {row.approved_by_name ? (
                        <p className={`mt-1 ${desktopCaptionCls}`}>
                          {row.approved_by_name}
                          {row.resolved_at
                            ? ` · ${formatDateTime(row.resolved_at)}`
                            : ""}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  <p className="mt-2 text-[10px] tabular-nums text-[#8A94A6]">
                    Submitted {formatDateTime(row.created_at)}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </aside>
  );
}
