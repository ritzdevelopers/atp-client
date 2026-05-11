import type { ApiError } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

/** Session key holding current org JSON (expects an `id` field, or nested `org_details.id`). */
const ORG_DETAILS_SESSION_KEY = "org_details";

function readIdFromUnknown(value: unknown): number | string | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string" && value.trim() !== "") return value;
  return null;
}

/**
 * Organization id from `sessionStorage.org_details` (`id` on the root object, or on `org_details`),
 * with fallback to `admin_org_data` (first org in `org_details` array) for legacy admin portal cache.
 */
export function getOrganizationIdFromSession(): number | string | null {
  if (typeof window === "undefined") return null;

  const parseOrgId = (raw: string | null): number | string | null => {
    if (raw == null || raw === "") return null;
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const top = readIdFromUnknown(parsed.id);
      if (top != null) return top;

      const nested = parsed.org_details;
      if (nested && typeof nested === "object" && !Array.isArray(nested)) {
        const id = readIdFromUnknown((nested as { id?: unknown }).id);
        if (id != null) return id;
      }
      if (Array.isArray(nested) && nested.length > 0) {
        const first = nested[0];
        if (first && typeof first === "object") {
          const id = readIdFromUnknown((first as { id?: unknown }).id);
          if (id != null) return id;
        }
      }
    } catch {
      return null;
    }
    return null;
  };

  const fromOrgDetailsKey = parseOrgId(sessionStorage.getItem(ORG_DETAILS_SESSION_KEY));
  if (fromOrgDetailsKey != null) return fromOrgDetailsKey;

  return parseOrgId(sessionStorage.getItem("admin_org_data"));
}

export type OrgRoleRow = {
  id: number | string;
  role_name?: string;
  orgId?: number | string;
};

export type CreateEmployeePayload = {
  name: string;
  email: string;
  password: string;
  phone: string;
  user_role_id: number;
  organization_id: number;
};

export type CreateEmployeeResponse = {
  message?: string;
  user_id?: number | string;
  data?: {
    user_id?: number | string;
    org_id?: number | string;
  };
};

export async function getOrganizationRoles(
  token: string,
  organizationId: number | string,
): Promise<OrgRoleRow[]> {
  const res = await fetch(`${API_URL}/api/user-roles/get-all-user-roles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      organization_id: organizationId,
    }),
  });

  const result = await res.json();

  if (!res.ok) {
    const error: ApiError = new Error(result.message || "Failed to load roles");
    error.status = res.status;
    throw error;
  }

  const rows = result.data;
  return Array.isArray(rows) ? rows : [];
}

export async function createEmployee(
  token: string,
  payload: CreateEmployeePayload,
): Promise<CreateEmployeeResponse> {
  const res = await fetch(`${API_URL}/api/user/create-employee`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: payload.name,
      email: payload.email,
      password: payload.password,
      phone: payload.phone,
      user_role_id: payload.user_role_id,
      organization_id: payload.organization_id,
    }),
  });

  const result = await res.json();

  if (!res.ok) {
    const error: ApiError = new Error(result.message || "Could not create employee");
    error.status = res.status;
    throw error;
  }

  return result;
}

export type AddUserAddressPayload = {
  user_id: number | string;
  org_id: number | string;
  country: string;
  state: string;
  district: string;
  city: string;
  is_from_village: boolean;
  village_name?: string | null;
  street: string;
  house_number: string;
  zip_code: string;
};

export type UserAddressRow = AddUserAddressPayload & {
  id?: number | string;
  address_id?: number | string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
};

export type UpdateUserAddressPayload = Partial<
  Omit<AddUserAddressPayload, "user_id" | "org_id">
> & {
  address_id: number | string;
  user_id: number | string;
  org_id: number | string;
};

export async function addUserAddress(
  token: string,
  payload: AddUserAddressPayload,
): Promise<{ message?: string; data?: unknown }> {
  const res = await fetch(`${API_URL}/api/user/add-user-address`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const result = await res.json();
  if (!res.ok) {
    const error: ApiError = new Error(result.message || "Could not add employee address");
    error.status = res.status;
    throw error;
  }

  return result;
}

export async function getUserAddresses(
  token: string,
  orgId: number | string,
  userId: number | string,
): Promise<UserAddressRow[]> {
  const res = await fetch(`${API_URL}/api/user/get-user-address/${orgId}/${userId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await res.json();
  if (!res.ok) {
    const error: ApiError = new Error(result.message || "Could not fetch employee addresses");
    error.status = res.status;
    throw error;
  }

  return Array.isArray(result.data) ? result.data : [];
}

export async function updateUserAddress(
  token: string,
  payload: UpdateUserAddressPayload,
): Promise<{ message?: string; data?: unknown }> {
  const res = await fetch(`${API_URL}/api/user/update-user-address`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const result = await res.json();
  if (!res.ok) {
    const error: ApiError = new Error(result.message || "Could not update employee address");
    error.status = res.status;
    throw error;
  }

  return result;
}

export type CreateOrgRolePayload = {
  role_name: string;
  organization_id: number;
};

export async function createOrganizationRole(
  token: string,
  payload: CreateOrgRolePayload,
): Promise<{ message?: string; roleId?: number }> {
  const res = await fetch(`${API_URL}/api/user-roles/create-user-role`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      role_name: payload.role_name,
      organization_id: payload.organization_id,
    }),
  });

  const result = await res.json();

  if (!res.ok) {
    const error: ApiError = new Error(result.message || "Could not create role");
    error.status = res.status;
    throw error;
  }

  return result;
}

