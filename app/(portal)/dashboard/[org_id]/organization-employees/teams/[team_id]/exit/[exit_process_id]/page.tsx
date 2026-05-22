"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  CheckCircle2,
  ClipboardList,
  Layers,
  Loader2,
  Package,
  PencilLine,
  ShieldAlert,
  UserRoundCog,
  UserRoundPlus,
} from "lucide-react";
import { getManagementEmployeesPage, type ManagementEmployeeRow } from "@/services/adminUser";
import {
  correctionEmployeeExitProcess,
  employeeExitCancelled,
  employeeExitCompleted,
  employeeExitMoveInProgress,
  fetchEmployeeExitProcessById,
  type EmployeeExitAssetRow,
  type EmployeeExitProcessDetail,
} from "@/services/employeeExit";

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
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function exitStatusPillClass(status: string) {
  const s = String(status).toLowerCase();
  if (s === "approved") {
    return "bg-emerald-50 text-emerald-800 ring-emerald-200/80";
  }
  if (s === "rejected") {
    return "bg-rose-50 text-rose-800 ring-rose-200/80";
  }
  if (s === "in_progress") {
    return "bg-sky-50 text-sky-800 ring-sky-200/80";
  }
  return "bg-amber-50 text-amber-800 ring-amber-200/80";
}

function truthyReturned(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  if (typeof v === "string") return /^(1|true|yes)$/i.test(v.trim());
  return false;
}

function toDateInputValue(iso: string | null | undefined): string {
  if (iso == null || iso === "") return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isTerminationAction(actionType: string | null | undefined): boolean {
  return String(actionType ?? "").trim().toLowerCase() === "termination";
}

function normalizeExitApplicationStatus(status: string | null | undefined): string {
  return String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

function isPendingExitStatus(status: string | null | undefined): boolean {
  return normalizeExitApplicationStatus(status) === "pending";
}

function isInProgressExitStatus(status: string | null | undefined): boolean {
  return normalizeExitApplicationStatus(status) === "in_progress";
}

/** Show assign / change custody on assets while exit is still open for handover (not closed out). */
function exitAllowsAssetCustodyActions(status: string | null | undefined): boolean {
  const n = normalizeExitApplicationStatus(status);
  return (
    n === "pending" ||
    n === "in_progress" ||
    n === "approved"
  );
}

function numericId(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v));
  return Number.isFinite(n) ? n : null;
}

/** Effective custodian (`returned_to_id`) whether saved on asset or picked locally before handover completes. */
function effectiveHandoverToUserId(
  asset: EmployeeExitAssetRow,
  pendingByAssetId: Record<number, number>,
): number | null {
  const fromDb = numericId(asset.returned_to_id);
  if (fromDb != null) return fromDb;
  const pending = pendingByAssetId[asset.id];
  return pending != null ? Number(pending) : null;
}

function pendingReturnAssets(assets: EmployeeExitAssetRow[] | undefined): EmployeeExitAssetRow[] {
  return (assets ?? []).filter((a) => !truthyReturned(a.is_returned));
}

