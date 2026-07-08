const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

/** Poll interval for live biometric REST endpoints (live-punches, my-live-attendance). */
export const BIOMETRIC_LIVE_POLL_MS = 60_000;

export type BiometricLiveEvent = {
  org_id: number;
  event_type: "check_in" | "check_out" | "duplicate_check_in" | "duplicate_check_out";
  attendance_id?: number | null;
  user_id?: number | null;
  user_name?: string | null;
  user_email?: string | null;
  biometric_employee_code?: string | null;
  employee_name?: string | null;
  device_id?: string | null;
  attendance_date?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  attendance_status?: string | null;
  punch_at?: string | null;
  source?: "biometric" | "webhook";
  emitted_at?: string;
};

export type BiometricMapping = {
  id: number;
  biometric_employee_code: string;
  user_id: number;
  employee_name?: string | null;
  user_name?: string;
  user_email?: string;
};

function authHeaders(token: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchBiometricStatus(orgId: string, token: string) {
  const res = await fetch(
    `${API_URL}/api/biometric/status?org_id=${encodeURIComponent(orgId)}`,
    { headers: authHeaders(token) },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Could not load biometric status");
  return data;
}

export async function fetchBiometricMappings(orgId: string, token: string) {
  const res = await fetch(
    `${API_URL}/api/biometric/mappings?org_id=${encodeURIComponent(orgId)}`,
    { headers: authHeaders(token) },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Could not load biometric mappings");
  return data.data as BiometricMapping[];
}

export async function saveBiometricMapping(
  orgId: string,
  token: string,
  payload: {
    biometric_employee_code: string;
    user_id: number | string;
    employee_name?: string;
  },
) {
  const res = await fetch(`${API_URL}/api/biometric/mappings`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ org_id: orgId, ...payload }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Could not save mapping");
  return data;
}

export async function triggerBiometricSync(orgId: string, token: string) {
  const res = await fetch(`${API_URL}/api/biometric/sync-now`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ org_id: orgId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Sync failed");
  return data;
}

export type DevicePunch = {
  device_log_id: number;
  employee_code: string;
  employee_name?: string | null;
  punch_at: string | null;
  punch_date?: string | null;
  direction: "in" | "out" | "unknown";
  device_id?: string | null;
  user_id?: number | null;
  portal_user_name?: string | null;
  event_type?: string;
  source?: string;
};

export type DeviceLiveAttendance = {
  employee_code: string;
  employee_name?: string | null;
  attendance_date: string | null;
  check_in: string | null;
  check_out: string | null;
  latest_punch_at?: string | null;
  latest_punch_direction?: "in" | "out" | "unknown" | null;
  punch_count?: number;
  punches: DevicePunch[];
  latest_device_log_id?: number | null;
};

/** Today's check-in/out for the logged-in user — read directly from biometric SQL Server. */
export async function fetchMyLiveAttendance(orgId: string, token: string) {
  const res = await fetch(
    `${API_URL}/api/biometric/my-live-attendance?org_id=${encodeURIComponent(orgId)}`,
    { headers: authHeaders(token) },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Could not load live attendance");
  return data as {
    success: boolean;
    mapped: boolean;
    message?: string;
    data: DeviceLiveAttendance | null;
    fetched_at?: string;
  };
}

/** Org-wide live punch stream from the biometric device database. */
export async function fetchLivePunches(
  orgId: string,
  token: string,
  sinceId = 0,
  limit = 50,
) {
  const params = new URLSearchParams({
    org_id: orgId,
    since_id: String(sinceId),
    limit: String(limit),
  });
  const res = await fetch(`${API_URL}/api/biometric/live-punches?${params}`, {
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Could not load live punches");
  return data as {
    success: boolean;
    latest_device_log_id: number;
    data: DevicePunch[];
  };
}
