"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";
import Header from "@/components/portal-dashboard/Layout/Header";
import LeftSideBar from "@/components/portal-dashboard/Layout/LeftSideBar";
import RightMainSide from "@/components/portal-dashboard/Layout/RightMainSide";
import { ManagementDashboardProvider } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import UserDashboard from "@/components/portal-dashboard/user-layout/Dashboard";
import { useManagementDashboardData } from "@/components/portal-dashboard/Layout/useManagementDashboardData";

function ManagementDashboardLayout({ children }: { children: React.ReactNode }) {
  const { organization, user, loading, accessableFeatures } = useManagementDashboardData();

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
    <ManagementDashboardProvider value={{ organization, user, loading }}>
      <main className="relative w-full">
        {/* <Header /> */}

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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const orgId = params?.org_id;
  const isManagement = String(orgId) === "1";

  if (isManagement) {
    return <ManagementDashboardLayout>{children}</ManagementDashboardLayout>;
  }

  return <UserDashboard>{children}</UserDashboard>;
}
