import { assertExportableMonth } from "@/lib/attendanceExportPeriod";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export type AttendanceHistoryRow = {
  user_id?: number | string;
  attendance_id?: number | string;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  user_role_name?: string;
  emp_code?: string;
  attendance_history?: string;
  attendance_date?: string;
  check_in?: string;
  check_out?: string;
  attendance_status?: string;
  working_time?: string | number;
  joining_date?: string;
};

export type AttendanceHistoryScope = "month" | "day";

export type AttendanceHistoryQuery = {
  month: number;
  year: number;
  date?: number;
  scope?: AttendanceHistoryScope;
};

export type AttendanceExportMode = "full" | "monthly";

export type AttendanceExportQuery =
  | { mode: "full" }
  | { mode: "monthly"; month: number; year: number };

export type AttendanceSheetReport = {
  calendar_days_in_month: number | null;
  present_days: number;
  absent_days: number;
  working_days: number;
  full_days: number;
  half_days: number;
  short_leaves: number;
  paid_leaves: number;
  unpaid_leaves: number;
  half_day_leaves: number;
  late_marks: number;
  weekly_offs: number;
  comp_off_balance: number;
  late_leave_deduction: number;
  payable_days: number;
  weekly_off_days?: number;
  total_working_minutes: number;
  total_working_hours: number;
  total_days: number;
};

export type AttendanceExportResponse = {
  success?: boolean;
  message?: string;
  employee: {
    user_id: number | string;
    user_name: string;
    user_email: string;
    user_phone: string;
    user_role_name: string;
    emp_code: string;
    joining_date: string;
  };
  period: {
    mode: AttendanceExportMode;
    from_date: string;
    to_date: string;
    label: string;
  };
  summary: {
    total_days: number;
    present_days: number;
    late_days: number;
    absent_days: number;
    half_day_days: number;
    short_leave_days: number;
    on_leave_days: number;
    late_derived_leaves?: number;
    total_absent_with_late_leaves?: number;
    weekly_off_days?: number;
    total_working_minutes: number;
    total_working_hours: number;
  };
  attendance_rules?: {
    on_time_until?: string;
    late_from?: string;
    late_after?: string;
    half_day_checkin_after: string;
    half_day_checkout_until: string;
    short_leave_from: string;
    short_leave_until: string;
    full_day_checkout_after: string;
    min_full_day_hours: number;
    min_absent_hours?: number;
    lates_per_derived_leave?: number;
  };
  calendar_days?: Array<{
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
    on_approved_leave?: boolean;
    regularization_applied?: boolean;
    leave_type_name?: string | null;
  }>;
  sheet_report?: AttendanceSheetReport;
  rows: AttendanceHistoryRow[];
};

/** Alias used by Excel export utilities. */
export type AttendanceExportPayload = AttendanceExportResponse;

export type AllUsersAttendanceQuery = {
  date?: string;
  month?: number;
  year?: number;
  status?: string;
};

export type AttendanceHeaderData = {
  total_company_employees: number;
  inactive_company_employees?: number;
  selected_date_present_employees: number;
  selected_date_absent_employees: number;
  check_in_on_time_employees: number;
  check_in_late_employees: number;
  selected_date_on_leave_employees: number;
};

export type EmployeeAttendanceRow = {
  employee_id: number | string;
  user_id?: number | string | null;
  emp_code?: string;
  biometric_employee_code?: string;
  biometric_employee_id?: number | string;
  employee_name: string;
  employee_email: string;
  org_id: number | string;
  employee_designation: string;
  employee_profile_img: string;
  employee_phone: string;
  attendance_check_in_time: string;
  attendance_check_out_time: string;
  employee_working_hours: number;
  employee_attendance_status: string;
  attendance_date: string;
  is_active_employee: boolean;
  total_attendance_days: number;
  total_present_days: number;
  total_absent_days: number;
  total_on_leave_days: number;
  total_check_in_on_time_days: number;
  total_check_in_late_days: number;
};

