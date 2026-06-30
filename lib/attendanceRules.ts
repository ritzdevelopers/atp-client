import type { AttendanceHistoryRow } from "@/services/attendanceHistory";

export const ATTENDANCE_RULES = {
  LATE_AFTER: wallTimeToMinutesSinceMidnight("09:45:00"),
  HALF_DAY_CHECKIN_AFTER: wallTimeToMinutesSinceMidnight("10:30:00"),
  HALF_DAY_CHECKOUT_UNTIL: wallTimeToMinutesSinceMidnight("17:29:00"),
  SHORT_LEAVE_FROM: wallTimeToMinutesSinceMidnight("17:30:00"),
  SHORT_LEAVE_UNTIL: wallTimeToMinutesSinceMidnight("18:15:00"),
  FULL_DAY_CHECKOUT_AFTER: wallTimeToMinutesSinceMidnight("18:20:00"),
  MIN_FULL_DAY_MINUTES: 8 * 60,
} as const;

export const ATTENDANCE_RULE_LABELS = [
  { label: "Late after", value: "09:45 AM" },
  { label: "Half day (check-in after)", value: "10:30 AM" },
  { label: "Half day (check-out until)", value: "05:29 PM" },
  { label: "Short leave window", value: "05:30 PM – 06:15 PM" },
  { label: "Full day check-out after", value: "06:20 PM" },
  { label: "Minimum full day", value: "8 hours" },
] as const;

const STATUS_PRIORITY: Record<string, number> = {
  absent: 0,
  present: 1,
  late: 2,
  short_leave: 3,
  half_day: 4,
};

