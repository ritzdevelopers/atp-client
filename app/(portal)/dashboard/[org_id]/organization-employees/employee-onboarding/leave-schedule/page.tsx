"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Loader2,
  PlusCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import {
  getLeaveTypes,
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

function labelCls() {
  return "mb-1 block text-[12px] font-medium text-[#374151] lg:text-[13px]";
}

function inputCls() {
  return "w-full rounded-lg border border-[#E4E7EC] bg-white px-3 py-2 text-[14px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15";
}

function panelCls() {
  return "overflow-hidden rounded-lg border border-[#E4E7EC] bg-white p-3 shadow-sm sm:p-4 lg:p-6";
}

function btnPrimaryCls() {
  return "inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-lg bg-[#008CD3] px-4 py-2 text-[14px] font-medium text-white transition hover:bg-[#0070AA] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto";
}

function btnSecondaryCls() {
  return "inline-flex min-h-[40px] w-full items-center justify-center rounded-lg border border-[#E4E7EC] bg-white px-4 py-2 text-[14px] font-medium text-[#374151] transition hover:bg-[#F9FAFB] disabled:opacity-50 lg:w-auto";
}

function btnSkipCls() {
  return "inline-flex min-h-[40px] w-full items-center justify-center rounded-lg border border-dashed border-[#E4E7EC] bg-[#F9FAFB] px-4 py-2 text-[13px] font-medium text-[#374151] transition hover:border-[#008CD3]/40 hover:bg-white disabled:opacity-50 lg:w-auto";
}

function alertErrorCls() {
  return "mb-4 flex items-start gap-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2.5 text-[13px] text-[#1F2937]";
}

function alertSuccessCls() {
  return "mb-4 flex items-start gap-2 rounded-lg border border-[#A8DAB5] bg-[#E6F4EA] px-3 py-2.5 text-[13px] text-[#1F2937]";
}

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

export default function LeaveSchedulePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-[40vh] max-w-4xl flex-col items-center justify-center gap-3 px-3 py-6 text-[#6B7280] sm:px-4 lg:px-6">
          <Loader2 className="h-8 w-8 animate-spin text-[#008CD3]" aria-hidden />
          <p className="text-sm">Loading leave schedule…</p>
        </div>
      }
    >
      <LeaveSchedulePageContent />
    </Suspense>
  );
}

function LeaveSchedulePageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const ctx = useManagementDashboardContext();

  const orgIdParam = params?.org_id;
  const employeeId = searchParams.get("employee_id");
  const employeeName = searchParams.get("employee_name")?.trim() || "Employee";

  const organizationIdNum =
    ctx?.organization?.id != null ? Number(ctx.organization.id) : Number(orgIdParam);

  const [rows, setRows] = useState<LeaveScheduleDraftRow[]>([createEmptyLeaveDraft()]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeRow[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [typesError, setTypesError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onboardingReturnUrl = useMemo(() => {
    const base = `/dashboard/${orgIdParam}/organization-employees/employee-onboarding`;
    if (!employeeId) return base;
    const q = new URLSearchParams({
      employee_id: employeeId,
      employee_name: employeeName,
      step: "assets",
    });
    return `${base}?${q.toString()}`;
  }, [orgIdParam, employeeId, employeeName]);

  const leaveGatewayUrl = useMemo(() => {
    const base = `/dashboard/${orgIdParam}/organization-employees/employee-onboarding`;
    if (!employeeId) return base;
    const q = new URLSearchParams({
      employee_id: employeeId,
      employee_name: employeeName,
      step: "leave",
    });
    return `${base}?${q.toString()}`;
  }, [orgIdParam, employeeId, employeeName]);

  const manageLeaveTypesUrl = `/dashboard/${orgIdParam}/organization-leave/manage-leave-types`;

  useEffect(() => {
    let cancelled = false;

    async function loadLeaveTypes() {
      setLoadingTypes(true);
      setTypesError(null);
      const token = localStorage.getItem("token");
      if (!token || !organizationIdNum || Number.isNaN(organizationIdNum)) {
        setTypesError("Not signed in or invalid organization.");
        setLoadingTypes(false);
        return;
      }
      try {
        const types = await getLeaveTypes(token, organizationIdNum);
        if (!cancelled) setLeaveTypes(types);
      } catch (err) {
        if (!cancelled) {
          setTypesError(
            err instanceof Error ? err.message : "Could not load organization leave types.",
          );
        }
      } finally {
        if (!cancelled) setLoadingTypes(false);
      }
    }

    void loadLeaveTypes();
    return () => {
      cancelled = true;
    };
  }, [organizationIdNum]);

  function updateRow(key: string, patch: Partial<LeaveScheduleDraftRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function handleSkip() {
    router.push(onboardingReturnUrl);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!employeeId) {
      setError("Missing employee. Return to onboarding and create an employee first.");
      return;
    }
    if (!organizationIdNum || Number.isNaN(organizationIdNum)) {
      setError("Invalid organization.");
      return;
    }
    if (leaveTypes.length === 0) {
      setError("No leave types available. Create leave types under Company Leave Management first.");
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
    const uniqueTypeIds = new Set(typeIds);
    if (uniqueTypeIds.size !== typeIds.length) {
      setError("Each leave type can only be assigned once. Remove duplicate selections.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Not signed in.");
      return;
    }

    setSubmitting(true);
    try {
      const leave_assign_info = rows.map(rowToPayload);
      const result = await leaveOnboardEmployee(token, {
        org_id: organizationIdNum,
        employee_id: employeeId,
        leave_assign_info,
      });
      setSuccess(result.message || "Leave schedule saved. Continuing onboarding…");
      setTimeout(() => router.push(onboardingReturnUrl), 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save leave schedule.");
    } finally {
      setSubmitting(false);
    }
  }

  const usedTypeIds = useMemo(
    () => new Set(rows.map((r) => r.leave_type_id).filter(Boolean)),
    [rows],
  );

  if (!employeeId) {
    return (
      <div className="mx-auto max-w-4xl px-3 py-6 sm:px-4 lg:px-6">
        <div className={panelCls()}>
          <div className={alertErrorCls()} role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#D93025]" aria-hidden />
            <span>No employee selected. Start from employee onboarding.</span>
          </div>
          <Link
            href={`/dashboard/${orgIdParam}/organization-employees/employee-onboarding`}
            className={btnPrimaryCls()}
          >
            Back to onboarding
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-3 px-3 py-4 sm:px-4 lg:space-y-4 lg:px-6 lg:py-6">
      <div className={panelCls()}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3] lg:h-10 lg:w-10">
              <CalendarDays className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h1 className="text-[16px] font-semibold text-[#1F2937] lg:text-[18px]">
                Leave schedule
              </h1>
              <p className="mt-0.5 text-[12px] text-[#6B7280]">
                Set when and how{" "}
                <span className="font-medium text-[#374151]">{employeeName}</span> receives leave
                credits. Optional — skip if you&apos;ll configure this later.
              </p>
            </div>
          </div>
          <Link href={leaveGatewayUrl} className={`${btnSecondaryCls()} shrink-0`}>
            <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden />
            Back
          </Link>
        </div>

        <div className="mb-5 rounded-xl border border-[#D6EAF8] bg-gradient-to-br from-[#F0F9FF] via-white to-[#F9FAFB] p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#008CD3]/10 text-[#008CD3]">
              <Sparkles className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#1F2937]">
                Automated leave allocation
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-[#6B7280]">
                Define leave types, credit frequency, and the first allocation date. The system
                will schedule recurring credits — you can assign different rules per leave type for
                this employee.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className={alertErrorCls()} role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#D93025]" aria-hidden />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className={alertSuccessCls()} role="status">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0F9D58]" aria-hidden />
            <span>{success}</span>
          </div>
        )}

        {loadingTypes ? (
          <div className="flex items-center gap-2 rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] px-4 py-8 text-[13px] text-[#6B7280]">
            <Loader2 className="h-4 w-4 animate-spin text-[#008CD3]" aria-hidden />
            Loading organization leave types…
          </div>
        ) : typesError ? (
          <div className={alertErrorCls()} role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#D93025]" aria-hidden />
            <span>{typesError}</span>
          </div>
        ) : leaveTypes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#E4E7EC] bg-[#F9FAFB] px-4 py-8 text-center">
            <CalendarClock className="mx-auto mb-2 h-8 w-8 text-[#9CA3AF]" aria-hidden />
            <p className="text-[14px] font-medium text-[#374151]">No leave types yet</p>
            <p className="mt-1 text-[12px] text-[#6B7280]">
              Create leave types under Company Leave Management before scheduling credits.
            </p>
            <Link href={manageLeaveTypesUrl} className={`${btnPrimaryCls()} mt-4`}>
              Manage leave types
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {rows.map((row, index) => (
              <div
                key={row.key}
                className="overflow-hidden rounded-xl border border-[#E4E7EC] bg-white shadow-sm"
              >
                <div className="flex items-center justify-between gap-2 border-b border-[#E4E7EC] bg-[#F9FAFB] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#008CD3] text-[11px] font-bold text-white">
                      {index + 1}
                    </span>
                    <h2 className="text-[14px] font-semibold text-[#1F2937]">
                      Leave assignment
                      {rows.length > 1 ? ` ${index + 1}` : ""}
                    </h2>
                  </div>
                  {rows.length > 1 && (
                    <button
                      type="button"
                      className="text-[12px] font-medium text-[#D93025] hover:underline"
                      onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                      disabled={submitting}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="space-y-4 p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
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
                        placeholder="e.g. 1"
                        disabled={submitting}
                        required
                      />
                      <p className="mt-1 text-[11px] text-[#9CA3AF]">
                        Days credited each allocation cycle
                      </p>
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
                            className={`rounded-lg border px-3 py-2.5 text-left transition ${
                              selected
                                ? "border-[#008CD3] bg-[#E8F4FB] ring-2 ring-[#008CD3]/15"
                                : "border-[#E4E7EC] bg-white hover:border-[#008CD3]/40 hover:bg-[#F9FAFB]"
                            }`}
                          >
                            <span
                              className={`block text-[13px] font-semibold ${
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
                    <label className="flex cursor-pointer items-start gap-3">
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
                          Unused leaves roll to the next cycle up to the limit below
                        </span>
                      </span>
                    </label>

                    {row.carry_forward && (
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
                    )}
                  </div>
                </div>
              </div>
            ))}

            {rows.length < leaveTypes.length && (
              <button
                type="button"
                className="inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#008CD3]/50 bg-[#E8F4FB] px-4 py-2 text-[13px] font-medium text-[#008CD3] transition hover:bg-[#008CD3]/10 disabled:opacity-50"
                onClick={() => setRows((prev) => [...prev, createEmptyLeaveDraft()])}
                disabled={submitting}
              >
                <PlusCircle className="h-4 w-4" aria-hidden />
                Add another leave type
              </button>
            )}

            <div className="flex flex-col gap-2 border-t border-[#E4E7EC] pt-4 lg:flex-row lg:flex-wrap lg:items-center">
              <button
                type="button"
                className={btnSkipCls()}
                onClick={handleSkip}
                disabled={submitting}
              >
                Skip — configure leave later
              </button>
              <button type="submit" className={btnPrimaryCls()} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Saving schedule…
                  </>
                ) : (
                  <>
                    <CalendarDays className="h-4 w-4" aria-hidden />
                    Save &amp; continue onboarding
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {!loadingTypes && leaveTypes.length > 0 && (
          <div className="mt-4 flex items-center justify-end">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-[12px] font-medium text-[#6B7280] hover:text-[#008CD3]"
              onClick={() => {
                const token = localStorage.getItem("token");
                if (!token || !organizationIdNum) return;
                setLoadingTypes(true);
                setTypesError(null);
                getLeaveTypes(token, organizationIdNum)
                  .then(setLeaveTypes)
                  .catch((err) =>
                    setTypesError(
                      err instanceof Error ? err.message : "Could not refresh leave types.",
                    ),
                  )
                  .finally(() => setLoadingTypes(false));
              }}
              disabled={loadingTypes || submitting}
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Refresh leave types
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
