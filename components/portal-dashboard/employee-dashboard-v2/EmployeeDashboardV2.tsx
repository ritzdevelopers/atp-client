"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import EmployeeDashboardSkeleton from "./components/EmployeeDashboardSkeleton";
import { fetchMyRegularizationBalance } from "@/services/regularization";
import {
  formatAttendanceTimeLocal,
  getLocalYmdFromDate,
  getTodayLocalYmd,
  parseAttendanceNaiveLocal,
} from "@/lib/attendanceDates";
import {
  mapEmployeeLeaveBalanceRows,
  summarizeLeaveBalances,
} from "@/lib/leaveBalanceDisplay";
import Announcements from "./components/Announcements";
import AttendanceCard from "./components/AttendanceCard";
import CalendarWidget from "./components/CalendarWidget";
import DashboardCompactHeader from "./components/DashboardCompactHeader";
import DashboardOverviewPanel from "./components/DashboardOverviewPanel";
import DashboardPanel from "./components/DashboardPanel";
import DashboardTabNav, { type DashboardTab } from "./components/DashboardTabNav";
import LeaveSummary from "./components/LeaveSummary";
import MonthlyProgress from "./components/MonthlyProgress";
import PayrollSummary from "./components/PayrollSummary";
import PerformanceCard from "./components/PerformanceCard";
import ProfileCard from "./components/ProfileCard";
import ProjectStatus from "./components/ProjectStatus";
import QuickActions from "./components/QuickActions";
import RecentActivity from "./components/RecentActivity";
import TeamMembers from "./components/TeamMembers";
import UpcomingMeetings from "./components/UpcomingMeetings";
import UpcomingTasks from "./components/UpcomingTasks";
import { useEmployeeDashboardV2Data } from "./hooks/useEmployeeDashboardV2Data";
import {
  formatElapsedDuration,
  formatMinutesAsHours,
} from "./utils";

