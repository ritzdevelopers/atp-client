"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  CalendarCheck,
  ChevronLeft,
  Clock,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  deleteCompOff,
  fetchMyCompOffs,
  updateCompOffInfo,
  type CompOffRow,
} from "@/services/compoff";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "approved") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (s === "rejected") return "bg-rose-50 text-rose-700 ring-rose-200";
  return "bg-amber-50 text-amber-700 ring-amber-200";
}

function workStatusLabel(status: string): string {
  if (status === "full_day") return "Full day";
  if (status === "half_day") return "Half day";
  return status.replace(/_/g, " ");
}

function formatTimeValue(value: string | null | undefined): string {
  if (!value) return "—";
  return value.slice(0, 5);
}

export default function MyCompOffWorkspace() {
  const params = useParams();
  const orgIdParam = String(params?.org_id ?? "");
  const orgId = Number(orgIdParam);
  const homeHref = `/user-dashboard/${encodeURIComponent(orgIdParam)}/home`;
  const applyHref = `/user-dashboard/${encodeURIComponent(orgIdParam)}/comp-off/apply`;

  const [requests, setRequests] = useState<CompOffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [deleteTarget, setDeleteTarget] = useState<CompOffRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editTarget, setEditTarget] = useState<CompOffRow | null>(null);
  const [editReason, setEditReason] = useState("");
  const [saving, setSaving] = useState(false);

  const loadRequests = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Not signed in.");
      setRequests([]);
      return;
    }
    if (Number.isNaN(orgId)) {
      setError("Invalid organization.");
      setRequests([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchMyCompOffs(token, orgId);
      setRequests(rows);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load comp off requests",
      );
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const filteredRequests = useMemo(() => {
    if (statusFilter === "all") return requests;
    return requests.filter(
      (row) => String(row.query_status).toLowerCase() === statusFilter,
    );
  }, [requests, statusFilter]);

  const pendingCount = useMemo(
    () =>
      requests.filter((r) => String(r.query_status).toLowerCase() === "pending")
        .length,
    [requests],
  );

  async function confirmDelete() {
    if (!deleteTarget) return;
    const token = localStorage.getItem("token");
    if (!token || Number.isNaN(orgId)) return;
    setDeleting(true);
    try {
      await deleteCompOff(token, orgId, deleteTarget.id);
      setDeleteTarget(null);
      await loadRequests();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not delete comp off request",
      );
    } finally {
      setDeleting(false);
    }
  }

  function openEdit(row: CompOffRow) {
    setEditTarget(row);
    setEditReason(row.reason ?? "");
  }

  async function confirmEdit() {
    if (!editTarget) return;
    const token = localStorage.getItem("token");
    if (!token || Number.isNaN(orgId)) return;
    const trimmed = editReason.trim();
    if (!trimmed) {
      setError("Reason cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      await updateCompOffInfo(token, orgId, editTarget.id, { reason: trimmed });
      setEditTarget(null);
      await loadRequests();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not update comp off request",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-full bg-slate-50/80">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link
            href={homeHref}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold text-slate-900">
              Comp off
            </h1>
            <p className="text-xs text-slate-500">
              Track and manage your comp off requests
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadRequests()}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            aria-label="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="mx-auto max-w-5xl border-t border-slate-100 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              Apply for comp off on dates you have already worked (attendance on
              file).
            </p>
            <Link
              href={applyHref}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
            >
              <Plus className="h-4 w-4" />
              Apply comp off
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-4 px-4 py-4 pb-24 lg:pb-6">
        {error ? (
          <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {(["all", "pending", "approved", "rejected"] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize ring-1 ring-inset transition ${
                statusFilter === status
                  ? "bg-teal-600 text-white ring-teal-600"
                  : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {status}
              {status === "pending" && pendingCount > 0 ? (
                <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
                  {pendingCount}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
            <CalendarCheck className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-800">
              No comp off requests
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {statusFilter === "all"
                ? "Submit your first comp off request to get started."
                : `No ${statusFilter} requests found.`}
            </p>
            {statusFilter === "all" ? (
              <Link
                href={applyHref}
                className="mt-4 inline-flex rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
              >
                Apply comp off
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map((row) => {
              const status = String(row.query_status).toLowerCase();
              const canDelete = status === "pending" || status === "rejected";
              const canEdit = status === "pending";
              return (
                <article
                  key={row.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {formatDate(row.compoff_date)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {workStatusLabel(row.work_status)} comp off
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ring-1 ring-inset ${statusBadgeClass(status)}`}
                    >
                      {row.query_status}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-700">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-emerald-600" />
                      In {formatTimeValue(row.check_in)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-rose-600" />
                      Out {formatTimeValue(row.check_out)}
                    </span>
                  </div>

                  <p className="mt-2 line-clamp-3 text-xs text-slate-500">
                    {row.reason}
                  </p>

                  {row.reporting_manager_name ? (
                    <p className="mt-2 text-[11px] text-slate-400">
                      Manager: {row.reporting_manager_name}
                    </p>
                  ) : null}

                  {row.review_comment ? (
                    <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      <span className="font-medium">Review: </span>
                      {row.review_comment}
                    </p>
                  ) : null}

                  {canEdit || canDelete ? (
                    <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit reason
                        </button>
                      ) : null}
                      {canDelete ? (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(row)}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">
              Delete request?
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              This will remove your comp off request for{" "}
              {formatDate(deleteTarget.compoff_date)}.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={deleting}
                className="flex-1 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editTarget ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">
              Edit reason
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {formatDate(editTarget.compoff_date)} — punches cannot be changed
              here.
            </p>
            <textarea
              rows={3}
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                disabled={saving}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmEdit()}
                disabled={saving}
                className="flex-1 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
