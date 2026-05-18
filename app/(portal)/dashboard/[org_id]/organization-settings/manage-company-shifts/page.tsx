"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Clock3,
  Loader2,
  AlertCircle,
  CalendarDays,
  Pencil,
  Trash2,
  RefreshCw,
  Plus,
  Moon,
  ShieldAlert,
  X,
  Sun,
  Timer,
  UserPlus,
  Search,
} from "lucide-react";
import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import { type OrgUserRow, getAllOrgUsers } from "@/services/adminUser";
import {
  assignUserToShift,
  type CompanyShiftRow,
  deleteCompanyShift,
  getCompanyShifts,
  updateCompanyShift,
} from "@/services/organizationSettings";

const DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

function labelCls() {
  return "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500";
}

function inputCls() {
  return "w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-[#0C123A] shadow-sm outline-none ring-slate-900/5 transition placeholder:text-slate-400 focus:border-[#C99237] focus:ring-4 focus:ring-[#C99237]/15";
}

function withSeconds(time: string) {
  return time ? `${time}:00` : "";
}

function timeForInput(value: string | null | undefined): string {
  if (!value) return "";
  const s = String(value).trim();
  if (s.length >= 8 && s.includes(":")) return s.slice(0, 5);
  if (s.length >= 5 && s.includes(":")) return s.slice(0, 5);
  return s;
}

function formatTimeDisplay(value: string | null | undefined): string {
  const t = timeForInput(value);
  return t || "—";
}

function workingDaysString(val: unknown): string {
  if (val == null) return "";
  if (typeof val === "string") return val;
  return String(val);
}

function parseWorkingDaysSet(raw: unknown): Set<string> {
  const s = workingDaysString(raw);
  if (!s.trim()) {
    return new Set(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]);
  }
  const parts = s.split(",").map((d) => d.trim().toUpperCase());
  return new Set(parts.filter((d) => DAYS.includes(d as (typeof DAYS)[number])));
}

function isNight(val: boolean | number | null | undefined): boolean {
  return Boolean(val === true || val === 1);
}

function workingDayAbbrevList(raw: unknown): string[] {
  const s = workingDaysString(raw);
  if (!s.trim()) return [];
  return s
    .split(",")
    .map((d) => d.trim().toUpperCase().slice(0, 3))
    .filter(Boolean);
}

function demoAvatarUrl(userId: number | string | undefined): string {
  const id = userId != null ? String(userId) : "0";
  return `https://i.pravatar.cc/128?u=${encodeURIComponent(id)}`;
}

function userRoleLower(u: OrgUserRow): string {
  return String(u.role_name ?? u.user_role_name ?? "")
    .toLowerCase()
    .trim();
}

function isAssignableEmployee(u: OrgUserRow): boolean {
  const r = userRoleLower(u);
  if (!r) return true;
  return r !== "admin";
}

function currentShiftLabel(u: OrgUserRow): string | null {
  const name = u.user_shift_name;
  if (name != null && String(name).trim() !== "") return String(name);
  return null;
}

type ShiftCardProps = {
  row: CompanyShiftRow;
  onEdit: () => void;
  onDelete: () => void;
  onAssignStaff: () => void;
};

