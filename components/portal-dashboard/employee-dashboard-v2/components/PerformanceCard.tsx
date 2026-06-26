"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { localYmdFromAttendanceValue } from "@/lib/attendanceDates";
import type { AttendanceHistoryRow } from "../types";
import { cardBase, cardPadding, cardTitle, sectionLabel } from "../cardStyles";

type PerformanceCardProps = {
  history: AttendanceHistoryRow[];
};

export default function PerformanceCard({ history }: PerformanceCardProps) {
  const { chartData, avgHours } = useMemo(() => {
    const ref = new Date();
    const year = ref.getFullYear();
    const month = ref.getMonth();
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const byDay = new Map<number, number>();
    for (const row of history ?? []) {
      const ymd =
        localYmdFromAttendanceValue(row.attendance_date) ??
        localYmdFromAttendanceValue(row.check_in);
      if (!ymd?.startsWith(prefix)) continue;
      const day = Number(ymd.slice(8, 10));
      const hours = Number(row.working_time);
      if (!Number.isNaN(hours) && hours > 0) byDay.set(day, hours);
    }

    const data = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      return { day, hours: byDay.get(day) ?? 0 };
    });

    const values = [...byDay.values()];
    const avg = values.length
      ? values.reduce((a, b) => a + b, 0) / values.length
      : 0;

    return { chartData: data, avgHours: avg };
  }, [history]);

  const monthLabel = new Date().toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <article className={`${cardBase} ${cardPadding}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={sectionLabel}>Performance</p>
          <h2 className={`${cardTitle} mt-1`}>Working hours — {monthLabel}</h2>
          <p className="mt-1 text-sm text-slate-500">
            Avg.{" "}
            <span className="font-semibold text-indigo-600">
              {avgHours.toFixed(1)}h
            </span>{" "}
            per day
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <BarChart3 className="h-5 w-5" aria-hidden />
        </div>
      </div>

      <div className="mt-5 h-52 w-full sm:h-60">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="hoursGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const row = payload[0].payload as { day: number; hours: number };
                return (
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
                    <p className="font-semibold text-slate-800">Day {row.day}</p>
                    <p className="text-slate-500">{row.hours.toFixed(1)} hours</p>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="hours"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#hoursGradient)"
              dot={false}
              activeDot={{ r: 4, fill: "#4f46e5" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