export type AllUsersAttendanceResponse = {
  success?: boolean;
  message?: string;
  source?: string;
  selected_date?: string;
  header_data?: AttendanceHeaderData;
  employees_attendance_data?: EmployeeAttendanceRow[];
};

type AttendanceHistoryResponse = {
  success?: boolean;
  data?: AttendanceHistoryRow[];
  message?: string;
};

function buildSingleUserHistoryUrl(
  orgId: string,
  employeeId: number | string,
  query: AttendanceHistoryQuery,
): string {
  const params = new URLSearchParams({
    org_id: orgId,
    employee_id: String(employeeId),
    month: String(query.month),
    year: String(query.year),
    scope: query.scope || "month",
  });
  if (query.scope === "day" && query.date) {
    params.set("date", String(query.date));
  }
  return `${API_URL}/api/attendance-history/get-single-user-with-attendance-history?${params.toString()}`;
}

function buildTeamMemberHistoryUrl(
  orgId: string,
  teamId: number | string,
  employeeId: number | string,
  query: AttendanceHistoryQuery,
): string {
  const params = new URLSearchParams({
    org_id: orgId,
    team_id: String(teamId),
    employee_id: String(employeeId),
    month: String(query.month),
    year: String(query.year),
    scope: query.scope || "month",
  });
  if (query.scope === "day" && query.date) {
    params.set("date", String(query.date));
  }
  return `${API_URL}/api/attendance-history/get-team-member-attendance-history?${params.toString()}`;
}