function ShiftCard({ row, onEdit, onDelete, onAssignStaff }: ShiftCardProps) {
  const dayTags = workingDayAbbrevList(row.working_days);
  const night = isNight(row.is_night_shift);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/[0.03] transition duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_-12px_rgba(12,18,58,0.12)] hover:ring-[#C99237]/25">
      <div className="h-1.5 bg-gradient-to-r from-[#8B6914] via-[#C99237] to-amber-300/90" aria-hidden />
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold tracking-tight text-[#0C123A]">
              {row.shift_name || "Unnamed shift"}
            </p>
            <p className="mt-1 font-mono text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Shift #{row.id}
            </p>
          </div>
          {night ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-br from-indigo-600 to-violet-700 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-md shadow-indigo-500/25">
              <Moon className="h-3 w-3" aria-hidden />
              Night
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-br from-amber-100 to-amber-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-900 ring-1 ring-amber-200/80">
              <Sun className="h-3 w-3 text-amber-600" aria-hidden />
              Day
            </span>
          )}
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white px-4 py-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0C123A] text-white shadow-inner">
            <Timer className="h-5 w-5 opacity-90" aria-hidden />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Schedule</p>
            <p className="font-mono text-base font-semibold tabular-nums text-[#0C123A]">
              {formatTimeDisplay(row.start_time)}
              <span className="mx-1.5 font-sans font-normal text-slate-300">→</span>
              {formatTimeDisplay(row.end_time)}
            </p>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-slate-50/90 px-2 py-2.5 ring-1 ring-slate-100">
            <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Late</dt>
            <dd className="mt-0.5 font-mono text-xs font-semibold text-slate-800">
              {formatTimeDisplay(row.late_after)}
            </dd>
          </div>
          <div className="rounded-lg bg-slate-50/90 px-2 py-2.5 ring-1 ring-slate-100">
            <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">½ day</dt>
            <dd className="mt-0.5 font-mono text-xs font-semibold text-slate-800">
              {formatTimeDisplay(row.half_day_hours)}
            </dd>
          </div>
          <div className="rounded-lg bg-slate-50/90 px-2 py-2.5 ring-1 ring-slate-100">
            <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Short</dt>
            <dd className="mt-0.5 font-mono text-xs font-semibold text-slate-800">
              {formatTimeDisplay(row.short_leave_hours)}
            </dd>
          </div>
        </dl>

        <div className="mt-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Working days</p>
          <div className="flex flex-wrap gap-1.5">
            {dayTags.length > 0 ? (
              dayTags.map((d) => (
                <span
                  key={`${row.id}-${d}`}
                  className="rounded-md bg-[#0C123A]/[0.06] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0C123A]/80 ring-1 ring-[#0C123A]/[0.08]"
                >
                  {d}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400">—</span>
            )}
          </div>
        </div>

        {row.shift_creator_name && (
          <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
            Created by{" "}
            <span className="font-semibold text-slate-700">{row.shift_creator_name}</span>
          </p>
        )}

        <div className="mt-5 flex flex-col gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onAssignStaff}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#C99237]/40 bg-gradient-to-r from-[#C99237]/12 to-amber-50/80 py-2.5 text-sm font-bold text-[#0C123A] shadow-sm ring-1 ring-[#C99237]/15 transition hover:from-[#C99237]/20 hover:to-amber-50 active:scale-[0.98]"
          >
            <UserPlus className="h-4 w-4 text-[#b87d2e]" aria-hidden />
            Add user to this shift
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-[#0C123A] shadow-sm transition hover:border-[#C99237]/50 hover:bg-[#C99237]/[0.08] active:scale-[0.98]"
            >
              <Pencil className="h-4 w-4 text-[#C99237]" aria-hidden />
              Edit
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50/90 px-4 py-2.5 text-sm font-bold text-red-700 shadow-sm transition hover:bg-red-100 active:scale-[0.98]"
              aria-label={`Delete ${row.shift_name || "shift"}`}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function ManageCompanyShiftsPage() {
  const params = useParams();
  const orgIdParam = params?.org_id;
  const ctx = useManagementDashboardContext();

  const organizationIdNum =
    ctx?.organization?.id != null ? Number(ctx.organization.id) : Number(orgIdParam);
  const orgName = ctx?.organization?.org_name?.trim() || `Organization ${orgIdParam ?? ""}`;
  const orgMissing = !organizationIdNum || Number.isNaN(organizationIdNum);
  const basePath = `/dashboard/${orgIdParam ?? ""}/organization-settings`;

  const defaultWorkingDays = useMemo(
    () => new Set<string>(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]),
    [],
  );

  const [shifts, setShifts] = useState<CompanyShiftRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<CompanyShiftRow | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<CompanyShiftRow | null>(null);
  const [shiftName, setShiftName] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [lateAfter, setLateAfter] = useState("00:15");
  const [halfDayHours, setHalfDayHours] = useState("04:00");
  const [shortLeaveHours, setShortLeaveHours] = useState("02:00");
  const [isNightShift, setIsNightShift] = useState(false);
  const [workingDays, setWorkingDays] = useState<Set<string>>(() => new Set(defaultWorkingDays));
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [assignForShift, setAssignForShift] = useState<CompanyShiftRow | null>(null);
  const [assignSearch, setAssignSearch] = useState("");
  const [assignUsers, setAssignUsers] = useState<OrgUserRow[]>([]);
  const [assignUsersLoading, setAssignUsersLoading] = useState(false);
  const [assignUsersError, setAssignUsersError] = useState<string | null>(null);
  const [assignConfirmUser, setAssignConfirmUser] = useState<OrgUserRow | null>(null);
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignActionError, setAssignActionError] = useState<string | null>(null);

  const assignablePool = useMemo(() => {
    return [...assignUsers]
      .filter(isAssignableEmployee)
      .sort((a, b) => (a.user_name ?? "").localeCompare(b.user_name ?? "", undefined, { sensitivity: "base" }));
  }, [assignUsers]);

  const filteredAssignList = useMemo(() => {
    const q = assignSearch.trim().toLowerCase();
    let list = assignablePool;
    if (q) {
      list = list.filter(
        (u) =>
          (u.user_name ?? "").toLowerCase().includes(q) ||
          (u.user_email ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [assignablePool, assignSearch]);

  const nightShiftCount = useMemo(
    () => shifts.filter((s) => isNight(s.is_night_shift)).length,
    [shifts],
  );

  const loadShifts = useCallback(async () => {
    if (orgMissing) {
      setShifts([]);
      setListLoading(false);
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setListError("Not signed in.");
      setShifts([]);
      setListLoading(false);
      return;
    }
    setListLoading(true);
    setListError(null);
    try {
      const data = await getCompanyShifts(token, organizationIdNum);
      setShifts(data);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Could not load shifts.");
      setShifts([]);
    } finally {
      setListLoading(false);
    }
  }, [orgMissing, organizationIdNum]);

  useEffect(() => {
    void loadShifts();
  }, [loadShifts]);

  function openEdit(shift: CompanyShiftRow) {
    setEditTarget(shift);
    setEditError(null);
    setShiftName(shift.shift_name?.trim() || "");
    setStartTime(timeForInput(shift.start_time));
    setEndTime(timeForInput(shift.end_time));
    setLateAfter(timeForInput(shift.late_after) || "00:15");
    setHalfDayHours(timeForInput(shift.half_day_hours) || "04:00");
    setShortLeaveHours(timeForInput(shift.short_leave_hours) || "02:00");
    setIsNightShift(isNight(shift.is_night_shift));
    const wd = parseWorkingDaysSet(shift.working_days);
    setWorkingDays(wd.size > 0 ? wd : new Set(defaultWorkingDays));
  }

  function closeEdit() {
    setEditTarget(null);
    setEditError(null);
  }

  function toggleWorkingDay(day: string) {
    setWorkingDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEditError(null);
    if (!editTarget || orgMissing) return;
    if (!shiftName.trim() || !startTime || !endTime) {
      setEditError("Shift name, start time and end time are required.");
      return;
    }
    if (workingDays.size === 0) {
      setEditError("Select at least one working day.");
      return;
    }
    if (!lateAfter || !halfDayHours || !shortLeaveHours) {
      setEditError("Late after, half-day hours and short-leave hours are required.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setEditError("Not signed in.");
      return;
    }
    setEditSubmitting(true);
    try {
      await updateCompanyShift(token, {
        org_id: organizationIdNum,
        shift_id: editTarget.id,
        shift_name: shiftName,
        start_time: withSeconds(startTime),
        end_time: withSeconds(endTime),
        late_after: withSeconds(lateAfter),
        half_day_hours: withSeconds(halfDayHours),
        short_leave_hours: withSeconds(shortLeaveHours),
        is_night_shift: isNightShift,
        working_days: Array.from(workingDays).join(","),
      });
      closeEdit();
      await loadShifts();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Could not update shift.");
    } finally {
      setEditSubmitting(false);
    }
  }

  const loadAssignUsers = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setAssignUsersError("Not signed in.");
      setAssignUsers([]);
      return;
    }
    setAssignUsersLoading(true);
    setAssignUsersError(null);
    try {
      const users = await getAllOrgUsers(token);
      setAssignUsers(users);
    } catch (e) {
      setAssignUsersError(e instanceof Error ? e.message : "Could not load users.");
      setAssignUsers([]);
    } finally {
      setAssignUsersLoading(false);
    }
  }, []);

  function openAssignModal(shift: CompanyShiftRow) {
    setAssignForShift(shift);
    setAssignSearch("");
    setAssignConfirmUser(null);
    setAssignActionError(null);
    setAssignUsersError(null);
    void loadAssignUsers();
  }

  function closeAssignModal() {
    if (assignSubmitting) return;
    setAssignForShift(null);
    setAssignSearch("");
    setAssignConfirmUser(null);
    setAssignActionError(null);
    setAssignUsersError(null);
  }

  async function confirmAssignUser() {
    if (!assignForShift || !assignConfirmUser || orgMissing) return;
    const uid = assignConfirmUser.id;
    if (uid == null) {
      setAssignActionError("Invalid user.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setAssignActionError("Not signed in.");
      return;
    }
    setAssignSubmitting(true);
    setAssignActionError(null);
    try {
      await assignUserToShift(token, {
        org_id: organizationIdNum,
        user_id: uid,
        shift_id: assignForShift.id,
      });
      setAssignConfirmUser(null);
      await loadAssignUsers();
      closeAssignModal();
    } catch (err) {
      setAssignActionError(err instanceof Error ? err.message : "Assignment failed.");
    } finally {
      setAssignSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || orgMissing) return;
    setDeleteError(null);
    const token = localStorage.getItem("token");
    if (!token) {
      setDeleteError("Not signed in.");
      return;
    }
    setDeleteSubmitting(true);
    try {
      await deleteCompanyShift(token, {
        org_id: organizationIdNum,
        shift_id: deleteTarget.id,
      });
      setDeleteTarget(null);
      await loadShifts();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Could not delete shift.");
    } finally {
      setDeleteSubmitting(false);
    }
  }

  return (
    <div className="min-h-[70vh] bg-slate-50 pb-16">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6 sm:py-3.5 lg:px-8">
          <div className="flex min-w-0 items-start gap-3.5 sm:items-center sm:gap-4">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-[#0C123A]"
              aria-hidden
            >
              <Clock3 className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 pt-0.5 sm:pt-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Workforce · Shifts
              </p>
              <h1 className="mt-0.5 text-xl font-bold tracking-tight text-[#0C123A] sm:text-2xl">
                Shift directory
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-snug text-slate-600">
                Schedules, grace windows, and working days for{" "}
                <span className="font-medium text-[#0C123A]">{orgName}</span>. Use sync to reload after
                changes elsewhere.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => void loadShifts()}
              disabled={listLoading || orgMissing}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-[#0C123A] shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${listLoading ? "animate-spin" : ""}`} aria-hidden />
              Sync list
            </button>
            <Link
              href={`${basePath}/create-company-shifts`}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#0C123A] px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#151f4a] active:scale-[0.98]"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              New shift
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-8 px-4 pt-8 sm:px-6 lg:px-8">
        {/* Stats */}
        {!orgMissing && !listLoading && shifts.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total shifts</p>
              <p className="mt-2 text-3xl font-black tabular-nums text-[#0C123A]">{shifts.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Night coverage</p>
              <p className="mt-2 text-3xl font-black tabular-nums text-indigo-700">{nightShiftCount}</p>
              <p className="mt-1 text-xs text-slate-500">Shifts marked as night</p>
            </div>
            <div className="rounded-2xl border border-[#0C123A]/20 bg-[#0C123A] p-5 text-white shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-white/60">Organization</p>
              <p className="mt-2 line-clamp-2 text-lg font-bold leading-snug">{orgName}</p>
              <p className="mt-2 font-mono text-xs text-white/50">ID {organizationIdNum}</p>
            </div>
          </div>
        )}

        {/* Main content */}
        <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-[0_4px_24px_rgba(12,18,58,0.06)] backdrop-blur-sm">
          <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50 px-6 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-8">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Live roster</h2>
              <p className="mt-1 text-2xl font-extrabold text-[#0C123A]">All configured shifts</p>
            </div>
            {!listLoading && !orgMissing && shifts.length > 0 && (
              <p className="text-sm text-slate-500">
                Showing <span className="font-bold text-[#0C123A]">{shifts.length}</span>{" "}
                {shifts.length === 1 ? "entry" : "entries"}
              </p>
            )}
          </div>

          <div className="p-6 sm:p-8">
            {listError && (
              <div
                className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200/80 bg-gradient-to-br from-red-50 to-white px-5 py-4 text-sm text-red-900 shadow-sm"
                role="alert"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100">
                  <AlertCircle className="h-5 w-5 text-red-600" aria-hidden />
                </span>
                <span className="pt-1 font-medium">{listError}</span>
              </div>
            )}

            {orgMissing && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/90 px-5 py-4 text-sm font-medium text-amber-950">
                Invalid organization context. Open this page from your dashboard.
              </div>
            )}

            {!orgMissing && listLoading && (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-72 animate-pulse rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-100 to-slate-50/50"
                  />
                ))}
              </div>
            )}

            {!orgMissing && !listLoading && shifts.length === 0 && !listError && (
              <div className="flex flex-col items-center rounded-3xl border border-dashed border-slate-200 bg-gradient-to-b from-slate-50/80 to-white px-8 py-20 text-center">
                <div className="relative mb-6">
                  <div className="absolute inset-0 rounded-full bg-[#C99237]/20 blur-xl" />
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-lg ring-1 ring-slate-200/80">
                    <Clock3 className="h-9 w-9 text-[#C99237]" aria-hidden />
                  </div>
                </div>
                <p className="text-xl font-extrabold text-[#0C123A]">No shifts configured yet</p>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                  Build your first shift to set core hours, late rules, and which weekdays count—your team
                  check-ins will follow these rules.
                </p>
                <Link
                  href={`${basePath}/create-company-shifts`}
                  className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#C99237] to-amber-500 px-8 py-3.5 text-sm font-extrabold text-[#0C123A] shadow-lg shadow-amber-900/15 transition hover:brightness-105"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Create your first shift
                </Link>
              </div>
            )}

            {!orgMissing && !listLoading && shifts.length > 0 && (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {shifts.map((row) => (
                  <ShiftCard
                    key={row.id}
                    row={row}
                    onEdit={() => openEdit(row)}
                    onAssignStaff={() => openAssignModal(row)}
                    onDelete={() => {
                      setDeleteError(null);
                      setDeleteTarget(row);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Assign staff — pick employee */}
      {assignForShift && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="assign-shift-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#0C123A]/55 backdrop-blur-sm"
            aria-label="Close dialog"
            onClick={closeAssignModal}
          />
          <div className="relative flex max-h-[min(90vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-slate-200/90 bg-white shadow-2xl sm:max-h-[min(85vh,720px)] sm:rounded-3xl">
            <div className="relative shrink-0 border-b border-amber-100/80 bg-gradient-to-r from-[#C99237]/20 via-amber-50/90 to-white px-5 py-5 sm:px-6">
              <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#C99237]/15 blur-2xl" aria-hidden />
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#0C123A]/50">
                    Assign shift
                  </p>
                  <h3 id="assign-shift-title" className="mt-1 truncate text-xl font-extrabold text-[#0C123A]">
                    {assignForShift.shift_name || "Shift"}
                  </h3>
                  <p className="mt-1 font-mono text-xs text-slate-500">Shift ID · {assignForShift.id}</p>
                </div>
                <button
                  type="button"
                  onClick={closeAssignModal}
                  className="rounded-xl bg-white/90 p-2 text-slate-500 shadow-sm ring-1 ring-slate-200/80 transition hover:bg-white hover:text-[#0C123A]"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
              <label htmlFor="assign-user-search" className="sr-only">
                Search employees
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
                <input
                  id="assign-user-search"
                  type="search"
                  autoComplete="off"
                  placeholder="Search by name or email…"
                  value={assignSearch}
                  onChange={(e) => setAssignSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200/90 bg-slate-50/80 py-3 pl-10 pr-4 text-sm font-medium text-[#0C123A] outline-none transition focus:border-[#C99237] focus:bg-white focus:ring-4 focus:ring-[#C99237]/12"
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                All team members except organization admins. Use search to narrow the list.
              </p>

              {assignUsersError && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>{assignUsersError}</span>
                </div>
              )}

              {assignUsersLoading && (
                <div className="mt-8 flex flex-col items-center gap-3 py-8 text-slate-500">
                  <Loader2 className="h-8 w-8 animate-spin text-[#C99237]" aria-hidden />
                  <p className="text-sm font-medium">Loading team directory…</p>
                </div>
              )}

              {!assignUsersLoading && !assignUsersError && filteredAssignList.length === 0 && (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center text-sm text-slate-500">
                  No matching employees. Try another search.
                </div>
              )}

              {!assignUsersLoading && filteredAssignList.length > 0 && (
                <ul className="mt-4 space-y-3">
                  {filteredAssignList.map((u) => {
                    const shiftLabel = currentShiftLabel(u);
                    const uid = u.id;
                    return (
                      <li
                        key={uid != null ? String(uid) : u.user_email}
                        className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/50 p-4 shadow-sm ring-1 ring-slate-900/[0.02]"
                      >
                        <div className="flex gap-3">
                          <img
                            src={demoAvatarUrl(uid)}
                            alt=""
                            width={48}
                            height={48}
                            className="h-12 w-12 shrink-0 rounded-2xl object-cover ring-2 ring-white shadow-md"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-bold text-[#0C123A]">{u.user_name ?? "—"}</p>
                            <p className="truncate text-xs text-slate-500">{u.user_email ?? "—"}</p>
                            <p className="mt-2 text-xs">
                              <span className="font-semibold text-slate-600">Current shift: </span>
                              <span className={shiftLabel ? "text-[#0C123A]" : "italic text-slate-400"}>
                                {shiftLabel ?? "None assigned"}
                              </span>
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setAssignActionError(null);
                            setAssignConfirmUser(u);
                          }}
                          className="mt-3 w-full rounded-xl bg-gradient-to-r from-[#C99237] to-amber-500 py-2.5 text-sm font-extrabold text-[#0C123A] shadow-md shadow-amber-900/10 ring-1 ring-white/30 transition hover:brightness-105 active:scale-[0.99]"
                        >
                          Add user to this shift
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assign staff — confirm */}
      {assignForShift && assignConfirmUser && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="assign-confirm-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#0C123A]/65 backdrop-blur-sm"
            aria-label="Close dialog"
            onClick={() => !assignSubmitting && setAssignConfirmUser(null)}
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl">
            <div className="border-b border-slate-100 bg-gradient-to-br from-amber-50/80 to-white px-6 py-5">
              <h3 id="assign-confirm-title" className="text-lg font-extrabold text-[#0C123A]">
                Confirm assignment
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Assign{" "}
                <span className="font-semibold text-[#0C123A]">
                  {assignConfirmUser.user_name ?? "this user"}
                </span>{" "}
                to shift{" "}
                <span className="font-semibold text-[#0C123A]">
                  {assignForShift.shift_name || `#${assignForShift.id}`}
                </span>
                ? Their previous shift mapping for this organization will be updated.
              </p>
            </div>
            {assignActionError && (
              <div className="mx-6 mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>{assignActionError}</span>
              </div>
            )}
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/90 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={assignSubmitting}
                onClick={() => setAssignConfirmUser(null)}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-[#0C123A] shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={assignSubmitting}
                onClick={() => void confirmAssignUser()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#C99237] to-amber-500 px-5 py-3 text-sm font-extrabold text-[#0C123A] shadow-lg shadow-amber-900/15 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {assignSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Assigning…
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" aria-hidden />
                    Yes, assign shift
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-shift-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#0C123A]/60 backdrop-blur-sm"
            aria-label="Close dialog"
            onClick={() => !deleteSubmitting && setDeleteTarget(null)}
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-red-100/80 bg-white shadow-2xl shadow-red-900/10 ring-1 ring-red-900/5">
            <div className="bg-gradient-to-br from-red-50 via-white to-white px-6 pb-2 pt-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/30">
                    <ShieldAlert className="h-6 w-6" aria-hidden />
                  </span>
                  <div>
                    <h3 id="delete-shift-title" className="text-xl font-extrabold text-[#0C123A]">
                      Remove this shift?
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      <span className="font-semibold text-[#0C123A]">
                        {deleteTarget.shift_name || `Shift #${deleteTarget.id}`}
                      </span>{" "}
                      will be deleted permanently. Assignments to this shift may be cleared—confirm you
                      have a replacement plan.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !deleteSubmitting && setDeleteTarget(null)}
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"
                  aria-label="Cancel"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            {deleteError && (
              <div className="mx-6 mb-2 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>{deleteError}</span>
              </div>
            )}
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/90 px-6 py-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={deleteSubmitting}
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-[#0C123A] shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              >
                Keep shift
              </button>
              <button
                type="button"
                disabled={deleteSubmitting}
                onClick={() => void confirmDelete()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-red-600/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleteSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Removing…
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" aria-hidden />
                    Yes, delete shift
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-shift-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#0C123A]/55 backdrop-blur-sm"
            aria-label="Close dialog"
            onClick={() => !editSubmitting && closeEdit()}
          />
          <div className="relative flex max-h-[min(92vh,760px)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-slate-200/90 bg-white shadow-2xl sm:rounded-3xl">
            <div className="relative shrink-0 overflow-hidden border-b border-amber-100/80 bg-gradient-to-r from-[#C99237]/25 via-amber-50 to-white px-6 py-5">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#C99237]/20 blur-2xl" aria-hidden />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#0C123A]/50">
                    Edit configuration
                  </p>
                  <h3 id="edit-shift-title" className="mt-1 text-2xl font-extrabold text-[#0C123A]">
                    {editTarget.shift_name || "Shift"}
                  </h3>
                  <p className="mt-1 font-mono text-xs text-slate-500">Reference ID · {editTarget.id}</p>
                </div>
                <button
                  type="button"
                  onClick={() => !editSubmitting && closeEdit()}
                  className="rounded-xl bg-white/80 p-2 text-slate-500 shadow-sm ring-1 ring-slate-200/80 transition hover:bg-white hover:text-[#0C123A]"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <form onSubmit={(e) => void handleEditSubmit(e)} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                {editError && (
                  <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-900">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <span className="font-medium">{editError}</span>
                  </div>
                )}
                <div className="space-y-5">
                  <div>
                    <label htmlFor="edit-shift-name" className={labelCls()}>
                      Shift name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="edit-shift-name"
                      type="text"
                      className={inputCls()}
                      value={shiftName}
                      onChange={(e) => setShiftName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="edit-start" className={labelCls()}>
                        Start <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="edit-start"
                        type="time"
                        className={inputCls()}
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-end" className={labelCls()}>
                        End <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="edit-end"
                        type="time"
                        className={inputCls()}
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-late" className={labelCls()}>
                        Late after <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="edit-late"
                        type="time"
                        className={inputCls()}
                        value={lateAfter}
                        onChange={(e) => setLateAfter(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-half" className={labelCls()}>
                        Half-day hours <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="edit-half"
                        type="time"
                        className={inputCls()}
                        value={halfDayHours}
                        onChange={(e) => setHalfDayHours(e.target.value)}
                        required
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="edit-short" className={labelCls()}>
                        Short-leave hours <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="edit-short"
                        type="time"
                        className={inputCls()}
                        value={shortLeaveHours}
                        onChange={(e) => setShortLeaveHours(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50 to-white p-4 shadow-inner">
                    <div className="mb-3 flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-[#C99237]" aria-hidden />
                      <span className="text-xs font-bold uppercase tracking-wide text-[#0C123A]">
                        Working days <span className="text-red-500">*</span>
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {DAYS.map((day) => {
                        const selected = workingDays.has(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleWorkingDay(day)}
                            className={`rounded-xl px-3 py-2 text-xs font-bold transition sm:text-sm ${
                              selected
                                ? "bg-gradient-to-b from-[#C99237] to-amber-600 text-[#0C123A] shadow-md shadow-amber-900/10 ring-1 ring-white/30"
                                : "border border-slate-200 bg-white text-slate-600 hover:border-[#C99237]/40 hover:bg-amber-50/50"
                            }`}
                          >
                            {day.slice(0, 3)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <label className="flex cursor-pointer items-start gap-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 p-4 transition hover:border-[#C99237]/30 hover:bg-white">
                    <input
                      type="checkbox"
                      checked={isNightShift}
                      onChange={(e) => setIsNightShift(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-[#C99237] focus:ring-[#C99237]"
                    />
                    <span>
                      <span className="font-bold text-[#0C123A]">Night shift</span>
                      <span className="mt-1 block text-sm text-slate-500">
                        Enable when the window crosses midnight (e.g. 22:00–06:00).
                      </span>
                    </span>
                  </label>
                </div>
              </div>
              <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 bg-gradient-to-t from-slate-50 to-white px-6 py-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={editSubmitting}
                  onClick={closeEdit}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#C99237] to-amber-500 px-6 py-3 text-sm font-extrabold text-[#0C123A] shadow-lg shadow-amber-900/15 ring-1 ring-white/30 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {editSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Pencil className="h-4 w-4" aria-hidden />
                      Save changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}