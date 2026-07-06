"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Pencil,
  Search,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import {
  fetchEmployeeRegularizationBalance,
  updateRegularizationTokens,
} from "@/services/regularization";
import type { RegularizationAssignEmployee } from "@/components/portal-dashboard/employees/AssignRegularizationTokensModal";

type WizardStep = "select" | "edit";

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

function currentCalendarMonthBounds() {
  const now = new Date();
  const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const endYmd = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
  return { start, end: endYmd };
}

function nextCalendarMonthBounds(validFromYmd: string) {
  const parts = validFromYmd.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [year, month] = parts;
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);
  const start = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;
  const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
  return { start, end };
}

type UpdateRegularizationTokensModalProps = {
  open: boolean;
  orgId: number | string;
  employees: RegularizationAssignEmployee[];
  onClose: () => void;
  onSuccess?: (message: string) => void;
};

export default function UpdateRegularizationTokensModal({
  open,
  orgId,
  employees,
  onClose,
  onSuccess,
}: UpdateRegularizationTokensModalProps) {
  const [step, setStep] = useState<WizardStep>("select");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [balance, setBalance] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [usedTokens, setUsedTokens] = useState(0);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const currentMonth = useMemo(() => currentCalendarMonthBounds(), [open, step]);
  const nextMonth = useMemo(
    () => (validFrom ? nextCalendarMonthBounds(validFrom) : null),
    [validFrom],
  );

  useEffect(() => {
    if (!open) return;
    setStep("select");
    setSearch("");
    setSelectedId(null);
    setBalance("");
    setValidFrom("");
    setValidTo("");
    setUsedTokens(0);
    setLoadingRecord(false);
    setSubmitting(false);
    setError(null);
    setSuccess(null);
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

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.userId === selectedId) ?? null,
    [employees, selectedId],
  );

  function handleClose() {
    if (submitting || loadingRecord) return;
    onClose();
  }

  async function goToEditStep() {
    setError(null);
    if (!selectedId || !selectedEmployee) {
      setError("Select an employee to continue.");
      return;
    }

    const orgNum = Number(orgId);
    if (!Number.isFinite(orgNum)) {
      setError("Invalid organization.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Not signed in.");
      return;
    }

    setLoadingRecord(true);
    try {
      const record = await fetchEmployeeRegularizationBalance(
        token,
        orgNum,
        Number(selectedId),
      );
      setBalance(String(record.balance ?? 0));
      setUsedTokens(Number(record.used ?? 0));
      setValidFrom(record.valid_from ?? currentCalendarMonthBounds().start);
      setValidTo(record.valid_to ?? nextCalendarMonthBounds(record.valid_from ?? currentCalendarMonthBounds().start)?.end ?? "");
      setStep("edit");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load regularization record for this employee.",
      );
    } finally {
      setLoadingRecord(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedId || !selectedEmployee) {
      setError("Select an employee.");
      setStep("select");
      return;
    }

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

    if (balanceNum < usedTokens) {
      setError(`Balance cannot be less than already used tokens (${usedTokens}).`);
      return;
    }

    if (!validFrom || !validTo) {
      setError("Valid from and valid to are required.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Not signed in.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await updateRegularizationTokens(token, orgNum, {
        user_id: Number(selectedId),
        balance: balanceNum,
        valid_from: validFrom,
        valid_to: validTo,
      });
      const message =
        result.message || `Regularization tokens updated for ${selectedEmployee.name}.`;
      setSuccess(message);
      onSuccess?.(message);
      window.setTimeout(() => onClose(), 900);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update regularization tokens.",
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
      aria-labelledby="update-reg-tokens-title"
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
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FEF3E6] text-[#E8710A]">
                <Pencil className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h2
                  id="update-reg-tokens-title"
                  className="text-[16px] font-semibold text-[#1F2937] sm:text-[17px]"
                >
                  Update regularization tokens
                </h2>
                <p className="mt-0.5 text-[12px] text-[#6B7280] sm:text-[13px]">
                  Correct balance or validity for one employee&apos;s token record.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={submitting || loadingRecord}
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
              Select employee
            </div>
            <ChevronRight className="h-4 w-4 text-[#9CA3AF]" aria-hidden />
            <div
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                step === "edit"
                  ? "bg-[#008CD3] text-white"
                  : "bg-[#F3F4F6] text-[#6B7280]"
              }`}
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px]">
                2
              </span>
              Update details
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
              <div className="rounded-xl border border-[#FDE68A] bg-gradient-to-br from-[#FFFBEB] via-white to-[#F9FAFB] p-3.5">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#E8710A]" aria-hidden />
                  <p className="text-[12px] leading-relaxed text-[#6B7280]">
                    Pick one active employee who already has a regularization token record.
                    You can adjust balance, valid from (current month), and valid to (next month).
                  </p>
                </div>
              </div>

              <div className="relative">
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
                  disabled={loadingRecord}
                />
              </div>

              <p className="text-[12px] text-[#6B7280]">
                {filteredEmployees.length} active employee
                {filteredEmployees.length === 1 ? "" : "s"}
                {selectedEmployee ? (
                  <>
                    {" "}
                    ·{" "}
                    <span className="font-semibold text-[#008CD3]">
                      {selectedEmployee.name} selected
                    </span>
                  </>
                ) : null}
              </p>

              {filteredEmployees.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#E4E7EC] bg-[#F9FAFB] px-4 py-8 text-center">
                  <UserRound className="mx-auto mb-2 h-7 w-7 text-[#9CA3AF]" aria-hidden />
                  <p className="text-[14px] font-medium text-[#374151]">No employees found</p>
                </div>
              ) : (
                <ul className="max-h-[min(42vh,360px)] space-y-2 overflow-y-auto pr-0.5">
                  {filteredEmployees.map((emp) => {
                    const selected = selectedId === emp.userId;
                    return (
                      <li key={emp.userId}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(emp.userId)}
                          disabled={loadingRecord}
                          className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                            selected
                              ? "border-[#E8710A]/40 bg-[#FFFBEB] ring-1 ring-[#E8710A]/15"
                              : "border-[#E4E7EC] bg-white hover:border-[#008CD3]/25 hover:bg-[#FAFCFE]"
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                              selected
                                ? "border-[#E8710A] bg-[#E8710A]"
                                : "border-[#D1D5DB] bg-white"
                            }`}
                          >
                            {selected ? (
                              <span className="h-2 w-2 rounded-full bg-white" />
                            ) : null}
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
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : (
            <form id="update-reg-form" onSubmit={handleSubmit} className="space-y-4">
              {selectedEmployee ? (
                <div className="rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                    Updating for
                  </p>
                  <p className="mt-1 text-[15px] font-semibold text-[#1F2937]">
                    {selectedEmployee.name}
                  </p>
                  <p className="text-[12px] text-[#6B7280]">{selectedEmployee.empCode}</p>
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-[#E4E7EC] bg-white px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                    Used
                  </p>
                  <p className="mt-1 text-[18px] font-semibold text-[#1F2937]">{usedTokens}</p>
                </div>
                <div className="rounded-lg border border-[#E4E7EC] bg-white px-3 py-2.5 sm:col-span-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                    Minimum balance
                  </p>
                  <p className="mt-1 text-[13px] text-[#6B7280]">
                    Balance must be at least {usedTokens} (already used this period).
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="update-reg-balance" className={labelCls()}>
                  Regularization balance <span className="text-red-500">*</span>
                </label>
                <input
                  id="update-reg-balance"
                  type="number"
                  min={usedTokens}
                  step={1}
                  inputMode="numeric"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  className={inputCls()}
                  disabled={submitting}
                  required
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="update-reg-valid-from" className={labelCls()}>
                    Valid from <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="update-reg-valid-from"
                    type="date"
                    value={validFrom}
                    min={currentMonth.start}
                    max={currentMonth.end}
                    onChange={(e) => {
                      const nextFrom = e.target.value;
                      setValidFrom(nextFrom);
                      const nextBounds = nextCalendarMonthBounds(nextFrom);
                      if (nextBounds && (!validTo || validTo < nextBounds.start || validTo > nextBounds.end)) {
                        setValidTo(nextBounds.end);
                      }
                    }}
                    className={inputCls()}
                    disabled={submitting}
                    required
                  />
                  <p className="mt-1 text-[11px] text-[#6B7280]">
                    Current month: {formatYmdLabel(currentMonth.start)} –{" "}
                    {formatYmdLabel(currentMonth.end)}
                  </p>
                </div>
                <div>
                  <label htmlFor="update-reg-valid-to" className={labelCls()}>
                    Valid to <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="update-reg-valid-to"
                    type="date"
                    value={validTo}
                    min={nextMonth?.start}
                    max={nextMonth?.end}
                    onChange={(e) => setValidTo(e.target.value)}
                    className={inputCls()}
                    disabled={submitting || !validFrom}
                    required
                  />
                  <p className="mt-1 text-[11px] text-[#6B7280]">
                    {nextMonth
                      ? `Next month: ${formatYmdLabel(nextMonth.start)} – ${formatYmdLabel(nextMonth.end)}`
                      : "Select valid from first"}
                  </p>
                </div>
              </div>
            </form>
          )}
        </div>

        <div className="border-t border-[#E4E7EC] bg-[#FAFBFC] px-4 py-3 sm:px-5">
          {step === "select" ? (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleClose}
                className={secondaryBtnCls()}
                disabled={loadingRecord}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void goToEditStep()}
                className={primaryBtnCls()}
                disabled={!selectedId || loadingRecord}
              >
                {loadingRecord ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Loading record…
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </>
                )}
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
                <button
                  type="button"
                  onClick={handleClose}
                  className={secondaryBtnCls()}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="update-reg-form"
                  className={primaryBtnCls()}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Saving…
                    </>
                  ) : (
                    <>
                      Save changes
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
