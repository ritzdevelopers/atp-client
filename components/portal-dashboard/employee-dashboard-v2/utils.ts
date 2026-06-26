import {
  getTodayLocalYmd,
  localYmdFromAttendanceValue,
} from "@/lib/attendanceDates";
import type { AttendanceHistoryRow, AttendanceStats } from "./types";

export function historyByLocalYmd(
  history: AttendanceHistoryRow[] | undefined,
): Map<string, AttendanceHistoryRow> {
  const map = new Map<string, AttendanceHistoryRow>();
  if (!history) return map;
  for (const row of history) {
    const key =
      localYmdFromAttendanceValue(row.attendance_date) ??
      localYmdFromAttendanceValue(row.check_in);
    if (key) map.set(key, row);
  }
  return map;
}

export function getGreetingName(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function formatEmployeeCode(
  employeeId: number | string | null | undefined,
): string {
  if (employeeId == null || employeeId === "") return "—";
  const raw = String(employeeId).trim();
  return raw.startsWith("E-") ? `#${raw}` : `#E-${raw.padStart(4, "0")}`;
}

export function formatShiftRange(
  start?: string | null,
  end?: string | null,
  shiftName?: string | null,
): string {
  const name = shiftName?.trim();
  if (start && end) {
    const range = `${start.slice(0, 5)} – ${end.slice(0, 5)}`;
    return name ? `${name} · ${range}` : range;
  }
  return name || "—";
}

function isStatusPresent(status: string): boolean {
  const s = status.toLowerCase();
  return (
    s.includes("present") ||
    s.includes("full_day") ||
    s.includes("half_day") ||
    s.startsWith("late_")
  );
}

function isStatusAbsent(status: string): boolean {
  return status.toLowerCase().includes("absent");
}

function isWeekOff(status: string): boolean {
  const s = status.toLowerCase();
  return s.includes("week") || s.includes("woff") || s === "wo";
}

export function computeMonthlyAttendanceStats(
  history: AttendanceHistoryRow[] | undefined,
  ref = new Date(),
): AttendanceStats {
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
  const todayYmd = getTodayLocalYmd(ref);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const elapsedDays = Math.min(
    daysInMonth,
    Number(todayYmd.slice(8, 10)) || daysInMonth,
  );

  let presentDays = 0;
  let absentDays = 0;
  let weekOffDays = 0;
  let totalWorkingHours = 0;

  for (const row of history ?? []) {
    const ymd =
      localYmdFromAttendanceValue(row.attendance_date) ??
      localYmdFromAttendanceValue(row.check_in);
    if (!ymd?.startsWith(prefix)) continue;

    const status = String(row.attendance_status ?? "");
    if (isWeekOff(status)) weekOffDays += 1;
    else if (isStatusAbsent(status)) absentDays += 1;
    else if (isStatusPresent(status)) presentDays += 1;

    const wt = Number(row.working_time);
    if (!Number.isNaN(wt) && wt > 0) totalWorkingHours += wt;
  }

  const workingDaysTarget = Math.max(elapsedDays - weekOffDays, 1);
  const monthProgress = Math.min(
    100,
    Math.round((presentDays / workingDaysTarget) * 100),
  );

  return {
    presentDays,
    absentDays,
    weekOffDays,
    totalWorkingHours,
    monthProgress,
  };
}

export function getCurrentDateAndTime(): { user_date: string; user_time: string } {
  const now = new Date();
  const user_date = getTodayLocalYmd(now);
  const user_time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return { user_date, user_time };
}

export function upsertTodayHistory(
  prev: import("./types").EmployeeDashboardResponse | null,
  todayYmd: string,
  patch: Partial<AttendanceHistoryRow>,
): import("./types").EmployeeDashboardResponse | null {
  if (!prev) return prev;
  const history = [...(prev.attendance_history ?? [])];
  const idx = history.findIndex((row) => {
    const ymd =
      localYmdFromAttendanceValue(row.attendance_date) ??
      localYmdFromAttendanceValue(row.check_in);
    return ymd === todayYmd;
  });

  if (idx >= 0) {
    history[idx] = { ...history[idx], ...patch };
  } else {
    history.unshift({
      attendance_date: todayYmd,
      ...patch,
    });
  }

  return { ...prev, attendance_history: history };
}

export function formatMinutesAsHours(
  value: string | number | null | undefined,
): string {
  if (value == null || value === "") return "—";
  const minutes = Number(value);
  if (Number.isNaN(minutes) || minutes < 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export function formatElapsedDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}
