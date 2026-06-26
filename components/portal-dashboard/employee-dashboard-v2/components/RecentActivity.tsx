"use client";

import { Activity, Clock } from "lucide-react";
import { formatAttendanceTimeLocal } from "@/lib/attendanceDates";
import type { AttendanceHistoryRow } from "../types";
import { badgeBase, cardBase, cardPadding, cardTitle, sectionLabel } from "../cardStyles";

type RecentActivityProps = {
  history: AttendanceHistoryRow[];
};

function statusBadge(status?: string | null) {
  const s = (status || "").toLowerCase();
  if (s.includes("absent")) return `${badgeBase} bg-rose-100 text-rose-700`;
  if (s.includes("present") || s.includes("full_day"))
    return `${badgeBase} bg-emerald-100 text-emerald-700`;
  if (s.includes("half")) return `${badgeBase} bg-amber-100 text-amber-700`;
  return `${badgeBase} bg-slate-100 text-slate-600`;
}

export default function RecentActivity({ history }: RecentActivityProps) {
  const recent = [...(history ?? [])]
    .sort((a, b) => {
      const da = a.attendance_date || a.check_in || "";
      const db = b.attendance_date || b.check_in || "";
      return db.localeCompare(da);
    })
    .slice(0, 6);

  return (
    <article className={`${cardBase} ${cardPadding}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={sectionLabel}>Activity</p>
          <h2 className={`${cardTitle} mt-1`}>Recent attendance</h2>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
          <Activity className="h-5 w-5" aria-hidden />
        </div>
      </div>

      <ul className="mt-5 space-y-0 divide-y divide-slate-100">
        {recent.length === 0 ? (
          <li className="py-8 text-center text-sm text-slate-500">
            No attendance records yet.
          </li>
        ) : (
          recent.map((row, index) => {
            const dateLabel = row.attendance_date
              ? new Date(row.attendance_date + "T12:00:00").toLocaleDateString(
                  undefined,
                  { weekday: "short", month: "short", day: "numeric" },
                )
              : "—";
            const timeRange = [
              formatAttendanceTimeLocal(row.check_in),
              formatAttendanceTimeLocal(row.check_out),
            ]
              .filter((t) => t !== "—")
              .join(" – ");

            return (
              <li
                key={String(row.id ?? row.attendance_date ?? index)}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                  <Clock className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">{dateLabel}</p>
                  <p className="text-xs text-slate-500">
                    {timeRange || "No punch recorded"}
                  </p>
                </div>
                <span className={statusBadge(row.attendance_status)}>
                  {(row.attendance_status || "—").replace(/_/g, " ")}
                </span>
              </li>
            );
          })
        )}
      </ul>
    </article>
  );
}
