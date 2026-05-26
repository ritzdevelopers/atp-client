"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import GetEmployeeClient from "./GetEmployeeClient";

function GetEmployeePageContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("user_id");

  if (!userId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6 text-center text-sm text-slate-500">
        Employee not specified. Open this page from Manage Employees.
      </div>
    );
  }

  return <GetEmployeeClient userId={userId} />;
}

export default function GetEmployeePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-[#6B7280]">
          <Loader2 className="h-9 w-9 animate-spin text-[#008CD3]" />
          <p className="text-[15px]">Loading employee profile…</p>
        </div>
      }
    >
      <GetEmployeePageContent />
    </Suspense>
  );
}