export function wallTimeToMinutesSinceMidnight(value: string) {
  const m = String(value).trim().match(/(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return NaN;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  const sec = Number(m[3] ?? 0);
  if (![h, mi, sec].every((x) => Number.isFinite(x))) return NaN;
  return h * 60 + mi + sec / 60;
}

function pickStrongerStatus(current: string, next: string) {
  const currentRank = STATUS_PRIORITY[current] ?? 0;
  const nextRank = STATUS_PRIORITY[next] ?? 0;
  return nextRank >= currentRank ? next : current;
}

function deriveCheckInStatus(checkInMinutes: number) {
  if (
    Number.isFinite(checkInMinutes) &&
    checkInMinutes > ATTENDANCE_RULES.HALF_DAY_CHECKIN_AFTER
  ) {
    return "half_day";
  }
  if (
    Number.isFinite(checkInMinutes) &&
    checkInMinutes > ATTENDANCE_RULES.LATE_AFTER
  ) {
    return "late";
  }
  return "present";
}

export function deriveFinalAttendanceStatus(
  checkInMinutes: number,
  checkOutMinutes: number,
  workingMinutes: number | null,
) {
  let status = deriveCheckInStatus(checkInMinutes);

  if (!Number.isFinite(checkOutMinutes)) {
    return status;
  }

  if (checkOutMinutes <= ATTENDANCE_RULES.HALF_DAY_CHECKOUT_UNTIL) {
    status = pickStrongerStatus(status, "half_day");
  } else if (
    checkOutMinutes >= ATTENDANCE_RULES.SHORT_LEAVE_FROM &&
    checkOutMinutes <= ATTENDANCE_RULES.SHORT_LEAVE_UNTIL
  ) {
    status = pickStrongerStatus(status, "short_leave");
  } else if (checkOutMinutes >= ATTENDANCE_RULES.FULL_DAY_CHECKOUT_AFTER) {
    if (
      workingMinutes != null &&
      workingMinutes >= ATTENDANCE_RULES.MIN_FULL_DAY_MINUTES
    ) {
      status = status === "late" ? "late" : "present";
    }
  }

  if (
    workingMinutes != null &&
    workingMinutes < ATTENDANCE_RULES.MIN_FULL_DAY_MINUTES
  ) {
    status = pickStrongerStatus(status, "half_day");
  }

  return status;
}

function timePartFromDateTime(value: string | undefined) {
  if (!value) return "";
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) {
    const parts = value.split(" ");
    return parts[1] ?? "";
  }
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function workingMinutesFromPunches(
  checkIn: string | null | undefined,
  checkOut: string | null | undefined,
) {
  if (!checkIn || !checkOut) return null;
  const checkInMinutes = wallTimeToMinutesSinceMidnight(
    timePartFromDateTime(checkIn),
  );
  const checkOutMinutes = wallTimeToMinutesSinceMidnight(
    timePartFromDateTime(checkOut),
  );
  if (!Number.isFinite(checkInMinutes) || !Number.isFinite(checkOutMinutes)) {
    return null;
  }
  return Math.max(0, Math.round(checkOutMinutes - checkInMinutes));
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
    ? wallTimeToMinutesSinceMidnight(timePartFromDateTime(checkOut))
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
  return value.replace(/_/g, " ");
}

export function calendarHeatmapClass(
  status: string | undefined,
  isSunday = false,
): string {
  if (isSunday || status === "weekly_off") {
    return "bg-[#E5E7EB] text-[#6B7280]";
  }
  if (!status || status === "absent") {
    return "bg-[#DC2626] text-white shadow-sm";
  }
  if (status === "present" || status === "present_full_day") {
    return "bg-[#0F9D58] text-white shadow-sm";
  }
  if (status === "late") return "bg-[#E8710A] text-white shadow-sm";
  if (status === "half_day") return "bg-[#008CD3] text-white shadow-sm";
  if (status === "short_leave") return "bg-[#F9A825] text-white shadow-sm";
  if (status === "future") return "bg-[#F5F7FA] text-[#CBD5E1]";
  return "bg-[#F1F5F9] text-[#9CA3AF]";
}

export type MonthAttendanceSummary = {
  present: number;
  presentFullDay: number;
  late: number;
  absent: number;
  halfDay: number;
  shortLeave: number;
  weeklyOff: number;
  future: number;
  totalWorkingMinutes: number;
  kpiTotal: number;
};

export type MonthCalendarCell = {
  day: number | null;
  status?: CalculatedAttendanceStatus;
  isSunday?: boolean;
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
        attendance_status: day.is_sunday ? "weekly_off" : "absent",
        is_absent: !day.is_sunday,
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
    if (day.is_sunday || status === "weekly_off") {
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
    const isSunday = dateObj.getDay() === 0;
    const isFuture = dateYmd > todayYmd;
    let status = statusByDate.get(dateYmd);

    if (!status) {
      if (isFuture) status = "future";
      else if (isSunday) status = "weekly_off";
      else status = "absent";
    }

    calendarCells.push({ day: d, status, isSunday });
  }

  const kpiTotal =
    present + presentFullDay + late + absent + halfDay + shortLeave;

  return {
    days,
    summary: {
      present,
      presentFullDay,
      late,
      absent,
      halfDay,
      shortLeave,
      weeklyOff,
      future,
      totalWorkingMinutes,
      kpiTotal,
    },
    calendarCells,
    statusByDate,
  };
}

export function deriveStatusFromPunches(
  checkIn: string | null | undefined,
  checkOut: string | null | undefined,
) {
  if (!checkIn) return "absent";

  const checkInMinutes = wallTimeToMinutesSinceMidnight(
    timePartFromDateTime(checkIn),
  );
  const checkOutMinutes = checkOut
    ? wallTimeToMinutesSinceMidnight(timePartFromDateTime(checkOut))
    : NaN;
  const workingMinutes = workingMinutesFromPunches(checkIn, checkOut);

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
    const record = rowByDate.get(current);
    const checkIn = record?.check_in ?? null;
    const checkOut = record?.check_out ?? null;
    const workingMinutes = workingMinutesFromPunches(checkIn, checkOut);
    const isFuture = current > todayYmd;

    let attendance_status = "absent";
    let is_absent = false;
    let is_weekly_off = false;

    if (isFuture) {
      attendance_status = "future";
    } else if (isSunday && !checkIn) {
      attendance_status = "weekly_off";
      is_weekly_off = true;
    } else if (!checkIn) {
      attendance_status = "absent";
      is_absent = !isSunday;
    } else {
      attendance_status = deriveStatusFromPunches(checkIn, checkOut);
      is_absent = attendance_status === "absent";
    }

    days.push({
      date: current,
      day_name: DAY_NAMES[dayIndex],
      day_short: DAY_NAMES[dayIndex].slice(0, 3),
      is_sunday: isSunday,
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
    if (day.is_weekly_off || day.is_sunday) weeklyOffDays += 1;
    if (day.is_absent || status === "absent") absentDays += 1;
    if (status === "present") presentDays += 1;
    if (status === "late") lateDays += 1;
    if (status === "half_day") halfDayDays += 1;
    if (status === "short_leave") shortLeaveDays += 1;

    const minutes = Number(day.working_time ?? 0);
    if (Number.isFinite(minutes) && minutes > 0) {
      totalWorkingMinutes += minutes;
    }
  }

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
    on_leave_days: 0,
    weekly_off_days: weeklyOffDays,
    total_working_minutes: totalWorkingMinutes,
    total_working_hours: Math.round((totalWorkingMinutes / 60) * 100) / 100,
  };
}

export type CalendarDayExport = {
  date: string;
  day_name: string;
  day_short: string;
  is_sunday: boolean;
  is_weekly_off: boolean;
  is_future: boolean;
  is_absent: boolean;
  check_in: string | null;
  check_out: string | null;
  attendance_status: string;
  stored_status?: string | null;
  working_time: number | null;
  working_hours?: number | string | null;
};

export function applyRulesToCalendarDay(day: CalendarDayExport): CalendarDayExport {
  if (
    day.is_future ||
    day.attendance_status === "not_joined" ||
    day.is_weekly_off
  ) {
    return day;
  }

  if (!day.check_in) {
    return {
      ...day,
      attendance_status: day.is_sunday ? "weekly_off" : "absent",
      is_absent: !day.is_sunday,
    };
  }

  const derivedStatus = deriveFinalAttendanceStatus(
    wallTimeToMinutesSinceMidnight(timePartFromDateTime(day.check_in)),
    day.check_out
      ? wallTimeToMinutesSinceMidnight(timePartFromDateTime(day.check_out))
      : NaN,
    day.working_time,
  );

  return {
    ...day,
    attendance_status: derivedStatus,
    is_absent: derivedStatus === "absent" && !day.is_sunday,
  };
}
