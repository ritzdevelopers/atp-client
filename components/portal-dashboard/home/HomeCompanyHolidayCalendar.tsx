"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronRight as LinkArrow,
  RefreshCw,
} from "lucide-react";
import { getLocalYmdFromDate, getTodayLocalYmd } from "@/lib/attendanceDates";
import {
  getCompanyHolidays,
  type CompanyHolidayRow,
} from "@/services/organizationSettings";
import { dashPanelCls } from "@/components/portal-dashboard/home/dashboardTokens";

type HomeCompanyHolidayCalendarProps = {
  orgId: string;
  className?: string;
  embedded?: boolean;
};

function normalizeDateOnly(value: string | null | undefined): string {
  if (!value) return "";
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(value).trim());
  return match ? match[1] : "";
}

function formatHolidayDate(ymd: string): string {
  const clean = normalizeDateOnly(ymd);
  if (!clean) return "—";
  return new Date(`${clean}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function Shimmer({ className = "" }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-lg ${className}`} />;
}

export default function HomeCompanyHolidayCalendar({
  orgId,
  className = "",
  embedded = false,
}: HomeCompanyHolidayCalendarProps) {
  const today = getTodayLocalYmd();
  const manageHref = `/dashboard/${encodeURIComponent(orgId)}/organization-settings/organization-holidays`;

  const [holidays, setHolidays] = useState<CompanyHolidayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth());

  const loadHolidays = useCallback(
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
        const data = await getCompanyHolidays(token, orgId);
        setHolidays(data);
      } catch (e) {
        setHolidays([]);
        setError(e instanceof Error ? e.message : "Could not load holidays.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orgId],
  );

  useEffect(() => {
    void loadHolidays(false);
  }, [loadHolidays]);

  const holidayDateSet = useMemo(
    () =>
      new Set(
        holidays.map((h) => normalizeDateOnly(h.holiday_date)).filter(Boolean),
      ),
    [holidays],
  );

  const upcomingHolidays = useMemo(() => {
    return [...holidays]
      .filter((h) => normalizeDateOnly(h.holiday_date) >= today)
      .sort((a, b) =>
        normalizeDateOnly(a.holiday_date).localeCompare(
          normalizeDateOnly(b.holiday_date),
        ),
      )
      .slice(0, 6);
  }, [holidays, today]);

  const nextHoliday = upcomingHolidays[0] ?? null;
  const monthLabel = new Date(new Date().getFullYear(), selectedMonth, 1).toLocaleDateString(
    undefined,
    { month: "long", year: "numeric" },
  );

  const shellClass = embedded
    ? `home-holiday-calendar flex h-full min-h-0 flex-col overflow-hidden bg-slate-50/50 ${className}`
    : `${dashPanelCls} home-holiday-calendar ${className}`;

  return (
    <aside className={shellClass} aria-label="Company holiday calendar">
      <div className="shrink-0 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Company holidays
            </p>
            <p className="mt-0.5 text-[14px] font-semibold text-slate-900">
              Holiday calendar
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => void loadHolidays(true)}
              disabled={refreshing}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-white hover:text-slate-700 disabled:opacity-50"
              aria-label="Refresh holidays"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <Link
              href={manageHref}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-[#008CD3] transition hover:bg-white"
              aria-label="Manage holidays"
            >
              <CalendarDays className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
        {nextHoliday ? (
          <p className="mt-2 truncate text-[11px] text-slate-500">
            Next:{" "}
            <span className="font-medium text-slate-700">{nextHoliday.holiday_name}</span>
            {" · "}
            {formatHolidayDate(nextHoliday.holiday_date)}
          </p>
        ) : (
          <p className="mt-2 text-[11px] text-slate-400">No upcoming holidays scheduled</p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
        {loading ? (
          <div className="space-y-3 p-4">
            <Shimmer className="h-6 w-32" />
            <Shimmer className="h-[220px] w-full" />
            <Shimmer className="h-12 w-full" />
            <Shimmer className="h-12 w-full" />
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 px-4 py-8 text-[12px] text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        ) : (
          <>
            <div className="border-b border-slate-100 px-4 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] font-semibold text-slate-700">{monthLabel}</p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedMonth((prev) => (prev === 0 ? 11 : prev - 1))
                    }
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-white"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedMonth((prev) => (prev === 11 ? 0 : prev + 1))
                    }
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-white"
                    aria-label="Next month"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Today
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-sky-500" />
                  Sunday
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  Holiday
                </span>
              </div>
            </div>

            <div className="p-3">
              <Calendar
                value={new Date(new Date().getFullYear(), selectedMonth, 1)}
                view="month"
                activeStartDate={new Date(new Date().getFullYear(), selectedMonth, 1)}
                showNavigation={false}
                showNeighboringMonth={false}
                className="!w-full !border-0 !bg-transparent !font-sans"
                tileClassName={({ date, view }) => {
                  if (view !== "month") return "";
                  const ymd = getLocalYmdFromDate(date);
                  if (ymd === today) return "holiday-today";
                  if (holidayDateSet.has(ymd)) return "holiday-day";
                  if (date.getDay() === 0) return "holiday-sunday";
                  return "";
                }}
              />
            </div>

            <div className="border-t border-slate-100 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Upcoming ({upcomingHolidays.length})
              </p>
              {upcomingHolidays.length === 0 ? (
                <p className="mt-3 text-center text-[12px] text-slate-400">
                  No upcoming holidays. Add dates in settings.
                </p>
              ) : (
                <ul className="mt-2 divide-y divide-slate-100">
                  {upcomingHolidays.map((holiday) => {
                    const ymd = normalizeDateOnly(holiday.holiday_date);
                    const isToday = ymd === today;
                    return (
                      <li
                        key={String(holiday.id)}
                        className="flex items-center justify-between gap-2 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-slate-900">
                            {holiday.holiday_name}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {formatHolidayDate(ymd)}
                          </p>
                        </div>
                        {isToday ? (
                          <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            Today
                          </span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
              <Link
                href={manageHref}
                className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-[#008CD3] hover:underline"
              >
                Manage all holidays
                <LinkArrow className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </>
        )}
      </div>

      <style jsx global>{`
        .home-holiday-calendar .react-calendar__month-view__weekdays__weekday {
          text-align: center;
          font-size: 10px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          padding-bottom: 4px;
        }
        .home-holiday-calendar .react-calendar__tile {
          border-radius: 8px;
          border: none;
          background: transparent;
          padding: 0.45em 0.2em;
          color: #111827;
          font-weight: 500;
          font-size: 12px;
        }
        .home-holiday-calendar .react-calendar__tile:enabled:hover {
          background: #f3f4f6;
        }
        .home-holiday-calendar .react-calendar__tile.holiday-day {
          background: #fef2f2 !important;
          color: #dc2626 !important;
          font-weight: 700;
        }
        .home-holiday-calendar .react-calendar__tile.holiday-sunday {
          background: #eff6ff !important;
          color: #3b82f6 !important;
          font-weight: 600;
        }
        .home-holiday-calendar .react-calendar__tile.holiday-today {
          background: #10b981 !important;
          color: white !important;
          font-weight: 700;
          box-shadow: 0 2px 6px rgba(16, 185, 129, 0.25);
        }
        .home-holiday-calendar .react-calendar__navigation {
          display: none;
        }
      `}</style>
    </aside>
  );
}
