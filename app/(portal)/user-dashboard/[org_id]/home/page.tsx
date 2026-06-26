"use client";

import { useParams } from "next/navigation";
import EmployeeDashboardV2 from "@/components/portal-dashboard/employee-dashboard-v2/EmployeeDashboardV2";
import HomeLegacy from "./HomeLegacy";
import { isDashboardV2ShellOrg } from "@/lib/userDashboardRoutes";

export default function UserDashboardHomePage() {
  const params = useParams();
  const orgId = String(params?.org_id ?? "");

  if (isDashboardV2ShellOrg(orgId)) {
    return <EmployeeDashboardV2 />;
  }

  return <HomeLegacy />;
}
