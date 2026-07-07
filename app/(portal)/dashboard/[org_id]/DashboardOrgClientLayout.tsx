"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "@/components/portal-dashboard/Layout/Header";
import LeftSideBar from "@/components/portal-dashboard/Layout/LeftSideBar";
import RightMainSide from "@/components/portal-dashboard/Layout/RightMainSide";
import { ManagementDashboardProvider } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import { ManagementShellProvider } from "@/components/portal-dashboard/Layout/ManagementShellContext";
import UserDashboard from "@/components/portal-dashboard/user-layout/Dashboard";
import { useManagementDashboardData } from "@/components/portal-dashboard/Layout/useManagementDashboardData";
import OrgFeatureRouteGuard from "@/components/portal-dashboard/Layout/OrgFeatureRouteGuard";
import { useIsSyncConnectionRoute } from "@/lib/useIsSyncConnectionRoute";

function ManagementDashboardLayout({
  children,
  containScroll,
}: {
  children: React.ReactNode;
  containScroll: boolean;
}) {
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
      <ManagementShellProvider>
        <main
          className={`relative w-full ${containScroll ? "flex h-dvh max-h-dvh overflow-hidden" : ""}`}
        >
          <div
            className={`relative z-5 flex w-full ${containScroll ? "min-h-0 flex-1 overflow-hidden" : ""}`}
          >
            <LeftSideBar accessableFeatures={accessableFeatures} />
            <section
              className={
                containScroll
                  ? "flex min-h-0 w-full flex-1 flex-col overflow-hidden pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0"
                  : "w-full pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0"
              }
            >
              <Header />
              <div className={containScroll ? "min-h-0 flex-1 overflow-hidden" : "flex-1"}>
                <RightMainSide containScroll={containScroll}>{children}</RightMainSide>
              </div>
            </section>
          </div>
        </main>
      </ManagementShellProvider>
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

export default function DashboardOrgClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const orgId = params?.org_id;
  const [dashboardType, setDashboardType] = useState<"management" | "employee">("employee");
  const isSyncConnection = useIsSyncConnectionRoute();

  useEffect(() => {
    setDashboardType(readStoredDashboardType());
  }, [orgId]);

  useEffect(() => {
    if (!isSyncConnection) return;

    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, [isSyncConnection]);

  const isManagement = dashboardType === "management";

  return (
    <>
      <OrgFeatureRouteGuard />
      {isManagement ? (
        <ManagementDashboardLayout containScroll={isSyncConnection}>
          {children}
        </ManagementDashboardLayout>
      ) : (
        <UserDashboard containScroll={isSyncConnection}>{children}</UserDashboard>
      )}
    </>
  );
}
