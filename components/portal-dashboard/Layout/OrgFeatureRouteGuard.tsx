"use client";

import { useEffect } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  isPathAllowedForOrg,
  readOrganizationFeatureSnapshot,
} from "@/lib/orgFeatureAccess";

export default function OrgFeatureRouteGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const orgId = String(params?.org_id ?? "");

  useEffect(() => {
    if (!pathname || !orgId) return;
    if (pathname.includes("/not-authorized")) return;

    const snapshot = readOrganizationFeatureSnapshot(orgId);
    if (!snapshot?.allowedPaths?.length) return;

    const allowed = isPathAllowedForOrg(pathname, orgId, snapshot.allowedPaths);
    if (!allowed) {
      router.replace(`/dashboard/${orgId}/not-authorized`);
    }
  }, [pathname, orgId, router]);

  return null;
}
