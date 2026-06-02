"use client";

import {
  isUnpaidLeaveTypeId,
  type AssignedLeaveBalanceRow,
} from "@/services/employeeLeaves";
import { formatAssignedLeaveOptionLabel } from "@/hooks/useAssignedLeaveTypes";

type Props = {
  options: AssignedLeaveBalanceRow[];
  loading: boolean;
  error: string | null;
  selectedLeaveTypeId: string;
  onSelectLeaveTypeId: (id: string) => void;
  className?: string;
  labelClassName?: string;
};

export default function AssignedLeaveTypeSelect({
  options,
  loading,
  error,
  selectedLeaveTypeId,
  onSelectLeaveTypeId,
  className = "w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200",
  labelClassName = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500",
}: Props) {
  return (
    <div>
      <label className={labelClassName}>Leave type</label>
      {error ? (
        <p className="mb-2 text-xs text-red-600">{error}</p>
      ) : null}
      {loading ? (
        <p className="text-sm text-slate-500">Loading your leave types…</p>
      ) : options.length === 0 ? (
        <p className="text-sm text-slate-500">Loading leave types…</p>
      ) : (
        <select
          value={selectedLeaveTypeId}
          onChange={(e) => onSelectLeaveTypeId(e.target.value)}
          required
          disabled={loading || options.length === 0}
          className={className}
        >
          {options.map((row) => {
            const id = String(row.leave_type_id);
            const remaining = Number(row.remaining_leaves ?? 0);
            const unpaid = isUnpaidLeaveTypeId(id);
            return (
              <option key={id} value={id} disabled={!unpaid && remaining <= 0}>
                {formatAssignedLeaveOptionLabel(row)}
              </option>
            );
          })}
        </select>
      )}
    </div>
  );
}
