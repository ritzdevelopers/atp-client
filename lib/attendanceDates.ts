/**
 * Local calendar helpers (browser timezone) and safe formatting for attendance.
 */

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function getLocalYmdFromDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function getTodayLocalYmd(ref: Date = new Date()): string {
  return getLocalYmdFromDate(ref);
}

/** Local YYYY-MM-DD for API timestamps; date-only strings use local noon to avoid UTC day shift. */
export function localYmdFromAttendanceValue(value: string | null | undefined): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (s === "") return null;

  const only = DATE_ONLY.exec(s);
  if (only) {
    const y = Number(only[1]);
    const mo = Number(only[2]) - 1;
    const d = Number(only[3]);
    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
    const local = new Date(y, mo, d, 12, 0, 0, 0);
    if (Number.isNaN(local.getTime())) return null;
    return getLocalYmdFromDate(local);
  }

  const inst = new Date(s);
  if (Number.isNaN(inst.getTime())) return null;
  return getLocalYmdFromDate(inst);
}

export function isSameLocalCalendarDay(
  value: string | null | undefined,
  todayYmd: string
): boolean {
  const ymd = localYmdFromAttendanceValue(value);
  return ymd !== null && ymd === todayYmd;
}

function parseDisplayInstant(value: string | null | undefined): Date | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (s === "") return null;
  const only = DATE_ONLY.exec(s);
  if (only) {
    const y = Number(only[1]);
    const mo = Number(only[2]) - 1;
    const d = Number(only[3]);
    const local = new Date(y, mo, d, 12, 0, 0, 0);
    return Number.isNaN(local.getTime()) ? null : local;
  }
  const inst = new Date(s);
  return Number.isNaN(inst.getTime()) ? null : inst;
}

export function formatAttendanceLogLocal(value: string | null | undefined): string {
  const d = parseDisplayInstant(value);
  if (!d) return "—";
  const datePart = d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const timePart = d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${datePart} • ${timePart}`;
}

export function formatAttendanceTimeLocal(value: string | null | undefined): string {
  const d = parseDisplayInstant(value);
  if (!d) return "—";
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Backend may send decimal hours (e.g. "2.50") or minutes as integer. */
export function formatWorkingTimeDisplay(value: string | number | null | undefined): string {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n) || n < 0) return "—";
  let totalMin: number;
  if (n > 48 && n === Math.floor(n)) {
    totalMin = Math.round(n);
  } else {
    totalMin = Math.round(n * 60);
  }
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export type AttendanceDayVisual = {
  boxClass: string;
  meaning: string;
};

/** Map compound status (e.g. late_absent, present_full_day) to calendar cell colors. */
export function getAttendanceDayVisual(status: string | null | undefined): AttendanceDayVisual {
  const s = (status || "").toLowerCase().trim();
  if (!s) {
    return {
      boxClass: "border-slate-200 bg-slate-100 text-slate-500",
      meaning: "No record",
    };
  }

  const isAbsent = s.includes("absent");
  const isFullDay = s.includes("full_day");
  const isHalfDay = s.includes("half_day");
  const isShortLeave = s.includes("short_leave");
  const isLate = s.startsWith("late_") || s.includes("_late_");

  if (isAbsent) {
    return {
      boxClass: "border-red-700 bg-red-600 text-white shadow-sm",
      meaning: "Absent / insufficient hours",
    };
  }
  if (isHalfDay) {
    return {
      boxClass: "border-pink-600 bg-pink-500 text-white shadow-sm",
      meaning: "Half day",
    };
  }
  if (isShortLeave) {
    return {
      boxClass: "border-rose-950 bg-rose-950 text-rose-50 shadow-sm",
      meaning: "Short leave",
    };
  }
  if (isFullDay) {
    return {
      boxClass: "border-emerald-700 bg-emerald-600 text-white shadow-sm",
      meaning: "Full day",
    };
  }
  if (!isLate && s.startsWith("present")) {
    return {
      boxClass: "border-amber-600 bg-amber-500 text-white shadow-sm",
      meaning: "On time (partial day)",
    };
  }
  if (isLate) {
    return {
      boxClass: "border-orange-600 bg-orange-500 text-white shadow-sm",
      meaning: "Late arrival",
    };
  }

  return {
    boxClass: "border-slate-300 bg-slate-200 text-slate-800",
    meaning: s.replace(/_/g, " "),
  };
}
