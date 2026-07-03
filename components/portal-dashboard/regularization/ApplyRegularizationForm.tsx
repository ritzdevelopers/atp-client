"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, ChevronLeft, Loader2 } from "lucide-react";
import { getTodayLocalYmd } from "@/lib/attendanceDates";
import {
  applyForRegularization,
  fetchMyRegularizationBalance,
  fetchReportingManagers,
  type RegularizationBalance,
  type RegularizationReportingManager,
  type RegularizationRequestType,
} from "@/services/regularization";

function inputCls() {
  return "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";
}

function roleLabel(role: RegularizationReportingManager["role"]): string {
  if (role === "reporting_manager") return "Team leader";
  if (role === "hr") return "HR";
  return "Admin";
}

function managerOptionLabel(manager: RegularizationReportingManager): string {
  const parts = [manager.user_name];
  if (manager.team_name) parts.push(`(${manager.team_name})`);
  parts.push(`— ${roleLabel(manager.role)}`);
  return parts.join(" ");
}

export default function ApplyRegularizationForm() {
  const params = useParams();
  const router = useRouter();
  const orgIdParam = String(params?.org_id ?? "");
  const orgId = Number(orgIdParam);
  const listHref = `/user-dashboard/${encodeURIComponent(orgIdParam)}/regularization`;
  const homeHref = `/user-dashboard/${encodeURIComponent(orgIdParam)}/home`;

  const [balance, setBalance] = useState<RegularizationBalance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const [managers, setManagers] = useState<RegularizationReportingManager[]>([]);
  const [managerSource, setManagerSource] = useState<
    "team_leaders" | "hr_admin" | null
  >(null);
  const [managersLoading, setManagersLoading] = useState(true);
  const [managersError, setManagersError] = useState<string | null>(null);
  const [selectedManagerId, setSelectedManagerId] = useState<string>("");

  const [requestType, setRequestType] = useState<RegularizationRequestType>("check_in");
  const [actionDate, setActionDate] = useState("");
  const [checkInTime, setCheckInTime] = useState("");
  const [checkOutTime, setCheckOutTime] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const selectedManager = useMemo(
    () =>
      managers.find((m) => String(m.user_id) === selectedManagerId) ?? null,
    [managers, selectedManagerId],
  );

  const loadBalance = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token || Number.isNaN(orgId)) {
      setBalanceError("Not signed in.");
      setBalanceLoading(false);
      return;
    }
    setBalanceLoading(true);
    setBalanceError(null);
    try {
      const data = await fetchMyRegularizationBalance(token, orgId);
      setBalance(data);
    } catch (e) {
      setBalance(null);
      setBalanceError(
        e instanceof Error ? e.message : "Could not load regularization balance",
      );
    } finally {
      setBalanceLoading(false);
    }
  }, [orgId]);

  const loadManagers = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token || Number.isNaN(orgId)) {
      setManagersError("Not signed in.");
      setManagersLoading(false);
      return;
    }
    setManagersLoading(true);
    setManagersError(null);
    try {
      const result = await fetchReportingManagers(token, orgId);
      setManagers(result.data);
      setManagerSource(result.source);
      setSelectedManagerId((prev) => {
        if (prev && result.data.some((m) => String(m.user_id) === prev)) {
          return prev;
        }
        return result.data.length === 1 ? String(result.data[0]!.user_id) : "";
      });
    } catch (e) {
      setManagers([]);
      setManagerSource(null);
      setManagersError(
        e instanceof Error ? e.message : "Could not load reporting managers",
      );
    } finally {
      setManagersLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void loadBalance();
    void loadManagers();
  }, [loadBalance, loadManagers]);

  const canSubmit = useMemo(
    () =>
      balance?.is_available &&
      selectedManagerId !== "" &&
      !managersLoading &&
      managers.length > 0,
    [balance?.is_available, selectedManagerId, managersLoading, managers.length],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const token = localStorage.getItem("token");
    if (!token) {
      setFormError("Not signed in.");
      return;
    }
    const reportingManagerId = Number(selectedManagerId);
    if (!Number.isInteger(reportingManagerId) || reportingManagerId <= 0) {
      setFormError("Please select a reporting manager.");
      return;
    }
    if (!balance?.is_available) {
      setFormError("No regularization balance available for this month.");
      return;
    }
    if (!actionDate) {
      setFormError("Action date is required.");
      return;
    }
    const today = getTodayLocalYmd();
    if (actionDate > today) {
      setFormError("Action date cannot be in the future.");
      return;
    }
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setFormError("Reason is required.");
      return;
    }

    const regularization_info: Parameters<typeof applyForRegularization>[1]["regularization_info"] =
      {
        request_type: requestType,
        action_date: actionDate,
        reason: trimmedReason,
        reporting_manager: reportingManagerId,
      };

    if (requestType === "check_in") {
      if (!checkInTime) {
        setFormError("Check-in time is required.");
        return;
      }
      regularization_info.check_in_time = checkInTime;
    } else if (requestType === "check_out") {
      if (!checkOutTime) {
        setFormError("Check-out time is required.");
        return;
      }
      regularization_info.check_out_time = checkOutTime;
    } else {
      if (!checkInTime || !checkOutTime) {
        setFormError("Check-in and check-out times are required.");
        return;
      }
      if (checkOutTime <= checkInTime) {
        setFormError("Check-out time must be after check-in time.");
        return;
      }
      regularization_info.check_in_time = checkInTime;
      regularization_info.check_out_time = checkOutTime;
    }

    setSubmitting(true);
    try {
      const result = await applyForRegularization(token, {
        org_id: orgId,
        regularization_info,
      });
      setFormSuccess(result.message ?? "Regularization request submitted.");
      window.setTimeout(() => {
        router.push(listHref);
      }, 1200);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Could not submit request",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-full bg-slate-50/80">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link
            href={listHref}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold text-slate-900">
              Apply regularization
            </h1>
            <p className="text-xs text-slate-500">
              Correct missed or incorrect attendance for a past date
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-4 pb-24 lg:pb-6">
        <form
          onSubmit={onSubmit}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6"
        >
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700/80">
              This month&apos;s balance
            </p>
            {balanceLoading ? (
              <div className="mt-2 flex items-center gap-2 text-sm text-indigo-800">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Loading balance…
              </div>
            ) : balanceError ? (
              <p className="mt-2 text-sm text-rose-700">{balanceError}</p>
            ) : balance ? (
              <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <p className="text-2xl font-bold tabular-nums text-indigo-900">
                  {balance.remaining}
                  <span className="ml-1 text-sm font-medium text-indigo-700">
                    of {balance.balance} left
                  </span>
                </p>
                {balance.valid_from && balance.valid_to ? (
                  <p className="text-xs text-indigo-700/80">
                    Valid {balance.valid_from} – {balance.valid_to}
                  </p>
                ) : null}
                {!balance.is_available ? (
                  <p className="w-full text-sm text-amber-800">
                    No regularization balance available for this month.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          {formError ? (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {formError}
            </div>
          ) : null}
          {formSuccess ? (
            <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {formSuccess}
            </p>
          ) : null}

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-slate-600">
                Reporting manager
              </span>
              {managersLoading ? (
                <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Loading managers…
                </div>
              ) : managersError ? (
                <p className="mt-2 text-sm text-rose-700">{managersError}</p>
              ) : managers.length === 0 ? (
                <p className="mt-2 text-sm text-amber-800">
                  No reporting managers available. Contact HR if you are not
                  assigned to a team.
                </p>
              ) : (
                <>
                  <select
                    required
                    value={selectedManagerId}
                    onChange={(e) => setSelectedManagerId(e.target.value)}
                    className={inputCls()}
                    disabled={!canSubmit || submitting}
                  >
                    <option value="">Select reporting manager</option>
                    {managers.map((manager) => (
                      <option key={manager.user_id} value={String(manager.user_id)}>
                        {managerOptionLabel(manager)}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    {managerSource === "team_leaders"
                      ? "Showing team leaders from your assigned teams. You can select one manager only."
                      : "You are not in a team — select HR or organization admin as your reporting manager."}
                  </p>
                  {selectedManager?.user_email ? (
                    <p className="mt-1 text-[11px] text-slate-400">
                      {selectedManager.user_email}
                    </p>
                  ) : null}
                </>
              )}
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-slate-600">Request type</span>
              <select
                value={requestType}
                onChange={(e) =>
                  setRequestType(e.target.value as RegularizationRequestType)
                }
                className={inputCls()}
                disabled={!canSubmit || submitting}
              >
                <option value="check_in">Check-in only</option>
                <option value="check_out">Check-out only</option>
                <option value="both">Both check-in & check-out</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-slate-600">Action date</span>
              <input
                type="date"
                required
                max={getTodayLocalYmd()}
                value={actionDate}
                onChange={(e) => setActionDate(e.target.value)}
                className={inputCls()}
                disabled={!canSubmit || submitting}
              />
            </label>

            {requestType === "check_in" || requestType === "both" ? (
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">Check-in time</span>
                <input
                  type="time"
                  required
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  className={inputCls()}
                  disabled={!canSubmit || submitting}
                />
              </label>
            ) : null}

            {requestType === "check_out" || requestType === "both" ? (
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">Check-out time</span>
                <input
                  type="time"
                  required
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                  className={inputCls()}
                  disabled={!canSubmit || submitting}
                />
              </label>
            ) : null}

            <label className="block">
              <span className="text-xs font-semibold text-slate-600">Reason</span>
              <textarea
                required
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Briefly explain why regularization is needed"
                className={inputCls()}
                disabled={!canSubmit || submitting}
              />
            </label>
          </div>

          <div className="mt-6 flex gap-2">
            <Link
              href={listHref}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!canSubmit || submitting || balanceLoading || managersLoading}
              className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit request"}
            </button>
          </div>

          <p className="mt-4 text-center">
            <Link href={homeHref} className="text-xs text-slate-400 hover:text-slate-600">
              Back to dashboard
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
