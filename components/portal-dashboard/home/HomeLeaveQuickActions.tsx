"use client";

import Link from "next/link";
import { CalendarDays, ChevronRight, FileText, Plus } from "lucide-react";
import {
  dashCardCls,
  dashSectionBodyCls,
  dashSectionHeadCls,
  dashSectionMetaCls,
  dashSectionTitleCls,
  iconBadgeCls,
} from "@/components/portal-dashboard/home/dashboardTokens";

type HomeLeaveQuickActionsProps = {
  orgId: number;
  pendingCount?: number;
  delayMs?: number;
  variant?: "default" | "dashboard";
};

export default function HomeLeaveQuickActions({
  orgId,
  pendingCount = 0,
  delayMs = 0,
  variant = "default",
}: HomeLeaveQuickActionsProps) {
  const base = `/dashboard/${encodeURIComponent(String(orgId))}/my-leaves`;

  if (variant === "dashboard") {
    return (
      <div
        className="h-full rounded-2xl border border-[#E4E7EC] bg-gradient-to-br from-[#F8FAFC] to-white p-5 sm:p-6"
        style={{ animationDelay: `${delayMs}ms` }}
      >
        <div className="flex items-start gap-3">
          <span className={iconBadgeCls("emerald")}>
            <CalendarDays className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[17px] font-semibold text-[#1F2937]">Leave management</h3>
            <p className="mt-1 text-[14px] leading-relaxed text-[#6B7280]">
              Apply for leave, track approval status, and review your request history.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-[#E4E7EC] bg-white px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
              Pending
            </p>
            <p className="mt-1 text-[28px] font-bold tabular-nums text-[#1F2937]">
              {pendingCount}
            </p>
          </div>
          <div className="rounded-xl border border-[#E4E7EC] bg-white px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
              Status
            </p>
            <p className="mt-1 text-[14px] font-semibold text-[#0F9D58]">
              {pendingCount > 0 ? "Awaiting review" : "All clear"}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          <Link
            href={`${base}?apply=1`}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#008CD3] px-4 text-[14px] font-semibold text-white transition hover:bg-[#0070AA]"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Apply for leave
          </Link>
          <Link
            href={base}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-[#E4E7EC] bg-white px-4 text-[14px] font-semibold text-[#374151] transition hover:border-[#008CD3]/30 hover:text-[#008CD3]"
          >
            <FileText className="h-4 w-4" aria-hidden />
            View requests
            <ChevronRight className="h-4 w-4 opacity-60" aria-hidden />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section className={dashCardCls} style={{ animationDelay: `${delayMs}ms` }}>
      <div className={dashSectionHeadCls}>
        <span className={iconBadgeCls("emerald")}>
          <CalendarDays className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className={dashSectionTitleCls}>Leave</h2>
          <p className={dashSectionMetaCls}>
            Apply for leave and track your requests
          </p>
        </div>
        {pendingCount > 0 ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
            {pendingCount} pending
          </span>
        ) : null}
      </div>
      <div className={`${dashSectionBodyCls} flex flex-wrap gap-2`}>
        <Link
          href={`${base}?apply=1`}
          className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-sky-700 sm:flex-none"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Apply leave
        </Link>
        <Link
          href={base}
          className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 sm:flex-none"
        >
          My requests
          <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
