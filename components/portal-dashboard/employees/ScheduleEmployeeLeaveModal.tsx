"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Loader2,
  PlusCircle,
  Sparkles,
  X,
} from "lucide-react";
import {
  getLeaveTypesForEmployee,
  leaveOnboardEmployee,
  type AllocationFrequency,
  type LeaveAssignInfoPayload,
  type LeaveTypeRow,
} from "@/services/leaveManagement";
import {
  allocationDateFromMonthValue,
  defaultAllocationDate,
  formatAllocationDateLabel,
  isLastDayOfMonthYmd,
  minAllocationMonthValue,
  monthValueFromAllocationDate,
} from "@/lib/leaveScheduleDate";

export type ScheduleEmployeeLeaveTarget = {
  userId: string | number;
  userName: string;
};

const FREQUENCY_OPTIONS: {
  value: AllocationFrequency;
  label: string;
  hint: string;
}[] = [
  { value: "monthly", label: "Monthly", hint: "Credits every month" },
  { value: "quarterly", label: "Quarterly", hint: "Every 3 months" },
  { value: "half_yearly", label: "Half-yearly", hint: "Every 6 months" },
  { value: "yearly", label: "Yearly", hint: "Once per year" },
];

type LeaveScheduleDraftRow = {
  key: string;
  leave_type_id: string;
  allocation_frequency: AllocationFrequency;
  leaves_per_cycle: string;
  carry_forward: boolean;
  max_carry_forward: string;
  next_allocation_date: string;
};

function createEmptyLeaveDraft(): LeaveScheduleDraftRow {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    leave_type_id: "",
    allocation_frequency: "monthly",
    leaves_per_cycle: "1",
    carry_forward: false,
    max_carry_forward: "0",
    next_allocation_date: defaultAllocationDate(),
  };
}

function labelCls() {
  return "mb-1 block text-[12px] font-medium text-[#374151]";
}

function inputCls() {
  return "w-full rounded-lg border border-[#E4E7EC] bg-white px-3 py-2 text-[14px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15";
}

function rowToPayload(row: LeaveScheduleDraftRow): LeaveAssignInfoPayload {
  const payload: LeaveAssignInfoPayload = {
    leave_type_id: Number(row.leave_type_id),
    allocation_frequency: row.allocation_frequency,
    leaves_per_cycle: Number(row.leaves_per_cycle),
    carry_forward: row.carry_forward,
    next_allocation_date: row.next_allocation_date,
  };
  if (row.carry_forward) {
    payload.max_carry_forward = Number(row.max_carry_forward);
  }
  return payload;
}

function validateRow(row: LeaveScheduleDraftRow, index: number): string | null {
  const label = `Leave assignment ${index + 1}`;
  if (!row.leave_type_id) {
    return `${label}: select a leave type.`;
  }
  const leaves = Number(row.leaves_per_cycle);
  if (!Number.isFinite(leaves) || leaves < 1 || !Number.isInteger(leaves)) {
    return `${label}: enter a valid whole number of leaves per cycle (1 or more).`;
  }
  if (!row.next_allocation_date) {
    return `${label}: pick the first allocation month.`;
  }
  if (!isLastDayOfMonthYmd(row.next_allocation_date)) {
    return `${label}: first allocation must be the last day of the selected month.`;
  }
  if (row.carry_forward) {
    const maxCf = Number(row.max_carry_forward);
    if (!Number.isFinite(maxCf) || maxCf < 0 || !Number.isInteger(maxCf)) {
      return `${label}: enter a valid max carry-forward limit (0 or more).`;
    }
  }
  return null;
}

type ScheduleEmployeeLeaveModalProps = {
  open: boolean;
  orgId: number | string;
  orgIdParam?: string | string[];
  employee: ScheduleEmployeeLeaveTarget | null;
  onClose: () => void;
  onSuccess?: (message: string) => void;
};

