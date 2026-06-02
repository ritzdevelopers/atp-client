"use client";

import { useCallback, useEffect, useMemo, useState, startTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  BadgeIndianRupee,
  Loader2,
  AlertCircle,
  RefreshCw,
  Search,
  ChevronRight,
  Users,
} from "lucide-react";
import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import { STATIC_EXPORT_PLACEHOLDER_ID } from "@/lib/static-export";
import { dedupeOrgUserRows, getAllOrgUsers, type OrgUserRow } from "@/services/adminUser";

function inputCls() {
  return "w-full rounded-lg border border-[#E4E7EC] bg-white py-2.5 pl-10 pr-4 text-[15px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15 lg:border-slate-200 lg:text-sm lg:shadow-sm lg:focus:border-[#C99237] lg:focus:ring-[#C99237]/20";
}

function avatarUrl(seed: string) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

function formatRoleLabel(role: string | undefined) {
  const r = (role ?? "").trim().toLowerCase();
  if (!r) return "Employee";
  if (r === "hr") return "HR";
  if (r === "admin") return "Admin";
  return r.replace(/\b\w/g, (c) => c.toUpperCase());
}

function isOrgMemberActive(value: unknown): boolean {
  if (value === false || value === 0 || value === "0") return false;
  return true;
}

type EmployeeListItem = {
  id: string;
  name: string;
  email: string;
  roleLabel: string;
  avatarSeed: string;
};

function mapRow(row: OrgUserRow): EmployeeListItem | null {
  if (row.id == null) return null;
  if (!isOrgMemberActive(row.is_active)) return null;
  const name = row.user_name?.trim() || row.user_email?.trim() || "Employee";
  return {
    id: String(row.id),
    name,
    email: row.user_email?.trim() ?? "—",
    roleLabel: formatRoleLabel(row.role_name ?? row.user_role_name),
    avatarSeed: name,
  };
}

export default function ManageEmployeeSalaryPage() {
  const params = useParams();
  const router = useRouter();
  const ctx = useManagementDashboardContext();
  const orgIdParam = params?.org_id;

  const organizationIdNum =
    ctx?.organization?.id != null ? Number(ctx.organization.id) : Number(orgIdParam);
  const orgName = ctx?.organization?.org_name?.trim() || `Organization ${orgIdParam ?? ""}`;
  const orgMissing = !organizationIdNum || Number.isNaN(organizationIdNum);
  const basePath = `/dashboard/${orgIdParam ?? ""}/organization-payroll-management/manage-employee-salary`;

  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadEmployees = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent === true;
      if (orgMissing) {
        setEmployees([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const token = localStorage.getItem("token");
      if (!token) {
        setLoadError("Not signed in.");
        setLoading(false);
        setRefreshing(false);
        return;
      }
      setLoadError(null);
      if (silent) setRefreshing(true);
      else setLoading(true);
      try {
        const rows = await getAllOrgUsers(token);
        const list = dedupeOrgUserRows(rows)
          .map(mapRow)
          .filter((e): e is EmployeeListItem => e != null);
        setEmployees(list);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Could not load employees.");
        setEmployees([]);
      } finally {
        if (silent) setRefreshing(false);
        else setLoading(false);
      }
    },
    [orgMissing],
  );

  useEffect(() => {
    startTransition(() => {
      void loadEmployees();
    });
  }, [loadEmployees]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.roleLabel.toLowerCase().includes(q) ||
        e.id.includes(q),
    );
  }, [employees, search]);

  function openSalaryStack(employeeId: string) {
    router.push(
      `${basePath}/${STATIC_EXPORT_PLACEHOLDER_ID}?employee_id=${encodeURIComponent(employeeId)}`,
    );
  }

  return (
    <div className="min-h-full bg-[#F5F7FA] lg:bg-transparent lg:space-y-6">
      <div className="lg:hidden">
        <div className="sticky top-0 z-20 border-b border-[#E4E7EC] bg-white shadow-sm">
          <div className="flex items-center gap-2 px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
              <BadgeIndianRupee className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[17px] font-semibold text-[#1F2937]">
                Employee salary
              </h1>
              <p className="truncate text-[13px] text-[#6B7280]">
                {loading ? "Loading…" : `${employees.length} active · ${orgName}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadEmployees({ silent: true })}
              disabled={loading || refreshing}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#008CD3] disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
          <div className="border-t border-[#E4E7EC] px-4 py-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search employees"
                className={inputCls()}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="hidden lg:block">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#C99237]/12">
                <BadgeIndianRupee className="h-6 w-6 text-[#C99237]" />
              </span>
              <div>
                <h1 className="text-xl font-bold text-[#0C123A] sm:text-2xl">
                  Manage employee salary
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Select an employee to view or set salary for{" "}
                  <span className="font-medium text-slate-700">{orgName}</span>.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void loadEmployees({ silent: true })}
              disabled={orgMissing || loading || refreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0C123A] shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
          <div className="relative mt-4 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or role"
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none focus:border-[#C99237] focus:ring-2 focus:ring-[#C99237]/20"
            />
          </div>
        </div>
      </div>

      {loadError ? (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 lg:mx-0 lg:mt-0">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {loadError}
        </div>
      ) : null}

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-500">
          <Loader2 className="h-9 w-9 animate-spin text-[#008CD3] lg:text-[#C99237]" />
          <p className="text-sm">Loading employees…</p>
        </div>
      ) : null}

      {!loading && filtered.length === 0 ? (
        <div className="mx-4 mt-4 rounded-xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center lg:mx-0 lg:mt-6">
          <Users className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-medium text-[#0C123A]">No employees found</p>
          <p className="mt-1 text-sm text-slate-500">
            {search.trim() ? "Try a different search." : "No active members in this organization."}
          </p>
        </div>
      ) : null}

      {!loading && filtered.length > 0 ? (
        <ul className="mt-1 divide-y divide-[#E4E7EC] border-t border-[#E4E7EC] bg-white lg:mt-6 lg:overflow-hidden lg:rounded-2xl lg:border lg:border-slate-200/90 lg:shadow-sm">
          {filtered.map((emp) => (
            <li key={emp.id}>
              <button
                type="button"
                onClick={() => openSalaryStack(emp.id)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50 active:bg-slate-100 lg:px-6 lg:py-4"
              >
                <img
                  src={avatarUrl(emp.avatarSeed)}
                  alt=""
                  className="h-11 w-11 shrink-0 rounded-full bg-slate-100 ring-2 ring-white"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[#1F2937] lg:text-[#0C123A]">{emp.name}</p>
                  <p className="truncate text-sm text-[#6B7280]">{emp.email}</p>
                  <p className="mt-0.5 text-xs text-[#9CA3AF]">{emp.roleLabel}</p>
                </div>
                <span className="hidden shrink-0 text-sm font-semibold cursor-pointer text-teal-700 lg:inline">
                  Salary info
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
