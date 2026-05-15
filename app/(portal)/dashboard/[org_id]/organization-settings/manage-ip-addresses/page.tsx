"use client";

import { useCallback, useEffect, useMemo, useState, startTransition } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  GlobeLock,
  Loader2,
  AlertCircle,
  ListChecks,
  Pencil,
  Trash2,
  Calendar,
  User,
  Network,
  Search,
  UserPlus,
  UserMinus,
  RefreshCw,
  Users,
} from "lucide-react";
import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import {
  type CompanyIpRow,
  assignIpToEmployee,
  deleteCompanyIPAddress,
  getCompanyIPAddresses,
  unassignIpFromEmployee,
  updateCompanyIPAddressLabel,
} from "@/services/organizationSettings";
import { getAllOrgUsers, type OrgUserRow } from "@/services/adminUser";

function labelCls() {
  return "mb-1.5 block text-sm font-medium text-[#0C123A]";
}

function inputCls() {
  return "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#0C123A] shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#C99237] focus:ring-2 focus:ring-[#C99237]/20";
}

function formatCreatedAt(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function parseAssignedIpEntries(raw: unknown): Array<{ ip_id?: number | string | null }> {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw as Array<{ ip_id?: number | string | null }>;
  }
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw) as unknown;
      return Array.isArray(p) ? (p as Array<{ ip_id?: number | string | null }>) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function userHasThisOrgIp(user: OrgUserRow, ipId: number): boolean {
  return parseAssignedIpEntries(user.assigned_ips).some((e) => Number(e.ip_id) === Number(ipId));
}

