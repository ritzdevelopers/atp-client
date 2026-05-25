const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export type LeaveQueryRow = {
  id: number;
  user_id: number | null;
  user_name: string;
  user_email: string;
  org_id: number;
  leave_type: "full_day" | "half_day" | "short_leave";
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

export type ApplyLeavePayload = {
  org_id: number;
  leave_type: "full_day" | "half_day" | "short_leave";
  start_date: string;
  end_date?: string | null;
  reason?: string | null;
  team_id?: number | string | null;
};

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
    leave_type: payload.leave_type,
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
