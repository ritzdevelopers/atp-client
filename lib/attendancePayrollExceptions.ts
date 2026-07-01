import payrollExceptions from "@/config/attendancePayrollExceptions.json";

const EXCEPTION_EMP_CODES = new Set(
  (payrollExceptions.full_day_present_emp_codes ?? []).map((code) =>
    String(code).trim().toUpperCase(),
  ),
);

export const PAYROLL_EXCEPTION_DESCRIPTION =
  payrollExceptions.description ??
  "These employees count as full-day present in Excel payroll when they attend; only absent and leave reduce payable days.";

export function isPayrollExceptionEmpCode(empCode: string | null | undefined): boolean {
  const normalized = String(empCode ?? "")
    .trim()
    .toUpperCase();
  if (!normalized) return false;
  return EXCEPTION_EMP_CODES.has(normalized);
}

export function listPayrollExceptionEmpCodes(): string[] {
  return [...EXCEPTION_EMP_CODES];
}

/** Excel daily log: how this day counts toward payroll for exception employees. */
export function payrollDayCreditLabel(
  day: {
    is_future?: boolean;
    attendance_status?: string | null;
    is_absent?: boolean;
    is_weekend?: boolean;
    check_in?: string | null;
  },
  empCode: string | null | undefined,
): string {
  if (!isPayrollExceptionEmpCode(empCode)) return "";

  if (day.is_future || day.attendance_status === "not_joined") return "—";
  if (day.is_weekend && !day.check_in) return "Weekly off";

  const status = String(day.attendance_status || "").trim().toLowerCase();
  if (status === "absent" || day.is_absent) return "Absent";

  if (day.check_in) return "Full day (payroll rule)";
  return "—";
}
