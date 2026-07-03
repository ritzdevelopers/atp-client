"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import MyRegularizationWorkspace from "@/components/portal-dashboard/regularization/MyRegularizationWorkspace";

export default function RegularizationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center bg-slate-50/80">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <MyRegularizationWorkspace />
    </Suspense>
  );
}
