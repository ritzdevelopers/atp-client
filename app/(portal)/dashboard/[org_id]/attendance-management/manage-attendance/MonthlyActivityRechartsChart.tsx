"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type MonthItem = { month: string; count: number };

type ChartRow = {
  month: string;
  label: string;
  count: number;
  prevCount: number | null;
  delta: number | null;
  deltaPct: number | null;
  vsAvgLabel: string;
  isPeak: boolean;
  isLatest: boolean;
};

function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-");
  if (!m) return monthKey;
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(undefined, {
    month: "short",
    year: "2-digit",
  });
}

function MonthActivityTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartRow }>;
}) {
  if (!active || !payload?.[0]?.payload) return null;
  const row = payload[0].payload;
  return (
    <div className="max-w-[220px] rounded-lg border border-[#E4E7EC] bg-white px-3 py-2.5 text-[12px] shadow-md">
      <p className="font-semibold text-[#1F2937]">{row.label}</p>
      <p className="mt-1 text-[#008CD3]">
        <span className="font-bold tabular-nums">{row.count}</span> attendance record
        {row.count === 1 ? "" : "s"}
      </p>
      <p className="mt-1 text-[#6B7280]">{row.vsAvgLabel}</p>
      {row.delta != null && row.prevCount != null ? (
        <p className="mt-1 text-[#6B7280]">
          vs previous month:{" "}
          <span
            className={`font-semibold tabular-nums ${
              row.delta > 0 ? "text-[#0F9D58]" : row.delta < 0 ? "text-[#D93025]" : "text-[#6B7280]"
            }`}
          >
            {row.delta > 0 ? "+" : ""}
            {row.delta}
            {row.deltaPct != null ? ` (${row.deltaPct > 0 ? "+" : ""}${row.deltaPct}%)` : ""}
          </span>
        </p>
      ) : (
        <p className="mt-1 text-[#9CA3AF]">First month in loaded range</p>
      )}
      {row.isPeak ? (
        <p className="mt-1 text-[11px] font-medium text-[#0F9D58]">Highest activity month</p>
      ) : null}
    </div>
  );
}

export default function MonthlyActivityRechartsChart({
  items,
}: {
  items: MonthItem[];
}) {
  const chartData = useMemo(() => {
    if (items.length === 0) return [];

    const total = items.reduce((sum, item) => sum + item.count, 0);
    const avg = total / items.length;
    const peakCount = Math.max(...items.map((item) => item.count));
    const latestMonth = items[items.length - 1]?.month;

    return items.map((item, index) => {
      const prev = index > 0 ? items[index - 1] : null;
      const delta = prev != null ? item.count - prev.count : null;
      const deltaPct =
        prev != null && prev.count > 0
          ? Math.round(((item.count - prev.count) / prev.count) * 100)
          : null;
      const diffFromAvg = item.count - avg;
      const vsAvgLabel =
        Math.abs(diffFromAvg) < 0.05
          ? "Matches monthly average"
          : diffFromAvg > 0
            ? `${diffFromAvg.toFixed(1)} above monthly average`
            : `${Math.abs(diffFromAvg).toFixed(1)} below monthly average`;

      return {
        month: item.month,
        label: formatMonthLabel(item.month),
        count: item.count,
        prevCount: prev?.count ?? null,
        delta,
        deltaPct,
        vsAvgLabel,
        isPeak: item.count === peakCount && peakCount > 0,
        isLatest: item.month === latestMonth,
      };
    });
  }, [items]);

  if (chartData.length === 0) {
    return <p className="text-[13px] text-[#6B7280]">No trend data available.</p>;
  }

  const totalRecords = chartData.reduce((sum, row) => sum + row.count, 0);
  const avgCount = totalRecords / chartData.length;
  const peak = chartData.reduce((best, row) => (row.count > best.count ? row : best), chartData[0]);
  const latest = chartData[chartData.length - 1];
  const momChange = latest.deltaPct;

  const yMax = Math.max(...chartData.map((row) => row.count), 1);
  const yDomainMax = Math.max(Math.ceil(yMax * 1.2), 1);

  const insight =
    chartData.length === 1
      ? `${latest.label} has ${latest.count} record${latest.count === 1 ? "" : "s"} in the loaded dataset.`
      : `${peak.label} is the busiest month (${peak.count} records). Latest month ${latest.label} is ${
          latest.count >= avgCount ? "at or above" : "below"
        } the ${avgCount.toFixed(1)} record/month average.`;

  return (
    <div className="w-full">
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg bg-[#F5F7FA] px-2.5 py-2 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
            Total records
          </p>
          <p className="text-[15px] font-bold tabular-nums text-[#1F2937]">{totalRecords}</p>
        </div>
        <div className="rounded-lg bg-[#F5F7FA] px-2.5 py-2 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
            Avg / month
          </p>
          <p className="text-[15px] font-bold tabular-nums text-[#008CD3]">
            {avgCount.toFixed(1)}
          </p>
        </div>
        <div className="rounded-lg bg-[#F5F7FA] px-2.5 py-2 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
            Busiest month
          </p>
          <p className="truncate text-[13px] font-bold text-[#0F9D58]">
            {peak.label} · {peak.count}
          </p>
        </div>
        <div className="rounded-lg bg-[#F5F7FA] px-2.5 py-2 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
            Latest change
          </p>
          <p
            className={`text-[15px] font-bold tabular-nums ${
              momChange == null
                ? "text-[#6B7280]"
                : momChange >= 0
                  ? "text-[#0F9D58]"
                  : "text-[#D93025]"
            }`}
          >
            {momChange == null ? "—" : `${momChange >= 0 ? "+" : ""}${momChange}%`}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[#EEF2F6] bg-gradient-to-b from-[#FAFCFE] to-white p-3 sm:p-4">
        <div className="h-[200px] w-full sm:h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 18, right: 8, left: 0, bottom: 4 }}
              barCategoryGap="20%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EC" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#9CA3AF" }}
                tickLine={false}
                axisLine={{ stroke: "#E4E7EC" }}
                interval={0}
                angle={chartData.length > 6 ? -25 : 0}
                textAnchor={chartData.length > 6 ? "end" : "middle"}
                height={chartData.length > 6 ? 48 : 28}
              />
              <YAxis
                allowDecimals={false}
                domain={[0, yDomainMax]}
                tick={{ fontSize: 11, fill: "#9CA3AF" }}
                tickLine={false}
                axisLine={false}
                width={32}
              />
              <Tooltip content={<MonthActivityTooltip />} cursor={{ fill: "#008CD3", opacity: 0.06 }} />
              <ReferenceLine
                y={avgCount}
                stroke="#7B1FA2"
                strokeDasharray="5 5"
                strokeWidth={1.5}
                label={{
                  value: `Avg ${avgCount.toFixed(1)}`,
                  position: "insideTopRight",
                  fill: "#7B1FA2",
                  fontSize: 10,
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={52}>
                {chartData.map((row) => (
                  <Cell
                    key={row.month}
                    fill={row.isPeak ? "#0F9D58" : row.isLatest ? "#008CD3" : "#6BB8E3"}
                  />
                ))}
                <LabelList dataKey="count" position="top" fontSize={11} fill="#374151" fontWeight={600} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="mt-2 text-[12px] leading-relaxed text-[#4B5563]">{insight}</p>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-[#9CA3AF]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#6BB8E3]" /> Other months
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#008CD3]" /> Latest month
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#0F9D58]" /> Busiest month
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 border-t border-dashed border-[#7B1FA2]" /> Monthly average
        </span>
      </div>
    </div>
  );
}
