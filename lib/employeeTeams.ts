const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export type EmployeeTeamAssignment = {
  id?: number | string;
  user_id?: number | string;
  team_id: number | string;
  org_id?: number | string;
  joined_date?: string | null;
  leave_date?: string | null;
  team_name?: string | null;
  team_info?: string | null;
  total_number_of_members?: number | null;
  team_admin_name?: string | null;
};

export type EmployeeTeamsResponse = {
  teams?: EmployeeTeamAssignment[];
  employee?: { user_name?: string | null };
  message?: string;
};

export function displayTeamTitle(raw: string | null | undefined): string {
  if (!raw?.trim()) return "Team";
  return raw
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function activeTeamAssignments(
  teams: EmployeeTeamAssignment[] | undefined,
): EmployeeTeamAssignment[] {
  return (teams ?? []).filter(
    (team) => team.leave_date == null || team.leave_date === "",
  );
}

export function teamGroupHref(orgId: number | string, teamId: number | string): string {
  return `/dashboard/${orgId}/organization-employees/team-group?team_id=${encodeURIComponent(String(teamId))}`;
}

export function isTeamReportingManager(
  currentUserName: string | null | undefined,
  managerName: string | null | undefined,
): boolean {
  if (!currentUserName?.trim() || !managerName?.trim()) return false;
  return (
    currentUserName.trim().toLowerCase() === managerName.trim().toLowerCase()
  );
}

export async function fetchEmployeeTeamAssignments(
  orgId: number | string,
  token: string,
): Promise<EmployeeTeamsResponse> {
  const q = encodeURIComponent(String(orgId));
  const res = await fetch(
    `${API_URL}/api/employees/get-employees-full-information?org_id=${q}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  const result = (await res.json()) as EmployeeTeamsResponse;
  if (!res.ok) {
    throw new Error(result.message || "Could not load teams");
  }
  return result;
}
