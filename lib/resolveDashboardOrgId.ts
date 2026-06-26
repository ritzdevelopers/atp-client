import { getMe } from "@/services/auth";
import { isDashboardV2ShellOrg } from "@/lib/userDashboardRoutes";

const WEBSITE_DASHBOARD_CACHE_KEY = "website_dashboard_data_v1";

function orgFromWebsiteCache(): number | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(WEBSITE_DASHBOARD_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      organizations?: Array<{ id?: number | string }>;
    };
    const id = parsed.organizations?.[0]?.id;
    const n = Number(id);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function orgFromGetMePayload(result: Awaited<ReturnType<typeof getMe>>): number | null {
  const direct = Number(result.organization_id ?? result.data?.org_id);
  if (Number.isFinite(direct) && direct > 0) return direct;

  const details = result.org_details ?? result.data?.org_details;
  const list = Array.isArray(details) ? details : details ? [details] : [];
  const first = Number(list[0]?.id);
  if (Number.isFinite(first) && first > 0) return first;

  return null;
}

/**
 * Maps a URL org segment to the org id used for API calls.
 * Shell ids (e.g. "2" for v2 UI) resolve to the signed-in user's real org.
 */
export async function resolveDashboardDataOrgId(
  routeOrgId: string | number | null | undefined,
): Promise<number> {
  const route = String(routeOrgId ?? "").trim();
  const routeNum = Number(route);

  if (!route || Number.isNaN(routeNum)) {
    throw new Error("Invalid organization.");
  }

  if (!isDashboardV2ShellOrg(route)) {
    return routeNum;
  }

  const cached = orgFromWebsiteCache();
  if (cached != null) return cached;

  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("Not signed in.");
  }

  const me = await getMe(token);
  const fromMe = orgFromGetMePayload(me);
  if (fromMe != null) return fromMe;

  throw new Error(
    "Could not resolve your organization. Open /dashboard and select your organization first.",
  );
}
