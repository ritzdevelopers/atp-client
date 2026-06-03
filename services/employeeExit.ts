import type { ApiError } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export function normalizeExitApplicationStatus(status: string | null | undefined): string {
  return String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

export function isPendingExitStatus(status: string | null | undefined): boolean {
  return normalizeExitApplicationStatus(status) === "pending";
}

export function isInProgressExitStatus(status: string | null | undefined): boolean {
  return normalizeExitApplicationStatus(status) === "in_progress";
}

export function isOpenExitStatus(status: string | null | undefined): boolean {
  const n = normalizeExitApplicationStatus(status);
  return n === "pending" || n === "in_progress";
}

/** Prefer an open exit (pending / in progress); otherwise the newest row. */
export function pickRelevantEmployeeExitRow(
  rows: EmployeeExitProcessRow[],
): EmployeeExitProcessRow | null {
  if (!rows.length) return null;
  const open = rows.find((r) => isOpenExitStatus(r.application_status));
  return open ?? rows[0] ?? null;
}

export function buildEmployeeExitDetailHref(
  orgId: string,
  opts: {
    exitProcessId: number | string;
    teamId?: number | string | null;
    tab?: "overview" | "assets" | "tasks" | "actions";
  },
): string {
  const q = new URLSearchParams();
  if (opts.teamId != null && opts.teamId !== "") {
    q.set("team_id", String(opts.teamId));
  }
  q.set("exit_process_id", String(opts.exitProcessId));
  if (opts.tab) q.set("tab", opts.tab);
  return `/dashboard/${encodeURIComponent(orgId)}/organization-employees/teams/0/exit/0?${q.toString()}`;
}

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

export async function fetchMyExitProcess(
  token: string,
  orgId: number | string,
): Promise<FetchEmployeeExitProcessDetailResponse> {
  const q = new URLSearchParams({ org_id: String(orgId) });
  const url = `${API_URL}/api/employee-exit/get-my-exit-process?${q.toString()}`;
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
      (json.message as string) || "Failed to fetch your exit process",
    ) as ApiError;
    err.status = res.status;
    throw err;
  }

  return json as unknown as FetchEmployeeExitProcessDetailResponse;
}

/** Rows from GET `/assets-for-handover/:user_id` (`employee_assets` joined to exit process). */
export type EmployeeHandoverAssetApiRow = {
  id: number;
  employee_id: number;
  org_id: number;
  asset_name?: string | null;
  asset_summary?: string | null;
  asset_type?: string | null;
  asset_status?: string | null;
  asset_image_url?: string | null;
  is_returned?: unknown;
  returned_to_id?: number | null;
  handover_date_time?: string | null;
  asset_given_by_id?: number;
  employee_exit_process_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export async function fetchAssetsForHandoverOfEmployee(
  token: string,
  orgId: number | string,
  exitingEmployeeUserId: number | string,
  options?: { exit_process_id?: number | string },
): Promise<{
  success: boolean;
  message?: string;
  data: EmployeeHandoverAssetApiRow[];
}> {
  const q = new URLSearchParams({ org_id: String(orgId) });
  if (options?.exit_process_id != null && options.exit_process_id !== "") {
    q.set("exit_process_id", String(options.exit_process_id));
  }
  const url = `${API_URL}/api/employee-exit/assets-for-handover/${encodeURIComponent(
    String(exitingEmployeeUserId),
  )}?${q.toString()}`;
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
      (json.message as string) || "Failed to fetch handover assets",
    ) as ApiError;
    err.status = res.status;
    throw err;
  }

  return json as unknown as {
    success: boolean;
    message?: string;
    data: EmployeeHandoverAssetApiRow[];
  };
}

