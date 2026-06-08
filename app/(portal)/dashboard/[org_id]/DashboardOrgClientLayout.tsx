"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "@/components/portal-dashboard/Layout/Header";
import LeftSideBar from "@/components/portal-dashboard/Layout/LeftSideBar";
import RightMainSide from "@/components/portal-dashboard/Layout/RightMainSide";
import { ManagementDashboardProvider } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import UserDashboard from "@/components/portal-dashboard/user-layout/Dashboard";
import { useManagementDashboardData } from "@/components/portal-dashboard/Layout/useManagementDashboardData";
import OrgFeatureRouteGuard from "@/components/portal-dashboard/Layout/OrgFeatureRouteGuard";

function ManagementDashboardLayout({ children }: { children: React.ReactNode }) {
  const { organization, user, organizationAddresses, loading, accessableFeatures } =
    useManagementDashboardData();

  useEffect(() => {
    if (organization?.id == null) return;
    try {
      sessionStorage.setItem(
        "org_details",
        JSON.stringify({ id: organization.id }),
      );
    } catch {
      /* ignore quota / private mode */
    }
  }, [organization?.id]);

  return (
    <ManagementDashboardProvider value={{ organization, user, organizationAddresses, loading }}>
      <main className="relative w-full">
        <div className="relative z-5 flex w-full">
          <LeftSideBar accessableFeatures={accessableFeatures} />
          <section className="w-full pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
            <Header />
            <div className="flex-1">
              <RightMainSide>{children}</RightMainSide>
            </div>
          </section>
        </div>
      </main>
    </ManagementDashboardProvider>
  );
}

function readStoredDashboardType(): "management" | "employee" {
  if (typeof window === "undefined") return "employee";
  try {
    const cached = sessionStorage.getItem("navbar_auth_cache_v1");
    if (cached) {
      const parsed = JSON.parse(cached) as { dashboardType?: string };
      if (parsed?.dashboardType === "management") return "management";
    }
  } catch {
    /* ignore */
  }
  const stored = localStorage.getItem("dashboard_type");
  return stored === "management" ? "management" : "employee";
}

export default function DashboardOrgClientLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const orgId = params?.org_id;
  const [dashboardType, setDashboardType] = useState<"management" | "employee">("employee");

  useEffect(() => {
    setDashboardType(readStoredDashboardType());
  }, [orgId]);

  const isManagement = dashboardType === "management";

  return (
    <>
      <OrgFeatureRouteGuard />
      {isManagement ? (
        <ManagementDashboardLayout>{children}</ManagementDashboardLayout>
      ) : (
        <UserDashboard>{children}</UserDashboard>
      )}
    </>
  );
}
