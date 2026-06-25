"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
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
import { applyForLeave, type LeaveQueryRow } from "@/services/employeeLeaves";
import AssignedLeaveTypeSelect from "@/components/portal-dashboard/user-layout/AssignedLeaveTypeSelect";
import { useAssignedLeaveTypes } from "@/hooks/useAssignedLeaveTypes";
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
  emerald: "bg-[#E6F4EA] text-[#0F9D58]",
  rose: "bg-[#FCE8E6] text-[#D93025]",
  amber: "bg-[#FFF8E1] text-[#F9A825]",
};

const accentBar: Record<"emerald" | "rose" | "amber", string> = {
  emerald: "border-l-4 border-l-[#0F9D58]",
  rose: "border-l-4 border-l-[#D93025]",
  amber: "border-l-4 border-l-[#F9A825]",
};

const panelClass =
  "overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-sm";

const desktopLabelCls =
  "text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]";
const desktopCaptionCls = "text-[12px] leading-snug text-[#6B7280]";
const desktopValueCls = "text-[14px] font-semibold text-[#1F2937]";

function zohoPrimaryBtnCls(full = false) {
  return `inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg bg-[#008CD3] px-4 py-2.5 text-[14px] font-medium text-white transition active:scale-[0.98] hover:bg-[#0070AA] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full flex-1" : ""}`;
}

function zohoSecondaryBtnCls(full = false) {
  return `inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[#E4E7EC] bg-white px-4 py-2.5 text-[14px] font-medium text-[#1F2937] transition active:scale-[0.98] hover:bg-[#F5F7FA] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full flex-1" : ""}`;
}

/** Sits above the layout bottom tab bar (z-[55]) on mobile/tablet. */
const mobileActionBarCls =
  "fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-[54] border-t border-[#E4E7EC] bg-white/95 px-3 py-3 shadow-[0_-6px_20px_rgba(0,0,0,0.08)] backdrop-blur-sm";
const mobileContentBottomPad = "pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))]";
const mobileCardCls =
  "overflow-hidden rounded-xl border border-[#E4E7EC] bg-white shadow-sm";
const mobileCardInnerCls = "p-3.5 sm:p-4";
const mobileSectionGap = "space-y-3";
const mobileLabelCls =
  "text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]";
const mobileCaptionCls = "text-[11px] leading-snug text-[#6B7280]";
const mobileValueCls = "text-[13px] font-semibold text-[#1F2937]";

function mobileActionPrimaryBtnCls(full = false) {
  return `inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-[#008CD3] px-3 py-2 text-[13px] font-semibold text-white shadow-sm transition active:scale-[0.98] hover:bg-[#0070AA] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full flex-1" : ""}`;
}

function mobileActionSecondaryBtnCls(full = false) {
  return `inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-[#E4E7EC] bg-white px-3 py-2 text-[13px] font-semibold text-[#1F2937] transition active:scale-[0.98] hover:bg-[#F5F7FA] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full flex-1" : ""}`;
}

function zohoInputCls() {
  return "mt-1 w-full rounded-md border border-[#E4E7EC] bg-white px-3 py-2 text-[14px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15 lg:mt-1.5 lg:rounded-lg lg:px-3.5 lg:py-2.5 lg:text-[15px] lg:text-sm";
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
  if (tone === "emerald") return "bg-[#E6F4EA] text-[#0F9D58]";
  if (tone === "rose") return "bg-[#FCE8E6] text-[#D93025]";
  return "bg-[#FFF8E1] text-[#F9A825]";
}

