"use client";

import { useCallback, useEffect, useState, startTransition } from "react";
import { useParams } from "next/navigation";
import {
  CalendarDays,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Pencil,
  Plus,
  X,
  Info,
} from "lucide-react";
import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import {
  type LeaveTypeRow,
  createLeaveType,
  getLeaveTypes,
  updateLeaveType,
} from "@/services/leaveManagement";

type SheetMode = "add" | "edit" | null;

function labelCls(mobile = false) {
  return mobile
    ? "mb-1.5 block text-[13px] font-medium text-[#6B7280]"
    : "mb-1.5 block text-sm font-medium text-[#0C123A]";
}

function inputCls() {
  return "w-full rounded-lg border border-[#E4E7EC] bg-white px-3.5 py-3 text-[15px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15 disabled:bg-[#F5F7FA] lg:border-slate-200 lg:py-2.5 lg:text-sm lg:text-[#0C123A] lg:shadow-sm lg:focus:border-[#C99237] lg:focus:ring-[#C99237]/20";
}

function zohoPrimaryBtnCls(full = false) {
  return `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#008CD3] px-5 py-2.5 text-[15px] font-medium text-white transition active:scale-[0.98] hover:bg-[#0070AA] disabled:pointer-events-none disabled:opacity-50 lg:bg-[#C99237] lg:text-sm lg:font-bold lg:text-[#0C123A] lg:hover:bg-[#b87d2e] ${full ? "w-full" : ""}`;
}

function zohoSecondaryBtnCls(full = false) {
  return `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-[#E4E7EC] bg-white px-4 py-2.5 text-[15px] font-medium text-[#1F2937] transition active:scale-[0.98] hover:bg-[#F5F7FA] disabled:pointer-events-none disabled:opacity-50 lg:border-slate-200 lg:text-sm lg:font-semibold lg:text-[#0C123A] lg:shadow-sm lg:hover:bg-slate-50 ${full ? "w-full" : ""}`;
}

function leaveTypeInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "LT";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const LEAVE_TYPE_COLORS = [
  "bg-[#E8F4FB] text-[#008CD3]",
  "bg-[#E6F4EA] text-[#0F9D58]",
  "bg-[#FEF3E6] text-[#E8710A]",
  "bg-[#F3E8FD] text-[#7B1FA2]",
  "bg-[#FCE8E6] text-[#D93025]",
];

function leaveTypeColorClass(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return LEAVE_TYPE_COLORS[Math.abs(hash) % LEAVE_TYPE_COLORS.length];
}

type LeaveTypeCardProps = {
  row: LeaveTypeRow;
  onEdit: () => void;
  compact?: boolean;
};