export async function updateAssetHandoverReturnedStatus(
  token: string,
  orgId: number | string,
  assetId: number | string,
  isReturned: boolean,
): Promise<{
  success: boolean;
  message?: string;
  data?: { asset_id: number; is_returned: unknown };
}> {
  const url = `${API_URL}/api/employee-exit/asset-handover-status/${encodeURIComponent(String(assetId))}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      org_id: orgId,
      is_returned: isReturned ? 1 : 0,
    }),
  });

  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    json = {};
  }

  if (!res.ok) {
    const err = new Error(
      (json.message as string) ||
        "Could not update asset return status",
    ) as ApiError;
    err.status = res.status;
    throw err;
  }

  return json as unknown as {
    success: boolean;
    message?: string;
    data?: { asset_id: number; is_returned: unknown };
  };
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

export type UpdateEmployeeExitProcessStatusPayload = {
  application_status: "pending" | "approved" | "rejected" | "in_progress";
  exit_date?: string | null;
  last_working_day?: string | null;
  response_message?: string | null;
  resolved_at?: string | null;
  assets_handover_to_id?: number | string | null;
};

export type UpdateEmployeeExitProcessStatusResponse = {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
};

export async function updateEmployeeExitProcessStatus(
  token: string,
  orgId: number | string,
  exitProcessId: number | string,
  payload: UpdateEmployeeExitProcessStatusPayload,
): Promise<UpdateEmployeeExitProcessStatusResponse> {
  const q = new URLSearchParams({ org_id: String(orgId) });
  const url = `${API_URL}/api/employee-exit/update-employee-exit-process-status/${encodeURIComponent(String(exitProcessId))}?${q.toString()}`;
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
      (json.message as string) || "Failed to update exit process status",
    ) as ApiError;
    err.status = res.status;
    throw err;
  }

  return json as unknown as UpdateEmployeeExitProcessStatusResponse;
}

/** Payload item for `/exit-in-process/:exit_process_id` → `exit_process_handler` */
export type ExitAssetHandoverRow = {
  asset_id: number | string;
  handover_to: number | string;
};

export type EmployeeExitMoveInProgressPayload = {
  application_status: "in_progress";
  assets_handover_data: ExitAssetHandoverRow[];
};

export async function employeeExitMoveInProgress(
  token: string,
  orgId: number | string,
  exitProcessId: number | string,
  payload: EmployeeExitMoveInProgressPayload,
): Promise<{ success: boolean; message?: string; data?: unknown }> {
  const q = new URLSearchParams({ org_id: String(orgId) });
  const url = `${API_URL}/api/employee-exit/exit-in-process/${encodeURIComponent(String(exitProcessId))}?${q.toString()}`;
  const res = await fetch(url, {
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
      (json.message as string) || "Could not move exit process forward",
    ) as ApiError;
    err.status = res.status;
    throw err;
  }

  return json as { success: boolean; message?: string; data?: unknown };
}

export type EmployeeExitCancelledPayload = {
  application_status: string;
  employee_id: number | string;
  response_message: string;
};

export async function employeeExitCancelled(
  token: string,
  orgId: number | string,
  exitProcessId: number | string,
  payload: EmployeeExitCancelledPayload,
): Promise<{ success: boolean; message?: string; data?: unknown }> {
  const q = new URLSearchParams({ org_id: String(orgId) });
  const url = `${API_URL}/api/employee-exit/exit-cancelled/${encodeURIComponent(String(exitProcessId))}?${q.toString()}`;
  const res = await fetch(url, {
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
      (json.message as string) || "Could not reject exit process",
    ) as ApiError;
    err.status = res.status;
    throw err;
  }

  return json as { success: boolean; message?: string; data?: unknown };
}

export type EmployeeExitCompletedPayload = {
  application_status: "pending" | "approved" | "rejected" | "in_progress";
  employee_id: number | string;
  response_message: string;
};

export async function employeeExitCompleted(
  token: string,
  orgId: number | string,
  exitProcessId: number | string,
  payload: EmployeeExitCompletedPayload,
): Promise<{ success: boolean; message?: string; data?: unknown }> {
  const q = new URLSearchParams({ org_id: String(orgId) });
  const url = `${API_URL}/api/employee-exit/exit-completed/${encodeURIComponent(String(exitProcessId))}?${q.toString()}`;
  const res = await fetch(url, {
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
      (json.message as string) || "Could not approve exit process",
    ) as ApiError;
    err.status = res.status;
    throw err;
  }

  return json as { success: boolean; message?: string; data?: unknown };
}

export type CreateEmployeeExitProcessHandoverQueryPayload = {
  org_id: number | string;
  employee_exit_process_id: number;
  employee_id: number;
  team_id?: number | string | null;
  /** Ad-hoc handover row; satisfies API when asset_id is not used. */
  custom_task_name: string;
  remarks?: string | null;
  /** MySQL DATETIME friendly, e.g. `YYYY-MM-DD HH:MM:SS`. */
  handover_date: string;
};

export async function createEmployeeExitProcessHandoverQuery(
  token: string,
  payload: CreateEmployeeExitProcessHandoverQueryPayload,
): Promise<{ success: boolean; message?: string; data?: unknown }> {
  const res = await fetch(
    `${API_URL}/api/employee-exit/create-employee-exit-process-handover-query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        employee_exit_process_id: payload.employee_exit_process_id,
        employee_id: payload.employee_id,
        team_id: payload.team_id ?? null,
        custom_task_name: payload.custom_task_name.trim(),
        remarks: payload.remarks?.trim() || null,
        handover_date: payload.handover_date,
        org_id: payload.org_id,
      }),
    },
  );

  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    json = {};
  }

  if (!res.ok) {
    const err = new Error(
      (json.message as string) || "Could not create handover query",
    ) as ApiError;
    err.status = res.status;
    throw err;
  }

  return json as { success: boolean; message?: string; data?: unknown };
}

/** Matches `handover_query.handover_status` enum in the database. */
export type EmployeeExitHandoverStatus =
  | "pending"
  | "handover_completed"
  | "damaged"
  | "missing";

export type UpdateEmployeeExitProcessHandoverQueryBody = Partial<{
  handover_status: EmployeeExitHandoverStatus;
  remarks: string | null;
  /** MySQL-friendly `YYYY-MM-DD HH:MM:SS` (omit to leave unchanged). */
  handover_date: string | null;
  custom_task_name: string | null;
}>;

