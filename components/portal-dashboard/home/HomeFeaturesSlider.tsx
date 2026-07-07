"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Layers, Sparkles } from "lucide-react";
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

const DEFAULT_HOME_MODULE_ID = "employee-management";

function orderGroupsWithEmployeeFirst(groups: HomeFeatureGroup[]): HomeFeatureGroup[] {
  const employee = groups.find((g) => g.id === DEFAULT_HOME_MODULE_ID);
  if (!employee) return groups;
  return [employee, ...groups.filter((g) => g.id !== DEFAULT_HOME_MODULE_ID)];
}

function resolveDefaultGroupId(
  groups: HomeFeatureGroup[],
  pathname: string | null,
): string | null {
  if (groups.length === 0) return null;
  const routeMatch = groups.find((g) =>
    g.items.some((item) => managementRouteActive(pathname, item.href)),
  );
  if (routeMatch) return routeMatch.id;
  const employee = groups.find((g) => g.id === DEFAULT_HOME_MODULE_ID);
  return employee?.id ?? groups[0].id;
}

const CARD_TONES = [
  "bg-[#E8F4FC] border-[#C5E4F7] text-[#008CD3]",
  "bg-[#FFF4E5] border-[#F9D9A8] text-[#E8710A]",
  "bg-[#E8F5E9] border-[#B7DFC3] text-[#0F9D58]",
  "bg-[#F3E8FD] border-[#DCC4F5] text-[#7B1FA2]",
  "bg-[#FCE8EC] border-[#F5C6D0] text-[#C6285C]",
  "bg-[#E8EAF6] border-[#C5CAE9] text-[#3949AB]",
];

function badgeForTile(tileId: string, handoverPendingCount: number): number | null {
  return tileId === "asset-handover" && handoverPendingCount > 0
    ? handoverPendingCount
    : null;
}

function FavouriteToolCard({
  tile,
  pathname,
  badge,
  toneIndex,
}: {
  tile: ManagementNavTile;
  pathname: string | null;
  badge: number | null;
  toneIndex: number;
}) {
  const Icon = tile.icon;
  const active = managementRouteActive(pathname, tile.href);
  const tone = CARD_TONES[toneIndex % CARD_TONES.length];

  return (
    <Link
      href={tile.href}
      title={tile.description}
      className={`fav-card-enter group relative flex h-[148px] w-[min(100%,220px)] min-w-[196px] shrink-0 snap-start flex-col items-center justify-center gap-3 rounded-2xl border px-4 py-5 text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-lg sm:h-[156px] sm:min-w-[212px] sm:max-w-[220px] ${
        active
          ? "border-[#008CD3] bg-[#F8FCFF] ring-2 ring-[#008CD3]/25 shadow-md"
          : `${tone} hover:brightness-[0.98]`
      }`}
    >
      {badge ? (
        <span className="absolute right-2.5 top-2.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E8710A] px-1.5 text-[10px] font-bold text-white">
          {badge}
        </span>
      ) : null}
      <span
        className={`flex h-14 w-14 items-center justify-center rounded-2xl border bg-white shadow-sm ${
          active ? "border-[#008CD3]/30 text-[#008CD3]" : "border-white/80"
        }`}
      >
        <Icon className="h-7 w-7" aria-hidden />
      </span>
      <span className="line-clamp-3 text-[15px] font-semibold leading-snug text-[#1F2937] sm:text-[16px]">
        {tile.label}
      </span>
    </Link>
  );
}

