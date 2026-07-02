"use client";

import { Clock } from "lucide-react";
import {
  btnBrandCls,
  btnDangerCls,
  btnGhostCls,
  dashCardCls,
  dashLabelCls,
  dashSectionBodyCls,
  dashSectionHeadCls,
  dashSectionTitleCls,
  dashValueCls,
  statBoxCls,
} from "@/components/portal-dashboard/home/dashboardTokens";
import { SuccessBanner } from "@/components/portal-dashboard/home/DashboardMotion";
import { AttendanceCardSkeleton } from "@/components/portal-dashboard/home/skeletons/HomeDashboardSkeletons";

type HomeAttendanceCardProps = {
  loading: boolean;
  workingHoursDisplay: string;
  showLiveTimer: boolean;
  statusLabel: string;
  statusTone: string;
  attendanceError: string | null;
  hasCheckedInToday: boolean;
  hasCheckedOutToday: boolean;
  effectiveCheckIn: string | null | undefined;
  effectiveCheckOut: string | null | undefined;
  showLatestMachinePunch: boolean;
  latestMachinePunch: string | null;
  formatCheckIn: (v: string | null | undefined) => string;
  formatCheckOut: (v: string | null | undefined) => string;
  lateAfter: string;
  dayVisual: { boxClass: string; meaning: string };
  checkInSubmitting: boolean;
  checkOutSubmitting: boolean;
  logSubmitting: boolean;
  canLog: boolean;
  logSuccessMessage: string | null;
  attendanceActionError: string | null;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onLog: () => void;
  onDismissSuccess?: () => void;
  delayMs?: number;
};

export default function HomeAttendanceCard({
  loading,
  workingHoursDisplay,
  showLiveTimer,
  statusLabel,
  statusTone,
  attendanceError,
  hasCheckedInToday,
  hasCheckedOutToday,
  effectiveCheckIn,
  effectiveCheckOut,
  showLatestMachinePunch,
  latestMachinePunch,
  formatCheckIn,
  formatCheckOut,
  lateAfter,
  dayVisual,
  checkInSubmitting,
  checkOutSubmitting,
  logSubmitting,
  canLog,
  logSuccessMessage,
  attendanceActionError,
  onCheckIn,
  onCheckOut,
  onLog,
  onDismissSuccess,
  delayMs = 0,
}: HomeAttendanceCardProps) {
  if (loading) {
    return <AttendanceCardSkeleton />;
  }

  return (
    <section className={dashCardCls} style={{ animationDelay: `${delayMs}ms` }}>
      <div className={`${dashSectionHeadCls} border-0 bg-gradient-to-br from-sky-50/80 via-white to-white`}>
        <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm ring-1 ring-sky-100">
              <Clock className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className={dashSectionTitleCls}>Today&apos;s attendance</h2>
              <p className="text-[13px] text-slate-500">
                {showLiveTimer ? "Timer running" : "Working hours"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p
              className={`text-3xl font-semibold tabular-nums tracking-tight text-slate-900 sm:text-4xl ${
                showLiveTimer ? "timer-pulse" : ""
              }`}
            >
              {String(workingHoursDisplay)}
            </p>
            <span
              className={`mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusTone}`}
            >
              {showLiveTimer ? (
                <span className="badge-pulse-dot mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              ) : null}
              {statusLabel}
            </span>
          </div>
        </div>
      </div>

      <div className={dashSectionBodyCls}>
        {attendanceError ? (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">
            {attendanceError}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          <div className={statBoxCls()}>
            <p className={dashLabelCls}>Check in</p>
            <p className={`mt-1 ${dashValueCls}`}>
              {hasCheckedInToday ? formatCheckIn(effectiveCheckIn) : "—"}
            </p>
          </div>
          <div className={statBoxCls()}>
            <p className={dashLabelCls}>Check out</p>
            <p className={`mt-1 ${dashValueCls}`}>
              {hasCheckedOutToday ? formatCheckOut(effectiveCheckOut) : "—"}
            </p>
          </div>
          {showLatestMachinePunch ? (
            <div className={statBoxCls("sky")}>
              <p className={dashLabelCls}>Machine punch</p>
              <p className="mt-1 text-[14px] font-semibold text-sky-700">
                {formatCheckOut(latestMachinePunch)}
              </p>
            </div>
          ) : null}
          <div className={statBoxCls("amber")}>
            <p className={dashLabelCls}>Late after</p>
            <p className="mt-1 text-[14px] font-semibold text-amber-700">
              {lateAfter}
            </p>
          </div>
          <div className={statBoxCls()}>
            <p className={dashLabelCls}>Day status</p>
            <span
              className={`mt-1 inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold ${dayVisual.boxClass}`}
            >
              {dayVisual.meaning}
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onCheckIn}
            disabled={hasCheckedInToday || checkInSubmitting}
            className={btnBrandCls()}
          >
            {checkInSubmitting ? "Checking in…" : hasCheckedInToday ? "Checked in" : "Check in"}
          </button>
          <button
            type="button"
            onClick={onCheckOut}
            disabled={
              !hasCheckedInToday || hasCheckedOutToday || checkOutSubmitting
            }
            className={btnDangerCls()}
          >
            {checkOutSubmitting ? "Checking out…" : hasCheckedOutToday ? "Checked out" : "Check out"}
          </button>
          <button
            type="button"
            onClick={onLog}
            disabled={!canLog || logSubmitting}
            className={btnGhostCls()}
            title="Mark attendance log"
          >
            {logSubmitting ? "Saving…" : "Mark log"}
          </button>
        </div>

        {logSuccessMessage ? (
          <SuccessBanner message={logSuccessMessage} onDismiss={onDismissSuccess} />
        ) : null}
        {attendanceActionError ? (
          <p className="mt-2 text-[13px] text-red-600">{attendanceActionError}</p>
        ) : null}
      </div>
    </section>
  );
}
