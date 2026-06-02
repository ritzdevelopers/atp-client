"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, startTransition } from "react";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  BadgeIndianRupee,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import {
  type EmployeeSalaryRecord,
  getEmployeeSalary,
  registerEmployeeSalary,
  updateEmployeeSalary,
} from "@/services/employeeSalary";

type PageMode = "loading" | "view" | "add" | "edit";

type SalaryFormState = {
  basic_salary: string;
  house_rent_allowance: string;
  special_allowance: string;
  convey: string;
};

const EMPTY_FORM: SalaryFormState = {
  basic_salary: "",
  house_rent_allowance: "",
  special_allowance: "",
  convey: "",
};

function labelCls() {
  return "mb-1.5 block text-sm font-medium text-[#0C123A]";
}

function inputCls() {
  return "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#0C123A] shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#C99237] focus:ring-2 focus:ring-[#C99237]/20";
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function salaryToForm(s: EmployeeSalaryRecord): SalaryFormState {
  return {
    basic_salary: String(s.basic_salary),
    house_rent_allowance: String(s.house_rent_allowance),
    special_allowance: String(s.special_allowance),
    convey: String(s.convey),
  };
}

function SalaryFormFields({
  form,
  setForm,
  disabled,
  idPrefix,
}: {
  form: SalaryFormState;
  setForm: React.Dispatch<React.SetStateAction<SalaryFormState>>;
  disabled: boolean;
  idPrefix: string;
}) {
  const fields: Array<{ key: keyof SalaryFormState; label: string }> = [
    { key: "basic_salary", label: "Basic salary" },
    { key: "house_rent_allowance", label: "House rent allowance (HRA)" },
    { key: "special_allowance", label: "Special allowance" },
    { key: "convey", label: "Conveyance" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map(({ key, label }) => (
        <div key={key} className={key === "basic_salary" ? "sm:col-span-2" : ""}>
          <label htmlFor={`${idPrefix}-${key}`} className={labelCls()}>
            {label} <span className="text-red-500">*</span>
          </label>
          <input
            id={`${idPrefix}-${key}`}
            type="number"
            min="0"
            step="0.01"
            className={inputCls()}
            value={form[key]}
            onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
            disabled={disabled}
            required
          />
        </div>
      ))}
    </div>
  );
}

function SalaryBreakdown({ salary }: { salary: EmployeeSalaryRecord }) {
  const rows = [
    { label: "Basic salary", value: salary.basic_salary },
    { label: "House rent allowance", value: salary.house_rent_allowance },
    { label: "Special allowance", value: salary.special_allowance },
    { label: "Conveyance", value: salary.convey },
  ];

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3"
        >
          <span className="text-sm text-slate-600">{row.label}</span>
          <span className="text-sm font-semibold tabular-nums text-[#0C123A]">
            {formatMoney(Number(row.value))}
          </span>
        </div>
      ))}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-[#C99237]/30 bg-[#C99237]/10 px-4 py-3.5">
        <span className="font-semibold text-[#0C123A]">Gross salary</span>
        <span className="text-lg font-bold tabular-nums text-[#0C123A]">
          {formatMoney(Number(salary.gross_salary))}
        </span>
      </div>
      <dl className="grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
        <div>
          <dt className="font-medium">Created</dt>
          <dd>{formatDateTime(salary.created_at)}</dd>
        </div>
        <div>
          <dt className="font-medium">Last updated</dt>
          <dd>{formatDateTime(salary.updated_at)}</dd>
        </div>
      </dl>
    </div>
  );
}

