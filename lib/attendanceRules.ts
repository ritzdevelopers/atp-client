import type { AttendanceHistoryRow } from "@/services/attendanceHistory";
import { isPayrollExceptionEmpCode } from "@/lib/attendancePayrollExceptions";
import { wallClockMinutesFromDateTime } from "@/lib/attendanceDates";

export const ATTENDANCE_RULES = {
  ON_TIME_UNTIL: wallTimeToMinutesSinceMidnight("09:45:00"),
  LATE_FROM: wallTimeToMinutesSinceMidnight("09:45:00"),
  HALF_DAY_CHECKIN_AFTER: wallTimeToMinutesSinceMidnight("10:30:00"),
  HALF_DAY_CHECKOUT_BEFORE: wallTimeToMinutesSinceMidnight("17:30:00"),
  SHORT_LEAVE_FROM: wallTimeToMinutesSinceMidnight("17:40:00"),
  SHORT_LEAVE_UNTIL: wallTimeToMinutesSinceMidnight("18:20:00"),
  FULL_DAY_CHECKOUT_AFTER: wallTimeToMinutesSinceMidnight("18:20:00"),
  MIN_FULL_DAY_MINUTES: 8 * 60,
  MIN_HALF_DAY_MINUTES: 4 * 60,
  MIN_ABSENT_MINUTES: 4 * 60,
  LATES_PER_DERIVED_LEAVE: 3,
  FULL_DAY_CREDIT: 1,
  HALF_DAY_CREDIT: 0.5,
  SHORT_LEAVE_CREDIT: 0.75,
} as const;

export const ATTENDANCE_RULE_LABELS = [
  { label: "On time until", value: "Before 9:45 AM" },
  { label: "Late mark", value: "Check-in on or after 9:45 AM (before 10:30 AM)" },
  { label: "Half day (check-in after)", value: "10:30 AM" },
  { label: "Half day (check-out before)", value: "5:30 PM" },
  { label: "Short leave window", value: "5:40 PM – 6:20 PM" },
  { label: "Full day (check-out after)", value: "6:20 PM" },
  { label: "Full day (hours)", value: "8 hours or more" },
  { label: "Half day (hours)", value: "4 to under 8 hours" },
  { label: "Absent (hours)", value: "Under 4 hours" },
  { label: "Working day credit", value: "Full = 1, Half = 0.5, Short leave = 0.75" },
  { label: "Payable days", value: "Working days + Paid leaves + Weekly offs + Comp off − Late leave deduction" },
  { label: "Late-to-leave rule", value: "Every 3 lates = 1 leave (floor(lates ÷ 3))" },
] as const;

export function computeLateDerivedLeaves(lateCount: number): number {
  const lates = Number.isFinite(lateCount) ? Math.max(0, Math.floor(lateCount)) : 0;
  return Math.floor(lates / ATTENDANCE_RULES.LATES_PER_DERIVED_LEAVE);
}

export function formatLateLeaveExplanation(lateCount: number): string {
  const lates = Number.isFinite(lateCount) ? Math.max(0, Math.floor(lateCount)) : 0;
  const leaves = computeLateDerivedLeaves(lates);
  if (leaves === 0) {
    return `No leave counted from lates yet (${lates} late${lates === 1 ? "" : "s"}; 3 lates = 1 leave).`;
  }
  return `${leaves} leave${leaves === 1 ? "" : "s"} counted from ${lates} late${lates === 1 ? "" : "s"} — floor(${lates} ÷ 3) = ${leaves}. These are added to absent/leave totals for the month.`;
}

