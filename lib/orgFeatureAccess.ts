const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export type OrgSubFeature = {
  id: number | string;
  sub_feature_name: string;
  sub_feature_path: string;
};

export type OrgFeatureGroup = {
  parent_feature_id: number | string;
  feature_name: string;
  feature_val: string;
  sub_features: OrgSubFeature[];
};

export type OrgFeatureAccessSnapshot = {
  orgId: string;
  groups: OrgFeatureGroup[];
  allowedPaths: string[];
  updatedAt: number;
};

/** Nav sub-item id → backend sub_feature_path aliases */
export const SUB_FEATURE_ALIASES: Record<string, string[]> = {
  "manage-employees": ["manage-employee"],
  "manage-employee-leaves": ["employee-leave-management"],
  "manage-teams": ["team-management"],
  "create-team": ["team-management"],
  "employee-onboarding": ["manage-employee"],
  "organization-holidays": ["manage-holidays"],
  "manage-company-shifts": ["manage-shifts"],
  "create-company-shifts": ["create-new-shift"],
  "manage-employee-salary": ["manage-salary"],
};

export const ORG_FEATURES_SESSION_KEY = (orgId: string) => `org_features_${orgId}`;
export const ORG_FEATURE_ACCESS_COOKIE = "org_feature_access";

const ALWAYS_ALLOWED_SUFFIXES = [
  "/not-authorized",
  "/home",
  "/my-attendance-history",
  "/organization-employees/team-group",
  "/asset-handover"
];

export function orgFeaturesSessionKey(orgId: string): string {
  return ORG_FEATURES_SESSION_KEY(orgId);
}