export default function EmployeeSalaryClient({ employeeId }: { employeeId: string }) {
  const params = useParams();
  const ctx = useManagementDashboardContext();
  const orgIdParam = params?.org_id;

  const organizationIdNum =
    ctx?.organization?.id != null ? Number(ctx.organization.id) : Number(orgIdParam);
  const orgMissing = !organizationIdNum || Number.isNaN(organizationIdNum);
  const listPath = `/dashboard/${orgIdParam ?? ""}/organization-payroll-management/manage-employee-salary`;

  const [pageMode, setPageMode] = useState<PageMode>("loading");
  const [salary, setSalary] = useState<EmployeeSalaryRecord | null>(null);
  const [employeeName, setEmployeeName] = useState<string>("Employee");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<SalaryFormState>({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadSalary = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent === true;
      if (orgMissing || !employeeId) {
        setPageMode("view");
        setSalary(null);
        return;
      }
      const token = localStorage.getItem("token");
      if (!token) {
        setLoadError("Not signed in.");
        setPageMode("view");
        return;
      }
      setLoadError(null);
      if (!silent) setPageMode("loading");
      else setRefreshing(true);
      try {
        const data = await getEmployeeSalary(token, organizationIdNum, employeeId);
        setSalary(data);
        if (data?.employee_name) {
          setEmployeeName(data.employee_name.trim());
        }
        setPageMode("view");
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Could not load salary.");
        setSalary(null);
        setPageMode("view");
      } finally {
        if (silent) setRefreshing(false);
      }
    },
    [orgMissing, organizationIdNum, employeeId],
  );

  useEffect(() => {
    startTransition(() => {
      void loadSalary();
    });
  }, [loadSalary]);

  function startAddForm() {
    setFormError(null);
    setSuccess(null);
    setForm({ ...EMPTY_FORM });
    setPageMode("add");
  }

  function confirmEdit() {
    if (!salary) return;
    setFormError(null);
    setSuccess(null);
    setForm(salaryToForm(salary));
    setShowEditConfirm(false);
    setPageMode("edit");
  }

  function cancelForm() {
    if (submitting) return;
    setFormError(null);
    setPageMode("view");
    setForm({ ...EMPTY_FORM });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);

    if (orgMissing) {
      setFormError("Invalid organization.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setFormError("Not signed in.");
      return;
    }

    const payload = {
      org_id: organizationIdNum,
      employee_id: employeeId,
      basic_salary: form.basic_salary,
      house_rent_allowance: form.house_rent_allowance,
      special_allowance: form.special_allowance,
      convey: form.convey,
    };

    setSubmitting(true);
    try {
      if (pageMode === "add") {
        const result = await registerEmployeeSalary(token, payload);
        setSuccess(result.message || "Salary created successfully.");
        if (result.data?.employee_name) {
          setEmployeeName(result.data.employee_name);
        }
      } else {
        const result = await updateEmployeeSalary(token, payload);
        setSuccess(result.message || "Salary updated successfully.");
        if (result.data?.employee_name) {
          setEmployeeName(result.data.employee_name);
        }
      }
      await loadSalary({ silent: true });
      setPageMode("view");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save salary.");
    } finally {
      setSubmitting(false);
    }
  }

  const hasSalary = salary != null;
  const isFormMode = pageMode === "add" || pageMode === "edit";

  return (
    <div className="min-h-full bg-[#F5F7FA] lg:bg-transparent">
      {/* Stack header */}
      <div className="sticky top-0 z-20 border-b border-[#E4E7EC] bg-white shadow-sm lg:rounded-t-2xl lg:border lg:border-b-0 lg:border-slate-200/90">
        <div className="flex items-center gap-2 px-3 py-3 sm:px-4 lg:px-6">
          <Link
            href={listPath}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#1F2937] transition hover:bg-slate-50"
            aria-label="Back to employee list"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#C99237]/12">
            <BadgeIndianRupee className="h-5 w-5 text-[#C99237]" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[17px] font-semibold text-[#1F2937] lg:text-lg lg:text-[#0C123A]">
              {employeeName}
            </h1>
            <p className="truncate text-[13px] text-[#6B7280]">
              {pageMode === "loading"
                ? "Loading salary…"
                : hasSalary
                  ? "Salary on file"
                  : "No salary record"}
            </p>
          </div>
          {!isFormMode ? (
            <button
              type="button"
              onClick={() => void loadSalary({ silent: true })}
              disabled={pageMode === "loading" || refreshing}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#008CD3] disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-5 lg:px-6 lg:py-8">
        {loadError ? (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {loadError}
          </div>
        ) : null}

        {success && pageMode === "view" ? (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            {success}
          </div>
        ) : null}

        {pageMode === "loading" ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-500">
            <Loader2 className="h-9 w-9 animate-spin text-[#C99237]" />
            <p className="text-sm">Loading salary information…</p>
          </div>
        ) : null}

        {pageMode === "view" && !loadError ? (
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
            {!hasSalary ? (
              <div className="text-center">
                <BadgeIndianRupee className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-4 text-base font-semibold text-[#0C123A]">No salary on file</p>
                <p className="mt-2 text-sm text-slate-500">
                  This employee does not have a salary record yet. Add components to calculate
                  gross pay.
                </p>
                <button
                  type="button"
                  onClick={startAddForm}
                  className="mt-6 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#C99237] px-5 py-2.5 text-sm font-bold text-[#0C123A] shadow-sm hover:bg-[#b87d2e]"
                >
                  <Plus className="h-4 w-4" />
                  Add salary
                </button>
              </div>
            ) : (
              <>
                <SalaryBreakdown salary={salary} />
                <button
                  type="button"
                  onClick={() => setShowEditConfirm(true)}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0C123A] shadow-sm transition hover:bg-slate-50 sm:w-auto"
                >
                  <Pencil className="h-4 w-4" />
                  Edit salary
                </button>
              </>
            )}
          </div>
        ) : null}

        {isFormMode ? (
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-base font-semibold text-[#0C123A]">
              {pageMode === "add" ? "Add salary" : "Edit salary"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {pageMode === "add"
                ? "Enter salary components for this employee."
                : "Update amounts below. Changes are logged in the activity feed."}
            </p>

            {formError ? (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {formError}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-5 space-y-5">
              <SalaryFormFields
                form={form}
                setForm={setForm}
                disabled={submitting}
                idPrefix={pageMode}
              />
              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={cancelForm}
                  disabled={submitting}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#C99237] px-5 py-2.5 text-sm font-bold text-[#0C123A] shadow-sm hover:bg-[#b87d2e] disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {pageMode === "add" ? "Save salary" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </div>

      {/* Edit confirmation — only modal on this flow */}
      {showEditConfirm ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowEditConfirm(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-salary-confirm-title"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-700" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="edit-salary-confirm-title" className="text-lg font-bold text-slate-900">
                  Edit salary?
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  You are about to change salary components for{" "}
                  <span className="font-semibold text-slate-900">{employeeName}</span>. This
                  affects payroll records and is saved to the activity log.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditConfirm(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowEditConfirm(false)}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmEdit}
                className="rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-700"
              >
                Yes, continue to edit
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