export default function ScheduleEmployeeLeaveModal({
  open,
  orgId,
  orgIdParam,
  employee,
  onClose,
  onSuccess,
}: ScheduleEmployeeLeaveModalProps) {
  const [rows, setRows] = useState<LeaveScheduleDraftRow[]>([createEmptyLeaveDraft()]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeRow[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [typesError, setTypesError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const manageLeaveTypesUrl = `/dashboard/${orgIdParam ?? orgId}/organization-leave/manage-leave-types`;

  useEffect(() => {
    if (!open || !employee) return;

    setRows([createEmptyLeaveDraft()]);
    setError(null);
    setSuccess(null);
    setTypesError(null);
    setLeaveTypes([]);

    const orgNum = Number(orgId);
    if (!Number.isFinite(orgNum)) {
      setTypesError("Invalid organization.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setTypesError("Not signed in.");
      return;
    }

    let cancelled = false;
    setLoadingTypes(true);

    getLeaveTypesForEmployee(token, orgNum)
      .then((types) => {
        if (!cancelled) setLeaveTypes(types);
      })
      .catch((err) => {
        if (!cancelled) {
          setTypesError(
            err instanceof Error ? err.message : "Could not load leave types.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingTypes(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, employee, orgId]);

  const usedTypeIds = useMemo(
    () => new Set(rows.map((r) => r.leave_type_id).filter(Boolean)),
    [rows],
  );

  function updateRow(key: string, patch: Partial<LeaveScheduleDraftRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function handleClose() {
    if (submitting) return;
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!employee) return;

    setError(null);
    setSuccess(null);

    const orgNum = Number(orgId);
    if (!Number.isFinite(orgNum)) {
      setError("Invalid organization.");
      return;
    }
    if (leaveTypes.length === 0) {
      setError("No leave types available.");
      return;
    }

    for (let i = 0; i < rows.length; i += 1) {
      const msg = validateRow(rows[i], i);
      if (msg) {
        setError(msg);
        return;
      }
    }

    const typeIds = rows.map((r) => r.leave_type_id);
    if (new Set(typeIds).size !== typeIds.length) {
      setError("Each leave type can only be assigned once.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Not signed in.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await leaveOnboardEmployee(token, {
        org_id: orgNum,
        employee_id: employee.userId,
        leave_assign_info: rows.map(rowToPayload),
      });
      const message =
        result.message || "Leave schedule created successfully.";
      setSuccess(message);
      onSuccess?.(message);
      window.setTimeout(() => onClose(), 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save leave schedule.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open || !employee) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-leave-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close"
        onClick={handleClose}
      />
      <div className="relative z-10 max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-[#E4E7EC] bg-white p-4 shadow-xl sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div className="flex gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
              <CalendarDays className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h2 id="schedule-leave-title" className="text-[16px] font-semibold text-[#1F2937]">
                Schedule leave
              </h2>
              <p className="mt-0.5 text-[13px] text-[#6B7280]">
                Set recurring leave credits for{" "}
                <span className="font-semibold text-[#1F2937]">{employee.userName}</span>.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={handleClose}
            className="rounded-lg p-1.5 text-[#6B7280] hover:bg-[#F3F4F6] disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-[#D6EAF8] bg-gradient-to-br from-[#F0F9FF] via-white to-[#F9FAFB] p-3.5">
          <div className="flex items-start gap-2.5">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#008CD3]" aria-hidden />
            <p className="text-[12px] leading-relaxed text-[#6B7280]">
              Choose leave types, allocation frequency, leaves per cycle, carry-forward rules, and
              the first credit date. You can assign different schedules per leave type.
            </p>
          </div>
        </div>

        {error ? (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2 text-[13px] text-[#1F2937]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#D93025]" aria-hidden />
            <span>{error}</span>
          </div>
        ) : null}
        {success ? (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-[#A8DAB5] bg-[#E6F4EA] px-3 py-2 text-[13px] text-[#1F2937]">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0F9D58]" aria-hidden />
            <span>{success}</span>
          </div>
        ) : null}

        {loadingTypes ? (
          <div className="mb-4 flex items-center gap-2 text-[13px] text-[#6B7280]">
            <Loader2 className="h-4 w-4 animate-spin text-[#008CD3]" aria-hidden />
            Loading leave types…
          </div>
        ) : null}

        {typesError ? (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2 text-[13px] text-[#1F2937]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#D93025]" aria-hidden />
            <span>{typesError}</span>
          </div>
        ) : null}

        {!loadingTypes && !typesError && leaveTypes.length === 0 ? (
          <div className="mb-4 rounded-lg border border-dashed border-[#E4E7EC] bg-[#F9FAFB] px-4 py-6 text-center">
            <CalendarClock className="mx-auto mb-2 h-7 w-7 text-[#9CA3AF]" aria-hidden />
            <p className="text-[14px] font-medium text-[#374151]">No leave types yet</p>
            <p className="mt-1 text-[12px] text-[#6B7280]">
              Create leave types under Company Leave Management first.
            </p>
            <Link
              href={manageLeaveTypesUrl}
              className="mt-3 inline-block text-[13px] font-medium text-[#008CD3] underline-offset-2 hover:underline"
              onClick={handleClose}
            >
              Manage leave types
            </Link>
          </div>
        ) : null}

        {!loadingTypes && !typesError && leaveTypes.length > 0 ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {rows.map((row, index) => (
              <div
                key={row.key}
                className="overflow-hidden rounded-xl border border-[#E4E7EC] bg-white shadow-sm"
              >
                <div className="flex items-center justify-between gap-2 border-b border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#008CD3] text-[10px] font-bold text-white">
                      {index + 1}
                    </span>
                    <span className="text-[13px] font-semibold text-[#1F2937]">
                      Leave assignment{rows.length > 1 ? ` ${index + 1}` : ""}
                    </span>
                  </div>
                  {rows.length > 1 ? (
                    <button
                      type="button"
                      className="text-[12px] font-medium text-[#D93025] hover:underline"
                      onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                      disabled={submitting}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>

                <div className="space-y-3 p-3 sm:p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className={labelCls()}>
                        Leave type <span className="text-red-500">*</span>
                      </label>
                      <select
                        className={inputCls()}
                        value={row.leave_type_id}
                        onChange={(e) => updateRow(row.key, { leave_type_id: e.target.value })}
                        disabled={submitting}
                        required
                      >
                        <option value="">Select leave type</option>
                        {leaveTypes.map((lt) => {
                          const id = String(lt.id);
                          const takenElsewhere =
                            usedTypeIds.has(id) && row.leave_type_id !== id;
                          return (
                            <option key={id} value={id} disabled={takenElsewhere}>
                              {lt.leave_type_name}
                              {takenElsewhere ? " (already added)" : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <label className={labelCls()}>
                        Leaves per cycle <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        className={inputCls()}
                        value={row.leaves_per_cycle}
                        onChange={(e) =>
                          updateRow(row.key, { leaves_per_cycle: e.target.value })
                        }
                        disabled={submitting}
                        required
                      />
                    </div>

                    <div>
                      <label className={labelCls()}>
                        First allocation month <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="month"
                        className={inputCls()}
                        value={monthValueFromAllocationDate(row.next_allocation_date)}
                        min={minAllocationMonthValue()}
                        onChange={(e) => {
                          const nextDate = allocationDateFromMonthValue(e.target.value);
                          if (nextDate) {
                            updateRow(row.key, { next_allocation_date: nextDate });
                          }
                        }}
                        disabled={submitting}
                        required
                      />
                      <p className="mt-1 text-[11px] text-[#9CA3AF]">
                        Credits run on the last day of the month —{" "}
                        <span className="font-medium text-[#374151]">
                          {formatAllocationDateLabel(row.next_allocation_date)}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className={labelCls()}>
                      Allocation frequency <span className="text-red-500">*</span>
                    </label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {FREQUENCY_OPTIONS.map((opt) => {
                        const selected = row.allocation_frequency === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            disabled={submitting}
                            onClick={() =>
                              updateRow(row.key, { allocation_frequency: opt.value })
                            }
                            className={`rounded-lg border px-3 py-2 text-left transition ${
                              selected
                                ? "border-[#008CD3] bg-[#E8F4FB] ring-2 ring-[#008CD3]/15"
                                : "border-[#E4E7EC] bg-white hover:border-[#008CD3]/40 hover:bg-[#F9FAFB]"
                            }`}
                          >
                            <span
                              className={`block text-[12px] font-semibold ${
                                selected ? "text-[#008CD3]" : "text-[#1F2937]"
                              }`}
                            >
                              {opt.label}
                            </span>
                            <span className="mt-0.5 block text-[11px] text-[#6B7280]">
                              {opt.hint}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] p-3">
                    <label className="flex cursor-pointer items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={row.carry_forward}
                        onChange={(e) =>
                          updateRow(row.key, {
                            carry_forward: e.target.checked,
                            max_carry_forward: e.target.checked
                              ? row.max_carry_forward || "0"
                              : "0",
                          })
                        }
                        disabled={submitting}
                        className="mt-0.5 h-4 w-4 rounded border-[#E4E7EC] text-[#008CD3] focus:ring-[#008CD3]/30"
                      />
                      <span>
                        <span className="block text-[13px] font-medium text-[#1F2937]">
                          Allow carry forward
                        </span>
                        <span className="mt-0.5 block text-[11px] text-[#6B7280]">
                          Unused leaves roll to the next cycle up to the limit
                        </span>
                      </span>
                    </label>

                    {row.carry_forward ? (
                      <div className="mt-3 border-t border-[#E4E7EC] pt-3">
                        <label className={labelCls()}>
                          Max carry forward (days) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          className={inputCls()}
                          value={row.max_carry_forward}
                          onChange={(e) =>
                            updateRow(row.key, { max_carry_forward: e.target.value })
                          }
                          disabled={submitting}
                          required={row.carry_forward}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}

            {rows.length < leaveTypes.length ? (
              <button
                type="button"
                className="inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#008CD3]/50 bg-[#E8F4FB] px-4 py-2 text-[13px] font-medium text-[#008CD3] transition hover:bg-[#008CD3]/10 disabled:opacity-50"
                onClick={() => setRows((prev) => [...prev, createEmptyLeaveDraft()])}
                disabled={submitting}
              >
                <PlusCircle className="h-4 w-4" aria-hidden />
                Add another leave type
              </button>
            ) : null}

            <div className="flex flex-col-reverse gap-2 border-t border-[#E4E7EC] pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={submitting}
                onClick={handleClose}
                className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-[#E4E7EC] bg-white px-4 py-2 text-[14px] font-medium text-[#374151] transition hover:bg-[#F9FAFB] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-[#008CD3] px-4 py-2 text-[14px] font-medium text-white transition hover:bg-[#0070AA] disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <CalendarDays className="h-4 w-4" aria-hidden />
                )}
                Save leave schedule
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
