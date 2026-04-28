"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { UserPlus, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import {
  createEmployee,
  getOrganizationRoles,
  type OrgRoleRow,
} from "@/services/adminUser";

function labelCls() {
  return "mb-1.5 block text-sm font-medium text-[#0C123A]";
}

function inputCls() {
  return "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#0C123A] shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#C99237] focus:ring-2 focus:ring-[#C99237]/20";
}

const PASSWORD_MIN = 8;

function passwordLengthOk(value: string) {
  return value.length >= PASSWORD_MIN;
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

  const organizationIdNum =
    ctx?.organization?.id != null ? Number(ctx.organization.id) : Number(orgIdParam);
  const orgName = ctx?.organization?.org_name?.trim() || `Organization ${orgIdParam ?? ""}`;

  const passwordsValid =
    passwordLengthOk(password) && password === confirmPassword && confirmPassword.length > 0;

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
      await createEmployee(token, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim(),
        user_role_id: Number(userRoleId),
        organization_id: organizationIdNum,
      });
      setSuccess("Employee registered successfully.");
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
              onClick={() => {
                setFormError(null);
                setSuccess(null);
                setName("");
                setEmail("");
                setPhone("");
                setPassword("");
                setConfirmPassword("");
                setShowPassword(false);
                setShowConfirmPassword(false);
                if (roles.length > 0) setUserRoleId(String(roles[0].id));
              }}
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
    </div>
  );
}
