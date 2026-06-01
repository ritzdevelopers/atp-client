import type { ApiError } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export type PortalOrgRow = {
  id?: number | string;
  org_name?: string;
  org_email?: string;
  org_phone?: string;
  owner_id?: number | string;
  [key: string]: unknown;
};

export type PortalFeature = {
  id?: number | string;
  feature_name?: string;
  name?: string;
  slug?: string;
  [key: string]: unknown;
};

export type PortalOrgUser = {
  id?: string | number;
  user_id?: string | number;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  created_at?: string;
  user_role_id?: string | number;
  user_role_name?: string;
};

export type GetOrganizationData = {
  organization: PortalOrgRow | PortalOrgRow[] | null;
  features: PortalFeature[];
  user: PortalOrgUser;
};



/** Normalize API org payload (db query may return a single row as array). */
export function normalizeOrganization(
  organization: GetOrganizationData["organization"],
): PortalOrgRow | null {
  if (organization == null) return null;
  if (Array.isArray(organization)) {
    return (organization[0] as PortalOrgRow) ?? null;
  }
  return organization;
}

/**
 * True if the feature list includes a "services" feature (name/slug/identifier).
 */
export function hasServicesFeature(features: PortalFeature[] | undefined | null): boolean {
  if (!features?.length) return false;
  return features.some((f) => {
    const candidates = [f.feature_name, f.name, f.slug, (f as { code?: string }).code].filter(
      (x): x is string => x != null && String(x).length > 0,
    );
    return candidates.some((c) => {
      const t = String(c).trim().toLowerCase();
      return t === "services" || t === "service" || t.endsWith("/services");
    });
  });
}

export type CreateOrganizationPayload = {
  organization_name: string;
  owner_id: string;
  organization_email: string;
  organization_phone: string;
};

export const createOrganization = async (
  data: CreateOrganizationPayload,
): Promise<unknown> => {
  const res = await fetch(`${API_URL}/api/register/organization`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result = await res.json();

  if (!res.ok) {
    const error: ApiError = new Error(
      (typeof result.message === "string" && result.message) ||
        (typeof result.error === "string" && result.error) ||
        "Failed to create organization",
    );
    error.status = res.status;
    throw error;
  }

  return result;
};

export type OrganizationAddress = {
  id: number | string;
  org_id: number | string;
  org_owner_id: number | string;
  city: string;
  state: string;
  district: string;
  country: string;
  zip_code: string | null;
  address_line: string | null;
  created_at?: string;
  updated_at?: string;
};

export type OrganizationAddressPayload = {
  org_id: number | string;
  city: string;
  state: string;
  district: string;
  country: string;
  zip_code?: string | null;
  address_line?: string | null;
};

export type UpdateOrganizationAddressPayload = OrganizationAddressPayload & {
  organization_address_id: number | string;
};

function orgAddressError(result: { message?: string; error?: string }, fallback: string): ApiError {
  const error: ApiError = new Error(
    (typeof result.message === "string" && result.message) ||
      (typeof result.error === "string" && result.error) ||
      fallback,
  );
  return error;
}

/** All registered addresses for the organization (newest first). */
export async function getOrganizationAddresses(
  token: string,
  orgId: number | string,
): Promise<OrganizationAddress[]> {
  const q = encodeURIComponent(String(orgId));
  const res = await fetch(`${API_URL}/api/register/get-organization-address?org_id=${q}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result = (await res.json()) as {
    message?: string;
    error?: string;
    success?: boolean;
    data?: {
      organization_addresses?: OrganizationAddress[];
      organization_address?: OrganizationAddress | null;
    };
  };

  if (res.status === 404) {
    return [];
  }

  if (!res.ok) {
    const error = orgAddressError(result, "Could not load organization addresses");
    error.status = res.status;
    throw error;
  }

  const list = result.data?.organization_addresses;
  if (Array.isArray(list)) return list;
  const single = result.data?.organization_address;
  return single ? [single] : [];
}

/** @deprecated Prefer getOrganizationAddresses */
export async function getOrganizationAddress(
  token: string,
  orgId: number | string,
): Promise<OrganizationAddress | null> {
  const rows = await getOrganizationAddresses(token, orgId);
  return rows[0] ?? null;
}

export async function createOrganizationAddress(
  token: string,
  payload: OrganizationAddressPayload,
): Promise<{ organization_address_id?: number | string; message?: string }> {
  const res = await fetch(`${API_URL}/api/register/add-organization-address`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      org_id: payload.org_id,
      city: payload.city.trim(),
      state: payload.state.trim(),
      district: payload.district.trim(),
      country: payload.country.trim(),
      zip_code: payload.zip_code?.trim() || null,
      address_line: payload.address_line?.trim() || null,
    }),
  });

  const result = (await res.json()) as {
    message?: string;
    error?: string;
    success?: boolean;
    data?: { organization_address_id?: number | string };
  };

  if (!res.ok) {
    const error = orgAddressError(result, "Could not save organization address");
    error.status = res.status;
    throw error;
  }

  return {
    message: result.message,
    organization_address_id: result.data?.organization_address_id,
  };
}

export async function updateOrganizationAddress(
  token: string,
  payload: UpdateOrganizationAddressPayload,
): Promise<{ message?: string }> {
  const res = await fetch(`${API_URL}/api/register/update-organization-address`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      org_id: payload.org_id,
      organization_address_id: payload.organization_address_id,
      city: payload.city.trim(),
      state: payload.state.trim(),
      district: payload.district.trim(),
      country: payload.country.trim(),
      zip_code: payload.zip_code?.trim() || null,
      address_line: payload.address_line?.trim() || null,
    }),
  });

  const result = (await res.json()) as { message?: string; error?: string; success?: boolean };

  if (!res.ok) {
    const error = orgAddressError(result, "Could not update organization address");
    error.status = res.status;
    throw error;
  }

  return { message: result.message };
}

export const getOrganization = async (
  token: string
): Promise<any> => {
  const res = await fetch(`${API_URL}/api/auth/get-organization`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await res.json(); 

  return result;
};
