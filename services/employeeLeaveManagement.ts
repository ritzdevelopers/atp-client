const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const BASE = `${API_URL}/api/employee-leave-management`;

export type LeaveDuration = "short_leave" | "half_day" | "full_day";
export type LeaveStatus = "pending" | "approved" | "rejected";
export type SessionInfo = "session_1" | "session_2";
export type ApprovalRole = "reporting_manager" | "hr" | "admin";

export const UNPAID_LEAVE_TYPE_ID = 0;

export const UNPAID_LEAVE_OPTION = {
  leave_type_id: UNPAID_LEAVE_TYPE_ID,
  leave_type_name: "Unpaid Leave",
};

export function isUnpaidLeaveTypeId(
  leaveTypeId: string | number | null | undefined,
): boolean {
  return Number(leaveTypeId) === UNPAID_LEAVE_TYPE_ID;
}

export type LeaveReviewerOption = {
  reviewer_id: number;
  reviewer_name: string;
  reviewer_email: string;
  reviewer_emp_code: string | null;
  approval_role: ApprovalRole;
  approval_role_id: number;
  team_id: number | null;
  team_name: string | null;
};

export type LeaveReviewerInfo = {
  reviewer_id: number;
  leave_query_id: number;
  query_status: LeaveStatus;
  approval_role: ApprovalRole;
  approval_role_id: number;
  review_comment: string | null;
  reviewer_name: string;
  reviewer_code: string | null;
  reviewer_email: string;
  reviewer_role_name: string | null;
  reviewer_emp_code: string | null;
};

export type EmployeeLeaveRow = {
  id: number;
  user_id: number;
  org_id: number;
  team_id: number | null;
  team_name: string | null;
  team_leader_id: number | null;
  team_leader_name: string | null;
  leave_type_id: number;
  leave_type_name: string;
  leave_duration: LeaveDuration;
  start_date: string;
  end_date: string;
  leave_days: number;
  session_info: SessionInfo | null;
  timing: string | null;
  reason: string;
  leave_status: LeaveStatus;
  created_at: string;
  updated_at: string;
  employee_name: string | null;
  employee_code: string | null;
  employee_email: string | null;
  employee_role_name: string | null;
  emp_code: string | null;
  reviewers_info: LeaveReviewerInfo[];
};

export type LeaveQueryInput = {
  team_id?: number | null;
  leave_type_id: number;
  leave_duration: LeaveDuration;
  start_date: string;
  end_date: string;
  leave_days: number;
  session_info?: SessionInfo | null;
  timing?: string | null;
  reason: string;
};

