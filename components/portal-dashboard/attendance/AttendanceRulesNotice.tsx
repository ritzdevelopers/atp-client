"use client";

import { Info } from "lucide-react";
import {
  ATTENDANCE_RULE_LABELS,
  formatLateLeaveExplanation,
} from "@/lib/attendanceRules";

type AttendanceRulesNoticeProps = {
  lateCount?: number;
  className?: string;
  compact?: boolean;
};

export default function AttendanceRulesNotice({
  lateCount,
  className = "",
  compact = false,
}: AttendanceRulesNoticeProps) {
  return (
    <div
      className={`rounded-xl border border-[#E4E7EC] bg-[#E8F4FB] p-4 ${className}`}
    >
      <div className="flex gap-3">
        <Info className="h-5 w-5 shrink-0 text-[#008CD3]" aria-hidden />
        <div className={`leading-relaxed text-[#4B5563] ${compact ? "text-[12px]" : "text-[13px]"}`}>
          <p className="font-medium text-[#1F2937]">Company attendance rules</p>
          <ul className={`mt-2 space-y-1 ${compact ? "text-[12px]" : ""}`}>
            {ATTENDANCE_RULE_LABELS.map((rule) => (
              <li key={rule.label}>
                {rule.label}: {rule.value}
              </li>
            ))}
          </ul>
          {lateCount != null ? (
            <p className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-[#1F2937]">
              <span className="font-medium">Why leave is counted: </span>
              {formatLateLeaveExplanation(lateCount)}
            </p>
          ) : null}
          <p className="mt-2 text-[#6B7280]">
            Sat/Sun are weekly off — absent is not counted on weekends without attendance.
          </p>
        </div>
      </div>
    </div>
  );
}