export type UpdateOrgRolePayload = {
  role_id: number | string;
  role_name: string;
  organization_id: number;
};

export async function updateOrganizationRole(
  token: string,
  payload: UpdateOrgRolePayload,
): Promise<{ message?: string }> {
  const res = await fetch(`${API_URL}/api/user-roles/update-user-role`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      role_id: payload.role_id,
      role_name: payload.role_name,
      organization_id: payload.organization_id,
    }),
  });

  const result = await res.json();

  if (!res.ok) {
    const error: ApiError = new Error(result.message || "Could not update role");
    error.status = res.status;
    throw error;
  }

  return result;
}

export type DeleteOrgRolePayload = {
  role_id: number | string;
  organization_id: number;
};

export async function deleteOrganizationRole(
  token: string,
  payload: DeleteOrgRolePayload,
): Promise<{ message?: string }> {
  const res = await fetch(`${API_URL}/api/user-roles/delete-user-role`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      role_id: payload.role_id,
      organization_id: payload.organization_id,
    }),
  });

  const result = await res.json();

  if (!res.ok) {
    const error: ApiError = new Error(result.message || "Could not delete role");
    error.status = res.status;
    throw error;
  }

  return result;
}

/** Row from `get_all_users_controller` (shape may include `role_name` or legacy `user_role_name`). */
export type OrgUserRow = {
  id?: number | string;
  org_member_id?: number | string;
  /** `apt_user_roles.id` — required for HR role updates */
  user_role_assignment_id?: number | string;
  user_name?: string;
  user_email?: string;
  user_phone?: string | null;
  user_role_name?: string;
  role_name?: string;
  role_id?: number | string;
  created_at?: string;
  orgID?: number | string;
  /** From `get_all_users` join with `user_shifts` / `shifts` */
  user_shift_id?: number | string | null;
  user_shift_name?: string | null;
  user_shift_start_time?: string | null;
  user_shift_end_time?: string | null;
  user_shift_working_days?: string | null;
  shift_assigned_by_name?: string | null;
  [key: string]: unknown;
};

