"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Loader2,
  PlusCircle,
  UserRound,
} from "lucide-react";
import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import {
  createUserBackgroundVerification,
  type BackgroundVerificationInfoPayload,
  type BackgroundVerificationPersonRole,
} from "@/services/adminUser";

function labelCls() {
  return "mb-1 block text-[12px] font-medium text-[#374151] lg:text-[13px]";
}

function inputCls() {
  return "w-full rounded-lg border border-[#E4E7EC] bg-white px-3 py-2 text-[14px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15";
}

function panelCls() {
  return "overflow-hidden rounded-lg border border-[#E4E7EC] bg-white p-3 shadow-sm sm:p-4 lg:p-6";
}

function btnPrimaryCls() {
  return "inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-lg bg-[#008CD3] px-4 py-2 text-[14px] font-medium text-white transition hover:bg-[#0070AA] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto";
}

function btnSecondaryCls() {
  return "inline-flex min-h-[40px] w-full items-center justify-center rounded-lg border border-[#E4E7EC] bg-white px-4 py-2 text-[14px] font-medium text-[#374151] transition hover:bg-[#F9FAFB] disabled:opacity-50 lg:w-auto";
}

function btnSkipCls() {
  return "inline-flex min-h-[40px] w-full items-center justify-center rounded-lg border border-dashed border-[#E4E7EC] bg-[#F9FAFB] px-4 py-2 text-[13px] font-medium text-[#374151] transition hover:border-[#008CD3]/40 hover:bg-white disabled:opacity-50 lg:w-auto";
}

function alertErrorCls() {
  return "mb-4 flex items-start gap-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2.5 text-[13px] text-[#1F2937]";
}

function alertSuccessCls() {
  return "mb-4 flex items-start gap-2 rounded-lg border border-[#A8DAB5] bg-[#E6F4EA] px-3 py-2.5 text-[13px] text-[#1F2937]";
}

type CompanyDraftRow = {
  key: string;
  previous_company_name: string;
  company_email: string;
  employee_code: string;
  designation: string;
  employment_start_date: string;
  employment_end_date: string;
  person_name: string;
  person_role: BackgroundVerificationPersonRole;
  person_contact_number1: string;
  person_contact_number2: string;
  person_contact_email: string;
};

function createEmptyCompanyDraft(): CompanyDraftRow {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    previous_company_name: "",
    company_email: "",
    employee_code: "",
    designation: "",
    employment_start_date: "",
    employment_end_date: "",
    person_name: "",
    person_role: "hr",
    person_contact_number1: "",
    person_contact_number2: "",
    person_contact_email: "",
  };
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function rowToPayload(row: CompanyDraftRow): BackgroundVerificationInfoPayload {
  const payload: BackgroundVerificationInfoPayload = {
    previous_company_name: row.previous_company_name.trim(),
    person_name: row.person_name.trim(),
    person_role: row.person_role,
    person_contact_number1: row.person_contact_number1.trim(),
    person_contact_email: row.person_contact_email.trim(),
  };
  if (row.company_email.trim()) payload.company_email = row.company_email.trim();
  if (row.employee_code.trim()) payload.employee_code = row.employee_code.trim();
  if (row.designation.trim()) payload.designation = row.designation.trim();
  if (row.employment_start_date.trim()) {
    payload.employment_start_date = row.employment_start_date.trim();
  }
  if (row.employment_end_date.trim()) {
    payload.employment_end_date = row.employment_end_date.trim();
  }
  if (row.person_contact_number2.trim()) {
    payload.person_contact_number2 = row.person_contact_number2.trim();
  }
  return payload;
}

function validateRow(row: CompanyDraftRow, index: number): string | null {
  const label = `Company ${index + 1}`;
  if (!row.previous_company_name.trim()) {
    return `${label}: previous company name is required.`;
  }
  if (!row.person_name.trim()) {
    return `${label}: contact person name is required.`;
  }
  if (!row.person_contact_number1.trim()) {
    return `${label}: primary contact number is required.`;
  }
  if (!row.person_contact_email.trim()) {
    return `${label}: contact email is required.`;
  }
  if (!isValidEmail(row.person_contact_email)) {
    return `${label}: enter a valid contact email.`;
  }
  if (row.company_email.trim() && !isValidEmail(row.company_email)) {
    return `${label}: enter a valid company email.`;
  }
  if (
    row.employment_start_date &&
    row.employment_end_date &&
    row.employment_end_date < row.employment_start_date
  ) {
    return `${label}: employment end date cannot be before start date.`;
  }
  return null;
}

