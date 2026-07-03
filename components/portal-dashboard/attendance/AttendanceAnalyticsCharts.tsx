"use client";

import {
  calendarHeatmapClass,
  formatCalculatedStatusLabel,
} from "@/lib/attendanceRules";
import {
  calculatedStatusChartColor,
  type KpiSegment,
  type StatusDistributionItem,
} from "@/lib/attendanceMonthAnalytics";

function buildConicGradient(
  segments: { count: number; color: string }[],
  total: number,
): string {
  if (total <= 0) return "conic-gradient(#E4E7EC 0% 100%)";
  let acc = 0;
  const parts = segments.map((s) => {
    const pct = (s.count / total) * 100;
    const start = acc;
    acc += pct;
    return `${s.color} ${start}% ${acc}%`;
  });
  return `conic-gradient(${parts.join(", ")})`;
}

function formatMonthYearLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

type KpiStatCardProps = {
  label: string;
  value: number;
  color: string;
  bg: string;
  accent: string;
  share?: number;
  dense?: boolean;
};

export function KpiStatCard({
  label,
  value,
  color,
  bg,
  accent,
  share,
  dense = false,
}: KpiStatCardProps) {
  return (
    <div
      className={`border border-[#E4E7EC] shadow-sm ${dense ? "rounded-lg p-2" : "rounded-xl p-4"} ${bg}`}
    >
      <p
        className={`truncate font-semibold uppercase tracking-wide text-[#6B7280] ${
          dense ? "text-[9px] leading-tight" : "text-[11px]"
        }`}
      >
        {label}
      </p>
      <p
        className={`font-bold tabular-nums ${dense ? "mt-0.5 text-base" : "mt-1 text-2xl sm:text-3xl"} ${color}`}
      >
        {value}
      </p>
      {!dense && share != null && share > 0 ? (
        <div className="mt-2.5">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/70">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${share}%`, backgroundColor: accent }}
            />
          </div>
          <p className="mt-1 text-[11px] font-medium text-[#6B7280]">{share}% of month</p>
        </div>
      ) : null}
    </div>
  );
}

export function AttendanceDonutChart({
  segments,
  total,
  centerLabel,
  centerValue,
  size = 140,
}: {
  segments: KpiSegment[];
  total: number;
  centerLabel: string;
  centerValue: string;
  size?: number;
}) {
  const active = segments.filter((s) => s.count > 0);
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <div
          className="h-full w-full rounded-full shadow-inner"
          style={{ background: buildConicGradient(active, total) }}
          aria-hidden
        />
        <div className="absolute inset-[18%] flex flex-col items-center justify-center rounded-full bg-white text-center shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
            {centerLabel}
          </p>
          <p className="text-xl font-bold tabular-nums text-[#1F2937]">{centerValue}</p>
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-2 sm:flex-1">
        {active.map((seg) => (
          <li key={seg.key} className="flex items-center justify-between gap-2 text-[13px]">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: seg.color }}
              />
              <span className="truncate font-medium text-[#1F2937]">{seg.label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-[#6B7280]">
              {seg.count} ({total > 0 ? Math.round((seg.count / total) * 100) : 0}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StackedMonthBar({ segments, total }: { segments: KpiSegment[]; total: number }) {
  if (total <= 0) {
    return (
      <div className="h-3 overflow-hidden rounded-full bg-[#F5F7FA]">
        <div className="h-full w-full bg-[#E4E7EC]" />
      </div>
    );
  }
  return (
    <div className="flex h-3 overflow-hidden rounded-full bg-[#F5F7FA]">
      {segments
        .filter((s) => s.count > 0)
        .map((seg) => (
          <div
            key={seg.key}
            className="h-full transition-all duration-500"
            style={{
              width: `${(seg.count / total) * 100}%`,
              backgroundColor: seg.color,
            }}
            title={`${seg.label}: ${seg.count}`}
          />
        ))}
    </div>
  );
}

export function MonthCalendarHeatmap({
  year,
  month,
  cells,
}: {
  year: number;
  month: number;
  cells: {
    day: number | null;
    status?: string;
    isSunday?: boolean;
    isWeekend?: boolean;
  }[];
}) {
  const weekdays = ["S", "M", "T", "W", "T", "F", "S"];
  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-[#9CA3AF]">
        {weekdays.map((d, i) => (
          <span key={`${d}-${i}`}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) =>
          cell.day == null ? (
            <div key={`empty-${i}`} className="aspect-square" />
          ) : (
            <div
              key={`day-${cell.day}`}
              title={`Day ${cell.day}: ${formatCalculatedStatusLabel(cell.status)}`}
              className={`flex aspect-square items-center justify-center rounded-md text-[11px] font-semibold tabular-nums ${calendarHeatmapClass(cell.status, cell.isWeekend ?? cell.isSunday)}`}
            >
              {cell.day}
            </div>
          ),
        )}
      </div>
      <p className="mt-3 text-[12px] font-medium text-[#1F2937]">
        {formatMonthYearLabel(year, month)}
      </p>
    </div>
  );
}

export function EnhancedStatusBars({ items }: { items: StatusDistributionItem[] }) {
  if (items.length === 0) {
    return <p className="text-[13px] text-[#6B7280]">No status data for this period.</p>;
  }
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.status}>
          <div className="mb-1 flex items-center justify-between gap-2 text-[13px]">
            <span className="flex min-w-0 items-center gap-2 font-medium text-[#1F2937]">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: calculatedStatusChartColor(item.status) }}
              />
              <span className="truncate capitalize">
                {formatCalculatedStatusLabel(item.status)}
              </span>
            </span>
            <span className="shrink-0 tabular-nums text-[#6B7280]">
              {item.count} ({item.percentage}%)
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[#F5F7FA]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${item.percentage}%`,
                backgroundColor: calculatedStatusChartColor(item.status),
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
