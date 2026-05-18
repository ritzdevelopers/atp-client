"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  Maximize2,
  RefreshCw,
  ShieldCheck,
  X,
  IdCard,
  ImageIcon,
  FileStack,
} from "lucide-react";
import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import {
  addUserAddress,
  addUserExternalInformation,
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
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPT_MIME =
  "image/png,image/jpeg,image/jpg,application/pdf,image/webp,.png,.jpg,.jpeg,.pdf,.webp";

const RELATION_BLOOD_LINE_OPTIONS = [
  { value: "father", label: "Father" },
  { value: "mother", label: "Mother" },
  { value: "brother", label: "Brother" },
  { value: "sister", label: "Sister" },
  { value: "grandfather", label: "Grandfather" },
  { value: "grandmother", label: "Grandmother" },
  { value: "son", label: "Son" },
  { value: "daughter", label: "Daughter" },
  { value: "wife", label: "Wife" },
  { value: "husband", label: "Husband" },
] as const;

/** Document slots for onboarding wizard (subset of server fieldnames). */
const ONBOARDING_DOC_SLOTS: {
  field: EmployeeOnboardingDocumentField;
  label: string;
  hint: string;
  required: boolean;
  skeleton: "passport" | "aadhar" | "pan" | "marksheet" | "letter";
  icon: typeof ImageIcon;
}[] = [
  {
    field: "user_passport_photo",
    label: "Passport-size photo",
    hint: "Clear face on plain background.",
    required: true,
    skeleton: "passport",
    icon: ImageIcon,
  },
  {
    field: "user_aadhar_front",
    label: "Aadhaar — front",
    hint: "Photo and details visible.",
    required: true,
    skeleton: "aadhar",
    icon: IdCard,
  },
  {
    field: "user_aadhar_back",
    label: "Aadhaar — back",
    hint: "Address side.",
    required: true,
    skeleton: "aadhar",
    icon: IdCard,
  },
  {
    field: "user_pan_card",
    label: "PAN card",
    hint: "Legible name and PAN number.",
    required: true,
    skeleton: "pan",
    icon: IdCard,
  },
  {
    field: "user_resignation_letter",
    label: "Previous company resignation letter",
    hint: "If applicable (optional).",
    required: false,
    skeleton: "letter",
    icon: FileText,
  },
  {
    field: "user_10th_marksheet",
    label: "10th marksheet / certificate",
    hint: "Board exam result.",
    required: true,
    skeleton: "marksheet",
    icon: FileStack,
  },
  {
    field: "user_12th_marksheet",
    label: "12th marksheet / certificate",
    hint: "Board exam result.",
    required: true,
    skeleton: "marksheet",
    icon: FileStack,
  },
  {
    field: "user_higher_education_marksheet",
    label: "Higher education marksheet / degree",
    hint: "Graduation or equivalent.",
    required: true,
    skeleton: "marksheet",
    icon: FileStack,
  },
  {
    field: "user_other_certificate",
    label: "Diploma / other certificate",
    hint: "Additional qualification (optional).",
    required: false,
    skeleton: "marksheet",
    icon: FileStack,
  },
];

function skeletonFrameClass(skeleton: (typeof ONBOARDING_DOC_SLOTS)[number]["skeleton"]): string {
  switch (skeleton) {
    case "passport":
      return "aspect-[3/4] max-h-64 w-full max-w-[13rem]";
    case "aadhar":
      return "aspect-[85/53] w-full max-w-md";
    case "pan":
      return "aspect-[1.587/1] w-full max-w-sm";
    case "marksheet":
      return "aspect-[210/297] max-h-80 w-full max-w-xs sm:max-w-sm";
    case "letter":
      return "aspect-[8.5/11] max-h-72 w-full max-w-xs sm:max-w-sm";
    default:
      return "aspect-video w-full";
  }
}

function passwordLengthOk(value: string) {
  return value.length >= PASSWORD_MIN;
}

function fileInputCls() {
  return "sr-only";
}

function isPdfFile(f: File) {
  return f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
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

  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyNumber, setEmergencyNumber] = useState("");
  const [relationBloodLine, setRelationBloodLine] = useState<string>("father");
  const [externalSubmitting, setExternalSubmitting] = useState(false);
  const [externalError, setExternalError] = useState<string | null>(null);

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

  const [onboardingStep, setOnboardingStep] = useState<
    "basic" | "external" | "documents" | "address"
  >("basic");
  const [docFiles, setDocFiles] = useState<
    Partial<Record<EmployeeOnboardingDocumentField, File>>
  >({});
  const [documentsSubmitting, setDocumentsSubmitting] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [previewModalField, setPreviewModalField] =
    useState<EmployeeOnboardingDocumentField | null>(null);

  const docInputRefs = useRef<
    Partial<Record<EmployeeOnboardingDocumentField, HTMLInputElement | null>>
  >({});

  const previewUrls = useMemo(() => {
    const m: Partial<Record<EmployeeOnboardingDocumentField, string>> = {};
    (Object.entries(docFiles) as [EmployeeOnboardingDocumentField, File][]).forEach(([k, f]) => {
      if (f) m[k] = URL.createObjectURL(f);
    });
    return m;
  }, [docFiles]);

  useEffect(() => {
    return () => {
      Object.values(previewUrls).forEach((u) => URL.revokeObjectURL(u));
    };
  }, [previewUrls]);

  const organizationIdNum =
    ctx?.organization?.id != null ? Number(ctx.organization.id) : Number(orgIdParam);
  const orgName = ctx?.organization?.org_name?.trim() || `Organization ${orgIdParam ?? ""}`;

  const passwordsValid =
    passwordLengthOk(password) && password === confirmPassword && confirmPassword.length > 0;

  function assignDocFile(field: EmployeeOnboardingDocumentField, raw: File | null | undefined) {
    setDocumentsError(null);
    if (!raw) {
      setDocFiles((prev) => {
        const n = { ...prev };
        delete n[field];
        return n;
      });
      return;
    }
    if (raw.size > MAX_FILE_BYTES) {
      setDocumentsError("Each file must be 5 MB or smaller.");
      return;
    }
    const okMime =
      /^image\/(png|jpeg|webp)$/.test(raw.type) || raw.type === "application/pdf";
    if (!okMime) {
      setDocumentsError("Use PNG, JPG, WebP, or PDF only.");
      return;
    }
    setDocFiles((prev) => ({ ...prev, [field]: raw }));
  }

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

  function resetExternalForm() {
    setEmergencyName("");
    setEmergencyNumber("");
    setRelationBloodLine("father");
    setExternalError(null);
  }

  function resetDocumentsForm() {
    setDocFiles({});
    setDocumentsError(null);
    setPreviewModalField(null);
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
    resetExternalForm();
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
      resetExternalForm();
      setOnboardingStep("external");
      setSuccess(
        `Step 1 done — ${employeeName} has an account. Add emergency contact (step 2), then documents.`,
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

  async function handleExternalSubmit(e: React.FormEvent) {
    e.preventDefault();
    setExternalError(null);

    if (!createdEmployeeId) {
      setExternalError("Create an employee first.");
      return;
    }
    if (!organizationIdNum || Number.isNaN(organizationIdNum)) {
      setExternalError("Invalid organization.");
      return;
    }
    if (!emergencyName.trim()) {
      setExternalError("Emergency contact name is required.");
      return;
    }
    if (!emergencyNumber.trim()) {
      setExternalError("Emergency contact number is required.");
      return;
    }
    if (emergencyName.trim().length > 150) {
      setExternalError("Emergency contact name is too long.");
      return;
    }
    if (emergencyNumber.trim().length > 20) {
      setExternalError("Emergency number is too long (max 20 characters).");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setExternalError("Not signed in.");
      return;
    }

    setExternalSubmitting(true);
    try {
      await addUserExternalInformation(token, {
        user_id: createdEmployeeId,
        org_id: organizationIdNum,
        emergency_contact_name: emergencyName.trim(),
        emergency_number: emergencyNumber.trim(),
        relation_blood_line: relationBloodLine,
      });
      setOnboardingStep("documents");
      setSuccess(
        `${createdEmployeeName || "Employee"}: emergency contact saved. Upload documents (step 3).`,
      );
    } catch (err) {
      setExternalError(err instanceof Error ? err.message : "Could not save emergency contact.");
    } finally {
      setExternalSubmitting(false);
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

    const missing = ONBOARDING_DOC_SLOTS.filter((s) => s.required && !docFiles[s.field]);
    if (missing.length > 0) {
      setDocumentsError(
        `Attach all required uploads: ${missing.map((m) => m.label).join(", ")}.`,
      );
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setDocumentsError("Not signed in.");
      return;
    }

    const filesPayload: Partial<Record<EmployeeOnboardingDocumentField, File>> = {};
    ONBOARDING_DOC_SLOTS.forEach((s) => {
      const f = docFiles[s.field];
      if (f) filesPayload[s.field] = f;
    });

    setDocumentsSubmitting(true);
    try {
      await uploadEmployeeDocuments(token, {
        org_id: organizationIdNum,
        employee_user_id: createdEmployeeId,
        files: filesPayload,
      });
      resetDocumentsForm();
      setOnboardingStep("address");
      setSuccess(`${createdEmployeeName || "Employee"}: documents uploaded. Address is optional (step 4).`);
    } catch (err) {
      setDocumentsError(err instanceof Error ? err.message : "Document upload failed.");
    } finally {
      setDocumentsSubmitting(false);
    }
  }

  function handleAddressSkip() {
    resetAddressForm();
    setAddressError(null);
    setAddressSuccess("Onboarding completed without address.");
    setOnboardingStep("basic");
    setCreatedEmployeeId(null);
    setCreatedEmployeeName("");
    resetDocumentsForm();
    resetExternalForm();
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
      setAddressError("Fill every field to save address, or use Skip.");
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
      setAddressSuccess("Employee address saved. Onboarding complete.");
      resetAddressForm();
      resetDocumentsForm();
      resetExternalForm();
      setOnboardingStep("basic");
      setCreatedEmployeeId(null);
      setCreatedEmployeeName("");
    } catch (err) {
      setAddressError(err instanceof Error ? err.message : "Could not add employee address.");
    } finally {
      setAddressSubmitting(false);
    }
  }

  const modalFile =
    previewModalField && docFiles[previewModalField] ? docFiles[previewModalField] : undefined;
  const modalUrl = previewModalField ? previewUrls[previewModalField] : undefined;

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
                Four steps for <span className="font-medium text-slate-700">{orgName}</span>: basics →
                emergency contact → documents → optional address.
              </p>
            </div>
          </div>
        </div>
      </div>

      <nav
        className="rounded-2xl border border-slate-200/90 bg-white px-4 py-4 shadow-sm sm:px-8"
        aria-label="Onboarding steps"
      >
        <ol className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center sm:gap-6 sm:text-sm lg:gap-10">
          {(
            [
              { key: "basic" as const, n: "1", label: "Basics" },
              { key: "external" as const, n: "2", label: "Emergency" },
              { key: "documents" as const, n: "3", label: "Documents" },
              { key: "address" as const, n: "4", label: "Address" },
            ] as const
          ).map(({ key, n, label }) => {
            const order = ["basic", "external", "documents", "address"];
            const cur = order.indexOf(onboardingStep);
            const ix = order.indexOf(key);
            const done = cur > ix;
            const active = onboardingStep === key;
            return (
              <li
                key={key}
                className={`flex items-center gap-2 font-semibold ${
                  active ? "text-[#C99237]" : done ? "text-emerald-700" : "text-slate-400"
                }`}
              >
                {done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                ) : (
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs text-[#0C123A] ${
                      active ? "bg-[#C99237]/25" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {n}
                  </span>
                )}
                {label}
              </li>
            );
          })}
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
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 outline-none transition hover:bg-slate-100"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                  </button>
                </div>
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
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 outline-none transition hover:bg-slate-100"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? "Hide" : "Show"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                  </button>
                </div>
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

      {onboardingStep === "external" && createdEmployeeId && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#C99237]/12">
              <ShieldCheck className="h-6 w-6 text-[#C99237]" aria-hidden />
            </span>
            <div>
              <h2 className="text-xl font-bold text-[#0C123A] sm:text-2xl">
                Emergency contact
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                For{" "}
                <span className="font-medium text-slate-700">{createdEmployeeName}</span>.
                Saved to organizational records (step 2 of 4).
              </p>
            </div>
          </div>

          {externalError && (
            <div
              className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
              <span>{externalError}</span>
            </div>
          )}

          <form onSubmit={handleExternalSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="emergency-name" className={labelCls()}>
                  Emergency contact full name <span className="text-red-500">*</span>
                </label>
                <input
                  id="emergency-name"
                  className={inputCls()}
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  placeholder="Person to reach first"
                  maxLength={150}
                  required
                />
              </div>
              <div>
                <label htmlFor="emergency-number" className={labelCls()}>
                  Emergency phone <span className="text-red-500">*</span>
                </label>
                <input
                  id="emergency-number"
                  type="tel"
                  className={inputCls()}
                  value={emergencyNumber}
                  onChange={(e) => setEmergencyNumber(e.target.value)}
                  placeholder="+91 / 98765…"
                  maxLength={20}
                  required
                />
              </div>
              <div>
                <label htmlFor="relation-bloodline" className={labelCls()}>
                  Relation to employee <span className="text-red-500">*</span>
                </label>
                <select
                  id="relation-bloodline"
                  className={inputCls()}
                  value={relationBloodLine}
                  onChange={(e) => setRelationBloodLine(e.target.value)}
                  required
                >
                  {RELATION_BLOOD_LINE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-6">
              <button
                type="button"
                disabled={externalSubmitting}
                onClick={resetExternalForm}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0C123A] shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
              >
                Clear fields
              </button>
              <button
                type="submit"
                disabled={externalSubmitting}
                className="inline-flex items-center gap-2 rounded-lg bg-[#C99237] px-5 py-2.5 text-sm font-bold text-[#0C123A] shadow-sm transition hover:bg-[#b87d2e] disabled:opacity-60"
              >
                {externalSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Saving…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" aria-hidden />
                    Continue to documents
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
                Tap a frame to preview in full screen. Wrong file? Use{' '}
                <span className="font-semibold text-slate-600">Change file</span>. PNG/JPG/WebP/PDF · max{' '}
                5&nbsp;MB each.
              </p>
            </div>
          </div>

          {documentsError && (
            <div
              className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
              <span>{documentsError}</span>
            </div>
          )}

          <form onSubmit={handleDocumentsSubmit} className="space-y-8">
            <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
              {ONBOARDING_DOC_SLOTS.map(
                ({ field, label, hint, required, skeleton, icon: IconCmp }) => {
                  const file = docFiles[field];
                  const url = previewUrls[field];
                  return (
                    <div key={field} className="flex flex-col">
                      <label className={`${labelCls()} flex flex-wrap items-baseline gap-2`}>
                        <span>{label}</span>
                        {!required && (
                          <span className="text-xs font-normal normal-case text-slate-400">
                            Optional
                          </span>
                        )}
                        {required && <span className="text-red-500">*</span>}
                      </label>
                      <p className="mb-3 text-xs text-slate-500">{hint}</p>

                      <div
                        className={`relative mx-auto flex w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/80 shadow-inner ring-1 ring-slate-900/5 ${skeletonFrameClass(skeleton)}`}
                      >
                        <input
                          ref={(el) => {
                            docInputRefs.current[field] = el;
                          }}
                          id={`doc-${field}`}
                          type="file"
                          accept={ACCEPT_MIME}
                          className={fileInputCls()}
                          onChange={(e) =>
                            assignDocFile(field, e.target.files?.[0] ?? null)
                          }
                        />

                        {!file && (
                          <button
                            type="button"
                            onClick={() => docInputRefs.current[field]?.click()}
                            className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center text-slate-500 transition hover:bg-white/50"
                          >
                            <IconCmp className="h-10 w-10 text-slate-300" aria-hidden />
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Skeleton
                            </span>
                            <span className="text-xs text-slate-500">Click to attach</span>
                          </button>
                        )}

                        {file && url && (
                          <button
                            type="button"
                            onClick={() => setPreviewModalField(field)}
                            className="group relative flex h-full w-full items-center justify-center overflow-hidden bg-black/5 outline-none ring-[#C99237] ring-offset-2 focus-visible:ring-2"
                            aria-label={`Open preview for ${label}`}
                          >
                            {isPdfFile(file) ? (
                              <div className="flex flex-col items-center gap-2 p-6 text-center">
                                <FileText className="h-14 w-14 text-teal-600" aria-hidden />
                                <span className="text-xs font-medium text-[#0C123A]">PDF</span>
                                <span className="truncate px-2 text-[10px] text-slate-500">
                                  {file.name}
                                </span>
                              </div>
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={url}
                                alt=""
                                className="h-full w-full object-contain"
                              />
                            )}
                            <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-[#0C123A]/80 px-2 py-1 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                              <Maximize2 className="h-3 w-3" aria-hidden />
                              Enlarge
                            </span>
                          </button>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={documentsSubmitting}
                          onClick={() => docInputRefs.current[field]?.click()}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#C99237]/50 bg-[#C99237]/10 px-3 py-1.5 text-xs font-semibold text-[#0C123A] transition hover:bg-[#C99237]/20 disabled:opacity-50"
                        >
                          {file ? (
                            <>
                              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                              Change file
                            </>
                          ) : (
                            <>
                              <Upload className="h-3.5 w-3.5" aria-hidden />
                              Upload
                            </>
                          )}
                        </button>
                        {file && (
                          <button
                            type="button"
                            disabled={documentsSubmitting}
                            onClick={() => assignDocFile(field, null)}
                            className="text-xs font-semibold text-red-700 underline underline-offset-2 hover:text-red-900 disabled:opacity-50"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  );
                },
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={documentsSubmitting}
                onClick={() => resetDocumentsForm()}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0C123A] shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
              >
                Clear all
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

      {previewModalField && modalFile && modalUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="doc-preview-title"
          onClick={() => setPreviewModalField(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-3 sm:px-5">
              <div>
                <h3 id="doc-preview-title" className="text-sm font-bold text-[#0C123A]">
                  {ONBOARDING_DOC_SLOTS.find((s) => s.field === previewModalField)?.label ??
                    "Preview"}
                </h3>
                <p className="mt-0.5 truncate max-w-[70vw] text-xs text-slate-500">{modalFile.name}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#0C123A] hover:bg-slate-50"
                  onClick={() => docInputRefs.current[previewModalField]?.click()}
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                  Change
                </button>
                <button
                  type="button"
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-[#0C123A]"
                  onClick={() => setPreviewModalField(null)}
                  aria-label="Close preview"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
            </div>
            <div className="overflow-auto bg-slate-100 p-3 sm:p-6" style={{ maxHeight: "min(82vh, 900px)" }}>
              {isPdfFile(modalFile) ? (
                <object data={modalUrl} type="application/pdf" className="h-[72vh] w-full rounded-lg bg-white">
                  <p className="p-8 text-center text-sm text-slate-600">
                    PDF preview not supported in this browser.{" "}
                    <a href={modalUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-teal-700 underline">
                      Open in new tab
                    </a>
                  </p>
                </object>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={modalUrl}
                  alt=""
                  className="mx-auto max-h-[75vh] w-auto max-w-full rounded-lg shadow-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {onboardingStep === "address" && createdEmployeeId && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#C99237]/12">
              <MapPin className="h-6 w-6 text-[#C99237]" aria-hidden />
            </span>
            <div>
              <h2 className="text-xl font-bold text-[#0C123A] sm:text-2xl">Employee address</h2>
              <p className="mt-1 text-sm text-slate-500">
                Optional — skip if you&apos;ll capture this later for{" "}
                <span className="font-medium text-slate-700">{createdEmployeeName}</span>.
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
                    Country
                  </label>
                  <input
                    id="addr-country"
                    className={inputCls()}
                    value={addressCountry}
                    onChange={(e) => setAddressCountry(e.target.value)}
                    placeholder="India"
                  />
                </div>

                <div>
                  <label htmlFor="addr-state" className={labelCls()}>
                    State
                  </label>
                  <input
                    id="addr-state"
                    className={inputCls()}
                    value={addressState}
                    onChange={(e) => setAddressState(e.target.value)}
                    placeholder="Maharashtra"
                  />
                </div>

                <div>
                  <label htmlFor="addr-district" className={labelCls()}>
                    District
                  </label>
                  <input
                    id="addr-district"
                    className={inputCls()}
                    value={addressDistrict}
                    onChange={(e) => setAddressDistrict(e.target.value)}
                    placeholder="Pune"
                  />
                </div>

                <div>
                  <label htmlFor="addr-city" className={labelCls()}>
                    City
                  </label>
                  <input
                    id="addr-city"
                    className={inputCls()}
                    value={addressCity}
                    onChange={(e) => setAddressCity(e.target.value)}
                    placeholder="Pune"
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
                      Village name {addressIsFromVillage && "(required when checked)"}
                    </label>
                    <input
                      id="addr-village"
                      className={inputCls()}
                      value={addressVillage}
                      onChange={(e) => setAddressVillage(e.target.value)}
                      placeholder="Village name"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="addr-street" className={labelCls()}>
                    Street
                  </label>
                  <input
                    id="addr-street"
                    className={inputCls()}
                    value={addressStreet}
                    onChange={(e) => setAddressStreet(e.target.value)}
                    placeholder="Street / Area"
                  />
                </div>

                <div>
                  <label htmlFor="addr-house" className={labelCls()}>
                    House number
                  </label>
                  <input
                    id="addr-house"
                    className={inputCls()}
                    value={addressHouseNumber}
                    onChange={(e) => setAddressHouseNumber(e.target.value)}
                    placeholder="A-101"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="addr-zip" className={labelCls()}>
                    ZIP / PIN code
                  </label>
                  <input
                    id="addr-zip"
                    className={inputCls()}
                    value={addressZipCode}
                    onChange={(e) => setAddressZipCode(e.target.value)}
                    placeholder="411001"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <button
                  type="button"
                  disabled={addressSubmitting}
                  onClick={() => handleAddressSkip()}
                  className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white disabled:opacity-60"
                >
                  Skip address — finish onboarding
                </button>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <button
                    type="button"
                    disabled={addressSubmitting}
                    onClick={() => resetAddressForm()}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0C123A] shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    Clear fields
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
              </div>
            </form>
        </div>
      )}
    </div>
  );
}
