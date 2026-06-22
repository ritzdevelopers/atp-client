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
  CalendarClock,
  Pencil,
  Shield,
  FileText,
  Package,
  Upload,
} from "lucide-react";
import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import AssignEmployeeAssetsModal from "@/components/portal-dashboard/employees/AssignEmployeeAssetsModal";
import ScheduleEmployeeLeaveModal from "@/components/portal-dashboard/employees/ScheduleEmployeeLeaveModal";
import {
  dedupeOrgUserRows,
  getAllOrgUsers,
  getOrganizationRoles,
  updateUserDetails,
  updateUserRoleAssignment,
  uploadEmployeeDocuments,
  type EmployeeOnboardingDocumentField,
  type OrgUserRow,
  type OrgRoleRow,
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

const ACCENT = "#008CD3";
const ACCENT_SOFT = "#E8F4FB";
const PASSWORD_MIN = 8;

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
      className="fixed inset-0 z-[10060] flex items-center justify-center bg-[#111B21]/80 p-4 backdrop-blur-sm"
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
      className="fixed inset-0 z-[20050] flex flex-col justify-end lg:hidden"
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
  viewerCanAssignLeaves,
  variant,
  onClose,
  onEdit,
  onRole,
  onDocuments,
  onPaidLeave,
  onScheduleLeave,
  onAssignAssets,
}: {
  orgIdParam: string | string[] | undefined;
  emp: EmployeeCard;
  row: OrgUserRow;
  isReadOnlyRosterTab: boolean;
  viewerCanAssignLeaves: boolean;
  variant: "dropdown" | "sheet";
  onClose: () => void;
  onEdit: (row: OrgUserRow) => void;
  onRole: (row: OrgUserRow) => void;
  onDocuments: (row: OrgUserRow) => void;
  onPaidLeave: (row: OrgUserRow) => void;
  onScheduleLeave: (row: OrgUserRow) => void;
  onAssignAssets: (row: OrgUserRow) => void;
}) {
  const itemCls =
    variant === "sheet"
      ? "flex w-full touch-manipulation items-center gap-2.5 px-4 py-3 text-left text-[14px] text-[#1F2937] active:bg-[#F5F7FA]"
      : "flex w-full touch-manipulation items-center gap-2 px-3 py-2 text-left text-[13px] text-[#374151] active:bg-[#F9FAFB]";

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
              onScheduleLeave(row);
              onClose();
            }}
          >
            <CalendarClock className="h-4 w-4 shrink-0 text-[#008CD3]" aria-hidden />
            Schedule leave
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

function labelCls() {
  return "mb-1 block text-[12px] font-medium text-[#374151]";
}

function inputCls() {
  return "w-full rounded-lg border border-[#E4E7EC] bg-white px-3 py-2 text-[14px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15";
}

function zohoPrimaryBtnCls() {
  return "inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-[#008CD3] px-4 py-2 text-[14px] font-medium text-white transition hover:bg-[#0070AA] disabled:pointer-events-none disabled:opacity-50";
}

function zohoSecondaryBtnCls() {
  return "inline-flex min-h-[40px] items-center justify-center rounded-lg border border-[#E4E7EC] bg-white px-4 py-2 text-[14px] font-medium text-[#374151] transition hover:bg-[#F9FAFB] disabled:pointer-events-none disabled:opacity-50";
}

function zohoModalShellCls(wide = false) {
  return `relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-lg border border-[#E4E7EC] bg-white p-4 shadow-xl ${wide ? "max-w-3xl" : "max-w-md"}`;
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
  return "block w-full cursor-pointer rounded-lg border border-dashed border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2 text-[13px] text-[#1F2937] outline-none transition file:mr-2 file:cursor-pointer file:rounded-md file:border-0 file:bg-[#E8F4FB] file:px-2.5 file:py-1 file:text-[12px] file:font-medium file:text-[#008CD3] hover:border-[#008CD3]/40 focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15";
}

function docLabelCls() {
  return labelCls();
}

