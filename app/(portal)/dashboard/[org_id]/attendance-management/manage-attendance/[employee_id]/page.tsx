"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import ManageAttendanceDetail from "../ManageAttendanceDetail";

function EmployeeAttendancePageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const employeeId =
    searchParams.get("employee_id") || String(params?.employee_id ?? "");

  if (!employeeId) {
    return (
      <div className="p-6 text-center text-sm text-slate-500">
        Employee not specified.
      </div>
    );
  }

  return <ManageAttendanceDetail employeeId={employeeId} />;
}

export default function EmployeeAttendancePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-[#6B7280]">
          <Loader2 className="h-9 w-9 animate-spin text-[#008CD3]" />
          <p className="text-[15px]">Loading attendance history…</p>
        </div>
      }
    >
      <EmployeeAttendancePageContent />
    </Suspense>
  );
}
