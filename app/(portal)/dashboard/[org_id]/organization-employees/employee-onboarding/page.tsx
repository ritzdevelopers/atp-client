"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  UserPlus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  MapPin,
  FileText,
  Upload,
} from "lucide-react";
import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import {
  addUserAddress,
  createEmployee,
  getOrganizationRoles,
  uploadEmployeeDocuments,
  type EmployeeOnboardingDocumentField,
  type OrgRoleRow,
} from "@/services/adminUser";

function labelCls() {
  return "mb-1.5 block text-sm font-medium text-[#0C123A]";
}

function inputCls() {
  return "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#0C123A] shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#C99237] focus:ring-2 focus:ring-[#C99237]/20";
}

const PASSWORD_MIN = 8;

const ONBOARDING_DOC_FIELDS: {
  field: EmployeeOnboardingDocumentField;
  label: string;
  hint: string;
}[] = [
  {
    field: "user_image",
    label: "Employee photo",
    hint: "Recent photo of the employee (PNG, JPG, or PDF, max 5 MB).",
  },
  {
    field: "user_pan_card",
    label: "PAN card",
    hint: "PAN card scan or photo.",
  },
  {
    field: "user_aadhar_front",
    label: "Aadhaar — front",
    hint: "Front side of Aadhaar.",
  },
  {
    field: "user_aadhar_back",
    label: "Aadhaar — back",
    hint: "Back side of Aadhaar.",
  },
  {
    field: "user_passbook",
    label: "Bank passbook",
    hint: "Passbook page showing account details.",
  },
  {
    field: "user_passport_photo",
    label: "Passport-size photo",
    hint: "Passport-size photograph.",
  },
];

function passwordLengthOk(value: string) {
  return value.length >= PASSWORD_MIN;
}

function fileInputCls() {
  return "block w-full cursor-pointer rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm text-[#0C123A] shadow-sm outline-none transition file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-[#C99237]/15 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-[#0C123A] hover:border-[#C99237]/50 focus:border-[#C99237] focus:ring-2 focus:ring-[#C99237]/20";
}