function LeaveTypeCard({ row, onEdit, compact = false }: LeaveTypeCardProps) {
  const name = row.leave_type_name?.trim() || "Unnamed";

  if (compact) {
    return (
      <li className="border-b border-[#E4E7EC] last:border-b-0">
        <div className="px-4 py-3.5">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${leaveTypeColorClass(name)}`}
            >
              {leaveTypeInitials(name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[16px] font-medium text-[#1F2937]">{name}</p>
              <p className="text-[12px] text-[#9CA3AF]">ID {String(row.id)}</p>
            </div>
            <button
              type="button"
              onClick={onEdit}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#008CD3]"
              aria-label={`Edit ${name}`}
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="flex flex-col rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:border-[#C99237]/40 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${leaveTypeColorClass(name)}`}
          >
            {leaveTypeInitials(name)}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Leave type
            </p>
            <p className="mt-0.5 truncate text-base font-semibold text-[#0C123A]">{name}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
          #{String(row.id)}
        </span>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-[#0C123A] shadow-sm transition hover:bg-slate-50 sm:w-auto"
      >
        <Pencil className="h-4 w-4" />
        Edit name
      </button>
    </li>
  );
}

export default function ManageLeaveTypesPage() {
  const params = useParams();
  const orgIdParam = params?.org_id;
  const ctx = useManagementDashboardContext();

  const [rows, setRows] = useState<LeaveTypeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [editingRow, setEditingRow] = useState<LeaveTypeRow | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"types" | "guide">("types");

  const organizationIdNum =
    ctx?.organization?.id != null ? Number(ctx.organization.id) : Number(orgIdParam);
  const orgName = ctx?.organization?.org_name?.trim() || `Organization ${orgIdParam ?? ""}`;
  const orgMissing = !organizationIdNum || Number.isNaN(organizationIdNum);

  const loadList = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent === true;
      if (orgMissing) {
        setLoading(false);
        setRefreshing(false);
        setRows([]);
        return;
      }
      const token = localStorage.getItem("token");
      if (!token) {
        setLoadError("Not signed in.");
        setLoading(false);
        setRefreshing(false);
        return;
      }
      setLoadError(null);
      if (silent) setRefreshing(true);
      else setLoading(true);
      try {
        const data = await getLeaveTypes(token, organizationIdNum);
        setRows(data);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Could not load leave types.");
        setRows([]);
      } finally {
        if (silent) setRefreshing(false);
        else setLoading(false);
      }
    },
    [orgMissing, organizationIdNum],
  );

  useEffect(() => {
    startTransition(() => {
      void loadList();
    });
  }, [loadList]);

  function openAdd() {
    setFormError(null);
    setSuccess(null);
    setEditingRow(null);
    setNameInput("");
    setSheetMode("add");
    setMobileTab("types");
  }

  function openEdit(row: LeaveTypeRow) {
    setFormError(null);
    setSuccess(null);
    setEditingRow(row);
    setNameInput(row.leave_type_name?.trim() ?? "");
    setSheetMode("edit");
    setMobileTab("types");
  }

  function closeSheet(force = false) {
    if (submitting && !force) return;
    setSheetMode(null);
    setEditingRow(null);
    setNameInput("");
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);

    const trimmed = nameInput.trim();
    if (!trimmed) {
      setFormError("Leave type name is required.");
      return;
    }
    if (orgMissing) {
      setFormError("Invalid organization.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setFormError("Not signed in.");
      return;
    }

    setSubmitting(true);
    try {
      if (sheetMode === "edit" && editingRow?.id != null) {
        await updateLeaveType(token, {
          org_id: organizationIdNum,
          leave_type_id: editingRow.id,
          leave_type_name: trimmed,
        });
        setSuccess("Leave type updated successfully.");
      } else {
        await createLeaveType(token, {
          org_id: organizationIdNum,
          leave_type_name: trimmed,
        });
        setSuccess("Leave type created successfully.");
      }
      closeSheet(true);
      await loadList({ silent: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save leave type.");
    } finally {
      setSubmitting(false);
    }
  }

  const mobileTabs = [
    { id: "types" as const, label: "Leave types", count: rows.length },
    { id: "guide" as const, label: "Guide" },
  ];

  const statusBanner = success ? (
    <div
      className="flex items-start gap-2 rounded-lg border border-[#A8DAB5] bg-[#E6F4EA] px-4 py-3 text-[14px] text-[#0F9D58] lg:border-emerald-200 lg:bg-emerald-50 lg:text-sm lg:text-emerald-900"
      role="status"
    >
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{success}</span>
    </div>
  ) : null;

  const sheetOpen = sheetMode != null;
  const sheetTitle = sheetMode === "edit" ? "Edit leave type" : "Add leave type";

  return (
    <div className="min-h-full bg-[#F5F7FA] lg:bg-transparent lg:space-y-6">
      {/* Mobile & tablet */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-20 border-b border-[#E4E7EC] bg-white shadow-sm">
          <div className="flex items-center gap-2 px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[17px] font-semibold text-[#1F2937]">Leave types</h1>
              <p className="truncate text-[13px] text-[#6B7280]">
                {loading ? "Loading…" : `${rows.length} type${rows.length === 1 ? "" : "s"}`} ·{" "}
                {orgName}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadList({ silent: true })}
              disabled={orgMissing || loading || refreshing}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#008CD3] disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={openAdd}
              disabled={orgMissing}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#008CD3] text-white active:scale-[0.98] disabled:opacity-50"
              aria-label="Add leave type"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
          <div className="px-4 pb-3">
            <div className="flex rounded-lg bg-[#F5F7FA] p-1">
              {mobileTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMobileTab(tab.id)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-[13px] font-medium transition ${
                    mobileTab === tab.id
                      ? "bg-white text-[#008CD3] shadow-sm"
                      : "text-[#6B7280]"
                  }`}
                >
                  {tab.label}
                  {"count" in tab && tab.count != null ? (
                    <span
                      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] ${
                        mobileTab === tab.id
                          ? "bg-[#E8F4FB] text-[#008CD3]"
                          : "bg-[#E4E7EC] text-[#6B7280]"
                      }`}
                    >
                      {tab.count > 99 ? "99+" : tab.count}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loadError ? (
          <div className="mx-4 mt-3 flex items-start gap-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-4 py-3 text-[14px] text-[#D93025]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{loadError}</span>
          </div>
        ) : null}

        {loading && !loadError ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-[#6B7280]">
            <Loader2 className="h-9 w-9 animate-spin text-[#008CD3]" />
            <p className="text-[15px]">Loading leave types…</p>
          </div>
        ) : null}

        {!loading && mobileTab === "guide" ? (
          <div className="space-y-3 p-4">
            <div className="rounded-xl border border-[#E4E7EC] bg-[#E8F4FB] p-4">
              <div className="flex gap-3">
                <Info className="h-5 w-5 shrink-0 text-[#008CD3]" />
                <p className="text-[14px] leading-relaxed text-[#4B5563]">
                  Define paid or custom leave categories (e.g. Casual, Sick, Earned). Assign
                  balances to employees after creating types.
                </p>
              </div>
            </div>
            <button type="button" onClick={openAdd} className={zohoPrimaryBtnCls(true)}>
              <Plus className="h-4 w-4" />
              Add leave type
            </button>
          </div>
        ) : null}

        {!loading && mobileTab === "types" ? (
          <div className="pb-8">
            {statusBanner ? <div className="mx-4 mt-3">{statusBanner}</div> : null}
            {rows.length === 0 && !loadError ? (
              <div className="mx-4 mt-4 rounded-xl border border-dashed border-[#E4E7EC] bg-white px-6 py-14 text-center">
                <CalendarDays className="mx-auto h-10 w-10 text-[#9CA3AF]" />
                <p className="mt-4 text-[17px] font-semibold text-[#1F2937]">No leave types yet</p>
                <p className="mt-2 text-[14px] text-[#6B7280]">
                  Create types before assigning leave balances to employees.
                </p>
                <button type="button" onClick={openAdd} className={`mt-6 ${zohoPrimaryBtnCls()}`}>
                  <Plus className="h-4 w-4" />
                  Add leave type
                </button>
              </div>
            ) : null}
            {rows.length > 0 ? (
              <>
                <div className="mx-4 mt-3">
                  <button type="button" onClick={openAdd} className={zohoPrimaryBtnCls(true)}>
                    <Plus className="h-4 w-4" />
                    Add another leave type
                  </button>
                </div>
                <ul className="mt-3 divide-y divide-[#E4E7EC] border-t border-[#E4E7EC] bg-white">
                  {rows.map((row) => (
                    <LeaveTypeCard
                      key={String(row.id)}
                      row={row}
                      onEdit={() => openEdit(row)}
                      compact
                    />
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Desktop */}
      <div className="hidden space-y-6 lg:block">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#C99237]/12">
                <CalendarDays className="h-6 w-6 text-[#C99237]" aria-hidden />
              </span>
              <div>
                <h1 className="text-xl font-bold text-[#0C123A] sm:text-2xl">Manage leave types</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Create and rename leave categories for{" "}
                  <span className="font-medium text-slate-700">{orgName}</span>.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void loadList({ silent: true })}
                disabled={orgMissing || loading || refreshing}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0C123A] shadow-sm hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button
                type="button"
                onClick={openAdd}
                disabled={orgMissing}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#C99237] px-4 py-2.5 text-sm font-bold text-[#0C123A] shadow-sm hover:bg-[#b87d2e] disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {rows.length === 0 ? "Add leave type" : "Add another"}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
          {loadError ? (
            <div className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {loadError}
            </div>
          ) : null}
          {statusBanner ? <div className="mb-6">{statusBanner}</div> : null}

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-[#C99237]" />
              <p className="text-sm">Loading leave types…</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-14 text-center">
              <CalendarDays className="mb-3 h-10 w-10 text-slate-300" aria-hidden />
              <p className="text-sm font-medium text-[#0C123A]">No leave types yet</p>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Add categories such as Casual, Sick, or Earned leave.
              </p>
              <button
                type="button"
                onClick={openAdd}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#C99237] px-4 py-2 text-sm font-bold text-[#0C123A] shadow-sm hover:bg-[#b87d2e]"
              >
                <Plus className="h-4 w-4" />
                Add leave type
              </button>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((row) => (
                <LeaveTypeCard key={String(row.id)} row={row} onEdit={() => openEdit(row)} />
              ))}
            </ul>
          )}
        </div>
      </div>

      {sheetOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#1F2937]/40 p-0 backdrop-blur-[1px] sm:items-center sm:bg-black/40 sm:p-4"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeSheet();
          }}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-t-2xl border border-[#E4E7EC] bg-white shadow-xl sm:rounded-2xl sm:border-slate-200 sm:[border-top:3px_solid_#008CD3] lg:[border-top-color:#C99237]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-type-sheet-title"
          >
            <div className="border-b border-[#E4E7EC] p-4 sm:p-6 sm:pb-4">
              <div className="flex items-start justify-between gap-3">
                <h2
                  id="leave-type-sheet-title"
                  className="text-[17px] font-semibold text-[#1F2937] sm:text-lg sm:font-bold sm:text-[#0C123A]"
                >
                  {sheetTitle}
                </h2>
                <button
                  type="button"
                  onClick={() => closeSheet()}
                  disabled={submitting}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#6B7280]"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 sm:pt-0">
              {formError ? (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {formError}
                </div>
              ) : null}
              <div>
                <label htmlFor="leave-type-name" className={labelCls(true)}>
                  Leave type name <span className="text-red-500">*</span>
                </label>
                <input
                  id="leave-type-name"
                  type="text"
                  className={inputCls()}
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Casual Leave"
                  maxLength={100}
                  required
                  disabled={submitting}
                  autoFocus
                />
              </div>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => closeSheet()}
                  disabled={submitting}
                  className={zohoSecondaryBtnCls(true)}
                >
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className={zohoPrimaryBtnCls(true)}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : sheetMode === "edit" ? (
                    "Save changes"
                  ) : (
                    "Create leave type"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
