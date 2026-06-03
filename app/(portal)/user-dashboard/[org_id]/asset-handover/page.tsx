"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  ArrowLeft,
  ClipboardList,
  Loader2,
  Package,
  RefreshCw,
  X,
} from "lucide-react";
import {
  HANDOVER_STATUS_TABS,
  HANDOVER_UPDATE_STATUS_OPTIONS,
  fetchHandoverAssignedToMe,
  normalizeHandoverStatus,
  updateMyAssignedHandoverStatus,
  type HandoverAssignedAssetRow,
  type HandoverAssignedCustomTaskRow,
  type HandoverAssignedToMeData,
  type HandoverStatusTab,
} from "@/services/handoverAssigned";

function zohoPrimaryBtnCls(full = false) {
  return `inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg bg-[#008CD3] px-4 py-2.5 text-[14px] font-medium text-white transition active:scale-[0.98] hover:bg-[#0070AA] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full flex-1" : ""}`;
}

function zohoSecondaryBtnCls(full = false) {
  return `inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-[#E4E7EC] bg-white px-4 py-2.5 text-[14px] font-medium text-[#374151] transition active:scale-[0.98] hover:bg-[#F5F7FA] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full flex-1" : ""}`;
}

function statusChipClass(status: string | null | undefined): string {
  const s = normalizeHandoverStatus(status);
  if (s === "handover_completed") {
    return "bg-[#E7FCE3] text-[#0B5E44] ring-[#B7E4C7]";
  }
  if (s === "damaged") return "bg-[#FFF4E5] text-[#B45309] ring-[#FDE68A]";
  if (s === "missing") return "bg-[#FFECEC] text-[#C62828] ring-[#FFCDD2]";
  return "bg-[#E8F4FB] text-[#0070AA] ring-[#B3E0F5]";
}

