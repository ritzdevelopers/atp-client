import type { ApiError } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export type EmployeeSalaryRecord = {
  salary_id: number | string;
  employee_id: number | string;
  employee_name?: string;
  org_id: number | string;
  basic_salary: number;
  house_rent_allowance: number;
  special_allowance: number;
  convey: number;
  gross_salary: number;
  created_at?: string | null;
  updated_at?: string | null;
};

export type SalaryFormPayload = {
  org_id: number | string;
  employee_id: number | string;
  basic_salary: number | string;
  house_rent_allowance: number | string;
  special_allowance: number | string;
  convey: number | string;
};

function salaryApiError(
  result: { message?: string; error?: string; success?: boolean },
  fallback: string,
): ApiError {
  const error: ApiError = new Error(
    (typeof result.message === "string" && result.message) ||
      (typeof result.error === "string" && result.error) ||
      fallback,
  );
  return error;
}

export async function getEmployeeSalary(
  token: string,
  orgId: number | string,
  employeeId: number | string,
): Promise<EmployeeSalaryRecord | null> {
  const qOrg = encodeURIComponent(String(orgId));
  const qEmp = encodeURIComponent(String(employeeId));
  const res = await fetch(
    `${API_URL}/api/employee-salary/get-employee-salary?org_id=${qOrg}&employee_id=${qEmp}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  const result = (await res.json()) as {
    message?: string;
    success?: boolean;
    data?: EmployeeSalaryRecord;
  };

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    const error = salaryApiError(result, "Could not load employee salary");
    error.status = res.status;
    throw error;
  }

  return result.data ?? null;
}

export async function registerEmployeeSalary(
  token: string,
  payload: SalaryFormPayload,
): Promise<{ message?: string; data?: EmployeeSalaryRecord }> {
  const res = await fetch(`${API_URL}/api/employee-salary/register-employee-salary`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const result = (await res.json()) as {
    message?: string;
    success?: boolean;
    data?: EmployeeSalaryRecord;
  };

  if (!res.ok) {
    const error = salaryApiError(result, "Could not create employee salary");
    error.status = res.status;
    throw error;
  }

  return result;
}

export async function updateEmployeeSalary(
  token: string,
  payload: SalaryFormPayload,
): Promise<{ message?: string; data?: EmployeeSalaryRecord }> {
  const res = await fetch(`${API_URL}/api/employee-salary/update-employee-salary`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const result = (await res.json()) as {
    message?: string;
    success?: boolean;
    data?: EmployeeSalaryRecord;
  };

  if (!res.ok) {
    const error = salaryApiError(result, "Could not update employee salary");
    error.status = res.status;
    throw error;
  }

  return result;
}
