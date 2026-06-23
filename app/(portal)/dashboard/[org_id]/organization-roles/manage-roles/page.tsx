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

function labelCls(mobile = false) {
  return mobile
    ? "mb-1.5 block text-[13px] font-medium text-[#6B7280]"
    : "mb-1.5 block text-sm font-medium text-[#0C123A]";
}

function inputCls() {
  return "w-full rounded-lg border border-[#E4E7EC] bg-white px-3.5 py-3 text-[15px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15 lg:border-slate-200 lg:py-2.5 lg:text-sm lg:text-[#0C123A] lg:shadow-sm lg:focus:border-[#C99237] lg:focus:ring-[#C99237]/20";
}

function zohoSearchCls() {
  return "w-full rounded-lg border border-[#E4E7EC] bg-white py-2.5 pl-10 pr-4 text-[15px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15 lg:text-sm";
}

function zohoPrimaryBtnCls(full = false) {
  return `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#008CD3] px-5 py-2.5 text-[15px] font-medium text-white transition active:scale-[0.98] hover:bg-[#0070AA] disabled:pointer-events-none disabled:opacity-50 lg:min-h-[40px] lg:bg-[#C99237] lg:px-4 lg:py-2 lg:text-sm lg:font-bold lg:text-[#0C123A] lg:hover:bg-[#b87d2e] ${full ? "w-full" : ""}`;
}

function zohoSecondaryBtnCls(full = false) {
  return `inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[#E4E7EC] bg-white px-4 py-2.5 text-[15px] font-medium text-[#1F2937] transition active:scale-[0.98] hover:bg-[#F5F7FA] disabled:pointer-events-none disabled:opacity-50 lg:min-h-[40px] lg:border-slate-200 lg:text-sm lg:font-semibold lg:text-[#0C123A] lg:shadow-sm lg:hover:bg-slate-50 ${full ? "w-full" : ""}`;
}

