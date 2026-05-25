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

/** Field names must match multer `file.fieldname` / server `document_type` in `user_docs`. */
export type EmployeeOnboardingDocumentField =
  | "user_image"
  | "user_passbook"
  | "user_pan_card"
  | "user_aadhar_front"
  | "user_aadhar_back"
  | "user_passport_photo"
  | "user_resignation_letter"
  | "user_10th_marksheet"
  | "user_12th_marksheet"
  | "user_higher_education_marksheet"
  | "user_other_certificate"
  | "user_appointment_letter"
  | "user_previous_company_leaving_letter"
  | "user_other_document";

export async function uploadEmployeeDocuments(
  token: string,
  payload: {
    org_id: number | string;
    employee_user_id: number | string;
    files: Partial<Record<EmployeeOnboardingDocumentField, File>>;
  },
): Promise<{ success?: boolean; message?: string; documents?: unknown[] }> {
  const fd = new FormData();
  fd.append("employee_user_id", String(payload.employee_user_id));
  fd.append("org_id", String(payload.org_id));
  (Object.entries(payload.files) as [EmployeeOnboardingDocumentField, File | undefined][]).forEach(
    ([key, file]) => {
      if (file) fd.append(key, file);
    },
  );

  const res = await fetch(`${API_URL}/api/employee-documents/upload-document`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: fd,
  });

  const result = (await res.json()) as {
    success?: boolean;
    message?: string;
    documents?: unknown[];
  };

  if (!res.ok) {
    const error: ApiError = new Error(result.message || "Could not upload documents");
    error.status = res.status;
    throw error;
  }

  return result;
}

export async function addUserExternalInformation(
  token: string,
  payload: {
    user_id: number | string;
    org_id: number | string;
    emergency_contact_name: string;
    emergency_number: string;
    relation_blood_line: string;
  },
): Promise<{
  success?: boolean;
  message?: string;
  data?: {
    id?: number | string;
    user_id?: number | string;
    org_id?: number | string;
    emergency_contact_name?: string;
    emergency_number?: string;
    relation_blood_line?: string;
  };
}> {
  const res = await fetch(`${API_URL}/api/user/add-user-external-information`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      user_id: payload.user_id,
      org_id: payload.org_id,
      emergency_contact_name: payload.emergency_contact_name,
      emergency_number: payload.emergency_number,
      relation_blood_line: payload.relation_blood_line,
    }),
  });

  const result = (await res.json()) as {
    success?: boolean;
    message?: string;
    data?: unknown;
  };

  if (!res.ok) {
    const error: ApiError = new Error(result.message || "Could not save emergency contact details");
    error.status = res.status;
    throw error;
  }

  return result as {
    success?: boolean;
    message?: string;
    data?: {
      id?: number | string;
      user_id?: number | string;
      org_id?: number | string;
      emergency_contact_name?: string;
      emergency_number?: string;
      relation_blood_line?: string;
    };
  };
}

/** Matches server `employee_assets.asset_type`. */
export const EMPLOYEE_ASSET_TYPES = [
  "laptop",
  "mobile",
  "software",
  "email",
  "sim",
  "id_card",
  "monitor",
  "access_card",
  "other",
] as const;

export type EmployeeAssetTypeSlug = (typeof EMPLOYEE_ASSET_TYPES)[number];

export type ManagementEmployeeRoleSlot = {
  user_role_assignment_id?: number | string;
  role_id?: number | string;
  role_name?: string;
  role_created_at?: string;
  assignment_updated_at?: string;
};

export type ManagementEmployeeRow = {
  user_id: number | string;
  user_name?: string;
  user_email?: string;
  user_phone?: string | null;
  org_member_id?: number | string;
  org_member_since?: string;
  roles: ManagementEmployeeRoleSlot[];
};

export type ManagementEmployeesPagination = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
};

