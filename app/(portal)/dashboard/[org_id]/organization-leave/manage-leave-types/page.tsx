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

const mobileCaptionCls = "text-[11px] leading-snug text-[#6B7280]";
const mobileValueCls = "text-[13px] font-semibold text-[#1F2937]";

function labelCls() {
  return "mb-1 block text-[12px] font-medium text-[#374151]";
}

function inputCls() {
  return "w-full rounded-md border border-[#E4E7EC] bg-white px-2.5 py-2 text-[13px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15 disabled:bg-[#F9FAFB]";
}

function zohoPrimaryBtnCls(full = false) {
  return `inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-[#008CD3] px-4 py-2 text-[14px] font-medium text-white transition active:scale-[0.98] hover:bg-[#0070AA] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full" : ""}`;
}

function zohoSecondaryBtnCls(full = false) {
  return `inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-[#E4E7EC] bg-white px-3 py-2 text-[13px] font-medium text-[#374151] transition active:scale-[0.98] hover:bg-[#F9FAFB] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full" : ""}`;
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
        <div className="px-3 py-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold ${leaveTypeColorClass(name)}`}
            >
              {leaveTypeInitials(name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`truncate ${mobileValueCls}`}>{name}</p>
              <p className="text-[10px] text-[#9CA3AF]">ID {String(row.id)}</p>
            </div>
            <button
              type="button"
              onClick={onEdit}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#E4E7EC] text-[#008CD3] active:bg-[#F5F7FA]"
              aria-label={`Edit ${name}`}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="flex flex-col rounded-lg border border-[#E4E7EC] bg-white p-3 shadow-sm transition hover:border-[#008CD3]/25">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold ${leaveTypeColorClass(name)}`}
          >
            {leaveTypeInitials(name)}
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
              Leave type
            </p>
            <p className="mt-0.5 truncate text-[14px] font-semibold text-[#1F2937]">{name}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-md bg-[#F5F7FA] px-1.5 py-0.5 text-[10px] font-medium text-[#6B7280]">
          #{String(row.id)}
        </span>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className={`mt-2.5 ${zohoSecondaryBtnCls(true)}`}
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden />
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
      className="flex items-start gap-2 rounded-lg border border-[#A8DAB5] bg-[#E6F4EA] px-3 py-2 text-[12px] text-[#0F9D58]"
      role="status"
    >
      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{success}</span>
    </div>
  ) : null;

  const sheetOpen = sheetMode != null;
  const sheetTitle = sheetMode === "edit" ? "Edit leave type" : "Add leave type";

  return (
    <div className="min-h-full bg-[#F5F7FA] pb-3 [font-family:var(--font-inter),system-ui,sans-serif] max-lg:-mx-1 sm:max-lg:-mx-2 lg:space-y-5 lg:pb-8">
      {/* Mobile & tablet */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-20 border-b border-[#E4E7EC] bg-white shadow-sm">
          <div className="flex items-center gap-1.5 px-3 py-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
              <CalendarDays className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[15px] font-semibold text-[#1F2937]">Leave types</h1>
              <p className={`truncate ${mobileCaptionCls}`}>
                {loading ? "Loading…" : `${rows.length} type${rows.length === 1 ? "" : "s"}`} ·{" "}
                {orgName}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadList({ silent: true })}
              disabled={orgMissing || loading || refreshing}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#E4E7EC] text-[#008CD3] disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
            </button>
            <button
              type="button"
              onClick={openAdd}
              disabled={orgMissing}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#008CD3] text-white active:scale-[0.98] disabled:opacity-50"
              aria-label="Add leave type"
            >
              <Plus className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="px-3 pb-2.5">
            <div className="flex gap-0.5 rounded-md bg-[#F5F7FA] p-0.5">
              {mobileTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMobileTab(tab.id)}
                  className={`flex min-w-0 flex-1 items-center justify-center gap-0.5 rounded-[5px] px-1.5 py-1.5 text-[12px] font-medium transition active:scale-[0.98] ${
                    mobileTab === tab.id
                      ? "bg-white text-[#008CD3] shadow-sm"
                      : "text-[#6B7280]"
                  }`}
                >
                  {tab.label}
                  {"count" in tab && tab.count != null ? (
                    <span
                      className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[10px] ${
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
          <div className="mx-3 mt-2 flex items-start gap-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2 text-[12px] text-[#D93025]">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{loadError}</span>
          </div>
        ) : null}

        {loading && !loadError ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-[#6B7280]">
            <Loader2 className="h-7 w-7 animate-spin text-[#008CD3]" aria-hidden />
            <p className="text-[13px]">Loading leave types…</p>
          </div>
        ) : null}

        {!loading && mobileTab === "guide" ? (
          <div className="space-y-2.5 p-3">
            <div className="rounded-lg border border-[#E4E7EC] bg-[#E8F4FB]/50 p-3">
              <div className="flex gap-2">
                <Info className="h-4 w-4 shrink-0 text-[#008CD3]" aria-hidden />
                <p className="text-[12px] leading-snug text-[#4B5563]">
                  Define paid or custom leave categories (e.g. Casual, Sick, Earned). Assign
                  balances to employees after creating types.
                </p>
              </div>
            </div>
            <button type="button" onClick={openAdd} className={zohoPrimaryBtnCls(true)}>
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Add leave type
            </button>
          </div>
        ) : null}

        {!loading && mobileTab === "types" ? (
          <div className="pb-6">
            {statusBanner ? <div className="mx-3 mt-2">{statusBanner}</div> : null}
            {rows.length === 0 && !loadError ? (
              <div className="mx-3 mt-3 rounded-lg border border-dashed border-[#E4E7EC] bg-white px-4 py-12 text-center">
                <CalendarDays className="mx-auto h-8 w-8 text-[#9CA3AF]" aria-hidden />
                <p className={`mt-3 ${mobileValueCls}`}>No leave types yet</p>
                <p className={`mt-1 ${mobileCaptionCls}`}>
                  Create types before assigning leave balances.
                </p>
                <button type="button" onClick={openAdd} className={`mt-4 ${zohoPrimaryBtnCls(true)}`}>
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Add leave type
                </button>
              </div>
            ) : null}
            {rows.length > 0 ? (
              <>
                <div className="mx-3 mt-2">
                  <button type="button" onClick={openAdd} className={zohoPrimaryBtnCls(true)}>
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    Add another leave type
                  </button>
                </div>
                <ul className="mt-2 divide-y divide-[#E4E7EC] border-t border-[#E4E7EC] bg-white">
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
      <div className="mx-auto hidden max-w-6xl space-y-4 px-0 lg:block lg:pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
              <CalendarDays className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h1 className="text-[18px] font-semibold text-[#1F2937]">Manage leave types</h1>
              <p className="text-[13px] text-[#6B7280]">
                Create and rename leave categories for{" "}
                <span className="font-medium text-[#374151]">{orgName}</span>.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void loadList({ silent: true })}
              disabled={orgMissing || loading || refreshing}
              className={zohoSecondaryBtnCls()}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
              Refresh
            </button>
            <button
              type="button"
              onClick={openAdd}
              disabled={orgMissing}
              className={zohoPrimaryBtnCls()}
            >
              <Plus className="h-4 w-4" aria-hidden />
              {rows.length === 0 ? "Add leave type" : "Add another"}
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-[#E4E7EC] bg-white p-4 shadow-sm">
          {loadError ? (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2 text-[13px] text-[#D93025]">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {loadError}
            </div>
          ) : null}
          {statusBanner ? <div className="mb-3">{statusBanner}</div> : null}

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-14 text-[#6B7280]">
              <Loader2 className="h-7 w-7 animate-spin text-[#008CD3]" aria-hidden />
              <p className="text-[13px]">Loading leave types…</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center rounded-lg border border-dashed border-[#E4E7EC] bg-[#F9FAFB] px-4 py-12 text-center">
              <CalendarDays className="mb-2 h-8 w-8 text-[#9CA3AF]" aria-hidden />
              <p className="text-[15px] font-semibold text-[#1F2937]">No leave types yet</p>
              <p className="mt-1 max-w-sm text-[13px] text-[#6B7280]">
                Add categories such as Casual, Sick, or Earned leave.
              </p>
              <button type="button" onClick={openAdd} className={`mt-4 ${zohoPrimaryBtnCls()}`}>
                <Plus className="h-4 w-4" aria-hidden />
                Add leave type
              </button>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((row) => (
                <LeaveTypeCard key={String(row.id)} row={row} onEdit={() => openEdit(row)} />
              ))}
            </ul>
          )}
        </div>
      </div>

      {sheetOpen ? (
        <div
          className="fixed inset-0 z-[10060] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeSheet();
          }}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-t-lg border border-[#E4E7EC] border-t-[3px] border-t-[#008CD3] bg-white shadow-xl sm:rounded-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-type-sheet-title"
          >
            <div className="border-b border-[#E4E7EC] px-3 py-2.5 sm:px-4">
              <div className="flex items-start justify-between gap-2">
                <h2
                  id="leave-type-sheet-title"
                  className="text-[15px] font-semibold text-[#1F2937] sm:text-[16px]"
                >
                  {sheetTitle}
                </h2>
                <button
                  type="button"
                  onClick={() => closeSheet()}
                  disabled={submitting}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#E4E7EC] text-[#6B7280] hover:bg-[#F9FAFB]"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-3 sm:p-4">
              {formError ? (
                <div className="mb-3 flex items-start gap-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2 text-[12px] text-[#D93025]">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  {formError}
                </div>
              ) : null}
              <div>
                <label htmlFor="leave-type-name" className={labelCls()}>
                  Leave type name <span className="text-[#D93025]">*</span>
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
              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
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
