"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
import {
  applyForLeave,
  fetchMyLeaveQueries,
  type LeaveQueryRow,
} from "@/services/employeeLeaves";
import AssignedLeaveTypeSelect from "@/components/portal-dashboard/user-layout/AssignedLeaveTypeSelect";
import { useAssignedLeaveTypes } from "@/hooks/useAssignedLeaveTypes";
import {
  attendanceCategoryLabel,
  correctAttendanceQuery,
  fetchMyAttendanceQueries,
  raiseAttendanceQuery,
  type AttendanceQueryCategory,
  type AttendanceQueryRow,
} from "@/services/attendanceQueries";
import { fetchMyOrgTeam } from "@/services/orgTeams";
import type { OrgTeamDetail, OrgTeamMemberRow } from "@/services/orgTeams";

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

const toneChip: Record<
  "emerald" | "rose" | "amber",
  string
> = {
  emerald:
    "border-emerald-200/70 bg-emerald-50/90 text-emerald-800 shadow-sm shadow-emerald-900/5",
  rose: "border-rose-200/70 bg-rose-50/90 text-rose-800 shadow-sm shadow-rose-900/5",
  amber:
    "border-amber-200/70 bg-amber-50/90 text-amber-900 shadow-sm shadow-amber-900/5",
};

const accentBar: Record<"emerald" | "rose" | "amber", string> = {
  emerald: "border-l-4 border-l-emerald-500",
  rose: "border-l-4 border-l-rose-500",
  amber: "border-l-4 border-l-amber-400",
};

const panelClass =
  "overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_36px_-12px_rgba(15,23,42,0.12)]";

function zohoPrimaryBtnCls(full = false) {
  return `inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg bg-[#008CD3] px-4 py-2.5 text-[14px] font-medium text-white transition active:scale-[0.98] hover:bg-[#0070AA] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full flex-1" : ""}`;
}

function zohoSecondaryBtnCls(full = false) {
  return `inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[#E4E7EC] bg-white px-4 py-2.5 text-[14px] font-medium text-[#1F2937] transition active:scale-[0.98] hover:bg-[#F5F7FA] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full flex-1" : ""}`;
}

/** Sits above the layout bottom tab bar (z-[55]) on mobile/tablet. */
const mobileActionBarCls =
  "fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-[54] border-t border-[#E4E7EC] bg-white px-3 py-2.5 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]";
const mobileContentBottomPad = "pb-[calc(7rem+env(safe-area-inset-bottom,0px))]";
const mobileCardCls =
  "rounded-lg border border-[#E4E7EC] bg-white p-3 shadow-sm";
const mobileSectionGap = "space-y-2";
const mobileLabelCls =
  "text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]";
const mobileCaptionCls = "text-[11px] leading-snug text-[#6B7280]";
const mobileValueCls = "text-[13px] font-semibold text-[#1F2937]";

function mobileActionPrimaryBtnCls(full = false) {
  return `inline-flex min-h-[34px] items-center justify-center gap-1 rounded-md bg-[#008CD3] px-2.5 py-1.5 text-[12px] font-medium text-white transition active:scale-[0.98] hover:bg-[#0070AA] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full flex-1" : ""}`;
}

function mobileActionSecondaryBtnCls(full = false) {
  return `inline-flex min-h-[34px] items-center justify-center gap-1 rounded-md border border-[#E4E7EC] bg-white px-2.5 py-1.5 text-[12px] font-medium text-[#1F2937] transition active:scale-[0.98] hover:bg-[#F5F7FA] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full flex-1" : ""}`;
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#111B21]/80 p-4 backdrop-blur-sm lg:hidden"
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
        className={`${box} shrink-0 overflow-hidden rounded-md ring-1 ring-[#E4E7EC] transition active:opacity-90`}
        aria-label={`View ${label} profile photo`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img} alt="" className="h-full w-full object-cover" />
      </button>
    );
  }

  return (
    <span
      className={`flex ${box} shrink-0 items-center justify-center rounded-md text-xs font-semibold ${memberColorClass(label)}`}
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
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <MemberAvatarButton
          name={member.user_name}
          userImage={member.user_image}
          onZoom={onZoomPhoto}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-[#1F2937]">
            {member.user_name}
          </p>
          <p className="truncate text-[11px] text-[#6B7280]">{member.user_email}</p>
          <p className={`mt-0.5 ${mobileCaptionCls}`}>
            Joined {formatDate(member.joined_date)}
          </p>
        </div>
      </div>
    </li>
  );
}

