import type { ApiError } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export type LeaveTypeRow = {
  id: number | string;
  leave_type_name: string;
  org_id?: number | string;
};

function leaveApiError(
  result: { message?: string; error?: string },
  fallback: string,
): ApiError {
  const error: ApiError = new Error(
    (typeof result.message === "string" && result.message) ||
      (typeof result.error === "string" && result.error) ||
      fallback,
  );
  return error;
}

export async function getLeaveTypes(
  token: string,
  orgId: number | string,
): Promise<LeaveTypeRow[]> {
  const q = encodeURIComponent(String(orgId));
  const res = await fetch(`${API_URL}/api/leave-management/get-leave-types?org_id=${q}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = (await res.json()) as {
    message?: string;
    data?: LeaveTypeRow[];
  };

  if (!res.ok) {
    const error = leaveApiError(result, "Could not load leave types");
    error.status = res.status;
    throw error;
  }

  return Array.isArray(result.data) ? result.data : [];
}

export async function createLeaveType(
  token: string,
  payload: { org_id: number | string; leave_type_name: string },
): Promise<{ message?: string; data?: { leave_type_id?: number | string } }> {
  const res = await fetch(`${API_URL}/api/leave-management/create-leave-type`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      org_id: payload.org_id,
      leave_type_name: payload.leave_type_name.trim(),
    }),
  });

  const result = (await res.json()) as {
    message?: string;
    data?: { leave_type_id?: number | string };
  };

  if (!res.ok) {
    const error = leaveApiError(result, "Could not create leave type");
    error.status = res.status;
    throw error;
  }

  return result;
}

export async function updateLeaveType(
  token: string,
  payload: {
    org_id: number | string;
    leave_type_id: number | string;
    leave_type_name: string;
  },
): Promise<{ message?: string }> {
  const res = await fetch(`${API_URL}/api/leave-management/update-leave-type`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      org_id: payload.org_id,
      leave_type_id: payload.leave_type_id,
      leave_type_name: payload.leave_type_name.trim(),
    }),
  });

  const result = (await res.json()) as { message?: string };

  if (!res.ok) {
    const error = leaveApiError(result, "Could not update leave type");
    error.status = res.status;
    throw error;
  }

  return result;
}

/** For manage-employees assign flow (`employee-management` feature). */
export async function getLeaveTypesForEmployee(
  token: string,
  orgId: number | string,
): Promise<LeaveTypeRow[]> {
  const q = encodeURIComponent(String(orgId));
  const res = await fetch(
    `${API_URL}/api/leave-management/employee-leave-types?org_id=${q}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  const result = (await res.json()) as {
    message?: string;
    data?: LeaveTypeRow[];
  };

  if (!res.ok) {
    const error = leaveApiError(result, "Could not load leave types");
    error.status = res.status;
    throw error;
  }

  return Array.isArray(result.data) ? result.data : [];
}

export type CreateEmployeeLeaveBalancePayload = {
  org_id: number | string;
  employee_id: number | string;
  leave_type_id: number | string;
  total_leaves: number | string;
};

export async function createEmployeeLeaveBalance(
  token: string,
  payload: CreateEmployeeLeaveBalancePayload,
): Promise<{ message?: string; success?: boolean }> {
  const res = await fetch(`${API_URL}/api/leave-management/create-employee-leave-balance`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      org_id: payload.org_id,
      employee_id: payload.employee_id,
      leave_type_id: payload.leave_type_id,
      total_leaves: payload.total_leaves,
    }),
  });

  const result = (await res.json()) as {
    message?: string;
    success?: boolean;
  };

  if (!res.ok) {
    const error = leaveApiError(
      result,
      result.message || "Could not assign leave balance",
    );
    error.status = res.status;
    throw error;
  }

  return result;
}