export default function PreviousCompanyReferencePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const ctx = useManagementDashboardContext();

  const orgIdParam = params?.org_id;
  const employeeId = searchParams.get("employee_id");
  const employeeName = searchParams.get("employee_name")?.trim() || "Employee";

  const organizationIdNum =
    ctx?.organization?.id != null ? Number(ctx.organization.id) : Number(orgIdParam);

  const [rows, setRows] = useState<CompanyDraftRow[]>([createEmptyCompanyDraft()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onboardingReturnUrl = useMemo(() => {
    const base = `/dashboard/${orgIdParam}/organization-employees/employee-onboarding`;
    if (!employeeId) return base;
    const q = new URLSearchParams({
      employee_id: employeeId,
      employee_name: employeeName,
      step: "assets",
    });
    return `${base}?${q.toString()}`;
  }, [orgIdParam, employeeId, employeeName]);

  const referenceGatewayUrl = useMemo(() => {
    const base = `/dashboard/${orgIdParam}/organization-employees/employee-onboarding`;
    if (!employeeId) return base;
    const q = new URLSearchParams({
      employee_id: employeeId,
      employee_name: employeeName,
      step: "reference",
    });
    return `${base}?${q.toString()}`;
  }, [orgIdParam, employeeId, employeeName]);

  function updateRow(key: string, patch: Partial<CompanyDraftRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function handleSkipFresher() {
    router.push(onboardingReturnUrl);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!employeeId) {
      setError("Missing employee. Return to onboarding and create an employee first.");
      return;
    }
    if (!organizationIdNum || Number.isNaN(organizationIdNum)) {
      setError("Invalid organization.");
      return;
    }

    for (let i = 0; i < rows.length; i += 1) {
      const msg = validateRow(rows[i], i);
      if (msg) {
        setError(msg);
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
      const background_verification_info = rows.map(rowToPayload);
      await createUserBackgroundVerification(token, {
        org_id: organizationIdNum,
        employee_id: employeeId,
        background_verification_info:
          background_verification_info.length === 1
            ? background_verification_info[0]
            : background_verification_info,
      });
      setSuccess("Previous company reference saved. Continuing onboarding…");
      setTimeout(() => router.push(onboardingReturnUrl), 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save previous company reference.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!employeeId) {
    return (
      <div className="mx-auto max-w-3xl px-3 py-6 sm:px-4 lg:px-6">
        <div className={panelCls()}>
          <div className={alertErrorCls()} role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#D93025]" aria-hidden />
            <span>No employee selected. Start from employee onboarding.</span>
          </div>
          <Link href={`/dashboard/${orgIdParam}/organization-employees/employee-onboarding`} className={btnPrimaryCls()}>
            Back to onboarding
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-3 px-3 py-4 sm:px-4 lg:space-y-4 lg:px-6 lg:py-6">
      <div className={panelCls()}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3] lg:h-10 lg:w-10">
              <Briefcase className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h1 className="text-[16px] font-semibold text-[#1F2937] lg:text-[18px]">
                Previous company reference
              </h1>
              <p className="mt-0.5 text-[12px] text-[#6B7280]">
                Background verification for{" "}
                <span className="font-medium text-[#374151]">{employeeName}</span>. Optional —
                skip if they are a fresher with no prior employment.
              </p>
            </div>
          </div>
          <Link href={referenceGatewayUrl} className={`${btnSecondaryCls()} shrink-0`}>
            <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden />
            Back
          </Link>
        </div>

        {error && (
          <div className={alertErrorCls()} role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#D93025]" aria-hidden />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className={alertSuccessCls()} role="status">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0F9D58]" aria-hidden />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {rows.map((row, index) => (
            <div
              key={row.key}
              className="space-y-4 rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] p-3 sm:p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[14px] font-semibold text-[#1F2937]">
                  Previous company {rows.length > 1 ? index + 1 : ""}
                </h2>
                {rows.length > 1 && (
                  <button
                    type="button"
                    className="text-[12px] font-medium text-[#D93025] hover:underline"
                    onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                    disabled={submitting}
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelCls()}>
                    Previous company name <span className="text-red-500">*</span>
                  </label>
                  <input
                    className={inputCls()}
                    value={row.previous_company_name}
                    onChange={(e) => updateRow(row.key, { previous_company_name: e.target.value })}
                    placeholder="e.g. Acme Technologies Pvt Ltd"
                    maxLength={255}
                    disabled={submitting}
                    required
                  />
                </div>

                <div>
                  <label className={labelCls()}>Company email</label>
                  <input
                    type="email"
                    className={inputCls()}
                    value={row.company_email}
                    onChange={(e) => updateRow(row.key, { company_email: e.target.value })}
                    placeholder="hr@company.com"
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className={labelCls()}>Employee code</label>
                  <input
                    className={inputCls()}
                    value={row.employee_code}
                    onChange={(e) => updateRow(row.key, { employee_code: e.target.value })}
                    placeholder="Optional"
                    maxLength={100}
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className={labelCls()}>Designation</label>
                  <input
                    className={inputCls()}
                    value={row.designation}
                    onChange={(e) => updateRow(row.key, { designation: e.target.value })}
                    placeholder="e.g. Software Engineer"
                    maxLength={150}
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className={labelCls()}>Employment start date</label>
                  <input
                    type="date"
                    className={inputCls()}
                    value={row.employment_start_date}
                    onChange={(e) => updateRow(row.key, { employment_start_date: e.target.value })}
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className={labelCls()}>Employment end date</label>
                  <input
                    type="date"
                    className={inputCls()}
                    value={row.employment_end_date}
                    onChange={(e) => updateRow(row.key, { employment_end_date: e.target.value })}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="border-t border-[#E4E7EC] pt-4">
                <p className="mb-3 flex items-center gap-1.5 text-[12px] font-medium text-[#374151]">
                  <UserRound className="h-3.5 w-3.5 text-[#008CD3]" aria-hidden />
                  Verification contact at previous company
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls()}>
                      Contact person name <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={inputCls()}
                      value={row.person_name}
                      onChange={(e) => updateRow(row.key, { person_name: e.target.value })}
                      placeholder="HR or reporting manager name"
                      maxLength={250}
                      disabled={submitting}
                      required
                    />
                  </div>

                  <div>
                    <label className={labelCls()}>
                      Contact role <span className="text-red-500">*</span>
                    </label>
                    <select
                      className={inputCls()}
                      value={row.person_role}
                      onChange={(e) =>
                        updateRow(row.key, {
                          person_role: e.target.value as BackgroundVerificationPersonRole,
                        })
                      }
                      disabled={submitting}
                      required
                    >
                      <option value="hr">HR</option>
                      <option value="reporting_manager">Reporting manager</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelCls()}>
                      Primary phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={inputCls()}
                      value={row.person_contact_number1}
                      onChange={(e) =>
                        updateRow(row.key, { person_contact_number1: e.target.value })
                      }
                      placeholder="Contact number"
                      maxLength={20}
                      disabled={submitting}
                      required
                    />
                  </div>

                  <div>
                    <label className={labelCls()}>Secondary phone</label>
                    <input
                      className={inputCls()}
                      value={row.person_contact_number2}
                      onChange={(e) =>
                        updateRow(row.key, { person_contact_number2: e.target.value })
                      }
                      placeholder="Optional"
                      maxLength={20}
                      disabled={submitting}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className={labelCls()}>
                      Contact email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      className={inputCls()}
                      value={row.person_contact_email}
                      onChange={(e) =>
                        updateRow(row.key, { person_contact_email: e.target.value })
                      }
                      placeholder="person@previouscompany.com"
                      disabled={submitting}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            className="inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#008CD3]/50 bg-[#E8F4FB] px-4 py-2 text-[13px] font-medium text-[#008CD3] transition hover:bg-[#008CD3]/10 disabled:opacity-50"
            onClick={() => setRows((prev) => [...prev, createEmptyCompanyDraft()])}
            disabled={submitting}
          >
            <PlusCircle className="h-4 w-4" aria-hidden />
            Add another previous company
          </button>

          <div className="flex flex-col gap-2 border-t border-[#E4E7EC] pt-4 lg:flex-row lg:flex-wrap lg:items-center">
            <button
              type="button"
              className={btnSkipCls()}
              onClick={handleSkipFresher}
              disabled={submitting}
            >
              No reference — fresher employee
            </button>
            <button type="submit" className={btnPrimaryCls()} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                <>
                  <Briefcase className="h-4 w-4" aria-hidden />
                  Save &amp; continue onboarding
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
