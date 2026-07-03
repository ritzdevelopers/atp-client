import type {
  AttendanceExportResponse,
  AttendanceHistoryRow,
  AttendanceSheetReport,
} from "@/services/attendanceHistory";
import {
  buildMonthAttendanceView,
  formatCalculatedStatusLabel,
  type CalculatedAttendanceStatus,
} from "@/lib/attendanceRules";

export type KpiSegment = { key: string; label: string; count: number; color: string };

export type StatusDistributionItem = {
  status: string;
  count: number;
  percentage: number;
};

export type MonthAnalyticsResult = {
  monthAttendance: ReturnType<typeof buildMonthAttendanceView>;
  monthlyKpi: ReturnType<typeof buildMonthAttendanceView>["summary"];
  monthAnalytics: {
    totalMinutes: number;
    totalHours: number;
    daysWithRecord: number;
    daysInMonth: number;
    kpiTotal: number;
    attendanceRate: number;
    onTimeRate: number;
    dailyHours: { day: number; hours: number; status?: string }[];
    maxDailyHours: number;
    calendarCells: ReturnType<typeof buildMonthAttendanceView>["calendarCells"];
  };
  kpiSegments: KpiSegment[];
  statusDistribution: StatusDistributionItem[];
  monthlyTrend: { month: string; count: number }[];
};