function MobileLeaveRow({ row }: { row: LeaveQueryRow }) {
  const tone = leaveStatusTone(row.status);
  return (
    <li>
      <div className="px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase ${mobileStatusCls(tone)}`}
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
        <p className="mt-1.5 text-[13px] font-medium capitalize text-[#1F2937]">
          {row.leave_type.replace(/_/g, " ")}
        </p>
        <p className={`mt-0.5 ${mobileCaptionCls}`}>
          {formatDate(row.start_date)}
          {row.end_date ? ` → ${formatDate(row.end_date)}` : ""}
        </p>
        {row.reason ? (
          <p className={`mt-1.5 line-clamp-2 ${mobileCaptionCls}`}>{row.reason}</p>
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
  return (
    <li>
      <div className="px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase ${mobileStatusCls(tone)}`}
          >
            {row.query_status}
          </span>
          {pending ? (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1 rounded-md border border-[#E4E7EC] px-1.5 py-0.5 text-[11px] font-medium text-[#008CD3]"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
          ) : null}
        </div>
        <p className={`mt-1.5 ${mobileValueCls}`}>
          {attendanceCategoryLabel(row.category)}
        </p>
        <p className={mobileCaptionCls}>{formatDate(row.attendance_date)}</p>
        <p className={`mt-1 line-clamp-2 ${mobileCaptionCls}`}>{row.query_message}</p>
      </div>
    </li>
  );
}

export default function UserMyTeamPage() {
  const params = useParams();
  const orgIdParam = params?.org_id;
  const orgId = Number(orgIdParam);

  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [team, setTeam] = useState<OrgTeamDetail | null>(null);
  const [noTeam, setNoTeam] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);

  const [leaveRows, setLeaveRows] = useState<LeaveQueryRow[]>([]);
  const [leaveLoadError, setLeaveLoadError] = useState<string | null>(null);
  const [attendanceRows, setAttendanceRows] = useState<AttendanceQueryRow[]>(
    [],
  );
  const [attendanceLoadError, setAttendanceLoadError] = useState<string | null>(
    null,
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
    async (isRefresh = false) => {
      if (!orgId || Number.isNaN(orgId)) {
        setLoading(false);
        setTeamError("Invalid organization.");
        return;
      }
      const t = localStorage.getItem("token");
      if (!t) {
        setLoading(false);
        setTeamError("Not signed in.");
        return;
      }
      setToken(t);
      if (isRefresh) setRefreshing(true);
      else {
        setLoading(true);
      }
      setTeamError(null);
      setNoTeam(false);
      setLeaveLoadError(null);
      setAttendanceLoadError(null);

      try {
        const data = await fetchMyOrgTeam(t, orgId);
        setTeam(data);
      } catch (e) {
        const err = e as ApiError;
        if (err.status === 404) {
          setTeam(null);
          setNoTeam(true);
        } else {
          setTeam(null);
          setTeamError(err.message || "Could not load team.");
        }
      }

      const [leaveRes, attRes] = await Promise.allSettled([
        fetchMyLeaveQueries(t, orgId),
        fetchMyAttendanceQueries(t, orgId),
      ]);

      if (leaveRes.status === "fulfilled") {
        setLeaveRows(leaveRes.value);
      } else {
        setLeaveRows([]);
        setLeaveLoadError(
          leaveRes.reason instanceof Error
            ? leaveRes.reason.message
            : "Could not load leave history.",
        );
      }

      if (attRes.status === "fulfilled") {
        setAttendanceRows(attRes.value);
      } else {
        setAttendanceRows([]);
        setAttendanceLoadError(
          attRes.reason instanceof Error
            ? attRes.reason.message
            : "Could not load attendance queries.",
        );
      }

      setLoading(false);
      setRefreshing(false);
    },
    [orgId],
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
      const rows = await fetchMyAttendanceQueries(t, orgId);
      setAttendanceRows(rows);
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
      const rows = await fetchMyLeaveQueries(t, orgId);
      setLeaveRows(rows);
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
    <div className="min-h-full bg-[#F5F7FA] lg:bg-transparent">
      {/* Mobile & tablet: Zoho admin portal style */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-20 border-b border-[#E4E7EC] bg-white shadow-sm">
          <div className="flex items-center gap-2 px-3 py-2.5">
            <Link
              href={`/user-dashboard/${orgIdParam}/home`}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#E4E7EC] text-[#6B7280] active:bg-[#F5F7FA]"
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
                className="h-9 w-9 shrink-0 overflow-hidden rounded-md ring-1 ring-[#E4E7EC] active:opacity-90"
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
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#E8F4FB] text-[#008CD3]">
                <Users className="h-4 w-4" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[15px] font-semibold text-[#1F2937]">My team</h1>
              <p className="truncate text-[11px] text-[#6B7280]">
                {loading
                  ? "Loading…"
                  : team
                    ? team.team_name
                    : noTeam
                      ? "No team assigned"
                      : "Team workspace"}
              </p>
              {!loading && team ? (
                <p className={`truncate ${mobileCaptionCls}`}>
                  {team.members.length} members
                  {pendingLeaveCount + pendingAttCount > 0
                    ? ` · ${pendingLeaveCount + pendingAttCount} pending`
                    : ""}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => void loadData(true)}
              disabled={loading || refreshing}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#E4E7EC] text-[#008CD3] active:bg-[#F5F7FA] disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="px-3 pb-2.5">
            <div className="flex rounded-md bg-[#F5F7FA] p-0.5">
              {mobileTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMobileMainTab(tab.id)}
                  className={`flex flex-1 items-center justify-center gap-1 rounded-[5px] py-1.5 text-[12px] font-medium transition ${
                    mobileMainTab === tab.id
                      ? "bg-white text-[#008CD3] shadow-sm"
                      : "text-[#6B7280]"
                  }`}
                >
                  {tab.label}
                  {"count" in tab && tab.count != null ? (
                    <span
                      className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] ${
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
          <div className="mx-3 mt-2 flex flex-wrap gap-1.5">
            {pendingLeaveCount > 0 ? (
              <span className="rounded-full bg-[#FFF8E1] px-2 py-0.5 text-[11px] font-medium text-[#F9A825]">
                {pendingLeaveCount} leave pending
              </span>
            ) : null}
            {pendingAttCount > 0 ? (
              <span className="rounded-full bg-[#E8F4FB] px-2 py-0.5 text-[11px] font-medium text-[#008CD3]">
                {pendingAttCount} correction pending
              </span>
            ) : null}
          </div>
        ) : null}

        {teamError && !loading && !noTeam ? (
          <div className="mx-3 mt-2 rounded-md border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2 text-[12px] text-[#D93025]">
            <span>{teamError}</span>
          </div>
        ) : null}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-[#6B7280]">
            <Loader2 className="h-7 w-7 animate-spin text-[#008CD3]" />
            <p className="text-[13px]">Loading your team…</p>
          </div>
        ) : null}

        {!loading && mobileMainTab === "team" && noTeam ? (
          <div className="mx-3 mt-3 rounded-lg border border-dashed border-[#E4E7EC] bg-white px-4 py-12 text-center">
            <Building2 className="mx-auto h-8 w-8 text-[#9CA3AF]" />
            <p className="mt-3 text-[15px] font-semibold text-[#1F2937]">No team yet</p>
            <p className={`mt-1.5 ${mobileCaptionCls}`}>
              When HR adds you to a roster, it will appear here. You can still submit leave and
              corrections from other tabs.
            </p>
            <Link
              href={`/user-dashboard/${orgIdParam}/home`}
              className={`mt-4 ${mobileActionPrimaryBtnCls()}`}
            >
              Back to home
            </Link>
          </div>
        ) : null}

        {!loading && mobileMainTab === "team" && team ? (
          <div className={`${mobileSectionGap} px-3 pt-2 ${mobileContentBottomPad}`}>
            <div className={mobileCardCls}>
              <p className={mobileLabelCls}>Team overview</p>
              <p className={`mt-0.5 ${mobileValueCls} text-[15px]`}>{team.team_name}</p>
              {team.team_info?.trim() ? (
                <p className={`mt-1 ${mobileCaptionCls}`}>{team.team_info}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {team.is_admin ? (
                  <span className="rounded-full bg-[#E8F4FB] px-2 py-0.5 text-[10px] font-semibold text-[#008CD3]">
                    Team admin
                  </span>
                ) : (
                  <span className="rounded-full bg-[#F5F7FA] px-2 py-0.5 text-[10px] font-semibold text-[#6B7280]">
                    Member
                  </span>
                )}
                <span className="rounded-full bg-[#F5F7FA] px-2 py-0.5 text-[10px] font-medium text-[#6B7280]">
                  {team.members.length} members
                </span>
              </div>
            </div>

            <div className={mobileCardCls}>
              <p className={mobileLabelCls}>Team lead</p>
              <div className="mt-2 flex items-center gap-2.5">
                <MemberAvatarButton
                  name={team.admin_name ?? "Team lead"}
                  userImage={adminMember?.user_image}
                  onZoom={openPhotoZoom}
                />
                <div className="min-w-0">
                  <p className={mobileValueCls}>{team.admin_name ?? "—"}</p>
                  <p className={mobileCaptionCls}>
                    Joined {formatDate(adminMember?.joined_date ?? null)}
                  </p>
                  {adminMember?.user_email ? (
                    <p className={`truncate ${mobileCaptionCls}`}>
                      {adminMember.user_email}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-sm">
              <div className="border-b border-[#E4E7EC] px-3 py-2.5">
                <p className={mobileValueCls}>Roster</p>
                <p className={mobileCaptionCls}>Tap a photo to enlarge</p>
              </div>
              {otherMembers.length === 0 ? (
                <p className={`px-3 py-8 text-center ${mobileCaptionCls}`}>
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
          <div className={`pt-2 ${mobileContentBottomPad}`}>
            {leaveLoadError ? (
              <div className="mx-3 mt-2 rounded-md border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2 text-[12px] text-[#D93025]">
                {leaveLoadError}
              </div>
            ) : null}
            {leaveRows.length === 0 && !leaveLoadError ? (
              <div className="mx-3 mt-3 rounded-lg border border-dashed border-[#E4E7EC] bg-white px-4 py-12 text-center">
                <CalendarDays className="mx-auto h-8 w-8 text-[#9CA3AF]" />
                <p className="mt-3 text-[15px] font-semibold text-[#1F2937]">No leave requests</p>
                <p className={`mt-1.5 ${mobileCaptionCls}`}>
                  Tap Request time off below to submit a new request.
                </p>
              </div>
            ) : (
              <ul className="mt-1 divide-y divide-[#E4E7EC] border-t border-[#E4E7EC] bg-white">
                {leaveRows.map((row) => (
                  <MobileLeaveRow key={row.id} row={row} />
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {!loading && mobileMainTab === "corrections" ? (
          <div className={`pt-2 ${mobileContentBottomPad}`}>
            {attendanceLoadError ? (
              <div className="mx-3 mt-2 rounded-md border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2 text-[12px] text-[#D93025]">
                {attendanceLoadError}
              </div>
            ) : null}
            {attendanceRows.length === 0 && !attendanceLoadError ? (
              <div className="mx-3 mt-3 rounded-lg border border-dashed border-[#E4E7EC] bg-white px-4 py-12 text-center">
                <ClipboardList className="mx-auto h-8 w-8 text-[#9CA3AF]" />
                <p className="mt-3 text-[15px] font-semibold text-[#1F2937]">No corrections yet</p>
                <p className={`mt-1.5 ${mobileCaptionCls}`}>
                  Tap Correction below to report a missed punch or timing issue.
                </p>
              </div>
            ) : (
              <ul className="mt-1 divide-y divide-[#E4E7EC] border-t border-[#E4E7EC] bg-white">
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
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setLeaveModalOpen(true);
                  setLeaveFormError(null);
                  setLeaveFormSuccess(null);
                }}
                className={mobileActionPrimaryBtnCls(true)}
              >
                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                Request time off
              </button>
              <button
                type="button"
                onClick={openNewAttendanceModal}
                className={mobileActionSecondaryBtnCls(true)}
              >
                <ClipboardList className="h-3.5 w-3.5 shrink-0" />
                Correction
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Desktop layout (unchanged) */}
      <div className="hidden lg:block">
      <div className="relative min-h-screen flex-1 overflow-x-hidden bg-slate-50">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_75%_55%_at_50%_-8%,rgba(99,102,241,0.13),transparent_58%)]"
        aria-hidden
      />
      <div className="relative">
      <header className="border-b border-slate-200/60 bg-white/85 backdrop-blur-md supports-[backdrop-filter]:bg-white/70">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <Link
                href={`/user-dashboard/${orgIdParam}/home`}
                className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
              </Link>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-600">
                  Workspace
                </p>
                <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                  My team
                </h1>
                <p className="mt-1 max-w-xl text-sm leading-snug text-slate-500">
                  {loading
                    ? "Loading your roster and requests…"
                    : team
                      ? "Roster, approvals, and attendance corrections in one place."
                      : noTeam
                        ? "Track requests while you wait for a team assignment."
                        : "Roster, leave, and attendance requests."}
                </p>
                {!loading && team ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
                      <span
                        className="h-2 w-2 rounded-full bg-indigo-500"
                        aria-hidden
                      />
                      {team.members.length} members
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
                      <span
                        className="h-2 w-2 rounded-full bg-amber-400"
                        aria-hidden
                      />
                      {pendingLeaveCount} leave pending
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
                      <span
                        className="h-2 w-2 rounded-full bg-cyan-500"
                        aria-hidden
                      />
                      {pendingAttCount} attendance pending
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <button
                type="button"
                onClick={() => void loadData(true)}
                disabled={loading || refreshing}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  aria-hidden
                />
                Sync
              </button>
              <button
                type="button"
                onClick={() => {
                  setLeaveModalOpen(true);
                  setLeaveFormError(null);
                  setLeaveFormSuccess(null);
                }}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-md shadow-indigo-600/25 transition hover:bg-indigo-700"
              >
                <CalendarDays className="h-4 w-4" aria-hidden />
                Request time off
              </button>
              <button
                type="button"
                onClick={openNewAttendanceModal}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                <ClipboardList className="h-4 w-4" aria-hidden />
                Correction
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {loading ? (
          <div
            className={`flex min-h-[42vh] flex-col items-center justify-center gap-4 ${panelClass} p-14`}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
              <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-900">
                Preparing your workspace
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Fetching team roster and your recent requests.
              </p>
            </div>
          </div>
        ) : null}

        {!loading && teamError && !noTeam ? (
          <div className="rounded-2xl border border-red-200/80 bg-red-50/90 p-6 text-sm text-red-900 shadow-sm">
            <p className="font-semibold">Something went wrong</p>
            <p className="mt-1 text-red-800/90">{teamError}</p>
          </div>
        ) : null}

        {!loading && noTeam ? (
          <div className="grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-10">
            <section
              className={`${panelClass} flex min-w-0 flex-col items-center px-8 pb-12 pt-12 text-center sm:px-12`}
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-slate-100 shadow-inner">
                <Building2 className="h-9 w-9 text-indigo-600" aria-hidden />
              </div>
              <h2 className="mt-6 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                You&apos;re not on a team yet
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600">
                When HR or your manager adds you to a roster, it will show up
                here. You can still submit and track leave and attendance
                corrections from the panel on the right.
              </p>
              <Link
                href={`/user-dashboard/${orgIdParam}/home`}
                className="mt-8 inline-flex rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800"
              >
                Back to dashboard
              </Link>
            </section>
            <ActivityColumn
              leaveLoadError={leaveLoadError}
              leaveRows={leaveRows}
              attendanceLoadError={attendanceLoadError}
              attendanceRows={attendanceRows}
              onEditAttendance={openEditAttendanceModal}
            />
          </div>
        ) : null}

        {!loading && team ? (
          <div className="grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-10">
            <div className="min-w-0 space-y-8">
              <section className={panelClass}>
                <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-white via-indigo-50/35 to-white px-6 py-6 sm:px-8 sm:py-8">
                  <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-indigo-500 to-violet-500" />
                  <div className="relative pl-4 sm:pl-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-indigo-700">
                          Team overview
                        </p>
                        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.65rem]">
                          {team.team_name}
                        </h2>
                        {team.team_info?.trim() ? (
                          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
                            {team.team_info}
                          </p>
                        ) : (
                          <p className="mt-3 text-sm text-slate-500">
                            Collaboration hub for this organization.
                          </p>
                        )}
                      </div>
                      {team.is_admin ? (
                        <span className="inline-flex w-fit shrink-0 items-center rounded-full bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm">
                          Team admin
                        </span>
                      ) : (
                        <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600 shadow-sm">
                          <Shield className="h-3.5 w-3.5 text-slate-500" />
                          Member
                        </span>
                      )}
                    </div>

                    <dl className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="flex gap-3 rounded-xl border border-slate-200/60 bg-white/90 px-4 py-3 shadow-sm">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                          <Calendar className="h-4 w-4" aria-hidden />
                        </div>
                        <div className="min-w-0">
                          <dt className="text-[11px] font-medium text-slate-500">
                            Created
                          </dt>
                          <dd className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                            {formatDate(team.created_at ?? null)}
                          </dd>
                        </div>
                      </div>
                      <div className="flex gap-3 rounded-xl border border-slate-200/60 bg-white/90 px-4 py-3 shadow-sm">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                          <UserRound className="h-4 w-4" aria-hidden />
                        </div>
                        <div className="min-w-0">
                          <dt className="text-[11px] font-medium text-slate-500">
                            Created by
                          </dt>
                          <dd className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                            {team.created_by_name ?? "—"}
                          </dd>
                        </div>
                      </div>
                      <div className="flex gap-3 rounded-xl border border-slate-200/60 bg-white/90 px-4 py-3 shadow-sm">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
                          <Users className="h-4 w-4" aria-hidden />
                        </div>
                        <div className="min-w-0">
                          <dt className="text-[11px] font-medium text-slate-500">
                            Members
                          </dt>
                          <dd className="mt-0.5 text-sm font-semibold text-slate-900">
                            {team.members.length} active
                          </dd>
                        </div>
                      </div>
                      <div className="flex gap-3 rounded-xl border border-slate-200/60 bg-white/90 px-4 py-3 shadow-sm">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                          <RefreshCw className="h-4 w-4" aria-hidden />
                        </div>
                        <div className="min-w-0">
                          <dt className="text-[11px] font-medium text-slate-500">
                            Last updated
                          </dt>
                          <dd className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                            {formatDate(team.updated_at ?? null)}
                          </dd>
                        </div>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className="p-6 sm:p-8">
                  <div className="flex flex-col gap-5 rounded-2xl border border-slate-200/60 bg-gradient-to-br from-slate-50/80 to-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div className="flex min-w-0 gap-4">
                      <div
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white shadow-md shadow-indigo-600/25"
                        aria-hidden
                      >
                        {initialsFromName(team.admin_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Team lead
                        </p>
                        <p className="mt-1 truncate text-lg font-semibold text-slate-900">
                          {team.admin_name ?? "—"}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Joined{" "}
                          <span className="font-medium text-slate-800">
                            {formatDate(adminMember?.joined_date ?? null)}
                          </span>
                          {adminMember?.added_by_name
                            ? ` · Added by ${adminMember.added_by_name}`
                            : ""}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          Roster
                        </h3>
                        <p className="mt-0.5 text-sm text-slate-500">
                          Everyone on your team except the lead.
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-[13px]">
                          <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/80 text-left">
                              <th className="whitespace-nowrap px-4 py-3.5 text-xs font-semibold text-slate-600">
                                Member
                              </th>
                              <th className="whitespace-nowrap px-4 py-3.5 text-xs font-semibold text-slate-600">
                                Contact
                              </th>
                              <th className="whitespace-nowrap px-4 py-3.5 text-xs font-semibold text-slate-600">
                                Joined
                              </th>
                              <th className="whitespace-nowrap px-4 py-3.5 text-xs font-semibold text-slate-600">
                                Added by
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {otherMembers.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={4}
                                  className="px-4 py-14 text-center text-sm text-slate-500"
                                >
                                  No other members on this roster yet.
                                </td>
                              </tr>
                            ) : (
                              otherMembers.map((m) => (
                                <tr
                                  key={m.team_member_id}
                                  className="transition-colors hover:bg-slate-50/80"
                                >
                                  <td className="px-4 py-3.5">
                                    <div className="flex items-center gap-3">
                                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600">
                                        {initialsFromName(m.user_name)}
                                      </span>
                                      <span className="font-medium text-slate-900">
                                        {m.user_name}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3.5 text-slate-600">
                                    <div className="flex items-center gap-1.5 text-slate-900">
                                      <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                      <span className="break-all">
                                        {m.user_email}
                                      </span>
                                    </div>
                                    {m.user_phone ? (
                                      <p className="mt-1 pl-5 text-xs text-slate-500">
                                        {m.user_phone}
                                      </p>
                                    ) : null}
                                  </td>
                                  <td className="whitespace-nowrap px-4 py-3.5 text-slate-700">
                                    {formatDate(m.joined_date)}
                                  </td>
                                  <td className="px-4 py-3.5 text-slate-700">
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
              leaveLoadError={leaveLoadError}
              leaveRows={leaveRows}
              attendanceLoadError={attendanceLoadError}
              attendanceRows={attendanceRows}
              onEditAttendance={openEditAttendanceModal}
            />
          </div>
        ) : null}
      </main>
      </div>
      </div>
      </div>

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
            <div className="sticky top-0 z-[1] flex items-center justify-between border-b border-[#E4E7EC] bg-white px-4 py-4 lg:border-slate-100 lg:bg-gradient-to-r lg:from-indigo-50/90 lg:to-white lg:px-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Request time off
                </h2>
                <p className="text-xs text-slate-500">
                  Submit to your approver for this organization.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLeaveModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
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
            <div className="sticky top-0 z-[1] flex items-center justify-between border-b border-[#E4E7EC] bg-white px-4 py-4 lg:border-slate-100 lg:bg-gradient-to-r lg:from-cyan-50/70 lg:to-white lg:px-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {attEditRow
                    ? "Edit attendance request"
                    : "Attendance correction"}
                </h2>
                <p className="text-xs text-slate-500">
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
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#1F2937]/40 p-0 backdrop-blur-[1px] lg:items-center lg:bg-slate-950/60 lg:p-4 lg:backdrop-blur-sm"
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
  leaveLoadError,
  attendanceRows,
  attendanceLoadError,
  onEditAttendance,
}: {
  leaveRows: LeaveQueryRow[];
  leaveLoadError: string | null;
  attendanceRows: AttendanceQueryRow[];
  attendanceLoadError: string | null;
  onEditAttendance: (row: AttendanceQueryRow) => void;
}) {
  return (
    <aside className="min-w-0 space-y-6 xl:sticky xl:top-6 xl:self-start">
      <div className={panelClass}>
        <div className="flex items-start gap-3 border-b border-slate-100 bg-gradient-to-r from-indigo-50/50 to-white px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/60">
            <CalendarDays className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">
              Leave requests
            </h2>
            <p className="mt-0.5 text-xs leading-snug text-slate-500">
              Newest first. Status updates when HR reviews your request.
            </p>
          </div>
        </div>
        <div className="max-h-[min(52vh,440px)] overflow-y-auto p-4 sm:p-5">
          {leaveLoadError ? (
            <p className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-800">
              {leaveLoadError}
            </p>
          ) : null}
          {!leaveLoadError && leaveRows.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <CalendarDays className="h-6 w-6" aria-hidden />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-700">
                No leave requests yet
              </p>
              <p className="mt-1 max-w-[220px] text-xs text-slate-500">
                Use Request time off in the header when you need time away.
              </p>
            </div>
          ) : null}
          <ul className="space-y-3">
            {leaveRows.map((row) => {
              const tone = leaveStatusTone(row.status);
              return (
                <li
                  key={row.id}
                  className={`rounded-xl border border-slate-100/80 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.03] pl-3 ${accentBar[tone]}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${toneChip[tone]}`}
                    >
                      {row.status}
                    </span>
                    <time
                      className="text-[11px] tabular-nums text-slate-400"
                      dateTime={row.created_at ?? undefined}
                    >
                      {formatDate(row.created_at)}
                    </time>
                  </div>
                  <p className="mt-2 text-sm font-semibold capitalize text-slate-900">
                    {row.leave_type.replace(/_/g, " ")}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {formatDate(row.start_date)}
                    {row.end_date ? ` → ${formatDate(row.end_date)}` : ""}
                  </p>
                  {row.reason ? (
                    <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-600">
                      {row.reason}
                    </p>
                  ) : null}
                  {row.approved_by_name ? (
                    <p className="mt-3 text-[11px] font-medium text-slate-500">
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
        <div className="flex items-start gap-3 border-b border-slate-100 bg-gradient-to-r from-cyan-50/40 to-white px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-cyan-700 shadow-sm ring-1 ring-slate-200/60">
            <ClipboardList className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">
              Attendance corrections
            </h2>
            <p className="mt-0.5 text-xs leading-snug text-slate-500">
              Punch issues for this org. Edit while the request is still
              pending.
            </p>
          </div>
        </div>
        <div className="max-h-[min(52vh,440px)] overflow-y-auto p-4 sm:p-5">
          {attendanceLoadError ? (
            <p className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-800">
              {attendanceLoadError}
            </p>
          ) : null}
          {!attendanceLoadError && attendanceRows.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <ClipboardList className="h-6 w-6" aria-hidden />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-700">
                No corrections yet
              </p>
              <p className="mt-1 max-w-[240px] text-xs text-slate-500">
                Use Correction in the header to report a missed punch or timing
                issue.
              </p>
            </div>
          ) : null}
          <ul className="space-y-3">
            {attendanceRows.map((row) => {
              const tone = attendanceStatusTone(row.query_status);
              const pending =
                String(row.query_status).toLowerCase() === "pending";
              return (
                <li
                  key={row.id}
                  className={`rounded-xl border border-slate-100/80 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.03] pl-3 ${accentBar[tone]}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${toneChip[tone]}`}
                    >
                      {row.query_status}
                    </span>
                    {pending ? (
                      <button
                        type="button"
                        onClick={() => onEditAttendance(row)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-white"
                      >
                        <Pencil className="h-3 w-3" aria-hidden />
                        Edit
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {attendanceCategoryLabel(row.category)}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Day{" "}
                    <span className="font-medium text-slate-800">
                      {formatDate(row.attendance_date)}
                    </span>
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    {row.query_message}
                  </p>
                  {row.admin_response ? (
                    <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-700">
                      <span className="font-semibold text-slate-800">
                        Response
                      </span>
                      <span className="text-slate-600">
                        {" "}
                        — {row.admin_response}
                      </span>
                      {row.approved_by_name ? (
                        <span className="mt-1.5 block text-[11px] text-slate-500">
                          {row.approved_by_name}
                          {row.resolved_at
                            ? ` · ${formatDateTime(row.resolved_at)}`
                            : ""}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  <p className="mt-2 text-[10px] tabular-nums text-slate-400">
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
