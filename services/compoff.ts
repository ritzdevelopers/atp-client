const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export type CompOffWorkStatus = "half_day" | "full_day";
export type CompOffQueryStatus = "pending" | "approved" | "rejected";

export type CompOffRow = {
  id: number;
  user_id: number;
  org_id: number;
  compoff_date: string;
  check_in: string;
  check_out: string;
  work_status: CompOffWorkStatus;
  reason: string;
  query_status: CompOffQueryStatus;
  review_comment?: string | null;
  reporting_manager: number;
  reporting_manager_name?: string | null;
  reporting_manager_email?: string | null;
  reporting_manager_code?: string | null;
  approved_by?: number | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type CompOffManagerRow = CompOffRow & {
  employee_name?: string | null;
  employee_email?: string | null;
  employee_code?: string | null;
  emp_code?: string | null;
  employee_role_name?: string | null;
  team_id?: number | null;
  team_name?: string | null;
  team_leader_id?: number | null;
  team_leader_name?: string | null;
  compoff_balance?: number | null;
  compoff_used?: number | null;
};

export type SelectedDateAttendanceRecord = {
  compoff_date: string;
  eligible: boolean;
  message?: string;
  check_in?: string;
  check_out?: string;
  attendance_status?: string | null;
  working_time?: number | null;
  work_status?: CompOffWorkStatus;
  derived_attendance_status?: string;
  working_minutes?: number;
  existing_request?: {
    id: number;
    query_status: CompOffQueryStatus;
  } | null;
};

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function fetchSelectedDateAttendance(
  token: string,
  orgId: number,
  compoffDate: string,
): Promise<SelectedDateAttendanceRecord> {
  const params = new URLSearchParams({
    org_id: String(orgId),
    compoff_date: compoffDate,
  });
  const res = await fetch(
    `${API_URL}/api/comp-off-management/get-selected-date-attendance?${params.toString()}`,
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
      (json.message as string) || "Could not load attendance for selected date",
    );
  }
  return json as unknown as SelectedDateAttendanceRecord;
}

export async function fetchMyCompOffs(
  token: string,
  orgId: number,
  filters?: {
    query_status?: CompOffQueryStatus;
    compoff_date?: string;
  },
): Promise<CompOffRow[]> {
  const params = new URLSearchParams({ org_id: String(orgId) });
  if (filters?.query_status) params.set("query_status", filters.query_status);
  if (filters?.compoff_date) params.set("compoff_date", filters.compoff_date);

  const res = await fetch(
    `${API_URL}/api/comp-off-management/get-my-all-comp-offs?${params.toString()}`,
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
      (json.message as string) || "Could not load comp off requests",
    );
  }
  const result = json.result;
  return Array.isArray(result) ? (result as CompOffRow[]) : [];
}

export async function fetchCompOffById(
  token: string,
  orgId: number,
  compoffId: number,
): Promise<CompOffRow> {
  const res = await fetch(
    `${API_URL}/api/comp-off-management/get-single-comp-off/${compoffId}?org_id=${encodeURIComponent(String(orgId))}`,
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
      (json.message as string) || "Could not load comp off request",
    );
  }
  return json.result as CompOffRow;
}

export async function deleteCompOff(
  token: string,
  orgId: number,
  compoffId: number,
): Promise<{ message?: string }> {
  const res = await fetch(
    `${API_URL}/api/comp-off-management/delete-comp-off/${compoffId}?org_id=${encodeURIComponent(String(orgId))}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );
  const json = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      (json.message as string) || "Could not delete comp off request",
    );
  }
  return { message: json.message as string | undefined };
}

export async function updateCompOffInfo(
  token: string,
  orgId: number,
  compoffId: number,
  comp_off_query: {
    compoff_date?: string;
    check_in?: string;
    check_out?: string;
    reason?: string;
  },
): Promise<{ message?: string }> {
  const res = await fetch(
    `${API_URL}/api/comp-off-management/update-comp-off-info/${compoffId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ org_id: orgId, comp_off_query }),
    },
  );
  const json = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      (json.message as string) || "Could not update comp off request",
    );
  }
  return { message: json.message as string | undefined };
}

export async function applyForCompOff(
  token: string,
  payload: {
    org_id: number;
    comp_off_query: {
      compoff_date: string;
      check_in: string;
      check_out: string;
      reason: string;
      reporting_manager: number;
    };
  },
): Promise<{
  message?: string;
  compoff_id?: number;
  work_status?: CompOffWorkStatus;
}> {
  const res = await fetch(`${API_URL}/api/comp-off-management/apply-for-comp-off`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const json = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      (json.message as string) || "Could not submit comp off request",
    );
  }
  return {
    message: json.message as string | undefined,
    compoff_id: json.compoff_id as number | undefined,
    work_status: json.work_status as CompOffWorkStatus | undefined,
  };
}

export async function fetchRMAllCompOffs(
  token: string,
  orgId: number,
  filters?: {
    query_status?: CompOffQueryStatus;
    compoff_date?: string;
    employee_id?: number;
    is_ascending?: "ASC" | "DESC";
  },
): Promise<CompOffManagerRow[]> {
  const params = new URLSearchParams({ org_id: String(orgId) });
  if (filters?.query_status) params.set("query_status", filters.query_status);
  if (filters?.compoff_date) params.set("compoff_date", filters.compoff_date);
  if (filters?.employee_id != null) {
    params.set("employee_id", String(filters.employee_id));
  }
  if (filters?.is_ascending) params.set("is_ascending", filters.is_ascending);

  const res = await fetch(
    `${API_URL}/api/comp-off-management/get-rm-all-comp-offs?${params.toString()}`,
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
      (json.message as string) || "Could not load comp off requests",
    );
  }
  const result = json.result;
  return Array.isArray(result) ? (result as CompOffManagerRow[]) : [];
}

export async function fetchManagerCompOffById(
  token: string,
  orgId: number,
  compoffId: number,
): Promise<CompOffManagerRow> {
  const res = await fetch(
    `${API_URL}/api/comp-off-management/get-manager-single-comp-off/${compoffId}?org_id=${encodeURIComponent(String(orgId))}`,
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
      (json.message as string) || "Could not load comp off request",
    );
  }
  return json.result as CompOffManagerRow;
}

export async function updateCompOffStatus(
  token: string,
  orgId: number,
  compoffId: number,
  payload: {
    query_status: "approved" | "rejected";
    review_comment?: string;
  },
): Promise<{
  message?: string;
  credited_amount?: number | null;
  result?: CompOffManagerRow;
}> {
  const res = await fetch(
    `${API_URL}/api/comp-off-management/update-comp-off-status/${compoffId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        org_id: orgId,
        query_status: payload.query_status,
        review_comment: payload.review_comment,
      }),
    },
  );
  const json = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      (json.message as string) || "Could not update comp off request",
    );
  }
  return {
    message: json.message as string | undefined,
    credited_amount: json.credited_amount as number | null | undefined,
    result: json.result as CompOffManagerRow | undefined,
  };
}
