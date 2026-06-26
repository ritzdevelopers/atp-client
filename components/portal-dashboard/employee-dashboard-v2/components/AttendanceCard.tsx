"use client";

import { Fingerprint, LogIn, LogOut } from "lucide-react";
import {
  formatAttendanceTimeLocal,
  getAttendanceDayVisual,
} from "@/lib/attendanceDates";
import type { AttendanceHistoryRow } from "../types";
import { badgeBase, cardBase, cardPadding, cardTitle, sectionLabel } from "../cardStyles";

type AttendanceCardProps = {
  todayRecord?: AttendanceHistoryRow;
  weekDays: Array<{
    label: string;
    ymd: string;
    status?: string | null;
    isToday?: boolean;
  }>;
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
  workingHoursDisplay: string;
  showLiveTimer?: boolean;
  checkInSubmitting?: boolean;
  checkOutSubmitting?: boolean;
  actionError?: string | null;
  onCheckIn: () => void;
  onCheckOut: () => void;
};

export default function AttendanceCard({
  todayRecord,
  weekDays,
  hasCheckedIn,
  hasCheckedOut,
  workingHoursDisplay,
  showLiveTimer,
  checkInSubmitting,
  checkOutSubmitting,
  actionError,
  onCheckIn,
  onCheckOut,
}: AttendanceCardProps) {
  return (
    <article className={`${cardBase} ${cardPadding}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={sectionLabel}>Attendance</p>
          <h2 className={`${cardTitle} mt-1`}>Today&apos;s overview</h2>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <Fingerprint className="h-5 w-5" aria-hidden />
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-emerald-50/80 p-3 ring-1 ring-emerald-100">
          <p className="text-[11px] font-semibold uppercase text-emerald-700/70">
            Check in
          </p>
          <p className="mt-1 text-lg font-bold tabular-nums text-emerald-900">
            {formatAttendanceTimeLocal(todayRecord?.check_in)}
          </p>
        </div>
        <div className="rounded-xl bg-rose-50/80 p-3 ring-1 ring-rose-100">
          <p className="text-[11px] font-semibold uppercase text-rose-700/70">
            Check out
          </p>
          <p className="mt-1 text-lg font-bold tabular-nums text-rose-900">
            {formatAttendanceTimeLocal(todayRecord?.check_out)}
          </p>
        </div>
        <div className="rounded-xl bg-sky-50/80 p-3 ring-1 ring-sky-100">
          <p className="text-[11px] font-semibold uppercase text-sky-700/70">
            {showLiveTimer ? "Working (live)" : "Working hours"}
          </p>
          <p className="mt-1 text-lg font-bold tabular-nums text-sky-900">
            {workingHoursDisplay}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onCheckIn}
          disabled={hasCheckedIn || checkInSubmitting}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LogIn className="h-4 w-4" aria-hidden />
          {checkInSubmitting ? "Marking…" : hasCheckedIn ? "Checked in" : "Check in"}
        </button>
        <button
          type="button"
          onClick={onCheckOut}
          disabled={hasCheckedOut || checkOutSubmitting || !hasCheckedIn}
          className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          {checkOutSubmitting
            ? "Processing…"
            : hasCheckedOut
              ? "Checked out"
              : "Check out"}
        </button>
      </div>

      {actionError ? (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
          {actionError}
        </p>
      ) : null}

      <div className="mt-6">
        <p className={sectionLabel}>This week</p>
        <div className="mt-3 grid grid-cols-7 gap-1.5 sm:gap-2">
          {weekDays.map((day) => {
            const visual = getAttendanceDayVisual(day.status);
            return (
              <div key={day.ymd} className="text-center">
                <p className="text-[10px] font-medium text-slate-400">{day.label}</p>
                <div
                  className={`mt-1 flex h-10 items-center justify-center rounded-lg border text-[11px] font-bold transition ${visual.boxClass} ${day.isToday ? "ring-2 ring-indigo-400 ring-offset-1" : ""}`}
                  title={visual.meaning}
                >
                  {day.ymd.slice(8)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {todayRecord?.attendance_status ? (
        <div className="mt-4">
          <span className={`${badgeBase} bg-indigo-50 text-indigo-700`}>
            Status: {todayRecord.attendance_status.replace(/_/g, " ")}
          </span>
        </div>
      ) : null}
    </article>
  );
}
