"use client";

import { CalendarDays, Sparkles } from "lucide-react";
import { getGreetingName } from "../utils";

type WelcomeBannerProps = {
  employeeName: string;
  roleName?: string;
  shiftName?: string;
  monthProgress?: number;
};

export default function WelcomeBanner({
  employeeName,
  roleName,
  shiftName,
  monthProgress = 0,
}: WelcomeBannerProps) {
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-6 text-white shadow-lg shadow-indigo-200/50 sm:p-8">
      <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 left-1/3 h-32 w-32 rounded-full bg-violet-400/20 blur-2xl" />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Employee Portal
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {getGreetingName()}, {employeeName.split(" ")[0] || "there"}!
          </h1>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-indigo-100/90">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 opacity-80" aria-hidden />
              {today}
            </span>
            {roleName ? <span>· {roleName}</span> : null}
            {shiftName ? <span>· {shiftName}</span> : null}
          </p>
        </div>

        <div className="w-full max-w-xs rounded-xl bg-white/10 p-4 backdrop-blur-md lg:shrink-0">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-indigo-100">Monthly attendance</span>
            <span className="font-bold">{monthProgress}%</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-emerald-400 transition-all duration-700"
              style={{ width: `${monthProgress}%` }}
              role="progressbar"
              aria-valuenow={monthProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Monthly attendance progress"
            />
          </div>
          <p className="mt-2 text-xs text-indigo-100/80">
            Keep up the momentum — you&apos;re on track this month.
          </p>
        </div>
      </div>
    </section>
  );
}
