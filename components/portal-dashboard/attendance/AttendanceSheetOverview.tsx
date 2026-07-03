"use client";

import type { AttendanceSheetReport } from "@/services/attendanceHistory";
import { KpiStatCard, StackedMonthBar } from "./AttendanceAnalyticsCharts";
import type { KpiSegment } from "@/lib/attendanceMonthAnalytics";

type AttendanceSheetOverviewProps = {
  sheetReport: AttendanceSheetReport;
  kpiSegments: KpiSegment[];
  kpiTotal: number;
  compact?: boolean;
};

export default function AttendanceSheetOverview({
  sheetReport,
  kpiSegments,
  kpiTotal,
  compact = false,
}: AttendanceSheetOverviewProps) {
  const payrollCards: Array<{
    label: string;
    value: number;
    color: string;
    accent: string;
  }> = [
    {
      label: "Working days",
      value: sheetReport.working_days,
      color: "text-[#008CD3]",
      accent: "#008CD3",
    },
    {
      label: "Payable days",
      value: sheetReport.payable_days,
      color: "text-[#0F9D58]",
      accent: "#0F9D58",
    },
    {
      label: "Full day work",
      value: sheetReport.full_days,
      color: "text-[#047857]",
      accent: "#047857",
    },
    {
      label: "Absent",
      value: sheetReport.absent_days,
      color: "text-[#DC2626]",
      accent: "#DC2626",
    },
    {
      label: "Late marks",
      value: sheetReport.late_marks,
      color: "text-[#E8710A]",
      accent: "#E8710A",
    },
    {
      label: "Half days",
      value: sheetReport.half_days,
      color: "text-[#008CD3]",
      accent: "#008CD3",
    },
    {
      label: "Short leave",
      value: sheetReport.short_leaves,
      color: "text-[#F9A825]",
      accent: "#F9A825",
    },
    {
      label: "Paid leaves",
      value: sheetReport.paid_leaves,
      color: "text-[#7C3AED]",
      accent: "#7C3AED",
    },
    {
      label: "Weekly offs",
      value: sheetReport.weekly_offs ?? sheetReport.weekly_off_days ?? 0,
      color: "text-[#6B7280]",
      accent: "#9CA3AF",
    },
    {
      label: "Comp off",
      value: sheetReport.comp_off_balance,
      color: "text-[#0F766E]",
      accent: "#0F766E",
    },
    {
      label: "Late deduct",
      value: sheetReport.late_leave_deduction,
      color: "text-[#BE185D]",
      accent: "#BE185D",
    },
  ];

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-lg border border-[#E4E7EC] bg-gradient-to-br from-[#008CD3] to-[#0070AA] px-3 py-2 text-white shadow-sm">
        <div className="grid grid-cols-4 gap-2">
          <div className="min-w-0">
            <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-white/70">
              Payable
            </p>
            <p className="text-lg font-bold tabular-nums leading-tight">
              {sheetReport.payable_days}
            </p>
          </div>
          <div className="min-w-0">
            <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-white/70">
              Working
            </p>
            <p className="text-lg font-bold tabular-nums leading-tight">
              {sheetReport.working_days}
            </p>
          </div>
          <div className="min-w-0">
            <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-white/70">
              Hours
            </p>
            <p className="text-lg font-bold tabular-nums leading-tight">
              {sheetReport.total_working_hours.toFixed(1)}h
            </p>
          </div>
          <div className="min-w-0">
            <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-white/70">
              Calendar
            </p>
            <p className="text-lg font-bold tabular-nums leading-tight">
              {sheetReport.calendar_days_in_month ?? "—"}
            </p>
          </div>
        </div>
        {!compact ? (
          <p className="mt-1.5 text-[10px] leading-snug text-white/80">
            Working + Paid leaves + Weekly offs + Comp off − Late deduction
          </p>
        ) : null}
      </div>

      {!compact ? (
        <div className="rounded-lg border border-[#E4E7EC] bg-white px-3 py-2 shadow-sm">
          <p className="text-[12px] font-semibold text-[#1F2937]">Month breakdown</p>
          <div className="mt-2">
            <StackedMonthBar segments={kpiSegments} total={kpiTotal} />
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {payrollCards.map((card) => (
          <KpiStatCard
            key={card.label}
            label={card.label}
            value={card.value}
            color={card.color}
            bg="bg-white"
            accent={card.accent}
            dense
          />
        ))}
      </div>
    </div>
  );
}
