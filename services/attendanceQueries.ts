const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export type AttendanceQueryCategory =
  | "forget_punch_in"
  | "forget_punch_out"
  | "late_punch_in";

export type AttendanceQueryRow = {
  id: number;
  user_id: number;
  org_id: number;
  team_id: number | null;
  query_status: string;
  category: string;
  query_message: string;
  attendance_date: string;
  approved_by: number | null;
  approved_by_name: string | null;
  admin_response: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at?: string | null;
};

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function fetchMyAttendanceQueries(
  token: string,
  orgId: number,
): Promise<AttendanceQueryRow[]> {
  const res = await fetch(
    `${API_URL}/api/employees/my-attendance-queries?org_id=${encodeURIComponent(String(orgId))}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );
  const json = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      (json.message as string) || "Could not load attendance queries",
    );
  }
  const data = json.data;
  if (!Array.isArray(data)) return [];
  return data as AttendanceQueryRow[];
}

export async function raiseAttendanceQuery(
  token: string,
  payload: {
    org_id: number;
    category: AttendanceQueryCategory;
    query_message: string;
    attendance_date: string;
  },
): Promise<{ message?: string; id?: number }> {
  const res = await fetch(`${API_URL}/api/employees/raise-attendance-query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      org_id: payload.org_id,
      category: payload.category,
      query_message: payload.query_message,
      attendance_date: payload.attendance_date,
    }),
  });
  const json = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      (json.message as string) || "Could not submit attendance query",
    );
  }
  const data = json.data as { id?: number } | undefined;
  return {
    message: json.message as string | undefined,
    id: data?.id,
  };
}

/** Admin / HR / manager — list org queries, optionally scoped to `team_id`. */
export async function fetchAllAttendanceQueries(
  token: string,
  orgId: number,
  options?: {
    team_id?: number;
    query_status?: string;
    category?: string;
    query_message?: string;
    attendance_date?: string;
  },
): Promise<AttendanceQueryRow[]> {
  const params = new URLSearchParams();
  params.set("org_id", String(orgId));
  if (options?.team_id != null && Number.isFinite(Number(options.team_id))) {
    params.set("team_id", String(options.team_id));
  }
  if (options?.query_status != null && String(options.query_status).trim() !== "") {
    params.set("query_status", String(options.query_status).trim());
  }
  if (options?.category != null && String(options.category).trim() !== "") {
    params.set("category", String(options.category).trim());
  }
  if (options?.query_message != null && String(options.query_message).trim() !== "") {
    params.set("query_message", String(options.query_message).trim());
  }
  if (options?.attendance_date != null && String(options.attendance_date).trim() !== "") {
    params.set("attendance_date", String(options.attendance_date).trim());
  }
  const res = await fetch(
    `${API_URL}/api/user/get-all-attendance-queries?${params.toString()}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );
  const json = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      (json.message as string) || "Could not load attendance queries",
    );
  }
  const data = json.data;
  if (!Array.isArray(data)) return [];
  return data as AttendanceQueryRow[];
}

/** Admin / HR / manager — approve or reject a pending attendance-related query. */
export async function updateAttendanceQueryStatus(
  token: string,
  payload: {
    org_id: number;
    employee_id: number;
    query_id: number;
    updated_query_status: "approved" | "rejected";
    admin_response: string;
  },
): Promise<{ message?: string }> {
  const res = await fetch(`${API_URL}/api/user/update-attendance-query-status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      org_id: payload.org_id,
      employee_id: payload.employee_id,
      query_id: payload.query_id,
      updated_query_status: payload.updated_query_status,
      admin_response: payload.admin_response.trim(),
    }),
  });
  const json = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      (json.message as string) || "Could not update attendance query",
    );
  }
  return { message: json.message as string | undefined };
}

export async function correctAttendanceQuery(
  token: string,
  payload: {
    org_id: number;
    query_id: number;
    category?: AttendanceQueryCategory;
    query_message?: string;
    attendance_date?: string;
  },
): Promise<{ message?: string }> {
  const body: Record<string, unknown> = {
    org_id: payload.org_id,
    query_id: payload.query_id,
  };
  if (payload.category != null) body.category = payload.category;
  if (payload.query_message != null) body.query_message = payload.query_message;
  if (payload.attendance_date != null) {
    body.attendance_date = payload.attendance_date;
  }
  const res = await fetch(`${API_URL}/api/employees/correct-attendance-query`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const json = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      (json.message as string) || "Could not update attendance query",
    );
  }
  return { message: json.message as string | undefined };
}

export function attendanceCategoryLabel(c: string): string {
  switch (c) {
    case "forget_punch_in":
      return "Forgot punch in";
    case "forget_punch_out":
      return "Forgot punch out";
    case "late_punch_in":
      return "Late punch in";
    default:
      return c.replace(/_/g, " ");
  }
}