export async function updateEmployeeExitProcessHandoverQuery(
  token: string,
  orgId: number | string,
  employeeExitProcessId: number | string,
  employeeId: number | string,
  handoverQueryId: number | string,
  body: UpdateEmployeeExitProcessHandoverQueryBody,
): Promise<{ success: boolean; message?: string; data?: unknown }> {
  const patch: Record<string, unknown> = { org_id: orgId };

  if (body.handover_status !== undefined) {
    patch.handover_status = body.handover_status;
  }
  if (body.remarks !== undefined) {
    patch.remarks = body.remarks;
  }
  if (body.handover_date !== undefined) {
    patch.handover_date = body.handover_date;
  }
  if (body.custom_task_name !== undefined) {
    patch.custom_task_name = body.custom_task_name;
  }

  const path = `/api/employee-exit/employee-exit-process/${encodeURIComponent(String(employeeExitProcessId))}/handover-query/${encodeURIComponent(String(employeeId))}/${encodeURIComponent(String(handoverQueryId))}`;

  const res = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(patch),
  });

  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    json = {};
  }

  if (!res.ok) {
    const err = new Error(
      (json.message as string) || "Could not update handover query",
    ) as ApiError;
    err.status = res.status;
    throw err;
  }

  return json as { success: boolean; message?: string; data?: unknown };
}

export type ReturnAssetsCompletedPayload = {
  org_id?: number | string;
  employee_id: number | string;
  assets_ids: Array<number | string>;
};

export async function returnAssetsCompleted(
  token: string,
  orgId: number | string,
  payload: ReturnAssetsCompletedPayload,
): Promise<{ success: boolean; message?: string; data?: unknown }> {
  const q = new URLSearchParams({ org_id: String(orgId) });
  const res = await fetch(
    `${API_URL}/api/employee-exit/return-assets-completed?${q.toString()}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        org_id: orgId,
        employee_id: payload.employee_id,
        assets_ids: payload.assets_ids,
      }),
    },
  );

  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    json = {};
  }

  if (!res.ok) {
    const err = new Error(
      (json.message as string) || "Could not confirm asset returns",
    ) as ApiError;
    err.status = res.status;
    throw err;
  }

  return json as { success: boolean; message?: string; data?: unknown };
}

/** MySQL DATETIME, e.g. `YYYY-MM-DD HH:MM:SS`. */
export function handoverDateTimeSqlNow(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mi}:${ss}`;
}

export type AssignHandoverManagerBody = {
  org_id: number | string;
  employee_id: number | string;
  manager_id: number | string;
  asset_id: number | string;
  handover_date: string;
  team_id?: number | string | null;
  remarks?: string | null;
};

export async function assignHandoverManager(
  token: string,
  orgId: number | string,
  exitProcessId: number | string,
  body: AssignHandoverManagerBody,
): Promise<{ success: boolean; message?: string; data?: unknown }> {
  const q = new URLSearchParams({ org_id: String(orgId) });
  const url = `${API_URL}/api/employee-exit/assign-handover-manager/${encodeURIComponent(String(exitProcessId))}?${q.toString()}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      org_id: body.org_id,
      employee_id: body.employee_id,
      manager_id: body.manager_id,
      asset_id: body.asset_id,
      handover_date: body.handover_date,
      team_id: body.team_id ?? null,
      remarks: body.remarks ?? null,
    }),
  });

  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    json = {};
  }

  if (!res.ok) {
    const err = new Error(
      (json.message as string) || "Could not assign handover manager",
    ) as ApiError;
    err.status = res.status;
    throw err;
  }

  return json as { success: boolean; message?: string; data?: unknown };
}

export type UpdateAssignedHandoverManagerBody = {
  org_id: number | string;
  employee_id: number | string;
  manager_id: number | string;
  asset_id: number | string;
  team_id?: number | string | null;
  remarks?: string | null;
  handover_date?: string | null;
};

export async function updateAssignedHandoverManager(
  token: string,
  orgId: number | string,
  exitProcessId: number | string,
  body: UpdateAssignedHandoverManagerBody,
): Promise<{ success: boolean; message?: string; data?: unknown }> {
  const q = new URLSearchParams({ org_id: String(orgId) });
  const url = `${API_URL}/api/employee-exit/update-assigned-handover-manager/${encodeURIComponent(String(exitProcessId))}?${q.toString()}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      org_id: body.org_id,
      employee_id: body.employee_id,
      manager_id: body.manager_id,
      asset_id: body.asset_id,
      team_id: body.team_id ?? null,
      remarks: body.remarks ?? null,
      handover_date: body.handover_date ?? null,
    }),
  });

  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    json = {};
  }

  if (!res.ok) {
    const err = new Error(
      (json.message as string) || "Could not update handover manager",
    ) as ApiError;
    err.status = res.status;
    throw err;
  }

  return json as { success: boolean; message?: string; data?: unknown };
}