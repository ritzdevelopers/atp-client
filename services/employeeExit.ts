import type { ApiError } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export type CreateEmployeeExitProcessPayload = {
  org_id: number | string;
  /** Employee user id */
  user_id: number | string;
  team_id?: number | string | null;
  action_type: "termination" | "resignation";
  action_reason: string;
  application_status?: "pending" | "approved" | "rejected" | "in_progress";
  exit_date?: string | null;
  last_working_day?: string | null;
  response_message?: string | null;
};

export type CreateEmployeeExitProcessResponse = {
  success: boolean;
  message?: string;
  data?: {
    id: number;
    employee_id: number;
    org_id: number;
    team_id: number | null;
    action_type: string;
    application_status: string;
    exit_date: string | null;
    last_working_day: string | null;
  };
};

export async function createEmployeeExitProcess(
  token: string,
  payload: CreateEmployeeExitProcessPayload,
): Promise<CreateEmployeeExitProcessResponse> {
  const res = await fetch(`${API_URL}/api/employee-exit/create-employee-exit-process`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    json = {};
  }
  if (!res.ok) {
    const err = new Error(
      (json.message as string) || "Failed to create exit process",
    ) as ApiError;
    err.status = res.status;
    throw err;
  }
  return json as unknown as CreateEmployeeExitProcessResponse;
}

export type EmployeeExitProcessRow = {
  id: number;
  employee_id: number;
  employee_name: string | null;
  employee_email: string | null;
  employee_phone: string | null;
  org_id: number;
  team_id: number | null;
  team_name: string | null;
  action_type: string;
  action_reason: string | null;
  application_status: string;
  exit_date: string | null;
  last_working_day: string | null;
  action_performed_by: number | null;
  action_performed_by_name: string | null;
  response_by_id: number | null;
  response_by_name: string | null;
  response_message: string | null;
  resolved_at: string | null;
  total_handover_queries: number;
  created_at: string;
  updated_at: string;
};

export type FetchEmployeeExitProcessesParams = {
  org_id: number | string;
  team_id?: number | string | null;
  page?: number;
  limit?: number;
  search?: string;
  sort?: "asc" | "desc";
  sort_by?: "created_at" | "updated_at" | "exit_date" | "last_working_day";
  status?: string;
  action_type?: string;
  employee_id?: number | string;
};

export type FetchEmployeeExitProcessesResponse = {
  success: boolean;
  message?: string;
  pagination?: {
    total_records: number;
    total_pages: number;
    current_page: number;
    limit: number;
  };
  data: EmployeeExitProcessRow[];
};

export async function fetchEmployeeExitProcesses(
  token: string,
  params: FetchEmployeeExitProcessesParams,
): Promise<FetchEmployeeExitProcessesResponse> {
  const q = new URLSearchParams();
  q.set("org_id", String(params.org_id));
  if (params.team_id != null && params.team_id !== "") {
    q.set("team_id", String(params.team_id));
  }
  if (params.page != null) q.set("page", String(params.page));
  if (params.limit != null) q.set("limit", String(params.limit));
  if (params.search?.trim()) q.set("search", params.search.trim());
  if (params.sort) q.set("sort", params.sort);
  if (params.sort_by) q.set("sort_by", params.sort_by);
  if (params.status) q.set("status", params.status);
  if (params.action_type) q.set("action_type", params.action_type);
  if (params.employee_id != null && params.employee_id !== "") {
    q.set("employee_id", String(params.employee_id));
  }

  const url = `${API_URL}/api/employee-exit/get-all-employee-exit-processes?${q.toString()}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    json = {};
  }

  if (!res.ok) {
    const err = new Error(
      (json.message as string) || "Failed to fetch exit processes",
    ) as ApiError;
    err.status = res.status;
    throw err;
  }

  return json as unknown as FetchEmployeeExitProcessesResponse;
}

/** Row from linked `employee_assets` for the exiting employee */
export type EmployeeExitAssetRow = {
  id: number;
  asset_name: string | null;
  asset_summary: string | null;
  asset_type: string | null;
  asset_image_url: string | null;
  is_returned: unknown;
  returned_to_id: number | null;
  returned_to_name: string | null;
  handover_date_time: string | null;
};

export type EmployeeExitHandoverQueryRow = {
  handover_query_id: number;
  asset_id: number | null;
  asset_name: string | null;
  asset_summary: string | null;
  asset_type: string | null;
  asset_image_url: string | null;
  custom_task_name: string | null;
  manager_id: number | null;
  manager_name: string | null;
  handover_status: string | null;
  remarks: string | null;
  handover_date: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type EmployeeExitProcessDetail = {
  id: number;
  employee_id: number;
  employee_name: string | null;
  employee_email: string | null;
  employee_phone: string | null;
  org_id: number;
  team_id: number | null;
  team_name: string | null;
  action_type: string;
  action_reason: string | null;
  application_status: string;
  exit_date: string | null;
  last_working_day: string | null;
  action_performed_by: number | null;
  action_performed_by_name: string | null;
  response_by_id: number | null;
  response_by_name: string | null;
  response_message: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  employee_assets: EmployeeExitAssetRow[];
  handover_queries: EmployeeExitHandoverQueryRow[];
};

export type FetchEmployeeExitProcessDetailResponse = {
  success: boolean;
  message?: string;
  data: EmployeeExitProcessDetail;
};

export async function fetchEmployeeExitProcessById(
  token: string,
  orgId: number | string,
  exitProcessId: number | string,
): Promise<FetchEmployeeExitProcessDetailResponse> {
  const q = new URLSearchParams({ org_id: String(orgId) });
  const url = `${API_URL}/api/employee-exit/get-employee-exit-process/${encodeURIComponent(String(exitProcessId))}?${q.toString()}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    json = {};
  }

  if (!res.ok) {
    const err = new Error(
      (json.message as string) || "Failed to fetch exit process",
    ) as ApiError;
    err.status = res.status;
    throw err;
  }

  return json as unknown as FetchEmployeeExitProcessDetailResponse;
}

export type CorrectionEmployeeExitPayload = {
  action_reason?: string | null;
  exit_date?: string | null;
  last_working_day?: string | null;
  response_message?: string | null;
};

export type CorrectionEmployeeExitResponse = {
  success: boolean;
  message?: string;
  data?: {
    id: number;
    employee_id: number;
    org_id: number;
    action_reason: string | null;
    exit_date: string | null;
    last_working_day: string | null;
    response_message: string | null;
  };
};

export async function correctionEmployeeExitProcess(
  token: string,
  orgId: number | string,
  exitProcessId: number | string,
  payload: CorrectionEmployeeExitPayload,
): Promise<CorrectionEmployeeExitResponse> {
  const q = new URLSearchParams({ org_id: String(orgId) });
  const url = `${API_URL}/api/employee-exit/correction-in-employee-exit-process/${encodeURIComponent(String(exitProcessId))}?${q.toString()}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    json = {};
  }

  if (!res.ok) {
    const err = new Error(
      (json.message as string) || "Failed to save correction",
    ) as ApiError;
    err.status = res.status;
    throw err;
  }

  return json as unknown as CorrectionEmployeeExitResponse;
}