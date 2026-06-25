"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DailyPoint = { day: number; hours: number; status?: string };

type ChartRow = {
  day: number;
  hours: number | null;
  status?: string;
};

function formatStatusLabel(status?: string) {
  const raw = String(status || "").trim();
  if (!raw) return "N/A";
  return raw.replace(/_/g, " ");
}

function formatMonthYearLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function HoursTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartRow }>;
}) {
  if (!active || !payload?.[0]?.payload) return null;
  const row = payload[0].payload;
  if (row.hours == null) return null;
  return (
    <div className="rounded-lg border border-[#E4E7EC] bg-white px-3 py-2 text-[12px] shadow-md">
      <p className="font-semibold text-[#1F2937]">
        Day {row.day} · {row.hours.toFixed(1)}h worked
      </p>
      <p className="text-[#6B7280]">{formatStatusLabel(row.status)}</p>
    </div>
  );
}

export default function DailyHoursRechartsChart({
  year,
  month,
  daysInMonth,
  points,
}: {
  year: number;
  month: number;
  daysInMonth: number;
  points: DailyPoint[];
}) {
  const chartData = useMemo(() => {
    const byDay = new Map(points.map((p) => [p.day, p]));
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const entry = byDay.get(day);
      return {
        day,
        hours: entry != null ? entry.hours : null,
        status: entry?.status,
      };
    });
  }, [points, daysInMonth]);

  const recorded = chartData.filter((row) => row.hours != null);
  if (recorded.length === 0) {
    return <p className="text-[13px] text-[#6B7280]">No daily hours for this period.</p>;
  }

  const avgHours = recorded.reduce((sum, row) => sum + (row.hours || 0), 0) / recorded.length;
  const peak = recorded.reduce(
    (best, row) => ((row.hours || 0) > (best.hours || 0) ? row : best),
    recorded[0],
  );
  const maxHours = Math.max(...recorded.map((row) => row.hours!), 0.5);
  const yMax = Math.max(1, Math.ceil(maxHours * 1.15 * 2) / 2);

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#F5F7FA] px-2.5 py-1.5 text-[12px]">
          <span className="text-[#9CA3AF]">Avg / day</span>
          <span className="font-semibold tabular-nums text-[#008CD3]">{avgHours.toFixed(1)}h</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#F5F7FA] px-2.5 py-1.5 text-[12px]">
          <span className="text-[#9CA3AF]">Peak</span>
          <span className="font-semibold tabular-nums text-[#0F9D58]">
            Day {peak.day} · {peak.hours!.toFixed(1)}h
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#F5F7FA] px-2.5 py-1.5 text-[12px]">
          <span className="text-[#9CA3AF]">Logged</span>
          <span className="font-semibold tabular-nums text-[#1F2937]">
            {recorded.length}/{daysInMonth} days
          </span>
        </span>
      </div>

      <div className="rounded-xl border border-[#EEF2F6] bg-gradient-to-b from-[#FAFCFE] to-white p-3 sm:p-4">
        <div className="h-[190px] w-full sm:h-[210px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 8, left: 0, bottom: 4 }}
            >
              <defs>
                <linearGradient id="dailyHoursRechartsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#008CD3" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="#008CD3" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EC" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: "#9CA3AF" }}
                tickLine={false}
                axisLine={{ stroke: "#E4E7EC" }}
                interval="preserveStartEnd"
                minTickGap={18}
              />
              <YAxis
                domain={[0, yMax]}
                tick={{ fontSize: 11, fill: "#9CA3AF" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}h`}
                width={40}
              />
              <Tooltip content={<HoursTooltip />} />
              <ReferenceLine
                y={avgHours}
                stroke="#E8710A"
                strokeDasharray="5 5"
                strokeWidth={1.5}
                ifOverflow="extendDomain"
              />
              <Area
                type="monotone"
                dataKey="hours"
                stroke="#008CD3"
                strokeWidth={2}
                fill="url(#dailyHoursRechartsFill)"
                connectNulls={false}
                dot={{ r: 3, fill: "#008CD3", stroke: "#fff", strokeWidth: 1.5 }}
                activeDot={{ r: 5, fill: "#008CD3", stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="mt-2 text-[11px] text-[#9CA3AF]">
        {formatMonthYearLabel(year, month)} · orange dashed line = daily average ({avgHours.toFixed(1)}
        h)
      </p>
    </div>
  );
}
