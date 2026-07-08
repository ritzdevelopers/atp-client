import {
  dashCardCls,
} from "@/components/portal-dashboard/home/dashboardTokens";

function Shimmer({ className = "" }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-xl ${className}`} />;
}

export default function EmployeeDashboardSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden p-2 sm:gap-4 sm:p-3">
      <div className={`${dashCardCls} overflow-hidden`}>
        <div className="px-5 py-6 sm:px-7 sm:py-8">
          <div className="flex items-start gap-4">
            <Shimmer className="h-11 w-11 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Shimmer className="h-3 w-24" />
              <Shimmer className="h-7 w-48 max-w-full" />
              <Shimmer className="h-4 w-56 max-w-full" />
            </div>
            <Shimmer className="h-10 w-10 shrink-0 rounded-xl" />
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Shimmer className="h-[72px]" />
            <Shimmer className="h-[72px]" />
            <Shimmer className="h-[72px]" />
          </div>
        </div>
      </div>

      <div className={`${dashCardCls} p-2`}>
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <Shimmer key={i} className="h-10 w-24 shrink-0 rounded-xl" />
          ))}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Shimmer key={i} className="min-h-[88px]" />
        ))}
      </div>
    </div>
  );
}
