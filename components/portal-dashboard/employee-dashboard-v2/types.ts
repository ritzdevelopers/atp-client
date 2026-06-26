import type { LeaveSummary } from "@/lib/leaveBalanceDisplay";
import type { CompanyHolidayRow } from "@/services/organizationSettings";

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
  added_by_name?: string | null;
};

export type AttendanceHistoryRow = {
  id?: number | string;
  attendance_date?: string;
  check_in?: string | null;
  check_out?: string | null;
  attendance_status?: string | null;
  working_time?: string | number | null;
};

export type UserAddressRow = {
  id?: number | string;
  user_id?: number | string;
  org_id?: number | string;
  country?: string | null;
  state?: string | null;
  district?: string | null;
  city?: string | null;
  is_from_village?: boolean | number | string | null;
  village_name?: string | null;
  street?: string | null;
  house_number?: string | null;
  zip_code?: string | null;
};

export type EmployeeDashboardResponse = {
  message?: string;
  owner?: {
    user_name?: string;
    user_email?: string;
  };
  organization?: {
    id?: number | string;
    org_name?: string;
    org_email?: string;
    org_phone?: string;
    created_at?: string;
    [key: string]: unknown;
  };
  employee?: {
    id?: number | string;
    user_name?: string;
    user_email?: string;
    user_phone?: string;
    user_address?: string;
    user_emergency_contact?: string;
    user_image?: string;
    user_shift_name?: string;
    user_shift_start_time?: string;
    user_shift_end_time?: string;
    mark_attendance_late_after?: string;
    is_night_shift?: boolean | number;
    total_leaves?: number | string | null;
    used_leaves?: number | string | null;
    remaining_leaves?: number | string | null;
    user_role_name?: string;
    created_at?: string;
    [key: string]: unknown;
  };
  employees?: EmployeeDashboardResponse["employee"];
  leave_summary?: LeaveSummary;
  employee_leave_balances?: import("@/lib/leaveBalanceDisplay").EmployeeLeaveBalanceRow[];
  attendance_history?: AttendanceHistoryRow[];
  teams?: EmployeeTeamAssignment[];
};

export type EmployeeTaskRow = {
  task_id: number;
  employee_id: number;
  task_title: string;
  task_description?: string | null;
  task_priority: "high" | "medium" | "low";
  task_status: "pending" | "received" | "in-progress" | "delay" | "completed";
  complete_status: "pending" | "approved" | "rejected";
  task_start_date: string;
  task_deadline: string;
  assigned_by_name?: string;
  reporting_manager_name?: string;
  created_at?: string;
};

export type DashboardV2State = {
  data: EmployeeDashboardResponse | null;
  addresses: UserAddressRow[];
  addressesError: string | null;
  handoverPendingCount: number;
  holidays: CompanyHolidayRow[];
  tasks: EmployeeTaskRow[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
};

export type AttendanceStats = {
  presentDays: number;
  absentDays: number;
  weekOffDays: number;
  totalWorkingHours: number;
  monthProgress: number;
};
