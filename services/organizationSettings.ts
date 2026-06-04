import type { ApiError } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export type AddCompanyIpPayload = {
  org_id: number | string;
  ip_address: string;
  label?: string | null;
};

export async function addCompanyIPAddress(
  token: string,
  payload: AddCompanyIpPayload,
): Promise<{ message?: string }> {
  const res = await fetch(`${API_URL}/api/organization-settings/create-new-ip-address`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      org_id: payload.org_id,
      ip_address: payload.ip_address.trim(),
      label: payload.label?.trim() || null,
    }),
  });

  const result = (await res.json()) as { message?: string };

  if (!res.ok) {
    const error: ApiError = new Error(result.message || "Could not add IP address");
    error.status = res.status;
    throw error;
  }

  return result;
}

export type CompanyIpRow = {
  id: number | string;
  ip_address: string;
  label: string | null;
  created_at: string;
  ip_added_by_name: string | null;
  /** Count of org members with this IP allow-list assignment (from server). */
  total_assigned_users?: number | string | null;
};

export async function getCompanyIPAddresses(
  token: string,
  orgId: number | string,
): Promise<CompanyIpRow[]> {
  const q = encodeURIComponent(String(orgId));
  const res = await fetch(`${API_URL}/api/organization-settings/get-ip-addresses?org_id=${q}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result = (await res.json()) as { message?: string; data?: CompanyIpRow[] };

  if (!res.ok) {
    const error: ApiError = new Error(result.message || "Could not load IP addresses");
    error.status = res.status;
    throw error;
  }

  return Array.isArray(result.data) ? result.data : [];
}

export type UpdateCompanyIpLabelPayload = {
  org_id: number | string;
  ip_id: number | string;
  label: string;
};

export async function updateCompanyIPAddressLabel(
  token: string,
  payload: UpdateCompanyIpLabelPayload,
): Promise<{ message?: string }> {
  const res = await fetch(`${API_URL}/api/organization-settings/update-ip-address`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      org_id: payload.org_id,
      ip_id: payload.ip_id,
      label: payload.label.trim(),
    }),
  });

  const result = (await res.json()) as { message?: string };

  if (!res.ok) {
    const error: ApiError = new Error(result.message || "Could not update label");
    error.status = res.status;
    throw error;
  }

  return result;
}

export type DeleteCompanyIpPayload = {
  org_id: number | string;
  ip_id: number | string;
};

export async function deleteCompanyIPAddress(
  token: string,
  payload: DeleteCompanyIpPayload,
): Promise<{ message?: string }> {
  const res = await fetch(`${API_URL}/api/organization-settings/delete-ip-address`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      org_id: payload.org_id,
      ip_id: payload.ip_id,
    }),
  });

  const result = (await res.json()) as { message?: string };

  if (!res.ok) {
    const error: ApiError = new Error(result.message || "Could not delete IP address");
    error.status = res.status;
    throw error;
  }

  return result;
}

export async function assignIpToEmployee(
  token: string,
  payload: { employee_id: number | string; ip_id: number | string },
): Promise<{ message?: string; success?: boolean }> {
  const res = await fetch(`${API_URL}/api/organization-settings/assign-ip-address-to-user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      employee_id: payload.employee_id,
      ip_id: payload.ip_id,
    }),
  });

  const result = (await res.json()) as { message?: string; success?: boolean };

  if (!res.ok) {
    const error: ApiError = new Error(result.message || "Could not assign IP address");
    error.status = res.status;
    throw error;
  }

  return result;
}

export async function unassignIpFromEmployee(
  token: string,
  payload: { employee_id: number | string; ip_id: number | string },
): Promise<{ message?: string; success?: boolean }> {
  const res = await fetch(`${API_URL}/api/organization-settings/unassign-ip-address-from-user`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      employee_id: payload.employee_id,
      ip_id: payload.ip_id,
    }),
  });

  const result = (await res.json()) as { message?: string; success?: boolean };

  if (!res.ok) {
    const error: ApiError = new Error(result.message || "Could not remove IP assignment");
    error.status = res.status;
    throw error;
  }

  return result;
}

