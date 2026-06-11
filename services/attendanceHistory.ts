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
