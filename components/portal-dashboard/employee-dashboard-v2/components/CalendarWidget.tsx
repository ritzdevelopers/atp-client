"use client";

import { useMemo } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { CalendarDays } from "lucide-react";
import { getLocalYmdFromDate } from "@/lib/attendanceDates";
import type { CompanyHolidayRow } from "@/services/organizationSettings";
import { cardBase, cardPadding, cardTitle, sectionLabel } from "../cardStyles";

type CalendarWidgetProps = {
  holidays: CompanyHolidayRow[];
};

export default function CalendarWidget({ holidays }: CalendarWidgetProps) {
  const holidayDates = useMemo(() => {
    const set = new Set<string>();
    for (const h of holidays) {
      if (h.holiday_date) set.add(String(h.holiday_date).slice(0, 10));
    }
    return set;
  }, [holidays]);

  const upcomingHolidays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return [...holidays]
      .filter((h) => h.holiday_date && new Date(h.holiday_date) >= today)
      .sort(
        (a, b) =>
          new Date(a.holiday_date!).getTime() -
          new Date(b.holiday_date!).getTime(),
      )
      .slice(0, 4);
  }, [holidays]);

  return (
    <article className={`${cardBase} ${cardPadding} employee-dashboard-calendar`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={sectionLabel}>Calendar</p>
          <h2 className={`${cardTitle} mt-1`}>Holiday calendar</h2>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50 text-pink-600">
          <CalendarDays className="h-5 w-5" aria-hidden />
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-100 bg-slate-50/50 p-2">
        <Calendar
          className="!w-full !border-0 !bg-transparent !font-sans text-sm"
          tileClassName={({ date, view }) => {
            if (view !== "month") return "";
            const ymd = getLocalYmdFromDate(date);
            return holidayDates.has(ymd) ? "holiday-tile" : "";
          }}
          tileContent={({ date, view }) => {
            if (view !== "month") return null;
            const ymd = getLocalYmdFromDate(date);
            if (!holidayDates.has(ymd)) return null;
            return (
              <span className="mx-auto mt-0.5 block h-1 w-1 rounded-full bg-rose-500" />
            );
          }}
        />
      </div>

      <ul className="mt-4 space-y-2">
        {upcomingHolidays.length === 0 ? (
          <li className="text-sm text-slate-500">No upcoming holidays scheduled.</li>
        ) : (
          upcomingHolidays.map((h) => (
            <li
              key={String(h.id ?? h.holiday_date)}
              className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-100"
            >
              <span className="font-medium text-slate-800">{h.holiday_name}</span>
              <span className="shrink-0 text-xs text-slate-500">
                {new Date(h.holiday_date!).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </li>
          ))
        )}
      </ul>

      <style jsx global>{`
        .employee-dashboard-calendar .react-calendar__navigation button {
          border-radius: 0.5rem;
          font-weight: 600;
          color: #334155;
        }
        .employee-dashboard-calendar .react-calendar__navigation button:enabled:hover {
          background: #eef2ff;
        }
        .employee-dashboard-calendar .react-calendar__tile {
          border-radius: 0.5rem;
          padding: 0.65em 0.4em;
          font-size: 0.8rem;
        }
        .employee-dashboard-calendar .react-calendar__tile:enabled:hover {
          background: #f1f5f9;
        }
        .employee-dashboard-calendar .react-calendar__tile--now {
          background: #e0e7ff;
          color: #4338ca;
          font-weight: 700;
        }
        .employee-dashboard-calendar .react-calendar__tile--active {
          background: #4f46e5 !important;
          color: white;
        }
        .employee-dashboard-calendar .holiday-tile {
          font-weight: 600;
          color: #e11d48;
        }
      `}</style>
    </article>
  );
}