export default function EmployeeDashboardV2() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("home");
  const [regBalanceRemaining, setRegBalanceRemaining] = useState<number | null>(null);

  const {
    orgId,
    orgIdParam,
    orgResolving,
    loading,
    refreshing,
    error,
    data,
    emp,
    owner,
    org,
    teams,
    addresses,
    handoverPendingCount,
    holidays,
    tasks,
    attendanceStats,
    todayRecord,
    hasCheckedInToday,
    hasCheckedOutToday,
    historyMap,
    attendanceActionError,
    checkInSubmitting,
    checkOutSubmitting,
    markCheckIn,
    markCheckOut,
    refresh,
  } = useEmployeeDashboardV2Data();

  useEffect(() => {
    if (orgResolving || orgId == null || Number.isNaN(orgId)) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    let cancelled = false;
    void fetchMyRegularizationBalance(token, orgId)
      .then((balance) => {
        if (!cancelled) {
          setRegBalanceRemaining(balance.is_available ? balance.remaining : 0);
        }
      })
      .catch(() => {
        if (!cancelled) setRegBalanceRemaining(null);
      });
    return () => {
      cancelled = true;
    };
  }, [orgId, orgResolving, data]);

  const [tick, setTick] = useState(0);
  const todayYmd = getTodayLocalYmd();

  const checkInInstant = parseAttendanceNaiveLocal(todayRecord?.check_in);
  const checkInValid =
    checkInInstant && !Number.isNaN(checkInInstant.getTime());
  const showLiveTimer = Boolean(
    checkInValid && hasCheckedInToday && !hasCheckedOutToday,
  );

  useEffect(() => {
    if (!showLiveTimer) return;
    const firstTick = window.setTimeout(() => setTick(Date.now()), 0);
    const id = window.setInterval(() => setTick(Date.now()), 1000);
    return () => {
      window.clearTimeout(firstTick);
      window.clearInterval(id);
    };
  }, [showLiveTimer]);

  const liveElapsedMs =
    showLiveTimer && checkInValid && tick > 0
      ? tick - checkInInstant.getTime()
      : 0;

  const workingHoursDisplay = showLiveTimer
    ? formatElapsedDuration(liveElapsedMs)
    : formatMinutesAsHours(todayRecord?.working_time);

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }).map((_, idx) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - idx));
        const ymd = getLocalYmdFromDate(d);
        const row = historyMap.get(ymd);
        return {
          label: d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2),
          ymd,
          status: row?.attendance_status,
          isToday: ymd === todayYmd,
        };
      }),
    [historyMap, todayYmd],
  );

  const leaveBalances = useMemo(
    () => mapEmployeeLeaveBalanceRows(data?.employee_leave_balances ?? []),
    [data?.employee_leave_balances],
  );

  const leaveSummary = useMemo(
    () =>
      data?.leave_summary ??
      summarizeLeaveBalances(data?.employee_leave_balances ?? []),
    [data?.leave_summary, data?.employee_leave_balances],
  );

  const employeeName = emp?.user_name?.trim() || "Employee";
  const profileImage =
    emp?.user_image != null && String(emp.user_image).trim() !== ""
      ? String(emp.user_image).trim()
      : null;

  const pendingTaskCount = tasks.filter((t) => t.task_status !== "completed").length;

  const statusLabel = todayRecord?.attendance_status
    ? String(todayRecord.attendance_status).replace(/_/g, " ")
    : hasCheckedInToday
      ? "Checked in"
      : "Not checked in";

  if ((orgResolving || loading) && !data) {
    return <EmployeeDashboardSkeleton />;
  }

  if (error && !data) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center p-4">
        <div
          className="flex max-w-md items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-800"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">Could not load dashboard</p>
            <p className="mt-1 text-sm">{error}</p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="mt-3 rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-enter relative flex h-full min-h-0 flex-col overflow-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[280px] bg-gradient-to-b from-[#FDE8F3]/25 via-[#F4F6F9] to-transparent"
        aria-hidden
      />

      <div className="relative flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-2 py-2 sm:gap-3 sm:px-3 sm:py-3">
        <DashboardCompactHeader
          employeeName={employeeName}
          roleName={emp?.user_role_name}
          shiftName={emp?.user_shift_name}
          orgName={org?.org_name ?? undefined}
          profileImageUrl={profileImage}
          monthProgress={attendanceStats.monthProgress}
          presentDays={attendanceStats.presentDays}
          leaveBalance={leaveSummary.remaining_leaves}
          checkInLabel={formatAttendanceTimeLocal(todayRecord?.check_in)}
          checkOutLabel={formatAttendanceTimeLocal(todayRecord?.check_out)}
          workingHoursDisplay={workingHoursDisplay}
          showLiveTimer={showLiveTimer}
          statusLabel={statusLabel}
          orgId={orgIdParam}
          refreshing={refreshing}
          onRefresh={() => void refresh()}
        />

        <DashboardTabNav
          active={activeTab}
          onChange={setActiveTab}
          taskCount={pendingTaskCount}
          handoverCount={handoverPendingCount}
        />

        <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === "home" ? (
          <DashboardPanel scrollable={false}>
            <DashboardOverviewPanel
              onNavigate={setActiveTab}
              orgId={orgIdParam}
              handoverPending={handoverPendingCount}
              taskCount={pendingTaskCount}
              workingHours={workingHoursDisplay}
              checkInTime={formatAttendanceTimeLocal(todayRecord?.check_in)}
            />
          </DashboardPanel>
        ) : null}

        {activeTab === "attendance" ? (
          <DashboardPanel>
            <AttendanceCard
              todayRecord={todayRecord}
              weekDays={weekDays}
              hasCheckedIn={hasCheckedInToday}
              hasCheckedOut={hasCheckedOutToday}
              workingHoursDisplay={workingHoursDisplay}
              showLiveTimer={showLiveTimer}
              checkInSubmitting={checkInSubmitting}
              checkOutSubmitting={checkOutSubmitting}
              actionError={attendanceActionError}
              onCheckIn={() => void markCheckIn()}
              onCheckOut={() => void markCheckOut()}
              orgId={orgIdParam}
              regularizationRemaining={regBalanceRemaining}
            />
          </DashboardPanel>
        ) : null}

        {activeTab === "leave" ? (
          <DashboardPanel>
            <div className="grid gap-3 lg:grid-cols-2">
              <LeaveSummary balances={leaveBalances} summary={leaveSummary} />
              <MonthlyProgress stats={attendanceStats} />
            </div>
          </DashboardPanel>
        ) : null}

        {activeTab === "tasks" ? (
          <DashboardPanel>
            <div className="grid gap-3 lg:grid-cols-2">
              <UpcomingTasks tasks={tasks} orgId={orgIdParam} />
              <ProjectStatus tasks={tasks} orgId={orgIdParam} />
            </div>
          </DashboardPanel>
        ) : null}

        {activeTab === "team" ? (
          <DashboardPanel>
            <div className="grid gap-3 lg:grid-cols-2">
              <TeamMembers teams={teams} orgId={orgIdParam} />
              <UpcomingMeetings shiftStart={emp?.user_shift_start_time} />
            </div>
          </DashboardPanel>
        ) : null}

        {activeTab === "insights" ? (
          <DashboardPanel>
            <div className="grid gap-3 lg:grid-cols-2">
              <PerformanceCard history={data?.attendance_history ?? []} />
              <RecentActivity history={data?.attendance_history ?? []} />
            </div>
          </DashboardPanel>
        ) : null}

        {activeTab === "calendar" ? (
          <DashboardPanel>
            <CalendarWidget holidays={holidays} />
          </DashboardPanel>
        ) : null}

        {activeTab === "profile" ? (
          <DashboardPanel>
            <div className="grid gap-3 lg:grid-cols-2">
              <ProfileCard
                name={employeeName}
                employeeId={emp?.id}
                email={emp?.user_email}
                phone={emp?.user_phone}
                roleName={emp?.user_role_name}
                shiftStart={emp?.user_shift_start_time}
                shiftEnd={emp?.user_shift_end_time}
                shiftName={emp?.user_shift_name}
                joinedDate={emp?.created_at}
                managerName={owner?.user_name}
                orgName={org?.org_name}
                imageUrl={profileImage}
                addressCount={addresses.length}
                emergencyContact={emp?.user_emergency_contact}
              />
              <PayrollSummary
                roleName={emp?.user_role_name}
                shiftName={emp?.user_shift_name}
                joinedDate={emp?.created_at}
              />
            </div>
          </DashboardPanel>
        ) : null}

        {activeTab === "news" ? (
          <DashboardPanel>
            <div className="space-y-3">
              <Announcements
                orgName={org?.org_name}
                handoverPending={handoverPendingCount}
              />
              <QuickActions orgId={orgIdParam} handoverPending={handoverPendingCount} />
            </div>
          </DashboardPanel>
        ) : null}
        </div>
      </div>
    </div>
  );
}
