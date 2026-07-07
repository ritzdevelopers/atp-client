"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  groupManagementNavTiles,
  managementRouteActive,
  type HomeFeatureGroup,
  type ManagementNavTile,
} from "@/lib/managementDashboardNav";
import { FeaturesSliderSkeleton } from "@/components/portal-dashboard/home/skeletons/HomeDashboardSkeletons";

type HomeFeaturesSliderProps = {
  tiles: ManagementNavTile[];
  pathname: string | null;
  handoverPendingCount?: number;
  loading?: boolean;
};

const MODULE_ACCENTS = [
  {
    tab: "border-[#008CD3] bg-[#008CD3] text-white shadow-[0_4px_14px_rgba(0,140,211,0.35)]",
    panel: "from-[#E8F4FC] to-white",
    icon: "bg-[#008CD3] text-white",
    ring: "ring-[#008CD3]/20",
  },
  {
    tab: "border-[#E8710A] bg-[#E8710A] text-white shadow-[0_4px_14px_rgba(232,113,10,0.3)]",
    panel: "from-[#FFF4E5] to-white",
    icon: "bg-[#E8710A] text-white",
    ring: "ring-[#E8710A]/20",
  },
  {
    tab: "border-[#0F9D58] bg-[#0F9D58] text-white shadow-[0_4px_14px_rgba(15,157,88,0.3)]",
    panel: "from-[#E8F5E9] to-white",
    icon: "bg-[#0F9D58] text-white",
    ring: "ring-[#0F9D58]/20",
  },
  {
    tab: "border-[#7B1FA2] bg-[#7B1FA2] text-white shadow-[0_4px_14px_rgba(123,31,162,0.28)]",
    panel: "from-[#F3E8FD] to-white",
    icon: "bg-[#7B1FA2] text-white",
    ring: "ring-[#7B1FA2]/20",
  },
];

function badgeForTile(tileId: string, handoverPendingCount: number): number | null {
  return tileId === "asset-handover" && handoverPendingCount > 0
    ? handoverPendingCount
    : null;
}

