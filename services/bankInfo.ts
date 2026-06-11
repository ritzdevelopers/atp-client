import type { ApiError } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export type EmployeeBankInfoPayload = {
  org_id: number | string;
  user_id: number | string;
  account_holder_name: string;
  account_number: string;
  bank_name: string;
  bank_branch: string;
  ifsc_code: string;
  uan_number?: string | null;
};

export type UpdateEmployeeBankInfoPayload = EmployeeBankInfoPayload & {
  id?: number | string;
};

export type EmployeeBankInfoRow = {
  id: number;
  account_holder_name: string;
  account_number: string;
  bank_name: string;
  bank_branch: string;
  ifsc_code: string;
  uan_number: string | null;
  user_id: number;
  org_id: number;
};

export async function createEmployeeBankInfo(
  token: string,
  payload: EmployeeBankInfoPayload,
): Promise<{ success?: boolean; message?: string; data?: EmployeeBankInfoRow }> {
  const res = await fetch(`${API_URL}/api/employee-bank-info/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      org_id: payload.org_id,
      user_id: payload.user_id,
      account_holder_name: payload.account_holder_name.trim(),
      account_number: payload.account_number.trim(),
      bank_name: payload.bank_name.trim(),
      bank_branch: payload.bank_branch.trim(),
      ifsc_code: payload.ifsc_code.trim().toUpperCase(),
      uan_number: payload.uan_number?.trim() ? payload.uan_number.trim() : null,
    }),
  });

  const result = (await res.json()) as {
    success?: boolean;
    message?: string;
    data?: EmployeeBankInfoRow;
  };

  if (!res.ok) {
    const error: ApiError = new Error(result.message || "Could not save bank information");
    error.status = res.status;
    throw error;
  }

  return result;
}

export async function updateEmployeeBankInfo(
  token: string,
  payload: UpdateEmployeeBankInfoPayload,
): Promise<{ success?: boolean; message?: string; data?: EmployeeBankInfoRow }> {
  const body: Record<string, unknown> = {
    org_id: payload.org_id,
    user_id: payload.user_id,
    account_holder_name: payload.account_holder_name.trim(),
    account_number: payload.account_number.trim(),
    bank_name: payload.bank_name.trim(),
    bank_branch: payload.bank_branch.trim(),
    ifsc_code: payload.ifsc_code.trim().toUpperCase(),
    uan_number: payload.uan_number?.trim() ? payload.uan_number.trim() : null,
  };
  if (payload.id != null) body.id = payload.id;

  const res = await fetch(`${API_URL}/api/employee-bank-info/update`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const result = (await res.json()) as {
    success?: boolean;
    message?: string;
    data?: EmployeeBankInfoRow;
  };

  if (!res.ok) {
    const error: ApiError = new Error(result.message || "Could not update bank information");
    error.status = res.status;
    throw error;
  }

  return result;
}
