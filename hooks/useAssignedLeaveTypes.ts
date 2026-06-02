"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchMyAssignedLeaveBalances,
  UNPAID_LEAVE_OPTION,
  isUnpaidLeaveTypeId,
  type AssignedLeaveBalanceRow,
} from "@/services/employeeLeaves";

export function useAssignedLeaveTypes(
  orgId: number | undefined,
  enabled: boolean,
) {
  const [options, setOptions] = useState<AssignedLeaveBalanceRow[]>([]);
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgId || Number.isNaN(orgId)) {
      setOptions([]);
      setSelectedLeaveTypeId("");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Not signed in.");
      setOptions([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const rows = await fetchMyAssignedLeaveBalances(token, orgId);
      const withUnpaid = [...rows, UNPAID_LEAVE_OPTION];
      setOptions(withUnpaid);
      setSelectedLeaveTypeId((prev) => {
        if (
          prev &&
          (isUnpaidLeaveTypeId(prev) ||
            rows.some((r) => String(r.leave_type_id) === prev))
        ) {
          return prev;
        }
        const firstWithBalance = rows.find(
          (r) => Number(r.remaining_leaves ?? 0) > 0,
        );
        if (firstWithBalance?.leave_type_id != null) {
          return String(firstWithBalance.leave_type_id);
        }
        return UNPAID_LEAVE_OPTION.leave_type_id != null
          ? String(UNPAID_LEAVE_OPTION.leave_type_id)
          : "";
      });
    } catch (e) {
      setOptions([]);
      setSelectedLeaveTypeId("");
      setError(
        e instanceof Error ? e.message : "Could not load assigned leave types",
      );
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (enabled) {
      void load();
    }
  }, [enabled, load]);

  return {
    options,
    selectedLeaveTypeId,
    setSelectedLeaveTypeId,
    loading,
    error,
    reload: load,
  };
}

export function formatAssignedLeaveOptionLabel(
  row: AssignedLeaveBalanceRow,
): string {
  const name = row.leave_type_name?.trim() || `Leave #${row.leave_type_id}`;
  if (isUnpaidLeaveTypeId(row.leave_type_id)) {
    return name;
  }
  const remaining = Number(row.remaining_leaves ?? 0);
  return `${name} (${remaining} remaining)`;
}
