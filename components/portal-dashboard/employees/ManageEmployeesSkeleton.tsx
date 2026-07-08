import { dashCardCls } from "@/components/portal-dashboard/home/dashboardTokens";

function Shimmer({ className = "" }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-xl ${className}`} />;
}

export function ManageEmployeesHeaderSkeleton() {
  return (
    <div className={`${dashCardCls} overflow-hidden`}>
      <div className="border-b border-slate-100 bg-gradient-to-r from-[#F8FAFC] via-white to-[#F0F9FF]/40 px-5 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shimmer className="h-11 w-11 shrink-0 rounded-xl" />
            <div className="space-y-2">
              <Shimmer className="h-3 w-24" />
              <Shimmer className="h-6 w-40" />
              <Shimmer className="h-4 w-56" />
            </div>
          </div>
          <div className="flex gap-2">
            <Shimmer className="h-10 w-36" />
            <Shimmer className="h-10 w-36" />
          </div>
        </div>
      </div>
      <div className="flex gap-2 border-b border-slate-100 px-4 py-3">
        <Shimmer className="h-9 w-24" />
        <Shimmer className="h-9 w-28" />
        <Shimmer className="h-9 w-24" />
      </div>
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <Shimmer className="h-4 w-40" />
        <Shimmer className="h-10 w-full max-w-xs rounded-xl" />
      </div>
    </div>
  );
}

function EmployeeCardSkeleton({ variant = "grid" }: { variant?: "grid" | "list" }) {
  if (variant === "list") {
    return (
      <div className={`${dashCardCls} flex gap-3 p-4 lg:hidden`}>
        <Shimmer className="h-14 w-14 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Shimmer className="h-4 w-3/5" />
          <Shimmer className="h-3 w-1/3" />
          <div className="flex gap-2">
            <Shimmer className="h-5 w-16 rounded-full" />
            <Shimmer className="h-5 w-20 rounded-full" />
          </div>
          <Shimmer className="h-3 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className={`${dashCardCls} hidden overflow-hidden lg:block`}>
      <div className="flex justify-end gap-1 p-3">
        <Shimmer className="h-8 w-8 rounded-lg" />
        <Shimmer className="h-8 w-8 rounded-lg" />
        <Shimmer className="h-8 w-8 rounded-lg" />
      </div>
      <div className="flex flex-col items-center px-4 pb-4">
        <Shimmer className="h-[4.5rem] w-[4.5rem] rounded-full" />
        <Shimmer className="mt-3 h-4 w-40" />
      </div>
      <div className="space-y-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
        <Shimmer className="h-3 w-24" />
        <Shimmer className="h-3 w-32" />
        <Shimmer className="h-6 w-full" />
      </div>
    </div>
  );
}

export function ManageEmployeesGridSkeleton() {
  return (
    <div className="space-y-4">
      <div className="lg:hidden space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <EmployeeCardSkeleton key={`m-${i}`} variant="list" />
        ))}
      </div>
      <div className="hidden gap-5 lg:grid lg:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <EmployeeCardSkeleton key={`d-${i}`} variant="grid" />
        ))}
      </div>
    </div>
  );
}

export function ManageEmployeesPageSkeleton() {
  return (
    <div className="space-y-4 lg:space-y-6">
      <ManageEmployeesHeaderSkeleton />
      <ManageEmployeesGridSkeleton />
    </div>
  );
}