export function wallTimeToMinutesSinceMidnight(value: string) {
  const m = String(value).trim().match(/(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return NaN;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  const sec = Number(m[3] ?? 0);
  if (![h, mi, sec].every((x) => Number.isFinite(x))) return NaN;
  return h * 60 + mi + sec / 60;
}


/** Late: check-in at or after 9:45 AM and before 10:30 AM (half day from 10:30). */
export function isLateCheckIn(checkInMinutes: number) {
  return (
    Number.isFinite(checkInMinutes) &&
    checkInMinutes >= ATTENDANCE_RULES.LATE_FROM &&
    checkInMinutes < ATTENDANCE_RULES.HALF_DAY_CHECKIN_AFTER
  );
}

function isHalfDayCheckIn(checkInMinutes: number) {
  return (
    Number.isFinite(checkInMinutes) &&
    checkInMinutes > ATTENDANCE_RULES.HALF_DAY_CHECKIN_AFTER
  );
}

function isEarlyCheckout(checkOutMinutes: number) {
  return (
    Number.isFinite(checkOutMinutes) &&
    checkOutMinutes < ATTENDANCE_RULES.HALF_DAY_CHECKOUT_BEFORE
  );
}

function isShortLeaveCheckout(checkOutMinutes: number) {
  return (
    Number.isFinite(checkOutMinutes) &&
    checkOutMinutes >= ATTENDANCE_RULES.SHORT_LEAVE_FROM &&
    checkOutMinutes <= ATTENDANCE_RULES.SHORT_LEAVE_UNTIL
  );
}

function isCheckoutOkForFullDay(checkOutMinutes: number) {
  return (
    Number.isFinite(checkOutMinutes) &&
    checkOutMinutes > ATTENDANCE_RULES.FULL_DAY_CHECKOUT_AFTER
  );
}

function normalizeStoredWorkingMinutes(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value <= 24) return Math.round(value * 60);
  return Math.round(value);
}

/** Per-day work status — same rules as server (UI + Excel). */
export function deriveFinalAttendanceStatus(
  checkInMinutes: number,
  checkOutMinutes: number,
  workingMinutes: number | null,
) {
  let resolvedMinutes = workingMinutes;
  if (
    (resolvedMinutes == null || !Number.isFinite(resolvedMinutes) || resolvedMinutes <= 0) &&
    Number.isFinite(checkInMinutes) &&
    Number.isFinite(checkOutMinutes)
  ) {
    resolvedMinutes = Math.max(0, Math.round(checkOutMinutes - checkInMinutes));
  }

  if (
    resolvedMinutes == null ||
    !Number.isFinite(resolvedMinutes) ||
    resolvedMinutes < ATTENDANCE_RULES.MIN_ABSENT_MINUTES
  ) {
    return "absent";
  }

  if (isHalfDayCheckIn(checkInMinutes)) {
    return "half_day";
  }

  if (isEarlyCheckout(checkOutMinutes)) {
    return "half_day";
  }

  if (resolvedMinutes < ATTENDANCE_RULES.MIN_FULL_DAY_MINUTES) {
    return "half_day";
  }

  if (isShortLeaveCheckout(checkOutMinutes)) {
    return "short_leave";
  }

  if (Number.isFinite(checkOutMinutes) && !isCheckoutOkForFullDay(checkOutMinutes)) {
    return "half_day";
  }

  if (isLateCheckIn(checkInMinutes)) {
    return "late";
  }

  return "present";
}

function checkInMinutesFromValue(checkIn: string | null | undefined) {
  if (!checkIn) return NaN;
  return wallClockMinutesFromDateTime(checkIn);
}

export function workingMinutesFromPunches(
  checkIn: string | null | undefined,
  checkOut: string | null | undefined,
) {
  if (!checkIn || !checkOut) return null;
  const checkInMinutes = wallClockMinutesFromDateTime(checkIn);
  const checkOutMinutes = wallClockMinutesFromDateTime(checkOut);
  if (!Number.isFinite(checkInMinutes) || !Number.isFinite(checkOutMinutes)) {
    return null;
  }
  return Math.max(0, Math.round(checkOutMinutes - checkInMinutes));
}

export function resolveWorkingMinutesFromRow(row: {
  working_time?: string | number | null;
  working_hours?: string | number | null;
  check_in?: string | null;
  check_out?: string | null;
}): number | null {
  const stored = normalizeStoredWorkingMinutes(Number(row.working_time ?? 0));
  if (stored > 0) {
    return stored;
  }
  const hours = Number(row.working_hours ?? 0);
  if (Number.isFinite(hours) && hours > 0) {
    return Math.round(hours * 60);
  }
  return workingMinutesFromPunches(row.check_in, row.check_out);
}

export type CalculatedAttendanceStatus =
  | "absent"
  | "weekly_off"
  | "future"
  | "half_day"
  | "short_leave"
  | "late"
  | "present"
  | "present_full_day";

export function deriveStatusFromRowPunches(row: {
  check_in?: string | null;
  check_out?: string | null;
  working_time?: string | number | null;
  working_hours?: string | number | null;
}): CalculatedAttendanceStatus {
  if (!row.check_in) return "absent";
  const checkInMinutes = wallClockMinutesFromDateTime(row.check_in);
  const checkOutMinutes = row.check_out
    ? wallClockMinutesFromDateTime(row.check_out)
    : NaN;
  const workingMinutes = resolveWorkingMinutesFromRow(row);
  return deriveFinalAttendanceStatus(
    checkInMinutes,
    checkOutMinutes,
    workingMinutes,
  ) as CalculatedAttendanceStatus;
}

export function calculateDetailedStatusFromPunches(
  checkIn: string | null | undefined,
  checkOut: string | null | undefined,
): CalculatedAttendanceStatus {
  if (!checkIn) return "absent";

  const baseStatus = deriveStatusFromPunches(checkIn, checkOut);
  if (baseStatus !== "present") {
    return baseStatus as CalculatedAttendanceStatus;
  }

  const workingMinutes = workingMinutesFromPunches(checkIn, checkOut);
  const checkOutMinutes = checkOut
    ? wallClockMinutesFromDateTime(checkOut)
    : NaN;

  if (
    workingMinutes != null &&
    workingMinutes >= ATTENDANCE_RULES.MIN_FULL_DAY_MINUTES &&
    Number.isFinite(checkOutMinutes) &&
    checkOutMinutes >= ATTENDANCE_RULES.FULL_DAY_CHECKOUT_AFTER
  ) {
    return "present_full_day";
  }

  return "present";
}

export function formatCalculatedStatusLabel(status: string | undefined): string {
  const value = String(status || "").trim().toLowerCase();
  if (!value) return "N/A";
  if (value === "present_full_day") return "Full day present";
  if (value === "weekly_off") return "Weekly off";
  if (value === "short_leave") return "Short leave";
  if (value === "half_day") return "Half day";
  if (value === "late") return "Late";
  if (value === "present") return "Present";
  return value.replace(/_/g, " ");
}

export function calendarHeatmapClass(
  status: string | undefined,
  isWeekend = false,
): string {
  const normalized = String(status || "").trim().toLowerCase();

  if (normalized === "weekly_off") {
    return "bg-[#E5E7EB] text-[#6B7280]";
  }
  if (!normalized || normalized === "absent") {
    return "bg-[#DC2626] text-white shadow-sm";
  }
  if (normalized === "late") {
    return "bg-[#E8710A] text-white shadow-sm";
  }
  if (normalized === "half_day") {
    return "bg-[#008CD3] text-white shadow-sm";
  }
  if (normalized === "short_leave") {
    return "bg-[#F9A825] text-white shadow-sm";
  }
  if (normalized === "present" || normalized === "present_full_day") {
    return "bg-[#0F9D58] text-white shadow-sm";
  }
  if (normalized === "future") {
    return "bg-[#F5F7FA] text-[#CBD5E1]";
  }
  if (isWeekend) {
    return "bg-[#E5E7EB] text-[#6B7280]";
  }
  return "bg-[#F1F5F9] text-[#9CA3AF]";
}

export type MonthAttendanceSummary = {
  /** On-time present only (before late threshold, not full-day upgrade). */
  present: number;
  presentFullDay: number;
  /** All days employee came to work (on-time, full day, late, half day, short leave). */
  daysPresent: number;
  late: number;
  absent: number;
  halfDay: number;
  shortLeave: number;
  weeklyOff: number;
  future: number;
  totalWorkingMinutes: number;
  kpiTotal: number;
  /** floor(late ÷ 3) — counted as leave against absent totals. */
  lateDerivedLeaves: number;
  /** absent + lateDerivedLeaves */
  totalAbsentWithLateLeaves: number;
};

export type MonthCalendarCell = {
  day: number | null;
  status?: CalculatedAttendanceStatus;
  isSunday?: boolean;
  isWeekend?: boolean;
};

export type MonthAttendanceView = {
  days: CalendarDayExport[];
  summary: MonthAttendanceSummary;
  calendarCells: MonthCalendarCell[];
  statusByDate: Map<string, CalculatedAttendanceStatus>;
};

export function buildMonthAttendanceView(
  year: number,
  month: number,
  rows: AttendanceHistoryRow[],
): MonthAttendanceView {
  const daysInMonth = new Date(year, month, 0).getDate();
  const fromDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
  const today = new Date();
  const todayYmd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const toDate = monthEnd > todayYmd ? todayYmd : monthEnd;

  const days = buildCalendarDaysFromPunches(fromDate, toDate, rows).map((day) => {
    if (day.is_future || day.is_weekly_off || day.attendance_status === "weekly_off") {
      return day;
    }
    if (!day.check_in) {
      return {
        ...day,
        attendance_status: day.is_weekend ? "weekly_off" : "absent",
        is_absent: !day.is_weekend,
        is_weekly_off: day.is_weekend,
      };
    }
    const detailed = calculateDetailedStatusFromPunches(day.check_in, day.check_out);
    return {
      ...day,
      attendance_status: detailed,
      is_absent: detailed === "absent",
    };
  });

  let present = 0;
  let presentFullDay = 0;
  let late = 0;
  let absent = 0;
  let halfDay = 0;
  let shortLeave = 0;
  let weeklyOff = 0;
  let future = 0;
  let totalWorkingMinutes = 0;

  const statusByDate = new Map<string, CalculatedAttendanceStatus>();

  for (const day of days) {
    const status = day.attendance_status as CalculatedAttendanceStatus;
    statusByDate.set(day.date, status);

    if (day.is_future || status === "future") {
      future += 1;
      continue;
    }
    if (status === "weekly_off" || (day.is_weekend && !day.check_in)) {
      weeklyOff += 1;
      continue;
    }

    if (status === "absent" || day.is_absent) absent += 1;
    if (status === "present") present += 1;
    if (status === "present_full_day") presentFullDay += 1;
    if (status === "late") late += 1;
    if (status === "half_day") halfDay += 1;
    if (status === "short_leave") shortLeave += 1;

    const minutes = Number(day.working_time ?? 0);
    if (Number.isFinite(minutes) && minutes > 0) {
      totalWorkingMinutes += minutes;
    }
  }

  const firstDow = new Date(year, month - 1, 1).getDay();
  const calendarCells: MonthCalendarCell[] = [];
  for (let i = 0; i < firstDow; i += 1) calendarCells.push({ day: null });

  for (let d = 1; d <= daysInMonth; d += 1) {
    const dateYmd = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dateObj = new Date(`${dateYmd}T12:00:00`);
    const dayIndex = dateObj.getDay();
    const isSunday = dayIndex === 0;
    const isWeekend = isWeekendDay(dayIndex);
    const isFuture = dateYmd > todayYmd;
    let status = statusByDate.get(dateYmd);

    if (!status) {
      if (isFuture) status = "future";
      else if (isWeekend) status = "weekly_off";
      else status = "absent";
    }

    calendarCells.push({ day: d, status, isSunday, isWeekend });
  }

  const kpiTotal =
    present + presentFullDay + late + absent + halfDay + shortLeave;

  const daysPresent =
    present + presentFullDay + late + halfDay + shortLeave;

  const lateDerivedLeaves = computeLateDerivedLeaves(late);
  const totalAbsentWithLateLeaves = absent + lateDerivedLeaves;

  return {
    days,
    summary: {
      present,
      presentFullDay,
      daysPresent,
      late,
      absent,
      halfDay,
      shortLeave,
      weeklyOff,
      future,
      totalWorkingMinutes,
      kpiTotal,
      lateDerivedLeaves,
      totalAbsentWithLateLeaves,
    },
    calendarCells,
    statusByDate,
  };
}

export function deriveStatusFromPunches(
  checkIn: string | null | undefined,
  checkOut: string | null | undefined,
  workingMinutesOverride?: number | null,
) {
  if (!checkIn) return "absent";

  const checkInMinutes = wallClockMinutesFromDateTime(checkIn);
  const checkOutMinutes = checkOut
    ? wallClockMinutesFromDateTime(checkOut)
    : NaN;
  const workingMinutes =
    workingMinutesOverride ?? workingMinutesFromPunches(checkIn, checkOut);

  return deriveFinalAttendanceStatus(
    checkInMinutes,
    checkOutMinutes,
    workingMinutes,
  );
}

export function deriveStatusFromAttendanceRow(row: AttendanceHistoryRow) {
  return deriveStatusFromPunches(row.check_in, row.check_out);
}

function addDaysToYmd(ymd: string, days: number) {
  const d = new Date(`${ymd}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** Saturday (6) and Sunday (0) are weekly off unless the employee has attendance. */
export function isWeekendDay(dayIndex: number): boolean {
  return dayIndex === 0 || dayIndex === 6;
}

export function isWeekendYmd(ymd: string): boolean {
  return isWeekendDay(new Date(`${ymd}T12:00:00`).getDay());
}

export function dayIsWeekend(day: {
  is_weekend?: boolean;
  is_sunday?: boolean;
  date?: string;
}): boolean {
  if (day.is_weekend) return true;
  if (day.date) return isWeekendYmd(day.date);
  return Boolean(day.is_sunday);
}

export function hasAttendanceOnDay(day: {
  check_in?: string | null;
  attendance_status?: string | null;
}): boolean {
  if (day.check_in) return true;
  const status = String(day.attendance_status || "").trim().toLowerCase();
  return (
    status !== "" &&
    status !== "absent" &&
    status !== "weekly_off" &&
    status !== "future" &&
    status !== "not_joined"
  );
}

/** Build calendar days using only check-in/check-out — ignores stored backend status. */
export function buildCalendarDaysFromPunches(
  fromDate: string,
  toDate: string,
  rows: AttendanceHistoryRow[],
): CalendarDayExport[] {
  const rowByDate = new Map(
    rows.map((row) => [String(row.attendance_date), row]),
  );
  const today = new Date();
  const todayYmd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const days: CalendarDayExport[] = [];
  let current = fromDate;

  while (current <= toDate) {
    const d = new Date(`${current}T12:00:00`);
    const dayIndex = d.getDay();
    const isSunday = dayIndex === 0;
    const isWeekend = isWeekendDay(dayIndex);
    const record = rowByDate.get(current);
    const checkIn = record?.check_in ?? null;
    const checkOut = record?.check_out ?? null;
    const workingMinutes = record
      ? resolveWorkingMinutesFromRow({
          working_time: record.working_time,
          working_hours: (record as { working_hours?: number | string | null }).working_hours,
          check_in: checkIn,
          check_out: checkOut,
        })
      : workingMinutesFromPunches(checkIn, checkOut);
    const isFuture = current > todayYmd;

    let attendance_status = "absent";
    let is_absent = false;
    let is_weekly_off = false;

    if (isFuture) {
      attendance_status = "future";
    } else if (isWeekend && !checkIn) {
      attendance_status = "weekly_off";
      is_weekly_off = true;
    } else if (!checkIn) {
      attendance_status = "absent";
      is_absent = true;
    } else {
      attendance_status = deriveStatusFromPunches(checkIn, checkOut, workingMinutes);
      is_absent = attendance_status === "absent";
    }

    days.push({
      date: current,
      day_name: DAY_NAMES[dayIndex],
      day_short: DAY_NAMES[dayIndex].slice(0, 3),
      is_sunday: isSunday,
      is_weekend: isWeekend,
      is_weekly_off,
      is_future: isFuture,
      is_absent,
      check_in: checkIn,
      check_out: checkOut,
      attendance_status,
      stored_status: record?.attendance_status ?? null,
      working_time: workingMinutes,
    });

    current = addDaysToYmd(current, 1);
  }

  return days;
}

export function summarizeCalendarDaysClient(days: CalendarDayExport[]) {
  let presentDays = 0;
  let lateDays = 0;
  let absentDays = 0;
  let halfDayDays = 0;
  let shortLeaveDays = 0;
  let weeklyOffDays = 0;
  let totalWorkingMinutes = 0;

  for (const day of days) {
    if (day.is_future || day.attendance_status === "not_joined") continue;

    const status = String(day.attendance_status || "").trim().toLowerCase();
    if (
      (day.is_weekend && !day.check_in) ||
      day.attendance_status === "weekly_off"
    ) {
      weeklyOffDays += 1;
    }
    if ((day.is_absent || status === "absent") && !day.is_weekend) absentDays += 1;
    if (status === "present") presentDays += 1;
    if (status === "late") lateDays += 1;
    if (status === "half_day") halfDayDays += 1;
    if (status === "short_leave") shortLeaveDays += 1;

    const minutes = Number(day.working_time ?? 0);
    if (Number.isFinite(minutes) && minutes > 0) {
      totalWorkingMinutes += minutes;
    }
  }

  const lateDerivedLeaves = computeLateDerivedLeaves(lateDays);

  return {
    total_days: days.filter(
      (day) =>
        day.attendance_status !== "future" &&
        day.attendance_status !== "not_joined",
    ).length,
    present_days: presentDays,
    late_days: lateDays,
    absent_days: absentDays,
    half_day_days: halfDayDays,
    short_leave_days: shortLeaveDays,
    on_leave_days: lateDerivedLeaves,
    late_derived_leaves: lateDerivedLeaves,
    total_absent_with_late_leaves: absentDays + lateDerivedLeaves,
    weekly_off_days: weeklyOffDays,
    total_working_minutes: totalWorkingMinutes,
    total_working_hours: Math.round((totalWorkingMinutes / 60) * 100) / 100,
  };
}

/** Payroll-friendly totals for Excel exports (HR / non-technical readers). */
export type PayrollExportSummary = {
  /** Calendar days in the report period (full month — includes Sat/Sun, excludes future). */
  workingDays: number;
  /** Came to work — includes on-time, late, half day, and short leave. */
  daysPresent: number;
  onTimeDays: number;
  lateDays: number;
  absentDays: number;
  halfDayDays: number;
  shortLeaveDays: number;
  weeklyOffDays: number;
  leaveFromLates: number;
  /** Each half day reduces payable days by 0.5. */
  halfDayDeduction: number;
  /** Payable days = month days − absent − half day (0.5 each) − leave from lates. */
  payDays: number;
  totalWorkingHours: number;
  /** Weekdays counted as full-day present for payroll (exception employees). */
  fullDayPresentDays?: number;
  /** True when emp code is in attendancePayrollExceptions.json. */
  payrollExceptionApplied?: boolean;
  /** Server sheet report fields (normal employees). */
  attendanceWorkingDays?: number;
  paidLeaves?: number;
  unpaidLeaves?: number;
  halfDayLeaves?: number;
  compOffBalance?: number;
  usesSheetReportFormula?: boolean;
};

function resolvePayrollMonthDayCount(days: CalendarDayExport[]): number {
  if (!days.length) return 0;

  const monthKeys = new Set(days.map((day) => day.date.slice(0, 7)));
  if (monthKeys.size === 1) {
    const [year, month] = days[0].date.split("-").map(Number);
    return new Date(year, month, 0).getDate();
  }

  return days.filter(
    (day) =>
      day.attendance_status !== "future" &&
      day.attendance_status !== "not_joined",
  ).length;
}

export function buildPayrollExportSummary(
  days: CalendarDayExport[],
  options?: { empCode?: string | null; forceStandardRules?: boolean },
): PayrollExportSummary {
  const base = summarizeCalendarDaysClient(days);
  let daysPresent = 0;
  let onTimeDays = 0;
  let fullDayPresentDays = 0;

  const workingDays = resolvePayrollMonthDayCount(days);
  const payrollExceptionApplied =
    !options?.forceStandardRules && isPayrollExceptionEmpCode(options?.empCode);

  for (const day of days) {
    if (day.is_future || day.attendance_status === "not_joined") continue;

    const status = String(day.attendance_status || "").trim().toLowerCase();
    if (day.is_weekend && !day.check_in) continue;
    if (status === "absent" || day.is_absent) continue;

    daysPresent += 1;
    fullDayPresentDays += 1;
    if (status === "present" || status === "present_full_day") onTimeDays += 1;
  }

  const rawLeaveFromLates = base.late_derived_leaves ?? base.on_leave_days ?? 0;
  const rawHalfDayDeduction = base.half_day_days * 0.5;

  const leaveFromLates = payrollExceptionApplied ? 0 : rawLeaveFromLates;
  const halfDayDeduction = payrollExceptionApplied ? 0 : rawHalfDayDeduction;
  const payDays = Math.max(
    0,
    Math.round(
      (workingDays - base.absent_days - halfDayDeduction - leaveFromLates) * 100,
    ) / 100,
  );

  return {
    workingDays,
    daysPresent: payrollExceptionApplied ? fullDayPresentDays : daysPresent,
    onTimeDays,
    lateDays: base.late_days,
    absentDays: base.absent_days,
    halfDayDays: base.half_day_days,
    shortLeaveDays: base.short_leave_days,
    weeklyOffDays: base.weekly_off_days ?? 0,
    leaveFromLates,
    halfDayDeduction,
    payDays,
    totalWorkingHours: base.total_working_hours,
    fullDayPresentDays,
    payrollExceptionApplied,
  };
}

export function dayCameToWork(day: CalendarDayExport): boolean {
  if (day.is_future || day.attendance_status === "not_joined") return false;
  if (day.is_weekend && !day.check_in) return false;
  const status = String(day.attendance_status || "").trim().toLowerCase();
  return Boolean(day.check_in) && status !== "absent" && !day.is_absent;
}

export function dayWasLate(day: CalendarDayExport): boolean {
  if (day.is_late) return true;
  if (String(day.attendance_status || "").trim().toLowerCase() === "late") {
    return true;
  }
  const checkInMinutes = checkInMinutesFromValue(day.check_in);
  return isLateCheckIn(checkInMinutes);
}

export function dayWasHalfDay(day: CalendarDayExport): boolean {
  return String(day.attendance_status || "").trim().toLowerCase().includes("half");
}

export function plainAttendanceResult(day: CalendarDayExport): string {
  if (day.is_future) return "Not yet occurred";
  if (day.attendance_status === "not_joined") return "Before joining date";
  if (dayIsWeekend(day) && !hasAttendanceOnDay(day)) return "Weekly off (Saturday / Sunday)";
  if (dayIsWeekend(day) && hasAttendanceOnDay(day)) return "Worked on weekly off";

  const status = String(day.attendance_status || "").trim().toLowerCase();
  if (status === "present") return "Came on time";
  if (status === "late") {
    const mins = Number(day.working_time ?? 0);
    if (mins >= ATTENDANCE_RULES.MIN_FULL_DAY_MINUTES) {
      return "Came late (full day)";
    }
    return "Came late";
  }
  if (status === "absent" || day.is_absent) return "Did not come (absent)";
  if (status.includes("half")) return "Half day";
  if (status.includes("short")) return "Short leave";
  if (status.includes("leave")) return "On leave";
  return formatStatusLabelForExport(status);
}

function formatStatusLabelForExport(status: string): string {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export type CalendarDayExport = {
  date: string;
  day_name: string;
  day_short: string;
  is_sunday: boolean;
  is_weekend: boolean;
  is_weekly_off: boolean;
  is_future: boolean;
  is_absent: boolean;
  is_late?: boolean;
  check_in: string | null;
  check_out: string | null;
  attendance_status: string;
  stored_status?: string | null;
  working_time: number | null;
  working_hours?: number | string | null;
};

export function applyRulesToCalendarDay(day: CalendarDayExport): CalendarDayExport {
  const isWeekend =
    day.is_weekend ?? (day.date ? isWeekendYmd(day.date) : Boolean(day.is_sunday));
  const normalized: CalendarDayExport = { ...day, is_weekend: isWeekend };

  if (
    normalized.is_future ||
    normalized.attendance_status === "not_joined"
  ) {
    return normalized;
  }

  if (normalized.is_weekly_off && !normalized.check_in) {
    return normalized;
  }

  if (normalized.attendance_status === "on_leave" && !normalized.check_in) {
    return normalized;
  }

  if (!normalized.check_in) {
    return {
      ...normalized,
      attendance_status: isWeekend ? "weekly_off" : "absent",
      is_absent: !isWeekend,
      is_weekly_off: isWeekend,
      is_late: false,
    };
  }

  const checkInMinutes = wallClockMinutesFromDateTime(normalized.check_in);
  const checkOutMinutes = normalized.check_out
    ? wallClockMinutesFromDateTime(normalized.check_out)
    : NaN;
  const workingMinutes = resolveWorkingMinutesFromRow({
    working_time: normalized.working_time,
    working_hours: normalized.working_hours,
    check_in: normalized.check_in,
    check_out: normalized.check_out,
  });

  const derivedStatus = deriveFinalAttendanceStatus(
    checkInMinutes,
    checkOutMinutes,
    workingMinutes,
  );

  return {
    ...normalized,
    attendance_status: derivedStatus,
    is_late: derivedStatus === "late",
    is_absent: derivedStatus === "absent" && !isWeekend,
    is_weekly_off: false,
  };
}
