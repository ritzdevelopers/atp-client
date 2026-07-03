"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
} from "lucide-react";
import {
  getLocalYmdFromDate,
  getTodayLocalYmd,
} from "@/lib/attendanceDates";
import {
  applyForCompOff,
  fetchSelectedDateAttendance,
  type SelectedDateAttendanceRecord,
} from "@/services/compoff";
import {
  fetchReportingManagers,
  type RegularizationReportingManager,
} from "@/services/regularization";

function inputCls() {
  return "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100";
}

function roleLabel(role: RegularizationReportingManager["role"]): string {
  if (role === "reporting_manager") return "Team leader";
  if (role === "hr") return "HR";
  return "Admin";
}

function managerOptionLabel(manager: RegularizationReportingManager): string {
  const parts = [manager.user_name];
  if (manager.team_name) parts.push(`(${manager.team_name})`);
  parts.push(`— ${roleLabel(manager.role)}`);
  return parts.join(" ");
}

function formatTimeDisplay(value: string | undefined): string {
  if (!value) return "—";
  return value.slice(0, 5);
}

function workStatusLabel(status: string | undefined): string {
  if (status === "full_day") return "Full day (1.0 credit)";
  if (status === "half_day") return "Half day (0.5 credit)";
  return status?.replace(/_/g, " ") ?? "—";
}

