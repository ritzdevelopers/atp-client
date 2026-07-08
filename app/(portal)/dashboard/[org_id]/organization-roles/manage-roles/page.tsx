"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  AlertTriangle,
  RefreshCw,
  Search,
  Shield,
  ShieldPlus,
  CheckCircle2,
  Info,
  BookOpen,
  Hash,
  MoreHorizontal,
} from "lucide-react";
import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import {
  clearManageOrgRolesCache,
  readManageOrgRolesCache,
  shouldRefreshManageOrgRolesCache,
  writeManageOrgRolesCache,
} from "@/lib/employeeManagementCache";
import {
  createOrganizationRole,
  deleteOrganizationRole,
  getOrganizationRoles,
  updateOrganizationRole,
  type OrgRoleRow,
} from "@/services/adminUser";

const ROLE_ICON_COLORS = [
  "bg-[#E8F4FB] text-[#008CD3]",
  "bg-[#E6F4EA] text-[#0F9D58]",
  "bg-[#FEF3E6] text-[#E8710A]",
  "bg-[#F3E8FD] text-[#7B1FA2]",
  "bg-[#FCE8E6] text-[#D93025]",
  "bg-[#E8EAF6] text-[#3F51B5]",
];

type MainTab = "roles" | "create" | "guide";

function roleColorClass(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return ROLE_ICON_COLORS[Math.abs(hash) % ROLE_ICON_COLORS.length];
}

function roleInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function labelCls() {
  return "mb-1.5 block text-[13px] font-medium text-[#374151]";
}

function inputCls() {
  return "w-full rounded-lg border border-[#E4E7EC] bg-white px-3.5 py-2.5 text-[14px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15 disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF]";
}

function searchCls() {
  return "w-full rounded-lg border border-[#E4E7EC] bg-white py-2.5 pl-10 pr-4 text-[14px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15";
}

function primaryBtnCls(full = false) {
  return `inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-[#008CD3] px-4 py-2.5 text-[14px] font-medium text-white shadow-sm transition hover:bg-[#0070AA] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full" : ""}`;
}

function secondaryBtnCls(full = false) {
  return `inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg border border-[#E4E7EC] bg-white px-4 py-2.5 text-[14px] font-medium text-[#374151] shadow-sm transition hover:bg-[#F9FAFB] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full" : ""}`;
}

function cardCls() {
  return "overflow-hidden rounded-xl border border-[#E4E7EC] bg-white shadow-sm";
}

function formatRoleDisplay(name: string | undefined) {
  if (!name) return "—";
  return name.replace(/\b\w/g, (c) => c.toUpperCase());
}

const GUIDE_ITEMS = [
  "Role names are stored in lowercase automatically.",
  "Each name must be at least 2 characters.",
  "Duplicate role names are not allowed per organization.",
  "Use clear names like manager, hr, or staff.",
  "The admin role is reserved and cannot be recreated here.",
];

export default function ManageRolesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-[#6B7280]">
          <Loader2 className="h-8 w-8 animate-spin text-[#008CD3]" />
          <p className="text-[14px]">Loading roles…</p>
        </div>
      }
    >
      <ManageRolesPageContent />
    </Suspense>
  );
}

function ManageRolesPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orgIdParam = params?.org_id;
  const ctx = useManagementDashboardContext();

  const organizationIdNum =
    ctx?.organization?.id != null ? Number(ctx.organization.id) : Number(orgIdParam);
  const orgName = ctx?.organization?.org_name?.trim() || `Organization ${orgIdParam ?? ""}`;
  const orgMissing = !organizationIdNum || Number.isNaN(organizationIdNum);

  const cachedRoles = !orgMissing ? readManageOrgRolesCache(organizationIdNum) : null;

  const [roles, setRoles] = useState<OrgRoleRow[]>(() => cachedRoles ?? []);
  const [listLoading, setListLoading] = useState(() => !cachedRoles);
  const [listRefreshing, setListRefreshing] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [roleSearchQuery, setRoleSearchQuery] = useState("");
  const [mobileMainTab, setMobileMainTab] = useState<MainTab>(() => {
    const tab = searchParams.get("tab");
    return tab === "create" || tab === "guide" ? tab : "roles";
  });

  const [newRoleName, setNewRoleName] = useState("");
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const [editRole, setEditRole] = useState<OrgRoleRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteRole, setDeleteRole] = useState<OrgRoleRow | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const editInputRef = useRef<HTMLInputElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);

  const loadRoles = useCallback(
    async (force = false) => {
      if (orgMissing) {
        setListLoading(false);
        setListRefreshing(false);
        setListError("Missing organization.");
        setRoles([]);
        return;
      }

      const cached = readManageOrgRolesCache(organizationIdNum);
      if (cached && !force) {
        setRoles(cached);
        setListError(null);
        setListLoading(false);
        if (!shouldRefreshManageOrgRolesCache(organizationIdNum)) {
          return;
        }
        setListRefreshing(true);
      } else {
        if (force) {
          clearManageOrgRolesCache(organizationIdNum);
        }
        if (force) setListRefreshing(true);
        else setListLoading(true);
        setListError(null);
      }

      const token = localStorage.getItem("token");
      if (!token) {
        setListLoading(false);
        setListRefreshing(false);
        setListError("Not signed in.");
        if (!cached) setRoles([]);
        return;
      }

      try {
        const list = await getOrganizationRoles(token, organizationIdNum);
        setRoles(list);
        writeManageOrgRolesCache(organizationIdNum, list);
      } catch (e) {
        if (!cached || force) {
          setRoles([]);
        }
        setListError(e instanceof Error ? e.message : "Failed to load roles");
      } finally {
        setListLoading(false);
        setListRefreshing(false);
      }
    },
    [organizationIdNum, orgMissing],
  );

  const filteredRoles = useMemo(() => {
    const q = roleSearchQuery.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((role) => {
      const name = String(role.role_name ?? "").toLowerCase();
      const id = String(role.id).toLowerCase();
      return name.includes(q) || id.includes(q);
    });
  }, [roles, roleSearchQuery]);

  useEffect(() => {
    void loadRoles();
  }, [loadRoles]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "create" || tab === "guide") {
      setMobileMainTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!editRole) return;
    const t = requestAnimationFrame(() => editInputRef.current?.focus());
    return () => cancelAnimationFrame(t);
  }, [editRole]);

  useEffect(() => {
    if (mobileMainTab !== "create") return;
    const t = requestAnimationFrame(() => createInputRef.current?.focus());
    return () => cancelAnimationFrame(t);
  }, [mobileMainTab]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (editRole) {
        setEditRole(null);
        setEditError(null);
      }
      if (deleteRole) {
        setDeleteRole(null);
        setDeleteError(null);
      }
      setOpenMenuId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editRole, deleteRole]);

  useEffect(() => {
    if (!openMenuId) return;
    function onPointerDown(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-role-menu]")) {
        setOpenMenuId(null);
      }
    }
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [openMenuId]);

  function openEdit(role: OrgRoleRow) {
    setOpenMenuId(null);
    setEditError(null);
    setEditRole(role);
    setEditName(role.role_name ?? "");
  }

  function openDelete(role: OrgRoleRow) {
    setOpenMenuId(null);
    setDeleteError(null);
    setDeleteRole(role);
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    const trimmed = newRoleName.trim();
    if (!trimmed) {
      setCreateError("Enter a role name.");
      return;
    }
    if (trimmed.length < 2) {
      setCreateError("Role name must be at least 2 characters.");
      return;
    }
    if (orgMissing) {
      setCreateError("Invalid organization.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setCreateError("Not signed in.");
      return;
    }

    setCreateSaving(true);
    try {
      await createOrganizationRole(token, {
        role_name: trimmed,
        organization_id: organizationIdNum,
      });
      setCreateSuccess("Role created successfully. It will appear in lowercase in the system.");
      setNewRoleName("");
      clearManageOrgRolesCache(organizationIdNum);
      await loadRoles(true);
      setMobileMainTab("roles");
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Could not create role.");
    } finally {
      setCreateSaving(false);
    }
  }

  function clearCreateForm() {
    setCreateError(null);
    setCreateSuccess(null);
    setNewRoleName("");
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editRole) return;
    const trimmed = editName.trim();
    if (trimmed.length < 2) {
      setEditError("Role name must be at least 2 characters.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setEditError("Not signed in.");
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      await updateOrganizationRole(token, {
        role_id: editRole.id,
        role_name: trimmed,
        organization_id: organizationIdNum,
      });
      setEditRole(null);
      clearManageOrgRolesCache(organizationIdNum);
      await loadRoles(true);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setEditSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteRole) return;
    const token = localStorage.getItem("token");
    if (!token) {
      setDeleteError("Not signed in.");
      return;
    }
    setDeleteSaving(true);
    setDeleteError(null);
    try {
      await deleteOrganizationRole(token, {
        role_id: deleteRole.id,
        organization_id: organizationIdNum,
      });
      setDeleteRole(null);
      clearManageOrgRolesCache(organizationIdNum);
      await loadRoles(true);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleteSaving(false);
    }
  }

  const mobileTabs = [
    { id: "roles" as const, label: "Roles", count: roles.length },
    { id: "create" as const, label: "Create" },
    { id: "guide" as const, label: "Guide" },
  ];

  const createStatusBanner = createSuccess ? (
    <div
      className="flex items-start gap-2.5 rounded-lg border border-[#A8DAB5] bg-[#E6F4EA] px-4 py-3 text-[13px] text-[#0F9D58]"
      role="status"
    >
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{createSuccess}</span>
    </div>
  ) : createError ? (
    <div
      className="flex items-start gap-2.5 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-4 py-3 text-[13px] text-[#D93025]"
      role="alert"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{createError}</span>
    </div>
  ) : null;

  const createFormFields = (mobile: boolean) => (
    <>
      <div>
        <label htmlFor={mobile ? "org-context-mobile" : "org-context"} className={labelCls()}>
          Organization
        </label>
        <input
          id={mobile ? "org-context-mobile" : "org-context"}
          type="text"
          className={`${inputCls()} bg-[#F9FAFB] text-[#6B7280]`}
          value={orgMissing ? "—" : `${orgName} (ID: ${organizationIdNum})`}
          readOnly
          tabIndex={-1}
          aria-readonly
        />
      </div>
      <div>
        <label htmlFor={mobile ? "role-name-mobile" : "role-name"} className={labelCls()}>
          Role name <span className="text-[#D93025]">*</span>
        </label>
        <input
          ref={mobile ? createInputRef : undefined}
          id={mobile ? "role-name-mobile" : "role-name"}
          name="role_name"
          type="text"
          autoComplete="off"
          className={inputCls()}
          value={newRoleName}
          onChange={(e) => setNewRoleName(e.target.value)}
          placeholder="e.g. field supervisor, payroll specialist"
          disabled={orgMissing || createSaving}
          required
          minLength={2}
        />
        <p className="mt-1.5 text-[12px] text-[#6B7280]">
          Examples: manager, hr, staff. Duplicates are not allowed for this organization.
        </p>
      </div>
    </>
  );

  const guidePanel = (
    <div className="space-y-3">
      <div className={`${cardCls()} p-4`}>
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-[#008CD3]" aria-hidden />
          <p className="text-[13px] font-semibold text-[#1F2937]">About roles</p>
        </div>
        <p className="mt-2.5 text-[13px] leading-relaxed text-[#6B7280]">
          Roles define permission groups for employees. After creating a role, assign features and
          map users from employee management screens.
        </p>
      </div>
      <div className={`${cardCls()} p-4`}>
        <p className="text-[12px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
          Naming rules
        </p>
        <ul className="mt-3 space-y-2.5">
          {GUIDE_ITEMS.map((item) => (
            <li key={item} className="flex gap-2.5 text-[13px] text-[#4B5563]">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E8F4FB] text-[10px] font-bold text-[#008CD3]">
                ✓
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl border border-[#C5E4F3] bg-[#E8F4FB]/60 p-4">
        <div className="flex gap-3">
          <Info className="h-4 w-4 shrink-0 text-[#008CD3] mt-0.5" />
          <p className="text-[13px] leading-relaxed text-[#4B5563]">
            New roles appear in feature assignment and employee management once saved.
          </p>
        </div>
      </div>
    </div>
  );

  function RoleCard({ role, variant }: { role: OrgRoleRow; variant: "mobile" | "desktop" }) {
    const displayName = formatRoleDisplay(role.role_name);
    const rawName = String(role.role_name ?? displayName);
    const roleId = String(role.id);
    const menuOpen = openMenuId === roleId;

    if (variant === "mobile") {
      return (
        <article className={`${cardCls()} transition active:scale-[0.995]`}>
          <div className="flex items-center gap-3 p-3.5">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ${roleColorClass(rawName)}`}
            >
              {roleInitials(rawName)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-[#1F2937]">{displayName}</p>
              <p className="mt-0.5 flex items-center gap-1 text-[12px] text-[#9CA3AF]">
                <Hash className="h-3 w-3" aria-hidden />
                {roleId}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={() => openEdit(role)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#008CD3] transition active:bg-[#E8F4FB]"
                aria-label={`Edit ${displayName}`}
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => openDelete(role)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#D93025] transition active:bg-[#FCE8E6]"
                aria-label={`Delete ${displayName}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </article>
      );
    }

    return (
      <article
        className={`group relative ${cardCls()} transition hover:border-[#008CD3]/25 hover:shadow-md`}
      >
        <div className="flex items-start gap-3 p-4">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${roleColorClass(rawName)}`}
          >
            {roleInitials(rawName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-[#1F2937]">{displayName}</p>
            <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-[#F9FAFB] px-2 py-0.5 text-[11px] font-medium text-[#6B7280]">
              <Hash className="h-3 w-3" aria-hidden />
              ID {roleId}
            </p>
          </div>
          <div className="relative shrink-0" data-role-menu>
            <button
              type="button"
              onClick={() => setOpenMenuId(menuOpen ? null : roleId)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280] opacity-0 transition group-hover:opacity-100 hover:bg-[#F9FAFB] focus:opacity-100"
              aria-label={`Actions for ${displayName}`}
              aria-expanded={menuOpen}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-full z-20 mt-1 min-w-[9.5rem] rounded-lg border border-[#E4E7EC] bg-white py-1 shadow-xl"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => openEdit(role)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[#374151] hover:bg-[#F9FAFB]"
                >
                  <Pencil className="h-3.5 w-3.5 text-[#008CD3]" aria-hidden />
                  Edit role
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => openDelete(role)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[#D93025] hover:bg-[#FCE8E6]/40"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  Delete role
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex gap-2 border-t border-[#F3F4F6] px-4 py-2.5 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            type="button"
            onClick={() => openEdit(role)}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#E4E7EC] bg-white py-1.5 text-[12px] font-medium text-[#374151] transition hover:border-[#008CD3]/30 hover:bg-[#E8F4FB]/40"
          >
            <Pencil className="h-3.5 w-3.5 text-[#008CD3]" aria-hidden />
            Edit
          </button>
          <button
            type="button"
            onClick={() => openDelete(role)}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#FFCDD2] bg-white py-1.5 text-[12px] font-medium text-[#D93025] transition hover:bg-[#FCE8E6]/50"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Delete
          </button>
        </div>
      </article>
    );
  }

  const rolesListContent = (
    <>
      {listError ? (
        <div className="mx-3 mb-3 flex items-start gap-2.5 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-4 py-3 text-[13px] text-[#D93025] lg:mx-0">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{listError}</span>
        </div>
      ) : null}

      {listLoading && !listError ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-[#6B7280]">
          <Loader2 className="h-8 w-8 animate-spin text-[#008CD3]" />
          <p className="text-[14px]">Loading roles…</p>
        </div>
      ) : null}

      {!listLoading && !listError && roles.length === 0 ? (
        <div className="mx-3 rounded-xl border border-dashed border-[#E4E7EC] bg-white px-6 py-16 text-center lg:mx-0">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8F4FB]">
            <Shield className="h-7 w-7 text-[#008CD3]" />
          </div>
          <p className="mt-4 text-[16px] font-semibold text-[#1F2937]">No roles yet</p>
          <p className="mt-1.5 text-[13px] text-[#6B7280]">
            Create your first role to start assigning permissions.
          </p>
          <button
            type="button"
            onClick={() => setMobileMainTab("create")}
            className={`mt-5 ${primaryBtnCls()}`}
          >
            <ShieldPlus className="h-4 w-4" aria-hidden />
            Create role
          </button>
        </div>
      ) : null}

      {!listLoading && !listError && roles.length > 0 ? (
        <>
          {filteredRoles.length === 0 ? (
            <div className="px-3 py-16 text-center lg:px-0">
              <Search className="mx-auto h-8 w-8 text-[#D1D5DB]" aria-hidden />
              <p className="mt-3 text-[14px] font-medium text-[#374151]">No matching roles</p>
              <p className="mt-1 text-[13px] text-[#6B7280]">Try a different search term.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2.5 px-3 pb-3 lg:hidden">
                {filteredRoles.map((role) => (
                  <RoleCard key={String(role.id)} role={role} variant="mobile" />
                ))}
              </div>
              <div className="hidden gap-4 p-5 lg:grid lg:grid-cols-2 xl:grid-cols-3">
                {filteredRoles.map((role) => (
                  <RoleCard key={String(role.id)} role={role} variant="desktop" />
                ))}
              </div>
            </>
          )}
        </>
      ) : null}
    </>
  );

  return (
    <div className="min-h-full bg-[#F5F7FA] pb-28 lg:space-y-5 lg:bg-transparent lg:pb-0">
      {/* ── Mobile & tablet ── */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-20 border-b border-[#E4E7EC] bg-white/95 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E8F4FB] text-[#008CD3]">
              <Shield className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[16px] font-semibold text-[#1F2937]">Organization roles</h1>
              <p className="truncate text-[12px] text-[#6B7280]">{orgName}</p>
            </div>
            <button
              type="button"
              onClick={() => void loadRoles(true)}
              disabled={listLoading || listRefreshing || orgMissing}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#008CD3] transition active:bg-[#F9FAFB] disabled:opacity-50"
              aria-label="Refresh roles"
            >
              <RefreshCw
                className={`h-4 w-4 ${listLoading || listRefreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          <div className="px-4 pb-3">
            <div className="flex rounded-lg bg-[#F3F4F6] p-1">
              {mobileTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMobileMainTab(tab.id)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-[13px] font-medium transition ${
                    mobileMainTab === tab.id
                      ? "bg-white text-[#008CD3] shadow-sm"
                      : "text-[#6B7280]"
                  }`}
                >
                  {tab.label}
                  {"count" in tab && tab.count != null ? (
                    <span
                      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold ${
                        mobileMainTab === tab.id
                          ? "bg-[#E8F4FB] text-[#008CD3]"
                          : "bg-[#E5E7EB] text-[#6B7280]"
                      }`}
                    >
                      {tab.count > 99 ? "99+" : tab.count}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          {mobileMainTab === "roles" ? (
            <div className="border-t border-[#F3F4F6] px-4 py-2.5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="search"
                  value={roleSearchQuery}
                  onChange={(e) => setRoleSearchQuery(e.target.value)}
                  placeholder="Search roles by name or ID"
                  className={searchCls()}
                />
              </div>
            </div>
          ) : null}
        </div>

        {mobileMainTab === "roles" ? (
          <div className="pt-3">
            {!listLoading && !listError && roles.length > 0 ? (
              <p className="mb-2 px-3 text-[12px] text-[#6B7280]">
                Showing{" "}
                <span className="font-semibold text-[#1F2937]">{filteredRoles.length}</span> of{" "}
                <span className="font-semibold text-[#1F2937]">{roles.length}</span> roles
              </p>
            ) : null}
            {rolesListContent}
          </div>
        ) : null}

        {mobileMainTab === "create" ? (
          <div className="p-4">
            {createStatusBanner ? <div className="mb-4">{createStatusBanner}</div> : null}
            <form
              id="create-role-mobile-form"
              onSubmit={submitCreate}
              className={`${cardCls()} space-y-4 p-4`}
            >
              <div className="flex items-center gap-2 border-b border-[#F3F4F6] pb-3">
                <ShieldPlus className="h-4 w-4 text-[#008CD3]" aria-hidden />
                <h2 className="text-[15px] font-semibold text-[#1F2937]">New role</h2>
              </div>
              {createFormFields(true)}
            </form>
          </div>
        ) : null}

        {mobileMainTab === "guide" ? <div className="p-4">{guidePanel}</div> : null}

        {mobileMainTab === "create" ? (
          <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 border-t border-[#E4E7EC] bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur-sm">
            <div className="flex gap-2">
              <button type="button" onClick={clearCreateForm} className={secondaryBtnCls(true)}>
                Clear
              </button>
              <button
                type="submit"
                form="create-role-mobile-form"
                disabled={createSaving || orgMissing}
                className={primaryBtnCls(true)}
              >
                {createSaving ? (
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

      {/* ── Desktop ── */}
      <div className="hidden lg:block">
        <header className="mb-5 overflow-hidden rounded-2xl border border-[#E4E7EC] bg-gradient-to-br from-[#0C123A] via-[#151e59] to-[#008CD3] p-6 text-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                <Shield className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">Organization roles</h1>
                <p className="mt-1 text-sm text-white/75">
                  Manage permission groups for{" "}
                  <span className="font-medium text-white">{orgName}</span>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void loadRoles(true)}
                disabled={listLoading || listRefreshing || orgMissing}
                className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-[13px] font-medium text-white backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${listLoading || listRefreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
              {!listLoading && !listError ? (
                <>
                  <div className="rounded-lg bg-white/10 px-3 py-2 text-center backdrop-blur-sm">
                    <p className="text-lg font-semibold leading-none text-[#A8E6CF]">
                      {roles.length}
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-white/70">
                      Total roles
                    </p>
                  </div>
                  {roleSearchQuery.trim() ? (
                    <div className="rounded-lg bg-white/10 px-3 py-2 text-center backdrop-blur-sm">
                      <p className="text-lg font-semibold leading-none text-white">
                        {filteredRoles.length}
                      </p>
                      <p className="mt-1 text-[10px] uppercase tracking-wide text-white/70">
                        Filtered
                      </p>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-12">
          <div className="space-y-4 xl:col-span-4">
            <div className={`${cardCls()} p-5`}>
              <div className="mb-4 flex items-center gap-2.5 border-b border-[#F3F4F6] pb-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8F4FB]">
                  <ShieldPlus className="h-4 w-4 text-[#008CD3]" aria-hidden />
                </span>
                <div>
                  <h2 className="text-[15px] font-semibold text-[#1F2937]">Create role</h2>
                  <p className="text-[12px] text-[#6B7280]">Add a new permission group</p>
                </div>
              </div>
              {createStatusBanner ? <div className="mb-4">{createStatusBanner}</div> : null}
              <form onSubmit={submitCreate} className="space-y-4">
                {createFormFields(false)}
                <div className="flex flex-col gap-2 border-t border-[#F3F4F6] pt-4 sm:flex-row sm:justify-end">
                  <button type="button" onClick={clearCreateForm} className={secondaryBtnCls()}>
                    Clear
                  </button>
                  <button
                    type="submit"
                    disabled={createSaving || orgMissing}
                    className={primaryBtnCls()}
                  >
                    {createSaving ? (
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
            {guidePanel}
          </div>

          <div className={`${cardCls()} xl:col-span-8`}>
            <div className="border-b border-[#F3F4F6] px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-[15px] font-semibold text-[#1F2937]">All roles</h2>
                  <p className="mt-0.5 text-[12px] text-[#6B7280]">
                    {listLoading
                      ? "Loading…"
                      : `${filteredRoles.length} of ${roles.length} role${roles.length === 1 ? "" : "s"}`}
                  </p>
                </div>
                <div className="relative w-full sm:max-w-[260px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    type="search"
                    value={roleSearchQuery}
                    onChange={(e) => setRoleSearchQuery(e.target.value)}
                    placeholder="Search roles…"
                    className={searchCls()}
                  />
                  {roleSearchQuery.trim() ? (
                    <button
                      type="button"
                      onClick={() => setRoleSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#374151]"
                      aria-label="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
            {rolesListContent}
          </div>
        </div>
      </div>

      {/* ── Edit role modal ── */}
      {editRole && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-role-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#111B21]/50 backdrop-blur-[2px]"
            aria-label="Close dialog"
            onClick={() => !editSaving && setEditRole(null)}
          />
          <div className="relative z-10 flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-[#E4E7EC] bg-white shadow-2xl sm:rounded-2xl sm:shadow-xl">
            <div className="shrink-0 border-b border-[#F3F4F6] px-5 py-4 sm:border-t-[3px] sm:border-t-[#008CD3]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${roleColorClass(editName || editRole.role_name || "")}`}
                  >
                    {roleInitials(editName || editRole.role_name || "")}
                  </span>
                  <div>
                    <h2
                      id="edit-role-title"
                      className="text-[16px] font-semibold text-[#1F2937]"
                    >
                      Edit role
                    </h2>
                    <p className="mt-0.5 text-[12px] text-[#6B7280]">
                      Saved in lowercase for your organization.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={editSaving}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280] transition hover:bg-[#F9FAFB]"
                  aria-label="Close"
                  onClick={() => setEditRole(null)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {editError && (
                <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2.5 text-[13px] text-[#D93025]">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  {editError}
                </div>
              )}
              <form onSubmit={submitEdit} className="space-y-4">
                <div>
                  <label htmlFor="edit-role-name" className={labelCls()}>
                    Role name
                  </label>
                  <input
                    ref={editInputRef}
                    id="edit-role-name"
                    type="text"
                    className={inputCls()}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    disabled={editSaving}
                    minLength={2}
                    required
                  />
                </div>
                <div className="flex flex-col-reverse gap-2 border-t border-[#F3F4F6] pt-4 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={editSaving}
                    onClick={() => setEditRole(null)}
                    className={secondaryBtnCls(true)}
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={editSaving} className={primaryBtnCls()}>
                    {editSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Saving…
                      </>
                    ) : (
                      "Save changes"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation modal ── */}
      {deleteRole && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-role-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#111B21]/50 backdrop-blur-[2px]"
            aria-label="Close dialog"
            onClick={() => !deleteSaving && setDeleteRole(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-t-2xl border border-[#E4E7EC] bg-white p-5 shadow-2xl sm:rounded-2xl">
            <div className="mb-4 flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FCE8E6]">
                <AlertTriangle className="h-5 w-5 text-[#D93025]" aria-hidden />
              </span>
              <div>
                <h2
                  id="delete-role-title"
                  className="text-[16px] font-semibold text-[#1F2937]"
                >
                  Delete role?
                </h2>
                <p className="mt-2 text-[13px] leading-relaxed text-[#6B7280]">
                  This will permanently remove{" "}
                  <strong className="text-[#1F2937]">
                    {formatRoleDisplay(deleteRole.role_name)}
                  </strong>{" "}
                  (ID {deleteRole.id}) from {orgName}. Users assigned only to this role may be
                  affected.
                </p>
              </div>
            </div>
            {deleteError && (
              <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2.5 text-[13px] text-[#D93025]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {deleteError}
              </div>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={deleteSaving}
                onClick={() => setDeleteRole(null)}
                className={secondaryBtnCls(true)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteSaving}
                onClick={() => void confirmDelete()}
                className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-lg bg-[#D93025] px-4 py-2.5 text-[14px] font-medium text-white shadow-sm transition hover:bg-[#B71C1C] disabled:opacity-50 sm:w-auto"
              >
                {deleteSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" aria-hidden />
                    Yes, delete role
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
