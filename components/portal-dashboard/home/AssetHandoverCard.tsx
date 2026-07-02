"use client";

import Link from "next/link";
import { ArrowUpRight, Package } from "lucide-react";
import {
  dashCardCls,
  dashSectionBodyCls,
  dashSectionMetaCls,
  dashSectionTitleCls,
  iconBadgeCls,
} from "@/components/portal-dashboard/home/dashboardTokens";
import { AssetHandoverCardSkeleton } from "@/components/portal-dashboard/home/skeletons/HomeDashboardSkeletons";

type AssetHandoverCardProps = {
  handoverHref: string;
  handoverPendingCount: number;
  loading?: boolean;
  delayMs?: number;
};

export default function AssetHandoverCard({
  handoverHref,
  handoverPendingCount,
  loading = false,
  delayMs = 0,
}: AssetHandoverCardProps) {
  if (loading) {
    return <AssetHandoverCardSkeleton />;
  }

  return (
    <section className={`${dashCardCls} min-w-0`} style={{ animationDelay: `${delayMs}ms` }}>
      <Link
        href={handoverHref}
        className="group block px-5 py-5 transition-colors hover:bg-slate-50/50"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className={iconBadgeCls("amber")}>
              <Package className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h2 className={dashSectionTitleCls}>Asset handover</h2>
              <p className={`mt-0.5 ${dashSectionMetaCls}`}>
                {handoverPendingCount > 0
                  ? `${handoverPendingCount} pending for you`
                  : "You're all caught up"}
              </p>
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-600" />
        </div>

        <div className={`${dashSectionBodyCls} !px-0 !pb-0 !pt-4`}>
          <div className="flex items-end justify-between rounded-xl bg-amber-50/60 px-4 py-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-amber-700/80">
                Pending
              </p>
              <p className="text-3xl font-semibold tabular-nums tracking-tight text-amber-900">
                {handoverPendingCount}
              </p>
            </div>
            <span className="text-[13px] font-medium text-amber-800 group-hover:underline">
              Review items →
            </span>
          </div>
        </div>
      </Link>
    </section>
  );
}
