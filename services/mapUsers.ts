const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export type MapUserRow = {
  org_member_id: number;
  user_id: number;
  org_id: number;
  emp_code: string | null;
  is_active: number | boolean;
  member_since?: string | null;
  user_name: string;
  user_email: string;
  user_phone?: string | null;
  user_image?: string | null;
};

export type MapUserPayloadItem = {
  user_id: number;
  emp_code: string;
};

function authHeaders(token: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function getUsersForMapping(
  token: string,
  orgId: string,
): Promise<MapUserRow[]> {
  const params = new URLSearchParams({ org_id: orgId });
  const res = await fetch(
    `${API_URL}/api/map-users/get-users-for-mapping?${params.toString()}`,
    {
      method: "GET",
      headers: authHeaders(token),
    },
  );

  const body = (await res.json()) as {
    success?: boolean;
    message?: string;
    data?: MapUserRow[];
  };

  if (!res.ok) {
    throw new Error(body.message || "Could not load employees for mapping");
  }

  return body.data ?? [];
}

export async function mapUsersBulk(
  token: string,
  orgId: string,
  emp_info: MapUserPayloadItem[],
): Promise<{ success: boolean; message: string }> {
  const params = new URLSearchParams({ org_id: orgId });
  const res = await fetch(
    `${API_URL}/api/map-users/map-users?${params.toString()}`,
    {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ emp_info }),
    },
  );

  const body = (await res.json()) as {
    success?: boolean;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(body.message || "Could not save employee code mappings");
  }

  return {
    success: Boolean(body.success),
    message: body.message || "Users mapped successfully",
  };
}
