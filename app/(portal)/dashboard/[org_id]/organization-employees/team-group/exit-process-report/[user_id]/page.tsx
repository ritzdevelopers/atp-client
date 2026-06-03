"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  ClipboardList,
  Inbox,
  Layers,
  ListChecks,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Plus,
  ShieldAlert,
  UserRound,
  CircleCheck,
  CircleX,
  X,
} from "lucide-react";
import { getAllOrgUsers } from "@/services/adminUser";
import {
  fetchTeamMemberExitProcessReport,
  type TeamMemberExitProcessReportData,
  type TeamMemberExitReportProcess,
  type TeamMemberExitReportHandoverRow,
} from "@/services/orgTeams";
import {
  createEmployeeExitProcessHandoverQuery,
  fetchAssetsForHandoverOfEmployee,
  updateEmployeeExitProcessHandoverQuery,
  updateAssetHandoverReturnedStatus,
  type EmployeeExitHandoverStatus,
  type EmployeeHandoverAssetApiRow,
} from "@/services/employeeExit";

const HANDOVER_STATUS_OPTIONS = [
  "pending",
  "handover_completed",
  "damaged",
  "missing",
] satisfies readonly EmployeeExitHandoverStatus[];

function fmtLong(iso: string | null | undefined) {
  if (iso == null || iso === "") return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function fmtDateOnly(iso: string | null | undefined) {
  if (iso == null || iso === "") return "—";
  const raw = String(iso);
  const ymd = raw.length >= 10 ? raw.slice(0, 10) : raw;
  const d = new Date(ymd);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function truthyReturned(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  if (typeof v === "string") return /^(1|true|yes)$/i.test(v.trim());
  return false;
}

function exitApplicationPill(status: string | null | undefined) {
  const s = String(status ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  if (s === "in_progress") {
    return "bg-sky-50 text-sky-800 ring-sky-200/80";
  }
  if (s === "pending") {
    return "bg-amber-50 text-amber-900 ring-amber-200/80";
  }
  if (s === "rejected") {
    return "bg-rose-50 text-rose-800 ring-rose-200/80";
  }
  if (s === "approved" || s === "handover_completed") {
    return "bg-emerald-50 text-emerald-800 ring-emerald-200/80";
  }
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

/** `datetime-local` value → `YYYY-MM-DD HH:MM:00` for the API */
function datetimeLocalToSqlDatetime(value: string): string {
  const t = value.trim();
  if (!t) return "";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(t)) {
    return `${t.replace("T", " ")}:00`;
  }
  return t;
}

/** DB / ISO datetime → value for `<input type="datetime-local">` */
function sqlDatetimeToDatetimeLocal(
  value: string | null | undefined,
): string {
  if (value == null || value === "") return "";
  const s = String(value).trim();
  const m =
    /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::\d{2})?/.exec(s);
  if (m?.[1] && m?.[2]) return `${m[1]}T${m[2]}`;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${mo}-${day}T${hh}:${mi}`;
}

function initialsFromName(name: string | null | undefined): string {
  const parts = String(name ?? "").split(/\s+/).filter(Boolean);
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

function resolveAvatarSrc(userImage: string | null | undefined, name: string | null | undefined) {
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
      aria-labelledby="team-exit-report-photo-zoom-title"
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
          id="team-exit-report-photo-zoom-title"
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
  size = "md",
  onZoom,
}: {
  name: string | null | undefined;
  userImage?: string | null;
  size?: "sm" | "md" | "lg";
  onZoom: (url: string, alt: string) => void;
}) {
  const profileUrl = profileImageUrlFromRow(userImage);
  const displayName = String(name ?? "Employee");
  const box =
    size === "lg" ? "h-14 w-14" : size === "sm" ? "h-10 w-10" : "h-11 w-11";
  const textSize = size === "lg" ? "text-base" : size === "sm" ? "text-xs" : "text-sm";

  const img = (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={resolveAvatarSrc(userImage, name)}
      alt=""
      className="h-full w-full object-cover object-top"
      onError={(e) => {
        e.currentTarget.src = dicebearAvatar(displayName);
      }}
    />
  );

  if (profileUrl) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onZoom(profileUrl, displayName);
        }}
        className={`${box} shrink-0 overflow-hidden rounded-full ring-2 ring-[#E4E7EC] transition active:opacity-90`}
        aria-label={`View ${displayName} profile photo`}
      >
        {img}
      </button>
    );
  }

  return (
    <span
      className={`flex ${box} shrink-0 items-center justify-center rounded-full font-semibold ring-2 ring-[#E4E7EC] ${textSize} ${avatarColorClass(name)}`}
      aria-hidden
    >
      {initialsFromName(name)}
    </span>
  );
}

function waFieldCls() {
  return "mt-1.5 w-full rounded-lg border border-[#E4E7EC] bg-white px-3 py-2.5 text-[14px] text-[#1F2937] outline-none focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15 lg:rounded-lg lg:py-2 lg:text-sm lg:shadow-sm lg:focus:border-[#C99237]/50 lg:focus:ring-2 lg:focus:ring-[#C99237]/20";
}

function zohoPrimaryBtnCls() {
  return "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#008CD3] px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 sm:w-auto lg:rounded-xl lg:bg-[#0C123A] lg:hover:bg-[#121a4a]";
}

function zohoSecondaryBtnCls() {
  return "inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-[#E4E7EC] bg-white px-4 py-2.5 text-[14px] font-medium text-[#1F2937] transition active:scale-[0.98] disabled:opacity-50 sm:w-auto lg:rounded-xl lg:border-slate-300 lg:hover:bg-slate-50";
}

function waPrimaryBtnCls() {
  return zohoPrimaryBtnCls();
}

function waSecondaryBtnCls() {
  return zohoSecondaryBtnCls();
}

function waExitStatusChip(status: string | null | undefined) {
  const s = String(status ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  if (s === "in_progress") return "bg-[#E3F2FD] text-[#1565C0]";
  if (s === "pending") return "bg-[#FFF8E1] text-[#8D6E00]";
  if (s === "rejected") return "bg-[#FFECEC] text-[#C62828]";
  if (s === "approved" || s === "handover_completed")
    return "bg-[#E7FCE3] text-[#0B5E44]";
  return "bg-[#F0F2F5] text-[#54656F]";
}

export default function TeamMemberExitProcessReportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 bg-[#F5F7FA] text-[#6B7280]">
          <Loader2 className="h-8 w-8 animate-spin text-[#008CD3]" />
          <p className="text-sm">Loading exit process report…</p>
        </div>
      }
    >
      <TeamMemberExitProcessReportPageContent />
    </Suspense>
  );
}

function TeamMemberExitProcessReportPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orgId = String(params?.org_id ?? "");
  const userIdParam =
    searchParams.get("user_id") || String(params?.user_id ?? "");

  const [data, setData] = useState<TeamMemberExitProcessReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [handoverFormOpen, setHandoverFormOpen] = useState(false);
  const [handoverTaskName, setHandoverTaskName] = useState("");
  const [handoverDateLocal, setHandoverDateLocal] = useState("");
  const [handoverRemarks, setHandoverRemarks] = useState("");
  const [handoverSubmitting, setHandoverSubmitting] = useState(false);
  const [handoverFormError, setHandoverFormError] = useState<string | null>(null);

  const [editingHandoverId, setEditingHandoverId] = useState<number | null>(
    null,
  );
  const [handoverEditTaskName, setHandoverEditTaskName] = useState("");
  const [handoverEditDateLocal, setHandoverEditDateLocal] = useState("");
  const [handoverEditRemarks, setHandoverEditRemarks] = useState("");
  const [handoverEditSaving, setHandoverEditSaving] = useState(false);
  const [handoverEditError, setHandoverEditError] = useState<string | null>(
    null,
  );

  const [statusPanelHandoverId, setStatusPanelHandoverId] = useState<
    number | null
  >(null);
  const [statusSelectValue, setStatusSelectValue] =
    useState<EmployeeExitHandoverStatus>("pending");
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusApplyError, setStatusApplyError] = useState<string | null>(
    null,
  );

  const [custodyHandoverAssets, setCustodyHandoverAssets] = useState<
    EmployeeHandoverAssetApiRow[]
  >([]);
  const [custodyHandoverLoading, setCustodyHandoverLoading] = useState(false);
  const [custodyHandoverError, setCustodyHandoverError] = useState<
    string | null
  >(null);

  const [custodyAssetPatchingId, setCustodyAssetPatchingId] = useState<
    number | null
  >(null);
  const [custodyAssetPatchErrorById, setCustodyAssetPatchErrorById] = useState<
    Record<number, string>
  >({});

  const [mobileMainTab, setMobileMainTab] = useState<
    "employee" | "timeline" | "assets" | "handover"
  >("employee");
  const [employeeUserImage, setEmployeeUserImage] = useState<string | null>(null);
  const [photoZoom, setPhotoZoom] = useState<{
    imageUrl: string;
    alt: string;
  } | null>(null);

  const teamGroupHref =
    `/dashboard/${orgId}/organization-employees/team-group`;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Sign in required.");
        setData(null);
        return;
      }
      const orgIdNum = Number(orgId);
      if (!orgId || Number.isNaN(orgIdNum) || !userIdParam.trim()) {
        setError("Invalid organization or employee.");
        setData(null);
        return;
      }
      const [report, users] = await Promise.all([
        fetchTeamMemberExitProcessReport(token, orgIdNum, userIdParam.trim()),
        getAllOrgUsers(token).catch(() => []),
      ]);
      setData(report);
      const empId = Number(report.exit_process.employee_id);
      const match = users.find((u) => Number(u.id) === empId);
      setEmployeeUserImage(
        profileImageUrlFromRow((match as { user_image?: unknown } | undefined)?.user_image),
      );
    } catch (e) {
      setData(null);
      setEmployeeUserImage(null);
      setError(e instanceof Error ? e.message : "Could not load report.");
    } finally {
      setLoading(false);
    }
  }, [orgId, userIdParam]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const exitProcess = data?.exit_process;
    if (
      exitProcess?.employee_id == null ||
      exitProcess.exit_process_id == null ||
      !orgId.trim()
    ) {
      setCustodyHandoverAssets([]);
      setCustodyHandoverError(null);
      setCustodyHandoverLoading(false);
      return;
    }
    const orgIdNum = Number(orgId);
    if (Number.isNaN(orgIdNum)) {
      setCustodyHandoverAssets([]);
      setCustodyHandoverLoading(false);
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setCustodyHandoverAssets([]);
      setCustodyHandoverLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setCustodyHandoverLoading(true);
      setCustodyHandoverError(null);
      try {
        const res = await fetchAssetsForHandoverOfEmployee(
          token,
          orgIdNum,
          exitProcess.employee_id,
          { exit_process_id: exitProcess.exit_process_id },
        );
        if (!cancelled) {
          setCustodyHandoverAssets(res.data ?? []);
        }
      } catch (e) {
        if (!cancelled) {
          setCustodyHandoverAssets([]);
          setCustodyHandoverError(
            e instanceof Error
              ? e.message
              : "Could not load your handover assets.",
          );
        }
      } finally {
        if (!cancelled) {
          setCustodyHandoverLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [data?.exit_process, orgId]);

  const ep: TeamMemberExitReportProcess | null = data?.exit_process ?? null;
  const hq: TeamMemberExitReportHandoverRow[] = data?.handover_queries ?? [];

  async function patchCustodyAssetReturned(
    assetId: number,
    nextIsReturned: boolean,
  ): Promise<void> {
    const exitProcess = data?.exit_process;
    if (
      exitProcess?.employee_id == null ||
      exitProcess.exit_process_id == null
    )
      return;
    const token = localStorage.getItem("token");
    const orgIdNum = Number(orgId);
    if (!token || Number.isNaN(orgIdNum)) return;

    setCustodyAssetPatchErrorById((prev) => {
      const copy = { ...prev };
      delete copy[assetId];
      return copy;
    });

    setCustodyAssetPatchingId(assetId);
    try {
      await updateAssetHandoverReturnedStatus(
        token,
        orgIdNum,
        assetId,
        nextIsReturned,
      );
      const refreshed = await fetchAssetsForHandoverOfEmployee(
        token,
        orgIdNum,
        exitProcess.employee_id,
        { exit_process_id: exitProcess.exit_process_id },
      );
      setCustodyHandoverAssets(refreshed.data ?? []);
    } catch (e) {
      setCustodyAssetPatchErrorById((prev) => ({
        ...prev,
        [assetId]:
          e instanceof Error
            ? e.message
            : "Could not update return status.",
      }));
    } finally {
      setCustodyAssetPatchingId(null);
    }
  }

  const submitHandoverQuery = async () => {
    if (!ep) return;
    const name = handoverTaskName.trim();
    if (!name) {
      setHandoverFormError("Enter a task or item name.");
      return;
    }
    if (name.length > 250) {
      setHandoverFormError("Task name must be 250 characters or less.");
      return;
    }
    if (!handoverDateLocal.trim()) {
      setHandoverFormError("Choose a handover date and time.");
      return;
    }
    const handover_date = datetimeLocalToSqlDatetime(handoverDateLocal);
    if (!handover_date) {
      setHandoverFormError("Handover date is invalid.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setHandoverFormError("Sign in required.");
      return;
    }
    const orgIdNum = Number(orgId);
    if (!orgId || Number.isNaN(orgIdNum)) {
      setHandoverFormError("Invalid organization.");
      return;
    }
    setHandoverFormError(null);
    setHandoverSubmitting(true);
    try {
      await createEmployeeExitProcessHandoverQuery(token, {
        org_id: orgIdNum,
        employee_exit_process_id: ep.exit_process_id,
        employee_id: ep.employee_id,
        team_id: ep.team_id ?? null,
        custom_task_name: name,
        remarks: handoverRemarks.trim() || null,
        handover_date,
      });
      setHandoverTaskName("");
      setHandoverDateLocal("");
      setHandoverRemarks("");
      setHandoverFormOpen(false);
      await load();
    } catch (e) {
      setHandoverFormError(
        e instanceof Error ? e.message : "Could not create handover query.",
      );
    } finally {
      setHandoverSubmitting(false);
    }
  };

  const openHandoverEdit = (h: TeamMemberExitReportHandoverRow) => {
    if (h.handover_query_id == null) return;
    setStatusPanelHandoverId(null);
    setStatusApplyError(null);
    setEditingHandoverId(h.handover_query_id);
    setHandoverEditError(null);
    setHandoverEditTaskName(h.custom_task_name?.trim() ?? "");
    setHandoverEditRemarks(h.remarks ?? "");
    setHandoverEditDateLocal(sqlDatetimeToDatetimeLocal(h.handover_date));
  };

  const cancelHandoverEdit = () => {
    setEditingHandoverId(null);
    setHandoverEditError(null);
  };

  const submitHandoverEditSave = async () => {
    if (!ep || editingHandoverId == null) return;
    const name = handoverEditTaskName.trim();
    if (!name) {
      setHandoverEditError("Enter a task or item name.");
      return;
    }
    if (name.length > 250) {
      setHandoverEditError("Task name must be 250 characters or less.");
      return;
    }
    if (handoverEditRemarks.length > 1000) {
      setHandoverEditError("Remarks must be 1000 characters or less.");
      return;
    }
    if (!handoverEditDateLocal.trim()) {
      setHandoverEditError("Choose a handover date and time.");
      return;
    }
    const handover_date = datetimeLocalToSqlDatetime(handoverEditDateLocal);
    if (!handover_date) {
      setHandoverEditError("Handover date is invalid.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setHandoverEditError("Sign in required.");
      return;
    }
    const orgIdNum = Number(orgId);
    if (!orgId || Number.isNaN(orgIdNum)) {
      setHandoverEditError("Invalid organization.");
      return;
    }
    setHandoverEditError(null);
    setHandoverEditSaving(true);
    try {
      await updateEmployeeExitProcessHandoverQuery(
        token,
        orgIdNum,
        ep.exit_process_id,
        ep.employee_id,
        editingHandoverId,
        {
          custom_task_name: name,
          remarks: handoverEditRemarks.trim() || null,
          handover_date,
        },
      );
      setEditingHandoverId(null);
      await load();
    } catch (e) {
      setHandoverEditError(
        e instanceof Error ? e.message : "Could not update handover query.",
      );
    } finally {
      setHandoverEditSaving(false);
    }
  };

  const toggleStatusPanel = (h: TeamMemberExitReportHandoverRow) => {
    if (h.handover_query_id == null) return;
    if (statusPanelHandoverId === h.handover_query_id) {
      setStatusPanelHandoverId(null);
      setStatusApplyError(null);
      return;
    }
    setEditingHandoverId(null);
    setHandoverEditError(null);
    setStatusApplyError(null);
    setStatusPanelHandoverId(h.handover_query_id);
    const cur = String(h.handover_status ?? "pending").toLowerCase();
    const next =
      HANDOVER_STATUS_OPTIONS.find((opt) => opt === cur) ?? "pending";
    setStatusSelectValue(next);
  };

  const submitStatusUpdateForHandover = async (
    h: TeamMemberExitReportHandoverRow,
  ) => {
    if (!ep || h.handover_query_id == null) return;
    const token = localStorage.getItem("token");
    if (!token) {
      setStatusApplyError("Sign in required.");
      return;
    }
    const orgIdNum = Number(orgId);
    if (!orgId || Number.isNaN(orgIdNum)) {
      setStatusApplyError("Invalid organization.");
      return;
    }
    setStatusApplyError(null);
    setStatusSaving(true);
    try {
      await updateEmployeeExitProcessHandoverQuery(
        token,
        orgIdNum,
        ep.exit_process_id,
        ep.employee_id,
        h.handover_query_id,
        { handover_status: statusSelectValue },
      );
      setStatusPanelHandoverId(null);
      await load();
    } catch (e) {
      setStatusApplyError(
        e instanceof Error ? e.message : "Could not update status.",
      );
    } finally {
      setStatusSaving(false);
    }
  };

  const openPhotoZoom = (imageUrl: string, alt: string) => {
    setPhotoZoom({ imageUrl, alt });
  };

  return (
    <div className="min-h-full bg-[#F5F7FA] lg:bg-[#f4f6f9] lg:pb-20">
      {/* Mobile: Zoho-style header */}
      <div className="sticky top-0 z-20 border-b border-[#E4E7EC] bg-white/95 shadow-sm backdrop-blur lg:hidden">
        <div className="bg-gradient-to-r from-[#008CD3] via-[#007EBF] to-[#0070AA] px-3 pb-3 pt-2.5 text-white">
          <div className="flex items-center gap-2">
            <Link
              href={teamGroupHref}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 active:bg-white/25"
              aria-label="Back to team group"
            >
              <ArrowLeft className="h-[18px] w-[18px]" />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/75">
                Exit report
              </p>
              <h1 className="truncate text-[16px] font-bold leading-tight">
                {loading ? "Loading…" : ep?.employee_name ?? "Exit report"}
              </h1>
              <p className="truncate text-[12px] text-white/80">
                {ep?.team_name ?? "Exit process report"}
                {employeeUserImage ? " · tap photo to enlarge" : ""}
              </p>
            </div>
            {ep?.application_status ? (
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${waExitStatusChip(ep.application_status)}`}
              >
                {String(ep.application_status).replace(/_/g, " ")}
              </span>
            ) : null}
          </div>
        </div>
        <div className="bg-white px-3 pb-2.5 pt-2">
          <div className="flex rounded-lg bg-[#F5F7FA] p-0.5">
            {(
              [
                { id: "employee" as const, label: "Employee" },
                { id: "timeline" as const, label: "Timeline" },
                {
                  id: "assets" as const,
                  label: "Assets",
                  badge: custodyHandoverAssets.length,
                },
                {
                  id: "handover" as const,
                  label: "Tasks",
                  badge: hq.length,
                },
              ] as const
            ).map((tab) => (
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
                {"badge" in tab && tab.badge > 0 ? (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#008CD3]/15 px-1 text-[9px] font-bold text-[#008CD3]">
                    {tab.badge > 9 ? "9+" : tab.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop header */}
      <div className="hidden lg:block">
      <div className="relative isolate overflow-hidden bg-[#0C123A] px-4 pb-12 pt-8 sm:px-8">
        <div className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-[#C99237]/15 blur-[100px]" />
        <div className="relative mx-auto max-w-4xl">
          <Link
            href={teamGroupHref}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#f5e9d4] transition hover:bg-white/15"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to team group
          </Link>
          <div className="mt-8 flex gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#C99237]/20 text-[#C99237] ring-1 ring-[#C99237]/35">
              <ShieldAlert className="h-7 w-7" aria-hidden />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C99237]/90">
                Exit process report
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {loading ? "Loading…" : ep?.employee_name ?? "Employee exit"}
              </h1>
              {ep?.employee_email ? (
                <p className="mt-2 text-sm text-slate-300">{ep.employee_email}</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      </div>

      <div className="relative z-10 mx-auto max-w-4xl lg:px-4 lg:sm:px-8">
        <div className="space-y-0 lg:-mt-8 lg:space-y-6">
          {error ? (
            <div className="mx-3 mt-3 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-4 py-8 text-center text-[13px] text-[#D93025] lg:mx-0 lg:rounded-[22px] lg:border lg:border-rose-200 lg:bg-white lg:px-6 lg:py-10 lg:text-rose-800 lg:shadow-lg lg:ring-1 lg:ring-slate-950/[0.04]">
              <p>{error}</p>
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => void load()}
                  className={waPrimaryBtnCls()}
                >
                  Retry
                </button>
              </div>
            </div>
          ) : null}

          {loading && !error ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 py-16 text-[#6B7280] lg:min-h-0 lg:rounded-[22px] lg:border lg:border-slate-200 lg:bg-white lg:py-0 lg:shadow-lg lg:ring-1 lg:ring-slate-950/[0.04]">
              <Loader2 className="h-9 w-9 animate-spin text-[#008CD3] lg:text-[#C99237]" />
              <p className="text-[13px] lg:text-sm lg:text-slate-600">Loading exit report…</p>
            </div>
          ) : null}

          {!loading && ep ? (
            <>
              {/* Mobile tab panels */}
              <div className="lg:hidden">
                {mobileMainTab === "employee" ? (
                  <div className="space-y-2 p-3">
                    <section className="overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-sm">
                      <div className="flex items-center gap-3 border-b border-[#EEF2F6] px-3 py-3">
                        <UserAvatarButton
                          name={ep.employee_name}
                          userImage={employeeUserImage}
                          size="lg"
                          onZoom={openPhotoZoom}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-semibold text-[#1F2937]">
                            {ep.employee_name ?? "—"}
                          </p>
                          <p className="truncate text-[12px] text-[#6B7280]">
                            {ep.employee_email ?? "—"}
                          </p>
                          <span
                            className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${waExitStatusChip(ep.application_status)}`}
                          >
                            {String(ep.application_status ?? "—").replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>
                      {[
                        { label: "Team", value: ep.team_name ?? `Team #${ep.team_id ?? "—"}` },
                        { label: "Phone", value: ep.employee_phone ?? "—" },
                        { label: "Team joining", value: fmtDateOnly(ep.team_joining_date) },
                        {
                          label: "Employee · Exit ID",
                          value: `${String(ep.employee_id)} · ${String(ep.exit_process_id)}`,
                        },
                      ].map((row) => (
                        <div
                          key={row.label}
                          className="flex items-center justify-between gap-3 border-b border-[#EEF2F6] px-3 py-2.5 last:border-b-0"
                        >
                          <p className={mobileLabelCls}>{row.label}</p>
                          <p className="max-w-[58%] truncate text-right text-[13px] font-semibold text-[#1F2937]">
                            {row.value}
                          </p>
                        </div>
                      ))}
                    </section>
                  </div>
                ) : null}

                {mobileMainTab === "timeline" ? (
                  <div className="space-y-2 p-3">
                    <section className="overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-sm">
                      {[
                        { label: "Action type", value: ep.action_type ?? "—", cap: true },
                        { label: "Last working day", value: fmtDateOnly(ep.last_working_day) },
                        { label: "Exit date", value: fmtDateOnly(ep.exit_date) },
                        { label: "Created", value: fmtLong(ep.created_at) },
                        { label: "Resolved", value: fmtLong(ep.resolved_at) },
                      ].map((row) => (
                        <div
                          key={row.label}
                          className="flex flex-col gap-0.5 border-b border-[#EEF2F6] px-3 py-2.5 last:border-b-0"
                        >
                          <span className={mobileLabelCls}>{row.label}</span>
                          <span
                            className={`text-[13px] font-semibold text-[#1F2937] ${"cap" in row && row.cap ? "capitalize" : ""}`}
                          >
                            {row.value}
                          </span>
                        </div>
                      ))}
                    </section>
                    <section className="overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-sm">
                      <div className="border-b border-[#EEF2F6] bg-[#F9FAFB] px-3 py-2">
                        <p className={mobileLabelCls}>Reason / context</p>
                      </div>
                      <p className="px-3 py-3 text-[13px] leading-relaxed text-[#1F2937]">
                        {ep.action_reason?.trim() || "—"}
                      </p>
                    </section>
                    {ep.response_message?.trim() ? (
                      <section className="overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-sm">
                        <div className="border-b border-[#EEF2F6] bg-[#F9FAFB] px-3 py-2">
                          <p className={mobileLabelCls}>Response</p>
                        </div>
                        <p className="px-3 py-3 text-[13px] leading-relaxed text-[#1F2937]">
                          {ep.response_message}
                        </p>
                      </section>
                    ) : null}
                  </div>
                ) : null}

                {mobileMainTab === "assets" ? (
                  <div className="space-y-2 p-3">
                    <p className={`px-1 ${mobileLabelCls}`}>
                      Assets for your handover ({custodyHandoverAssets.length})
                    </p>
                    {custodyHandoverLoading ? (
                      <div className="flex flex-col items-center gap-2 rounded-lg border border-[#E4E7EC] bg-white py-12 text-[#6B7280] shadow-sm">
                        <Loader2 className="h-8 w-8 animate-spin text-[#008CD3]" />
                        <p className="text-[13px]">Loading assets…</p>
                      </div>
                    ) : custodyHandoverError ? (
                      <p className="rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2.5 text-[12px] text-[#D93025]">
                        {custodyHandoverError}
                      </p>
                    ) : custodyHandoverAssets.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-[#E4E7EC] bg-white px-4 py-10 text-center text-[13px] text-[#6B7280]">
                        No assets assigned to you for this exit yet.
                      </p>
                    ) : (
                      <ul className="overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-sm">
                        {custodyHandoverAssets.map((row) => {
                          const rowReturned = truthyReturned(row.is_returned);
                          return (
                            <li
                              key={row.id}
                              className="border-b border-[#EEF2F6] px-3 py-2.5 last:border-b-0"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-[13px] font-semibold text-[#1F2937]">
                                  {row.asset_name?.trim() ? row.asset_name : `#${row.id}`}
                                </p>
                                <span
                                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                    rowReturned
                                      ? "bg-[#E7FCE3] text-[#0B5E44]"
                                      : "bg-[#E3F2FD] text-[#1565C0]"
                                  }`}
                                >
                                  {rowReturned ? "Returned" : "Outstanding"}
                                </span>
                              </div>
                              {row.asset_summary?.trim() ? (
                                <p className={`mt-1 ${mobileCaptionCls}`}>
                                  {row.asset_summary}
                                </p>
                              ) : null}
                              <div className="mt-2.5 flex gap-2">
                                <button
                                  type="button"
                                  disabled={
                                    custodyAssetPatchingId === row.id || rowReturned
                                  }
                                  onClick={() => void patchCustodyAssetReturned(row.id, true)}
                                  className="flex-1 rounded-md bg-[#008CD3] py-2 text-[12px] font-semibold text-white disabled:opacity-50"
                                >
                                  Returned
                                </button>
                                <button
                                  type="button"
                                  disabled={
                                    custodyAssetPatchingId === row.id || !rowReturned
                                  }
                                  onClick={() => void patchCustodyAssetReturned(row.id, false)}
                                  className="flex-1 rounded-md border border-[#E4E7EC] py-2 text-[12px] font-semibold text-[#6B7280] disabled:opacity-50"
                                >
                                  Not returned
                                </button>
                              </div>
                              {custodyAssetPatchErrorById[row.id] ? (
                                <p className="mt-2 text-[11px] text-[#C62828]">
                                  {custodyAssetPatchErrorById[row.id]}
                                </p>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                ) : null}

                {mobileMainTab === "handover" ? (
                  <div className="space-y-2 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] font-semibold text-[#1F2937]">
                        Handover tasks ({hq.length})
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setHandoverFormOpen((o) => !o);
                          setHandoverFormError(null);
                          setEditingHandoverId(null);
                          setStatusPanelHandoverId(null);
                          setStatusApplyError(null);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#008CD3] px-3 py-2 text-[12px] font-semibold text-white shadow-sm active:scale-[0.98]"
                      >
                        <Plus className="h-4 w-4" />
                        {handoverFormOpen ? "Cancel" : "Add"}
                      </button>
                    </div>
                    {handoverFormOpen ? (
                      <div className="rounded-lg border border-[#E4E7EC] bg-white px-3 py-3 shadow-sm">
                        <label className="block text-[12px] font-semibold text-[#6B7280]">
                          Task name *
                        </label>
                        <input
                          type="text"
                          value={handoverTaskName}
                          maxLength={250}
                          onChange={(ev) => setHandoverTaskName(ev.target.value)}
                          placeholder="e.g. Return laptop"
                          className={waFieldCls()}
                        />
                        <label className="mt-3 block text-[12px] font-semibold text-[#6B7280]">
                          Handover date *
                        </label>
                        <input
                          type="datetime-local"
                          value={handoverDateLocal}
                          onChange={(ev) => setHandoverDateLocal(ev.target.value)}
                          className={waFieldCls()}
                        />
                        <label className="mt-3 block text-[12px] font-semibold text-[#6B7280]">
                          Remarks
                        </label>
                        <textarea
                          value={handoverRemarks}
                          rows={3}
                          onChange={(ev) => setHandoverRemarks(ev.target.value)}
                          className={waFieldCls()}
                        />
                        {handoverFormError ? (
                          <p className="mt-2 text-[12px] text-[#C62828]">{handoverFormError}</p>
                        ) : null}
                        <button
                          type="button"
                          disabled={handoverSubmitting}
                          onClick={() => void submitHandoverQuery()}
                          className={`mt-4 w-full ${waPrimaryBtnCls()}`}
                        >
                          {handoverSubmitting ? "Saving…" : "Create handover query"}
                        </button>
                      </div>
                    ) : null}
                    <ul className="overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-sm">
                      {hq.length === 0 ? (
                        <li className="px-4 py-10 text-center text-[13px] text-[#6B7280]">
                          No handover tasks yet.
                        </li>
                      ) : (
                        hq.map((h, idx) => {
                          const key =
                            h.handover_query_id != null
                              ? h.handover_query_id
                              : `hq-${idx}`;
                          const canAct = h.handover_query_id != null;
                          const isEditing =
                            canAct && editingHandoverId === h.handover_query_id;
                          const statusOpen =
                            canAct && statusPanelHandoverId === h.handover_query_id;
                          const title =
                            h.custom_task_name?.trim() ||
                            (h.asset_id != null
                              ? `Asset #${h.asset_id}`
                              : `Task #${h.handover_query_id ?? idx + 1}`);

                          if (isEditing) {
                            return (
                              <li key={key} className="border-b border-[#EEF2F6] bg-[#F9FAFB] px-3 py-3 last:border-b-0">
                                <input
                                  type="text"
                                  value={handoverEditTaskName}
                                  onChange={(ev) =>
                                    setHandoverEditTaskName(ev.target.value)
                                  }
                                  className={waFieldCls()}
                                />
                                <input
                                  type="datetime-local"
                                  value={handoverEditDateLocal}
                                  onChange={(ev) =>
                                    setHandoverEditDateLocal(ev.target.value)
                                  }
                                  className={`mt-2 ${waFieldCls()}`}
                                />
                                <textarea
                                  value={handoverEditRemarks}
                                  rows={2}
                                  onChange={(ev) =>
                                    setHandoverEditRemarks(ev.target.value)
                                  }
                                  className={`mt-2 ${waFieldCls()}`}
                                />
                                {handoverEditError ? (
                                  <p className="mt-2 text-[13px] text-[#C62828]">
                                    {handoverEditError}
                                  </p>
                                ) : null}
                                <div className="mt-3 flex gap-2">
                                  <button
                                    type="button"
                                    disabled={handoverEditSaving}
                                    onClick={() => void submitHandoverEditSave()}
                                    className={waPrimaryBtnCls()}
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    disabled={handoverEditSaving}
                                    onClick={cancelHandoverEdit}
                                    className={waSecondaryBtnCls()}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </li>
                            );
                          }

                          return (
                            <li key={key} className="border-b border-[#EEF2F6] px-3 py-2.5 last:border-b-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="min-w-0 flex-1 text-[13px] font-semibold text-[#1F2937]">
                                  {title}
                                </p>
                                {h.handover_status ? (
                                  <span className="shrink-0 rounded-full bg-[#F5F7FA] px-2 py-0.5 text-[10px] font-semibold uppercase text-[#6B7280]">
                                    {String(h.handover_status).replace(/_/g, " ")}
                                  </span>
                                ) : null}
                              </div>
                              <p className={`mt-0.5 ${mobileCaptionCls}`}>
                                Due {fmtDateOnly(h.handover_date)}
                              </p>
                              {h.remarks?.trim() ? (
                                <p className="mt-1 text-[12px] text-[#1F2937]">{h.remarks}</p>
                              ) : null}
                              {canAct ? (
                                <div className="mt-2.5 flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => openHandoverEdit(h)}
                                    className="rounded-md border border-[#E4E7EC] px-3 py-1.5 text-[12px] font-semibold text-[#008CD3]"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toggleStatusPanel(h)}
                                    className="rounded-md border border-[#E4E7EC] px-3 py-1.5 text-[12px] font-semibold text-[#008CD3]"
                                  >
                                    Status
                                  </button>
                                </div>
                              ) : null}
                              {statusOpen && canAct ? (
                                <div className="mt-2.5 rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] p-3">
                                  <select
                                    value={statusSelectValue}
                                    onChange={(ev) =>
                                      setStatusSelectValue(
                                        ev.target.value as EmployeeExitHandoverStatus,
                                      )
                                    }
                                    className={waFieldCls()}
                                  >
                                    {HANDOVER_STATUS_OPTIONS.map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt.replace(/_/g, " ")}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    disabled={statusSaving}
                                    onClick={() => void submitStatusUpdateForHandover(h)}
                                    className={`mt-2 w-full ${waPrimaryBtnCls()}`}
                                  >
                                    {statusSaving ? "Saving…" : "Apply status"}
                                  </button>
                                  {statusApplyError ? (
                                    <p className="mt-2 text-[12px] text-[#C62828]">
                                      {statusApplyError}
                                    </p>
                                  ) : null}
                                </div>
                              ) : null}
                            </li>
                          );
                        })
                      )}
                    </ul>
                  </div>
                ) : null}
              </div>

              {/* Desktop sections (unchanged) */}
              <div className="hidden space-y-6 lg:block">
              <section className="overflow-hidden rounded-[22px] border border-slate-200/90 bg-white shadow-[0_12px_40px_-12px_rgba(15,23,42,0.12)] ring-1 ring-slate-950/[0.04]">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/90 px-5 py-4 sm:px-6">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-[#0C123A]">
                    <UserRound className="h-4 w-4 text-[#C99237]" />
                    Employee
                  </h2>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ${exitApplicationPill(ep.application_status)}`}>
                    {String(ep.application_status ?? "—").replace(/_/g, " ")}
                  </span>
                </header>
                <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-start sm:p-6">
                  <UserAvatarButton
                    name={ep.employee_name}
                    userImage={employeeUserImage}
                    size="lg"
                    onZoom={openPhotoZoom}
                  />
                  <dl className="grid min-w-0 flex-1 gap-4 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Full name
                      </dt>
                      <dd className="mt-1 font-semibold text-slate-900">
                        {ep.employee_name ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <Building2 className="h-3 w-3" />
                        Team
                      </dt>
                      <dd className="mt-1 text-slate-900">
                        {ep.team_name ?? `Team #${ep.team_id ?? "—"}`}
                      </dd>
                    </div>
                    <div>
                      <dt className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <Mail className="h-3 w-3" />
                        Email
                      </dt>
                      <dd className="mt-1 break-all text-slate-800">
                        {ep.employee_email ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <Phone className="h-3 w-3" />
                        Phone
                      </dt>
                      <dd className="mt-1 text-slate-800">{ep.employee_phone ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <CalendarDays className="h-3 w-3" />
                        Team joining
                      </dt>
                      <dd className="mt-1 text-slate-800">
                        {fmtDateOnly(ep.team_joining_date)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Employee ID · Exit process ID
                      </dt>
                      <dd className="mt-1 font-mono text-xs text-slate-700">
                        {String(ep.employee_id)} · {String(ep.exit_process_id)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </section>

              <section className="overflow-hidden rounded-[22px] border border-slate-200/90 bg-white shadow-[0_12px_40px_-12px_rgba(15,23,42,0.12)] ring-1 ring-slate-950/[0.04]">
                <header className="border-b border-slate-100 bg-slate-50/90 px-5 py-4 sm:px-6">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-[#0C123A]">
                    <ClipboardList className="h-4 w-4 text-[#C99237]" />
                    Exit timeline
                  </h2>
                </header>
                <div className="space-y-4 p-5 sm:p-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <dl className="space-y-1 text-sm">
                      <dt className="text-xs font-semibold uppercase text-slate-500">
                        Action type
                      </dt>
                      <dd className="capitalize text-slate-900">{ep.action_type ?? "—"}</dd>
                    </dl>
                    <dl className="space-y-1 text-sm">
                      <dt className="text-xs font-semibold uppercase text-slate-500">
                        Last working day · Exit date
                      </dt>
                      <dd className="text-slate-900">
                        {fmtDateOnly(ep.last_working_day)} · {fmtDateOnly(ep.exit_date)}
                      </dd>
                    </dl>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Reason / context
                    </dt>
                    <dd className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                      {ep.action_reason?.trim() || "—"}
                    </dd>
                  </div>
                  {ep.response_message?.trim() ? (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                      <p className="text-xs font-semibold uppercase text-slate-500">
                        Response message
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                        {ep.response_message}
                      </p>
                    </div>
                  ) : null}
                  <dl className="grid gap-4 border-t border-slate-100 pt-4 text-xs text-slate-600 sm:grid-cols-2">
                    <div>
                      <dt className="font-semibold uppercase text-slate-500">Created</dt>
                      <dd className="mt-1">{fmtLong(ep.created_at)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold uppercase text-slate-500">Resolved</dt>
                      <dd className="mt-1">{fmtLong(ep.resolved_at)}</dd>
                    </div>
                  </dl>
                </div>
              </section>

              <section className="overflow-hidden rounded-[22px] border border-slate-200/90 bg-white shadow-[0_12px_40px_-12px_rgba(15,23,42,0.12)] ring-1 ring-slate-950/[0.04]">
                <header className="border-b border-slate-100 bg-slate-50/90 px-5 py-4 sm:px-6">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-[#0C123A]">
                    <Inbox className="h-4 w-4 text-violet-600" aria-hidden />
                    Assets for your handover
                    {!custodyHandoverLoading ? (
                      <span className="font-normal text-slate-500">
                        ({custodyHandoverAssets.length})
                      </span>
                    ) : null}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Assets from this exit where{" "}
                    <span className="font-semibold text-slate-700">
                      {ep.employee_name ?? `Employee #${ep.employee_id}`}
                    </span>{" "}
                    is listed as handing items to{" "}
                    <span className="font-semibold text-slate-700">you</span> for
                    this exit process. They update when custody is assigned to you from the
                    team exit workspace for this employee.
                  </p>
                </header>
                <div className="p-4 sm:p-6">
                  {custodyHandoverLoading ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-10 text-sm text-slate-600">
                      <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                      Loading assets assigned to you…
                    </div>
                  ) : custodyHandoverError ? (
                    <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                      {custodyHandoverError}
                    </p>
                  ) : custodyHandoverAssets.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-500">
                      No assets show you as the handover recipient for this exit yet. When
                      someone assigns custody to your account from the exit workspace,
                      revisit this report to see them listed.
                    </p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {custodyHandoverAssets.map((row) => {
                        const rowReturned = truthyReturned(row.is_returned);
                        return (
                          <li key={row.id} className="py-4 first:pt-0 last:pb-0">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <p className="font-semibold text-[#0C123A]">
                                {row.asset_name?.trim()
                                  ? row.asset_name
                                  : `#${row.id}`}
                              </p>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${
                                  rowReturned
                                    ? "bg-emerald-50 text-emerald-800 ring-emerald-200/80"
                                    : "bg-violet-50 text-violet-800 ring-violet-200/80"
                                }`}
                              >
                                {rowReturned ? "Returned" : "Outstanding"}
                              </span>
                            </div>
                            {row.asset_summary?.trim() ? (
                              <p className="mt-1 text-xs text-slate-600">
                                {row.asset_summary}
                              </p>
                            ) : null}
                            <dl className="mt-3 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
                              <div>
                                Type:{" "}
                                <span className="font-medium text-slate-800">
                                  {row.asset_type ?? "—"}
                                </span>
                              </div>
                              <div>
                                Asset status:{" "}
                                <span className="font-medium capitalize text-slate-800">
                                  {row.asset_status ?? "—"}
                                </span>
                              </div>
                              <div className="sm:col-span-2">
                                Handover logged:{" "}
                                <span className="font-medium text-slate-800">
                                  {fmtLong(row.handover_date_time)}
                                </span>
                              </div>
                            </dl>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={
                                  custodyAssetPatchingId === row.id ||
                                  rowReturned === true
                                }
                                onClick={() =>
                                  void patchCustodyAssetReturned(row.id, true)
                                }
                                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-[11px] font-semibold text-emerald-900 shadow-sm transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-initial sm:min-w-[10rem]"
                              >
                                {custodyAssetPatchingId === row.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <CircleCheck className="h-3.5 w-3.5 shrink-0" />
                                )}
                                Returned successfully
                              </button>
                              <button
                                type="button"
                                disabled={
                                  custodyAssetPatchingId === row.id ||
                                  rowReturned === false
                                }
                                onClick={() =>
                                  void patchCustodyAssetReturned(row.id, false)
                                }
                                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-initial sm:min-w-[10rem]"
                              >
                                {custodyAssetPatchingId === row.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <CircleX className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                                )}
                                Not returned
                              </button>
                            </div>
                            {custodyAssetPatchErrorById[row.id] ? (
                              <p className="mt-2 text-xs font-medium text-rose-600">
                                {custodyAssetPatchErrorById[row.id]}
                              </p>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </section>

              <section className="overflow-hidden rounded-[22px] border border-slate-200/90 bg-white shadow-[0_12px_40px_-12px_rgba(15,23,42,0.12)] ring-1 ring-slate-950/[0.04]">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/90 px-5 py-4 sm:px-6">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-teal-600" />
                    <h2 className="text-base font-semibold text-[#0C123A]">
                      Handover tasks ({hq.length})
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setHandoverFormOpen((o) => !o);
                      setHandoverFormError(null);
                      setEditingHandoverId(null);
                      setStatusPanelHandoverId(null);
                      setStatusApplyError(null);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-white px-3 py-2 text-xs font-semibold text-teal-800 shadow-sm transition hover:bg-teal-50"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    {handoverFormOpen ? "Cancel" : "Add handover query"}
                  </button>
                </header>
                <div className="p-4 sm:p-6">
                  {handoverFormOpen ? (
                    <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                      <p className="text-xs text-slate-600">
                        New items are saved with status{" "}
                        <span className="font-semibold text-slate-800">pending</span>.
                      </p>
                      <div className="mt-4 space-y-3">
                        <div>
                          <label
                            htmlFor="handover-task-name"
                            className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                          >
                            Task / item name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            id="handover-task-name"
                            type="text"
                            value={handoverTaskName}
                            maxLength={250}
                            onChange={(ev) =>
                              setHandoverTaskName(ev.target.value)
                            }
                            placeholder="e.g. Return laptop · Hand off project folder"
                            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-[#C99237]/0 transition focus:border-[#C99237]/50 focus:ring-2 focus:ring-[#C99237]/20"
                            required
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="handover-date"
                            className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                          >
                            Handover date <span className="text-rose-500">*</span>
                          </label>
                          <input
                            id="handover-date"
                            type="datetime-local"
                            value={handoverDateLocal}
                            onChange={(ev) =>
                              setHandoverDateLocal(ev.target.value)
                            }
                            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-[#C99237]/0 transition focus:border-[#C99237]/50 focus:ring-2 focus:ring-[#C99237]/20"
                            required
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="handover-remarks"
                            className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                          >
                            Remarks{" "}
                            <span className="font-normal normal-case text-slate-400">
                              (optional)
                            </span>
                          </label>
                          <textarea
                            id="handover-remarks"
                            value={handoverRemarks}
                            rows={3}
                            onChange={(ev) =>
                              setHandoverRemarks(ev.target.value)
                            }
                            placeholder="Notes for whoever completes this handover…"
                            className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-[#C99237]/0 transition focus:border-[#C99237]/50 focus:ring-2 focus:ring-[#C99237]/20"
                          />
                        </div>
                      </div>
                      {handoverFormError ? (
                        <p className="mt-3 text-xs font-medium text-rose-600">
                          {handoverFormError}
                        </p>
                      ) : null}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={handoverSubmitting}
                          onClick={() => void submitHandoverQuery()}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#0C123A] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#121a4a] disabled:pointer-events-none disabled:opacity-60"
                        >
                          {handoverSubmitting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Saving…
                            </>
                          ) : (
                            "Create handover query"
                          )}
                        </button>
                      </div>
                    </div>
                  ) : null}
                  <div className="divide-y divide-slate-100">
                  {hq.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500">
                      No handover tasks listed for this report.
                    </p>
                  ) : (
                    hq.map((h, idx) => {
                      const key =
                        h.handover_query_id != null
                          ? h.handover_query_id
                          : `hq-placeholder-${idx}`;
                      const canAct = h.handover_query_id != null;
                      const isEditing =
                        canAct && editingHandoverId === h.handover_query_id;
                      const statusOpen =
                        canAct && statusPanelHandoverId === h.handover_query_id;

                      return (
                        <div
                          key={key}
                          className="py-4 first:pt-0 last:pb-0"
                        >
                          {isEditing ? (
                            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Edit handover query
                              </p>
                              <div>
                                <label
                                  htmlFor={`edit-task-${h.handover_query_id}`}
                                  className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                                >
                                  Task / item name{" "}
                                  <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  id={`edit-task-${h.handover_query_id}`}
                                  type="text"
                                  value={handoverEditTaskName}
                                  maxLength={250}
                                  onChange={(ev) =>
                                    setHandoverEditTaskName(ev.target.value)
                                  }
                                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-[#C99237]/50 focus:ring-2 focus:ring-[#C99237]/20"
                                />
                              </div>
                              <div>
                                <label
                                  htmlFor={`edit-date-${h.handover_query_id}`}
                                  className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                                >
                                  Handover date{" "}
                                  <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  id={`edit-date-${h.handover_query_id}`}
                                  type="datetime-local"
                                  value={handoverEditDateLocal}
                                  onChange={(ev) =>
                                    setHandoverEditDateLocal(ev.target.value)
                                  }
                                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-[#C99237]/50 focus:ring-2 focus:ring-[#C99237]/20"
                                />
                              </div>
                              <div>
                                <label
                                  htmlFor={`edit-remarks-${h.handover_query_id}`}
                                  className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                                >
                                  Remarks
                                </label>
                                <textarea
                                  id={`edit-remarks-${h.handover_query_id}`}
                                  value={handoverEditRemarks}
                                  rows={3}
                                  maxLength={1000}
                                  onChange={(ev) =>
                                    setHandoverEditRemarks(ev.target.value)
                                  }
                                  className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-[#C99237]/50 focus:ring-2 focus:ring-[#C99237]/20"
                                />
                              </div>
                              {handoverEditError ? (
                                <p className="text-xs font-medium text-rose-600">
                                  {handoverEditError}
                                </p>
                              ) : null}
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  disabled={handoverEditSaving}
                                  onClick={() => void submitHandoverEditSave()}
                                  className="inline-flex items-center gap-2 rounded-xl bg-[#0C123A] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#121a4a] disabled:pointer-events-none disabled:opacity-60"
                                >
                                  {handoverEditSaving ? (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      Saving…
                                    </>
                                  ) : (
                                    "Save changes"
                                  )}
                                </button>
                                <button
                                  type="button"
                                  disabled={handoverEditSaving}
                                  onClick={cancelHandoverEdit}
                                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <p className="min-w-0 flex-1 font-semibold text-[#0C123A]">
                                  {h.custom_task_name?.trim()
                                    ? h.custom_task_name
                                    : h.asset_id != null
                                      ? `Asset #${h.asset_id}`
                                      : `Task #${
                                          h.handover_query_id ?? idx + 1
                                        }`}
                                </p>
                                <div className="flex shrink-0 flex-wrap items-center gap-2">
                                  {canAct ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => openHandoverEdit(h)}
                                        className="inline-flex rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-[#0C123A]"
                                        title="Edit details"
                                      >
                                        <Pencil className="h-4 w-4" aria-hidden />
                                        <span className="sr-only">
                                          Edit handover query
                                        </span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => toggleStatusPanel(h)}
                                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-sm transition ${
                                          statusOpen
                                            ? "border-teal-500 bg-teal-50 text-teal-900"
                                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                        }`}
                                        title="Change handover status"
                                      >
                                        <ListChecks
                                          className="h-3.5 w-3.5 shrink-0"
                                          aria-hidden
                                        />
                                        Status
                                      </button>
                                    </>
                                  ) : null}
                                  {h.handover_status ? (
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-700 ring-1 ring-slate-200">
                                      {String(h.handover_status).replace(
                                        /_/g,
                                        " ",
                                      )}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                              {statusOpen && canAct ? (
                                <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-3">
                                  <label
                                    htmlFor={`hq-status-${h.handover_query_id}`}
                                    className="block text-xs font-semibold uppercase tracking-wide text-teal-900"
                                  >
                                    Handover status
                                  </label>
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <select
                                      id={`hq-status-${h.handover_query_id}`}
                                      value={statusSelectValue}
                                      onChange={(ev) =>
                                        setStatusSelectValue(
                                          ev.target
                                            .value as EmployeeExitHandoverStatus,
                                        )
                                      }
                                      className="min-w-[10rem] flex-1 rounded-lg border border-teal-200/80 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-teal-400/40"
                                    >
                                      {HANDOVER_STATUS_OPTIONS.map((opt) => (
                                        <option key={opt} value={opt}>
                                          {opt.replace(/_/g, " ")}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      disabled={statusSaving}
                                      onClick={() =>
                                        void submitStatusUpdateForHandover(h)
                                      }
                                      className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:opacity-60"
                                    >
                                      {statusSaving ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        "Apply"
                                      )}
                                    </button>
                                  </div>
                                  {statusApplyError ? (
                                    <p className="mt-2 text-xs font-medium text-rose-700">
                                      {statusApplyError}
                                    </p>
                                  ) : null}
                                </div>
                              ) : null}
                              <p className="text-xs text-slate-600">
                                Due{" "}
                                <span className="font-medium">
                                  {fmtDateOnly(h.handover_date)}
                                </span>
                                {h.created_at ? (
                                  <span className="text-slate-400">
                                    {" "}
                                    · Logged {fmtLong(h.created_at)}
                                  </span>
                                ) : null}
                              </p>
                              {h.remarks?.trim() ? (
                                <p className="whitespace-pre-wrap text-sm text-slate-700">
                                  {h.remarks}
                                </p>
                              ) : null}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                  </div>
                </div>
              </section>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <ProfilePhotoZoomModal
        open={photoZoom != null}
        imageUrl={photoZoom?.imageUrl ?? ""}
        alt={photoZoom?.alt ?? "Profile photo"}
        onClose={() => setPhotoZoom(null)}
      />
    </div>
  );
}
