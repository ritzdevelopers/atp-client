"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
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
  Package,
  PlusCircle,
  Briefcase,
  CalendarDays,
  Sparkles,
  Circle,
  ArrowRight,
} from "lucide-react";
import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import {
  btnBrandCls,
  btnGhostCls,
  dashCardCls,
  dashPageCls,
  dashSectionMetaCls,
  iconBadgeCls,
} from "@/components/portal-dashboard/home/dashboardTokens";
import {
  addUserAddress,
  addUserExternalInformation,
  createEmployee,
  EMPLOYEE_ASSET_TYPES,
  getOrganizationRoles,
  uploadEmployeeAssetsBatch,
  uploadEmployeeDocuments,
  type EmployeeAddressEntryPayload,
  type EmployeeOnboardingDocumentField,
  type OrgRoleRow,
} from "@/services/adminUser";

const ONBOARDING_STEPS_ORDER = [
  "basic",
  "external",
  "reference",
  "leave",
  "assets",
  "documents",
  "address",
] as const;

type OnboardingWizardStep = (typeof ONBOARDING_STEPS_ORDER)[number];

function Shimmer({ className = "" }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-xl ${className}`} />;
}

function EmployeeOnboardingSkeleton() {
  return (
    <div className={`${dashPageCls} pb-8`} aria-busy="true" aria-label="Loading employee onboarding">
      <div className={`${dashCardCls} overflow-hidden lg:hidden`}>
        <div className="space-y-3 p-4">
          <div className="flex items-center gap-3">
            <Shimmer className="h-10 w-10 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Shimmer className="h-4 w-40" />
              <Shimmer className="h-3 w-28" />
            </div>
          </div>
          <Shimmer className="h-1.5 w-full rounded-full" />
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <Shimmer key={i} className="h-7 w-16 shrink-0 rounded-full" />
            ))}
          </div>
        </div>
      </div>

      <div className={`${dashCardCls} hidden overflow-hidden lg:block`}>
        <div className="border-b border-slate-100 bg-gradient-to-r from-[#F8FAFC] via-white to-[#F0F9FF]/40 px-6 py-5">
          <div className="flex items-center gap-4">
            <Shimmer className="h-11 w-11 rounded-xl" />
            <div className="space-y-2">
              <Shimmer className="h-3 w-32" />
              <Shimmer className="h-6 w-56" />
              <Shimmer className="h-4 w-80 max-w-full" />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 px-6 py-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Shimmer key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
      </div>

      <div className={`${dashCardCls} space-y-4 p-4 sm:p-5 lg:p-6`}>
        <div className="flex items-center gap-3">
          <Shimmer className="h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <Shimmer className="h-4 w-36" />
            <Shimmer className="h-3 w-64 max-w-full" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`space-y-2 ${i === 0 || i === 1 ? "sm:col-span-2" : ""}`}>
              <Shimmer className="h-3 w-24" />
              <Shimmer className="h-10 w-full" />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Shimmer className="h-10 w-24" />
          <Shimmer className="h-10 w-32" />
        </div>
      </div>
    </div>
  );
}

function labelCls() {
  return "mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500";
}

function inputCls() {
  return "w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15 disabled:opacity-60";
}

function stepPanelShell() {
  return `${dashCardCls} p-4 sm:p-5 lg:p-6`;
}

function stepSectionHeaderShell() {
  return "mb-4 flex gap-3 max-lg:mb-3 max-lg:rounded-xl max-lg:border max-lg:border-slate-100 max-lg:bg-slate-50/80 max-lg:p-3 lg:mb-5 lg:border-0 lg:bg-transparent lg:p-0";
}

function stepIconShellCls() {
  return iconBadgeCls("blue");
}

function stepFooterShell() {
  return "flex flex-col gap-2 border-t border-slate-100 pt-4 lg:flex-row lg:flex-wrap lg:items-center lg:gap-2 lg:pt-5";
}

function stepFooterEndShell() {
  return "flex flex-col gap-2 border-t border-slate-100 pt-4 lg:flex-row lg:justify-end lg:gap-2 lg:pt-5";
}

function btnPrimaryCls() {
  return `${btnBrandCls(true)} lg:w-auto`;
}

function btnSecondaryCls() {
  return `${btnGhostCls(true)} lg:w-auto`;
}

function alertSuccessCls() {
  return "mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[13px] text-emerald-900 max-lg:mb-3";
}

function alertErrorCls() {
  return "mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[13px] text-rose-900 max-lg:mb-3";
}

function btnSkipCls() {
  return "inline-flex min-h-[40px] w-full items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-2 text-[13px] font-medium text-slate-600 transition hover:border-[#008CD3]/40 hover:bg-white disabled:opacity-50 lg:w-auto";
}

function btnAddCls() {
  return "inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#008CD3]/40 bg-[#E8F4FB] px-4 py-2 text-[13px] font-medium text-[#008CD3] transition hover:bg-[#008CD3]/10 disabled:opacity-50 lg:w-auto";
}

function stepTitleCls() {
  return "text-[15px] font-semibold tracking-tight text-slate-900 lg:text-[16px]";
}

function stepDescCls() {
  return `mt-0.5 max-lg:line-clamp-2 ${dashSectionMetaCls}`;
}

const ONBOARDING_STEP_NAV = [
  {
    key: "basic" as const,
    n: "1",
    label: "Basics",
    short: "Basics",
    icon: UserPlus,
    optional: false,
    title: "Account basics",
    summary:
      "Create the employee login profile with identity, contact, role, and a temporary password.",
    checklist: [
      "Full name, work email & phone",
      "Employee code & organization role",
      "Secure temporary password",
    ],
  },
  {
    key: "external" as const,
    n: "2",
    label: "Emergency",
    short: "Emergency",
    icon: ShieldCheck,
    optional: false,
    title: "Emergency contact",
    summary:
      "Capture a trusted contact for workplace emergencies and relation to the employee.",
    checklist: [
      "Emergency contact full name",
      "Phone number",
      "Blood-line / family relation",
    ],
  },
  {
    key: "reference" as const,
    n: "3",
    label: "Prev. company",
    short: "Company",
    icon: Briefcase,
    optional: true,
    title: "Previous company",
    summary:
      "Optional employment history — last company, role, and experience details if relevant.",
    checklist: [
      "Previous company name",
      "Last designation",
      "Years of experience (if any)",
    ],
  },
  {
    key: "leave" as const,
    n: "4",
    label: "Leave schedule",
    short: "Leave",
    icon: CalendarDays,
    optional: true,
    title: "Leave schedule",
    summary:
      "Optional leave policy notes for this hire — skip if you’ll configure leave later.",
    checklist: [
      "Leave entitlements (if known)",
      "Or skip and finish later",
    ],
  },
  {
    key: "assets" as const,
    n: "5",
    label: "Assets",
    short: "Assets",
    icon: Package,
    optional: true,
    title: "Company assets",
    summary:
      "Assign day-one hardware or accessories (laptop, ID card, etc.) with optional photos.",
    checklist: [
      "Asset type & serial / notes",
      "Optional photo attachments",
      "Or skip if nothing to issue yet",
    ],
  },
  {
    key: "documents" as const,
    n: "6",
    label: "Documents",
    short: "Docs",
    icon: FileStack,
    optional: false,
    title: "KYC & documents",
    summary:
      "Upload identity and HR documents — photo, Aadhaar, PAN, and optional letters.",
    checklist: [
      "Passport photo, Aadhaar & PAN",
      "Optional resignation / appointment letters",
      "PNG, JPG, WebP or PDF (max 5 MB)",
    ],
  },
  {
    key: "address" as const,
    n: "7",
    label: "Address",
    short: "Address",
    icon: MapPin,
    optional: true,
    title: "Residential address",
    summary:
      "Permanent and current addresses for records — can be skipped and added later.",
    checklist: [
      "Permanent address details",
      "Current address (or same-as toggle)",
      "Or skip to finish onboarding",
    ],
  },
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
      return "aspect-[3/4] max-h-44 w-full max-w-[10rem] sm:max-h-52 sm:max-w-[11rem]";
    case "aadhar":
      return "aspect-[85/53] w-full max-w-[14rem] sm:max-w-md";
    case "pan":
      return "aspect-[1.587/1] w-full max-w-[12rem] sm:max-w-sm";
    case "marksheet":
      return "aspect-[210/297] max-h-56 w-full max-w-[9rem] sm:max-h-64 sm:max-w-xs";
    case "letter":
      return "aspect-[8.5/11] max-h-52 w-full max-w-[9rem] sm:max-h-60 sm:max-w-xs";
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

type AddressFormValues = {
  country: string;
  state: string;
  district: string;
  city: string;
  is_from_village: boolean;
  village_name: string;
  street: string;
  house_number: string;
  zip_code: string;
};

function createEmptyAddressForm(): AddressFormValues {
  return {
    country: "",
    state: "",
    district: "",
    city: "",
    is_from_village: false,
    village_name: "",
    street: "",
    house_number: "",
    zip_code: "",
  };
}

function validateAddressFormValues(
  values: AddressFormValues,
  label: string,
): string | null {
  if (
    !values.country.trim() ||
    !values.state.trim() ||
    !values.district.trim() ||
    !values.city.trim() ||
    !values.street.trim() ||
    !values.house_number.trim() ||
    !values.zip_code.trim()
  ) {
    return `${label}: fill every required field, or skip this step.`;
  }
  if (values.is_from_village && !values.village_name.trim()) {
    return `${label}: village name is required when "from village" is checked.`;
  }
  return null;
}

function toAddressEntry(
  values: AddressFormValues,
  address_type: "permanent" | "current",
): EmployeeAddressEntryPayload {
  return {
    address_type,
    country: values.country.trim(),
    state: values.state.trim(),
    district: values.district.trim(),
    city: values.city.trim(),
    is_from_village: values.is_from_village,
    village_name: values.is_from_village ? values.village_name.trim() : null,
    street: values.street.trim(),
    house_number: values.house_number.trim(),
    zip_code: values.zip_code.trim(),
  };
}

function AddressFormFields({
  idPrefix,
  title,
  values,
  onChange,
  disabled = false,
}: {
  idPrefix: string;
  title: string;
  values: AddressFormValues;
  onChange: (patch: Partial<AddressFormValues>) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3 sm:p-4">
      <h3 className="text-[14px] font-semibold tracking-tight text-slate-900">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${idPrefix}-country`} className={labelCls()}>
            Country <span className="text-red-500">*</span>
          </label>
          <input
            id={`${idPrefix}-country`}
            className={inputCls()}
            value={values.country}
            onChange={(e) => onChange({ country: e.target.value })}
            placeholder="India"
            disabled={disabled}
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-state`} className={labelCls()}>
            State <span className="text-red-500">*</span>
          </label>
          <input
            id={`${idPrefix}-state`}
            className={inputCls()}
            value={values.state}
            onChange={(e) => onChange({ state: e.target.value })}
            placeholder="Maharashtra"
            disabled={disabled}
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-district`} className={labelCls()}>
            District <span className="text-red-500">*</span>
          </label>
          <input
            id={`${idPrefix}-district`}
            className={inputCls()}
            value={values.district}
            onChange={(e) => onChange({ district: e.target.value })}
            placeholder="Pune"
            disabled={disabled}
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-city`} className={labelCls()}>
            City <span className="text-red-500">*</span>
          </label>
          <input
            id={`${idPrefix}-city`}
            className={inputCls()}
            value={values.city}
            onChange={(e) => onChange({ city: e.target.value })}
            placeholder="Pune"
            disabled={disabled}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 text-[13px] font-medium text-slate-900">
            <input
              type="checkbox"
              checked={values.is_from_village}
              onChange={(e) => {
                onChange({
                  is_from_village: e.target.checked,
                  village_name: e.target.checked ? values.village_name : "",
                });
              }}
              disabled={disabled}
              className="h-4 w-4 rounded border-slate-300 text-[#008CD3] focus:ring-[#008CD3]/30"
            />
            Employee is from a village
          </label>
        </div>
        {values.is_from_village && (
          <div className="sm:col-span-2">
            <label htmlFor={`${idPrefix}-village`} className={labelCls()}>
              Village name <span className="text-red-500">*</span>
            </label>
            <input
              id={`${idPrefix}-village`}
              className={inputCls()}
              value={values.village_name}
              onChange={(e) => onChange({ village_name: e.target.value })}
              placeholder="Village name"
              disabled={disabled}
            />
          </div>
        )}
        <div>
          <label htmlFor={`${idPrefix}-street`} className={labelCls()}>
            Street <span className="text-red-500">*</span>
          </label>
          <input
            id={`${idPrefix}-street`}
            className={inputCls()}
            value={values.street}
            onChange={(e) => onChange({ street: e.target.value })}
            placeholder="Street / Area"
            disabled={disabled}
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-house`} className={labelCls()}>
            House number <span className="text-red-500">*</span>
          </label>
          <input
            id={`${idPrefix}-house`}
            className={inputCls()}
            value={values.house_number}
            onChange={(e) => onChange({ house_number: e.target.value })}
            placeholder="A-101"
            disabled={disabled}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`${idPrefix}-zip`} className={labelCls()}>
            ZIP / PIN code <span className="text-red-500">*</span>
          </label>
          <input
            id={`${idPrefix}-zip`}
            className={inputCls()}
            value={values.zip_code}
            onChange={(e) => onChange({ zip_code: e.target.value })}
            placeholder="411001"
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}