export default function EmployeOnboardingPage() {
  const params = useParams();
  const orgIdParam = params?.org_id;
  const ctx = useManagementDashboardContext();

  const [roles, setRoles] = useState<OrgRoleRow[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [userRoleId, setUserRoleId] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [createdEmployeeId, setCreatedEmployeeId] = useState<number | string | null>(null);
  const [createdEmployeeName, setCreatedEmployeeName] = useState("");
  const [addressCountry, setAddressCountry] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressDistrict, setAddressDistrict] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressIsFromVillage, setAddressIsFromVillage] = useState(false);
  const [addressVillage, setAddressVillage] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressHouseNumber, setAddressHouseNumber] = useState("");
  const [addressZipCode, setAddressZipCode] = useState("");
  const [addressSubmitting, setAddressSubmitting] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressSuccess, setAddressSuccess] = useState<string | null>(null);

  const [onboardingStep, setOnboardingStep] = useState<"basic" | "documents" | "address">("basic");
  const [docFiles, setDocFiles] = useState<Partial<Record<EmployeeOnboardingDocumentField, File>>>({});
  const [documentsSubmitting, setDocumentsSubmitting] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);

  const organizationIdNum =
    ctx?.organization?.id != null ? Number(ctx.organization.id) : Number(orgIdParam);
  const orgName = ctx?.organization?.org_name?.trim() || `Organization ${orgIdParam ?? ""}`;

  const passwordsValid =
    passwordLengthOk(password) && password === confirmPassword && confirmPassword.length > 0;

  function resetAddressForm() {
    setAddressCountry("");
    setAddressState("");
    setAddressDistrict("");
    setAddressCity("");
    setAddressIsFromVillage(false);
    setAddressVillage("");
    setAddressStreet("");
    setAddressHouseNumber("");
    setAddressZipCode("");
    setAddressError(null);
  }

  function resetDocumentsForm() {
    setDocFiles({});
    setDocumentsError(null);
  }

  function resetFullOnboarding() {
    setFormError(null);
    setSuccess(null);
    setCreatedEmployeeId(null);
    setCreatedEmployeeName("");
    setAddressSuccess(null);
    setAddressError(null);
    resetAddressForm();
    resetDocumentsForm();
    setOnboardingStep("basic");
    setName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    if (roles.length > 0) setUserRoleId(String(roles[0].id));
  }

  useEffect(() => {
    let cancelled = false;

    async function loadRoles() {
      await Promise.resolve();
      if (cancelled) return;

      if (!organizationIdNum || Number.isNaN(organizationIdNum)) {
        setRolesLoading(false);
        setRolesError("Missing organization.");
        return;
      }
      const token = localStorage.getItem("token");
      if (!token) {
        setRolesLoading(false);
        setRolesError("Not signed in.");
        return;
      }
      setRolesError(null);
      setRolesLoading(true);
      try {
        const list = await getOrganizationRoles(token, organizationIdNum);
        if (cancelled) return;
        setRoles(list);
        if (list.length > 0) {
          setUserRoleId(String(list[0].id));
        }
      } catch (e) {
        if (cancelled) return;
        setRolesError(e instanceof Error ? e.message : "Failed to load roles");
        setRoles([]);
      } finally {
        if (!cancelled) setRolesLoading(false);
      }
    }

    void loadRoles();
    return () => {
      cancelled = true;
    };
  }, [organizationIdNum]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);

    if (!name.trim() || !email.trim() || !phone.trim() || !password) {
      setFormError("Please fill in all required fields.");
      return;
    }
    if (!passwordLengthOk(password)) {
      setFormError(`Password must be at least ${PASSWORD_MIN} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }
    if (!userRoleId) {
      setFormError("Select a role for the new employee.");
      return;
    }
    if (!organizationIdNum || Number.isNaN(organizationIdNum)) {
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
      const employeeName = name.trim();
      const result = await createEmployee(token, {
        name: employeeName,
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim(),
        user_role_id: Number(userRoleId),
        organization_id: organizationIdNum,
      });
      const newUserId = result.data?.user_id ?? result.user_id;
      if (!newUserId) {
        setFormError("Employee was created but no user id was returned. Check the API response or try again.");
        return;
      }
      setCreatedEmployeeId(newUserId);
      setCreatedEmployeeName(employeeName);
      setAddressSuccess(null);
      resetAddressForm();
      resetDocumentsForm();
      setOnboardingStep("documents");
      setSuccess(
        `Account created for ${employeeName}. Upload the required documents below (PNG, JPG, or PDF, up to 5 MB each).`,
      );
      setName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirmPassword(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDocumentsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setDocumentsError(null);

    if (!createdEmployeeId) {
      setDocumentsError("Create an employee first.");
      return;
    }
    if (!organizationIdNum || Number.isNaN(organizationIdNum)) {
      setDocumentsError("Invalid organization.");
      return;
    }

    const missing = ONBOARDING_DOC_FIELDS.filter((s) => !docFiles[s.field]);
    if (missing.length > 0) {
      setDocumentsError(`Please attach all required documents (${missing.map((m) => m.label).join(", ")}).`);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setDocumentsError("Not signed in.");
      return;
    }

    setDocumentsSubmitting(true);
    try {
      await uploadEmployeeDocuments(token, {
        org_id: organizationIdNum,
        employee_user_id: createdEmployeeId,
        files: docFiles as Record<EmployeeOnboardingDocumentField, File>,
      });
      resetDocumentsForm();
      setOnboardingStep("address");
      setSuccess(null);
    } catch (err) {
      setDocumentsError(err instanceof Error ? err.message : "Document upload failed.");
    } finally {
      setDocumentsSubmitting(false);
    }
  }

  async function handleAddressSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAddressError(null);
    setAddressSuccess(null);

    if (!createdEmployeeId) {
      setAddressError("Create an employee first.");
      return;
    }
    if (!organizationIdNum || Number.isNaN(organizationIdNum)) {
      setAddressError("Invalid organization.");
      return;
    }
    if (
      !addressCountry.trim() ||
      !addressState.trim() ||
      !addressDistrict.trim() ||
      !addressCity.trim() ||
      !addressStreet.trim() ||
      !addressHouseNumber.trim() ||
      !addressZipCode.trim() ||
      (addressIsFromVillage && !addressVillage.trim())
    ) {
      setAddressError("Please fill in all required address fields.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setAddressError("Not signed in.");
      return;
    }

    setAddressSubmitting(true);
    try {
      await addUserAddress(token, {
        user_id: createdEmployeeId,
        org_id: organizationIdNum,
        country: addressCountry.trim(),
        state: addressState.trim(),
        district: addressDistrict.trim(),
        city: addressCity.trim(),
        is_from_village: addressIsFromVillage,
        village_name: addressIsFromVillage ? addressVillage.trim() : null,
        street: addressStreet.trim(),
        house_number: addressHouseNumber.trim(),
        zip_code: addressZipCode.trim(),
      });
      setAddressSuccess("Employee address added successfully.");
      resetAddressForm();
      resetDocumentsForm();
      setOnboardingStep("basic");
      setCreatedEmployeeId(null);
      setCreatedEmployeeName("");
    } catch (err) {
      setAddressError(err instanceof Error ? err.message : "Could not add employee address.");
    } finally {
      setAddressSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#C99237]/12">
              <UserPlus className="h-6 w-6 text-[#C99237]" aria-hidden />
            </span>
            <div>
              <h1 className="text-xl font-bold text-[#0C123A] sm:text-2xl">Employee onboarding</h1>
              <p className="mt-1 text-sm text-slate-500">
                Add a new team member to <span className="font-medium text-slate-700">{orgName}</span>.
                They will be able to sign in with the email and password you set.
              </p>
            </div>
          </div>
        </div>
      </div>

      <nav
        className="rounded-2xl border border-slate-200/90 bg-white px-4 py-4 shadow-sm sm:px-8"
        aria-label="Onboarding steps"
      >
        <ol className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-8 sm:text-sm">
          <li
            className={`flex items-center gap-2 font-semibold ${
              onboardingStep === "basic" ? "text-[#C99237]" : "text-emerald-700"
            }`}
          >
            {onboardingStep !== "basic" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#C99237]/20 text-xs text-[#0C123A]">
                1
              </span>
            )}
            Basic information
          </li>
          <li
            className={`flex items-center gap-2 font-semibold ${
              onboardingStep === "documents"
                ? "text-[#C99237]"
                : onboardingStep === "address"
                  ? "text-emerald-700"
                  : "text-slate-400"
            }`}
          >
            {onboardingStep === "address" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-600">
                2
              </span>
            )}
            Documents
          </li>
          <li
            className={`flex items-center gap-2 font-semibold ${
              onboardingStep === "address" ? "text-[#C99237]" : "text-slate-400"
            }`}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-600">
              3
            </span>
            Address
          </li>
        </ol>
      </nav>

      {onboardingStep === "basic" && (
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
        {addressSuccess && (
          <div
            className="mb-6 flex flex-col gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 sm:flex-row sm:items-center sm:justify-between"
            role="status"
          >
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              <span>{addressSuccess}</span>
            </div>
            <button
              type="button"
              onClick={() => setAddressSuccess(null)}
              className="shrink-0 rounded-lg border border-emerald-300/80 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 shadow-sm transition hover:bg-emerald-100/80"
            >
              Dismiss
            </button>
          </div>
        )}

        {success && (
          <div
            className="mb-6 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
            role="status"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            <span>{success}</span>
          </div>
        )}

        {(formError || rolesError) && (
          <div
            className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
            <span>{formError || rolesError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="emp-name" className={labelCls()}>
                Full name <span className="text-red-500">*</span>
              </label>
              <input
                id="emp-name"
                name="name"
                type="text"
                autoComplete="name"
                className={inputCls()}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jane Doe"
                required
              />
            </div>

            <div>
              <label htmlFor="emp-email" className={labelCls()}>
                Work email <span className="text-red-500">*</span>
              </label>
              <input
                id="emp-email"
                name="email"
                type="email"
                autoComplete="email"
                className={inputCls()}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
              />
            </div>

            <div>
              <label htmlFor="emp-phone" className={labelCls()}>
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                id="emp-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                className={inputCls()}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9999999999"
                required
              />
            </div>

            <div>
              <label htmlFor="emp-role" className={labelCls()}>
                Role <span className="text-red-500">*</span>
              </label>
              {rolesLoading ? (
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Loading roles…
                </div>
              ) : (
                <select
                  id="emp-role"
                  name="user_role_id"
                  className={inputCls()}
                  value={userRoleId}
                  onChange={(e) => setUserRoleId(e.target.value)}
                  required
                  disabled={roles.length === 0}
                >
                  {roles.length === 0 ? (
                    <option value="">No roles available</option>
                  ) : (
                    roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {(r.role_name ?? "Role").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </option>
                    ))
                  )}
                </select>
              )}
            </div>

            <div className="hidden sm:block" aria-hidden />

            <div>
              <label htmlFor="emp-password" className={labelCls()}>
                Temporary password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="emp-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className={`${inputCls()} pr-11`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={`At least ${PASSWORD_MIN} characters`}
                  required
                  minLength={PASSWORD_MIN}
                  aria-invalid={password.length > 0 && !passwordLengthOk(password)}
                  aria-describedby="emp-password-hint"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 outline-none transition hover:bg-slate-100 hover:text-[#0C123A] focus-visible:ring-2 focus-visible:ring-[#C99237]/40"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                </button>
              </div>
              <p id="emp-password-hint" className="mt-1.5 text-xs text-slate-500">
                Minimum {PASSWORD_MIN} characters (current: {password.length}).
              </p>
              {password.length > 0 && !passwordLengthOk(password) && (
                <p className="mt-1 text-xs font-medium text-red-600">
                  Password must be {PASSWORD_MIN} or more characters.
                </p>
              )}
              {passwordLengthOk(password) && (
                <p className="mt-1 text-xs font-medium text-emerald-600">Password length is valid.</p>
              )}
            </div>

            <div>
              <label htmlFor="emp-confirm" className={labelCls()}>
                Confirm password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="emp-confirm"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className={`${inputCls()} pr-11`}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  required
                  minLength={PASSWORD_MIN}
                  aria-invalid={
                    confirmPassword.length > 0 &&
                    (!passwordLengthOk(password) || password !== confirmPassword)
                  }
                  aria-describedby="emp-confirm-hint"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 outline-none transition hover:bg-slate-100 hover:text-[#0C123A] focus-visible:ring-2 focus-visible:ring-[#C99237]/40"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={
                    showConfirmPassword ? "Hide password confirmation" : "Show password confirmation"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden />
                  )}
                </button>
              </div>
              <p id="emp-confirm-hint" className="mt-1.5 text-xs text-slate-500">
                Must exactly match the password above.
              </p>
              {confirmPassword.length > 0 && passwordLengthOk(password) && password !== confirmPassword && (
                <p className="mt-1 text-xs font-medium text-red-600">Passwords do not match.</p>
              )}
              {confirmPassword.length > 0 &&
                passwordLengthOk(password) &&
                password === confirmPassword && (
                  <p className="mt-1 text-xs font-medium text-emerald-600">Passwords match.</p>
                )}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={resetFullOnboarding}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0C123A] shadow-sm transition hover:bg-slate-50"
            >
              Clear form
            </button>
            <button
              type="submit"
              disabled={
                submitting || rolesLoading || roles.length === 0 || !passwordsValid
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#C99237] px-5 py-2.5 text-sm font-bold text-[#0C123A] shadow-sm transition hover:bg-[#b87d2e] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Creating…
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" aria-hidden />
                  Create employee
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      )}

      {onboardingStep === "documents" && createdEmployeeId && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#C99237]/12">
              <FileText className="h-6 w-6 text-[#C99237]" aria-hidden />
            </span>
            <div>
              <h2 className="text-xl font-bold text-[#0C123A] sm:text-2xl">Employee documents</h2>
              <p className="mt-1 text-sm text-slate-500">
                Upload KYC files for{" "}
                <span className="font-medium text-slate-700">{createdEmployeeName || "the new employee"}</span>.
                Each file must be PNG, JPG, or PDF and under 5 MB.
              </p>
            </div>
          </div>

          {success && (
            <div
              className="mb-6 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
              role="status"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              <span>{success}</span>
            </div>
          )}

          {documentsError && (
            <div
              className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
              <span>{documentsError}</span>
            </div>
          )}

          <form onSubmit={handleDocumentsSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              {ONBOARDING_DOC_FIELDS.map(({ field, label, hint }) => (
                <div key={field} className={field === "user_image" ? "sm:col-span-2" : ""}>
                  <label htmlFor={`doc-${field}`} className={labelCls()}>
                    {label} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id={`doc-${field}`}
                    name={field}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,application/pdf"
                    className={fileInputCls()}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      setDocFiles((prev) => {
                        const next = { ...prev };
                        if (f) next[field] = f;
                        else delete next[field];
                        return next;
                      });
                    }}
                  />
                  <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                disabled={documentsSubmitting}
                onClick={() => {
                  resetDocumentsForm();
                }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0C123A] shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
              >
                Clear files
              </button>
              <button
                type="submit"
                disabled={documentsSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#C99237] px-5 py-2.5 text-sm font-bold text-[#0C123A] shadow-sm transition hover:bg-[#b87d2e] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {documentsSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" aria-hidden />
                    Upload & continue
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {onboardingStep === "address" && createdEmployeeId && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#C99237]/12">
              <MapPin className="h-6 w-6 text-[#C99237]" aria-hidden />
            </span>
            <div>
              <h2 className="text-xl font-bold text-[#0C123A] sm:text-2xl">
                Employee address
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Add address details for {createdEmployeeName || "the new employee"}. Documents are on file; finish
                onboarding with their postal address.
              </p>
            </div>
          </div>

          {addressError && (
            <div
              className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
              <span>{addressError}</span>
            </div>
          )}

          <form onSubmit={handleAddressSubmit} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="addr-country" className={labelCls()}>
                    Country <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="addr-country"
                    className={inputCls()}
                    value={addressCountry}
                    onChange={(e) => setAddressCountry(e.target.value)}
                    placeholder="India"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="addr-state" className={labelCls()}>
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="addr-state"
                    className={inputCls()}
                    value={addressState}
                    onChange={(e) => setAddressState(e.target.value)}
                    placeholder="Maharashtra"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="addr-district" className={labelCls()}>
                    District <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="addr-district"
                    className={inputCls()}
                    value={addressDistrict}
                    onChange={(e) => setAddressDistrict(e.target.value)}
                    placeholder="Pune"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="addr-city" className={labelCls()}>
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="addr-city"
                    className={inputCls()}
                    value={addressCity}
                    onChange={(e) => setAddressCity(e.target.value)}
                    placeholder="Pune"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-[#0C123A]">
                    <input
                      type="checkbox"
                      checked={addressIsFromVillage}
                      onChange={(e) => {
                        setAddressIsFromVillage(e.target.checked);
                        if (!e.target.checked) setAddressVillage("");
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-[#C99237] focus:ring-[#C99237]/30"
                    />
                    Employee is from a village
                  </label>
                </div>

                {addressIsFromVillage && (
                  <div className="sm:col-span-2">
                    <label htmlFor="addr-village" className={labelCls()}>
                      Village name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="addr-village"
                      className={inputCls()}
                      value={addressVillage}
                      onChange={(e) => setAddressVillage(e.target.value)}
                      placeholder="Village name"
                      required={addressIsFromVillage}
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="addr-street" className={labelCls()}>
                    Street <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="addr-street"
                    className={inputCls()}
                    value={addressStreet}
                    onChange={(e) => setAddressStreet(e.target.value)}
                    placeholder="Street / Area"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="addr-house" className={labelCls()}>
                    House number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="addr-house"
                    className={inputCls()}
                    value={addressHouseNumber}
                    onChange={(e) => setAddressHouseNumber(e.target.value)}
                    placeholder="A-101"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="addr-zip" className={labelCls()}>
                    ZIP / PIN code <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="addr-zip"
                    className={inputCls()}
                    value={addressZipCode}
                    onChange={(e) => setAddressZipCode(e.target.value)}
                    placeholder="411001"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  disabled={addressSubmitting}
                  onClick={() => {
                    setAddressSuccess(null);
                    resetAddressForm();
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0C123A] shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Clear address
                </button>
                <button
                  type="submit"
                  disabled={addressSubmitting}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#C99237] px-5 py-2.5 text-sm font-bold text-[#0C123A] shadow-sm transition hover:bg-[#b87d2e] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {addressSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Saving…
                    </>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4" aria-hidden />
                      Save address
                    </>
                  )}
                </button>
              </div>
            </form>
        </div>
      )}
    </div>
  );
}
