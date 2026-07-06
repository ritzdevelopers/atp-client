"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  Loader2,
  Search,
  Sparkles,
  Square,
  Users,
  X,
} from "lucide-react";
import {
  assignRegularizationTokens,
  type AssignRegularizationTokenEntry,
} from "@/services/regularization";

export type RegularizationAssignEmployee = {
  userId: string;
  name: string;
  empCode: string;
  email: string;
  roleLabel: string;
};

type WizardStep = "select" | "balance";

function labelCls() {
  return "mb-1 block text-[12px] font-medium text-[#374151]";
}

function inputCls() {
  return "w-full rounded-lg border border-[#E4E7EC] bg-white px-3 py-2 text-[14px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15";
}

function primaryBtnCls() {
  return "inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-[#008CD3] px-4 py-2 text-[14px] font-medium text-white transition hover:bg-[#0070AA] disabled:pointer-events-none disabled:opacity-50";
}

function secondaryBtnCls() {
  return "inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-[#E4E7EC] bg-white px-4 py-2 text-[14px] font-medium text-[#374151] transition hover:bg-[#F9FAFB] disabled:pointer-events-none disabled:opacity-50";
}

function formatYmdLabel(ymd: string): string {
  const parsed = new Date(`${ymd}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return ymd;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function defaultValidityPeriod() {
  const today = new Date();
  const validFrom = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const validTo = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-${String(nextMonth.getDate()).padStart(2, "0")}`;
  return { validFrom, validTo };
}

type AssignRegularizationTokensModalProps = {
  open: boolean;
  orgId: number | string;
  employees: RegularizationAssignEmployee[];
  onClose: () => void;
  onSuccess?: (message: string) => void;
};

export default function AssignRegularizationTokensModal({
  open,
  orgId,
  employees,
  onClose,
  onSuccess,
}: AssignRegularizationTokensModalProps) {
  const [step, setStep] = useState<WizardStep>("select");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [balance, setBalance] = useState("3");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const validity = useMemo(() => defaultValidityPeriod(), [open, step]);

  useEffect(() => {
    if (!open) return;
    setStep("select");
    setSearch("");
    setSelectedIds(new Set());
    setBalance("3");
    setError(null);
    setSuccess(null);
    setSubmitting(false);
  }, [open]);

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (emp) =>
        emp.name.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        emp.empCode.toLowerCase().includes(q) ||
        emp.roleLabel.toLowerCase().includes(q),
    );
  }, [employees, search]);

  const filteredIds = useMemo(
    () => filteredEmployees.map((e) => e.userId),
    [filteredEmployees],
  );

  const allFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));

  const selectedEmployees = useMemo(
    () => employees.filter((e) => selectedIds.has(e.userId)),
    [employees, selectedIds],
  );

  function handleClose() {
    if (submitting) return;
    onClose();
  }

  function toggleEmployee(userId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function toggleSelectAllFiltered() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        for (const id of filteredIds) next.delete(id);
      } else {
        for (const id of filteredIds) next.add(id);
      }
      return next;
    });
  }

  function goToBalanceStep() {
    setError(null);
    if (selectedIds.size === 0) {
      setError("Select at least one employee to continue.");
      return;
    }
    setStep("balance");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const orgNum = Number(orgId);
    if (!Number.isFinite(orgNum)) {
      setError("Invalid organization.");
      return;
    }

    const balanceNum = Number(balance);
    if (!Number.isInteger(balanceNum) || balanceNum < 0) {
      setError("Enter a valid whole-number balance (0 or more).");
      return;
    }

    if (selectedEmployees.length === 0) {
      setError("Select at least one employee.");
      setStep("select");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Not signed in.");
      return;
    }

    const regData: AssignRegularizationTokenEntry[] = selectedEmployees.map((emp) => ({
      user_id: Number(emp.userId),
      balance: balanceNum,
      valid_from: validity.validFrom,
      valid_to: validity.validTo,
    }));

    setSubmitting(true);
    try {
      const result = await assignRegularizationTokens(token, orgNum, regData);
      const message =
        result.message ||
        `Regularization tokens assigned to ${result.assigned_count} employee(s).`;
      setSuccess(message);
      onSuccess?.(message);
      window.setTimeout(() => onClose(), 900);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not assign regularization tokens.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[999999] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-reg-tokens-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        aria-label="Close"
        onClick={handleClose}
      />
      <div className="relative z-10 flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-2xl border border-[#E4E7EC] bg-white shadow-2xl sm:max-h-[92vh] sm:max-w-2xl sm:rounded-xl">
        <div className="border-b border-[#E4E7EC] px-4 py-4 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E8F4FB] text-[#008CD3]">
                <CalendarClock className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h2
                  id="assign-reg-tokens-title"
                  className="text-[16px] font-semibold text-[#1F2937] sm:text-[17px]"
                >
                  Assign regularization tokens
                </h2>
                <p className="mt-0.5 text-[12px] text-[#6B7280] sm:text-[13px]">
                  Grant monthly regularization allowance to active employees in bulk.
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

          <div className="mt-4 flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                step === "select"
                  ? "bg-[#008CD3] text-white"
                  : "bg-[#E8F4FB] text-[#0070AA]"
              }`}
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px]">
                1
              </span>
              Select employees
            </div>
            <ChevronRight className="h-4 w-4 text-[#9CA3AF]" aria-hidden />
            <div
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                step === "balance"
                  ? "bg-[#008CD3] text-white"
                  : "bg-[#F3F4F6] text-[#6B7280]"
              }`}
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px]">
                2
              </span>
              Set balance
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {error ? (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2.5 text-[13px] text-[#1F2937]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#D93025]" aria-hidden />
              <span>{error}</span>
            </div>
          ) : null}
          {success ? (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-[#A8DAB5] bg-[#E6F4EA] px-3 py-2.5 text-[13px] text-[#1F2937]">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0F9D58]" aria-hidden />
              <span>{success}</span>
            </div>
          ) : null}

          {step === "select" ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-[#D6EAF8] bg-gradient-to-br from-[#F0F9FF] via-white to-[#F9FAFB] p-3.5">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#008CD3]" aria-hidden />
                  <p className="text-[12px] leading-relaxed text-[#6B7280]">
                    Choose active employees who should receive regularization tokens. Use search
                    to filter the list, or select all visible employees at once.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative min-w-0 flex-1">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]"
                    aria-hidden
                  />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name, email, code, role…"
                    className="w-full rounded-lg border border-[#E4E7EC] bg-white py-2 pl-9 pr-3 text-[14px] text-[#1F2937] outline-none placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15"
                    disabled={submitting}
                  />
                </div>
                <button
                  type="button"
                  onClick={toggleSelectAllFiltered}
                  disabled={submitting || filteredEmployees.length === 0}
                  className={secondaryBtnCls()}
                >
                  {allFilteredSelected ? (
                    <CheckSquare className="h-4 w-4 text-[#008CD3]" aria-hidden />
                  ) : (
                    <Square className="h-4 w-4 text-[#9CA3AF]" aria-hidden />
                  )}
                  {allFilteredSelected ? "Deselect all" : "Select all"}
                  {search.trim() ? " shown" : ""}
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 text-[12px] text-[#6B7280]">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" aria-hidden />
                  {filteredEmployees.length} active employee
                  {filteredEmployees.length === 1 ? "" : "s"}
                </span>
                <span className="font-semibold text-[#008CD3]">
                  {selectedIds.size} selected
                </span>
              </div>

              {employees.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#E4E7EC] bg-[#F9FAFB] px-4 py-10 text-center">
                  <Users className="mx-auto mb-2 h-8 w-8 text-[#9CA3AF]" aria-hidden />
                  <p className="text-[14px] font-medium text-[#374151]">No active employees</p>
                  <p className="mt-1 text-[12px] text-[#6B7280]">
                    There are no active employees available for token assignment.
                  </p>
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#E4E7EC] bg-[#F9FAFB] px-4 py-8 text-center">
                  <Search className="mx-auto mb-2 h-7 w-7 text-[#9CA3AF]" aria-hidden />
                  <p className="text-[14px] font-medium text-[#374151]">No matches</p>
                  <p className="mt-1 text-[12px] text-[#6B7280]">
                    Try a different search term.
                  </p>
                </div>
              ) : (
                <ul className="max-h-[min(42vh,360px)] space-y-2 overflow-y-auto pr-0.5">
                  {filteredEmployees.map((emp) => {
                    const checked = selectedIds.has(emp.userId);
                    return (
                      <li key={emp.userId}>
                        <button
                          type="button"
                          onClick={() => toggleEmployee(emp.userId)}
                          disabled={submitting}
                          className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                            checked
                              ? "border-[#008CD3]/40 bg-[#F0F9FF] ring-1 ring-[#008CD3]/15"
                              : "border-[#E4E7EC] bg-white hover:border-[#008CD3]/25 hover:bg-[#FAFCFE]"
                          }`}
                        >
                          <span className="mt-0.5 shrink-0">
                            {checked ? (
                              <CheckSquare className="h-5 w-5 text-[#008CD3]" aria-hidden />
                            ) : (
                              <Square className="h-5 w-5 text-[#D1D5DB]" aria-hidden />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span className="text-[14px] font-semibold text-[#1F2937]">
                                {emp.name}
                              </span>
                              <span className="rounded-md bg-[#F3F4F6] px-1.5 py-0.5 text-[10px] font-medium text-[#6B7280]">
                                {emp.empCode}
                              </span>
                            </span>
                            <span className="mt-0.5 block truncate text-[12px] text-[#6B7280]">
                              {emp.email}
                            </span>
                            <span className="mt-1 inline-flex rounded-full bg-[#E8F4FB] px-2 py-0.5 text-[10px] font-medium text-[#0070AA]">
                              {emp.roleLabel}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : (
            <form id="assign-reg-balance-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-xl border border-[#D6EAF8] bg-gradient-to-br from-[#F0F9FF] via-white to-[#F9FAFB] p-3.5">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#008CD3]" aria-hidden />
                  <p className="text-[12px] leading-relaxed text-[#6B7280]">
                    The same token balance will be assigned to all{" "}
                    <span className="font-semibold text-[#1F2937]">
                      {selectedEmployees.length}
                    </span>{" "}
                    selected employee{selectedEmployees.length === 1 ? "" : "s"}. Tokens are
                    valid for one month from today.
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="reg-balance-input" className={labelCls()}>
                  Regularization balance <span className="text-red-500">*</span>
                </label>
                <input
                  id="reg-balance-input"
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  className={inputCls()}
                  placeholder="e.g. 3"
                  disabled={submitting}
                  required
                />
                <p className="mt-1.5 text-[11px] text-[#6B7280]">
                  Number of regularization requests each employee can submit during the validity
                  period.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                    Valid from
                  </p>
                  <p className="mt-1 text-[14px] font-semibold text-[#1F2937]">
                    {formatYmdLabel(validity.validFrom)}
                  </p>
                </div>
                <div className="rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                    Valid to
                  </p>
                  <p className="mt-1 text-[14px] font-semibold text-[#1F2937]">
                    {formatYmdLabel(validity.validTo)}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-[#E4E7EC] bg-white">
                <div className="border-b border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2">
                  <p className="text-[12px] font-semibold text-[#374151]">
                    Selected employees ({selectedEmployees.length})
                  </p>
                </div>
                <ul className="max-h-[min(28vh,220px)] divide-y divide-[#F3F4F6] overflow-y-auto">
                  {selectedEmployees.map((emp) => (
                    <li
                      key={emp.userId}
                      className="flex items-center justify-between gap-2 px-3 py-2 text-[13px]"
                    >
                      <span className="min-w-0 truncate font-medium text-[#1F2937]">
                        {emp.name}
                      </span>
                      <span className="shrink-0 text-[11px] text-[#6B7280]">{emp.empCode}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </form>
          )}
        </div>

        <div className="border-t border-[#E4E7EC] bg-[#FAFBFC] px-4 py-3 sm:px-5">
          {step === "select" ? (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={handleClose} className={secondaryBtnCls()} disabled={submitting}>
                Cancel
              </button>
              <button
                type="button"
                onClick={goToBalanceStep}
                className={primaryBtnCls()}
                disabled={submitting || selectedIds.size === 0}
              >
                Next
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ) : (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep("select");
                }}
                className={secondaryBtnCls()}
                disabled={submitting}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Back
              </button>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <button type="button" onClick={handleClose} className={secondaryBtnCls()} disabled={submitting}>
                  Cancel
                </button>
                <button
                  type="submit"
                  form="assign-reg-balance-form"
                  className={primaryBtnCls()}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Assigning…
                    </>
                  ) : (
                    <>
                      Assign tokens
                      <CheckCircle2 className="h-4 w-4" aria-hidden />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
