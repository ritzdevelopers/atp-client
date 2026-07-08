export type AttendanceKpiFilter =
  | "all"
  | "present"
  | "absent"
  | "on_time"
  | "late";

export function isPresentStatus(status: string | undefined): boolean {
  const value = String(status || "").trim().toLowerCase();
  return value === "present" || (value.includes("present") && !value.includes("absent"));
}

export function isLateStatus(status: string | undefined): boolean {
  const value = String(status || "").trim().toLowerCase();
  return value.includes("late");
}

export function isAbsentStatus(status: string | undefined): boolean {
  const value = String(status || "").trim().toLowerCase();
  if (!value || value === "absent") return true;
  return value.includes("absent") && !value.includes("present");
}

export function matchesAttendanceKpiFilter(
  status: string | undefined,
  filter: AttendanceKpiFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "present") {
    return isPresentStatus(status) || (isLateStatus(status) && !isAbsentStatus(status));
  }
  if (filter === "absent") return isAbsentStatus(status);
  if (filter === "on_time") return isPresentStatus(status);
  if (filter === "late") return isLateStatus(status);
  return true;
}

export function attendanceKpiFilterLabel(filter: AttendanceKpiFilter): string {
  const labels: Record<AttendanceKpiFilter, string> = {
    all: "All",
    present: "Present",
    absent: "Absent",
    on_time: "On time",
    late: "Late",
  };
  return labels[filter];
}

export function formatAttendanceRowTime(dateTime: string | undefined): string {
  if (!dateTime) return "—";
  const d = new Date(dateTime.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return dateTime;
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatAttendanceStatusLabel(status: string | undefined): string {
  const raw = String(status || "").trim();
  if (!raw) return "N/A";
  return raw.replace(/_/g, " ");
}

export function attendanceStatusBadgeClass(status: string | undefined): string {
  const value = String(status || "").trim().toLowerCase();
  if (value === "present") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60";
  if (value.includes("late")) return "bg-amber-50 text-amber-700 ring-1 ring-amber-200/60";
  if (value.includes("leave")) return "bg-rose-50 text-rose-700 ring-1 ring-rose-200/60";
  if (value.includes("absent")) return "bg-slate-100 text-slate-600 ring-1 ring-slate-200/60";
  if (value.includes("half")) return "bg-sky-50 text-sky-700 ring-1 ring-sky-200/60";
  return "bg-slate-100 text-slate-600 ring-1 ring-slate-200/60";
}

export function ymdToMonthYear(ymd: string): { month: number; year: number } {
  const [year, month] = ymd.split("-").map(Number);
  return { month: month || 1, year: year || new Date().getFullYear() };
}
