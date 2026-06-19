const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export type AttendanceHistoryRow = {
  user_id?: number | string;
  attendance_id?: number | string;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  user_role_name?: string;
  attendance_history?: string;
  attendance_date?: string;
  check_in?: string;
  check_out?: string;
  attendance_status?: string;
  working_time?: string | number;
  joining_date?: string;
};

export type AttendanceHistoryQuery = {
  month: number;
  year: number;
  date?: number;
};

export type AllUsersAttendanceQuery = {
  date?: string;
  month?: number;
  year?: number;
  status?: string;
};

export type AttendanceHeaderData = {
  total_company_employees: number;
  selected_date_present_employees: number;
  selected_date_absent_employees: number;
  check_in_on_time_employees: number;
  check_in_late_employees: number;
  selected_date_on_leave_employees: number;
};

export type EmployeeAttendanceRow = {
  employee_id: number | string;
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
  });
  if (query.date) {
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
  });
  if (query.date) {
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
