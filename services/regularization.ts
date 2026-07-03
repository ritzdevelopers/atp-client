const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export type RegularizationRequestType = "check_in" | "check_out" | "both";

export type RegularizationBalance = {
  is_available: boolean;
  balance: number;
  used: number;
  remaining: number;
  valid_from: string | null;
  valid_to: string | null;
  assigned_by?: number | null;
};

export type RegularizationRow = {
  id: number;
  request_type: RegularizationRequestType;
  check_in_time: string | null;
  check_out_time: string | null;
  action_date: string;
  user_id: number;
  org_id: number;
  reporting_manager: number;
  reporting_manager_name?: string | null;
  reason: string;
  reg_status: "pending" | "approved" | "rejected";
  review_comment?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type RegularizationManagerRow = RegularizationRow & {
  employee_name?: string | null;
  employee_email?: string | null;
  employee_code?: string | null;
  emp_code?: string | null;
  employee_role_name?: string | null;
  team_id?: number | null;
  team_name?: string | null;
  team_leader_id?: number | null;
  team_leader_name?: string | null;
  regularization_balance?: number | null;
  regularization_used?: number | null;
  approved_by?: number | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
};

export type RegularizationReportingManager = {
  user_id: number;
  user_name: string;
  user_email?: string | null;
  emp_code?: string | null;
  role: "reporting_manager" | "hr" | "admin";
  team_id?: number | null;
  team_name?: string | null;
  team_names?: string[];
};

export type RegularizationReportingManagersResponse = {
  source: "team_leaders" | "hr_admin";
  data: RegularizationReportingManager[];
};

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function fetchMyRegularizationBalance(
  token: string,
  orgId: number,
): Promise<RegularizationBalance> {
  const res = await fetch(
    `${API_URL}/api/regularization/get-my-regularization-balance?org_id=${encodeURIComponent(String(orgId))}`,
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
      (json.message as string) || "Could not load regularization balance",
    );
  }
  const data = json.data as RegularizationBalance | undefined;
  return (
    data ?? {
      is_available: false,
      balance: 0,
      used: 0,
      remaining: 0,
      valid_from: null,
      valid_to: null,
    }
  );
}

export async function fetchReportingManagers(
  token: string,
  orgId: number,
): Promise<RegularizationReportingManagersResponse> {
  const res = await fetch(
    `${API_URL}/api/regularization/get-reporting-managers?org_id=${encodeURIComponent(String(orgId))}`,
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
      (json.message as string) || "Could not load reporting managers",
    );
  }
  const data = json.data;
  const source = json.source === "team_leaders" ? "team_leaders" : "hr_admin";
  return {
    source,
    data: Array.isArray(data) ? (data as RegularizationReportingManager[]) : [],
  };
}

export async function fetchMyRegularization(
  token: string,
  orgId: number,
  filters?: {
    reg_status?: "pending" | "approved" | "rejected";
    request_type?: RegularizationRequestType;
    action_date?: string;
  },
): Promise<RegularizationRow[]> {
  const params = new URLSearchParams({
    org_id: String(orgId),
  });
  if (filters?.reg_status) params.set("reg_status", filters.reg_status);
  if (filters?.request_type) params.set("request_type", filters.request_type);
  if (filters?.action_date) params.set("action_date", filters.action_date);

  const res = await fetch(
    `${API_URL}/api/regularization/get-my-regularization?${params.toString()}`,
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
      (json.message as string) || "Could not load regularization requests",
    );
  }
  const result = json.result;
  return Array.isArray(result) ? (result as RegularizationRow[]) : [];
}

export async function deleteRegularization(
  token: string,
  orgId: number,
  regularizationId: number,
): Promise<{ message?: string }> {
  const res = await fetch(
    `${API_URL}/api/regularization/delete-regularization/${regularizationId}?org_id=${encodeURIComponent(String(orgId))}`,
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
      (json.message as string) || "Could not delete regularization request",
    );
  }
  return { message: json.message as string | undefined };
}

export async function fetchAllRegularizationRequests(
  token: string,
  orgId: number,
  filters?: {
    reg_status?: "pending" | "approved" | "rejected";
    request_type?: RegularizationRequestType;
    action_date?: string;
    employee_id?: number;
    is_ascending?: "ASC" | "DESC";
  },
): Promise<RegularizationManagerRow[]> {
  const params = new URLSearchParams({ org_id: String(orgId) });
  if (filters?.reg_status) params.set("reg_status", filters.reg_status);
  if (filters?.request_type) params.set("request_type", filters.request_type);
  if (filters?.action_date) params.set("action_date", filters.action_date);
  if (filters?.employee_id != null) {
    params.set("employee_id", String(filters.employee_id));
  }
  if (filters?.is_ascending) params.set("is_ascending", filters.is_ascending);

  const res = await fetch(
    `${API_URL}/api/regularization/get-all-regularization-requests?${params.toString()}`,
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
      (json.message as string) || "Could not load regularization requests",
    );
  }
  const result = json.result;
  return Array.isArray(result) ? (result as RegularizationManagerRow[]) : [];
}

export async function fetchRegularizationRequestById(
  token: string,
  orgId: number,
  regularizationId: number,
): Promise<RegularizationManagerRow> {
  const res = await fetch(
    `${API_URL}/api/regularization/get-regularization-request/${regularizationId}?org_id=${encodeURIComponent(String(orgId))}`,
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
      (json.message as string) || "Could not load regularization request",
    );
  }
  return json.result as RegularizationManagerRow;
}

export async function updateRegularizationRequest(
  token: string,
  orgId: number,
  regularizationId: number,
  payload: {
    reg_status: "approved" | "rejected";
    review_comment?: string;
  },
): Promise<{ message?: string; result?: RegularizationManagerRow }> {
  const res = await fetch(
    `${API_URL}/api/regularization/update-regularization-request/${regularizationId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        org_id: orgId,
        reg_status: payload.reg_status,
        review_comment: payload.review_comment,
      }),
    },
  );
  const json = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      (json.message as string) || "Could not update regularization request",
    );
  }
  return {
    message: json.message as string | undefined,
    result: json.result as RegularizationManagerRow | undefined,
  };
}

export async function applyForRegularization(
  token: string,
  payload: {
    org_id: number;
    regularization_info: {
      request_type: RegularizationRequestType;
      action_date: string;
      reason: string;
      reporting_manager: number;
      check_in_time?: string;
      check_out_time?: string;
    };
  },
): Promise<{ message?: string; regularization_id?: number; balance_remaining?: number }> {
  const res = await fetch(`${API_URL}/api/regularization/apply-for-regularization`, {
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
      (json.message as string) || "Could not submit regularization request",
    );
  }
  return {
    message: json.message as string | undefined,
    regularization_id: json.regularization_id as number | undefined,
    balance_remaining: json.balance_remaining as number | undefined,
  };
}
