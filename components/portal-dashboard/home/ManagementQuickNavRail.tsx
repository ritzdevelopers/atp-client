"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, LayoutGrid, Search, X } from "lucide-react";
import type { ManagementNavTile } from "@/lib/managementDashboardNav";
import { managementRouteActive } from "@/lib/managementDashboardNav";
import { selectPinnedNavTiles } from "@/components/portal-dashboard/home/pinnedNavTiles";
import { QuickNavRailSkeleton } from "@/components/portal-dashboard/home/skeletons/HomeDashboardSkeletons";

type ManagementQuickNavRailProps = {
  tiles: ManagementNavTile[];
  pathname: string | null;
  handoverPendingCount?: number;
  loading?: boolean;
};

function NavChip({
  tile,
  pathname,
  badge,
  onNavigate,
}: {
  tile: ManagementNavTile;
  pathname: string | null;
  badge: number | null;
  onNavigate?: () => void;
}) {
  const Icon = tile.icon;
  const active = managementRouteActive(pathname, tile.href);

  return (
    <Link
      href={tile.href}
      onClick={onNavigate}
      title={tile.description}
      className={`group relative inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 transition-colors ${
        active
          ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
          : "bg-slate-100/80 text-slate-700 hover:bg-slate-100"
      }`}
    >
      {badge ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[9px] font-bold text-white">
          {badge}
        </span>
      ) : null}
      <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
      <span className="max-w-[8rem] truncate text-[13px] font-medium">
        {tile.label}
      </span>
    </Link>
  );
}

function NavGridTile({
  tile,
  pathname,
  badge,
  onNavigate,
}: {
  tile: ManagementNavTile;
  pathname: string | null;
  badge: number | null;
  onNavigate?: () => void;
}) {
  const Icon = tile.icon;
  const active = managementRouteActive(pathname, tile.href);

  return (
    <Link
      href={tile.href}
      onClick={onNavigate}
      className={`group relative flex flex-col gap-3 rounded-xl border p-4 transition-colors ${
        active
          ? "border-sky-200 bg-sky-50/50"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
      }`}
    >
      {badge ? (
        <span className="absolute right-3 top-3 rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
          {badge}
        </span>
      ) : null}
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          active ? "bg-sky-100 text-sky-600" : "bg-slate-100 text-slate-600"
        }`}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[14px] font-semibold text-slate-900">
          {tile.label}
        </p>
        <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-slate-500">
          {tile.description}
        </p>
      </div>
    </Link>
  );
}

export default function ManagementQuickNavRail({
  tiles,
  pathname,
  handoverPendingCount = 0,
  loading = false,
}: ManagementQuickNavRailProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState("");

  const pinned = useMemo(
    () => selectPinnedNavTiles(tiles, handoverPendingCount),
    [tiles, handoverPendingCount],
  );

  const filteredTiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tiles;
    return tiles.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q),
    );
  }, [tiles, query]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      setQuery("");
    };
  }, [drawerOpen]);

  if (loading && tiles.length === 0) {
    return <QuickNavRailSkeleton />;
  }

  return (
    <>
      <section>
        <div className="mb-2.5 flex items-center justify-between gap-2 px-0.5">
          <h2 className="text-[13px] font-semibold text-slate-900">Shortcuts</h2>
          {tiles.length > pinned.length ? (
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-1 text-[13px] font-medium text-sky-600 hover:text-sky-700"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              All tools
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                {tiles.length}
              </span>
            </button>
          ) : null}
        </div>

        {pinned.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 text-center text-[13px] text-slate-500">
            No modules available for your role yet.
          </p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
            {pinned.map((tile) => (
              <NavChip
                key={tile.id}
                tile={tile}
                pathname={pathname}
                badge={
                  tile.id === "asset-handover" && handoverPendingCount > 0
                    ? handoverPendingCount
                    : null
                }
              />
            ))}
          </div>
        )}
      </section>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-stretch sm:justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-[1px] drawer-backdrop-enter"
            aria-label="Close tools panel"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="All management tools"
            className="relative flex max-h-[88vh] w-full flex-col rounded-t-2xl border border-slate-200 bg-white shadow-2xl drawer-panel-enter sm:max-h-none sm:h-full sm:max-w-lg sm:rounded-none sm:rounded-l-2xl"
          >
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                    All tools
                  </h2>
                  <p className="mt-0.5 text-[13px] text-slate-500">
                    {tiles.length} modules available
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <label className="relative mt-4 block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search tools…"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-[13px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
                />
              </label>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 [scrollbar-width:thin]">
              {filteredTiles.length === 0 ? (
                <p className="py-12 text-center text-[13px] text-slate-500">
                  No tools match your search.
                </p>
              ) : (
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {filteredTiles.map((tile, index) => (
                    <li
                      key={tile.id}
                      className="card-fade-in"
                      style={{ animationDelay: `${Math.min(index * 25, 250)}ms` }}
                    >
                      <NavGridTile
                        tile={tile}
                        pathname={pathname}
                        badge={
                          tile.id === "asset-handover" && handoverPendingCount > 0
                            ? handoverPendingCount
                            : null
                        }
                        onNavigate={() => setDrawerOpen(false)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-t border-slate-100 px-5 py-3">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-100 py-2.5 text-[13px] font-medium text-slate-700 hover:bg-slate-200/80"
              >
                Close
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
