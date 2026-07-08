"use client";

import { useCallback, useEffect, useRef } from "react";
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
import { iconBadgeCls } from "@/components/portal-dashboard/home/dashboardTokens";

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
  badgeVariant: "blue" | "amber" | "emerald" | "violet" | "slate";
};

type DashboardTabNavProps = {
  active: DashboardTab;
  onChange: (tab: DashboardTab) => void;
  taskCount?: number;
  handoverCount?: number;
};

const TAB_BADGE_VARIANTS: Record<DashboardTab, TabItem["badgeVariant"]> = {
  home: "blue",
  attendance: "emerald",
  leave: "amber",
  tasks: "violet",
  team: "blue",
  insights: "violet",
  calendar: "amber",
  profile: "slate",
  news: "amber",
};

function tabBtnCls(active: boolean) {
  return `relative inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-semibold transition-all duration-200 sm:px-3.5 sm:text-[13px] ${
    active
      ? "bg-[#E8F4FB] text-[#0077B6] shadow-[inset_0_0_0_1px_rgba(0,140,211,0.15)]"
      : "text-slate-600 hover:bg-slate-50 hover:text-[#008CD3]"
  }`;
}

export default function DashboardTabNav({
  active,
  onChange,
  taskCount = 0,
  handoverCount = 0,
}: DashboardTabNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, startX: 0, scrollLeft: 0, moved: false });

  const tabs: TabItem[] = [
    { id: "home", label: "Home", icon: Home, badgeVariant: TAB_BADGE_VARIANTS.home },
    {
      id: "attendance",
      label: "Attendance",
      icon: Fingerprint,
      badgeVariant: TAB_BADGE_VARIANTS.attendance,
    },
    { id: "leave", label: "Leave", icon: Palmtree, badgeVariant: TAB_BADGE_VARIANTS.leave },
    {
      id: "tasks",
      label: "Tasks",
      icon: ClipboardList,
      badge: taskCount > 0 ? taskCount : undefined,
      badgeVariant: TAB_BADGE_VARIANTS.tasks,
    },
    { id: "team", label: "Team", icon: UsersRound, badgeVariant: TAB_BADGE_VARIANTS.team },
    {
      id: "insights",
      label: "Insights",
      icon: BarChart3,
      badgeVariant: TAB_BADGE_VARIANTS.insights,
    },
    {
      id: "calendar",
      label: "Calendar",
      icon: CalendarDays,
      badgeVariant: TAB_BADGE_VARIANTS.calendar,
    },
    { id: "profile", label: "Profile", icon: UserRound, badgeVariant: TAB_BADGE_VARIANTS.profile },
    {
      id: "news",
      label: "Updates",
      icon: Megaphone,
      badge: handoverCount > 0 ? handoverCount : undefined,
      badgeVariant: TAB_BADGE_VARIANTS.news,
    },
  ];

  const stopDrag = useCallback(() => {
    drag.current.active = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!drag.current.active) return;
      const el = scrollRef.current;
      if (!el) return;
      const dx = e.clientX - drag.current.startX;
      if (Math.abs(dx) > 4) drag.current.moved = true;
      el.scrollLeft = drag.current.scrollLeft - dx;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stopDrag);
      window.removeEventListener("pointercancel", stopDrag);
    };
  }, [stopDrag]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const el = scrollRef.current;
    if (!el) return;
    drag.current = {
      active: true,
      startX: e.clientX,
      scrollLeft: el.scrollLeft,
      moved: false,
    };
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
  }, []);

  return (
    <nav
      className="card-fade-in sticky top-0 z-10 mx-2 mt-2 shrink-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-[0_4px_20px_rgba(15,23,42,0.06)] backdrop-blur-md sm:mx-3"
      aria-label="Dashboard sections"
      style={{ animationDelay: "60ms" }}
    >
      <div className="border-b border-slate-100 px-3 py-2 sm:px-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
          Workspace sections
        </p>
      </div>
      <div
        ref={scrollRef}
        role="tablist"
        onPointerDown={onPointerDown}
        className="flex cursor-grab gap-1 overflow-x-auto px-2 py-2 active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-3"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                if (drag.current.moved) {
                  drag.current.moved = false;
                  return;
                }
                onChange(tab.id);
              }}
              className={tabBtnCls(isActive)}
              aria-current={isActive ? "page" : undefined}
            >
              <span
                className={`${iconBadgeCls(tab.badgeVariant)} !h-8 !w-8 !rounded-lg ${
                  isActive ? "ring-2 ring-[#008CD3]/20" : ""
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="whitespace-nowrap">{tab.label}</span>
              {tab.badge != null && tab.badge > 0 ? (
                <span className="ml-0.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
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
