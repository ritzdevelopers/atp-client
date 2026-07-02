"use client";

import { Fingerprint, LogIn, LogOut, Radio } from "lucide-react";
import { useLivePunchFeed } from "@/hooks/useLivePunchFeed";
import { dashPanelCls } from "@/components/portal-dashboard/home/dashboardTokens";
import {
  formatAttendanceTimeLocal,
  getTodayLocalYmd,
} from "@/lib/attendanceDates";

type BiometricLiveAttendanceFeedProps = {
  orgId: string;
  className?: string;
  compact?: boolean;
  embedded?: boolean;
};

function eventLabel(direction: string | undefined): string {
  if (direction === "out") return "Check-out";
  if (direction === "in") return "Check-in";
  return "Attendance";
}

export default function BiometricLiveAttendanceFeed({
  orgId,
  className = "",
  compact = false,
  embedded = false,
}: BiometricLiveAttendanceFeedProps) {
  const { events } = useLivePunchFeed(orgId);
  const today = getTodayLocalYmd();

  const visibleEvents = events.filter((e) => e.punch_date === today);

  const shellClass = compact
    ? `rounded-xl border border-slate-200 bg-white ${className}`
    : embedded
      ? `flex h-full min-h-0 flex-col overflow-hidden bg-slate-50/50 ${className}`
      : `${dashPanelCls} ${className}`;

  return (
    <aside className={shellClass} aria-label="Live biometric attendance feed">
      <div className="shrink-0 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Biometric feed
            </p>
            <p className="mt-0.5 text-[14px] font-semibold text-slate-900">
              Live machine punches
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
            <Radio className="h-3 w-3" />
            Live
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
        {visibleEvents.length === 0 ? (
          <p className="px-4 py-10 text-center text-[12px] text-slate-400">
            Waiting for biometric check-ins and check-outs…
          </p>
        ) : (
          <ul className="divide-y divide-[#F1F3F6]">
            {visibleEvents.map((event) => {
              const name =
                event.portal_user_name?.trim() ||
                event.employee_name?.trim() ||
                `Code ${event.employee_code}`;
              const isCheckOut = event.direction === "out";
              const time = formatAttendanceTimeLocal(event.punch_at);

              return (
                <li
                  key={event.device_log_id}
                  className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
                >
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      isCheckOut
                        ? "bg-orange-50 text-orange-600"
                        : "bg-emerald-50 text-emerald-600"
                    }`}
                  >
                    {isCheckOut ? (
                      <LogOut className="h-3.5 w-3.5" />
                    ) : (
                      <LogIn className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-slate-900">
                      {name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {eventLabel(event.direction)} · {time}
                    </p>
                    <p className="truncate text-[10px] text-slate-400">
                      <Fingerprint className="mr-0.5 inline h-3 w-3" />
                      {event.employee_code}
                      {event.device_id ? ` · Device ${event.device_id}` : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
