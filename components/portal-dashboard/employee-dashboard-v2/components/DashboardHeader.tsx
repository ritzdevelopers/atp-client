"use client";

import { Bell, Loader2, RefreshCw, Search } from "lucide-react";

type DashboardHeaderProps = {
  employeeName: string;
  orgName?: string;
  notificationCount?: number;
  refreshing?: boolean;
  onRefresh?: () => void;
};

export default function DashboardHeader({
  employeeName,
  orgName,
  notificationCount = 0,
  refreshing,
  onRefresh,
}: DashboardHeaderProps) {
  const initials = employeeName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 -mx-4 border-b border-slate-200/80 bg-white/80 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex items-center gap-3">
        <div className="relative hidden min-w-0 flex-1 sm:block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            placeholder="Search dashboard, tasks, people..."
            aria-label="Search dashboard"
            className="w-full max-w-md rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-60"
              aria-label="Refresh dashboard"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="h-4 w-4" aria-hidden />
              )}
            </button>
          ) : null}

          <button
            type="button"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
            aria-label={`Notifications${notificationCount ? `, ${notificationCount} unread` : ""}`}
          >
            <Bell className="h-4 w-4" aria-hidden />
            {notificationCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            ) : null}
          </button>

          <div
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-sm font-semibold text-white shadow-sm"
            title={orgName || employeeName}
            aria-hidden
          >
            {initials || "?"}
          </div>
        </div>
      </div>
    </header>
  );
}
