type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  phone: string;
};

type LoginPayload = {
  email: string;
  password: string;
};

type RegisterResponse = {
  message?: string;
  id?: string | number;
  user_id?: string | number;
  owner_id?: string | number;
  user?: {
    id?: string | number;
    user_id?: string | number;
    owner_id?: string | number;
  };
  status?: number;
};

type LoginResponse = {
  token: string;
  message?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export type DashboardType = "management" | "employee";

type GetMeResponse = {
  user?: {
    id?: string | number;
    user_id?: string | number;
    name?: string;
    email?: string;
  };
  organization_id?: string | number | null;
  dashboard_type?: DashboardType | null;
  org_details?:
    | {
        id?: string | number;
        dashboard_type?: DashboardType | null;
      }
    | Array<{
        id?: string | number;
        dashboard_type?: DashboardType | null;
      }>;
  success?: boolean;
  data?: {
    user_role?: string;
    role_name?: string;
    org_details?: Array<{ id?: string | number; dashboard_type?: DashboardType | null }>;
    org_id?: string | number;
    id?: string | number;
    user_id?: string | number;
    dashboard_type?: DashboardType | null;
  };
  message?: string;
};

export type ApiError = Error & { status?: number; user_id?: string | number };

export const registerUser = async (data: RegisterPayload): Promise<RegisterResponse> => {
  const res = await fetch(`${API_URL}/api/register/user`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result = await res.json();

  if (!res.ok) {
    const error: ApiError = new Error(result.message || "Something went wrong");
    error.status = res.status;
    throw error;
  }

  return { ...result, status: res.status };
};

export const loginUser = async (data: LoginPayload): Promise<LoginResponse> => {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result = await res.json();

  if (!res.ok) {
    const error: ApiError = new Error(result.message || "Something went wrong");
    error.status = res.status;
    if (result.user_id != null) {
      error.user_id = result.user_id;
    }
    throw error;
  }

  return result;
};

export const getMe = async (token: string): Promise<GetMeResponse> => { 
  
  const res = await fetch(`${API_URL}/api/auth/get-me`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await res.json();

  if (!res.ok) {
    const error: ApiError = new Error(result.message || "Something went wrong");
    error.status = res.status;
    throw error;
  }

  return result;
};