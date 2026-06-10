"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Clock,
  FileText,
  Globe,
  Laptop,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  Shield,
  User,
  Users,
  UserX,
  Wallet,
  X,
} from "lucide-react";

import { getSingleEmployee, type SingleEmployeeData } from "@/services/adminUser";
import {
  buildEmployeeExitDetailHref,
  employeeExitCompleted,
  fetchEmployeeExitProcesses,
  isInProgressExitStatus,
  isOpenExitStatus,
  isPendingExitStatus,
  pickRelevantEmployeeExitRow,
  type EmployeeExitProcessRow,
} from "@/services/employeeExit";
import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import TerminateEmployeeModal from "@/components/portal-dashboard/employees/TerminateEmployeeModal";

type GetEmployeeClientProps = {
  userId: string;
};

type MobileTab = "overview" | "work" | "leaves" | "more";

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

const mobileLabelCls =
  "text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]";
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

function formatMonthYear(month: unknown, year: unknown): string {
  const monthNum = asNumber(month, 0);
  const yearNum = asNumber(year, 0);
  if (monthNum <= 0 || yearNum <= 0) return "—";
  const d = new Date(yearNum, monthNum - 1, 1);
  if (Number.isNaN(d.getTime())) return `${monthNum}/${yearNum}`;
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
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

function AddressTypeBadge({ type }: { type: unknown }) {
  const label = formatLabel(type);
  const lower = label.toLowerCase();
  const cls =
    lower === "permanent"
      ? "bg-[#E8F4FB] text-[#0070AA] ring-[#B8DDF0]"
      : "bg-[#E6F4EA] text-[#0F9D58] ring-[#B7E1C1]";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${cls}`}
    >
      {label}
    </span>
  );
}

function AddressDetailCard({ row }: { row: Record<string, unknown> }) {
  const summary = buildAddressSummary(row);
  const isVillage = row.is_from_village === 1 || row.is_from_village === true;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-[#E4E7EC] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-2 border-b border-[#EEF2F6] bg-[#FAFBFC] px-3 py-2.5 sm:px-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
            <MapPin className="h-4 w-4" aria-hidden />
          </span>
          <AddressTypeBadge type={row.address_type} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-3 sm:p-4">
        <p className="text-[13px] font-medium leading-relaxed text-[#1F2937] sm:text-[14px]">
          {summary}
        </p>
        <dl className="mt-auto grid gap-2 sm:grid-cols-2">
          <div>
            <dt className={mobileLabelCls}>Country</dt>
            <dd className="mt-0.5 text-[13px] font-semibold text-[#374151]">{asText(row.country)}</dd>
          </div>
          <div>
            <dt className={mobileLabelCls}>State</dt>
            <dd className="mt-0.5 text-[13px] font-semibold text-[#374151]">{asText(row.state)}</dd>
          </div>
          <div>
            <dt className={mobileLabelCls}>District</dt>
            <dd className="mt-0.5 text-[13px] font-semibold text-[#374151]">{asText(row.district)}</dd>
          </div>
          <div>
            <dt className={mobileLabelCls}>City</dt>
            <dd className="mt-0.5 text-[13px] font-semibold text-[#374151]">{asText(row.city)}</dd>
          </div>
          {isVillage ? (
            <div className="sm:col-span-2">
              <dt className={mobileLabelCls}>Village</dt>
              <dd className="mt-0.5 text-[13px] font-semibold text-[#374151]">
                {asText(row.village_name)}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className={mobileLabelCls}>Street</dt>
            <dd className="mt-0.5 text-[13px] font-semibold text-[#374151]">{asText(row.street)}</dd>
          </div>
          <div>
            <dt className={mobileLabelCls}>House no.</dt>
            <dd className="mt-0.5 text-[13px] font-semibold text-[#374151]">
              {asText(row.house_number)}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className={mobileLabelCls}>PIN / ZIP</dt>
            <dd className="mt-0.5 text-[13px] font-semibold text-[#374151]">{asText(row.zip_code)}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}

function ZohoDetailGrid({ children }: { children: ReactNode }) {
  return (
    <dl className="divide-y divide-[#EEF2F6] rounded-xl border border-[#E4E7EC] bg-white">
      {children}
    </dl>
  );
}

function ZohoDetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-1 px-3 py-3 sm:grid-cols-[140px_1fr] sm:items-start sm:gap-4 sm:px-4 sm:py-3.5">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF] sm:pt-0.5">
        {label}
      </dt>
      <dd className="text-[13px] font-medium text-[#1F2937] sm:text-[14px]">{value}</dd>
    </div>
  );
}

function maskAccountNumber(value: unknown): string {
  if (value == null || value === "") return "—";
  const raw = String(value);
  if (raw.length <= 4) return raw;
  return `•••• ${raw.slice(-4)}`;
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-[#EEF2F6] py-2 last:border-b-0 max-lg:gap-0 max-lg:py-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:py-3.5">
      <dt className={`${mobileLabelCls} sm:text-[13px] sm:font-medium sm:normal-case sm:tracking-normal sm:text-[#6B7280]`}>
        {label}
      </dt>
      <dd className="text-[13px] font-semibold text-[#1F2937] max-lg:text-left sm:max-w-[62%] sm:text-right sm:text-[14px]">
        {value}
      </dd>
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
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  emptyText?: string;
  isEmpty?: boolean;
  subtitle?: string;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#E4E7EC] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
      <div className="flex items-start gap-3 border-b border-[#EEF2F6] px-4 py-3.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F0F7FC] text-[#008CD3]">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-[#1F2937]">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-[12px] text-[#6B7280]">{subtitle}</p> : null}
        </div>
      </div>
      <div className="p-4">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#E4E7EC] bg-[#FAFBFC] py-10 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F7FA] text-[#9CA3AF]">
              {icon}
            </span>
            <p className="text-[13px] text-[#6B7280]">{emptyText || "No records found."}</p>
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function StatusPill({ value }: { value: unknown }) {
  const text = formatLabel(value);
  const lower = text.toLowerCase();
  let cls = "bg-[#F5F7FA] text-[#6B7280] ring-[#E4E7EC]";
  if (lower.includes("approved") || lower.includes("present") || lower.includes("active")) {
    cls = "bg-[#E6F4EA] text-[#0F9D58] ring-[#B7E1C1]";
  }
  if (lower.includes("pending")) cls = "bg-[#FEF3E6] text-[#E8710A] ring-[#F9D4A5]";
  if (lower.includes("reject") || lower.includes("damaged") || lower.includes("lost")) {
    cls = "bg-[#FCE8E6] text-[#D93025] ring-[#F5C6C2]";
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ring-1 ring-inset ${cls}`}>
      {text}
    </span>
  );
}

function QuickStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-[#E4E7EC] bg-white px-2 py-2 text-center shadow-sm sm:rounded-xl sm:px-3 sm:py-2.5">
      <p className="text-base font-bold tabular-nums text-[#008CD3] sm:text-lg">{value}</p>
      <p className={`mt-0.5 ${mobileLabelCls}`}>{label}</p>
    </div>
  );
}

function CircularLeaveRing({
  label,
  remaining,
  total,
}: {
  label: string;
  remaining: number;
  total: number;
}) {
  const size = 96;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const usedPct = total > 0 ? Math.min(100, Math.round((remaining / total) * 100)) : 0;
  const offset = circumference - (usedPct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#EEF2F6"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#008CD3"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-[#1F2937]">{remaining}</span>
          <span className="text-[10px] font-medium text-[#6B7280]">left</span>
        </div>
      </div>
      <p className="max-w-[100px] text-[12px] font-semibold leading-tight text-[#1F2937]">
        {label}
      </p>
      <p className="text-[11px] text-[#6B7280]">
        {usedPct}% of {total}
      </p>
    </div>
  );
}

function DesktopProfileCard({
  name,
  role,
  email,
  phone,
  joined,
  imageUrl,
  stats,
  onImageZoom,
}: {
  name: string;
  role: string;
  email: string;
  phone: string;
  joined: string;
  imageUrl: string | null;
  stats: { documents: number; assets: number; leaves: number; addresses: number };
  onImageZoom: (url: string, alt: string) => void;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[#E4E7EC] bg-white shadow-[0_4px_24px_rgba(15,23,42,0.06)]">
      <div className="bg-gradient-to-br from-[#008CD3] via-[#007EBF] to-[#0070AA] px-5 pb-5 pt-5 text-white">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75">
          Employee profile
        </p>
        <div className="mt-4 flex items-center gap-4">
          <ProfileAvatarButton
            name={name}
            imageUrl={imageUrl}
            size="lg"
            onZoom={onImageZoom}
            className="!h-16 !w-16 !rounded-2xl"
          />
          <div className="min-w-0">
            <p className="text-sm text-white/85">Hello,</p>
            <h2 className="truncate text-xl font-bold tracking-tight">{name}</h2>
            <p className="mt-1 text-sm text-white/80">{role}</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 border-b border-[#EEF2F6] px-4 py-4">
        <QuickStat label="Docs" value={stats.documents} />
        <QuickStat label="Assets" value={stats.assets} />
        <QuickStat label="Leaves" value={stats.leaves} />
        <QuickStat label="Address" value={stats.addresses} />
      </div>
      <dl className="space-y-0 px-4 py-2">
        <InfoRow label="Email" value={email} />
        <InfoRow label="Phone" value={phone} />
        <InfoRow label="Joined" value={joined} />
        <InfoRow label="Role" value={role} />
      </dl>
    </article>
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
      className="rounded-lg border border-[#E4E7EC] bg-gradient-to-br from-white to-[#F8FBFF] p-3 shadow-sm sm:rounded-xl sm:p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-semibold text-[#1F2937] sm:text-[13px]">
          {formatMonthYear(row.month, row.year)}
        </p>
        <span className="rounded-full bg-[#E8F4FB] px-2 py-0.5 text-[11px] font-semibold text-[#008CD3]">
          {remaining} left
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#EEF2F6]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#008CD3] to-[#36A2E0]"
          style={{ width: `${usedPct}%` }}
        />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-[#F5F7FA] px-2 py-2">
          <p className="text-base font-bold text-[#1F2937]">{total}</p>
          <p className="text-[11px] font-medium text-[#6B7280]">Total</p>
        </div>
        <div className="rounded-lg bg-[#FEF3E6] px-2 py-2">
          <p className="text-base font-bold text-[#E8710A]">{used}</p>
          <p className="text-[11px] font-medium text-[#6B7280]">Used</p>
        </div>
        <div className="rounded-lg bg-[#E6F4EA] px-2 py-2">
          <p className="text-base font-bold text-[#0F9D58]">{remaining}</p>
          <p className="text-[11px] font-medium text-[#6B7280]">Remaining</p>
        </div>
      </div>
    </div>
  );
}

function ListItemCard({ children }: { children: ReactNode }) {
  return (
    <li className="rounded-md border border-[#EEF2F6] bg-[#FAFBFC] px-2.5 py-2.5 transition max-lg:hover:border-[#E4E7EC] sm:rounded-xl sm:px-3 sm:py-3 sm:hover:border-[#D6EAF8] sm:hover:bg-white">
      {children}
    </li>
  );
}

export default function GetEmployeeClient({ userId }: GetEmployeeClientProps) {
  const params = useParams();
  const router = useRouter();
  const orgId = String(params?.org_id ?? "");
  const ctx = useManagementDashboardContext();
  const viewerRole = (ctx?.user?.user_role_name ?? "").trim().toLowerCase();
  const viewerCanTerminate = viewerRole === "admin" || viewerRole === "hr";
  const viewerCanManageExit = viewerCanTerminate;

  const [data, setData] = useState<SingleEmployeeData | null>(null);
  const [exitRow, setExitRow] = useState<EmployeeExitProcessRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [terminateSuccess, setTerminateSuccess] = useState<string | null>(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completeMessage, setCompleteMessage] = useState(
    "Exit approved. Asset handovers are complete.",
  );
  const [completeBusy, setCompleteBusy] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [exitActionSuccess, setExitActionSuccess] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("overview");
  const [photoZoom, setPhotoZoom] = useState<{
    imageUrl: string;
    alt: string;
  } | null>(null);

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

      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

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
        setData(result);
        setExitRow(pickRelevantEmployeeExitRow(exitRes.data ?? []));
      } catch (e) {
        setData(null);
        setExitRow(null);
        setError(e instanceof Error ? e.message : "Could not load employee details.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orgId, userId],
  );

  useEffect(() => {
    void loadEmployee(false);
  }, [loadEmployee]);

  const info = data?.user_info;
  const employeeName = asText(info?.user_name, "Employee");

  const hasOpenExit = exitRow != null && isOpenExitStatus(exitRow.application_status);
  const exitPending = exitRow != null && isPendingExitStatus(exitRow.application_status);
  const exitInProgress = exitRow != null && isInProgressExitStatus(exitRow.application_status);
  const showTerminate = viewerCanTerminate && !loading && data && !hasOpenExit;

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

  const stats = useMemo(
    () => ({
      documents: latestDocuments.length,
      assets: data?.assets.length ?? 0,
      leaves: data?.leave_queries.length ?? 0,
      addresses: data?.addresses?.length ?? 0,
    }),
    [data, latestDocuments.length],
  );

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

  const mobileTabs = useMemo(
    () => [
      { id: "overview" as const, label: "Overview" },
      { id: "work" as const, label: "Work" },
      { id: "leaves" as const, label: "Leaves" },
      { id: "more" as const, label: "More" },
    ],
    [],
  );

  const overviewSection = data ? (
    <div className="space-y-4">
      <SectionCard
        title="Personal information"
        subtitle="Basic contact and role details"
        icon={<User className="h-4 w-4" />}
      >
        <ZohoDetailGrid>
          <ZohoDetailRow label="Full name" value={asText(info?.user_name)} />
          <ZohoDetailRow
            label="Email"
            value={
              info?.user_email ? (
                <a href={`mailto:${info.user_email}`} className="text-[#008CD3] hover:underline">
                  {asText(info.user_email)}
                </a>
              ) : (
                "—"
              )
            }
          />
          <ZohoDetailRow
            label="Phone"
            value={
              info?.user_phone ? (
                <a href={`tel:${info.user_phone}`} className="text-[#008CD3] hover:underline">
                  {asText(info.user_phone)}
                </a>
              ) : (
                "—"
              )
            }
          />
          <ZohoDetailRow label="Joined on" value={formatDate(info?.created_at)} />
          <ZohoDetailRow label="Role" value={formatLabel(info?.role_name)} />
        </ZohoDetailGrid>
      </SectionCard>

      <SectionCard
        title="Addresses"
        subtitle="Permanent and current residence on file"
        icon={<MapPin className="h-4 w-4" />}
        isEmpty={employeeAddresses.length === 0}
        emptyText="No addresses saved for this employee."
      >
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
      </SectionCard>

      <SectionCard
        title="Emergency contact"
        subtitle="Person to reach in case of emergency"
        icon={<Phone className="h-4 w-4" />}
        isEmpty={!info?.emergency_contact_name && !info?.emergency_number}
        emptyText="No emergency contact on file."
      >
        <ZohoDetailGrid>
          <ZohoDetailRow label="Contact name" value={asText(info?.emergency_contact_name)} />
          <ZohoDetailRow label="Contact number" value={asText(info?.emergency_number)} />
          <ZohoDetailRow label="Relation" value={formatLabel(info?.relation_blood_line)} />
        </ZohoDetailGrid>
      </SectionCard>
    </div>
  ) : null;

  const workSection = data ? (
    <div className="space-y-4">
      <SectionCard
        title="Shift details"
        subtitle="Assigned work schedule"
        icon={<Clock className="h-4 w-4" />}
        isEmpty={!info?.shift_name}
        emptyText="No shift assigned."
      >
        <ZohoDetailGrid>
          <ZohoDetailRow label="Shift" value={asText(info?.shift_name)} />
          <ZohoDetailRow
            label="Timing"
            value={
              info?.start_time || info?.end_time
                ? `${asText(info?.start_time)} – ${asText(info?.end_time)}`
                : "—"
            }
          />
          <ZohoDetailRow label="Working days" value={asText(info?.working_days)} />
          <ZohoDetailRow
            label="Night shift"
            value={info?.is_night_shift ? "Yes" : info?.is_night_shift === 0 ? "No" : "—"}
          />
        </ZohoDetailGrid>
      </SectionCard>

      <SectionCard
        title="Bank information"
        subtitle="Salary account details"
        icon={<Wallet className="h-4 w-4" />}
        isEmpty={!info?.bank_name && !info?.account_number}
        emptyText="No bank details on file."
      >
        <ZohoDetailGrid>
          <ZohoDetailRow label="Account holder" value={asText(info?.account_holder_name)} />
          <ZohoDetailRow label="Bank" value={asText(info?.bank_name)} />
          <ZohoDetailRow label="Branch" value={asText(info?.bank_branch)} />
          <ZohoDetailRow label="Account number" value={maskAccountNumber(info?.account_number)} />
          <ZohoDetailRow label="IFSC" value={asText(info?.ifsc_code)} />
          <ZohoDetailRow label="UAN" value={asText(info?.uan_number)} />
        </ZohoDetailGrid>
      </SectionCard>

      <SectionCard
        title="Assigned Assets"
        icon={<Laptop className="h-4 w-4" />}
        isEmpty={data.assets.length === 0}
        emptyText="No assets assigned."
      >
        <ul className="space-y-2">
          {data.assets.map((asset, index) => (
            <ListItemCard key={String(asset.id ?? index)}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[13px] font-semibold text-[#1F2937] sm:text-[15px]">
                    {asText(asset.asset_name, "Asset")}
                  </p>
                  <p className="mt-1 text-[13px] text-[#6B7280]">
                    {formatLabel(asset.asset_type)}
                  </p>
                  {asset.asset_summary ? (
                    <p className="mt-1 text-[13px] text-[#6B7280]">{asText(asset.asset_summary)}</p>
                  ) : null}
                </div>
                <StatusPill value={asset.asset_status} />
              </div>
            </ListItemCard>
          ))}
        </ul>
      </SectionCard>

      <SectionCard
        title="IP Assignments"
        icon={<Globe className="h-4 w-4" />}
        isEmpty={data.ip_assignments.length === 0}
        emptyText="No IP addresses assigned."
      >
        <ul className="space-y-2">
          {data.ip_assignments.map((row, index) => (
            <ListItemCard key={String(row.id ?? index)}>
              <p className="font-mono text-[14px] font-semibold text-[#1F2937]">
                {asText(row.ip_address ?? row.org_ip_address)}
              </p>
              <p className="mt-1 text-[13px] text-[#6B7280]">
                {asText(row.ip_label ?? row.org_ip_label, "No label")}
              </p>
            </ListItemCard>
          ))}
        </ul>
      </SectionCard>
    </div>
  ) : null;

  const leavesSection = data ? (
    <div className="space-y-2 lg:space-y-4">
      <SectionCard
        title="Leave Balance"
        icon={<Briefcase className="h-4 w-4" />}
        isEmpty={data.leave_balance.length === 0}
        emptyText="No leave balance records."
      >
        <div className="hidden flex-wrap items-start justify-center gap-6 pb-2 lg:flex">
          {data.leave_balance.map((row, index) => {
            const total = asNumber(row.total_leaves);
            const remaining = asNumber(row.remaining_leaves);
            const label =
              asText(row.leave_type_name, "") !== "—"
                ? asText(row.leave_type_name)
                : formatMonthYear(row.month, row.year);
            return (
              <CircularLeaveRing
                key={String(row.id ?? index)}
                label={label}
                remaining={remaining}
                total={total}
              />
            );
          })}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
          {data.leave_balance.map((row, index) => (
            <LeaveBalanceCard key={String(row.id ?? index)} row={row} index={index} />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Leave Requests"
        icon={<FileText className="h-4 w-4" />}
        isEmpty={data.leave_queries.length === 0}
        emptyText="No leave requests found."
      >
        <ul className="space-y-2">
          {data.leave_queries.map((row, index) => (
            <ListItemCard key={String(row.id ?? index)}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[13px] font-semibold text-[#1F2937] sm:text-[15px]">
                    {formatLabel(row.leave_type)} leave
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-[13px] text-[#6B7280]">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatDate(row.start_date)}
                    {row.end_date ? ` – ${formatDate(row.end_date)}` : ""}
                  </p>
                </div>
                <StatusPill value={row.status} />
              </div>
              {row.reason ? (
                <p className="mt-2 rounded-lg bg-white px-3 py-2 text-[13px] text-[#6B7280]">
                  {asText(row.reason)}
                </p>
              ) : null}
            </ListItemCard>
          ))}
        </ul>
      </SectionCard>
    </div>
  ) : null;

  const documentsSection = data ? (
    <SectionCard
      title="Documents"
      subtitle={
        latestDocuments.length !== data.documents.length
          ? `Showing latest ${latestDocuments.length} of ${data.documents.length} uploads`
          : `${latestDocuments.length} document${latestDocuments.length === 1 ? "" : "s"} on file`
      }
      icon={<FileText className="h-4 w-4" />}
      isEmpty={latestDocuments.length === 0}
      emptyText="No documents uploaded."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {latestDocuments.map((doc, index) => (
          <article
            key={String(doc.id ?? index)}
            className="flex flex-col justify-between gap-3 rounded-xl border border-[#E4E7EC] bg-[#FAFBFC] p-3 transition hover:border-[#C5E4F3] hover:bg-white"
          >
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#008CD3]">
                {formatLabel(doc.document_type)}
              </p>
              <p className="mt-1 truncate text-[14px] font-semibold text-[#1F2937]">
                {asText(doc.document_name, "Document")}
              </p>
              <p className="mt-1 text-[12px] text-[#6B7280]">{formatDate(doc.created_at)}</p>
            </div>
            {doc.doc_url ? (
              <Link
                href={asText(doc.doc_url)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center rounded-lg border border-[#008CD3]/30 bg-[#E8F4FB] px-3 py-2 text-[12px] font-semibold text-[#0070AA] transition hover:bg-[#008CD3] hover:text-white"
              >
                View document
              </Link>
            ) : null}
          </article>
        ))}
      </div>
    </SectionCard>
  ) : null;

  const moreSectionRest = data ? (
    <div className="space-y-2 lg:space-y-4">
      <SectionCard
        title="Attendance Logs"
        icon={<Clock className="h-4 w-4" />}
        isEmpty={data.attendance_logs.length === 0}
        emptyText="No attendance logs found."
      >
        <ul className="space-y-2">
          {data.attendance_logs.slice(0, 20).map((row, index) => (
            <ListItemCard key={String(row.id ?? index)}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[14px] font-semibold text-[#1F2937]">
                    {formatLabel(row.action_type)}
                  </p>
                  <p className="text-[12px] text-[#6B7280]">{formatDateTime(row.timestamp_time)}</p>
                </div>
                <StatusPill value={row.action_type} />
              </div>
            </ListItemCard>
          ))}
        </ul>
      </SectionCard>

      <SectionCard
        title="Attendance Queries"
        icon={<Building2 className="h-4 w-4" />}
        isEmpty={data.attendance_related_queries.length === 0}
        emptyText="No attendance queries found."
      >
        <ul className="space-y-2">
          {data.attendance_related_queries.map((row, index) => (
            <ListItemCard key={String(row.id ?? index)}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[13px] font-semibold text-[#1F2937] sm:text-[15px]">
                    {formatLabel(row.category)}
                  </p>
                  <p className="mt-1 text-[13px] text-[#6B7280]">{formatDate(row.attendance_date)}</p>
                </div>
                <StatusPill value={row.query_status} />
              </div>
              {row.query_message ? (
                <p className="mt-2 rounded-lg bg-white px-3 py-2 text-[13px] text-[#6B7280]">
                  {asText(row.query_message)}
                </p>
              ) : null}
            </ListItemCard>
          ))}
        </ul>
      </SectionCard>

      <SectionCard
        title="Feature Overrides"
        icon={<Shield className="h-4 w-4" />}
        isEmpty={data.feature_overrides.length === 0}
        emptyText="No feature overrides."
      >
        <ul className="space-y-2">
          {data.feature_overrides.map((row, index) => (
            <ListItemCard key={String(row.id ?? index)}>
              <p className="text-[13px] font-semibold text-[#1F2937] sm:text-[15px]">
                {asText(row.feature_name ?? row.feature_val, "Feature")}
              </p>
              <p className="mt-1 text-[13px] text-[#6B7280]">
                {asText(row.feature_val, "Custom access override")}
              </p>
            </ListItemCard>
          ))}
        </ul>
      </SectionCard>

      <SectionCard
        title="References"
        icon={<Users className="h-4 w-4" />}
        isEmpty={data.references.length === 0}
        emptyText="No employee references."
      >
        <ul className="space-y-2">
          {data.references.map((row, index) => (
            <ListItemCard key={String(row.id ?? index)}>
              <p className="text-[13px] font-semibold text-[#1F2937] sm:text-[15px]">
                {asText(row.referred_by_name, "Referrer")}
              </p>
              <p className="mt-1 text-[13px] text-[#6B7280]">
                {asText(row.referred_by_email)} · {asText(row.referred_by_phone)}
              </p>
            </ListItemCard>
          ))}
        </ul>
      </SectionCard>
    </div>
  ) : null;

  const moreSection = data ? (
    <div className="space-y-2 lg:space-y-4">
      {documentsSection}
      {moreSectionRest}
    </div>
  ) : null;

  const profileImageUrl =
    info?.user_image != null && String(info.user_image).trim() !== ""
      ? String(info.user_image).trim()
      : null;

  const desktopDashboard = data ? (
    <div className="grid grid-cols-12 gap-5">
      <div className="col-span-12 space-y-5 xl:col-span-4">
        <DesktopProfileCard
          name={employeeName}
          role={formatLabel(info?.role_name)}
          email={asText(info?.user_email)}
          phone={asText(info?.user_phone)}
          joined={formatDate(info?.created_at)}
          imageUrl={profileImageUrl}
          stats={stats}
          onImageZoom={openPhotoZoom}
        />
        {overviewSection}
      </div>

      <div className="col-span-12 space-y-5 xl:col-span-4">
        {workSection}
        {leavesSection}
      </div>

      <div className="col-span-12 space-y-5 xl:col-span-4">
        {documentsSection}
        {moreSectionRest}
      </div>
    </div>
  ) : null;

  const mobileContent =
    mobileTab === "overview"
      ? overviewSection
      : mobileTab === "work"
        ? workSection
        : mobileTab === "leaves"
          ? leavesSection
          : moreSection;

  const terminateButtonCls =
    "inline-flex min-h-[40px] shrink-0 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] font-semibold text-rose-800 shadow-sm transition hover:bg-rose-100 active:scale-[0.98] disabled:opacity-50 sm:px-4 sm:text-sm";

  return (
    <div className="min-h-full bg-[#F5F7FA] lg:bg-[#F8FAFC]">
      {/* Mobile / tablet */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-20 border-b border-[#E4E7EC] bg-white/95 shadow-sm backdrop-blur">
          <div className="bg-gradient-to-r from-[#008CD3] via-[#007EBF] to-[#0070AA] px-3 pb-3 pt-2.5 text-white">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white active:bg-white/25"
                aria-label="Go back"
              >
                <ChevronLeft className="h-[18px] w-[18px]" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/75">
                  Employee profile
                </p>
                <h1 className="truncate text-[16px] font-bold leading-tight tracking-tight">
                  {employeeName}
                </h1>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                {showTerminate ? (
                  <button
                    type="button"
                    onClick={() => {
                      setTerminateOpen(true);
                      setTerminateSuccess(null);
                    }}
                    className="inline-flex h-9 items-center gap-1 rounded-lg bg-white/15 px-2 text-[11px] font-semibold text-white active:bg-white/25"
                  >
                    <UserX className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    End
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => void loadEmployee(true)}
                  disabled={loading || refreshing}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white active:bg-white/25 disabled:opacity-50"
                  aria-label="Refresh"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {!loading && data ? (
              <div className="mt-3 flex items-center gap-2.5">
                <ProfileAvatarButton
                  name={employeeName}
                  imageUrl={profileImageUrl}
                  size="lg"
                  onZoom={openPhotoZoom}
                  className="!h-12 !w-12 !rounded-lg ring-2 ring-white/35"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] text-white/90">{asText(info?.user_email)}</p>
                  <p className="mt-0.5 truncate text-[12px] text-white/75">{asText(info?.user_phone)}</p>
                  <span className="mt-1.5 inline-flex max-w-full truncate rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold">
                    {formatLabel(info?.role_name)}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          {!loading && data ? (
            <div className="grid grid-cols-4 gap-1.5 border-b border-[#E4E7EC] bg-white px-3 py-2.5">
              <QuickStat label="Docs" value={stats.documents} />
              <QuickStat label="Assets" value={stats.assets} />
              <QuickStat label="Leaves" value={stats.leaves} />
              <QuickStat label="Address" value={stats.addresses} />
            </div>
          ) : null}

          <div className="bg-white px-3 pb-2.5 pt-2">
            <div className="flex rounded-lg bg-[#F5F7FA] p-0.5">
              {mobileTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMobileTab(tab.id)}
                  className={`flex flex-1 items-center justify-center rounded-md py-2 text-[11px] font-semibold transition ${
                    mobileTab === tab.id
                      ? "bg-white text-[#008CD3] shadow-sm ring-1 ring-[#E4E7EC]"
                      : "text-[#6B7280]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {exitRow && viewerCanManageExit && !loading ? (
          <div className="mx-4 mt-3 flex flex-wrap gap-2">
            {exitActionButtons}
          </div>
        ) : null}

        {terminateSuccess || exitActionSuccess ? (
          <div className="mx-3 mt-2 flex items-start gap-2 rounded-lg border border-[#C8E6C9] bg-[#E6F4EA] px-3 py-2.5 text-[12px] leading-snug text-[#0F9D58]">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="flex-1">{terminateSuccess ?? exitActionSuccess}</span>
            <button
              type="button"
              onClick={() => {
                setTerminateSuccess(null);
                setExitActionSuccess(null);
              }}
              className="shrink-0 rounded p-0.5"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}

        {error ? (
          <div className="mx-3 mt-2 flex items-start gap-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2.5 text-[12px] leading-snug text-[#D93025]">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-[#6B7280]">
            <Loader2 className="h-7 w-7 animate-spin text-[#008CD3]" />
            <p className="text-[13px]">Loading employee profile…</p>
          </div>
        ) : (
          <div className="space-y-2 p-3">{mobileContent}</div>
        )}
      </div>

      {/* Desktop */}
      <section className="hidden space-y-6 p-4 sm:p-6 lg:block">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E4E7EC] bg-white px-4 py-2.5 text-sm font-semibold text-[#1F2937] shadow-sm transition hover:bg-[#F8FBFF]"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to employees
          </button>
          <div className="flex flex-wrap items-center gap-2">
            {exitActionButtons}
            {showTerminate ? (
              <button
                type="button"
                onClick={() => {
                  setTerminateOpen(true);
                  setTerminateSuccess(null);
                }}
                className={terminateButtonCls}
              >
                <UserX className="h-4 w-4 shrink-0" aria-hidden />
                Employee termination
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void loadEmployee(true)}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-[#E4E7EC] bg-white px-4 py-2.5 text-sm font-semibold text-[#1F2937] shadow-sm transition hover:bg-[#F8FBFF] disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {terminateSuccess || exitActionSuccess ? (
          <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="flex-1">{terminateSuccess ?? exitActionSuccess}</span>
            <button
              type="button"
              onClick={() => {
                setTerminateSuccess(null);
                setExitActionSuccess(null);
              }}
              className="shrink-0 rounded p-1 hover:bg-emerald-100"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-[#E4E7EC] bg-white p-10 text-center text-sm text-[#6B7280]">
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-[#008CD3]" />
            Loading employee profile…
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : null}

        {!loading && !error ? desktopDashboard : null}
      </section>

      <TerminateEmployeeModal
        open={terminateOpen}
        orgId={orgId}
        employee={
          data
            ? {
                userId,
                userName: employeeName,
                userEmail: info?.user_email,
                subtitle: formatLabel(info?.role_name),
              }
            : null
        }
        onClose={() => setTerminateOpen(false)}
        onSuccess={(message) => {
          setTerminateSuccess(message);
          void loadEmployee(true);
        }}
      />

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
    </div>
  );
}