function toMonthKey(dateValue: string | undefined): string | null {
  if (!dateValue) return null;
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function workingMinutes(value: string | number | undefined): number {
  const n = Number(value);
  return Number.isNaN(n) || n < 0 ? 0 : n;
}

export function mapOwnRowsToHistoryRows(
  rows: Array<{
    date?: string | null;
    check_in?: string | null;
    check_out?: string | null;
    status?: string | null;
    working_time?: string | number | null;
  }>,
): AttendanceHistoryRow[] {
  return rows.map((row) => ({
    attendance_date: row.date ?? undefined,
    check_in: row.check_in ?? undefined,
    check_out: row.check_out ?? undefined,
    attendance_status: row.status ?? undefined,
    working_time: row.working_time ?? undefined,
  }));
}

export function computeMonthAnalytics(
  year: number,
  month: number,
  attendanceRows: AttendanceHistoryRow[],
): MonthAnalyticsResult {
  const monthAttendance = buildMonthAttendanceView(year, month, attendanceRows);
  const monthlyKpi = monthAttendance.summary;
  const appliedMonthKey = `${year}-${String(month).padStart(2, "0")}`;
  const dayMap = new Map<string, { minutes: number; status?: string }>();

  for (const row of attendanceRows) {
    const dateVal = row.attendance_date;
    const rowMonth = toMonthKey(dateVal);
    if (!rowMonth || rowMonth !== appliedMonthKey || !dateVal) continue;
    const d = new Date(dateVal);
    if (Number.isNaN(d.getTime())) continue;
    const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const mins = workingMinutes(row.working_time);
    const calculatedStatus = monthAttendance.statusByDate.get(dayKey);
    dayMap.set(dayKey, {
      minutes: mins,
      status: calculatedStatus ?? row.attendance_status,
    });
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const kpiTotal = monthAttendance.summary.kpiTotal;
  const attendanceRate =
    kpiTotal > 0
      ? Math.round(
          ((monthlyKpi.daysPresent) / kpiTotal) *
            100,
        )
      : 0;
  const onTimeRate =
    kpiTotal > 0
      ? Math.round(((monthlyKpi.present + monthlyKpi.presentFullDay) / kpiTotal) * 100)
      : 0;

  const dailyHours = Array.from(dayMap.entries())
    .map(([key, entry]) => ({
      day: Number(key.split("-")[2]),
      hours: entry.minutes / 60,
      status: entry.status,
    }))
    .sort((a, b) => a.day - b.day);

  const maxDailyHours = dailyHours.reduce((max, p) => Math.max(max, p.hours), 0);
  const totalMinutes = monthAttendance.summary.totalWorkingMinutes;

  const monthAnalytics = {
    totalMinutes,
    totalHours: totalMinutes / 60,
    daysWithRecord: dayMap.size,
    daysInMonth,
    kpiTotal,
    attendanceRate,
    onTimeRate,
    dailyHours,
    maxDailyHours,
    calendarCells: monthAttendance.calendarCells,
  };

  const onTimeDays = monthlyKpi.present + monthlyKpi.presentFullDay;

  const kpiSegments: KpiSegment[] = [
    ...(onTimeDays > 0
      ? [{ key: "onTime", label: "On-time", count: onTimeDays, color: "#0F9D58" }]
      : []),
    { key: "late", label: "Late", count: monthlyKpi.late, color: "#E8710A" },
    {
      key: "lateDerivedLeaves",
      label: "Leave (from lates)",
      count: monthlyKpi.lateDerivedLeaves,
      color: "#BE185D",
    },
    {
      key: "absent",
      label: "Absent (incl. leave from lates)",
      count: monthlyKpi.totalAbsentWithLateLeaves,
      color: "#DC2626",
    },
    { key: "halfDay", label: "Half day", count: monthlyKpi.halfDay, color: "#008CD3" },
    {
      key: "shortLeave",
      label: "Short leave",
      count: monthlyKpi.shortLeave,
      color: "#F9A825",
    },
  ].filter((s) => s.count > 0);

  const statusCounts = new Map<string, number>();
  for (const day of monthAttendance.days) {
    if (
      day.is_future ||
      day.attendance_status === "weekly_off" ||
      (day.is_weekend && !day.check_in)
    ) {
      continue;
    }
    const status = String(day.attendance_status || "absent");
    statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
  }
  const statusDistribution = Array.from(statusCounts.entries())
    .map(([status, count]) => ({
      status,
      count,
      percentage: Math.round((count / (kpiTotal || 1)) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  const trendBucket = new Map<string, number>();
  for (const row of attendanceRows) {
    const monthKey = toMonthKey(row.attendance_date);
    if (!monthKey) continue;
    trendBucket.set(monthKey, (trendBucket.get(monthKey) || 0) + 1);
  }
  const monthlyTrend = Array.from(trendBucket.entries())
    .map(([m, count]) => ({ month: m, count }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    monthAttendance,
    monthlyKpi,
    monthAnalytics,
    kpiSegments,
    statusDistribution,
    monthlyTrend,
  };
}

export function normalizeCalculatedStatus(
  status: string | undefined,
): CalculatedAttendanceStatus | "other" {
  const value = String(status || "").trim().toLowerCase();
  if (!value) return "other";
  if (value === "present_full_day") return "present_full_day";
  if (value === "short_leave") return "short_leave";
  if (value === "half_day") return "half_day";
  if (value === "weekly_off") return "weekly_off";
  if (value === "late") return "late";
  if (value === "absent") return "absent";
  if (value === "on_leave") return "other";
  if (value === "present") return "present";
  return "other";
}

export function calculatedStatusChartColor(status: string | undefined): string {
  const bucket = normalizeCalculatedStatus(status);
  if (bucket === "present") return "#0F9D58";
  if (bucket === "present_full_day") return "#047857";
  if (bucket === "late") return "#E8710A";
  if (bucket === "absent") return "#DC2626";
  if (bucket === "half_day") return "#008CD3";
  if (bucket === "short_leave") return "#F9A825";
  if (bucket === "weekly_off") return "#9CA3AF";
  return "#9CA3AF";
}

export function mobileCalculatedStatusBadgeCls(status: string | undefined): string {
  const bucket = normalizeCalculatedStatus(status);
  if (bucket === "present" || bucket === "present_full_day") return "bg-[#E6F4EA] text-[#0F9D58]";
  if (bucket === "late") return "bg-[#FEF3E6] text-[#E8710A]";
  if (bucket === "absent") return "bg-[#FEE2E2] text-[#DC2626]";
  if (bucket === "half_day") return "bg-[#E8F4FB] text-[#008CD3]";
  if (bucket === "short_leave") return "bg-[#FFF8E1] text-[#F9A825]";
  if (bucket === "weekly_off") return "bg-[#E5E7EB] text-[#6B7280]";
  return "bg-[#F5F7FA] text-[#6B7280]";
}

export function calculatedStatusBadgeClass(status: string | undefined): string {
  const bucket = normalizeCalculatedStatus(status);
  if (bucket === "present" || bucket === "present_full_day") return "bg-emerald-50 text-emerald-700";
  if (bucket === "late") return "bg-amber-50 text-amber-700";
  if (bucket === "absent") return "bg-red-50 text-red-700";
  if (bucket === "half_day") return "bg-violet-50 text-violet-700";
  if (bucket === "short_leave") return "bg-sky-50 text-sky-700";
  if (bucket === "weekly_off") return "bg-slate-100 text-slate-600";
  return "bg-slate-100 text-slate-700";
}

export function matchesCalculatedStatusFilter(
  calculatedStatus: string | undefined,
  filter: string,
): boolean {
  if (!filter) return true;
  const normalized = String(calculatedStatus || "").trim().toLowerCase();
  const f = filter.trim().toLowerCase();
  if (f === "present") {
    return (
      normalized === "present" ||
      normalized === "present_full_day" ||
      normalized === "late"
    );
  }
  if (f === "on_leave") return normalized === "on_leave";
  return normalized === f;
}

export type SheetMonthAnalyticsResult = MonthAnalyticsResult & {
  sheetReport: AttendanceSheetReport | null;
};

export function computeMonthAnalyticsFromSheet(
  response: {
    calendar_days?: AttendanceExportResponse["calendar_days"];
    sheet_report?: AttendanceExportResponse["sheet_report"];
  },
  year: number,
  month: number,
): SheetMonthAnalyticsResult {
  const calendarDays = response.calendar_days ?? [];
  const sheet = response.sheet_report ?? null;
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;

  const statusByDate = new Map<string, CalculatedAttendanceStatus>();
  for (const day of calendarDays) {
    statusByDate.set(
      day.date,
      String(day.attendance_status || "absent") as CalculatedAttendanceStatus,
    );
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDow = new Date(year, month - 1, 1).getDay();
  const calendarCells: MonthAnalyticsResult["monthAnalytics"]["calendarCells"] = [];
  for (let i = 0; i < firstDow; i += 1) calendarCells.push({ day: null });
  for (let d = 1; d <= daysInMonth; d += 1) {
    const dateYmd = `${monthKey}-${String(d).padStart(2, "0")}`;
    const day = calendarDays.find((entry) => entry.date === dateYmd);
    calendarCells.push({
      day: d,
      status: day
        ? (String(day.attendance_status || "absent") as CalculatedAttendanceStatus)
        : "absent",
      isSunday: day?.is_sunday,
      isWeekend: day?.is_weekend,
    });
  }

  const monthlyKpi = {
    present: sheet ? Math.max(0, sheet.full_days - sheet.late_marks) : 0,
    presentFullDay: sheet?.full_days ?? 0,
    daysPresent: sheet?.present_days ?? 0,
    late: sheet?.late_marks ?? 0,
    absent: sheet?.absent_days ?? 0,
    halfDay: sheet?.half_days ?? 0,
    shortLeave: sheet?.short_leaves ?? 0,
    weeklyOff: sheet?.weekly_offs ?? sheet?.weekly_off_days ?? 0,
    future: 0,
    totalWorkingMinutes: sheet?.total_working_minutes ?? 0,
    kpiTotal: sheet
      ? sheet.present_days + sheet.absent_days + sheet.half_days
      : 0,
    lateDerivedLeaves: sheet?.late_leave_deduction ?? 0,
    totalAbsentWithLateLeaves: sheet
      ? sheet.absent_days + sheet.late_leave_deduction
      : 0,
  };

  const dailyHours = calendarDays
    .filter((day) => day.date.startsWith(monthKey))
    .map((day) => ({
      day: Number(day.date.split("-")[2]),
      hours: Number(day.working_time ?? 0) / 60,
      status: day.attendance_status,
    }))
    .sort((a, b) => a.day - b.day);

  const maxDailyHours = dailyHours.reduce((max, point) => Math.max(max, point.hours), 0);
  const kpiTotal = monthlyKpi.kpiTotal || 1;
  const attendanceRate =
    monthlyKpi.kpiTotal > 0
      ? Math.round((monthlyKpi.daysPresent / monthlyKpi.kpiTotal) * 100)
      : 0;
  const onTimeRate =
    monthlyKpi.kpiTotal > 0
      ? Math.round((monthlyKpi.present / monthlyKpi.kpiTotal) * 100)
      : 0;

  const monthAnalytics = {
    totalMinutes: monthlyKpi.totalWorkingMinutes,
    totalHours: monthlyKpi.totalWorkingMinutes / 60,
    daysWithRecord: dailyHours.filter((point) => point.hours > 0).length,
    daysInMonth,
    kpiTotal: monthlyKpi.kpiTotal,
    attendanceRate,
    onTimeRate,
    dailyHours,
    maxDailyHours,
    calendarCells,
  };

  const kpiSegments: KpiSegment[] = [
    ...(monthlyKpi.presentFullDay > 0
      ? [{
          key: "fullDayWork",
          label: "Full day work",
          count: monthlyKpi.presentFullDay,
          color: "#047857",
        }]
      : []),
    ...(monthlyKpi.late > 0
      ? [{ key: "late", label: "Late marks", count: monthlyKpi.late, color: "#E8710A" }]
      : []),
    ...(monthlyKpi.lateDerivedLeaves > 0
      ? [{
          key: "lateDerivedLeaves",
          label: "Leave (from lates)",
          count: monthlyKpi.lateDerivedLeaves,
          color: "#BE185D",
        }]
      : []),
    ...(monthlyKpi.absent > 0
      ? [{ key: "absent", label: "Absent", count: monthlyKpi.absent, color: "#DC2626" }]
      : []),
    ...(monthlyKpi.halfDay > 0
      ? [{ key: "halfDay", label: "Half day", count: monthlyKpi.halfDay, color: "#008CD3" }]
      : []),
    ...(monthlyKpi.shortLeave > 0
      ? [{
          key: "shortLeave",
          label: "Short leave",
          count: monthlyKpi.shortLeave,
          color: "#F9A825",
        }]
      : []),
    ...(monthlyKpi.weeklyOff > 0
      ? [{
          key: "weeklyOff",
          label: "Weekly off",
          count: monthlyKpi.weeklyOff,
          color: "#9CA3AF",
        }]
      : []),
  ];

  const statusCounts = new Map<string, number>();
  for (const day of calendarDays) {
    if (day.is_future || day.attendance_status === "not_joined") continue;
    const status = String(day.attendance_status || "absent");
    statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
  }
  const statusDistribution = Array.from(statusCounts.entries())
    .map(([status, count]) => ({
      status,
      count,
      percentage: Math.round((count / kpiTotal) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    monthAttendance: {
      days: calendarDays as ReturnType<typeof buildMonthAttendanceView>["days"],
      summary: monthlyKpi,
      calendarCells,
      statusByDate,
    },
    monthlyKpi,
    monthAnalytics,
    kpiSegments,
    statusDistribution,
    monthlyTrend: [{ month: monthKey, count: dailyHours.length }],
    sheetReport: sheet,
  };
}

export { formatCalculatedStatusLabel };
