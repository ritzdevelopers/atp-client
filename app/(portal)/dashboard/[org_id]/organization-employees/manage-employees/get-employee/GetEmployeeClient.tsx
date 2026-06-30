"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Building2,
  CalendarDays,
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Copy,
  Check,
  Download,
  Eye,
  FileText,
  Globe,
  Hash,
  Laptop,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
  UserRound,
  User,
  Users,
  Wallet,
  X,
  Activity,
  ClipboardList,
} from "lucide-react";

import {
  addUserAddress,
  createUserBackgroundVerification,
  deleteEmployeeDocuments,
  EMPLOYEE_ASSET_TYPES,
  getAllUserBackgroundVerifications,
  getManagementEmployeesPage,
  getSingleEmployee,
  getSingleEmployeeAsset,
  getSingleUserBackgroundVerification,
  returnEmployeeAssets,
  updateEmployeeAssetsBatch,
  updateEmployeeBackgroundVerificationStatus,
  updateEmployeeDocument,
  updateUserAddress,
  updateUserBackgroundVerification,
  uploadEmployeeAssetsBatch,
  uploadEmployeeDocuments,
  type BackgroundVerificationDetailRow,
  type BackgroundVerificationInfoPayload,
  type BackgroundVerificationPersonRole,
  type BackgroundVerificationReferenceItem,
  type BackgroundVerificationStatus,
  type EmployeeAddressEntryPayload,
  type EmployeeAddressUpdateEntryPayload,
  type EmployeeAssetRow,
  type EmployeeOnboardingDocumentField,
  type SingleEmployeeData,
} from "@/services/adminUser";
import {
  fetchSingleUserAttendanceHistory,
  type AttendanceHistoryRow,
  type EmployeeAttendanceRow,
} from "@/services/attendanceHistory";
import ExportAttendanceHistoryModal from "@/components/portal-dashboard/attendance/ExportAttendanceHistoryModal";
import {
  buildMonthAttendanceView,
  calendarHeatmapClass,
  formatCalculatedStatusLabel,
  type CalculatedAttendanceStatus,
} from "@/lib/attendanceRules";
import {
  createEmployeeBankInfo,
  updateEmployeeBankInfo,
} from "@/services/bankInfo";
import {
  assignIpToEmployee,
  assignUserToShift,
  getCompanyIPAddresses,
  getCompanyShifts,
  getUserShifts,
  unassignIpFromEmployee,
  unassignUserFromShift,
  type CompanyIpRow,
  type CompanyShiftRow,
} from "@/services/organizationSettings";
import {
  assignHandoverManager,
  buildEmployeeExitDetailHref,
  employeeExitCompleted,
  fetchEmployeeExitProcessById,
  fetchEmployeeExitProcesses,
  handoverDateTimeSqlNow,
  isInProgressExitStatus,
  isOpenExitStatus,
  isPendingExitStatus,
  pickRelevantEmployeeExitRow,
  returnAssetsCompleted,
  updateAssignedHandoverManager,
  type EmployeeExitHandoverQueryRow,
  type EmployeeExitProcessRow,
} from "@/services/employeeExit";
import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import {
  clearEmployeeBgvCache,
  clearEmployeeDetailCache,
  clearEmployeeShiftsCache,
  clearManageOrgUsersCache,
  readEmployeeAttendanceCache,
  readEmployeeBgvCache,
  readEmployeeDetailCache,
  readEmployeeShiftsCache,
  shouldRefreshEmployeeAttendanceCache,
  shouldRefreshEmployeeBgvCache,
  shouldRefreshEmployeeDetailCache,
  shouldRefreshEmployeeShiftsCache,
  writeEmployeeAttendanceCache,
  writeEmployeeBgvCache,
  writeEmployeeDetailCache,
  writeEmployeeShiftsCache,
} from "@/lib/employeeManagementCache";

// ── Design system tokens ──────────────────────────────────────────────
const GLASS_CARD =
  "rounded-[20px] border border-white/60 bg-white/80 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl";

const WEEKDAY_META = [
  { keys: ["monday", "mon"], label: "Monday" },
  { keys: ["tuesday", "tue"], label: "Tuesday" },
  { keys: ["wednesday", "wed"], label: "Wednesday" },
  { keys: ["thursday", "thu"], label: "Thursday" },
  { keys: ["friday", "fri"], label: "Friday" },
  { keys: ["saturday", "sat"], label: "Saturday" },
  { keys: ["sunday", "sun"], label: "Sunday" },
] as const;

type GetEmployeeClientProps = {
  userId: string;
};

const USER_ICON_COLORS = [
  "bg-[#E8F4FB] text-[#008CD3]",
  "bg-[#E6F4EA] text-[#0F9D58]",
  "bg-[#FEF3E6] text-[#E8710A]",
  "bg-[#F3E8FD] text-[#7B1FA2]",
  "bg-[#FCE8E6] text-[#D93025]",
  "bg-[#E8EAF6] text-[#3F51B5]",
];

function userColorClass(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return USER_ICON_COLORS[Math.abs(hash) % USER_ICON_COLORS.length];
}

function userInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
      className="fixed inset-0 z-[10050] flex items-center justify-center bg-[#111B21]/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="employee-profile-zoom-title"
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
          id="employee-profile-zoom-title"
          className="mt-2.5 text-center text-[13px] font-medium text-white"
        >
          {alt}
        </p>
      </div>
    </div>
  );
}

