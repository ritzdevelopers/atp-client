"use client";

import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  Fingerprint,
  Home,
  Megaphone,
  Palmtree,
  UserRound,
  UsersRound,
} from "lucide-react";

export type DashboardTab =
  | "home"
  | "attendance"
  | "leave"
  | "tasks"
  | "team"
  | "insights"
  | "calendar"
  | "profile"
  | "news";

type TabItem = {
  id: DashboardTab;
  label: string;
  icon: LucideIcon;
  badge?: number;
};

type DashboardTabNavProps = {
  active: DashboardTab;
  onChange: (tab: DashboardTab) => void;
  taskCount?: number;
  handoverCount?: number;
};

export default function DashboardTabNav({
  active,
  onChange,
  taskCount = 0,
  handoverCount = 0,
}: DashboardTabNavProps) {
  const tabs: TabItem[] = [
    { id: "home", label: "Home", icon: Home },
    { id: "attendance", label: "Attendance", icon: Fingerprint },
    { id: "leave", label: "Leave", icon: Palmtree },
    {
      id: "tasks",
      label: "Tasks",
      icon: ClipboardList,
      badge: taskCount > 0 ? taskCount : undefined,
    },
    { id: "team", label: "Team", icon: UsersRound },
    { id: "insights", label: "Insights", icon: BarChart3 },
    { id: "calendar", label: "Calendar", icon: CalendarDays },
    { id: "profile", label: "Profile", icon: UserRound },
    {
      id: "news",
      label: "Updates",
      icon: Megaphone,
      badge: handoverCount > 0 ? handoverCount : undefined,
    },
  ];

  return (
    <nav
      className="shrink-0 border-b border-slate-200/80 bg-white/90 px-2 py-2 backdrop-blur-sm sm:px-3"
      aria-label="Dashboard sections"
    >
      <div className="flex gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`relative inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition sm:px-3.5 sm:text-sm ${
                isActive
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="whitespace-nowrap">{tab.label}</span>
              {tab.badge != null && tab.badge > 0 ? (
                <span
                  className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    isActive ? "bg-white/20 text-white" : "bg-rose-500 text-white"
                  }`}
                >
                  {tab.badge > 9 ? "9+" : tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
