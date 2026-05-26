"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import ManageAttendanceDetail from "./ManageAttendanceDetail";
import {
  Users,
  RefreshCw,
  Loader2,
  AlertCircle,
  Info,
  Search,
  ChevronRight,
  ClipboardList,
} from "lucide-react";
import { MdOpenInNew } from "react-icons/md";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type AttendanceRow = {
  user_id?: number | string;
  user_name?: string;
  user_email?: string;
  user_role_name?: string;
  attendance_history?: string;
  attendance_date?: string;
  attendance_status?: string;
};

type UserMonthlySummary = {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  present: number;
  late: number;
  leave: number;
  halfDay: number;
  shortLeave: number;
};

function toMonthKey(dateValue: string | undefined): string | null {
  if (!dateValue) return null;
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function normalizeStatus(status: string | undefined): "present" | "late" | "leave" | "half_day" | "short_leave" | "other" {
  const value = String(status || "").trim().toLowerCase();
  if (!value) return "other";
  if (value.includes("short") && value.includes("leave")) return "short_leave";
  if (value.includes("half")) return "half_day";
  if (value.includes("late")) return "late";
  if (value.includes("present")) return "present";
  if (value.includes("leave")) return "leave";
  return "other";
}

function getDefaultMonthValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatMonthYearLabel(ym: string): string {
  const [y, m] = ym.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  if (Number.isNaN(d.getTime())) return ym;
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function zohoSearchCls() {
  return "w-full rounded-lg border border-[#E4E7EC] bg-white py-2.5 pl-10 pr-4 text-[15px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15 lg:text-sm";
}

function zohoSelectCls() {
  return "w-full rounded-lg border border-[#E4E7EC] bg-white px-3 py-2.5 text-[15px] text-[#1F2937] outline-none transition focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15 lg:text-sm";
}

function zohoPrimaryBtnCls(full = false) {
  return `inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-[#008CD3] px-4 py-2 text-[14px] font-medium text-white transition active:scale-[0.98] hover:bg-[#0070AA] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full" : ""}`;
}

const USER_ICON_COLORS = [
  "bg-[#E8F4FB] text-[#008CD3]",
  "bg-[#E6F4EA] text-[#0F9D58]",
  "bg-[#FEF3E6] text-[#E8710A]",
  "bg-[#F3E8FD] text-[#7B1FA2]",
  "bg-[#FCE8E6] text-[#D93025]",
  "bg-[#E8EAF6] text-[#3F51B5]",
];

function userColorClass(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return USER_ICON_COLORS[Math.abs(hash) % USER_ICON_COLORS.length];
}

function userInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type MobileUserRowProps = {
  user: UserMonthlySummary;
  orgId: string;
};

function MobileUserAttendanceRow({ user, orgId }: MobileUserRowProps) {
  const href = `/dashboard/${orgId}/attendance-management/manage-attendance/0?employee_id=${encodeURIComponent(user.userId)}`;

  return (
    <li>
      <Link href={href} className="flex items-center gap-3 px-4 py-3.5 active:bg-[#F5F7FA]">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${userColorClass(user.userName)}`}
        >
          {userInitials(user.userName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-medium text-[#1F2937]">{user.userName}</p>
          <p className="truncate text-[13px] text-[#6B7280]">{user.userEmail}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-[#E6F4EA] px-2 py-0.5 text-[11px] font-medium text-[#0F9D58]">
              P {user.present}
            </span>
            <span className="rounded-full bg-[#FEF3E6] px-2 py-0.5 text-[11px] font-medium text-[#E8710A]">
              L {user.late}
            </span>
            <span className="rounded-full bg-[#FCE8E6] px-2 py-0.5 text-[11px] font-medium text-[#D93025]">
              Abs {user.leave}
            </span>
            <span className="rounded-full bg-[#E8F4FB] px-2 py-0.5 text-[11px] font-medium text-[#008CD3]">
              ½ {user.halfDay}
            </span>
            <span className="rounded-full bg-[#FFF8E1] px-2 py-0.5 text-[11px] font-medium text-[#F9A825]">
              SL {user.shortLeave}
            </span>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-[#9CA3AF]" aria-hidden />
      </Link>
    </li>
  );
}

function ManageAttendanceListPage() {
  const params = useParams();
  const orgId = String(params?.org_id ?? "");

  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(getDefaultMonthValue());
  const [mobileMainTab, setMobileMainTab] = useState<"team" | "overview">("team");
  const [userSearchQuery, setUserSearchQuery] = useState("");

  const loadAttendanceRows = useCallback(
    async (isManualRefresh = false) => {
      if (!orgId) {
        setError("Invalid organization.");
        setLoading(false);
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        setError("Not signed in.");
        setLoading(false);
        return;
      }

      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const q = encodeURIComponent(orgId);
        const res = await fetch(
          `${API_URL}/api/attendance-history/get-all-users-with-attendance-history?org_id=${q}`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const data = (await res.json()) as { data?: AttendanceRow[]; message?: string };
        if (!res.ok) {
          throw new Error(data.message || "Could not load attendance history.");
        }
        setRows(Array.isArray(data.data) ? data.data : []);
      } catch (e) {
        setRows([]);
        setError(e instanceof Error ? e.message : "Could not load attendance history.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orgId],
  );

  useEffect(() => {
    void loadAttendanceRows();
  }, [loadAttendanceRows]);

  const monthlySummary = useMemo(() => {
    const map = new Map<string, UserMonthlySummary>();

    for (const row of rows) {
      const rowDate = row.attendance_date || row.attendance_history;
      const rowMonth = toMonthKey(rowDate);
      if (!rowMonth || rowMonth !== selectedMonth) continue;

      const userId = String(row.user_id ?? "");
      if (!userId) continue;

      const existing =
        map.get(userId) ??
        {
          userId,
          userName: String(row.user_name || "Unknown User"),
          userEmail: String(row.user_email || "No email"),
          userRole: String(row.user_role_name || "employee"),
          present: 0,
          late: 0,
          leave: 0,
          halfDay: 0,
          shortLeave: 0,
        };

      const status = normalizeStatus(row.attendance_status);
      if (status === "present") existing.present += 1;
      if (status === "late") existing.late += 1;
      if (status === "leave") existing.leave += 1;
      if (status === "half_day") existing.halfDay += 1;
      if (status === "short_leave") existing.shortLeave += 1;

      map.set(userId, existing);
    }

    return Array.from(map.values()).sort((a, b) => a.userName.localeCompare(b.userName));
  }, [rows, selectedMonth]);

  const filteredSummary = useMemo(() => {
    const q = userSearchQuery.trim().toLowerCase();
    if (!q) return monthlySummary;
    return monthlySummary.filter(
      (u) =>
        u.userName.toLowerCase().includes(q) ||
        u.userEmail.toLowerCase().includes(q) ||
        u.userRole.toLowerCase().includes(q),
    );
  }, [monthlySummary, userSearchQuery]);

  const overviewStats = useMemo(() => {
    let present = 0;
    let late = 0;
    let leave = 0;
    let halfDay = 0;
    let shortLeave = 0;
    for (const u of monthlySummary) {
      present += u.present;
      late += u.late;
      leave += u.leave;
      halfDay += u.halfDay;
      shortLeave += u.shortLeave;
    }
    return { present, late, leave, halfDay, shortLeave };
  }, [monthlySummary]);

  const mobileTabs = [
    { id: "team" as const, label: "Team", count: monthlySummary.length },
    { id: "overview" as const, label: "Overview" },
  ];

  return (
    <div className="min-h-full bg-[#F5F7FA] lg:bg-transparent">
      {/* Mobile & tablet: Zoho admin portal style */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-20 border-b border-[#E4E7EC] bg-white shadow-sm">
          <div className="flex items-center gap-2 px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
              <ClipboardList className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[17px] font-semibold text-[#1F2937]">Team attendance</h1>
              <p className="truncate text-[13px] text-[#6B7280]">
                {loading
                  ? "Loading…"
                  : `${monthlySummary.length} user${monthlySummary.length === 1 ? "" : "s"} · ${formatMonthYearLabel(selectedMonth)}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadAttendanceRows(true)}
              disabled={loading || refreshing}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#008CD3] active:bg-[#F5F7FA] disabled:opacity-50"
              aria-label="Refresh attendance"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
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

          {mobileMainTab === "team" ? (
            <div className="space-y-2.5 border-t border-[#E4E7EC] px-4 py-2.5">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className={zohoSelectCls()}
                aria-label="Select month"
              />
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="search"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Search team members"
                  className={zohoSearchCls()}
                />
              </div>
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="mx-4 mt-3 flex items-start gap-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-4 py-3 text-[14px] text-[#D93025]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-[#6B7280]">
            <Loader2 className="h-9 w-9 animate-spin text-[#008CD3]" />
            <p className="text-[15px]">Loading attendance summary…</p>
          </div>
        ) : null}

        {!loading && !error && mobileMainTab === "overview" ? (
          <div className="space-y-3 p-4">
            <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Team members
              </p>
              <p className="mt-1 text-3xl font-semibold text-[#1F2937]">{monthlySummary.length}</p>
              <p className="mt-1 text-[14px] text-[#6B7280]">{formatMonthYearLabel(selectedMonth)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">Present</p>
                <p className="mt-1 text-2xl font-semibold text-[#0F9D58]">{overviewStats.present}</p>
              </div>
              <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">Late</p>
                <p className="mt-1 text-2xl font-semibold text-[#E8710A]">{overviewStats.late}</p>
              </div>
              <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">Leaves</p>
                <p className="mt-1 text-2xl font-semibold text-[#D93025]">{overviewStats.leave}</p>
              </div>
              <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">Half days</p>
                <p className="mt-1 text-2xl font-semibold text-[#008CD3]">{overviewStats.halfDay}</p>
              </div>
            </div>
            <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Short leaves
              </p>
              <p className="mt-1 text-2xl font-semibold text-[#F9A825]">{overviewStats.shortLeave}</p>
            </div>
            <div className="rounded-xl border border-[#E4E7EC] bg-[#E8F4FB] p-4">
              <div className="flex gap-3">
                <Info className="h-5 w-5 shrink-0 text-[#008CD3]" />
                <p className="text-[14px] leading-relaxed text-[#4B5563]">
                  Totals are aggregated across all team members for the selected month. Tap a person
                  in the Team tab to open their full attendance history.
                </p>
              </div>
            </div>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className={zohoSelectCls()}
              aria-label="Select month"
            />
          </div>
        ) : null}

        {!loading && !error && mobileMainTab === "team" && monthlySummary.length === 0 ? (
          <div className="mx-4 mt-4 rounded-xl border border-dashed border-[#E4E7EC] bg-white px-6 py-16 text-center">
            <Users className="mx-auto h-10 w-10 text-[#9CA3AF]" />
            <p className="mt-4 text-[17px] font-semibold text-[#1F2937]">No records this month</p>
            <p className="mt-2 text-[14px] text-[#6B7280]">
              Try selecting a different month.
            </p>
          </div>
        ) : null}

        {!loading && !error && mobileMainTab === "team" && monthlySummary.length > 0 ? (
          <ul className="mt-1 divide-y divide-[#E4E7EC] border-t border-[#E4E7EC] bg-white">
            {filteredSummary.length === 0 ? (
              <li className="px-4 py-12 text-center text-[15px] text-[#6B7280]">
                No team members match your search.
              </li>
            ) : (
              filteredSummary.map((user) => (
                <MobileUserAttendanceRow key={user.userId} user={user} orgId={orgId} />
              ))
            )}
          </ul>
        ) : null}
      </div>

      {/* Desktop layout (unchanged) */}
      <section className="hidden space-y-6 p-4 sm:p-6 lg:block">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
          Attendance Management
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#0C123A] sm:text-3xl">
          Team Attendance Analytics
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Review monthly attendance KPIs for all users and drill into full attendance history.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500" htmlFor="month-filter">
            Month
          </label>
          <input
            id="month-filter"
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-indigo-200 focus:ring-2"
          />
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {monthlySummary.length} User{monthlySummary.length === 1 ? "" : "s"}
          </span>
          <button
            type="button"
            onClick={() => void loadAttendanceRows(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </header>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Loading attendance summary...
        </div>
      ) : null}

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      {!loading && !error && monthlySummary.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
          No attendance records found for the selected month.
        </div>
      ) : null}

      {!loading && !error && monthlySummary.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {monthlySummary.map((user) => (
            <article key={user.userId} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="truncate text-lg font-semibold text-[#0C123A]">{user.userName}</h2>
                <p className="truncate text-xs text-slate-500">{user.userEmail}</p>
                <span className="mt-2 inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                  {user.userRole}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">Present: {user.present}</div>
                <div className="rounded-lg bg-amber-50 px-3 py-2 text-amber-700">Late: {user.late}</div>
                <div className="rounded-lg bg-rose-50 px-3 py-2 text-rose-700">Leaves: {user.leave}</div>
                <div className="rounded-lg bg-violet-50 px-3 py-2 text-violet-700">Half Days: {user.halfDay}</div>
                <div className="col-span-2 rounded-lg bg-sky-50 px-3 py-2 text-sky-700">
                  Short Leaves: {user.shortLeave}
                </div>
              </div>

              <Link
                href={`/dashboard/${orgId}/attendance-management/manage-attendance/0?employee_id=${encodeURIComponent(user.userId)}`}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0C123A] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#151e59]"
              >
                <MdOpenInNew className="text-base" />
                View Full History
              </Link>
            </article>
          ))}
        </div>
      ) : null}
    </section>
    </div>
  );
}

function ManageAttendancePageContent() {
  const searchParams = useSearchParams();
  const employeeId = searchParams.get("employee_id");

  if (employeeId) {
    return <ManageAttendanceDetail employeeId={employeeId} />;
  }

  return <ManageAttendanceListPage />;
}

export default function ManageAttendancePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-[#6B7280]">
          <Loader2 className="h-9 w-9 animate-spin text-[#008CD3]" />
          <p className="text-[15px]">Loading attendance…</p>
        </div>
      }
    >
      <ManageAttendancePageContent />
    </Suspense>
  );
}