export type LeaveReviewerInput = {
  reviewer_id: number;
  approval_role: ApprovalRole;
  approval_role_id: number;
};

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function authHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export function countInclusiveLeaveDays(
  startDate: string,
  endDate?: string | null,
): number {
  if (!startDate) return 0;
  const end = endDate?.trim() || startDate;
  const startMs = Date.parse(`${startDate}T00:00:00`);
  const endMs = Date.parse(`${end}T00:00:00`);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return 0;
  const diff = Math.floor((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;
  return diff > 0 ? diff : 0;
}

export function computeLeaveDays(
  duration: LeaveDuration,
  startDate: string,
  endDate: string,
): number {
  if (duration === "half_day") return 0.5;
  if (duration === "short_leave") return 0.5;
  return countInclusiveLeaveDays(startDate, endDate);
}

export function normalizeTiming(value: string): string {
  const trimmed = value.trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) return `${trimmed}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  return trimmed;
}

function isMissingLeaveType(leave_type_id: number | null | undefined): boolean {
  return leave_type_id === null || leave_type_id === undefined;
}

export function validateLeaveForm(input: {
  leave_type_id: number | null;
  leave_duration: LeaveDuration;
  start_date: string;
  end_date: string;
  reason: string;
  session_info?: SessionInfo | "";
  timing?: string;
  leave_days: number;
  selectedReviewerKeys: string[];
  remainingBalance?: number;
}): string | null {
  const {
    leave_type_id,
    leave_duration,
    start_date,
    end_date,
    reason,
    session_info,
    timing,
    leave_days,
    selectedReviewerKeys,
    remainingBalance,
  } = input;

  if (isMissingLeaveType(leave_type_id)) return "Select a leave type.";
  if (!start_date) return "Start date is required.";
  if (!end_date) return "End date is required.";
  if (end_date < start_date) return "End date must be on or after start date.";
  if (!reason.trim()) return "Reason is required.";
  if (selectedReviewerKeys.length === 0) {
    return "Select at least one reviewer.";
  }

  if (leave_duration === "short_leave") {
    if (!timing?.trim()) return "Timing is required for short leave.";
    if (start_date !== end_date) {
      return "Short leave must be for a single day.";
    }
    if (leave_days <= 0 || leave_days > 1) {
      return "Short leave days must be between 0 and 1.";
    }
  }

  if (leave_duration === "half_day") {
    if (!session_info) return "Select a session for half day leave.";
    if (start_date !== end_date) {
      return "Half day leave must be for a single day.";
    }
    if (leave_days !== 0.5) return "Half day leave must be 0.5 day.";
  }

  if (leave_duration === "full_day") {
    const expected = countInclusiveLeaveDays(start_date, end_date);
    if (leave_days !== expected) {
      return `Full day leave must be ${expected} day(s) for the selected range.`;
    }
  }

  if (
    !isUnpaidLeaveTypeId(leave_type_id) &&
    remainingBalance != null &&
    Number.isFinite(remainingBalance) &&
    leave_days > remainingBalance
  ) {
    return `Insufficient leave balance (${remainingBalance} remaining).`;
  }

  return null;
}

export function buildLeaveQueryPayload(
  input: Omit<LeaveQueryInput, "leave_days"> & {
    leave_days?: number;
  },
): LeaveQueryInput {
  const end_date = input.end_date || input.start_date;
  const leave_days =
    input.leave_days ??
    computeLeaveDays(input.leave_duration, input.start_date, end_date);

  const payload: LeaveQueryInput = {
    team_id: input.team_id ?? null,
    leave_type_id: Number(input.leave_type_id),
    leave_duration: input.leave_duration,
    start_date: input.start_date,
    end_date,
    leave_days,
    reason: input.reason.trim(),
  };

  if (input.leave_duration === "half_day") {
    payload.session_info = input.session_info ?? null;
    payload.timing = null;
  } else if (input.leave_duration === "short_leave") {
    payload.timing = input.timing ? normalizeTiming(input.timing) : null;
    payload.session_info = null;
  } else {
    payload.session_info = null;
    payload.timing = null;
  }

  return payload;
}

export function reviewerOptionKey(
  reviewer: Pick<LeaveReviewerOption, "reviewer_id" | "approval_role">,
): string {
  return `${reviewer.reviewer_id}-${reviewer.approval_role}`;
}

export function mapReviewersToPayload(
  options: LeaveReviewerOption[],
  selectedKeys: string[],
): LeaveReviewerInput[] {
  return options
    .filter((option) => selectedKeys.includes(reviewerOptionKey(option)))
    .map((option) => ({
      reviewer_id: option.reviewer_id,
      approval_role: option.approval_role,
      approval_role_id: option.approval_role_id,
    }));
}

export async function fetchLeaveReviewers(
  token: string,
  orgId: number | string,
  teamId?: number | string | null,
): Promise<LeaveReviewerOption[]> {
  const params = new URLSearchParams({ org_id: String(orgId) });
  if (teamId != null && String(teamId).trim() !== "") {
    params.set("team_id", String(teamId));
  }
  const res = await fetch(`${BASE}/get-leave-reviewers?${params.toString()}`, {
    method: "GET",
    headers: authHeaders(token),
  });
  const json = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      (json.message as string) || "Could not load leave reviewers",
    );
  }
  const result = json.result;
  return Array.isArray(result) ? (result as LeaveReviewerOption[]) : [];
}

export async function fetchMyEmployeeLeaves(
  token: string,
  orgId: number | string,
): Promise<EmployeeLeaveRow[]> {
  const q = encodeURIComponent(String(orgId));
  const res = await fetch(`${BASE}/get-all-leaves?org_id=${q}`, {
    method: "GET",
    headers: authHeaders(token),
  });
  const json = await parseJson(res);
  if (!res.ok) {
    throw new Error((json.message as string) || "Could not load leave requests");
  }
  const result = json.result;
  return Array.isArray(result) ? (result as EmployeeLeaveRow[]) : [];
}

export async function fetchEmployeeLeaveById(
  token: string,
  orgId: number | string,
  leaveId: number | string,
): Promise<EmployeeLeaveRow> {
  const orgQ = encodeURIComponent(String(orgId));
  const res = await fetch(
    `${BASE}/get-leave/${encodeURIComponent(String(leaveId))}?org_id=${orgQ}`,
    {
    method: "GET",
    headers: authHeaders(token),
  },
  );
  const json = await parseJson(res);
  if (!res.ok) {
    throw new Error((json.message as string) || "Could not load leave request");
  }
  return json.result as EmployeeLeaveRow;
}

export async function createEmployeeLeave(
  token: string,
  orgId: number | string,
  payload: {
    leave_query: LeaveQueryInput[];
    leave_reviewer: LeaveReviewerInput[];
  },
): Promise<{ message?: string; leave_ids?: number[] }> {
  const res = await fetch(`${BASE}/create-leave`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ org_id: Number(orgId), ...payload }),
  });
  const json = await parseJson(res);
  if (!res.ok) {
    throw new Error((json.message as string) || "Could not submit leave request");
  }
  return {
    message: json.message as string | undefined,
    leave_ids: json.leave_ids as number[] | undefined,
  };
}

export async function updateEmployeeLeave(
  token: string,
  orgId: number | string,
  leaveId: number | string,
  payload: Record<string, unknown>,
): Promise<{ message?: string; leave_id?: number }> {
  const res = await fetch(
    `${BASE}/update-leave/${encodeURIComponent(String(leaveId))}`,
    {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ org_id: Number(orgId), ...payload }),
    },
  );
  const json = await parseJson(res);
  if (!res.ok) {
    throw new Error((json.message as string) || "Could not update leave request");
  }
  return {
    message: json.message as string | undefined,
    leave_id: json.leave_id as number | undefined,
  };
}

export async function deleteEmployeeLeave(
  token: string,
  orgId: number | string,
  leaveId: number | string,
): Promise<{ message?: string }> {
  const orgQ = encodeURIComponent(String(orgId));
  const res = await fetch(
    `${BASE}/delete-leave/${encodeURIComponent(String(leaveId))}?org_id=${orgQ}`,
    {
      method: "DELETE",
      headers: authHeaders(token),
    },
  );
  const json = await parseJson(res);
  if (!res.ok) {
    throw new Error((json.message as string) || "Could not delete leave request");
  }
  return { message: json.message as string | undefined };
}

export function leaveDurationLabel(duration: LeaveDuration): string {
  switch (duration) {
    case "short_leave":
      return "Short leave";
    case "half_day":
      return "Half day";
    case "full_day":
      return "Full day";
    default:
      return duration;
  }
}

export function leaveStatusBadgeClass(status: LeaveStatus): string {
  switch (status) {
    case "approved":
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
    case "rejected":
      return "bg-rose-50 text-rose-700 ring-rose-600/20";
    default:
      return "bg-amber-50 text-amber-700 ring-amber-600/20";
  }
}

export type ReviewerLeaveRow = EmployeeLeaveRow & {
  my_reviewer_row_id: number;
  my_approval_role: ApprovalRole;
  my_query_status: LeaveStatus;
  my_designation: string | null;
  my_review_comment: string | null;
};

export async function fetchLeaveReviewersHrAdmin(
  token: string,
  orgId: number | string,
): Promise<LeaveReviewerOption[]> {
  const params = new URLSearchParams({
    org_id: String(orgId),
    scope: "hr_admin",
  });
  const res = await fetch(`${BASE}/get-leave-reviewers?${params.toString()}`, {
    method: "GET",
    headers: authHeaders(token),
  });
  const json = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      (json.message as string) || "Could not load HR and admin reviewers",
    );
  }
  const result = json.result;
  return Array.isArray(result) ? (result as LeaveReviewerOption[]) : [];
}

export async function fetchLeavesWhereIAmReviewer(
  token: string,
  orgId: number | string,
  filters?: {
    leave_duration?: LeaveDuration | "";
    leave_status?: LeaveStatus | "";
    my_query_status?: LeaveStatus | "";
    user_name?: string;
    created_at?: string;
    is_ascending?: "ASC" | "DESC";
  },
): Promise<ReviewerLeaveRow[]> {
  const params = new URLSearchParams({ org_id: String(orgId) });
  if (filters?.leave_duration) {
    params.set("leave_duration", filters.leave_duration);
  }
  if (filters?.leave_status) {
    params.set("leave_status", filters.leave_status);
  }
  if (filters?.my_query_status) {
    params.set("my_query_status", filters.my_query_status);
  }
  if (filters?.user_name?.trim()) {
    params.set("user_name", filters.user_name.trim());
  }
  if (filters?.created_at) {
    params.set("created_at", filters.created_at);
  }
  if (filters?.is_ascending) {
    params.set("is_ascending", filters.is_ascending);
  }

  const res = await fetch(
    `${BASE}/get-leaves-where-i-am-reviewer?${params.toString()}`,
    {
      method: "GET",
      headers: authHeaders(token),
    },
  );
  const json = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      (json.message as string) || "Could not load leave requests for review",
    );
  }
  const result = json.result;
  return Array.isArray(result) ? (result as ReviewerLeaveRow[]) : [];
}

export async function performLeaveReview(
  token: string,
  orgId: number | string,
  payload: {
    leave_id: number;
    action: Exclude<LeaveStatus, "pending">;
    review_comment?: string;
  },
): Promise<{ message?: string; result?: ReviewerLeaveRow }> {
  const res = await fetch(`${BASE}/perform-leave-review`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({
      org_id: Number(orgId),
      leave_id: payload.leave_id,
      action: payload.action,
      review_comment: payload.review_comment?.trim() || undefined,
    }),
  });
  const json = await parseJson(res);
  if (!res.ok) {
    throw new Error((json.message as string) || "Could not submit leave review");
  }
  return {
    message: json.message as string | undefined,
    result: json.result as ReviewerLeaveRow | undefined,
  };
}

export function canActOnReviewerLeave(row: ReviewerLeaveRow): boolean {
  if (row.my_query_status !== "pending") return false;
  if (row.my_approval_role === "reporting_manager") return true;
  if (row.my_approval_role === "hr" || row.my_approval_role === "admin") {
    const reportingManager = row.reviewers_info.find(
      (reviewer) => reviewer.approval_role === "reporting_manager",
    );
    if (!reportingManager) return true;
    return reportingManager.query_status === "approved";
  }
  return false;
}

export function approvalRoleLabel(role: ApprovalRole): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "hr":
      return "HR";
    case "reporting_manager":
      return "Reporting manager";
    default:
      return role;
  }
}
