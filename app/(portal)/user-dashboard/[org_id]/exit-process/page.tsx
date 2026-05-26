"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  ClipboardList,
  Loader2,
  LogOut,
  Package,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import type { ApiError } from "@/services/auth";
import {
  createEmployeeExitProcess,
  fetchMyExitProcess,
  type EmployeeExitProcessDetail,
} from "@/services/employeeExit";
import { fetchMyOrgTeam } from "@/services/orgTeams";

function zohoPrimaryBtnCls(full = false) {
  return `inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg bg-[#008CD3] px-4 py-2.5 text-[14px] font-medium text-white transition active:scale-[0.98] hover:bg-[#0070AA] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full flex-1" : ""}`;
}

function zohoSecondaryBtnCls(full = false) {
  return `inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-[#E4E7EC] bg-white px-4 py-2.5 text-[14px] font-medium text-[#374151] transition active:scale-[0.98] hover:bg-[#F5F7FA] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full flex-1" : ""}`;
}

function zohoInputCls() {
  return "mt-1.5 w-full rounded-lg border border-[#E4E7EC] bg-white px-3.5 py-2.5 text-[15px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15 lg:text-sm";
}

function formatDate(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  const raw = String(value);
  const ymd = raw.length >= 10 ? raw.slice(0, 10) : raw;
  const d = new Date(ymd);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function parseJwtUserId(token: string | null): string {
  if (!token) return "";
  try {
    const payload = JSON.parse(atob(token.split(".")[1] || "")) as {
      user_id?: string | number;
      id?: string | number;
    };
    return String(payload.user_id ?? payload.id ?? "");
  } catch {
    return "";
  }
}

function statusChipClass(status: string | null | undefined): string {
  const s = String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (s === "approved" || s === "handover_completed") {
    return "bg-[#E7FCE3] text-[#0B5E44] ring-[#B7E4C7]";
  }
  if (s === "rejected") return "bg-[#FFECEC] text-[#C62828] ring-[#FFCDD2]";
  if (s === "in_progress") return "bg-[#E3F2FD] text-[#1565C0] ring-[#BBDEFB]";
  if (s === "pending") return "bg-[#FFF8E1] text-[#8D6E00] ring-[#FFE082]";
  return "bg-[#F0F2F5] text-[#54656F] ring-[#E4E7EC]";
}

function statusLabel(status: string | null | undefined): string {
  return String(status ?? "unknown")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function truthyReturned(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  if (typeof v === "string") return /^(1|true|yes)$/i.test(v.trim());
  return false;
}

function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-[#E4E7EC] bg-[#FAFBFC] px-3.5 py-3">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
        {label}
      </dt>
      <dd className="mt-1 text-[15px] font-medium text-[#111827]">{value}</dd>
    </div>
  );
}

function ExitProcessView({ data }: { data: EmployeeExitProcessDetail }) {
  return (
    <div className="space-y-5 lg:space-y-6">
      <section className="overflow-hidden rounded-xl border border-[#E4E7EC] bg-white shadow-sm lg:rounded-2xl lg:[border-top:3px_solid_#008CD3]">
        <div className="border-b border-[#E4E7EC] bg-[#F8FAFC] px-4 py-4 lg:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#008CD3]">
                Exit application
              </p>
              <h2 className="mt-1 text-[18px] font-semibold text-[#111827] lg:text-xl">
                {data.employee_name ?? "Your exit process"}
              </h2>
              <p className="mt-1 text-[13px] text-[#6B7280]">
                Reference #{data.id} · Submitted {formatDateTime(data.created_at)}
              </p>
            </div>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-[12px] font-semibold ring-1 ${statusChipClass(data.application_status)}`}
            >
              {statusLabel(data.application_status)}
            </span>
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:gap-4 lg:p-6">
          <ReadOnlyField
            label="Type"
            value={statusLabel(data.action_type)}
          />
          <ReadOnlyField
            label="Team"
            value={data.team_name ?? "—"}
          />
          <ReadOnlyField
            label="Last working day"
            value={formatDate(data.last_working_day)}
          />
          <ReadOnlyField label="Exit date" value={formatDate(data.exit_date)} />
          <div className="sm:col-span-2">
            <ReadOnlyField
              label="Reason"
              value={data.action_reason?.trim() || "—"}
            />
          </div>
        </div>
      </section>

      {data.response_message || data.response_by_name || data.resolved_at ? (
        <section className="overflow-hidden rounded-xl border border-[#E4E7EC] bg-white shadow-sm lg:rounded-2xl">
          <div className="border-b border-[#E4E7EC] px-4 py-3 lg:px-6">
            <h3 className="flex items-center gap-2 text-[15px] font-semibold text-[#111827]">
              <ShieldAlert className="h-4 w-4 text-[#008CD3]" />
              Organization response
            </h3>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:gap-4 lg:p-6">
            <ReadOnlyField
              label="Responded by"
              value={data.response_by_name ?? "—"}
            />
            <ReadOnlyField
              label="Resolved on"
              value={formatDateTime(data.resolved_at)}
            />
            <div className="sm:col-span-2">
              <ReadOnlyField
                label="Message"
                value={data.response_message?.trim() || "—"}
              />
            </div>
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-[#E4E7EC] bg-white shadow-sm lg:rounded-2xl">
        <div className="border-b border-[#E4E7EC] px-4 py-3 lg:px-6">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold text-[#111827]">
            <Package className="h-4 w-4 text-[#008CD3]" />
            Assigned assets
            <span className="rounded-full bg-[#E8F4FB] px-2 py-0.5 text-[11px] font-semibold text-[#008CD3]">
              {data.employee_assets.length}
            </span>
          </h3>
        </div>
        {data.employee_assets.length === 0 ? (
          <p className="px-4 py-8 text-center text-[14px] text-[#6B7280] lg:px-6">
            No assets recorded for this exit.
          </p>
        ) : (
          <ul className="divide-y divide-[#E4E7EC]">
            {data.employee_assets.map((asset) => (
              <li key={asset.id} className="px-4 py-4 lg:px-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-medium text-[#111827]">
                      {asset.asset_name ?? "Asset"}
                    </p>
                    <p className="mt-0.5 text-[13px] text-[#6B7280]">
                      {asset.asset_type ?? "—"}
                      {asset.asset_summary ? ` · ${asset.asset_summary}` : ""}
                    </p>
                    {asset.returned_to_name ? (
                      <p className="mt-1 text-[12px] text-[#6B7280]">
                        Returned to {asset.returned_to_name}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
                      truthyReturned(asset.is_returned)
                        ? "bg-[#E7FCE3] text-[#0B5E44] ring-[#B7E4C7]"
                        : "bg-[#FFF8E1] text-[#8D6E00] ring-[#FFE082]"
                    }`}
                  >
                    {truthyReturned(asset.is_returned) ? "Returned" : "Pending"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-[#E4E7EC] bg-white shadow-sm lg:rounded-2xl">
        <div className="border-b border-[#E4E7EC] px-4 py-3 lg:px-6">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold text-[#111827]">
            <ClipboardList className="h-4 w-4 text-[#008CD3]" />
            Handover tasks
            <span className="rounded-full bg-[#E8F4FB] px-2 py-0.5 text-[11px] font-semibold text-[#008CD3]">
              {data.handover_queries.length}
            </span>
          </h3>
        </div>
        {data.handover_queries.length === 0 ? (
          <p className="px-4 py-8 text-center text-[14px] text-[#6B7280] lg:px-6">
            No handover tasks yet.
          </p>
        ) : (
          <ul className="divide-y divide-[#E4E7EC]">
            {data.handover_queries.map((task) => (
              <li key={task.handover_query_id} className="px-4 py-4 lg:px-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-medium text-[#111827]">
                      {task.custom_task_name ??
                        task.asset_name ??
                        `Task #${task.handover_query_id}`}
                    </p>
                    <p className="mt-0.5 text-[13px] text-[#6B7280]">
                      Manager: {task.manager_name ?? "—"}
                      {task.handover_date
                        ? ` · Due ${formatDate(task.handover_date)}`
                        : ""}
                    </p>
                    {task.remarks ? (
                      <p className="mt-2 text-[13px] text-[#4B5563]">
                        {task.remarks}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${statusChipClass(task.handover_status)}`}
                  >
                    {statusLabel(task.handover_status)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="rounded-lg border border-[#E8F4FB] bg-[#F5FAFD] px-4 py-3 text-[13px] text-[#4B5563]">
        This page is read-only. Contact your manager or HR if you need changes
        to your exit request.
      </p>
    </div>
  );
}

function ResignationForm({
  orgId,
  onSubmitted,
}: {
  orgId: string;
  onSubmitted: () => void;
}) {
  const [actionReason, setActionReason] = useState("");
  const [exitDate, setExitDate] = useState("");
  const [lastWorkingDay, setLastWorkingDay] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const reason = actionReason.trim();
    if (!reason) {
      setFormError("Please describe your reason for resigning.");
      return;
    }

    if (
      exitDate &&
      lastWorkingDay &&
      new Date(lastWorkingDay) > new Date(exitDate)
    ) {
      setFormError("Last working day cannot be after the exit date.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setFormError("Sign in required.");
      return;
    }

    const userId = parseJwtUserId(token);
    if (!userId) {
      setFormError("Could not identify your account.");
      return;
    }

    setSubmitting(true);
    try {
      let teamId: number | string | null = null;
      try {
        const team = await fetchMyOrgTeam(token, orgId);
        teamId = team.team_id ?? null;
      } catch {
        teamId = null;
      }

      await createEmployeeExitProcess(token, {
        org_id: orgId,
        user_id: userId,
        team_id: teamId,
        action_type: "resignation",
        action_reason: reason,
        application_status: "pending",
        exit_date: exitDate || null,
        last_working_day: lastWorkingDay || null,
      });

      onSubmitted();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Could not submit resignation.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="overflow-hidden rounded-xl border border-[#E4E7EC] bg-white shadow-sm lg:rounded-2xl lg:[border-top:3px_solid_#008CD3]"
    >
      <div className="border-b border-[#E4E7EC] bg-[#F8FAFC] px-4 py-4 lg:px-6">
        <p className="text-[11px] font-bold uppercase tracking-wide text-[#008CD3]">
          New request
        </p>
        <h2 className="mt-1 text-[18px] font-semibold text-[#111827] lg:text-xl">
          Submit resignation
        </h2>
        <p className="mt-1 text-[13px] text-[#6B7280]">
          Share your reason and preferred dates. HR or your manager will review
          the request.
        </p>
      </div>

      <div className="space-y-4 p-4 lg:p-6">
        {formError ? (
          <div
            className="rounded-lg border border-[#FFCDD2] bg-[#FFECEC] px-4 py-3 text-[14px] text-[#C62828]"
            role="alert"
          >
            {formError}
          </div>
        ) : null}

        <label className="block">
          <span className="text-[13px] font-semibold text-[#374151]">
            Reason for resignation <span className="text-[#C62828]">*</span>
          </span>
          <textarea
            className={`${zohoInputCls()} min-h-[120px] resize-y`}
            value={actionReason}
            onChange={(e) => setActionReason(e.target.value)}
            placeholder="Explain why you are resigning…"
            required
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-[13px] font-semibold text-[#374151]">
              Last working day
            </span>
            <input
              type="date"
              className={zohoInputCls()}
              value={lastWorkingDay}
              onChange={(e) => setLastWorkingDay(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-[13px] font-semibold text-[#374151]">
              Exit date
            </span>
            <input
              type="date"
              className={zohoInputCls()}
              value={exitDate}
              onChange={(e) => setExitDate(e.target.value)}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className={zohoPrimaryBtnCls(true)}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting…
            </>
          ) : (
            <>
              <LogOut className="h-4 w-4" />
              Submit resignation
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export default function ExitProcessPage() {
  const params = useParams();
  const orgId = String(params?.org_id ?? "");
  const homeHref = `/user-dashboard/${orgId}/home`;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exitProcess, setExitProcess] = useState<EmployeeExitProcessDetail | null>(
    null,
  );
  const [showApplyForm, setShowApplyForm] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!orgId) return;
    if (silent) setRefreshing(true);
    else {
      setLoading(true);
      setLoadError(null);
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setLoadError("Sign in required.");
      setExitProcess(null);
      setShowApplyForm(false);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const res = await fetchMyExitProcess(token, orgId);
      setExitProcess(res.data ?? null);
      setShowApplyForm(false);
      setLoadError(null);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.status === 404) {
        setExitProcess(null);
        setShowApplyForm(true);
        setLoadError(null);
      } else {
        setLoadError(
          err instanceof Error ? err.message : "Could not load exit process.",
        );
        setExitProcess(null);
        setShowApplyForm(false);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-full bg-[#F5F7FA] pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-10">
      <div className="sticky top-0 z-20 border-b border-[#E4E7EC] bg-white/95 backdrop-blur-sm lg:static lg:border-0 lg:bg-transparent">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3 lg:max-w-4xl lg:px-0 lg:py-0 lg:pt-2">
          <Link
            href={homeHref}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#374151] transition hover:bg-[#F5F7FA] lg:hidden"
            aria-label="Back to home"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1 lg:rounded-2xl lg:border lg:border-[#E4E7EC] lg:bg-white lg:px-6 lg:py-5 lg:shadow-sm lg:[border-top:3px_solid_#008CD3]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="hidden text-[11px] font-bold uppercase tracking-wide text-[#008CD3] lg:block">
                  Employee services
                </p>
                <h1 className="text-[18px] font-semibold text-[#111827] lg:text-2xl">
                  Exit process
                </h1>
                <p className="mt-0.5 text-[13px] text-[#6B7280] lg:mt-1 lg:text-sm">
                  View your resignation status or submit a new request.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void load(true)}
                disabled={loading || refreshing}
                className={zohoSecondaryBtnCls()}
                aria-label="Refresh"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pt-4 lg:max-w-4xl lg:px-0 lg:pt-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-[#6B7280]">
            <Loader2 className="h-9 w-9 animate-spin text-[#008CD3]" />
            <p className="text-[15px]">Loading your exit process…</p>
          </div>
        ) : loadError ? (
          <div className="rounded-xl border border-[#FFCDD2] bg-[#FFECEC] px-4 py-8 text-center">
            <p className="text-[15px] font-medium text-[#C62828]">{loadError}</p>
            <button
              type="button"
              onClick={() => void load()}
              className={`mt-4 ${zohoPrimaryBtnCls()}`}
            >
              Try again
            </button>
          </div>
        ) : exitProcess ? (
          <ExitProcessView data={exitProcess} />
        ) : showApplyForm ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-[#E8F4FB] bg-[#F5FAFD] px-4 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
                <Briefcase className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[15px] font-semibold text-[#111827]">
                  No active exit process
                </p>
                <p className="mt-1 text-[13px] text-[#6B7280]">
                  You have not submitted a resignation yet. Complete the form
                  below to start your exit request.
                </p>
              </div>
            </div>
            <ResignationForm orgId={orgId} onSubmitted={() => void load()} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
