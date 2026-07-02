const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export type LeaveQueryRow = {
  id: number;
  user_id: number | null;
  user_name: string;
  user_email: string;
  org_id: number;
  leave_type: string;
  start_date: string;
  end_date: string | null;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  approved_by: number | null;
  approved_by_name: string | null;
  team_id: number | null;
  created_at: string;
  updated_at?: string | null;
};

export const UNPAID_LEAVE_TYPE_ID = 0;

export const UNPAID_LEAVE_OPTION: AssignedLeaveBalanceRow = {
  leave_type_id: UNPAID_LEAVE_TYPE_ID,
  leave_type_name: "Unpaid Leave",
};

export type AssignedLeaveBalanceRow = {
  id?: number | string;
  user_id?: number | string;
  org_id?: number | string;
  leave_type_id: number | string;
  leave_type_name?: string;
  total_leaves?: number | string;
  used_leaves?: number | string;
  remaining_leaves?: number | string;
};

/** Inclusive calendar days (matches leave approval on the server). */
export function countInclusiveLeaveDays(
  startDate: string,
  endDate?: string | null,
): number {
  if (!startDate) return 0;
  const end = endDate?.trim() || startDate;
  const startMs = Date.parse(`${startDate}T00:00:00`);
  const endMs = Date.parse(`${end}T00:00:00`);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return 0;
  const diff = Math.floor((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;
  return diff > 0 ? diff : 0;
}

export function isUnpaidLeaveTypeId(leaveTypeId: string | number | null | undefined): boolean {
  const normalized = String(leaveTypeId ?? "");
  return normalized === "0" || normalized === "000";
}

export function validateLeaveApplication(input: {
  startDate: string;
  endDate?: string | null;
  selectedLeaveTypeId: string;
  assignedOptions: AssignedLeaveBalanceRow[];
}): string | null {
  const { startDate, endDate, selectedLeaveTypeId, assignedOptions } = input;

  if (!startDate) {
    return "Start date is required.";
  }
  if (!selectedLeaveTypeId) {
    return "Select a leave type.";
  }

  const end = endDate?.trim() || startDate;
  if (end < startDate) {
    return "End date must be on or after start date.";
  }

  if (isUnpaidLeaveTypeId(selectedLeaveTypeId)) {
    return null;
  }

  const row = assignedOptions.find(
    (o) => String(o.leave_type_id) === selectedLeaveTypeId,
  );
  if (!row) {
    return "Select an assigned leave type.";
  }

  const remaining = Number(row.remaining_leaves ?? 0);
  const requestedDays = countInclusiveLeaveDays(startDate, endDate);
  if (requestedDays > remaining) {
    const name = row.leave_type_name?.trim() || "this leave type";
    return `You cannot apply for more than your remaining ${name} balance (${remaining} day${remaining === 1 ? "" : "s"}). Select Unpaid Leave for extra days.`;
  }

  return null;
}

export type ApplyLeavePayload = {
  org_id: number;
  leave_type_id: number | string;
  start_date: string;
  end_date?: string | null;
  reason?: string | null;
  team_id?: number | string | null;
};

export async function fetchMyAssignedLeaveBalances(
  token: string,
  orgId: number | string,
): Promise<AssignedLeaveBalanceRow[]> {
  const q = encodeURIComponent(String(orgId));
  const res = await fetch(
    `${API_URL}/api/employees/my-assigned-leave-balances?org_id=${q}`,
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
      (json.message as string) || "Could not load assigned leave types",
    );
  }
  const data = json.data;
  if (!Array.isArray(data)) return [];
  return data as AssignedLeaveBalanceRow[];
}

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function fetchMyLeaveQueries(
  token: string,
  orgId: number,
): Promise<LeaveQueryRow[]> {
  const res = await fetch(
    `${API_URL}/api/employees/my-leave-queries?org_id=${encodeURIComponent(String(orgId))}`,
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
      (json.message as string) || "Could not load leave requests",
    );
  }
  const data = json.data;
  if (!Array.isArray(data)) return [];
  return data as LeaveQueryRow[];
}

export async function applyForLeave(
  token: string,
  payload: ApplyLeavePayload,
): Promise<{ message?: string; id?: number }> {
  const body: Record<string, unknown> = {
    org_id: payload.org_id,
    leave_type_id: payload.leave_type_id,
    start_date: payload.start_date,
    end_date: payload.end_date ?? null,
    reason: payload.reason ?? null,
  };
  if (payload.team_id != null && payload.team_id !== "") {
    body.team_id = Number(payload.team_id);
  }
  const res = await fetch(`${API_URL}/api/employees/apply-for-leave`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const json = await parseJson(res);
  if (!res.ok) {
    throw new Error((json.message as string) || "Could not submit leave request");
  }
  const data = json.data as { id?: number } | undefined;
  return {
    message: json.message as string | undefined,
    id: data?.id,
  };
}

/** Team reporting manager or HR — approve/reject on team-group page. */
export async function updateLeaveQueryStatus(
  token: string,
  payload: {
    query_id: number;
    query_status: "approved" | "rejected";
    team_id?: number | null;
  },
): Promise<{ message?: string }> {
  const res = await fetch(`${API_URL}/api/user/update-leave-query-status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query_id: payload.query_id,
      query_status: payload.query_status,
      ...(payload.team_id != null ? { team_id: payload.team_id } : {}),
    }),
  });
  const json = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      (json.message as string) || "Could not update leave request",
    );
  }
  return { message: json.message as string | undefined };
}

/** Admin / HR / manager — `POST /api/user/respond-to-leave`. */
export async function respondToLeaveRequest(
  token: string,
  payload: {
    leave_id: number;
    org_id: number;
    status: "approved" | "rejected";
  },
): Promise<{ message?: string }> {
  const res = await fetch(`${API_URL}/api/user/respond-to-leave`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      leave_id: payload.leave_id,
      org_id: payload.org_id,
      status: payload.status,
    }),
  });
  const json = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      (json.message as string) || "Could not update leave request",
    );
  }
  return { message: json.message as string | undefined };
}
