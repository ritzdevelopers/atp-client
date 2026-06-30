"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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
  Clock,
  UserCheck,
  UserX,
  CalendarDays,
  Filter,
  X,
  Download,
} from "lucide-react";
import { MdOpenInNew } from "react-icons/md";
import {
  fetchBiometricManageAttendance,
  type AllUsersAttendanceQuery,
  type AttendanceHeaderData,
  type EmployeeAttendanceRow,
} from "@/services/attendanceHistory";
import { useBiometricAttendanceFeed } from "@/hooks/useBiometricAttendanceFeed";
import ExportAttendanceHistoryModal from "@/components/portal-dashboard/attendance/ExportAttendanceHistoryModal";

function getTodayYmd(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function ymdToParts(ymd: string) {
  const [year, month, day] = ymd.split("-");
  return {
    year: Number(year) || new Date().getFullYear(),
    month: Number(month) || new Date().getMonth() + 1,
    day: Number(day) || new Date().getDate(),
  };
}

function isFutureYmd(ymd: string): boolean {
  const value = String(ymd || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return value > getTodayYmd();
}

const FUTURE_DATE_ERROR =
  "You cannot select a future date. Please choose today or an earlier date.";

type AttendanceKpiFilter =
  | "all"
  | "present"
  | "absent"
  | "on_time"
  | "late";

function isPresentStatus(status: string | undefined): boolean {
  const value = String(status || "").trim().toLowerCase();
  return value === "present" || (value.includes("present") && !value.includes("absent"));
}

function isLateStatus(status: string | undefined): boolean {
  const value = String(status || "").trim().toLowerCase();
  return value.includes("late");
}

function isAbsentStatus(status: string | undefined): boolean {
  const value = String(status || "").trim().toLowerCase();
  if (!value || value === "absent") return true;
  return value.includes("absent") && !value.includes("present");
}

function matchesKpiFilter(
  status: string | undefined,
  filter: AttendanceKpiFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "present") {
    return isPresentStatus(status) || (isLateStatus(status) && !isAbsentStatus(status));
  }
  if (filter === "absent") return isAbsentStatus(status);
  if (filter === "on_time") return isPresentStatus(status);
  if (filter === "late") return isLateStatus(status);
  return true;
}

function kpiFilterLabel(filter: AttendanceKpiFilter): string {
  const labels: Record<AttendanceKpiFilter, string> = {
    all: "All employees",
    present: "Present",
    absent: "Absent",
    on_time: "On time",
    late: "Late check-in",
  };
  return labels[filter];
}

function formatDisplayDate(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(dateTime: string | undefined): string {
  if (!dateTime) return "—";
  const d = new Date(dateTime.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return dateTime;
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatWorkingHours(hours: number | undefined): string {
  if (hours === undefined || hours === null || hours <= 0) return "—";
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  if (minutes === 0) return `${wholeHours}h`;
  return `${wholeHours}h ${minutes}m`;
}

function formatStatusLabel(status: string | undefined): string {
  const raw = String(status || "").trim();
  if (!raw) return "N/A";
  return raw.replace(/_/g, " ");
}

function statusBadgeClass(status: string | undefined): string {
  const value = String(status || "").trim().toLowerCase();
  if (value === "present") return "bg-[#E6F4EA] text-[#0F9D58]";
  if (value.includes("late")) return "bg-[#FEF3E6] text-[#E8710A]";
  if (value.includes("leave")) return "bg-[#FCE8E6] text-[#D93025]";
  if (value.includes("absent")) return "bg-[#F5F7FA] text-[#6B7280]";
  if (value.includes("half")) return "bg-[#E8F4FB] text-[#008CD3]";
  return "bg-[#F5F7FA] text-[#6B7280]";
}

function zohoSearchCls() {
  return "w-full rounded-lg border border-[#E4E7EC] bg-white py-2 pl-9 pr-3 text-[14px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15";
}

function zohoSelectCls() {
  return "w-full rounded-lg border border-[#E4E7EC] bg-white px-3 py-2 text-[14px] text-[#1F2937] outline-none transition focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15";
}

function zohoPrimaryBtnCls(full = false) {
  return `inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-[#008CD3] px-4 py-2 text-[14px] font-medium text-white transition active:scale-[0.98] hover:bg-[#0070AA] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full" : ""}`;
}

function zohoSecondaryBtnCls() {
  return "inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-[#E4E7EC] bg-white px-3 py-2 text-[14px] font-medium text-[#374151] transition hover:bg-[#F9FAFB] disabled:pointer-events-none disabled:opacity-50";
}

function zohoPanelCls() {
  return "overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-sm";
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

type EmployeeMembershipTab = "active" | "inactive";

function membershipTabCls(active: boolean) {
  return `inline-flex min-h-[36px] flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] font-medium transition sm:text-[13px] ${
    active
      ? "bg-white text-[#008CD3] shadow-sm"
      : "text-[#6B7280] hover:text-[#374151]"
  }`;
}

const EMPTY_HEADER: AttendanceHeaderData = {
  total_company_employees: 0,
  inactive_company_employees: 0,
  selected_date_present_employees: 0,
  selected_date_absent_employees: 0,
  check_in_on_time_employees: 0,
  check_in_late_employees: 0,
  selected_date_on_leave_employees: 0,
};

type KpiCardProps = {
  label: string;
  value: number;
  tone: "neutral" | "success" | "warning" | "danger" | "info";
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
};

function KpiCard({ label, value, tone, icon, active = false, onClick }: KpiCardProps) {
  const toneMap = {
    neutral: "text-[#1F2937]",
    success: "text-[#0F9D58]",
    warning: "text-[#E8710A]",
    danger: "text-[#D93025]",
    info: "text-[#008CD3]",
  };

  const className = [
    zohoPanelCls(),
    "p-3 sm:p-4 text-left transition w-full",
    onClick
      ? "cursor-pointer hover:border-[#008CD3]/50 hover:shadow-md active:scale-[0.99]"
      : "",
    active ? "border-[#008CD3] bg-[#F8FCFF] ring-2 ring-[#008CD3]/15" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <div className="flex items-start justify-between gap-2">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
          {label}
        </p>
        <p className={`mt-1 text-2xl font-semibold tabular-nums ${toneMap[tone]}`}>
          {value}
        </p>
      </div>
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          active ? "bg-[#E8F4FB] text-[#008CD3]" : "bg-[#F5F7FA] text-[#6B7280]"
        }`}
      >
        {icon}
      </span>
    </div>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className} aria-pressed={active}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}

type EmployeeRowProps = {
  employee: EmployeeAttendanceRow;
  orgId: string;
  selectedDate: string;
  onExport?: (employee: EmployeeAttendanceRow) => void;
};

function formatPortalUserId(employee: EmployeeAttendanceRow): string {
  const id = employee.user_id ?? employee.employee_id;
  if (id == null || id === "" || Number(id) === 0) return "—";
  return String(id);
}

function formatEmployeeId(employee: EmployeeAttendanceRow): string {
  return employee.biometric_employee_code?.trim() || "—";
}

function employeeRowKey(employee: EmployeeAttendanceRow): string {
  if (employee.biometric_employee_code) {
    return `bio-${employee.biometric_employee_code}`;
  }
  const uid = employee.user_id ?? employee.employee_id;
  if (uid != null && Number(uid) > 0) {
    return `user-${uid}`;
  }
  if (employee.biometric_employee_id != null && employee.biometric_employee_id !== "") {
    return `device-${employee.biometric_employee_id}`;
  }
  return `emp-${employee.employee_name}`;
}

function MobileEmployeeRow({ employee, orgId, selectedDate, onExport }: EmployeeRowProps) {
  const userId = employee.user_id ?? employee.employee_id;
  const hasPortalUser = userId != null && Number(userId) > 0;
  const href = hasPortalUser
    ? `/dashboard/${orgId}/attendance-management/manage-attendance/0?employee_id=${encodeURIComponent(String(userId))}`
    : "#";
  const parts = ymdToParts(selectedDate);
  const rowClass = "block px-3 py-3.5 sm:px-4";

  const inner = (
    <div className="flex items-start gap-3">
      {employee.employee_profile_img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={employee.employee_profile_img}
          alt=""
          className="h-10 w-10 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold ${userColorClass(employee.employee_name)}`}
        >
          {userInitials(employee.employee_name)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-medium text-[#1F2937]">
              {employee.employee_name}
            </p>
            <p className="truncate text-[12px] text-[#6B7280]">
              {employee.employee_designation}
            </p>
            <p className="truncate text-[11px] text-[#9CA3AF]">
              Employee ID {formatEmployeeId(employee)}
              {formatPortalUserId(employee) !== "—"
                ? ` · Portal user ${formatPortalUserId(employee)}`
                : ""}
            </p>
            {!hasPortalUser ? (
              <p className="text-[11px] text-amber-600">Not linked to portal</p>
            ) : null}
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusBadgeClass(employee.employee_attendance_status)}`}
          >
            {formatStatusLabel(employee.employee_attendance_status)}
          </span>
        </div>
        {employee.is_active_employee === false ? (
          <span className="mt-1 inline-flex rounded-full bg-[#FEF3E6] px-2 py-0.5 text-[10px] font-semibold uppercase text-[#E8710A]">
            Inactive member
          </span>
        ) : null}
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[13px] text-[#6B7280]">
          <p>
            <span className="text-[#9CA3AF]">In </span>
            {formatTime(employee.attendance_check_in_time)}
          </p>
          <p>
            <span className="text-[#9CA3AF]">Out </span>
            {formatTime(employee.attendance_check_out_time)}
          </p>
          <p>
            <span className="text-[#9CA3AF]">Hours </span>
            {formatWorkingHours(employee.employee_working_hours)}
          </p>
          <p>
            <span className="text-[#9CA3AF]">Month P/L </span>
            {employee.total_present_days}/{employee.total_check_in_late_days}
          </p>
        </div>
        <p className="mt-1 text-[11px] text-[#9CA3AF]">
          {parts.month}/{parts.year} · {employee.total_attendance_days} days logged
        </p>
      </div>
      {hasPortalUser ? (
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[#9CA3AF]" aria-hidden />
      ) : null}
    </div>
  );

  return (
    <li className={rowClass}>
      <div className="flex items-start gap-2">
        {hasPortalUser ? (
          <Link href={href} className="min-w-0 flex-1 active:opacity-80">
            {inner}
          </Link>
        ) : (
          <div className="min-w-0 flex-1">{inner}</div>
        )}
        {hasPortalUser && onExport ? (
          <button
            type="button"
            onClick={() => onExport(employee)}
            className="mt-1 inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#E4E7EC] px-2 py-1.5 text-[11px] font-medium text-[#008CD3] transition hover:bg-[#E8F4FB]"
            aria-label={`Export attendance for ${employee.employee_name}`}
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </li>
  );
}

function ManageAttendanceListPage() {
  const params = useParams();
  const orgId = String(params?.org_id ?? "");

  const [headerData, setHeaderData] = useState<AttendanceHeaderData>(EMPTY_HEADER);
  const [employees, setEmployees] = useState<EmployeeAttendanceRow[]>([]);
  const [selectedDate, setSelectedDate] = useState(getTodayYmd);
  const [statusFilter, setStatusFilter] = useState("");
  const [activeKpiFilter, setActiveKpiFilter] = useState<AttendanceKpiFilter>("all");
  const [appliedQuery, setAppliedQuery] = useState<AllUsersAttendanceQuery>(() => {
    const today = getTodayYmd();
    const parts = ymdToParts(today);
    return { date: today, month: parts.month, year: parts.year };
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [employeeMembershipTab, setEmployeeMembershipTab] =
    useState<EmployeeMembershipTab>("active");
  const [mobileMainTab, setMobileMainTab] = useState<"team" | "overview">("team");
  const [dateToast, setDateToast] = useState<{ id: number; message: string } | null>(null);
  const [exportEmployee, setExportEmployee] =
    useState<EmployeeAttendanceRow | null>(null);

  const maxSelectableDate = useMemo(() => getTodayYmd(), []);

  const showDateError = useCallback((message = FUTURE_DATE_ERROR) => {
    setDateToast({ id: Date.now(), message });
  }, []);

  useEffect(() => {
    if (!dateToast) return;
    const timer = window.setTimeout(() => setDateToast(null), 6000);
    return () => window.clearTimeout(timer);
  }, [dateToast]);

  const handleDateChange = useCallback(
    (value: string) => {
      if (!value) {
        setSelectedDate(value);
        return;
      }
      if (isFutureYmd(value)) {
        showDateError();
        return;
      }
      setSelectedDate(value);
    },
    [showDateError],
  );

  const loadAttendance = useCallback(
    async (query: AllUsersAttendanceQuery, isManualRefresh = false) => {
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

      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const data = await fetchBiometricManageAttendance(token, orgId, query);
        setHeaderData(data.header_data ?? EMPTY_HEADER);
        setEmployees(Array.isArray(data.employees_attendance_data) ? data.employees_attendance_data : []);
        if (data.selected_date) {
          setSelectedDate(data.selected_date);
        }
      } catch (e) {
        setHeaderData(EMPTY_HEADER);
        setEmployees([]);
        setError(e instanceof Error ? e.message : "Could not load attendance.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orgId],
  );

  useEffect(() => {
    const today = getTodayYmd();
    const parts = ymdToParts(today);
    const initialQuery = { date: today, month: parts.month, year: parts.year };
    setAppliedQuery(initialQuery);
    setSelectedDate(today);
    void loadAttendance(initialQuery);
  }, [loadAttendance]);

  const { lastEvent } = useBiometricAttendanceFeed(orgId || undefined);

  useEffect(() => {
    if (!lastEvent || !appliedQuery?.date) return;
    if (lastEvent.attendance_date !== appliedQuery.date) return;
    if (
      lastEvent.event_type === "duplicate_check_in" ||
      lastEvent.event_type === "duplicate_check_out"
    ) {
      return;
    }
    void loadAttendance(appliedQuery, true);
  }, [lastEvent, appliedQuery, loadAttendance]);

  // Poll machine DB while viewing today so check-out appears after 6:30 punches.
  useEffect(() => {
    const viewedDate = appliedQuery.date || selectedDate;
    if (!orgId || viewedDate !== getTodayYmd()) return;

    const timer = window.setInterval(() => {
      void loadAttendance(appliedQuery, true);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [orgId, appliedQuery, selectedDate, loadAttendance]);

  const applyFilters = () => {
    if (!selectedDate || isFutureYmd(selectedDate)) {
      showDateError();
      return;
    }
    const parts = ymdToParts(selectedDate);
    const query: AllUsersAttendanceQuery = {
      date: selectedDate,
      month: parts.month,
      year: parts.year,
    };
    setActiveKpiFilter("all");
    setStatusFilter("");
    setEmployeeMembershipTab("active");
    setAppliedQuery(query);
    void loadAttendance(query);
  };

  const resetToToday = () => {
    const today = getTodayYmd();
    const parts = ymdToParts(today);
    setSelectedDate(today);
    setStatusFilter("");
    setActiveKpiFilter("all");
    setEmployeeMembershipTab("active");
    const query = { date: today, month: parts.month, year: parts.year };
    setAppliedQuery(query);
    void loadAttendance(query, true);
  };

  const handleKpiFilterClick = useCallback((filter: AttendanceKpiFilter) => {
    setEmployeeMembershipTab("active");
    setActiveKpiFilter((prev) => (prev === filter ? "all" : filter));
    setMobileMainTab("team");
  }, []);

  const handleMembershipTabChange = useCallback((tab: EmployeeMembershipTab) => {
    setEmployeeMembershipTab(tab);
    if (tab === "inactive") {
      setActiveKpiFilter("all");
    }
  }, []);

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.is_active_employee !== false),
    [employees],
  );

  const inactiveEmployees = useMemo(
    () => employees.filter((e) => e.is_active_employee === false),
    [employees],
  );

  const membershipTabEmployees = useMemo(
    () => (employeeMembershipTab === "active" ? activeEmployees : inactiveEmployees),
    [activeEmployees, inactiveEmployees, employeeMembershipTab],
  );

  const inactiveEmployeeCount =
    headerData.inactive_company_employees ?? inactiveEmployees.length;

  const filteredEmployees = useMemo(() => {
    let list = membershipTabEmployees;

    if (employeeMembershipTab === "active" && activeKpiFilter !== "all") {
      list = list.filter((e) =>
        matchesKpiFilter(e.employee_attendance_status, activeKpiFilter),
      );
    }

    if (statusFilter) {
      list = list.filter(
        (e) =>
          String(e.employee_attendance_status || "").trim().toLowerCase() ===
          statusFilter.trim().toLowerCase(),
      );
    }

    const q = userSearchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (e) =>
        e.employee_name.toLowerCase().includes(q) ||
        e.employee_email.toLowerCase().includes(q) ||
        e.employee_designation.toLowerCase().includes(q) ||
        e.employee_phone.toLowerCase().includes(q),
    );
  }, [
    membershipTabEmployees,
    employeeMembershipTab,
    activeKpiFilter,
    statusFilter,
    userSearchQuery,
  ]);

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    for (const e of membershipTabEmployees) {
      if (e.employee_attendance_status) set.add(e.employee_attendance_status);
    }
    return Array.from(set).sort();
  }, [membershipTabEmployees]);

  const mobileTabs = [
    { id: "team" as const, label: "Attendance", count: filteredEmployees.length },
    { id: "overview" as const, label: "Summary" },
  ];

  const displayDateLabel = formatDisplayDate(appliedQuery.date || selectedDate);

  return (
    <div className="min-h-full bg-[#F5F7FA] lg:bg-transparent">
      {/* Mobile & tablet */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-20 border-b border-[#E4E7EC] bg-white shadow-sm">
          <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
              <ClipboardList className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[16px] font-semibold text-[#1F2937]">
                Daily attendance
              </h1>
              <p className="truncate text-[12px] text-[#6B7280]">
                {loading ? "Loading…" : displayDateLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={resetToToday}
              disabled={loading || refreshing}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#008CD3] active:bg-[#F5F7FA] disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="px-3 pb-2.5 sm:px-4">
            <div className="flex rounded-lg bg-[#F5F7FA] p-0.5">
              {mobileTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMobileMainTab(tab.id)}
                  className={`flex min-h-[36px] flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-[12px] font-medium transition ${
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

          <div className="border-t border-[#E4E7EC] px-3 py-2 sm:px-4">
            <div className="flex rounded-lg bg-[#F5F7FA] p-0.5">
              <button
                type="button"
                onClick={() => handleMembershipTabChange("active")}
                className={membershipTabCls(employeeMembershipTab === "active")}
              >
                Active
                <span
                  className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] ${
                    employeeMembershipTab === "active"
                      ? "bg-[#E8F4FB] text-[#008CD3]"
                      : "bg-[#E4E7EC] text-[#6B7280]"
                  }`}
                >
                  {activeEmployees.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleMembershipTabChange("inactive")}
                className={membershipTabCls(employeeMembershipTab === "inactive")}
              >
                Inactive
                <span
                  className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] ${
                    employeeMembershipTab === "inactive"
                      ? "bg-[#FEF3E6] text-[#E8710A]"
                      : "bg-[#E4E7EC] text-[#6B7280]"
                  }`}
                >
                  {inactiveEmployeeCount}
                </span>
              </button>
            </div>
          </div>

          {mobileMainTab === "team" ? (
            <div className="space-y-2 border-t border-[#E4E7EC] px-3 py-2.5 sm:px-4">
              <input
                type="date"
                value={selectedDate}
                max={maxSelectableDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className={zohoSelectCls()}
                aria-label="Select date"
              />
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={zohoSelectCls()}
                  aria-label="Filter by status"
                >
                  <option value="">All statuses</option>
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {formatStatusLabel(s)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={applyFilters}
                  disabled={loading || refreshing}
                  className={zohoPrimaryBtnCls()}
                >
                  Apply
                </button>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="search"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Search employees"
                  className={zohoSearchCls()}
                />
              </div>
              {!loading && !error && employeeMembershipTab === "active" ? (
                <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
                  {(
                    [
                      ["all", "All", headerData.total_company_employees],
                      ["present", "Present", headerData.selected_date_present_employees],
                      ["absent", "Absent", headerData.selected_date_absent_employees],
                      ["on_time", "On time", headerData.check_in_on_time_employees],
                      ["late", "Late", headerData.check_in_late_employees],
                    ] as const
                  ).map(([id, label, count]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleKpiFilterClick(id)}
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                        activeKpiFilter === id
                          ? "border-[#008CD3] bg-[#E8F4FB] text-[#008CD3]"
                          : "border-[#E4E7EC] bg-white text-[#6B7280]"
                      }`}
                    >
                      {label}
                      <span className="tabular-nums">{count}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="mx-3 mt-2 flex items-start gap-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2.5 text-[13px] text-[#1F2937] sm:mx-4">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#D93025]" />
            <span>{error}</span>
          </div>
        ) : null}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-[#6B7280]">
            <Loader2 className="h-8 w-8 animate-spin text-[#008CD3]" />
            <p className="text-[14px]">Loading attendance…</p>
          </div>
        ) : null}

        {!loading && !error && mobileMainTab === "overview" ? (
          <div className="space-y-2.5 p-3 sm:p-4">
            <p className="text-[13px] font-medium text-[#6B7280]">{displayDateLabel}</p>
            <div className="grid grid-cols-2 gap-2">
              <KpiCard
                label="Total employees"
                value={headerData.total_company_employees}
                tone="neutral"
                icon={<Users className="h-4 w-4" />}
                active={activeKpiFilter === "all"}
                onClick={() => handleKpiFilterClick("all")}
              />
              <KpiCard
                label="Present"
                value={headerData.selected_date_present_employees}
                tone="success"
                icon={<UserCheck className="h-4 w-4" />}
                active={activeKpiFilter === "present"}
                onClick={() => handleKpiFilterClick("present")}
              />
              <KpiCard
                label="Absent"
                value={headerData.selected_date_absent_employees}
                tone="danger"
                icon={<UserX className="h-4 w-4" />}
                active={activeKpiFilter === "absent"}
                onClick={() => handleKpiFilterClick("absent")}
              />
              <KpiCard
                label="On time"
                value={headerData.check_in_on_time_employees}
                tone="success"
                icon={<Clock className="h-4 w-4" />}
                active={activeKpiFilter === "on_time"}
                onClick={() => handleKpiFilterClick("on_time")}
              />
              <KpiCard
                label="Late"
                value={headerData.check_in_late_employees}
                tone="warning"
                icon={<Clock className="h-4 w-4" />}
                active={activeKpiFilter === "late"}
                onClick={() => handleKpiFilterClick("late")}
              />
            </div>
            <div className="rounded-lg border border-[#E4E7EC] bg-[#E8F4FB] p-3">
              <div className="flex gap-2.5">
                <Info className="h-4 w-4 shrink-0 text-[#008CD3]" />
                <p className="text-[13px] leading-relaxed text-[#4B5563]">
                  Summary reflects all active employees for the selected date. Monthly stats on
                  each row are based on the selected date&apos;s month.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {!loading && !error && mobileMainTab === "team" && employeeMembershipTab === "inactive" ? (
          <div className="mx-3 mt-2 rounded-lg border border-[#FEF3E6] bg-[#FFFBF5] px-3 py-2 text-[12px] text-[#92400E] sm:mx-4">
            Showing inactive org members only. Attendance KPI filters apply to active employees.
          </div>
        ) : null}

        {!loading && !error && mobileMainTab === "team" && activeKpiFilter !== "all" ? (
          <div className="mx-3 mt-2 flex items-center justify-between gap-2 rounded-lg border border-[#CFE8F7] bg-[#E8F4FB] px-3 py-2 text-[12px] sm:mx-4">
            <span className="font-medium text-[#008CD3]">
              Showing {kpiFilterLabel(activeKpiFilter)} · {filteredEmployees.length} employee
              {filteredEmployees.length === 1 ? "" : "s"}
            </span>
            <button
              type="button"
              onClick={() => setActiveKpiFilter("all")}
              className="shrink-0 font-semibold text-[#0070AA] underline-offset-2 hover:underline"
            >
              Clear
            </button>
          </div>
        ) : null}

        {!loading && !error && mobileMainTab === "team" && filteredEmployees.length === 0 ? (
          <div className="mx-3 mt-3 rounded-lg border border-dashed border-[#E4E7EC] bg-white px-4 py-12 text-center sm:mx-4">
            <Users className="mx-auto h-9 w-9 text-[#9CA3AF]" />
            <p className="mt-3 text-[15px] font-semibold text-[#1F2937]">No records found</p>
            <p className="mt-1.5 text-[13px] text-[#6B7280]">
              Try a different date, clear the KPI filter, or adjust the status filter.
            </p>
          </div>
        ) : null}

        {!loading && !error && mobileMainTab === "team" && filteredEmployees.length > 0 ? (
          <ul className="mt-1 divide-y divide-[#E4E7EC] border-t border-[#E4E7EC] bg-white">
            {filteredEmployees.map((employee) => (
              <MobileEmployeeRow
                key={employeeRowKey(employee)}
                employee={employee}
                orgId={orgId}
                selectedDate={appliedQuery.date || selectedDate}
                onExport={setExportEmployee}
              />
            ))}
          </ul>
        ) : null}
      </div>

      {/* Desktop */}
      <section className="hidden lg:block">
        <div className="mx-auto max-w-7xl space-y-4 px-6 py-6">
          <header className={`${zohoPanelCls()} p-4`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
                  <ClipboardList className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
                    Attendance management
                  </p>
                  <h1 className="text-[20px] font-semibold text-[#1F2937]">Daily attendance</h1>
                  <p className="mt-0.5 text-[13px] text-[#6B7280]">{displayDateLabel}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={resetToToday} className={zohoSecondaryBtnCls()}>
                  <CalendarDays className="h-4 w-4" />
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => void loadAttendance(appliedQuery, true)}
                  disabled={loading || refreshing}
                  className={zohoSecondaryBtnCls()}
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                  {refreshing ? "Refreshing…" : "Refresh"}
                </button>
              </div>
            </div>
          </header>

          {!loading && !error && employeeMembershipTab === "active" ? (
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
              <KpiCard
                label="Total employees"
                value={headerData.total_company_employees}
                tone="neutral"
                icon={<Users className="h-4 w-4" />}
                active={activeKpiFilter === "all"}
                onClick={() => handleKpiFilterClick("all")}
              />
              <KpiCard
                label="Present"
                value={headerData.selected_date_present_employees}
                tone="success"
                icon={<UserCheck className="h-4 w-4" />}
                active={activeKpiFilter === "present"}
                onClick={() => handleKpiFilterClick("present")}
              />
              <KpiCard
                label="Absent"
                value={headerData.selected_date_absent_employees}
                tone="danger"
                icon={<UserX className="h-4 w-4" />}
                active={activeKpiFilter === "absent"}
                onClick={() => handleKpiFilterClick("absent")}
              />
              <KpiCard
                label="On time"
                value={headerData.check_in_on_time_employees}
                tone="success"
                icon={<Clock className="h-4 w-4" />}
                active={activeKpiFilter === "on_time"}
                onClick={() => handleKpiFilterClick("on_time")}
              />
              <KpiCard
                label="Late check-in"
                value={headerData.check_in_late_employees}
                tone="warning"
                icon={<Clock className="h-4 w-4" />}
                active={activeKpiFilter === "late"}
                onClick={() => handleKpiFilterClick("late")}
              />
            </div>
          ) : null}

          <div className={`${zohoPanelCls()} p-1.5`}>
            <div className="flex rounded-lg bg-[#F5F7FA] p-0.5">
              <button
                type="button"
                onClick={() => handleMembershipTabChange("active")}
                className={membershipTabCls(employeeMembershipTab === "active")}
              >
                Active employees
                <span
                  className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] ${
                    employeeMembershipTab === "active"
                      ? "bg-[#E8F4FB] text-[#008CD3]"
                      : "bg-[#E4E7EC] text-[#6B7280]"
                  }`}
                >
                  {activeEmployees.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleMembershipTabChange("inactive")}
                className={membershipTabCls(employeeMembershipTab === "inactive")}
              >
                Inactive employees
                <span
                  className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] ${
                    employeeMembershipTab === "inactive"
                      ? "bg-[#FEF3E6] text-[#E8710A]"
                      : "bg-[#E4E7EC] text-[#6B7280]"
                  }`}
                >
                  {inactiveEmployeeCount}
                </span>
              </button>
            </div>
          </div>

          {employeeMembershipTab === "inactive" ? (
            <div className="rounded-lg border border-[#FEF3E6] bg-[#FFFBF5] px-4 py-2.5 text-[13px] text-[#92400E]">
              Inactive org members are listed separately. Attendance summary KPIs reflect active
              employees only.
            </div>
          ) : null}

          <div className={`${zohoPanelCls()} p-4`}>
            <div className="mb-3 flex items-center gap-2 text-[13px] font-medium text-[#374151]">
              <Filter className="h-4 w-4 text-[#6B7280]" />
              Filters
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
              <div>
                <label htmlFor="date-filter" className="mb-1 block text-[12px] font-medium text-[#374151]">
                  Date
                </label>
                <input
                  id="date-filter"
                  type="date"
                  value={selectedDate}
                  max={maxSelectableDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className={zohoSelectCls()}
                />
              </div>
              <div>
                <label htmlFor="status-filter" className="mb-1 block text-[12px] font-medium text-[#374151]">
                  Status
                </label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={zohoSelectCls()}
                >
                  <option value="">All statuses</option>
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {formatStatusLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="user-search" className="mb-1 block text-[12px] font-medium text-[#374151]">
                  Search
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    id="user-search"
                    type="search"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Name, email, role, or phone"
                    className={zohoSearchCls()}
                  />
                </div>
              </div>
              <div>
                <button
                  type="button"
                  onClick={applyFilters}
                  disabled={loading || refreshing}
                  className={`${zohoPrimaryBtnCls(true)} mt-[22px]`}
                >
                  Apply filters
                </button>
              </div>
            </div>
            <p className="mt-3 text-[12px] text-[#6B7280]">
              Date is sent as <code className="rounded bg-[#F5F7FA] px-1">YYYY-MM-DD</code> (e.g.{" "}
              {appliedQuery.date || "2026-06-04"}).
            </p>
          </div>

          {loading ? (
            <div className={`${zohoPanelCls()} flex flex-col items-center gap-2 py-12 text-[#6B7280]`}>
              <Loader2 className="h-8 w-8 animate-spin text-[#008CD3]" />
              <p className="text-[14px]">Loading attendance…</p>
            </div>
          ) : null}

          {error ? (
            <div className="flex items-start gap-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2.5 text-[13px] text-[#1F2937]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#D93025]" />
              <span>{error}</span>
            </div>
          ) : null}

          {!loading && !error && employeeMembershipTab === "active" && activeKpiFilter !== "all" ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-[#CFE8F7] bg-[#E8F4FB] px-4 py-2.5 text-[13px]">
              <span className="font-medium text-[#008CD3]">
                Showing {kpiFilterLabel(activeKpiFilter)} · {filteredEmployees.length} of{" "}
                {membershipTabEmployees.length} active employees
              </span>
              <button
                type="button"
                onClick={() => setActiveKpiFilter("all")}
                className="shrink-0 font-semibold text-[#0070AA] hover:underline"
              >
                Clear filter
              </button>
            </div>
          ) : null}

          {!loading && !error && filteredEmployees.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#E4E7EC] bg-white px-6 py-12 text-center">
              <Users className="mx-auto h-9 w-9 text-[#9CA3AF]" />
              <p className="mt-3 text-[15px] font-semibold text-[#1F2937]">No records found</p>
              <p className="mt-1 text-[13px] text-[#6B7280]">
                Try a different date, clear the KPI filter, or adjust the status filter.
              </p>
            </div>
          ) : null}

          {!loading && !error && filteredEmployees.length > 0 ? (
            <div className={`${zohoPanelCls()} overflow-x-auto`}>
              <table className="min-w-full text-left text-[13px]">
                <thead className="border-b border-[#E4E7EC] bg-[#F9FAFB]">
                  <tr>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
                      Employee
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
                      Employee ID
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
                      Portal user ID
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
                      Check in
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
                      Check out
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
                      Hours worked
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
                      Status
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
                      Month stats
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E7EC]">
                  {filteredEmployees.map((employee) => {
                    const rowKey = employeeRowKey(employee);
                    const portalUserId = employee.user_id ?? employee.employee_id;
                    const hasPortalUser =
                      portalUserId != null && Number(portalUserId) > 0;

                    return (
                    <tr key={rowKey} className="hover:bg-[#F9FAFB]/80">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {employee.employee_profile_img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={employee.employee_profile_img}
                              alt=""
                              className="h-9 w-9 rounded-lg object-cover"
                            />
                          ) : (
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold ${userColorClass(employee.employee_name)}`}
                            >
                              {userInitials(employee.employee_name)}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-medium text-[#1F2937]">
                              {employee.employee_name}
                            </p>
                            <p className="truncate text-[12px] text-[#6B7280]">
                              {employee.employee_email}
                            </p>
                            <p className="text-[11px] uppercase tracking-wide text-[#9CA3AF]">
                              {employee.employee_designation}
                            </p>
                            {employee.is_active_employee === false ? (
                              <span className="mt-1 inline-flex rounded-full bg-[#FEF3E6] px-2 py-0.5 text-[10px] font-semibold uppercase text-[#E8710A]">
                                Inactive member
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[12px] font-medium text-[#1F2937]">
                        {formatEmployeeId(employee)}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-[12px] text-[#6B7280]">
                        {formatPortalUserId(employee)}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-[#374151]">
                        {formatTime(employee.attendance_check_in_time)}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-[#374151]">
                        {formatTime(employee.attendance_check_out_time)}
                      </td>
                      <td className="px-4 py-3 font-medium tabular-nums text-[#008CD3]">
                        {formatWorkingHours(employee.employee_working_hours)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${statusBadgeClass(employee.employee_attendance_status)}`}
                        >
                          {formatStatusLabel(employee.employee_attendance_status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#6B7280]">
                        <div className="space-y-0.5">
                          <p>
                            Present <span className="font-medium text-[#0F9D58]">{employee.total_present_days}</span>
                            {" · "}
                            Late <span className="font-medium text-[#E8710A]">{employee.total_check_in_late_days}</span>
                          </p>
                          <p>
                            Absent {employee.total_absent_days} · Leave {employee.total_on_leave_days}
                          </p>
                          <p className="text-[11px] text-[#9CA3AF]">
                            {employee.total_attendance_days} days logged
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {hasPortalUser ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setExportEmployee(employee)}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#E4E7EC] px-2.5 py-1.5 text-[12px] font-medium text-[#374151] transition hover:bg-[#F9FAFB]"
                            >
                              <Download className="text-[14px]" />
                              Export
                            </button>
                            <Link
                              href={`/dashboard/${orgId}/attendance-management/manage-attendance/0?employee_id=${encodeURIComponent(String(portalUserId))}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#E4E7EC] px-2.5 py-1.5 text-[12px] font-medium text-[#008CD3] transition hover:bg-[#E8F4FB]"
                            >
                              <MdOpenInNew className="text-[14px]" />
                              History
                            </Link>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#9CA3AF]">Unmapped</span>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="border-t border-[#E4E7EC] bg-[#F9FAFB] px-4 py-2.5 text-[12px] text-[#6B7280]">
                Showing {filteredEmployees.length} of {membershipTabEmployees.length}{" "}
                {employeeMembershipTab === "active" ? "active" : "inactive"} employees · Biometric DB
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {dateToast && typeof document !== "undefined"
        ? createPortal(
            <div
              className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[10000] flex justify-center px-3 lg:bottom-6"
              role="alert"
              aria-live="assertive"
            >
              <div className="pointer-events-auto flex max-w-md items-start gap-2.5 rounded-lg border border-[#F5C6C2] bg-white px-3 py-2.5 text-[#1F2937] shadow-lg sm:min-w-[320px]">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FCE8E6] text-[#D93025]">
                  <AlertCircle className="h-5 w-5" strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-[13px] font-semibold text-[#1F2937]">Date</p>
                  <p className="mt-0.5 text-[12px] leading-snug text-[#6B7280]">
                    {dateToast.message}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDateToast(null)}
                  className="shrink-0 rounded-lg p-1 text-[#9CA3AF] transition hover:bg-[#F3F4F6] hover:text-[#374151]"
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}

      <ExportAttendanceHistoryModal
        open={exportEmployee != null}
        onClose={() => setExportEmployee(null)}
        orgId={orgId}
        employee={exportEmployee}
      />
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
        <div className="flex flex-col items-center justify-center gap-2 bg-[#F5F7FA] py-20 text-[#6B7280]">
          <Loader2 className="h-8 w-8 animate-spin text-[#008CD3]" />
          <p className="text-[14px]">Loading attendance…</p>
        </div>
      }
    >
      <ManageAttendancePageContent />
    </Suspense>
  );
}
