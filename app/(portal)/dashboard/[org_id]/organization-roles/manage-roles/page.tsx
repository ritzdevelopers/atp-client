"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  Users,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  AlertTriangle,
} from "lucide-react";
import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import {
  deleteOrganizationRole,
  getOrganizationRoles,
  updateOrganizationRole,
  type OrgRoleRow,
} from "@/services/adminUser";

function labelCls() {
  return "mb-1.5 block text-sm font-medium text-[#0C123A]";
}

function inputCls() {
  return "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#0C123A] shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#C99237] focus:ring-2 focus:ring-[#C99237]/20";
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

  return (
    <div className="space-y-6">
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
          <p className="px-6 py-16 text-center text-sm text-slate-500">No roles found for this organization.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="px-6 py-3 font-semibold text-[#0C123A]">Role</th>
                  <th className="hidden px-6 py-3 font-semibold text-[#0C123A] sm:table-cell">ID</th>
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

      {/* Edit role modal */}
      {editRole && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-role-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#0C123A]/40 backdrop-blur-[2px]"
            aria-label="Close dialog"
            onClick={() => !editSaving && setEditRole(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 id="edit-role-title" className="text-lg font-bold text-[#0C123A]">
                Edit role
              </h2>
              <button
                type="button"
                disabled={editSaving}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-[#0C123A] disabled:opacity-50"
                aria-label="Close"
                onClick={() => setEditRole(null)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-sm text-slate-500">
              Update the display name. It will be saved in lowercase for your organization.
            </p>
            {editError && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
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
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={editSaving}
                  onClick={() => setEditRole(null)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#0C123A] shadow-sm hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#C99237] px-4 py-2 text-sm font-bold text-[#0C123A] shadow-sm hover:bg-[#b87d2e] disabled:opacity-60"
                >
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
      )}

      {/* Delete confirmation modal */}
      {deleteRole && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-role-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#0C123A]/40 backdrop-blur-[2px]"
            aria-label="Close dialog"
            onClick={() => !deleteSaving && setDeleteRole(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" aria-hidden />
              </span>
              <div>
                <h2 id="delete-role-title" className="text-lg font-bold text-[#0C123A]">
                  Delete role?
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  This will permanently remove the role{" "}
                  <strong className="text-[#0C123A]">
                    {formatRoleDisplay(deleteRole.role_name)}
                  </strong>{" "}
                  (ID {deleteRole.id}) from {orgName}. Users assigned only to this role may be
                  affected. This cannot be undone.
                </p>
              </div>
            </div>
            {deleteError && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {deleteError}
              </div>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={deleteSaving}
                onClick={() => setDeleteRole(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#0C123A] shadow-sm hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteSaving}
                onClick={() => void confirmDelete()}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-60"
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
