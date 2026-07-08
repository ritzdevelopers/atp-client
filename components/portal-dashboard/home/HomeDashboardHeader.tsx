"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, LogIn, LogOut, RefreshCw } from "lucide-react";
import { MdWorkspacePremium } from "react-icons/md";
import {
  avatarCls,
  roleBadgeClass,
  userInitials,
} from "@/components/portal-dashboard/home/dashboardTokens";

type HomeDashboardHeaderProps = {
  greeting: string;
  displayName: string;
  orgTitle: string;
  roleBadgeLabel: string;
  roleKey: string;
  refreshing: boolean;
  onRefresh: () => void;
  showAttendanceStrip?: boolean;
  checkInLabel?: string;
  checkOutLabel?: string;
  workingHoursDisplay?: string;
  showLiveTimer?: boolean;
  statusLabel?: string;
  attendanceHistoryHref?: string;
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

export default function HomeDashboardHeader({
  greeting,
  displayName,
  orgTitle,
  roleBadgeLabel,
  roleKey,
  refreshing,
  onRefresh,
  showAttendanceStrip = false,
  checkInLabel = "—",
  checkOutLabel = "—",
  workingHoursDisplay = "0:00",
  showLiveTimer = false,
  statusLabel = "No status",
  attendanceHistoryHref,
}: HomeDashboardHeaderProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="hero-rise relative overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
      <div
        className="pointer-events-none absolute inset-0 bg-[#F4F6F9]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(220px,55%)] bg-cover bg-bottom opacity-95"
        style={{ backgroundImage: "url(/portal/home/hero-skyline.svg)" }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 via-white/55 to-white" aria-hidden />

      <div className="relative px-5 py-6 sm:px-7 sm:py-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className={`${avatarCls()} shadow-md ring-2 ring-white/80`} aria-hidden>
              {userInitials(displayName)}
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-medium text-[#6B7280]">{greeting},</p>
              <h1 className="mt-0.5 flex items-center gap-2 text-2xl font-semibold tracking-tight text-[#1F2937] sm:text-[28px]">
                <span className="truncate">{displayName}</span>
                <MdWorkspacePremium
                  className="h-5 w-5 shrink-0 text-amber-500"
                  aria-label="Premium"
                />
              </h1>
              <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[#4B5563] sm:text-[15px]">
                Let&apos;s do great things together. 🚀 ✨
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <p className="truncate text-[13px] text-[#6B7280]">{orgTitle}</p>
                <span className="hidden text-[#D1D5DB] sm:inline">·</span>
                <span className={roleBadgeClass(roleKey)}>{roleBadgeLabel}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:shrink-0">
            <time
              dateTime={now.toISOString()}
              className="hidden text-right text-[12px] leading-snug text-[#6B7280] xl:block"
            >
              {formatHeaderDateTime(now)}
            </time>
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E4E7EC] bg-white/90 text-[#6B7280] shadow-sm transition hover:border-[#008CD3]/30 hover:text-[#008CD3] disabled:opacity-50"
              aria-label="Refresh dashboard"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                aria-hidden
              />
            </button>
          </div>
        </div>

        {showAttendanceStrip ? (
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/80 bg-white/85 px-4 py-3 shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                <LogIn className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                Check in
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-[#1F2937]">
                {checkInLabel}
              </p>
            </div>
            <div className="rounded-xl border border-white/80 bg-white/85 px-4 py-3 shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                <LogOut className="h-3.5 w-3.5 text-rose-500" aria-hidden />
                Check out
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-[#1F2937]">
                {checkOutLabel}
              </p>
            </div>
            <div className="rounded-xl border border-white/80 bg-white/85 px-4 py-3 shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                <Clock className="h-3.5 w-3.5 text-[#008CD3]" aria-hidden />
                Working hours
              </p>
              <p
                className={`mt-1 text-xl font-semibold tabular-nums text-[#1F2937] ${
                  showLiveTimer ? "timer-pulse" : ""
                }`}
              >
                {workingHoursDisplay}
              </p>
              <p className="mt-1 text-[12px] capitalize text-[#6B7280]">{statusLabel}</p>
            </div>
          </div>
        ) : null}

        {showAttendanceStrip && attendanceHistoryHref ? (
          <div className="mt-3">
            <Link
              href={attendanceHistoryHref}
              className="inline-flex text-[13px] font-medium text-[#008CD3] hover:text-[#0070AA]"
            >
              View attendance history →
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
