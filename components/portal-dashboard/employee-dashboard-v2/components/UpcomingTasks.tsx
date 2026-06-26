"use client";

import Link from "next/link";
import { CheckCircle2, ChevronRight, ClipboardList, Flag } from "lucide-react";
import type { EmployeeTaskRow } from "../types";
import { badgeBase, cardBase, cardPadding, cardTitle, sectionLabel } from "../cardStyles";

type UpcomingTasksProps = {
  tasks: EmployeeTaskRow[];
  orgId: string;
};

const priorityStyles = {
  high: "bg-rose-100 text-rose-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-600",
} as const;

const statusStyles = {
  pending: "bg-slate-100 text-slate-600",
  received: "bg-sky-100 text-sky-700",
  "in-progress": "bg-indigo-100 text-indigo-700",
  delay: "bg-orange-100 text-orange-700",
  completed: "bg-emerald-100 text-emerald-700",
} as const;

export default function UpcomingTasks({ tasks, orgId }: UpcomingTasksProps) {
  const todayTasks = tasks.filter((t) => t.task_status !== "completed").slice(0, 5);
  const tasksHref = `/user-dashboard/${encodeURIComponent(orgId)}/tasks-management`;

  return (
    <article className={`${cardBase} ${cardPadding}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={sectionLabel}>Tasks</p>
          <h2 className={`${cardTitle} mt-1`}>Today&apos;s priorities</h2>
        </div>
        <Link
          href={tasksHref}
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 transition hover:text-indigo-800"
        >
          View all
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      <ul className="mt-5 space-y-3">
        {todayTasks.length === 0 ? (
          <li className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" aria-hidden />
            <p className="mt-2 text-sm font-medium text-slate-700">All caught up!</p>
            <p className="text-xs text-slate-500">No pending tasks for today.</p>
          </li>
        ) : (
          todayTasks.map((task) => (
            <li
              key={task.task_id}
              className="group rounded-xl border border-slate-100 p-3 transition hover:border-indigo-100 hover:shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <ClipboardList className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800 group-hover:text-indigo-700">
                    {task.task_title}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Due{" "}
                    {new Date(task.task_deadline).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span
                      className={`${badgeBase} ${priorityStyles[task.task_priority]}`}
                    >
                      <Flag className="mr-1 h-3 w-3" aria-hidden />
                      {task.task_priority}
                    </span>
                    <span
                      className={`${badgeBase} ${statusStyles[task.task_status]}`}
                    >
                      {task.task_status.replace("-", " ")}
                    </span>
                  </div>
                </div>
              </div>
            </li>
          ))
        )}
      </ul>
    </article>
  );
}
