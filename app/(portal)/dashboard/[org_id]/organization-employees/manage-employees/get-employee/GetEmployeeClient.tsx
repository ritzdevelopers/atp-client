"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  Briefcase,
  Building2,
  CalendarDays,
  ChevronLeft,
  Clock,
  FileText,
  Globe,
  Laptop,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Shield,
  User,
  Users,
  Wallet,
} from "lucide-react";

import { getSingleEmployee, type SingleEmployeeData } from "@/services/adminUser";

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

function buildAddress(info: SingleEmployeeData["user_info"]): string {
  const parts = [
    info.house_number,
    info.street,
    info.is_from_village ? info.village_name : null,
    info.city,
    info.district,
    info.state,
    info.country,
    info.zip_code,
  ]
    .map((part) => asText(part, ""))
    .filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "—";
}

function maskAccountNumber(value: unknown): string {
  if (value == null || value === "") return "—";
  const raw = String(value);
  if (raw.length <= 4) return raw;
  return `•••• ${raw.slice(-4)}`;
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-[#EEF2F6] py-3.5 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="text-[13px] font-medium text-[#6B7280]">{label}</dt>
      <dd className="text-[14px] font-semibold text-[#1F2937] sm:max-w-[62%] sm:text-right">{value}</dd>
    </div>
  );
}

