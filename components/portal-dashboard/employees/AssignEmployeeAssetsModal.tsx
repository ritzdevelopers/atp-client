"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Package,
  PlusCircle,
  X,
} from "lucide-react";
import {
  EMPLOYEE_ASSET_TYPES,
  uploadEmployeeAssetsBatch,
} from "@/services/adminUser";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPT_MIME = "image/png,image/jpeg,image/webp,application/pdf";

export type AssignEmployeeAssetsTarget = {
  userId: string | number;
  userName: string;
};

type AssetDraftRow = {
  key: string;
  asset_name: string;
  asset_type: string;
  asset_summary: string;
  handover_date_time: string;
  file: File | null;
};

function createEmptyAssetDraft(): AssetDraftRow {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    asset_name: "",
    asset_type: "other",
    asset_summary: "",
    handover_date_time: "",
    file: null,
  };
}

function assetRowIsEmpty(row: AssetDraftRow) {
  return (
    row.asset_name.trim() === "" &&
    row.asset_summary.trim() === "" &&
    row.handover_date_time.trim() === "" &&
    row.file === null
  );
}

function inputCls() {
  return "mt-1.5 w-full rounded-lg border border-[#E4E7EC] bg-white px-3 py-2.5 text-[14px] text-[#1F2937] outline-none focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15";
}

function labelCls() {
  return "block text-xs font-semibold text-slate-600";
}

type AssignEmployeeAssetsModalProps = {
  open: boolean;
  orgId: number | string;
  employee: AssignEmployeeAssetsTarget | null;
  onClose: () => void;
  onSuccess?: (message: string) => void;
};

