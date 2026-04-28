"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { ShieldPlus, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import { createOrganizationRole } from "@/services/adminUser";

function labelCls() {
  return "mb-1.5 block text-sm font-medium text-[#0C123A]";
}

function inputCls() {
  return "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#0C123A] shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#C99237] focus:ring-2 focus:ring-[#C99237]/20";
}

export default function CreateNewRolePage() {
  const params = useParams();
  const orgIdParam = params?.org_id;
  const ctx = useManagementDashboardContext();

  const [roleName, setRoleName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const organizationIdNum =
    ctx?.organization?.id != null ? Number(ctx.organization.id) : Number(orgIdParam);
  const orgName = ctx?.organization?.org_name?.trim() || `Organization ${orgIdParam ?? ""}`;
  const orgMissing = !organizationIdNum || Number.isNaN(organizationIdNum);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);

    const trimmed = roleName.trim();
    if (!trimmed) {
      setFormError("Enter a role name.");
      return;
    }
    if (trimmed.length < 2) {
      setFormError("Role name must be at least 2 characters.");
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
      await createOrganizationRole(token, {
        role_name: trimmed,
        organization_id: organizationIdNum,
      });
      setSuccess("Role created successfully. It will appear in lowercase in the system.");
      setRoleName("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not create role.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#C99237]/12">
            <ShieldPlus className="h-6 w-6 text-[#C99237]" aria-hidden />
          </span>
          <div>
            <h1 className="text-xl font-bold text-[#0C123A] sm:text-2xl">Create role</h1>
            <p className="mt-1 text-sm text-slate-500">
              Define a new role for <span className="font-medium text-slate-700">{orgName}</span>.
              Role names are stored in lowercase and must be unique per organization.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
        {success && (
          <div
            className="mb-6 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
            role="status"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            <span>{success}</span>
          </div>
        )}

        {formError && (
          <div
            className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="org-context" className={labelCls()}>
              Organization
            </label>
            <input
              id="org-context"
              type="text"
              className={`${inputCls()} bg-slate-50 text-slate-600`}
              value={orgMissing ? "—" : `${orgName} (ID: ${organizationIdNum})`}
              readOnly
              tabIndex={-1}
              aria-readonly
            />
          </div>

          <div>
            <label htmlFor="role-name" className={labelCls()}>
              Role name <span className="text-red-500">*</span>
            </label>
            <input
              id="role-name"
              name="role_name"
              type="text"
              autoComplete="off"
              className={inputCls()}
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="e.g. field supervisor, payroll specialist"
              disabled={orgMissing}
              required
              minLength={2}
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Examples: manager, hr, staff. Duplicates are not allowed for this organization.
            </p>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setSuccess(null);
                setRoleName("");
              }}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0C123A] shadow-sm transition hover:bg-slate-50"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={submitting || orgMissing}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#C99237] px-5 py-2.5 text-sm font-bold text-[#0C123A] shadow-sm transition hover:bg-[#b87d2e] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Creating…
                </>
              ) : (
                <>
                  <ShieldPlus className="h-4 w-4" aria-hidden />
                  Create role
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