export async function fetchOrganizationFeatureGroups(
  orgId: string,
  token: string,
): Promise<OrgFeatureGroup[]> {
  const res = await fetch(
    `${API_URL}/api/organization-features/get-organization-features-features-info?org_id=${encodeURIComponent(orgId)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  const data = (await res.json()) as {
    success?: boolean;
    message?: string;
    data?: OrgFeatureGroup[];
  };
  if (!res.ok) {
    throw new Error(data.message || "Could not load organization features");
  }
  return Array.isArray(data.data) ? data.data : [];
}

export function readOrganizationFeatureSnapshot(
  orgId: string,
): OrgFeatureAccessSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(orgFeaturesSessionKey(orgId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OrgFeatureAccessSnapshot;
    if (parsed?.orgId !== orgId || !Array.isArray(parsed.groups)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function encodeCookieValue(snapshot: OrgFeatureAccessSnapshot): string {
  return encodeURIComponent(JSON.stringify(snapshot));
}

export function persistOrganizationFeatureAccess(
  orgId: string,
  groups: OrgFeatureGroup[],
  allowedPaths: string[],
): void {
  if (typeof window === "undefined") return;

  const snapshot: OrgFeatureAccessSnapshot = {
    orgId,
    groups,
    allowedPaths,
    updatedAt: Date.now(),
  };

  try {
    sessionStorage.setItem(orgFeaturesSessionKey(orgId), JSON.stringify(snapshot));
  } catch {
    // ignore quota / private mode
  }

  try {
    const cookiePayload = {
      orgId,
      allowedPaths,
      updatedAt: snapshot.updatedAt,
    };
    const encoded = encodeURIComponent(JSON.stringify(cookiePayload));
    const maxAge = 60 * 60 * 12;
    document.cookie = `${ORG_FEATURE_ACCESS_COOKIE}=${encoded}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch {
    // ignore cookie errors
  }
}

export function clearOrganizationFeatureAccess(orgId?: string): void {
  if (typeof window === "undefined") return;
  if (orgId) {
    try {
      sessionStorage.removeItem(orgFeaturesSessionKey(orgId));
    } catch {
      // ignore
    }
  }
  try {
    document.cookie = `${ORG_FEATURE_ACCESS_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  } catch {
    // ignore
  }
}

export function normalizeFeatureVal(featureVal?: string): string {
  if (!featureVal) return "";
  const wanted = featureVal.trim().toLowerCase();
  if (wanted === "get-organization") return "get-organization-info";
  return wanted;
}

export function getOrganizationParentGroup(
  groups: OrgFeatureGroup[],
  featureVal?: string,
): OrgFeatureGroup | undefined {
  const wanted = normalizeFeatureVal(featureVal);
  if (!wanted) return undefined;
  return groups.find(
    (g) => String(g.feature_val || "").trim().toLowerCase() === wanted,
  );
}

export function organizationHasParentFeature(
  groups: OrgFeatureGroup[],
  featureVal?: string,
): boolean {
  if (!featureVal) return true;
  return Boolean(getOrganizationParentGroup(groups, featureVal));
}

function subFeaturePathMatches(
  assignedPaths: Set<string>,
  navSubId: string,
): boolean {
  const candidates = [navSubId, ...(SUB_FEATURE_ALIASES[navSubId] || [])].map((s) =>
    s.trim().toLowerCase(),
  );
  return candidates.some((c) => assignedPaths.has(c));
}

export function organizationHasSubFeature(
  groups: OrgFeatureGroup[],
  parentFeatureVal: string | undefined,
  subFeaturePath: string | undefined,
): boolean {
  if (!parentFeatureVal || !subFeaturePath) return true;
  const parent = getOrganizationParentGroup(groups, parentFeatureVal);
  if (!parent) return false;

  const assigned = parent.sub_features || [];
  if (assigned.length === 0) return true;

  const assignedPaths = new Set(
    assigned.map((sf) => String(sf.sub_feature_path || "").trim().toLowerCase()),
  );
  return subFeaturePathMatches(assignedPaths, subFeaturePath);
}

export function isPathAllowedForOrg(pathname: string, orgId: string, allowedPaths: string[]): boolean {
  if (!pathname || !orgId) return true;

  const normalizedPath = pathname.split("?")[0].replace(/\/$/, "") || "/";
  const base = `/dashboard/${orgId}`;

  if (!normalizedPath.startsWith(base)) return true;
  if (normalizedPath === base) return true;

  for (const suffix of ALWAYS_ALLOWED_SUFFIXES) {
    if (normalizedPath === `${base}${suffix}` || normalizedPath.startsWith(`${base}${suffix}/`)) {
      return true;
    }
  }

  if (!allowedPaths.length) {
    return (
      normalizedPath === `${base}/home` ||
      normalizedPath.startsWith(`${base}/not-authorized`)
    );
  }

  return allowedPaths.some((allowed) => {
    const normalizedAllowed = allowed.replace(/\/$/, "");
    return (
      normalizedPath === normalizedAllowed ||
      normalizedPath.startsWith(`${normalizedAllowed}/`)
    );
  });
}

export function parseOrgFeatureAccessCookie(
  cookieHeader: string | null | undefined,
): OrgFeatureAccessSnapshot | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";").map((p) => p.trim());
  const entry = parts.find((p) => p.startsWith(`${ORG_FEATURE_ACCESS_COOKIE}=`));
  if (!entry) return null;
  try {
    const raw = decodeURIComponent(entry.slice(ORG_FEATURE_ACCESS_COOKIE.length + 1));
    const parsed = JSON.parse(raw) as OrgFeatureAccessSnapshot;
    if (!parsed?.orgId || !Array.isArray(parsed.allowedPaths)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isDashboardPathAllowedFromCookie(
  pathname: string,
  orgId: string,
  cookieHeader: string | null | undefined,
): boolean {
  const snapshot = parseOrgFeatureAccessCookie(cookieHeader);
  if (!snapshot || snapshot.orgId !== String(orgId)) return true;
  return isPathAllowedForOrg(pathname, orgId, snapshot.allowedPaths);
}