export type CreateCompanyShiftPayload = {
  org_id: number | string;
  shift_name: string;
  start_time: string;
  end_time: string;
  late_after: string | number;
  half_day_hours: string | number;
  short_leave_hours: string | number;
  is_night_shift?: boolean;
  working_days?: string;
};

export type CompanyHolidayRow = {
  id: number | string;
  org_id: number | string;
  holiday_name: string;
  holiday_date: string;
  holiday_created_by_id?: number | string | null;
  holiday_created_by_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export async function getCompanyHolidays(
  token: string,
  orgId: number | string,
): Promise<CompanyHolidayRow[]> {
  const q = encodeURIComponent(String(orgId));
  const res = await fetch(`${API_URL}/api/organization-settings/get-company-holidays?org_id=${q}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result = (await res.json()) as { message?: string; data?: CompanyHolidayRow[] };

  if (!res.ok) {
    const error: ApiError = new Error(result.message || "Could not load holidays");
    error.status = res.status;
    throw error;
  }

  return Array.isArray(result.data) ? result.data : [];
}

export type CreateCompanyHolidayPayload = {
  org_id: number | string;
  holiday_name: string;
  holiday_date: string;
};

export async function createCompanyHoliday(
  token: string,
  payload: CreateCompanyHolidayPayload,
): Promise<{ message?: string }> {
  const res = await fetch(`${API_URL}/api/organization-settings/create-company-holiday`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      org_id: payload.org_id,
      holiday_name: payload.holiday_name.trim(),
      holiday_date: payload.holiday_date,
    }),
  });

  const result = (await res.json()) as { message?: string };

  if (!res.ok) {
    const error: ApiError = new Error(result.message || "Could not create holiday");
    error.status = res.status;
    throw error;
  }

  return result;
}

export type UpdateCompanyHolidayPayload = {
  holiday_id: number | string;
  holiday_name: string;
  holiday_date: string;
};

export async function updateCompanyHoliday(
  token: string,
  payload: UpdateCompanyHolidayPayload,
): Promise<{ message?: string }> {
  const res = await fetch(`${API_URL}/api/organization-settings/update-company-holiday`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      holiday_id: payload.holiday_id,
      holiday_name: payload.holiday_name.trim(),
      holiday_date: payload.holiday_date,
    }),
  });

  const result = (await res.json()) as { message?: string };

  if (!res.ok) {
    const error: ApiError = new Error(result.message || "Could not update holiday");
    error.status = res.status;
    throw error;
  }

  return result;
}

export type DeleteCompanyHolidayPayload = {
  holiday_id: number | string;
};

export async function deleteCompanyHoliday(
  token: string,
  payload: DeleteCompanyHolidayPayload,
): Promise<{ message?: string }> {
  const res = await fetch(`${API_URL}/api/organization-settings/delete-company-holiday`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      holiday_id: payload.holiday_id,
    }),
  });

  const result = (await res.json()) as { message?: string };

  if (!res.ok) {
    const error: ApiError = new Error(result.message || "Could not delete holiday");
    error.status = res.status;
    throw error;
  }

  return result;
}

export type CompanyShiftRow = {
  id: number;
  org_id: number;
  shift_name: string | null;
  start_time: string | null;
  end_time: string | null;
  late_after: string | null;
  half_day_hours: string | null;
  short_leave_hours: string | null;
  is_night_shift: boolean | number | null;
  shift_created_by: number | null;
  shift_creator_name: string | null;
  working_days: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export async function getCompanyShifts(
  token: string,
  orgId: number | string,
): Promise<CompanyShiftRow[]> {
  const q = encodeURIComponent(String(orgId));
  const res = await fetch(`${API_URL}/api/organization-settings/get-company-shifts?org_id=${q}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result = (await res.json()) as { message?: string; data?: CompanyShiftRow[] };

  if (!res.ok) {
    const error: ApiError = new Error(result.message || "Could not load shifts");
    error.status = res.status;
    throw error;
  }

  return Array.isArray(result.data) ? result.data : [];
}

export type UpdateCompanyShiftPayload = {
  org_id: number | string;
  shift_id: number | string;
  shift_name: string;
  start_time: string;
  end_time: string;
  late_after: string;
  half_day_hours: string;
  short_leave_hours: string;
  is_night_shift?: boolean;
  working_days?: string;
};

export async function updateCompanyShift(
  token: string,
  payload: UpdateCompanyShiftPayload,
): Promise<{ message?: string }> {
  const res = await fetch(`${API_URL}/api/organization-settings/update-company-shift`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      org_id: payload.org_id,
      shift_id: payload.shift_id,
      shift_name: payload.shift_name.trim(),
      start_time: payload.start_time,
      end_time: payload.end_time,
      late_after: payload.late_after,
      half_day_hours: payload.half_day_hours,
      short_leave_hours: payload.short_leave_hours,
      is_night_shift: Boolean(payload.is_night_shift),
      working_days: payload.working_days,
    }),
  });

  const result = (await res.json()) as { message?: string };

  if (!res.ok) {
    const error: ApiError = new Error(result.message || "Could not update shift");
    error.status = res.status;
    throw error;
  }

  return result;
}

