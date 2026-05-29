"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, ShieldAlert, X } from "lucide-react";
import { createEmployeeExitProcess } from "@/services/employeeExit";

export type TerminateEmployeeTarget = {
  userId: string | number;
  userName: string;
  userEmail?: string | null;
  teamId?: number | string | null;
  subtitle?: string | null;
};

type TerminateEmployeeModalProps = {
  open: boolean;
  orgId: number | string;
  employee: TerminateEmployeeTarget | null;
  onClose: () => void;
  onSuccess?: (message: string) => void;
};

function fieldCls() {
  return "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20";
}

export default function TerminateEmployeeModal({
  open,
  orgId,
  employee,
  onClose,
  onSuccess,
}: TerminateEmployeeModalProps) {
  const [reason, setReason] = useState("");
  const [lastWorkingDay, setLastWorkingDay] = useState("");
  const [exitDate, setExitDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setReason("");
    setLastWorkingDay("");
    setExitDate("");
    setError(null);
    setSubmitting(false);
  }, [open, employee?.userId]);

  if (!open || !employee) return null;

  const busy = submitting;

  async function handleConfirm() {
    if (!employee) return;

    const trimmed = reason.trim();
    if (!trimmed) {
      setError("Termination reason is required.");
      return;
    }
    if (
      exitDate &&
      lastWorkingDay &&
      new Date(lastWorkingDay) > new Date(exitDate)
    ) {
      setError("Last working day cannot be after exit date.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Not signed in.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await createEmployeeExitProcess(token, {
        org_id: orgId,
        user_id: employee.userId,
        team_id: employee.teamId ?? null,
        action_type: "termination",
        action_reason: trimmed,
        application_status: "pending",
        exit_date: exitDate || null,
        last_working_day: lastWorkingDay || null,
      });
      const message =
        result.message ||
        "Exit process created. The termination workflow is now on file.";
      onSuccess?.(message);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start termination.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terminate-employee-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]"
        aria-label="Close"
        onClick={() => !busy && onClose()}
      />
      <div className="relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-2xl">
        <div className="shrink-0 bg-gradient-to-br from-rose-700 to-rose-900 px-5 py-4 text-white">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
              <ShieldAlert className="h-6 w-6" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 pr-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-100">
                Warning
              </p>
              <h2 id="terminate-employee-title" className="mt-0.5 text-lg font-bold">
                Employee termination
              </h2>
              <p className="mt-1 text-sm text-rose-100/95">
                This starts an offboarding exit record for HR review. It cannot be undone from
                this screen.
              </p>
            </div>
            <button
              type="button"
              onClick={() => !busy && onClose()}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-white/90 hover:bg-white/10"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="font-semibold text-slate-900">{employee.userName}</p>
            {employee.userEmail ? (
              <p className="mt-0.5 truncate text-sm text-slate-600">{employee.userEmail}</p>
            ) : null}
            {employee.subtitle ? (
              <p className="mt-1 text-xs text-slate-500">{employee.subtitle}</p>
            ) : null}
          </div>

          <div className="mt-4 flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
            <p className="leading-relaxed">
              Confirm only if policy and documentation are in place. Approvers can update dates
              and status in the exit workflow.
            </p>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="terminate-reason"
                className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                <span>Termination reason</span>
                <span className="font-normal normal-case text-slate-400">
                  {reason.trim().length}/2000
                </span>
              </label>
              <textarea
                id="terminate-reason"
                rows={4}
                maxLength={2000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Summarize grounds, policy references, or context for approvers…"
                className={fieldCls()}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="terminate-last-day"
                  className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Last working day
                </label>
                <input
                  id="terminate-last-day"
                  type="date"
                  value={lastWorkingDay}
                  onChange={(e) => setLastWorkingDay(e.target.value)}
                  className={fieldCls()}
                />
              </div>
              <div>
                <label
                  htmlFor="terminate-exit-date"
                  className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Exit date
                </label>
                <input
                  id="terminate-exit-date"
                  type="date"
                  value={exitDate}
                  onChange={(e) => setExitDate(e.target.value)}
                  className={fieldCls()}
                />
              </div>
            </div>
          </div>

          {error ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/90 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={() => onClose()}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !reason.trim()}
            onClick={() => void handleConfirm()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Submitting…
              </>
            ) : (
              "Confirm termination"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
