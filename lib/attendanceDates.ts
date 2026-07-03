/**
 * Local calendar helpers (browser timezone) and safe formatting for attendance.
 */

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * MySQL / API sends naive wall time (e.g. "2026-05-13 10:45:00" or "2026-05-13T10:45:00.000Z" from JSON).
 * `new Date(string)` often treats naive strings as UTC → wrong local display (e.g. +5:30).
 * For display we build `Date` from the numeric fields so the clock matches the stored check-in time.
 */
/** Wall-clock from string digits (Z/offset ignored when building — see parseAttendanceNaiveLocal). */
const NAIVE_DATETIME =
  /^(\d{4})-(\d{2})-(\d{2})[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,6})\d*)?(?:Z|[+-]\d{2}:?\d{2}(?::?\d{2})?)?$/i;

function hasExplicitEndTimezone(s: string): boolean {
  const t = s.trim();
  return /Z$/i.test(t) || /[+-]\d{2}:?\d{2}(?::?\d{2})?$/i.test(t);
}

/** If string matches naive SQL/ISO datetime, return wall-clock fields (ignore trailing Z for display). */
function matchNaiveDateTimeParts(s: string): {
  y: number;
  mo: number;
  d: number;
  hh: string;
  mm: string;
} | null {
  const m = NAIVE_DATETIME.exec(s.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const hNum = Number(m[4]);
  const miNum = Number(m[5]);
  if (
    !Number.isFinite(y) ||
    !Number.isFinite(mo) ||
    !Number.isFinite(d) ||
    !Number.isFinite(hNum) ||
    !Number.isFinite(miNum)
  ) {
    return null;
  }
  return {
    y,
    mo,
    d,
    hh: String(hNum).padStart(2, "0"),
    mm: String(miNum).padStart(2, "0"),
  };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function getLocalYmdFromDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function getTodayLocalYmd(ref: Date = new Date()): string {
  return getLocalYmdFromDate(ref);
}

/**
 * Local YYYY-MM-DD for grouping "today" vs history rows.
 * - Pure `YYYY-MM-DD` uses local noon (avoids UTC midnight day shift).
 * - Strings with `Z` or `±offset` are treated as instants → local calendar day (matches browser).
 * - Naive `YYYY-MM-DD hh:mm:ss` (no TZ) uses the date part from the string (wall date from DB).
 */
export function wallClockMinutesFromDateTime(
  value: string | number | Date | null | undefined,
): number {
  if (value == null || value === "") return NaN;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.getHours() * 60 + value.getMinutes() + value.getSeconds() / 60;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
    }
  }
  if (typeof value === "string") {
    const parts = matchNaiveDateTimeParts(value);
    if (parts) {
      const h = Number(parts.hh);
      const mi = Number(parts.mm);
      if (Number.isFinite(h) && Number.isFinite(mi)) {
        return h * 60 + mi;
      }
    }
    const timeOnly = value.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (timeOnly) {
      const h = Number(timeOnly[1]);
      const mi = Number(timeOnly[2]);
      const sec = Number(timeOnly[3] ?? 0);
      if ([h, mi, sec].every(Number.isFinite)) {
        return h * 60 + mi + sec / 60;
      }
    }
  }
  return NaN;
}

export function localYmdFromAttendanceValue(value: string | null | undefined): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (s === "") return null;

  const only = DATE_ONLY.exec(s);
  if (only && only[0] === s) {
    const y = Number(only[1]);
    const mo = Number(only[2]) - 1;
    const d = Number(only[3]);
    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
    const local = new Date(y, mo, d, 12, 0, 0, 0);
    if (Number.isNaN(local.getTime())) return null;
    return getLocalYmdFromDate(local);
  }

  if (hasExplicitEndTimezone(s)) {
    const inst = new Date(s);
    if (Number.isNaN(inst.getTime())) return null;
    return getLocalYmdFromDate(inst);
  }

  const naive = NAIVE_DATETIME.exec(s);
  if (naive) {
    const yy = naive[1].padStart(4, "0");
    const mm = naive[2].padStart(2, "0");
    const dd = naive[3].padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
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

export function parseAttendanceNaiveLocal(
  value: string | number | null | undefined
): Date | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
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

  const m = NAIVE_DATETIME.exec(s);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const h = Number(m[4]);
    const mi = Number(m[5]);
    const sec = m[6] != null && m[6] !== "" ? Number(m[6]) : 0;
    let ms = 0;
    if (m[7] != null && m[7] !== "") {
      const frac = String(m[7]).replace(/\D/g, "").padEnd(3, "0").slice(0, 3);
      ms = Number(frac);
      if (Number.isNaN(ms)) ms = 0;
    }
    if (
      !Number.isFinite(y) ||
      !Number.isFinite(mo) ||
      !Number.isFinite(d) ||
      !Number.isFinite(h) ||
      !Number.isFinite(mi) ||
      !Number.isFinite(sec)
    ) {
      return null;
    }
    const local = new Date(y, mo, d, h, mi, sec, ms);
    return Number.isNaN(local.getTime()) ? null : local;
  }

  const inst = new Date(s);
  return Number.isNaN(inst.getTime()) ? null : inst;
}

export function formatAttendanceLogLocal(
  value: string | number | null | undefined
): string {
  if (value == null || value === "") return "—";

  if (typeof value === "string") {
    const parts = matchNaiveDateTimeParts(value);
    if (parts) {
      const cal = new Date(parts.y, parts.mo - 1, parts.d, 12, 0, 0, 0);
      if (Number.isNaN(cal.getTime())) return "—";
      const datePart = cal.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      return `${datePart} • ${parts.hh}:${parts.mm}`;
    }
  }

  const d = parseAttendanceNaiveLocal(value);

  if (!d) return "—";

  const datePart = d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const timePart =
    `${String(d.getHours()).padStart(2, "0")}:` +
    `${String(d.getMinutes()).padStart(2, "0")}`;

  return `${datePart} • ${timePart}`;
}

export function formatAttendanceTimeLocal(value: string | number | null | undefined): string {
  if (value == null || value === "") return "—";

  if (typeof value === "string") {
    const parts = matchNaiveDateTimeParts(value);
    if (parts) return `${parts.hh}:${parts.mm}`;
  }

  const d = parseAttendanceNaiveLocal(value);
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