export async function getAllOrgUsers(token: string): Promise<OrgUserRow[]> {
  const res = await fetch(`${API_URL}/api/user/get-all-users`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await res.json();
  if (!res.ok) {
    const error: ApiError = new Error(result.message || "Failed to load users");
    error.status = res.status;
    throw error;
  }

  const users = result.users;
  return Array.isArray(users) ? users : [];
}

export type UpdateUserDetailsPayload = {
  user_id: number | string;
  /** Optional override; defaults to `getOrganizationIdFromSession()`. */
  org_id?: number | string;
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
};

export async function updateUserDetails(
  token: string,
  payload: UpdateUserDetailsPayload,
): Promise<{ message?: string }> {
  const orgId = payload.org_id ?? getOrganizationIdFromSession();
  if (orgId == null || orgId === "") {
    const error: ApiError = new Error(
      "Organization ID is missing. Ensure org_details is set in session storage.",
    );
    error.status = 400;
    throw error;
  }

  const body: Record<string, unknown> = { user_id: payload.user_id, org_id: orgId };
  if (payload.name != null && payload.name !== "") body.name = payload.name;
  if (payload.email != null && payload.email !== "") body.email = payload.email;
  if (payload.phone != null && payload.phone !== "") body.phone = payload.phone;
  if (payload.password != null && payload.password !== "") body.password = payload.password;

  const res = await fetch(`${API_URL}/api/user/update-user-name-email-phone-password`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const result = await res.json();
  if (!res.ok) {
    const error: ApiError = new Error(result.message || "Could not update user");
    error.status = res.status;
    throw error;
  }
  return result;
}

export type UpdateUserRolePayload = {
  user_id: number | string;
  /** Defaults to `id` from `sessionStorage.org_details` (or legacy `admin_org_data`). */
  organization_id?: number | string;
  new_role_id: number | string;
  /** For admin: current `apt_roles.id`. For HR: `apt_user_roles.id` row PK. */
  previous_role_id: number | string;
};

export async function updateUserRoleAssignment(
  token: string,
  payload: UpdateUserRolePayload,
): Promise<{ message?: string }> {
  const organizationId =
    payload.organization_id ?? getOrganizationIdFromSession();
  if (organizationId == null || organizationId === "") {
    const error: ApiError = new Error(
      "Organization ID is missing. Ensure org_details is set in session storage.",
    );
    error.status = 400;
    throw error;
  }
  

  const res = await fetch(`${API_URL}/api/user/update-user-role`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      user_id: payload.user_id,
      organization_id: organizationId,
      new_role_id: payload.new_role_id,
      previous_role_id: payload.previous_role_id,
    }),
  });

  const result = await res.json();
  if (!res.ok) {
    const error: ApiError = new Error(result.message || "Could not update role");
    error.status = res.status;
    throw error;
  }
  return result;
}

export async function deleteOrgUser(
  token: string,
  userId: number | string,
  orgId?: number | string,
): Promise<{ message?: string }> {
  const resolvedOrgId = orgId ?? getOrganizationIdFromSession();
  if (resolvedOrgId == null || resolvedOrgId === "") {
    const error: ApiError = new Error(
      "Organization ID is missing. Ensure org_details is set in session storage.",
    );
    error.status = 400;
    throw error;
  }

  const res = await fetch(`${API_URL}/api/user/delete-user`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ user_id: userId, org_id: resolvedOrgId }),
  });

  const result = await res.json();
  if (!res.ok) {
    const error: ApiError = new Error(result.message || "Could not delete user");
    error.status = res.status;
    throw error;
  }
  return result;
}

export type AssignPaidLeavesPayload = {
  org_id: number | string;
  user_id: number | string;
  year: number | string;
  month: number | string;
  total_leaves: number | string;
};

export type AssignPaidLeavesResponse = {
  message?: string;
  data?: {
    id?: number | string;
    user_id?: number | string;
    org_id?: number | string;
    year?: number;
    month?: number;
    total_leaves?: number;
    used_leaves?: number;
    remaining_leaves?: number;
  };
};

export async function assignPaidLeaves(
  token: string,
  payload: AssignPaidLeavesPayload,
): Promise<AssignPaidLeavesResponse> {
  const res = await fetch(`${API_URL}/api/user/assign-leaves-to-users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const result = await res.json();
  if (!res.ok) {
    const error: ApiError = new Error(result.message || "Could not assign paid leaves");
    error.status = res.status;
    throw error;
  }
  return result;
}
