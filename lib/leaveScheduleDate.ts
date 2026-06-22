/** Local YYYY-MM-DD (avoids UTC shift from toISOString). */
export function formatLocalYmd(year: number, monthIndex: number, day: number): string {
  const month = String(monthIndex + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${month}-${d}`;
}

export function getLastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function lastDayOfMonthYmd(year: number, monthIndex: number): string {
  return formatLocalYmd(year, monthIndex, getLastDayOfMonth(year, monthIndex));
}

/** Default: last day of next calendar month (local time). */
export function defaultAllocationDate(): string {
  const today = new Date();
  const nextMonthIndex = today.getMonth() + 1;
  const year = today.getFullYear() + (nextMonthIndex > 11 ? 1 : 0);
  const monthIndex = nextMonthIndex % 12;
  return lastDayOfMonthYmd(year, monthIndex);
}

/** YYYY-MM for `<input type="month">` from YYYY-MM-DD. */
export function monthValueFromAllocationDate(ymd: string): string {
  return ymd.slice(0, 7);
}

/** Last day of selected month (month value YYYY-MM). */
export function allocationDateFromMonthValue(monthValue: string): string {
  const [yearStr, monthStr] = monthValue.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return "";
  }
  return lastDayOfMonthYmd(year, monthIndex);
}

export function isLastDayOfMonthYmd(ymd: string): boolean {
  const parts = ymd.split("-").map(Number);
  if (parts.length !== 3) return false;
  const [year, month, day] = parts;
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return false;
  return day === getLastDayOfMonth(year, month - 1);
}

/** Minimum YYYY-MM for month picker (current month, local). */
export function minAllocationMonthValue(): string {
  const today = new Date();
  return formatLocalYmd(today.getFullYear(), today.getMonth(), 1).slice(0, 7);
}

export function formatAllocationDateLabel(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return ymd;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
