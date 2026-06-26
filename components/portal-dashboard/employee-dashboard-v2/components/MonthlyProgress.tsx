"use client";

import { Target } from "lucide-react";
import type { AttendanceStats } from "../types";
import { cardBase, cardPadding, cardTitle, sectionLabel } from "../cardStyles";

type MonthlyProgressProps = {
  stats: AttendanceStats;
};

export default function MonthlyProgress({ stats }: MonthlyProgressProps) {
  const goals = [
    {
      label: "Attendance rate",
      value: stats.monthProgress,
      color: "from-indigo-500 to-violet-500",
    },
    {
      label: "Present days",
      value: Math.min(100, stats.presentDays * 5),
      display: `${stats.presentDays} days`,
      color: "from-emerald-500 to-teal-500",
    },
    {
      label: "Hours logged",
      value: Math.min(100, Math.round(stats.totalWorkingHours * 3)),
      display: `${stats.totalWorkingHours.toFixed(1)}h`,
      color: "from-sky-500 to-cyan-500",
    },
  ];

  return (
    <article className={`${cardBase} ${cardPadding}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={sectionLabel}>Progress</p>
          <h2 className={`${cardTitle} mt-1`}>Monthly goals</h2>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
          <Target className="h-5 w-5" aria-hidden />
        </div>
      </div>

      <ul className="mt-5 space-y-4">
        {goals.map((goal) => (
          <li key={goal.label}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">{goal.label}</span>
              <span className="font-bold tabular-nums text-slate-900">
                {goal.display ?? `${goal.value}%`}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${goal.color} transition-all duration-700`}
                style={{ width: `${goal.value}%` }}
                role="progressbar"
                aria-valuenow={goal.value}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={goal.label}
              />
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}
