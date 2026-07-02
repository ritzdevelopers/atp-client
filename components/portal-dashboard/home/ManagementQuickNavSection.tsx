"use client";

import Link from "next/link";
import { CalendarDays } from "lucide-react";
import type { ManagementNavTile } from "@/lib/managementDashboardNav";
import { managementRouteActive } from "@/lib/managementDashboardNav";

type ManagementQuickNavSectionProps = {
  tiles: ManagementNavTile[];
  pathname: string | null;
  handoverPendingCount?: number;
};

const dashCardCls =
  "dashboard-enter relative overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-sm";
const dashCardAccent =
  "pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[#008CD3] via-[#0C123A] to-[#C99237]";
const dashSectionHeadCls =
  "flex items-center gap-2 border-b border-[#E8EBF0] bg-[#FAFBFC] px-3 py-2";
const dashSectionBodyCls = "p-3";

export default function ManagementQuickNavSection({
  tiles,
  pathname,
  handoverPendingCount = 0,
}: ManagementQuickNavSectionProps) {
  return (
    <section className={dashCardCls}>
      <div className={dashCardAccent} />
      <div className={dashSectionHeadCls}>
        <CalendarDays className="h-4 w-4 text-[#008CD3]" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-[#0C123A]">Quick navigation</h2>
          <p className="text-[11px] text-[#6B7280]">
            All management modules — same routes as the left sidebar
          </p>
        </div>
        <span className="rounded-full bg-[#F5F7FA] px-2 py-0.5 text-[10px] font-semibold text-[#6B7280]">
          {tiles.length}
        </span>
      </div>
      <div className={dashSectionBodyCls}>
        {tiles.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[#E4E7EC] bg-[#F9FAFB] px-4 py-8 text-center text-sm text-[#6B7280]">
            No modules available for your role yet.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {tiles.map((tile) => {
              const Icon = tile.icon;
              const active = managementRouteActive(pathname, tile.href);
              const badge =
                tile.id === "asset-handover" && handoverPendingCount > 0
                  ? handoverPendingCount
                  : null;

              return (
                <li key={tile.id}>
                  <Link
                    href={tile.href}
                    className={`group relative flex min-h-[88px] flex-col justify-between rounded-lg border p-3 transition hover:border-[#008CD3]/40 hover:shadow-sm ${
                      active
                        ? "border-[#008CD3] bg-[#F0F7FC]"
                        : "border-[#E8EBF0] bg-[#FAFBFC]"
                    }`}
                  >
                    {badge ? (
                      <span className="absolute right-2 top-2 rounded-full bg-[#E8710A] px-1.5 py-0.5 text-[9px] font-bold text-white">
                        {badge}
                      </span>
                    ) : null}
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#008CD3] text-white transition group-hover:bg-[#0070AA]">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="mt-2 min-w-0">
                      <p className="truncate text-sm font-semibold text-[#0C123A]">
                        {tile.label}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-[#6B7280]">
                        {tile.description}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
