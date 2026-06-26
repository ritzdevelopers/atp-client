"use client";

import Link from "next/link";
import { Briefcase, ChevronRight } from "lucide-react";
import type { EmployeeTaskRow } from "../types";
import { badgeBase, cardBase, cardPadding, cardTitle, sectionLabel } from "../cardStyles";

type ProjectStatusProps = {
  tasks: EmployeeTaskRow[];
  orgId: string;
};

export default function ProjectStatus({ tasks, orgId }: ProjectStatusProps) {
  const counts = tasks.reduce(
    (acc, t) => {
      acc[t.task_status] = (acc[t.task_status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const total = tasks.length || 1;
  const completed = counts.completed ?? 0;
  const inProgress = (counts["in-progress"] ?? 0) + (counts.received ?? 0);
  const pending = (counts.pending ?? 0) + (counts.delay ?? 0);
  const completionPct = Math.round((completed / total) * 100);

  const segments = [
    { label: "Completed", count: completed, color: "bg-emerald-500", width: (completed / total) * 100 },
    { label: "In progress", count: inProgress, color: "bg-indigo-500", width: (inProgress / total) * 100 },
    { label: "Pending", count: pending, color: "bg-amber-400", width: (pending / total) * 100 },
  ];

  return (
    <article className={`${cardBase} ${cardPadding}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={sectionLabel}>Projects</p>
          <h2 className={`${cardTitle} mt-1`}>Task status</h2>
        </div>
        <Link
          href={`/user-dashboard/${encodeURIComponent(orgId)}/tasks-management`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
        >
          Open
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      <div className="mt-5 flex items-center gap-4">
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-indigo-50">
          <Briefcase className="h-8 w-8 text-indigo-600" aria-hidden />
          <span className="absolute -bottom-1 -right-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-indigo-700 shadow ring-1 ring-indigo-100">
            {tasks.length}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold text-slate-900">{completionPct}%</p>
          <p className="text-sm text-slate-500">overall completion</p>
          <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-slate-100">
            {segments.map((seg) =>
              seg.width > 0 ? (
                <div
                  key={seg.label}
                  className={`${seg.color} transition-all`}
                  style={{ width: `${seg.width}%` }}
                  title={`${seg.label}: ${seg.count}`}
                />
              ) : null,
            )}
          </div>
        </div>
      </div>

      <ul className="mt-5 grid grid-cols-3 gap-2">
        {segments.map((seg) => (
          <li
            key={seg.label}
            className="rounded-lg bg-slate-50 px-2 py-2 text-center ring-1 ring-slate-100"
          >
            <p className="text-lg font-bold text-slate-900">{seg.count}</p>
            <p className="text-[10px] font-medium text-slate-500">{seg.label}</p>
          </li>
        ))}
      </ul>

      {tasks.length > 0 ? (
        <div className="mt-4">
          <span className={`${badgeBase} bg-indigo-50 text-indigo-700`}>
            {inProgress} active assignment{inProgress === 1 ? "" : "s"}
          </span>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">No project tasks assigned yet.</p>
      )}
    </article>
  );
}
