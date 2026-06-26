"use client";

import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  Fingerprint,
  Megaphone,
  Palmtree,
  UserRound,
  UsersRound,
} from "lucide-react";
import type { DashboardTab } from "./DashboardTabNav";
import QuickActions from "./QuickActions";

type Tile = {
  tab: DashboardTab;
  label: string;
  desc: string;
  icon: LucideIcon;
  color: string;
  badge?: number;
};

type DashboardOverviewPanelProps = {
  onNavigate: (tab: DashboardTab) => void;
  orgId: string;
  handoverPending?: number;
  taskCount?: number;
  workingHours?: string;
  checkInTime?: string;
};

export default function DashboardOverviewPanel({
  onNavigate,
  orgId,
  handoverPending = 0,
  taskCount = 0,
  workingHours = "—",
  checkInTime = "—",
}: DashboardOverviewPanelProps) {
  const tiles: Tile[] = [
    {
      tab: "attendance",
      label: "Attendance",
      desc: `In ${checkInTime} · ${workingHours}`,
      icon: Fingerprint,
      color: "from-emerald-500 to-teal-600",
    },
    {
      tab: "leave",
      label: "Leave",
      desc: "Balances & entitlements",
      icon: Palmtree,
      color: "from-amber-500 to-orange-500",
    },
    {
      tab: "tasks",
      label: "Tasks",
      desc: "Today's priorities",
      icon: ClipboardList,
      color: "from-indigo-500 to-violet-600",
      badge: taskCount,
    },
    {
      tab: "team",
      label: "My team",
      desc: "Members & meetings",
      icon: UsersRound,
      color: "from-sky-500 to-cyan-600",
    },
    {
      tab: "insights",
      label: "Performance",
      desc: "Hours & activity",
      icon: BarChart3,
      color: "from-violet-500 to-purple-600",
    },
    {
      tab: "calendar",
      label: "Calendar",
      desc: "Holidays & events",
      icon: CalendarDays,
      color: "from-pink-500 to-rose-500",
    },
    {
      tab: "profile",
      label: "Profile",
      desc: "Job & payroll",
      icon: UserRound,
      color: "from-slate-600 to-slate-800",
    },
    {
      tab: "news",
      label: "Updates",
      desc: "News & handovers",
      icon: Megaphone,
      color: "from-orange-500 to-red-500",
      badge: handoverPending,
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
      <p className="shrink-0 text-xs font-medium text-slate-500">
        Tap a section to open it
      </p>
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <button
              key={tile.tab}
              type="button"
              onClick={() => onNavigate(tile.tab)}
              className="group relative flex min-h-[76px] flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-2.5 text-left shadow-sm transition hover:border-indigo-200 hover:shadow-md sm:min-h-[88px] sm:rounded-2xl sm:p-3"
            >
              {tile.badge != null && tile.badge > 0 ? (
                <span className="absolute right-2 top-2 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {tile.badge > 9 ? "9+" : tile.badge}
                </span>
              ) : null}
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${tile.color} text-white shadow-sm transition group-hover:scale-105 sm:h-10 sm:w-10`}
              >
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
              </div>
              <div className="mt-2 min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {tile.label}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-slate-500 sm:text-xs">
                  {tile.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>
      <div className="hidden shrink-0 rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-sm sm:block sm:p-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Quick links
        </p>
        <QuickActions orgId={orgId} handoverPending={handoverPending} compact />
      </div>
    </div>
  );
}
