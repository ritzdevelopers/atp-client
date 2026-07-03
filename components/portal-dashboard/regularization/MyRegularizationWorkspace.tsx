"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  ChevronLeft,
  Clock,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
} from "lucide-react";
import {
  deleteRegularization,
  fetchMyRegularization,
  fetchMyRegularizationBalance,
  type RegularizationBalance,
  type RegularizationRow,
} from "@/services/regularization";

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

function requestTypeLabel(type: string): string {
  if (type === "check_in") return "Check-in";
  if (type === "check_out") return "Check-out";
  if (type === "both") return "Check-in & check-out";
  return type.replace(/_/g, " ");
}

function statusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "approved") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (s === "rejected") return "bg-rose-50 text-rose-700 ring-rose-200";
  return "bg-amber-50 text-amber-700 ring-amber-200";
}

function formatTimeValue(value: string | null | undefined): string {
  if (!value) return "—";
  return value.slice(0, 5);
}

export default function MyRegularizationWorkspace() {
  const params = useParams();
  const orgIdParam = String(params?.org_id ?? "");
  const orgId = Number(orgIdParam);
  const homeHref = `/user-dashboard/${encodeURIComponent(orgIdParam)}/home`;
  const applyHref = `/user-dashboard/${encodeURIComponent(orgIdParam)}/regularization/apply`;

  const [requests, setRequests] = useState<RegularizationRow[]>([]);
  const [balance, setBalance] = useState<RegularizationBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [deleteTarget, setDeleteTarget] = useState<RegularizationRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadBalance = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token || Number.isNaN(orgId)) {
      setBalance(null);
      setBalanceLoading(false);
      return;
    }
    setBalanceLoading(true);
    try {
      const data = await fetchMyRegularizationBalance(token, orgId);
      setBalance(data);
    } catch {
      setBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  }, [orgId]);

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
      const rows = await fetchMyRegularization(token, orgId);
      setRequests(rows);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load regularization requests",
      );
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadRequests(), loadBalance()]);
  }, [loadRequests, loadBalance]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const filteredRequests = useMemo(() => {
    if (statusFilter === "all") return requests;
    return requests.filter(
      (row) => String(row.reg_status).toLowerCase() === statusFilter,
    );
  }, [requests, statusFilter]);

  const pendingCount = useMemo(
    () =>
      requests.filter((r) => String(r.reg_status).toLowerCase() === "pending")
        .length,
    [requests],
  );

  async function confirmDelete() {
    if (!deleteTarget) return;
    const token = localStorage.getItem("token");
    if (!token || Number.isNaN(orgId)) return;
    setDeleting(true);
    try {
      await deleteRegularization(token, orgId, deleteTarget.id);
      setDeleteTarget(null);
      await refreshAll();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not delete regularization request",
      );
    } finally {
      setDeleting(false);
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
              Regularization
            </h1>
            <p className="text-xs text-slate-500">
              Track and manage attendance regularization requests
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refreshAll()}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            aria-label="Refresh"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading || balanceLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        <div className="mx-auto max-w-5xl border-t border-slate-100 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700/80">
                This month&apos;s balance
              </p>
              {balanceLoading ? (
                <div className="mt-1 flex items-center gap-2 text-sm text-indigo-800">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Loading…
                </div>
              ) : balance ? (
                <div className="mt-1">
                  <p className="text-xl font-bold tabular-nums text-indigo-900">
                    {balance.remaining}
                    <span className="ml-1 text-sm font-medium text-indigo-700">
                      of {balance.balance} left
                    </span>
                  </p>
                  {balance.valid_from && balance.valid_to ? (
                    <p className="text-[11px] text-indigo-700/80">
                      Valid {balance.valid_from} – {balance.valid_to}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-1 text-sm text-slate-500">No balance data</p>
              )}
            </div>
            <Link
              href={applyHref}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${
                balance?.is_available
                  ? "bg-indigo-600 hover:bg-indigo-700"
                  : "bg-slate-400 pointer-events-none cursor-not-allowed"
              }`}
              aria-disabled={!balance?.is_available}
              onClick={(e) => {
                if (!balance?.is_available) e.preventDefault();
              }}
            >
              <Plus className="h-4 w-4" />
              Apply regularization
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
                  ? "bg-indigo-600 text-white ring-indigo-600"
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
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
            <RotateCcw className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-800">
              No regularization requests
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {statusFilter === "all"
                ? "Submit your first regularization request to get started."
                : `No ${statusFilter} requests found.`}
            </p>
            {statusFilter === "all" && balance?.is_available ? (
              <Link
                href={applyHref}
                className="mt-4 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Apply regularization
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map((row) => {
              const status = String(row.reg_status).toLowerCase();
              const canDelete = status === "pending" || status === "rejected";
              return (
                <article
                  key={row.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {requestTypeLabel(row.request_type)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(row.action_date)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ring-1 ring-inset ${statusBadgeClass(status)}`}
                    >
                      {row.reg_status}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-700">
                    {(row.request_type === "check_in" ||
                      row.request_type === "both") &&
                    row.check_in_time ? (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-emerald-600" />
                        In {formatTimeValue(row.check_in_time)}
                      </span>
                    ) : null}
                    {(row.request_type === "check_out" ||
                      row.request_type === "both") &&
                    row.check_out_time ? (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-rose-600" />
                        Out {formatTimeValue(row.check_out_time)}
                      </span>
                    ) : null}
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

                  {canDelete ? (
                    <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(row)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
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
              This will remove your {requestTypeLabel(deleteTarget.request_type).toLowerCase()}{" "}
              request for {formatDate(deleteTarget.action_date)}. Your balance
              will be restored if applicable.
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
    </div>
  );
}
