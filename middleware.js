import { NextResponse } from "next/server";

const ORG_FEATURE_ACCESS_COOKIE = "org_feature_access";

const ALWAYS_ALLOWED_SUFFIXES = ["/not-authorized", "/home"];

function parseOrgFeatureAccessCookie(cookieHeader) {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";").map((p) => p.trim());
  const entry = parts.find((p) => p.startsWith(`${ORG_FEATURE_ACCESS_COOKIE}=`));
  if (!entry) return null;
  try {
    const raw = decodeURIComponent(entry.slice(ORG_FEATURE_ACCESS_COOKIE.length + 1));
    const parsed = JSON.parse(raw);
    if (!parsed?.orgId || !Array.isArray(parsed.allowedPaths)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isPathAllowedForOrg(pathname, orgId, allowedPaths) {
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

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const dashboardMatch = pathname.match(/^\/dashboard\/([^/]+)(\/.*)?$/);
  if (!dashboardMatch) {
    return NextResponse.next();
  }

  const orgId = dashboardMatch[1];
  const snapshot = parseOrgFeatureAccessCookie(request.headers.get("cookie"));

  if (!snapshot || String(snapshot.orgId) !== String(orgId)) {
    return NextResponse.next();
  }

  if (!isPathAllowedForOrg(pathname, orgId, snapshot.allowedPaths)) {
    const url = request.nextUrl.clone();
    url.pathname = `/dashboard/${orgId}/not-authorized`;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:orgId/:path*"],
};
