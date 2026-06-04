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
  UserMinus,
  Search,
  Info,
} from "lucide-react";
import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import { type OrgUserRow, getAllOrgUsers } from "@/services/adminUser";
import {
  assignUserToShift,
  unassignUserFromShift,
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

const SHIFT_ICON_COLORS = [
  "bg-[#E8F4FB] text-[#008CD3]",
  "bg-[#E6F4EA] text-[#0F9D58]",
  "bg-[#FEF3E6] text-[#E8710A]",
  "bg-[#F3E8FD] text-[#7B1FA2]",
  "bg-[#FCE8E6] text-[#D93025]",
  "bg-[#E8EAF6] text-[#3F51B5]",
];

function shiftColorClass(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SHIFT_ICON_COLORS[Math.abs(hash) % SHIFT_ICON_COLORS.length];
}

function shiftInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function zohoSearchCls() {
  return "w-full rounded-lg border border-[#E4E7EC] bg-white py-2.5 pl-10 pr-4 text-[15px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15 lg:text-sm";
}

function zohoPrimaryBtnCls(full = false) {
  return `inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-[#008CD3] px-4 py-2 text-[14px] font-medium text-white transition active:scale-[0.98] hover:bg-[#0070AA] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full" : ""}`;
}

function zohoDangerIconBtnCls() {
  return "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#FFCDD2] text-[#C62828] active:bg-[#FFECEC]";
}

function zohoEditIconBtnCls() {
  return "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#008CD3] active:bg-[#E8F4FB]";
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

function userOnSameShift(u: OrgUserRow, shiftId: number | string): boolean {
  const sid = u.user_shift_id;
  if (sid == null || sid === "") return false;
  return Number(sid) === Number(shiftId);
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
  const name = row.shift_name?.trim() || "Unnamed shift";

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-sm transition hover:border-[#008CD3]/40 hover:shadow-md">
      <div className="border-l-4 border-[#008CD3] px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${shiftColorClass(name)}`}
            >
              {shiftInitials(name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[16px] font-semibold text-[#1F2937]">{name}</p>
              <p className="mt-0.5 text-[12px] text-[#6B7280]">ID {row.id}</p>
            </div>
          </div>
          {night ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[#F3E8FD] px-2 py-0.5 text-[10px] font-semibold uppercase text-[#7B1FA2]">
              <Moon className="h-3 w-3" aria-hidden />
              Night
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[#FEF3E6] px-2 py-0.5 text-[10px] font-semibold uppercase text-[#E8710A]">
              <Sun className="h-3 w-3" aria-hidden />
              Day
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5">
          <Timer className="h-4 w-4 shrink-0 text-[#008CD3]" aria-hidden />
          <p className="font-mono text-[13px] font-medium tabular-nums text-[#1F2937]">
            {formatTimeDisplay(row.start_time)}
            <span className="mx-1.5 text-[#9CA3AF]">–</span>
            {formatTimeDisplay(row.end_time)}
          </p>
        </div>

        <dl className="mt-3 grid grid-cols-3 gap-2">
          {[
            ["Late", row.late_after],
            ["½ day", row.half_day_hours],
            ["Short", row.short_leave_hours],
          ].map(([label, val]) => (
            <div key={String(label)} className="rounded-md border border-[#E4E7EC] bg-white px-2 py-2 text-center">
              <dt className="text-[10px] font-medium uppercase tracking-wide text-[#9CA3AF]">{label}</dt>
              <dd className="mt-0.5 font-mono text-[11px] font-semibold text-[#374151]">
                {formatTimeDisplay(val as string)}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-3">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-[#9CA3AF]">Working days</p>
          <div className="flex flex-wrap gap-1">
            {dayTags.length > 0 ? (
              dayTags.map((d) => (
                <span
                  key={`${row.id}-${d}`}
                  className="rounded bg-[#E8F4FB] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[#008CD3]"
                >
                  {d}
                </span>
              ))
            ) : (
              <span className="text-xs text-[#9CA3AF]">—</span>
            )}
          </div>
        </div>

        {row.shift_creator_name ? (
          <p className="mt-3 text-[12px] text-[#6B7280]">
            Created by <span className="font-medium text-[#374151]">{row.shift_creator_name}</span>
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 border-t border-[#E4E7EC] bg-[#F9FAFB] px-5 py-4">
        <button type="button" onClick={onAssignStaff} className={zohoPrimaryBtnCls(true)}>
          <UserPlus className="h-4 w-4" aria-hidden />
          Assign staff
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#E4E7EC] bg-white py-2 text-[13px] font-medium text-[#1F2937] transition hover:border-[#008CD3]/40 hover:bg-[#E8F4FB]/50"
          >
            <Pencil className="h-4 w-4 text-[#008CD3]" aria-hidden />
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className={zohoDangerIconBtnCls()}
            aria-label={`Delete ${name}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </article>
  );
}

type MobileShiftRowProps = {
  row: CompanyShiftRow;
  onEdit: () => void;
  onDelete: () => void;
  onAssignStaff: () => void;
};

function MobileShiftRow({ row, onEdit, onDelete, onAssignStaff }: MobileShiftRowProps) {
  const name = row.shift_name?.trim() || "Unnamed shift";
  const night = isNight(row.is_night_shift);
  const dayTags = workingDayAbbrevList(row.working_days);

  return (
    <li>
      <div className="px-4 py-3.5">
        <div className="flex items-start gap-3">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${shiftColorClass(name)}`}
          >
            {shiftInitials(name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-[16px] font-medium text-[#1F2937]">{name}</p>
              {night ? (
                <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-[#F3E8FD] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[#7B1FA2]">
                  <Moon className="h-3 w-3" />
                  Night
                </span>
              ) : (
                <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-[#FEF3E6] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[#E8710A]">
                  <Sun className="h-3 w-3" />
                  Day
                </span>
              )}
            </div>
            <p className="mt-0.5 font-mono text-[13px] text-[#6B7280]">
              {formatTimeDisplay(row.start_time)} – {formatTimeDisplay(row.end_time)}
            </p>
            <p className="mt-1 text-[12px] text-[#9CA3AF]">
              {dayTags.length > 0 ? dayTags.join(", ") : "No days set"} · ID {String(row.id)}
            </p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={onAssignStaff} className={`flex-1 ${zohoPrimaryBtnCls()}`}>
            <UserPlus className="h-4 w-4" />
            Assign
          </button>
          <button type="button" onClick={onEdit} className={zohoEditIconBtnCls()} aria-label={`Edit ${name}`}>
            <Pencil className="h-4 w-4" />
          </button>
          <button type="button" onClick={onDelete} className={zohoDangerIconBtnCls()} aria-label={`Delete ${name}`}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </li>
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
  const [unassignBusyUserId, setUnassignBusyUserId] = useState<number | string | null>(null);
  const [assignActionError, setAssignActionError] = useState<string | null>(null);

  const [mobileMainTab, setMobileMainTab] = useState<"shifts" | "overview">("shifts");
  const [shiftSearchQuery, setShiftSearchQuery] = useState("");

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

  const filteredShifts = useMemo(() => {
    const q = shiftSearchQuery.trim().toLowerCase();
    if (!q) return shifts;
    return shifts.filter((s) => {
      const name = String(s.shift_name ?? "").toLowerCase();
      const id = String(s.id).toLowerCase();
      const days = workingDaysString(s.working_days).toLowerCase();
      return name.includes(q) || id.includes(q) || days.includes(q);
    });
  }, [shifts, shiftSearchQuery]);

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
    if (assignSubmitting || unassignBusyUserId != null) return;
    setAssignForShift(null);
    setAssignSearch("");
    setAssignConfirmUser(null);
    setAssignActionError(null);
    setAssignUsersError(null);
    setUnassignBusyUserId(null);
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

  async function confirmUnassignUser(user: OrgUserRow) {
    if (!assignForShift || orgMissing) return;
    const uid = user.id;
    if (uid == null) {
      setAssignActionError("Invalid user.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setAssignActionError("Not signed in.");
      return;
    }
    setUnassignBusyUserId(uid);
    setAssignActionError(null);
    try {
      await unassignUserFromShift(token, {
        org_id: organizationIdNum,
        user_id: uid,
        shift_id: assignForShift.id,
      });
      await loadAssignUsers();
    } catch (err) {
      setAssignActionError(err instanceof Error ? err.message : "Unassign failed.");
    } finally {
      setUnassignBusyUserId(null);
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

  const mobileTabs = [
    { id: "shifts" as const, label: "Shifts", count: shifts.length },
    { id: "overview" as const, label: "Overview" },
  ];

  return (
    <div className="min-h-full bg-[#F5F7FA] lg:min-h-[70vh] lg:pb-10">
      {/* Mobile & tablet: Zoho admin portal style */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-20 border-b border-[#E4E7EC] bg-white shadow-sm">
          <div className="flex items-center gap-2 px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
              <Clock3 className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[17px] font-semibold text-[#1F2937]">Shift directory</h1>
              <p className="truncate text-[13px] text-[#6B7280]">
                {listLoading
                  ? "Loading…"
                  : `${shifts.length} shift${shifts.length === 1 ? "" : "s"} · ${orgName}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadShifts()}
              disabled={listLoading || orgMissing}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#008CD3] active:bg-[#F5F7FA] disabled:opacity-50"
              aria-label="Refresh shifts"
            >
              <RefreshCw className={`h-5 w-5 ${listLoading ? "animate-spin" : ""}`} />
            </button>
            <Link
              href={`${basePath}/create-company-shifts`}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#008CD3] text-white active:scale-[0.98]"
              aria-label="Create shift"
            >
              <Plus className="h-5 w-5" />
            </Link>
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

          {mobileMainTab === "shifts" ? (
            <div className="border-t border-[#E4E7EC] px-4 py-2.5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="search"
                  value={shiftSearchQuery}
                  onChange={(e) => setShiftSearchQuery(e.target.value)}
                  placeholder="Search shifts"
                  className={zohoSearchCls()}
                />
              </div>
            </div>
          ) : null}
        </div>

        {listError ? (
          <div className="mx-4 mt-3 flex items-start gap-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-4 py-3 text-[14px] text-[#D93025]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{listError}</span>
          </div>
        ) : null}

        {orgMissing ? (
          <div className="mx-4 mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[14px] text-amber-950">
            Invalid organization context. Open this page from your dashboard.
          </div>
        ) : null}

        {listLoading && !listError ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-[#6B7280]">
            <Loader2 className="h-9 w-9 animate-spin text-[#008CD3]" />
            <p className="text-[15px]">Loading shifts…</p>
          </div>
        ) : null}

        {!listLoading && !listError && mobileMainTab === "overview" ? (
          <div className="space-y-3 p-4">
            <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Total shifts
              </p>
              <p className="mt-1 text-3xl font-semibold text-[#1F2937]">{shifts.length}</p>
            </div>
            <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Night shifts
              </p>
              <p className="mt-1 text-3xl font-semibold text-[#7B1FA2]">{nightShiftCount}</p>
              <p className="mt-1 text-[14px] text-[#6B7280]">Shifts marked as night coverage</p>
            </div>
            <div className="rounded-xl border border-[#E4E7EC] bg-[#E8F4FB] p-4">
              <div className="flex gap-3">
                <Info className="h-5 w-5 shrink-0 text-[#008CD3]" />
                <p className="text-[14px] leading-relaxed text-[#4B5563]">
                  Tap a shift to assign staff, edit timings, or remove it. Sync refreshes data after
                  changes elsewhere.
                </p>
              </div>
            </div>
            <Link href={`${basePath}/create-company-shifts`} className={`${zohoPrimaryBtnCls(true)}`}>
              <Plus className="h-4 w-4" />
              Create new shift
            </Link>
          </div>
        ) : null}

        {!listLoading && !listError && mobileMainTab === "shifts" && shifts.length === 0 ? (
          <div className="mx-4 mt-4 rounded-xl border border-dashed border-[#E4E7EC] bg-white px-6 py-16 text-center">
            <Clock3 className="mx-auto h-10 w-10 text-[#9CA3AF]" />
            <p className="mt-4 text-[17px] font-semibold text-[#1F2937]">No shifts yet</p>
            <p className="mt-2 text-[14px] text-[#6B7280]">
              Create your first shift to set core hours and working days.
            </p>
            <Link href={`${basePath}/create-company-shifts`} className={`mt-6 ${zohoPrimaryBtnCls()}`}>
              <Plus className="h-4 w-4" />
              Create shift
            </Link>
          </div>
        ) : null}

        {!listLoading && !listError && mobileMainTab === "shifts" && shifts.length > 0 ? (
          <ul className="mt-1 divide-y divide-[#E4E7EC] border-t border-[#E4E7EC] bg-white">
            {filteredShifts.length === 0 ? (
              <li className="px-4 py-12 text-center text-[15px] text-[#6B7280]">
                No shifts match your search.
              </li>
            ) : (
              filteredShifts.map((row) => (
                <MobileShiftRow
                  key={row.id}
                  row={row}
                  onEdit={() => openEdit(row)}
                  onAssignStaff={() => openAssignModal(row)}
                  onDelete={() => {
                    setDeleteError(null);
                    setDeleteTarget(row);
                  }}
                />
              ))
            )}
          </ul>
        ) : null}
      </div>

      {/* Desktop — Zoho Attendance–style layout */}
      <div className="hidden lg:block">
        <header className="border-b border-[#E4E7EC] bg-white">
          <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-6 px-8 py-4">
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
                <Clock3 className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <div className="min-w-0">
                <h1 className="text-[20px] font-semibold text-[#1F2937]">Shift directory</h1>
                <p className="mt-0.5 text-[14px] text-[#6B7280]">
                  {orgName}
                  {!listLoading ? ` · ${shifts.length} shift${shifts.length === 1 ? "" : "s"}` : ""}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => void loadShifts()}
                disabled={listLoading || orgMissing}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#E4E7EC] bg-white px-3.5 text-[13px] font-medium text-[#374151] transition hover:bg-[#F9FAFB] disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${listLoading ? "animate-spin" : ""}`} aria-hidden />
                Refresh
              </button>
              <Link href={`${basePath}/create-company-shifts`} className={zohoPrimaryBtnCls()}>
                <Plus className="h-4 w-4" aria-hidden />
                New shift
              </Link>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1280px] px-8 py-6">
          {!orgMissing && !listLoading && shifts.length > 0 ? (
            <div className="mb-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-[#E4E7EC] bg-white p-4 shadow-sm">
                <p className="text-[12px] font-medium uppercase tracking-wide text-[#6B7280]">Total shifts</p>
                <p className="mt-1 text-[28px] font-semibold tabular-nums text-[#1F2937]">{shifts.length}</p>
              </div>
              <div className="rounded-lg border border-[#E4E7EC] bg-white p-4 shadow-sm">
                <p className="text-[12px] font-medium uppercase tracking-wide text-[#6B7280]">Night shifts</p>
                <p className="mt-1 text-[28px] font-semibold tabular-nums text-[#7B1FA2]">{nightShiftCount}</p>
              </div>
              <div className="rounded-lg border border-[#E4E7EC] bg-[#E8F4FB]/40 p-4">
                <p className="text-[12px] font-medium uppercase tracking-wide text-[#008CD3]">Organization</p>
                <p className="mt-1 truncate text-[15px] font-semibold text-[#1F2937]">{orgName}</p>
                <p className="mt-0.5 text-[12px] text-[#6B7280]">ID {organizationIdNum}</p>
              </div>
            </div>
          ) : null}

          <section className="overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E4E7EC] bg-[#F9FAFB] px-5 py-3.5">
              <p className="text-[14px] font-semibold text-[#1F2937]">Configured shifts</p>
              {shifts.length > 0 ? (
                <div className="relative w-full max-w-xs">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    type="search"
                    value={shiftSearchQuery}
                    onChange={(e) => setShiftSearchQuery(e.target.value)}
                    placeholder="Search shifts"
                    className={zohoSearchCls()}
                  />
                </div>
              ) : null}
            </div>

            <div className="p-5">
              {listError ? (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-4 py-3 text-[14px] text-[#D93025]">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{listError}</span>
                </div>
              ) : null}

              {orgMissing ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[14px] text-amber-950">
                  Invalid organization context. Open this page from your dashboard.
                </div>
              ) : null}

              {!orgMissing && listLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-64 animate-pulse rounded-lg border border-[#E4E7EC] bg-[#F3F4F6]" />
                  ))}
                </div>
              ) : null}

              {!orgMissing && !listLoading && shifts.length === 0 && !listError ? (
                <div className="flex flex-col items-center rounded-lg border border-dashed border-[#E4E7EC] px-8 py-16 text-center">
                  <Clock3 className="h-10 w-10 text-[#9CA3AF]" aria-hidden />
                  <p className="mt-4 text-[17px] font-semibold text-[#1F2937]">No shifts configured</p>
                  <p className="mt-2 max-w-sm text-[14px] text-[#6B7280]">
                    Create a shift to define work hours, grace periods, and working days.
                  </p>
                  <Link href={`${basePath}/create-company-shifts`} className={`mt-6 ${zohoPrimaryBtnCls()}`}>
                    <Plus className="h-4 w-4" />
                    Create shift
                  </Link>
                </div>
              ) : null}

              {!orgMissing && !listLoading && shifts.length > 0 ? (
                filteredShifts.length === 0 ? (
                  <p className="py-12 text-center text-[14px] text-[#6B7280]">No shifts match your search.</p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredShifts.map((row) => (
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
                )
              ) : null}
            </div>
          </section>
        </div>
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
            className="absolute inset-0 bg-[#1F2937]/40 backdrop-blur-[1px] sm:bg-[#0C123A]/55 sm:backdrop-blur-sm"
            aria-label="Close dialog"
            onClick={closeAssignModal}
          />
          <div className="relative flex max-h-[min(92dvh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-[#E4E7EC] bg-white shadow-2xl sm:max-h-[min(85vh,720px)] sm:rounded-3xl sm:border-slate-200/90">
            <div className="relative shrink-0 border-b border-[#E4E7EC] border-t-[3px] border-t-[#008CD3] bg-white px-4 py-4 sm:px-6 sm:py-5">
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#008CD3] sm:font-bold sm:text-[#0C123A]/50">
                    Assign shift
                  </p>
                  <h3 id="assign-shift-title" className="mt-1 truncate text-[17px] font-semibold text-[#1F2937] sm:text-xl sm:font-extrabold sm:text-[#0C123A]">
                    {assignForShift.shift_name || "Shift"}
                  </h3>
                  <p className="mt-0.5 text-[13px] text-[#6B7280] sm:font-mono sm:text-xs sm:text-slate-500">
                    Shift ID · {assignForShift.id}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeAssignModal}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#6B7280] active:bg-[#F5F7FA] sm:rounded-xl sm:border-0 sm:bg-white/90 sm:shadow-sm sm:ring-1 sm:ring-slate-200/80 sm:hover:text-[#0C123A]"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-[#F5F7FA] px-4 py-4 sm:bg-white sm:px-6">
              <label htmlFor="assign-user-search" className="sr-only">
                Search employees
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]"
                  aria-hidden
                />
                <input
                  id="assign-user-search"
                  type="search"
                  autoComplete="off"
                  placeholder="Search employees"
                  value={assignSearch}
                  onChange={(e) => setAssignSearch(e.target.value)}
                  className={zohoSearchCls()}
                />
              </div>
              <p className="mt-2 text-[13px] text-[#6B7280] sm:text-xs sm:text-slate-500">
                All team members except organization admins.
              </p>

              {assignUsersError && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>{assignUsersError}</span>
                </div>
              )}

              {assignActionError && !assignConfirmUser ? (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2.5 text-[14px] text-[#D93025]">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>{assignActionError}</span>
                </div>
              ) : null}

              {assignUsersLoading && (
                <div className="mt-8 flex flex-col items-center gap-3 py-8 text-[#6B7280]">
                  <Loader2 className="h-8 w-8 animate-spin text-[#008CD3]" aria-hidden />
                  <p className="text-sm font-medium">Loading team directory…</p>
                </div>
              )}

              {!assignUsersLoading && !assignUsersError && filteredAssignList.length === 0 && (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center text-sm text-slate-500">
                  No matching employees. Try another search.
                </div>
              )}

              {!assignUsersLoading && filteredAssignList.length > 0 && (
                <>
                  <ul className="mt-4 divide-y divide-[#E4E7EC] rounded-lg border border-[#E4E7EC] bg-white">
                    {filteredAssignList.map((u) => {
                      const shiftLabel = currentShiftLabel(u);
                      const uid = u.id;
                      const name = u.user_name ?? "—";
                      const onThisShift =
                        assignForShift != null && userOnSameShift(u, assignForShift.id);
                      const unassignBusy = uid != null && unassignBusyUserId === uid;
                      return (
                        <li key={uid != null ? String(uid) : u.user_email} className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E8F4FB] text-sm font-semibold text-[#008CD3]">
                              {shiftInitials(name)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[15px] font-medium text-[#1F2937]">{name}</p>
                              <p className="truncate text-[13px] text-[#6B7280]">{u.user_email ?? "—"}</p>
                              <p className="mt-0.5 text-[12px] text-[#9CA3AF]">
                                Current: {shiftLabel ?? "None"}
                                {onThisShift ? (
                                  <span className="ml-1.5 rounded bg-[#E6F4EA] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[#0F9D58]">
                                    This shift
                                  </span>
                                ) : null}
                              </p>
                            </div>
                            {onThisShift ? (
                              <button
                                type="button"
                                disabled={unassignBusy || assignSubmitting}
                                onClick={() => void confirmUnassignUser(u)}
                                className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-[#FFCDD2] bg-white px-3 py-2 text-[13px] font-medium text-[#C62828] transition hover:bg-[#FFECEC] disabled:opacity-50"
                              >
                                {unassignBusy ? (
                                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                                ) : (
                                  <UserMinus className="h-4 w-4" aria-hidden />
                                )}
                                Unassign
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={assignSubmitting || unassignBusyUserId != null}
                                onClick={() => {
                                  setAssignActionError(null);
                                  setAssignConfirmUser(u);
                                }}
                                className={zohoPrimaryBtnCls()}
                              >
                                Add
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </>
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
          <div className="relative w-full max-w-md overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-2xl">
            <div className="border-b border-[#E4E7EC] border-t-[3px] border-t-[#008CD3] bg-white px-6 py-5">
              <h3 id="assign-confirm-title" className="text-[17px] font-semibold text-[#1F2937]">
                Confirm assignment
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[#6B7280]">
                Assign{" "}
                <span className="font-semibold text-[#1F2937]">
                  {assignConfirmUser.user_name ?? "this user"}
                </span>{" "}
                to shift{" "}
                <span className="font-semibold text-[#1F2937]">
                  {assignForShift.shift_name || `#${assignForShift.id}`}
                </span>
                ? Their previous shift mapping for this organization will be updated.
              </p>
            </div>
            {assignActionError && (
              <div className="mx-6 mt-4 flex items-start gap-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2 text-[14px] text-[#D93025]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>{assignActionError}</span>
              </div>
            )}
            <div className="flex flex-col-reverse gap-2 border-t border-[#E4E7EC] bg-[#F9FAFB] px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={assignSubmitting}
                onClick={() => setAssignConfirmUser(null)}
                className="rounded-lg border border-[#E4E7EC] bg-white px-5 py-2.5 text-[14px] font-medium text-[#374151] transition hover:bg-[#F9FAFB] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={assignSubmitting}
                onClick={() => void confirmAssignUser()}
                className={`${zohoPrimaryBtnCls()} px-5 py-2.5`}
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
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-shift-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#1F2937]/40 backdrop-blur-[1px] sm:bg-[#0C123A]/60 sm:backdrop-blur-sm"
            aria-label="Close dialog"
            onClick={() => !deleteSubmitting && setDeleteTarget(null)}
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-t-2xl border border-[#E4E7EC] bg-white p-4 shadow-2xl sm:rounded-3xl sm:border-red-100/80 sm:p-0 sm:shadow-red-900/10 sm:ring-1 sm:ring-red-900/5">
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
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-shift-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#1F2937]/40 backdrop-blur-[1px] sm:bg-[#0C123A]/55 sm:backdrop-blur-sm"
            aria-label="Close dialog"
            onClick={() => !editSubmitting && closeEdit()}
          />
          <div className="relative flex max-h-[min(92dvh,760px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-[#E4E7EC] bg-white shadow-2xl sm:max-h-[min(92vh,760px)] sm:rounded-3xl sm:border-slate-200/90">
            <div className="relative shrink-0 overflow-hidden border-b border-[#E4E7EC] bg-white px-4 py-4 sm:border-amber-100/80 sm:bg-gradient-to-r sm:from-[#C99237]/25 sm:via-amber-50 sm:to-white sm:px-6 sm:py-5 sm:[border-top:3px_solid_#008CD3]">
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