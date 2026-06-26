"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { getGreetingName } from "../utils";

type DashboardCompactHeaderProps = {
  employeeName: string;
  roleName?: string;
  shiftName?: string;
  monthProgress?: number;
  presentDays?: number;
  leaveBalance?: number;
  refreshing?: boolean;
  onRefresh?: () => void;
};

export default function DashboardCompactHeader({
  employeeName,
  roleName,
  shiftName,
  monthProgress = 0,
  presentDays = 0,
  leaveBalance = 0,
  refreshing,
  onRefresh,
}: DashboardCompactHeaderProps) {
  const firstName = employeeName.split(" ")[0] || "there";
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <header className="shrink-0 border-b border-slate-200/80 bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-700 px-3 py-3 text-white sm:px-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-bold sm:text-lg">
            {getGreetingName()}, {firstName}
          </p>
          <p className="truncate text-xs text-indigo-100/90 sm:text-sm">
            {today}
            {roleName ? ` · ${roleName}` : ""}
            {shiftName ? ` · ${shiftName}` : ""}
          </p>
        </div>
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white transition hover:bg-white/25 disabled:opacity-60"
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
      <div className="mt-2.5 flex flex-wrap gap-2">
        <span className="rounded-lg bg-white/15 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm sm:text-xs">
          Present {presentDays}d
        </span>
        <span className="rounded-lg bg-white/15 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm sm:text-xs">
          Leave {leaveBalance}
        </span>
        <span className="rounded-lg bg-white/15 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm sm:text-xs">
          Month {monthProgress}%
        </span>
      </div>
    </header>
  );
}
