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
