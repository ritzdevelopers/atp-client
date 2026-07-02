"use client";

import { useEffect } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  isPathAllowedForOrg,
  readOrganizationFeatureSnapshot,
} from "@/lib/orgFeatureAccess";
import { isCurrentUserOrgAdmin } from "@/lib/orgAdminAccess";
import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";

export default function OrgFeatureRouteGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const orgId = String(params?.org_id ?? "");
  const dashboardCtx = useManagementDashboardContext();
  const isAdmin = isCurrentUserOrgAdmin(dashboardCtx?.user?.user_role_name);

  useEffect(() => {
    if (!pathname || !orgId) return;
    if (pathname.includes("/not-authorized")) return;
    if (isAdmin) return;

    const snapshot = readOrganizationFeatureSnapshot(orgId);
    if (!snapshot?.allowedPaths?.length) return;

    const allowed = isPathAllowedForOrg(pathname, orgId, snapshot.allowedPaths);
    if (!allowed) {
      router.replace(`/dashboard/${orgId}/not-authorized`);
    }
  }, [pathname, orgId, router, isAdmin]);

  return null;
}
