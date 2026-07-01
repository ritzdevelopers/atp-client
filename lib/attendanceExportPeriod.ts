const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function getCurrentCalendarMonth(now = new Date()) {
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function isFutureCalendarMonth(
  year: number,
  month: number,
  now = new Date(),
): boolean {
  const current = getCurrentCalendarMonth(now);
  return year > current.year || (year === current.year && month > current.month);
}

export function clampMonthToExportable(
  year: number,
  month: number,
  now = new Date(),
): number {
  const current = getCurrentCalendarMonth(now);
  if (year > current.year) return current.month;
  if (year === current.year && month > current.month) return current.month;
  return month;
}

export function getExportableMonthsForYear(year: number, now = new Date()) {
  const current = getCurrentCalendarMonth(now);
  const maxMonth =
    year < current.year ? 12 : year > current.year ? 0 : current.month;

  return MONTH_LABELS.slice(0, maxMonth).map((label, index) => ({
    value: index + 1,
    label,
  }));
}

export function futureMonthExportMessage(year: number, month: number): string {
  const label = MONTH_LABELS[month - 1] ?? String(month);
  return `You cannot download attendance for future months. ${label} ${year} has not started yet.`;
}

export function assertExportableMonth(
  year: number,
  month: number,
  now = new Date(),
): void {
  if (isFutureCalendarMonth(year, month, now)) {
    throw new Error(futureMonthExportMessage(year, month));
  }
}