function SectionCard({
  title,
  icon,
  children,
  emptyText,
  isEmpty,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  emptyText?: string;
  isEmpty?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#E4E7EC] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      <div className="flex items-center gap-3 border-b border-[#EEF2F6] bg-gradient-to-r from-[#F8FBFF] to-white px-4 py-3.5 sm:px-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E8F4FB] text-[#008CD3]">
          {icon}
        </span>
        <h2 className="text-[15px] font-semibold tracking-tight text-[#1F2937] sm:text-base">{title}</h2>
      </div>
      <div className="px-4 py-4 sm:px-5">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F5F7FA] text-[#9CA3AF]">
              {icon}
            </span>
            <p className="text-[14px] text-[#6B7280]">{emptyText || "No records found."}</p>
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
    <div className="rounded-xl border border-[#E4E7EC] bg-white px-3 py-2.5 text-center shadow-sm">
      <p className="text-lg font-bold text-[#008CD3]">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-[#6B7280]">{label}</p>
    </div>
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
      className="rounded-xl border border-[#E4E7EC] bg-gradient-to-br from-white to-[#F8FBFF] p-4 shadow-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-semibold text-[#1F2937]">
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
    <li className="rounded-xl border border-[#EEF2F6] bg-[#FAFBFC] px-3 py-3 transition hover:border-[#D6EAF8] hover:bg-white">
      {children}
    </li>
  );
}

export default function GetEmployeeClient({ userId }: GetEmployeeClientProps) {
  const params = useParams();
  const router = useRouter();
  const orgId = String(params?.org_id ?? "");

  const [data, setData] = useState<SingleEmployeeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("overview");

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
        const result = await getSingleEmployee(token, orgId, userId);
        setData(result);
      } catch (e) {
        setData(null);
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

  const stats = useMemo(
    () => ({
      documents: data?.documents.length ?? 0,
      assets: data?.assets.length ?? 0,
      leaves: data?.leave_queries.length ?? 0,
      logs: data?.attendance_logs.length ?? 0,
    }),
    [data],
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
      <SectionCard title="Contact Information" icon={<User className="h-4 w-4" />}>
        <dl>
          <InfoRow label="Full name" value={asText(info?.user_name)} />
          <InfoRow
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
          <InfoRow
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
          <InfoRow label="Joined on" value={formatDate(info?.created_at)} />
          <InfoRow label="Role" value={formatLabel(info?.role_name)} />
        </dl>
      </SectionCard>

      <SectionCard title="Address" icon={<MapPin className="h-4 w-4" />} isEmpty={buildAddress(info || {}) === "—"}>
        <p className="rounded-xl bg-[#F8FBFF] px-4 py-3 text-[14px] leading-relaxed text-[#1F2937]">
          {buildAddress(info || {})}
        </p>
      </SectionCard>

      <SectionCard
        title="Emergency Contact"
        icon={<Phone className="h-4 w-4" />}
        isEmpty={!info?.emergency_contact_name && !info?.emergency_number}
      >
        <dl>
          <InfoRow label="Contact name" value={asText(info?.emergency_contact_name)} />
          <InfoRow label="Contact number" value={asText(info?.emergency_number)} />
          <InfoRow label="Relation" value={formatLabel(info?.relation_blood_line)} />
        </dl>
      </SectionCard>
    </div>
  ) : null;

  const workSection = data ? (
    <div className="space-y-4">
      <SectionCard title="Shift Details" icon={<Clock className="h-4 w-4" />} isEmpty={!info?.shift_name}>
        <dl>
          <InfoRow label="Shift" value={asText(info?.shift_name)} />
          <InfoRow
            label="Timing"
            value={
              info?.start_time || info?.end_time
                ? `${asText(info?.start_time)} – ${asText(info?.end_time)}`
                : "—"
            }
          />
          <InfoRow label="Working days" value={asText(info?.working_days)} />
          <InfoRow
            label="Night shift"
            value={info?.is_night_shift ? "Yes" : info?.is_night_shift === 0 ? "No" : "—"}
          />
        </dl>
      </SectionCard>

      <SectionCard
        title="Bank Information"
        icon={<Wallet className="h-4 w-4" />}
        isEmpty={!info?.bank_name && !info?.account_number}
      >
        <dl>
          <InfoRow label="Account holder" value={asText(info?.account_holder_name)} />
          <InfoRow label="Bank" value={asText(info?.bank_name)} />
          <InfoRow label="Branch" value={asText(info?.bank_branch)} />
          <InfoRow label="Account number" value={maskAccountNumber(info?.account_number)} />
          <InfoRow label="IFSC" value={asText(info?.ifsc_code)} />
          <InfoRow label="UAN" value={asText(info?.uan_number)} />
        </dl>
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
                  <p className="text-[15px] font-semibold text-[#1F2937]">
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
    <div className="space-y-4">
      <SectionCard
        title="Leave Balance"
        icon={<Briefcase className="h-4 w-4" />}
        isEmpty={data.leave_balance.length === 0}
        emptyText="No leave balance records."
      >
        <div className="grid gap-3 sm:grid-cols-2">
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
                  <p className="text-[15px] font-semibold text-[#1F2937]">
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

  const moreSection = data ? (
    <div className="space-y-4">
      <SectionCard
        title="Documents"
        icon={<FileText className="h-4 w-4" />}
        isEmpty={data.documents.length === 0}
        emptyText="No documents uploaded."
      >
        <ul className="space-y-2">
          {data.documents.map((doc, index) => (
            <ListItemCard key={String(doc.id ?? index)}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-[#1F2937]">
                    {asText(doc.document_name ?? doc.document_type, "Document")}
                  </p>
                  <p className="text-[12px] text-[#6B7280]">{formatDate(doc.created_at)}</p>
                </div>
                {doc.doc_url ? (
                  <Link
                    href={asText(doc.doc_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-lg bg-[#008CD3] px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#0070AA]"
                  >
                    View
                  </Link>
                ) : null}
              </div>
            </ListItemCard>
          ))}
        </ul>
      </SectionCard>

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
                  <p className="text-[15px] font-semibold text-[#1F2937]">
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
              <p className="text-[15px] font-semibold text-[#1F2937]">
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
              <p className="text-[15px] font-semibold text-[#1F2937]">
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

  const mobileContent =
    mobileTab === "overview"
      ? overviewSection
      : mobileTab === "work"
        ? workSection
        : mobileTab === "leaves"
          ? leavesSection
          : moreSection;

  return (
    <div className="min-h-full bg-[#F5F7FA] lg:bg-[#F8FAFC]">
      {/* Mobile / tablet */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-20 border-b border-[#E4E7EC] bg-white/95 shadow-sm backdrop-blur">
          <div className="bg-gradient-to-r from-[#008CD3] to-[#0070AA] px-4 pb-4 pt-3 text-white">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white active:bg-white/25"
                aria-label="Go back"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
                  Employee Profile
                </p>
                <h1 className="truncate text-[18px] font-bold">{employeeName}</h1>
              </div>
              <button
                type="button"
                onClick={() => void loadEmployee(true)}
                disabled={loading || refreshing}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white active:bg-white/25 disabled:opacity-50"
                aria-label="Refresh"
              >
                <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            </div>

            {!loading && data ? (
              <div className="mt-4 flex items-end gap-3">
                <span
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-base font-bold shadow-md ${userColorClass(employeeName)}`}
                >
                  {userInitials(employeeName)}
                </span>
                <div className="min-w-0 pb-1">
                  <p className="truncate text-[13px] text-white/90">{asText(info?.user_email)}</p>
                  <p className="mt-0.5 truncate text-[13px] text-white/80">{asText(info?.user_phone)}</p>
                  <span className="mt-2 inline-flex rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold">
                    {formatLabel(info?.role_name)}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          {!loading && data ? (
            <div className="grid grid-cols-4 gap-2 border-b border-[#E4E7EC] bg-white px-3 py-3">
              <QuickStat label="Docs" value={stats.documents} />
              <QuickStat label="Assets" value={stats.assets} />
              <QuickStat label="Leaves" value={stats.leaves} />
              <QuickStat label="Logs" value={stats.logs} />
            </div>
          ) : null}

          <div className="bg-white px-3 pb-3 pt-2">
            <div className="flex rounded-xl bg-[#F5F7FA] p-1">
              {mobileTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMobileTab(tab.id)}
                  className={`flex flex-1 items-center justify-center rounded-lg py-2.5 text-[12px] font-semibold transition sm:text-[13px] ${
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

        {error ? (
          <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl border border-[#F5C6C2] bg-[#FCE8E6] px-4 py-3 text-[14px] text-[#D93025]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-[#6B7280]">
            <Loader2 className="h-9 w-9 animate-spin text-[#008CD3]" />
            <p className="text-[15px]">Loading employee profile…</p>
          </div>
        ) : (
          <div className="space-y-4 p-4">{mobileContent}</div>
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

        <header className="overflow-hidden rounded-2xl border border-[#E4E7EC] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
          <div className="bg-gradient-to-r from-[#008CD3] to-[#0070AA] px-6 py-5 text-white">
            <div className="flex flex-wrap items-start gap-5">
              <span
                className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold shadow-lg ${userColorClass(employeeName)}`}
              >
                {userInitials(employeeName)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
                  Employee Profile
                </p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight">{employeeName}</h1>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm">
                    <Shield className="h-4 w-4" />
                    {formatLabel(info?.role_name)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm">
                    <CalendarDays className="h-4 w-4" />
                    Joined {formatDate(info?.created_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="grid gap-4 border-t border-[#EEF2F6] px-6 py-5 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-xl bg-[#F8FBFF] px-4 py-3">
              <Mail className="h-5 w-5 text-[#008CD3]" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">Email</p>
                <p className="truncate text-sm font-semibold text-[#1F2937]">{asText(info?.user_email)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-[#F8FBFF] px-4 py-3">
              <Phone className="h-5 w-5 text-[#008CD3]" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">Phone</p>
                <p className="truncate text-sm font-semibold text-[#1F2937]">{asText(info?.user_phone)}</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:col-span-1">
              <QuickStat label="Docs" value={stats.documents} />
              <QuickStat label="Assets" value={stats.assets} />
              <QuickStat label="Leaves" value={stats.leaves} />
              <QuickStat label="Logs" value={stats.logs} />
            </div>
          </div>
        </header>

        {loading ? (
          <div className="rounded-2xl border border-[#E4E7EC] bg-white p-10 text-center text-sm text-[#6B7280]">
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-[#008CD3]" />
            Loading employee profile…
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : null}

        {!loading && !error && data ? (
          <div className="grid gap-6 xl:grid-cols-2">
            {overviewSection}
            {workSection}
            {leavesSection}
            {moreSection}
          </div>
        ) : null}
      </section>
    </div>
  );
}