export async function fetchTeamMemberAttendanceHistory(
  token: string,
  orgId: string,
  teamId: number | string,
  employeeId: number | string,
  query: AttendanceHistoryQuery,
): Promise<AttendanceHistoryRow[]> {
  const res = await fetch(
    buildTeamMemberHistoryUrl(orgId, teamId, employeeId, query),
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  const data = (await res.json()) as AttendanceHistoryResponse;
  if (!res.ok || data.success === false) {
    throw new Error(data.message || "Could not load attendance history.");
  }
  return Array.isArray(data.data) ? data.data : [];
}

export async function fetchSingleUserAttendanceHistory(
  token: string,
  orgId: string,
  employeeId: number | string,
  query: AttendanceHistoryQuery,
): Promise<AttendanceHistoryRow[]> {
  const res = await fetch(buildSingleUserHistoryUrl(orgId, employeeId, query), {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json()) as AttendanceHistoryResponse;
  if (!res.ok || data.success === false) {
    throw new Error(data.message || "Could not load attendance history.");
  }
  return Array.isArray(data.data) ? data.data : [];
}

export async function fetchAttendanceExportData(
  token: string,
  orgId: string,
  employeeId: number | string,
  query: AttendanceExportQuery,
): Promise<AttendanceExportResponse> {
  if (query.mode === "monthly") {
    assertExportableMonth(query.year, query.month);
  }

  const params = new URLSearchParams({
    org_id: orgId,
    employee_id: String(employeeId),
    mode: query.mode,
  });
  if (query.mode === "monthly") {
    params.set("month", String(query.month));
    params.set("year", String(query.year));
  }

  const res = await fetch(
    `${API_URL}/api/attendance-history/calculate-attendance-sheet-export?${params.toString()}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  const data = (await res.json()) as AttendanceExportResponse & {
    message?: string;
  };
  if (!res.ok || data.success === false) {
    throw new Error(data.message || "Could not load attendance sheet calculation.");
  }

  const period = data.period as AttendanceExportResponse["period"] & {
    fromDate?: string;
    toDate?: string;
  };

  return {
    ...data,
    employee: data.employee,
    summary: data.summary ?? {
      total_days: 0,
      present_days: 0,
      late_days: 0,
      absent_days: 0,
      half_day_days: 0,
      short_leave_days: 0,
      on_leave_days: 0,
      total_working_minutes: 0,
      total_working_hours: 0,
    },
    rows: Array.isArray(data.rows) ? data.rows : [],
    period: {
      mode: period?.mode ?? query.mode,
      from_date: period?.from_date ?? period?.fromDate ?? "",
      to_date: period?.to_date ?? period?.toDate ?? "",
      label: period?.label ?? "Attendance export",
    },
  };
}

/** Server-calculated month attendance (rules, leaves, regularization, comp off). */
export async function fetchAttendanceSheetCalculation(
  token: string,
  orgId: string,
  employeeId: number | string | null | undefined,
  query: { month: number; year: number },
): Promise<AttendanceExportResponse> {
  assertExportableMonth(query.year, query.month);

  const params = new URLSearchParams({
    org_id: orgId,
    mode: "monthly",
    month: String(query.month),
    year: String(query.year),
  });
  if (employeeId != null && String(employeeId).trim() !== "") {
    params.set("employee_id", String(employeeId));
  }

  const res = await fetch(
    `${API_URL}/api/attendance-history/calculate-attendance-sheet-export?${params.toString()}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  const data = (await res.json()) as AttendanceExportResponse & {
    message?: string;
  };
  if (!res.ok || data.success === false) {
    throw new Error(data.message || "Could not load attendance sheet calculation.");
  }

  const period = data.period as AttendanceExportResponse["period"] & {
    fromDate?: string;
    toDate?: string;
  };

  return {
    ...data,
    employee: data.employee,
    summary: data.summary ?? {
      total_days: 0,
      present_days: 0,
      late_days: 0,
      absent_days: 0,
      half_day_days: 0,
      short_leave_days: 0,
      on_leave_days: 0,
      total_working_minutes: 0,
      total_working_hours: 0,
    },
    rows: Array.isArray(data.rows) ? data.rows : [],
    period: {
      mode: period?.mode ?? "monthly",
      from_date: period?.from_date ?? period?.fromDate ?? "",
      to_date: period?.to_date ?? period?.toDate ?? "",
      label: period?.label ?? "Attendance",
    },
  };
}

function buildAllUsersAttendanceUrl(
  orgId: string,
  query: AllUsersAttendanceQuery,
): string {
  const params = new URLSearchParams({ org_id: orgId });
  if (query.date) params.set("date", query.date);
  if (query.month) params.set("month", String(query.month));
  if (query.year) params.set("year", String(query.year));
  if (query.status) params.set("status", query.status);
  return `${API_URL}/api/attendance-history/get-all-users-with-attendance-history?${params.toString()}`;
}

export async function fetchAllUsersAttendanceHistory(
  token: string,
  orgId: string,
  query: AllUsersAttendanceQuery,
): Promise<AllUsersAttendanceResponse> {
  const res = await fetch(buildAllUsersAttendanceUrl(orgId, query), {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json()) as AllUsersAttendanceResponse;
  if (!res.ok || data.success === false) {
    throw new Error(data.message || "Could not load attendance history.");
  }
  return data;
}

/** Manage attendance list sourced from biometric SQL Server (with portal user_id). */
export async function fetchBiometricManageAttendance(
  token: string,
  orgId: string,
  query: AllUsersAttendanceQuery,
): Promise<AllUsersAttendanceResponse> {
  const params = new URLSearchParams({ org_id: orgId });
  if (query.date) params.set("date", query.date);
  if (query.month) params.set("month", String(query.month));
  if (query.year) params.set("year", String(query.year));
  if (query.status) params.set("status", query.status);

  const res = await fetch(
    `${API_URL}/api/biometric/manage-attendance?${params.toString()}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  const data = (await res.json()) as AllUsersAttendanceResponse;
  if (!res.ok || data.success === false) {
    throw new Error(data.message || "Could not load biometric attendance.");
  }
  return data;
}
