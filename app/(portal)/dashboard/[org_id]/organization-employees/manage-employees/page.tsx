"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  Star,
  MessageCircle,
  MoreHorizontal,
  Users,
  AtSign,
  Phone,
  X,
  Search,
  Loader2,
  AlertCircle,
  CalendarDays,
  Pencil,
  Trash2,
  Shield,
} from "lucide-react";
import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import {
  deleteOrgUser,
  getAllOrgUsers,
  getOrganizationRoles,
  updateUserDetails,
  updateUserRoleAssignment,
  type OrgUserRow,
  type OrgRoleRow,
} from "@/services/adminUser";

type EmployeeTier = "employees" | "management";

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
  avatarSeed: string;
};

const ACCENT = "#0d9488";
const ACCENT_SOFT = "rgba(13, 148, 136, 0.12)";
const PASSWORD_MIN = 8;

function avatarUrl(seed: string) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
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

function mapApiUserToCard(row: OrgUserRow): EmployeeCard {
  const id = row.id != null ? String(row.id) : "";
  const email = String(row.user_email ?? "");
  const roleRaw = row.role_name ?? row.user_role_name;
  const roleLabel = formatRoleLabel(roleRaw);
  return {
    id,
    empCode: id ? `U-${id}` : "—",
    name: String(row.user_name ?? "Unknown"),
    roleLabel,
    memberSince: formatMemberSince(row.created_at),
    email,
    phone: row.user_phone != null && String(row.user_phone).trim() !== "" ? String(row.user_phone) : "—",
    status: "in",
    tier: isManagementRole(roleRaw) ? "management" : "employees",
    avatarSeed: email || id || "user",
  };
}

function findRow(rows: OrgUserRow[], userId: string) {
  return rows.find((r) => String(r.id) === userId);
}

function inputCls() {
  return "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20";
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
  const viewerIsAdmin = viewerRole === "admin";

  const [userRows, setUserRows] = useState<OrgUserRow[]>([]);
  const [tab, setTab] = useState<EmployeeTier>("employees");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());

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

  const [deleteRow, setDeleteRow] = useState<OrgUserRow | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
      setUserRows(rows);
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
    function onDoc(e: MouseEvent) {
      if (!menuUserId) return;
      const t = e.target as HTMLElement;
      if (t.closest("[data-employee-menu]")) return;
      setMenuUserId(null);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuUserId]);

  useEffect(() => {
    if (!roleRow || !organizationIdNum || Number.isNaN(organizationIdNum)) {
      setRoleOptions([]);
      return;
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

  const baseList = useMemo(() => allCards.filter((e) => e.tier === tab), [allCards, tab]);

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

  async function confirmDeleteUser() {
    if (!deleteRow?.id) return;
    const token = localStorage.getItem("token");
    if (!token) {
      setDeleteError("Not signed in.");
      return;
    }
    if (Number.isNaN(organizationIdNum)) {
      setDeleteError("Invalid organization.");
      return;
    }
    setDeleteSaving(true);
    setDeleteError(null);
    try {
      await deleteOrgUser(token, deleteRow.id, organizationIdNum);
      setDeleteRow(null);
      setMenuUserId(null);
      await loadUsers();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleteSaving(false);
    }
  }

  return (
    <div className="min-h-full bg-slate-100/90 pb-10 [font-family:var(--font-inter),system-ui,sans-serif]">
      <div className="mx-auto max-w-6xl px-4 pt-6 md:max-w-7xl md:px-6">
        {listError && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
            <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
              <span>{listError}</span>
              <button
                type="button"
                onClick={() => void loadUsers()}
                className="rounded-md border border-red-200 bg-white px-2 py-1 text-xs font-semibold text-red-800 hover:bg-red-100/80"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-8 border-b border-slate-200/80 bg-white/60 px-1">
          {(
            [
              { id: "employees" as const, label: "Employees" },
              { id: "management" as const, label: "Management" },
            ] as const
          ).map((t) => (
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

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
          <div className="mt-16 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" aria-hidden />
            <p className="text-sm">Loading team members…</p>
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((emp) => {
                const fav = favorites.has(emp.id);
                const row = findRow(userRows, emp.id);
                const menuOpen = menuUserId === emp.id;
                return (
                  <article
                    key={emp.id}
                    className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="relative px-4 pb-3 pt-3">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-2">
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
                          {menuOpen && row && (
                            <div
                              role="menu"
                              className="absolute right-0 top-full z-30 mt-1 min-w-[180px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                            >
                              <button
                                type="button"
                                role="menuitem"
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                onClick={() => {
                                  openEditModal(row);
                                  setMenuUserId(null);
                                }}
                              >
                                <Pencil className="h-4 w-4 text-teal-600" aria-hidden />
                                Edit
                              </button>
                              {viewerIsAdmin && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                                  onClick={() => {
                                    setDeleteRow(row);
                                    setDeleteError(null);
                                    setMenuUserId(null);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" aria-hidden />
                                  Delete
                                </button>
                              )}
                              <button
                                type="button"
                                role="menuitem"
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                onClick={() => {
                                  openRoleModal(row);
                                  setMenuUserId(null);
                                }}
                              >
                                <Shield className="h-4 w-4 text-teal-600" aria-hidden />
                                Update role
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 flex flex-col items-center">
                        <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-slate-100 bg-slate-50">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={avatarUrl(emp.avatarSeed)}
                            alt=""
                            width={96}
                            height={96}
                            className="h-full w-full object-cover object-top"
                          />
                        </div>
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

                    <div className="space-y-2.5 border-t border-slate-100 bg-slate-50/50 px-4 py-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                        <span className="min-w-0 font-medium" style={{ color: ACCENT }}>
                          {emp.roleLabel}
                        </span>
                      </div>
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
                  </article>
                );
              })}
            </div>

            {!listError && filtered.length === 0 && (
              <p className="mt-12 text-center text-sm text-slate-500">
                No members in this tab{search.trim() ? " match your search" : ""}.
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

      {/* Delete confirm */}
      {deleteRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-user-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
            aria-label="Close"
            onClick={() => !deleteSaving && setDeleteRow(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 id="delete-user-title" className="text-lg font-bold text-red-800">
              Delete user?
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              This will permanently remove{" "}
              <strong className="text-slate-900">{deleteRow.user_name}</strong> (
              {deleteRow.user_email}). This cannot be undone.
            </p>
            {deleteError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {deleteError}
              </div>
            )}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={deleteSaving}
                onClick={() => setDeleteRow(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteSaving}
                onClick={() => void confirmDeleteUser()}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleteSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Delete user
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
