import { type ApiError } from "@/services/auth";

type CreateOrganizationPayload = {
  org_name: string;
  owner_id: string;
  org_email: string;
  org_phone: string;
};

type CreateOrganizationResponse = {
  message?: string;
};

export const createOrganization = async (
  data: CreateOrganizationPayload,
): Promise<CreateOrganizationResponse> => {
  const res = await fetch("http://localhost:3000/api/organization/create-organization", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result = await res.json();

  if (!res.ok) {
    const error: ApiError = new Error(result.message || "Failed to create organization");
    error.status = res.status;
    throw error;
  }

  return result;
};
