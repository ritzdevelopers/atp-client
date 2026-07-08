"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Search, X } from "lucide-react";
import {
  groupManagementNavTiles,
  managementRouteActive,
  type ManagementNavTile,
} from "@/lib/managementDashboardNav";
import { dashCardCls } from "@/components/portal-dashboard/home/dashboardTokens";
import { AllToolsPanelSkeleton } from "@/components/portal-dashboard/home/skeletons/HomeDashboardSkeletons";

type HomeAllToolsPanelProps = {
  tiles: ManagementNavTile[];
  pathname: string | null;
  handoverPendingCount?: number;
  loading?: boolean;
  className?: string;
  variant?: "default" | "dashboard";
};

export default function HomeAllToolsPanel({
  tiles,
  pathname,
  handoverPendingCount = 0,
  loading = false,
  className = "",
  variant = "default",
}: HomeAllToolsPanelProps) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => groupManagementNavTiles(tiles), [tiles]);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q) ||
            group.label.toLowerCase().includes(q),
        ),
      }))
      .filter(
        (group) =>
          group.label.toLowerCase().includes(q) ||
          group.description.toLowerCase().includes(q) ||
          group.items.length > 0,
      );
  }, [groups, query]);

  const toggleGroup = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading && tiles.length === 0) {
    return <AllToolsPanelSkeleton className={className} />;
  }

  const maxHeight =
    variant === "dashboard"
      ? "max-h-[min(72vh,720px)]"
      : "max-h-[min(65vh,600px)]";

  return (
    <aside
      className={`${dashCardCls} h-fit ${maxHeight} overflow-hidden ${className}`}
      aria-label="All tools"
    >
      <div className="border-b border-[#EEF2F6] bg-gradient-to-r from-[#F5F0FF] via-white to-white px-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-[16px] font-semibold text-[#1F2937] sm:text-[17px]">All tools</h2>
            <p className="mt-0.5 text-[13px] text-[#6B7280] sm:text-[14px]">
              {tiles.length} shortcuts across {groups.length} modules
            </p>
          </div>
          <span className="rounded-lg bg-[#EDE9FE] px-2 py-1 text-[11px] font-semibold text-[#6D28D9]">
            {groups.length}
          </span>
        </div>
        <label className="relative mt-3 block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter tools…"
            className="w-full rounded-xl border border-[#E4E7EC] bg-white py-2.5 pl-9 pr-9 text-[13px] text-[#1F2937] outline-none placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/12"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#374151]"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </label>
      </div>

      <div
        className={`overflow-y-auto p-3 [scrollbar-width:thin] ${
          variant === "dashboard"
            ? "max-h-[min(60vh,640px)]"
            : "max-h-[min(52vh,520px)]"
        }`}
      >
        {filteredGroups.length === 0 ? (
          <p className="px-2 py-10 text-center text-[13px] text-[#6B7280]">
            No tools match your search.
          </p>
        ) : (
          <ul className="space-y-2">
            {filteredGroups.map((group) => {
              const Icon = group.icon;
              const isOpen = expanded[group.id] ?? group.items.length <= 3;
              const hasMultiple = group.items.length > 1;
              const groupActive = group.items.some((item) =>
                managementRouteActive(pathname, item.href),
              );
              const soleItem = !hasMultiple ? group.items[0] : null;

              return (
                <li
                  key={group.id}
                  className={`overflow-hidden rounded-xl border transition-colors ${
                    groupActive
                      ? "border-[#008CD3]/25 bg-[#F8FCFF]"
                      : "border-[#EEF2F6] bg-[#FAFAFA]"
                  }`}
                >
                  {soleItem ? (
                    <Link
                      href={soleItem.href}
                      className="flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-white/70"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#008CD3] shadow-sm ring-1 ring-[#E4E7EC]">
                        <Icon className="h-[18px] w-[18px]" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-[#1F2937]">
                          {group.label}
                        </p>
                        <p className="truncate text-[11px] text-[#6B7280]">
                          {soleItem.description}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-[#D1D5DB]" aria-hidden />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.id)}
                      className="flex w-full cursor-pointer items-center gap-3 px-3 py-3 text-left hover:bg-white/70"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#008CD3] shadow-sm ring-1 ring-[#E4E7EC]">
                        <Icon className="h-[18px] w-[18px]" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-[#1F2937]">
                          {group.label}
                        </p>
                        <p className="truncate text-[11px] text-[#6B7280]">
                          {group.items.length} features
                        </p>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-[#9CA3AF] transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                        aria-hidden
                      />
                    </button>
                  )}

                  {hasMultiple && isOpen && (
                    <ul className="border-t border-[#EEF2F6] bg-white/80 px-2 py-2">
                      {group.items.map((item) => {
                        const ItemIcon = item.icon;
                        const active = managementRouteActive(pathname, item.href);
                        const badge =
                          item.id === "asset-handover" && handoverPendingCount > 0
                            ? handoverPendingCount
                            : null;

                        return (
                          <li key={item.id}>
                            <Link
                              href={item.href}
                              className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 transition-colors ${
                                active
                                  ? "bg-[#E8F4FC] text-[#0070AA]"
                                  : "text-[#374151] hover:bg-[#F9FAFB]"
                              }`}
                            >
                              <span
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                                  active
                                    ? "bg-white text-[#008CD3]"
                                    : "bg-[#F3F4F6] text-[#6B7280] group-hover:text-[#008CD3]"
                                }`}
                              >
                                <ItemIcon className="h-3.5 w-3.5" aria-hidden />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[12px] font-medium">
                                  {item.label}
                                </span>
                                <span className="block truncate text-[10px] text-[#9CA3AF]">
                                  {item.description}
                                </span>
                              </span>
                              {badge ? (
                                <span className="rounded-full bg-[#E8710A] px-1.5 py-0.5 text-[10px] font-bold text-white">
                                  {badge}
                                </span>
                              ) : (
                                <ChevronRight
                                  className="h-3.5 w-3.5 shrink-0 text-[#D1D5DB] opacity-0 transition group-hover:opacity-100"
                                  aria-hidden
                                />
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