export default function AssignEmployeeAssetsModal({
  open,
  orgId,
  employee,
  onClose,
  onSuccess,
}: AssignEmployeeAssetsModalProps) {
  const [assetDraftRows, setAssetDraftRows] = useState<AssetDraftRow[]>([
    createEmptyAssetDraft(),
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAssetDraftRows([createEmptyAssetDraft()]);
    setSubmitting(false);
    setError(null);
    setSuccess(null);
  }, [open, employee?.userId]);

  if (!open || !employee) return null;

  const orgIdNum = Number(orgId);
  const busy = submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!employee?.userId) {
      setError("Invalid employee.");
      return;
    }
    if (!orgId || Number.isNaN(orgIdNum)) {
      setError("Invalid organization.");
      return;
    }

    const typesSet = new Set<string>([...EMPLOYEE_ASSET_TYPES]);
    const candidates = assetDraftRows.filter((r) => !assetRowIsEmpty(r));

    if (candidates.length === 0) {
      setError("Add at least one asset with a name and type.");
      return;
    }

    for (let i = 0; i < candidates.length; i++) {
      const row = candidates[i];
      if (!row.asset_name.trim()) {
        setError(`Asset ${i + 1}: name is required.`);
        return;
      }
      if (row.asset_name.trim().length > 250) {
        setError(`Asset ${i + 1}: name is too long (max 250).`);
        return;
      }
      if (!typesSet.has(row.asset_type)) {
        setError(`Asset ${i + 1}: pick a valid asset type.`);
        return;
      }
      if (row.asset_summary.trim().length > 600) {
        setError(`Asset ${i + 1}: summary is too long (max 600).`);
        return;
      }
      if (row.file && row.file.size > MAX_FILE_BYTES) {
        setError(`Asset ${i + 1}: file must be 5 MB or smaller.`);
        return;
      }
      if (
        row.file &&
        !/^image\/(png|jpeg|webp)$/.test(row.file.type) &&
        row.file.type !== "application/pdf"
      ) {
        setError(`Asset ${i + 1}: use PNG, JPG, WebP, or PDF only.`);
        return;
      }
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Not signed in.");
      return;
    }

    setSubmitting(true);
    try {
      const items = candidates.map((row, index) => ({
        employee_id: employee.userId,
        asset_name: row.asset_name.trim(),
        asset_type: row.asset_type,
        asset_summary:
          row.asset_summary.trim() !== "" ? row.asset_summary.trim() : null,
        handover_date_time:
          row.handover_date_time.trim() !== ""
            ? row.handover_date_time.trim()
            : null,
        image_field: `asset_image_${index}`,
        file: row.file,
      }));

      await uploadEmployeeAssetsBatch(token, {
        org_id: orgIdNum,
        items,
      });

      const msg = `Assigned ${items.length} asset(s) to ${employee.userName}.`;
      setSuccess(msg);
      onSuccess?.(msg);
      setAssetDraftRows([createEmptyAssetDraft()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not assign assets.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[10050] flex items-end justify-center bg-[#111B21]/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-assets-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close"
        onClick={() => !busy && onClose()}
      />
      <div className="relative z-10 flex max-h-[min(92dvh,100%)] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-[#E4E7EC] bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-2xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#E4E7EC] bg-gradient-to-r from-[#008CD3] to-[#0070AA] px-4 py-3.5 text-white sm:bg-white sm:px-6 sm:py-4 sm:[border-top:3px_solid_#0d9488]">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 sm:bg-[#008CD3]/10">
              <Package className="h-5 w-5 text-white sm:text-[#008CD3]" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2
                id="assign-assets-modal-title"
                className="text-[16px] font-bold leading-tight sm:text-lg sm:text-slate-900"
              >
                Assign assets
              </h2>
              <p className="mt-0.5 text-[12px] text-white/85 sm:text-sm sm:text-slate-600">
                Allocate equipment for{" "}
                <span className="font-semibold">{employee.userName}</span>. Same
                process as onboarding.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/25 bg-white/10 text-white active:bg-white/20 disabled:opacity-50 sm:border-slate-200 sm:bg-white sm:text-slate-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
          {error ? (
            <div
              className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-800"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          ) : null}
          {success ? (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[13px] text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{success}</span>
            </div>
          ) : null}

          <form id="assign-assets-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            {assetDraftRows.map((row, idx) => (
              <div
                key={row.key}
                className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-bold text-[#0C123A]">
                    Asset {idx + 1}
                  </span>
                  {assetDraftRows.length > 1 ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        setAssetDraftRows((prev) =>
                          prev.filter((r) => r.key !== row.key),
                        )
                      }
                      className="text-xs font-semibold text-red-700 underline underline-offset-2 disabled:opacity-50"
                    >
                      Remove row
                    </button>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={labelCls()} htmlFor={`assign-asset-name-${row.key}`}>
                      Asset name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id={`assign-asset-name-${row.key}`}
                      className={inputCls()}
                      value={row.asset_name}
                      onChange={(e) =>
                        setAssetDraftRows((prev) =>
                          prev.map((r) =>
                            r.key === row.key
                              ? { ...r, asset_name: e.target.value }
                              : r,
                          ),
                        )
                      }
                      placeholder="e.g. Dell Latitude 5420"
                      maxLength={250}
                      disabled={busy}
                    />
                  </div>
                  <div>
                    <label className={labelCls()} htmlFor={`assign-asset-type-${row.key}`}>
                      Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      id={`assign-asset-type-${row.key}`}
                      className={inputCls()}
                      value={row.asset_type}
                      onChange={(e) =>
                        setAssetDraftRows((prev) =>
                          prev.map((r) =>
                            r.key === row.key
                              ? { ...r, asset_type: e.target.value }
                              : r,
                          ),
                        )
                      }
                      disabled={busy}
                    >
                      {(EMPLOYEE_ASSET_TYPES as readonly string[]).map((t) => (
                        <option key={t} value={t}>
                          {t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      className={labelCls()}
                      htmlFor={`assign-asset-handover-${row.key}`}
                    >
                      Handover date/time{" "}
                      <span className="font-normal text-slate-400">(optional)</span>
                    </label>
                    <input
                      id={`assign-asset-handover-${row.key}`}
                      type="datetime-local"
                      className={inputCls()}
                      value={row.handover_date_time}
                      onChange={(e) =>
                        setAssetDraftRows((prev) =>
                          prev.map((r) =>
                            r.key === row.key
                              ? { ...r, handover_date_time: e.target.value }
                              : r,
                          ),
                        )
                      }
                      disabled={busy}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label
                      className={labelCls()}
                      htmlFor={`assign-asset-summary-${row.key}`}
                    >
                      Summary{" "}
                      <span className="font-normal text-slate-400">(optional)</span>
                    </label>
                    <input
                      id={`assign-asset-summary-${row.key}`}
                      className={inputCls()}
                      value={row.asset_summary}
                      onChange={(e) =>
                        setAssetDraftRows((prev) =>
                          prev.map((r) =>
                            r.key === row.key
                              ? { ...r, asset_summary: e.target.value }
                              : r,
                          ),
                        )
                      }
                      placeholder="Serial, condition, vendor…"
                      maxLength={600}
                      disabled={busy}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls()} htmlFor={`assign-asset-file-${row.key}`}>
                      Photo / receipt (PNG, JPG, WebP, PDF, max 5 MB){" "}
                      <span className="font-normal text-slate-400">(optional)</span>
                    </label>
                    <input
                      id={`assign-asset-file-${row.key}`}
                      type="file"
                      accept={ACCEPT_MIME}
                      className={`${inputCls()} cursor-pointer`}
                      disabled={busy}
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        setError(null);
                        if (f && f.size > MAX_FILE_BYTES) {
                          setError("Each asset file must be 5 MB or smaller.");
                          e.target.value = "";
                          return;
                        }
                        if (
                          f &&
                          !/^image\/(png|jpeg|webp)$/.test(f.type) &&
                          f.type !== "application/pdf"
                        ) {
                          setError("Use PNG, JPG, WebP, or PDF only.");
                          e.target.value = "";
                          return;
                        }
                        setAssetDraftRows((prev) =>
                          prev.map((r) =>
                            r.key === row.key ? { ...r, file: f } : r,
                          ),
                        );
                      }}
                    />
                    {row.file ? (
                      <p className="mt-1 text-xs text-slate-600">
                        Attached: {row.file.name}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              disabled={busy}
              onClick={() =>
                setAssetDraftRows((prev) => [...prev, createEmptyAssetDraft()])
              }
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#008CD3]/50 bg-[#008CD3]/5 px-4 py-2.5 text-sm font-semibold text-[#008CD3] active:scale-[0.98] disabled:opacity-60"
            >
              <PlusCircle className="h-4 w-4" aria-hidden />
              Add another asset
            </button>
          </form>
        </div>

        <div
          className="flex shrink-0 flex-col-reverse gap-2 border-t border-[#E4E7EC] bg-[#F9FAFB] px-4 py-3 sm:flex-row sm:justify-end sm:px-6"
          style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
        >
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setAssetDraftRows([createEmptyAssetDraft()]);
              setError(null);
            }}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-[#E4E7EC] bg-white px-4 py-2.5 text-[14px] font-medium text-[#1F2937] disabled:opacity-50 sm:w-auto"
          >
            Clear rows
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-[#E4E7EC] bg-white px-4 py-2.5 text-[14px] font-medium text-[#1F2937] disabled:opacity-50 sm:w-auto"
          >
            {success ? "Close" : "Cancel"}
          </button>
          {!success ? (
            <button
              type="submit"
              form="assign-assets-form"
              disabled={busy}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#008CD3] px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm active:scale-[0.98] disabled:opacity-50 sm:w-auto"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Assign assets
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
