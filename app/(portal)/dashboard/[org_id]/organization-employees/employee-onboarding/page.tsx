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
  Users,
  Package,
  PlusCircle,
} from "lucide-react";
import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import {
  addUserAddress,
  addUserExternalInformation,
  addEmployeeReference,
  createEmployee,
  EMPLOYEE_ASSET_TYPES,
  getManagementEmployeesPage,
  getOrganizationRoles,
  uploadEmployeeAssetsBatch,
  uploadEmployeeDocuments,
  type EmployeeOnboardingDocumentField,
  type ManagementEmployeeRow,
  type OrgRoleRow,
} from "@/services/adminUser";

const ONBOARDING_STEPS_ORDER = [
  "basic",
  "external",
  "reference",
  "assets",
  "documents",
  "address",
] as const;

type OnboardingWizardStep = (typeof ONBOARDING_STEPS_ORDER)[number];

function labelCls() {
  return "mb-1.5 block text-sm font-medium text-[#0C123A]";
}

function inputCls() {
  return "w-full rounded-2xl border-0 bg-slate-100 px-3.5 py-3 text-sm text-[#0C123A] shadow-sm outline-none ring-1 ring-slate-200/80 transition placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#C99237]/25 lg:rounded-lg lg:border lg:border-slate-200 lg:bg-white lg:py-2.5 lg:focus:border-[#C99237] lg:focus:ring-[#C99237]/20";
}

function stepPanelShell() {
  return "rounded-3xl bg-white p-4 shadow-md ring-1 ring-slate-200/70 max-lg:overflow-hidden lg:rounded-2xl lg:border lg:border-slate-200/90 lg:p-6 lg:shadow-sm lg:ring-0 sm:lg:p-8";
}

function stepSectionHeaderShell() {
  return "mb-5 flex gap-3 max-lg:mb-4 max-lg:rounded-2xl max-lg:bg-slate-50/80 max-lg:p-3 max-lg:ring-1 max-lg:ring-slate-200/60 lg:mb-6 lg:bg-transparent lg:p-0 lg:ring-0";
}

function stepFooterShell() {
  return "flex flex-col gap-2 border-t border-slate-100 pt-5 lg:flex-row lg:flex-wrap lg:items-center lg:gap-3 lg:pt-6";
}

function stepFooterEndShell() {
  return "flex flex-col gap-2 border-t border-slate-100 pt-5 lg:flex-row lg:justify-end lg:gap-3 lg:pt-6";
}

function btnPrimaryCls() {
  return "inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[#C99237] px-5 py-3 text-sm font-bold text-[#0C123A] shadow-sm transition active:scale-[0.98] hover:bg-[#b87d2e] disabled:cursor-not-allowed disabled:opacity-60 lg:min-h-0 lg:w-auto lg:rounded-lg lg:px-5 lg:py-2.5";
}

function btnSecondaryCls() {
  return "inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0C123A] shadow-sm transition active:scale-[0.98] hover:bg-slate-50 disabled:opacity-60 lg:min-h-0 lg:w-auto lg:rounded-lg";
}