const MOBILE_ICON_COLORS = [
  "bg-[#E8F4FB] text-[#008CD3]",
  "bg-[#E6F4EA] text-[#0F9D58]",
  "bg-[#FEF3E6] text-[#E8710A]",
  "bg-[#F3E8FD] text-[#7B1FA2]",
  "bg-[#FCE8E6] text-[#D93025]",
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
      <div className="flex items-center gap-3 px-3 py-3.5 active:bg-[#F9FAFB] sm:px-4">
        <MemberAvatarButton
          name={member.user_name}
          userImage={member.user_image}
          size="md"
          onZoom={onZoomPhoto}
        />
        <div className="min-w-0 flex-1">
          <p className={`truncate ${mobileValueCls}`}>{member.user_name}</p>
          {member.user_email ? (
            <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-[#6B7280]">
              <Mail className="h-3 w-3 shrink-0 text-[#9CA3AF]" aria-hidden />
              {member.user_email}
            </p>
          ) : null}
          <p className={`mt-1 flex items-center gap-1 ${mobileCaptionCls}`}>
            <Calendar className="h-3 w-3 shrink-0 text-[#9CA3AF]" aria-hidden />
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
      ? "border-l-[#0F9D58]"
      : tone === "rose"
        ? "border-l-[#D93025]"
        : "border-l-[#F9A825]";
  return (
    <li className="px-3 py-2 sm:px-4">
      <div
        className={`rounded-xl border border-[#E4E7EC] border-l-4 bg-white p-3.5 shadow-sm ${accentBorder}`}
      >
        <div className="flex items-start justify-between gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${mobileStatusCls(tone)}`}
          >
            {row.status}
          </span>
          <time
            className="text-[10px] tabular-nums text-[#9CA3AF]"
            dateTime={row.created_at ?? undefined}
          >
            {formatDate(row.created_at)}
          </time>
        </div>
        <p className="mt-2 text-[14px] font-semibold capitalize text-[#1F2937]">
          {row.leave_type.replace(/_/g, " ")}
        </p>
        <p className={`mt-1 flex items-center gap-1 ${mobileCaptionCls}`}>
          <CalendarDays className="h-3 w-3 shrink-0 text-[#008CD3]" aria-hidden />
          {formatDate(row.start_date)}
          {row.end_date ? ` → ${formatDate(row.end_date)}` : ""}
        </p>
        {row.reason ? (
          <p className={`mt-2 line-clamp-2 rounded-lg bg-[#F9FAFB] px-2.5 py-2 ${mobileCaptionCls}`}>
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
      ? "border-l-[#0F9D58]"
      : tone === "rose"
        ? "border-l-[#D93025]"
        : "border-l-[#F9A825]";
  return (
    <li className="px-3 py-2 sm:px-4">
      <div
        className={`rounded-xl border border-[#E4E7EC] border-l-4 bg-white p-3.5 shadow-sm ${accentBorder}`}
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
              className="inline-flex items-center gap-1 rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] px-2 py-1 text-[11px] font-semibold text-[#008CD3] transition active:bg-[#E8F4FB]"
            >
              <Pencil className="h-3 w-3" aria-hidden />
              Edit
            </button>
          ) : null}
        </div>
        <p className={`mt-2 ${mobileValueCls}`}>{attendanceCategoryLabel(row.category)}</p>
        <p className={`mt-1 flex items-center gap-1 ${mobileCaptionCls}`}>
          <Calendar className="h-3 w-3 shrink-0 text-[#008CD3]" aria-hidden />
          {formatDate(row.attendance_date)}
        </p>
        <p className={`mt-2 line-clamp-3 rounded-lg bg-[#F9FAFB] px-2.5 py-2 ${mobileCaptionCls}`}>
          {row.query_message}
        </p>
        {row.admin_response ? (
          <div className="mt-2 rounded-lg border border-[#E4E7EC] bg-[#F5F7FA] px-2.5 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
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
        <div className="flex min-h-[50vh] items-center justify-center text-[#6B7280]">
          <Loader2 className="h-8 w-8 animate-spin text-[#008CD3]" />
        </div>
      }
    >
      <UserMyTeamPageContent />
    </Suspense>
  );
}

function UserMyTeamPageContent() {
  const params = useParams();
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

  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const {
    options: assignedLeaveOptions,
    selectedLeaveTypeId,
    setSelectedLeaveTypeId,
    loading: assignedLeavesLoading,
    error: assignedLeavesError,
  } = useAssignedLeaveTypes(orgId, leaveModalOpen);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveFormError, setLeaveFormError] = useState<string | null>(null);
  const [leaveFormSuccess, setLeaveFormSuccess] = useState<string | null>(null);

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

  async function onSubmitLeave(e: React.FormEvent) {
    e.preventDefault();
    setLeaveFormError(null);
    setLeaveFormSuccess(null);
    const t = token ?? localStorage.getItem("token");
    if (!t) {
      setLeaveFormError("Not signed in.");
      return;
    }
    if (!startDate) {
      setLeaveFormError("Start date is required.");
      return;
    }
    if (!selectedLeaveTypeId) {
      setLeaveFormError("Select an assigned leave type.");
      return;
    }
    setLeaveSubmitting(true);
    try {
      await applyForLeave(t, {
        org_id: orgId,
        leave_type_id: selectedLeaveTypeId,
        start_date: startDate,
        end_date: endDate || null,
        reason: reason.trim() || null,
        team_id: team?.team_id ?? null,
      });
      setLeaveFormSuccess("Leave request submitted successfully.");
      setStartDate("");
      setEndDate("");
      setReason("");
      const refreshed = await fetchMyOrgTeam(t, orgId, selectedTeamId ?? undefined);
      setTeam(refreshed);
      setNoTeam(false);
      writeMyOrgTeamCache(orgId, selectedTeamId, { team: refreshed, noTeam: false });
    } catch (err) {
      setLeaveFormError(
        err instanceof Error ? err.message : "Could not submit leave request.",
      );
    } finally {
      setLeaveSubmitting(false);
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
    <div className="min-h-full bg-[#F5F7FA]">
      {/* Mobile & tablet: Zoho attendance portal style */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-20 border-b border-[#E4E7EC] bg-white shadow-sm">
          <div className="h-[3px] bg-[#008CD3]" aria-hidden />

          <div className="flex items-center gap-2.5 px-3 py-2.5 sm:px-4">
            <Link
              href={`/user-dashboard/${orgIdParam}/home`}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#6B7280] transition active:bg-[#F5F7FA]"
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
                className="h-9 w-9 shrink-0 overflow-hidden rounded-full ring-2 ring-[#E8F4FB] active:opacity-90"
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
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
                <Users className="h-4 w-4" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[15px] font-semibold text-[#1F2937] sm:text-[16px]">
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
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#008CD3] transition active:bg-[#F5F7FA] disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>

          {!loading ? (
            <div className="grid grid-cols-3 gap-2 px-3 pb-2 sm:px-4">
              <div className="rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] px-2 py-1.5 text-center sm:px-2.5 sm:py-2">
                <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-[#9CA3AF] sm:text-[10px]">
                  Members
                </p>
                <p className="text-base font-semibold text-[#1F2937] sm:text-lg">
                  {team?.members.length ?? 0}
                </p>
              </div>
              <div className="rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] px-2 py-1.5 text-center sm:px-2.5 sm:py-2">
                <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-[#9CA3AF] sm:text-[10px]">
                  Leave
                </p>
                <p className="text-base font-semibold text-[#008CD3] sm:text-lg">
                  {pendingLeaveCount}
                </p>
              </div>
              <div className="rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] px-2 py-1.5 text-center sm:px-2.5 sm:py-2">
                <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-[#9CA3AF] sm:text-[10px]">
                  Corrections
                </p>
                <p className="text-base font-semibold text-[#0F9D58] sm:text-lg">
                  {pendingAttCount}
                </p>
              </div>
            </div>
          ) : null}

          <div className="px-3 pb-2.5 sm:px-4">
            <div className="flex w-full rounded-lg bg-[#F5F7FA] p-0.5">
              {mobileTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMobileMainTab(tab.id)}
                  className={`flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md px-1.5 py-2 text-[12px] font-semibold transition active:scale-[0.98] sm:text-[13px] ${
                    mobileMainTab === tab.id
                      ? "bg-white text-[#008CD3] shadow-sm"
                      : "text-[#6B7280]"
                  }`}
                >
                  {tab.label}
                  {"count" in tab && tab.count != null ? (
                    <span
                      className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[10px] ${
                        mobileMainTab === tab.id
                          ? "bg-[#E8F4FB] text-[#008CD3]"
                          : "bg-[#E4E7EC] text-[#6B7280]"
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
          <div className="mx-3 mt-2 flex flex-wrap gap-1.5 sm:mx-4">
            {pendingLeaveCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF8E1] px-2.5 py-1 text-[11px] font-semibold text-[#F9A825]">
                <CalendarDays className="h-3 w-3" aria-hidden />
                {pendingLeaveCount} leave pending
              </span>
            ) : null}
            {pendingAttCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F4FB] px-2.5 py-1 text-[11px] font-semibold text-[#008CD3]">
                <ClipboardList className="h-3 w-3" aria-hidden />
                {pendingAttCount} correction pending
              </span>
            ) : null}
          </div>
        ) : null}

        {teamError && !loading && !noTeam ? (
          <div className="mx-3 mt-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2.5 text-[12px] text-[#D93025] sm:mx-4">
            <span>{teamError}</span>
          </div>
        ) : null}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-[#6B7280]">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8F4FB]">
              <Loader2 className="h-6 w-6 animate-spin text-[#008CD3]" aria-hidden />
            </span>
            <p className="text-[13px] font-medium">Loading your team…</p>
          </div>
        ) : null}

        {!loading && mobileMainTab === "team" && noTeam ? (
          <div className="mx-3 mt-3 rounded-xl border border-dashed border-[#E4E7EC] bg-white px-4 py-14 text-center sm:mx-4">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5F7FA] text-[#9CA3AF]">
              <Building2 className="h-6 w-6" aria-hidden />
            </span>
            <p className="mt-3 text-[15px] font-semibold text-[#1F2937]">No team yet</p>
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
          <div className={`${mobileSectionGap} px-3 pt-3 sm:px-4 ${mobileContentBottomPad}`}>
            <div className={mobileCardCls}>
              <div className={`${mobileCardInnerCls} border-b border-[#E4E7EC] bg-gradient-to-br from-[#E8F4FB]/40 to-white`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#008CD3]">
                      Team overview
                    </p>
                    <p className={`mt-1 ${mobileValueCls} text-[16px]`}>{team.team_name}</p>
                  </div>
                  {team.is_admin ? (
                    <span className="shrink-0 rounded-full bg-[#008CD3] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Admin
                    </span>
                  ) : (
                    <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-[#E4E7EC] bg-[#F9FAFB] px-2.5 py-1 text-[10px] font-semibold text-[#6B7280]">
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
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] px-2.5 py-2">
                    <p className={mobileLabelCls}>Members</p>
                    <p className="mt-0.5 text-[14px] font-semibold text-[#1F2937]">
                      {team.members.length}
                    </p>
                  </div>
                  <div className="rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] px-2.5 py-2">
                    <p className={mobileLabelCls}>Created</p>
                    <p className="mt-0.5 text-[12px] font-semibold text-[#1F2937]">
                      {formatDate(team.created_at ?? null)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className={mobileCardCls}>
              <div className={mobileCardInnerCls}>
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#008CD3] text-white">
                    <UserRound className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
                    Team lead
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] p-3">
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
              <div className="border-b border-[#E4E7EC] px-3.5 py-3 sm:px-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0F9D58] text-white">
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
                <ul className="divide-y divide-[#E4E7EC]">
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
          <div className={`pt-3 ${mobileContentBottomPad}`}>
            <div className="mx-3 mb-3 flex items-center gap-2 sm:mx-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
                <CalendarDays className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className={mobileValueCls}>Leave requests</p>
                <p className={mobileCaptionCls}>For this team · {leaveRows.length} total</p>
              </div>
            </div>
            {leaveRows.length === 0 ? (
              <div className="mx-3 mt-2 rounded-xl border border-dashed border-[#E4E7EC] bg-white px-4 py-14 text-center sm:mx-4">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5F7FA] text-[#9CA3AF]">
                  <CalendarDays className="h-6 w-6" aria-hidden />
                </span>
                <p className="mt-3 text-[15px] font-semibold text-[#1F2937]">No leave requests</p>
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
          <div className={`pt-3 ${mobileContentBottomPad}`}>
            <div className="mx-3 mb-3 flex items-center gap-2 sm:mx-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E6F4EA] text-[#0F9D58]">
                <ClipboardList className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className={mobileValueCls}>Attendance corrections</p>
                <p className={mobileCaptionCls}>For this team · {attendanceRows.length} total</p>
              </div>
            </div>
            {attendanceRows.length === 0 ? (
              <div className="mx-3 mt-2 rounded-xl border border-dashed border-[#E4E7EC] bg-white px-4 py-14 text-center sm:mx-4">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5F7FA] text-[#9CA3AF]">
                  <ClipboardList className="h-6 w-6" aria-hidden />
                </span>
                <p className="mt-3 text-[15px] font-semibold text-[#1F2937]">No corrections yet</p>
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

        {!loading && !leaveModalOpen && !attModalOpen ? (
          <div className={mobileActionBarCls}>
            <div className="mx-auto flex max-w-lg gap-2">
              <button
                type="button"
                onClick={() => {
                  setLeaveModalOpen(true);
                  setLeaveFormError(null);
                  setLeaveFormSuccess(null);
                }}
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

      {/* Desktop layout — Zoho attendance portal */}
      <section
        className="hidden min-h-full [font-family:var(--font-inter),system-ui,sans-serif] lg:block lg:p-6"
        style={{ backgroundColor: "#F5F7FA" }}
      >
        <div className="mx-auto max-w-7xl space-y-5">
          <div className={panelClass}>
            <div className="h-[3px] bg-[#008CD3]" aria-hidden />
            <div className="px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <Link
                    href={`/user-dashboard/${orgIdParam}/home`}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#6B7280] transition hover:bg-[#F9FAFB] hover:text-[#1F2937]"
                    aria-label="Back to dashboard"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden />
                  </Link>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
                    <Users className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <h1 className="text-[18px] font-semibold text-[#1F2937]">My team</h1>
                    <p className="mt-0.5 text-[13px] text-[#6B7280]">
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
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#E4E7EC] bg-white px-3 py-1.5 text-[13px] font-medium text-[#374151] transition hover:bg-[#F9FAFB] disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                      aria-hidden
                    />
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLeaveModalOpen(true);
                      setLeaveFormError(null);
                      setLeaveFormSuccess(null);
                    }}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-[#008CD3] px-3 py-1.5 text-[13px] font-semibold text-white transition hover:bg-[#0070AA]"
                  >
                    <CalendarDays className="h-4 w-4" aria-hidden />
                    Request time off
                  </button>
                  <button
                    type="button"
                    onClick={openNewAttendanceModal}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#E4E7EC] bg-white px-3 py-1.5 text-[13px] font-semibold text-[#374151] transition hover:bg-[#F9FAFB]"
                  >
                    <ClipboardList className="h-4 w-4" aria-hidden />
                    Correction
                  </button>
                </div>
              </div>

              {!loading ? (
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    {
                      label: "Members",
                      value: team?.members.length ?? 0,
                      color: "text-[#1F2937]",
                      icon: Users,
                    },
                    {
                      label: "Leave pending",
                      value: pendingLeaveCount,
                      color: "text-[#F9A825]",
                      icon: CalendarDays,
                    },
                    {
                      label: "Corrections pending",
                      value: pendingAttCount,
                      color: "text-[#008CD3]",
                      icon: ClipboardList,
                    },
                    {
                      label: "Total requests",
                      value: leaveRows.length + attendanceRows.length,
                      color: "text-[#0F9D58]",
                      icon: Calendar,
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className="rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5"
                      >
                        <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                          <Icon className="h-3 w-3" aria-hidden />
                          {item.label}
                        </p>
                        <p className={`mt-1 text-lg font-semibold ${item.color}`}>
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
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8F4FB]">
                <Loader2 className="h-7 w-7 animate-spin text-[#008CD3]" aria-hidden />
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
            <div className="rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-4 py-3 text-[13px] text-[#D93025]">
              <p className="font-semibold">Something went wrong</p>
              <p className="mt-1">{teamError}</p>
            </div>
          ) : null}

          {!loading && noTeam ? (
            <div className="grid items-start gap-4 lg:grid-cols-[1fr_minmax(380px,420px)]">
              <section className={`${panelClass} flex flex-col items-center px-8 py-14 text-center`}>
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F5F7FA] text-[#9CA3AF]">
                  <Building2 className="h-8 w-8" aria-hidden />
                </span>
                <h2 className="mt-5 text-[18px] font-semibold text-[#1F2937]">
                  You&apos;re not on a team yet
                </h2>
                <p className={`mx-auto mt-2 max-w-md ${desktopCaptionCls}`}>
                  When HR or your manager adds you to a roster, it will show up here. You can
                  still submit and track leave and attendance corrections from the panel on the
                  right.
                </p>
                <Link
                  href={`/user-dashboard/${orgIdParam}/home`}
                  className="mt-6 inline-flex min-h-[40px] items-center rounded-lg bg-[#008CD3] px-5 py-2 text-[13px] font-semibold text-white transition hover:bg-[#0070AA]"
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
            <div className="grid items-start gap-4 lg:grid-cols-[1fr_minmax(380px,420px)]">
              <div className="min-w-0 space-y-4">
                <section className={panelClass}>
                  <div className="border-b border-[#E4E7EC] bg-gradient-to-br from-[#E8F4FB]/40 to-white px-5 py-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#008CD3]">
                          Team overview
                        </p>
                        <h2 className="mt-1 text-[20px] font-semibold text-[#1F2937]">
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
                        <span className="shrink-0 rounded-full bg-[#008CD3] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                          Team admin
                        </span>
                      ) : (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
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
                          soft: "bg-[#E8F4FB] text-[#008CD3]",
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
                          soft: "bg-[#E6F4EA] text-[#0F9D58]",
                        },
                        {
                          label: "Last updated",
                          value: formatDate(team.updated_at ?? null),
                          icon: RefreshCw,
                          soft: "bg-[#F5F7FA] text-[#6B7280]",
                        },
                      ].map((stat) => {
                        const Icon = stat.icon;
                        return (
                          <div
                            key={stat.label}
                            className="flex gap-3 rounded-xl border border-[#E4E7EC] bg-white px-3 py-2.5"
                          >
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${stat.soft}`}
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

                  <div className="px-5 py-5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#008CD3] text-white">
                        <UserRound className="h-3.5 w-3.5" aria-hidden />
                      </span>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
                        Team lead
                      </p>
                    </div>
                    <div className="mt-3 flex items-center gap-4 rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] p-4">
                      <MemberAvatarButton
                        name={team.admin_name ?? "Team lead"}
                        userImage={adminMember?.user_image}
                        size="md"
                        onZoom={openPhotoZoom}
                      />
                      <div className="min-w-0">
                        <p className={desktopValueCls}>{team.admin_name ?? "—"}</p>
                        <p className={`mt-1 flex items-center gap-1 ${desktopCaptionCls}`}>
                          <Calendar className="h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" aria-hidden />
                          Joined {formatDate(adminMember?.joined_date ?? null)}
                          {adminMember?.added_by_name
                            ? ` · Added by ${adminMember.added_by_name}`
                            : ""}
                        </p>
                        {adminMember?.user_email ? (
                          <p className={`mt-0.5 flex items-center gap-1 truncate ${desktopCaptionCls}`}>
                            <Mail className="h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" aria-hidden />
                            {adminMember.user_email}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0F9D58] text-white">
                          <Users className="h-3.5 w-3.5" aria-hidden />
                        </span>
                        <div>
                          <h3 className={desktopValueCls}>Roster</h3>
                          <p className={desktopCaptionCls}>
                            Everyone on your team except the lead.
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 overflow-hidden rounded-xl border border-[#E4E7EC]">
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-[13px]">
                            <thead>
                              <tr className="border-b border-[#E4E7EC] bg-[#F9FAFB] text-left">
                                <th className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                                  Member
                                </th>
                                <th className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                                  Contact
                                </th>
                                <th className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                                  Joined
                                </th>
                                <th className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                                  Added by
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E4E7EC] bg-white">
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
                                    className="transition hover:bg-[#F9FAFB]"
                                  >
                                    <td className="px-4 py-3.5">
                                      <div className="flex items-center gap-3">
                                        <MemberAvatarButton
                                          name={m.user_name}
                                          userImage={m.user_image}
                                          size="sm"
                                          onZoom={openPhotoZoom}
                                        />
                                        <span className="font-semibold text-[#1F2937]">
                                          {m.user_name}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3.5">
                                      <div className="flex items-center gap-1.5 text-[#1F2937]">
                                        <Mail className="h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" aria-hidden />
                                        <span className="break-all">{m.user_email}</span>
                                      </div>
                                      {m.user_phone ? (
                                        <p className={`mt-1 pl-5 ${desktopCaptionCls}`}>
                                          {m.user_phone}
                                        </p>
                                      ) : null}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3.5 text-[#374151]">
                                      {formatDate(m.joined_date)}
                                    </td>
                                    <td className="px-4 py-3.5 text-[#374151]">
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

      {/* Leave modal */}
      {leaveModalOpen ? (
        <ModalScrim onClose={() => setLeaveModalOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-[0_24px_80px_-12px_rgba(15,23,42,0.35)] ring-1 ring-slate-900/10 lg:rounded-2xl lg:[border-top:3px_solid_#008CD3]">
            <div className="flex justify-center pt-2 pb-0 lg:hidden" aria-hidden>
              <span className="h-1 w-10 rounded-full bg-[#E4E7EC]" />
            </div>
            <div className="sticky top-0 z-[1] flex items-center justify-between border-b border-[#E4E7EC] bg-white px-4 py-4 lg:px-6">
              <div>
                <h2 className="text-lg font-semibold text-[#1F2937]">
                  Request time off
                </h2>
                <p className="text-xs text-[#6B7280]">
                  Submit to your approver for this organization.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLeaveModalOpen(false)}
                className="rounded-lg p-2 text-[#9CA3AF] hover:bg-[#F5F7FA] hover:text-[#1F2937]"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={onSubmitLeave} className="space-y-4 p-4 lg:p-6">
              {leaveFormError ? (
                <p className="rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] p-3 text-[14px] text-[#D93025] lg:rounded-xl lg:bg-red-50 lg:text-red-800 lg:ring-1 lg:ring-red-100">
                  {leaveFormError}
                </p>
              ) : null}
              {leaveFormSuccess ? (
                <p className="rounded-lg border border-[#C8E6C9] bg-[#E6F4EA] p-3 text-[14px] text-[#0F9D58] lg:rounded-xl lg:bg-emerald-50 lg:text-emerald-900 lg:ring-1 lg:ring-emerald-100">
                  {leaveFormSuccess}
                </p>
              ) : null}
              <AssignedLeaveTypeSelect
                options={assignedLeaveOptions}
                loading={assignedLeavesLoading}
                error={assignedLeavesError}
                selectedLeaveTypeId={selectedLeaveTypeId}
                onSelectLeaveTypeId={setSelectedLeaveTypeId}
                className={zohoInputCls()}
                labelClassName="text-[13px] font-medium text-[#374151] lg:text-xs lg:font-semibold lg:text-slate-600"
              />
              <label className="block">
                <span className="text-[13px] font-medium text-[#374151] lg:text-xs lg:font-semibold lg:text-slate-600">
                  Start date
                </span>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={zohoInputCls()}
                />
              </label>
              <label className="block">
                <span className="text-[13px] font-medium text-[#374151] lg:text-xs lg:font-semibold lg:text-slate-600">
                  End date <span className="font-normal text-[#9CA3AF] lg:text-slate-400">(optional)</span>
                </span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={zohoInputCls()}
                />
              </label>
              <label className="block">
                <span className="text-[13px] font-medium text-[#374151] lg:text-xs lg:font-semibold lg:text-slate-600">
                  Reason <span className="font-normal text-[#9CA3AF] lg:text-slate-400">(optional)</span>
                </span>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Context for your manager…"
                  className={zohoInputCls()}
                />
              </label>
              <div className="flex flex-col-reverse gap-2 border-t border-[#E4E7EC] pt-4 lg:flex-row lg:gap-3 lg:border-0 lg:pt-2">
                <button
                  type="button"
                  onClick={() => setLeaveModalOpen(false)}
                  className={zohoSecondaryBtnCls(true)}
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
                  className={zohoPrimaryBtnCls(true)}
                >
                  {leaveSubmitting ? "Submitting…" : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </ModalScrim>
      ) : null}

      {/* Attendance modal */}
      {attModalOpen ? (
        <ModalScrim
          onClose={() => {
            setAttModalOpen(false);
            setAttEditRow(null);
          }}
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-[0_24px_80px_-12px_rgba(15,23,42,0.35)] ring-1 ring-slate-900/10 lg:rounded-2xl lg:[border-top:3px_solid_#008CD3]">
            <div className="flex justify-center pt-2 pb-0 lg:hidden" aria-hidden>
              <span className="h-1 w-10 rounded-full bg-[#E4E7EC]" />
            </div>
            <div className="sticky top-0 z-[1] flex items-center justify-between border-b border-[#E4E7EC] bg-white px-4 py-4 lg:px-6">
              <div>
                <h2 className="text-lg font-semibold text-[#1F2937]">
                  {attEditRow
                    ? "Edit attendance request"
                    : "Attendance correction"}
                </h2>
                <p className="text-xs text-[#6B7280]">
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
                className="rounded-lg p-2 text-[#9CA3AF] hover:bg-[#F5F7FA] hover:text-[#1F2937]"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={onSubmitAttendance} className="space-y-4 p-4 lg:p-6">
              {attFormError ? (
                <p className="rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] p-3 text-[14px] text-[#D93025] lg:rounded-xl lg:bg-red-50 lg:text-red-800 lg:ring-1 lg:ring-red-100">
                  {attFormError}
                </p>
              ) : null}
              {attFormSuccess ? (
                <p className="rounded-lg border border-[#C8E6C9] bg-[#E6F4EA] p-3 text-[14px] text-[#0F9D58] lg:rounded-xl lg:bg-emerald-50 lg:text-emerald-900 lg:ring-1 lg:ring-emerald-100">
                  {attFormSuccess}
                </p>
              ) : null}
              <label className="block">
                <span className="text-[13px] font-medium text-[#374151] lg:text-xs lg:font-semibold lg:text-slate-600">
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
                <span className="text-[13px] font-medium text-[#374151] lg:text-xs lg:font-semibold lg:text-slate-600">
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
                <span className="text-[13px] font-medium text-[#374151] lg:text-xs lg:font-semibold lg:text-slate-600">
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
              <div className="flex flex-col-reverse gap-2 border-t border-[#E4E7EC] pt-4 lg:flex-row lg:gap-3 lg:border-0 lg:pt-2">
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#1F2937]/45 p-0 backdrop-blur-[1px] lg:items-center lg:p-4 lg:backdrop-blur-sm"
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
    <aside className="min-w-0 space-y-4 xl:sticky xl:top-6 xl:self-start">
      <div className={panelClass}>
        <div className="flex items-start gap-3 border-b border-[#E4E7EC] bg-gradient-to-r from-[#E8F4FB]/50 to-white px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
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
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5F7FA] text-[#9CA3AF]">
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
                  className={`rounded-xl border border-[#E4E7EC] bg-white p-3.5 shadow-sm ${accentBar[tone]}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${toneChip[tone]}`}
                    >
                      {row.status}
                    </span>
                    <time
                      className="text-[10px] tabular-nums text-[#9CA3AF]"
                      dateTime={row.created_at ?? undefined}
                    >
                      {formatDate(row.created_at)}
                    </time>
                  </div>
                  <p className="mt-2 text-[14px] font-semibold capitalize text-[#1F2937]">
                    {row.leave_type.replace(/_/g, " ")}
                  </p>
                  <p className={`mt-1 flex items-center gap-1 ${desktopCaptionCls}`}>
                    <CalendarDays className="h-3 w-3 shrink-0 text-[#008CD3]" aria-hidden />
                    {formatDate(row.start_date)}
                    {row.end_date ? ` → ${formatDate(row.end_date)}` : ""}
                  </p>
                  {row.reason ? (
                    <p className={`mt-2 line-clamp-3 rounded-lg bg-[#F9FAFB] px-2.5 py-2 ${desktopCaptionCls}`}>
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
        <div className="flex items-start gap-3 border-b border-[#E4E7EC] bg-gradient-to-r from-[#E6F4EA]/50 to-white px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E6F4EA] text-[#0F9D58]">
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
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5F7FA] text-[#9CA3AF]">
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
                  className={`rounded-xl border border-[#E4E7EC] bg-white p-3.5 shadow-sm ${accentBar[tone]}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${toneChip[tone]}`}
                    >
                      {row.query_status}
                    </span>
                    {pending ? (
                      <button
                        type="button"
                        onClick={() => onEditAttendance(row)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] px-2 py-1 text-[11px] font-semibold text-[#008CD3] transition hover:bg-[#E8F4FB]"
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
                    <Calendar className="h-3 w-3 shrink-0 text-[#008CD3]" aria-hidden />
                    {formatDate(row.attendance_date)}
                  </p>
                  <p className={`mt-2 line-clamp-3 rounded-lg bg-[#F9FAFB] px-2.5 py-2 ${desktopCaptionCls}`}>
                    {row.query_message}
                  </p>
                  {row.admin_response ? (
                    <div className="mt-2 rounded-lg border border-[#E4E7EC] bg-[#F5F7FA] px-2.5 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
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
                  <p className="mt-2 text-[10px] tabular-nums text-[#9CA3AF]">
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
