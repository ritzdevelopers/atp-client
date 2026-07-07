"use client";

import { type ReactNode } from "react";
import {
  Building2,
  CalendarDays,
  Clock,
  LayoutDashboard,
  MapPin,
  RefreshCw,
  UsersRound,
} from "lucide-react";
import {
  roleBadgeClass,
} from "@/components/portal-dashboard/home/dashboardTokens";

function formatDashboardDate(now: Date): string {
  return now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function DashboardSection({
  title,
  description,
  icon,
  children,
  action,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#E4E7EC] bg-white shadow-[0_2px_16px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-3 border-b border-[#EEF2F6] bg-gradient-to-r from-[#F8FAFC] via-white to-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E8F4FC] text-[#008CD3]">
            {icon}
          </span>
          <div>
            <h3 className="text-[16px] font-semibold text-[#1F2937] sm:text-[17px]">{title}</h3>
            <p className="mt-0.5 text-[13px] text-[#6B7280] sm:text-[14px]">{description}</p>
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon,
  tone = "sky",
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  tone?: "sky" | "emerald" | "amber" | "violet";
}) {
  const cardTone = {
    sky: "border-[#C5E4F7] bg-gradient-to-br from-[#E8F4FC] to-white",
    emerald: "border-[#B7DFC3] bg-gradient-to-br from-[#E8F5E9] to-white",
    amber: "border-[#F9D9A8] bg-gradient-to-br from-[#FFF4E5] to-white",
    violet: "border-[#DCC4F5] bg-gradient-to-br from-[#F3E8FD] to-white",
  };
  const iconTone = {
    sky: "border-[#C5E4F7] text-[#008CD3]",
    emerald: "border-[#B7DFC3] text-[#0F9D58]",
    amber: "border-[#F9D9A8] text-[#E8710A]",
    violet: "border-[#DCC4F5] text-[#7B1FA2]",
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm sm:p-5 ${cardTone[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[#9CA3AF] sm:text-[13px]">
            {label}
          </p>
          <p className="mt-1.5 truncate text-[22px] font-bold tabular-nums text-[#1F2937] sm:text-[26px]">
            {value}
          </p>
          <p className="mt-1 line-clamp-2 text-[12px] text-[#6B7280] sm:text-[13px]">{hint}</p>
        </div>
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-white/80 ${iconTone[tone]}`}
        >
          {icon}
        </span>
      </div>
    </div>
  );
}

export type HomeDashboardTabProps = {
  orgTitle: string;
  displayName: string;
  roleBadgeLabel: string;
  roleKey: string;
  refreshing: boolean;
  onRefresh: () => void;
  showAttendance: boolean;
  workingHoursDisplay: string;
  statusLabel: string;
  showLiveTimer: boolean;
  leavePendingCount: number;
  activeTeamCount: number;
  addressCount: number;
  todayPanel: ReactNode | null;
  leavePanel: ReactNode;
  livePresencePanel: ReactNode;
  biometricPanel: ReactNode;
  profilePanel: ReactNode;
  teamsPanel?: ReactNode;
  locationsPanel: ReactNode;
  allToolsPanel: ReactNode;
};

export default function HomeDashboardTab({
  orgTitle,
  displayName,
  roleBadgeLabel,
  roleKey,
  refreshing,
  onRefresh,
  showAttendance,
  workingHoursDisplay,
  statusLabel,
  showLiveTimer,
  leavePendingCount,
  activeTeamCount,
  addressCount,
  todayPanel,
  leavePanel,
  livePresencePanel,
  biometricPanel,
  profilePanel,
  teamsPanel,
  locationsPanel,
  allToolsPanel,
}: HomeDashboardTabProps) {
  const now = new Date();

  return (
    <div role="tabpanel" aria-label="Dashboard" className="space-y-6">
      {/* Executive header */}
      <header className="card-fade-in overflow-hidden rounded-2xl border border-[#E4E7EC] bg-white shadow-[0_4px_24px_rgba(15,23,42,0.06)]">
        <div className="bg-gradient-to-r from-[#0C123A] via-[#15245C] to-[#008CD3] px-5 py-6 sm:px-7 sm:py-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white/95">
                  <LayoutDashboard className="h-3.5 w-3.5" aria-hidden />
                  Operations dashboard
                </span>
                <span className={roleBadgeClass(roleKey)}>{roleBadgeLabel}</span>
              </div>
              <h2 className="mt-3 text-[22px] font-semibold tracking-tight text-white sm:text-[26px]">
                {orgTitle}
              </h2>
              <p className="mt-1.5 text-[14px] text-white/80 sm:text-[15px]">
                Welcome back, {displayName} · {formatDashboardDate(now)}
              </p>
            </div>
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-white/25 bg-white/10 px-4 text-[13px] font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-50 lg:self-center"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
              Refresh data
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-3 border-t border-[#EEF2F6] bg-[#FAFBFC] p-4 sm:grid-cols-4 sm:gap-4 sm:p-5">
          {showAttendance ? (
            <KpiCard
              label="Working hours"
              value={workingHoursDisplay}
              hint={showLiveTimer ? `Timer running · ${statusLabel}` : statusLabel}
              icon={<Clock className="h-5 w-5" aria-hidden />}
              tone="sky"
            />
          ) : (
            <KpiCard
              label="Your role"
              value={roleBadgeLabel}
              hint="Organization administrator overview"
              icon={<Building2 className="h-5 w-5" aria-hidden />}
              tone="sky"
            />
          )}
          <KpiCard
            label="Leave requests"
            value={String(leavePendingCount)}
            hint={
              leavePendingCount > 0
                ? `${leavePendingCount} pending approval`
                : "No pending leave requests"
            }
            icon={<CalendarDays className="h-5 w-5" aria-hidden />}
            tone="amber"
          />
          <KpiCard
            label="My teams"
            value={String(activeTeamCount)}
            hint={
              activeTeamCount > 0
                ? `${activeTeamCount} active team${activeTeamCount === 1 ? "" : "s"} assigned`
                : "No team assignments yet"
            }
            icon={<UsersRound className="h-5 w-5" aria-hidden />}
            tone="emerald"
          />
          <KpiCard
            label="Office locations"
            value={String(addressCount)}
            hint={
              addressCount > 0
                ? `${addressCount} registered address${addressCount === 1 ? "" : "es"}`
                : "Add your first office location"
            }
            icon={<MapPin className="h-5 w-5" aria-hidden />}
            tone="violet"
          />
        </div>
      </header>

      {/* Today */}
      <DashboardSection
        title="Today at work"
        description="Attendance actions, working hours, and leave management"
        icon={<Clock className="h-5 w-5" aria-hidden />}
      >
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12 xl:gap-6">
          {showAttendance ? (
            <div className="xl:col-span-7">{todayPanel}</div>
          ) : null}
          <div className={showAttendance ? "xl:col-span-5" : "xl:col-span-12"}>
            {leavePanel}
          </div>
        </div>
      </DashboardSection>

      {/* Live monitoring */}
      <DashboardSection
        title="Live monitoring"
        description="Real-time team presence and biometric machine punches"
        icon={<UsersRound className="h-5 w-5" aria-hidden />}
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-semibold text-emerald-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" aria-hidden />
            Live
          </span>
        }
      >
        <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2 lg:gap-6">
          <div className="h-[min(420px,55vh)] min-h-[320px] overflow-hidden rounded-xl border border-[#E4E7EC]">
            {livePresencePanel}
          </div>
          <div className="h-[min(420px,55vh)] min-h-[320px] overflow-hidden rounded-xl border border-[#E4E7EC]">
            {biometricPanel}
          </div>
        </div>
      </DashboardSection>

      {/* Organization */}
      <DashboardSection
        title="Organization"
        description="Company profile, teams, shortcuts, and office locations"
        icon={<Building2 className="h-5 w-5" aria-hidden />}
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2 lg:gap-6">
            <div>{profilePanel}</div>
            <div className="space-y-5">
              {teamsPanel}
              {allToolsPanel}
            </div>
          </div>
          <div>{locationsPanel}</div>
        </div>
      </DashboardSection>
    </div>
  );
}
