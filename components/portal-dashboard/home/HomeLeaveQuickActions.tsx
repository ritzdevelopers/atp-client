"use client";

import Link from "next/link";
import { CalendarDays, ChevronRight, Plus } from "lucide-react";
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
};

export default function HomeLeaveQuickActions({
  orgId,
  pendingCount = 0,
  delayMs = 0,
}: HomeLeaveQuickActionsProps) {
  const base = `/dashboard/${encodeURIComponent(String(orgId))}/my-leaves`;

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
