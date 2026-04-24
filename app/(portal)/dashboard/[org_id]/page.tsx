"use client";
import ManagementDashboard from "@/components/portal-dashboard/Layout/Dashboard";
import UserDashboard from "@/components/portal-dashboard/user-layout/Dashboard";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

function DashboardPage({ children }: { children: React.ReactNode }) {
  const [isManagement, setIsManagement] = useState(false);
  const params = useParams();
  const orgId = params.org_id;
  useEffect(() => {
    if (orgId === "1") {
      setIsManagement(true);
    } else {
      setIsManagement(false);
    }
  }, [orgId]);
  return (
    <main className="flex w-full">
      {isManagement ? <ManagementDashboard>{children}</ManagementDashboard> : <UserDashboard>{children}</UserDashboard>}
    </main>
  );
}

export default DashboardPage;