function zohoPanelCls() {
  return "overflow-hidden rounded-xl border border-[#E4E7EC] bg-white shadow-sm lg:rounded-2xl lg:border-slate-200/90";
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
          <Loader2 className="h-9 w-9 animate-spin text-[#008CD3]" />
          <p className="text-[15px]">Loading roles…</p>
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
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editRole, deleteRole]);

  function openEdit(role: OrgRoleRow) {
    setEditError(null);
    setEditRole(role);
    setEditName(role.role_name ?? "");
  }

  function openDelete(role: OrgRoleRow) {
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
      className="flex items-start gap-2 rounded-lg border border-[#A8DAB5] bg-[#E6F4EA] px-4 py-3 text-[14px] text-[#0F9D58] lg:text-sm lg:text-emerald-900"
      role="status"
    >
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{createSuccess}</span>
    </div>
  ) : createError ? (
    <div
      className="flex items-start gap-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-4 py-3 text-[14px] text-[#D93025] lg:text-sm lg:text-red-900"
      role="alert"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{createError}</span>
    </div>
  ) : null;

  const createFormFields = (mobile: boolean) => (
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
        <p className="mt-1.5 text-[13px] text-[#6B7280] lg:text-xs lg:text-slate-500">
          Examples: manager, hr, staff. Duplicates are not allowed for this organization.
        </p>
      </div>
    </>
  );

  const guidePanel = (
    <div className="space-y-3">
      <div className={`${zohoPanelCls()} p-4`}>
        <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
          About roles
        </p>
        <p className="mt-2 text-[14px] leading-relaxed text-[#4B5563]">
          Roles define permission groups for employees. After creating a role, assign features and
          map users from employee management screens.
        </p>
      </div>
      <div className={`${zohoPanelCls()} p-4`}>
        <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
          Naming rules
        </p>
        <ul className="mt-3 space-y-3">
          {GUIDE_ITEMS.map((item) => (
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
            New roles appear in feature assignment and employee management once saved.
          </p>
        </div>
      </div>
    </div>
  );

  const rolesListContent = (
    <>
      {listError ? (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-4 py-3 text-[14px] text-[#D93025] lg:mx-0 lg:mb-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{listError}</span>
        </div>
      ) : null}

      {listLoading && !listError ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-[#6B7280]">
          <Loader2 className="h-9 w-9 animate-spin text-[#008CD3]" />
          <p className="text-[15px]">Loading roles…</p>
        </div>
      ) : null}

      {!listLoading && !listError && roles.length === 0 ? (
        <div className="mx-4 mt-4 rounded-xl border border-dashed border-[#E4E7EC] bg-white px-6 py-16 text-center lg:mx-0">
          <Shield className="mx-auto h-10 w-10 text-[#9CA3AF]" />
          <p className="mt-4 text-[17px] font-semibold text-[#1F2937]">No roles yet</p>
          <p className="mt-2 text-[14px] text-[#6B7280]">
            Create your first role using the Create tab or the form on the left.
          </p>
          <button
            type="button"
            onClick={() => setMobileMainTab("create")}
            className={`mt-6 ${zohoPrimaryBtnCls()}`}
          >
            <ShieldPlus className="h-4 w-4" aria-hidden />
            Create role
          </button>
        </div>
      ) : null}

      {!listLoading && !listError && roles.length > 0 ? (
        <>
          <ul className="mt-1 divide-y divide-[#E4E7EC] border-t border-[#E4E7EC] bg-white lg:hidden">
            {filteredRoles.length === 0 ? (
              <li className="px-4 py-12 text-center text-[15px] text-[#6B7280]">
                No roles match your search.
              </li>
            ) : (
              filteredRoles.map((role) => {
                const displayName = formatRoleDisplay(role.role_name);
                const rawName = String(role.role_name ?? displayName);
                return (
                  <li key={String(role.id)}>
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${roleColorClass(rawName)}`}
                      >
                        {roleInitials(rawName)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[16px] font-medium text-[#1F2937]">
                          {displayName}
                        </p>
                        <p className="text-[13px] text-[#9CA3AF]">ID {String(role.id)}</p>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(role)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#008CD3] active:bg-[#E8F4FB]"
                          aria-label={`Edit ${displayName}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openDelete(role)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#FFCDD2] text-[#C62828] active:bg-[#FFECEC]"
                          aria-label={`Delete ${displayName}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })
            )}
          </ul>

          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="px-6 py-3 font-semibold text-[#0C123A]">Role</th>
                  <th className="hidden px-6 py-3 font-semibold text-[#0C123A] sm:table-cell">
                    ID
                  </th>
                  <th className="px-6 py-3 text-right font-semibold text-[#0C123A]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoles.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                      No roles match your search.
                    </td>
                  </tr>
                ) : (
                  filteredRoles.map((role) => (
                    <tr key={String(role.id)} className="border-b border-slate-100 last:border-0">
                      <td className="px-6 py-4 font-medium text-[#0C123A]">
                        {formatRoleDisplay(role.role_name)}
                      </td>
                      <td className="hidden px-6 py-4 text-slate-500 sm:table-cell">{role.id}</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(role)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#0C123A] shadow-sm transition hover:border-[#C99237]/50 hover:bg-[#C99237]/5"
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => openDelete(role)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </>
  );

  return (
    <div className="min-h-full bg-[#F5F7FA] pb-28 lg:space-y-6 lg:bg-transparent lg:pb-0">
      {/* Mobile & tablet */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-20 border-b border-[#E4E7EC] bg-white shadow-sm">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
              <Shield className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[17px] font-semibold text-[#1F2937]">Organization roles</h1>
              <p className="truncate text-[13px] text-[#6B7280]">{orgName}</p>
            </div>
            <button
              type="button"
              onClick={() => void loadRoles(true)}
              disabled={listLoading || listRefreshing || orgMissing}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#008CD3] active:bg-[#F5F7FA] disabled:opacity-50"
              aria-label="Refresh roles"
            >
              <RefreshCw
                className={`h-5 w-5 ${listLoading || listRefreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          <div className="px-4 pb-3">
            <div className="flex rounded-lg bg-[#F5F7FA] p-1">
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
                      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] ${
                        mobileMainTab === tab.id
                          ? "bg-[#E8F4FB] text-[#008CD3]"
                          : "bg-[#E4E7EC] text-[#6B7280]"
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
            <div className="border-t border-[#E4E7EC] px-4 py-2.5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="search"
                  value={roleSearchQuery}
                  onChange={(e) => setRoleSearchQuery(e.target.value)}
                  placeholder="Search roles"
                  className={zohoSearchCls()}
                />
              </div>
            </div>
          ) : null}
        </div>

        {mobileMainTab === "roles" ? <div>{rolesListContent}</div> : null}

        {mobileMainTab === "create" ? (
          <div className="p-4">
            {createStatusBanner ? <div className="mb-4">{createStatusBanner}</div> : null}
            <form
              id="create-role-mobile-form"
              onSubmit={submitCreate}
              className={`${zohoPanelCls()} space-y-4 p-4`}
            >
              {createFormFields(true)}
            </form>
          </div>
        ) : null}

        {mobileMainTab === "guide" ? <div className="p-4">{guidePanel}</div> : null}

        {mobileMainTab === "create" ? (
          <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 border-t border-[#E4E7EC] bg-white px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
            <div className="flex gap-2">
              <button type="button" onClick={clearCreateForm} className={zohoSecondaryBtnCls(true)}>
                Clear
              </button>
              <button
                type="submit"
                form="create-role-mobile-form"
                disabled={createSaving || orgMissing}
                className={zohoPrimaryBtnCls(true)}
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

      {/* Desktop */}
      <div className="hidden space-y-6 lg:block">
        <div className={`${zohoPanelCls()} p-6 sm:p-8`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#C99237]/12">
                <Shield className="h-6 w-6 text-[#C99237]" aria-hidden />
              </span>
              <div>
                <h1 className="text-xl font-bold text-[#0C123A] sm:text-2xl">Organization roles</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Create, view, rename, or remove roles for{" "}
                  <span className="font-medium text-slate-700">{orgName}</span>.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void loadRoles(true)}
              disabled={listLoading || listRefreshing || orgMissing}
              className={zohoSecondaryBtnCls()}
            >
              <RefreshCw
                className={`h-4 w-4 ${listLoading || listRefreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-4">
            <div className={`${zohoPanelCls()} p-6`}>
              <div className="mb-4 flex items-center gap-2">
                <ShieldPlus className="h-5 w-5 text-[#008CD3]" aria-hidden />
                <h2 className="text-lg font-bold text-[#0C123A]">Create role</h2>
              </div>
              {createStatusBanner ? <div className="mb-4">{createStatusBanner}</div> : null}
              <form onSubmit={submitCreate} className="space-y-4">
                {createFormFields(false)}
                <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                  <button type="button" onClick={clearCreateForm} className={zohoSecondaryBtnCls()}>
                    Clear
                  </button>
                  <button
                    type="submit"
                    disabled={createSaving || orgMissing}
                    className={zohoPrimaryBtnCls()}
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

          <div className={`${zohoPanelCls()} lg:col-span-8`}>
            <div className="border-b border-slate-100 px-6 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#0C123A]">All roles</h2>
                  <p className="text-sm text-slate-500">
                    {roles.length} role{roles.length === 1 ? "" : "s"} in this organization
                  </p>
                </div>
                <div className="relative w-full sm:max-w-xs">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    type="search"
                    value={roleSearchQuery}
                    onChange={(e) => setRoleSearchQuery(e.target.value)}
                    placeholder="Search roles"
                    className={zohoSearchCls()}
                  />
                </div>
              </div>
            </div>
            <div className="p-0">{rolesListContent}</div>
          </div>
        </div>
      </div>

      {/* Edit role modal */}
      {editRole && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-role-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#1F2937]/40 backdrop-blur-[1px] sm:bg-[#0C123A]/40 sm:backdrop-blur-[2px]"
            aria-label="Close dialog"
            onClick={() => !editSaving && setEditRole(null)}
          />
          <div className="relative z-10 flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-[#E4E7EC] bg-white shadow-2xl sm:rounded-2xl sm:border-slate-200 sm:p-6 sm:shadow-xl">
            <div className="shrink-0 border-b border-[#E4E7EC] px-4 py-4 sm:border-0 sm:p-0 sm:[border-top:3px_solid_#008CD3]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2
                    id="edit-role-title"
                    className="text-[17px] font-semibold text-[#1F2937] sm:text-lg sm:font-bold sm:text-[#0C123A]"
                  >
                    Edit role
                  </h2>
                  <p className="mt-1 text-[13px] text-[#6B7280] sm:text-sm sm:text-slate-500">
                    Saved in lowercase for your organization.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={editSaving}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-[#6B7280] active:bg-[#F5F7FA]"
                  aria-label="Close"
                  onClick={() => setEditRole(null)}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-0">
              {editError && (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2 text-[14px] text-[#D93025]">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  {editError}
                </div>
              )}
              <form onSubmit={submitEdit} className="space-y-4">
                <div>
                  <label htmlFor="edit-role-name" className={labelCls(true)}>
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
                <div className="flex flex-col-reverse gap-2 border-t border-[#E4E7EC] pt-4 sm:flex-row sm:justify-end sm:border-0">
                  <button
                    type="button"
                    disabled={editSaving}
                    onClick={() => setEditRole(null)}
                    className={zohoSecondaryBtnCls(true)}
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={editSaving} className={zohoPrimaryBtnCls()}>
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

      {/* Delete confirmation modal */}
      {deleteRole && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-role-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#1F2937]/40 backdrop-blur-[1px] sm:bg-[#0C123A]/40 sm:backdrop-blur-[2px]"
            aria-label="Close dialog"
            onClick={() => !deleteSaving && setDeleteRole(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-t-2xl border border-[#E4E7EC] bg-white p-4 shadow-2xl sm:rounded-2xl sm:border-slate-200 sm:p-6 sm:shadow-xl">
            <div className="mb-4 flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFECEC]">
                <AlertTriangle className="h-5 w-5 text-[#C62828]" aria-hidden />
              </span>
              <div>
                <h2
                  id="delete-role-title"
                  className="text-[17px] font-semibold text-[#1F2937] sm:text-lg sm:font-bold sm:text-[#0C123A]"
                >
                  Delete role?
                </h2>
                <p className="mt-2 text-[14px] text-[#4B5563] sm:text-sm sm:text-slate-600">
                  This will permanently remove{" "}
                  <strong>{formatRoleDisplay(deleteRole.role_name)}</strong> (ID {deleteRole.id})
                  from {orgName}. Users assigned only to this role may be affected.
                </p>
              </div>
            </div>
            {deleteError && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2 text-[14px] text-[#D93025]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {deleteError}
              </div>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={deleteSaving}
                onClick={() => setDeleteRole(null)}
                className={zohoSecondaryBtnCls(true)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteSaving}
                onClick={() => void confirmDelete()}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#D93025] px-4 py-2 text-[15px] font-medium text-white transition hover:bg-[#B71C1C] disabled:opacity-50 sm:w-auto sm:bg-red-600 sm:text-sm sm:font-bold sm:hover:bg-red-700"
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
