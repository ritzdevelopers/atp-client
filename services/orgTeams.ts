import type { ApiError } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export type OrgTeamMemberRow = {
  team_member_id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  user_image?: string | null;
  user_phone: string | null;
  joined_date: string;
  leave_date: string | null;
  added_by_id: number | null;
  added_by_name: string | null;
  removed_by_id: number | null;
  removed_by_name: string | null;
  exit_process_action_type?: string | null;
  exit_process_application_status?: string | null;
};

export type OrgTeamRow = {
  team_id: number;
  team_name: string;
  team_info: string | null;
  total_number_of_members: number;
  admin_id: number;
  admin_name: string | null;
  members: OrgTeamMemberRow[];
};

export type OrgUserNotInTeamRow = {
  user_id: number;
  user_name: string;
  user_email: string;
  user_phone: string | null;
};

export type AllOrgTeamsResponse = {
  teams: OrgTeamRow[];
  users_not_in_teams: OrgUserNotInTeamRow[];
};

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function fetchAllOrgTeams(
  token: string,
): Promise<AllOrgTeamsResponse> {
  const res = await fetch(`${API_URL}/api/org-teams/get-all-teams`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const json = await parseJson(res);
  if (!res.ok) {
    const err = new Error(
      (json.message as string) || "Failed to load teams",
    ) as ApiError;
    err.status = res.status;
    throw err;
  }
  const data = json.data as
    | {
        teams?: OrgTeamRow[];
        users_not_in_teams?: OrgUserNotInTeamRow[];
      }
    | undefined;
  if (!data || typeof data !== "object") {
    return { teams: [], users_not_in_teams: [] };
  }
  return {
    teams: Array.isArray(data.teams) ? data.teams : [],
    users_not_in_teams: Array.isArray(data.users_not_in_teams)
      ? data.users_not_in_teams
      : [],
  };
}

export type CreateOrgTeamPayload = {
  admin_id: number | string;
  team_name: string;
  team_info?: string | null;
  team_members?: (number | string)[];
};

export type CreateOrgTeamData = {
  team_id: number;
  org_id: number;
  admin_id: number;
  created_by: number;
  team_name: string;
  team_info: string | null;
  total_members: number;
  members: number[];
};

export async function createOrgTeam(
  token: string,
  payload: CreateOrgTeamPayload,
): Promise<{ message?: string; data?: CreateOrgTeamData }> {
  const res = await fetch(`${API_URL}/api/org-teams/create-team`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      admin_id: payload.admin_id,
      team_name: payload.team_name,
      team_info: payload.team_info ?? null,
      team_members: payload.team_members ?? [],
    }),
  });
  const json = await parseJson(res);
  if (!res.ok) {
    const err = new Error(
      (json.message as string) || "Failed to create team",
    ) as ApiError;
    err.status = res.status;
    throw err;
  }
  return {
    message: json.message as string | undefined,
    data: json.data as CreateOrgTeamData | undefined,
  };
}

export async function addMemberToOrgTeam(
  token: string,
  teamId: number | string,
  memberUserId: number | string,
): Promise<{ message?: string }> {
  const res = await fetch(`${API_URL}/api/org-teams/add-member-to-team`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      team_id: teamId,
      member_user_id: memberUserId,
    }),
  });
  const json = await parseJson(res);
  if (!res.ok) {
    const err = new Error(
      (json.message as string) || "Failed to add member",
    ) as ApiError;
    err.status = res.status;
    throw err;
  }
  return { message: json.message as string | undefined };
}

export async function removeMemberFromOrgTeam(
  token: string,
  teamId: number | string,
  memberUserId: number | string,
): Promise<{ message?: string }> {
  const res = await fetch(`${API_URL}/api/org-teams/remove-member-from-team`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      team_id: teamId,
      member_user_id: memberUserId,
    }),
  });
  const json = await parseJson(res);
  if (!res.ok) {
    const err = new Error(
      (json.message as string) || "Failed to remove member",
    ) as ApiError;
    err.status = res.status;
    throw err;
  }
  return { message: json.message as string | undefined };
}

