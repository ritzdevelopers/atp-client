"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import MyLeavesWorkspace from "@/components/portal-dashboard/leaves/MyLeavesWorkspace";

export default function MyLeavesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center bg-slate-50/80">
          <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
        </div>
      }
    >
      <MyLeavesWorkspace variant="employee" />
    </Suspense>
  );
}
