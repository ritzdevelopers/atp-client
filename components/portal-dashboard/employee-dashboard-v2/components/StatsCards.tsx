"use client";

import {
  CalendarCheck,
  Clock3,
  Palmtree,
  TrendingUp,
} from "lucide-react";
import type { AttendanceStats } from "../types";
import { badgeBase, cardBase, cardPadding, iconWrap } from "../cardStyles";

type StatsCardsProps = {
  stats: AttendanceStats;
  remainingLeaves?: number;
  handoverPending?: number;
};

const items = [
  {
    key: "present",
    label: "Present days",
    icon: CalendarCheck,
    color: "bg-emerald-50 text-emerald-600",
    valueKey: "presentDays" as const,
  },
  {
    key: "absent",
    label: "Absent days",
    icon: TrendingUp,
    color: "bg-rose-50 text-rose-600",
    valueKey: "absentDays" as const,
  },
  {
    key: "hours",
    label: "Hours logged",
    icon: Clock3,
    color: "bg-sky-50 text-sky-600",
    valueKey: "totalWorkingHours" as const,
    format: (v: number) => `${v.toFixed(1)}h`,
  },
  {
    key: "leaves",
    label: "Leave balance",
    icon: Palmtree,
    color: "bg-amber-50 text-amber-600",
  },
];

export default function StatsCards({
  stats,
  remainingLeaves = 0,
  handoverPending = 0,
}: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        const raw =
          item.key === "leaves"
            ? remainingLeaves
            : stats[item.valueKey as keyof AttendanceStats];
        const value =
          item.format && typeof raw === "number"
            ? item.format(raw)
            : String(raw ?? 0);

        return (
          <article
            key={item.key}
            className={`${cardBase} ${cardPadding} group`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className={`${iconWrap} ${item.color} transition group-hover:scale-105`}>
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              {item.key === "leaves" && handoverPending > 0 ? (
                <span className={`${badgeBase} bg-orange-100 text-orange-700`}>
                  {handoverPending} handover
                </span>
              ) : null}
            </div>
            <p className="mt-4 text-2xl font-bold tabular-nums text-slate-900">
              {value}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500">{item.label}</p>
          </article>
        );
      })}
    </div>
  );
}
