export type EmployeeLeaveBalanceRow = {
  id?: number | string;
  user_id?: number | string;
  org_id?: number | string;
  leave_type_id?: number | string;
  leave_type_name?: string;
  total_leaves?: number | string | null;
  used_leaves?: number | string | null;
  remaining_leaves?: number | string | null;
};

export type LeaveSummary = {
  total_leaves: number;
  used_leaves: number;
  remaining_leaves: number;
};

export type LeaveBalanceDisplayRow = {
  leave_type_id: number | string;
  leave_type_name: string;
  total_leaves: number;
  used_leaves: number;
  remaining_leaves: number;
};

export function summarizeLeaveBalances(
  balances: EmployeeLeaveBalanceRow[],
): LeaveSummary {
  return balances.reduce(
    (acc, row) => ({
      total_leaves: acc.total_leaves + Number(row.total_leaves || 0),
      used_leaves: acc.used_leaves + Number(row.used_leaves || 0),
      remaining_leaves: acc.remaining_leaves + Number(row.remaining_leaves || 0),
    }),
    { total_leaves: 0, used_leaves: 0, remaining_leaves: 0 },
  );
}

export function mapEmployeeLeaveBalanceRows(
  balances: EmployeeLeaveBalanceRow[],
): LeaveBalanceDisplayRow[] {
  return [...balances]
    .map((row) => ({
      leave_type_id: row.leave_type_id ?? "",
      leave_type_name:
        row.leave_type_name?.trim() || `Leave #${row.leave_type_id ?? "—"}`,
      total_leaves: Number(row.total_leaves || 0),
      used_leaves: Number(row.used_leaves || 0),
      remaining_leaves: Number(row.remaining_leaves || 0),
    }))
    .sort((a, b) => a.leave_type_name.localeCompare(b.leave_type_name));
}
