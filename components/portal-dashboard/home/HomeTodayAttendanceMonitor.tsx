"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ChevronRight,
  Clock,
  LogIn,
  LogOut,
  RefreshCw,
  Search,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import {
  fetchBiometricManageAttendance,
  type AttendanceHeaderData,
  type EmployeeAttendanceRow,
} from "@/services/attendanceHistory";
import { useBiometricAttendanceFeed } from "@/hooks/useBiometricAttendanceFeed";
import { getTodayLocalYmd } from "@/lib/attendanceDates";
import {
  attendanceKpiFilterLabel,
  attendanceStatusBadgeClass,
  formatAttendanceRowTime,
  formatAttendanceStatusLabel,
  matchesAttendanceKpiFilter,
  ymdToMonthYear,
  type AttendanceKpiFilter,
} from "@/lib/attendanceKpiFilters";
import {
  btnBrandCls,
  btnGhostCls,
  dashCardCls,
  dashLabelCls,
  dashSectionMetaCls,
  dashSectionTitleCls,
  iconBadgeCls,
  statBoxCls,
  userInitials,
} from "@/components/portal-dashboard/home/dashboardTokens";

const ATTENDANCE_POLL_MS = 60_000;

const EMPTY_HEADER: AttendanceHeaderData = {
  total_company_employees: 0,
  inactive_company_employees: 0,
  selected_date_present_employees: 0,
  selected_date_absent_employees: 0,
  check_in_on_time_employees: 0,
  check_in_late_employees: 0,
  selected_date_on_leave_employees: 0,
};

