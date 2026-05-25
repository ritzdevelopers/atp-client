"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { ShieldPlus, Loader2, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import { createOrganizationRole } from "@/services/adminUser";

function labelCls(mobile = false) {
  return mobile
    ? "mb-1.5 block text-[13px] font-medium text-[#6B7280]"
    : "mb-1.5 block text-sm font-medium text-[#0C123A]";
}

function inputCls() {
  return "w-full rounded-lg border border-[#E4E7EC] bg-white px-3.5 py-3 text-[15px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15 lg:border-slate-200 lg:py-2.5 lg:text-sm lg:text-[#0C123A] lg:shadow-sm lg:focus:border-[#C99237] lg:focus:ring-[#C99237]/20";
}

function zohoPrimaryBtnCls(full = false) {
  return `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#008CD3] px-5 py-2.5 text-[15px] font-medium text-white transition active:scale-[0.98] hover:bg-[#0070AA] disabled:pointer-events-none disabled:opacity-50 lg:bg-[#C99237] lg:text-sm lg:font-bold lg:text-[#0C123A] lg:hover:bg-[#b87d2e] ${full ? "w-full" : ""}`;
}

function zohoSecondaryBtnCls(full = false) {
  return `inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[#E4E7EC] bg-white px-4 py-2.5 text-[15px] font-medium text-[#1F2937] transition active:scale-[0.98] hover:bg-[#F5F7FA] lg:border-slate-200 lg:text-sm lg:font-semibold lg:text-[#0C123A] lg:shadow-sm lg:hover:bg-slate-50 ${full ? "w-full" : ""}`;
}

export default function CreateNewRolePage() {
  const params = useParams();
  const orgIdParam = params?.org_id;
  const ctx = useManagementDashboardContext();

  const [roleName, setRoleName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mobileMainTab, setMobileMainTab] = useState<"create" | "guide">("create");

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

  function clearForm() {
    setFormError(null);
    setSuccess(null);
    setRoleName("");
  }

  const mobileTabs = [
    { id: "create" as const, label: "Create" },
    { id: "guide" as const, label: "Guide" },
  ];

  const statusBanner = success ? (
    <div
      className="flex items-start gap-2 rounded-lg border border-[#A8DAB5] bg-[#E6F4EA] px-4 py-3 text-[14px] text-[#0F9D58] lg:border-emerald-200 lg:bg-emerald-50 lg:text-sm lg:text-emerald-900"
      role="status"
    >
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 lg:text-emerald-600" aria-hidden />
      <span>{success}</span>
    </div>
  ) : formError ? (
    <div
      className="flex items-start gap-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-4 py-3 text-[14px] text-[#D93025] lg:border-red-200 lg:bg-red-50 lg:text-sm lg:text-red-900"
      role="alert"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 lg:text-red-600" aria-hidden />
      <span>{formError}</span>
    </div>
  ) : null;

  const roleFormFields = (mobile: boolean) => (
    <>
      <div>
        <label htmlFor={mobile ? "org-context-mobile" : "org-context"} className={labelCls(mobile)}>
          Organization
        </label>
        <input
          id={mobile ? "org-context-mobile" : "org-context"}
          type="text"
          className={`${inputCls()} bg-[#F5F7FA] text-[#6B7280] lg:bg-slate-50`}
          value={orgMissing ? "—" : `${orgName} (ID: ${organizationIdNum})`}
          readOnly
          tabIndex={-1}
          aria-readonly
        />
      </div>

      <div>
        <label htmlFor={mobile ? "role-name-mobile" : "role-name"} className={labelCls(mobile)}>
          Role name <span className="text-[#D93025] lg:text-red-500">*</span>
        </label>
        <input
          id={mobile ? "role-name-mobile" : "role-name"}
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
        <p className="mt-1.5 text-[13px] text-[#6B7280] lg:text-xs lg:text-slate-500">
          Examples: manager, hr, staff. Duplicates are not allowed for this organization.
        </p>
      </div>
    </>
  );

  return (
    <div className="min-h-full bg-[#F5F7FA] pb-28 lg:bg-transparent lg:space-y-6 lg:pb-0">
      {/* Mobile & tablet: Zoho admin portal style */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-20 border-b border-[#E4E7EC] bg-white shadow-sm">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
              <ShieldPlus className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[17px] font-semibold text-[#1F2937]">Create role</h1>
              <p className="truncate text-[13px] text-[#6B7280]">{orgName}</p>
            </div>
          </div>

          <div className="px-4 pb-3">
            <div className="flex rounded-lg bg-[#F5F7FA] p-1">
              {mobileTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMobileMainTab(tab.id)}
                  className={`flex flex-1 items-center justify-center rounded-md py-2 text-[13px] font-medium transition ${
                    mobileMainTab === tab.id
                      ? "bg-white text-[#008CD3] shadow-sm"
                      : "text-[#6B7280]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {mobileMainTab === "create" ? (
          <div className="p-4">
            {statusBanner ? <div className="mb-4">{statusBanner}</div> : null}

            <form
              id="create-role-mobile-form"
              onSubmit={handleSubmit}
              className="space-y-4 rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm"
            >
              {roleFormFields(true)}
            </form>
          </div>
        ) : null}

        {mobileMainTab === "guide" ? (
          <div className="space-y-3 p-4">
            <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                About roles
              </p>
              <p className="mt-2 text-[14px] leading-relaxed text-[#4B5563]">
                Roles define permission groups for employees in your organization. After creating a
                role, assign features and map users from the roles management screens.
              </p>
            </div>

            <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Naming rules
              </p>
              <ul className="mt-3 space-y-3">
                {[
                  "Role names are stored in lowercase automatically.",
                  "Each name must be at least 2 characters.",
                  "Duplicate role names are not allowed per organization.",
                  "Use clear names like manager, hr, or staff.",
                ].map((item) => (
                  <li key={item} className="flex gap-3 text-[14px] text-[#4B5563]">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E8F4FB] text-[11px] font-semibold text-[#008CD3]">
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-[#E4E7EC] bg-[#E8F4FB] p-4">
              <div className="flex gap-3">
                <Info className="h-5 w-5 shrink-0 text-[#008CD3]" />
                <p className="text-[14px] leading-relaxed text-[#4B5563]">
                  The admin role is reserved and cannot be recreated here. New roles appear in feature
                  assignment and employee management once saved.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {mobileMainTab === "create" ? (
          <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 border-t border-[#E4E7EC] bg-white px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
            <div className="flex gap-2">
              <button type="button" onClick={clearForm} className={zohoSecondaryBtnCls(true)}>
                Clear
              </button>
              <button
                type="submit"
                form="create-role-mobile-form"
                disabled={submitting || orgMissing}
                className={zohoPrimaryBtnCls(true)}
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
          </div>
        ) : null}
      </div>

      {/* Desktop layout (unchanged) */}
      <div className="hidden space-y-6 lg:block">
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
          {statusBanner ? <div className="mb-6">{statusBanner}</div> : null}

          <form onSubmit={handleSubmit} className="space-y-5">
            {roleFormFields(false)}

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-end">
              <button type="button" onClick={clearForm} className={zohoSecondaryBtnCls()}>
                Clear
              </button>
              <button
                type="submit"
                disabled={submitting || orgMissing}
                className={zohoPrimaryBtnCls()}
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
    </div>
  );
}
