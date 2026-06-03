"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import {
  Star,
  Eye,
  MessageCircle,
  MoreHorizontal,
  Users,
  AtSign,
  Phone,
  X,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  BadgeDollarSign,
  CalendarDays,
  MapPin,
  PlusCircle,
  Pencil,
  Shield,
  FileText,
  Package,
  Upload,
  UserX,
} from "lucide-react";
import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import AssignEmployeeAssetsModal from "@/components/portal-dashboard/employees/AssignEmployeeAssetsModal";
import TerminateEmployeeModal from "@/components/portal-dashboard/employees/TerminateEmployeeModal";
import {
  addUserAddress,
  dedupeOrgUserRows,
  getAllOrgUsers,
  orgUserEmployeeTeamId,
  getOrganizationRoles,
  getUserAddresses,
  updateUserAddress,
  updateUserDetails,
  updateUserRoleAssignment,
  uploadEmployeeDocuments,
  type EmployeeOnboardingDocumentField,
  type OrgUserRow,
  type OrgRoleRow,
  type UserAddressRow,
} from "@/services/adminUser";
import {
  createEmployeeLeaveBalance,
  getLeaveTypesForEmployee,
  type LeaveTypeRow,
} from "@/services/leaveManagement";

type EmployeeTier = "employees" | "management" | "inactive" | "exit_process";
type RosterTier = "employees" | "management";

type EmployeeCard = {
  id: string;
  empCode: string;
  name: string;
  roleLabel: string;
  memberSince: string;
  email: string;
  phone: string;
  status: "in" | "out";
  tier: EmployeeTier;
  rosterTier: RosterTier;
  isActive: boolean;
  hasExitProcess: boolean;
  exitActionLabel: string | null;
  exitStatusLabel: string | null;
  avatarSrc: string;
  avatarSeed: string;
  profileImageUrl: string | null;
};

function hasExitProcessRecord(row: OrgUserRow): boolean {
  return (
    String(row.exit_process_action_type ?? "").trim() !== "" &&
    String(row.exit_process_application_status ?? "").trim() !== ""
  );
}

