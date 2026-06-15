"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  CheckCircle2,
  ClipboardList,
  Layers,
  Loader2,
  Package,
  PencilLine,
  ShieldAlert,
  UserRoundCog,
  UserRoundPlus,
  Search,
  X,
} from "lucide-react";
import {
  getAllOrgUsers,
  getManagementEmployeesPage,
  type ManagementEmployeeRow,
} from "@/services/adminUser";
import {
  assignHandoverManager,
  correctionEmployeeExitProcess,
  employeeExitCancelled,
  employeeExitCompleted,
  employeeExitMoveInProgress,
  fetchEmployeeExitProcessById,
  handoverDateTimeSqlNow,
  returnAssetsCompleted,
  updateAssignedHandoverManager,
  type EmployeeExitAssetRow,
  type EmployeeExitHandoverQueryRow,
  type EmployeeExitProcessDetail,
} from "@/services/employeeExit";

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
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { dateStyle: "medium" });
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

function truthyReturned(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  if (typeof v === "string") return /^(1|true|yes)$/i.test(v.trim());
  return false;
}

function toDateInputValue(iso: string | null | undefined): string {
  if (iso == null || iso === "") return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isTerminationAction(actionType: string | null | undefined): boolean {
  return String(actionType ?? "").trim().toLowerCase() === "termination";
}

function normalizeExitApplicationStatus(status: string | null | undefined): string {
  return String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

function isPendingExitStatus(status: string | null | undefined): boolean {
  return normalizeExitApplicationStatus(status) === "pending";
}

function isInProgressExitStatus(status: string | null | undefined): boolean {
  return normalizeExitApplicationStatus(status) === "in_progress";
}

/** Show assign / change custody on assets while exit is still open for handover (not closed out). */
function exitAllowsAssetCustodyActions(status: string | null | undefined): boolean {
  const n = normalizeExitApplicationStatus(status);
  return (
    n === "pending" ||
    n === "in_progress" ||
    n === "approved"
  );
}

function numericId(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v));
  return Number.isFinite(n) ? n : null;
}

/** Effective custodian (`returned_to_id`) whether saved on asset or picked locally before handover completes. */
function effectiveHandoverToUserId(
  asset: EmployeeExitAssetRow,
  pendingByAssetId: Record<number, number>,
): number | null {
  const fromDb = numericId(asset.returned_to_id);
  if (fromDb != null) return fromDb;
  const pending = pendingByAssetId[asset.id];
  return pending != null ? Number(pending) : null;
}

function pendingReturnAssets(assets: EmployeeExitAssetRow[] | undefined): EmployeeExitAssetRow[] {
  return (assets ?? []).filter((a) => !truthyReturned(a.is_returned));
}

function normalizeHandoverQueryStatus(status: string | null | undefined): string {
  return String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function allHandoverQueriesCompleted(
  queries: EmployeeExitHandoverQueryRow[] | undefined,
): boolean {
  const list = queries ?? [];
  if (list.length === 0) return true;
  return list.every(
    (q) => normalizeHandoverQueryStatus(q.handover_status) === "handover_completed",
  );
}

function allAssetsReturnedInDb(assets: EmployeeExitAssetRow[] | undefined): boolean {
  return pendingReturnAssets(assets).length === 0;
}

/** Outstanding assets that have a completed handover query (required by return API). */
function assetsReadyForReturnConfirmation(
  assets: EmployeeExitAssetRow[] | undefined,
  queries: EmployeeExitHandoverQueryRow[] | undefined,
): EmployeeExitAssetRow[] {
  const pending = pendingReturnAssets(assets);
  const completedAssetIds = new Set(
    (queries ?? [])
      .filter(
        (q) =>
          q.asset_id != null &&
          normalizeHandoverQueryStatus(q.handover_status) === "handover_completed",
      )
      .map((q) => Number(q.asset_id)),
  );
  return pending.filter((a) => completedAssetIds.has(a.id));
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
      aria-labelledby="exit-employee-photo-zoom-title"
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
          id="exit-employee-photo-zoom-title"
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
  const displayName = String(name ?? "User");
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

function searchFieldCls() {
  return "w-full rounded-lg border border-[#E4E7EC] bg-white py-2 pl-9 pr-3 text-[13px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15 lg:rounded-xl lg:py-2.5 lg:pl-10 lg:pr-4 lg:text-sm";
}

function waFieldCls() {
  return "mt-2 w-full rounded-lg border border-[#E4E7EC] bg-white px-3 py-2.5 text-[14px] text-[#1F2937] outline-none focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15 lg:rounded-xl lg:py-2 lg:text-sm";
}

function zohoPrimaryBtnCls() {
  return "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#008CD3] px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 sm:w-auto lg:rounded-xl lg:bg-teal-600 lg:hover:bg-teal-700";
}

function zohoSecondaryBtnCls() {
  return "inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-[#E4E7EC] bg-white px-4 py-2.5 text-[14px] font-medium text-[#1F2937] transition active:scale-[0.98] disabled:opacity-50 sm:w-auto lg:rounded-xl lg:border-slate-200 lg:hover:bg-slate-50";
}

function zohoDangerBtnCls() {
  return "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#D93025] px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-50 sm:w-auto lg:rounded-xl lg:bg-rose-600 lg:hover:bg-rose-700";
}

function waPrimaryBtnCls() {
  return zohoPrimaryBtnCls();
}

function waSecondaryBtnCls() {
  return zohoSecondaryBtnCls();
}

function waDangerBtnCls() {
  return zohoDangerBtnCls();
}

function waExitStatusChip(status: string | null | undefined) {
  const s = normalizeExitApplicationStatus(status);
  if (s === "approved") return "bg-[#E7FCE3] text-[#0B5E44]";
  if (s === "rejected") return "bg-[#FFECEC] text-[#C62828]";
  if (s === "in_progress") return "bg-[#E3F2FD] text-[#1565C0]";
  return "bg-[#FFF8E1] text-[#8D6E00]";
}

function waModalShellClass() {
  return "fixed inset-0 z-[10050] flex items-end justify-center bg-[#111B21]/50 p-0 sm:items-center sm:p-4";
}

function waModalPanelClass() {
  return "relative flex max-h-[min(92dvh,100%)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[min(90vh,720px)] sm:rounded-2xl sm:border sm:border-slate-200";
}

function waModalHeaderClass(accent = "teal") {
  const top =
    accent === "rose"
      ? "sm:[border-top:3px_solid_#fb7185]"
      : accent === "indigo"
        ? "sm:[border-top:3px_solid_#4f46e5]"
        : accent === "emerald"
          ? "sm:[border-top:3px_solid_#10b981]"
          : "sm:[border-top:3px_solid_#0d9488]";
  return `flex shrink-0 items-center justify-between gap-2 border-b border-[#E4E7EC] bg-gradient-to-r from-[#008CD3] to-[#0070AA] px-4 py-3 sm:border-slate-100 sm:bg-white sm:px-5 sm:py-4 ${top}`;
}

function waModalFooterClass() {
  return "flex shrink-0 flex-col-reverse gap-2 border-t border-[#E4E7EC] bg-[#F9FAFB] px-4 pt-3 sm:flex-row sm:justify-end sm:gap-2 sm:border-slate-100 sm:bg-slate-50/90 sm:px-5";
}

export default function EmployeeExitDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <p className="text-sm">Loading exit process…</p>
        </div>
      }
    >
      <EmployeeExitDetailPageContent />
    </Suspense>
  );
}

function EmployeeExitDetailPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orgId = String(params?.org_id ?? "");
  const teamId =
    searchParams.get("team_id") ||
    (String(params?.team_id ?? "") !== "0" ? String(params?.team_id ?? "") : "");
  const exitProcessId =
    searchParams.get("exit_process_id") ||
    (String(params?.exit_process_id ?? "") !== "0"
      ? String(params?.exit_process_id ?? "")
      : "");
  const tabFromUrl = searchParams.get("tab");

  const [data, setData] = useState<EmployeeExitProcessDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [corrReason, setCorrReason] = useState("");
  const [corrExitDate, setCorrExitDate] = useState("");
  const [corrLastDay, setCorrLastDay] = useState("");
  const [corrResponseMsg, setCorrResponseMsg] = useState("");
  const [corrBusy, setCorrBusy] = useState(false);
  const [corrModalError, setCorrModalError] = useState<string | null>(null);
  const [correctionSavedMsg, setCorrectionSavedMsg] = useState<string | null>(null);
  const [forwardBusy, setForwardBusy] = useState(false);
  const [forwardError, setForwardError] = useState<string | null>(null);

  /** Custodian picks per asset (pending or in-progress) applied on Move forward / kept for display. */
  const [pendingAssetHandover, setPendingAssetHandover] = useState<Record<number, number>>({});

  const [employeeLookup, setEmployeeLookup] = useState<Record<number, string>>({});

  const [assignPickerOpen, setAssignPickerOpen] = useState(false);
  const [assignForAssetId, setAssignForAssetId] = useState<number | null>(null);
  const [assignEmployees, setAssignEmployees] = useState<ManagementEmployeeRow[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignFetchError, setAssignFetchError] = useState<string | null>(null);
  const [assignSearch, setAssignSearch] = useState("");
  const [assignHandoverSaving, setAssignHandoverSaving] = useState(false);
  const [assignPersistError, setAssignPersistError] = useState<string | null>(null);

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectMessage, setRejectMessage] = useState("");
  const [rejectBusy, setRejectBusy] = useState(false);
  const [rejectModalError, setRejectModalError] = useState<string | null>(null);

  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approveMessage, setApproveMessage] = useState(
    "Exit approved. Asset handovers are complete.",
  );
  const [approveBusy, setApproveBusy] = useState(false);
  const [approveModalError, setApproveModalError] = useState<string | null>(null);

  const [returnAssetSelection, setReturnAssetSelection] = useState<Record<number, boolean>>(
    {},
  );
  const [returnAssetsBusy, setReturnAssetsBusy] = useState(false);
  const [returnAssetsError, setReturnAssetsError] = useState<string | null>(null);

  const [mobileMainTab, setMobileMainTab] = useState<
    "overview" | "assets" | "tasks" | "actions"
  >("overview");
  const [photoZoom, setPhotoZoom] = useState<{
    imageUrl: string;
    alt: string;
  } | null>(null);
  const [orgUserImageById, setOrgUserImageById] = useState<Record<number, string>>({});

  const teamHref = `/dashboard/${orgId}/organization-employees/teams/0?team_id=${encodeURIComponent(teamId)}`;

  const reloadDetail = useCallback(async () => {
    if (!orgId || !exitProcessId) return;
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await fetchEmployeeExitProcessById(token, orgId, exitProcessId);
      setData(res.data ?? null);
    } catch {
      /* Keep current data if refresh fails */
    }
  }, [orgId, exitProcessId]);

  const load = useCallback(async () => {
    if (!orgId || !exitProcessId) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Sign in required.");
        setData(null);
        return;
      }
      const res = await fetchEmployeeExitProcessById(token, orgId, exitProcessId);
      setData(res.data ?? null);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "Could not load exit process.");
    } finally {
      setLoading(false);
    }
  }, [orgId, exitProcessId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    (async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const rows = await getAllOrgUsers(token);
        const map: Record<number, string> = {};
        for (const row of rows) {
          const id = numericId(row.id);
          const img = profileImageUrlFromRow(
            (row as { user_image?: unknown }).user_image,
          );
          if (id != null && img) map[id] = img;
        }
        if (!cancelled) setOrgUserImageById(map);
      } catch {
        /* optional enrichment */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId, data?.employee_id]);

  useEffect(() => {
    if (
      tabFromUrl === "overview" ||
      tabFromUrl === "assets" ||
      tabFromUrl === "tasks" ||
      tabFromUrl === "actions"
    ) {
      setMobileMainTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const teamMismatch =
    data != null &&
    data.team_id != null &&
    String(data.team_id) !== String(teamId);

  const activePendingHandover =
    data != null && exitAllowsAssetCustodyActions(data.application_status)
      ? pendingAssetHandover
      : {};

  function openCorrectionModal() {
    if (!data) return;
    setCorrReason(data.action_reason ?? "");
    setCorrExitDate(toDateInputValue(data.exit_date));
    setCorrLastDay(toDateInputValue(data.last_working_day));
    setCorrResponseMsg(data.response_message ?? "");
    setCorrModalError(null);
    setCorrectionOpen(true);
  }

  async function handleCorrectionSubmit() {
    setCorrModalError(null);
    if (!corrReason.trim()) {
      setCorrModalError("Termination reason is required.");
      return;
    }
    if (corrExitDate && corrLastDay && new Date(corrExitDate) < new Date(corrLastDay)) {
      setCorrModalError("Exit date must be on or after the last working day.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setCorrModalError("Sign in required.");
      return;
    }
    setCorrBusy(true);
    try {
      await correctionEmployeeExitProcess(token, orgId, exitProcessId, {
        action_reason: corrReason.trim(),
        exit_date: corrExitDate.trim() || null,
        last_working_day: corrLastDay.trim() || null,
        response_message: corrResponseMsg.trim() || null,
      });
      setCorrectionOpen(false);
      setCorrectionSavedMsg("Corrections saved.");
      void reloadDetail();
      setTimeout(() => setCorrectionSavedMsg(null), 6000);
    } catch (e) {
      setCorrModalError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setCorrBusy(false);
    }
  }

  async function openEmployeePickerForAsset(assetId: number) {
    setAssignForAssetId(assetId);
    setAssignPickerOpen(true);
    setAssignSearch("");
    setAssignFetchError(null);
    setAssignPersistError(null);
    const token = localStorage.getItem("token");
    if (!token) {
      setAssignFetchError("Sign in required.");
      return;
    }
    setAssignLoading(true);
    try {
      const res = await getManagementEmployeesPage(token, orgId, 1, 500);
      const exitingId = data?.employee_id != null ? String(data.employee_id) : null;
      const rows = exitingId
        ? res.data.filter((row) => String(row.user_id) !== exitingId)
        : res.data;
      setAssignEmployees(rows);

      setEmployeeLookup((prev) => {
        const next = { ...prev };
        for (const r of res.data) {
          const uid = numericId(r.user_id);
          if (uid != null && r.user_name) next[uid] = r.user_name;
        }
        return next;
      });
    } catch (e) {
      setAssignFetchError(e instanceof Error ? e.message : "Could not load employees.");
    } finally {
      setAssignLoading(false);
    }
  }

  async function assignCustodian(userId: number) {
    if (assignForAssetId == null || !data) return;
    const assetId = assignForAssetId;
    const asset = data.employee_assets?.find((a) => a.id === assetId);
    if (!asset) {
      setAssignPersistError("Asset not found.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setAssignPersistError("Sign in required.");
      return;
    }

    const hasPersistedAssignee = numericId(asset.returned_to_id) != null;
    const sharedBody = {
      org_id: orgId,
      employee_id: data.employee_id,
      manager_id: userId,
      asset_id: assetId,
      team_id: data.team_id ?? null,
    };

    setAssignPersistError(null);
    setAssignHandoverSaving(true);
    try {
      if (hasPersistedAssignee) {
        await updateAssignedHandoverManager(token, orgId, exitProcessId, {
          ...sharedBody,
          handover_date: handoverDateTimeSqlNow(),
        });
        setCorrectionSavedMsg("Handover manager updated.");
      } else {
        await assignHandoverManager(token, orgId, exitProcessId, {
          ...sharedBody,
          handover_date: handoverDateTimeSqlNow(),
        });
        setCorrectionSavedMsg("Handover manager assigned.");
      }

      setPendingAssetHandover((prev) => {
        const next = { ...prev };
        delete next[assetId];
        return next;
      });
      setEmployeeLookup((prev) => {
        const row = assignEmployees.find((r) => numericId(r.user_id) === userId);
        if (!row?.user_name) return prev;
        return { ...prev, [userId]: row.user_name };
      });
      setAssignPickerOpen(false);
      setAssignForAssetId(null);
      void reloadDetail();
      setTimeout(() => setCorrectionSavedMsg(null), 6000);
    } catch (e) {
      setAssignPersistError(
        e instanceof Error ? e.message : "Could not save asset handover.",
      );
    } finally {
      setAssignHandoverSaving(false);
    }
  }

  function assigneeDisplayName(asset: EmployeeExitAssetRow): string | null {
    const uid = effectiveHandoverToUserId(asset, activePendingHandover);
    if (uid == null) return null;
    const matchesDbReturned =
      numericId(asset.returned_to_id) === uid && asset.returned_to_name?.trim();
    if (matchesDbReturned) return asset.returned_to_name!;
    return employeeLookup[uid] ?? null;
  }

  async function handleMoveForward() {
    setForwardError(null);
    if (!data) return;
    const token = localStorage.getItem("token");
    if (!token) {
      setForwardError("Sign in required.");
      return;
    }
    const pendingAssets = pendingReturnAssets(data.employee_assets);
    const allHaveCustodian = pendingAssets.every(
      (a) => effectiveHandoverToUserId(a, activePendingHandover) != null,
    );
    if (!allHaveCustodian) {
      setForwardError("Assign every outstanding asset before moving forward.");
      return;
    }

    const assets_handover_data = pendingAssets.map((a) => ({
      asset_id: a.id,
      handover_to: effectiveHandoverToUserId(a, activePendingHandover)!,
    }));

    setForwardBusy(true);
    try {
      await employeeExitMoveInProgress(token, orgId, exitProcessId, {
        application_status: "in_progress",
        assets_handover_data,
      });
      setPendingAssetHandover({});
      setCorrectionSavedMsg("Exit moved to in progress.");
      void reloadDetail();
      setTimeout(() => setCorrectionSavedMsg(null), 6000);
    } catch (e) {
      setForwardError(e instanceof Error ? e.message : "Could not update status.");
    } finally {
      setForwardBusy(false);
    }
  }

  async function handleRejectSubmit() {
    setRejectModalError(null);
    if (!data) return;
    if (!rejectMessage.trim()) {
      setRejectModalError("A rejection message is required.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setRejectModalError("Sign in required.");
      return;
    }
    setRejectBusy(true);
    try {
      await employeeExitCancelled(token, orgId, exitProcessId, {
        application_status: "rejected",
        employee_id: data.employee_id,
        response_message: rejectMessage.trim(),
      });
      setRejectModalOpen(false);
      setRejectMessage("");
      setCorrectionSavedMsg("Exit application rejected.");
      void reloadDetail();
      setTimeout(() => setCorrectionSavedMsg(null), 6000);
    } catch (e) {
      setRejectModalError(e instanceof Error ? e.message : "Rejection failed.");
    } finally {
      setRejectBusy(false);
    }
  }

  const handoversComplete = data ? allHandoverQueriesCompleted(data.handover_queries) : false;
  const showReturnCheckpoints =
    data != null &&
    isInProgressExitStatus(data.application_status) &&
    handoversComplete;
  const assetsAwaitingReturn =
    data && showReturnCheckpoints
      ? assetsReadyForReturnConfirmation(
          data.employee_assets,
          data.handover_queries,
        )
      : data
        ? pendingReturnAssets(data.employee_assets)
        : [];
  const allAssetsReturned = data ? allAssetsReturnedInDb(data.employee_assets) : true;
  const canApproveExit =
    data != null &&
    isInProgressExitStatus(data.application_status) &&
    handoversComplete &&
    allAssetsReturned;
  const approveDisabled = approveBusy || !canApproveExit;
  const approveBlockReason = !handoversComplete
    ? "Complete all handover tasks before approving."
    : !allAssetsReturned
      ? "Confirm return for every outstanding asset before approving."
      : null;

  const selectedReturnCount = assetsAwaitingReturn.filter(
    (a) => returnAssetSelection[a.id],
  ).length;
  const allReturnAssetsSelected =
    assetsAwaitingReturn.length > 0 &&
    selectedReturnCount === assetsAwaitingReturn.length;

  function toggleReturnAssetSelection(assetId: number) {
    setReturnAssetSelection((prev) => ({
      ...prev,
      [assetId]: !prev[assetId],
    }));
  }

  function selectAllReturnAssets() {
    const next: Record<number, boolean> = {};
    for (const a of assetsAwaitingReturn) {
      next[a.id] = true;
    }
    setReturnAssetSelection(next);
  }

  async function handleConfirmAssetReturns() {
    setReturnAssetsError(null);
    if (!data) return;
    const pending = assetsAwaitingReturn;
    if (pending.length === 0) return;

    const selectedIds = pending
      .filter((a) => returnAssetSelection[a.id])
      .map((a) => a.id);

    if (selectedIds.length !== pending.length) {
      setReturnAssetsError(
        `Select all ${pending.length} outstanding asset(s) to confirm they were returned.`,
      );
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setReturnAssetsError("Sign in required.");
      return;
    }

    setReturnAssetsBusy(true);
    try {
      await returnAssetsCompleted(token, orgId, {
        employee_id: data.employee_id,
        assets_ids: selectedIds,
      });
      setReturnAssetSelection({});
      setCorrectionSavedMsg("Employee assets marked as returned.");
      void reloadDetail();
      setTimeout(() => setCorrectionSavedMsg(null), 6000);
    } catch (e) {
      setReturnAssetsError(
        e instanceof Error ? e.message : "Could not confirm asset returns.",
      );
    } finally {
      setReturnAssetsBusy(false);
    }
  }

  async function handleApproveSubmit() {
    setApproveModalError(null);
    if (!data) return;
    if (!handoversComplete) {
      setApproveModalError("Complete all handover tasks before approving.");
      return;
    }
    if (!allAssetsReturned) {
      setApproveModalError(
        "Confirm return for every outstanding asset before approving.",
      );
      return;
    }
    if (!approveMessage.trim()) {
      setApproveModalError("A completion message is required.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setApproveModalError("Sign in required.");
      return;
    }
    setApproveBusy(true);
    try {
      await employeeExitCompleted(token, orgId, exitProcessId, {
        application_status: "approved",
        employee_id: data.employee_id,
        response_message: approveMessage.trim(),
      });
      setApproveModalOpen(false);
      setApproveMessage("Exit approved. Asset handovers are complete.");
      setCorrectionSavedMsg("Exit process completed.");
      void reloadDetail();
      setTimeout(() => setCorrectionSavedMsg(null), 6000);
    } catch (e) {
      setApproveModalError(e instanceof Error ? e.message : "Approval failed.");
    } finally {
      setApproveBusy(false);
    }
  }

  function openRejectModal() {
    setRejectMessage("");
    setRejectModalError(null);
    setRejectModalOpen(true);
  }

  function openApproveModal() {
    setApproveModalError(null);
    if (!canApproveExit) {
      setCorrectionSavedMsg(approveBlockReason ?? "Cannot approve yet.");
      setTimeout(() => setCorrectionSavedMsg(null), 6000);
      return;
    }
    if (!approveMessage.trim()) {
      setApproveMessage("Exit approved. Asset handovers are complete.");
    }
    setApproveModalOpen(true);
  }

  const moveForwardDisabled =
    forwardBusy ||
    !data ||
    !isPendingExitStatus(data.application_status) ||
    !pendingReturnAssets(data.employee_assets).every(
      (a) => effectiveHandoverToUserId(a, activePendingHandover) != null,
    );

  const assignModalFilteredEmployees = assignEmployees.filter((row) => {
    const q = assignSearch.trim().toLowerCase();
    if (!q) return true;
    const name = String(row.user_name ?? "").toLowerCase();
    const email = String(row.user_email ?? "").toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  const assignPickerAsset =
    assignForAssetId != null && data
      ? data.employee_assets?.find((a) => a.id === assignForAssetId)
      : null;
  const assignPickerIsChange =
    assignPickerAsset != null && numericId(assignPickerAsset.returned_to_id) != null;

  const openPhotoZoom = (imageUrl: string, alt: string) => {
    setPhotoZoom({ imageUrl, alt });
  };

  const employeeProfileImage =
    data?.employee_id != null
      ? orgUserImageById[Number(data.employee_id)] ?? null
      : null;

  return (
    <div className="min-h-full bg-[#F5F7FA] lg:bg-[#f4f6f9] lg:pb-20">
      {/* Mobile: Zoho-style header */}
      <div className="sticky top-0 z-20 border-b border-[#E4E7EC] bg-white/95 shadow-sm backdrop-blur lg:hidden">
        <div className="bg-gradient-to-r from-[#008CD3] via-[#007EBF] to-[#0070AA] px-3 pb-3 pt-2.5 text-white">
          <div className="flex items-center gap-2">
            <Link
              href={teamHref}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 active:bg-white/25"
              aria-label="Back to team"
            >
              <ArrowLeft className="h-[18px] w-[18px]" />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/75">
                Exit process
              </p>
              <h1 className="truncate text-[16px] font-bold leading-tight">
                {!data && loading
                  ? "Loading…"
                  : data?.employee_name ?? `Exit #${exitProcessId}`}
              </h1>
              <p className="truncate text-[12px] text-white/80">
                {data?.employee_email ?? "Exit process detail"}
                {employeeProfileImage ? " · tap photo to enlarge" : ""}
              </p>
            </div>
            {data ? (
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${waExitStatusChip(data.application_status)}`}
              >
                {String(data.application_status).replace(/_/g, " ")}
              </span>
            ) : null}
          </div>
        </div>
        <div className="bg-white px-3 pb-2.5 pt-2">
          <div className="flex rounded-lg bg-[#F5F7FA] p-0.5">
            {(
              [
                { id: "overview" as const, label: "Overview" },
                {
                  id: "assets" as const,
                  label: "Assets",
                  badge: data?.employee_assets?.length ?? 0,
                },
                {
                  id: "tasks" as const,
                  label: "Tasks",
                  badge: data?.handover_queries?.length ?? 0,
                },
                { id: "actions" as const, label: "Actions" },
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
      <div className="relative isolate overflow-hidden bg-slate-950 px-4 pb-12 pt-8 sm:px-8">
        <div className="pointer-events-none absolute -left-20 top-0 h-72 w-72 rounded-full bg-teal-500/20 blur-[90px]" />

        <div className="relative mx-auto max-w-4xl">
          <Link
            href={teamHref}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-teal-100 transition hover:bg-white/15"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to team
          </Link>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur">
                <ShieldAlert className="h-6 w-6 text-rose-300" aria-hidden />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-300/90">
                  Exit detail
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  {!data && loading
                    ? "Loading…"
                    : data?.employee_name ?? `Exit #${exitProcessId}`}
                </h1>
                {data ? (
                  <p className="mt-2 text-sm text-slate-400">{data.employee_email}</p>
                ) : null}
              </div>
            </div>
            {data ? (
              <div className="flex flex-shrink-0 flex-col items-stretch gap-2 sm:items-end">
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                  {isPendingExitStatus(data.application_status) ? (
                    <>
                      <button
                        type="button"
                        disabled={moveForwardDisabled}
                        title={
                          moveForwardDisabled && !forwardBusy
                            ? "Assign custody for every outstanding asset before moving forward."
                            : undefined
                        }
                        onClick={() => void handleMoveForward()}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-xs font-semibold tracking-wide text-white shadow-sm transition hover:bg-teal-400 disabled:opacity-50"
                      >
                        {forwardBusy ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                            Moving…
                          </>
                        ) : (
                          <>
                            <ArrowRight className="h-4 w-4" aria-hidden />
                            Move forward
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={rejectBusy}
                        onClick={openRejectModal}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-300/50 bg-rose-500/15 px-4 py-2 text-xs font-semibold tracking-wide text-rose-100 shadow-sm transition hover:bg-rose-500/25 disabled:opacity-50"
                      >
                        <Ban className="h-4 w-4" aria-hidden />
                        Reject application
                      </button>
                    </>
                  ) : null}
                  {isInProgressExitStatus(data.application_status) ? (
                    <button
                      type="button"
                      disabled={approveDisabled}
                      title={approveBlockReason ?? undefined}
                      onClick={openApproveModal}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300/50 bg-emerald-500/20 px-4 py-2 text-xs font-semibold tracking-wide text-emerald-100 shadow-sm transition hover:bg-emerald-500/30 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" aria-hidden />
                      Approve application
                    </button>
                  ) : null}
                  {isTerminationAction(data.action_type) ? (
                    <button
                      type="button"
                      onClick={openCorrectionModal}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold tracking-wide text-white backdrop-blur-sm transition hover:bg-white/20"
                    >
                      <PencilLine className="h-4 w-4 text-teal-200" aria-hidden />
                      Edit correction
                    </button>
                  ) : null}
                </div>
                {forwardError ? (
                  <p className="max-w-sm text-right text-xs text-rose-200">{forwardError}</p>
                ) : null}
                <span
                  className={`inline-flex self-end rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ${exitStatusPillClass(
                    data.application_status,
                  )}`}
                >
                  {String(data.application_status).replace(/_/g, " ")}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      </div>

      <div className="relative z-10 mx-auto max-w-4xl lg:px-4 lg:sm:px-8">
        <div className="lg:-mt-6">

          {correctionSavedMsg ? (
            <div className="mx-3 mt-2 rounded-lg border border-[#C8E6C9] bg-[#E6F4EA] px-3 py-2.5 text-[12px] leading-snug text-[#0F9D58] lg:mx-0 lg:mb-6 lg:rounded-2xl lg:border lg:border-teal-200 lg:bg-teal-50 lg:text-sm lg:text-teal-950">
              {correctionSavedMsg}
            </div>
          ) : null}

          {teamMismatch ? (
            <div className="mx-3 mt-2 rounded-lg border border-[#F9D4A5] bg-[#FFF8E1] px-3 py-2.5 text-[12px] leading-snug text-[#8D6E00] lg:mx-0 lg:mb-6 lg:rounded-2xl lg:border lg:border-amber-200 lg:bg-amber-50 lg:text-sm lg:text-amber-950">
              This record is linked to a different team in the organization than the URL
              you opened. You still have full details below.
            </div>
          ) : null}

          {loading ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 bg-[#F0F2F5] py-16 text-[#667781] lg:min-h-0 lg:rounded-[22px] lg:border lg:border-slate-200 lg:bg-white lg:py-0 lg:shadow-lg">
              <Loader2 className="h-9 w-9 animate-spin text-[#128C7E] lg:text-teal-600" />
              <p className="text-[15px] lg:text-sm lg:text-slate-600">Loading exit process…</p>
            </div>
          ) : error ? (
            <div className="mx-3 mt-3 rounded-lg bg-[#FFECEC] px-4 py-10 text-center lg:mx-0 lg:rounded-2xl lg:border lg:border-rose-200 lg:bg-white lg:px-6 lg:py-12 lg:shadow-lg">
              <p className="text-[15px] text-[#8B1A1A] lg:text-rose-800">{error}</p>
              <button
                type="button"
                onClick={() => void load()}
                className={`mt-4 ${waPrimaryBtnCls()}`}
              >
                Retry
              </button>
            </div>
          ) : !data ? (
            <p className="px-4 text-[#667781] lg:text-slate-600">No data.</p>
          ) : (
            <>
              {/* Mobile tab panels */}
              <div className="lg:hidden">
                {mobileMainTab === "overview" ? (
                  <div className="space-y-2 p-3">
                    <section className="overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-sm">
                      <div className="flex items-center gap-3 border-b border-[#EEF2F6] px-3 py-3">
                        <UserAvatarButton
                          name={data.employee_name}
                          userImage={employeeProfileImage}
                          size="lg"
                          onZoom={openPhotoZoom}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-semibold text-[#1F2937]">
                            {data.employee_name ?? "—"}
                          </p>
                          <p className="truncate text-[12px] text-[#6B7280]">
                            {data.employee_email ?? "—"}
                          </p>
                          <span
                            className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${waExitStatusChip(data.application_status)}`}
                          >
                            {String(data.application_status).replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>
                      {[
                        { label: "Action type", value: data.action_type ?? "—", cap: true },
                        { label: "Team", value: data.team_name ?? `Team #${data.team_id ?? "—"}` },
                        { label: "Last working day", value: fmtDateOnly(data.last_working_day) },
                        { label: "Exit date", value: fmtDateOnly(data.exit_date) },
                        { label: "Opened by", value: data.action_performed_by_name ?? "—" },
                        { label: "Response by", value: data.response_by_name ?? "—" },
                        { label: "Resolved", value: fmtLong(data.resolved_at) },
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
                        <p className={mobileLabelCls}>Reason & response</p>
                      </div>
                      <div className="px-3 py-3">
                        <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#1F2937]">
                          {data.action_reason?.trim() || "—"}
                        </p>
                        {data.response_message?.trim() ? (
                          <p className={`mt-2 whitespace-pre-wrap ${mobileCaptionCls}`}>
                            {data.response_message}
                          </p>
                        ) : null}
                      </div>
                    </section>
                  </div>
                ) : null}

                {mobileMainTab === "assets" ? (
                  <div className="m-3 space-y-2">
                    {isInProgressExitStatus(data.application_status) &&
                    !handoversComplete ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] text-amber-950">
                        Complete all handover tasks before you can confirm asset returns
                        and approve this exit.
                      </div>
                    ) : null}
                    {showReturnCheckpoints && assetsAwaitingReturn.length > 0 ? (
                      <div className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-3">
                        <p className="text-[12px] font-semibold text-teal-950">
                          Confirm physical return
                        </p>
                        <p className="mt-1 text-[11px] leading-snug text-teal-900/90">
                          Handover tasks are complete. Select every asset card you received
                          back, then confirm in the database.
                        </p>
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={returnAssetsBusy || allReturnAssetsSelected}
                            onClick={selectAllReturnAssets}
                            className="rounded-lg border border-teal-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-teal-900"
                          >
                            Select all
                          </button>
                          <button
                            type="button"
                            disabled={returnAssetsBusy || !allReturnAssetsSelected}
                            onClick={() => void handleConfirmAssetReturns()}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
                          >
                            {returnAssetsBusy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            Confirm returns
                          </button>
                        </div>
                        {returnAssetsError ? (
                          <p className="mt-2 text-[11px] text-rose-700">{returnAssetsError}</p>
                        ) : null}
                      </div>
                    ) : null}
                    {showReturnCheckpoints && allAssetsReturned ? (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-900">
                        All assets are marked returned. You can approve the application.
                      </div>
                    ) : null}
                  <ul className="overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-sm">
                    {data.employee_assets?.length === 0 ? (
                      <li className="px-4 py-10 text-center text-[13px] text-[#6B7280]">
                        No assets on file.
                      </li>
                    ) : (
                      data.employee_assets?.map((a) => {
                        const assetReturned = truthyReturned(a.is_returned);
                        const showReturnCheckpoint =
                          showReturnCheckpoints && !assetReturned;
                        const isSelectedForReturn = !!returnAssetSelection[a.id];
                        const showCustodyButton =
                          exitAllowsAssetCustodyActions(data.application_status) &&
                          !assetReturned &&
                          !showReturnCheckpoints;
                        const returnedToIdNumeric = numericId(a.returned_to_id);
                        const pickedLocallyWhilePending =
                          activePendingHandover[a.id] !== undefined &&
                          activePendingHandover[a.id] !== null;
                        const hasAssignee =
                          returnedToIdNumeric != null || pickedLocallyWhilePending;
                        const custodyLabel =
                          hasAssignee && assigneeDisplayName(a) != null
                            ? assigneeDisplayName(a)
                            : hasAssignee
                              ? `User #${effectiveHandoverToUserId(a, activePendingHandover) ?? "?"}`
                              : null;

                        return (
                          <li
                            key={a.id}
                            className={`border-b border-[#EEF2F6] px-3 py-2.5 last:border-b-0 ${
                              showReturnCheckpoint && isSelectedForReturn
                                ? "bg-teal-50/80 ring-1 ring-inset ring-teal-200"
                                : ""
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              {showReturnCheckpoint ? (
                                <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5">
                                  <input
                                    type="checkbox"
                                    checked={isSelectedForReturn}
                                    disabled={returnAssetsBusy}
                                    onChange={() => toggleReturnAssetSelection(a.id)}
                                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                  />
                                  <span className="text-[13px] font-semibold text-[#1F2937]">
                                    {a.asset_name ?? `#${a.id}`}
                                  </span>
                                </label>
                              ) : (
                              <p className="text-[13px] font-semibold text-[#1F2937]">
                                {a.asset_name ?? `#${a.id}`}
                              </p>
                              )}
                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                  assetReturned
                                    ? "bg-[#E6F4EA] text-[#0F9D58]"
                                    : "bg-[#F5F7FA] text-[#6B7280]"
                                }`}
                              >
                                {assetReturned ? "Returned" : "Outstanding"}
                              </span>
                            </div>
                            {a.asset_summary ? (
                              <p className={`mt-1 ${mobileCaptionCls}`}>{a.asset_summary}</p>
                            ) : null}
                            <p className={`mt-1.5 ${mobileCaptionCls}`}>
                              Custodian:{" "}
                              {assetReturned
                                ? (a.returned_to_name ?? "—")
                                : (custodyLabel ?? "Not assigned")}
                            </p>
                            {showCustodyButton ? (
                              <button
                                type="button"
                                onClick={() => void openEmployeePickerForAsset(a.id)}
                                className="mt-2.5 w-full rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] py-2 text-[13px] font-semibold text-[#008CD3] active:scale-[0.98]"
                              >
                                {hasAssignee ? "Change custodian" : "Assign custodian"}
                              </button>
                            ) : null}
                            {showReturnCheckpoint ? (
                              <p className={`mt-1.5 ${mobileCaptionCls}`}>
                                Tap to mark this asset as returned to the organization.
                              </p>
                            ) : null}
                          </li>
                        );
                      })
                    )}
                  </ul>
                  </div>
                ) : null}

                {mobileMainTab === "tasks" ? (
                  <ul className="m-3 overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-sm">
                    {data.handover_queries?.length === 0 ? (
                      <li className="px-4 py-10 text-center text-[13px] text-[#6B7280]">
                        No handover tasks.
                      </li>
                    ) : (
                      data.handover_queries?.map((h) => (
                        <li
                          key={h.handover_query_id}
                          className="border-b border-[#EEF2F6] px-3 py-2.5 last:border-b-0"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="min-w-0 flex-1 text-[13px] font-semibold text-[#1F2937]">
                              {h.custom_task_name?.trim()
                                ? h.custom_task_name
                                : (h.asset_name ?? `Task #${h.handover_query_id}`)}
                            </p>
                            {h.handover_status ? (
                              <span className="shrink-0 rounded-full bg-[#F5F7FA] px-2 py-0.5 text-[10px] font-semibold uppercase text-[#6B7280]">
                                {String(h.handover_status).replace(/_/g, " ")}
                              </span>
                            ) : null}
                          </div>
                          <p className={`mt-1 ${mobileCaptionCls}`}>
                            {h.manager_name ?? "—"} · Due {fmtDateOnly(h.handover_date)}
                          </p>
                          {h.remarks?.trim() ? (
                            <p className="mt-1 text-[12px] text-[#1F2937]">{h.remarks}</p>
                          ) : null}
                        </li>
                      ))
                    )}
                  </ul>
                ) : null}

                {mobileMainTab === "actions" ? (
                  <div className="space-y-2 p-3">
                    {isPendingExitStatus(data.application_status) ? (
                      <>
                        <button
                          type="button"
                          disabled={moveForwardDisabled}
                          onClick={() => void handleMoveForward()}
                          className={`w-full ${waPrimaryBtnCls()}`}
                        >
                          {forwardBusy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ArrowRight className="h-4 w-4" />
                          )}
                          Move forward
                        </button>
                        <button
                          type="button"
                          disabled={rejectBusy}
                          onClick={openRejectModal}
                          className={waDangerBtnCls()}
                        >
                          <Ban className="h-4 w-4" />
                          Reject application
                        </button>
                      </>
                    ) : null}
                    {isInProgressExitStatus(data.application_status) ? (
                      <button
                        type="button"
                        disabled={approveDisabled}
                        title={approveBlockReason ?? undefined}
                        onClick={openApproveModal}
                        className={`w-full ${waPrimaryBtnCls()}`}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve application
                      </button>
                    ) : null}
                    {isInProgressExitStatus(data.application_status) && approveBlockReason ? (
                      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-950">
                        {approveBlockReason}
                      </p>
                    ) : null}
                    {isTerminationAction(data.action_type) ? (
                      <button
                        type="button"
                        onClick={openCorrectionModal}
                        className={`w-full ${zohoSecondaryBtnCls()}`}
                      >
                        <PencilLine className="h-4 w-4 text-[#008CD3]" />
                        Edit correction
                      </button>
                    ) : null}
                    {forwardError ? (
                      <p className="rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2 text-[12px] text-[#D93025]">
                        {forwardError}
                      </p>
                    ) : null}
                    {!isPendingExitStatus(data.application_status) &&
                    !isInProgressExitStatus(data.application_status) &&
                    !isTerminationAction(data.action_type) ? (
                      <p className={`rounded-lg border border-dashed border-[#E4E7EC] bg-white px-4 py-8 text-center ${mobileCaptionCls}`}>
                        No actions available for this status.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {/* Desktop sections */}
              <div className="hidden space-y-6 lg:block">
              <section className="overflow-hidden rounded-[22px] border border-slate-200/90 bg-white shadow-[0_12px_40px_-12px_rgba(15,23,42,0.12)] ring-1 ring-slate-950/[0.04]">
                <header className="border-b border-slate-100 bg-slate-50/80 px-5 py-4 sm:px-6">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                    <ClipboardList className="h-4 w-4 text-teal-600" />
                    Overview
                  </h2>
                </header>
                <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
                  <dl className="space-y-3 text-sm">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Action type
                      </dt>
                      <dd className="mt-0.5 capitalize text-slate-900">{data.action_type}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Team
                      </dt>
                      <dd className="mt-0.5 text-slate-900">
                        {data.team_name ?? `Team #${data.team_id ?? "—"}`}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Last working day
                      </dt>
                      <dd className="mt-0.5 text-slate-900">
                        {fmtDateOnly(data.last_working_day)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Exit date
                      </dt>
                      <dd className="mt-0.5 text-slate-900">{fmtDateOnly(data.exit_date)}</dd>
                    </div>
                  </dl>
                  <dl className="space-y-3 text-sm">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Opened by
                      </dt>
                      <dd className="mt-0.5 text-slate-900">
                        {data.action_performed_by_name ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Response by
                      </dt>
                      <dd className="mt-0.5 text-slate-900">{data.response_by_name ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Resolved at
                      </dt>
                      <dd className="mt-0.5 text-slate-900">{fmtLong(data.resolved_at)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Created / Updated
                      </dt>
                      <dd className="mt-0.5 text-xs leading-relaxed text-slate-700">
                        {fmtLong(data.created_at)} · {fmtLong(data.updated_at)}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="border-t border-slate-100 px-5 py-4 sm:px-6">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Reason &amp; response
                  </h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                    {data.action_reason?.trim() || "—"}
                  </p>
                  {data.response_message?.trim() ? (
                    <>
                      <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Response message
                      </h3>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                        {data.response_message}
                      </p>
                    </>
                  ) : null}
                </div>
              </section>

              <section className="overflow-hidden rounded-[22px] border border-slate-200/90 bg-white shadow-[0_12px_40px_-12px_rgba(15,23,42,0.12)] ring-1 ring-slate-950/[0.04]">
                <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-4 sm:px-6">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                    <Package className="h-4 w-4 text-indigo-500" />
                    Employee assets ({data.employee_assets?.length ?? 0})
                  </h2>
                </header>
                <div className="divide-y divide-slate-100 p-4 sm:p-6">
                  {isInProgressExitStatus(data.application_status) &&
                  !handoversComplete ? (
                    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                      Complete all handover tasks before you can confirm asset returns and
                      approve this exit.
                    </div>
                  ) : null}
                  {showReturnCheckpoints && assetsAwaitingReturn.length > 0 ? (
                    <div className="mb-4 rounded-xl border border-teal-200 bg-teal-50 px-4 py-4">
                      <p className="text-sm font-semibold text-teal-950">
                        Confirm physical return
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-teal-900/90">
                        All handover tasks are marked completed. Select every outstanding asset
                        you have received back, then save to the database.
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={returnAssetsBusy || allReturnAssetsSelected}
                          onClick={selectAllReturnAssets}
                          className="rounded-xl border border-teal-300 bg-white px-3 py-2 text-xs font-semibold text-teal-900 shadow-sm hover:bg-teal-50 disabled:opacity-50"
                        >
                          Select all ({assetsAwaitingReturn.length})
                        </button>
                        <button
                          type="button"
                          disabled={returnAssetsBusy || !allReturnAssetsSelected}
                          onClick={() => void handleConfirmAssetReturns()}
                          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
                        >
                          {returnAssetsBusy ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" aria-hidden />
                          )}
                          Confirm asset returns
                        </button>
                        <span className="text-xs text-teal-800">
                          {selectedReturnCount} of {assetsAwaitingReturn.length} selected
                        </span>
                      </div>
                      {returnAssetsError ? (
                        <p className="mt-2 text-sm text-rose-700">{returnAssetsError}</p>
                      ) : null}
                    </div>
                  ) : null}
                  {showReturnCheckpoints && allAssetsReturned ? (
                    <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                      All assets are marked returned. You may approve the exit application.
                    </div>
                  ) : null}
                  {data.employee_assets?.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-500">No assets on file.</p>
                  ) : (
                    data.employee_assets?.map((a) => {
                      const assetReturned = truthyReturned(a.is_returned);
                      const showReturnCheckpoint =
                        showReturnCheckpoints && !assetReturned;
                      const isSelectedForReturn = !!returnAssetSelection[a.id];
                      /** Not returned assets can get assign / change while exit is pending or in progress */
                      const showCustodyButton =
                        exitAllowsAssetCustodyActions(data.application_status) &&
                        !assetReturned &&
                        !showReturnCheckpoints;

                      const returnedToIdNumeric = numericId(a.returned_to_id);
                      const pickedLocallyWhilePending =
                        activePendingHandover[a.id] !== undefined &&
                        activePendingHandover[a.id] !== null;

                      /** Someone assigned: saved on row or picked in UI before Move forward */
                      const hasAssignee =
                        returnedToIdNumeric != null || pickedLocallyWhilePending;

                      const custodyLabel =
                        hasAssignee && assigneeDisplayName(a) != null
                          ? assigneeDisplayName(a)
                          : hasAssignee
                            ? `User #${effectiveHandoverToUserId(a, activePendingHandover) ?? "?"}`
                            : null;

                      return (
                        <div
                          key={a.id}
                          className={`py-4 first:pt-0 last:pb-0 ${
                            showReturnCheckpoint && isSelectedForReturn
                              ? "-mx-2 rounded-xl bg-teal-50/80 px-2 ring-1 ring-teal-200"
                              : ""
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            {showReturnCheckpoint ? (
                              <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={isSelectedForReturn}
                                  disabled={returnAssetsBusy}
                                  onChange={() => toggleReturnAssetSelection(a.id)}
                                  className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                />
                                <span className="font-semibold text-slate-900">
                                  {a.asset_name ?? `#${a.id}`}
                                </span>
                              </label>
                            ) : (
                              <p className="font-semibold text-slate-900">
                                {a.asset_name ?? `#${a.id}`}
                              </p>
                            )}
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${
                                assetReturned
                                  ? "bg-emerald-50 text-emerald-800 ring-emerald-200/80"
                                  : "bg-slate-100 text-slate-700 ring-slate-200"
                              }`}
                            >
                              {assetReturned ? "Returned" : "Not returned"}
                            </span>
                          </div>
                          {a.asset_summary ? (
                            <p className="mt-1 text-xs text-slate-600">{a.asset_summary}</p>
                          ) : null}
                          <dl className="mt-3 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
                            <div>
                              Type:{" "}
                              <span className="font-medium text-slate-800">{a.asset_type ?? "—"}</span>
                            </div>
                            <div>
                              Custodian when returned:{" "}
                              <span className="font-medium text-slate-800">
                                {assetReturned
                                  ? (a.returned_to_name ?? "—")
                                  : (custodyLabel ?? "Not assigned")}
                              </span>
                            </div>
                            <div className="sm:col-span-2">
                              Handover:{" "}
                              <span className="font-medium text-slate-800">
                                {fmtLong(a.handover_date_time)}
                              </span>
                            </div>
                          </dl>
                          {showCustodyButton ? (
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => void openEmployeePickerForAsset(a.id)}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
                              >
                                {hasAssignee ? (
                                  <>
                                    <UserRoundCog className="h-4 w-4 text-indigo-600" aria-hidden />
                                    Change user
                                  </>
                                ) : (
                                  <>
                                    <UserRoundPlus className="h-4 w-4 text-indigo-600" aria-hidden />
                                    Assign to user
                                  </>
                                )}
                              </button>
                            </div>
                          ) : null}
                          {showReturnCheckpoint ? (
                            <p className="mt-2 text-xs text-teal-800">
                              Check this card when the asset has been physically returned.
                            </p>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              <section className="overflow-hidden rounded-[22px] border border-slate-200/90 bg-white shadow-[0_12px_40px_-12px_rgba(15,23,42,0.12)] ring-1 ring-slate-950/[0.04]">
                <header className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-5 py-4 sm:px-6">
                  <Layers className="h-4 w-4 text-teal-600" />
                  <h2 className="text-base font-semibold text-slate-900">
                    Handover tasks ({data.handover_queries?.length ?? 0})
                  </h2>
                </header>
                <div className="divide-y divide-slate-100 p-4 sm:p-6">
                  {data.handover_queries?.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-500">
                      No handover queries.
                    </p>
                  ) : (
                    data.handover_queries?.map((h) => (
                      <div
                        key={h.handover_query_id}
                        className="space-y-2 py-4 first:pt-0 last:pb-0"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-slate-900">
                            {h.custom_task_name?.trim()
                              ? h.custom_task_name
                              : (h.asset_name ?? `Task #${h.handover_query_id}`)}
                          </p>
                          {h.handover_status ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-700 ring-1 ring-slate-200">
                              {String(h.handover_status).replace(/_/g, " ")}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-slate-600">
                          Manager: {h.manager_name ?? "—"} · Due:{" "}
                          <span className="font-medium">{fmtDateOnly(h.handover_date)}</span>
                        </p>
                        {h.remarks?.trim() ? (
                          <p className="whitespace-pre-wrap text-sm text-slate-700">{h.remarks}</p>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </section>
              </div>
            </>
          )}
        </div>
      </div>

      {correctionOpen ? (
        <div
          className={waModalShellClass()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="correction-dialog-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close"
            disabled={corrBusy}
            onClick={() => !corrBusy && setCorrectionOpen(false)}
          />
          <div className={waModalPanelClass()}>
            <div className={waModalHeaderClass("teal")}>
              <div className="min-w-0 flex-1 pr-2">
                <h2
                  id="correction-dialog-title"
                  className="text-[15px] font-semibold text-white sm:text-lg sm:font-bold sm:text-slate-900"
                >
                  Correct termination
                </h2>
                <p className="mt-1 text-[12px] text-white/80 sm:text-sm sm:text-slate-500">
                  Adjust termination reason, dates, or response message.
                </p>
              </div>
              <button
                type="button"
                disabled={corrBusy}
                onClick={() => setCorrectionOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/25 bg-white/10 text-white active:bg-white/20 sm:border-slate-200 sm:bg-white sm:text-slate-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
              {corrModalError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
                  {corrModalError}
                </div>
              ) : null}
              <div>
                <label
                  htmlFor="corr-reason"
                  className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Termination reason
                </label>
                <textarea
                  id="corr-reason"
                  rows={4}
                  value={corrReason}
                  onChange={(e) => setCorrReason(e.target.value)}
                  className={waFieldCls()}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="corr-last-day"
                    className="text-[13px] font-medium text-[#667781] sm:text-xs sm:font-semibold sm:uppercase sm:tracking-wide sm:text-slate-500"
                  >
                    Last working day
                  </label>
                  <input
                    id="corr-last-day"
                    type="date"
                    value={corrLastDay}
                    onChange={(e) => setCorrLastDay(e.target.value)}
                    className={waFieldCls()}
                  />
                </div>
                <div>
                  <label
                    htmlFor="corr-exit-date"
                    className="text-[13px] font-medium text-[#667781] sm:text-xs sm:font-semibold sm:uppercase sm:tracking-wide sm:text-slate-500"
                  >
                    Exit date
                  </label>
                  <input
                    id="corr-exit-date"
                    type="date"
                    value={corrExitDate}
                    onChange={(e) => setCorrExitDate(e.target.value)}
                    className={waFieldCls()}
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="corr-response"
                  className="text-[13px] font-medium text-[#667781] sm:text-xs sm:font-semibold sm:uppercase sm:tracking-wide sm:text-slate-500"
                >
                  Response message
                </label>
                <textarea
                  id="corr-response"
                  rows={3}
                  value={corrResponseMsg}
                  onChange={(e) => setCorrResponseMsg(e.target.value)}
                  placeholder="Optional notes shown on the record…"
                  className={waFieldCls()}
                />
              </div>
            </div>
            <div
              className={waModalFooterClass()}
              style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
            >
              <button
                type="button"
                disabled={corrBusy}
                onClick={() => setCorrectionOpen(false)}
                className={zohoSecondaryBtnCls()}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={corrBusy}
                onClick={() => void handleCorrectionSubmit()}
                className={zohoPrimaryBtnCls()}
              >
                {corrBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Saving…
                  </>
                ) : (
                  <>
                    <PencilLine className="h-4 w-4" aria-hidden />
                    Save correction
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {assignPickerOpen ? (
        <div
          className={waModalShellClass()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="assign-picker-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close assign picker"
            disabled={assignHandoverSaving}
            onClick={() => {
              if (assignHandoverSaving) return;
              setAssignPickerOpen(false);
              setAssignForAssetId(null);
            }}
          />
          <div className={waModalPanelClass()}>
            <div className={waModalHeaderClass("indigo")}>
              <div className="min-w-0 flex-1 pr-2">
                <h2
                  id="assign-picker-title"
                  className="text-[15px] font-semibold text-white sm:text-lg sm:font-bold sm:text-slate-900"
                >
                  {assignPickerIsChange ? "Change handover manager" : "Assign to user"}
                </h2>
                <p className="mt-1 text-[12px] text-white/80 sm:text-sm sm:text-slate-500">
                  Pick an organization member to receive custody of this asset.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (assignHandoverSaving) return;
                  setAssignPickerOpen(false);
                  setAssignForAssetId(null);
                }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/25 bg-white/10 text-white active:bg-white/20 sm:border-slate-200 sm:bg-white sm:text-slate-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="shrink-0 border-b border-[#E9EDEF] px-4 py-3 sm:px-5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8696A0]" />
                <input
                  type="search"
                  value={assignSearch}
                  onChange={(e) => setAssignSearch(e.target.value)}
                  placeholder="Search name or email"
                  className={searchFieldCls()}
                />
              </div>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
              {assignPersistError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
                  {assignPersistError}
                </div>
              ) : null}
              {assignFetchError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
                  {assignFetchError}
                </div>
              ) : null}
              {assignLoading ? (
                <div className="flex flex-col items-center gap-3 py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                  <p className="text-sm text-slate-600">Loading organization members…</p>
                </div>
              ) : assignHandoverSaving ? (
                <div className="flex flex-col items-center gap-3 py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                  <p className="text-sm text-slate-600">Saving handover…</p>
                </div>
              ) : assignModalFilteredEmployees.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  No members match your search.
                </p>
              ) : (
                assignModalFilteredEmployees.map((row) => {
                  const uid = numericId(row.user_id);
                  if (uid == null) return null;
                  const img = orgUserImageById[uid] ?? null;
                  return (
                    <div
                      key={String(row.user_id)}
                      className="flex items-center gap-2.5 rounded-lg border border-[#EEF2F6] bg-[#F9FAFB] px-2.5 py-2 lg:border-slate-100 lg:bg-slate-50/60 lg:px-3 lg:py-2.5"
                    >
                      <UserAvatarButton
                        name={row.user_name}
                        userImage={img}
                        size="sm"
                        onZoom={openPhotoZoom}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-[#1F2937] lg:text-sm">
                          {row.user_name ?? `User #${row.user_id}`}
                        </p>
                        <p className={`truncate ${mobileCaptionCls}`}>
                          {row.user_email ?? "—"}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={assignHandoverSaving}
                        onClick={() => void assignCustodian(uid)}
                        className="shrink-0 rounded-lg bg-[#008CD3] px-3 py-2 text-[12px] font-semibold text-white active:scale-[0.98] disabled:opacity-50 lg:bg-indigo-600 lg:hover:bg-indigo-700"
                      >
                        {assignPickerIsChange ? "Update" : "Assign"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
            <div
              className={waModalFooterClass()}
              style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
            >
              <button
                type="button"
                disabled={assignHandoverSaving}
                onClick={() => {
                  setAssignPickerOpen(false);
                  setAssignForAssetId(null);
                }}
                className={zohoSecondaryBtnCls()}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {rejectModalOpen ? (
        <div
          className={waModalShellClass()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-exit-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close"
            disabled={rejectBusy}
            onClick={() => !rejectBusy && setRejectModalOpen(false)}
          />
          <div className={waModalPanelClass()}>
            <div className={waModalHeaderClass("rose")}>
              <div className="min-w-0 flex-1 pr-2">
                <h2 id="reject-exit-title" className="text-[15px] font-semibold text-white sm:text-lg sm:font-bold sm:text-slate-900">
                  Reject application
                </h2>
                <p className="mt-1 text-[12px] text-white/80 sm:text-sm sm:text-slate-500">
                  Send a rejection message for this exit application.
                </p>
              </div>
              <button
                type="button"
                disabled={rejectBusy}
                onClick={() => setRejectModalOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/25 bg-white/10 text-white active:bg-white/20 sm:border-slate-200 sm:bg-white sm:text-slate-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
              {rejectModalError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
                  {rejectModalError}
                </div>
              ) : null}
              <div>
                <label
                  htmlFor="reject-msg"
                  className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Response message / reason
                </label>
                <textarea
                  id="reject-msg"
                  rows={4}
                  value={rejectMessage}
                  onChange={(e) => setRejectMessage(e.target.value)}
                  placeholder="Explain why this exit cannot proceed…"
                  className={waFieldCls()}
                />
              </div>
            </div>
            <div
              className={waModalFooterClass()}
              style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
            >
              <button
                type="button"
                disabled={rejectBusy}
                onClick={() => setRejectModalOpen(false)}
                className={zohoSecondaryBtnCls()}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rejectBusy}
                onClick={() => void handleRejectSubmit()}
                className={zohoDangerBtnCls()}
              >
                {rejectBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Rejecting…
                  </>
                ) : (
                  <>
                    <Ban className="h-4 w-4" aria-hidden />
                    Confirm rejection
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {approveModalOpen ? (
        <div
          className={waModalShellClass()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="approve-exit-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close"
            disabled={approveBusy}
            onClick={() => !approveBusy && setApproveModalOpen(false)}
          />
          <div className={waModalPanelClass()}>
            <div className={waModalHeaderClass("emerald")}>
              <div className="min-w-0 flex-1 pr-2">
                <h2
                  id="approve-exit-title"
                  className="text-[15px] font-semibold text-white sm:text-lg sm:font-bold sm:text-slate-900"
                >
                  Approve application
                </h2>
                <p className="mt-1 text-[12px] text-white/80 sm:text-sm sm:text-slate-500">
                  Complete this exit after assets and handover tasks are done.
                </p>
              </div>
              <button
                type="button"
                disabled={approveBusy}
                onClick={() => setApproveModalOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/25 bg-white/10 text-white active:bg-white/20 sm:border-slate-200 sm:bg-white sm:text-slate-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
              {approveModalError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
                  {approveModalError}
                </div>
              ) : null}
              <div>
                <label
                  htmlFor="approve-msg"
                  className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Response message
                </label>
                <textarea
                  id="approve-msg"
                  rows={4}
                  value={approveMessage}
                  onChange={(e) => setApproveMessage(e.target.value)}
                  className={waFieldCls()}
                />
              </div>
            </div>
            <div
              className={waModalFooterClass()}
              style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
            >
              <button
                type="button"
                disabled={approveBusy}
                onClick={() => setApproveModalOpen(false)}
                className={zohoSecondaryBtnCls()}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={approveBusy}
                onClick={() => void handleApproveSubmit()}
                className={zohoPrimaryBtnCls()}
              >
                {approveBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Approving…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                    Confirm approval
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ProfilePhotoZoomModal
        open={photoZoom != null}
        imageUrl={photoZoom?.imageUrl ?? ""}
        alt={photoZoom?.alt ?? ""}
        onClose={() => setPhotoZoom(null)}
      />
    </div>
  );
}