export type DeleteCompanyShiftPayload = {
  org_id: number | string;
  shift_id: number | string;
};

export type AssignUserShiftPayload = {
  org_id: number | string;
  user_id: number | string;
  shift_id: number | string;
};

export async function assignUserToShift(
  token: string,
  payload: AssignUserShiftPayload,
): Promise<{ message?: string }> {
  const res = await fetch(`${API_URL}/api/organization-settings/assign-user-shift`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      org_id: payload.org_id,
      user_id: payload.user_id,
      shift_id: payload.shift_id,
    }),
  });

  const result = (await res.json()) as { message?: string };

  if (!res.ok) {
    const error: ApiError = new Error(result.message || "Could not assign shift");
    error.status = res.status;
    throw error;
  }

  return result;
}

export async function unassignUserFromShift(
  token: string,
  payload: AssignUserShiftPayload,
): Promise<{ message?: string }> {
  const res = await fetch(`${API_URL}/api/organization-settings/unassign-user-shift`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      org_id: payload.org_id,
      user_id: payload.user_id,
      shift_id: payload.shift_id,
    }),
  });

  const result = (await res.json()) as { message?: string };

  if (!res.ok) {
    const error: ApiError = new Error(result.message || "Could not unassign shift");
    error.status = res.status;
    throw error;
  }

  return result;
}

export async function deleteCompanyShift(
  token: string,
  payload: DeleteCompanyShiftPayload,
): Promise<{ message?: string }> {
  const res = await fetch(`${API_URL}/api/organization-settings/delete-company-shift`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      org_id: payload.org_id,
      shift_id: payload.shift_id,
    }),
  });

  const result = (await res.json()) as { message?: string };

  if (!res.ok) {
    const error: ApiError = new Error(result.message || "Could not delete shift");
    error.status = res.status;
    throw error;
  }

  return result;
}

export async function createCompanyWorkShift(
  token: string,
  payload: CreateCompanyShiftPayload,
): Promise<{ message?: string }> {
  const res = await fetch(`${API_URL}/api/organization-settings/create-company-shifts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      org_id: payload.org_id,
      shift_name: payload.shift_name.trim(),
      start_time: payload.start_time,
      end_time: payload.end_time,
      late_after: payload.late_after,
      half_day_hours: payload.half_day_hours,
      short_leave_hours: payload.short_leave_hours,
      is_night_shift: Boolean(payload.is_night_shift),
      working_days: payload.working_days,
    }),
  });

  const result = (await res.json()) as { message?: string };

  if (!res.ok) {
    const error: ApiError = new Error(result.message || "Could not create company shift");
    error.status = res.status;
    throw error;
  }

  return result;
}
