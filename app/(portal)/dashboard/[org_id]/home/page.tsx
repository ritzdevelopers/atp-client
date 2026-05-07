"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { BarChart3, Building2, UserCircle } from "lucide-react";
import { MdWorkspacePremium } from "react-icons/md";
import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import type {
  RightMainSideOrganization,
  RightMainSideUser,
} from "@/components/portal-dashboard/Layout/RightMainSide";
import {
  formatAttendanceLogLocal,
  formatAttendanceTimeLocal,
  formatWorkingTimeDisplay,
  getAttendanceDayVisual,
  getTodayLocalYmd,
  localYmdFromAttendanceValue,
} from "@/lib/attendanceDates";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type AttendanceHistoryRow = {
  attendance_date?: string;
  check_in?: string | null;
  check_out?: string | null;
  attendance_status?: string | null;
  working_time?: string | number | null;
};

type EmployeeDashboardResponse = {
  attendance_history?: AttendanceHistoryRow[];
  employee?: {
    mark_attendance_late_after?: string | null;
  };
  employees?: {
    mark_attendance_late_after?: string | null;
  };
};

function formatElapsedDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

function formatJoinedDate(value: string | Date | null | undefined): string {
  if (value == null || value === "") return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function greetingForHour(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function displayNameFromEmail(email: string | null | undefined): string {
  if (!email?.trim()) return "there";
  const local = email.split("@")[0] ?? "";
  const cleaned = local.replace(/[._-]+/g, " ").trim();
  if (!cleaned) return "there";
  return cleaned
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function formatRoleLabel(role: string | null | undefined): string {
  const r = (role ?? "").trim().toLowerCase();
  if (r === "admin") return "Admin";
  if (r === "hr") return "HR";
  if (r === "manager" || r === "manger") return "Manager";
  if (!r) return "Member";
  return r.charAt(0).toUpperCase() + r.slice(1).toLowerCase();
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  const display = value != null && String(value).length > 0 ? String(value) : "—";
  return (
    <div className="flex flex-row items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0 last:pb-0 first:pt-0">
      <span className="shrink-0 text-sm text-slate-500">{label}</span>
      <span className="min-w-0 text-right text-sm font-semibold text-[#0C123A]">{display}</span>
    </div>
  );
}

function DashboardCard({
  icon: Icon,
  title,
  delayMs,
  children,
  id,
}: {
  icon: typeof Building2;
  title: string;
  delayMs: number;
  children: React.ReactNode;
  id: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="dashboard-enter rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition-all duration-300 hover:border-slate-300 hover:shadow-md"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C99237]/12">
          <Icon className="h-5 w-5 shrink-0 text-[#C99237]" aria-hidden />
        </span>
        <h2 id={`${id}-title`} className="text-base font-semibold text-[#0C123A]">
          {title}
        </h2>
      </div>
      <div className="my-4 border-t border-slate-100" />
      <div className="flex flex-col">{children}</div>
    </section>
  );
}

function HomeOverview({
  organization,
  user,
  orgId,
}: {
  organization: RightMainSideOrganization;
  user: RightMainSideUser;
  orgId: number;
}) {
  const roleKey = user.user_role_name?.trim().toLowerCase() ?? "";
  const roleBadgeLabel = formatRoleLabel(user.user_role_name);
  const displayName = user.user_name?.trim() || displayNameFromEmail(user.user_email);
  const orgTitle = organization.org_name?.trim() || "Your organization";
  const ownerName = organization.owner_name ?? organization.owner_info?.name;
  const ownerEmail = organization.owner_email ?? organization.owner_info?.email;
  const ownerPhone = organization.owner_phone;

  const normalized = (v: string | number | null | undefined) => String(v ?? "").trim().toLowerCase();
  const ownerMatchesUser =
    (organization.owner_id != null && String(organization.owner_id) === String(user.user_id)) ||
    (!!normalized(ownerEmail) && normalized(ownerEmail) === normalized(user.user_email)) ||
    (!!normalized(ownerPhone) && normalized(ownerPhone) === normalized(user.user_phone)) ||
    (!!normalized(ownerName) && normalized(ownerName) === normalized(user.user_name));
  const showAttendance = roleKey !== "admin";

  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [attendanceActionError, setAttendanceActionError] = useState<string | null>(null);
  const [attendanceData, setAttendanceData] = useState<EmployeeDashboardResponse | null>(null);
  const [checkInSubmitting, setCheckInSubmitting] = useState(false);
  const [checkOutSubmitting, setCheckOutSubmitting] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    async function loadAttendance() {
      if (!showAttendance || !orgId || Number.isNaN(orgId)) return;
      const token = localStorage.getItem("token");
      if (!token) return;
      setAttendanceLoading(true);
      setAttendanceError(null);
      try {
        const q = encodeURIComponent(String(orgId));
        const res = await fetch(`${API_URL}/api/employees/get-employees-full-information?org_id=${q}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = (await res.json()) as EmployeeDashboardResponse & { message?: string };
        if (!res.ok) throw new Error(result.message || "Could not load attendance");
        setAttendanceData(result);
      } catch (e) {
        setAttendanceError(e instanceof Error ? e.message : "Could not load attendance");
      } finally {
        setAttendanceLoading(false);
      }
    }
    void loadAttendance();
  }, [orgId, showAttendance]);

  const todayYmd = getTodayLocalYmd(new Date());
  const historyMap = useMemo(() => {
    const map = new Map<string, AttendanceHistoryRow>();
    for (const row of attendanceData?.attendance_history ?? []) {
      const key = localYmdFromAttendanceValue(row.attendance_date);
      if (key) map.set(key, row);
    }
    return map;
  }, [attendanceData?.attendance_history]);
  const todayRecord = historyMap.get(todayYmd);
  const hasCheckedInToday = Boolean(todayRecord?.check_in);
  const hasCheckedOutToday = Boolean(todayRecord?.check_out);
  const checkInInstant = todayRecord?.check_in ? new Date(String(todayRecord.check_in)) : null;
  const checkInValid = checkInInstant && !Number.isNaN(checkInInstant.getTime());
  const showLiveTimer = Boolean(checkInValid && hasCheckedInToday && !hasCheckedOutToday);

  useEffect(() => {
    if (!showLiveTimer) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [showLiveTimer]);

  const liveElapsedMs =
    showLiveTimer && checkInValid ? Date.now() - checkInInstant.getTime() + 0 * tick : 0;
  const workingHoursDisplay = showLiveTimer
    ? formatElapsedDuration(liveElapsedMs)
    : formatWorkingTimeDisplay(todayRecord?.working_time);
  const attendanceEmployee = attendanceData?.employee ?? attendanceData?.employees;
  const lateAfter = attendanceEmployee?.mark_attendance_late_after
    ? String(attendanceEmployee.mark_attendance_late_after).slice(0, 5)
    : "—";

  async function markCheckIn() {
    if (!orgId || Number.isNaN(orgId)) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    setCheckInSubmitting(true);
    setAttendanceActionError(null);
    try {
      const n = new Date();
      const yyyy = n.getFullYear();
      const mm = String(n.getMonth() + 1).padStart(2, "0");
      const dd = String(n.getDate()).padStart(2, "0");
      const hh = String(n.getHours()).padStart(2, "0");
      const min = String(n.getMinutes()).padStart(2, "0");
      const res = await fetch(`${API_URL}/api/employees/mark-attendance-check-in`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ org_id: orgId, user_date: `${yyyy}-${mm}-${dd}`, user_time: `${hh}:${min}` }),
      });
      const result = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(result.message || "Could not mark check-in");
      const q = encodeURIComponent(String(orgId));
      const refresh = await fetch(`${API_URL}/api/employees/get-employees-full-information?org_id=${q}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const refreshData = (await refresh.json()) as EmployeeDashboardResponse & { message?: string };
      if (refresh.ok) setAttendanceData(refreshData);
    } catch (e) {
      setAttendanceActionError(e instanceof Error ? e.message : "Could not mark check-in.");
    } finally {
      setCheckInSubmitting(false);
    }
  }

  async function markCheckOut() {
    if (!orgId || Number.isNaN(orgId)) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    setCheckOutSubmitting(true);
    setAttendanceActionError(null);
    try {
      const n = new Date();
      const yyyy = n.getFullYear();
      const mm = String(n.getMonth() + 1).padStart(2, "0");
      const dd = String(n.getDate()).padStart(2, "0");
      const res = await fetch(`${API_URL}/api/employees/mark-attendance-check-out`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ org_id: orgId, user_date: `${yyyy}-${mm}-${dd}`, user_time: new Date().toISOString() }),
      });
      const result = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(result.message || "Could not mark check-out");
      const q = encodeURIComponent(String(orgId));
      const refresh = await fetch(`${API_URL}/api/employees/get-employees-full-information?org_id=${q}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const refreshData = (await refresh.json()) as EmployeeDashboardResponse & { message?: string };
      if (refresh.ok) setAttendanceData(refreshData);
    } catch (e) {
      setAttendanceActionError(e instanceof Error ? e.message : "Could not mark check-out.");
    } finally {
      setCheckOutSubmitting(false);
    }
  }

  const roleBadgeClass =
    roleKey === "admin"
      ? "bg-[#C99237] text-[#0C123A]"
      : roleKey === "hr"
        ? "bg-[#0C123A] text-white"
        : roleKey === "manager" || roleKey === "manger"
          ? "border-2 border-[#C99237] bg-white text-[#0C123A]"
          : "bg-slate-200 text-[#0C123A]";

  return (
    <div className="space-y-8">
      <header
        className="dashboard-enter rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8"
        style={{ animationDelay: "0ms" }}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-3 text-2xl font-bold tracking-tight text-[#0C123A] sm:text-3xl">
              <span>
                {greetingForHour()}, {displayName}
              </span>
              <MdWorkspacePremium
                className="h-8 w-8 shrink-0 text-[#C99237] sm:h-9 sm:w-9"
                aria-hidden
              />
            </h1>
            <p className="mt-2 text-sm text-slate-500">{orgTitle}</p>
          </div>
          <span
            className={`inline-flex w-fit shrink-0 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide ${roleBadgeClass}`}
          >
            {roleBadgeLabel}
          </span>
        </div>
      </header>

      <div className={`grid grid-cols-1 gap-6 ${ownerMatchesUser ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}>
        <DashboardCard icon={Building2} title="Organization" delayMs={100} id="dash-org-card">
          <InfoRow label="Name" value={organization.org_name} />
          <InfoRow label="Email" value={organization.org_email} />
          <InfoRow label="Phone" value={organization.org_phone} />
        </DashboardCard>

        {!ownerMatchesUser ? (
          <DashboardCard icon={UserCircle} title="Owner" delayMs={200} id="dash-owner-card">
            <InfoRow label="Name" value={ownerName} />
            <InfoRow label="Email" value={ownerEmail} />
            <InfoRow label="Phone" value={ownerPhone} />
          </DashboardCard>
        ) : null}

        <DashboardCard
          icon={BarChart3}
          title={ownerMatchesUser ? "Owner account" : "Your account"}
          delayMs={ownerMatchesUser ? 200 : 300}
          id="dash-account-card"
        >
          <InfoRow label="Full name" value={user.user_name} />
          <InfoRow label="Email" value={user.user_email} />
          <InfoRow label="Phone" value={user.user_phone} />
          <InfoRow label="Role" value={formatRoleLabel(user.user_role_name)} />
          <InfoRow label="Member since" value={formatJoinedDate(user.user_created_at)} />
        </DashboardCard>
      </div>

      {showAttendance ? (
        <section className="dashboard-enter rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-[#0C123A]">Attendance</h2>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                String(todayRecord?.attendance_status || "").toLowerCase().includes("late")
                  ? "bg-orange-100 text-orange-700"
                  : String(todayRecord?.attendance_status || "").toLowerCase().includes("full_day")
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-700"
              }`}
            >
              {todayRecord?.attendance_status
                ? String(todayRecord.attendance_status).replace(/_/g, " ").toUpperCase()
                : "NO STATUS"}
            </span>
          </div>
          {attendanceLoading ? <p className="mt-3 text-sm text-slate-500">Loading attendance...</p> : null}
          {attendanceError ? <p className="mt-3 text-sm text-red-600">{attendanceError}</p> : null}
          <div className="mt-4 grid gap-3 sm:grid-cols-5">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Today Log</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {hasCheckedInToday ? formatAttendanceLogLocal(todayRecord?.check_in) : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">
                {showLiveTimer ? "Working (live)" : "Working Hours"}
              </p>
              <p className="mt-1 text-sm font-semibold tabular-nums text-slate-800">
                {String(workingHoursDisplay)}
              </p>
              {showLiveTimer ? (
                <p className="mt-1 text-[10px] text-slate-500">Timer runs until you check out</p>
              ) : null}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Late After</p>
              <p className="mt-1 text-sm font-semibold text-rose-500">{lateAfter}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Check Out Time</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {hasCheckedOutToday ? formatAttendanceTimeLocal(todayRecord?.check_out) : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Day Color</p>
              <span
                className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                  getAttendanceDayVisual(todayRecord?.attendance_status).boxClass
                }`}
              >
                {getAttendanceDayVisual(todayRecord?.attendance_status).meaning}
              </span>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void markCheckIn()}
              disabled={hasCheckedInToday || checkInSubmitting}
              className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {checkInSubmitting ? "Marking..." : "Check In"}
            </button>
            <button
              type="button"
              onClick={() => void markCheckOut()}
              disabled={!hasCheckedInToday || hasCheckedOutToday || checkOutSubmitting}
              className="rounded-md bg-rose-600 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {checkOutSubmitting ? "Processing..." : hasCheckedOutToday ? "Checked Out" : "Check Out"}
            </button>
          </div>
          {attendanceActionError ? <p className="mt-3 text-sm text-red-600">{attendanceActionError}</p> : null}
        </section>
      ) : null}
    </div>
  );
}

export default function HomePage() {
  const ctx = useManagementDashboardContext();
  const params = useParams();
  const orgId = Number(params?.org_id);

  if (!ctx) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-[#0C123A]">Home</p>
      </div>
    );
  }

  const { organization, user, loading } = ctx;

  if (loading || !organization || !user) {
    return (
      <div
        className="dashboard-enter rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
        style={{ animationDelay: "0ms" }}
      >
        <p className="text-base font-medium text-[#0C123A]">
          {loading ? "Loading dashboard…" : "Could not load organization."}
        </p>
      </div>
    );
  }

  return <HomeOverview organization={organization} user={user} orgId={orgId} />;
}
