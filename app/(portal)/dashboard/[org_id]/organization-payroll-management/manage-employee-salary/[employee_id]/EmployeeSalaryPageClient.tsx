"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import EmployeeSalaryClient from "./EmployeeSalaryClient";

function EmployeeSalaryPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const employeeId =
    searchParams.get("employee_id") || String(params?.employee_id ?? "");

  if (!employeeId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6 text-center text-sm text-slate-500">
        Employee not specified. Open this page from Manage Salary.
      </div>
    );
  }

  return <EmployeeSalaryClient employeeId={employeeId} />;
}

export function EmployeeSalaryPageClientWithSuspense() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-500">
          <Loader2 className="h-9 w-9 animate-spin text-[#C99237]" />
          <p className="text-sm">Loading salary…</p>
        </div>
      }
    >
      <EmployeeSalaryPageContent />
    </Suspense>
  );
}
