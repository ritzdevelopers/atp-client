import {
  organizationHasParentFeature,
  organizationHasSubFeature,
  type OrgFeatureGroup,
} from "@/lib/orgFeatureAccess";
import {
  buildManagementDashboardNavTiles,
  filterManagementNavTiles,
  type ManagementNavTile,
} from "@/lib/managementDashboardNav";

export type FeatureSearchEntry = {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  href: string | null;
  /** User can open this destination now. */
  accessible: boolean;
  /** Organization has this capability enabled. */
  orgEnabled: boolean;
  source: "navigation" | "organization";
  keywords: string;
  icon?: ManagementNavTile["icon"];
};

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function entryKeywords(parts: (string | null | undefined)[]): string {
  return normalizeSearchText(parts.filter(Boolean).join(" "));
}

function findNavTileForSub(
  tiles: ManagementNavTile[],
  parentKey: string,
  subPath: string,
): ManagementNavTile | undefined {
  const normalizedSub = subPath.trim().toLowerCase();
  return tiles.find((tile) => {
    const parent = (tile.parentFeatureKey || tile.requiredFeature || "").trim().toLowerCase();
    const sub = (tile.subFeatureId || "").trim().toLowerCase();
    return parent === parentKey.trim().toLowerCase() && sub === normalizedSub;
  });
}

export function buildFeatureSearchCatalog(
  orgId: string | number,
  groups: OrgFeatureGroup[],
  isAdmin: boolean,
): FeatureSearchEntry[] {
  const tiles = buildManagementDashboardNavTiles(orgId);
  const accessibleTileIds = new Set(
    filterManagementNavTiles(tiles, groups, isAdmin).map((tile) => tile.id),
  );

  const entries: FeatureSearchEntry[] = [];
  const seen = new Set<string>();

  function pushEntry(entry: FeatureSearchEntry) {
    if (seen.has(entry.id)) return;
    seen.add(entry.id);
    entries.push(entry);
  }

  for (const tile of tiles) {
    const orgEnabled = tile.requiredFeature
      ? organizationHasParentFeature(groups, tile.requiredFeature)
      : true;
    const subOk =
      !tile.subFeatureId ||
      !tile.parentFeatureKey ||
      organizationHasSubFeature(groups, tile.parentFeatureKey, tile.subFeatureId);
    const accessible = isAdmin || accessibleTileIds.has(tile.id);

    pushEntry({
      id: `nav-${tile.id}`,
      title: tile.label,
      subtitle: tile.description,
      category: tile.requiredFeature
        ? tile.requiredFeature.replace(/-/g, " ")
        : "Quick access",
      href: tile.href,
      accessible: accessible && (isAdmin || (orgEnabled && subOk)),
      orgEnabled: orgEnabled && subOk,
      source: "navigation",
      keywords: entryKeywords([
        tile.label,
        tile.description,
        tile.id,
        tile.requiredFeature,
        tile.parentFeatureKey,
        tile.subFeatureId,
        ...(tile.requiredFeatureAny ?? []),
      ]),
      icon: tile.icon,
    });
  }

  for (const group of groups) {
    const parentKey = String(group.feature_val ?? "").trim();
    const parentName = String(group.feature_name ?? parentKey).trim();
    if (!parentKey) continue;

    const parentNav = tiles.find(
      (tile) =>
        tile.requiredFeature === parentKey ||
        tile.parentFeatureKey === parentKey ||
        tile.requiredFeatureAny?.includes(parentKey),
    );

    pushEntry({
      id: `org-parent-${parentKey}`,
      title: parentName,
      subtitle: "Organization module",
      category: "Organization features",
      href: parentNav?.href ?? null,
      accessible: isAdmin || organizationHasParentFeature(groups, parentKey),
      orgEnabled: true,
      source: "organization",
      keywords: entryKeywords([parentName, parentKey, group.feature_name]),
      icon: parentNav?.icon,
    });

    for (const sub of group.sub_features ?? []) {
      const subPath = String(sub.sub_feature_path ?? "").trim();
      const subName = String(sub.sub_feature_name ?? subPath).trim();
      if (!subPath) continue;

      const navMatch = findNavTileForSub(tiles, parentKey, subPath);
      const orgEnabled = organizationHasSubFeature(groups, parentKey, subPath);
      const accessible =
        isAdmin ||
        (organizationHasParentFeature(groups, parentKey) && orgEnabled);

      pushEntry({
        id: `org-sub-${parentKey}-${subPath}`,
        title: subName,
        subtitle: `${parentName} · ${subPath.replace(/-/g, " ")}`,
        category: parentName,
        href: navMatch?.href ?? null,
        accessible,
        orgEnabled,
        source: "organization",
        keywords: entryKeywords([subName, subPath, parentName, parentKey]),
        icon: navMatch?.icon,
      });
    }
  }

  return entries;
}

export function filterFeatureSearchCatalog(
  catalog: FeatureSearchEntry[],
  query: string,
): {
  yourFeatures: FeatureSearchEntry[];
  organizationFeatures: FeatureSearchEntry[];
} {
  const q = normalizeSearchText(query);
  if (!q) {
    return { yourFeatures: [], organizationFeatures: [] };
  }

  const tokens = q.split(" ").filter(Boolean);
  const matches = catalog.filter((entry) =>
    tokens.every((token) => entry.keywords.includes(token)),
  );

  const yourFeatures = matches.filter((entry) => entry.accessible && entry.href);
  const organizationFeatures = matches.filter(
    (entry) => entry.source === "organization" && !yourFeatures.some((y) => y.id === entry.id),
  );

  return {
    yourFeatures: yourFeatures.slice(0, 8),
    organizationFeatures: organizationFeatures.slice(0, 8),
  };
}

export function highlightMatch(text: string, query: string): { text: string; match: boolean }[] {
  const q = query.trim();
  if (!q) return [{ text, match: false }];

  const lowerText = text.toLowerCase();
  const lowerQuery = q.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);
  if (index < 0) return [{ text, match: false }];

  const parts: { text: string; match: boolean }[] = [];
  if (index > 0) parts.push({ text: text.slice(0, index), match: false });
  parts.push({ text: text.slice(index, index + q.length), match: true });
  if (index + q.length < text.length) {
    parts.push({ text: text.slice(index + q.length), match: false });
  }
  return parts;
}