export default function EmployeeExitDetailPage() {
  const params = useParams();
  const orgId = String(params?.org_id ?? "");
  const teamId = String(params?.team_id ?? "");
  const exitProcessId = String(params?.exit_process_id ?? "");

  const [data, setData] = useState<EmployeeExitProcessDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [corrReason, setCorrReason] = useState("");
  const [corrExitDate, setCorrExitDate] = useState("");
  const [corrLastDay, setCorrLastDay] = useState("");
  const [corrResponseMsg, setCorrResponseMsg] = useState("");
  const [corrBusy, setCorrBusy] = useState(false);
  const [corrModalError, setCorrModalError] = useState<string | null>(null);
  const [correctionSavedMsg, setCorrectionSavedMsg] = useState<string | null>(null);
  const [forwardBusy, setForwardBusy] = useState(false);
  const [forwardError, setForwardError] = useState<string | null>(null);

  /** Custodian picks per asset (pending or in-progress) applied on Move forward / kept for display. */
  const [pendingAssetHandover, setPendingAssetHandover] = useState<Record<number, number>>({});

  const [employeeLookup, setEmployeeLookup] = useState<Record<number, string>>({});

  const [assignPickerOpen, setAssignPickerOpen] = useState(false);
  const [assignForAssetId, setAssignForAssetId] = useState<number | null>(null);
  const [assignEmployees, setAssignEmployees] = useState<ManagementEmployeeRow[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignFetchError, setAssignFetchError] = useState<string | null>(null);
  const [assignSearch, setAssignSearch] = useState("");
  const [assignHandoverSaving, setAssignHandoverSaving] = useState(false);
  const [assignPersistError, setAssignPersistError] = useState<string | null>(null);

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectMessage, setRejectMessage] = useState("");
  const [rejectBusy, setRejectBusy] = useState(false);
  const [rejectModalError, setRejectModalError] = useState<string | null>(null);

  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approveMessage, setApproveMessage] = useState(
    "Exit approved. Asset handovers are complete.",
  );
  const [approveBusy, setApproveBusy] = useState(false);
  const [approveModalError, setApproveModalError] = useState<string | null>(null);

  const teamHref = `/dashboard/${orgId}/organization-employees/teams/${teamId}`;

  const reloadDetail = useCallback(async () => {
    if (!orgId || !exitProcessId) return;
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await fetchEmployeeExitProcessById(token, orgId, exitProcessId);
      setData(res.data ?? null);
    } catch {
      /* Keep current data if refresh fails */
    }
  }, [orgId, exitProcessId]);

  const load = useCallback(async () => {
    if (!orgId || !exitProcessId) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Sign in required.");
        setData(null);
        return;
      }
      const res = await fetchEmployeeExitProcessById(token, orgId, exitProcessId);
      setData(res.data ?? null);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "Could not load exit process.");
    } finally {
      setLoading(false);
    }
  }, [orgId, exitProcessId]);

  useEffect(() => {
    void load();
  }, [load]);

  const teamMismatch =
    data != null &&
    data.team_id != null &&
    String(data.team_id) !== String(teamId);

  const activePendingHandover =
    data != null && exitAllowsAssetCustodyActions(data.application_status)
      ? pendingAssetHandover
      : {};

  function openCorrectionModal() {
    if (!data) return;
    setCorrReason(data.action_reason ?? "");
    setCorrExitDate(toDateInputValue(data.exit_date));
    setCorrLastDay(toDateInputValue(data.last_working_day));
    setCorrResponseMsg(data.response_message ?? "");
    setCorrModalError(null);
    setCorrectionOpen(true);
  }

  async function handleCorrectionSubmit() {
    setCorrModalError(null);
    if (!corrReason.trim()) {
      setCorrModalError("Termination reason is required.");
      return;
    }
    if (corrExitDate && corrLastDay && new Date(corrExitDate) < new Date(corrLastDay)) {
      setCorrModalError("Exit date must be on or after the last working day.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setCorrModalError("Sign in required.");
      return;
    }
    setCorrBusy(true);
    try {
      await correctionEmployeeExitProcess(token, orgId, exitProcessId, {
        action_reason: corrReason.trim(),
        exit_date: corrExitDate.trim() || null,
        last_working_day: corrLastDay.trim() || null,
        response_message: corrResponseMsg.trim() || null,
      });
      setCorrectionOpen(false);
      setCorrectionSavedMsg("Corrections saved.");
      void reloadDetail();
      setTimeout(() => setCorrectionSavedMsg(null), 6000);
    } catch (e) {
      setCorrModalError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setCorrBusy(false);
    }
  }

  async function openEmployeePickerForAsset(assetId: number) {
    setAssignForAssetId(assetId);
    setAssignPickerOpen(true);
    setAssignSearch("");
    setAssignFetchError(null);
    setAssignPersistError(null);
    const token = localStorage.getItem("token");
    if (!token) {
      setAssignFetchError("Sign in required.");
      return;
    }
    setAssignLoading(true);
    try {
      const res = await getManagementEmployeesPage(token, orgId, 1, 500);
      const exitingId = data?.employee_id != null ? String(data.employee_id) : null;
      const rows = exitingId
        ? res.data.filter((row) => String(row.user_id) !== exitingId)
        : res.data;
      setAssignEmployees(rows);

      setEmployeeLookup((prev) => {
        const next = { ...prev };
        for (const r of res.data) {
          const uid = numericId(r.user_id);
          if (uid != null && r.user_name) next[uid] = r.user_name;
        }
        return next;
      });
    } catch (e) {
      setAssignFetchError(e instanceof Error ? e.message : "Could not load employees.");
    } finally {
      setAssignLoading(false);
    }
  }

  async function assignCustodian(userId: number) {
    if (assignForAssetId == null || !data) return;
    const assetId = assignForAssetId;

    if (isInProgressExitStatus(data.application_status)) {
      const token = localStorage.getItem("token");
      if (!token) {
        setAssignPersistError("Sign in required.");
        return;
      }
      setAssignPersistError(null);
      setAssignHandoverSaving(true);
      try {
        await employeeExitMoveInProgress(token, orgId, exitProcessId, {
          application_status: "in_progress",
          assets_handover_data: [{ asset_id: assetId, handover_to: userId }],
        });
        setPendingAssetHandover((prev) => {
          const next = { ...prev };
          delete next[assetId];
          return next;
        });
        setAssignPickerOpen(false);
        setAssignForAssetId(null);
        setCorrectionSavedMsg("Asset handover saved.");
        void reloadDetail();
        setTimeout(() => setCorrectionSavedMsg(null), 6000);
      } catch (e) {
        setAssignPersistError(
          e instanceof Error ? e.message : "Could not save asset handover.",
        );
      } finally {
        setAssignHandoverSaving(false);
      }
      return;
    }

    setPendingAssetHandover((prev) => ({ ...prev, [assetId]: userId }));
    setAssignPickerOpen(false);
    setAssignForAssetId(null);
  }

  function assigneeDisplayName(asset: EmployeeExitAssetRow): string | null {
    const uid = effectiveHandoverToUserId(asset, activePendingHandover);
    if (uid == null) return null;
    const matchesDbReturned =
      numericId(asset.returned_to_id) === uid && asset.returned_to_name?.trim();
    if (matchesDbReturned) return asset.returned_to_name!;
    return employeeLookup[uid] ?? null;
  }

  async function handleMoveForward() {
    setForwardError(null);
    if (!data) return;
    const token = localStorage.getItem("token");
    if (!token) {
      setForwardError("Sign in required.");
      return;
    }
    const pendingAssets = pendingReturnAssets(data.employee_assets);
    const allHaveCustodian = pendingAssets.every(
      (a) => effectiveHandoverToUserId(a, activePendingHandover) != null,
    );
    if (!allHaveCustodian) {
      setForwardError("Assign every outstanding asset before moving forward.");
      return;
    }

    const assets_handover_data = pendingAssets.map((a) => ({
      asset_id: a.id,
      handover_to: effectiveHandoverToUserId(a, activePendingHandover)!,
    }));

    setForwardBusy(true);
    try {
      await employeeExitMoveInProgress(token, orgId, exitProcessId, {
        application_status: "in_progress",
        assets_handover_data,
      });
      setPendingAssetHandover({});
      setCorrectionSavedMsg("Exit moved to in progress.");
      void reloadDetail();
      setTimeout(() => setCorrectionSavedMsg(null), 6000);
    } catch (e) {
      setForwardError(e instanceof Error ? e.message : "Could not update status.");
    } finally {
      setForwardBusy(false);
    }
  }

  async function handleRejectSubmit() {
    setRejectModalError(null);
    if (!data) return;
    if (!rejectMessage.trim()) {
      setRejectModalError("A rejection message is required.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setRejectModalError("Sign in required.");
      return;
    }
    setRejectBusy(true);
    try {
      await employeeExitCancelled(token, orgId, exitProcessId, {
        application_status: "rejected",
        employee_id: data.employee_id,
        response_message: rejectMessage.trim(),
      });
      setRejectModalOpen(false);
      setRejectMessage("");
      setCorrectionSavedMsg("Exit application rejected.");
      void reloadDetail();
      setTimeout(() => setCorrectionSavedMsg(null), 6000);
    } catch (e) {
      setRejectModalError(e instanceof Error ? e.message : "Rejection failed.");
    } finally {
      setRejectBusy(false);
    }
  }

  async function handleApproveSubmit() {
    setApproveModalError(null);
    if (!data) return;
    if (!approveMessage.trim()) {
      setApproveModalError("A completion message is required.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setApproveModalError("Sign in required.");
      return;
    }
    setApproveBusy(true);
    try {
      await employeeExitCompleted(token, orgId, exitProcessId, {
        application_status: "handover_completed",
        employee_id: data.employee_id,
        response_message: approveMessage.trim(),
      });
      setApproveModalOpen(false);
      setApproveMessage("Exit approved. Asset handovers are complete.");
      setCorrectionSavedMsg("Exit process completed.");
      void reloadDetail();
      setTimeout(() => setCorrectionSavedMsg(null), 6000);
    } catch (e) {
      setApproveModalError(e instanceof Error ? e.message : "Approval failed.");
    } finally {
      setApproveBusy(false);
    }
  }

  function openRejectModal() {
    setRejectMessage("");
    setRejectModalError(null);
    setRejectModalOpen(true);
  }

  function openApproveModal() {
    setApproveModalError(null);
    if (!approveMessage.trim()) {
      setApproveMessage("Exit approved. Asset handovers are complete.");
    }
    setApproveModalOpen(true);
  }

  const moveForwardDisabled =
    forwardBusy ||
    !data ||
    !isPendingExitStatus(data.application_status) ||
    !pendingReturnAssets(data.employee_assets).every(
      (a) => effectiveHandoverToUserId(a, activePendingHandover) != null,
    );

  const assignModalFilteredEmployees = assignEmployees.filter((row) => {
    const q = assignSearch.trim().toLowerCase();
    if (!q) return true;
    const name = String(row.user_name ?? "").toLowerCase();
    const email = String(row.user_email ?? "").toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  return (
    <div className="min-h-full bg-[#f4f6f9] pb-20">
      <div className="relative isolate overflow-hidden bg-slate-950 px-4 pb-12 pt-8 sm:px-8">
        <div className="pointer-events-none absolute -left-20 top-0 h-72 w-72 rounded-full bg-teal-500/20 blur-[90px]" />

        <div className="relative mx-auto max-w-4xl">
          <Link
            href={teamHref}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-teal-100 transition hover:bg-white/15"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to team
          </Link>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur">
                <ShieldAlert className="h-6 w-6 text-rose-300" aria-hidden />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-300/90">
                  Exit detail
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  {!data && loading
                    ? "Loading…"
                    : data?.employee_name ?? `Exit #${exitProcessId}`}
                </h1>
                {data ? (
                  <p className="mt-2 text-sm text-slate-400">{data.employee_email}</p>
                ) : null}
              </div>
            </div>
            {data ? (
              <div className="flex flex-shrink-0 flex-col items-stretch gap-2 sm:items-end">
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                  {isPendingExitStatus(data.application_status) ? (
                    <>
                      <button
                        type="button"
                        disabled={moveForwardDisabled}
                        title={
                          moveForwardDisabled && !forwardBusy
                            ? "Assign custody for every outstanding asset before moving forward."
                            : undefined
                        }
                        onClick={() => void handleMoveForward()}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-xs font-semibold tracking-wide text-white shadow-sm transition hover:bg-teal-400 disabled:opacity-50"
                      >
                        {forwardBusy ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                            Moving…
                          </>
                        ) : (
                          <>
                            <ArrowRight className="h-4 w-4" aria-hidden />
                            Move forward
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={rejectBusy}
                        onClick={openRejectModal}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-300/50 bg-rose-500/15 px-4 py-2 text-xs font-semibold tracking-wide text-rose-100 shadow-sm transition hover:bg-rose-500/25 disabled:opacity-50"
                      >
                        <Ban className="h-4 w-4" aria-hidden />
                        Reject application
                      </button>
                    </>
                  ) : null}
                  {isInProgressExitStatus(data.application_status) ? (
                    <button
                      type="button"
                      disabled={approveBusy}
                      onClick={openApproveModal}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300/50 bg-emerald-500/20 px-4 py-2 text-xs font-semibold tracking-wide text-emerald-100 shadow-sm transition hover:bg-emerald-500/30 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" aria-hidden />
                      Approve application
                    </button>
                  ) : null}
                  {isTerminationAction(data.action_type) ? (
                    <button
                      type="button"
                      onClick={openCorrectionModal}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold tracking-wide text-white backdrop-blur-sm transition hover:bg-white/20"
                    >
                      <PencilLine className="h-4 w-4 text-teal-200" aria-hidden />
                      Edit correction
                    </button>
                  ) : null}
                </div>
                {forwardError ? (
                  <p className="max-w-sm text-right text-xs text-rose-200">{forwardError}</p>
                ) : null}
                <span
                  className={`inline-flex self-end rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ${exitStatusPillClass(
                    data.application_status,
                  )}`}
                >
                  {String(data.application_status).replace(/_/g, " ")}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-8">
        <div className="-mt-6">

          {correctionSavedMsg ? (
            <div className="mb-6 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-950">
              {correctionSavedMsg}
            </div>
          ) : null}

          {teamMismatch ? (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              This record is linked to a different team in the organization than the URL
              you opened. You still have full details below.
            </div>
          ) : null}

          {loading ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-[22px] border border-slate-200 bg-white shadow-lg">
              <Loader2 className="h-9 w-9 animate-spin text-teal-600" />
              <p className="text-sm text-slate-600">Loading exit process…</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-white px-6 py-12 text-center shadow-lg">
              <p className="text-rose-800">{error}</p>
              <button
                type="button"
                onClick={() => void load()}
                className="mt-4 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
              >
                Retry
              </button>
            </div>
          ) : !data ? (
            <p className="text-slate-600">No data.</p>
          ) : (
            <div className="space-y-6">
              <section className="overflow-hidden rounded-[22px] border border-slate-200/90 bg-white shadow-[0_12px_40px_-12px_rgba(15,23,42,0.12)] ring-1 ring-slate-950/[0.04]">
                <header className="border-b border-slate-100 bg-slate-50/80 px-5 py-4 sm:px-6">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                    <ClipboardList className="h-4 w-4 text-teal-600" />
                    Overview
                  </h2>
                </header>
                <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
                  <dl className="space-y-3 text-sm">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Action type
                      </dt>
                      <dd className="mt-0.5 capitalize text-slate-900">{data.action_type}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Team
                      </dt>
                      <dd className="mt-0.5 text-slate-900">
                        {data.team_name ?? `Team #${data.team_id ?? "—"}`}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Last working day
                      </dt>
                      <dd className="mt-0.5 text-slate-900">
                        {fmtDateOnly(data.last_working_day)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Exit date
                      </dt>
                      <dd className="mt-0.5 text-slate-900">{fmtDateOnly(data.exit_date)}</dd>
                    </div>
                  </dl>
                  <dl className="space-y-3 text-sm">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Opened by
                      </dt>
                      <dd className="mt-0.5 text-slate-900">
                        {data.action_performed_by_name ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Response by
                      </dt>
                      <dd className="mt-0.5 text-slate-900">{data.response_by_name ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Resolved at
                      </dt>
                      <dd className="mt-0.5 text-slate-900">{fmtLong(data.resolved_at)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Created / Updated
                      </dt>
                      <dd className="mt-0.5 text-xs leading-relaxed text-slate-700">
                        {fmtLong(data.created_at)} · {fmtLong(data.updated_at)}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="border-t border-slate-100 px-5 py-4 sm:px-6">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Reason &amp; response
                  </h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                    {data.action_reason?.trim() || "—"}
                  </p>
                  {data.response_message?.trim() ? (
                    <>
                      <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Response message
                      </h3>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                        {data.response_message}
                      </p>
                    </>
                  ) : null}
                </div>
              </section>

              <section className="overflow-hidden rounded-[22px] border border-slate-200/90 bg-white shadow-[0_12px_40px_-12px_rgba(15,23,42,0.12)] ring-1 ring-slate-950/[0.04]">
                <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-4 sm:px-6">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                    <Package className="h-4 w-4 text-indigo-500" />
                    Employee assets ({data.employee_assets?.length ?? 0})
                  </h2>
                </header>
                <div className="divide-y divide-slate-100 p-4 sm:p-6">
                  {data.employee_assets?.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-500">No assets on file.</p>
                  ) : (
                    data.employee_assets?.map((a) => {
                      const assetReturned = truthyReturned(a.is_returned);
                      /** Not returned assets can get assign / change while exit is pending or in progress */
                      const showCustodyButton =
                        exitAllowsAssetCustodyActions(data.application_status) && !assetReturned;

                      const returnedToIdNumeric = numericId(a.returned_to_id);
                      const pickedLocallyWhilePending =
                        activePendingHandover[a.id] !== undefined &&
                        activePendingHandover[a.id] !== null;

                      /** Someone assigned: saved on row or picked in UI before Move forward */
                      const hasAssignee =
                        returnedToIdNumeric != null || pickedLocallyWhilePending;

                      const custodyLabel =
                        hasAssignee && assigneeDisplayName(a) != null
                          ? assigneeDisplayName(a)
                          : hasAssignee
                            ? `User #${effectiveHandoverToUserId(a, activePendingHandover) ?? "?"}`
                            : null;

                      return (
                        <div key={a.id} className="py-4 first:pt-0 last:pb-0">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <p className="font-semibold text-slate-900">{a.asset_name ?? `#${a.id}`}</p>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${
                                assetReturned
                                  ? "bg-emerald-50 text-emerald-800 ring-emerald-200/80"
                                  : "bg-slate-100 text-slate-700 ring-slate-200"
                              }`}
                            >
                              {assetReturned ? "Returned" : "Not returned"}
                            </span>
                          </div>
                          {a.asset_summary ? (
                            <p className="mt-1 text-xs text-slate-600">{a.asset_summary}</p>
                          ) : null}
                          <dl className="mt-3 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
                            <div>
                              Type:{" "}
                              <span className="font-medium text-slate-800">{a.asset_type ?? "—"}</span>
                            </div>
                            <div>
                              Custodian when returned:{" "}
                              <span className="font-medium text-slate-800">
                                {assetReturned
                                  ? (a.returned_to_name ?? "—")
                                  : (custodyLabel ?? "Not assigned")}
                              </span>
                            </div>
                            <div className="sm:col-span-2">
                              Handover:{" "}
                              <span className="font-medium text-slate-800">
                                {fmtLong(a.handover_date_time)}
                              </span>
                            </div>
                          </dl>
                          {showCustodyButton ? (
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => void openEmployeePickerForAsset(a.id)}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
                              >
                                {hasAssignee ? (
                                  <>
                                    <UserRoundCog className="h-4 w-4 text-indigo-600" aria-hidden />
                                    Change user
                                  </>
                                ) : (
                                  <>
                                    <UserRoundPlus className="h-4 w-4 text-indigo-600" aria-hidden />
                                    Assign to user
                                  </>
                                )}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              <section className="overflow-hidden rounded-[22px] border border-slate-200/90 bg-white shadow-[0_12px_40px_-12px_rgba(15,23,42,0.12)] ring-1 ring-slate-950/[0.04]">
                <header className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-5 py-4 sm:px-6">
                  <Layers className="h-4 w-4 text-teal-600" />
                  <h2 className="text-base font-semibold text-slate-900">
                    Handover tasks ({data.handover_queries?.length ?? 0})
                  </h2>
                </header>
                <div className="divide-y divide-slate-100 p-4 sm:p-6">
                  {data.handover_queries?.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-500">
                      No handover queries.
                    </p>
                  ) : (
                    data.handover_queries?.map((h) => (
                      <div
                        key={h.handover_query_id}
                        className="space-y-2 py-4 first:pt-0 last:pb-0"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-slate-900">
                            {h.custom_task_name?.trim()
                              ? h.custom_task_name
                              : (h.asset_name ?? `Task #${h.handover_query_id}`)}
                          </p>
                          {h.handover_status ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-700 ring-1 ring-slate-200">
                              {String(h.handover_status).replace(/_/g, " ")}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-slate-600">
                          Manager: {h.manager_name ?? "—"} · Due:{" "}
                          <span className="font-medium">{fmtDateOnly(h.handover_date)}</span>
                        </p>
                        {h.remarks?.trim() ? (
                          <p className="whitespace-pre-wrap text-sm text-slate-700">{h.remarks}</p>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>

      {correctionOpen ? (
        <div
          className="fixed inset-0 z-[1100] flex items-end justify-center bg-slate-950/60 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="correction-dialog-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close"
            disabled={corrBusy}
            onClick={() => !corrBusy && setCorrectionOpen(false)}
          />
          <div className="relative max-h-[92vh] w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div
              className="border-b border-slate-100 px-5 py-4"
              style={{ borderTop: "3px solid #0d9488" }}
            >
              <h2
                id="correction-dialog-title"
                className="text-lg font-bold tracking-tight text-slate-900"
              >
                Correct termination
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Adjust termination reason, dates, or response message for this record.
              </p>
            </div>
            <div className="max-h-[min(65vh,560px)] space-y-4 overflow-y-auto px-5 py-4">
              {corrModalError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
                  {corrModalError}
                </div>
              ) : null}
              <div>
                <label
                  htmlFor="corr-reason"
                  className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Termination reason
                </label>
                <textarea
                  id="corr-reason"
                  rows={4}
                  value={corrReason}
                  onChange={(e) => setCorrReason(e.target.value)}
                  className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500/25"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="corr-last-day"
                    className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Last working day
                  </label>
                  <input
                    id="corr-last-day"
                    type="date"
                    value={corrLastDay}
                    onChange={(e) => setCorrLastDay(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500/25"
                  />
                </div>
                <div>
                  <label
                    htmlFor="corr-exit-date"
                    className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Exit date
                  </label>
                  <input
                    id="corr-exit-date"
                    type="date"
                    value={corrExitDate}
                    onChange={(e) => setCorrExitDate(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500/25"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="corr-response"
                  className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Response message
                </label>
                <textarea
                  id="corr-response"
                  rows={3}
                  value={corrResponseMsg}
                  onChange={(e) => setCorrResponseMsg(e.target.value)}
                  placeholder="Optional notes shown on the record…"
                  className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500/25"
                />
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50/90 px-5 py-3">
              <button
                type="button"
                disabled={corrBusy}
                onClick={() => setCorrectionOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={corrBusy}
                onClick={() => void handleCorrectionSubmit()}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {corrBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Saving…
                  </>
                ) : (
                  <>
                    <PencilLine className="h-4 w-4" aria-hidden />
                    Save correction
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {assignPickerOpen ? (
        <div
          className="fixed inset-0 z-[1150] flex items-end justify-center bg-slate-950/60 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="assign-picker-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close assign picker"
            disabled={assignHandoverSaving}
            onClick={() => {
              if (assignHandoverSaving) return;
              setAssignPickerOpen(false);
              setAssignForAssetId(null);
            }}
          />
          <div className="relative max-h-[92vh] w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div
              className="border-b border-slate-100 px-5 py-4"
              style={{ borderTop: "3px solid #4f46e5" }}
            >
              <h2
                id="assign-picker-title"
                className="text-lg font-bold tracking-tight text-slate-900"
              >
                Assign custody
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Pick an organization member. When you choose Move forward, the client posts{" "}
                <code className="rounded bg-slate-100 px-1 font-mono text-[11px] text-indigo-900">
                  assets_handover_data: [{`{ asset_id, handover_to }`}]
                </code>
                .
              </p>
            </div>
            <div className="space-y-3 border-b border-slate-100 px-5 py-3">
              <input
                type="search"
                value={assignSearch}
                onChange={(e) => setAssignSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/25"
              />
            </div>
            <div className="max-h-[min(55vh,480px)] space-y-2 overflow-y-auto px-5 py-4">
              {assignPersistError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
                  {assignPersistError}
                </div>
              ) : null}
              {assignFetchError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
                  {assignFetchError}
                </div>
              ) : null}
              {assignLoading ? (
                <div className="flex flex-col items-center gap-3 py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                  <p className="text-sm text-slate-600">Loading organization members…</p>
                </div>
              ) : assignHandoverSaving ? (
                <div className="flex flex-col items-center gap-3 py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                  <p className="text-sm text-slate-600">Saving handover…</p>
                </div>
              ) : assignModalFilteredEmployees.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  No members match your search.
                </p>
              ) : (
                assignModalFilteredEmployees.map((row) => {
                  const uid = numericId(row.user_id);
                  if (uid == null) return null;
                  return (
                    <div
                      key={String(row.user_id)}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {row.user_name ?? `User #${row.user_id}`}
                        </p>
                        <p className="truncate text-xs text-slate-600">{row.user_email ?? "—"}</p>
                      </div>
                      <button
                        type="button"
                        disabled={assignHandoverSaving}
                        onClick={() => void assignCustodian(uid)}
                        className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        Assign
                      </button>
                    </div>
                  );
                })
              )}
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50/90 px-5 py-3">
              <button
                type="button"
                disabled={assignHandoverSaving}
                onClick={() => {
                  setAssignPickerOpen(false);
                  setAssignForAssetId(null);
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {rejectModalOpen ? (
        <div
          className="fixed inset-0 z-[1140] flex items-end justify-center bg-slate-950/60 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-exit-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close"
            disabled={rejectBusy}
            onClick={() => !rejectBusy && setRejectModalOpen(false)}
          />
          <div className="relative max-h-[92vh] w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div
              className="border-b border-slate-100 px-5 py-4"
              style={{ borderTop: "3px solid #fb7185" }}
            >
              <h2 id="reject-exit-title" className="text-lg font-bold tracking-tight text-slate-900">
                Reject application
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Sends <span className="font-mono text-xs">application_status: rejected</span> with your
                message and exits this flow.
              </p>
            </div>
            <div className="space-y-4 px-5 py-4">
              {rejectModalError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
                  {rejectModalError}
                </div>
              ) : null}
              <div>
                <label
                  htmlFor="reject-msg"
                  className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Response message / reason
                </label>
                <textarea
                  id="reject-msg"
                  rows={4}
                  value={rejectMessage}
                  onChange={(e) => setRejectMessage(e.target.value)}
                  placeholder="Explain why this exit cannot proceed…"
                  className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-rose-500/25"
                />
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50/90 px-5 py-3">
              <button
                type="button"
                disabled={rejectBusy}
                onClick={() => setRejectModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rejectBusy}
                onClick={() => void handleRejectSubmit()}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {rejectBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Rejecting…
                  </>
                ) : (
                  <>
                    <Ban className="h-4 w-4" aria-hidden />
                    Confirm rejection
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {approveModalOpen ? (
        <div
          className="fixed inset-0 z-[1140] flex items-end justify-center bg-slate-950/60 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="approve-exit-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close"
            disabled={approveBusy}
            onClick={() => !approveBusy && setApproveModalOpen(false)}
          />
          <div className="relative max-h-[92vh] w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div
              className="border-b border-slate-100 px-5 py-4"
              style={{ borderTop: "3px solid #10b981" }}
            >
              <h2
                id="approve-exit-title"
                className="text-lg font-bold tracking-tight text-slate-900"
              >
                Approve application
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Calls exit completion with{" "}
                <span className="font-mono text-xs">application_status: handover_completed</span> after
                server checks assets and handover tasks.
              </p>
            </div>
            <div className="space-y-4 px-5 py-4">
              {approveModalError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
                  {approveModalError}
                </div>
              ) : null}
              <div>
                <label
                  htmlFor="approve-msg"
                  className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Response message
                </label>
                <textarea
                  id="approve-msg"
                  rows={4}
                  value={approveMessage}
                  onChange={(e) => setApproveMessage(e.target.value)}
                  className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/25"
                />
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50/90 px-5 py-3">
              <button
                type="button"
                disabled={approveBusy}
                onClick={() => setApproveModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={approveBusy}
                onClick={() => void handleApproveSubmit()}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {approveBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Approving…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                    Confirm approval
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