function buildCalendarDays(viewYear: number, viewMonth: number) {
  const first = new Date(viewYear, viewMonth, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: Array<{ ymd: string | null; day: number | null }> = [];
  for (let i = 0; i < startPad; i++) cells.push({ ymd: null, day: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(viewYear, viewMonth, d);
    cells.push({ ymd: getLocalYmdFromDate(date), day: d });
  }
  return cells;
}

export default function ApplyCompOffForm() {
  const params = useParams();
  const router = useRouter();
  const orgIdParam = String(params?.org_id ?? "");
  const orgId = Number(orgIdParam);
  const listHref = `/user-dashboard/${encodeURIComponent(orgIdParam)}/comp-off`;
  const homeHref = `/user-dashboard/${encodeURIComponent(orgIdParam)}/home`;
  const todayYmd = getTodayLocalYmd();

  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceRecord, setAttendanceRecord] =
    useState<SelectedDateAttendanceRecord | null>(null);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  const [managers, setManagers] = useState<RegularizationReportingManager[]>([]);
  const [managerSource, setManagerSource] = useState<
    "team_leaders" | "hr_admin" | null
  >(null);
  const [managersLoading, setManagersLoading] = useState(true);
  const [managersError, setManagersError] = useState<string | null>(null);
  const [selectedManagerId, setSelectedManagerId] = useState<string>("");

  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const calendarDays = useMemo(
    () => buildCalendarDays(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const selectedManager = useMemo(
    () =>
      managers.find((m) => String(m.user_id) === selectedManagerId) ?? null,
    [managers, selectedManagerId],
  );

  const canSubmit = useMemo(
    () =>
      Boolean(
        attendanceRecord?.eligible &&
          attendanceRecord.check_in &&
          attendanceRecord.check_out &&
          selectedManagerId !== "" &&
          !managersLoading &&
          managers.length > 0,
      ),
    [attendanceRecord, selectedManagerId, managersLoading, managers.length],
  );

  const loadManagers = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token || Number.isNaN(orgId)) {
      setManagersError("Not signed in.");
      setManagersLoading(false);
      return;
    }
    setManagersLoading(true);
    setManagersError(null);
    try {
      const result = await fetchReportingManagers(token, orgId);
      setManagers(result.data);
      setManagerSource(result.source);
      setSelectedManagerId((prev) => {
        if (prev && result.data.some((m) => String(m.user_id) === prev)) {
          return prev;
        }
        return result.data.length === 1 ? String(result.data[0]!.user_id) : "";
      });
    } catch (e) {
      setManagers([]);
      setManagerSource(null);
      setManagersError(
        e instanceof Error ? e.message : "Could not load reporting managers",
      );
    } finally {
      setManagersLoading(false);
    }
  }, [orgId]);

  const loadAttendanceForDate = useCallback(
    async (ymd: string) => {
      const token = localStorage.getItem("token");
      if (!token || Number.isNaN(orgId)) {
        setAttendanceError("Not signed in.");
        return;
      }
      if (ymd > todayYmd) return;

      setSelectedDate(ymd);
      setAttendanceLoading(true);
      setAttendanceError(null);
      setAttendanceRecord(null);
      setFormError(null);

      try {
        const record = await fetchSelectedDateAttendance(token, orgId, ymd);
        setAttendanceRecord(record);
        if (!record.eligible && record.message) {
          setAttendanceError(record.message);
        }
      } catch (e) {
        setAttendanceError(
          e instanceof Error ? e.message : "Could not load attendance",
        );
      } finally {
        setAttendanceLoading(false);
      }
    },
    [orgId, todayYmd],
  );

  useEffect(() => {
    void loadManagers();
  }, [loadManagers]);

  function shiftMonth(delta: number) {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const token = localStorage.getItem("token");
    if (!token) {
      setFormError("Not signed in.");
      return;
    }
    if (!attendanceRecord?.eligible || !attendanceRecord.check_in || !attendanceRecord.check_out) {
      setFormError("Select a valid date with complete attendance first.");
      return;
    }
    const reportingManagerId = Number(selectedManagerId);
    if (!Number.isInteger(reportingManagerId) || reportingManagerId <= 0) {
      setFormError("Please select a reporting manager.");
      return;
    }
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setFormError("Reason is required.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await applyForCompOff(token, {
        org_id: orgId,
        comp_off_query: {
          compoff_date: attendanceRecord.compoff_date,
          check_in: attendanceRecord.check_in,
          check_out: attendanceRecord.check_out,
          reason: trimmedReason,
          reporting_manager: reportingManagerId,
        },
      });
      setFormSuccess(result.message ?? "Comp off request submitted.");
      window.setTimeout(() => {
        router.push(listHref);
      }, 1200);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Could not submit request",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const monthLabel = viewDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-full bg-slate-50/80">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link
            href={listHref}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold text-slate-900">
              Apply comp off
            </h1>
            <p className="text-xs text-slate-500">
              Select a worked date — check-in and check-out come from attendance
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-4 pb-24 lg:pb-6">
        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6"
        >
          {formError ? (
            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {formError}
            </div>
          ) : null}
          {formSuccess ? (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {formSuccess}
            </p>
          ) : null}

          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <CalendarDays className="h-4 w-4 text-teal-600" />
                Select comp off date
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => shiftMonth(-1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-[9rem] text-center text-sm font-medium text-slate-700">
                  {monthLabel}
                </span>
                <button
                  type="button"
                  onClick={() => shiftMonth(1)}
                  disabled={
                    viewYear > new Date().getFullYear() ||
                    (viewYear === new Date().getFullYear() &&
                      viewMonth >= new Date().getMonth())
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-slate-400">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {calendarDays.map((cell, idx) => {
                if (!cell.ymd || cell.day == null) {
                  return <div key={`empty-${idx}`} className="h-10" />;
                }
                const isFuture = cell.ymd > todayYmd;
                const isSelected = cell.ymd === selectedDate;
                const isToday = cell.ymd === todayYmd;
                return (
                  <button
                    key={cell.ymd}
                    type="button"
                    disabled={isFuture || attendanceLoading}
                    onClick={() => void loadAttendanceForDate(cell.ymd!)}
                    className={`flex h-10 items-center justify-center rounded-lg text-sm font-medium transition ${
                      isFuture
                        ? "cursor-not-allowed text-slate-300"
                        : isSelected
                          ? "bg-teal-600 text-white shadow-sm"
                          : isToday
                            ? "bg-teal-50 text-teal-800 ring-1 ring-teal-200 hover:bg-teal-100"
                            : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Future dates are disabled. Only dates with valid attendance can be
              submitted.
            </p>
          </div>

          {selectedDate ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Attendance for {selectedDate}
              </p>
              {attendanceLoading ? (
                <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading attendance…
                </div>
              ) : attendanceError && !attendanceRecord?.eligible ? (
                <p className="mt-3 text-sm text-amber-800">{attendanceError}</p>
              ) : attendanceRecord?.eligible ? (
                <div className="mt-3 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
                      <p className="text-[10px] font-semibold uppercase text-emerald-700/80">
                        Check in
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-lg font-bold tabular-nums text-slate-900">
                        <Clock className="h-4 w-4 text-emerald-600" />
                        {formatTimeDisplay(attendanceRecord.check_in)}
                      </p>
                      <p className="text-[10px] text-slate-400">From attendance</p>
                    </div>
                    <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
                      <p className="text-[10px] font-semibold uppercase text-rose-700/80">
                        Check out
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-lg font-bold tabular-nums text-slate-900">
                        <Clock className="h-4 w-4 text-rose-600" />
                        {formatTimeDisplay(attendanceRecord.check_out)}
                      </p>
                      <p className="text-[10px] text-slate-400">From attendance</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">
                      {workStatusLabel(attendanceRecord.work_status)}
                    </span>
                    {attendanceRecord.attendance_status ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                        Status: {attendanceRecord.attendance_status.replace(/_/g, " ")}
                      </span>
                    ) : null}
                  </div>
                  {attendanceRecord.existing_request?.query_status === "rejected" ? (
                    <p className="text-xs text-amber-700">
                      Previous request for this date was rejected — you can
                      re-apply.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Pick a date on the calendar to load your attendance punches.
            </p>
          )}

          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Reason</span>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you applying for comp off on this date?"
              className={inputCls()}
              disabled={!canSubmit || submitting}
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-600">
              Reporting manager
            </span>
            {managersLoading ? (
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Loading managers…
              </div>
            ) : managersError ? (
              <p className="mt-2 text-sm text-rose-700">{managersError}</p>
            ) : managers.length === 0 ? (
              <p className="mt-2 text-sm text-amber-800">
                No reporting managers available. Contact HR if you are not
                assigned to a team.
              </p>
            ) : (
              <>
                <select
                  required
                  value={selectedManagerId}
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                  className={inputCls()}
                  disabled={!canSubmit || submitting}
                >
                  <option value="">Select reporting manager</option>
                  {managers.map((manager) => (
                    <option key={manager.user_id} value={String(manager.user_id)}>
                      {managerOptionLabel(manager)}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  {managerSource === "team_leaders"
                    ? "Showing team leaders from your assigned teams."
                    : "You are not in a team — select HR or organization admin."}
                </p>
              </>
            )}
          </label>

          <div className="flex gap-2 pt-2">
            <Link
              href={listHref}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!canSubmit || submitting || managersLoading}
              className="flex-1 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit comp off"}
            </button>
          </div>

          <p className="text-center">
            <Link href={homeHref} className="text-xs text-slate-400 hover:text-slate-600">
              Back to dashboard
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
