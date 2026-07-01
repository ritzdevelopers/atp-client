"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  CalendarDays,
  ClipboardList,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  fetchSingleUserAttendanceHistory,
  fetchTeamMemberAttendanceHistory,
  type AttendanceHistoryQuery,
  type AttendanceHistoryRow,
} from "@/services/attendanceHistory";

function getDefaultMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getCurrentQueryParts() {
  const now = new Date();
  return {
    date: now.getDate(),
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

function toMonthKey(dateValue: string | undefined): string | null {
  if (!dateValue) return null;
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatDate(dateValue: string | undefined): string {
  if (!dateValue) return "—";
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return String(dateValue);
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(dateValue: string | undefined): string {
  if (!dateValue) return "—";
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return String(dateValue);
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatWorkingTime(minutesValue: string | number | undefined): string {
  if (minutesValue === undefined || minutesValue === null || minutesValue === "") return "—";
  const minutesNum = Number(minutesValue);
  if (Number.isNaN(minutesNum) || minutesNum < 0) return String(minutesValue);
  const hours = Math.floor(minutesNum / 60);
  const minutes = minutesNum % 60;
  return `${hours}h ${minutes}m`;
}

function normalizeStatus(
  status: string | undefined,
): "present" | "late" | "leave" | "half_day" | "short_leave" | "other" {
  const value = String(status || "").trim().toLowerCase();
  if (!value) return "other";
  if (value.includes("short") && value.includes("leave")) return "short_leave";
  if (value.includes("half")) return "half_day";
  if (value.includes("late")) return "late";
  if (value.includes("present")) return "present";
  if (value.includes("leave") || value.includes("absent")) return "leave";
  return "other";
}

function statusBadgeClass(status: string | undefined): string {
  const bucket = normalizeStatus(status);
  if (bucket === "present") return "bg-[#E6F4EA] text-[#0F9D58]";
  if (bucket === "late") return "bg-[#FEF3E6] text-[#E8710A]";
  if (bucket === "leave") return "bg-[#FCE8E6] text-[#D93025]";
  if (bucket === "half_day") return "bg-[#E8F4FB] text-[#008CD3]";
  if (bucket === "short_leave") return "bg-[#FFF8E1] text-[#F9A825]";
  return "bg-[#F5F7FA] text-[#6B7280]";
}

function formatStatusLabel(status: string | undefined): string {
  const raw = String(status || "").trim();
  if (!raw) return "N/A";
  return raw.replace(/_/g, " ");
}

function zohoSelectCls() {
  return "w-full rounded-lg border border-[#E4E7EC] bg-white px-2.5 py-2 text-[13px] text-[#1F2937] outline-none transition focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15";
}

type TeamMemberAttendancePanelProps = {
  orgId: string;
  teamId: number;
  employeeId: number;
  employeeName: string;
  onClose: () => void;
  accessMode?: "team_leader" | "org_admin";
};

export default function TeamMemberAttendancePanel({
  orgId,
  teamId,
  employeeId,
  employeeName,
  onClose,
  accessMode = "team_leader",
}: TeamMemberAttendancePanelProps) {
  const [rows, setRows] = useState<AttendanceHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panelTab, setPanelTab] = useState<"log" | "insights">("log");
  const [selectedMonth, setSelectedMonth] = useState(getDefaultMonthValue());
  const [selectedDate, setSelectedDate] = useState(String(new Date().getDate()));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [appliedQuery, setAppliedQuery] = useState<AttendanceHistoryQuery>(() => {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  });

  const loadHistory = useCallback(
    async (isManualRefresh = false, queryOverride?: AttendanceHistoryQuery) => {
      const token = localStorage.getItem("token");
      if (!token || !orgId || !teamId || !employeeId) {
        setError("Not signed in.");
        setLoading(false);
        return;
      }

      const queryParts = queryOverride ?? appliedQuery;
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const data =
          accessMode === "org_admin"
            ? await fetchSingleUserAttendanceHistory(
                token,
                orgId,
                employeeId,
                queryParts,
              )
            : await fetchTeamMemberAttendanceHistory(
                token,
                orgId,
                teamId,
                employeeId,
                queryParts,
              );
        setRows(data);
      } catch (e) {
        setRows([]);
        setError(e instanceof Error ? e.message : "Could not load attendance history.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessMode, appliedQuery, employeeId, orgId, teamId],
  );

  useEffect(() => {
    const now = new Date();
    const current: AttendanceHistoryQuery = {
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    };
    setAppliedQuery(current);
    setSelectedDate(String(now.getDate()));
    setSelectedMonth(`${current.year}-${String(current.month).padStart(2, "0")}`);
    setSelectedYear(String(current.year));
    setPanelTab("log");
    void loadHistory(false, current);
  }, [employeeId, orgId, teamId]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedMonthValue = useMemo(() => {
    const [year, month] = selectedMonth.split("-");
    return {
      month: Number(month) || getCurrentQueryParts().month,
      year: Number(selectedYear || year) || getCurrentQueryParts().year,
    };
  }, [selectedMonth, selectedYear]);

  const applySelectedQuery = () => {
    const query: AttendanceHistoryQuery = {
      month: selectedMonthValue.month,
      year: selectedMonthValue.year,
      date: Number(selectedDate) || undefined,
    };
    setAppliedQuery(query);
    void loadHistory(false, query);
  };

  const resetFilters = () => {
    const now = new Date();
    const current: AttendanceHistoryQuery = {
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    };
    setAppliedQuery(current);
    setSelectedDate(String(now.getDate()));
    setSelectedMonth(`${current.year}-${String(current.month).padStart(2, "0")}`);
    setSelectedYear(String(current.year));
    void loadHistory(true, current);
  };

  const profile = rows[0];
  const attendanceRows = useMemo(
    () => rows.filter((row) => Boolean(row.attendance_date || row.attendance_history)),
    [rows],
  );

  const monthlyKpi = useMemo(() => {
    let present = 0;
    let late = 0;
    let leave = 0;
    let halfDay = 0;
    let shortLeave = 0;

    for (const row of attendanceRows) {
      const rowMonth = toMonthKey(row.attendance_date || row.attendance_history);
      const appliedMonthKey = `${appliedQuery.year}-${String(appliedQuery.month).padStart(2, "0")}`;
      if (!rowMonth || rowMonth !== appliedMonthKey) continue;
      const bucket = normalizeStatus(row.attendance_status);
      if (bucket === "present") present += 1;
      if (bucket === "late") late += 1;
      if (bucket === "leave") leave += 1;
      if (bucket === "half_day") halfDay += 1;
      if (bucket === "short_leave") shortLeave += 1;
    }

    return {
      present,
      late,
      leave,
      halfDay,
      shortLeave,
      daysPresent: present + late + halfDay + shortLeave,
    };
  }, [appliedQuery.month, appliedQuery.year, attendanceRows]);

  const sortedRows = useMemo(
    () =>
      [...attendanceRows].sort((a, b) => {
        const aDate = new Date(a.attendance_date || a.attendance_history || "").getTime();
        const bDate = new Date(b.attendance_date || b.attendance_history || "").getTime();
        return bDate - aDate;
      }),
    [attendanceRows],
  );

  const statusDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of attendanceRows) {
      const status = String(row.attendance_status || "unknown").trim() || "unknown";
      counts.set(status, (counts.get(status) || 0) + 1);
    }
    const total = attendanceRows.length || 1;
    return Array.from(counts.entries())
      .map(([status, count]) => ({
        status,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [attendanceRows]);

  const monthlyTrend = useMemo(() => {
    const bucket = new Map<string, number>();
    for (const row of attendanceRows) {
      const month = toMonthKey(row.attendance_date || row.attendance_history);
      if (!month) continue;
      bucket.set(month, (bucket.get(month) || 0) + 1);
    }
    return Array.from(bucket.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [attendanceRows]);

  const maxMonthlyTrend = useMemo(
    () => monthlyTrend.reduce((max, item) => Math.max(max, item.count), 1),
    [monthlyTrend],
  );

  const displayName = profile?.user_name?.trim() || employeeName;
  const hasAttendance = attendanceRows.length > 0;

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes attendancePanelIn {
              from { opacity: 0; transform: translateY(8px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .team-group-panel-in {
              animation: attendancePanelIn 0.24s cubic-bezier(0.22, 1, 0.36, 1) both;
            }
            @media (prefers-reduced-motion: reduce) {
              .team-group-panel-in { animation: none; }
            }
          `,
        }}
      />
      <div className={`${zohoCardCls()} team-group-panel-in flex min-h-0 flex-1 flex-col`}>
      <div className="shrink-0 border-b border-[#E4E7EC] bg-gradient-to-r from-[#E8F4FB] via-white to-[#E6F4EA] px-4 py-3.5">
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] bg-white text-[#6B7280] transition hover:bg-[#F5F7FA]"
            aria-label="Close attendance history"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#008CD3]">
              Attendance history
            </p>
            <h3 className="truncate text-[15px] font-semibold text-[#1F2937]">{displayName}</h3>
            <p className="truncate text-[12px] text-[#6B7280]">
              {profile?.user_email || "Team member"} · {profile?.user_role_name || "employee"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadHistory(true)}
            disabled={loading || refreshing}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] bg-white text-[#008CD3] transition hover:bg-[#F5F7FA] disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="shrink-0 space-y-2.5 border-b border-[#E4E7EC] bg-white px-4 py-3">
        <div className="grid grid-cols-3 gap-2">
          <input
            type="number"
            min={1}
            max={31}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className={zohoSelectCls()}
            placeholder="Day"
            aria-label="Day"
          />
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className={`col-span-2 ${zohoSelectCls()}`}
            aria-label="Month"
          />
        </div>
        <div className="grid grid-cols-[1fr_auto_auto] gap-2">
          <input
            type="number"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className={zohoSelectCls()}
            placeholder="Year"
            aria-label="Year"
          />
          <button
            type="button"
            onClick={applySelectedQuery}
            disabled={loading || refreshing}
            className="inline-flex min-h-[38px] items-center justify-center rounded-lg bg-[#008CD3] px-3 text-[12px] font-semibold text-white transition hover:bg-[#0070AA] disabled:opacity-50"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={resetFilters}
            disabled={loading || refreshing}
            className="inline-flex min-h-[38px] items-center justify-center rounded-lg border border-[#E4E7EC] bg-white px-3 text-[12px] font-semibold text-[#374151] transition hover:bg-[#F5F7FA] disabled:opacity-50"
          >
            Reset
          </button>
        </div>
        <p className="text-[11px] text-[#9CA3AF]">
          Showing {appliedQuery.month}/{appliedQuery.year}
          {appliedQuery.date ? ` · day ${appliedQuery.date}` : ""}
        </p>
      </div>

      <div className="shrink-0 grid grid-cols-5 gap-1.5 border-b border-[#E4E7EC] bg-[#FAFBFC] px-3 py-2.5">
        {[
          { label: "Present", value: monthlyKpi.daysPresent, cls: "text-[#0F9D58]" },
          { label: "Late", value: monthlyKpi.late, cls: "text-[#E8710A]" },
          { label: "Leave", value: monthlyKpi.leave, cls: "text-[#D93025]" },
          { label: "Half", value: monthlyKpi.halfDay, cls: "text-[#008CD3]" },
          { label: "Short", value: monthlyKpi.shortLeave, cls: "text-[#F9A825]" },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-[#E4E7EC] bg-white px-1.5 py-1.5 text-center"
          >
            <p className="text-[9px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
              {item.label}
            </p>
            <p className={`text-[15px] font-bold tabular-nums ${item.cls}`}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="shrink-0 border-b border-[#E4E7EC] bg-[#F9FAFB] p-2">
        <div className="flex gap-1 rounded-lg bg-[#F5F7FA] p-0.5">
          <button
            type="button"
            onClick={() => setPanelTab("log")}
            className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-2 text-[12px] font-semibold transition ${
              panelTab === "log"
                ? "bg-white text-[#008CD3] shadow-sm ring-1 ring-[#E4E7EC]"
                : "text-[#6B7280] hover:text-[#374151]"
            }`}
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Log ({attendanceRows.length})
          </button>
          <button
            type="button"
            onClick={() => setPanelTab("insights")}
            className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-2 text-[12px] font-semibold transition ${
              panelTab === "insights"
                ? "bg-white text-[#008CD3] shadow-sm ring-1 ring-[#E4E7EC]"
                : "text-[#6B7280] hover:text-[#374151]"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Insights
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto">
        {error ? (
          <div className="mx-3 mt-3 flex items-start gap-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2.5 text-[12px] text-[#D93025]">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-[#6B7280]">
            <Loader2 className="h-7 w-7 animate-spin text-[#008CD3]" />
            <p className="text-[13px]">Loading attendance history…</p>
          </div>
        ) : null}

        {!loading && !error && panelTab === "log" && !hasAttendance ? (
          <div className="mx-3 mt-3 rounded-xl border border-dashed border-[#E4E7EC] bg-[#FAFBFC] px-4 py-12 text-center">
            <CalendarDays className="mx-auto h-8 w-8 text-[#CBD5E1]" />
            <p className="mt-3 text-[14px] font-semibold text-[#1F2937]">No records found</p>
            <p className="mt-1 text-[12px] text-[#6B7280]">
              Try another month or clear the day filter.
            </p>
          </div>
        ) : null}

        {!loading && !error && panelTab === "log" && hasAttendance ? (
          <ul className="divide-y divide-[#EEF2F6]">
            {sortedRows.map((row, index) => {
              const dateValue = row.attendance_date || row.attendance_history;
              const statusCls = statusBadgeClass(row.attendance_status);
              return (
                <li key={`${String(dateValue)}-${index}`} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#1F2937]">
                        {formatDate(dateValue)}
                      </p>
                      <div className="mt-1 grid grid-cols-2 gap-x-3 text-[12px] text-[#6B7280]">
                        <p>
                          <span className="text-[#9CA3AF]">In </span>
                          {formatTime(row.check_in)}
                        </p>
                        <p>
                          <span className="text-[#9CA3AF]">Out </span>
                          {formatTime(row.check_out)}
                        </p>
                      </div>
                      <p className="mt-1 text-[11px] font-medium text-[#008CD3]">
                        {formatWorkingTime(row.working_time)} worked
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusCls}`}
                    >
                      {formatStatusLabel(row.attendance_status)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}

        {!loading && !error && panelTab === "insights" ? (
          <div className="space-y-3 p-3">
            <div className="rounded-xl border border-[#E4E7EC] bg-white p-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[#008CD3]" />
                <h4 className="text-[13px] font-semibold text-[#1F2937]">Status distribution</h4>
              </div>
              <div className="mt-3 space-y-2.5">
                {statusDistribution.length === 0 ? (
                  <p className="text-[12px] text-[#6B7280]">No data for this period.</p>
                ) : (
                  statusDistribution.map((item) => (
                    <div key={item.status}>
                      <div className="mb-1 flex items-center justify-between text-[11px]">
                        <span className="font-medium capitalize text-[#1F2937]">
                          {formatStatusLabel(item.status)}
                        </span>
                        <span className="text-[#6B7280]">
                          {item.count} ({item.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#F5F7FA]">
                        <div
                          className="h-full rounded-full bg-[#008CD3]"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl border border-[#E4E7EC] bg-white p-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[#008CD3]" />
                <h4 className="text-[13px] font-semibold text-[#1F2937]">Monthly activity</h4>
              </div>
              <div className="mt-3 space-y-2.5">
                {monthlyTrend.length === 0 ? (
                  <p className="text-[12px] text-[#6B7280]">No trend data available.</p>
                ) : (
                  monthlyTrend.map((item) => {
                    const width = Math.max(8, Math.round((item.count / maxMonthlyTrend) * 100));
                    return (
                      <div key={item.month}>
                        <div className="mb-1 flex items-center justify-between text-[11px]">
                          <span className="font-medium text-[#1F2937]">{item.month}</span>
                          <span className="text-[#6B7280]">{item.count} records</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#F5F7FA]">
                          <div
                            className="h-full rounded-full bg-[#0F9D58]"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
    </>
  );
}

function zohoCardCls() {
  return "overflow-hidden rounded-2xl border border-[#E4E7EC] bg-white shadow-sm";
}
