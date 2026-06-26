"use client";

import { useParams, usePathname } from "next/navigation";
import { isDashboardV2ShellOrg } from "@/lib/userDashboardRoutes";

export function useIsDashboardV2Home(): boolean {
  const pathname = usePathname();
  const params = useParams();
  const orgId = String(params?.org_id ?? "");
  return Boolean(pathname?.includes("/home") && isDashboardV2ShellOrg(orgId));
}
