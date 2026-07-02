import type { ManagementNavTile } from "@/lib/managementDashboardNav";

const PIN_PRIORITY = [
  "home",
  "manage-employees",
  "manage-employee-leaves",
  "manage-attendance",
  "asset-handover",
  "my-attendance-history",
  "my-leaves",
  "manage-employees-tasks",
  "sync-connection",
] as const;

const MAX_PINNED = 6;

/** Presentation-only: pick pinned tiles from the already-filtered nav list. */
export function selectPinnedNavTiles(
  tiles: ManagementNavTile[],
  handoverPendingCount: number,
  max = MAX_PINNED,
): ManagementNavTile[] {
  if (tiles.length === 0) return [];

  const byId = new Map(tiles.map((tile) => [tile.id, tile]));
  const pinned: ManagementNavTile[] = [];
  const used = new Set<string>();

  const addTile = (tile: ManagementNavTile | undefined) => {
    if (!tile || used.has(tile.id) || pinned.length >= max) return;
    pinned.push(tile);
    used.add(tile.id);
  };

  for (const id of PIN_PRIORITY) {
    addTile(byId.get(id));
  }

  for (const tile of tiles) {
    addTile(tile);
  }

  if (handoverPendingCount > 0) {
    const handover = byId.get("asset-handover");
    if (handover) {
      const withoutHandover = pinned.filter((t) => t.id !== "asset-handover");
      const next = [handover, ...withoutHandover].slice(0, max);
      return next;
    }
  }

  return pinned.slice(0, max);
}

export function remainingNavTiles(
  tiles: ManagementNavTile[],
  pinned: ManagementNavTile[],
): ManagementNavTile[] {
  const pinnedIds = new Set(pinned.map((t) => t.id));
  return tiles.filter((t) => !pinnedIds.has(t.id));
}