function Shimmer({ className = "" }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-xl ${className}`} />;
}

function MonitorSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Shimmer key={i} className="h-[76px]" />
        ))}
      </div>
      <Shimmer className="h-10 w-full max-w-sm" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Shimmer key={i} className="h-[72px]" />
        ))}
      </div>
    </div>
  );
}

function StatPill({
  label,
  value,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: number;
  tone: "sky" | "emerald" | "amber" | "default" | "rose";
  active?: boolean;
  onClick?: () => void;
}) {
  const cls = `${statBoxCls(tone === "sky" ? "sky" : tone === "emerald" ? "emerald" : tone === "amber" ? "amber" : "default")} w-full text-left transition ${
    onClick ? "cursor-pointer hover:ring-2 hover:ring-[#008CD3]/15" : ""
  } ${active ? "ring-2 ring-[#008CD3]/25" : ""}`;

  const content = (
    <>
      <p className={dashLabelCls}>{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-slate-900 sm:text-2xl">{value}</p>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        {content}
      </button>
    );
  }

  return <div className={cls}>{content}</div>;
}

type HomeTodayAttendanceMonitorProps = {
  orgId: string;
};

export default function HomeTodayAttendanceMonitor({ orgId }: HomeTodayAttendanceMonitorProps) {
  const todayYmd = getTodayLocalYmd();
  const manageHref = `/dashboard/${encodeURIComponent(orgId)}/attendance-management/manage-attendance`;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [headerData, setHeaderData] = useState<AttendanceHeaderData>(EMPTY_HEADER);
  const [employees, setEmployees] = useState<EmployeeAttendanceRow[]>([]);
  const [activeFilter, setActiveFilter] = useState<AttendanceKpiFilter>("all");
  const [search, setSearch] = useState("");

  const loadAttendance = useCallback(
    async (isRefresh = false) => {
      if (!orgId) return;
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Not signed in.");
        setLoading(false);
        return;
      }

      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const { month, year } = ymdToMonthYear(todayYmd);
        const data = await fetchBiometricManageAttendance(token, orgId, {
          date: todayYmd,
          month,
          year,
        });
        setHeaderData(data.header_data ?? EMPTY_HEADER);
        setEmployees(
          Array.isArray(data.employees_attendance_data)
            ? data.employees_attendance_data
            : [],
        );
      } catch (e) {
        setHeaderData(EMPTY_HEADER);
        setEmployees([]);
        setError(e instanceof Error ? e.message : "Could not load today's attendance.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orgId, todayYmd],
  );

  useEffect(() => {
    void loadAttendance(false);
  }, [loadAttendance]);

  const { lastEvent } = useBiometricAttendanceFeed(orgId || undefined);

  useEffect(() => {
    if (!lastEvent || lastEvent.attendance_date !== todayYmd) return;
    if (
      lastEvent.event_type === "duplicate_check_in" ||
      lastEvent.event_type === "duplicate_check_out"
    ) {
      return;
    }
    void loadAttendance(true);
  }, [lastEvent, todayYmd, loadAttendance]);

  useEffect(() => {
    if (!orgId) return;
    const timer = window.setInterval(() => {
      void loadAttendance(true);
    }, ATTENDANCE_POLL_MS);
    return () => window.clearInterval(timer);
  }, [orgId, loadAttendance]);

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((emp) => {
      if (!matchesAttendanceKpiFilter(emp.employee_attendance_status, activeFilter)) {
        return false;
      }
      if (!q) return true;
      return (
        emp.employee_name.toLowerCase().includes(q) ||
        String(emp.employee_id).includes(q) ||
        String(emp.user_id ?? "").includes(q) ||
        (emp.emp_code ?? "").toLowerCase().includes(q)
      );
    });
  }, [employees, activeFilter, search]);

  const punchSummary = useMemo(() => {
    let checkedIn = 0;
    let checkedOut = 0;
    for (const emp of employees) {
      if (emp.attendance_check_in_time) checkedIn += 1;
      if (emp.attendance_check_out_time) checkedOut += 1;
    }
    return { checkedIn, checkedOut };
  }, [employees]);

  const filterOptions: { id: AttendanceKpiFilter; count: number }[] = [
    { id: "all", count: employees.length },
    { id: "present", count: headerData.selected_date_present_employees },
    { id: "absent", count: headerData.selected_date_absent_employees },
    { id: "on_time", count: headerData.check_in_on_time_employees },
    { id: "late", count: headerData.check_in_late_employees },
  ];

  if (loading && employees.length === 0) {
    return <MonitorSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" aria-hidden />
            Live · today
          </span>
          <p className={dashSectionMetaCls}>
            {punchSummary.checkedIn} punched in · {punchSummary.checkedOut} punched out
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void loadAttendance(true)}
            disabled={refreshing}
            className={btnGhostCls()}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
            Refresh
          </button>
          <Link href={manageHref} className={btnBrandCls()}>
            Open attendance hub
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200/80 bg-rose-50 px-4 py-3 text-[13px] text-rose-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatPill
          label="Present"
          value={headerData.selected_date_present_employees}
          tone="emerald"
          active={activeFilter === "present"}
          onClick={() => setActiveFilter("present")}
        />
        <StatPill
          label="Absent"
          value={headerData.selected_date_absent_employees}
          tone="default"
          active={activeFilter === "absent"}
          onClick={() => setActiveFilter("absent")}
        />
        <StatPill
          label="On time"
          value={headerData.check_in_on_time_employees}
          tone="sky"
          active={activeFilter === "on_time"}
          onClick={() => setActiveFilter("on_time")}
        />
        <StatPill
          label="Late check-in"
          value={headerData.check_in_late_employees}
          tone="amber"
          active={activeFilter === "late"}
          onClick={() => setActiveFilter("late")}
        />
        <StatPill
          label="On leave"
          value={headerData.selected_date_on_leave_employees ?? 0}
          tone="rose"
        />
      </div>

      <div className={`${dashCardCls} flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between`}>
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setActiveFilter(opt.id)}
              className={`rounded-xl px-3 py-1.5 text-[12px] font-semibold transition ${
                activeFilter === opt.id
                  ? "bg-[#008CD3] text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
              }`}
            >
              {attendanceKpiFilterLabel(opt.id)}
              <span className="ml-1 opacity-80">({opt.count})</span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee…"
            className="w-full rounded-xl border border-slate-200/90 bg-white py-2.5 pl-10 pr-3 text-[14px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15"
          />
        </div>
      </div>

      {filteredEmployees.length === 0 ? (
        <div className={`${dashCardCls} px-6 py-12 text-center`}>
          <Users className="mx-auto h-9 w-9 text-slate-300" aria-hidden />
          <p className="mt-2 text-[14px] font-medium text-slate-900">No employees in this view</p>
          <p className={`mt-1 ${dashSectionMetaCls}`}>
            Try another filter or clear your search.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filteredEmployees.slice(0, 12).map((emp, index) => {
            const userId = emp.user_id ?? emp.employee_id;
            const detailHref =
              userId != null && Number(userId) > 0
                ? `/dashboard/${orgId}/attendance-management/manage-attendance/0?employee_id=${encodeURIComponent(String(userId))}`
                : manageHref;

            return (
              <li
                key={`${emp.employee_id}-${emp.employee_name}`}
                className="card-fade-in"
                style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
              >
                <Link
                  href={detailHref}
                  className={`${dashCardCls} flex flex-col gap-3 p-4 transition hover:border-[#008CD3]/20 hover:shadow-md sm:flex-row sm:items-center sm:justify-between`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {emp.employee_profile_img ? (
                      <img
                        src={emp.employee_profile_img}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-white"
                      />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-50 text-[12px] font-bold text-[#008CD3]">
                        {userInitials(emp.employee_name)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-slate-900">
                        {emp.employee_name}
                      </p>
                      <p className={dashSectionMetaCls}>
                        {emp.employee_designation || "Employee"}
                        {emp.emp_code ? ` · ${emp.emp_code}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                    <div className="flex items-center gap-3 text-[12px] text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <LogIn className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                        {formatAttendanceRowTime(emp.attendance_check_in_time)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <LogOut className="h-3.5 w-3.5 text-rose-500" aria-hidden />
                        {formatAttendanceRowTime(emp.attendance_check_out_time)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-[#008CD3]" aria-hidden />
                        {emp.employee_working_hours > 0
                          ? `${emp.employee_working_hours.toFixed(1)}h`
                          : "—"}
                      </span>
                    </div>
                    <span
                      className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${attendanceStatusBadgeClass(emp.employee_attendance_status)}`}
                    >
                      {formatAttendanceStatusLabel(emp.employee_attendance_status)}
                    </span>
                    <ChevronRight className="hidden h-4 w-4 text-slate-300 sm:block" aria-hidden />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {filteredEmployees.length > 12 ? (
        <p className={`text-center ${dashSectionMetaCls}`}>
          Showing 12 of {filteredEmployees.length} employees.{" "}
          <Link href={manageHref} className="font-medium text-[#008CD3] hover:underline">
            View all in attendance hub
          </Link>
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className={`${dashCardCls} flex items-center gap-3 p-4`}>
          <span className={iconBadgeCls("emerald")}>
            <UserCheck className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className={dashSectionTitleCls}>{headerData.total_company_employees}</p>
            <p className={dashSectionMetaCls}>Total active employees monitored</p>
          </div>
        </div>
        <div className={`${dashCardCls} flex items-center gap-3 p-4`}>
          <span className={iconBadgeCls("amber")}>
            <UserX className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className={dashSectionTitleCls}>{headerData.inactive_company_employees ?? 0}</p>
            <p className={dashSectionMetaCls}>Inactive members (excluded from counts)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
