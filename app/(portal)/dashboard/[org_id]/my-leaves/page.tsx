"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import MyLeavesWorkspace from "@/components/portal-dashboard/leaves/MyLeavesWorkspace";
import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";

function ManagementMyLeavesContent() {
  const ctx = useManagementDashboardContext();
  const roleKey = ctx?.user?.user_role_name?.trim().toLowerCase() ?? "";

  return (
    <MyLeavesWorkspace variant="management" applicantRoleKey={roleKey} />
  );
}

export default function ManagementMyLeavesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center bg-slate-50">
          <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
        </div>
      }
    >
      <ManagementMyLeavesContent />
    </Suspense>
  );
}