const ONBOARDING_STEP_NAV = [
  { key: "basic" as const, n: "1", label: "Basics", short: "Basics" },
  { key: "external" as const, n: "2", label: "Emergency", short: "Emergency" },
  { key: "reference" as const, n: "3", label: "Reference", short: "Reference" },
  { key: "assets" as const, n: "4", label: "Assets", short: "Assets" },
  { key: "documents" as const, n: "5", label: "Documents", short: "Docs" },
  { key: "address" as const, n: "6", label: "Address", short: "Address" },
] as const;

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
    field: "user_appointment_letter",
    label: "Appointment / offer letter",
    hint: "Current role appointment or offer (optional).",
    required: false,
    skeleton: "letter",
    icon: FileText,
  },
  {
    field: "user_previous_company_leaving_letter",
    label: "Previous company leaving / relieving letter",
    hint: "Relieving or experience letter from last employer (optional).",
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
  {
    field: "user_other_document",
    label: "Other document",
    hint: "Any other supporting file (optional).",
    required: false,
    skeleton: "letter",
    icon: FileText,
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

type AssetDraftRow = {
  key: string;
  asset_name: string;
  asset_type: string;
  asset_summary: string;
  handover_date_time: string;
  file: File | null;
};

function formatReferrerOptionLabel(row: ManagementEmployeeRow) {
  const name = (row.user_name ?? "").trim() || "Unknown";
  const email = (row.user_email ?? "").trim() || "—";
  const designations =
    row.roles?.map((r) => (r.role_name ?? "").trim()).filter(Boolean).join(", ") ||
    "No role assigned";
  return `${name} · ${email} · ${designations}`;
}

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

  const [referrersLoading, setReferrersLoading] = useState(false);
  const [referrerOptions, setReferrerOptions] = useState<ManagementEmployeeRow[]>([]);
  const [referredById, setReferredById] = useState<string>("");
  const [referredByNameOverride, setReferredByNameOverride] = useState("");
  const [referredByDesignationId, setReferredByDesignationId] = useState<string>("");
  const [referenceSubmitting, setReferenceSubmitting] = useState(false);
  const [referenceError, setReferenceError] = useState<string | null>(null);

  const [assetDraftRows, setAssetDraftRows] = useState<AssetDraftRow[]>([]);
  const [assetsSubmitting, setAssetsSubmitting] = useState(false);
  const [assetsError, setAssetsError] = useState<string | null>(null);

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

  const [onboardingStep, setOnboardingStep] = useState<OnboardingWizardStep>("basic");
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

  function resetReferenceForm() {
    setReferredById("");
    setReferredByNameOverride("");
    setReferredByDesignationId("");
    setReferenceError(null);
    setReferrerOptions([]);
  }

  function resetAssetDraftRows() {
    setAssetDraftRows([]);
    setAssetsError(null);
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
    resetReferenceForm();
    resetAssetDraftRows();
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
      resetReferenceForm();
      resetAssetDraftRows();
      setOnboardingStep("external");
      setSuccess(
        `Step 1 done — ${employeeName} has an account. Next: emergency contact, reference, assets (optional), documents, optional address.`,
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
      setOnboardingStep("reference");
      setSuccess(
        `${createdEmployeeName || "Employee"}: emergency contact saved. Add internal reference (next step).`,
      );
    } catch (err) {
      setExternalError(err instanceof Error ? err.message : "Could not save emergency contact.");
    } finally {
      setExternalSubmitting(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadReferrerDirectory() {
      if (
        onboardingStep !== "reference" ||
        !createdEmployeeId ||
        !organizationIdNum ||
        Number.isNaN(organizationIdNum)
      ) {
        return;
      }
      const token = localStorage.getItem("token");
      if (!token) {
        if (!cancelled) {
          setReferenceError("Not signed in.");
          setReferrerOptions([]);
        }
        return;
      }

      setReferrersLoading(true);
      setReferenceError(null);
      try {
        const merged: ManagementEmployeeRow[] = [];
        let page = 1;
        while (true) {
          const res = await getManagementEmployeesPage(token, organizationIdNum, page, 100);
          if (cancelled) return;
          merged.push(...res.data);
          if (!res.pagination.has_next) break;
          page += 1;
          if (page > 40) break;
        }
        const newbie = String(createdEmployeeId);
        if (!cancelled) {
          setReferrerOptions(merged.filter((r) => String(r.user_id) !== newbie));
        }
      } catch (err) {
        if (!cancelled) {
          setReferrerOptions([]);
          setReferenceError(
            err instanceof Error ? err.message : "Could not load organization members for reference.",
          );
        }
      } finally {
        if (!cancelled) setReferrersLoading(false);
      }
    }

    void loadReferrerDirectory();
    return () => {
      cancelled = true;
    };
  }, [onboardingStep, createdEmployeeId, organizationIdNum]);

  async function handleReferenceSubmit(e: React.FormEvent) {
    e.preventDefault();
    setReferenceError(null);

    if (!createdEmployeeId) {
      setReferenceError("Create an employee first.");
      return;
    }
    if (!organizationIdNum || Number.isNaN(organizationIdNum)) {
      setReferenceError("Invalid organization.");
      return;
    }
    if (!referredById.trim()) {
      setReferenceError("Choose who referred this employee.");
      return;
    }
    if (String(referredById).trim() === String(createdEmployeeId).trim()) {
      setReferenceError("Referrer cannot be the new employee.");
      return;
    }
    if (referredByNameOverride.trim().length > 200) {
      setReferenceError("Optional referrer display name must be at most 200 characters.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setReferenceError("Not signed in.");
      return;
    }

    setReferenceSubmitting(true);
    try {
      await addEmployeeReference(token, {
        org_id: organizationIdNum,
        employee_id: createdEmployeeId,
        referred_by_id: referredById,
        referred_by_name:
          referredByNameOverride.trim() !== "" ? referredByNameOverride.trim() : undefined,
        referred_by_designation_id:
          referredByDesignationId.trim() !== ""
            ? Number(referredByDesignationId)
            : undefined,
      });
      setReferenceError(null);
      setOnboardingStep("assets");
      setSuccess(
        `${createdEmployeeName || "Employee"}: reference saved. Assign assets next (optional) or skip.`,
      );
    } catch (err) {
      setReferenceError(err instanceof Error ? err.message : "Could not save reference.");
    } finally {
      setReferenceSubmitting(false);
    }
  }

  function assetRowIsEmpty(row: AssetDraftRow) {
    return (
      row.asset_name.trim() === "" &&
      row.asset_summary.trim() === "" &&
      row.handover_date_time.trim() === "" &&
      row.file === null
    );
  }

  function handleAssetsSkip() {
    setAssetsError(null);
    resetAssetDraftRows();
    setOnboardingStep("documents");
    setSuccess(
      `${createdEmployeeName || "Employee"}: skipped asset assignment. Upload documents.`,
    );
  }

  async function handleAssetsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAssetsError(null);

    if (!createdEmployeeId) {
      setAssetsError("Create an employee first.");
      return;
    }
    if (!organizationIdNum || Number.isNaN(organizationIdNum)) {
      setAssetsError("Invalid organization.");
      return;
    }

    const typesSet = new Set<string>([...EMPLOYEE_ASSET_TYPES]);
    const candidates = assetDraftRows.filter((r) => !assetRowIsEmpty(r));

    if (candidates.length === 0) {
      handleAssetsSkip();
      return;
    }

    for (let i = 0; i < candidates.length; i++) {
      const row = candidates[i];
      if (!row.asset_name.trim()) {
        setAssetsError(`Asset ${i + 1}: name is required.`);
        return;
      }
      if (row.asset_name.trim().length > 250) {
        setAssetsError(`Asset ${i + 1}: name is too long (max 250).`);
        return;
      }
      if (!typesSet.has(row.asset_type)) {
        setAssetsError(`Asset ${i + 1}: pick a valid asset type.`);
        return;
      }
      if (row.asset_summary.trim().length > 600) {
        setAssetsError(`Asset ${i + 1}: summary is too long (max 600).`);
        return;
      }
      if (row.file && row.file.size > MAX_FILE_BYTES) {
        setAssetsError(`Asset ${i + 1}: file must be 5 MB or smaller.`);
        return;
      }
      if (
        row.file &&
        !/^image\/(png|jpeg|webp)$/.test(row.file.type) &&
        row.file.type !== "application/pdf"
      ) {
        setAssetsError(`Asset ${i + 1}: use PNG, JPG, WebP, or PDF only.`);
        return;
      }
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setAssetsError("Not signed in.");
      return;
    }

    setAssetsSubmitting(true);
    try {
      const items = candidates.map((row, index) => ({
        employee_id: createdEmployeeId,
        asset_name: row.asset_name.trim(),
        asset_type: row.asset_type,
        asset_summary: row.asset_summary.trim() !== "" ? row.asset_summary.trim() : null,
        handover_date_time:
          row.handover_date_time.trim() !== "" ? row.handover_date_time.trim() : null,
        image_field: `asset_image_${index}`,
        file: row.file,
      }));

      await uploadEmployeeAssetsBatch(token, {
        org_id: organizationIdNum,
        items,
      });

      resetAssetDraftRows();
      setOnboardingStep("documents");
      setSuccess(`${createdEmployeeName || "Employee"}: assets assigned. Upload documents next.`);
    } catch (err) {
      setAssetsError(err instanceof Error ? err.message : "Could not upload assets.");
    } finally {
      setAssetsSubmitting(false);
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
      setSuccess(`${createdEmployeeName || "Employee"}: documents uploaded. Address is optional (last step).`);
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
    resetReferenceForm();
    resetAssetDraftRows();
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
      resetReferenceForm();
      resetAssetDraftRows();
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

  const currentStepIndex = ONBOARDING_STEPS_ORDER.indexOf(onboardingStep);
  const progressPct = ((currentStepIndex + 1) / ONBOARDING_STEPS_ORDER.length) * 100;
  const currentStepLabel =
    ONBOARDING_STEP_NAV.find((s) => s.key === onboardingStep)?.label ?? "Onboarding";

  return (
    <div className="space-y-4 max-lg:-mx-1 max-lg:space-y-3 max-lg:pb-2 sm:max-lg:-mx-2 lg:mx-0 lg:space-y-6 lg:pb-0">
      {/* Mobile & tablet: sticky app header + progress */}
      <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 px-3 pb-3 pt-3 backdrop-blur-md sm:px-4 lg:hidden">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#C99237]/15">
            <UserPlus className="h-5 w-5 text-[#C99237]" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold text-[#0C123A]">Employee onboarding</h1>
            <p className="truncate text-xs text-slate-500">{orgName}</p>
          </div>
        </div>
        <div className="mt-3">
          <div className="mb-2 flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-[#C99237]">
              Step {currentStepIndex + 1} of {ONBOARDING_STEPS_ORDER.length}
            </span>
            <span className="truncate text-slate-500">{currentStepLabel}</span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-valuenow={currentStepIndex + 1}
            aria-valuemin={1}
            aria-valuemax={ONBOARDING_STEPS_ORDER.length}
            aria-label="Onboarding progress"
          >
            <div
              className="h-full rounded-full bg-[#C99237] transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {ONBOARDING_STEP_NAV.map(({ key, short, n }) => {
            const order = [...ONBOARDING_STEPS_ORDER];
            const cur = order.indexOf(onboardingStep);
            const ix = order.indexOf(key);
            const done = cur > ix;
            const active = onboardingStep === key;
            return (
              <span
                key={key}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold ring-1 ${
                  active
                    ? "bg-[#C99237]/15 text-[#0C123A] ring-[#C99237]/40"
                    : done
                      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                      : "bg-slate-100 text-slate-500 ring-slate-200"
                }`}
              >
                {done ? (
                  <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden />
                ) : (
                  <span className="tabular-nums">{n}</span>
                )}
                {short}
              </span>
            );
          })}
        </div>
      </div>

      {/* Desktop: page intro */}
      <div className={`${stepPanelShell()} hidden lg:block`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#C99237]/12">
              <UserPlus className="h-6 w-6 text-[#C99237]" aria-hidden />
            </span>
            <div>
              <h1 className="text-xl font-bold text-[#0C123A] sm:text-2xl">Employee onboarding</h1>
              <p className="mt-1 text-xs text-slate-500 max-lg:line-clamp-2 lg:text-sm">
                Six steps for <span className="font-medium text-slate-700">{orgName}</span>: basics → emergency
                contact → internal reference → optional assets → documents → optional address.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop: step list */}
      <nav
        className={`${stepPanelShell()} hidden lg:block`}
        aria-label="Onboarding steps"
      >
        <ol className="flex flex-wrap items-center gap-6 text-sm lg:gap-10">
          {ONBOARDING_STEP_NAV.map(({ key, n, label }) => {
            const order = [...ONBOARDING_STEPS_ORDER];
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
        <div className={stepPanelShell()}>
          <div className={`${stepSectionHeaderShell()} lg:hidden`}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#C99237]/15">
              <UserPlus className="h-5 w-5 text-[#C99237]" aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-bold text-[#0C123A]">Account basics</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Step 1 — name, contact, role, and password for {orgName}.
              </p>
            </div>
          </div>

          {addressSuccess && (
            <div
              className="mb-5 flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 max-lg:mb-4 sm:flex-row sm:items-center sm:justify-between"
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
              className="mb-5 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 max-lg:mb-4"
              role="status"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              <span>{success}</span>
            </div>
          )}

          {(formError || rolesError) && (
            <div
              className="mb-5 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 max-lg:mb-4"
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
                  <div className="flex items-center gap-2 rounded-2xl bg-slate-100 px-3.5 py-3 text-sm text-slate-500 ring-1 ring-slate-200/80 lg:rounded-lg lg:border lg:border-slate-200 lg:bg-slate-50 lg:py-2.5 lg:ring-0">
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

            <div className={stepFooterEndShell()}>
              <button
                type="button"
                onClick={resetFullOnboarding}
                className={btnSecondaryCls()}
              >
                Clear form
              </button>
              <button
                type="submit"
                disabled={
                  submitting || rolesLoading || roles.length === 0 || !passwordsValid
                }
                className={btnPrimaryCls()}
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
        <div className={stepPanelShell()}>
          <div className={stepSectionHeaderShell()}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#C99237]/15 lg:h-12 lg:w-12 lg:rounded-xl lg:bg-[#C99237]/12">
              <ShieldCheck className="h-5 w-5 text-[#C99237] lg:h-6 lg:w-6" aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-bold text-[#0C123A] lg:text-2xl">
                Emergency contact
              </h2>
              <p className="mt-1 text-xs text-slate-500 max-lg:line-clamp-2 lg:text-sm">
                For{" "}
                <span className="font-medium text-slate-700">{createdEmployeeName}</span>.
                Saved to organizational records (step&nbsp;2 of&nbsp;6).
              </p>
            </div>
          </div>

          {externalError && (
            <div
              className="mb-5 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 max-lg:mb-4"
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

            <div className={stepFooterShell()}>
              <button
                type="button"
                disabled={externalSubmitting}
                onClick={resetExternalForm}
                className={btnSecondaryCls()}
              >
                Clear fields
              </button>
              <button
                type="submit"
                disabled={externalSubmitting}
                className={btnPrimaryCls()}
              >
                {externalSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Saving…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" aria-hidden />
                    Continue to reference
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {onboardingStep === "reference" && createdEmployeeId && (
        <div className={stepPanelShell()}>
          <div className={stepSectionHeaderShell()}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#C99237]/15 lg:h-12 lg:w-12 lg:rounded-xl lg:bg-[#C99237]/12">
              <Users className="h-5 w-5 text-[#C99237] lg:h-6 lg:w-6" aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-bold text-[#0C123A] lg:text-2xl">Internal reference</h2>
              <p className="mt-1 text-xs text-slate-500 max-lg:line-clamp-2 lg:text-sm">
                Who referred{" "}
                <span className="font-medium text-slate-700">{createdEmployeeName}</span>? Choose an
                existing org member — their user id is sent to HR records (step&nbsp;3 of&nbsp;6).
              </p>
            </div>
          </div>

          {referenceError && (
            <div
              className="mb-5 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 max-lg:mb-4"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
              <span>{referenceError}</span>
            </div>
          )}

          <form onSubmit={handleReferenceSubmit} className="space-y-5">
            <div>
              <label htmlFor="referred-by" className={labelCls()}>
                Referred by (org member) <span className="text-red-500">*</span>
              </label>
              <select
                id="referred-by"
                className={inputCls()}
                disabled={referrersLoading || referenceSubmitting}
                value={referredById}
                onChange={(e) => {
                  const next = e.target.value;
                  setReferredById(next);
                  const row = referrerOptions.find((r) => String(r.user_id) === next);
                  const primary = row?.roles?.[0]?.role_id;
                  setReferredByDesignationId(
                    primary != null && primary !== undefined ? String(primary) : "",
                  );
                }}
                required={!referrersLoading}
              >
                <option value="">
                  {referrersLoading ? "Loading members…" : "Select name / email / role…"}
                </option>
                {referrerOptions.map((row) => (
                  <option key={String(row.user_id)} value={String(row.user_id)}>
                    {formatReferrerOptionLabel(row)}
                  </option>
                ))}
              </select>
              {!referrersLoading && referrerOptions.length === 0 && (
                <p className="mt-2 text-xs text-amber-800">
                  No other members loaded. Ensure people exist in this org or check permissions.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="referrer-display-name" className={labelCls()}>
                Referrer display name <span className="text-xs font-normal text-slate-400">(optional)</span>
              </label>
              <input
                id="referrer-display-name"
                className={inputCls()}
                value={referredByNameOverride}
                onChange={(e) => setReferredByNameOverride(e.target.value)}
                placeholder="Override stored label (max 200 characters)"
                maxLength={200}
              />
            </div>

            <div>
              <label htmlFor="referrer-designation" className={labelCls()}>
                Referrer designation (organization role)&nbsp;
                <span className="text-xs font-normal text-slate-400">(optional)</span>
              </label>
              <select
                id="referrer-designation"
                className={inputCls()}
                value={referredByDesignationId}
                disabled={rolesLoading || referenceSubmitting || roles.length === 0}
                onChange={(e) => setReferredByDesignationId(e.target.value)}
              >
                <option value="">
                  Auto from selected member&apos;s primary role — or choose…
                </option>
                {roles.map((r) => (
                  <option key={String(r.id)} value={String(r.id)}>
                    {(r.role_name ?? "Role").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            <div className={stepFooterShell()}>
              <button
                type="button"
                disabled={referenceSubmitting}
                onClick={() => {
                  setReferredById("");
                  setReferredByNameOverride("");
                  setReferredByDesignationId("");
                  setReferenceError(null);
                }}
                className={btnSecondaryCls()}
              >
                Reset selection
              </button>
              <button
                type="submit"
                disabled={
                  referenceSubmitting ||
                  referrersLoading ||
                  !referredById ||
                  referrerOptions.length === 0
                }
                className={btnPrimaryCls()}
              >
                {referenceSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Saving…
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4" aria-hidden />
                    Save reference &amp; continue
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {onboardingStep === "assets" && createdEmployeeId && (
        <div className={stepPanelShell()}>
          <div className={stepSectionHeaderShell()}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#C99237]/15 lg:h-12 lg:w-12 lg:rounded-xl lg:bg-[#C99237]/12">
              <Package className="h-5 w-5 text-[#C99237] lg:h-6 lg:w-6" aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-bold text-[#0C123A] lg:text-2xl">Assign assets</h2>
              <p className="mt-1 text-xs text-slate-500 max-lg:line-clamp-2 lg:text-sm">
                Optional — allocate laptops, badges, SIMs, etc. for{" "}
                <span className="font-medium text-slate-700">{createdEmployeeName}</span>. Add rows with
                <span className="font-semibold text-slate-600"> Add asset</span>, or skip (step&nbsp;4 of&nbsp;6).
              </p>
            </div>
          </div>

          {assetsError && (
            <div
              className="mb-5 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 max-lg:mb-4"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
              <span>{assetsError}</span>
            </div>
          )}

          <form onSubmit={handleAssetsSubmit} className="space-y-6">
            <div className="space-y-6">
              {assetDraftRows.length === 0 && (
                <p className="text-sm text-slate-500">
                  No rows yet. Click <strong>Add asset</strong> to attach one or more assignments, or skip.
                </p>
              )}
              {assetDraftRows.map((row, idx) => (
                <div
                  key={row.key}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-bold text-[#0C123A]">Asset {idx + 1}</span>
                    <button
                      type="button"
                      disabled={assetsSubmitting}
                      onClick={() =>
                        setAssetDraftRows((prev) => prev.filter((r) => r.key !== row.key))
                      }
                      className="text-xs font-semibold text-red-700 underline underline-offset-2 hover:text-red-900 disabled:opacity-50"
                    >
                      Remove row
                    </button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className={labelCls()} htmlFor={`asset-name-${row.key}`}>
                        Asset name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id={`asset-name-${row.key}`}
                        className={inputCls()}
                        value={row.asset_name}
                        onChange={(e) =>
                          setAssetDraftRows((prev) =>
                            prev.map((r) =>
                              r.key === row.key ? { ...r, asset_name: e.target.value } : r,
                            ),
                          )
                        }
                        placeholder="e.g. Dell Latitude 5420"
                        maxLength={250}
                      />
                    </div>
                    <div>
                      <label className={labelCls()} htmlFor={`asset-type-${row.key}`}>
                        Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        id={`asset-type-${row.key}`}
                        className={inputCls()}
                        value={row.asset_type}
                        onChange={(e) =>
                          setAssetDraftRows((prev) =>
                            prev.map((r) =>
                              r.key === row.key ? { ...r, asset_type: e.target.value } : r,
                            ),
                          )
                        }
                      >
                        {(EMPLOYEE_ASSET_TYPES as readonly string[]).map((t) => (
                          <option key={t} value={t}>
                            {t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls()} htmlFor={`asset-handover-${row.key}`}>
                        Handover date/time{" "}
                        <span className="text-xs font-normal text-slate-400">(optional)</span>
                      </label>
                      <input
                        id={`asset-handover-${row.key}`}
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
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls()} htmlFor={`asset-summary-${row.key}`}>
                        Summary{" "}
                        <span className="text-xs font-normal text-slate-400">(optional)</span>
                      </label>
                      <input
                        id={`asset-summary-${row.key}`}
                        className={inputCls()}
                        value={row.asset_summary}
                        onChange={(e) =>
                          setAssetDraftRows((prev) =>
                            prev.map((r) =>
                              r.key === row.key ? { ...r, asset_summary: e.target.value } : r,
                            ),
                          )
                        }
                        placeholder="Serial, condition, vendor…"
                        maxLength={600}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls()} htmlFor={`asset-file-${row.key}`}>
                        Photo / receipt (PNG, JPG, WebP, PDF, max 5&nbsp;MB){" "}
                        <span className="text-xs font-normal text-slate-400">(optional)</span>
                      </label>
                      <input
                        id={`asset-file-${row.key}`}
                        type="file"
                        accept={ACCEPT_MIME}
                        className={`${inputCls()} cursor-pointer`}
                        disabled={assetsSubmitting}
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          setAssetsError(null);
                          if (f && f.size > MAX_FILE_BYTES) {
                            setAssetsError("Each asset file must be 5 MB or smaller.");
                            e.target.value = "";
                            return;
                          }
                          if (
                            f &&
                            !/^image\/(png|jpeg|webp)$/.test(f.type) &&
                            f.type !== "application/pdf"
                          ) {
                            setAssetsError("Use PNG, JPG, WebP, or PDF only.");
                            e.target.value = "";
                            return;
                          }
                          setAssetDraftRows((prev) =>
                            prev.map((r) => (r.key === row.key ? { ...r, file: f } : r)),
                          );
                        }}
                      />
                      {row.file && (
                        <p className="mt-1 text-xs text-slate-600">Attached: {row.file.name}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className={`${stepFooterShell()} lg:justify-between`}>
              <button
                type="button"
                disabled={assetsSubmitting}
                onClick={() => setAssetDraftRows((prev) => [...prev, createEmptyAssetDraft()])}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#C99237]/60 bg-[#C99237]/5 px-4 py-2.5 text-sm font-semibold text-[#0C123A] transition active:scale-[0.98] hover:bg-[#C99237]/15 disabled:opacity-60 lg:w-auto lg:rounded-lg"
              >
                <PlusCircle className="h-4 w-4" aria-hidden />
                Add asset
              </button>
              <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:justify-end">
                <button
                  type="button"
                  disabled={assetsSubmitting}
                  onClick={() => handleAssetsSkip()}
                  className="inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-2.5 text-sm font-semibold text-slate-700 transition active:scale-[0.98] hover:border-slate-400 hover:bg-white disabled:opacity-60 lg:w-auto lg:rounded-lg"
                >
                  Skip assets — documents next
                </button>
                <button
                  type="button"
                  disabled={assetsSubmitting}
                  onClick={() => {
                    setAssetDraftRows([]);
                    setAssetsError(null);
                  }}
                  className={btnSecondaryCls()}
                >
                  Clear rows
                </button>
                <button
                  type="submit"
                  disabled={assetsSubmitting}
                className={btnPrimaryCls()}
                >
                  {assetsSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Uploading…
                    </>
                  ) : (
                    <>
                      <Package className="h-4 w-4" aria-hidden />
                      Save assets &amp; continue
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {onboardingStep === "documents" && createdEmployeeId && (
        <div className={stepPanelShell()}>
          <div className={stepSectionHeaderShell()}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#C99237]/15 lg:h-12 lg:w-12 lg:rounded-xl lg:bg-[#C99237]/12">
              <FileText className="h-5 w-5 text-[#C99237] lg:h-6 lg:w-6" aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-bold text-[#0C123A] lg:text-2xl">Employee documents</h2>
              <p className="mt-1 text-xs text-slate-500 max-lg:line-clamp-2 lg:text-sm">
                Step&nbsp;5 of&nbsp;6 — tap a frame for full screen preview. Wrong file? Use{" "}
                <span className="font-semibold text-slate-600">Change file</span>. PNG/JPG/WebP/PDF · max{" "}
                5&nbsp;MB each.
              </p>
            </div>
          </div>

          {documentsError && (
            <div
              className="mb-5 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 max-lg:mb-4"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
              <span>{documentsError}</span>
            </div>
          )}

          <form onSubmit={handleDocumentsSubmit} className="space-y-8">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
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

            <div className={stepFooterEndShell()}>
              <button
                type="button"
                disabled={documentsSubmitting}
                onClick={() => resetDocumentsForm()}
                className={btnSecondaryCls()}
              >
                Clear all
              </button>
              <button
                type="submit"
                disabled={documentsSubmitting}
                className={btnPrimaryCls()}
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
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="doc-preview-title"
          onClick={() => setPreviewModalField(null)}
        >
          <div
            className="relative max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-t-3xl border border-white/10 bg-white shadow-2xl sm:rounded-2xl"
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
        <div className={stepPanelShell()}>
          <div className={stepSectionHeaderShell()}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#C99237]/15 lg:h-12 lg:w-12 lg:rounded-xl lg:bg-[#C99237]/12">
              <MapPin className="h-5 w-5 text-[#C99237] lg:h-6 lg:w-6" aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-bold text-[#0C123A] lg:text-2xl">Employee address</h2>
              <p className="mt-1 text-xs text-slate-500 max-lg:line-clamp-2 lg:text-sm">
                Optional — skip if you&apos;ll capture this later for{" "}
                <span className="font-medium text-slate-700">{createdEmployeeName}</span>.
              </p>
            </div>
          </div>

          {addressError && (
            <div
              className="mb-5 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 max-lg:mb-4"
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

              <div className={`${stepFooterShell()} lg:justify-between`}>
                <button
                  type="button"
                  disabled={addressSubmitting}
                  onClick={() => handleAddressSkip()}
                  className="inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-2.5 text-sm font-semibold text-slate-700 transition active:scale-[0.98] hover:border-slate-400 hover:bg-white disabled:opacity-60 lg:w-auto lg:rounded-lg"
                >
                  Skip address — finish onboarding
                </button>
                <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:justify-end">
                  <button
                    type="button"
                    disabled={addressSubmitting}
                    onClick={() => resetAddressForm()}
                    className={btnSecondaryCls()}
                  >
                    Clear fields
                  </button>
                  <button
                    type="submit"
                    disabled={addressSubmitting}
                    className={btnPrimaryCls()}
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