function ModuleToolsStrip({
  group,
  pathname,
  handoverPendingCount,
  accentIndex,
  onScrollState,
  trackRef,
}: {
  group: HomeFeatureGroup;
  pathname: string | null;
  handoverPendingCount: number;
  accentIndex: number;
  onScrollState: (left: boolean, right: boolean) => void;
  trackRef?: RefObject<HTMLDivElement | null>;
}) {
  const internalRef = useRef<HTMLDivElement>(null);
  const scrollRef = trackRef ?? internalRef;
  const Icon = group.icon;
  const tone = CARD_TONES[accentIndex % CARD_TONES.length];

  const updateScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    onScrollState(el.scrollLeft > 4, el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, [onScrollState, scrollRef]);

  useEffect(() => {
    updateScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScroll, { passive: true });
    const ro = new ResizeObserver(updateScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScroll);
      ro.disconnect();
    };
  }, [updateScroll, group.id, group.items.length, scrollRef]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${tone}`}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[18px] font-semibold text-[#1F2937] sm:text-[20px]">
            {group.label}
          </h3>
          <p className="mt-0.5 text-[14px] text-[#5C6978] sm:text-[15px]">
            {group.description} · {group.items.length} tool
            {group.items.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 pt-0.5 [scrollbar-width:thin]"
      >
        {group.items.map((tile, index) => (
          <FavouriteToolCard
            key={tile.id}
            tile={tile}
            pathname={pathname}
            badge={badgeForTile(tile.id, handoverPendingCount)}
            toneIndex={index + accentIndex}
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
  const orderedGroups = useMemo(
    () => orderGroupsWithEmployeeFirst(groups),
    [groups],
  );
  const tabsRef = useRef<HTMLDivElement>(null);
  const toolsTrackRef = useRef<HTMLDivElement>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(DEFAULT_HOME_MODULE_ID);
  const [canScrollTabsLeft, setCanScrollTabsLeft] = useState(false);
  const [canScrollTabsRight, setCanScrollTabsRight] = useState(false);
  const [canScrollToolsLeft, setCanScrollToolsLeft] = useState(false);
  const [canScrollToolsRight, setCanScrollToolsRight] = useState(false);

  const activeGroup = useMemo(() => {
    if (orderedGroups.length === 0) return null;
    const found = orderedGroups.find((g) => g.id === activeGroupId);
    return found ?? orderedGroups[0];
  }, [orderedGroups, activeGroupId]);

  const activeIndex = useMemo(() => {
    if (!activeGroup) return 0;
    return orderedGroups.findIndex((g) => g.id === activeGroup.id);
  }, [orderedGroups, activeGroup]);

  useEffect(() => {
    if (orderedGroups.length === 0) return;
    setActiveGroupId((current) => {
      if (current && orderedGroups.some((g) => g.id === current)) return current;
      return resolveDefaultGroupId(orderedGroups, pathname);
    });
  }, [orderedGroups, pathname]);

  useEffect(() => {
    if (orderedGroups.length === 0) return;
    const defaultId = resolveDefaultGroupId(orderedGroups, pathname);
    if (defaultId !== DEFAULT_HOME_MODULE_ID) return;
    const employeeTab = tabsRef.current?.querySelector<HTMLElement>(
      `[data-module-id="${DEFAULT_HOME_MODULE_ID}"]`,
    );
    employeeTab?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }, [orderedGroups.length, pathname]);

  const updateTabsScroll = useCallback(() => {
    const el = tabsRef.current;
    if (!el) return;
    setCanScrollTabsLeft(el.scrollLeft > 4);
    setCanScrollTabsRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateTabsScroll();
    const el = tabsRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateTabsScroll, { passive: true });
    const ro = new ResizeObserver(updateTabsScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateTabsScroll);
      ro.disconnect();
    };
  }, [updateTabsScroll, orderedGroups.length]);

  const handleToolsScrollState = useCallback((left: boolean, right: boolean) => {
    setCanScrollToolsLeft(left);
    setCanScrollToolsRight(right);
  }, []);

  const scrollTabs = (dir: -1 | 1) => {
    tabsRef.current?.scrollBy({ left: dir * 260, behavior: "smooth" });
  };

  const scrollTools = (dir: -1 | 1) => {
    toolsTrackRef.current?.scrollBy({ left: dir * 480, behavior: "smooth" });
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

  if (orderedGroups.length === 0) {
    return (
      <section className="w-full rounded-2xl border border-dashed border-[#E4E7EC] bg-white px-6 py-14 text-center">
        <Layers className="mx-auto h-12 w-12 text-[#D1D5DB]" aria-hidden />
        <p className="mt-3 text-[16px] font-semibold text-[#374151]">No modules available</p>
        <p className="mt-1 text-[14px] text-[#6B7280]">
          Features assigned to your role will appear here.
        </p>
      </section>
    );
  }

  return (
    <section className="card-fade-in w-full">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#008CD3] text-white shadow-md">
            <Sparkles className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <h2 className="text-[20px] font-semibold text-[#1F2937] sm:text-[22px]">
              Workspace modules
            </h2>
            <p className="mt-1 text-[14px] text-[#5C6978] sm:text-[15px]">
              {orderedGroups.length} modules · {tiles.length} tools available · pick a module to explore
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => scrollTabs(-1)}
            disabled={!canScrollTabsLeft}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E4E7EC] bg-white text-[#6B7280] shadow-sm transition hover:border-[#008CD3]/30 hover:text-[#008CD3] disabled:opacity-35"
            aria-label="Scroll modules left"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollTabs(1)}
            disabled={!canScrollTabsRight}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E4E7EC] bg-white text-[#6B7280] shadow-sm transition hover:border-[#008CD3]/30 hover:text-[#008CD3] disabled:opacity-35"
            aria-label="Scroll modules right"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        ref={tabsRef}
        className="mb-6 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Feature modules"
      >
        {orderedGroups.map((group, index) => {
          const Icon = group.icon;
          const isActive = activeGroup?.id === group.id;
          const tone = CARD_TONES[index % CARD_TONES.length];

          return (
            <button
              key={group.id}
              type="button"
              role="tab"
              data-module-id={group.id}
              aria-selected={isActive}
              onClick={() => selectGroup(group.id)}
              className={`inline-flex shrink-0 items-center gap-3 rounded-2xl border px-5 py-3.5 text-left transition-all duration-200 ${
                isActive
                  ? "border-[#008CD3] bg-[#008CD3] text-white shadow-[0_6px_20px_rgba(0,140,211,0.35)]"
                  : "border-[#E4E7EC] bg-white text-[#374151] hover:border-[#008CD3]/25 hover:bg-[#F9FAFB]"
              }`}
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  isActive ? "bg-white/20 text-white" : tone
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block whitespace-nowrap text-[15px] font-semibold sm:text-[16px]">
                  {group.label}
                </span>
                <span
                  className={`block text-[12px] font-medium sm:text-[13px] ${
                    isActive ? "text-white/90" : "text-[#9CA3AF]"
                  }`}
                >
                  {group.items.length} tool{group.items.length === 1 ? "" : "s"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-[#E4E7EC]/90 bg-white px-5 py-6 shadow-[0_4px_24px_rgba(15,23,42,0.05)] sm:px-7 sm:py-7">
        <div className="mb-5 flex items-center justify-between gap-3">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
            Quick access
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollTools(-1)}
              disabled={!canScrollToolsLeft}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E4E7EC] bg-[#FAFAFA] text-[#6B7280] transition hover:border-[#008CD3]/30 hover:text-[#008CD3] disabled:opacity-35"
              aria-label="Scroll tools left"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollTools(1)}
              disabled={!canScrollToolsRight}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E4E7EC] bg-[#FAFAFA] text-[#6B7280] transition hover:border-[#008CD3]/30 hover:text-[#008CD3] disabled:opacity-35"
              aria-label="Scroll tools right"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {activeGroup ? (
          <ModuleToolsStrip
            group={activeGroup}
            pathname={pathname}
            handoverPendingCount={handoverPendingCount}
            accentIndex={activeIndex}
            onScrollState={handleToolsScrollState}
            trackRef={toolsTrackRef}
          />
        ) : null}
      </div>
    </section>
  );
}