function ProfileAvatarButton({
  name,
  imageUrl,
  size = "md",
  onZoom,
  className = "",
}: {
  name: string;
  imageUrl: string | null;
  size?: "md" | "lg";
  onZoom: (url: string, alt: string) => void;
  className?: string;
}) {
  const box = size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const textSize = size === "lg" ? "text-base" : "text-sm";

  if (imageUrl) {
    return (
      <button
        type="button"
        onClick={() => onZoom(imageUrl, name)}
        className={`${box} shrink-0 overflow-hidden rounded-md ring-2 ring-white/40 transition active:opacity-90 ${className}`}
        aria-label={`View ${name} profile photo`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" className="h-full w-full object-cover object-top" />
      </button>
    );
  }

  return (
    <span
      className={`flex ${box} shrink-0 items-center justify-center rounded-md font-bold shadow-md ${textSize} ${userColorClass(name)} ${className}`}
      aria-hidden
    >
      {userInitials(name)}
    </span>
  );
}

function asText(value: unknown, fallback = "—"): string {
  if (value == null || value === "") return fallback;
  return String(value);
}

function asNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function formatDate(value: unknown): string {
  if (value == null || value === "") return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: unknown): string {
  if (value == null || value === "") return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatLabel(value: unknown): string {
  if (value == null || value === "") return "—";
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeWeekdayIndex(token: string): number {
  const normalized = token.trim().toLowerCase().replace(/_/g, "");
  for (let i = 0; i < WEEKDAY_META.length; i += 1) {
    if (WEEKDAY_META[i].keys.some((key) => normalized === key || normalized.startsWith(key))) {
      return i;
    }
  }
  return -1;
}

function formatWorkingDays(value: unknown): string {
  if (value == null || value === "") return "—";
  const raw = String(value).trim();
  if (/ to /i.test(raw) && !raw.includes(",")) {
    return raw.replace(/\s+to\s+/gi, " To ");
  }

  const indices = [
    ...new Set(
      raw
        .split(/[,;/|]+/)
        .map((part) => normalizeWeekdayIndex(part))
        .filter((index) => index >= 0),
    ),
  ].sort((a, b) => a - b);

  if (indices.length === 0) return formatLabel(raw);

  const ranges: string[] = [];
  let rangeStart = indices[0];
  let rangeEnd = indices[0];

  for (let i = 1; i < indices.length; i += 1) {
    if (indices[i] === rangeEnd + 1) {
      rangeEnd = indices[i];
    } else {
      ranges.push(
        rangeStart === rangeEnd
          ? WEEKDAY_META[rangeStart].label
          : `${WEEKDAY_META[rangeStart].label} To ${WEEKDAY_META[rangeEnd].label}`,
      );
      rangeStart = indices[i];
      rangeEnd = indices[i];
    }
  }

  ranges.push(
    rangeStart === rangeEnd
      ? WEEKDAY_META[rangeStart].label
      : `${WEEKDAY_META[rangeStart].label} To ${WEEKDAY_META[rangeEnd].label}`,
  );

  return ranges.join(", ");
}

function formatMonthYear(month: unknown, year: unknown): string {
  const monthNum = asNumber(month, 0);
  const yearNum = asNumber(year, 0);
  if (monthNum <= 0 || yearNum <= 0) return "—";
  const d = new Date(yearNum, monthNum - 1, 1);
  if (Number.isNaN(d.getTime())) return `${monthNum}/${yearNum}`;
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function formatTime(value: unknown): string {
  if (value == null || value === "") return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatWorkingTime(minutesValue: unknown): string {
  if (minutesValue === undefined || minutesValue === null || minutesValue === "") return "—";
  const minutesNum = Number(minutesValue);
  if (Number.isNaN(minutesNum) || minutesNum < 0) return String(minutesValue);
  const hours = Math.floor(minutesNum / 60);
  const minutes = minutesNum % 60;
  return `${hours}h ${minutes}m`;
}

function normalizeAttendanceStatus(
  status: unknown,
): "present" | "late" | "leave" | "half_day" | "short_leave" | "other" {
  const value = String(status ?? "").trim().toLowerCase();
  if (!value) return "other";
  if (value.includes("short") && value.includes("leave")) return "short_leave";
  if (value.includes("half")) return "half_day";
  if (value.includes("late")) return "late";
  if (value.includes("present")) return "present";
  if (value.includes("leave") || value.includes("absent")) return "leave";
  return "other";
}

function calculatedStatusBadgeClass(status: string | undefined): string {
  const value = String(status || "").trim().toLowerCase();
  if (value === "present" || value === "present_full_day") {
    return "bg-[#ECFDF5] text-[#059669] ring-[#A7F3D0]";
  }
  if (value === "late") return "bg-[#FFFBEB] text-[#D97706] ring-[#FDE68A]";
  if (value === "absent") return "bg-[#FEF2F2] text-[#DC2626] ring-[#FECACA]";
  if (value === "half_day") return "bg-[#F5F3FF] text-[#7C3AED] ring-[#DDD6FE]";
  if (value === "short_leave") return "bg-[#EFF6FF] text-[#2563EB] ring-[#BFDBFE]";
  if (value === "weekly_off") return "bg-[#F1F5F9] text-[#64748B] ring-[#E2E8F0]";
  return "bg-[#F1F5F9] text-[#64748B] ring-[#E2E8F0]";
}

function attendanceStatusClass(status: unknown): string {
  const bucket = normalizeAttendanceStatus(status);
  if (bucket === "present") return "bg-[#ECFDF5] text-[#059669] ring-[#A7F3D0]";
  if (bucket === "late") return "bg-[#FFFBEB] text-[#D97706] ring-[#FDE68A]";
  if (bucket === "leave") return "bg-[#FEF2F2] text-[#DC2626] ring-[#FECACA]";
  if (bucket === "half_day") return "bg-[#F5F3FF] text-[#7C3AED] ring-[#DDD6FE]";
  if (bucket === "short_leave") return "bg-[#EFF6FF] text-[#2563EB] ring-[#BFDBFE]";
  return "bg-[#F1F5F9] text-[#64748B] ring-[#E2E8F0]";
}

function attendanceDayClass(status: unknown): string {
  const bucket = normalizeAttendanceStatus(status);
  if (bucket === "present") return "bg-[#10B981] text-white shadow-sm";
  if (bucket === "late") return "bg-[#F59E0B] text-white shadow-sm";
  if (bucket === "leave") return "bg-[#EF4444] text-white shadow-sm";
  if (bucket === "half_day") return "bg-[#8B5CF6] text-white shadow-sm";
  if (bucket === "short_leave") return "bg-[#2563EB] text-white shadow-sm";
  return "bg-[#64748B] text-white shadow-sm";
}

function workedForDuration(joinDate: unknown): string {
  if (joinDate == null || joinDate === "") return "—";
  const start = new Date(String(joinDate));
  if (Number.isNaN(start.getTime())) return "—";
  const now = new Date();
  let months =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 0) months = 0;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  if (years > 0 && remMonths > 0) return `${years}y ${remMonths}m`;
  if (years > 0) return `${years} year${years === 1 ? "" : "s"}`;
  return `${remMonths} month${remMonths === 1 ? "" : "s"}`;
}

type StatAccent = "primary" | "success" | "warning" | "violet";

const STAT_ACCENTS: Record<
  StatAccent,
  { card: string; icon: string; value: string }
> = {
  primary: {
    card: "from-[#2563EB]/[0.08] to-[#3B82F6]/[0.02]",
    icon: "bg-gradient-to-br from-[#2563EB] to-[#3B82F6] text-white",
    value: "text-[#1D4ED8]",
  },
  success: {
    card: "from-[#10B981]/[0.08] to-[#34D399]/[0.02]",
    icon: "bg-gradient-to-br from-[#10B981] to-[#34D399] text-white",
    value: "text-[#059669]",
  },
  warning: {
    card: "from-[#F59E0B]/[0.08] to-[#FBBF24]/[0.02]",
    icon: "bg-gradient-to-br from-[#F59E0B] to-[#FBBF24] text-white",
    value: "text-[#D97706]",
  },
  violet: {
    card: "from-[#8B5CF6]/[0.08] to-[#A78BFA]/[0.02]",
    icon: "bg-gradient-to-br from-[#8B5CF6] to-[#A78BFA] text-white",
    value: "text-[#7C3AED]",
  },
};

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
  delay = 0,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent: StatAccent;
  delay?: number;
}) {
  const a = STAT_ACCENTS[accent];
  return (
    <div
      className={`card-fade-in group relative overflow-hidden rounded-[20px] border border-white/60 bg-gradient-to-br ${a.card} bg-white/80 p-5 shadow-[0_4px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_44px_rgba(15,23,42,0.12)]`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-[#64748B]">{label}</p>
          <p className={`mt-1.5 text-[30px] font-bold leading-none tabular-nums ${a.value}`}>
            {value}
          </p>
          {sub ? <p className="mt-2 text-[12px] text-[#94A3B8]">{sub}</p> : null}
        </div>
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-transform duration-300 group-hover:scale-110 ${a.icon}`}
        >
          {icon}
        </span>
      </div>
    </div>
  );
}

function DetailGrid({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">{children}</dl>;
}

function DetailItem({
  label,
  value,
  icon,
  full = false,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  full?: boolean;
}) {
  return (
    <div className={`flex items-start gap-3 ${full ? "sm:col-span-2" : ""}`}>
      {icon ? (
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F1F5F9] text-[#64748B]">
          {icon}
        </span>
      ) : null}
      <div className="min-w-0">
        <dt className="text-[13px] font-medium text-[#94A3B8]">{label}</dt>
        <dd className="mt-0.5 text-[15px] font-semibold text-[#0F172A]">{value}</dd>
      </div>
    </div>
  );
}

function QuickActionChip({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl border border-white/70 bg-white/70 px-3.5 py-2 text-[13px] font-semibold text-[#334155] shadow-sm backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-[#2563EB] hover:shadow-md active:scale-95"
    >
      <span className="text-[#2563EB]">{icon}</span>
      {label}
    </button>
  );
}

function HeroMetaItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/60 px-3.5 py-2.5 backdrop-blur">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#2563EB] shadow-sm">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-[#64748B]">{label}</p>
        <p className="truncate text-[14px] font-semibold text-[#0F172A]">{value}</p>
      </div>
    </div>
  );
}

function AttendanceMiniCalendar({
  month,
  year,
  rows,
  selectedDay,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
}: {
  month: number;
  year: number;
  rows: AttendanceHistoryRow[];
  selectedDay: number | null;
  onSelectDay: (day: number) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  const monthView = useMemo(
    () => buildMonthAttendanceView(year, month, rows),
    [year, month, rows],
  );

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const weekdayLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <div className="flex flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB]/15 to-[#3B82F6]/5 text-[#2563EB]">
            <CalendarDays className="h-4 w-4" aria-hidden />
          </span>
          <h3 className="text-[15px] font-semibold text-[#0F172A]">{monthLabel}</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPrevMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] transition hover:bg-[#F1F5F9] hover:text-[#0F172A]"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] transition hover:bg-[#F1F5F9] hover:text-[#0F172A]"
            aria-label="Next month"
          >
            <ChevronLeft className="h-4 w-4 rotate-180" />
          </button>
        </div>
      </div>
      <div className="mb-1.5 grid grid-cols-7 gap-1">
        {weekdayLabels.map((label, index) => (
          <span
            key={`${label}-${index}`}
            className="flex h-6 items-center justify-center text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]"
          >
            {label}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {monthView.calendarCells.map((cell, index) =>
          cell.day == null ? (
            <span key={`empty-${index}`} className="h-9" aria-hidden />
          ) : (
            <button
              key={`day-${cell.day}`}
              type="button"
              onClick={() => onSelectDay(cell.day!)}
              title={`Day ${cell.day}: ${formatCalculatedStatusLabel(cell.status)}`}
              className={`flex h-9 w-full items-center justify-center rounded-xl text-[13px] font-semibold transition-all duration-200 hover:-translate-y-0.5 ${
                selectedDay === cell.day ? "ring-2 ring-[#2563EB] ring-offset-2" : ""
              } ${calendarHeatmapClass(cell.status, cell.isWeekend ?? cell.isSunday)}`}
              aria-label={`Day ${cell.day}`}
            >
              {cell.day}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

type HeroQuickAction = { id: string; icon: ReactNode; label: string };

function ProfileHeroCard({
  name,
  role,
  department,
  isActive,
  imageUrl,
  onImageZoom,
  empCode,
  joined,
  workDuration,
  company,
  email,
  phone,
  quickActions,
  onQuickAction,
  fullAttendanceHref,
}: {
  name: string;
  role: string;
  department: string;
  isActive: boolean;
  imageUrl: string | null;
  onImageZoom: (url: string, alt: string) => void;
  empCode: string;
  joined: string;
  workDuration: string;
  company: string;
  email: string;
  phone: string;
  quickActions: HeroQuickAction[];
  onQuickAction: (id: string) => void;
  fullAttendanceHref?: string;
}) {
  return (
    <article className="card-fade-in relative overflow-hidden rounded-[24px] border border-white/60 bg-white/80 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-br from-[#2563EB]/12 via-[#3B82F6]/6 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#8B5CF6]/10 blur-3xl"
        aria-hidden
      />
      <div className="relative grid gap-6 p-6 lg:grid-cols-[1.4fr_1fr] lg:p-7">
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-5">
            <div className="relative shrink-0">
              <ProfileAvatarButton
                name={name}
                imageUrl={imageUrl}
                size="lg"
                onZoom={onImageZoom}
                className="!h-24 !w-24 !rounded-3xl shadow-lg ring-4 ring-white/70"
              />
              <span
                className={`absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-white ${
                  isActive ? "bg-[#10B981]" : "bg-[#94A3B8]"
                }`}
                aria-hidden
              >
                {isActive ? (
                  <span className="badge-pulse-dot h-2 w-2 rounded-full bg-white" />
                ) : null}
              </span>
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="truncate text-[28px] font-bold leading-tight tracking-tight text-[#0F172A]">
                  {name}
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                    isActive
                      ? "bg-[#ECFDF5] text-[#059669] ring-1 ring-inset ring-[#A7F3D0]"
                      : "bg-[#F1F5F9] text-[#64748B] ring-1 ring-inset ring-[#E2E8F0]"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-[#10B981]" : "bg-[#94A3B8]"}`}
                  />
                  {isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="mt-1.5 text-[16px] font-semibold text-[#334155]">{role}</p>
              <div className="mt-2 inline-flex flex-col rounded-xl border border-[#E8F4FB] bg-[#F8FCFF] px-3 py-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                  Employee code
                </span>
                <span className="text-[14px] font-semibold text-[#008CD3]">{empCode}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[#64748B]">
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-[#94A3B8]" />
                  {department}
                </span>
                {email !== "—" ? (
                  <a
                    href={`mailto:${email}`}
                    className="inline-flex items-center gap-1.5 hover:text-[#2563EB]"
                  >
                    <Mail className="h-4 w-4 text-[#94A3B8]" />
                    {email}
                  </a>
                ) : null}
                {phone !== "—" ? (
                  <a
                    href={`tel:${phone}`}
                    className="inline-flex items-center gap-1.5 hover:text-[#2563EB]"
                  >
                    <Phone className="h-4 w-4 text-[#94A3B8]" />
                    {phone}
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <QuickActionChip
                key={action.id}
                icon={action.icon}
                label={action.label}
                onClick={() => onQuickAction(action.id)}
              />
            ))}
            {fullAttendanceHref ? (
              <Link
                href={fullAttendanceHref}
                className="inline-flex items-center gap-2 rounded-xl border border-[#CEEAD6] bg-[#E6F4EA] px-3.5 py-2 text-[13px] font-semibold text-[#0F9D58] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#D4EDDA] hover:shadow-md active:scale-95"
              >
                <CalendarCheck className="h-4 w-4" aria-hidden />
                Full attendance
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 self-center sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <HeroMetaItem icon={<CalendarDays className="h-4 w-4" />} label="Joining date" value={joined} />
          <HeroMetaItem icon={<Clock className="h-4 w-4" />} label="Work duration" value={workDuration} />
          <HeroMetaItem icon={<Building2 className="h-4 w-4" />} label="Company" value={company} />
        </div>
      </div>
    </article>
  );
}

type ActivityPanelTab =
  | "recent_activity"
  | "leave_balance"
  | "leave_requests"
  | "attendance_queries";

const ACTIVITY_TABS: { id: ActivityPanelTab; label: string; icon: ReactNode }[] = [
  { id: "recent_activity", label: "Activity", icon: <Activity className="h-3.5 w-3.5" /> },
  { id: "leave_balance", label: "Leave balance", icon: <Briefcase className="h-3.5 w-3.5" /> },
  { id: "leave_requests", label: "Leave requests", icon: <FileText className="h-3.5 w-3.5" /> },
  {
    id: "attendance_queries",
    label: "Queries",
    icon: <ClipboardList className="h-3.5 w-3.5" />,
  },
];

function EmptyPanelState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] px-4 py-10 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#94A3B8] shadow-sm">
        <Sparkles className="h-5 w-5" aria-hidden />
      </span>
      <p className="text-[13px] text-[#64748B]">{message}</p>
    </div>
  );
}

type TimelineEntry = {
  key: string;
  title: string;
  description: string;
  time: number;
  timeLabel: string;
  icon: ReactNode;
  ring: string;
};

function buildTimeline(
  leaveQueries: Record<string, unknown>[],
  documents: Record<string, unknown>[],
  assets: Record<string, unknown>[],
  attendanceLogs: Record<string, unknown>[],
): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  const ts = (v: unknown) => {
    const t = new Date(String(v ?? "")).getTime();
    return Number.isNaN(t) ? 0 : t;
  };

  for (const row of leaveQueries) {
    const time = ts(row.updated_at ?? row.created_at ?? row.start_date);
    entries.push({
      key: `leave-${String(row.id ?? time)}`,
      title: `${formatLabel(row.leave_type)} leave ${formatLabel(row.status).toLowerCase()}`,
      description: `${formatDate(row.start_date)}${row.end_date ? ` – ${formatDate(row.end_date)}` : ""}`,
      time,
      timeLabel: formatDate(row.updated_at ?? row.created_at ?? row.start_date),
      icon: <CalendarCheck className="h-4 w-4" />,
      ring: "bg-[#ECFDF5] text-[#10B981] ring-[#A7F3D0]",
    });
  }
  for (const doc of documents) {
    const time = ts(doc.created_at);
    entries.push({
      key: `doc-${String(doc.id ?? time)}`,
      title: "Document uploaded",
      description: asText(doc.document_name, formatLabel(doc.document_type)),
      time,
      timeLabel: formatDate(doc.created_at),
      icon: <FileText className="h-4 w-4" />,
      ring: "bg-[#EFF6FF] text-[#2563EB] ring-[#BFDBFE]",
    });
  }
  for (const asset of assets) {
    const time = ts(asset.assigned_at ?? asset.created_at ?? asset.updated_at);
    entries.push({
      key: `asset-${String(asset.id ?? time)}`,
      title: "Asset assigned",
      description: asText(asset.asset_name, formatLabel(asset.asset_type)),
      time,
      timeLabel: formatDate(asset.assigned_at ?? asset.created_at),
      icon: <Laptop className="h-4 w-4" />,
      ring: "bg-[#F5F3FF] text-[#8B5CF6] ring-[#DDD6FE]",
    });
  }
  for (const log of attendanceLogs.slice(0, 10)) {
    const time = ts(log.timestamp_time);
    entries.push({
      key: `att-${String(log.id ?? time)}`,
      title: `Attendance ${formatLabel(log.action_type).toLowerCase()}`,
      description: formatDateTime(log.timestamp_time),
      time,
      timeLabel: formatDate(log.timestamp_time),
      icon: <Clock className="h-4 w-4" />,
      ring: "bg-[#FFFBEB] text-[#F59E0B] ring-[#FDE68A]",
    });
  }

  return entries.sort((a, b) => b.time - a.time).slice(0, 14);
}

function ActivityTimeline({ items }: { items: TimelineEntry[] }) {
  if (items.length === 0) {
    return <EmptyPanelState message="No recent activity yet." />;
  }
  return (
    <ol className="relative space-y-4 pl-1">
      {items.map((item, index) => (
        <li key={item.key} className="relative flex gap-3">
          <div className="flex flex-col items-center">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${item.ring}`}
            >
              {item.icon}
            </span>
            {index < items.length - 1 ? (
              <span className="mt-1 w-px flex-1 bg-gradient-to-b from-[#E2E8F0] to-transparent" aria-hidden />
            ) : null}
          </div>
          <div className="min-w-0 flex-1 pb-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[14px] font-semibold capitalize text-[#0F172A]">{item.title}</p>
              <span className="shrink-0 text-[12px] text-[#94A3B8]">{item.timeLabel}</span>
            </div>
            <p className="mt-0.5 truncate text-[13px] text-[#64748B]">{item.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function EmployeeInsightsPanel({
  leaveQueries,
  leaveBalance,
  documents,
  attendanceQueries,
  assets = [],
  attendanceLogs = [],
  defaultTab = "recent_activity",
}: {
  leaveQueries: Record<string, unknown>[];
  leaveBalance: Record<string, unknown>[];
  documents: Record<string, unknown>[];
  attendanceQueries: Record<string, unknown>[];
  assets?: Record<string, unknown>[];
  attendanceLogs?: Record<string, unknown>[];
  defaultTab?: ActivityPanelTab;
}) {
  const [activeTab, setActiveTab] = useState<ActivityPanelTab>(defaultTab);

  const timeline = useMemo(
    () => buildTimeline(leaveQueries, documents, assets, attendanceLogs),
    [leaveQueries, documents, assets, attendanceLogs],
  );

  const tabCounts: Record<ActivityPanelTab, number> = {
    recent_activity: timeline.length,
    leave_balance: leaveBalance.length,
    leave_requests: leaveQueries.length,
    attendance_queries: attendanceQueries.length,
  };

  return (
    <div className={`${GLASS_CARD} flex h-full max-h-[42rem] flex-col`}>
      <div className="shrink-0 px-5 pt-5 ">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#8B5CF6]/15 to-[#A78BFA]/5 text-[#8B5CF6]">
            <Sparkles className="h-4.5 w-4.5" aria-hidden />
          </span>
          <h2 className="text-[16px] font-semibold text-[#0F172A]">Employee insights</h2>
        </div>
        <div className="mt-4 overflow-x-auto pb-1">
          <div className="inline-flex min-w-full gap-1 rounded-2xl bg-[#F1F5F9] p-1" role="tablist">
            {ACTIVITY_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const count = tabCounts[tab.id];
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold transition-all ${
                    isActive
                      ? "bg-white text-[#2563EB] shadow-[0_2px_8px_rgba(15,23,42,0.08)]"
                      : "text-[#64748B] hover:text-[#334155]"
                  }`}
                >
                  {tab.icon}
                  <span className="whitespace-nowrap">{tab.label}</span>
                  {count > 0 ? (
                    <span
                      className={`rounded-full px-1.5 text-[11px] tabular-nums ${
                        isActive ? "bg-[#EFF6FF] text-[#2563EB]" : "bg-[#E2E8F0] text-[#64748B]"
                      }`}
                    >
                      {count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4" role="tabpanel">
        {activeTab === "recent_activity" ? <ActivityTimeline items={timeline} /> : null}

        {activeTab === "leave_balance" ? (
          leaveBalance.length === 0 ? (
            <EmptyPanelState message="No leave balance records." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {leaveBalance.map((row, index) => (
                <LeaveBalanceCard key={String(row.id ?? index)} row={row} index={index} />
              ))}
            </div>
          )
        ) : null}

        {activeTab === "leave_requests" ? (
          leaveQueries.length === 0 ? (
            <EmptyPanelState message="No leave requests found." />
          ) : (
            <ul className="space-y-3">
              {leaveQueries.map((row, index) => (
                <ListItemCard key={String(row.id ?? index)}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[14px] font-semibold text-[#0F172A]">
                        {formatLabel(row.leave_type)} leave
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-[13px] text-[#64748B]">
                        <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                        {formatDate(row.start_date)}
                        {row.end_date ? ` – ${formatDate(row.end_date)}` : ""}
                      </p>
                    </div>
                    <StatusPill value={row.status} />
                  </div>
                  {row.reason ? (
                    <p className="mt-2.5 rounded-xl bg-white px-3 py-2 text-[13px] leading-relaxed text-[#64748B]">
                      {asText(row.reason)}
                    </p>
                  ) : null}
                </ListItemCard>
              ))}
            </ul>
          )
        ) : null}

        {activeTab === "attendance_queries" ? (
          attendanceQueries.length === 0 ? (
            <EmptyPanelState message="No attendance queries found." />
          ) : (
            <ul className="space-y-3">
              {attendanceQueries.map((row, index) => (
                <ListItemCard key={String(row.id ?? index)}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[14px] font-semibold text-[#0F172A]">
                        {formatLabel(row.category)}
                      </p>
                      <p className="mt-1 text-[13px] text-[#64748B]">
                        {formatDate(row.attendance_date)}
                      </p>
                    </div>
                    <StatusPill value={row.query_status} />
                  </div>
                  {row.query_message ? (
                    <p className="mt-2.5 rounded-xl bg-white px-3 py-2 text-[13px] leading-relaxed text-[#64748B]">
                      {asText(row.query_message)}
                    </p>
                  ) : null}
                </ListItemCard>
              ))}
            </ul>
          )
        ) : null}
      </div>
    </div>
  );
}

function getEmployeeAttendanceHref(orgId: string, employeeUserId: string): string {
  return `/dashboard/${orgId}/attendance-management/manage-attendance/0?employee_id=${encodeURIComponent(employeeUserId)}`;
}

function AttendanceHistoryTable({
  rows,
  loading,
  error,
  month,
  year,
  onMonthChange,
  onYearChange,
  onRefresh,
  refreshing,
  fullAttendanceHref,
  statusByDate,
  onExport,
  exportDisabled,
}: {
  rows: AttendanceHistoryRow[];
  loading: boolean;
  error: string | null;
  month: number;
  year: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  onRefresh: () => void;
  refreshing: boolean;
  fullAttendanceHref?: string;
  statusByDate: Map<string, CalculatedAttendanceStatus>;
  onExport?: () => void;
  exportDisabled?: boolean;
}) {
  const attendanceRows = useMemo(
    () => rows.filter((row) => Boolean(row.attendance_date || row.attendance_history)),
    [rows],
  );

  const monthView = useMemo(
    () => buildMonthAttendanceView(year, month, rows),
    [year, month, rows],
  );

  const summary = monthView.summary;

  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className={`${GLASS_CARD} flex max-h-[36rem] flex-col`}>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-5 pt-5">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#10B981]/15 to-[#34D399]/5 text-[#10B981]">
            <CalendarCheck className="h-4.5 w-4.5" aria-hidden />
          </span>
          <div>
            <h2 className="text-[16px] font-semibold text-[#0F172A]">Attendance history</h2>
            <p className="text-[13px] text-[#64748B]">{formatMonthYear(month, year)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => onMonthChange(Number(e.target.value))}
            className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] font-medium text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
            aria-label="Select month"
          >
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {new Date(2000, m - 1, 1).toLocaleDateString(undefined, { month: "long" })}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] font-medium text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
            aria-label="Select year"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading || refreshing}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-[#64748B] transition hover:bg-[#F8FAFC] hover:text-[#0F172A] disabled:opacity-50"
            aria-label="Refresh attendance"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          {onExport ? (
            <button
              type="button"
              onClick={onExport}
              disabled={exportDisabled || loading}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#E8F4FB] bg-[#F8FCFF] px-3 text-[13px] font-semibold text-[#008CD3] transition hover:bg-[#E8F4FB] disabled:opacity-50"
              aria-label="Export attendance to Excel"
            >
              <Download className="h-4 w-4" aria-hidden />
              Export
            </button>
          ) : null}
          {fullAttendanceHref ? (
            <Link
              href={fullAttendanceHref}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#CEEAD6] bg-[#E6F4EA] px-3 text-[13px] font-semibold text-[#0F9D58] transition hover:bg-[#D4EDDA]"
            >
              Full history
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-3 px-5 pt-4 sm:grid-cols-4">
        <AttendanceSummaryPill
          label="Present"
          value={summary.present + summary.presentFullDay}
          accent="success"
        />
        <AttendanceSummaryPill label="Late" value={summary.late} accent="warning" />
        <AttendanceSummaryPill label="Absent" value={summary.absent} accent="danger" />
        <AttendanceSummaryPill
          label="Work hrs"
          value={`${Math.round((summary.totalWorkingMinutes / 60) * 10) / 10}h`}
          accent="primary"
        />
      </div>

      {error ? (
        <div className="mx-5 mt-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[13px] text-[#DC2626]">
          {error}
        </div>
      ) : null}

      <div className="mt-3 min-h-0 flex-1 overflow-auto px-5 pb-5">
        {loading ? (
          <div className="space-y-2 py-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton-shimmer h-10 w-full rounded-xl" />
            ))}
          </div>
        ) : attendanceRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] py-10 text-center text-[13px] text-[#64748B]">
            No attendance records for this period.
          </div>
        ) : (
          <table className="min-w-full border-separate border-spacing-0 text-left text-[13px]">
            <thead className="sticky top-0 z-10">
              <tr className="text-[12px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                <th className="border-b border-[#E2E8F0] bg-white/95 px-3 py-2.5 font-semibold backdrop-blur">Date</th>
                <th className="border-b border-[#E2E8F0] bg-white/95 px-3 py-2.5 font-semibold backdrop-blur">In</th>
                <th className="border-b border-[#E2E8F0] bg-white/95 px-3 py-2.5 font-semibold backdrop-blur">Out</th>
                <th className="border-b border-[#E2E8F0] bg-white/95 px-3 py-2.5 font-semibold backdrop-blur">Hours</th>
                <th className="border-b border-[#E2E8F0] bg-white/95 px-3 py-2.5 font-semibold backdrop-blur">Status</th>
              </tr>
            </thead>
            <tbody>
              {attendanceRows.map((row, index) => {
                const dateKey = String(row.attendance_date || row.attendance_history || "").slice(0, 10);
                const calculatedStatus = statusByDate.get(dateKey);
                return (
                <tr
                  key={String(row.attendance_id ?? index)}
                  className={`transition-colors hover:bg-[#EFF6FF] ${index % 2 === 1 ? "bg-[#F8FAFC]" : "bg-transparent"}`}
                >
                  <td className="rounded-l-xl px-3 py-2.5 font-medium text-[#0F172A]">
                    {formatDate(row.attendance_date || row.attendance_history)}
                  </td>
                  <td className="px-3 py-2.5 text-[#475569]">{formatTime(row.check_in)}</td>
                  <td className="px-3 py-2.5 text-[#475569]">{formatTime(row.check_out)}</td>
                  <td className="px-3 py-2.5 tabular-nums text-[#475569]">
                    {formatWorkingTime(row.working_time)}
                  </td>
                  <td className="rounded-r-xl px-3 py-2.5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ring-1 ring-inset ${calculatedStatusBadgeClass(calculatedStatus)}`}
                    >
                      {formatCalculatedStatusLabel(calculatedStatus)}
                    </span>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function AttendanceSummaryPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: "success" | "warning" | "danger" | "primary";
}) {
  const accents = {
    success: "from-[#10B981]/10 to-[#34D399]/5 text-[#059669]",
    warning: "from-[#F59E0B]/10 to-[#FBBF24]/5 text-[#D97706]",
    danger: "from-[#EF4444]/10 to-[#F87171]/5 text-[#DC2626]",
    primary: "from-[#2563EB]/10 to-[#3B82F6]/5 text-[#2563EB]",
  } as const;
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${accents[accent]} px-3 py-2.5`}>
      <p className="text-[20px] font-bold leading-none tabular-nums">{value}</p>
      <p className="mt-1 text-[12px] font-medium text-[#64748B]">{label}</p>
    </div>
  );
}

function buildAddressSummary(row: Record<string, unknown>): string {
  const parts = [
    row.house_number,
    row.street,
    row.is_from_village === 1 || row.is_from_village === true ? row.village_name : null,
    row.city,
    row.district,
    row.state,
    row.country,
    row.zip_code,
  ]
    .map((part) => asText(part, ""))
    .filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "—";
}

function CopyButton({ value, label = "address" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    if (!value || value === "—") return;
    try {
      void navigator.clipboard?.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }, [value]);
  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[12px] font-semibold transition ${
        copied
          ? "border-[#A7F3D0] bg-[#ECFDF5] text-[#059669]"
          : "border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
      }`}
      aria-label={`Copy ${label}`}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function AddressDetailCard({ row }: { row: Record<string, unknown> }) {
  const summary = buildAddressSummary(row);
  const isVillage = row.is_from_village === 1 || row.is_from_village === true;
  const label = formatLabel(row.address_type);
  const isPermanent = label.toLowerCase() === "permanent";

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
              isPermanent
                ? "bg-gradient-to-br from-[#2563EB]/15 to-[#3B82F6]/5 text-[#2563EB]"
                : "bg-gradient-to-br from-[#10B981]/15 to-[#34D399]/5 text-[#10B981]"
            }`}
          >
            <MapPin className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h3 className="text-[15px] font-semibold text-[#0F172A]">{label} address</h3>
            <p className="text-[12px] text-[#94A3B8]">{asText(row.city)}, {asText(row.country)}</p>
          </div>
        </div>
        <CopyButton value={summary} label={`${label} address`} />
      </div>

      <p className="mt-4 text-[14px] leading-relaxed text-[#334155]">{summary}</p>

      <dl className="mt-4 grid gap-x-4 gap-y-3 border-t border-[#F1F5F9] pt-4 sm:grid-cols-2">
        <AddressField label="Country" value={asText(row.country)} />
        <AddressField label="State" value={asText(row.state)} />
        <AddressField label="District" value={asText(row.district)} />
        <AddressField label="City" value={asText(row.city)} />
        {isVillage ? (
          <AddressField label="Village" value={asText(row.village_name)} full />
        ) : null}
        <AddressField label="Street" value={asText(row.street)} />
        <AddressField label="House no." value={asText(row.house_number)} />
        <AddressField label="PIN / ZIP" value={asText(row.zip_code)} full />
      </dl>
    </article>
  );
}

function AddressField({
  label,
  value,
  full = false,
}: {
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <dt className="text-[12px] font-medium text-[#94A3B8]">{label}</dt>
      <dd className="mt-0.5 text-[14px] font-semibold text-[#334155]">{value}</dd>
    </div>
  );
}

type AddressDraft = {
  address_id: string;
  address_type: "permanent" | "current";
  country: string;
  state: string;
  district: string;
  city: string;
  is_from_village: boolean;
  village_name: string;
  street: string;
  house_number: string;
  zip_code: string;
};

function makeAddressDraft(row: Record<string, unknown>): AddressDraft {
  const str = (v: unknown) => (v == null ? "" : String(v));
  return {
    address_id: str(row.id ?? row.address_id),
    address_type:
      String(row.address_type ?? "").toLowerCase() === "current" ? "current" : "permanent",
    country: str(row.country),
    state: str(row.state),
    district: str(row.district),
    city: str(row.city),
    is_from_village: row.is_from_village === 1 || row.is_from_village === true,
    village_name: str(row.village_name),
    street: str(row.street),
    house_number: str(row.house_number),
    zip_code: str(row.zip_code),
  };
}

function makeEmptyAddressDraft(addressType: "permanent" | "current"): AddressDraft {
  return {
    address_id: "",
    address_type: addressType,
    country: "",
    state: "",
    district: "",
    city: "",
    is_from_village: false,
    village_name: "",
    street: "",
    house_number: "",
    zip_code: "",
  };
}

function copyAddressFieldValues(
  source: AddressDraft,
): Pick<
  AddressDraft,
  | "country"
  | "state"
  | "district"
  | "city"
  | "is_from_village"
  | "village_name"
  | "street"
  | "house_number"
  | "zip_code"
> {
  return {
    country: source.country,
    state: source.state,
    district: source.district,
    city: source.city,
    is_from_village: source.is_from_village,
    village_name: source.village_name,
    street: source.street,
    house_number: source.house_number,
    zip_code: source.zip_code,
  };
}

function validateAddressDrafts(drafts: AddressDraft[], requireIds: boolean): string | null {
  if (drafts.length !== 2) {
    return "Both permanent and current addresses are required.";
  }

  for (const draft of drafts) {
    const required: [keyof AddressDraft, string][] = [
      ["country", "Country"],
      ["state", "State"],
      ["district", "District"],
      ["city", "City"],
      ["street", "Street"],
      ["house_number", "House number"],
      ["zip_code", "PIN / ZIP"],
    ];
    for (const [field, label] of required) {
      if (!String(draft[field]).trim()) {
        return `${label} is required for the ${draft.address_type} address.`;
      }
    }
    if (draft.is_from_village && !draft.village_name.trim()) {
      return `Village name is required for the ${draft.address_type} address.`;
    }
    if (requireIds && !draft.address_id) {
      return "Address reference is missing. Please refresh and try again.";
    }
  }

  const hasPermanent = drafts.some((d) => d.address_type === "permanent");
  const hasCurrent = drafts.some((d) => d.address_type === "current");
  if (!hasPermanent || !hasCurrent) {
    return "Both permanent and current addresses are required.";
  }

  return null;
}

const ADDRESS_PLACEHOLDER_FIELDS = [
  "Country",
  "State",
  "District",
  "City",
  "Street",
  "House no.",
  "PIN / ZIP",
] as const;

function AddressEmptyPlaceholderCard({
  type,
  onClick,
}: {
  type: "permanent" | "current";
  onClick: () => void;
}) {
  const isPermanent = type === "permanent";
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-full w-full flex-col rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-[#2563EB]/40 hover:bg-[#EFF6FF] hover:shadow-[0_10px_30px_rgba(37,99,235,0.08)]"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-2xl transition group-hover:scale-105 ${
              isPermanent
                ? "bg-gradient-to-br from-[#2563EB]/15 to-[#3B82F6]/5 text-[#2563EB]"
                : "bg-gradient-to-br from-[#10B981]/15 to-[#34D399]/5 text-[#10B981]"
            }`}
          >
            <MapPin className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h3 className="text-[15px] font-semibold text-[#0F172A]">
              {formatLabel(type)} address
            </h3>
            <p className="text-[12px] text-[#94A3B8]">Not added yet</p>
          </div>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-[#2563EB] shadow-sm transition group-hover:border-[#BFDBFE] group-hover:bg-[#2563EB] group-hover:text-white">
          <Plus className="h-4 w-4" aria-hidden />
        </span>
      </div>

      <p className="mt-4 text-[14px] text-[#64748B]">
        Click to add {type} address details for this employee.
      </p>

      <dl className="mt-4 grid gap-x-4 gap-y-3 border-t border-[#E2E8F0] pt-4 sm:grid-cols-2">
        {ADDRESS_PLACEHOLDER_FIELDS.map((label) => (
          <div key={label}>
            <dt className="text-[12px] font-medium text-[#94A3B8]">{label}</dt>
            <dd className="mt-1 h-4 rounded-md bg-[#E2E8F0]/70" />
          </div>
        ))}
      </dl>
    </button>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  required = false,
  full = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  required?: boolean;
  full?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-[12px] font-medium text-[#64748B]">
        {label}
        {required ? <span className="ml-0.5 text-[#EF4444]">*</span> : null}
      </span>
      <input
        type="text"
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5 text-[14px] font-medium text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 disabled:cursor-not-allowed disabled:bg-[#F8FAFC] disabled:text-[#64748B]"
      />
    </label>
  );
}

function AddressEditForm({
  draft,
  onChange,
  mode = "edit",
  disabled = false,
}: {
  draft: AddressDraft;
  onChange: (field: keyof AddressDraft, value: string | boolean) => void;
  mode?: "add" | "edit";
  disabled?: boolean;
}) {
  const isPermanent = draft.address_type === "permanent";
  return (
    <div
      className={`rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] ${
        disabled ? "opacity-80" : ""
      }`}
    >
      <div className="mb-4 flex items-center gap-3">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
            isPermanent
              ? "bg-gradient-to-br from-[#2563EB]/15 to-[#3B82F6]/5 text-[#2563EB]"
              : "bg-gradient-to-br from-[#10B981]/15 to-[#34D399]/5 text-[#10B981]"
          }`}
        >
          <MapPin className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h3 className="text-[15px] font-semibold text-[#0F172A]">
            {formatLabel(draft.address_type)} address
          </h3>
          <p className="text-[12px] text-[#94A3B8]">
            {disabled
              ? "Auto-filled from permanent address"
              : mode === "add"
                ? "Fill in the fields below"
                : "Edit the fields below"}
          </p>
        </div>
      </div>

      <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
        <FormField label="Country" value={draft.country} onChange={(v) => onChange("country", v)} maxLength={100} required disabled={disabled} />
        <FormField label="State" value={draft.state} onChange={(v) => onChange("state", v)} maxLength={100} required disabled={disabled} />
        <FormField label="District" value={draft.district} onChange={(v) => onChange("district", v)} maxLength={100} required disabled={disabled} />
        <FormField label="City" value={draft.city} onChange={(v) => onChange("city", v)} maxLength={100} required disabled={disabled} />
        <FormField label="Street" value={draft.street} onChange={(v) => onChange("street", v)} maxLength={255} required disabled={disabled} />
        <FormField label="House no." value={draft.house_number} onChange={(v) => onChange("house_number", v)} maxLength={100} required disabled={disabled} />
        <FormField label="PIN / ZIP" value={draft.zip_code} onChange={(v) => onChange("zip_code", v)} maxLength={20} required disabled={disabled} />

        <label className="flex items-center gap-2.5 self-end pb-2.5 sm:col-span-1">
          <input
            type="checkbox"
            checked={draft.is_from_village}
            disabled={disabled}
            onChange={(e) => onChange("is_from_village", e.target.checked)}
            className="h-4 w-4 rounded border-[#CBD5E1] text-[#2563EB] focus:ring-[#2563EB]/30 disabled:cursor-not-allowed"
          />
          <span className="text-[13px] font-medium text-[#334155]">From a village</span>
        </label>

        {draft.is_from_village ? (
          <FormField
            label="Village name"
            value={draft.village_name}
            onChange={(v) => onChange("village_name", v)}
            maxLength={255}
            required
            full
            disabled={disabled}
          />
        ) : null}
      </div>
    </div>
  );
}

function ZohoDetailGrid({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-1 gap-x-6 gap-y-3.5 sm:grid-cols-2">{children}</dl>;
}

function ZohoDetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[13px] font-medium text-[#94A3B8]">{label}</dt>
      <dd className="mt-0.5 truncate text-[15px] font-semibold text-[#0F172A]">{value}</dd>
    </div>
  );
}

function maskAccountNumber(value: unknown): string {
  if (value == null || value === "") return "—";
  const raw = String(value);
  if (raw.length <= 4) return raw;
  return `•••• ${raw.slice(-4)}`;
}

type BankInfoForm = {
  account_holder_name: string;
  account_number: string;
  bank_name: string;
  bank_branch: string;
  ifsc_code: string;
  uan_number: string;
};

function createEmptyBankForm(): BankInfoForm {
  return {
    account_holder_name: "",
    account_number: "",
    bank_name: "",
    bank_branch: "",
    ifsc_code: "",
    uan_number: "",
  };
}

function bankInfoFromUserInfo(info: Record<string, unknown> | null | undefined): BankInfoForm {
  return {
    account_holder_name: info?.account_holder_name != null ? String(info.account_holder_name) : "",
    account_number: info?.account_number != null ? String(info.account_number) : "",
    bank_name: info?.bank_name != null ? String(info.bank_name) : "",
    bank_branch: info?.bank_branch != null ? String(info.bank_branch) : "",
    ifsc_code: info?.ifsc_code != null ? String(info.ifsc_code) : "",
    uan_number: info?.uan_number != null ? String(info.uan_number) : "",
  };
}

function hasEmployeeBankInfo(info: Record<string, unknown> | null | undefined): boolean {
  if (!info) return false;
  return Boolean(
    String(info.account_holder_name ?? "").trim() ||
      String(info.bank_name ?? "").trim() ||
      String(info.account_number ?? "").trim() ||
      String(info.ifsc_code ?? "").trim(),
  );
}

function isValidIfscCode(value: string): boolean {
  return /^[A-Z]{4}0[A-Z0-9]{6}$/i.test(value.trim());
}

function bankFieldCls() {
  return "w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5 text-[14px] text-[#0F172A] outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/15";
}

function BankInfoFormFields({
  form,
  onChange,
}: {
  form: BankInfoForm;
  onChange: (patch: Partial<BankInfoForm>) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="sm:col-span-2">
        <span className="mb-1.5 block text-[13px] font-medium text-[#64748B]">
          Account holder name <span className="text-[#EF4444]">*</span>
        </span>
        <input
          value={form.account_holder_name}
          onChange={(e) => onChange({ account_holder_name: e.target.value })}
          className={bankFieldCls()}
        />
      </label>
      <label>
        <span className="mb-1.5 block text-[13px] font-medium text-[#64748B]">
          Bank name <span className="text-[#EF4444]">*</span>
        </span>
        <input
          value={form.bank_name}
          onChange={(e) => onChange({ bank_name: e.target.value })}
          className={bankFieldCls()}
        />
      </label>
      <label>
        <span className="mb-1.5 block text-[13px] font-medium text-[#64748B]">
          Branch <span className="text-[#EF4444]">*</span>
        </span>
        <input
          value={form.bank_branch}
          onChange={(e) => onChange({ bank_branch: e.target.value })}
          className={bankFieldCls()}
        />
      </label>
      <label className="sm:col-span-2">
        <span className="mb-1.5 block text-[13px] font-medium text-[#64748B]">
          Account number <span className="text-[#EF4444]">*</span>
        </span>
        <input
          value={form.account_number}
          onChange={(e) => onChange({ account_number: e.target.value })}
          className={bankFieldCls()}
          inputMode="numeric"
        />
      </label>
      <label>
        <span className="mb-1.5 block text-[13px] font-medium text-[#64748B]">
          IFSC code <span className="text-[#EF4444]">*</span>
        </span>
        <input
          value={form.ifsc_code}
          onChange={(e) => onChange({ ifsc_code: e.target.value.toUpperCase() })}
          className={bankFieldCls()}
          maxLength={11}
        />
      </label>
      <label>
        <span className="mb-1.5 block text-[13px] font-medium text-[#64748B]">UAN number</span>
        <input
          value={form.uan_number}
          onChange={(e) => onChange({ uan_number: e.target.value })}
          className={bankFieldCls()}
        />
      </label>
    </div>
  );
}

function SectionCard({
  title,
  icon,
  children,
  emptyText,
  isEmpty,
  subtitle,
  accent = "primary",
  id,
  action,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  emptyText?: string;
  isEmpty?: boolean;
  subtitle?: string;
  accent?: StatAccent;
  id?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  const iconAccent: Record<StatAccent, string> = {
    primary: "bg-gradient-to-br from-[#2563EB]/15 to-[#3B82F6]/5 text-[#2563EB]",
    success: "bg-gradient-to-br from-[#10B981]/15 to-[#34D399]/5 text-[#10B981]",
    warning: "bg-gradient-to-br from-[#F59E0B]/15 to-[#FBBF24]/5 text-[#D97706]",
    violet: "bg-gradient-to-br from-[#8B5CF6]/15 to-[#A78BFA]/5 text-[#8B5CF6]",
  };
  return (
    <section id={id} className={`${GLASS_CARD} scroll-mt-24 p-5 lg:p-6`}>
      <div className="mb-4 flex items-center gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${iconAccent[accent]}`}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[16px] font-semibold text-[#0F172A]">{title}</h2>
          {subtitle ? <p className="truncate text-[13px] text-[#64748B]">{subtitle}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {isEmpty ? (
        <div className="rounded-2xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] py-8 text-center text-[13px] text-[#64748B]">
          {emptyText || "No records found."}
        </div>
      ) : (
        children
      )}
    </section>
  );
}

function StatusPill({ value }: { value: unknown }) {
  const text = formatLabel(value);
  const lower = text.toLowerCase();
  let cls = "bg-[#F1F5F9] text-[#64748B] ring-[#E2E8F0]";
  if (lower.includes("approved") || lower.includes("present") || lower.includes("active") || lower.includes("assigned")) {
    cls = "bg-[#ECFDF5] text-[#059669] ring-[#A7F3D0]";
  }
  if (lower.includes("pending")) cls = "bg-[#FFFBEB] text-[#D97706] ring-[#FDE68A]";
  if (lower.includes("reject") || lower.includes("damaged") || lower.includes("lost")) {
    cls = "bg-[#FEF2F2] text-[#DC2626] ring-[#FECACA]";
  }
  return (
    <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ring-1 ring-inset ${cls}`}>
      {text}
    </span>
  );
}

function LeaveBalanceCard({ row, index }: { row: Record<string, unknown>; index: number }) {
  const total = asNumber(row.total_leaves);
  const used = asNumber(row.used_leaves);
  const remaining = asNumber(row.remaining_leaves);
  const usedPct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

  return (
    <div
      key={String(row.id ?? index)}
      className="rounded-2xl border border-[#E2E8F0] bg-white p-4 transition hover:shadow-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[14px] font-semibold text-[#0F172A]">
          {formatMonthYear(row.month, row.year)}
        </p>
        <span className="shrink-0 rounded-full bg-[#EFF6FF] px-2.5 py-1 text-[12px] font-semibold text-[#2563EB]">
          {remaining} left
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#F1F5F9]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#3B82F6] transition-all duration-500"
          style={{ width: `${usedPct}%` }}
        />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[12px]">
        <span className="rounded-xl bg-[#F8FAFC] px-1 py-1.5 font-semibold text-[#334155]">{total} total</span>
        <span className="rounded-xl bg-[#FFFBEB] px-1 py-1.5 font-semibold text-[#D97706]">{used} used</span>
        <span className="rounded-xl bg-[#ECFDF5] px-1 py-1.5 font-semibold text-[#059669]">{remaining} left</span>
      </div>
    </div>
  );
}

function ListItemCard({ children }: { children: ReactNode }) {
  return (
    <li className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-[13px] transition hover:shadow-sm">
      {children}
    </li>
  );
}

const EMPLOYEE_DOC_UPLOAD_FIELDS: {
  field: EmployeeOnboardingDocumentField;
  label: string;
  hint: string;
  requiredForInitial: boolean;
}[] = [
  {
    field: "user_image",
    label: "Employee photo",
    hint: "Recent photo (PNG, JPG, or PDF).",
    requiredForInitial: true,
  },
  {
    field: "user_pan_card",
    label: "PAN card",
    hint: "PAN card scan or photo.",
    requiredForInitial: true,
  },
  {
    field: "user_aadhar_front",
    label: "Aadhaar — front",
    hint: "Front side of Aadhaar.",
    requiredForInitial: true,
  },
  {
    field: "user_aadhar_back",
    label: "Aadhaar — back",
    hint: "Back side of Aadhaar.",
    requiredForInitial: true,
  },
  {
    field: "user_passbook",
    label: "Bank passbook",
    hint: "Passbook page showing account details.",
    requiredForInitial: true,
  },
  {
    field: "user_passport_photo",
    label: "Passport-size photo",
    hint: "Passport-size photograph.",
    requiredForInitial: true,
  },
  {
    field: "user_resignation_letter",
    label: "Resignation letter",
    hint: "Previous company resignation (optional).",
    requiredForInitial: false,
  },
  {
    field: "user_appointment_letter",
    label: "Appointment letter",
    hint: "Offer or appointment letter (optional).",
    requiredForInitial: false,
  },
  {
    field: "user_previous_company_leaving_letter",
    label: "Leaving / relieving letter",
    hint: "From previous employer (optional).",
    requiredForInitial: false,
  },
  {
    field: "user_10th_marksheet",
    label: "10th marksheet",
    hint: "Board exam certificate (optional).",
    requiredForInitial: false,
  },
  {
    field: "user_12th_marksheet",
    label: "12th marksheet",
    hint: "Board exam certificate (optional).",
    requiredForInitial: false,
  },
  {
    field: "user_higher_education_marksheet",
    label: "Higher education marksheet",
    hint: "Graduation or equivalent (optional).",
    requiredForInitial: false,
  },
  {
    field: "user_other_certificate",
    label: "Other certificate",
    hint: "Any additional certificate (optional).",
    requiredForInitial: false,
  },
  {
    field: "user_other_document",
    label: "Other document",
    hint: "Any other supporting document (optional).",
    requiredForInitial: false,
  },
];

function docFileInputCls() {
  return "block w-full cursor-pointer rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2.5 text-[13px] text-[#334155] outline-none transition file:mr-2 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#EFF6FF] file:px-2.5 file:py-1 file:text-[12px] file:font-semibold file:text-[#2563EB] hover:border-[#2563EB]/40 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15";
}

function DocumentEmptyPlaceholderCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full min-w-0 max-w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-10 text-center transition-all duration-300 hover:-translate-y-0.5 hover:border-[#2563EB]/40 hover:bg-[#EFF6FF] hover:shadow-[0_10px_30px_rgba(37,99,235,0.08)] sm:px-6 sm:py-14"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F59E0B]/15 to-[#FBBF24]/5 text-[#D97706] transition group-hover:scale-105">
        <Upload className="h-7 w-7" aria-hidden />
      </span>
      <p className="mt-4 text-[17px] font-semibold text-[#0F172A]">No documents uploaded</p>
      <p className="mt-1.5 max-w-sm text-[14px] text-[#64748B]">
        Click to upload employee KYC and supporting documents.
      </p>
      <span className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#3B82F6] px-4 py-2 text-[13px] font-semibold text-white shadow-sm">
        <Plus className="h-4 w-4" />
        Upload documents
      </span>
    </button>
  );
}

function DocumentFileCard({
  doc,
  onUpdate,
  onDelete,
}: {
  doc: Record<string, unknown>;
  onUpdate?: () => void;
  onDelete?: () => void;
}) {
  const url = doc.doc_url ? asText(doc.doc_url) : null;
  const actionBtnCls =
    "flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] transition sm:h-9 sm:w-9 sm:rounded-xl";
  return (
    <div className="group w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white p-3 transition-all duration-300 sm:flex sm:items-center sm:gap-3 sm:p-3.5 sm:hover:-translate-y-0.5 sm:hover:border-[#BFDBFE] sm:hover:shadow-[0_8px_24px_rgba(37,99,235,0.1)]">
      <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:items-center sm:gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] text-[#2563EB] sm:h-11 sm:w-11">
          <FileText className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="truncate text-[13px] font-semibold text-[#0F172A] sm:text-[14px]">
            {asText(doc.document_name, "Document")}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-[#94A3B8] sm:text-[12px]">
            {formatLabel(doc.document_type)} · {formatDate(doc.created_at)}
          </p>
        </div>
      </div>
      <div className="mt-2.5 flex min-w-0 flex-wrap items-center justify-end gap-1 border-t border-[#F1F5F9] pt-2.5 sm:mt-0 sm:shrink-0 sm:flex-nowrap sm:border-0 sm:pt-0">
        {url ? (
          <>
            <Link
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${actionBtnCls} hover:bg-[#EFF6FF] hover:text-[#2563EB]`}
              aria-label="Preview document"
            >
              <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Link>
            <Link
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className={`${actionBtnCls} hover:bg-[#F1F5F9] hover:text-[#2563EB]`}
              aria-label="Download document"
            >
              <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Link>
          </>
        ) : null}
        {onUpdate ? (
          <button
            type="button"
            onClick={onUpdate}
            className={`${actionBtnCls} hover:bg-[#EFF6FF] hover:text-[#2563EB]`}
            aria-label="Update document"
          >
            <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        ) : null}
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#FECACA] bg-white text-[#DC2626] transition hover:bg-[#FEF2F2] sm:h-9 sm:w-9 sm:rounded-xl"
            aria-label="Delete document"
          >
            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

const MAX_ASSET_FILE_BYTES = 5 * 1024 * 1024;

type AssetDraftRow = {
  key: string;
  asset_name: string;
  asset_type: string;
  asset_summary: string;
  handover_date_time: string;
  file: File | null;
};

function createEmptyAssetDraft(): AssetDraftRow {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    asset_name: "",
    asset_type: "other",
    asset_summary: "",
    handover_date_time: "",
    file: null,
  };
}

function assetFormFieldCls() {
  return "w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-[14px] text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/12";
}

function formatAssetFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AssetFilePicker({
  inputId,
  file,
  onChange,
  accent = "violet",
}: {
  inputId: string;
  file: File | null;
  onChange: (file: File | null) => void;
  accent?: "violet" | "primary";
}) {
  const previewUrl = useMemo(() => {
    if (!file || !file.type.startsWith("image/")) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const isPdf = file?.type === "application/pdf";
  const accentDrop =
    accent === "violet"
      ? "hover:border-[#8B5CF6]/45 hover:bg-[#F5F3FF] focus-within:border-[#8B5CF6] focus-within:ring-[#8B5CF6]/12"
      : "hover:border-[#2563EB]/45 hover:bg-[#EFF6FF] focus-within:border-[#2563EB] focus-within:ring-[#2563EB]/12";

  if (file) {
    return (
      <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
        <div className="flex items-stretch gap-0">
          <div className="flex w-[88px] shrink-0 items-center justify-center border-r border-[#F1F5F9] bg-[#F8FAFC] p-2">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Selected asset preview"
                className="h-[72px] w-[72px] rounded-lg object-cover shadow-sm ring-1 ring-black/5"
              />
            ) : isPdf ? (
              <div className="flex h-[72px] w-[72px] flex-col items-center justify-center rounded-lg bg-[#FEF2F2] text-[#DC2626] ring-1 ring-[#FECACA]">
                <FileText className="h-7 w-7" aria-hidden />
                <span className="mt-1 text-[9px] font-bold uppercase tracking-wide">PDF</span>
              </div>
            ) : (
              <div className="flex h-[72px] w-[72px] items-center justify-center rounded-lg bg-[#F1F5F9] text-[#94A3B8]">
                <FileText className="h-7 w-7" aria-hidden />
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center px-3 py-2.5">
            <p className="truncate text-[13px] font-semibold text-[#0F172A]">{file.name}</p>
            <p className="mt-0.5 text-[11px] text-[#94A3B8]">{formatAssetFileSize(file.size)}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <label
                htmlFor={inputId}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-1 text-[11px] font-semibold text-[#475569] transition hover:bg-white hover:text-[#7C3AED]"
              >
                <Upload className="h-3 w-3" aria-hidden />
                Replace
              </label>
              <button
                type="button"
                onClick={() => onChange(null)}
                className="inline-flex items-center gap-1 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-2 py-1 text-[11px] font-semibold text-[#DC2626] transition hover:bg-[#FEE2E2]"
              >
                <X className="h-3 w-3" aria-hidden />
                Remove
              </button>
            </div>
          </div>
        </div>
        <input
          id={inputId}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
          className="sr-only"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
      </div>
    );
  }

  return (
    <label
      htmlFor={inputId}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-6 text-center transition focus-within:ring-2 ${accentDrop}`}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#7C3AED] shadow-sm ring-1 ring-[#E2E8F0]">
        <Upload className="h-5 w-5" aria-hidden />
      </span>
      <span className="mt-2.5 text-[13px] font-semibold text-[#334155]">Upload image or PDF</span>
      <span className="mt-1 text-[11px] text-[#94A3B8]">PNG, JPG, WEBP · max 5 MB</span>
      <input
        id={inputId}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}

function assetRowIsEmpty(row: AssetDraftRow) {
  return (
    row.asset_name.trim() === "" &&
    row.asset_summary.trim() === "" &&
    row.handover_date_time.trim() === "" &&
    !row.file
  );
}

const BGV_STATUS_OPTIONS: { value: BackgroundVerificationStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "verified", label: "Verified" },
  { value: "failed", label: "Failed" },
  { value: "unable_to_contact", label: "Unable to contact" },
];

type ReferenceEditForm = {
  previous_company_name: string;
  company_email: string;
  employee_code: string;
  designation: string;
  employment_start_date: string;
  employment_end_date: string;
  person_name: string;
  person_role: BackgroundVerificationPersonRole;
  person_contact_number1: string;
  person_contact_number2: string;
  person_contact_email: string;
};

function createEmptyReferenceForm(): ReferenceEditForm {
  return {
    previous_company_name: "",
    company_email: "",
    employee_code: "",
    designation: "",
    employment_start_date: "",
    employment_end_date: "",
    person_name: "",
    person_role: "hr",
    person_contact_number1: "",
    person_contact_number2: "",
    person_contact_email: "",
  };
}

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function refItemToEditForm(ref: BackgroundVerificationReferenceItem): ReferenceEditForm {
  return {
    previous_company_name: ref.previous_company_name ?? "",
    company_email: ref.company_email ?? "",
    employee_code: ref.employee_code ?? "",
    designation: ref.designation ?? "",
    employment_start_date: toDateInputValue(ref.employment_start_date),
    employment_end_date: toDateInputValue(ref.employment_end_date),
    person_name: ref.person_name ?? "",
    person_role: ref.person_role ?? "hr",
    person_contact_number1: ref.person_contact_number1 ?? "",
    person_contact_number2: ref.person_contact_number2 ?? "",
    person_contact_email: ref.person_contact_email ?? "",
  };
}

function editFormToReferencePayload(form: ReferenceEditForm): BackgroundVerificationInfoPayload {
  const payload: BackgroundVerificationInfoPayload = {
    previous_company_name: form.previous_company_name.trim(),
    person_name: form.person_name.trim(),
    person_role: form.person_role,
    person_contact_number1: form.person_contact_number1.trim(),
    person_contact_email: form.person_contact_email.trim(),
  };
  if (form.company_email.trim()) payload.company_email = form.company_email.trim();
  if (form.employee_code.trim()) payload.employee_code = form.employee_code.trim();
  if (form.designation.trim()) payload.designation = form.designation.trim();
  if (form.employment_start_date) payload.employment_start_date = form.employment_start_date;
  if (form.employment_end_date) payload.employment_end_date = form.employment_end_date;
  if (form.person_contact_number2.trim()) {
    payload.person_contact_number2 = form.person_contact_number2.trim();
  }
  return payload;
}

function isValidReferenceEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function bgvPersonRoleLabel(role: string): string {
  if (role === "hr") return "HR";
  if (role === "reporting_manager") return "Reporting manager";
  return formatLabel(role);
}

function bgvStatusLabel(status: string): string {
  const found = BGV_STATUS_OPTIONS.find((o) => o.value === String(status).toLowerCase());
  return found?.label ?? formatLabel(status);
}

function bgvStatusBadgeClass(status: string): string {
  const s = String(status).toLowerCase();
  if (s === "verified") return "bg-[#D1FAE5] text-[#059669]";
  if (s === "failed") return "bg-[#FEE2E2] text-[#DC2626]";
  if (s === "in_progress") return "bg-[#DBEAFE] text-[#2563EB]";
  if (s === "unable_to_contact") return "bg-[#F1F5F9] text-[#64748B]";
  return "bg-[#FEF3C7] text-[#D97706]";
}

function canShowBgvVerifyButton(status: string): boolean {
  const s = String(status).toLowerCase();
  return s !== "verified" && s !== "failed";
}

function referenceFieldCls() {
  return "w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5 text-[14px] text-[#0F172A] outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/15";
}

function ReferenceFormFields({
  form,
  onChange,
}: {
  form: ReferenceEditForm;
  onChange: (patch: Partial<ReferenceEditForm>) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="sm:col-span-2">
        <span className="mb-1.5 block text-[13px] font-medium text-[#64748B]">
          Previous company name <span className="text-[#EF4444]">*</span>
        </span>
        <input
          value={form.previous_company_name}
          onChange={(e) => onChange({ previous_company_name: e.target.value })}
          className={referenceFieldCls()}
        />
      </label>
      <label>
        <span className="mb-1.5 block text-[13px] font-medium text-[#64748B]">Company email</span>
        <input
          type="email"
          value={form.company_email}
          onChange={(e) => onChange({ company_email: e.target.value })}
          className={referenceFieldCls()}
        />
      </label>
      <label>
        <span className="mb-1.5 block text-[13px] font-medium text-[#64748B]">Employee code</span>
        <input
          value={form.employee_code}
          onChange={(e) => onChange({ employee_code: e.target.value })}
          className={referenceFieldCls()}
        />
      </label>
      <label>
        <span className="mb-1.5 block text-[13px] font-medium text-[#64748B]">Designation</span>
        <input
          value={form.designation}
          onChange={(e) => onChange({ designation: e.target.value })}
          className={referenceFieldCls()}
        />
      </label>
      <label>
        <span className="mb-1.5 block text-[13px] font-medium text-[#64748B]">Employment start</span>
        <input
          type="date"
          value={form.employment_start_date}
          onChange={(e) => onChange({ employment_start_date: e.target.value })}
          className={referenceFieldCls()}
        />
      </label>
      <label>
        <span className="mb-1.5 block text-[13px] font-medium text-[#64748B]">Employment end</span>
        <input
          type="date"
          value={form.employment_end_date}
          onChange={(e) => onChange({ employment_end_date: e.target.value })}
          className={referenceFieldCls()}
        />
      </label>
      <label className="sm:col-span-2">
        <span className="mb-1.5 block text-[13px] font-medium text-[#64748B]">
          Reference contact name <span className="text-[#EF4444]">*</span>
        </span>
        <input
          value={form.person_name}
          onChange={(e) => onChange({ person_name: e.target.value })}
          className={referenceFieldCls()}
        />
      </label>
      <label>
        <span className="mb-1.5 block text-[13px] font-medium text-[#64748B]">
          Contact role <span className="text-[#EF4444]">*</span>
        </span>
        <select
          value={form.person_role}
          onChange={(e) =>
            onChange({ person_role: e.target.value as BackgroundVerificationPersonRole })
          }
          className={referenceFieldCls()}
        >
          <option value="hr">HR</option>
          <option value="reporting_manager">Reporting manager</option>
        </select>
      </label>
      <label>
        <span className="mb-1.5 block text-[13px] font-medium text-[#64748B]">
          Primary phone <span className="text-[#EF4444]">*</span>
        </span>
        <input
          value={form.person_contact_number1}
          onChange={(e) => onChange({ person_contact_number1: e.target.value })}
          className={referenceFieldCls()}
        />
      </label>
      <label>
        <span className="mb-1.5 block text-[13px] font-medium text-[#64748B]">Secondary phone</span>
        <input
          value={form.person_contact_number2}
          onChange={(e) => onChange({ person_contact_number2: e.target.value })}
          className={referenceFieldCls()}
        />
      </label>
      <label className="sm:col-span-2">
        <span className="mb-1.5 block text-[13px] font-medium text-[#64748B]">
          Contact email <span className="text-[#EF4444]">*</span>
        </span>
        <input
          type="email"
          value={form.person_contact_email}
          onChange={(e) => onChange({ person_contact_email: e.target.value })}
          className={referenceFieldCls()}
        />
      </label>
    </div>
  );
}

function ReferenceEmptyPlaceholderCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-6 py-12 text-center transition-all duration-300 hover:-translate-y-0.5 hover:border-[#10B981]/40 hover:bg-[#ECFDF5] hover:shadow-[0_10px_30px_rgba(16,185,129,0.08)]"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#10B981]/15 to-[#34D399]/5 text-[#059669] transition group-hover:scale-105">
        <ShieldCheck className="h-6 w-6" aria-hidden />
      </span>
      <p className="mt-3 text-[15px] font-semibold text-[#0F172A]">No previous company references</p>
      <p className="mt-1 max-w-xs text-[13px] text-[#64748B]">
        Add employer references for background verification.
      </p>
      <span className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] px-3.5 py-2 text-[12px] font-semibold text-white shadow-sm">
        <Plus className="h-3.5 w-3.5" />
        Add reference
      </span>
    </button>
  );
}

function ReferenceGridCard({
  referenceRow,
  canUpdateStatus,
  onView,
  onEdit,
  onUpdateStatus,
}: {
  referenceRow: BackgroundVerificationReferenceItem;
  canUpdateStatus?: boolean;
  onView?: () => void;
  onEdit?: () => void;
  onUpdateStatus?: () => void;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-[#0F172A]">
            {referenceRow.previous_company_name}
          </p>
          <p className="mt-0.5 truncate text-[12px] text-[#94A3B8]">
            {referenceRow.person_name} · {bgvPersonRoleLabel(referenceRow.person_role)}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${bgvStatusBadgeClass(referenceRow.verification_status)}`}
        >
          {bgvStatusLabel(referenceRow.verification_status)}
        </span>
      </div>
      <p className="mt-2 truncate text-[12px] text-[#64748B]">{referenceRow.person_contact_email}</p>
      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[#F1F5F9] pt-3">
        {onView ? (
          <button
            type="button"
            onClick={onView}
            className="inline-flex items-center gap-1 rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[#64748B] transition hover:bg-[#EFF6FF] hover:text-[#2563EB]"
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </button>
        ) : null}
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1 rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[#64748B] transition hover:bg-[#F8FAFC] hover:text-[#0F172A]"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        ) : null}
        {canUpdateStatus && onUpdateStatus && canShowBgvVerifyButton(referenceRow.verification_status) ? (
          <button
            type="button"
            onClick={onUpdateStatus}
            className="inline-flex items-center gap-1 rounded-lg border border-[#BBF7D0] bg-[#ECFDF5] px-2.5 py-1.5 text-[12px] font-semibold text-[#059669] transition hover:bg-[#D1FAE5]"
          >
            <UserCheck className="h-3.5 w-3.5" />
            Update status
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ipAssignmentIpId(row: Record<string, unknown>): number | null {
  const id = Number(row.ip_id);
  return Number.isFinite(id) ? id : null;
}

function ShiftEmptyPlaceholderCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-6 py-12 text-center transition-all duration-300 hover:-translate-y-0.5 hover:border-[#8B5CF6]/40 hover:bg-[#F5F3FF] hover:shadow-[0_10px_30px_rgba(139,92,246,0.08)]"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8B5CF6]/15 to-[#A78BFA]/5 text-[#7C3AED] transition group-hover:scale-105">
        <Clock className="h-6 w-6" aria-hidden />
      </span>
      <p className="mt-3 text-[15px] font-semibold text-[#0F172A]">No shift assigned</p>
      <p className="mt-1 max-w-xs text-[13px] text-[#64748B]">
        Assign a work shift to set hours, grace period, and working days.
      </p>
      <span className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] px-3.5 py-2 text-[12px] font-semibold text-white shadow-sm">
        <Plus className="h-3.5 w-3.5" />
        Assign to shift
      </span>
    </button>
  );
}

function ShiftAssignmentCard({
  shift,
  onUnassign,
  onChangeShift,
}: {
  shift: CompanyShiftRow;
  onUnassign: () => void;
  onChangeShift?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-[#0F172A]">
            {asText(shift.shift_name, "Unnamed shift")}
          </p>
          <p className="mt-1 text-[13px] text-[#64748B]">
            {shift.start_time || shift.end_time
              ? `${asText(shift.start_time)} – ${asText(shift.end_time)}`
              : "—"}
          </p>
        </div>
        {shift.is_night_shift ? (
          <span className="shrink-0 rounded-full bg-[#EDE9FE] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#7C3AED]">
            Night
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-[12px] text-[#94A3B8]">
        Working days: {formatWorkingDays(shift.working_days)}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[#F1F5F9] pt-3">
        {onChangeShift ? (
          <button
            type="button"
            onClick={onChangeShift}
            className="inline-flex items-center gap-1 rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[#64748B] transition hover:bg-[#F5F3FF] hover:text-[#7C3AED]"
          >
            <Pencil className="h-3.5 w-3.5" />
            Change shift
          </button>
        ) : null}
        <button
          type="button"
          onClick={onUnassign}
          className="inline-flex items-center gap-1 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-2.5 py-1.5 text-[12px] font-semibold text-[#DC2626] transition hover:bg-[#FEE2E2]"
        >
          <X className="h-3.5 w-3.5" />
          Unassign
        </button>
      </div>
    </div>
  );
}

function IpEmptyPlaceholderCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-6 py-12 text-center transition-all duration-300 hover:-translate-y-0.5 hover:border-[#2563EB]/40 hover:bg-[#EFF6FF] hover:shadow-[0_10px_30px_rgba(37,99,235,0.08)]"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB]/15 to-[#3B82F6]/5 text-[#2563EB] transition group-hover:scale-105">
        <Globe className="h-6 w-6" aria-hidden />
      </span>
      <p className="mt-3 text-[15px] font-semibold text-[#0F172A]">No IP addresses assigned</p>
      <p className="mt-1 max-w-xs text-[13px] text-[#64748B]">
        Allow this employee to mark attendance from approved office IPs.
      </p>
      <span className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#3B82F6] px-3.5 py-2 text-[12px] font-semibold text-white shadow-sm">
        <Plus className="h-3.5 w-3.5" />
        Assign IP address
      </span>
    </button>
  );
}

function IpAssignmentCard({
  row,
  onUnassign,
}: {
  row: Record<string, unknown>;
  onUnassign: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[14px] font-semibold text-[#0F172A]">
          {asText(row.ip_address ?? row.org_ip_address)}
        </p>
        <p className="mt-0.5 truncate text-[12px] text-[#94A3B8]">
          {asText(row.ip_label ?? row.org_ip_label, "No label")}
        </p>
      </div>
      <button
        type="button"
        onClick={onUnassign}
        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-2.5 py-1.5 text-[12px] font-semibold text-[#DC2626] transition hover:bg-[#FEE2E2]"
      >
        <X className="h-3.5 w-3.5" />
        Unassign
      </button>
    </div>
  );
}

function AssetEmptyPlaceholderCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-6 py-14 text-center transition-all duration-300 hover:-translate-y-0.5 hover:border-[#8B5CF6]/40 hover:bg-[#F5F3FF] hover:shadow-[0_10px_30px_rgba(139,92,246,0.08)]"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8B5CF6]/15 to-[#A78BFA]/5 text-[#7C3AED] transition group-hover:scale-105">
        <Laptop className="h-7 w-7" aria-hidden />
      </span>
      <p className="mt-4 text-[17px] font-semibold text-[#0F172A]">No assets assigned</p>
      <p className="mt-1.5 max-w-sm text-[14px] text-[#64748B]">
        Click to assign laptops, phones, and other equipment to this employee.
      </p>
      <span className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] px-4 py-2 text-[13px] font-semibold text-white shadow-sm">
        <Plus className="h-4 w-4" />
        Add assets
      </span>
    </button>
  );
}

function AssetGridCard({
  asset,
  handoverQuery,
  showHandoverActions,
  onView,
  onEdit,
  onStatus,
  onHandover,
  onReturnCompleted,
}: {
  asset: Record<string, unknown>;
  handoverQuery?: EmployeeExitHandoverQueryRow | null;
  showHandoverActions?: boolean;
  onView?: () => void;
  onEdit?: () => void;
  onStatus?: () => void;
  onHandover?: () => void;
  onReturnCompleted?: () => void;
}) {
  const imageUrl = asset.asset_image_url ? asText(asset.asset_image_url) : null;
  const isActive = String(asset.asset_status ?? "").toLowerCase() === "active";
  const handoverDone =
    String(handoverQuery?.handover_status ?? "").toLowerCase() === "handover_completed";
  const canReturnComplete =
    showHandoverActions && handoverDone && !asset.is_returned && isActive;

  return (
    <div className="group flex flex-col gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-2">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={asText(asset.asset_name, "Asset")}
            className="h-12 w-12 shrink-0 rounded-2xl border border-[#E2E8F0] object-cover"
          />
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8B5CF6]/15 to-[#A78BFA]/5 text-[#8B5CF6]">
            <Laptop className="h-6 w-6" aria-hidden />
          </span>
        )}
        <StatusPill value={asset.asset_status} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold text-[#0F172A]">
          {asText(asset.asset_name, "Asset")}
        </p>
        <p className="truncate text-[13px] text-[#64748B]">{formatLabel(asset.asset_type)}</p>
        {asset.asset_summary ? (
          <p className="mt-1 line-clamp-2 text-[12px] text-[#94A3B8]">
            {asText(asset.asset_summary)}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-1.5 border-t border-[#F1F5F9] pt-3 text-[12px] text-[#94A3B8]">
        <CalendarDays className="h-3.5 w-3.5 shrink-0" />
        Assigned {formatDate(asset.assigned_at ?? asset.created_at)}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {onView ? (
          <button
            type="button"
            onClick={onView}
            className="inline-flex items-center gap-1 rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[#64748B] transition hover:bg-[#F5F3FF] hover:text-[#7C3AED]"
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </button>
        ) : null}
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1 rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[#64748B] transition hover:bg-[#EFF6FF] hover:text-[#2563EB]"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        ) : null}
        {onStatus ? (
          <button
            type="button"
            onClick={onStatus}
            className="inline-flex items-center gap-1 rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[#64748B] transition hover:bg-[#F0FDF4] hover:text-[#059669]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Status
          </button>
        ) : null}
        {showHandoverActions && onHandover ? (
          <button
            type="button"
            onClick={onHandover}
            className="inline-flex items-center gap-1 rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[#64748B] transition hover:bg-[#FFF7ED] hover:text-[#D97706]"
          >
            <UserRound className="h-3.5 w-3.5" />
            {asset.returned_to_id || handoverQuery ? "Handover" : "Assign handover"}
          </button>
        ) : null}
        {canReturnComplete && onReturnCompleted ? (
          <button
            type="button"
            onClick={onReturnCompleted}
            className="inline-flex items-center gap-1 rounded-lg border border-[#BBF7D0] bg-[#ECFDF5] px-2.5 py-1.5 text-[12px] font-semibold text-[#059669] transition hover:bg-[#D1FAE5]"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Return done
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function GetEmployeeClient({ userId }: GetEmployeeClientProps) {
  const params = useParams();
  const router = useRouter();
  const orgId = String(params?.org_id ?? "");
  const ctx = useManagementDashboardContext();
  const viewerRole = (ctx?.user?.user_role_name ?? "").trim().toLowerCase();
  const viewerCanManageExit = viewerRole === "admin" || viewerRole === "hr";

  const cachedEmployeeDetail = readEmployeeDetailCache(orgId, userId);
  const cachedBgvReferences = readEmployeeBgvCache(orgId, userId);
  const cachedUserShifts = readEmployeeShiftsCache(orgId, userId);

  const [data, setData] = useState<SingleEmployeeData | null>(
    () => cachedEmployeeDetail?.data ?? null,
  );
  const [exitRow, setExitRow] = useState<EmployeeExitProcessRow | null>(
    () => cachedEmployeeDetail?.exitRow ?? null,
  );
  const [loading, setLoading] = useState(() => !cachedEmployeeDetail);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completeMessage, setCompleteMessage] = useState(
    "Exit approved. Asset handovers are complete.",
  );
  const [completeBusy, setCompleteBusy] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [exitActionSuccess, setExitActionSuccess] = useState<string | null>(null);
  const [photoZoom, setPhotoZoom] = useState<{
    imageUrl: string;
    alt: string;
  } | null>(null);

  const [addressEditing, setAddressEditing] = useState(false);
  const [addressAdding, setAddressAdding] = useState(false);
  const [addressDrafts, setAddressDrafts] = useState<AddressDraft[]>([]);
  const [sameAsPermanent, setSameAsPermanent] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressSuccess, setAddressSuccess] = useState<string | null>(null);

  const [documentUploadOpen, setDocumentUploadOpen] = useState(false);
  const [documentUploadInitial, setDocumentUploadInitial] = useState(false);
  const [docFiles, setDocFiles] = useState<Partial<Record<EmployeeOnboardingDocumentField, File>>>({});
  const [documentUpdateTarget, setDocumentUpdateTarget] = useState<Record<string, unknown> | null>(
    null,
  );
  const [documentUpdateFile, setDocumentUpdateFile] = useState<File | null>(null);
  const [documentDeleteTarget, setDocumentDeleteTarget] = useState<Record<string, unknown> | null>(
    null,
  );
  const [documentSaving, setDocumentSaving] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [documentSuccess, setDocumentSuccess] = useState<string | null>(null);

  const [assetAddOpen, setAssetAddOpen] = useState(false);
  const [assetDraftRows, setAssetDraftRows] = useState<AssetDraftRow[]>([createEmptyAssetDraft()]);
  const [assetViewTarget, setAssetViewTarget] = useState<EmployeeAssetRow | null>(null);
  const [assetViewLoading, setAssetViewLoading] = useState(false);
  const [assetEditTarget, setAssetEditTarget] = useState<EmployeeAssetRow | null>(null);
  const [assetEditDraft, setAssetEditDraft] = useState({
    asset_name: "",
    asset_type: "other",
    asset_summary: "",
    handover_date_time: "",
    file: null as File | null,
  });
  const [assetStatusTarget, setAssetStatusTarget] = useState<Record<string, unknown> | null>(null);
  const [assetHandoverTarget, setAssetHandoverTarget] = useState<Record<string, unknown> | null>(
    null,
  );
  const [assetHandoverManagerId, setAssetHandoverManagerId] = useState("");
  const [assetHandoverRemarks, setAssetHandoverRemarks] = useState("");
  const [assetReturnTarget, setAssetReturnTarget] = useState<Record<string, unknown> | null>(null);
  const [assetManagers, setAssetManagers] = useState<{ id: string; name: string }[]>([]);
  const [assetManagersLoading, setAssetManagersLoading] = useState(false);
  const [exitDetailHandovers, setExitDetailHandovers] = useState<EmployeeExitHandoverQueryRow[]>(
    [],
  );
  const [assetSaving, setAssetSaving] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [assetSuccess, setAssetSuccess] = useState<string | null>(null);

  const [bgvReferences, setBgvReferences] = useState<BackgroundVerificationReferenceItem[]>(
    () => cachedBgvReferences ?? [],
  );
  const [bgvLoading, setBgvLoading] = useState(() => cachedBgvReferences == null);
  const [referenceAddOpen, setReferenceAddOpen] = useState(false);
  const [referenceAddForm, setReferenceAddForm] = useState<ReferenceEditForm>(createEmptyReferenceForm);
  const [referenceViewTarget, setReferenceViewTarget] = useState<BackgroundVerificationDetailRow | null>(
    null,
  );
  const [referenceViewLoading, setReferenceViewLoading] = useState(false);
  const [referenceEditTarget, setReferenceEditTarget] =
    useState<BackgroundVerificationReferenceItem | null>(null);
  const [referenceEditForm, setReferenceEditForm] = useState<ReferenceEditForm | null>(null);
  const [referenceVerifyTarget, setReferenceVerifyTarget] =
    useState<BackgroundVerificationReferenceItem | null>(null);
  const [referenceVerifyStatus, setReferenceVerifyStatus] =
    useState<BackgroundVerificationStatus>("in_progress");
  const [referenceVerifyNotes, setReferenceVerifyNotes] = useState("");
  const [referenceSaving, setReferenceSaving] = useState(false);
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [referenceSuccess, setReferenceSuccess] = useState<string | null>(null);

  const [ipAssignOpen, setIpAssignOpen] = useState(false);
  const [companyIps, setCompanyIps] = useState<CompanyIpRow[]>([]);
  const [companyIpsLoading, setCompanyIpsLoading] = useState(false);
  const [selectedIpId, setSelectedIpId] = useState<string>("");
  const [ipUnassignTarget, setIpUnassignTarget] = useState<Record<string, unknown> | null>(null);
  const [ipSaving, setIpSaving] = useState(false);
  const [ipError, setIpError] = useState<string | null>(null);
  const [ipSuccess, setIpSuccess] = useState<string | null>(null);

  const [userShifts, setUserShifts] = useState<CompanyShiftRow[]>(() => cachedUserShifts ?? []);
  const [shiftsLoading, setShiftsLoading] = useState(() => cachedUserShifts == null);
  const [shiftAssignOpen, setShiftAssignOpen] = useState(false);
  const [companyShifts, setCompanyShifts] = useState<CompanyShiftRow[]>([]);
  const [companyShiftsLoading, setCompanyShiftsLoading] = useState(false);
  const [selectedShiftId, setSelectedShiftId] = useState<string>("");
  const [shiftUnassignTarget, setShiftUnassignTarget] = useState<CompanyShiftRow | null>(null);
  const [shiftSaving, setShiftSaving] = useState(false);
  const [shiftError, setShiftError] = useState<string | null>(null);
  const [shiftSuccess, setShiftSuccess] = useState<string | null>(null);

  const [bankFormOpen, setBankFormOpen] = useState(false);
  const [bankFormMode, setBankFormMode] = useState<"add" | "edit">("add");
  const [bankForm, setBankForm] = useState<BankInfoForm>(createEmptyBankForm);
  const [bankSaving, setBankSaving] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);
  const [bankSuccess, setBankSuccess] = useState<string | null>(null);

  const now = useMemo(() => new Date(), []);
  const [attendanceMonth, setAttendanceMonth] = useState(now.getMonth() + 1);
  const [attendanceYear, setAttendanceYear] = useState(now.getFullYear());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number | null>(null);
  const cachedAttendance = readEmployeeAttendanceCache(
    orgId,
    userId,
    now.getFullYear(),
    now.getMonth() + 1,
    null,
  );
  const [attendanceRows, setAttendanceRows] = useState<AttendanceHistoryRow[]>(
    () => cachedAttendance ?? [],
  );
  const [attendanceLoading, setAttendanceLoading] = useState(() => cachedAttendance == null);
  const [attendanceRefreshing, setAttendanceRefreshing] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const openPhotoZoom = useCallback((imageUrl: string, alt: string) => {
    setPhotoZoom({ imageUrl, alt });
  }, []);

  const loadEmployee = useCallback(
    async (isRefresh = false) => {
      if (!orgId || !userId) {
        setError("Invalid organization or employee.");
        setLoading(false);
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        setError("Not signed in.");
        setLoading(false);
        return;
      }

      const cached = readEmployeeDetailCache(orgId, userId);
      if (cached && !isRefresh) {
        setData(cached.data);
        setExitRow(cached.exitRow);
        setError(null);
        setLoading(false);
        if (!shouldRefreshEmployeeDetailCache(orgId, userId)) {
          return;
        }
        setRefreshing(true);
      } else {
        if (isRefresh) {
          clearEmployeeDetailCache(orgId, userId);
          clearManageOrgUsersCache(orgId);
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);
      }

      try {
        const [result, exitRes] = await Promise.all([
          getSingleEmployee(token, orgId, userId),
          fetchEmployeeExitProcesses(token, {
            org_id: orgId,
            employee_id: userId,
            limit: 10,
            sort: "desc",
            sort_by: "updated_at",
          }).catch(() => ({ data: [] as EmployeeExitProcessRow[] })),
        ]);
        const nextExitRow = pickRelevantEmployeeExitRow(exitRes.data ?? []);
        setData(result);
        setExitRow(nextExitRow);
        writeEmployeeDetailCache(orgId, userId, {
          data: result,
          exitRow: nextExitRow,
        });
      } catch (e) {
        if (!cached || isRefresh) {
          setData(null);
          setExitRow(null);
        }
        setError(e instanceof Error ? e.message : "Could not load employee details.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orgId, userId],
  );

  const loadAttendance = useCallback(
    async (isRefresh = false) => {
      if (!orgId || !userId) return;
      const token = localStorage.getItem("token");
      if (!token) {
        setAttendanceError("Not signed in.");
        return;
      }

      const cached = readEmployeeAttendanceCache(
        orgId,
        userId,
        attendanceYear,
        attendanceMonth,
        selectedCalendarDay,
      );
      if (cached && !isRefresh) {
        setAttendanceRows(cached);
        setAttendanceError(null);
        setAttendanceLoading(false);
        if (
          !shouldRefreshEmployeeAttendanceCache(
            orgId,
            userId,
            attendanceYear,
            attendanceMonth,
            selectedCalendarDay,
          )
        ) {
          return;
        }
        setAttendanceRefreshing(true);
      } else {
        if (isRefresh) setAttendanceRefreshing(true);
        else setAttendanceLoading(true);
        setAttendanceError(null);
      }

      try {
        const rows = await fetchSingleUserAttendanceHistory(token, orgId, userId, {
          month: attendanceMonth,
          year: attendanceYear,
          date: selectedCalendarDay ?? undefined,
        });
        setAttendanceRows(rows);
        writeEmployeeAttendanceCache(
          orgId,
          userId,
          attendanceYear,
          attendanceMonth,
          selectedCalendarDay,
          rows,
        );
      } catch (e) {
        if (!cached || isRefresh) {
          setAttendanceRows([]);
        }
        setAttendanceError(
          e instanceof Error ? e.message : "Could not load attendance history.",
        );
      } finally {
        setAttendanceLoading(false);
        setAttendanceRefreshing(false);
      }
    },
    [orgId, userId, attendanceMonth, attendanceYear, selectedCalendarDay],
  );

  useEffect(() => {
    void loadEmployee(false);
  }, [loadEmployee]);

  const loadBgvReferences = useCallback(async (isRefresh = false) => {
    if (!orgId || !userId) {
      setBgvReferences([]);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setBgvReferences([]);
      return;
    }

    const cached = readEmployeeBgvCache(orgId, userId);
    if (cached && !isRefresh) {
      setBgvReferences(cached);
      setBgvLoading(false);
      if (!shouldRefreshEmployeeBgvCache(orgId, userId)) {
        return;
      }
    } else {
      if (isRefresh) {
        clearEmployeeBgvCache(orgId, userId);
      }
      setBgvLoading(true);
    }

    try {
      const listResult = await getAllUserBackgroundVerifications(token, orgId, {
        employee_id: userId,
        is_ascending: "DESC",
      });
      const group = Array.isArray(listResult.data) ? listResult.data[0] : null;
      const references = group?.references ?? [];
      setBgvReferences(references);
      writeEmployeeBgvCache(orgId, userId, references);
    } catch {
      if (!cached || isRefresh) {
        setBgvReferences([]);
      }
    } finally {
      setBgvLoading(false);
    }
  }, [orgId, userId]);

  useEffect(() => {
    void loadBgvReferences();
  }, [loadBgvReferences]);

  const loadUserShifts = useCallback(async (isRefresh = false) => {
    if (!orgId || !userId) {
      setUserShifts([]);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setUserShifts([]);
      return;
    }

    const cached = readEmployeeShiftsCache(orgId, userId);
    if (cached && !isRefresh) {
      setUserShifts(cached);
      setShiftsLoading(false);
      if (!shouldRefreshEmployeeShiftsCache(orgId, userId)) {
        return;
      }
    } else {
      if (isRefresh) {
        clearEmployeeShiftsCache(orgId, userId);
      }
      setShiftsLoading(true);
    }

    try {
      const shifts = await getUserShifts(token, orgId, userId);
      setUserShifts(shifts);
      writeEmployeeShiftsCache(orgId, userId, shifts);
    } catch {
      if (!cached || isRefresh) {
        setUserShifts([]);
      }
    } finally {
      setShiftsLoading(false);
    }
  }, [orgId, userId]);

  useEffect(() => {
    void loadUserShifts();
  }, [loadUserShifts]);

  useEffect(() => {
    void loadAttendance(false);
  }, [loadAttendance]);

  useEffect(() => {
    if (!exitRow?.id || !orgId) {
      setExitDetailHandovers([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await fetchEmployeeExitProcessById(token, orgId, exitRow.id);
        if (!cancelled) {
          setExitDetailHandovers(res.data?.handover_queries ?? []);
        }
      } catch {
        if (!cancelled) setExitDetailHandovers([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [exitRow?.id, orgId]);

  const shiftAttendanceMonth = useCallback((delta: number) => {
    setSelectedCalendarDay(null);
    setAttendanceMonth((prevMonth) => {
      let nextMonth = prevMonth + delta;
      let nextYear = attendanceYear;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear += 1;
      } else if (nextMonth < 1) {
        nextMonth = 12;
        nextYear -= 1;
      }
      setAttendanceYear(nextYear);
      return nextMonth;
    });
  }, [attendanceYear]);

  const info = data?.user_info;
  const employeeName = asText(info?.user_name, "Employee");
  const employeeEmpCode = String(info?.emp_code ?? "").trim() || "—";

  const monthAttendance = useMemo(
    () => buildMonthAttendanceView(attendanceYear, attendanceMonth, attendanceRows),
    [attendanceYear, attendanceMonth, attendanceRows],
  );

  const hasOpenExit = exitRow != null && isOpenExitStatus(exitRow.application_status);
  const exitPending = exitRow != null && isPendingExitStatus(exitRow.application_status);
  const exitInProgress = exitRow != null && isInProgressExitStatus(exitRow.application_status);

  const exitDetailHref =
    exitRow != null
      ? buildEmployeeExitDetailHref(orgId, {
          exitProcessId: exitRow.id,
          teamId: exitRow.team_id,
        })
      : null;
  const exitActionsHref =
    exitRow != null
      ? buildEmployeeExitDetailHref(orgId, {
          exitProcessId: exitRow.id,
          teamId: exitRow.team_id,
          tab: "actions",
        })
      : null;

  async function handleCompleteExitSubmit() {
    if (!exitRow) return;
    const trimmed = completeMessage.trim();
    if (!trimmed) {
      setCompleteError("A completion message is required.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setCompleteError("Not signed in.");
      return;
    }
    setCompleteBusy(true);
    setCompleteError(null);
    try {
      await employeeExitCompleted(token, orgId, exitRow.id, {
        application_status: "approved",
        employee_id: exitRow.employee_id,
        response_message: trimmed,
      });
      setCompleteOpen(false);
      setExitActionSuccess("Exit process completed.");
      void loadEmployee(true);
    } catch (e) {
      setCompleteError(e instanceof Error ? e.message : "Could not complete exit process.");
    } finally {
      setCompleteBusy(false);
    }
  }

  function openCompleteExitModal() {
    setCompleteError(null);
    if (!completeMessage.trim()) {
      setCompleteMessage("Exit approved. Asset handovers are complete.");
    }
    setCompleteOpen(true);
  }

  const exitPrimaryBtnCls =
    "inline-flex min-h-[40px] shrink-0 items-center justify-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-[13px] font-semibold text-teal-900 shadow-sm transition hover:bg-teal-100 active:scale-[0.98] disabled:opacity-50 sm:px-4 sm:text-sm";
  const exitSecondaryBtnCls =
    "inline-flex min-h-[40px] shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#E4E7EC] bg-white px-3 py-2 text-[13px] font-semibold text-[#1F2937] shadow-sm transition hover:bg-[#F8FBFF] active:scale-[0.98] disabled:opacity-50 sm:px-4 sm:text-sm";

  const exitActionButtons =
    viewerCanManageExit && exitRow && !loading ? (
      <>
        {exitDetailHref ? (
          <button
            type="button"
            onClick={() => router.push(exitDetailHref)}
            className={exitSecondaryBtnCls}
          >
            <FileText className="h-4 w-4 shrink-0" aria-hidden />
            Full exit info
          </button>
        ) : null}
        {hasOpenExit && exitPending && exitActionsHref ? (
          <button
            type="button"
            onClick={() => router.push(exitActionsHref)}
            className={exitPrimaryBtnCls}
          >
            <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
            Move forward
          </button>
        ) : null}
        {hasOpenExit && exitInProgress ? (
          <button
            type="button"
            onClick={openCompleteExitModal}
            className={exitPrimaryBtnCls}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
            Complete exit process
          </button>
        ) : null}
      </>
    ) : null;

  const latestDocuments = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>();
    for (const doc of data?.documents ?? []) {
      const type = String(doc.document_type ?? doc.id ?? "doc");
      const existing = map.get(type);
      const docTime = new Date(String(doc.created_at ?? 0)).getTime();
      const existingTime = existing
        ? new Date(String(existing.created_at ?? 0)).getTime()
        : 0;
      if (!existing || docTime > existingTime) {
        map.set(type, doc);
      }
    }
    return Array.from(map.values()).sort(
      (a, b) =>
        new Date(String(b.created_at ?? 0)).getTime() -
        new Date(String(a.created_at ?? 0)).getTime(),
    );
  }, [data?.documents]);

  const uploadedDocumentTypes = useMemo(
    () => new Set(latestDocuments.map((doc) => String(doc.document_type ?? ""))),
    [latestDocuments],
  );

  const documentUploadFields = useMemo(() => {
    if (documentUploadInitial) {
      return EMPLOYEE_DOC_UPLOAD_FIELDS;
    }
    return EMPLOYEE_DOC_UPLOAD_FIELDS.filter((field) => !uploadedDocumentTypes.has(field.field));
  }, [documentUploadInitial, uploadedDocumentTypes]);

  const handoverByAssetId = useMemo(() => {
    const map = new Map<number, EmployeeExitHandoverQueryRow>();
    for (const row of exitDetailHandovers) {
      if (row.asset_id != null) map.set(Number(row.asset_id), row);
    }
    return map;
  }, [exitDetailHandovers]);

  const employeeAddresses = useMemo(
    () => data?.addresses ?? [],
    [data?.addresses],
  );

  const permanentAddress = useMemo(
    () =>
      employeeAddresses.find(
        (row) => String(row.address_type ?? "").toLowerCase() === "permanent",
      ),
    [employeeAddresses],
  );

  const currentAddress = useMemo(
    () =>
      employeeAddresses.find(
        (row) => String(row.address_type ?? "").toLowerCase() === "current",
      ),
    [employeeAddresses],
  );

  const canEditAddresses = employeeAddresses.length === 2;
  const canAddAddresses = employeeAddresses.length === 0;

  const startAddressAdd = useCallback(() => {
    setAddressDrafts([
      makeEmptyAddressDraft("permanent"),
      makeEmptyAddressDraft("current"),
    ]);
    setSameAsPermanent(false);
    setAddressError(null);
    setAddressSuccess(null);
    setAddressAdding(true);
    setAddressEditing(false);
  }, []);

  const startAddressEdit = useCallback(() => {
    const ordered =
      permanentAddress && currentAddress
        ? [permanentAddress, currentAddress]
        : employeeAddresses;
    setAddressDrafts(
      ordered.slice(0, 2).map((row) => makeAddressDraft(row as Record<string, unknown>)),
    );
    setSameAsPermanent(false);
    setAddressError(null);
    setAddressSuccess(null);
    setAddressEditing(true);
    setAddressAdding(false);
  }, [permanentAddress, currentAddress, employeeAddresses]);

  const cancelAddressForm = useCallback(() => {
    setAddressEditing(false);
    setAddressAdding(false);
    setAddressDrafts([]);
    setSameAsPermanent(false);
    setAddressError(null);
  }, []);

  const toggleSameAsPermanent = useCallback((checked: boolean) => {
    setSameAsPermanent(checked);
    if (checked) {
      setAddressDrafts((prev) => {
        if (prev.length < 2) return prev;
        return [prev[0], { ...prev[1], ...copyAddressFieldValues(prev[0]) }];
      });
    }
  }, []);

  const updateAddressDraft = useCallback(
    (index: number, field: keyof AddressDraft, value: string | boolean) => {
      setAddressDrafts((prev) => {
        const next = prev.map((draft, i) =>
          i === index ? { ...draft, [field]: value } : draft,
        );

        if (
          addressAdding &&
          sameAsPermanent &&
          index === 0 &&
          field !== "address_type" &&
          field !== "address_id" &&
          next.length >= 2
        ) {
          next[1] = { ...next[1], ...copyAddressFieldValues(next[0]) };
        }

        return next;
      });
    },
    [addressAdding, sameAsPermanent],
  );

  const buildAddressEntry = useCallback(
    (draft: AddressDraft): EmployeeAddressEntryPayload => ({
      address_type: draft.address_type,
      country: draft.country.trim(),
      state: draft.state.trim(),
      district: draft.district.trim(),
      city: draft.city.trim(),
      is_from_village: draft.is_from_village,
      village_name: draft.is_from_village ? draft.village_name.trim() : null,
      street: draft.street.trim(),
      house_number: draft.house_number.trim(),
      zip_code: draft.zip_code.trim(),
    }),
    [],
  );

  const submitAddressAdd = useCallback(async () => {
    const validationError = validateAddressDrafts(addressDrafts, false);
    if (validationError) {
      setAddressError(validationError);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setAddressError("Not signed in.");
      return;
    }

    const permanentEntry = addressDrafts.find((d) => d.address_type === "permanent");
    const currentEntry = addressDrafts.find((d) => d.address_type === "current");
    if (!permanentEntry || !currentEntry) {
      setAddressError("Both permanent and current addresses are required.");
      return;
    }

    setAddressSaving(true);
    setAddressError(null);
    try {
      await addUserAddress(token, {
        employee_id: userId,
        org_id: orgId,
        address_info: [buildAddressEntry(permanentEntry), buildAddressEntry(currentEntry)],
      });
      setAddressAdding(false);
      setAddressDrafts([]);
      setSameAsPermanent(false);
      setAddressSuccess("Addresses saved successfully.");
      await loadEmployee(true);
    } catch (e) {
      setAddressError(e instanceof Error ? e.message : "Could not save addresses.");
    } finally {
      setAddressSaving(false);
    }
  }, [addressDrafts, userId, orgId, loadEmployee, buildAddressEntry]);

  const submitAddressEdit = useCallback(async () => {
    const validationError = validateAddressDrafts(addressDrafts, true);
    if (validationError) {
      setAddressError(validationError);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setAddressError("Not signed in.");
      return;
    }

    const entries = addressDrafts.map<EmployeeAddressUpdateEntryPayload>((draft) => ({
      ...buildAddressEntry(draft),
      address_id: draft.address_id,
    }));

    const permanentEntry = entries.find((e) => e.address_type === "permanent");
    const currentEntry = entries.find((e) => e.address_type === "current");
    if (!permanentEntry || !currentEntry) {
      setAddressError("Both permanent and current addresses are required.");
      return;
    }

    setAddressSaving(true);
    setAddressError(null);
    try {
      await updateUserAddress(token, {
        employee_id: userId,
        org_id: orgId,
        address_info: [permanentEntry, currentEntry],
      });
      setAddressEditing(false);
      setAddressDrafts([]);
      setAddressSuccess("Addresses updated successfully.");
      await loadEmployee(true);
    } catch (e) {
      setAddressError(e instanceof Error ? e.message : "Could not update addresses.");
    } finally {
      setAddressSaving(false);
    }
  }, [addressDrafts, userId, orgId, loadEmployee, buildAddressEntry]);

  const openDocumentUpload = useCallback((initial: boolean) => {
    setDocumentUploadInitial(initial);
    setDocFiles({});
    setDocumentError(null);
    setDocumentSuccess(null);
    setDocumentUploadOpen(true);
  }, []);

  const closeDocumentUpload = useCallback(() => {
    if (documentSaving) return;
    setDocumentUploadOpen(false);
    setDocumentUploadInitial(false);
    setDocFiles({});
    setDocumentError(null);
  }, [documentSaving]);

  const openDocumentUpdate = useCallback((doc: Record<string, unknown>) => {
    setDocumentUpdateTarget(doc);
    setDocumentUpdateFile(null);
    setDocumentError(null);
  }, []);

  const closeDocumentUpdate = useCallback(() => {
    if (documentSaving) return;
    setDocumentUpdateTarget(null);
    setDocumentUpdateFile(null);
    setDocumentError(null);
  }, [documentSaving]);

  const openDocumentDelete = useCallback((doc: Record<string, unknown>) => {
    setDocumentDeleteTarget(doc);
    setDocumentError(null);
  }, []);

  const closeDocumentDelete = useCallback(() => {
    if (documentSaving) return;
    setDocumentDeleteTarget(null);
    setDocumentError(null);
  }, [documentSaving]);

  const submitDocumentUpload = useCallback(async () => {
    setDocumentError(null);

    if (documentUploadInitial) {
      const missing = EMPLOYEE_DOC_UPLOAD_FIELDS.filter(
        (field) => field.requiredForInitial && !docFiles[field.field],
      );
      if (missing.length > 0) {
        setDocumentError(
          `Please attach all required documents (${missing.map((m) => m.label).join(", ")}).`,
        );
        return;
      }
    } else {
      const selected = Object.values(docFiles).filter(Boolean);
      if (selected.length === 0) {
        setDocumentError("Select at least one document to upload.");
        return;
      }
      if (documentUploadFields.length === 0) {
        setDocumentError("All document types are already on file. Use Update to replace an existing document.");
        return;
      }
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setDocumentError("Not signed in.");
      return;
    }

    setDocumentSaving(true);
    try {
      await uploadEmployeeDocuments(token, {
        org_id: orgId,
        employee_user_id: userId,
        files: docFiles,
      });
      setDocumentUploadOpen(false);
      setDocumentUploadInitial(false);
      setDocFiles({});
      setDocumentSuccess(
        documentUploadInitial ? "Documents uploaded successfully." : "Documents added successfully.",
      );
      await loadEmployee(true);
    } catch (e) {
      setDocumentError(e instanceof Error ? e.message : "Could not upload documents.");
    } finally {
      setDocumentSaving(false);
    }
  }, [documentUploadInitial, docFiles, documentUploadFields.length, orgId, userId, loadEmployee]);

  const submitDocumentUpdate = useCallback(async () => {
    if (!documentUpdateTarget?.id) {
      setDocumentError("Document reference is missing. Please refresh and try again.");
      return;
    }
    if (!documentUpdateFile) {
      setDocumentError("Select a new file to replace this document.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setDocumentError("Not signed in.");
      return;
    }

    setDocumentSaving(true);
    setDocumentError(null);
    try {
      await updateEmployeeDocument(token, {
        org_id: orgId,
        employee_user_id: userId,
        document_id: documentUpdateTarget.id as number | string,
        file: documentUpdateFile,
      });
      setDocumentUpdateTarget(null);
      setDocumentUpdateFile(null);
      setDocumentSuccess("Document updated successfully.");
      await loadEmployee(true);
    } catch (e) {
      setDocumentError(e instanceof Error ? e.message : "Could not update document.");
    } finally {
      setDocumentSaving(false);
    }
  }, [documentUpdateTarget, documentUpdateFile, orgId, userId, loadEmployee]);

  const confirmDocumentDelete = useCallback(async () => {
    if (!documentDeleteTarget?.id) {
      setDocumentError("Document reference is missing. Please refresh and try again.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setDocumentError("Not signed in.");
      return;
    }

    setDocumentSaving(true);
    setDocumentError(null);
    try {
      await deleteEmployeeDocuments(token, {
        org_id: orgId,
        employee_user_id: userId,
        document_ids: [documentDeleteTarget.id as number | string],
      });
      setDocumentDeleteTarget(null);
      setDocumentSuccess("Document deleted successfully.");
      await loadEmployee(true);
    } catch (e) {
      setDocumentError(e instanceof Error ? e.message : "Could not delete document.");
    } finally {
      setDocumentSaving(false);
    }
  }, [documentDeleteTarget, orgId, userId, loadEmployee]);

  const actorUserId = ctx?.user?.user_id != null ? String(ctx.user.user_id) : "";

  const openAssetAdd = useCallback(() => {
    setAssetDraftRows([createEmptyAssetDraft()]);
    setAssetError(null);
    setAssetSuccess(null);
    setAssetAddOpen(true);
  }, []);

  const closeAssetAdd = useCallback(() => {
    if (assetSaving) return;
    setAssetAddOpen(false);
    setAssetDraftRows([createEmptyAssetDraft()]);
    setAssetError(null);
  }, [assetSaving]);

  const loadAssetManagers = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token || !orgId) return;
    setAssetManagersLoading(true);
    try {
      const res = await getManagementEmployeesPage(token, orgId, 1, 200);
      setAssetManagers(
        res.data.map((row) => ({
          id: String(row.user_id),
          name: asText(row.user_name, `User ${row.user_id}`),
        })),
      );
    } catch {
      setAssetManagers([]);
    } finally {
      setAssetManagersLoading(false);
    }
  }, [orgId]);

  const openAssetView = useCallback(
    async (asset: Record<string, unknown>) => {
      const assetId = asset.id;
      if (assetId == null) return;
      const token = localStorage.getItem("token");
      if (!token) {
        setAssetError("Not signed in.");
        return;
      }
      setAssetViewTarget(null);
      setAssetViewLoading(true);
      setAssetError(null);
      try {
        const res = await getSingleEmployeeAsset(token, orgId, assetId as number | string);
        setAssetViewTarget(res.data ?? (asset as EmployeeAssetRow));
      } catch (e) {
        setAssetError(e instanceof Error ? e.message : "Could not load asset details.");
      } finally {
        setAssetViewLoading(false);
      }
    },
    [orgId],
  );

  const openAssetEdit = useCallback((asset: Record<string, unknown>) => {
    const row = asset as EmployeeAssetRow;
    setAssetEditTarget(row);
    setAssetEditDraft({
      asset_name: asText(row.asset_name),
      asset_type: String(row.asset_type ?? "other").toLowerCase(),
      asset_summary: asText(row.asset_summary),
      handover_date_time: row.handover_date_time
        ? String(row.handover_date_time).slice(0, 16).replace(" ", "T")
        : "",
      file: null,
    });
    setAssetError(null);
  }, []);

  const openAssetStatus = useCallback((asset: Record<string, unknown>) => {
    setAssetStatusTarget(asset);
    setAssetError(null);
  }, []);

  const openAssetHandover = useCallback(
    async (asset: Record<string, unknown>) => {
      if (!exitRow?.id) {
        setAssetError("An active exit process is required for handover.");
        return;
      }
      setAssetHandoverTarget(asset);
      setAssetHandoverManagerId(
        asset.returned_to_id != null ? String(asset.returned_to_id) : "",
      );
      setAssetHandoverRemarks("");
      setAssetError(null);
      await loadAssetManagers();
    },
    [exitRow?.id, loadAssetManagers],
  );

  const openAssetReturnCompleted = useCallback((asset: Record<string, unknown>) => {
    setAssetReturnTarget(asset);
    setAssetError(null);
  }, []);

  const submitAssetAdd = useCallback(async () => {
    setAssetError(null);
    const candidates = assetDraftRows.filter((row) => !assetRowIsEmpty(row));
    if (candidates.length === 0) {
      setAssetError("Add at least one asset with a name and type.");
      return;
    }

    const typesSet = new Set<string>([...EMPLOYEE_ASSET_TYPES]);
    for (let i = 0; i < candidates.length; i++) {
      const row = candidates[i];
      if (!row.asset_name.trim()) {
        setAssetError(`Asset ${i + 1}: name is required.`);
        return;
      }
      if (!typesSet.has(row.asset_type)) {
        setAssetError(`Asset ${i + 1}: pick a valid asset type.`);
        return;
      }
      if (row.file && row.file.size > MAX_ASSET_FILE_BYTES) {
        setAssetError(`Asset ${i + 1}: file must be 5 MB or smaller.`);
        return;
      }
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setAssetError("Not signed in.");
      return;
    }

    setAssetSaving(true);
    try {
      await uploadEmployeeAssetsBatch(token, {
        org_id: orgId,
        items: candidates.map((row, index) => ({
          employee_id: userId,
          asset_name: row.asset_name.trim(),
          asset_type: row.asset_type,
          asset_summary: row.asset_summary.trim() || null,
          handover_date_time: row.handover_date_time.trim()
            ? `${row.handover_date_time.trim().replace("T", " ")}:00`
            : null,
          image_field: `asset_image_${index}`,
          file: row.file,
        })),
      });
      setAssetAddOpen(false);
      setAssetDraftRows([createEmptyAssetDraft()]);
      setAssetSuccess("Assets assigned successfully.");
      await loadEmployee(true);
    } catch (e) {
      setAssetError(e instanceof Error ? e.message : "Could not assign assets.");
    } finally {
      setAssetSaving(false);
    }
  }, [assetDraftRows, orgId, userId, loadEmployee]);

  const submitAssetEdit = useCallback(async () => {
    if (!assetEditTarget?.id) {
      setAssetError("Asset reference is missing.");
      return;
    }
    if (!assetEditDraft.asset_name.trim()) {
      setAssetError("Asset name is required.");
      return;
    }
    if (!EMPLOYEE_ASSET_TYPES.includes(assetEditDraft.asset_type as (typeof EMPLOYEE_ASSET_TYPES)[number])) {
      setAssetError("Pick a valid asset type.");
      return;
    }
    if (assetEditDraft.file && assetEditDraft.file.size > MAX_ASSET_FILE_BYTES) {
      setAssetError("Image file must be 5 MB or smaller.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setAssetError("Not signed in.");
      return;
    }

    setAssetSaving(true);
    setAssetError(null);
    try {
      await updateEmployeeAssetsBatch(token, {
        org_id: orgId,
        items: [
          {
            id: assetEditTarget.id,
            asset_name: assetEditDraft.asset_name.trim(),
            asset_type: assetEditDraft.asset_type,
            asset_summary: assetEditDraft.asset_summary.trim() || null,
            handover_date_time: assetEditDraft.handover_date_time.trim()
              ? `${assetEditDraft.handover_date_time.trim().replace("T", " ")}:00`
              : null,
            image_field: "asset_image_0",
            file: assetEditDraft.file,
          },
        ],
      });
      setAssetEditTarget(null);
      setAssetSuccess("Asset updated successfully.");
      await loadEmployee(true);
    } catch (e) {
      setAssetError(e instanceof Error ? e.message : "Could not update asset.");
    } finally {
      setAssetSaving(false);
    }
  }, [assetEditTarget, assetEditDraft, orgId, loadEmployee]);

  const submitAssetStatus = useCallback(async () => {
    if (!assetStatusTarget?.id) {
      setAssetError("Asset reference is missing.");
      return;
    }
    const currentStatus = String(assetStatusTarget.asset_status ?? "").toLowerCase();
    if (currentStatus !== "active") {
      setAssetError("Only active assets can be marked as returned from here.");
      return;
    }
    if (!actorUserId) {
      setAssetError("Could not determine the receiving user.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setAssetError("Not signed in.");
      return;
    }

    setAssetSaving(true);
    setAssetError(null);
    try {
      await returnEmployeeAssets(token, {
        org_id: orgId,
        returns: [
          {
            asset_id: assetStatusTarget.id as number | string,
            returned_to_id: actorUserId,
          },
        ],
      });
      setAssetStatusTarget(null);
      setAssetSuccess("Asset marked as returned.");
      await loadEmployee(true);
    } catch (e) {
      setAssetError(e instanceof Error ? e.message : "Could not update asset status.");
    } finally {
      setAssetSaving(false);
    }
  }, [assetStatusTarget, actorUserId, orgId, loadEmployee]);

  const submitAssetHandover = useCallback(async () => {
    if (!assetHandoverTarget?.id || !exitRow?.id) {
      setAssetError("Exit process or asset reference is missing.");
      return;
    }
    if (!assetHandoverManagerId) {
      setAssetError("Select a handover manager.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setAssetError("Not signed in.");
      return;
    }

    const sharedBody = {
      org_id: orgId,
      employee_id: userId,
      manager_id: assetHandoverManagerId,
      asset_id: assetHandoverTarget.id as number | string,
      team_id: exitRow.team_id ?? null,
      remarks: assetHandoverRemarks.trim() || null,
    };

    setAssetSaving(true);
    setAssetError(null);
    try {
      if (assetHandoverTarget.returned_to_id || handoverByAssetId.has(Number(assetHandoverTarget.id))) {
        await updateAssignedHandoverManager(token, orgId, exitRow.id, {
          ...sharedBody,
          handover_date: handoverDateTimeSqlNow(),
        });
        setAssetSuccess("Handover manager updated.");
      } else {
        await assignHandoverManager(token, orgId, exitRow.id, {
          ...sharedBody,
          handover_date: handoverDateTimeSqlNow(),
        });
        setAssetSuccess("Handover manager assigned.");
      }
      setAssetHandoverTarget(null);
      await loadEmployee(true);
      const res = await fetchEmployeeExitProcessById(token, orgId, exitRow.id);
      setExitDetailHandovers(res.data?.handover_queries ?? []);
    } catch (e) {
      setAssetError(e instanceof Error ? e.message : "Could not save handover.");
    } finally {
      setAssetSaving(false);
    }
  }, [
    assetHandoverTarget,
    assetHandoverManagerId,
    assetHandoverRemarks,
    exitRow,
    orgId,
    userId,
    loadEmployee,
    handoverByAssetId,
  ]);

  const confirmAssetReturnCompleted = useCallback(async () => {
    if (!assetReturnTarget?.id) {
      setAssetError("Asset reference is missing.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setAssetError("Not signed in.");
      return;
    }

    setAssetSaving(true);
    setAssetError(null);
    try {
      await returnAssetsCompleted(token, orgId, {
        employee_id: userId,
        assets_ids: [assetReturnTarget.id as number | string],
      });
      setAssetReturnTarget(null);
      setAssetSuccess("Asset return confirmed.");
      await loadEmployee(true);
      if (exitRow?.id) {
        const res = await fetchEmployeeExitProcessById(token, orgId, exitRow.id);
        setExitDetailHandovers(res.data?.handover_queries ?? []);
      }
    } catch (e) {
      setAssetError(e instanceof Error ? e.message : "Could not confirm asset return.");
    } finally {
      setAssetSaving(false);
    }
  }, [assetReturnTarget, orgId, userId, loadEmployee, exitRow?.id]);

  const validateReferenceForm = useCallback((form: ReferenceEditForm): string | null => {
    if (!form.previous_company_name.trim()) return "Previous company name is required.";
    if (!form.person_name.trim()) return "Reference contact name is required.";
    if (!form.person_contact_number1.trim()) return "Primary phone number is required.";
    if (!form.person_contact_email.trim()) return "Reference contact email is required.";
    if (!isValidReferenceEmail(form.person_contact_email)) {
      return "Enter a valid reference contact email.";
    }
    if (form.company_email.trim() && !isValidReferenceEmail(form.company_email)) {
      return "Enter a valid company email.";
    }
    return null;
  }, []);

  const openReferenceAdd = useCallback(() => {
    setReferenceAddForm(createEmptyReferenceForm());
    setReferenceError(null);
    setReferenceAddOpen(true);
  }, []);

  const closeReferenceAdd = useCallback(() => {
    if (referenceSaving) return;
    setReferenceAddOpen(false);
    setReferenceAddForm(createEmptyReferenceForm());
    setReferenceError(null);
  }, [referenceSaving]);

  const openReferenceView = useCallback(
    async (refRow: BackgroundVerificationReferenceItem) => {
      const token = localStorage.getItem("token");
      if (!token) {
        setReferenceError("Not signed in.");
        return;
      }

      setReferenceViewLoading(true);
      setReferenceViewTarget(null);
      setReferenceError(null);
      try {
        const res = await getSingleUserBackgroundVerification(token, orgId, userId, refRow.id);
        if (res.data) setReferenceViewTarget(res.data);
        else setReferenceError("Reference not found.");
      } catch (e) {
        setReferenceError(e instanceof Error ? e.message : "Could not load reference details.");
      } finally {
        setReferenceViewLoading(false);
      }
    },
    [orgId, userId],
  );

  const closeReferenceView = useCallback(() => {
    if (referenceViewLoading) return;
    setReferenceViewTarget(null);
  }, [referenceViewLoading]);

  const openReferenceEdit = useCallback((refRow: BackgroundVerificationReferenceItem) => {
    setReferenceEditTarget(refRow);
    setReferenceEditForm(refItemToEditForm(refRow));
    setReferenceError(null);
  }, []);

  const closeReferenceEdit = useCallback(() => {
    if (referenceSaving) return;
    setReferenceEditTarget(null);
    setReferenceEditForm(null);
    setReferenceError(null);
  }, [referenceSaving]);

  const openReferenceVerify = useCallback((refRow: BackgroundVerificationReferenceItem) => {
    setReferenceVerifyTarget(refRow);
    const current = String(refRow.verification_status).toLowerCase() as BackgroundVerificationStatus;
    setReferenceVerifyStatus(
      BGV_STATUS_OPTIONS.some((o) => o.value === current) ? current : "in_progress",
    );
    setReferenceVerifyNotes(refRow.verification_notes ?? "");
    setReferenceError(null);
  }, []);

  const closeReferenceVerify = useCallback(() => {
    if (referenceSaving) return;
    setReferenceVerifyTarget(null);
    setReferenceVerifyNotes("");
    setReferenceError(null);
  }, [referenceSaving]);

  const submitReferenceAdd = useCallback(async () => {
    const validationError = validateReferenceForm(referenceAddForm);
    if (validationError) {
      setReferenceError(validationError);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setReferenceError("Not signed in.");
      return;
    }

    setReferenceSaving(true);
    setReferenceError(null);
    try {
      await createUserBackgroundVerification(token, {
        org_id: orgId,
        employee_id: userId,
        background_verification_info: editFormToReferencePayload(referenceAddForm),
      });
      setReferenceAddOpen(false);
      setReferenceAddForm(createEmptyReferenceForm());
      setReferenceSuccess("Previous company reference added successfully.");
      await loadBgvReferences(true);
    } catch (e) {
      setReferenceError(e instanceof Error ? e.message : "Could not add reference.");
    } finally {
      setReferenceSaving(false);
    }
  }, [referenceAddForm, orgId, userId, validateReferenceForm, loadBgvReferences]);

  const submitReferenceEdit = useCallback(async () => {
    if (!referenceEditTarget || !referenceEditForm) return;

    const validationError = validateReferenceForm(referenceEditForm);
    if (validationError) {
      setReferenceError(validationError);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setReferenceError("Not signed in.");
      return;
    }

    setReferenceSaving(true);
    setReferenceError(null);
    try {
      await updateUserBackgroundVerification(token, {
        org_id: orgId,
        employee_id: userId,
        reference_id: referenceEditTarget.id,
        background_verification_info: editFormToReferencePayload(referenceEditForm),
      });
      setReferenceEditTarget(null);
      setReferenceEditForm(null);
      setReferenceSuccess("Reference updated successfully.");
      await loadBgvReferences(true);
    } catch (e) {
      setReferenceError(e instanceof Error ? e.message : "Could not update reference.");
    } finally {
      setReferenceSaving(false);
    }
  }, [referenceEditTarget, referenceEditForm, orgId, userId, validateReferenceForm, loadBgvReferences]);

  const submitReferenceVerify = useCallback(async () => {
    if (!referenceVerifyTarget) return;

    const token = localStorage.getItem("token");
    if (!token) {
      setReferenceError("Not signed in.");
      return;
    }

    setReferenceSaving(true);
    setReferenceError(null);
    try {
      await updateEmployeeBackgroundVerificationStatus(token, {
        org_id: orgId,
        employee_id: userId,
        verification_info: {
          verification_id: referenceVerifyTarget.id,
          verification_status: referenceVerifyStatus,
          verification_notes: referenceVerifyNotes.trim() || null,
        },
      });
      setReferenceVerifyTarget(null);
      setReferenceVerifyNotes("");
      setReferenceSuccess("Verification status updated successfully.");
      await loadBgvReferences(true);
    } catch (e) {
      setReferenceError(e instanceof Error ? e.message : "Could not update verification status.");
    } finally {
      setReferenceSaving(false);
    }
  }, [
    referenceVerifyTarget,
    referenceVerifyStatus,
    referenceVerifyNotes,
    orgId,
    userId,
    loadBgvReferences,
  ]);

  const assignedIpIds = useMemo(() => {
    if (!data) return new Set<number>();
    const ids = data.ip_assignments
      .map((row) => ipAssignmentIpId(row as Record<string, unknown>))
      .filter((id): id is number => id != null);
    return new Set(ids);
  }, [data]);

  const availableCompanyIps = useMemo(
    () => companyIps.filter((ip) => !assignedIpIds.has(Number(ip.id))),
    [companyIps, assignedIpIds],
  );

  const openIpAssign = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setIpError("Not signed in.");
      return;
    }

    setIpAssignOpen(true);
    setIpError(null);
    setSelectedIpId("");
    setCompanyIpsLoading(true);
    try {
      const ips = await getCompanyIPAddresses(token, orgId);
      setCompanyIps(ips);
    } catch (e) {
      setCompanyIps([]);
      setIpError(e instanceof Error ? e.message : "Could not load IP addresses.");
    } finally {
      setCompanyIpsLoading(false);
    }
  }, [orgId]);

  const closeIpAssign = useCallback(() => {
    if (ipSaving) return;
    setIpAssignOpen(false);
    setSelectedIpId("");
    setIpError(null);
  }, [ipSaving]);

  const submitIpAssign = useCallback(async () => {
    if (!selectedIpId) {
      setIpError("Select an IP address to assign.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setIpError("Not signed in.");
      return;
    }

    setIpSaving(true);
    setIpError(null);
    try {
      await assignIpToEmployee(token, { employee_id: userId, ip_id: selectedIpId });
      setIpAssignOpen(false);
      setSelectedIpId("");
      setIpSuccess("IP address assigned successfully.");
      await loadEmployee(true);
    } catch (e) {
      setIpError(e instanceof Error ? e.message : "Could not assign IP address.");
    } finally {
      setIpSaving(false);
    }
  }, [selectedIpId, userId, loadEmployee]);

  const confirmIpUnassign = useCallback(async () => {
    if (!ipUnassignTarget) return;

    const ipId = ipAssignmentIpId(ipUnassignTarget);
    if (ipId == null) {
      setIpError("IP reference is missing.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setIpError("Not signed in.");
      return;
    }

    setIpSaving(true);
    setIpError(null);
    try {
      await unassignIpFromEmployee(token, { employee_id: userId, ip_id: ipId });
      setIpUnassignTarget(null);
      setIpSuccess("IP address unassigned successfully.");
      await loadEmployee(true);
    } catch (e) {
      setIpError(e instanceof Error ? e.message : "Could not unassign IP address.");
    } finally {
      setIpSaving(false);
    }
  }, [ipUnassignTarget, userId, loadEmployee]);

  const openShiftAssign = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setShiftError("Not signed in.");
      return;
    }

    setShiftAssignOpen(true);
    setShiftError(null);
    setSelectedShiftId(userShifts[0] ? String(userShifts[0].id) : "");
    setCompanyShiftsLoading(true);
    try {
      const shifts = await getCompanyShifts(token, orgId);
      setCompanyShifts(shifts);
    } catch (e) {
      setCompanyShifts([]);
      setShiftError(e instanceof Error ? e.message : "Could not load shifts.");
    } finally {
      setCompanyShiftsLoading(false);
    }
  }, [orgId, userShifts]);

  const closeShiftAssign = useCallback(() => {
    if (shiftSaving) return;
    setShiftAssignOpen(false);
    setSelectedShiftId("");
    setShiftError(null);
  }, [shiftSaving]);

  const submitShiftAssign = useCallback(async () => {
    if (!selectedShiftId) {
      setShiftError("Select a shift to assign.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setShiftError("Not signed in.");
      return;
    }

    setShiftSaving(true);
    setShiftError(null);
    try {
      await assignUserToShift(token, {
        org_id: orgId,
        user_id: userId,
        shift_id: selectedShiftId,
      });
      setShiftAssignOpen(false);
      setSelectedShiftId("");
      setShiftSuccess(
        userShifts.length > 0 ? "Shift updated successfully." : "Shift assigned successfully.",
      );
      await Promise.all([loadUserShifts(true), loadEmployee(true)]);
    } catch (e) {
      setShiftError(e instanceof Error ? e.message : "Could not assign shift.");
    } finally {
      setShiftSaving(false);
    }
  }, [selectedShiftId, orgId, userId, userShifts.length, loadUserShifts, loadEmployee]);

  const confirmShiftUnassign = useCallback(async () => {
    if (!shiftUnassignTarget) return;

    const token = localStorage.getItem("token");
    if (!token) {
      setShiftError("Not signed in.");
      return;
    }

    setShiftSaving(true);
    setShiftError(null);
    try {
      await unassignUserFromShift(token, {
        org_id: orgId,
        user_id: userId,
        shift_id: shiftUnassignTarget.id,
      });
      setShiftUnassignTarget(null);
      setShiftSuccess("Shift unassigned successfully.");
      await Promise.all([loadUserShifts(true), loadEmployee(true)]);
    } catch (e) {
      setShiftError(e instanceof Error ? e.message : "Could not unassign shift.");
    } finally {
      setShiftSaving(false);
    }
  }, [shiftUnassignTarget, orgId, userId, loadUserShifts, loadEmployee]);

  const employeeHasBankInfo = useMemo(
    () => hasEmployeeBankInfo(info as Record<string, unknown> | undefined),
    [info],
  );

  const openBankAdd = useCallback(() => {
    setBankFormMode("add");
    setBankForm(createEmptyBankForm());
    setBankError(null);
    setBankFormOpen(true);
  }, []);

  const openBankEdit = useCallback(() => {
    setBankFormMode("edit");
    setBankForm(bankInfoFromUserInfo(info as Record<string, unknown> | undefined));
    setBankError(null);
    setBankFormOpen(true);
  }, [info]);

  const closeBankForm = useCallback(() => {
    if (bankSaving) return;
    setBankFormOpen(false);
    setBankForm(createEmptyBankForm());
    setBankError(null);
  }, [bankSaving]);

  const validateBankForm = useCallback((form: BankInfoForm): string | null => {
    if (!form.account_holder_name.trim()) return "Account holder name is required.";
    if (!form.bank_name.trim()) return "Bank name is required.";
    if (!form.bank_branch.trim()) return "Bank branch is required.";
    if (!form.account_number.trim()) return "Account number is required.";
    if (!form.ifsc_code.trim()) return "IFSC code is required.";
    if (!isValidIfscCode(form.ifsc_code)) {
      return "IFSC code must match standard format (e.g. SBIN0001234).";
    }
    return null;
  }, []);

  const submitBankForm = useCallback(async () => {
    const validationError = validateBankForm(bankForm);
    if (validationError) {
      setBankError(validationError);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setBankError("Not signed in.");
      return;
    }

    const payload = {
      org_id: orgId,
      user_id: userId,
      account_holder_name: bankForm.account_holder_name,
      account_number: bankForm.account_number,
      bank_name: bankForm.bank_name,
      bank_branch: bankForm.bank_branch,
      ifsc_code: bankForm.ifsc_code,
      uan_number: bankForm.uan_number.trim() || null,
    };

    setBankSaving(true);
    setBankError(null);
    try {
      if (bankFormMode === "add") {
        await createEmployeeBankInfo(token, payload);
        setBankSuccess("Bank information added successfully.");
      } else {
        await updateEmployeeBankInfo(token, payload);
        setBankSuccess("Bank information updated successfully.");
      }
      setBankFormOpen(false);
      setBankForm(createEmptyBankForm());
      await loadEmployee(true);
    } catch (e) {
      setBankError(e instanceof Error ? e.message : "Could not save bank information.");
    } finally {
      setBankSaving(false);
    }
  }, [bankForm, bankFormMode, orgId, userId, validateBankForm, loadEmployee]);

  const orgName = asText(ctx?.organization?.org_name, "Organization");
  const employeeIsActive = !hasOpenExit;

  const profileImageUrl =
    info?.user_image != null && String(info.user_image).trim() !== ""
      ? String(info.user_image).trim()
      : null;

  const exportEmployee = useMemo<EmployeeAttendanceRow | null>(() => {
    if (!userId || !info) return null;
    const portalUserId = info.id ?? userId;
    return {
      employee_id: portalUserId,
      user_id: portalUserId,
      employee_name: employeeName,
      employee_email: asText(info.user_email),
      org_id: orgId,
      employee_designation: asText(info.role_name),
      employee_profile_img: profileImageUrl ?? "",
      employee_phone: asText(info.user_phone),
      attendance_check_in_time: "",
      attendance_check_out_time: "",
      employee_working_hours: 0,
      employee_attendance_status: "",
      attendance_date: "",
      is_active_employee: employeeIsActive,
      total_attendance_days: 0,
      total_present_days: 0,
      total_absent_days: 0,
      total_on_leave_days: 0,
      total_check_in_on_time_days: 0,
      total_check_in_late_days: 0,
    };
  }, [userId, orgId, info, employeeName, employeeIsActive, profileImageUrl]);

  const attendanceRate = useMemo(() => {
    const kpiTotal = monthAttendance.summary.kpiTotal;
    if (kpiTotal <= 0) return null;
    const credited =
      monthAttendance.summary.present +
      monthAttendance.summary.presentFullDay +
      monthAttendance.summary.late;
    return Math.round((credited / kpiTotal) * 100);
  }, [monthAttendance]);

  const leaveRemaining = useMemo(() => {
    if (!data) return 0;
    return data.leave_balance.reduce(
      (sum, row) => sum + asNumber(row.remaining_leaves),
      0,
    );
  }, [data]);

  const scrollToSection = useCallback((id: string) => {
    if (typeof document === "undefined") return;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const fullAttendanceHref = useMemo(() => {
    if (!orgId || !userId) return "";
    return getEmployeeAttendanceHref(orgId, userId);
  }, [orgId, userId]);

  const quickActions: HeroQuickAction[] = useMemo(
    () => [
      { id: "section-personal", icon: <User className="h-4 w-4" />, label: "Profile" },
      { id: "section-attendance", icon: <CalendarCheck className="h-4 w-4" />, label: "Attendance" },
      { id: "section-payroll", icon: <Wallet className="h-4 w-4" />, label: "Payroll" },
      { id: "section-assets", icon: <Laptop className="h-4 w-4" />, label: "Assets" },
      { id: "section-documents", icon: <FileText className="h-4 w-4" />, label: "Documents" },
    ],
    [],
  );

  const insightsPanel = data ? (
    <EmployeeInsightsPanel
      leaveQueries={data.leave_queries}
      leaveBalance={data.leave_balance}
      documents={latestDocuments}
      attendanceQueries={data.attendance_related_queries}
      assets={data.assets}
      attendanceLogs={data.attendance_logs}
    />
  ) : null;

  const calendarCard = (
    <div className={`${GLASS_CARD} p-5 lg:p-6`}>
      <AttendanceMiniCalendar
        month={attendanceMonth}
        year={attendanceYear}
        rows={attendanceRows}
        selectedDay={selectedCalendarDay}
        onSelectDay={(day) => {
          setSelectedCalendarDay((prev) => (prev === day ? null : day));
        }}
        onPrevMonth={() => shiftAttendanceMonth(-1)}
        onNextMonth={() => shiftAttendanceMonth(1)}
      />
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#F1F5F9] pt-4">
        {[
          { label: "Present", cls: "bg-[#10B981]" },
          { label: "Late", cls: "bg-[#F59E0B]" },
          { label: "Absent", cls: "bg-[#DC2626]" },
          { label: "Half day", cls: "bg-[#008CD3]" },
          { label: "Sat / Sun off", cls: "bg-[#E5E7EB]" },
        ].map((legend) => (
          <span key={legend.label} className="inline-flex items-center gap-1.5 text-[12px] text-[#64748B]">
            <span className={`h-2.5 w-2.5 rounded-full ${legend.cls}`} />
            {legend.label}
          </span>
        ))}
      </div>
    </div>
  );

  const attendanceTable = (
    <AttendanceHistoryTable
      rows={attendanceRows}
      loading={attendanceLoading}
      error={attendanceError}
      month={attendanceMonth}
      year={attendanceYear}
      onMonthChange={setAttendanceMonth}
      onYearChange={setAttendanceYear}
      onRefresh={() => void loadAttendance(true)}
      refreshing={attendanceRefreshing}
      fullAttendanceHref={fullAttendanceHref || undefined}
      statusByDate={monthAttendance.statusByDate}
      onExport={() => setExportOpen(true)}
      exportDisabled={!exportEmployee}
    />
  );

  const personalInfoCard = data ? (
    <SectionCard
      id="section-personal"
      title="Personal information"
      subtitle="Contact, role and emergency details"
      icon={<User className="h-5 w-5" />}
      accent="primary"
    >
      <DetailGrid>
        <DetailItem
          label="Email"
          icon={<Mail className="h-4 w-4" />}
          value={
            info?.user_email ? (
              <a href={`mailto:${info.user_email}`} className="text-[#2563EB] hover:underline">
                {asText(info.user_email)}
              </a>
            ) : (
              "—"
            )
          }
        />
        <DetailItem
          label="Phone"
          icon={<Phone className="h-4 w-4" />}
          value={
            info?.user_phone ? (
              <a href={`tel:${info.user_phone}`} className="text-[#2563EB] hover:underline">
                {asText(info.user_phone)}
              </a>
            ) : (
              "—"
            )
          }
        />
        <DetailItem label="Designation" icon={<Briefcase className="h-4 w-4" />} value={formatLabel(info?.role_name)} />
        <DetailItem label="Joining date" icon={<CalendarDays className="h-4 w-4" />} value={formatDate(info?.created_at)} />
        <DetailItem label="Emergency contact" icon={<User className="h-4 w-4" />} value={asText(info?.emergency_contact_name)} />
        <DetailItem label="Emergency number" icon={<Phone className="h-4 w-4" />} value={asText(info?.emergency_number)} />
        <DetailItem label="Relation" icon={<Users className="h-4 w-4" />} value={formatLabel(info?.relation_blood_line)} />
        <DetailItem label="Employee code" icon={<Hash className="h-4 w-4" />} value={employeeEmpCode} />
      </DetailGrid>
    </SectionCard>
  ) : null;

  const workSectionAction = data ? (
    employeeHasBankInfo ? (
      <button
        type="button"
        onClick={openBankEdit}
        className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#334155] shadow-sm transition hover:-translate-y-0.5 hover:text-[#059669] hover:shadow-md"
      >
        <Pencil className="h-4 w-4" />
        Update bank information
      </button>
    ) : (
      <button
        type="button"
        onClick={openBankAdd}
        className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#334155] shadow-sm transition hover:-translate-y-0.5 hover:text-[#059669] hover:shadow-md"
      >
        <Plus className="h-4 w-4" />
        Add bank information
      </button>
    )
  ) : null;

  const workSection = data ? (
    <SectionCard
      id="section-payroll"
      title="Work & payroll"
      subtitle="Shift schedule and banking details"
      icon={<Wallet className="h-5 w-5" />}
      accent="success"
      action={workSectionAction}
      isEmpty={!info?.shift_name && !employeeHasBankInfo}
      emptyText="No work or bank details on file."
    >
      {bankSuccess && !bankFormOpen ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-2 text-[13px] text-[#059669]">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{bankSuccess}</span>
          <button
            type="button"
            onClick={() => setBankSuccess(null)}
            className="shrink-0 rounded p-0.5 hover:bg-[#D1FAE5]"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {bankError && !bankFormOpen ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[13px] text-[#DC2626]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{bankError}</span>
        </div>
      ) : null}

      <DetailGrid>
        <DetailItem label="Shift" icon={<Clock className="h-4 w-4" />} value={asText(info?.shift_name)} />
        <DetailItem
          label="Timing"
          icon={<Clock className="h-4 w-4" />}
          value={
            info?.start_time || info?.end_time
              ? `${asText(info?.start_time)} – ${asText(info?.end_time)}`
              : "—"
          }
        />
        <DetailItem label="Working days" icon={<CalendarDays className="h-4 w-4" />} value={formatWorkingDays(info?.working_days)} />
        <DetailItem
          label="Night shift"
          icon={<Clock className="h-4 w-4" />}
          value={info?.is_night_shift ? "Yes" : info?.is_night_shift === 0 ? "No" : "—"}
        />
        <DetailItem label="Account holder" icon={<User className="h-4 w-4" />} value={asText(info?.account_holder_name)} />
        <DetailItem label="Bank" icon={<Wallet className="h-4 w-4" />} value={asText(info?.bank_name)} />
        <DetailItem label="Branch" icon={<Building2 className="h-4 w-4" />} value={asText(info?.bank_branch)} />
        <DetailItem label="Account" icon={<Hash className="h-4 w-4" />} value={maskAccountNumber(info?.account_number)} />
        <DetailItem label="IFSC" icon={<Hash className="h-4 w-4" />} value={asText(info?.ifsc_code)} />
        <DetailItem label="UAN" icon={<Hash className="h-4 w-4" />} value={asText(info?.uan_number)} />
      </DetailGrid>

      {!employeeHasBankInfo ? (
        <button
          type="button"
          onClick={openBankAdd}
          className="mt-4 flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-8 text-center transition hover:border-[#10B981]/40 hover:bg-[#ECFDF5]"
        >
          <Wallet className="h-7 w-7 text-[#94A3B8]" aria-hidden />
          <p className="mt-2 text-[14px] font-semibold text-[#0F172A]">No bank details on file</p>
          <p className="mt-1 text-[12px] text-[#64748B]">Click to add payroll bank information</p>
        </button>
      ) : null}
    </SectionCard>
  ) : null;

  const addressesAction = data ? (
    addressAdding ? (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={cancelAddressForm}
          disabled={addressSaving}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] font-semibold text-[#64748B] transition hover:bg-[#F8FAFC] hover:text-[#0F172A] disabled:opacity-50"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void submitAddressAdd()}
          disabled={addressSaving}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#3B82F6] px-3.5 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:shadow-md disabled:opacity-60"
        >
          {addressSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {addressSaving ? "Saving…" : "Save addresses"}
        </button>
      </div>
    ) : addressEditing ? (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={cancelAddressForm}
          disabled={addressSaving}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] font-semibold text-[#64748B] transition hover:bg-[#F8FAFC] hover:text-[#0F172A] disabled:opacity-50"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void submitAddressEdit()}
          disabled={addressSaving}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#3B82F6] px-3.5 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:shadow-md disabled:opacity-60"
        >
          {addressSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {addressSaving ? "Saving…" : "Save changes"}
        </button>
      </div>
    ) : canEditAddresses ? (
      <button
        type="button"
        onClick={startAddressEdit}
        className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#334155] shadow-sm transition hover:-translate-y-0.5 hover:text-[#2563EB] hover:shadow-md"
      >
        <Pencil className="h-4 w-4" />
        Edit addresses
      </button>
    ) : null
  ) : null;

  const permanentDraft = addressDrafts.find((d) => d.address_type === "permanent");
  const currentDraft = addressDrafts.find((d) => d.address_type === "current");

  const addressesSection = data ? (
    <SectionCard
      title="Addresses"
      subtitle={
        canAddAddresses && !addressAdding
          ? "Add permanent and current residence"
          : "Permanent and current residence on file"
      }
      icon={<MapPin className="h-5 w-5" />}
      accent="primary"
      action={addressesAction}
    >
      {addressSuccess && !addressEditing && !addressAdding ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-2 text-[13px] text-[#059669]">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{addressSuccess}</span>
          <button
            type="button"
            onClick={() => setAddressSuccess(null)}
            className="shrink-0 rounded p-0.5 hover:bg-[#D1FAE5]"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {addressError && (addressEditing || addressAdding) ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[13px] text-[#DC2626]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{addressError}</span>
        </div>
      ) : null}

      {addressAdding && permanentDraft && currentDraft ? (
        <div className="space-y-4">
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 transition hover:border-[#BFDBFE] hover:bg-[#EFF6FF]">
            <input
              type="checkbox"
              checked={sameAsPermanent}
              onChange={(e) => toggleSameAsPermanent(e.target.checked)}
              className="h-4 w-4 rounded border-[#CBD5E1] text-[#2563EB] focus:ring-[#2563EB]/30"
            />
            <span className="text-[14px] font-medium text-[#334155]">
              Permanent address is also current address
            </span>
          </label>

          <div className="grid gap-4 lg:grid-cols-2">
            <AddressEditForm
              draft={permanentDraft}
              mode="add"
              onChange={(field, value) => updateAddressDraft(0, field, value)}
            />
            <AddressEditForm
              draft={currentDraft}
              mode="add"
              disabled={sameAsPermanent}
              onChange={(field, value) => updateAddressDraft(1, field, value)}
            />
          </div>
        </div>
      ) : addressEditing ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {addressDrafts.map((draft, index) => (
            <AddressEditForm
              key={draft.address_id || index}
              draft={draft}
              onChange={(field, value) => updateAddressDraft(index, field, value)}
            />
          ))}
        </div>
      ) : canAddAddresses ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <AddressEmptyPlaceholderCard type="permanent" onClick={startAddressAdd} />
          <AddressEmptyPlaceholderCard type="current" onClick={startAddressAdd} />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {permanentAddress ? (
            <AddressDetailCard row={permanentAddress as Record<string, unknown>} />
          ) : null}
          {currentAddress ? (
            <AddressDetailCard row={currentAddress as Record<string, unknown>} />
          ) : null}
          {!permanentAddress && !currentAddress
            ? employeeAddresses.map((row, index) => (
                <AddressDetailCard
                  key={String(row.id ?? row.address_id ?? index)}
                  row={row as Record<string, unknown>}
                />
              ))
            : null}
        </div>
      )}
    </SectionCard>
  ) : null;

  const showAssetHandoverActions = hasOpenExit && exitRow != null;

  const assetsAction =
    data && data.assets.length > 0 ? (
      <button
        type="button"
        onClick={openAssetAdd}
        className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#334155] shadow-sm transition hover:-translate-y-0.5 hover:text-[#7C3AED] hover:shadow-md"
      >
        <Plus className="h-4 w-4" />
        Add more assets
      </button>
    ) : null;

  const assetsSection = data ? (
    <SectionCard
      id="section-assets"
      title="Assets"
      subtitle={
        data.assets.length === 0
          ? "Assign equipment and devices to this employee"
          : `${data.assets.length} assigned`
      }
      icon={<Laptop className="h-5 w-5" />}
      accent="violet"
      action={assetsAction}
    >
      {assetSuccess &&
      !assetAddOpen &&
      !assetViewTarget &&
      !assetEditTarget &&
      !assetStatusTarget &&
      !assetHandoverTarget &&
      !assetReturnTarget ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-2 text-[13px] text-[#059669]">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{assetSuccess}</span>
          <button
            type="button"
            onClick={() => setAssetSuccess(null)}
            className="shrink-0 rounded p-0.5 hover:bg-[#D1FAE5]"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {assetError &&
      !assetAddOpen &&
      !assetViewTarget &&
      !assetEditTarget &&
      !assetStatusTarget &&
      !assetHandoverTarget &&
      !assetReturnTarget ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[13px] text-[#DC2626]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{assetError}</span>
        </div>
      ) : null}

      {data.assets.length === 0 ? (
        <AssetEmptyPlaceholderCard onClick={openAssetAdd} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.assets.map((asset, index) => {
            const assetId = Number(asset.id);
            const handoverQuery = Number.isFinite(assetId)
              ? handoverByAssetId.get(assetId) ?? null
              : null;
            return (
              <AssetGridCard
                key={String(asset.id ?? index)}
                asset={asset as Record<string, unknown>}
                handoverQuery={handoverQuery}
                showHandoverActions={showAssetHandoverActions}
                onView={() => void openAssetView(asset as Record<string, unknown>)}
                onEdit={() => openAssetEdit(asset as Record<string, unknown>)}
                onStatus={() => openAssetStatus(asset as Record<string, unknown>)}
                onHandover={() => void openAssetHandover(asset as Record<string, unknown>)}
                onReturnCompleted={() => openAssetReturnCompleted(asset as Record<string, unknown>)}
              />
            );
          })}
        </div>
      )}
    </SectionCard>
  ) : null;

  const documentsAction =
    data && latestDocuments.length > 0 ? (
      <button
        type="button"
        onClick={() => openDocumentUpload(false)}
        className="inline-flex max-w-full items-center gap-1 rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[#334155] shadow-sm transition hover:text-[#2563EB] sm:gap-1.5 sm:rounded-xl sm:px-3.5 sm:py-2 sm:text-[13px] sm:hover:-translate-y-0.5 sm:hover:shadow-md"
      >
        <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        <span className="truncate">Add more</span>
      </button>
    ) : null;

  const documentsSection = data ? (
    <div id="section-documents" className="min-w-0 max-w-full overflow-hidden scroll-mt-24">
      <SectionCard
        title="Documents"
        subtitle={
          latestDocuments.length === 0
            ? "Upload employee KYC and supporting files"
            : `${latestDocuments.length} on file`
        }
        icon={<FileText className="h-5 w-5" />}
        accent="warning"
        action={documentsAction}
      >
        <div className="min-w-0 max-w-full overflow-x-hidden">
          {documentSuccess &&
          !documentUploadOpen &&
          !documentUpdateTarget &&
          !documentDeleteTarget ? (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-2 text-[13px] text-[#059669]">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 break-words">{documentSuccess}</span>
              <button
                type="button"
                onClick={() => setDocumentSuccess(null)}
                className="shrink-0 rounded p-0.5 hover:bg-[#D1FAE5]"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}

          {latestDocuments.length === 0 ? (
            <DocumentEmptyPlaceholderCard onClick={() => openDocumentUpload(true)} />
          ) : (
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
              {latestDocuments.map((doc, index) => (
                <DocumentFileCard
                  key={String(doc.id ?? index)}
                  doc={doc as Record<string, unknown>}
                  onUpdate={() => openDocumentUpdate(doc as Record<string, unknown>)}
                  onDelete={() => openDocumentDelete(doc as Record<string, unknown>)}
                />
              ))}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  ) : null;

  const shiftSection = data ? (
    <SectionCard
      title="Shift assignment"
      subtitle={
        shiftsLoading
          ? "Loading assigned shift…"
          : userShifts.length === 0
            ? "Assign work hours and schedule for this employee"
            : `${userShifts.length} assigned`
      }
      icon={<Clock className="h-5 w-5" />}
      accent="violet"
    >
      {shiftSuccess && !shiftAssignOpen && !shiftUnassignTarget ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-2 text-[13px] text-[#059669]">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{shiftSuccess}</span>
          <button
            type="button"
            onClick={() => setShiftSuccess(null)}
            className="shrink-0 rounded p-0.5 hover:bg-[#D1FAE5]"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {shiftError && !shiftAssignOpen && !shiftUnassignTarget ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[13px] text-[#DC2626]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{shiftError}</span>
        </div>
      ) : null}

      {shiftsLoading ? (
        <div className="skeleton-shimmer h-28 rounded-2xl" />
      ) : userShifts.length === 0 ? (
        <ShiftEmptyPlaceholderCard onClick={() => void openShiftAssign()} />
      ) : (
        <div className="space-y-2.5">
          {userShifts.map((shift) => (
            <ShiftAssignmentCard
              key={shift.id}
              shift={shift}
              onChangeShift={() => void openShiftAssign()}
              onUnassign={() => {
                setShiftError(null);
                setShiftUnassignTarget(shift);
              }}
            />
          ))}
        </div>
      )}
    </SectionCard>
  ) : null;

  const ipAction =
    data && data.ip_assignments.length > 0 ? (
      <button
        type="button"
        onClick={() => void openIpAssign()}
        className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#334155] shadow-sm transition hover:-translate-y-0.5 hover:text-[#2563EB] hover:shadow-md"
      >
        <Plus className="h-4 w-4" />
        Assign more
      </button>
    ) : null;

  const ipSection = data ? (
    <SectionCard
      title="IP assignments"
      subtitle={
        data.ip_assignments.length === 0
          ? "Map approved office IPs for attendance"
          : `${data.ip_assignments.length} mapped`
      }
      icon={<Globe className="h-5 w-5" />}
      accent="primary"
      action={ipAction}
    >
      {ipSuccess && !ipAssignOpen && !ipUnassignTarget ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-2 text-[13px] text-[#059669]">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{ipSuccess}</span>
          <button
            type="button"
            onClick={() => setIpSuccess(null)}
            className="shrink-0 rounded p-0.5 hover:bg-[#D1FAE5]"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {ipError && !ipAssignOpen && !ipUnassignTarget ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[13px] text-[#DC2626]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{ipError}</span>
        </div>
      ) : null}

      {data.ip_assignments.length === 0 ? (
        <IpEmptyPlaceholderCard onClick={() => void openIpAssign()} />
      ) : (
        <ul className="space-y-2.5">
          {data.ip_assignments.map((row, index) => (
            <li key={String(row.id ?? index)}>
              <IpAssignmentCard
                row={row as Record<string, unknown>}
                onUnassign={() => {
                  setIpError(null);
                  setIpUnassignTarget(row as Record<string, unknown>);
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  ) : null;

  const attendanceLogsSection = data ? (
    <SectionCard
      title="Attendance logs"
      subtitle="Recent punch activity"
      icon={<Clock className="h-5 w-5" />}
      accent="warning"
      isEmpty={data.attendance_logs.length === 0}
      emptyText="No attendance logs found."
    >
      <ul className="max-h-[18rem] space-y-2.5 overflow-y-auto pr-1">
        {data.attendance_logs.slice(0, 20).map((row, index) => (
          <ListItemCard key={String(row.id ?? index)}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-[#0F172A]">{formatLabel(row.action_type)}</p>
                <p className="text-[12px] text-[#94A3B8]">{formatDateTime(row.timestamp_time)}</p>
              </div>
              <StatusPill value={row.action_type} />
            </div>
          </ListItemCard>
        ))}
      </ul>
    </SectionCard>
  ) : null;

  const referencesAction =
    bgvReferences.length > 0 ? (
      <button
        type="button"
        onClick={openReferenceAdd}
        className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#334155] shadow-sm transition hover:-translate-y-0.5 hover:text-[#059669] hover:shadow-md"
      >
        <Plus className="h-4 w-4" />
        Add more
      </button>
    ) : null;

  const referencesSection = data ? (
    <SectionCard
      title="References"
      subtitle={
        bgvLoading
          ? "Loading previous company references…"
          : bgvReferences.length === 0
            ? "Add employer references for background verification"
            : `${bgvReferences.length} on record`
      }
      icon={<ShieldCheck className="h-5 w-5" />}
      accent="success"
      action={referencesAction}
    >
      {referenceSuccess &&
      !referenceAddOpen &&
      !referenceViewTarget &&
      !referenceEditTarget &&
      !referenceVerifyTarget ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-2 text-[13px] text-[#059669]">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{referenceSuccess}</span>
          <button
            type="button"
            onClick={() => setReferenceSuccess(null)}
            className="shrink-0 rounded p-0.5 hover:bg-[#D1FAE5]"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {referenceError &&
      !referenceAddOpen &&
      !referenceViewTarget &&
      !referenceEditTarget &&
      !referenceVerifyTarget ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[13px] text-[#DC2626]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{referenceError}</span>
        </div>
      ) : null}

      {bgvLoading ? (
        <div className="skeleton-shimmer h-28 rounded-2xl" />
      ) : bgvReferences.length === 0 ? (
        <ReferenceEmptyPlaceholderCard onClick={openReferenceAdd} />
      ) : (
        <div className="space-y-2.5">
          {bgvReferences.map((refRow) => (
            <ReferenceGridCard
              key={refRow.id}
              referenceRow={refRow}
              canUpdateStatus={viewerCanManageExit}
              onView={() => void openReferenceView(refRow)}
              onEdit={() => openReferenceEdit(refRow)}
              onUpdateStatus={() => openReferenceVerify(refRow)}
            />
          ))}
        </div>
      )}
    </SectionCard>
  ) : null;

  const dashboard = data ? (
    <div className="space-y-5">
      <ProfileHeroCard
        name={employeeName}
        role={formatLabel(info?.role_name)}
        department={orgName}
        isActive={employeeIsActive}
        imageUrl={profileImageUrl}
        onImageZoom={openPhotoZoom}
        empCode={employeeEmpCode}
        joined={formatDate(info?.created_at)}
        workDuration={workedForDuration(info?.created_at)}
        company={orgName}
        email={asText(info?.user_email)}
        phone={asText(info?.user_phone)}
        quickActions={quickActions}
        onQuickAction={scrollToSection}
        fullAttendanceHref={fullAttendanceHref || undefined}
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          accent="success"
          icon={<CalendarCheck className="h-5 w-5" />}
          label="Attendance rate"
          value={attendanceRate == null ? "—" : `${attendanceRate}%`}
          sub={formatMonthYear(attendanceMonth, attendanceYear)}
          delay={0}
        />
        <StatCard
          accent="primary"
          icon={<Briefcase className="h-5 w-5" />}
          label="Leave balance"
          value={leaveRemaining}
          sub="Days remaining"
          delay={70}
        />
        <StatCard
          accent="violet"
          icon={<Laptop className="h-5 w-5" />}
          label="Assets assigned"
          value={data.assets.length}
          sub={data.assets.length === 1 ? "Device" : "Devices"}
          delay={140}
        />
        <StatCard
          accent="warning"
          icon={<FileText className="h-5 w-5" />}
          label="Documents"
          value={latestDocuments.length}
          sub="Uploaded"
          delay={210}
        />
      </div>

      <div id="section-attendance" className="grid scroll-mt-24 grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="space-y-5 xl:col-span-8">
          {calendarCard}
          {attendanceTable}
        </div>
        <div className="xl:col-span-4">{insightsPanel}</div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {personalInfoCard}
        {workSection}
      </div>

      {addressesSection}

      <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
        {assetsSection}
        <div className="min-w-0 max-w-full overflow-hidden">{documentsSection}</div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {shiftSection}
        {ipSection}
        {attendanceLogsSection}
        {referencesSection}
      </div>
    </div>
  ) : null;

  const loadingSkeleton = (
    <div className="space-y-5">
      <div className="skeleton-shimmer h-44 w-full rounded-[24px]" />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton-shimmer h-28 rounded-[20px]" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="skeleton-shimmer h-96 rounded-[20px] xl:col-span-8" />
        <div className="skeleton-shimmer h-96 rounded-[20px] xl:col-span-4" />
      </div>
    </div>
  );

  return (
    <div className="relative min-h-full bg-gradient-to-b from-[#F8FAFC] via-[#F1F5F9] to-[#EEF2F9]">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="absolute -left-32 top-0 h-72 w-72 rounded-full bg-[#2563EB]/5 blur-3xl" />
        <div className="absolute right-0 top-40 h-80 w-80 rounded-full bg-[#8B5CF6]/5 blur-3xl" />
      </div>
      <div className="mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-[#334155] shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:text-[#2563EB] hover:shadow-md"
              aria-label="Back to employees"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#94A3B8]">
                Employee profile
              </p>
              <h1 className="truncate text-[26px] font-bold tracking-tight text-[#0F172A] sm:text-[32px]">
                {employeeName}
              </h1>
              {!loading && !error ? (
                <div className="mt-2 inline-flex flex-col rounded-xl border border-[#E8F4FB] bg-white/90 px-3 py-2 shadow-sm">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                    Employee code
                  </span>
                  <span className="text-[14px] font-semibold text-[#008CD3]">{employeeEmpCode}</span>
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {exitActionButtons}
            <button
              type="button"
              onClick={() => setExportOpen(true)}
              disabled={loading || !exportEmployee}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#E8F4FB] bg-[#F8FCFF] px-4 py-2.5 text-[14px] font-semibold text-[#008CD3] shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-[#E8F4FB] hover:shadow-md disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              Export attendance
            </button>
            <button
              type="button"
              onClick={() => {
                void loadEmployee(true);
                void loadBgvReferences(true);
                void loadUserShifts(true);
                void loadAttendance(true);
              }}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/70 bg-white/80 px-4 py-2.5 text-[14px] font-semibold text-[#334155] shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:text-[#2563EB] hover:shadow-md disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </header>

        {exitActionSuccess ? (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-3 text-[14px] text-[#059669]">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="flex-1">{exitActionSuccess}</span>
            <button
              type="button"
              onClick={() => setExitActionSuccess(null)}
              className="shrink-0 rounded-lg p-1 hover:bg-[#D1FAE5]"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {error && !loading ? (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[14px] text-[#DC2626]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="mt-5">
          {loading ? loadingSkeleton : !error ? dashboard : null}
        </div>
      </div>

      {photoZoom ? (
        <ProfilePhotoZoomModal
          open
          imageUrl={photoZoom.imageUrl}
          alt={photoZoom.alt}
          onClose={() => setPhotoZoom(null)}
        />
      ) : null}

      {completeOpen && exitRow ? (
        <div
          className="fixed inset-0 z-[1100] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="complete-exit-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close"
            disabled={completeBusy}
            onClick={() => !completeBusy && setCompleteOpen(false)}
          />
          <div className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-[#E4E7EC] bg-white shadow-2xl sm:max-h-[92vh] sm:rounded-2xl">
            <div className="flex shrink-0 items-start justify-between border-b border-[#EEF2F6] px-5 py-4">
              <div>
                <h2 id="complete-exit-title" className="text-lg font-bold text-[#1F2937]">
                  Complete exit process
                </h2>
                <p className="mt-1 text-sm text-[#6B7280]">
                  Confirm completion after assets and handover tasks are done.
                </p>
              </div>
              <button
                type="button"
                disabled={completeBusy}
                onClick={() => setCompleteOpen(false)}
                className="rounded-lg p-2 text-[#6B7280] hover:bg-[#F5F7FA]"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 px-5 py-4">
              {completeError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                  {completeError}
                </div>
              ) : null}
              <div>
                <label
                  htmlFor="complete-exit-msg"
                  className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]"
                >
                  Response message
                </label>
                <textarea
                  id="complete-exit-msg"
                  rows={4}
                  value={completeMessage}
                  onChange={(e) => setCompleteMessage(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#E4E7EC] px-3 py-2.5 text-sm text-[#1F2937] outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-[#EEF2F6] bg-[#F8FAFC] px-5 py-3">
              <button
                type="button"
                disabled={completeBusy}
                onClick={() => setCompleteOpen(false)}
                className="inline-flex items-center justify-center rounded-xl border border-[#E4E7EC] bg-white px-4 py-2.5 text-sm font-semibold text-[#1F2937] hover:bg-[#F8FBFF] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={completeBusy}
                onClick={() => void handleCompleteExitSubmit()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {completeBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Completing…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                    Confirm completion
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {documentUploadOpen ? (
        <div
          className="fixed inset-0 z-[99999] flex items-end justify-center p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-documents-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#0F172A]/45 backdrop-blur-sm"
            aria-label="Close dialog"
            onClick={closeDocumentUpload}
          />
          <div className="card-fade-in relative z-10 flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[24px] border border-white/60 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.25)] sm:rounded-[24px]">
            <div className="shrink-0 border-b border-[#EEF2F6] px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F59E0B] to-[#FBBF24] text-white shadow-sm">
                    <Upload className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <h2 id="upload-documents-title" className="text-[18px] font-bold text-[#0F172A]">
                      {documentUploadInitial ? "Upload documents" : "Add more documents"}
                    </h2>
                    <p className="mt-0.5 text-[13px] text-[#64748B]">
                      PNG, JPG, or PDF · max 5 MB per file
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={documentSaving}
                  onClick={closeDocumentUpload}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-[#94A3B8] transition hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {documentError && documentUploadOpen ? (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-[14px] font-medium text-[#DC2626]">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  {documentError}
                </div>
              ) : null}

              {documentUploadFields.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-8 text-center text-[14px] text-[#64748B]">
                  All document types are already on file. Use Update on a document card to replace
                  an existing file.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {documentUploadFields.map(({ field, label, hint, requiredForInitial }) => (
                    <div key={field} className={field === "user_image" ? "sm:col-span-2" : ""}>
                      <label htmlFor={`profile-doc-${field}`} className="mb-1.5 block text-[13px] font-medium text-[#64748B]">
                        {label}
                        {documentUploadInitial && requiredForInitial ? (
                          <span className="ml-0.5 text-[#EF4444]">*</span>
                        ) : null}
                      </label>
                      <input
                        id={`profile-doc-${field}`}
                        name={field}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,application/pdf"
                        className={docFileInputCls()}
                        disabled={documentSaving}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          setDocFiles((prev) => {
                            const next = { ...prev };
                            if (file) next[field] = file;
                            else delete next[field];
                            return next;
                          });
                        }}
                      />
                      <p className="mt-1 text-[12px] text-[#94A3B8]">{hint}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2.5 border-t border-[#EEF2F6] px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={documentSaving}
                onClick={closeDocumentUpload}
                className="inline-flex min-h-[42px] w-full items-center justify-center rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-[14px] font-semibold text-[#334155] transition hover:bg-[#F8FAFC] sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={documentSaving || documentUploadFields.length === 0}
                onClick={() => void submitDocumentUpload()}
                className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#3B82F6] px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm transition hover:shadow-md disabled:opacity-60 sm:w-auto"
              >
                {documentSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" aria-hidden />
                    {documentUploadInitial ? "Upload documents" : "Add documents"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {documentUpdateTarget ? (
        <div
          className="fixed inset-0 z-[99999] flex items-end justify-center p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="update-document-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#0F172A]/45 backdrop-blur-sm"
            aria-label="Close dialog"
            onClick={closeDocumentUpdate}
          />
          <div className="card-fade-in relative z-10 w-full max-w-md rounded-t-[24px] border border-white/60 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.25)] sm:rounded-[24px]">
            <div className="border-b border-[#EEF2F6] px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#3B82F6] text-white shadow-sm">
                    <Pencil className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <h2 id="update-document-title" className="text-[18px] font-bold text-[#0F172A]">
                      Update document
                    </h2>
                    <p className="mt-0.5 text-[13px] text-[#64748B]">
                      {formatLabel(documentUpdateTarget.document_type)} ·{" "}
                      {asText(documentUpdateTarget.document_name, "Document")}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={documentSaving}
                  onClick={closeDocumentUpdate}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-[#94A3B8] transition hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="px-5 py-5">
              {documentError && documentUpdateTarget ? (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-[14px] font-medium text-[#DC2626]">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  {documentError}
                </div>
              ) : null}

              <label htmlFor="update-document-file" className="mb-1.5 block text-[13px] font-medium text-[#64748B]">
                New file <span className="text-[#EF4444]">*</span>
              </label>
              <input
                id="update-document-file"
                type="file"
                accept="image/png,image/jpeg,image/jpg,application/pdf"
                className={docFileInputCls()}
                disabled={documentSaving}
                onChange={(e) => setDocumentUpdateFile(e.target.files?.[0] ?? null)}
              />
              <p className="mt-1 text-[12px] text-[#94A3B8]">
                This will replace the current file. PNG, JPG, or PDF.
              </p>
            </div>

            <div className="flex flex-col-reverse gap-2.5 border-t border-[#EEF2F6] px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={documentSaving}
                onClick={closeDocumentUpdate}
                className="inline-flex min-h-[42px] w-full items-center justify-center rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-[14px] font-semibold text-[#334155] transition hover:bg-[#F8FAFC] sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={documentSaving}
                onClick={() => void submitDocumentUpdate()}
                className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#3B82F6] px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm transition hover:shadow-md disabled:opacity-60 sm:w-auto"
              >
                {documentSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Updating…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" aria-hidden />
                    Save changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {documentDeleteTarget ? (
        <div
          className="fixed inset-0 z-[99999] flex items-end justify-center p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-document-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#0F172A]/45 backdrop-blur-sm"
            aria-label="Close dialog"
            onClick={closeDocumentDelete}
          />
          <div className="card-fade-in relative z-10 w-full max-w-md rounded-t-[24px] border border-white/60 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.25)] sm:rounded-[24px] sm:p-6">
            <div className="mb-4 flex gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#EF4444] to-[#F87171] text-white shadow-sm">
                <AlertTriangle className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h2 id="delete-document-title" className="text-[18px] font-bold text-[#0F172A]">
                  Delete document?
                </h2>
                <p className="mt-1.5 text-[14px] leading-relaxed text-[#64748B]">
                  This will permanently remove{" "}
                  <strong className="font-semibold text-[#0F172A]">
                    {asText(documentDeleteTarget.document_name, "this document")}
                  </strong>{" "}
                  ({formatLabel(documentDeleteTarget.document_type)}). This action cannot be undone.
                </p>
              </div>
            </div>

            {documentError && documentDeleteTarget ? (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-[14px] font-medium text-[#DC2626]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {documentError}
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={documentSaving}
                onClick={closeDocumentDelete}
                className="inline-flex min-h-[42px] w-full items-center justify-center rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-[14px] font-semibold text-[#334155] transition hover:bg-[#F8FAFC] sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={documentSaving}
                onClick={() => void confirmDocumentDelete()}
                className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#EF4444] to-[#DC2626] px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm transition hover:shadow-md active:scale-[0.98] disabled:opacity-60 sm:w-auto"
              >
                {documentSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" aria-hidden />
                    Yes, delete document
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {(assetAddOpen || assetViewLoading || assetViewTarget) && (
        <div
          className="fixed inset-0 z-[99999] flex items-end justify-center p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          {assetAddOpen ? (
            <>
              <button
                type="button"
                className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-[2px]"
                aria-label="Close dialog"
                onClick={closeAssetAdd}
              />
              <div className="card-fade-in relative z-10 flex max-h-[min(88dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-[20px] border border-white/70 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.22)] sm:rounded-[20px]">
                <div className="shrink-0 border-b border-[#F1F5F9] bg-gradient-to-r from-[#FAF5FF] to-white px-4 py-3.5 sm:px-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] text-white shadow-sm">
                        <Laptop className="h-4 w-4" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <h2 className="truncate text-[16px] font-bold text-[#0F172A]">Assign assets</h2>
                        <p className="truncate text-[12px] text-[#64748B]">{employeeName}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={assetSaving}
                      onClick={closeAssetAdd}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#94A3B8] transition hover:bg-white hover:text-[#475569]"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                  {assetError && assetAddOpen ? (
                    <div className="mb-3 flex items-start gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[13px] font-medium text-[#DC2626]">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {assetError}
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    {assetDraftRows.map((row, index) => (
                      <div
                        key={row.key}
                        className="overflow-hidden rounded-xl border border-[#E8ECF4] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
                      >
                        <div className="flex items-center justify-between border-b border-[#F1F5F9] bg-[#FAFBFC] px-3 py-2">
                          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-[#7C3AED]">
                            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#EDE9FE] text-[11px]">
                              {index + 1}
                            </span>
                            Asset
                          </span>
                          {assetDraftRows.length > 1 ? (
                            <button
                              type="button"
                              onClick={() =>
                                setAssetDraftRows((prev) => prev.filter((r) => r.key !== row.key))
                              }
                              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-[#DC2626] transition hover:bg-[#FEF2F2]"
                            >
                              <Trash2 className="h-3 w-3" />
                              Remove
                            </button>
                          ) : null}
                        </div>

                        <div className="space-y-3 p-3">
                          <label className="block">
                            <span className="mb-1 block text-[12px] font-medium text-[#64748B]">
                              Asset name <span className="text-[#EF4444]">*</span>
                            </span>
                            <input
                              value={row.asset_name}
                              onChange={(e) =>
                                setAssetDraftRows((prev) =>
                                  prev.map((r) =>
                                    r.key === row.key ? { ...r, asset_name: e.target.value } : r,
                                  ),
                                )
                              }
                              placeholder="e.g. MacBook Pro 14"
                              className={assetFormFieldCls()}
                            />
                          </label>

                          <div className="grid grid-cols-2 gap-2.5">
                            <label className="block">
                              <span className="mb-1 block text-[12px] font-medium text-[#64748B]">
                                Type <span className="text-[#EF4444]">*</span>
                              </span>
                              <select
                                value={row.asset_type}
                                onChange={(e) =>
                                  setAssetDraftRows((prev) =>
                                    prev.map((r) =>
                                      r.key === row.key ? { ...r, asset_type: e.target.value } : r,
                                    ),
                                  )
                                }
                                className={assetFormFieldCls()}
                              >
                                {EMPLOYEE_ASSET_TYPES.map((type) => (
                                  <option key={type} value={type}>
                                    {formatLabel(type)}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="block">
                              <span className="mb-1 block text-[12px] font-medium text-[#64748B]">
                                Handover
                              </span>
                              <input
                                type="datetime-local"
                                value={row.handover_date_time}
                                onChange={(e) =>
                                  setAssetDraftRows((prev) =>
                                    prev.map((r) =>
                                      r.key === row.key
                                        ? { ...r, handover_date_time: e.target.value }
                                        : r,
                                    ),
                                  )
                                }
                                className={assetFormFieldCls()}
                              />
                            </label>
                          </div>

                          <label className="block">
                            <span className="mb-1 block text-[12px] font-medium text-[#64748B]">
                              Summary
                            </span>
                            <textarea
                              value={row.asset_summary}
                              onChange={(e) =>
                                setAssetDraftRows((prev) =>
                                  prev.map((r) =>
                                    r.key === row.key ? { ...r, asset_summary: e.target.value } : r,
                                  ),
                                )
                              }
                              rows={2}
                              placeholder="Serial number, condition, accessories…"
                              className={`${assetFormFieldCls()} resize-none`}
                            />
                          </label>

                          <div>
                            <span className="mb-1.5 block text-[12px] font-medium text-[#64748B]">
                              Attachment
                            </span>
                            <AssetFilePicker
                              inputId={`asset-file-${row.key}`}
                              file={row.file}
                              onChange={(nextFile) =>
                                setAssetDraftRows((prev) =>
                                  prev.map((r) =>
                                    r.key === row.key ? { ...r, file: nextFile } : r,
                                  ),
                                )
                              }
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() =>
                        setAssetDraftRows((prev) => [...prev, createEmptyAssetDraft()])
                      }
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#CBD5E1] bg-[#FAFBFC] px-3 py-2.5 text-[12px] font-semibold text-[#64748B] transition hover:border-[#8B5CF6]/40 hover:bg-[#FAF5FF] hover:text-[#7C3AED]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add another asset
                    </button>
                  </div>
                </div>

                <div className="flex shrink-0 gap-2 border-t border-[#F1F5F9] bg-[#FAFBFC] px-4 py-3 sm:justify-end sm:px-5">
                  <button
                    type="button"
                    disabled={assetSaving}
                    onClick={closeAssetAdd}
                    className="inline-flex min-h-[40px] flex-1 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white px-4 text-[13px] font-semibold text-[#475569] sm:flex-none sm:min-w-[100px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={assetSaving}
                    onClick={() => void submitAssetAdd()}
                    className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] px-4 text-[13px] font-semibold text-white shadow-sm disabled:opacity-60 sm:flex-none sm:min-w-[140px]"
                  >
                    {assetSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {assetSaving ? "Saving…" : "Assign"}
                  </button>
                </div>
              </div>
            </>
          ) : null}

          {assetViewLoading || assetViewTarget ? (
            <>
              <button
                type="button"
                className="absolute inset-0 bg-[#0F172A]/45 backdrop-blur-sm"
                aria-label="Close dialog"
                onClick={() => {
                  setAssetViewTarget(null);
                  setAssetViewLoading(false);
                }}
              />
              <div className="card-fade-in relative z-10 w-full max-w-lg rounded-t-[24px] border border-white/60 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.25)] sm:rounded-[24px]">
                <div className="border-b border-[#EEF2F6] px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-[18px] font-bold text-[#0F172A]">Asset details</h2>
                      <p className="mt-0.5 text-[13px] text-[#64748B]">Full information from server</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAssetViewTarget(null);
                        setAssetViewLoading(false);
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-[#94A3B8] hover:bg-[#F1F5F9]"
                      aria-label="Close"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="max-h-[70dvh] overflow-y-auto px-5 py-5">
                  {assetViewLoading ? (
                    <div className="flex items-center justify-center gap-2 py-12 text-[#64748B]">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Loading asset…
                    </div>
                  ) : assetViewTarget ? (
                    <div className="space-y-4">
                      {assetViewTarget.asset_image_url ? (
                        <img
                          src={String(assetViewTarget.asset_image_url)}
                          alt={asText(assetViewTarget.asset_name, "Asset")}
                          className="max-h-48 w-full rounded-2xl border border-[#E2E8F0] object-contain"
                        />
                      ) : null}
                      <DetailGrid>
                        <DetailItem label="Name" value={asText(assetViewTarget.asset_name)} />
                        <DetailItem label="Type" value={formatLabel(assetViewTarget.asset_type)} />
                        <DetailItem label="Status" value={formatLabel(assetViewTarget.asset_status)} />
                        <DetailItem
                          label="Returned"
                          value={assetViewTarget.is_returned ? "Yes" : "No"}
                        />
                        <DetailItem
                          label="Summary"
                          value={asText(assetViewTarget.asset_summary, "—")}
                        />
                        <DetailItem
                          label="Handover date"
                          value={formatDateTime(assetViewTarget.handover_date_time)}
                        />
                        <DetailItem
                          label="Created"
                          value={formatDateTime(assetViewTarget.created_at)}
                        />
                        <DetailItem
                          label="Updated"
                          value={formatDateTime(assetViewTarget.updated_at)}
                        />
                      </DetailGrid>
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {assetEditTarget ? (
        <div className="fixed inset-0 z-[99999] flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-[#0F172A]/45 backdrop-blur-sm" aria-label="Close" onClick={() => !assetSaving && setAssetEditTarget(null)} />
          <div className="card-fade-in relative z-10 w-full max-w-lg rounded-t-[24px] border border-white/60 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.25)] sm:rounded-[24px]">
            <div className="border-b border-[#EEF2F6] px-5 py-4">
              <h2 className="text-[18px] font-bold text-[#0F172A]">Edit asset</h2>
              <p className="mt-0.5 text-[13px] text-[#64748B]">{asText(assetEditTarget.asset_name)}</p>
            </div>
            <div className="space-y-3 px-5 py-5">
              {assetError && assetEditTarget ? (
                <div className="flex items-start gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-[14px] text-[#DC2626]">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {assetError}
                </div>
              ) : null}
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-[#64748B]">Asset name</span>
                <input
                  value={assetEditDraft.asset_name}
                  onChange={(e) => setAssetEditDraft((d) => ({ ...d, asset_name: e.target.value }))}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2.5 text-[14px] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-[#64748B]">Type</span>
                <select
                  value={assetEditDraft.asset_type}
                  onChange={(e) => setAssetEditDraft((d) => ({ ...d, asset_type: e.target.value }))}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2.5 text-[14px] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
                >
                  {EMPLOYEE_ASSET_TYPES.map((type) => (
                    <option key={type} value={type}>{formatLabel(type)}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-[#64748B]">Summary</span>
                <textarea
                  value={assetEditDraft.asset_summary}
                  onChange={(e) => setAssetEditDraft((d) => ({ ...d, asset_summary: e.target.value }))}
                  rows={2}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2.5 text-[14px] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
                />
              </label>
              <div>
                <span className="mb-1.5 block text-[13px] font-medium text-[#64748B]">Replace image / PDF</span>
                <AssetFilePicker
                  inputId="asset-edit-file"
                  file={assetEditDraft.file}
                  accent="primary"
                  onChange={(nextFile) => setAssetEditDraft((d) => ({ ...d, file: nextFile }))}
                />
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2.5 border-t border-[#EEF2F6] px-5 py-4 sm:flex-row sm:justify-end">
              <button type="button" disabled={assetSaving} onClick={() => setAssetEditTarget(null)} className="inline-flex min-h-[42px] w-full items-center justify-center rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-[14px] font-semibold sm:w-auto">Cancel</button>
              <button type="button" disabled={assetSaving} onClick={() => void submitAssetEdit()} className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#3B82F6] px-4 py-2.5 text-[14px] font-semibold text-white sm:w-auto">
                {assetSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save changes
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {assetStatusTarget ? (
        <div className="fixed inset-0 z-[99999] flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-[#0F172A]/45 backdrop-blur-sm" aria-label="Close" onClick={() => !assetSaving && setAssetStatusTarget(null)} />
          <div className="card-fade-in relative z-10 w-full max-w-md rounded-t-[24px] border border-white/60 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.25)] sm:rounded-[24px]">
            <div className="mb-4 flex gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#10B981] to-[#34D399] text-white shadow-sm">
                <RefreshCw className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-[18px] font-bold text-[#0F172A]">Update asset status</h2>
                <p className="mt-1.5 text-[14px] text-[#64748B]">
                  <strong className="text-[#0F172A]">{asText(assetStatusTarget.asset_name)}</strong> is currently{" "}
                  <strong className="text-[#0F172A]">{formatLabel(assetStatusTarget.asset_status)}</strong>.
                </p>
              </div>
            </div>
            {assetError && assetStatusTarget ? (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-[14px] text-[#DC2626]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {assetError}
              </div>
            ) : null}
            {String(assetStatusTarget.asset_status ?? "").toLowerCase() === "active" ? (
              <p className="mb-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-3 text-[13px] text-[#64748B]">
                Mark this asset as <strong className="text-[#0F172A]">returned</strong> (inactive). It will be received by you as the logged-in user.
              </p>
            ) : (
              <p className="mb-4 rounded-xl border border-[#FEF2F8] bg-[#F8FAFC] px-3.5 py-3 text-[13px] text-[#64748B]">
                Status changes back to active are not supported from this screen.
              </p>
            )}
            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
              <button type="button" disabled={assetSaving} onClick={() => setAssetStatusTarget(null)} className="inline-flex min-h-[42px] w-full items-center justify-center rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-[14px] font-semibold sm:w-auto">Cancel</button>
              {String(assetStatusTarget.asset_status ?? "").toLowerCase() === "active" ? (
                <button type="button" disabled={assetSaving} onClick={() => void submitAssetStatus()} className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] px-4 py-2.5 text-[14px] font-semibold text-white sm:w-auto">
                  {assetSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Mark as returned
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {assetHandoverTarget ? (
        <div className="fixed inset-0 z-[99999] flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-[#0F172A]/45 backdrop-blur-sm" aria-label="Close" onClick={() => !assetSaving && setAssetHandoverTarget(null)} />
          <div className="card-fade-in relative z-10 w-full max-w-md rounded-t-[24px] border border-white/60 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.25)] sm:rounded-[24px]">
            <div className="border-b border-[#EEF2F6] px-5 py-4">
              <h2 className="text-[18px] font-bold text-[#0F172A]">
                {assetHandoverTarget.returned_to_id || handoverByAssetId.has(Number(assetHandoverTarget.id))
                  ? "Update handover manager"
                  : "Assign handover manager"}
              </h2>
              <p className="mt-0.5 text-[13px] text-[#64748B]">{asText(assetHandoverTarget.asset_name)}</p>
            </div>
            <div className="space-y-3 px-5 py-5">
              {assetError && assetHandoverTarget ? (
                <div className="flex items-start gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-[14px] text-[#DC2626]">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {assetError}
                </div>
              ) : null}
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-[#64748B]">Handover manager</span>
                <select
                  value={assetHandoverManagerId}
                  onChange={(e) => setAssetHandoverManagerId(e.target.value)}
                  disabled={assetManagersLoading}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2.5 text-[14px] outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/15"
                >
                  <option value="">Select manager</option>
                  {assetManagers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-[#64748B]">Remarks</span>
                <textarea
                  value={assetHandoverRemarks}
                  onChange={(e) => setAssetHandoverRemarks(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2.5 text-[14px] outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/15"
                />
              </label>
            </div>
            <div className="flex flex-col-reverse gap-2.5 border-t border-[#EEF2F6] px-5 py-4 sm:flex-row sm:justify-end">
              <button type="button" disabled={assetSaving} onClick={() => setAssetHandoverTarget(null)} className="inline-flex min-h-[42px] w-full items-center justify-center rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-[14px] font-semibold sm:w-auto">Cancel</button>
              <button type="button" disabled={assetSaving || assetManagersLoading} onClick={() => void submitAssetHandover()} className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] px-4 py-2.5 text-[14px] font-semibold text-white sm:w-auto">
                {assetSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRound className="h-4 w-4" />}
                Save handover
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {assetReturnTarget ? (
        <div className="fixed inset-0 z-[99999] flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-[#0F172A]/45 backdrop-blur-sm" aria-label="Close" onClick={() => !assetSaving && setAssetReturnTarget(null)} />
          <div className="card-fade-in relative z-10 w-full max-w-md rounded-t-[24px] border border-white/60 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.25)] sm:rounded-[24px]">
            <div className="mb-4 flex gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#10B981] to-[#34D399] text-white shadow-sm">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-[18px] font-bold text-[#0F172A]">Confirm asset return?</h2>
                <p className="mt-1.5 text-[14px] leading-relaxed text-[#64748B]">
                  Confirm that <strong className="text-[#0F172A]">{asText(assetReturnTarget.asset_name)}</strong> has been fully handed over and returned. Handover must already be completed.
                </p>
              </div>
            </div>
            {assetError && assetReturnTarget ? (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-[14px] text-[#DC2626]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {assetError}
              </div>
            ) : null}
            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
              <button type="button" disabled={assetSaving} onClick={() => setAssetReturnTarget(null)} className="inline-flex min-h-[42px] w-full items-center justify-center rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-[14px] font-semibold sm:w-auto">Cancel</button>
              <button type="button" disabled={assetSaving} onClick={() => void confirmAssetReturnCompleted()} className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] px-4 py-2.5 text-[14px] font-semibold text-white sm:w-auto">
                {assetSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Yes, confirm return
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {(referenceAddOpen || referenceViewLoading || referenceViewTarget) && (
        <div
          className="fixed inset-0 z-[99999] flex items-end justify-center p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          {referenceAddOpen ? (
            <>
              <button
                type="button"
                className="absolute inset-0 bg-[#0F172A]/45 backdrop-blur-sm"
                aria-label="Close dialog"
                onClick={closeReferenceAdd}
              />
              <div className="card-fade-in relative z-10 flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[24px] border border-white/60 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.25)] sm:rounded-[24px]">
                <div className="shrink-0 border-b border-[#EEF2F6] px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#10B981] to-[#059669] text-white shadow-sm">
                        <ShieldCheck className="h-5 w-5" aria-hidden />
                      </span>
                      <div>
                        <h2 className="text-[18px] font-bold text-[#0F172A]">Add reference</h2>
                        <p className="mt-0.5 text-[13px] text-[#64748B]">
                          Previous company reference for {employeeName}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={referenceSaving}
                      onClick={closeReferenceAdd}
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-[#94A3B8] transition hover:bg-[#F1F5F9]"
                      aria-label="Close"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                  {referenceError && referenceAddOpen ? (
                    <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-[14px] font-medium text-[#DC2626]">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      {referenceError}
                    </div>
                  ) : null}
                  <ReferenceFormFields
                    form={referenceAddForm}
                    onChange={(patch) => setReferenceAddForm((prev) => ({ ...prev, ...patch }))}
                  />
                </div>
                <div className="flex flex-col-reverse gap-2.5 border-t border-[#EEF2F6] px-5 py-4 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={referenceSaving}
                    onClick={closeReferenceAdd}
                    className="inline-flex min-h-[42px] w-full items-center justify-center rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-[14px] font-semibold sm:w-auto"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={referenceSaving}
                    onClick={() => void submitReferenceAdd()}
                    className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] px-4 py-2.5 text-[14px] font-semibold text-white sm:w-auto"
                  >
                    {referenceSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {referenceSaving ? "Saving…" : "Save reference"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                className="absolute inset-0 bg-[#0F172A]/45 backdrop-blur-sm"
                aria-label="Close dialog"
                onClick={closeReferenceView}
              />
              <div className="card-fade-in relative z-10 flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[24px] border border-white/60 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.25)] sm:rounded-[24px]">
                <div className="shrink-0 border-b border-[#EEF2F6] px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#10B981] to-[#059669] text-white shadow-sm">
                        <Building2 className="h-5 w-5" aria-hidden />
                      </span>
                      <div>
                        <h2 className="text-[18px] font-bold text-[#0F172A]">
                          {referenceViewTarget?.previous_company_name ?? "Reference details"}
                        </h2>
                        {referenceViewTarget ? (
                          <span
                            className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${bgvStatusBadgeClass(referenceViewTarget.verification_status)}`}
                          >
                            {bgvStatusLabel(referenceViewTarget.verification_status)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={referenceViewLoading}
                      onClick={closeReferenceView}
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-[#94A3B8] transition hover:bg-[#F1F5F9]"
                      aria-label="Close"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                  {referenceViewLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="h-8 w-8 animate-spin text-[#10B981]" />
                    </div>
                  ) : referenceViewTarget ? (
                    <div className="space-y-5">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                            Company email
                          </p>
                          <p className="mt-0.5 text-[14px] font-medium text-[#0F172A]">
                            {asText(referenceViewTarget.company_email)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                            Employee code
                          </p>
                          <p className="mt-0.5 text-[14px] font-medium text-[#0F172A]">
                            {asText(referenceViewTarget.employee_code)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                            Designation
                          </p>
                          <p className="mt-0.5 text-[14px] font-medium text-[#0F172A]">
                            {asText(referenceViewTarget.designation)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                            Employment period
                          </p>
                          <p className="mt-0.5 text-[14px] font-medium text-[#0F172A]">
                            {formatDate(referenceViewTarget.employment_start_date)} –{" "}
                            {formatDate(referenceViewTarget.employment_end_date)}
                          </p>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                        <p className="text-[13px] font-semibold text-[#0F172A]">Reference contact</p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                              Name
                            </p>
                            <p className="mt-0.5 text-[14px] font-medium text-[#0F172A]">
                              {asText(referenceViewTarget.person_name)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                              Role
                            </p>
                            <p className="mt-0.5 text-[14px] font-medium text-[#0F172A]">
                              {bgvPersonRoleLabel(referenceViewTarget.person_role)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                              Phone
                            </p>
                            <p className="mt-0.5 text-[14px] font-medium text-[#0F172A]">
                              {asText(referenceViewTarget.person_contact_number1)}
                              {referenceViewTarget.person_contact_number2
                                ? ` · ${referenceViewTarget.person_contact_number2}`
                                : ""}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                              Email
                            </p>
                            <p className="mt-0.5 text-[14px] font-medium text-[#0F172A]">
                              {asText(referenceViewTarget.person_contact_email)}
                            </p>
                          </div>
                        </div>
                      </div>
                      {referenceViewTarget.verification_by_name ||
                      referenceViewTarget.verified_at ? (
                        <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                          <p className="text-[13px] font-semibold text-[#0F172A]">Verification</p>
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                                Verified by
                              </p>
                              <p className="mt-0.5 text-[14px] font-medium text-[#0F172A]">
                                {asText(referenceViewTarget.verification_by_name)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                                Verified at
                              </p>
                              <p className="mt-0.5 text-[14px] font-medium text-[#0F172A]">
                                {formatDateTime(referenceViewTarget.verified_at)}
                              </p>
                            </div>
                            {referenceViewTarget.verification_notes ? (
                              <div className="sm:col-span-2">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                                  Notes
                                </p>
                                <p className="mt-0.5 text-[14px] text-[#334155]">
                                  {referenceViewTarget.verification_notes}
                                </p>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {referenceEditTarget && referenceEditForm ? (
        <div
          className="fixed inset-0 z-[99999] flex items-end justify-center p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#0F172A]/45 backdrop-blur-sm"
            aria-label="Close dialog"
            onClick={closeReferenceEdit}
          />
          <div className="card-fade-in relative z-10 flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[24px] border border-white/60 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.25)] sm:rounded-[24px]">
            <div className="shrink-0 border-b border-[#EEF2F6] px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#10B981] to-[#059669] text-white shadow-sm">
                    <Pencil className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <h2 className="text-[18px] font-bold text-[#0F172A]">Edit reference</h2>
                    <p className="mt-0.5 text-[13px] text-[#64748B]">
                      {referenceEditTarget.previous_company_name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={referenceSaving}
                  onClick={closeReferenceEdit}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-[#94A3B8] transition hover:bg-[#F1F5F9]"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {referenceError && referenceEditTarget ? (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-[14px] font-medium text-[#DC2626]">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {referenceError}
                </div>
              ) : null}
              <ReferenceFormFields
                form={referenceEditForm}
                onChange={(patch) =>
                  setReferenceEditForm((prev) => (prev ? { ...prev, ...patch } : prev))
                }
              />
            </div>
            <div className="flex flex-col-reverse gap-2.5 border-t border-[#EEF2F6] px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={referenceSaving}
                onClick={closeReferenceEdit}
                className="inline-flex min-h-[42px] w-full items-center justify-center rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-[14px] font-semibold sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={referenceSaving}
                onClick={() => void submitReferenceEdit()}
                className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] px-4 py-2.5 text-[14px] font-semibold text-white sm:w-auto"
              >
                {referenceSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {referenceSaving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {referenceVerifyTarget ? (
        <div
          className="fixed inset-0 z-[99999] flex items-end justify-center p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#0F172A]/45 backdrop-blur-sm"
            aria-label="Close dialog"
            onClick={closeReferenceVerify}
          />
          <div className="card-fade-in relative z-10 w-full max-w-md rounded-t-[24px] border border-white/60 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.25)] sm:rounded-[24px]">
            <div className="mb-4 flex gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#10B981] to-[#059669] text-white shadow-sm">
                <UserCheck className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-[18px] font-bold text-[#0F172A]">Update verification status</h2>
                <p className="mt-1 text-[14px] text-[#64748B]">
                  {referenceVerifyTarget.previous_company_name}
                </p>
              </div>
            </div>
            {referenceError && referenceVerifyTarget ? (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-[14px] text-[#DC2626]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {referenceError}
              </div>
            ) : null}
            <div className="space-y-4">
              <label>
                <span className="mb-1.5 block text-[13px] font-medium text-[#64748B]">Status</span>
                <select
                  value={referenceVerifyStatus}
                  onChange={(e) =>
                    setReferenceVerifyStatus(e.target.value as BackgroundVerificationStatus)
                  }
                  className={referenceFieldCls()}
                >
                  {BGV_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1.5 block text-[13px] font-medium text-[#64748B]">
                  Verification notes
                </span>
                <textarea
                  value={referenceVerifyNotes}
                  onChange={(e) => setReferenceVerifyNotes(e.target.value)}
                  rows={3}
                  className={referenceFieldCls()}
                  placeholder="Optional notes about the verification outcome"
                />
              </label>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={referenceSaving}
                onClick={closeReferenceVerify}
                className="inline-flex min-h-[42px] w-full items-center justify-center rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-[14px] font-semibold sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={referenceSaving}
                onClick={() => void submitReferenceVerify()}
                className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] px-4 py-2.5 text-[14px] font-semibold text-white sm:w-auto"
              >
                {referenceSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserCheck className="h-4 w-4" />
                )}
                {referenceSaving ? "Updating…" : "Update status"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {ipAssignOpen ? (
        <div
          className="fixed inset-0 z-[99999] flex items-end justify-center p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#0F172A]/45 backdrop-blur-sm"
            aria-label="Close dialog"
            onClick={closeIpAssign}
          />
          <div className="card-fade-in relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[24px] border border-white/60 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.25)] sm:rounded-[24px]">
            <div className="shrink-0 border-b border-[#EEF2F6] px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#3B82F6] text-white shadow-sm">
                    <Globe className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <h2 className="text-[18px] font-bold text-[#0F172A]">Assign IP address</h2>
                    <p className="mt-0.5 text-[13px] text-[#64748B]">
                      Select an organization IP for {employeeName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={ipSaving}
                  onClick={closeIpAssign}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-[#94A3B8] transition hover:bg-[#F1F5F9]"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {ipError && ipAssignOpen ? (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-[14px] font-medium text-[#DC2626]">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {ipError}
                </div>
              ) : null}

              {companyIpsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" />
                </div>
              ) : availableCompanyIps.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-10 text-center">
                  <Globe className="mx-auto h-8 w-8 text-[#94A3B8]" aria-hidden />
                  <p className="mt-3 text-[14px] font-semibold text-[#0F172A]">
                    {companyIps.length === 0
                      ? "No organization IP addresses found"
                      : "All organization IPs are already assigned"}
                  </p>
                  <p className="mt-1 text-[13px] text-[#64748B]">
                    {companyIps.length === 0
                      ? "Add IPs under Organization settings first."
                      : "Unassign an existing IP or add a new one in settings."}
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {availableCompanyIps.map((ip) => {
                    const ipIdStr = String(ip.id);
                    const selected = selectedIpId === ipIdStr;
                    return (
                      <li key={ipIdStr}>
                        <button
                          type="button"
                          onClick={() => setSelectedIpId(ipIdStr)}
                          className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                            selected
                              ? "border-[#2563EB] bg-[#EFF6FF] ring-2 ring-[#2563EB]/20"
                              : "border-[#E2E8F0] bg-white hover:border-[#BFDBFE] hover:bg-[#F8FAFC]"
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                              selected
                                ? "border-[#2563EB] bg-[#2563EB] text-white"
                                : "border-[#CBD5E1] bg-white"
                            }`}
                          >
                            {selected ? <Check className="h-3 w-3" /> : null}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-mono text-[14px] font-semibold text-[#0F172A]">
                              {ip.ip_address}
                            </span>
                            <span className="mt-0.5 block text-[12px] text-[#94A3B8]">
                              {ip.label?.trim() ? ip.label.trim() : "No label"}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="flex flex-col-reverse gap-2.5 border-t border-[#EEF2F6] px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={ipSaving}
                onClick={closeIpAssign}
                className="inline-flex min-h-[42px] w-full items-center justify-center rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-[14px] font-semibold sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={ipSaving || companyIpsLoading || availableCompanyIps.length === 0}
                onClick={() => void submitIpAssign()}
                className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#3B82F6] px-4 py-2.5 text-[14px] font-semibold text-white sm:w-auto disabled:opacity-60"
              >
                {ipSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Globe className="h-4 w-4" />
                )}
                {ipSaving ? "Assigning…" : "Assign IP"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {shiftAssignOpen ? (
        <div
          className="fixed inset-0 z-[99999] flex items-end justify-center p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#0F172A]/45 backdrop-blur-sm"
            aria-label="Close dialog"
            onClick={closeShiftAssign}
          />
          <div className="card-fade-in relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[24px] border border-white/60 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.25)] sm:rounded-[24px]">
            <div className="shrink-0 border-b border-[#EEF2F6] px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] text-white shadow-sm">
                    <Clock className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <h2 className="text-[18px] font-bold text-[#0F172A]">
                      {userShifts.length > 0 ? "Change shift" : "Assign to shift"}
                    </h2>
                    <p className="mt-0.5 text-[13px] text-[#64748B]">
                      Select a shift for {employeeName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={shiftSaving}
                  onClick={closeShiftAssign}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-[#94A3B8] transition hover:bg-[#F1F5F9]"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {shiftError && shiftAssignOpen ? (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-[14px] font-medium text-[#DC2626]">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {shiftError}
                </div>
              ) : null}

              {companyShiftsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-[#8B5CF6]" />
                </div>
              ) : companyShifts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-10 text-center">
                  <Clock className="mx-auto h-8 w-8 text-[#94A3B8]" aria-hidden />
                  <p className="mt-3 text-[14px] font-semibold text-[#0F172A]">
                    No organization shifts found
                  </p>
                  <p className="mt-1 text-[13px] text-[#64748B]">
                    Create shifts under Organization settings first.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {companyShifts.map((shift) => {
                    const shiftIdStr = String(shift.id);
                    const selected = selectedShiftId === shiftIdStr;
                    return (
                      <li key={shiftIdStr}>
                        <button
                          type="button"
                          onClick={() => setSelectedShiftId(shiftIdStr)}
                          className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                            selected
                              ? "border-[#8B5CF6] bg-[#F5F3FF] ring-2 ring-[#8B5CF6]/20"
                              : "border-[#E2E8F0] bg-white hover:border-[#DDD6FE] hover:bg-[#FAF5FF]"
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                              selected
                                ? "border-[#8B5CF6] bg-[#8B5CF6] text-white"
                                : "border-[#CBD5E1] bg-white"
                            }`}
                          >
                            {selected ? <Check className="h-3 w-3" /> : null}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[14px] font-semibold text-[#0F172A]">
                              {asText(shift.shift_name, "Unnamed shift")}
                            </span>
                            <span className="mt-0.5 block text-[12px] text-[#94A3B8]">
                              {shift.start_time || shift.end_time
                                ? `${asText(shift.start_time)} – ${asText(shift.end_time)}`
                                : "—"}
                              {" · "}
                              {formatWorkingDays(shift.working_days)}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="flex flex-col-reverse gap-2.5 border-t border-[#EEF2F6] px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={shiftSaving}
                onClick={closeShiftAssign}
                className="inline-flex min-h-[42px] w-full items-center justify-center rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-[14px] font-semibold sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={shiftSaving || companyShiftsLoading || companyShifts.length === 0}
                onClick={() => void submitShiftAssign()}
                className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] px-4 py-2.5 text-[14px] font-semibold text-white sm:w-auto disabled:opacity-60"
              >
                {shiftSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Clock className="h-4 w-4" />
                )}
                {shiftSaving
                  ? "Saving…"
                  : userShifts.length > 0
                    ? "Update shift"
                    : "Assign shift"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {shiftUnassignTarget ? (
        <div
          className="fixed inset-0 z-[99999] flex items-end justify-center p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#0F172A]/45 backdrop-blur-sm"
            aria-label="Close dialog"
            onClick={() => !shiftSaving && setShiftUnassignTarget(null)}
          />
          <div className="card-fade-in relative z-10 w-full max-w-md rounded-t-[24px] border border-white/60 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.25)] sm:rounded-[24px]">
            <div className="mb-4 flex gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#EF4444] to-[#DC2626] text-white shadow-sm">
                <Clock className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-[18px] font-bold text-[#0F172A]">Unassign shift?</h2>
                <p className="mt-1.5 text-[14px] leading-relaxed text-[#64748B]">
                  Remove{" "}
                  <strong className="font-semibold text-[#0F172A]">
                    {asText(shiftUnassignTarget.shift_name, "this shift")}
                  </strong>{" "}
                  from {employeeName}. Attendance rules for this shift will no longer apply.
                </p>
              </div>
            </div>
            {shiftError && shiftUnassignTarget ? (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-[14px] text-[#DC2626]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {shiftError}
              </div>
            ) : null}
            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={shiftSaving}
                onClick={() => setShiftUnassignTarget(null)}
                className="inline-flex min-h-[42px] w-full items-center justify-center rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-[14px] font-semibold sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={shiftSaving}
                onClick={() => void confirmShiftUnassign()}
                className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#EF4444] to-[#DC2626] px-4 py-2.5 text-[14px] font-semibold text-white sm:w-auto"
              >
                {shiftSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                {shiftSaving ? "Removing…" : "Yes, unassign"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {ipUnassignTarget ? (
        <div
          className="fixed inset-0 z-[99999] flex items-end justify-center p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#0F172A]/45 backdrop-blur-sm"
            aria-label="Close dialog"
            onClick={() => !ipSaving && setIpUnassignTarget(null)}
          />
          <div className="card-fade-in relative z-10 w-full max-w-md rounded-t-[24px] border border-white/60 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.25)] sm:rounded-[24px]">
            <div className="mb-4 flex gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#EF4444] to-[#DC2626] text-white shadow-sm">
                <Globe className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-[18px] font-bold text-[#0F172A]">Unassign IP address?</h2>
                <p className="mt-1.5 text-[14px] leading-relaxed text-[#64748B]">
                  Remove{" "}
                  <strong className="font-mono font-semibold text-[#0F172A]">
                    {asText(ipUnassignTarget.ip_address ?? ipUnassignTarget.org_ip_address)}
                  </strong>{" "}
                  from {employeeName}. They will no longer be able to punch in from this IP.
                </p>
              </div>
            </div>
            {ipError && ipUnassignTarget ? (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-[14px] text-[#DC2626]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {ipError}
              </div>
            ) : null}
            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={ipSaving}
                onClick={() => setIpUnassignTarget(null)}
                className="inline-flex min-h-[42px] w-full items-center justify-center rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-[14px] font-semibold sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={ipSaving}
                onClick={() => void confirmIpUnassign()}
                className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#EF4444] to-[#DC2626] px-4 py-2.5 text-[14px] font-semibold text-white sm:w-auto"
              >
                {ipSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                {ipSaving ? "Removing…" : "Yes, unassign"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {bankFormOpen ? (
        <div
          className="fixed inset-0 z-[99999] flex items-end justify-center p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#0F172A]/45 backdrop-blur-sm"
            aria-label="Close dialog"
            onClick={closeBankForm}
          />
          <div className="card-fade-in relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[24px] border border-white/60 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.25)] sm:rounded-[24px]">
            <div className="shrink-0 border-b border-[#EEF2F6] px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#10B981] to-[#059669] text-white shadow-sm">
                    <Wallet className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <h2 className="text-[18px] font-bold text-[#0F172A]">
                      {bankFormMode === "add" ? "Add bank information" : "Update bank information"}
                    </h2>
                    <p className="mt-0.5 text-[13px] text-[#64748B]">
                      Payroll account details for {employeeName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={bankSaving}
                  onClick={closeBankForm}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-[#94A3B8] transition hover:bg-[#F1F5F9]"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {bankError && bankFormOpen ? (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-[14px] font-medium text-[#DC2626]">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {bankError}
                </div>
              ) : null}
              <BankInfoFormFields
                form={bankForm}
                onChange={(patch) => setBankForm((prev) => ({ ...prev, ...patch }))}
              />
            </div>
            <div className="flex flex-col-reverse gap-2.5 border-t border-[#EEF2F6] px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={bankSaving}
                onClick={closeBankForm}
                className="inline-flex min-h-[42px] w-full items-center justify-center rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-[14px] font-semibold sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bankSaving}
                onClick={() => void submitBankForm()}
                className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] px-4 py-2.5 text-[14px] font-semibold text-white sm:w-auto"
              >
                {bankSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {bankSaving
                  ? "Saving…"
                  : bankFormMode === "add"
                    ? "Save bank information"
                    : "Update bank information"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ExportAttendanceHistoryModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        orgId={orgId}
        employee={exportEmployee}
        clientSideCalculation
      />
    </div>
  );
}