export type UpdateOrgTeamPayload = {
  team_id: number | string;
  new_admin_id?: number | string;
  team_name?: string;
  team_info?: string;
};

/** Full team record from `GET /api/org-teams/get-team/:team_id`. */
export type OrgTeamDetail = {
  team_id: number;
  team_name: string;
  team_info: string | null;
  total_number_of_members: number;
  admin_id: number;
  admin_name: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: number | null;
  created_by_name?: string | null;
  admin_joined_date?: string | null;
  admin_added_by_id?: number | null;
  admin_added_by_name?: string | null;
  members: OrgTeamMemberRow[];
  /** Present on `get-my-team` response. */
  is_admin?: boolean;
};

export type TeamActivityNotification = {
  id: number;
  action_type: string;
  action_reason: string;
  created_at: string;
  performed_by_name: string | null;
  affected_user_name: string | null;
};

/** Leave row attached to team (`leave_quiry.team_id`). */
export type TeamLeaveQueryRow = {
  id: number;
  user_id: number | null;
  user_name: string;
  user_email: string;
  user_phone: string | null;
  org_id: number;
  leave_type: string;
  start_date: string;
  end_date: string | null;
  reason: string | null;
  status: string;
  team_id: number | null;
  created_at: string;
  updated_at: string | null;
};

/** In-progress employee exit processes tied to this team (from activity feed API). */
export type TeamExitProcessFeedRow = {
  id: number;
  employee_id: number;
  action_type: string | null;
  exit_date: string | null;
  last_working_day: string | null;
  employee_name: string | null;
  employee_email: string | null;
  action_performed_by_name: string | null;
};

export type TeamActivityFeedData = {
  notifications: TeamActivityNotification[];
  leave_queries: TeamLeaveQueryRow[];
  exit_processes_reports: TeamExitProcessFeedRow[];
};

export type TeamMemberExitReportHandoverRow = {
  handover_query_id: number;
  asset_id: number | null;
  custom_task_name: string | null;
  handover_status: string | null;
  remarks: string | null;
  handover_date: string | null;
  created_at: string | null;
};

/** Manager-facing exit rollup from `GET /api/org-teams/exit-process-report/:employee_id`. */
export type TeamMemberExitReportProcess = {
  exit_process_id: number;
  employee_id: number;
  employee_name: string | null;
  employee_email: string | null;
  employee_phone: string | null;
  org_id: number;
  team_id: number | null;
  team_name: string | null;
  team_admin_id: number | null;
  application_status: string | null;
  response_message: string | null;
  resolved_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  action_type: string | null;
  action_reason: string | null;
  exit_date: string | null;
  last_working_day: string | null;
  team_joining_date: string | null;
};

export type TeamMemberExitProcessReportData = {
  exit_process: TeamMemberExitReportProcess;
  handover_queries: TeamMemberExitReportHandoverRow[];
};