function formatStatusLabel(status: string | null | undefined): string {
  const s = normalizeHandoverStatus(status);
  if (!s) return "—";
  if (s === "handover_completed") return "Completed";
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
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

type UpdateTarget =
  | { kind: "asset"; row: HandoverAssignedAssetRow }
  | { kind: "task"; row: HandoverAssignedCustomTaskRow };

function filterByStatus<T extends { handover_status: string }>(
  rows: T[],
  tab: HandoverStatusTab,
): T[] {
  return rows.filter((r) => normalizeHandoverStatus(r.handover_status) === tab);
}

export default function AssetHandoverPage() {
  const params = useParams();
  const pathname = usePathname();
  const orgIdParam = String(params?.org_id ?? "");
  const orgId = Number(orgIdParam);

  const [data, setData] = useState<HandoverAssignedToMeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState<"assets" | "custom_tasks">("assets");
  const [statusTab, setStatusTab] = useState<HandoverStatusTab>("pending");
  const [updateTarget, setUpdateTarget] = useState<UpdateTarget | null>(null);
  const [updateRemarks, setUpdateRemarks] = useState("");
  const [updateBusy, setUpdateBusy] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!orgIdParam || Number.isNaN(orgId)) {
        setError("Invalid organization.");
        setLoading(false);
        return;
      }
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Not signed in.");
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const result = await fetchHandoverAssignedToMe(token, orgId);
        setData(result);
      } catch (e) {
        setData(null);
        setError(e instanceof Error ? e.message : "Could not load handovers.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orgId, orgIdParam],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const filteredAssets = useMemo(
    () => filterByStatus(data?.assets ?? [], statusTab),
    [data?.assets, statusTab],
  );
  const filteredTasks = useMemo(
    () => filterByStatus(data?.custom_tasks ?? [], statusTab),
    [data?.custom_tasks, statusTab],
  );

  const assetCounts = useMemo(() => {
    const assets = data?.assets ?? [];
    return Object.fromEntries(
      HANDOVER_STATUS_TABS.map((t) => [
        t.id,
        filterByStatus(assets, t.id).length,
      ]),
    ) as Record<HandoverStatusTab, number>;
  }, [data?.assets]);

  const taskCounts = useMemo(() => {
    const tasks = data?.custom_tasks ?? [];
    return Object.fromEntries(
      HANDOVER_STATUS_TABS.map((t) => [
        t.id,
        filterByStatus(tasks, t.id).length,
      ]),
    ) as Record<HandoverStatusTab, number>;
  }, [data?.custom_tasks]);

  const statusCounts = mainTab === "assets" ? assetCounts : taskCounts;
  const listEmpty =
    mainTab === "assets" ? filteredAssets.length === 0 : filteredTasks.length === 0;

  async function handleStatusPick(
    status: (typeof HANDOVER_UPDATE_STATUS_OPTIONS)[number]["value"],
  ) {
    if (!updateTarget) return;
    const row = updateTarget.row;
    if (row.employee_exit_process_id == null) {
      setUpdateError("Exit process is missing on this handover record.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setUpdateError("Not signed in.");
      return;
    }
    setUpdateBusy(true);
    setUpdateError(null);
    try {
      await updateMyAssignedHandoverStatus(
        token,
        orgId,
        row.employee_exit_process_id,
        row.employee_id,
        row.id,
        {
          handover_status: status,
          remarks: updateRemarks.trim() || null,
        },
      );
      setUpdateTarget(null);
      setUpdateRemarks("");
      setSuccessMsg("Handover status updated.");
      void load(true);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (e) {
      setUpdateError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setUpdateBusy(false);
    }
  }

  const homeHref = pathname?.includes("/dashboard/")
    ? `/dashboard/${encodeURIComponent(orgIdParam)}/home`
    : `/user-dashboard/${encodeURIComponent(orgIdParam)}/home`;

  return (
    <div className="min-h-screen bg-[#F5F7FA] lg:bg-slate-50">
      <div className="border-b border-[#E4E7EC] bg-white px-4 py-3 lg:px-6 lg:py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <Link
            href={homeHref}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#374151] hover:bg-[#F5F7FA]"
            aria-label="Back to home"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-[16px] font-semibold text-[#1F2937] lg:text-lg">
              Asset handover
            </h1>
            <p className="text-[12px] text-[#6B7280] lg:text-sm">
              Items assigned to you during employee exits
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={loading || refreshing}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#008CD3] disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-4 p-4 lg:p-6">
        {successMsg ? (
          <div className="rounded-lg border border-[#C8E6C9] bg-[#E6F4EA] px-3 py-2 text-sm text-[#0F9D58]">
            {successMsg}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-16 text-[#6B7280]">
            <Loader2 className="h-8 w-8 animate-spin text-[#008CD3]" />
            <p className="text-sm">Loading handover assignments…</p>
          </div>
        ) : null}

        {!loading && !error && data ? (
          <>
            <div className="flex rounded-lg bg-[#EEF2F6] p-1">
              <button
                type="button"
                onClick={() => setMainTab("assets")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-[13px] font-semibold transition ${
                  mainTab === "assets"
                    ? "bg-white text-[#008CD3] shadow-sm"
                    : "text-[#6B7280]"
                }`}
              >
                <Package className="h-4 w-4" aria-hidden />
                Assets ({data.assets.length})
              </button>
              <button
                type="button"
                onClick={() => setMainTab("custom_tasks")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-[13px] font-semibold transition ${
                  mainTab === "custom_tasks"
                    ? "bg-white text-[#008CD3] shadow-sm"
                    : "text-[#6B7280]"
                }`}
              >
                <ClipboardList className="h-4 w-4" aria-hidden />
                Custom tasks ({data.custom_tasks.length})
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {HANDOVER_STATUS_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setStatusTab(t.id)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ring-1 transition ${
                    statusTab === t.id
                      ? "bg-[#008CD3] text-white ring-[#008CD3]"
                      : "bg-white text-[#374151] ring-[#E4E7EC] hover:bg-[#F5F7FA]"
                  }`}
                >
                  {t.label} ({statusCounts[t.id] ?? 0})
                </button>
              ))}
            </div>

            {listEmpty ? (
              <div className="rounded-xl border border-[#E4E7EC] bg-white px-4 py-10 text-center text-sm text-[#6B7280]">
                No {mainTab === "assets" ? "assets" : "custom tasks"} in{" "}
                {formatStatusLabel(statusTab).toLowerCase()}.
              </div>
            ) : null}

            {mainTab === "assets"
              ? filteredAssets.map((a) => (
                  <article
                    key={a.id}
                    className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-[#1F2937]">
                          {a.asset_name ?? `Asset #${a.asset_id ?? a.id}`}
                        </p>
                        {a.asset_type ? (
                          <p className="mt-0.5 text-xs text-[#6B7280]">{a.asset_type}</p>
                        ) : null}
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${statusChipClass(a.handover_status)}`}
                      >
                        {formatStatusLabel(a.handover_status)}
                      </span>
                    </div>
                    {a.asset_summary ? (
                      <p className="mt-2 text-xs text-[#6B7280]">{a.asset_summary}</p>
                    ) : null}
                    <dl className="mt-3 grid gap-1 text-xs text-[#6B7280] sm:grid-cols-2">
                      <div>
                        Exiting employee:{" "}
                        <span className="font-medium text-[#1F2937]">
                          #{a.employee_id}
                        </span>
                      </div>
                      <div>
                        Due:{" "}
                        <span className="font-medium text-[#1F2937]">
                          {formatDateTime(a.handover_date)}
                        </span>
                      </div>
                      {a.remarks ? (
                        <div className="sm:col-span-2">
                          Remarks:{" "}
                          <span className="font-medium text-[#1F2937]">{a.remarks}</span>
                        </div>
                      ) : null}
                    </dl>
                    {statusTab === "pending" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setUpdateTarget({ kind: "asset", row: a });
                          setUpdateRemarks(a.remarks ?? "");
                          setUpdateError(null);
                        }}
                        className={`mt-3 ${zohoPrimaryBtnCls()}`}
                      >
                        Update status
                      </button>
                    ) : null}
                  </article>
                ))
              : null}

            {mainTab === "custom_tasks"
              ? filteredTasks.map((t) => (
                  <article
                    key={t.id}
                    className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-semibold text-[#1F2937]">{t.custom_task_name}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${statusChipClass(t.handover_status)}`}
                      >
                        {formatStatusLabel(t.handover_status)}
                      </span>
                    </div>
                    <dl className="mt-3 grid gap-1 text-xs text-[#6B7280] sm:grid-cols-2">
                      <div>
                        Exiting employee:{" "}
                        <span className="font-medium text-[#1F2937]">
                          #{t.employee_id}
                        </span>
                      </div>
                      <div>
                        Due:{" "}
                        <span className="font-medium text-[#1F2937]">
                          {formatDateTime(t.handover_date)}
                        </span>
                      </div>
                      {t.remarks ? (
                        <div className="sm:col-span-2">
                          Remarks:{" "}
                          <span className="font-medium text-[#1F2937]">{t.remarks}</span>
                        </div>
                      ) : null}
                    </dl>
                    {statusTab === "pending" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setUpdateTarget({ kind: "task", row: t });
                          setUpdateRemarks(t.remarks ?? "");
                          setUpdateError(null);
                        }}
                        className={`mt-3 ${zohoPrimaryBtnCls()}`}
                      >
                        Update status
                      </button>
                    ) : null}
                  </article>
                ))
              : null}
          </>
        ) : null}
      </div>

      {updateTarget ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="handover-update-title"
        >
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Close"
            onClick={() => !updateBusy && setUpdateTarget(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-[#E4E7EC] px-4 py-3">
              <h2 id="handover-update-title" className="text-base font-semibold text-[#1F2937]">
                Update handover status
              </h2>
              <button
                type="button"
                onClick={() => !updateBusy && setUpdateTarget(null)}
                className="rounded-lg p-1 text-[#6B7280] hover:bg-[#F5F7FA]"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 px-4 py-4">
              <p className="text-sm text-[#6B7280]">
                Choose the outcome for this{" "}
                {updateTarget.kind === "asset" ? "asset" : "custom task"} handover.
              </p>
              <div className="space-y-2">
                {HANDOVER_UPDATE_STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={updateBusy}
                    onClick={() => void handleStatusPick(opt.value)}
                    className="flex w-full items-center justify-center rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-3 text-sm font-semibold text-[#1F2937] transition hover:border-[#008CD3] hover:bg-[#E8F4FB] disabled:opacity-50"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div>
                <label
                  htmlFor="handover-update-remarks"
                  className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]"
                >
                  Remarks (optional)
                </label>
                <textarea
                  id="handover-update-remarks"
                  rows={3}
                  maxLength={1000}
                  value={updateRemarks}
                  onChange={(e) => setUpdateRemarks(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[#E4E7EC] px-3 py-2 text-sm outline-none focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15"
                  placeholder="Condition notes, location, etc."
                />
              </div>
              {updateError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {updateError}
                </p>
              ) : null}
            </div>
            <div className="border-t border-[#E4E7EC] px-4 py-3">
              <button
                type="button"
                disabled={updateBusy}
                onClick={() => setUpdateTarget(null)}
                className={zohoSecondaryBtnCls(true)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