export async function getManagementEmployeesPage(
  token: string,
  orgId: number | string,
  page = 1,
  limit = 100,
): Promise<{
  success?: boolean;
  message?: string;
  data: ManagementEmployeeRow[];
  pagination: ManagementEmployeesPagination;
}> {
  const params = new URLSearchParams({
    org_id: String(orgId),
    page: String(page),
    limit: String(limit),
  });
  const res = await fetch(
    `${API_URL}/api/employee-references/management-employees?${params.toString()}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const result = (await res.json()) as {
    success?: boolean;
    message?: string;
    data?: ManagementEmployeeRow[];
    pagination?: ManagementEmployeesPagination;
  };

  if (!res.ok) {
    const error: ApiError = new Error(result.message || "Could not load organization members");
    error.status = res.status;
    throw error;
  }

  const data = Array.isArray(result.data) ? result.data : [];
  const pagination = result.pagination ?? {
    page: 1,
    limit,
    total: data.length,
    total_pages: 1,
    has_next: false,
    has_prev: false,
  };

  return { ...result, data, pagination };
}

export async function addEmployeeReference(
  token: string,
  payload: {
    org_id: number | string;
    employee_id: number | string;
    referred_by_id: number | string;
    referred_by_name?: string | null;
    referred_by_designation_id?: number | string | null;
  },
): Promise<{ success?: boolean; message?: string; data?: unknown }> {
  const body: Record<string, unknown> = {
    org_id: payload.org_id,
    employee_id: payload.employee_id,
    referred_by_id: payload.referred_by_id,
  };
  if (payload.referred_by_name !== undefined && payload.referred_by_name !== "") {
    body.referred_by_name = payload.referred_by_name;
  }
  if (
    payload.referred_by_designation_id !== undefined &&
    payload.referred_by_designation_id !== null &&
    String(payload.referred_by_designation_id).trim() !== ""
  ) {
    body.referred_by_designation_id = payload.referred_by_designation_id;
  }

  const res = await fetch(`${API_URL}/api/employee-references/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const result = (await res.json()) as {
    success?: boolean;
    message?: string;
    data?: unknown;
  };

  if (!res.ok) {
    const error: ApiError = new Error(result.message || "Could not save employee reference");
    error.status = res.status;
    throw error;
  }

  return result;
}

export type UploadEmployeeAssetsItemPayload = {
  employee_id: number | string;
  asset_name: string;
  asset_type: string;
  asset_summary?: string | null;
  handover_date_time?: string | null;
  /** Multipart field name for optional image/PDF. */
  image_field: string;
  file?: File | null;
};

export async function uploadEmployeeAssetsBatch(
  token: string,
  payload: {
    org_id: number | string;
    items: UploadEmployeeAssetsItemPayload[];
  },
): Promise<{ success?: boolean; message?: string; data?: unknown[] }> {
  if (payload.items.length === 0) {
    const error: ApiError = new Error("No assets to upload");
    error.status = 400;
    throw error;
  }

  const fd = new FormData();
  fd.append("org_id", String(payload.org_id));

  const meta = payload.items.map((item, index) => {
    const image_field =
      item.image_field && item.image_field.trim() !== ""
        ? item.image_field.trim()
        : `asset_image_${index}`;
    return {
      employee_id: item.employee_id,
      asset_name: item.asset_name,
      asset_type: item.asset_type,
      asset_summary:
        item.asset_summary != null && String(item.asset_summary).trim() !== ""
          ? String(item.asset_summary).trim()
          : null,
      handover_date_time:
        item.handover_date_time != null &&
        String(item.handover_date_time).trim() !== ""
          ? String(item.handover_date_time).trim()
          : null,
      image_field,
    };
  });

  fd.append("assets", JSON.stringify(meta));

  payload.items.forEach((item, index) => {
    const image_field =
      meta[index]?.image_field && meta[index].image_field.trim() !== ""
        ? meta[index].image_field
        : `asset_image_${index}`;
    if (item.file) {
      fd.append(image_field, item.file);
    }
  });

  const res = await fetch(`${API_URL}/api/employee-assets/add`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: fd,
  });

  const result = (await res.json()) as {
    success?: boolean;
    message?: string;
    data?: unknown[];
  };

  if (!res.ok) {
    const error: ApiError = new Error(result.message || "Could not upload employee assets");
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

/** Single entry inside `assigned_ips` from `get_all_users_controller` (`JSON_ARRAYAGG`). */
export type OrgUserAssignedIp = {
  ip_id?: number | string | null;
  ip_address?: string | null;
  ip_label?: string | null;
};

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
  /** Organization IP assignments (`JSON_ARRAYAGG`); may arrive as parsed array or JSON string from MySQL/driver. */
  assigned_ips?: OrgUserAssignedIp[] | string | null;
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
