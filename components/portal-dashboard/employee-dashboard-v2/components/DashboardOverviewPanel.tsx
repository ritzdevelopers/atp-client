"use client";

import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  Fingerprint,
  LayoutGrid,
  Megaphone,
  Palmtree,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react";
import {
  dashCardCls,
  dashSectionMetaCls,
  dashSectionTitleCls,
  iconBadgeCls,
} from "@/components/portal-dashboard/home/dashboardTokens";
import type { DashboardTab } from "./DashboardTabNav";
import QuickActions from "./QuickActions";

type Tile = {
  tab: DashboardTab;
  label: string;
  desc: string;
  icon: LucideIcon;
  tone: string;
  badgeVariant: "blue" | "amber" | "emerald" | "violet" | "slate";
  badge?: number;
};

const TILE_TONES = [
  "bg-[#E8F4FC] border-[#C5E4F7] text-[#008CD3]",
  "bg-[#E8F5E9] border-[#B7DFC3] text-[#0F9D58]",
  "bg-[#FFF4E5] border-[#F9D9A8] text-[#E8710A]",
  "bg-[#F3E8FD] border-[#DCC4F5] text-[#7B1FA2]",
  "bg-[#E8EAF6] border-[#C5CAE9] text-[#3949AB]",
  "bg-[#FCE8EC] border-[#F5C6D0] text-[#C6285C]",
];

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
      tone: TILE_TONES[1],
      badgeVariant: "emerald",
    },
    {
      tab: "leave",
      label: "Leave",
      desc: "Balances & entitlements",
      icon: Palmtree,
      tone: TILE_TONES[2],
      badgeVariant: "amber",
    },
    {
      tab: "tasks",
      label: "Tasks",
      desc: "Today's priorities",
      icon: ClipboardList,
      tone: TILE_TONES[3],
      badgeVariant: "violet",
      badge: taskCount,
    },
    {
      tab: "team",
      label: "My team",
      desc: "Members & meetings",
      icon: UsersRound,
      tone: TILE_TONES[0],
      badgeVariant: "blue",
    },
    {
      tab: "insights",
      label: "Performance",
      desc: "Hours & activity",
      icon: BarChart3,
      tone: TILE_TONES[4],
      badgeVariant: "violet",
    },
    {
      tab: "calendar",
      label: "Calendar",
      desc: "Holidays & events",
      icon: CalendarDays,
      tone: TILE_TONES[5],
      badgeVariant: "amber",
    },
    {
      tab: "profile",
      label: "Profile",
      desc: "Job & payroll",
      icon: UserRound,
      tone: "bg-slate-50 border-slate-200 text-slate-700",
      badgeVariant: "slate",
    },
    {
      tab: "news",
      label: "Updates",
      desc: "News & handovers",
      icon: Megaphone,
      tone: TILE_TONES[2],
      badgeVariant: "amber",
      badge: handoverPending,
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden sm:gap-4">
      <div className={`${dashCardCls} shrink-0 overflow-hidden`}>
        <div className="flex items-start gap-3 border-b border-slate-100 bg-gradient-to-r from-[#F8FAFC] via-white to-[#F0F9FF]/40 px-4 py-3.5 sm:px-5">
          <span className={iconBadgeCls("blue")}>
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className={dashSectionTitleCls}>Your workspace</h2>
            <p className={`mt-0.5 ${dashSectionMetaCls}`}>
              Open a section below or use quick links to jump to common actions.
            </p>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
        {tiles.map((tile, index) => {
          const Icon = tile.icon;
          return (
            <button
              key={tile.tab}
              type="button"
              onClick={() => onNavigate(tile.tab)}
              className={`card-fade-in group relative flex min-h-[92px] flex-col justify-between rounded-2xl border p-3 text-left shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] sm:min-h-[104px] sm:p-3.5 ${tile.tone}`}
              style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
            >
              {tile.badge != null && tile.badge > 0 ? (
                <span className="absolute right-2.5 top-2.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                  {tile.badge > 9 ? "9+" : tile.badge}
                </span>
              ) : null}
              <span
                className={`${iconBadgeCls(tile.badgeVariant)} !h-9 !w-9 bg-white/80 transition group-hover:scale-105`}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <div className="mt-2 min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{tile.label}</p>
                <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-slate-600 sm:text-[11px]">
                  {tile.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className={`${dashCardCls} shrink-0 overflow-hidden`}>
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
          <span className={iconBadgeCls("violet")}>
            <LayoutGrid className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
              Quick links
            </p>
            <p className={`${dashSectionMetaCls}`}>Frequently used features</p>
          </div>
        </div>
        <div className="px-3 py-3 sm:px-4 sm:py-4">
          <QuickActions orgId={orgId} handoverPending={handoverPending} compact />
        </div>
      </div>
    </div>
  );
}