export default function ManageIPAddressesPage() {
  const params = useParams();
  const orgIdParam = params?.org_id;
  const ctx = useManagementDashboardContext();

  const [rows, setRows] = useState<CompanyIpRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  /** True while re-fetching without replacing the list with the full-page loader. */
  const [listRefreshing, setListRefreshing] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [editRow, setEditRow] = useState<CompanyIpRow | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteRow, setDeleteRow] = useState<CompanyIpRow | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [assignIpRow, setAssignIpRow] = useState<CompanyIpRow | null>(null);
  const [assignUsers, setAssignUsers] = useState<OrgUserRow[]>([]);
  const [assignUsersLoading, setAssignUsersLoading] = useState(false);
  const [assignModalError, setAssignModalError] = useState<string | null>(null);
  const [assignSearch, setAssignSearch] = useState("");
  const [assignBusy, setAssignBusy] = useState<{
    userId: number | string;
    op: "assign" | "unassign";
  } | null>(null);

  const organizationIdNum =
    ctx?.organization?.id != null ? Number(ctx.organization.id) : Number(orgIdParam);
  const orgName = ctx?.organization?.org_name?.trim() || `Organization ${orgIdParam ?? ""}`;
  const orgMissing = !organizationIdNum || Number.isNaN(organizationIdNum);
  const basePath = `/dashboard/${orgIdParam ?? ""}/organization-settings`;

  const loadList = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent === true;
      if (orgMissing) {
        setListLoading(false);
        setListRefreshing(false);
        setRows([]);
        return;
      }
      const token = localStorage.getItem("token");
      if (!token) {
        setListError("Not signed in.");
        setListLoading(false);
        setListRefreshing(false);
        setRows([]);
        return;
      }
      setListError(null);
      if (silent) setListRefreshing(true);
      else setListLoading(true);
      try {
        const data = await getCompanyIPAddresses(token, organizationIdNum);
        setRows(data);
      } catch (err) {
        setListError(err instanceof Error ? err.message : "Could not load IP addresses.");
        setRows([]);
      } finally {
        if (silent) setListRefreshing(false);
        else setListLoading(false);
      }
    },
    [orgMissing, organizationIdNum],
  );

  useEffect(() => {
    startTransition(() => {
      void loadList();
    });
  }, [loadList]);

  function openEdit(row: CompanyIpRow) {
    setEditError(null);
    setEditRow(row);
    setEditLabel(row.label?.trim() ? row.label : "");
  }

  function closeEdit() {
    if (editSubmitting) return;
    setEditRow(null);
    setEditLabel("");
    setEditError(null);
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editRow) return;
    const trimmed = editLabel.trim();
    if (!trimmed) {
      setEditError("Label is required.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setEditError("Not signed in.");
      return;
    }
    setEditSubmitting(true);
    setEditError(null);
    try {
      await updateCompanyIPAddressLabel(token, {
        org_id: organizationIdNum,
        ip_id: editRow.id,
        label: trimmed,
      });
      closeEdit();
      await loadList();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setEditSubmitting(false);
    }
  }

  function openDelete(row: CompanyIpRow) {
    setDeleteError(null);
    setDeleteRow(row);
  }

  function closeDelete() {
    if (deleteSubmitting) return;
    setDeleteRow(null);
    setDeleteError(null);
  }

  async function confirmDelete() {
    if (!deleteRow) return;
    const token = localStorage.getItem("token");
    if (!token) {
      setDeleteError("Not signed in.");
      return;
    }
    setDeleteSubmitting(true);
    setDeleteError(null);
    try {
      await deleteCompanyIPAddress(token, {
        org_id: organizationIdNum,
        ip_id: deleteRow.id,
      });
      closeDelete();
      await loadList();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleteSubmitting(false);
    }
  }

  const filteredAssignUsers = useMemo(() => {
    const q = assignSearch.trim().toLowerCase();
    if (!q) return assignUsers;
    return assignUsers.filter((u) => {
      const name = String(u.user_name ?? "").toLowerCase();
      const mail = String(u.user_email ?? "").toLowerCase();
      return name.includes(q) || mail.includes(q);
    });
  }, [assignUsers, assignSearch]);

  function closeAssignToEmployeeModal() {
    if (assignBusy) return;
    setAssignIpRow(null);
    setAssignUsers([]);
    setAssignUsersLoading(false);
    setAssignModalError(null);
    setAssignSearch("");
  }

  const loadAssignModalUsers = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setAssignModalError("Not signed in.");
      setAssignUsers([]);
      setAssignUsersLoading(false);
      return;
    }
    setAssignModalError(null);
    setAssignUsersLoading(true);
    try {
      const list = await getAllOrgUsers(token);
      setAssignUsers(Array.isArray(list) ? list : []);
    } catch (err) {
      setAssignUsers([]);
      setAssignModalError(err instanceof Error ? err.message : "Could not load members.");
    } finally {
      setAssignUsersLoading(false);
    }
  }, []);

  function openAssignToEmployeeModal(row: CompanyIpRow) {
    setAssignIpRow(row);
    setAssignModalError(null);
    setAssignSearch("");
    void loadAssignModalUsers();
  }

  async function submitAssignIp(user: OrgUserRow) {
    const ipRow = assignIpRow;
    if (!ipRow || user.id == null) return;
    const uid = user.id;
    const token = localStorage.getItem("token");
    if (!token) {
      setAssignModalError("Not signed in.");
      return;
    }
    setAssignBusy({ userId: uid, op: "assign" });
    setAssignModalError(null);
    try {
      await assignIpToEmployee(token, { employee_id: uid, ip_id: ipRow.id });
      await loadAssignModalUsers();
      await loadList({ silent: true });
    } catch (err) {
      setAssignModalError(err instanceof Error ? err.message : "Assign failed.");
    } finally {
      setAssignBusy(null);
    }
  }

  async function submitUnassignIp(user: OrgUserRow) {
    const ipRow = assignIpRow;
    if (!ipRow || user.id == null) return;
    const uid = user.id;
    const token = localStorage.getItem("token");
    if (!token) {
      setAssignModalError("Not signed in.");
      return;
    }
    setAssignBusy({ userId: uid, op: "unassign" });
    setAssignModalError(null);
    try {
      await unassignIpFromEmployee(token, { employee_id: uid, ip_id: ipRow.id });
      await loadAssignModalUsers();
      await loadList({ silent: true });
    } catch (err) {
      setAssignModalError(err instanceof Error ? err.message : "Unassign failed.");
    } finally {
      setAssignBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#C99237]/12">
              <ListChecks className="h-6 w-6 text-[#C99237]" aria-hidden />
            </span>
            <div>
              <h1 className="text-xl font-bold text-[#0C123A] sm:text-2xl">Manage IP addresses</h1>
              <p className="mt-1 text-sm text-slate-500">
                View and maintain allowed network addresses for{" "}
                <span className="font-medium text-slate-700">{orgName}</span>.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => void loadList({ silent: true })}
              disabled={orgMissing || listLoading || listRefreshing}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0C123A] shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Refresh IP address list"
            >
              <RefreshCw
                className={`h-4 w-4 ${listRefreshing ? "animate-spin" : ""}`}
                aria-hidden
              />
              Refresh
            </button>
            <Link
              href={`${basePath}/create-new-ip-address`}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#C99237] px-4 py-2.5 text-sm font-bold text-[#0C123A] shadow-sm transition hover:bg-[#b87d2e]"
            >
              <GlobeLock className="h-4 w-4" aria-hidden />
              Add IP address
            </Link>
          </div>
        </div>
      </div>

      <div
        className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8"
        aria-busy={listRefreshing ? "true" : undefined}
      >
        {listError && (
          <div
            className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
            <span>{listError}</span>
          </div>
        )}

        {orgMissing && (
          <p className="text-sm text-slate-500">Invalid organization context.</p>
        )}

        {!orgMissing && listLoading && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-[#C99237]" aria-hidden />
            <p className="text-sm">Loading IP addresses…</p>
          </div>
        )}

        {!orgMissing && !listLoading && !listError && rows.length === 0 && (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-14 text-center">
            <Network className="mb-3 h-10 w-10 text-slate-300" aria-hidden />
            <p className="text-sm font-medium text-[#0C123A]">No IP addresses yet</p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Add your first office or VPN exit address so attendance can be tied to trusted
              networks.
            </p>
            <Link
              href={`${basePath}/create-new-ip-address`}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#C99237] px-4 py-2 text-sm font-bold text-[#0C123A] shadow-sm hover:bg-[#b87d2e]"
            >
              <GlobeLock className="h-4 w-4" aria-hidden />
              Add IP address
            </Link>
          </div>
        )}

        {!orgMissing && !listLoading && rows.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((row) => (
              <li
                key={String(row.id)}
                className="flex flex-col rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:border-[#C99237]/40 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      IP address
                    </p>
                    <p className="mt-0.5 truncate font-mono text-base font-semibold text-[#0C123A]">
                      {row.ip_address}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
                    ID: {row.id}
                  </span>
                </div>

                <dl className="mt-3 space-y-2 text-sm">
                  <div>
                    <dt className="text-xs font-medium text-slate-400">Label</dt>
                    <dd className="text-[#0C123A]">{row.label?.trim() ? row.label : "—"}</dd>
                  </div>
                  <div className="flex items-start gap-2 text-slate-600">
                    <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                    <div>
                      <dt className="text-xs font-medium text-slate-400">Created</dt>
                      <dd>{formatCreatedAt(row.created_at)}</dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-slate-600">
                    <User className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                    <div>
                      <dt className="text-xs font-medium text-slate-400">Added by</dt>
                      <dd>{row.ip_added_by_name?.trim() ? row.ip_added_by_name : "—"}</dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-slate-600">
                    <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                    <div>
                      <dt className="text-xs font-medium text-slate-400">Employees assigned</dt>
                      <dd className="font-medium tabular-nums text-[#0C123A]">
                        {Math.max(
                          0,
                          Math.floor(Number(row.total_assigned_users ?? 0)) || 0,
                        )}
                      </dd>
                    </div>
                  </div>
                </dl>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => openAssignToEmployeeModal(row)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-900 shadow-sm transition hover:bg-teal-100 sm:flex-none sm:px-4 sm:text-sm"
                  >
                    <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
                    Assign to employee
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(row)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#0C123A] shadow-sm transition hover:bg-slate-50 sm:flex-none sm:px-4 sm:text-sm"
                  >
                    <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
                    Edit label
                  </button>
                  <button
                    type="button"
                    onClick={() => openDelete(row)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 shadow-sm transition hover:bg-red-100 sm:flex-none sm:px-4 sm:text-sm"
                  >
                    <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Assign IP to employee modal */}
      {assignIpRow && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAssignToEmployeeModal();
          }}
        >
          <div
            className="flex max-h-[min(85vh,640px)] w-full max-w-lg flex-col rounded-2xl border border-slate-200 bg-white shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="assign-ip-employee-title"
          >
            <div className="shrink-0 border-b border-slate-100 p-6 pb-4">
              <h2 id="assign-ip-employee-title" className="text-lg font-bold text-[#0C123A]">
                Assign IP to employee
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                <span className="font-mono font-semibold text-[#0C123A]">
                  {assignIpRow.ip_address}
                </span>
                {assignIpRow.label?.trim() ? (
                  <span className="text-slate-600"> · {assignIpRow.label.trim()}</span>
                ) : null}
              </p>
              <div className="relative mt-4">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
                <input
                  type="search"
                  className={`${inputCls()} pl-9`}
                  placeholder="Search by name or email…"
                  value={assignSearch}
                  onChange={(e) => setAssignSearch(e.target.value)}
                  disabled={assignUsersLoading || !!assignBusy}
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-2">
              {assignModalError && (
                <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  {assignModalError}
                </div>
              )}

              {assignUsersLoading && (
                <div className="flex flex-col items-center gap-3 py-12 text-slate-500">
                  <Loader2 className="h-8 w-8 animate-spin text-[#C99237]" aria-hidden />
                  <p className="text-sm">Loading team members…</p>
                </div>
              )}

              {!assignUsersLoading &&
                filteredAssignUsers.length === 0 &&
                assignUsers.length > 0 && (
                  <p className="py-10 text-center text-sm text-slate-500">
                    No members match “{assignSearch.trim()}”.
                  </p>
                )}

              {!assignUsersLoading && assignUsers.length === 0 && !assignModalError && (
                <p className="py-10 text-center text-sm text-slate-500">No members to show.</p>
              )}

              {!assignUsersLoading && filteredAssignUsers.length > 0 && (
                <ul className="space-y-2 pb-4">
                  {filteredAssignUsers.map((u) => {
                    const uid = u.id;
                    if (uid == null) return null;
                    const numericIpId = Number(assignIpRow.id);
                    const hasIp = Number.isFinite(numericIpId) && userHasThisOrgIp(u, numericIpId);
                    const rowBusyOp =
                      assignBusy != null && Number(assignBusy.userId) === Number(uid)
                        ? assignBusy.op
                        : null;
                    return (
                      <li
                        key={String(uid)}
                        className="rounded-xl border border-slate-100 bg-slate-50/60 p-4"
                      >
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-[#0C123A]">{u.user_name ?? "—"}</p>
                            <p className="truncate text-sm text-sky-700">{u.user_email ?? "—"}</p>
                            {u.user_phone != null &&
                            typeof u.user_phone === "string" &&
                            u.user_phone.trim() !== "" ? (
                              <p className="mt-1 text-xs text-slate-500">{u.user_phone}</p>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-2 pt-2 sm:pt-0">
                            <button
                              type="button"
                              disabled={
                                !!assignBusy || hasIp || !Number.isFinite(numericIpId)
                              }
                              onClick={() => void submitAssignIp(u)}
                              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#C99237] px-3 py-2 text-xs font-bold text-[#0C123A] shadow-sm hover:bg-[#b87d2e] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {rowBusyOp === "assign" ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                              ) : (
                                <UserPlus className="h-3.5 w-3.5" aria-hidden />
                              )}
                              Assign
                            </button>
                            <button
                              type="button"
                              disabled={
                                !!assignBusy || !hasIp || !Number.isFinite(numericIpId)
                              }
                              onClick={() => void submitUnassignIp(u)}
                              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {rowBusyOp === "unassign" ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                              ) : (
                                <UserMinus className="h-3.5 w-3.5" aria-hidden />
                              )}
                              Unassign
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="shrink-0 border-t border-slate-100 p-6 pt-4">
              <button
                type="button"
                onClick={closeAssignToEmployeeModal}
                disabled={!!assignBusy}
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-semibold text-[#0C123A] hover:bg-slate-50 disabled:opacity-50 sm:w-auto sm:px-6"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit label modal */}
      {editRow && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEdit();
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-ip-title"
          >
            <h2 id="edit-ip-title" className="text-lg font-bold text-[#0C123A]">
              Update IP label
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              <span className="font-mono font-medium text-slate-700">{editRow.ip_address}</span>
            </p>

            {editError && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {editError}
              </div>
            )}

            <form onSubmit={submitEdit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="edit-label" className={labelCls()}>
                  Label <span className="text-red-500">*</span>
                </label>
                <input
                  id="edit-label"
                  type="text"
                  className={inputCls()}
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  placeholder="e.g. Main office"
                  maxLength={120}
                  required
                  disabled={editSubmitting}
                />
                <p className="mt-1 text-xs text-slate-500">The server requires a non-empty label.</p>
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={closeEdit}
                  disabled={editSubmitting}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#0C123A] hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#C99237] px-4 py-2 text-sm font-bold text-[#0C123A] hover:bg-[#b87d2e] disabled:opacity-60"
                >
                  {editSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Saving…
                    </>
                  ) : (
                    "Save label"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteRow && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDelete();
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-ip-title"
          >
            <h2 id="delete-ip-title" className="text-lg font-bold text-red-900">
              Delete IP address?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              This will remove{" "}
              <span className="font-mono font-semibold text-[#0C123A]">{deleteRow.ip_address}</span>
              {deleteRow.label?.trim() ? (
                <>
                  {" "}
                  (<span className="font-medium">{deleteRow.label}</span>)
                </>
              ) : null}{" "}
              from your organization. Users on that network may no longer match this allowlist
              entry. This action cannot be undone.
            </p>

            {deleteError && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDelete}
                disabled={deleteSubmitting}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0C123A] hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={deleteSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleteSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" aria-hidden />
                    Yes, delete
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