/** Current user's team (`GET /api/org-teams/get-my-team`). Pass `orgId` when the user belongs to multiple orgs. */
export async function fetchMyOrgTeam(
  token: string,
  orgId?: number | string,
): Promise<OrgTeamDetail> {
  const q =
    orgId != null && String(orgId).trim() !== ""
      ? `?org_id=${encodeURIComponent(String(orgId))}`
      : "";
  const res = await fetch(`${API_URL}/api/org-teams/get-my-team${q}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const json = await parseJson(res);
  if (!res.ok) {
    const err = new Error(
      (json.message as string) || "Failed to load your team",
    ) as ApiError;
    err.status = res.status;
    throw err;
  }
  const data = json.data as OrgTeamDetail | undefined;
  if (!data || typeof data !== "object") {
    const err = new Error("Invalid team response") as ApiError;
    err.status = 500;
    throw err;
  }
  return {
    ...data,
    members: Array.isArray(data.members) ? data.members : [],
  };
}

export async function fetchTeamActivityFeed(
  token: string,
  teamId: number | string,
  orgId?: number | string,
): Promise<TeamActivityFeedData> {
  const q =
    orgId != null && String(orgId).trim() !== ""
      ? `?org_id=${encodeURIComponent(String(orgId))}`
      : "";
  const res = await fetch(
    `${API_URL}/api/org-teams/team-activity/${encodeURIComponent(String(teamId))}${q}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );
  const json = await parseJson(res);
  if (!res.ok) {
    const err = new Error(
      (json.message as string) || "Failed to load activity",
    ) as ApiError;
    err.status = res.status;
    throw err;
  }
  const data = json.data as TeamActivityFeedData | undefined;
  if (!data || typeof data !== "object") {
    return {
      notifications: [],
      leave_queries: [],
      exit_processes_reports: [],
    };
  }
  return {
    notifications: Array.isArray(data.notifications) ? data.notifications : [],
    leave_queries: Array.isArray(data.leave_queries) ? data.leave_queries : [],
    exit_processes_reports: Array.isArray(data.exit_processes_reports)
      ? data.exit_processes_reports
      : [],
  };
}

/** `GET /api/org-teams/exit-process-report/:employee_id` — full exit rollup for team member view. */
export async function fetchTeamMemberExitProcessReport(
  token: string,
  orgId: number | string,
  employeeId: number | string,
): Promise<TeamMemberExitProcessReportData> {
  const q = `?org_id=${encodeURIComponent(String(orgId))}`;
  const url = `${API_URL}/api/org-teams/exit-process-report/${encodeURIComponent(String(employeeId))}${q}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const json = await parseJson(res);
  if (!res.ok) {
    const err = new Error(
      (json.message as string) || "Could not load exit process report",
    ) as ApiError;
    err.status = res.status;
    throw err;
  }
  const data = json.data as TeamMemberExitProcessReportData | undefined;
  if (!data?.exit_process || typeof data.exit_process !== "object") {
    const err = new Error("Invalid exit report response") as ApiError;
    err.status = 500;
    throw err;
  }
  return {
    exit_process: data.exit_process,
    handover_queries: Array.isArray(data.handover_queries)
      ? data.handover_queries
      : [],
  };
}

export async function fetchOrgTeamById(
  token: string,
  teamId: number | string,
): Promise<OrgTeamDetail> {
  const res = await fetch(
    `${API_URL}/api/org-teams/get-team/${encodeURIComponent(String(teamId))}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );
  const json = await parseJson(res);
  if (!res.ok) {
    const err = new Error(
      (json.message as string) || "Failed to load team",
    ) as ApiError;
    err.status = res.status;
    throw err;
  }
  const data = json.data as OrgTeamDetail | undefined;
  if (!data || typeof data !== "object") {
    const err = new Error("Invalid team response") as ApiError;
    err.status = 500;
    throw err;
  }
  return {
    ...data,
    members: Array.isArray(data.members) ? data.members : [],
  };
}

export async function updateOrgTeam(
  token: string,
  payload: UpdateOrgTeamPayload,
): Promise<{ message?: string }> {
  const body: Record<string, unknown> = { team_id: payload.team_id };
  if (payload.new_admin_id !== undefined) {
    body.new_admin_id = payload.new_admin_id;
  }
  if (payload.team_name !== undefined) {
    body.team_name = payload.team_name;
  }
  if (payload.team_info !== undefined) {
    body.team_info = payload.team_info;
  }
  const res = await fetch(`${API_URL}/api/org-teams/update-team`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const json = await parseJson(res);
  if (!res.ok) {
    const err = new Error(
      (json.message as string) || "Failed to update team",
    ) as ApiError;
    err.status = res.status;
    throw err;
  }
  return { message: json.message as string | undefined };
}
