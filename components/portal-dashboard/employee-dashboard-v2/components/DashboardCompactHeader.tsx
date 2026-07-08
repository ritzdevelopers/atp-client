"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, Loader2, LogIn, LogOut, RefreshCw } from "lucide-react";
import { MdWorkspacePremium } from "react-icons/md";
import {
  avatarCls,
  dashSectionMetaCls,
  iconBadgeCls,
  roleBadgeClass,
  statBoxCls,
  userInitials,
} from "@/components/portal-dashboard/home/dashboardTokens";
import { getGreetingName } from "../utils";

type DashboardCompactHeaderProps = {
  employeeName: string;
  roleName?: string;
  shiftName?: string;
  orgName?: string;
  profileImageUrl?: string | null;
  monthProgress?: number;
  presentDays?: number;
  leaveBalance?: number;
  checkInLabel?: string;
  checkOutLabel?: string;
  workingHoursDisplay?: string;
  showLiveTimer?: boolean;
  statusLabel?: string;
  orgId?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
};

function formatHeaderDateTime(now: Date): string {
  return now.toLocaleString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function roleKeyFromName(role?: string): string {
  const r = (role ?? "").toLowerCase();
  if (r.includes("admin")) return "admin";
  if (r.includes("hr")) return "hr";
  if (r.includes("manager") || r.includes("manger")) return "manager";
  return "employee";
}

export default function DashboardCompactHeader({
  employeeName,
  roleName,
  shiftName,
  orgName,
  profileImageUrl,
  monthProgress = 0,
  presentDays = 0,
  leaveBalance = 0,
  checkInLabel = "—",
  checkOutLabel = "—",
  workingHoursDisplay = "—",
  showLiveTimer = false,
  statusLabel = "No status yet",
  orgId,
  refreshing,
  onRefresh,
}: DashboardCompactHeaderProps) {
  const [now, setNow] = useState(() => new Date());
  const greeting = getGreetingName();
  const roleKey = roleKeyFromName(roleName);
  const roleBadgeLabel = roleName?.trim() || "Employee";

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const attendanceHistoryHref = orgId
    ? `/user-dashboard/${encodeURIComponent(orgId)}/attendance-history`
    : undefined;

  return (
    <header className="hero-rise card-fade-in relative shrink-0 overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
      <div className="pointer-events-none absolute inset-0 bg-[#F4F6F9]" aria-hidden />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(200px,55%)] bg-cover bg-bottom opacity-95"
        style={{ backgroundImage: "url(/portal/home/hero-skyline.svg)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 via-white/55 to-white"
        aria-hidden
      />

      <div className="relative px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            {profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt=""
                className="h-11 w-11 shrink-0 rounded-full object-cover shadow-md ring-2 ring-white/80"
              />
            ) : (
              <span className={`${avatarCls()} shadow-md ring-2 ring-white/80`} aria-hidden>
                {userInitials(employeeName)}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-slate-500">{greeting},</p>
              <h1 className="mt-0.5 flex items-center gap-2 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                <span className="truncate">{employeeName}</span>
                <MdWorkspacePremium
                  className="h-5 w-5 shrink-0 text-amber-500"
                  aria-hidden
                />
              </h1>
              <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-slate-600 sm:text-[14px]">
                Your workspace overview — attendance, leave, tasks, and team in one place.
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {orgName ? (
                  <p className="truncate text-[12px] text-slate-500 sm:text-[13px]">{orgName}</p>
                ) : null}
                {orgName ? <span className="hidden text-slate-300 sm:inline">·</span> : null}
                <span className={roleBadgeClass(roleKey)}>{roleBadgeLabel}</span>
                {shiftName ? (
                  <>
                    <span className="hidden text-slate-300 sm:inline">·</span>
                    <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-100">
                      {shiftName}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:shrink-0">
            <time
              dateTime={now.toISOString()}
              className={`hidden text-right ${dashSectionMetaCls} lg:block`}
            >
              {formatHeaderDateTime(now)}
            </time>
            {onRefresh ? (
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/90 bg-white/90 text-slate-600 shadow-sm transition hover:border-[#008CD3]/30 hover:text-[#008CD3] disabled:opacity-50"
                aria-label="Refresh dashboard"
              >
                {refreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <RefreshCw className="h-4 w-4" aria-hidden />
                )}
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 sm:gap-3">
          <div className={`${statBoxCls("emerald")} col-span-1`}>
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600/80">
              <LogIn className="h-3.5 w-3.5" aria-hidden />
              Check in
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900 sm:text-xl">
              {checkInLabel}
            </p>
          </div>
          <div className={`${statBoxCls("default")} col-span-1`}>
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-rose-500/80">
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              Check out
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900 sm:text-xl">
              {checkOutLabel}
            </p>
          </div>
          <div className={`${statBoxCls("sky")} col-span-2 sm:col-span-1`}>
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-sky-600/80">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {showLiveTimer ? "Working (live)" : "Hours"}
            </p>
            <p
              className={`mt-1 text-lg font-semibold tabular-nums text-slate-900 sm:text-xl ${
                showLiveTimer ? "timer-pulse" : ""
              }`}
            >
              {workingHoursDisplay}
            </p>
            <p className="mt-0.5 text-[11px] capitalize text-slate-500">{statusLabel}</p>
          </div>
          <div className={statBoxCls("emerald")}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600/80">
              Present
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-700 sm:text-xl">
              {presentDays}
              <span className="text-sm font-medium text-emerald-600/80">d</span>
            </p>
          </div>
          <div className={statBoxCls("amber")}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600/80">
              Leave left
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-amber-700 sm:text-xl">
              {leaveBalance}
            </p>
          </div>
          <div className={statBoxCls("sky")}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-600/80">
              Month
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-sky-700 sm:text-xl">
              {monthProgress}%
            </p>
          </div>
        </div>

        {attendanceHistoryHref ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Link
              href={attendanceHistoryHref}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#008CD3] transition hover:text-[#0070AA]"
            >
              View attendance history →
            </Link>
            <span className={iconBadgeCls("blue")}>
              <Clock className="h-4 w-4" aria-hidden />
            </span>
          </div>
        ) : null}
      </div>
    </header>
  );
}
