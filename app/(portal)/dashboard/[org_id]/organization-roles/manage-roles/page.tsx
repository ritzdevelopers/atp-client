"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  Users,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  AlertTriangle,
  RefreshCw,
  Search,
  Shield,
} from "lucide-react";
import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import {
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

function zohoPrimaryBtnCls() {
  return "inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-[#008CD3] px-4 py-2 text-[14px] font-medium text-white transition active:scale-[0.98] hover:bg-[#0070AA] disabled:pointer-events-none disabled:opacity-50 lg:bg-[#C99237] lg:text-sm lg:font-bold lg:text-[#0C123A] lg:hover:bg-[#b87d2e]";
}

function zohoSecondaryBtnCls(full = false) {
  return `inline-flex min-h-[40px] items-center justify-center rounded-lg border border-[#E4E7EC] bg-white px-4 py-2 text-[14px] font-medium text-[#1F2937] transition active:scale-[0.98] hover:bg-[#F5F7FA] disabled:pointer-events-none disabled:opacity-50 lg:border-slate-200 lg:text-sm lg:font-semibold lg:text-[#0C123A] lg:shadow-sm lg:hover:bg-slate-50 ${full ? "w-full" : ""}`;
}

function formatRoleDisplay(name: string | undefined) {
  if (!name) return "—";
  return name.replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ManageRolesPage() {
  const params = useParams();
  const orgIdParam = params?.org_id;
  const ctx = useManagementDashboardContext();

  const [roles, setRoles] = useState<OrgRoleRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [roleSearchQuery, setRoleSearchQuery] = useState("");
  const [mobileMainTab, setMobileMainTab] = useState<"roles" | "overview">("roles");

  const [editRole, setEditRole] = useState<OrgRoleRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteRole, setDeleteRole] = useState<OrgRoleRow | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const editInputRef = useRef<HTMLInputElement>(null);

  const organizationIdNum =
    ctx?.organization?.id != null ? Number(ctx.organization.id) : Number(orgIdParam);
  const orgName = ctx?.organization?.org_name?.trim() || `Organization ${orgIdParam ?? ""}`;
  const orgMissing = !organizationIdNum || Number.isNaN(organizationIdNum);

  const loadRoles = useCallback(async () => {
    if (orgMissing) {
      setListLoading(false);
      setListError("Missing organization.");
      setRoles([]);
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setListLoading(false);
      setListError("Not signed in.");
      setRoles([]);
      return;
    }
    setListError(null);
    setListLoading(true);
    try {
      const list = await getOrganizationRoles(token, organizationIdNum);
      setRoles(list);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Failed to load roles");
      setRoles([]);
    } finally {
      setListLoading(false);
    }
  }, [organizationIdNum, orgMissing]);

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
    let cancelled = false;

    async function run() {
      await Promise.resolve();
      if (cancelled) return;
      await loadRoles();
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [loadRoles]);

  useEffect(() => {
    if (!editRole) return;
    const t = requestAnimationFrame(() => editInputRef.current?.focus());
    return () => cancelAnimationFrame(t);
  }, [editRole]);

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
      await loadRoles();
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
      await loadRoles();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleteSaving(false);
    }
  }

  const mobileTabs = [
    { id: "roles" as const, label: "Roles", count: roles.length },
    { id: "overview" as const, label: "Overview" },
  ];

  return (
    <div className="min-h-full bg-[#F5F7FA] lg:bg-transparent lg:space-y-6 lg:pb-0">
      {/* Mobile & tablet: Zoho admin portal style */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-20 border-b border-[#E4E7EC] bg-white shadow-sm">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
              <Users className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[17px] font-semibold text-[#1F2937]">Manage roles</h1>
              <p className="truncate text-[13px] text-[#6B7280]">{orgName}</p>
            </div>
            <button
              type="button"
              onClick={() => void loadRoles()}
              disabled={listLoading || orgMissing}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#008CD3] active:bg-[#F5F7FA] disabled:opacity-50"
              aria-label="Refresh roles"
            >
              <RefreshCw className={`h-5 w-5 ${listLoading ? "animate-spin" : ""}`} />
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

        {listError ? (
          <div className="mx-4 mt-3 flex items-start gap-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-4 py-3 text-[14px] text-[#D93025]">
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

        {!listLoading && !listError && mobileMainTab === "overview" ? (
          <div className="space-y-3 p-4">
            <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Total roles
              </p>
              <p className="mt-1 text-3xl font-semibold text-[#1F2937]">{roles.length}</p>
              <p className="mt-1 text-[14px] text-[#6B7280]">
                Permission groups for {orgName}.
              </p>
            </div>
            <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Quick actions
              </p>
              <ul className="mt-3 space-y-3 text-[14px] text-[#4B5563]">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E8F4FB] text-[12px] font-semibold text-[#008CD3]">
                    1
                  </span>
                  Tap a role under Roles to rename or remove it.
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E8F4FB] text-[12px] font-semibold text-[#008CD3]">
                    2
                  </span>
                  Role names are stored in lowercase in the system.
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E8F4FB] text-[12px] font-semibold text-[#008CD3]">
                    3
                  </span>
                  Deleting a role may affect users assigned only to that role.
                </li>
              </ul>
            </div>
          </div>
        ) : null}

        {!listLoading && !listError && mobileMainTab === "roles" && roles.length === 0 ? (
          <div className="mx-4 mt-4 rounded-xl border border-dashed border-[#E4E7EC] bg-white px-6 py-16 text-center">
            <Shield className="mx-auto h-10 w-10 text-[#9CA3AF]" />
            <p className="mt-4 text-[17px] font-semibold text-[#1F2937]">No roles found</p>
            <p className="mt-2 text-[14px] text-[#6B7280]">
              Create roles from the Create role screen first.
            </p>
          </div>
        ) : null}

        {!listLoading && !listError && mobileMainTab === "roles" && roles.length > 0 ? (
          <ul className="mt-1 divide-y divide-[#E4E7EC] border-t border-[#E4E7EC] bg-white">
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
        ) : null}
      </div>

      {/* Desktop layout (unchanged) */}
      <div className="hidden space-y-6 lg:block">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#C99237]/12">
                <Users className="h-6 w-6 text-[#C99237]" aria-hidden />
              </span>
              <div>
                <h1 className="text-xl font-bold text-[#0C123A] sm:text-2xl">Manage roles</h1>
                <p className="mt-1 text-sm text-slate-500">
                  View, rename, or remove roles for{" "}
                  <span className="font-medium text-slate-700">{orgName}</span>.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void loadRoles()}
              disabled={listLoading || orgMissing}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#0C123A] shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              {listLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Refreshing…
                </>
              ) : (
                "Refresh list"
              )}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm">
          {listError && (
            <div className="flex items-start gap-2 border-b border-red-100 bg-red-50 px-6 py-4 text-sm text-red-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
              <span>{listError}</span>
            </div>
          )}

          {listLoading && !listError ? (
            <div className="flex items-center justify-center gap-2 px-6 py-16 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              Loading roles…
            </div>
          ) : roles.length === 0 && !listError ? (
            <p className="px-6 py-16 text-center text-sm text-slate-500">
              No roles found for this organization.
            </p>
          ) : (
            <div className="overflow-x-auto">
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
                  {roles.map((role) => (
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit role modal — Zoho bottom sheet on mobile */}
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
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#008CD3] sm:hidden">
                    Edit role
                  </p>
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
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-[#6B7280] active:bg-[#F5F7FA] sm:rounded-lg sm:p-1 sm:text-slate-400 sm:hover:bg-slate-100 sm:hover:text-[#0C123A]"
                  aria-label="Close"
                  onClick={() => setEditRole(null)}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-0 sm:py-0">
              {editError && (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2 text-[14px] text-[#D93025] sm:border-red-200 sm:bg-red-50 sm:text-sm sm:text-red-900">
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
                <div className="flex flex-col-reverse gap-2 border-t border-[#E4E7EC] pt-4 sm:flex-row sm:justify-end sm:border-0 sm:pt-2">
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

      {/* Delete confirmation modal — Zoho bottom sheet on mobile */}
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
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFECEC] sm:bg-red-100">
                <AlertTriangle className="h-5 w-5 text-[#C62828] sm:text-red-600" aria-hidden />
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
                  <strong className="text-[#1F2937] sm:text-[#0C123A]">
                    {formatRoleDisplay(deleteRole.role_name)}
                  </strong>{" "}
                  (ID {deleteRole.id}) from {orgName}. Users assigned only to this role may be
                  affected.
                </p>
              </div>
            </div>
            {deleteError && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2 text-[14px] text-[#D93025] sm:border-red-200 sm:bg-red-50 sm:text-sm sm:text-red-900">
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
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#D93025] px-4 py-2 text-[15px] font-medium text-white transition active:scale-[0.98] hover:bg-[#B71C1C] disabled:opacity-50 sm:w-auto sm:bg-red-600 sm:text-sm sm:font-bold sm:hover:bg-red-700"
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