type AddressDraft = {
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

const ACCENT = "#0d9488";
const ACCENT_SOFT = "rgba(13, 148, 136, 0.12)";
const PASSWORD_MIN = 8;
const emptyAddressDraft: AddressDraft = {
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

function avatarUrl(seed: string) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

function profileImageUrlFromRow(userImage: unknown): string | null {
  const image = String(userImage ?? "").trim();
  return image || null;
}

function resolveAvatarSrc(userImage: unknown, seed: string) {
  const image = profileImageUrlFromRow(userImage);
  if (image) return image;
  return avatarUrl(seed);
}

const mobileLabelCls =
  "text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]";
const mobileCaptionCls = "text-[11px] leading-snug text-[#6B7280]";
const mobileValueCls = "text-[13px] font-semibold text-[#1F2937]";

function ProfilePhotoZoomModal({
  open,
  imageUrl,
  alt,
  onClose,
}: {
  open: boolean;
  imageUrl: string;
  alt: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#111B21]/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="employee-photo-zoom-title"
    >
      <button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label="Close profile photo"
      />
      <div className="relative z-[1] w-full max-w-sm">
        <button
          type="button"
          onClick={onClose}
          className="absolute -right-1 -top-1 z-[2] flex h-9 w-9 items-center justify-center rounded-full border border-[#E4E7EC] bg-white text-[#1F2937] shadow-lg active:scale-95"
          aria-label="Close"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={alt}
          className="max-h-[min(78vh,560px)] w-full rounded-xl bg-white object-contain shadow-2xl ring-1 ring-[#E4E7EC]"
        />
        <p
          id="employee-photo-zoom-title"
          className="mt-2.5 text-center text-[13px] font-medium text-white"
        >
          {alt}
        </p>
      </div>
    </div>
  );
}

function EmployeeAvatar({
  emp,
  size = "md",
  onZoom,
}: {
  emp: EmployeeCard;
  size?: "md" | "lg";
  onZoom: (imageUrl: string, name: string) => void;
}) {
  const box = size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const dot =
    size === "lg" ? "h-3 w-3 border-2" : "h-2.5 w-2.5 border-[1.5px]";
  const img = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={emp.avatarSrc}
        alt=""
        className="h-full w-full object-cover object-top"
        onError={(e) => {
          e.currentTarget.src = avatarUrl(emp.avatarSeed);
        }}
      />
      <span
        className={`absolute bottom-0 right-0 rounded-full border-white ${dot} ${
          emp.status === "in" ? "bg-[#0F9D58]" : "bg-[#D93025]"
        }`}
        aria-hidden
      />
    </>
  );

  const shell = `relative ${box} shrink-0 overflow-hidden rounded-md border border-[#E4E7EC] bg-[#F9FAFB]`;

  if (emp.profileImageUrl) {
    return (
      <button
        type="button"
        onClick={() => onZoom(emp.profileImageUrl!, emp.name)}
        className={`${shell} transition active:opacity-90`}
        aria-label={`View ${emp.name} profile photo`}
      >
        {img}
      </button>
    );
  }

  return <div className={shell}>{img}</div>;
}

function MobileEmployeeMenuSheet({
  emp,
  onClose,
  children,
}: {
  emp: EmployeeCard;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[10050] flex flex-col justify-end lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="employee-actions-sheet-title"
      data-employee-menu-sheet
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#111B21]/50"
        onClick={onClose}
        aria-label="Close menu"
      />
      <div className="relative flex max-h-[min(88vh,560px)] flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_-8px_32px_rgba(15,23,42,0.18)]">
        <div className="flex shrink-0 items-center justify-between border-b border-[#E4E7EC] px-4 py-3">
          <div className="min-w-0 pr-3">
            <p id="employee-actions-sheet-title" className="truncate text-[15px] font-semibold text-[#1F2937]">
              {emp.name}
            </p>
            <p className="text-[11px] text-[#6B7280]">{emp.empCode} · {emp.roleLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E4E7EC] text-[#6B7280] active:bg-[#F5F7FA]"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">
          {children}
        </div>
      </div>
    </div>
  );
}

function EmployeeActionsMenuList({
  orgIdParam,
  emp,
  row,
  isReadOnlyRosterTab,
  viewerCanTerminate,
  viewerCanAssignLeaves,
  viewerCanManageAddresses,
  variant,
  onClose,
  onEdit,
  onRole,
  onTerminate,
  onDocuments,
  onPaidLeave,
  onAssignAssets,
  onUpdateAddresses,
  onAddAddress,
}: {
  orgIdParam: string | string[] | undefined;
  emp: EmployeeCard;
  row: OrgUserRow;
  isReadOnlyRosterTab: boolean;
  viewerCanTerminate: boolean;
  viewerCanAssignLeaves: boolean;
  viewerCanManageAddresses: boolean;
  variant: "dropdown" | "sheet";
  onClose: () => void;
  onEdit: (row: OrgUserRow) => void;
  onRole: (row: OrgUserRow) => void;
  onTerminate: (row: OrgUserRow) => void;
  onDocuments: (row: OrgUserRow) => void;
  onPaidLeave: (row: OrgUserRow) => void;
  onAssignAssets: (row: OrgUserRow) => void;
  onUpdateAddresses: (row: OrgUserRow) => void;
  onAddAddress: (row: OrgUserRow) => void;
}) {
  const itemCls =
    variant === "sheet"
      ? "flex w-full touch-manipulation items-center gap-2.5 px-4 py-3 text-left text-[14px] text-[#1F2937] active:bg-[#F5F7FA]"
      : "flex w-full touch-manipulation items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 active:bg-slate-50";

  return (
    <>
      <Link
        href={`/dashboard/${orgIdParam}/organization-employees/manage-employees/get-employee?user_id=${encodeURIComponent(emp.id)}`}
        role="menuitem"
        className={itemCls}
        onClick={onClose}
      >
        <Users className="h-4 w-4 shrink-0 text-[#008CD3]" aria-hidden />
        View profile
      </Link>
      {!isReadOnlyRosterTab ? (
        <button
          type="button"
          role="menuitem"
          className={itemCls}
          onClick={() => {
            onEdit(row);
            onClose();
          }}
        >
          <Pencil className="h-4 w-4 shrink-0 text-[#008CD3]" aria-hidden />
          Edit
        </button>
      ) : null}
      {!isReadOnlyRosterTab ? (
        <button
          type="button"
          role="menuitem"
          className={itemCls}
          onClick={() => {
            onRole(row);
            onClose();
          }}
        >
          <Shield className="h-4 w-4 shrink-0 text-[#008CD3]" aria-hidden />
          Update role
        </button>
      ) : null}
      {!isReadOnlyRosterTab && viewerCanTerminate && emp.isActive && !emp.hasExitProcess ? (
        <button
          type="button"
          role="menuitem"
          className={`${itemCls} text-red-700 active:bg-red-50`}
          onClick={() => {
            onTerminate(row);
            onClose();
          }}
        >
          <UserX className="h-4 w-4 shrink-0" aria-hidden />
          Employee termination
        </button>
      ) : null}
      {!isReadOnlyRosterTab && viewerCanAssignLeaves ? (
        <>
          <button
            type="button"
            role="menuitem"
            className={itemCls}
            onClick={() => {
              onDocuments(row);
              onClose();
            }}
          >
            <FileText className="h-4 w-4 shrink-0 text-[#008CD3]" aria-hidden />
            Add documents
          </button>
          <button
            type="button"
            role="menuitem"
            className={itemCls}
            onClick={() => {
              void onPaidLeave(row);
              onClose();
            }}
          >
            <BadgeDollarSign className="h-4 w-4 shrink-0 text-[#008CD3]" aria-hidden />
            Assign paid leaves
          </button>
          <button
            type="button"
            role="menuitem"
            className={itemCls}
            onClick={() => {
              onAssignAssets(row);
              onClose();
            }}
          >
            <Package className="h-4 w-4 shrink-0 text-[#008CD3]" aria-hidden />
            Assign assets
          </button>
        </>
      ) : null}
      {!isReadOnlyRosterTab && viewerCanManageAddresses ? (
        <>
          <button
            type="button"
            role="menuitem"
            className={itemCls}
            onClick={() => {
              void onUpdateAddresses(row);
              onClose();
            }}
          >
            <MapPin className="h-4 w-4 shrink-0 text-[#008CD3]" aria-hidden />
            Update prev address
          </button>
          <button
            type="button"
            role="menuitem"
            className={itemCls}
            onClick={() => {
              onAddAddress(row);
              onClose();
            }}
          >
            <PlusCircle className="h-4 w-4 shrink-0 text-[#008CD3]" aria-hidden />
            Add one more address
          </button>
        </>
      ) : null}
    </>
  );
}

function formatRoleLabel(role: string | undefined) {
  const r = (role ?? "").trim().toLowerCase();
  if (!r) return "—";
  if (r === "hr") return "HR";
  if (r === "admin") return "Admin";
  return r.replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatMemberSince(value: string | undefined) {
  if (value == null || value === "") return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isManagementRole(role: string | undefined): boolean {
  const r = (role ?? "").trim().toLowerCase();
  if (!r) return false;
  if (r === "admin" || r === "hr") return true;
  if (r === "manager") return true;
  if (r.includes("manager") || r.includes("lead") || r.includes("head")) return true;
  return false;
}

function isOrgMemberActive(value: unknown): boolean {
  if (value === false || value === 0 || value === "0") return false;
  if (value === true || value === 1 || value === "1") return true;
  if (value == null || value === "") return true;
  return normalizeBool(value);
}

function formatExitActionLabel(action: string | undefined | null): string | null {
  const a = String(action ?? "").trim().toLowerCase();
  if (!a) return null;
  if (a === "resignation") return "Resignation";
  if (a === "termination") return "Termination";
  return a.replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatExitStatusLabel(status: string | undefined | null): string | null {
  const s = String(status ?? "").trim().toLowerCase();
  if (!s) return null;
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function mapApiUserToCard(row: OrgUserRow): EmployeeCard {
  const id = row.id != null ? String(row.id) : "";
  const email = String(row.user_email ?? "");
  const avatarSeed = email || id || "user";
  const roleRaw = row.role_name ?? row.user_role_name;
  const roleLabel = formatRoleLabel(roleRaw);
  const isActive = isOrgMemberActive(row.is_active);
  const exitActionLabel = formatExitActionLabel(row.exit_process_action_type);
  const exitStatusLabel = formatExitStatusLabel(row.exit_process_application_status);
  const rosterTier: RosterTier = isManagementRole(roleRaw) ? "management" : "employees";
  const hasExitProcess = hasExitProcessRecord(row);

  let tier: EmployeeTier;
  if (!isActive) tier = "inactive";
  else if (hasExitProcess) tier = "exit_process";
  else tier = rosterTier;

  return {
    id,
    empCode: id ? `U-${id}` : "—",
    name: String(row.user_name ?? "Unknown"),
    roleLabel,
    memberSince: formatMemberSince(row.created_at),
    email,
    phone: row.user_phone != null && String(row.user_phone).trim() !== "" ? String(row.user_phone) : "—",
    status: isActive ? "in" : "out",
    tier,
    rosterTier,
    isActive,
    hasExitProcess,
    exitActionLabel,
    exitStatusLabel,
    avatarSrc: resolveAvatarSrc((row as { user_image?: unknown }).user_image, avatarSeed),
    avatarSeed,
    profileImageUrl: profileImageUrlFromRow((row as { user_image?: unknown }).user_image),
  };
}

function findRow(rows: OrgUserRow[], userId: string) {
  return rows.find((r) => String(r.id) === userId);
}

function inputCls() {
  return "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20";
}

/** Same field names as employee onboarding / `uploadEmployeeDocuments` API. */
const EMPLOYEE_DOC_FIELDS: {
  field: EmployeeOnboardingDocumentField;
  label: string;
  hint: string;
}[] = [
  {
    field: "user_image",
    label: "Employee photo",
    hint: "Recent photo (PNG, JPG, or PDF, max 5 MB).",
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

function docFileInputCls() {
  return "block w-full cursor-pointer rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-teal-600/15 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-teal-900 hover:border-teal-500/50 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20";
}

function docLabelCls() {
  return "mb-1 block text-sm font-medium text-slate-700";
}

function normalizeBool(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    String(value).toLowerCase() === "true" ||
    String(value) === "1"
  );
}

function makeAddressDraft(row?: Partial<UserAddressRow>): AddressDraft {
  const isVillage = normalizeBool(row?.is_from_village);
  return {
    country: String(row?.country ?? ""),
    state: String(row?.state ?? ""),
    district: String(row?.district ?? ""),
    city: String(row?.city ?? ""),
    is_from_village: isVillage,
    village_name: isVillage ? String(row?.village_name ?? "") : "",
    street: String(row?.street ?? ""),
    house_number: String(row?.house_number ?? ""),
    zip_code: String(row?.zip_code ?? ""),
  };
}

function validateAddressDraft(draft: AddressDraft): string | null {
  if (
    !draft.country.trim() ||
    !draft.state.trim() ||
    !draft.district.trim() ||
    !draft.city.trim() ||
    !draft.street.trim() ||
    !draft.house_number.trim() ||
    !draft.zip_code.trim()
  ) {
    return "Please fill in all required address fields.";
  }
  if (draft.is_from_village && !draft.village_name.trim()) {
    return "Village name is required when employee is from a village.";
  }
  return null;
}

export default function ManageEmployeesPage() {
  const params = useParams();
  const ctx = useManagementDashboardContext();
  const orgIdParam = params?.org_id;
  const organizationIdNum =
    ctx?.organization?.id != null
      ? Number(ctx.organization.id)
      : Number(orgIdParam ?? NaN);

  const viewerRole = (ctx?.user?.user_role_name ?? "").trim().toLowerCase();
  const viewerCanAssignLeaves = viewerRole === "admin" || viewerRole === "hr";
  const viewerCanManageAddresses = viewerRole === "admin" || viewerRole === "hr";
  const viewerCanTerminate = viewerRole === "admin" || viewerRole === "hr";

  const [userRows, setUserRows] = useState<OrgUserRow[]>([]);
  const [tab, setTab] = useState<EmployeeTier>("employees");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());
  const [photoZoom, setPhotoZoom] = useState<{
    imageUrl: string;
    alt: string;
  } | null>(null);

  const openPhotoZoom = useCallback((imageUrl: string, alt: string) => {
    setPhotoZoom({ imageUrl, alt });
  }, []);

  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [menuUserId, setMenuUserId] = useState<string | null>(null);

  const [editRow, setEditRow] = useState<OrgUserRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editConfirm, setEditConfirm] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [roleRow, setRoleRow] = useState<OrgUserRow | null>(null);
  const [roleOptions, setRoleOptions] = useState<OrgRoleRow[]>([]);
  const [roleSelectId, setRoleSelectId] = useState("");
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleSaving, setRoleSaving] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  const [paidLeaveRow, setPaidLeaveRow] = useState<OrgUserRow | null>(null);
  const [paidLeaveTypes, setPaidLeaveTypes] = useState<LeaveTypeRow[]>([]);
  const [paidLeaveTypesLoading, setPaidLeaveTypesLoading] = useState(false);
  const [paidLeaveTypeId, setPaidLeaveTypeId] = useState("");
  const [paidLeaveTotal, setPaidLeaveTotal] = useState("");
  const [paidLeaveSaving, setPaidLeaveSaving] = useState(false);
  const [paidLeaveError, setPaidLeaveError] = useState<string | null>(null);
  const [paidLeaveSuccess, setPaidLeaveSuccess] = useState<string | null>(null);

  const [addressRow, setAddressRow] = useState<OrgUserRow | null>(null);
  const [addressMode, setAddressMode] = useState<"add" | "update">("add");
  const [addressRows, setAddressRows] = useState<UserAddressRow[]>([]);
  const [addressDrafts, setAddressDrafts] = useState<Record<string, AddressDraft>>({});
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressSavingKey, setAddressSavingKey] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressSuccess, setAddressSuccess] = useState<string | null>(null);

  const [documentsRow, setDocumentsRow] = useState<OrgUserRow | null>(null);
  const [docFiles, setDocFiles] = useState<Partial<Record<EmployeeOnboardingDocumentField, File>>>({});
  const [documentsSaving, setDocumentsSaving] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [documentsSuccess, setDocumentsSuccess] = useState<string | null>(null);

  const [assetsRow, setAssetsRow] = useState<OrgUserRow | null>(null);
  const [assetsSuccess, setAssetsSuccess] = useState<string | null>(null);

  const [terminateRow, setTerminateRow] = useState<OrgUserRow | null>(null);
  const [terminateSuccess, setTerminateSuccess] = useState<string | null>(null);

  const allCards = useMemo(() => userRows.map(mapApiUserToCard), [userRows]);

  const loadUsers = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setListLoading(false);
      setListError("Not signed in.");
      setUserRows([]);
      return;
    }
    setListError(null);
    setListLoading(true);
    try {
      const rows = await getAllOrgUsers(token);
      setUserRows(dedupeOrgUserRows(rows));
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Failed to load users");
      setUserRows([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      await Promise.resolve();
      if (cancelled) return;
      await loadUsers();
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [loadUsers]);

  useEffect(() => {
    function onDoc(e: MouseEvent | TouchEvent) {
      if (!menuUserId) return;
      const t = e.target as HTMLElement;
      if (t.closest("[data-employee-menu]") || t.closest("[data-employee-menu-sheet]")) {
        return;
      }
      setMenuUserId(null);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, [menuUserId]);

  useEffect(() => {
    if (!roleRow || !organizationIdNum || Number.isNaN(organizationIdNum)) {
      const t = window.setTimeout(() => setRoleOptions([]), 0);
      return () => window.clearTimeout(t);
    }
    const currentRoleId = roleRow.role_id;
    let cancelled = false;
    async function loadRoles() {
      const token = localStorage.getItem("token");
      if (!token) return;
      setRoleLoading(true);
      setRoleError(null);
      try {
        const list = await getOrganizationRoles(token, organizationIdNum);
        if (cancelled) return;
        setRoleOptions(list);
        const current = String(currentRoleId ?? "");
        const firstOther = list.find((r) => String(r.id) !== current);
        setRoleSelectId(firstOther ? String(firstOther.id) : current);
      } catch (err) {
        if (!cancelled) setRoleError(err instanceof Error ? err.message : "Failed to load roles");
      } finally {
        if (!cancelled) setRoleLoading(false);
      }
    }
    void loadRoles();
    return () => {
      cancelled = true;
    };
  }, [roleRow, organizationIdNum]);

  const baseList = useMemo(() => {
    if (tab === "exit_process") {
      return allCards.filter((e) => e.isActive && e.hasExitProcess);
    }
    if (tab === "inactive") {
      return allCards.filter((e) => !e.isActive);
    }
    return allCards.filter(
      (e) => e.isActive && !e.hasExitProcess && e.rosterTier === tab,
    );
  }, [allCards, tab]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return baseList;
    return baseList.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.roleLabel.toLowerCase().includes(q) ||
        e.empCode.toLowerCase().includes(q) ||
        e.memberSince.toLowerCase().includes(q),
    );
  }, [baseList, search]);

  const activeFilterLabel = search.trim() || null;

  function toggleFavorite(id: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openEditModal(row: OrgUserRow) {
    setEditError(null);
    setEditRow(row);
    setEditName(String(row.user_name ?? ""));
    setEditEmail(String(row.user_email ?? ""));

    setEditPhone(
      row.user_phone != null && String(row.user_phone).trim() !== ""
        ? String(row.user_phone)
        : "",
    );
    setEditPassword("");
    setEditConfirm("");
  }

  function openRoleModal(row: OrgUserRow) {
    setRoleError(null);
    setRoleRow(row);
    setRoleSelectId("");
  }

  async function openPaidLeaveModal(row: OrgUserRow) {
    setPaidLeaveRow(row);
    setPaidLeaveTypeId("");
    setPaidLeaveTotal("");
    setPaidLeaveError(null);
    setPaidLeaveSuccess(null);
    setPaidLeaveTypes([]);

    if (Number.isNaN(organizationIdNum)) {
      setPaidLeaveError("Invalid organization.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setPaidLeaveError("Not signed in.");
      return;
    }

    setPaidLeaveTypesLoading(true);
    try {
      const types = await getLeaveTypesForEmployee(token, organizationIdNum);
      setPaidLeaveTypes(types);
      if (types.length === 1 && types[0].id != null) {
        setPaidLeaveTypeId(String(types[0].id));
      }
    } catch (err) {
      setPaidLeaveError(
        err instanceof Error ? err.message : "Could not load leave types.",
      );
    } finally {
      setPaidLeaveTypesLoading(false);
    }
  }

  function openDocumentsModal(row: OrgUserRow) {
    setDocumentsRow(row);
    setDocFiles({});
    setDocumentsError(null);
    setDocumentsSuccess(null);
  }

  function openAssignAssetsModal(row: OrgUserRow) {
    setAssetsRow(row);
    setAssetsSuccess(null);
  }

  async function submitEmployeeDocuments(e: React.FormEvent) {
    e.preventDefault();
    setDocumentsError(null);
    setDocumentsSuccess(null);

    if (!documentsRow?.id) {
      setDocumentsError("Invalid employee.");
      return;
    }
    if (!organizationIdNum || Number.isNaN(organizationIdNum)) {
      setDocumentsError("Invalid organization.");
      return;
    }

    const missing = EMPLOYEE_DOC_FIELDS.filter((s) => !docFiles[s.field]);
    if (missing.length > 0) {
      setDocumentsError(
        `Please attach all required documents (${missing.map((m) => m.label).join(", ")}).`,
      );
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setDocumentsError("Not signed in.");
      return;
    }

    setDocumentsSaving(true);
    try {
      await uploadEmployeeDocuments(token, {
        org_id: organizationIdNum,
        employee_user_id: documentsRow.id,
        files: docFiles as Record<EmployeeOnboardingDocumentField, File>,
      });
      setDocumentsSuccess("Documents uploaded successfully.");
      setDocFiles({});
    } catch (err) {
      setDocumentsError(err instanceof Error ? err.message : "Document upload failed.");
    } finally {
      setDocumentsSaving(false);
    }
  }

  function updateAddressDraft(
    key: string,
    field: keyof AddressDraft,
    value: string | boolean,
  ) {
    setAddressDrafts((prev) => {
      const current = prev[key] ?? emptyAddressDraft;
      const next = { ...current, [field]: value };
      if (field === "is_from_village" && value === false) {
        next.village_name = "";
      }
      return { ...prev, [key]: next };
    });
  }

  function openAddAddressModal(row: OrgUserRow) {
    setAddressRow(row);
    setAddressMode("add");
    setAddressRows([]);
    setAddressDrafts({ new: { ...emptyAddressDraft } });
    setAddressError(null);
    setAddressSuccess(null);
    setAddressLoading(false);
    setAddressSavingKey(null);
  }

  async function openUpdateAddressesModal(row: OrgUserRow) {
    if (!row.id || Number.isNaN(organizationIdNum)) {
      setListError("Invalid user or organization.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setListError("Not signed in.");
      return;
    }

    setAddressRow(row);
    setAddressMode("update");
    setAddressRows([]);
    setAddressDrafts({});
    setAddressError(null);
    setAddressSuccess(null);
    setAddressLoading(true);
    setAddressSavingKey(null);

    try {
      const addresses = await getUserAddresses(token, organizationIdNum, row.id);
      const drafts: Record<string, AddressDraft> = {};
      for (const address of addresses) {
        const id = address.id ?? address.address_id;
        if (id == null) continue;
        drafts[String(id)] = makeAddressDraft(address);
      }
      setAddressRows(addresses);
      setAddressDrafts(drafts);
    } catch (err) {
      setAddressError(err instanceof Error ? err.message : "Could not load addresses.");
    } finally {
      setAddressLoading(false);
    }
  }

  async function submitAddAddress(e: React.FormEvent) {
    e.preventDefault();
    if (!addressRow?.id || Number.isNaN(organizationIdNum)) {
      setAddressError("Invalid user or organization.");
      return;
    }
    const draft = addressDrafts.new ?? emptyAddressDraft;
    const validation = validateAddressDraft(draft);
    if (validation) {
      setAddressError(validation);
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setAddressError("Not signed in.");
      return;
    }

    setAddressSavingKey("new");
    setAddressError(null);
    setAddressSuccess(null);
    try {
      await addUserAddress(token, {
        user_id: addressRow.id,
        org_id: organizationIdNum,
        country: draft.country.trim(),
        state: draft.state.trim(),
        district: draft.district.trim(),
        city: draft.city.trim(),
        is_from_village: draft.is_from_village,
        village_name: draft.is_from_village ? draft.village_name.trim() : null,
        street: draft.street.trim(),
        house_number: draft.house_number.trim(),
        zip_code: draft.zip_code.trim(),
      });
      setAddressDrafts({ new: { ...emptyAddressDraft } });
      setAddressSuccess("Address added successfully.");
    } catch (err) {
      setAddressError(err instanceof Error ? err.message : "Could not add address.");
    } finally {
      setAddressSavingKey(null);
    }
  }

  async function submitUpdateAddress(address: UserAddressRow) {
    if (!addressRow?.id || Number.isNaN(organizationIdNum)) {
      setAddressError("Invalid user or organization.");
      return;
    }
    const addressId = address.id ?? address.address_id;
    if (addressId == null) {
      setAddressError("Address id is missing.");
      return;
    }
    const key = String(addressId);
    const draft = addressDrafts[key] ?? makeAddressDraft(address);
    const validation = validateAddressDraft(draft);
    if (validation) {
      setAddressError(validation);
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setAddressError("Not signed in.");
      return;
    }

    setAddressSavingKey(key);
    setAddressError(null);
    setAddressSuccess(null);
    try {
      await updateUserAddress(token, {
        address_id: addressId,
        user_id: addressRow.id,
        org_id: organizationIdNum,
        country: draft.country.trim(),
        state: draft.state.trim(),
        district: draft.district.trim(),
        city: draft.city.trim(),
        is_from_village: draft.is_from_village,
        village_name: draft.is_from_village ? draft.village_name.trim() : null,
        street: draft.street.trim(),
        house_number: draft.house_number.trim(),
        zip_code: draft.zip_code.trim(),
      });
      setAddressSuccess("Address updated successfully.");
      const addresses = await getUserAddresses(token, organizationIdNum, addressRow.id);
      const drafts: Record<string, AddressDraft> = {};
      for (const item of addresses) {
        const id = item.id ?? item.address_id;
        if (id == null) continue;
        drafts[String(id)] = makeAddressDraft(item);
      }
      setAddressRows(addresses);
      setAddressDrafts(drafts);
    } catch (err) {
      setAddressError(err instanceof Error ? err.message : "Could not update address.");
    } finally {
      setAddressSavingKey(null);
    }
  }

  function renderAddressFields(key: string, draft: AddressDraft) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Country</label>
          <input
            className={inputCls()}
            value={draft.country}
            onChange={(e) => updateAddressDraft(key, "country", e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">State</label>
          <input
            className={inputCls()}
            value={draft.state}
            onChange={(e) => updateAddressDraft(key, "state", e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">District</label>
          <input
            className={inputCls()}
            value={draft.district}
            onChange={(e) => updateAddressDraft(key, "district", e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">City</label>
          <input
            className={inputCls()}
            value={draft.city}
            onChange={(e) => updateAddressDraft(key, "city", e.target.value)}
            required
          />
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
          <input
            type="checkbox"
            checked={draft.is_from_village}
            onChange={(e) => updateAddressDraft(key, "is_from_village", e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500/30"
          />
          Employee is from a village
        </label>
        {draft.is_from_village ? (
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">Village name</label>
            <input
              className={inputCls()}
              value={draft.village_name}
              onChange={(e) => updateAddressDraft(key, "village_name", e.target.value)}
              required={draft.is_from_village}
            />
          </div>
        ) : null}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Street</label>
          <input
            className={inputCls()}
            value={draft.street}
            onChange={(e) => updateAddressDraft(key, "street", e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">House number</label>
          <input
            className={inputCls()}
            value={draft.house_number}
            onChange={(e) => updateAddressDraft(key, "house_number", e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">ZIP / PIN code</label>
          <input
            className={inputCls()}
            value={draft.zip_code}
            onChange={(e) => updateAddressDraft(key, "zip_code", e.target.value)}
            required
          />
        </div>
      </div>
    );
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editRow?.id) return;
    setEditError(null);
    if (editPassword) {
      if (editPassword.length < PASSWORD_MIN) {
        setEditError(`Password must be at least ${PASSWORD_MIN} characters.`);
        return;
      }
      if (editPassword !== editConfirm) {
        setEditError("Passwords do not match.");
        return;
      }
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setEditError("Not signed in.");
      return;
    }
    if (Number.isNaN(organizationIdNum)) {
      setEditError("Invalid organization.");
      return;
    }
    setEditSaving(true);
    try {
      await updateUserDetails(token, {
        user_id: editRow.id,
        org_id: organizationIdNum,
        name: editName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
        ...(editPassword ? { password: editPassword } : {}),
      });
      setEditRow(null);
      setMenuUserId(null);
      await loadUsers();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setEditSaving(false);
    }
  }

  async function submitRoleChange(e: React.FormEvent) {
    e.preventDefault();
    if (!roleRow?.id || !roleSelectId || Number.isNaN(organizationIdNum)) {
      setRoleError("Missing data.");
      return;
    }
    const newId = Number(roleSelectId);
    const oldRoleId = Number(roleRow.role_id);
    if (newId === oldRoleId) {
      setRoleError("Choose a different role.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setRoleError("Not signed in.");
      return;
    }
    const previousParam =
      viewerRole === "hr"
        ? Number(roleRow.user_role_assignment_id ?? roleRow.role_id)
        : oldRoleId;

    if (Number.isNaN(previousParam)) {
      setRoleError("Could not resolve current role for update.");
      return;
    }

    setRoleSaving(true);
    setRoleError(null);
    try {
      await updateUserRoleAssignment(token, {
        user_id: roleRow.id,
        organization_id: organizationIdNum,
        new_role_id: newId,
        previous_role_id: previousParam,
      });
      setRoleRow(null);
      setMenuUserId(null);
      await loadUsers();
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : "Role update failed.");
    } finally {
      setRoleSaving(false);
    }
  }

  async function submitPaidLeaves(e: React.FormEvent) {
    e.preventDefault();
    if (!paidLeaveRow?.id) return;
    if (!viewerCanAssignLeaves) {
      setPaidLeaveError("You do not have permission to assign paid leaves.");
      return;
    }
    if (Number.isNaN(organizationIdNum)) {
      setPaidLeaveError("Invalid organization.");
      return;
    }

    if (!paidLeaveTypeId) {
      setPaidLeaveError("Select a leave type.");
      return;
    }

    const total = Number(paidLeaveTotal);
    if (!Number.isFinite(total) || total < 0 || !Number.isInteger(total)) {
      setPaidLeaveError("Enter a valid whole number of leave days (0 or more).");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setPaidLeaveError("Not signed in.");
      return;
    }

    setPaidLeaveSaving(true);
    setPaidLeaveError(null);
    setPaidLeaveSuccess(null);
    try {
      const result = await createEmployeeLeaveBalance(token, {
        org_id: organizationIdNum,
        employee_id: paidLeaveRow.id,
        leave_type_id: paidLeaveTypeId,
        total_leaves: total,
      });
      setPaidLeaveSuccess(
        result.message || "Employee leave balance assigned successfully.",
      );
      await loadUsers();
    } catch (err) {
      setPaidLeaveError(
        err instanceof Error ? err.message : "Could not assign leave balance.",
      );
    } finally {
      setPaidLeaveSaving(false);
    }
  }

  const tabOptions = [
    { id: "employees" as const, label: "Employees" },
    { id: "management" as const, label: "Management" },
    { id: "exit_process" as const, label: "Exit process" },
    { id: "inactive" as const, label: "Inactive" },
  ] as const;

  const tabSubtitle =
    tab === "employees"
      ? "Employee roster"
      : tab === "management"
        ? "Management roster"
        : tab === "exit_process"
          ? "Members with an active exit workflow"
          : "Former members (left or terminated)";

  const activeMenuContext = useMemo(() => {
    if (!menuUserId) return null;
    const emp = filtered.find((e) => e.id === menuUserId);
    const row = findRow(userRows, menuUserId);
    if (!emp || !row) return null;
    const isInactiveTab = tab === "inactive";
    const isExitProcessTab = tab === "exit_process";
    return {
      emp,
      row,
      isReadOnlyRosterTab: isInactiveTab || isExitProcessTab,
    };
  }, [menuUserId, filtered, userRows, tab]);

  const closeEmployeeMenu = useCallback(() => {
    setMenuUserId(null);
  }, []);

  return (
    <div className="min-h-full bg-[#F5F7FA] pb-3 [font-family:var(--font-inter),system-ui,sans-serif] max-lg:-mx-1 sm:max-lg:-mx-2 lg:bg-slate-100/90 lg:pb-10">
      <div className="mx-auto max-w-6xl max-lg:max-w-none lg:px-4 lg:pt-6 md:max-w-7xl md:px-6">
        {terminateSuccess ? (
          <div className="mb-3 flex items-start gap-2 rounded-md border border-[#C8E6C9] bg-[#E6F4EA] px-3 py-2 text-[12px] text-[#0F9D58] max-lg:mx-3 max-lg:mt-2 lg:mb-4 lg:rounded-lg lg:border-emerald-200 lg:bg-emerald-50 lg:px-4 lg:py-3 lg:text-sm lg:text-emerald-900">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            <span className="flex-1">{terminateSuccess}</span>
            <button
              type="button"
              onClick={() => setTerminateSuccess(null)}
              className="shrink-0 rounded-lg p-1 text-emerald-800 hover:bg-emerald-100"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {assetsSuccess ? (
          <div className="mb-3 flex items-start gap-2 rounded-md border border-[#C8E6C9] bg-[#E6F4EA] px-3 py-2 text-[12px] text-[#0F9D58] max-lg:mx-3 max-lg:mt-2 lg:mb-4 lg:rounded-lg lg:border-emerald-200 lg:bg-emerald-50 lg:px-4 lg:py-3 lg:text-sm lg:text-emerald-900">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            <span className="flex-1">{assetsSuccess}</span>
            <button
              type="button"
              onClick={() => setAssetsSuccess(null)}
              className="shrink-0 rounded-lg p-1 text-emerald-800 hover:bg-emerald-100"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {listError && (
          <div className="mb-3 flex items-start gap-2 rounded-md border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2 text-[12px] text-[#D93025] max-lg:mx-3 max-lg:mt-2 lg:mb-4 lg:rounded-lg lg:border-red-200 lg:bg-red-50 lg:px-4 lg:py-3 lg:text-sm lg:text-red-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
            <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
              <span>{listError}</span>
              <button
                type="button"
                onClick={() => void loadUsers()}
                className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-800 active:scale-[0.98] hover:bg-red-100/80"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        
        {/* Mobile & tablet: Zoho-style sticky header */}
        <div className="sticky top-0 z-20 border-b border-[#E4E7EC] bg-white px-3 pb-2.5 pt-2.5 shadow-sm lg:hidden">
          <h1 className="text-[15px] font-semibold text-[#1F2937]">Team members</h1>
          <p className={`mt-0.5 ${mobileCaptionCls}`}>{tabSubtitle}</p>
          <div className="mt-2 flex gap-0.5 overflow-x-auto rounded-md bg-[#F5F7FA] p-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabOptions.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id);
                  setSearch("");
                }}
                className={`min-w-[4.75rem] shrink-0 rounded-[5px] px-2.5 py-1.5 text-[12px] font-medium transition active:scale-[0.98] ${
                  tab === t.id
                    ? "bg-white text-[#008CD3] shadow-sm"
                    : "text-[#6B7280]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, role…"
              disabled={listLoading || !!listError}
              className="w-full rounded-md border border-[#E4E7EC] bg-[#F9FAFB] py-2 pl-9 pr-3 text-[13px] text-[#1F2937] outline-none placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:bg-white focus:ring-2 focus:ring-[#008CD3]/15 disabled:opacity-60"
            />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <p className={mobileCaptionCls}>
              <span className="font-semibold text-[#1F2937]">
                {listLoading ? "…" : filtered.length}
              </span>{" "}
              member{filtered.length === 1 ? "" : "s"}
              {filtered.some((e) => e.profileImageUrl) ? " · tap photo to enlarge" : ""}
            </p>
            {activeFilterLabel ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F4FB] px-2 py-0.5 text-[10px] font-medium text-[#008CD3]">
                {activeFilterLabel}
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="rounded-full p-0.5 active:bg-[#008CD3]/10"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ) : null}
          </div>
        </div>

        {/* Desktop: underline tabs */}
        <div className="hidden gap-8 border-b border-slate-200/80 bg-white/60 px-1 lg:flex">
          {tabOptions.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                setSearch("");
              }}
              className="relative pb-3 pt-2 text-sm font-semibold transition-colors"
              style={{ color: tab === t.id ? ACCENT : "#64748b" }}
            >
              {t.label}
              {tab === t.id && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ backgroundColor: ACCENT }}
                />
              )}
            </button>
          ))}
        </div>

        <div className="mt-5 hidden flex-col gap-4 sm:flex-row sm:items-center sm:justify-between lg:flex">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-slate-600">
              Found{" "}
              <span className="font-semibold text-slate-900">
                {listLoading ? "…" : filtered.length}
              </span>{" "}
              Matching Member(s)
            </p>
            {activeFilterLabel && (
              <span className="text-xs text-slate-500">
                Search term:
                <span
                  className="ml-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium text-teal-800"
                  style={{ backgroundColor: ACCENT_SOFT }}
                >
                  {activeFilterLabel}
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="rounded-full p-0.5 hover:bg-teal-200/50"
                    aria-label="Clear search"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              </span>
            )}
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, role…"
              disabled={listLoading || !!listError}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 disabled:opacity-60"
            />
          </div>
        </div>

        {listLoading ? (
          <div className="mt-12 flex flex-col items-center justify-center gap-2 px-4 text-[#6B7280] max-lg:mt-8 lg:mt-16 lg:gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-[#008CD3] lg:h-8 lg:w-8 lg:text-teal-600" aria-hidden />
            <p className="text-[13px] lg:text-sm">Loading team members…</p>
          </div>
        ) : (
          <>
            <div className="mt-2 flex flex-col gap-2 px-3 max-lg:pb-3 lg:mt-6 lg:grid lg:grid-cols-2 lg:gap-5 lg:px-0 xl:grid-cols-3">
              {filtered.map((emp) => {
                const fav = favorites.has(emp.id);
                const row = findRow(userRows, emp.id);
                const menuOpen = menuUserId === emp.id;
                const isInactiveTab = tab === "inactive";
                const isExitProcessTab = tab === "exit_process";
                const isReadOnlyRosterTab = isInactiveTab || isExitProcessTab;
                const menuPanel = menuOpen && row && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full z-[10001] mt-1 hidden min-w-[12.5rem] rounded-lg border border-[#E4E7EC] bg-white py-1 shadow-xl lg:block"
                  >
                    <EmployeeActionsMenuList
                      orgIdParam={orgIdParam}
                      emp={emp}
                      row={row}
                      isReadOnlyRosterTab={isReadOnlyRosterTab}
                      viewerCanTerminate={viewerCanTerminate}
                      viewerCanAssignLeaves={viewerCanAssignLeaves}
                      viewerCanManageAddresses={viewerCanManageAddresses}
                      variant="dropdown"
                      onClose={closeEmployeeMenu}
                      onEdit={openEditModal}
                      onRole={openRoleModal}
                      onTerminate={(r) => {
                        setTerminateRow(r);
                        setTerminateSuccess(null);
                      }}
                      onDocuments={openDocumentsModal}
                      onPaidLeave={openPaidLeaveModal}
                      onAssignAssets={openAssignAssetsModal}
                      onUpdateAddresses={openUpdateAddressesModal}
                      onAddAddress={openAddAddressModal}
                    />
                  </div>
                );

                const exitDetailLine =
                  emp.exitActionLabel || emp.exitStatusLabel
                    ? [emp.exitActionLabel, emp.exitStatusLabel].filter(Boolean).join(" · ")
                    : null;

                const listKey =
                  row?.org_member_id != null
                    ? `member-${String(row.org_member_id)}`
                    : `user-${emp.id}`;

                return (
                  <article
                    key={listKey}
                    className={`rounded-lg border border-[#E4E7EC] bg-white shadow-sm transition-shadow active:scale-[0.995] lg:overflow-visible lg:rounded-xl lg:border-slate-200/90 lg:shadow-sm lg:ring-0 lg:hover:shadow-md${menuOpen ? " lg:relative lg:z-[100]" : ""}`}
                  >
                    {/* Mobile & tablet: Zoho-style list card */}
                    <div className="relative flex gap-2.5 p-2.5 lg:hidden">
                      <EmployeeAvatar
                        emp={emp}
                        size="lg"
                        onZoom={openPhotoZoom}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="min-w-0">
                            <p className={`truncate ${mobileValueCls}`}>{emp.name}</p>
                            <p className={mobileCaptionCls}>{emp.empCode}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-0">
                            <Link
                              href={`/dashboard/${orgIdParam}/organization-employees/manage-employees/get-employee?user_id=${encodeURIComponent(emp.id)}`}
                              className="rounded-md p-1.5 text-[#008CD3] active:bg-[#F5F7FA]"
                              aria-label="View employee profile"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => toggleFavorite(emp.id)}
                              className="rounded-md p-1.5 text-[#9CA3AF] active:bg-[#F5F7FA]"
                              aria-label={fav ? "Remove favorite" : "Add favorite"}
                            >
                              <Star
                                className="h-3.5 w-3.5"
                                style={{
                                  color: fav ? "#E8710A" : undefined,
                                  fill: fav ? "#E8710A" : "none",
                                }}
                              />
                            </button>
                            <div className="relative" data-employee-menu>
                              <button
                                type="button"
                                onClick={() => setMenuUserId(menuOpen ? null : emp.id)}
                                className="rounded-md p-1.5 text-[#6B7280] active:bg-[#F5F7FA]"
                                aria-expanded={menuOpen}
                                aria-haspopup="menu"
                                aria-label="More options"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          <span className="inline-flex rounded-full bg-[#E8F4FB] px-1.5 py-0.5 text-[10px] font-semibold text-[#008CD3]">
                            {emp.roleLabel}
                          </span>
                          {isInactiveTab ? (
                            <span className="inline-flex rounded-full bg-[#FCE8E6] px-1.5 py-0.5 text-[10px] font-semibold text-[#D93025]">
                              Inactive
                            </span>
                          ) : null}
                          {isExitProcessTab ? (
                            <span className="inline-flex rounded-full bg-[#FFF8E1] px-1.5 py-0.5 text-[10px] font-semibold text-[#F9A825]">
                              Exit process
                            </span>
                          ) : null}
                        </div>
                        {(isInactiveTab || isExitProcessTab) && exitDetailLine ? (
                          <p className={`mt-1 ${mobileCaptionCls}`}>{exitDetailLine}</p>
                        ) : null}
                        <div className="mt-1.5 space-y-0.5">
                          {emp.email ? (
                            <a
                              href={`mailto:${emp.email}`}
                              className="flex items-center gap-1 truncate text-[11px] text-[#008CD3]"
                            >
                              <AtSign className="h-3 w-3 shrink-0 text-[#9CA3AF]" aria-hidden />
                              {emp.email}
                            </a>
                          ) : null}
                          <p className={`flex items-center gap-1 ${mobileCaptionCls}`}>
                            <Phone className="h-3 w-3 shrink-0" aria-hidden />
                            {emp.phone}
                          </p>
                          <p className={`flex items-center gap-1 ${mobileCaptionCls}`}>
                            <CalendarDays className="h-3 w-3 shrink-0" aria-hidden />
                            Since {emp.memberSince}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Desktop: profile card */}
                    <div className="hidden lg:block">
                    <div className="relative px-4 pb-3 pt-3">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-2">
                          <Link
                            href={`/dashboard/${orgIdParam}/organization-employees/manage-employees/get-employee?user_id=${encodeURIComponent(emp.id)}`}
                            className="rounded-md p-1 text-teal-600 transition hover:bg-teal-50"
                            aria-label="View employee profile"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => toggleFavorite(emp.id)}
                            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-50"
                            aria-label={fav ? "Remove favorite" : "Add favorite"}
                          >
                            <Star
                              className="h-4 w-4"
                              style={{
                                color: fav ? "#ea580c" : undefined,
                                fill: fav ? "#ea580c" : "none",
                              }}
                            />
                          </button>
                          <button
                            type="button"
                            className="rounded-md p-1 text-sky-600 transition hover:bg-sky-50"
                            aria-label="Message"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="relative" data-employee-menu>
                          <button
                            type="button"
                            onClick={() => setMenuUserId(menuOpen ? null : emp.id)}
                            className="rounded-md p-1 text-slate-400 hover:bg-slate-50"
                            aria-expanded={menuOpen}
                            aria-haspopup="menu"
                            aria-label="More options"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {menuPanel}
                        </div>
                      </div>

                      <div className="mt-2 flex flex-col items-center">
                        {emp.profileImageUrl ? (
                          <button
                            type="button"
                            onClick={() => openPhotoZoom(emp.profileImageUrl!, emp.name)}
                            className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-slate-100 bg-slate-50 transition hover:ring-2 hover:ring-teal-500/30"
                            aria-label={`View ${emp.name} profile photo`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={emp.avatarSrc}
                              alt=""
                              width={96}
                              height={96}
                              className="h-full w-full object-cover object-top"
                              onError={(e) => {
                                e.currentTarget.src = avatarUrl(emp.avatarSeed);
                              }}
                            />
                          </button>
                        ) : (
                          <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-slate-100 bg-slate-50">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={emp.avatarSrc}
                              alt=""
                              width={96}
                              height={96}
                              className="h-full w-full object-cover object-top"
                              onError={(e) => {
                                e.currentTarget.src = avatarUrl(emp.avatarSeed);
                              }}
                            />
                          </div>
                        )}
                        <div className="mt-3 flex w-full items-start justify-center gap-2 px-1">
                          <p className="text-center text-sm text-slate-600">
                            {emp.empCode} –{" "}
                            <span className="font-bold text-slate-900">{emp.name}</span>
                          </p>
                          <span
                            className={`shrink-0 text-xs font-semibold ${
                              emp.status === "in" ? "text-emerald-600" : "text-red-600"
                            }`}
                          >
                            {emp.status === "in" ? "In" : "Out"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2.5 rounded-b-xl border-t border-slate-100 bg-slate-50/50 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <Users className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                        <span className="min-w-0 font-medium" style={{ color: ACCENT }}>
                          {emp.roleLabel}
                        </span>
                        {isInactiveTab ? (
                          <span className="rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-red-200/80">
                            Inactive
                          </span>
                        ) : null}
                        {isExitProcessTab ? (
                          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200/80">
                            Exit process
                          </span>
                        ) : null}
                      </div>
                      {(isInactiveTab || isExitProcessTab) && exitDetailLine ? (
                        <p className="text-sm text-slate-600">
                          <span className="font-medium text-slate-800">Exit: </span>
                          {exitDetailLine}
                        </p>
                      ) : null}
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                        <span>
                          Member since{" "}
                          <span className="font-medium text-slate-700">{emp.memberSince}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <AtSign className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                        {emp.email ? (
                          <a
                            href={`mailto:${emp.email}`}
                            className="truncate text-sky-600 hover:underline"
                          >
                            {emp.email}
                          </a>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                        <span>{emp.phone}</span>
                      </div>
                    </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {!listError && filtered.length === 0 && (
              <p className={`mt-10 px-4 text-center max-lg:mt-6 ${mobileCaptionCls} lg:mt-12 lg:text-sm lg:text-slate-500`}>
                {tab === "inactive"
                  ? `No inactive members${search.trim() ? " match your search" : ""}.`
                  : tab === "exit_process"
                    ? `No members in exit process${search.trim() ? " match your search" : ""}.`
                    : `No members in this tab${search.trim() ? " match your search" : ""}.`}
              </p>
            )}
          </>
        )}
      </div>

      {/* Edit user modal */}
      {editRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-user-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
            aria-label="Close"
            onClick={() => !editSaving && setEditRow(null)}
          />
          <div className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-2">
              <h2 id="edit-user-title" className="text-lg font-bold text-slate-900">
                Edit user
              </h2>
              <button
                type="button"
                disabled={editSaving}
                onClick={() => setEditRow(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {editError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {editError}
              </div>
            )}
            <form onSubmit={submitEdit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Name</label>
                <input
                  className={inputCls()}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
                <input
                  type="email"
                  className={inputCls()}
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Phone</label>
                <input
                  type="tel"
                  className={inputCls()}
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  New password (optional)
                </label>
                <input
                  type="password"
                  className={inputCls()}
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder={`Leave blank to keep · min ${PASSWORD_MIN} if set`}
                  autoComplete="new-password"
                />
              </div>
              {editPassword ? (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Confirm password
                  </label>
                  <input
                    type="password"
                    className={inputCls()}
                    value={editConfirm}
                    onChange={(e) => setEditConfirm(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              ) : null}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={editSaving}
                  onClick={() => setEditRow(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-60"
                >
                  {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update role modal */}
      {roleRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="role-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
            aria-label="Close"
            onClick={() => !roleSaving && setRoleRow(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-2">
              <h2 id="role-modal-title" className="text-lg font-bold text-slate-900">
                Update role
              </h2>
              <button
                type="button"
                disabled={roleSaving}
                onClick={() => setRoleRow(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-sm text-slate-600">
              <span className="font-medium text-slate-900">{roleRow.user_name}</span> — current:{" "}
              {formatRoleLabel(roleRow.role_name ?? roleRow.user_role_name)}
            </p>
            {roleError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {roleError}
              </div>
            )}
            <form onSubmit={submitRoleChange} className="space-y-4">
              {roleLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading roles…
                </div>
              ) : (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">New role</label>
                  <select
                    className={inputCls()}
                    value={roleSelectId}
                    onChange={(e) => setRoleSelectId(e.target.value)}
                    required
                    disabled={roleOptions.length === 0}
                  >
                    {roleOptions.length === 0 ? (
                      <option value="">No roles</option>
                    ) : (
                      roleOptions.map((r) => (
                        <option key={String(r.id)} value={String(r.id)}>
                          {(r.role_name ?? "Role").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  disabled={roleSaving}
                  onClick={() => setRoleRow(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={roleSaving || roleLoading || roleOptions.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-60"
                >
                  {roleSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Update role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign paid leaves modal */}
      {paidLeaveRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="paid-leaves-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
            aria-label="Close"
            onClick={() => !paidLeaveSaving && setPaidLeaveRow(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <h2 id="paid-leaves-title" className="text-lg font-bold text-slate-900">
                  Assign paid leaves
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Assign a leave balance to{" "}
                  <span className="font-semibold text-slate-900">{paidLeaveRow.user_name}</span>.
                </p>
              </div>
              <button
                type="button"
                disabled={paidLeaveSaving}
                onClick={() => setPaidLeaveRow(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-relaxed text-sky-900">
              Choose a leave type created under Company Leave Management, then set how many
              days this employee can use for that type. Each type can only be assigned once per
              employee.
            </div>

            {paidLeaveError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {paidLeaveError}
              </div>
            )}
            {paidLeaveSuccess && (
              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {paidLeaveSuccess}
              </div>
            )}

            {paidLeaveTypesLoading ? (
              <div className="mb-4 flex items-center gap-2 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                Loading leave types…
              </div>
            ) : null}

            {!paidLeaveTypesLoading && paidLeaveTypes.length === 0 && !paidLeaveError ? (
              <div className="mb-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm text-slate-600">
                <CalendarDays className="mx-auto mb-2 h-8 w-8 text-slate-300" aria-hidden />
                <p>No leave types defined yet.</p>
                <Link
                  href={`/dashboard/${orgIdParam ?? ""}/organization-leave/manage-leave-types`}
                  className="mt-2 inline-block font-semibold text-teal-700 underline-offset-2 hover:underline"
                  onClick={() => setPaidLeaveRow(null)}
                >
                  Manage leave types
                </Link>
              </div>
            ) : null}

            <form onSubmit={submitPaidLeaves} className="space-y-4">
              <div>
                <label htmlFor="paid-leave-type" className="mb-1 block text-xs font-medium text-slate-600">
                  Leave type <span className="text-red-500">*</span>
                </label>
                <select
                  id="paid-leave-type"
                  className={inputCls()}
                  value={paidLeaveTypeId}
                  onChange={(e) => setPaidLeaveTypeId(e.target.value)}
                  required
                  disabled={
                    paidLeaveSaving || paidLeaveTypesLoading || paidLeaveTypes.length === 0
                  }
                >
                  <option value="">Select leave type</option>
                  {paidLeaveTypes.map((lt) => (
                    <option key={String(lt.id)} value={String(lt.id)}>
                      {lt.leave_type_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="paid-leave-total" className="mb-1 block text-xs font-medium text-slate-600">
                  Total leave days <span className="text-red-500">*</span>
                </label>
                <input
                  id="paid-leave-total"
                  type="number"
                  min="0"
                  step="1"
                  className={inputCls()}
                  value={paidLeaveTotal}
                  onChange={(e) => setPaidLeaveTotal(e.target.value)}
                  placeholder="Example: 12"
                  required
                  disabled={
                    paidLeaveSaving || paidLeaveTypesLoading || paidLeaveTypes.length === 0
                  }
                />
                <p className="mt-1 text-xs text-slate-500">
                  Number of days allocated for the selected leave type (remaining starts equal to
                  total).
                </p>
              </div>

              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={paidLeaveSaving}
                  onClick={() => setPaidLeaveRow(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    paidLeaveSaving ||
                    paidLeaveTypesLoading ||
                    paidLeaveTypes.length === 0
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-60"
                >
                  {paidLeaveSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Assign leave balance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add documents modal */}
      {documentsRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="documents-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
            aria-label="Close"
            onClick={() => !documentsSaving && setDocumentsRow(null)}
          />
          <div className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <h2 id="documents-modal-title" className="text-lg font-bold text-slate-900">
                  Add documents
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Upload KYC files for{" "}
                  <span className="font-medium text-slate-900">{documentsRow.user_name}</span>. Each file
                  must be PNG, JPG, or PDF and under 5 MB.
                </p>
              </div>
              <button
                type="button"
                disabled={documentsSaving}
                onClick={() => setDocumentsRow(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {documentsError ? (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>{documentsError}</span>
              </div>
            ) : null}
            {documentsSuccess ? (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>{documentsSuccess}</span>
              </div>
            ) : null}

            <form onSubmit={(e) => void submitEmployeeDocuments(e)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {EMPLOYEE_DOC_FIELDS.map(({ field, label, hint }) => (
                  <div key={field} className={field === "user_image" ? "sm:col-span-2" : ""}>
                    <label htmlFor={`manage-doc-${field}`} className={docLabelCls()}>
                      {label} <span className="text-red-600">*</span>
                    </label>
                    <input
                      id={`manage-doc-${field}`}
                      name={field}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,application/pdf"
                      className={docFileInputCls()}
                      disabled={documentsSaving}
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
                    <p className="mt-1 text-xs text-slate-500">{hint}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={documentsSaving}
                  onClick={() => {
                    setDocFiles({});
                    setDocumentsError(null);
                  }}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Clear files
                </button>
                <button
                  type="button"
                  disabled={documentsSaving}
                  onClick={() => setDocumentsRow(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={documentsSaving}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-60"
                >
                  {documentsSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                  <Upload className="h-4 w-4" aria-hidden />
                  Upload documents
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / update address modal */}
      {addressRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="address-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
            aria-label="Close"
            onClick={() => addressSavingKey == null && setAddressRow(null)}
          />
          <div className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <h2 id="address-modal-title" className="text-lg font-bold text-slate-900">
                  {addressMode === "add" ? "Add one more address" : "Update previous addresses"}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  <span className="font-medium text-slate-900">{addressRow.user_name}</span>
                  {addressMode === "add"
                    ? " can have multiple saved addresses."
                    : " addresses are shown below in separate forms."}
                </p>
              </div>
              <button
                type="button"
                disabled={addressSavingKey != null}
                onClick={() => setAddressRow(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {addressError ? (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {addressError}
              </div>
            ) : null}
            {addressSuccess ? (
              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {addressSuccess}
              </div>
            ) : null}

            {addressMode === "add" ? (
              <form onSubmit={submitAddAddress} className="space-y-4">
                {renderAddressFields("new", addressDrafts.new ?? emptyAddressDraft)}
                <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={addressSavingKey != null}
                    onClick={() => setAddressRow(null)}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addressSavingKey === "new"}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-60"
                  >
                    {addressSavingKey === "new" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    Add address
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                {addressLoading ? (
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading addresses...
                  </div>
                ) : null}

                {!addressLoading && addressRows.length === 0 ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    No saved addresses found. Use “Add one more address” to create one.
                  </div>
                ) : null}

                {addressRows.map((address, index) => {
                  const addressId = address.id ?? address.address_id;
                  const key = String(addressId ?? index);
                  const draft = addressDrafts[key] ?? makeAddressDraft(address);
                  return (
                    <form
                      key={key}
                      onSubmit={(e) => {
                        e.preventDefault();
                        void submitUpdateAddress(address);
                      }}
                      className="rounded-xl border border-slate-200 bg-slate-50/50 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <h3 className="text-sm font-bold text-slate-800">
                          Address {index + 1}
                        </h3>
                        {addressId != null ? (
                          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500">
                            ID: {String(addressId)}
                          </span>
                        ) : null}
                      </div>
                      {renderAddressFields(key, draft)}
                      <div className="mt-4 flex justify-end">
                        <button
                          type="submit"
                          disabled={addressSavingKey === key || addressId == null}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-60"
                        >
                          {addressSavingKey === key ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : null}
                          Update this address
                        </button>
                      </div>
                    </form>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <ProfilePhotoZoomModal
        open={photoZoom != null}
        imageUrl={photoZoom?.imageUrl ?? ""}
        alt={photoZoom?.alt ?? ""}
        onClose={() => setPhotoZoom(null)}
      />

      {activeMenuContext ? (
        <MobileEmployeeMenuSheet
          emp={activeMenuContext.emp}
          onClose={closeEmployeeMenu}
        >
          <EmployeeActionsMenuList
            orgIdParam={orgIdParam}
            emp={activeMenuContext.emp}
            row={activeMenuContext.row}
            isReadOnlyRosterTab={activeMenuContext.isReadOnlyRosterTab}
            viewerCanTerminate={viewerCanTerminate}
            viewerCanAssignLeaves={viewerCanAssignLeaves}
            viewerCanManageAddresses={viewerCanManageAddresses}
            variant="sheet"
            onClose={closeEmployeeMenu}
            onEdit={openEditModal}
            onRole={openRoleModal}
            onTerminate={(r) => {
              setTerminateRow(r);
              setTerminateSuccess(null);
            }}
            onDocuments={openDocumentsModal}
            onPaidLeave={openPaidLeaveModal}
            onAssignAssets={openAssignAssetsModal}
            onUpdateAddresses={openUpdateAddressesModal}
            onAddAddress={openAddAddressModal}
          />
        </MobileEmployeeMenuSheet>
      ) : null}

      <AssignEmployeeAssetsModal
        open={assetsRow != null}
        orgId={organizationIdNum}
        employee={
          assetsRow
            ? {
                userId: assetsRow.id ?? "",
                userName: String(assetsRow.user_name ?? "Employee"),
              }
            : null
        }
        onClose={() => setAssetsRow(null)}
        onSuccess={(message) => setAssetsSuccess(message)}
      />

      <TerminateEmployeeModal
        open={terminateRow != null}
        orgId={organizationIdNum}
        employee={
          terminateRow
            ? {
                userId: terminateRow.id ?? "",
                userName: String(terminateRow.user_name ?? "Employee"),
                userEmail: terminateRow.user_email,
                teamId: orgUserEmployeeTeamId(terminateRow),
                subtitle: formatRoleLabel(
                  terminateRow.role_name ?? terminateRow.user_role_name,
                ),
              }
            : null
        }
        onClose={() => setTerminateRow(null)}
        onSuccess={(message) => {
          setTerminateSuccess(message);
          setTab("exit_process");
          void loadUsers();
        }}
      />
    </div>
  );
}