function SubFeatureCard({
  tile,
  pathname,
  badge,
  accentIndex,
  animIndex,
}: {
  tile: ManagementNavTile;
  pathname: string | null;
  badge: number | null;
  accentIndex: number;
  animIndex: number;
}) {
  const Icon = tile.icon;
  const active = managementRouteActive(pathname, tile.href);
  const accent = MODULE_ACCENTS[accentIndex % MODULE_ACCENTS.length];

  return (
    <Link
      href={tile.href}
      className={`feature-child-card group flex items-start gap-3.5 rounded-xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        active
          ? `border-[#008CD3]/40 bg-[#F8FCFF] ring-2 ${accent.ring}`
          : "border-[#E4E7EC] bg-white hover:border-[#008CD3]/25"
      }`}
      style={{ animationDelay: `${animIndex * 40}ms` }}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent.icon} shadow-sm`}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-[14px] font-semibold leading-snug text-[#1F2937] group-hover:text-[#008CD3]">
            {tile.label}
          </h4>
          {badge ? (
            <span className="shrink-0 rounded-full bg-[#E8710A] px-2 py-0.5 text-[10px] font-bold text-white">
              {badge} pending
            </span>
          ) : null}
        </div>
        <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[#6B7280]">
          {tile.description}
        </p>
        <span className="mt-2.5 inline-flex items-center gap-1 text-[12px] font-semibold text-[#008CD3] opacity-80 transition group-hover:opacity-100">
          Open tool
          <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

function ModuleDetailPanel({
  group,
  pathname,
  handoverPendingCount,
  accentIndex,
}: {
  group: HomeFeatureGroup;
  pathname: string | null;
  handoverPendingCount: number;
  accentIndex: number;
}) {
  const Icon = group.icon;
  const accent = MODULE_ACCENTS[accentIndex % MODULE_ACCENTS.length];
  const activeCount = group.items.filter((item) =>
    managementRouteActive(pathname, item.href),
  ).length;

  return (
    <div
      key={group.id}
      className={`hero-rise rounded-2xl border border-[#E4E7EC]/80 bg-gradient-to-br ${accent.panel} p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] sm:p-5`}
    >
      <div className="mb-4 flex flex-col gap-3 border-b border-[#E4E7EC]/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${accent.icon} shadow-md`}
          >
            <Icon className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <h3 className="text-[17px] font-semibold text-[#1F2937] sm:text-[18px]">
              {group.label}
            </h3>
            <p className="mt-0.5 max-w-xl text-[13px] leading-relaxed text-[#5C6978]">
              {group.description}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <span className="inline-flex items-center rounded-lg border border-[#E4E7EC] bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-[#374151]">
            {group.items.length} tool{group.items.length === 1 ? "" : "s"}
          </span>
          {activeCount > 0 ? (
            <span className="inline-flex items-center rounded-lg border border-[#008CD3]/25 bg-[#E8F4FC] px-2.5 py-1 text-[11px] font-semibold text-[#0070AA]">
              {activeCount} active now
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {group.items.map((tile, index) => (
          <SubFeatureCard
            key={tile.id}
            tile={tile}
            pathname={pathname}
            badge={badgeForTile(tile.id, handoverPendingCount)}
            accentIndex={accentIndex}
            animIndex={index}
          />
        ))}
      </div>
    </div>
  );
}

export default function HomeFeaturesSlider({
  tiles,
  pathname,
  handoverPendingCount = 0,
  loading = false,
}: HomeFeaturesSliderProps) {
  const groups = useMemo(() => groupManagementNavTiles(tiles), [tiles]);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const activeGroup = useMemo(() => {
    if (groups.length === 0) return null;
    const found = groups.find((g) => g.id === activeGroupId);
    return found ?? groups[0];
  }, [groups, activeGroupId]);

  const activeIndex = useMemo(() => {
    if (!activeGroup) return 0;
    return groups.findIndex((g) => g.id === activeGroup.id);
  }, [groups, activeGroup]);

  useEffect(() => {
    if (groups.length === 0) return;
    setActiveGroupId((current) => {
      if (current && groups.some((g) => g.id === current)) return current;
      const routeMatch = groups.find((g) =>
        g.items.some((item) => managementRouteActive(pathname, item.href)),
      );
      return routeMatch?.id ?? groups[0].id;
    });
  }, [groups, pathname]);

  const updateScrollState = useCallback(() => {
    const el = tabsRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = tabsRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState, groups.length]);

  const scrollTabs = (dir: -1 | 1) => {
    tabsRef.current?.scrollBy({ left: dir * 200, behavior: "smooth" });
  };

  const selectGroup = (groupId: string) => {
    setActiveGroupId(groupId);
    const btn = tabsRef.current?.querySelector<HTMLElement>(
      `[data-module-id="${groupId}"]`,
    );
    btn?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  if (loading && tiles.length === 0) {
    return <FeaturesSliderSkeleton />;
  }

  if (groups.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-[#E4E7EC] bg-white px-5 py-12 text-center">
        <Layers className="mx-auto h-10 w-10 text-[#D1D5DB]" aria-hidden />
        <p className="mt-3 text-[15px] font-semibold text-[#374151]">No modules available</p>
        <p className="mt-1 text-[13px] text-[#6B7280]">
          Features assigned to your role will appear here.
        </p>
      </section>
    );
  }

  return (
    <section className="card-fade-in overflow-hidden rounded-2xl border border-[#E4E7EC] bg-white shadow-[0_4px_24px_rgba(15,23,42,0.06)]">
      {/* Header */}
      <div className="border-b border-[#EEF2F6] bg-gradient-to-r from-[#F8FAFC] via-white to-[#F8FAFC] px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#008CD3] text-white shadow-sm">
              <Sparkles className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-[16px] font-semibold text-[#1F2937] sm:text-[17px]">
                Workspace modules
              </h2>
              <p className="mt-0.5 text-[12px] text-[#6B7280] sm:text-[13px]">
                {groups.length} modules · {tiles.length} tools available · pick a module to
                explore
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => scrollTabs(-1)}
              disabled={!canScrollLeft}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E4E7EC] bg-white text-[#6B7280] transition hover:border-[#008CD3]/30 hover:text-[#008CD3] disabled:opacity-35"
              aria-label="Scroll modules left"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollTabs(1)}
              disabled={!canScrollRight}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E4E7EC] bg-white text-[#6B7280] transition hover:border-[#008CD3]/30 hover:text-[#008CD3] disabled:opacity-35"
              aria-label="Scroll modules right"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Module tabs */}
        <div
          ref={tabsRef}
          className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Feature modules"
        >
          {groups.map((group, index) => {
            const Icon = group.icon;
            const isActive = activeGroup?.id === group.id;
            const accent = MODULE_ACCENTS[index % MODULE_ACCENTS.length];
            const hasActiveTool = group.items.some((item) =>
              managementRouteActive(pathname, item.href),
            );

            return (
              <button
                key={group.id}
                type="button"
                role="tab"
                data-module-id={group.id}
                aria-selected={isActive}
                onClick={() => selectGroup(group.id)}
                className={`inline-flex shrink-0 items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left transition-all duration-200 ${
                  isActive
                    ? accent.tab
                    : "border-[#E4E7EC] bg-white text-[#374151] hover:border-[#008CD3]/25 hover:bg-[#F9FAFB]"
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    isActive ? "bg-white/20 text-white" : "bg-[#F3F4F6] text-[#6B7280]"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold leading-tight">
                    {group.label}
                  </span>
                  <span
                    className={`block text-[10px] font-medium ${
                      isActive ? "text-white/85" : "text-[#9CA3AF]"
                    }`}
                  >
                    {group.items.length} tool{group.items.length === 1 ? "" : "s"}
                    {hasActiveTool && !isActive ? " · in use" : ""}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active module detail */}
      <div className="p-3 sm:p-4">
        {activeGroup ? (
          <ModuleDetailPanel
            group={activeGroup}
            pathname={pathname}
            handoverPendingCount={handoverPendingCount}
            accentIndex={activeIndex}
          />
        ) : null}
      </div>
    </section>
  );
}
