import type { ApiError } from "./auth";
import type { EmployeeExitHandoverStatus } from "./employeeExit";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export type HandoverAssignedAssetRow = {
  id: number;
  employee_id: number;
  organization_id: number;
  team_id: number | null;
  asset_id: number | null;
  asset_name?: string | null;
  asset_type?: string | null;
  asset_summary?: string | null;
  handover_status: EmployeeExitHandoverStatus | string;
  remarks: string | null;
  handover_date: string | null;
  employee_exit_process_id: number | null;
  created_at: string;
  updated_at: string;
};

export type HandoverAssignedCustomTaskRow = {
  id: number;
  employee_id: number;
  organization_id: number;
  team_id: number | null;
  custom_task_name: string;
  handover_date: string | null;
  employee_exit_process_id: number | null;
  created_at: string;
  updated_at: string;
  remarks: string | null;
  handover_status: EmployeeExitHandoverStatus | string;
};

export type HandoverAssignedToMeData = {
  assets: HandoverAssignedAssetRow[];
  custom_tasks: HandoverAssignedCustomTaskRow[];
};

export type HandoverStatusTab =
  | "pending"
  | "handover_completed"
  | "damaged"
  | "missing";

export const HANDOVER_STATUS_TABS: {
  id: HandoverStatusTab;
  label: string;
}[] = [
  { id: "pending", label: "Pending" },
  { id: "handover_completed", label: "Completed" },
  { id: "damaged", label: "Damaged" },
  { id: "missing", label: "Missing" },
];

export const HANDOVER_UPDATE_STATUS_OPTIONS: {
  value: Exclude<HandoverStatusTab, "pending">;
  label: string;
}[] = [
  { value: "handover_completed", label: "Handover completed" },
  { value: "damaged", label: "Damaged" },
  { value: "missing", label: "Missing" },
];

export function normalizeHandoverStatus(
  status: string | null | undefined,
): HandoverStatusTab | null {
  const s = String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (
    s === "pending" ||
    s === "handover_completed" ||
    s === "damaged" ||
    s === "missing"
  ) {
    return s;
  }
  return null;
}

export function countPendingHandoverItems(data: HandoverAssignedToMeData): number {
  const pending = (status: string | null | undefined) =>
    normalizeHandoverStatus(status) === "pending";
  return (
    data.assets.filter((a) => pending(a.handover_status)).length +
    data.custom_tasks.filter((t) => pending(t.handover_status)).length
  );
}

export async function fetchHandoverAssignedToMe(
  token: string,
  orgId: number | string,
): Promise<HandoverAssignedToMeData> {
  const q = new URLSearchParams({ org_id: String(orgId) });
  const res = await fetch(
    `${API_URL}/api/employee-assets/handover-assigned-to-me?${q.toString()}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
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
      (json.message as string) || "Could not load assigned handovers",
    ) as ApiError;
    err.status = res.status;
    throw err;
  }

  const data = json.data as HandoverAssignedToMeData | undefined;
  return {
    assets: Array.isArray(data?.assets) ? data.assets : [],
    custom_tasks: Array.isArray(data?.custom_tasks) ? data.custom_tasks : [],
  };
}

export async function updateMyAssignedHandoverStatus(
  token: string,
  orgId: number | string,
  employeeExitProcessId: number | string,
  employeeId: number | string,
  handoverQueryId: number | string,
  body: { handover_status: Exclude<HandoverStatusTab, "pending">; remarks?: string | null },
): Promise<{ success: boolean; message?: string }> {
  const q = new URLSearchParams({ org_id: String(orgId) });
  const path = `/api/employee-exit/my-handover-query/${encodeURIComponent(String(employeeExitProcessId))}/${encodeURIComponent(String(employeeId))}/${encodeURIComponent(String(handoverQueryId))}?${q.toString()}`;

  const res = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      org_id: orgId,
      handover_status: body.handover_status,
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
      (json.message as string) || "Could not update handover status",
    ) as ApiError;
    err.status = res.status;
    throw err;
  }

  return json as { success: boolean; message?: string };
}