export default function EmployeOnboardingPage() {
  return (
    <Suspense fallback={<EmployeeOnboardingSkeleton />}>
      <EmployeOnboardingPageContent />
    </Suspense>
  );
}

function EmployeOnboardingPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orgIdParam = params?.org_id;
  const ctx = useManagementDashboardContext();

  const [roles, setRoles] = useState<OrgRoleRow[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [empCode, setEmpCode] = useState("");
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

  const [assetDraftRows, setAssetDraftRows] = useState<AssetDraftRow[]>([]);
  const [assetsSubmitting, setAssetsSubmitting] = useState(false);
  const [assetsError, setAssetsError] = useState<string | null>(null);

  const [permanentAddress, setPermanentAddress] = useState<AddressFormValues>(
    createEmptyAddressForm,
  );
  const [currentAddress, setCurrentAddress] = useState<AddressFormValues>(
    createEmptyAddressForm,
  );
  const [currentSameAsPermanent, setCurrentSameAsPermanent] = useState(false);
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
  const [journeyPreviewOpen, setJourneyPreviewOpen] = useState(false);

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
    setPermanentAddress(createEmptyAddressForm());
    setCurrentAddress(createEmptyAddressForm());
    setCurrentSameAsPermanent(false);
    setAddressError(null);
  }

  useEffect(() => {
    if (currentSameAsPermanent) {
      setCurrentAddress({ ...permanentAddress });
    }
  }, [currentSameAsPermanent, permanentAddress]);

  function resetExternalForm() {
    setEmergencyName("");
    setEmergencyNumber("");
    setRelationBloodLine("father");
    setExternalError(null);
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
    resetAssetDraftRows();
    setOnboardingStep("basic");
    setName("");
    setEmail("");
    setPhone("");
    setEmpCode("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    if (roles.length > 0) setUserRoleId(String(roles[0].id));
  }

  useEffect(() => {
    const employeeIdFromUrl = searchParams.get("employee_id");
    const employeeNameFromUrl = searchParams.get("employee_name");
    const stepFromUrl = searchParams.get("step");

    if (employeeIdFromUrl) {
      setCreatedEmployeeId(employeeIdFromUrl);
      if (employeeNameFromUrl) {
        setCreatedEmployeeName(decodeURIComponent(employeeNameFromUrl));
      }
    }

    if (
      stepFromUrl &&
      (ONBOARDING_STEPS_ORDER as readonly string[]).includes(stepFromUrl)
    ) {
      setOnboardingStep(stepFromUrl as OnboardingWizardStep);
    }
  }, [searchParams]);

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
        emp_code: empCode.trim() || undefined,
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
      resetAssetDraftRows();
      setOnboardingStep("external");
      setSuccess(
        `Step 1 done — ${employeeName} has an account. Next: emergency contact, previous company (optional), assets, documents, and address.`,
      );
      setName("");
      setEmail("");
      setPhone("");
      setEmpCode("");
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
        `${createdEmployeeName || "Employee"}: emergency contact saved. Add previous company reference or skip if fresher.`,
      );
    } catch (err) {
      setExternalError(err instanceof Error ? err.message : "Could not save emergency contact.");
    } finally {
      setExternalSubmitting(false);
    }
  }

  const previousCompanyFormUrl = useMemo(() => {
    if (!createdEmployeeId || !orgIdParam) return "";
    const q = new URLSearchParams({
      employee_id: String(createdEmployeeId),
      employee_name: createdEmployeeName || "Employee",
    });
    return `/dashboard/${orgIdParam}/organization-employees/employee-onboarding/previous-company-reference?${q.toString()}`;
  }, [createdEmployeeId, createdEmployeeName, orgIdParam]);

  function handlePreviousCompanySkip() {
    setOnboardingStep("leave");
    setSuccess(
      `${createdEmployeeName || "Employee"}: skipped previous company reference. Configure leave schedule next (optional) or skip.`,
    );
  }

  const leaveScheduleFormUrl = useMemo(() => {
    if (!createdEmployeeId || !orgIdParam) return "";
    const q = new URLSearchParams({
      employee_id: String(createdEmployeeId),
      employee_name: createdEmployeeName || "Employee",
    });
    return `/dashboard/${orgIdParam}/organization-employees/employee-onboarding/leave-schedule?${q.toString()}`;
  }, [createdEmployeeId, createdEmployeeName, orgIdParam]);

  function handleLeaveScheduleSkip() {
    setOnboardingStep("assets");
    setSuccess(
      `${createdEmployeeName || "Employee"}: skipped leave schedule. Assign assets next (optional) or skip.`,
    );
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

    const permanentValidation = validateAddressFormValues(
      permanentAddress,
      "Permanent address",
    );
    if (permanentValidation) {
      setAddressError(permanentValidation);
      return;
    }

    const currentValues = currentSameAsPermanent
      ? permanentAddress
      : currentAddress;
    const currentValidation = validateAddressFormValues(
      currentValues,
      "Current address",
    );
    if (currentValidation) {
      setAddressError(currentValidation);
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
        employee_id: createdEmployeeId,
        org_id: organizationIdNum,
        address_info: [
          toAddressEntry(permanentAddress, "permanent"),
          toAddressEntry(currentValues, "current"),
        ],
      });
      setAddressSuccess("Employee addresses saved. Onboarding complete.");
      resetAddressForm();
      resetDocumentsForm();
      resetExternalForm();
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

  useEffect(() => {
    if (!journeyPreviewOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setJourneyPreviewOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [journeyPreviewOpen]);

  const currentStepIndex = ONBOARDING_STEPS_ORDER.indexOf(onboardingStep);
  const progressPct = ((currentStepIndex + 1) / ONBOARDING_STEPS_ORDER.length) * 100;
  const currentStepLabel =
    ONBOARDING_STEP_NAV.find((s) => s.key === onboardingStep)?.label ?? "Onboarding";

  const journeyPreviewModal = journeyPreviewOpen ? (
    <div
      className="fixed inset-0 z-[10050] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-journey-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]"
        aria-label="Close journey preview"
        onClick={() => setJourneyPreviewOpen(false)}
      />
      <div className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-slate-200/90 bg-white shadow-2xl sm:max-h-[88vh] sm:rounded-2xl">
        <div className="relative shrink-0 overflow-hidden border-b border-slate-100 bg-gradient-to-r from-[#F8FAFC] via-white to-[#F0F9FF]/50 px-4 py-4 sm:px-6 sm:py-5">
          <div
            className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-[#008CD3]/10 blur-2xl"
            aria-hidden
          />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#008CD3] to-[#0C123A] text-white shadow-md shadow-[#008CD3]/25">
                <Sparkles className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#008CD3]">
                  Premium preview
                </p>
                <h2
                  id="onboarding-journey-title"
                  className="mt-0.5 text-[17px] font-semibold tracking-tight text-slate-900 sm:text-[19px]"
                >
                  Onboarding journey map
                </h2>
                <p className={`mt-1 ${dashSectionMetaCls}`}>
                  Preview all {ONBOARDING_STEPS_ORDER.length} steps before you fill
                  them — know what&apos;s required vs optional.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setJourneyPreviewOpen(false)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="relative mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F4FB] px-2.5 py-1 text-[11px] font-semibold text-[#008CD3]">
              <Circle className="h-2 w-2 fill-current" aria-hidden />
              You are on step {currentStepIndex + 1}
            </span>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              {currentStepIndex} completed
            </span>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              {ONBOARDING_STEPS_ORDER.length - currentStepIndex - 1} remaining
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
          <ol className="relative space-y-0">
            {ONBOARDING_STEP_NAV.map((step, index) => {
              const Icon = step.icon;
              const done = currentStepIndex > index;
              const active = onboardingStep === step.key;
              const upcoming = currentStepIndex < index;
              const isLast = index === ONBOARDING_STEP_NAV.length - 1;

              return (
                <li key={step.key} className="relative flex gap-3 pb-5 last:pb-1 sm:gap-4">
                  {!isLast ? (
                    <span
                      className={`absolute left-[17px] top-10 h-[calc(100%-1.25rem)] w-px sm:left-[19px] ${
                        done ? "bg-emerald-300" : "bg-slate-200"
                      }`}
                      aria-hidden
                    />
                  ) : null}

                  <div className="relative z-[1] flex shrink-0 flex-col items-center">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-bold shadow-sm ring-4 ring-white sm:h-10 sm:w-10 ${
                        done
                          ? "bg-emerald-500 text-white"
                          : active
                            ? "bg-[#008CD3] text-white"
                            : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {done ? (
                        <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
                      ) : (
                        step.n
                      )}
                    </span>
                  </div>

                  <div
                    className={`min-w-0 flex-1 rounded-2xl border p-3.5 transition sm:p-4 ${
                      active
                        ? "border-[#008CD3]/35 bg-gradient-to-br from-[#E8F4FB]/90 to-white shadow-[0_8px_24px_rgba(0,140,211,0.08)]"
                        : done
                          ? "border-emerald-100 bg-emerald-50/40"
                          : "border-slate-100 bg-slate-50/60"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <span
                          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            active
                              ? "bg-[#008CD3]/15 text-[#008CD3]"
                              : done
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-white text-slate-500 ring-1 ring-slate-200/80"
                          }`}
                        >
                          <Icon className="h-4 w-4" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-[14px] font-semibold tracking-tight text-slate-900 sm:text-[15px]">
                              {step.title}
                            </h3>
                            {step.optional ? (
                              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 ring-1 ring-amber-200/70">
                                Optional
                              </span>
                            ) : (
                              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700 ring-1 ring-rose-200/60">
                                Required
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-[12px] leading-relaxed text-slate-500 sm:text-[13px]">
                            {step.summary}
                          </p>
                        </div>
                      </div>
                      {active ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#008CD3] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                          Current
                        </span>
                      ) : done ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                          Done
                        </span>
                      ) : upcoming ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 ring-1 ring-slate-200">
                          Upcoming
                        </span>
                      ) : null}
                    </div>

                    <ul className="mt-3 space-y-1.5 border-t border-slate-100/80 pt-3">
                      {step.checklist.map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-2 text-[12px] text-slate-600 sm:text-[13px]"
                        >
                          <ArrowRight
                            className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                              active
                                ? "text-[#008CD3]"
                                : done
                                  ? "text-emerald-500"
                                  : "text-slate-300"
                            }`}
                            aria-hidden
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-slate-50/80 px-4 py-3 sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className={`hidden sm:block ${dashSectionMetaCls}`}>
              Tip: optional steps can be skipped during the flow.
            </p>
            <button
              type="button"
              onClick={() => setJourneyPreviewOpen(false)}
              className={`${btnBrandCls(true)} sm:w-auto`}
            >
              Continue onboarding
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className={`${dashPageCls} pb-4 max-lg:pb-[calc(4.5rem+env(safe-area-inset-bottom))]`}>
      {/* Mobile & tablet: sticky header + progress */}
      <div className="sticky top-0 z-20 -mx-3 border-b border-slate-200/80 bg-white/95 px-3 pb-3 pt-3 shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur-md sm:-mx-5 sm:px-4 lg:hidden">
        <div className="flex items-center gap-3">
          <span className={stepIconShellCls()}>
            <UserPlus className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[17px] font-semibold tracking-tight text-slate-900">
              Employee onboarding
            </h1>
            <p className={`truncate ${dashSectionMetaCls}`}>{orgName}</p>
          </div>
          <button
            type="button"
            onClick={() => setJourneyPreviewOpen(true)}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-[#008CD3]/25 bg-gradient-to-r from-[#E8F4FB] to-white px-2.5 text-[11px] font-semibold text-[#008CD3] shadow-sm transition active:scale-[0.98] hover:border-[#008CD3]/40"
            aria-label="Preview all onboarding steps"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Preview
          </button>
        </div>
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px]">
            <span className="font-semibold text-[#008CD3]">
              Step {currentStepIndex + 1} of {ONBOARDING_STEPS_ORDER.length}
            </span>
            <span className="truncate text-slate-500">{currentStepLabel}</span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuenow={currentStepIndex + 1}
            aria-valuemin={1}
            aria-valuemax={ONBOARDING_STEPS_ORDER.length}
            aria-label="Onboarding progress"
          >
            <div
              className="h-full rounded-full bg-[#008CD3] transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
        <div className="mt-3 flex gap-1.5 overflow-x-auto rounded-xl bg-slate-100/80 p-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {ONBOARDING_STEP_NAV.map(({ key, short, n }) => {
            const order = [...ONBOARDING_STEPS_ORDER];
            const cur = order.indexOf(onboardingStep);
            const ix = order.indexOf(key);
            const done = cur > ix;
            const active = onboardingStep === key;
            return (
              <span
                key={key}
                className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold ${
                  active
                    ? "bg-white text-[#008CD3] shadow-sm"
                    : done
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-slate-500"
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
      <header className={`${dashCardCls} hidden overflow-hidden lg:block`}>
        <div className="border-b border-slate-100 bg-gradient-to-r from-[#F8FAFC] via-white to-[#F0F9FF]/40 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className={stepIconShellCls()}>
                <UserPlus className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                  Organization · Employees
                </p>
                <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">
                  Employee onboarding
                </h1>
                <p className={`mt-1 max-w-2xl ${dashSectionMetaCls}`}>
                  Seven steps for{" "}
                  <span className="font-medium text-slate-700">{orgName}</span>:
                  basics, emergency contact, previous company (optional), leave
                  schedule (optional), assets, documents, and address.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setJourneyPreviewOpen(true)}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-[#008CD3]/25 bg-gradient-to-r from-[#E8F4FB] via-white to-[#F8FAFC] px-3.5 py-2 text-[13px] font-semibold text-[#008CD3] shadow-sm transition hover:border-[#008CD3]/45 hover:shadow-md"
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                Preview journey
              </button>
              <div className="rounded-xl bg-sky-50/80 px-3.5 py-3 text-center">
                <p className="text-lg font-semibold tabular-nums text-[#008CD3]">
                  {currentStepIndex + 1}/{ONBOARDING_STEPS_ORDER.length}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Progress
                </p>
              </div>
            </div>
          </div>
        </div>
        <nav className="px-6 py-4" aria-label="Onboarding steps">
          <ol className="flex flex-wrap items-center gap-2">
            {ONBOARDING_STEP_NAV.map(({ key, n, label }) => {
              const order = [...ONBOARDING_STEPS_ORDER];
              const cur = order.indexOf(onboardingStep);
              const ix = order.indexOf(key);
              const done = cur > ix;
              const active = onboardingStep === key;
              return (
                <li
                  key={key}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold ${
                    active
                      ? "bg-[#E8F4FB] text-[#008CD3] ring-1 ring-[#008CD3]/25"
                      : done
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-50 text-slate-400"
                  }`}
                >
                  {done ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  ) : (
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
                        active
                          ? "bg-[#008CD3] text-white"
                          : "bg-slate-200 text-slate-600"
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
          <div
            className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuenow={currentStepIndex + 1}
            aria-valuemin={1}
            aria-valuemax={ONBOARDING_STEPS_ORDER.length}
            aria-label="Onboarding progress"
          >
            <div
              className="h-full rounded-full bg-[#008CD3] transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </nav>
      </header>

      {rolesLoading && onboardingStep === "basic" ? (
        <div className={`${dashCardCls} space-y-4 p-4 sm:p-5 lg:p-6`} aria-busy="true">
          <div className="flex items-center gap-3">
            <Shimmer className="h-10 w-10 rounded-xl" />
            <div className="space-y-2">
              <Shimmer className="h-4 w-36" />
              <Shimmer className="h-3 w-64 max-w-full" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`space-y-2 ${i < 2 ? "sm:col-span-2" : ""}`}>
                <Shimmer className="h-3 w-24" />
                <Shimmer className="h-10 w-full" />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Shimmer className="h-10 w-24" />
            <Shimmer className="h-10 w-32" />
          </div>
        </div>
      ) : null}

      {!(rolesLoading && onboardingStep === "basic") && onboardingStep === "basic" && (
        <div className={stepPanelShell()}>
          <div className={stepSectionHeaderShell()}>
            <span className={stepIconShellCls()}>
              <UserPlus className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h2 className={stepTitleCls()}>Account basics</h2>
              <p className={stepDescCls()}>
                Step 1 — name, contact, employee code, role, and password for {orgName}.
              </p>
            </div>
          </div>

          {addressSuccess && (
            <div
              className={`${alertSuccessCls()} flex-col gap-2 sm:flex-row sm:items-center sm:justify-between`}
              role="status"
            >
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                <span>{addressSuccess}</span>
              </div>
              <button
                type="button"
                onClick={() => setAddressSuccess(null)}
                className="shrink-0 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-900 transition hover:bg-slate-50"
              >
                Dismiss
              </button>
            </div>
          )}

          {success && (
            <div className={alertSuccessCls()} role="status">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              <span>{success}</span>
            </div>
          )}

          {(formError || rolesError) && (
            <div
              className={alertErrorCls()}
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#D93025]" aria-hidden />
              <span>{formError || rolesError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
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
                <label htmlFor="emp-code" className={labelCls()}>
                  Employee code
                </label>
                <input
                  id="emp-code"
                  name="emp_code"
                  type="text"
                  autoComplete="off"
                  className={inputCls()}
                  value={empCode}
                  onChange={(e) => setEmpCode(e.target.value.toUpperCase())}
                  placeholder="e.g. EMP001"
                />
              </div>

              <div>
                <label htmlFor="emp-role" className={labelCls()}>
                  Role <span className="text-red-500">*</span>
                </label>
                {rolesLoading ? (
                  <div className="space-y-2" aria-busy="true">
                    <Shimmer className="h-10 w-full" />
                    <p className={dashSectionMetaCls}>Loading roles…</p>
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
            <span className={stepIconShellCls()}>
              <ShieldCheck className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h2 className={stepTitleCls()}>
                Emergency contact
              </h2>
              <p className={stepDescCls()}>
                For{" "}
                <span className="font-medium text-slate-700">{createdEmployeeName}</span>.
                Saved to organizational records (step&nbsp;2 of&nbsp;7).
              </p>
            </div>
          </div>

          {externalError && (
            <div
              className={alertErrorCls()}
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#D93025]" aria-hidden />
              <span>{externalError}</span>
            </div>
          )}

          <form onSubmit={handleExternalSubmit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
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
                    Continue to previous company
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
            <span className={stepIconShellCls()}>
              <Briefcase className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h2 className={stepTitleCls()}>Previous company reference</h2>
              <p className={stepDescCls()}>
                Optional background verification for{" "}
                <span className="font-medium text-slate-700">{createdEmployeeName}</span>. Experienced
                hires can add prior employer details; freshers can skip (step&nbsp;3 of&nbsp;7).
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-[13px] text-slate-500">
              Capture previous company name, employment dates, and an HR or reporting manager contact for
              verification. You can add multiple previous employers on the next screen.
            </p>

            <div className={stepFooterShell()}>
              <button
                type="button"
                onClick={handlePreviousCompanySkip}
                className={btnSkipCls()}
              >
                No reference — fresher employee
              </button>
              {previousCompanyFormUrl ? (
                <Link href={previousCompanyFormUrl} className={btnPrimaryCls()}>
                  <Briefcase className="h-4 w-4" aria-hidden />
                  Add previous company reference
                </Link>
              ) : (
                <button type="button" disabled className={btnPrimaryCls()}>
                  Add previous company reference
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {onboardingStep === "leave" && createdEmployeeId && (
        <div className={stepPanelShell()}>
          <div className={stepSectionHeaderShell()}>
            <span className={stepIconShellCls()}>
              <CalendarDays className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h2 className={stepTitleCls()}>Leave schedule</h2>
              <p className={stepDescCls()}>
                Optional — define when and how{" "}
                <span className="font-medium text-slate-700">{createdEmployeeName}</span> receives
                leave credits per type (step&nbsp;4 of&nbsp;7).
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-[13px] text-slate-500">
              Choose organization leave types, set allocation frequency, leaves per cycle, carry-forward
              rules, and the first credit date. You can assign different schedules for each leave type.
            </p>

            <div className={stepFooterShell()}>
              <button
                type="button"
                onClick={handleLeaveScheduleSkip}
                className={btnSkipCls()}
              >
                Skip — configure leave later
              </button>
              {leaveScheduleFormUrl ? (
                <Link href={leaveScheduleFormUrl} className={btnPrimaryCls()}>
                  <CalendarDays className="h-4 w-4" aria-hidden />
                  Set up leave schedule
                </Link>
              ) : (
                <button type="button" disabled className={btnPrimaryCls()}>
                  Set up leave schedule
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {onboardingStep === "assets" && createdEmployeeId && (
        <div className={stepPanelShell()}>
          <div className={stepSectionHeaderShell()}>
            <span className={stepIconShellCls()}>
              <Package className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h2 className={stepTitleCls()}>Assign assets</h2>
              <p className={stepDescCls()}>
                Optional — allocate laptops, badges, SIMs, etc. for{" "}
                <span className="font-medium text-slate-700">{createdEmployeeName}</span>. Add rows with
                <span className="font-medium text-slate-700"> Add asset</span>, or skip (step&nbsp;5 of&nbsp;7).
              </p>
            </div>
          </div>

          {assetsError && (
            <div
              className={alertErrorCls()}
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#D93025]" aria-hidden />
              <span>{assetsError}</span>
            </div>
          )}

          <form onSubmit={handleAssetsSubmit} className="space-y-4">
            <div className="space-y-3">
              {assetDraftRows.length === 0 && (
                <p className="text-[13px] text-slate-500">
                  No rows yet. Click <strong>Add asset</strong> to attach one or more assignments, or skip.
                </p>
              )}
              {assetDraftRows.map((row, idx) => (
                <div
                  key={row.key}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-slate-900">Asset {idx + 1}</span>
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
                        <span className="text-[11px] font-normal text-slate-400">(optional)</span>
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
                        <span className="text-[11px] font-normal text-slate-400">(optional)</span>
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
                        <span className="text-[11px] font-normal text-slate-400">(optional)</span>
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
                className={btnAddCls()}
              >
                <PlusCircle className="h-4 w-4" aria-hidden />
                Add asset
              </button>
              <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:justify-end">
                <button
                  type="button"
                  disabled={assetsSubmitting}
                  onClick={() => handleAssetsSkip()}
                  className={btnSkipCls()}
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
            <span className={stepIconShellCls()}>
              <FileText className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h2 className={stepTitleCls()}>Employee documents</h2>
              <p className={stepDescCls()}>
                Step&nbsp;6 of&nbsp;7 — tap a frame for full screen preview. Wrong file? Use{" "}
                <span className="font-medium text-slate-700">Change file</span>. PNG/JPG/WebP/PDF · max{" "}
                5&nbsp;MB each.
              </p>
            </div>
          </div>

          {documentsError && (
            <div
              className={alertErrorCls()}
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#D93025]" aria-hidden />
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
                      <p className="mb-2 text-[11px] text-slate-500">{hint}</p>

                      <div
                        className={`relative mx-auto flex w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-200 bg-slate-50 ${skeletonFrameClass(skeleton)}`}
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
                            className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-3 text-center text-slate-500 transition hover:bg-white/60"
                          >
                            <IconCmp className="h-8 w-8 text-[#D1D5DB]" aria-hidden />
                            <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                              Upload
                            </span>
                            <span className="text-[11px] text-slate-500">Tap to attach</span>
                          </button>
                        )}

                        {file && url && (
                          <button
                            type="button"
                            onClick={() => setPreviewModalField(field)}
                            className="group relative flex h-full w-full items-center justify-center overflow-hidden bg-black/5 outline-none ring-[#008CD3] ring-offset-2 focus-visible:ring-2"
                            aria-label={`Open preview for ${label}`}
                          >
                            {isPdfFile(file) ? (
                              <div className="flex flex-col items-center gap-2 p-6 text-center">
                                <FileText className="h-14 w-14 text-[#008CD3]" aria-hidden />
                                <span className="text-xs font-medium text-slate-900">PDF</span>
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
                            <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-2 py-1 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
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
                          className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-[#008CD3]/40 bg-[#E8F4FB] px-2.5 py-1 text-[12px] font-medium text-[#008CD3] transition hover:bg-[#008CD3]/10 disabled:opacity-50"
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
            className="relative max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-t-xl border border-slate-200 bg-white shadow-xl sm:rounded-lg"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-3 py-2.5 sm:px-4">
              <div>
                <h3 id="doc-preview-title" className="text-sm font-bold text-slate-900">
                  {ONBOARDING_DOC_SLOTS.find((s) => s.field === previewModalField)?.label ??
                    "Preview"}
                </h3>
                <p className="mt-0.5 truncate max-w-[70vw] text-xs text-slate-500">{modalFile.name}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-50"
                  onClick={() => docInputRefs.current[previewModalField]?.click()}
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                  Change
                </button>
                <button
                  type="button"
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
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
                    <a href={modalUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#008CD3] underline">
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
            <span className={stepIconShellCls()}>
              <MapPin className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h2 className={stepTitleCls()}>Employee address</h2>
              <p className={stepDescCls()}>
                Permanent and current address for{" "}
                <span className="font-medium text-slate-700">{createdEmployeeName}</span> (step&nbsp;7
                of&nbsp;7). Optional — skip if you&apos;ll capture this later.
              </p>
            </div>
          </div>

          {addressError && (
            <div
              className={alertErrorCls()}
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#D93025]" aria-hidden />
              <span>{addressError}</span>
            </div>
          )}

          <form onSubmit={handleAddressSubmit} className="space-y-4">
            <AddressFormFields
              idPrefix="perm"
              title="Permanent address"
              values={permanentAddress}
              onChange={(patch) =>
                setPermanentAddress((prev) => ({ ...prev, ...patch }))
              }
              disabled={addressSubmitting}
            />

            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-medium text-slate-900">
              <input
                type="checkbox"
                checked={currentSameAsPermanent}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setCurrentSameAsPermanent(checked);
                  if (checked) {
                    setCurrentAddress({ ...permanentAddress });
                  }
                }}
                disabled={addressSubmitting}
                className="h-4 w-4 rounded border-slate-200 text-[#008CD3] focus:ring-[#008CD3]/30"
              />
              Current address is same as permanent address
            </label>

            <AddressFormFields
              idPrefix="curr"
              title="Current address"
              values={currentSameAsPermanent ? permanentAddress : currentAddress}
              onChange={(patch) => setCurrentAddress((prev) => ({ ...prev, ...patch }))}
              disabled={addressSubmitting || currentSameAsPermanent}
            />

            <div className={`${stepFooterShell()} lg:justify-between`}>
              <button
                type="button"
                disabled={addressSubmitting}
                onClick={() => handleAddressSkip()}
                className={btnSkipCls()}
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
                      Save addresses
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {journeyPreviewModal}
    </div>
  );
}
