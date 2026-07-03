"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import ApplyCompOffForm from "@/components/portal-dashboard/comp-off/ApplyCompOffForm";

export default function ApplyCompOffPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center bg-slate-50/80">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      }
    >
      <ApplyCompOffForm />
    </Suspense>
  );
}