function normalizeBool(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    String(value).toLowerCase() === "true" ||
    String(value) === "1"
  );
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

  const [documentsRow, setDocumentsRow] = useState<OrgUserRow | null>(null);
  const [docFiles, setDocFiles] = useState<Partial<Record<EmployeeOnboardingDocumentField, File>>>({});
  const [documentsSaving, setDocumentsSaving] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [documentsSuccess, setDocumentsSuccess] = useState<string | null>(null);

  const [assetsRow, setAssetsRow] = useState<OrgUserRow | null>(null);
  const [assetsSuccess, setAssetsSuccess] = useState<string | null>(null);

  const [scheduleLeaveRow, setScheduleLeaveRow] = useState<OrgUserRow | null>(null);
  const [scheduleLeaveSuccess, setScheduleLeaveSuccess] = useState<string | null>(null);

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

  function openScheduleLeaveModal(row: OrgUserRow) {
    setScheduleLeaveRow(row);
    setScheduleLeaveSuccess(null);
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
    <div className="min-h-full bg-[#F5F7FA] pb-3 [font-family:var(--font-inter),system-ui,sans-serif] max-lg:-mx-1 sm:max-lg:-mx-2 lg:pb-8">
      <div className="mx-auto max-w-6xl max-lg:max-w-none lg:px-4 lg:pt-6 md:max-w-7xl md:px-6">
        {scheduleLeaveSuccess ? (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-[#A8DAB5] bg-[#E6F4EA] px-3 py-2 text-[12px] text-[#0F9D58] max-lg:mx-3 max-lg:mt-2 lg:mb-4 lg:px-4 lg:py-2.5 lg:text-[13px]">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span className="flex-1">{scheduleLeaveSuccess}</span>
            <button
              type="button"
              onClick={() => setScheduleLeaveSuccess(null)}
              className="shrink-0 rounded-lg p-1 text-[#0F9D58] hover:bg-[#E6F4EA]/80"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {assetsSuccess ? (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-[#A8DAB5] bg-[#E6F4EA] px-3 py-2 text-[12px] text-[#0F9D58] max-lg:mx-3 max-lg:mt-2 lg:mb-4 lg:px-4 lg:py-2.5 lg:text-[13px]">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span className="flex-1">{assetsSuccess}</span>
            <button
              type="button"
              onClick={() => setAssetsSuccess(null)}
              className="shrink-0 rounded-lg p-1 text-[#0F9D58] hover:bg-[#E6F4EA]/80"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {listError && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2 text-[12px] text-[#1F2937] max-lg:mx-3 max-lg:mt-2 lg:mb-4 lg:px-4 lg:py-2.5 lg:text-[13px]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#D93025]" aria-hidden />
            <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
              <span>{listError}</span>
              <button
                type="button"
                onClick={() => void loadUsers()}
                className="rounded-lg border border-[#F5C6C2] bg-white px-2.5 py-1 text-[12px] font-medium text-[#D93025] active:scale-[0.98] hover:bg-[#FCE8E6]"
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

        {/* Desktop: page intro + tabs */}
        <div className="hidden lg:block">
          <div className="mb-3 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
              <Users className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h1 className="text-[18px] font-semibold text-[#1F2937]">Team members</h1>
              <p className="text-[13px] text-[#6B7280]">{tabSubtitle}</p>
            </div>
          </div>
          <div className="flex gap-6 border-b border-[#E4E7EC]">
            {tabOptions.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id);
                  setSearch("");
                }}
                className={`relative pb-2.5 pt-1 text-[13px] font-medium transition-colors ${
                  tab === t.id ? "text-[#008CD3]" : "text-[#6B7280] hover:text-[#374151]"
                }`}
              >
                {t.label}
                {tab === t.id ? (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#008CD3]" />
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 hidden flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:flex">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13px] text-[#6B7280]">
              Found{" "}
              <span className="font-semibold text-[#1F2937]">
                {listLoading ? "…" : filtered.length}
              </span>{" "}
              matching member{filtered.length === 1 ? "" : "s"}
            </p>
            {activeFilterLabel ? (
              <span className="inline-flex items-center gap-1 rounded-lg bg-[#E8F4FB] px-2 py-0.5 text-[12px] font-medium text-[#008CD3]">
                {activeFilterLabel}
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="rounded-full p-0.5 hover:bg-[#008CD3]/10"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ) : null}
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, role…"
              disabled={listLoading || !!listError}
              className="w-full rounded-lg border border-[#E4E7EC] bg-white py-2 pl-9 pr-3 text-[14px] text-[#1F2937] outline-none placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15 disabled:opacity-60"
            />
          </div>
        </div>

        {listLoading ? (
          <div className="mt-12 flex flex-col items-center justify-center gap-2 px-4 text-[#6B7280] max-lg:mt-8 lg:mt-10 lg:gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-[#008CD3]" aria-hidden />
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
                      viewerCanAssignLeaves={viewerCanAssignLeaves}
                      variant="dropdown"
                      onClose={closeEmployeeMenu}
                      onEdit={openEditModal}
                      onRole={openRoleModal}
                      onDocuments={openDocumentsModal}
                      onPaidLeave={openPaidLeaveModal}
                      onScheduleLeave={openScheduleLeaveModal}
                      onAssignAssets={openAssignAssetsModal}
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
                    className={`rounded-lg border border-[#E4E7EC] bg-white shadow-sm transition-shadow active:scale-[0.995] lg:overflow-visible lg:hover:border-[#008CD3]/20${menuOpen ? " lg:relative lg:z-[100]" : ""}`}
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
                    <div className="relative px-3 pb-2 pt-2.5">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-0.5">
                          <Link
                            href={`/dashboard/${orgIdParam}/organization-employees/manage-employees/get-employee?user_id=${encodeURIComponent(emp.id)}`}
                            className="rounded-md p-1.5 text-[#008CD3] transition hover:bg-[#E8F4FB]"
                            aria-label="View employee profile"
                          >
                            <Eye className="h-3.5 w-3.5" aria-hidden />
                          </Link>
                          <button
                            type="button"
                            onClick={() => toggleFavorite(emp.id)}
                            className="rounded-md p-1.5 text-[#9CA3AF] transition hover:bg-[#F5F7FA]"
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
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-[#6B7280] transition hover:bg-[#F5F7FA]"
                            aria-label="Message"
                          >
                            <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        </div>
                        <div className="relative" data-employee-menu>
                          <button
                            type="button"
                            onClick={() => setMenuUserId(menuOpen ? null : emp.id)}
                            className="rounded-md p-1.5 text-[#6B7280] hover:bg-[#F5F7FA]"
                            aria-expanded={menuOpen}
                            aria-haspopup="menu"
                            aria-label="More options"
                          >
                            <MoreHorizontal className="h-4 w-4" aria-hidden />
                          </button>
                          {menuPanel}
                        </div>
                      </div>

                      <div className="mt-2 flex flex-col items-center">
                        {emp.profileImageUrl ? (
                          <button
                            type="button"
                            onClick={() => openPhotoZoom(emp.profileImageUrl!, emp.name)}
                            className="relative h-[4.5rem] w-[4.5rem] overflow-hidden rounded-full border-2 border-[#E4E7EC] bg-[#F9FAFB] transition hover:ring-2 hover:ring-[#008CD3]/25"
                            aria-label={`View ${emp.name} profile photo`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={emp.avatarSrc}
                              alt=""
                              width={72}
                              height={72}
                              className="h-full w-full object-cover object-top"
                              onError={(e) => {
                                e.currentTarget.src = avatarUrl(emp.avatarSeed);
                              }}
                            />
                          </button>
                        ) : (
                          <div className="relative h-[4.5rem] w-[4.5rem] overflow-hidden rounded-full border-2 border-[#E4E7EC] bg-[#F9FAFB]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={emp.avatarSrc}
                              alt=""
                              width={72}
                              height={72}
                              className="h-full w-full object-cover object-top"
                              onError={(e) => {
                                e.currentTarget.src = avatarUrl(emp.avatarSeed);
                              }}
                            />
                          </div>
                        )}
                        <div className="mt-2 flex w-full items-start justify-center gap-2 px-1">
                          <p className="text-center text-[12px] text-[#6B7280]">
                            {emp.empCode} –{" "}
                            <span className="font-semibold text-[#1F2937]">{emp.name}</span>
                          </p>
                          <span
                            className={`shrink-0 text-[11px] font-semibold ${
                              emp.status === "in" ? "text-[#0F9D58]" : "text-[#D93025]"
                            }`}
                          >
                            {emp.status === "in" ? "In" : "Out"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 rounded-b-lg border-t border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
                        <Users className="h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" aria-hidden />
                        <span className="min-w-0 font-medium text-[#008CD3]">
                          {emp.roleLabel}
                        </span>
                        {isInactiveTab ? (
                          <span className="rounded-md bg-[#FCE8E6] px-1.5 py-0.5 text-[10px] font-semibold text-[#D93025]">
                            Inactive
                          </span>
                        ) : null}
                        {isExitProcessTab ? (
                          <span className="rounded-md bg-[#FFF8E1] px-1.5 py-0.5 text-[10px] font-semibold text-[#F9A825]">
                            Exit process
                          </span>
                        ) : null}
                      </div>
                      {(isInactiveTab || isExitProcessTab) && exitDetailLine ? (
                        <p className="text-[12px] text-[#6B7280]">
                          <span className="font-medium text-[#374151]">Exit: </span>
                          {exitDetailLine}
                        </p>
                      ) : null}
                      <div className="flex items-center gap-1.5 text-[12px] text-[#6B7280]">
                        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" aria-hidden />
                        <span>
                          Member since{" "}
                          <span className="font-medium text-[#374151]">{emp.memberSince}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[12px]">
                        <AtSign className="h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" aria-hidden />
                        {emp.email ? (
                          <a
                            href={`mailto:${emp.email}`}
                            className="truncate text-[#008CD3] hover:underline"
                          >
                            {emp.email}
                          </a>
                        ) : (
                          <span className="text-[#9CA3AF]">—</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[12px] text-[#6B7280]">
                        <Phone className="h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" aria-hidden />
                        <span className="truncate">{emp.phone}</span>
                      </div>
                    </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {!listError && filtered.length === 0 && (
              <p className={`mt-10 px-4 text-center max-lg:mt-6 ${mobileCaptionCls} lg:mt-10 lg:text-[13px] lg:text-[#6B7280]`}>
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
          className="fixed inset-0 z-[999999] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-user-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close"
            onClick={() => !editSaving && setEditRow(null)}
          />
          <div className={zohoModalShellCls()}>
            <div className="mb-4 flex items-start justify-between gap-2">
              <h2 id="edit-user-title" className="text-[16px] font-semibold text-[#1F2937]">
                Edit user
              </h2>
              <button
                type="button"
                disabled={editSaving}
                onClick={() => setEditRow(null)}
                className="rounded-lg p-1.5 text-[#6B7280] hover:bg-[#F3F4F6]"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {editError && (
              <div className="mb-3 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2 text-[13px] text-[#1F2937]">
                {editError}
              </div>
            )}
            <form onSubmit={submitEdit} className="space-y-3">
              <div>
                <label className={labelCls()}>Name</label>
                <input
                  className={inputCls()}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={labelCls()}>Email</label>
                <input
                  type="email"
                  className={inputCls()}
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={labelCls()}>Phone</label>
                <input
                  type="tel"
                  className={inputCls()}
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls()}>
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
                  <label className={labelCls()}>
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
                  className={zohoSecondaryBtnCls()}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className={zohoPrimaryBtnCls()}
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
          className="fixed inset-0 z-[999999] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="role-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close"
            onClick={() => !roleSaving && setRoleRow(null)}
          />
          <div className={zohoModalShellCls()}>
            <div className="mb-4 flex items-start justify-between gap-2">
              <h2 id="role-modal-title" className="text-[16px] font-semibold text-[#1F2937]">
                Update role
              </h2>
              <button
                type="button"
                disabled={roleSaving}
                onClick={() => setRoleRow(null)}
                className="rounded-lg p-1.5 text-[#6B7280] hover:bg-[#F3F4F6]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-[13px] text-[#6B7280]">
              <span className="font-medium text-[#1F2937]">{roleRow.user_name}</span> — current:{" "}
              {formatRoleLabel(roleRow.role_name ?? roleRow.user_role_name)}
            </p>
            {roleError && (
              <div className="mb-3 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2 text-[13px] text-[#1F2937]">
                {roleError}
              </div>
            )}
            <form onSubmit={submitRoleChange} className="space-y-4">
              {roleLoading ? (
                <div className="flex items-center gap-2 text-[13px] text-[#6B7280]">
                  <Loader2 className="h-4 w-4 animate-spin text-[#008CD3]" aria-hidden />
                  Loading roles…
                </div>
              ) : (
                <div>
                  <label className={labelCls()}>New role</label>
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
                  className={zohoSecondaryBtnCls()}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={roleSaving || roleLoading || roleOptions.length === 0}
                  className={zohoPrimaryBtnCls()}
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
          className="fixed inset-0 z-[999999] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="paid-leaves-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close"
            onClick={() => !paidLeaveSaving && setPaidLeaveRow(null)}
          />
          <div className={zohoModalShellCls()}>
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <h2 id="paid-leaves-title" className="text-[16px] font-semibold text-[#1F2937]">
                  Assign paid leaves
                </h2>
                <p className="mt-0.5 text-[13px] text-[#6B7280]">
                  Assign a leave balance to{" "}
                  <span className="font-semibold text-[#1F2937]">{paidLeaveRow.user_name}</span>.
                </p>
              </div>
              <button
                type="button"
                disabled={paidLeaveSaving}
                onClick={() => setPaidLeaveRow(null)}
                className="rounded-lg p-1.5 text-[#6B7280] hover:bg-[#F3F4F6]"
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
              <div className="mb-3 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2 text-[13px] text-[#1F2937]">
                {paidLeaveError}
              </div>
            )}
            {paidLeaveSuccess && (
              <div className="mb-3 rounded-lg border border-[#A8DAB5] bg-[#E6F4EA] px-3 py-2 text-[13px] text-[#1F2937]">
                {paidLeaveSuccess}
              </div>
            )}

            {paidLeaveTypesLoading ? (
              <div className="mb-4 flex items-center gap-2 text-[13px] text-[#6B7280]">
                <Loader2 className="h-4 w-4 animate-spin text-[#008CD3]" aria-hidden />
                Loading leave types…
              </div>
            ) : null}

            {!paidLeaveTypesLoading && paidLeaveTypes.length === 0 && !paidLeaveError ? (
              <div className="mb-4 rounded-lg border border-dashed border-[#E4E7EC] bg-[#F9FAFB] px-3 py-4 text-center text-[13px] text-[#6B7280]">
                <CalendarDays className="mx-auto mb-2 h-7 w-7 text-[#9CA3AF]" aria-hidden />
                <p>No leave types defined yet.</p>
                <Link
                  href={`/dashboard/${orgIdParam ?? ""}/organization-leave/manage-leave-types`}
                  className="mt-2 inline-block font-medium text-[#008CD3] underline-offset-2 hover:underline"
                  onClick={() => setPaidLeaveRow(null)}
                >
                  Manage leave types
                </Link>
              </div>
            ) : null}

            <form onSubmit={submitPaidLeaves} className="space-y-4">
              <div>
                <label htmlFor="paid-leave-type" className={labelCls()}>
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
                <label htmlFor="paid-leave-total" className={labelCls()}>
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
                <p className="mt-1 text-[12px] text-[#6B7280]">
                  Number of days allocated for the selected leave type (remaining starts equal to
                  total).
                </p>
              </div>

              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={paidLeaveSaving}
                  onClick={() => setPaidLeaveRow(null)}
                  className={zohoSecondaryBtnCls()}
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
                  className={zohoPrimaryBtnCls()}
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
          className="fixed inset-0 z-[999999] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="documents-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close"
            onClick={() => !documentsSaving && setDocumentsRow(null)}
          />
          <div className={zohoModalShellCls(true)}>
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <h2 id="documents-modal-title" className="text-[16px] font-semibold text-[#1F2937]">
                  Add documents
                </h2>
                <p className="mt-0.5 text-[13px] text-[#6B7280]">
                  Upload KYC files for{" "}
                  <span className="font-medium text-[#1F2937]">{documentsRow.user_name}</span>. Each file
                  must be PNG, JPG, or PDF and under 5 MB.
                </p>
              </div>
              <button
                type="button"
                disabled={documentsSaving}
                onClick={() => setDocumentsRow(null)}
                className="rounded-lg p-1.5 text-[#6B7280] hover:bg-[#F3F4F6] disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {documentsError ? (
              <div className="mb-3 flex items-start gap-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2 text-[13px] text-[#1F2937]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>{documentsError}</span>
              </div>
            ) : null}
            {documentsSuccess ? (
              <div className="mb-3 flex items-start gap-2 rounded-lg border border-[#A8DAB5] bg-[#E6F4EA] px-3 py-2 text-[13px] text-[#1F2937]">
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
                    <p className="mt-1 text-[12px] text-[#6B7280]">{hint}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-[#E4E7EC] pt-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={documentsSaving}
                  onClick={() => {
                    setDocFiles({});
                    setDocumentsError(null);
                  }}
                  className={`${zohoSecondaryBtnCls()} disabled:opacity-60`}
                >
                  Clear files
                </button>
                <button
                  type="button"
                  disabled={documentsSaving}
                  onClick={() => setDocumentsRow(null)}
                  className={`${zohoSecondaryBtnCls()} disabled:opacity-60`}
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={documentsSaving}
                  className={zohoPrimaryBtnCls()}
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
            viewerCanAssignLeaves={viewerCanAssignLeaves}
            variant="sheet"
            onClose={closeEmployeeMenu}
            onEdit={openEditModal}
            onRole={openRoleModal}
            onDocuments={openDocumentsModal}
            onPaidLeave={openPaidLeaveModal}
            onScheduleLeave={openScheduleLeaveModal}
            onAssignAssets={openAssignAssetsModal}
          />
        </MobileEmployeeMenuSheet>
      ) : null}

      <ScheduleEmployeeLeaveModal
        open={scheduleLeaveRow != null}
        orgId={organizationIdNum}
        orgIdParam={orgIdParam}
        employee={
          scheduleLeaveRow
            ? {
                userId: scheduleLeaveRow.id ?? "",
                userName: String(scheduleLeaveRow.user_name ?? "Employee"),
              }
            : null
        }
        onClose={() => setScheduleLeaveRow(null)}
        onSuccess={(message) => setScheduleLeaveSuccess(message)}
      />

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
    </div>
  );
}
