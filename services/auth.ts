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

type GetMeResponse = {
  user?: {
    id?: string | number;
    user_id?: string | number;
    name?: string;
    email?: string;
  };
  organization_id?: string | number | null;
  message?: string;
};

export type ApiError = Error & { status?: number };

export const registerUser = async (data: RegisterPayload): Promise<RegisterResponse> => {
  const res = await fetch("http://localhost:3000/api/auth/register", {
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
  const res = await fetch("http://localhost:3000/api/auth/login", {
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

  return result;
};

export const getMe = async (token: string): Promise<GetMeResponse> => {
  console.log("Getting Me");
  
  const res = await fetch("http://localhost:3000/api/auth/admin/get-me", {
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
