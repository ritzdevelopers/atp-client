"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  ClipboardList,
  Layers,
  ListChecks,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Plus,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import {
  fetchTeamMemberExitProcessReport,
  type TeamMemberExitProcessReportData,
  type TeamMemberExitReportProcess,
  type TeamMemberExitReportHandoverRow,
} from "@/services/orgTeams";
import {
  createEmployeeExitProcessHandoverQuery,
  updateEmployeeExitProcessHandoverQuery,
  type EmployeeExitHandoverStatus,
} from "@/services/employeeExit";

const HANDOVER_STATUS_OPTIONS = [
  "pending",
  "handover_completed",
  "damaged",
  "missing",
] satisfies readonly EmployeeExitHandoverStatus[];

function fmtLong(iso: string | null | undefined) {
  if (iso == null || iso === "") return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function fmtDateOnly(iso: string | null | undefined) {
  if (iso == null || iso === "") return "—";
  const raw = String(iso);
  const ymd = raw.length >= 10 ? raw.slice(0, 10) : raw;
  const d = new Date(ymd);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function exitApplicationPill(status: string | null | undefined) {
  const s = String(status ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  if (s === "in_progress") {
    return "bg-sky-50 text-sky-800 ring-sky-200/80";
  }
  if (s === "pending") {
    return "bg-amber-50 text-amber-900 ring-amber-200/80";
  }
  if (s === "rejected") {
    return "bg-rose-50 text-rose-800 ring-rose-200/80";
  }
  if (s === "approved" || s === "handover_completed") {
    return "bg-emerald-50 text-emerald-800 ring-emerald-200/80";
  }
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

/** `datetime-local` value → `YYYY-MM-DD HH:MM:00` for the API */
function datetimeLocalToSqlDatetime(value: string): string {
  const t = value.trim();
  if (!t) return "";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(t)) {
    return `${t.replace("T", " ")}:00`;
  }
  return t;
}

/** DB / ISO datetime → value for `<input type="datetime-local">` */
function sqlDatetimeToDatetimeLocal(
  value: string | null | undefined,
): string {
  if (value == null || value === "") return "";
  const s = String(value).trim();
  const m =
    /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::\d{2})?/.exec(s);
  if (m?.[1] && m?.[2]) return `${m[1]}T${m[2]}`;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${mo}-${day}T${hh}:${mi}`;
}

function initialsFromName(name: string | null | undefined): string {
  const parts = String(name ?? "").split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0]![0] ?? "?").toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase() || "?";
}

export default function TeamMemberExitProcessReportPage() {
  const params = useParams();
  const orgId = String(params?.org_id ?? "");
  const userIdParam = String(params?.user_id ?? "");

  const [data, setData] = useState<TeamMemberExitProcessReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [handoverFormOpen, setHandoverFormOpen] = useState(false);
  const [handoverTaskName, setHandoverTaskName] = useState("");
  const [handoverDateLocal, setHandoverDateLocal] = useState("");
  const [handoverRemarks, setHandoverRemarks] = useState("");
  const [handoverSubmitting, setHandoverSubmitting] = useState(false);
  const [handoverFormError, setHandoverFormError] = useState<string | null>(null);

  const [editingHandoverId, setEditingHandoverId] = useState<number | null>(
    null,
  );
  const [handoverEditTaskName, setHandoverEditTaskName] = useState("");
  const [handoverEditDateLocal, setHandoverEditDateLocal] = useState("");
  const [handoverEditRemarks, setHandoverEditRemarks] = useState("");
  const [handoverEditSaving, setHandoverEditSaving] = useState(false);
  const [handoverEditError, setHandoverEditError] = useState<string | null>(
    null,
  );

  const [statusPanelHandoverId, setStatusPanelHandoverId] = useState<
    number | null
  >(null);
  const [statusSelectValue, setStatusSelectValue] =
    useState<EmployeeExitHandoverStatus>("pending");
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusApplyError, setStatusApplyError] = useState<string | null>(
    null,
  );

  const teamGroupHref =
    `/dashboard/${orgId}/organization-employees/team-group`;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Sign in required.");
        setData(null);
        return;
      }
      const orgIdNum = Number(orgId);
      if (!orgId || Number.isNaN(orgIdNum) || !userIdParam.trim()) {
        setError("Invalid organization or employee.");
        setData(null);
        return;
      }
      const report = await fetchTeamMemberExitProcessReport(
        token,
        orgIdNum,
        userIdParam.trim(),
      );
      setData(report);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "Could not load report.");
    } finally {
      setLoading(false);
    }
  }, [orgId, userIdParam]);

  useEffect(() => {
    void load();
  }, [load]);

  const ep: TeamMemberExitReportProcess | null = data?.exit_process ?? null;
  const hq: TeamMemberExitReportHandoverRow[] = data?.handover_queries ?? [];

  const submitHandoverQuery = async () => {
    if (!ep) return;
    const name = handoverTaskName.trim();
    if (!name) {
      setHandoverFormError("Enter a task or item name.");
      return;
    }
    if (name.length > 250) {
      setHandoverFormError("Task name must be 250 characters or less.");
      return;
    }
    if (!handoverDateLocal.trim()) {
      setHandoverFormError("Choose a handover date and time.");
      return;
    }
    const handover_date = datetimeLocalToSqlDatetime(handoverDateLocal);
    if (!handover_date) {
      setHandoverFormError("Handover date is invalid.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setHandoverFormError("Sign in required.");
      return;
    }
    const orgIdNum = Number(orgId);
    if (!orgId || Number.isNaN(orgIdNum)) {
      setHandoverFormError("Invalid organization.");
      return;
    }
    setHandoverFormError(null);
    setHandoverSubmitting(true);
    try {
      await createEmployeeExitProcessHandoverQuery(token, {
        org_id: orgIdNum,
        employee_exit_process_id: ep.exit_process_id,
        employee_id: ep.employee_id,
        team_id: ep.team_id ?? null,
        custom_task_name: name,
        remarks: handoverRemarks.trim() || null,
        handover_date,
      });
      setHandoverTaskName("");
      setHandoverDateLocal("");
      setHandoverRemarks("");
      setHandoverFormOpen(false);
      await load();
    } catch (e) {
      setHandoverFormError(
        e instanceof Error ? e.message : "Could not create handover query.",
      );
    } finally {
      setHandoverSubmitting(false);
    }
  };

  const openHandoverEdit = (h: TeamMemberExitReportHandoverRow) => {
    if (h.handover_query_id == null) return;
    setStatusPanelHandoverId(null);
    setStatusApplyError(null);
    setEditingHandoverId(h.handover_query_id);
    setHandoverEditError(null);
    setHandoverEditTaskName(h.custom_task_name?.trim() ?? "");
    setHandoverEditRemarks(h.remarks ?? "");
    setHandoverEditDateLocal(sqlDatetimeToDatetimeLocal(h.handover_date));
  };

  const cancelHandoverEdit = () => {
    setEditingHandoverId(null);
    setHandoverEditError(null);
  };

  const submitHandoverEditSave = async () => {
    if (!ep || editingHandoverId == null) return;
    const name = handoverEditTaskName.trim();
    if (!name) {
      setHandoverEditError("Enter a task or item name.");
      return;
    }
    if (name.length > 250) {
      setHandoverEditError("Task name must be 250 characters or less.");
      return;
    }
    if (handoverEditRemarks.length > 1000) {
      setHandoverEditError("Remarks must be 1000 characters or less.");
      return;
    }
    if (!handoverEditDateLocal.trim()) {
      setHandoverEditError("Choose a handover date and time.");
      return;
    }
    const handover_date = datetimeLocalToSqlDatetime(handoverEditDateLocal);
    if (!handover_date) {
      setHandoverEditError("Handover date is invalid.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setHandoverEditError("Sign in required.");
      return;
    }
    const orgIdNum = Number(orgId);
    if (!orgId || Number.isNaN(orgIdNum)) {
      setHandoverEditError("Invalid organization.");
      return;
    }
    setHandoverEditError(null);
    setHandoverEditSaving(true);
    try {
      await updateEmployeeExitProcessHandoverQuery(
        token,
        orgIdNum,
        ep.exit_process_id,
        ep.employee_id,
        editingHandoverId,
        {
          custom_task_name: name,
          remarks: handoverEditRemarks.trim() || null,
          handover_date,
        },
      );
      setEditingHandoverId(null);
      await load();
    } catch (e) {
      setHandoverEditError(
        e instanceof Error ? e.message : "Could not update handover query.",
      );
    } finally {
      setHandoverEditSaving(false);
    }
  };

  const toggleStatusPanel = (h: TeamMemberExitReportHandoverRow) => {
    if (h.handover_query_id == null) return;
    if (statusPanelHandoverId === h.handover_query_id) {
      setStatusPanelHandoverId(null);
      setStatusApplyError(null);
      return;
    }
    setEditingHandoverId(null);
    setHandoverEditError(null);
    setStatusApplyError(null);
    setStatusPanelHandoverId(h.handover_query_id);
    const cur = String(h.handover_status ?? "pending").toLowerCase();
    const next =
      HANDOVER_STATUS_OPTIONS.find((opt) => opt === cur) ?? "pending";
    setStatusSelectValue(next);
  };

  const submitStatusUpdateForHandover = async (
    h: TeamMemberExitReportHandoverRow,
  ) => {
    if (!ep || h.handover_query_id == null) return;
    const token = localStorage.getItem("token");
    if (!token) {
      setStatusApplyError("Sign in required.");
      return;
    }
    const orgIdNum = Number(orgId);
    if (!orgId || Number.isNaN(orgIdNum)) {
      setStatusApplyError("Invalid organization.");
      return;
    }
    setStatusApplyError(null);
    setStatusSaving(true);
    try {
      await updateEmployeeExitProcessHandoverQuery(
        token,
        orgIdNum,
        ep.exit_process_id,
        ep.employee_id,
        h.handover_query_id,
        { handover_status: statusSelectValue },
      );
      setStatusPanelHandoverId(null);
      await load();
    } catch (e) {
      setStatusApplyError(
        e instanceof Error ? e.message : "Could not update status.",
      );
    } finally {
      setStatusSaving(false);
    }
  };

  return (
    <div className="min-h-full bg-[#f4f6f9] pb-20">
      <div className="relative isolate overflow-hidden bg-[#0C123A] px-4 pb-12 pt-8 sm:px-8">
        <div className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-[#C99237]/15 blur-[100px]" />
        <div className="relative mx-auto max-w-4xl">
          <Link
            href={teamGroupHref}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#f5e9d4] transition hover:bg-white/15"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to team group
          </Link>
          <div className="mt-8 flex gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#C99237]/20 text-[#C99237] ring-1 ring-[#C99237]/35">
              <ShieldAlert className="h-7 w-7" aria-hidden />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C99237]/90">
                Exit process report
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {loading ? "Loading…" : ep?.employee_name ?? "Employee exit"}
              </h1>
              {ep?.employee_email ? (
                <p className="mt-2 text-sm text-slate-300">{ep.employee_email}</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-8">
        <div className="-mt-8 space-y-6">
          {error ? (
            <div className="rounded-[22px] border border-rose-200 bg-white px-6 py-10 shadow-lg ring-1 ring-slate-950/[0.04]">
              <p className="text-center text-rose-800">{error}</p>
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => void load()}
                  className="rounded-xl bg-[#0C123A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#121a4a]"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : null}

          {loading && !error ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-[22px] border border-slate-200 bg-white shadow-lg ring-1 ring-slate-950/[0.04]">
              <Loader2 className="h-9 w-9 animate-spin text-[#C99237]" />
              <p className="text-sm text-slate-600">Loading exit report…</p>
            </div>
          ) : null}

          {!loading && ep ? (
            <>
              <section className="overflow-hidden rounded-[22px] border border-slate-200/90 bg-white shadow-[0_12px_40px_-12px_rgba(15,23,42,0.12)] ring-1 ring-slate-950/[0.04]">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/90 px-5 py-4 sm:px-6">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-[#0C123A]">
                    <UserRound className="h-4 w-4 text-[#C99237]" />
                    Employee
                  </h2>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ${exitApplicationPill(ep.application_status)}`}>
                    {String(ep.application_status ?? "—").replace(/_/g, " ")}
                  </span>
                </header>
                <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-start sm:p-6">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0C123A] to-[#121a4a] text-xl font-bold text-[#C99237] shadow-inner ring-2 ring-[#C99237]/35">
                    {initialsFromName(ep.employee_name)}
                  </div>
                  <dl className="grid min-w-0 flex-1 gap-4 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Full name
                      </dt>
                      <dd className="mt-1 font-semibold text-slate-900">
                        {ep.employee_name ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <Building2 className="h-3 w-3" />
                        Team
                      </dt>
                      <dd className="mt-1 text-slate-900">
                        {ep.team_name ?? `Team #${ep.team_id ?? "—"}`}
                      </dd>
                    </div>
                    <div>
                      <dt className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <Mail className="h-3 w-3" />
                        Email
                      </dt>
                      <dd className="mt-1 break-all text-slate-800">
                        {ep.employee_email ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <Phone className="h-3 w-3" />
                        Phone
                      </dt>
                      <dd className="mt-1 text-slate-800">{ep.employee_phone ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <CalendarDays className="h-3 w-3" />
                        Team joining
                      </dt>
                      <dd className="mt-1 text-slate-800">
                        {fmtDateOnly(ep.team_joining_date)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Employee ID · Exit process ID
                      </dt>
                      <dd className="mt-1 font-mono text-xs text-slate-700">
                        {String(ep.employee_id)} · {String(ep.exit_process_id)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </section>

              <section className="overflow-hidden rounded-[22px] border border-slate-200/90 bg-white shadow-[0_12px_40px_-12px_rgba(15,23,42,0.12)] ring-1 ring-slate-950/[0.04]">
                <header className="border-b border-slate-100 bg-slate-50/90 px-5 py-4 sm:px-6">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-[#0C123A]">
                    <ClipboardList className="h-4 w-4 text-[#C99237]" />
                    Exit timeline
                  </h2>
                </header>
                <div className="space-y-4 p-5 sm:p-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <dl className="space-y-1 text-sm">
                      <dt className="text-xs font-semibold uppercase text-slate-500">
                        Action type
                      </dt>
                      <dd className="capitalize text-slate-900">{ep.action_type ?? "—"}</dd>
                    </dl>
                    <dl className="space-y-1 text-sm">
                      <dt className="text-xs font-semibold uppercase text-slate-500">
                        Last working day · Exit date
                      </dt>
                      <dd className="text-slate-900">
                        {fmtDateOnly(ep.last_working_day)} · {fmtDateOnly(ep.exit_date)}
                      </dd>
                    </dl>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Reason / context
                    </dt>
                    <dd className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                      {ep.action_reason?.trim() || "—"}
                    </dd>
                  </div>
                  {ep.response_message?.trim() ? (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                      <p className="text-xs font-semibold uppercase text-slate-500">
                        Response message
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                        {ep.response_message}
                      </p>
                    </div>
                  ) : null}
                  <dl className="grid gap-4 border-t border-slate-100 pt-4 text-xs text-slate-600 sm:grid-cols-2">
                    <div>
                      <dt className="font-semibold uppercase text-slate-500">Created</dt>
                      <dd className="mt-1">{fmtLong(ep.created_at)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold uppercase text-slate-500">Resolved</dt>
                      <dd className="mt-1">{fmtLong(ep.resolved_at)}</dd>
                    </div>
                  </dl>
                </div>
              </section>

              <section className="overflow-hidden rounded-[22px] border border-slate-200/90 bg-white shadow-[0_12px_40px_-12px_rgba(15,23,42,0.12)] ring-1 ring-slate-950/[0.04]">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/90 px-5 py-4 sm:px-6">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-teal-600" />
                    <h2 className="text-base font-semibold text-[#0C123A]">
                      Handover tasks ({hq.length})
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setHandoverFormOpen((o) => !o);
                      setHandoverFormError(null);
                      setEditingHandoverId(null);
                      setStatusPanelHandoverId(null);
                      setStatusApplyError(null);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-white px-3 py-2 text-xs font-semibold text-teal-800 shadow-sm transition hover:bg-teal-50"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    {handoverFormOpen ? "Cancel" : "Add handover query"}
                  </button>
                </header>
                <div className="p-4 sm:p-6">
                  {handoverFormOpen ? (
                    <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                      <p className="text-xs text-slate-600">
                        New items are saved with status{" "}
                        <span className="font-semibold text-slate-800">pending</span>.
                      </p>
                      <div className="mt-4 space-y-3">
                        <div>
                          <label
                            htmlFor="handover-task-name"
                            className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                          >
                            Task / item name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            id="handover-task-name"
                            type="text"
                            value={handoverTaskName}
                            maxLength={250}
                            onChange={(ev) =>
                              setHandoverTaskName(ev.target.value)
                            }
                            placeholder="e.g. Return laptop · Hand off project folder"
                            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-[#C99237]/0 transition focus:border-[#C99237]/50 focus:ring-2 focus:ring-[#C99237]/20"
                            required
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="handover-date"
                            className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                          >
                            Handover date <span className="text-rose-500">*</span>
                          </label>
                          <input
                            id="handover-date"
                            type="datetime-local"
                            value={handoverDateLocal}
                            onChange={(ev) =>
                              setHandoverDateLocal(ev.target.value)
                            }
                            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-[#C99237]/0 transition focus:border-[#C99237]/50 focus:ring-2 focus:ring-[#C99237]/20"
                            required
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="handover-remarks"
                            className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                          >
                            Remarks{" "}
                            <span className="font-normal normal-case text-slate-400">
                              (optional)
                            </span>
                          </label>
                          <textarea
                            id="handover-remarks"
                            value={handoverRemarks}
                            rows={3}
                            onChange={(ev) =>
                              setHandoverRemarks(ev.target.value)
                            }
                            placeholder="Notes for whoever completes this handover…"
                            className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-[#C99237]/0 transition focus:border-[#C99237]/50 focus:ring-2 focus:ring-[#C99237]/20"
                          />
                        </div>
                      </div>
                      {handoverFormError ? (
                        <p className="mt-3 text-xs font-medium text-rose-600">
                          {handoverFormError}
                        </p>
                      ) : null}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={handoverSubmitting}
                          onClick={() => void submitHandoverQuery()}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#0C123A] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#121a4a] disabled:pointer-events-none disabled:opacity-60"
                        >
                          {handoverSubmitting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Saving…
                            </>
                          ) : (
                            "Create handover query"
                          )}
                        </button>
                      </div>
                    </div>
                  ) : null}
                  <div className="divide-y divide-slate-100">
                  {hq.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500">
                      No handover tasks listed for this report.
                    </p>
                  ) : (
                    hq.map((h, idx) => {
                      const key =
                        h.handover_query_id != null
                          ? h.handover_query_id
                          : `hq-placeholder-${idx}`;
                      const canAct = h.handover_query_id != null;
                      const isEditing =
                        canAct && editingHandoverId === h.handover_query_id;
                      const statusOpen =
                        canAct && statusPanelHandoverId === h.handover_query_id;

                      return (
                        <div
                          key={key}
                          className="py-4 first:pt-0 last:pb-0"
                        >
                          {isEditing ? (
                            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Edit handover query
                              </p>
                              <div>
                                <label
                                  htmlFor={`edit-task-${h.handover_query_id}`}
                                  className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                                >
                                  Task / item name{" "}
                                  <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  id={`edit-task-${h.handover_query_id}`}
                                  type="text"
                                  value={handoverEditTaskName}
                                  maxLength={250}
                                  onChange={(ev) =>
                                    setHandoverEditTaskName(ev.target.value)
                                  }
                                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-[#C99237]/50 focus:ring-2 focus:ring-[#C99237]/20"
                                />
                              </div>
                              <div>
                                <label
                                  htmlFor={`edit-date-${h.handover_query_id}`}
                                  className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                                >
                                  Handover date{" "}
                                  <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  id={`edit-date-${h.handover_query_id}`}
                                  type="datetime-local"
                                  value={handoverEditDateLocal}
                                  onChange={(ev) =>
                                    setHandoverEditDateLocal(ev.target.value)
                                  }
                                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-[#C99237]/50 focus:ring-2 focus:ring-[#C99237]/20"
                                />
                              </div>
                              <div>
                                <label
                                  htmlFor={`edit-remarks-${h.handover_query_id}`}
                                  className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                                >
                                  Remarks
                                </label>
                                <textarea
                                  id={`edit-remarks-${h.handover_query_id}`}
                                  value={handoverEditRemarks}
                                  rows={3}
                                  maxLength={1000}
                                  onChange={(ev) =>
                                    setHandoverEditRemarks(ev.target.value)
                                  }
                                  className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-[#C99237]/50 focus:ring-2 focus:ring-[#C99237]/20"
                                />
                              </div>
                              {handoverEditError ? (
                                <p className="text-xs font-medium text-rose-600">
                                  {handoverEditError}
                                </p>
                              ) : null}
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  disabled={handoverEditSaving}
                                  onClick={() => void submitHandoverEditSave()}
                                  className="inline-flex items-center gap-2 rounded-xl bg-[#0C123A] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#121a4a] disabled:pointer-events-none disabled:opacity-60"
                                >
                                  {handoverEditSaving ? (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      Saving…
                                    </>
                                  ) : (
                                    "Save changes"
                                  )}
                                </button>
                                <button
                                  type="button"
                                  disabled={handoverEditSaving}
                                  onClick={cancelHandoverEdit}
                                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <p className="min-w-0 flex-1 font-semibold text-[#0C123A]">
                                  {h.custom_task_name?.trim()
                                    ? h.custom_task_name
                                    : h.asset_id != null
                                      ? `Asset #${h.asset_id}`
                                      : `Task #${
                                          h.handover_query_id ?? idx + 1
                                        }`}
                                </p>
                                <div className="flex shrink-0 flex-wrap items-center gap-2">
                                  {canAct ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => openHandoverEdit(h)}
                                        className="inline-flex rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-[#0C123A]"
                                        title="Edit details"
                                      >
                                        <Pencil className="h-4 w-4" aria-hidden />
                                        <span className="sr-only">
                                          Edit handover query
                                        </span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => toggleStatusPanel(h)}
                                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-sm transition ${
                                          statusOpen
                                            ? "border-teal-500 bg-teal-50 text-teal-900"
                                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                        }`}
                                        title="Change handover status"
                                      >
                                        <ListChecks
                                          className="h-3.5 w-3.5 shrink-0"
                                          aria-hidden
                                        />
                                        Status
                                      </button>
                                    </>
                                  ) : null}
                                  {h.handover_status ? (
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-700 ring-1 ring-slate-200">
                                      {String(h.handover_status).replace(
                                        /_/g,
                                        " ",
                                      )}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                              {statusOpen && canAct ? (
                                <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-3">
                                  <label
                                    htmlFor={`hq-status-${h.handover_query_id}`}
                                    className="block text-xs font-semibold uppercase tracking-wide text-teal-900"
                                  >
                                    Handover status
                                  </label>
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <select
                                      id={`hq-status-${h.handover_query_id}`}
                                      value={statusSelectValue}
                                      onChange={(ev) =>
                                        setStatusSelectValue(
                                          ev.target
                                            .value as EmployeeExitHandoverStatus,
                                        )
                                      }
                                      className="min-w-[10rem] flex-1 rounded-lg border border-teal-200/80 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-teal-400/40"
                                    >
                                      {HANDOVER_STATUS_OPTIONS.map((opt) => (
                                        <option key={opt} value={opt}>
                                          {opt.replace(/_/g, " ")}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      disabled={statusSaving}
                                      onClick={() =>
                                        void submitStatusUpdateForHandover(h)
                                      }
                                      className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:opacity-60"
                                    >
                                      {statusSaving ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        "Apply"
                                      )}
                                    </button>
                                  </div>
                                  {statusApplyError ? (
                                    <p className="mt-2 text-xs font-medium text-rose-700">
                                      {statusApplyError}
                                    </p>
                                  ) : null}
                                </div>
                              ) : null}
                              <p className="text-xs text-slate-600">
                                Due{" "}
                                <span className="font-medium">
                                  {fmtDateOnly(h.handover_date)}
                                </span>
                                {h.created_at ? (
                                  <span className="text-slate-400">
                                    {" "}
                                    · Logged {fmtLong(h.created_at)}
                                  </span>
                                ) : null}
                              </p>
                              {h.remarks?.trim() ? (
                                <p className="whitespace-pre-wrap text-sm text-slate-700">
                                  {h.remarks}
                                </p>
                              ) : null}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                  </div>
                </div>
              </section>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
