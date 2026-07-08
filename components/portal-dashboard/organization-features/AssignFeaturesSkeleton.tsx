import {
  dashCardCls,
  dashSectionBodyCls,
  dashSectionHeadCls,
} from "@/components/portal-dashboard/home/dashboardTokens";

function Shimmer({ className = "" }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-xl ${className}`} />;
}

export default function AssignFeaturesPageSkeleton() {
  return (
    <div className="space-y-4">
      <div className={`${dashCardCls} overflow-hidden`}>
        <div className="border-b border-slate-100 bg-gradient-to-r from-[#F8FAFC] via-white to-[#F0F9FF]/40 px-5 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Shimmer className="h-11 w-11 shrink-0 rounded-xl" />
              <div className="space-y-2">
                <Shimmer className="h-3 w-28" />
                <Shimmer className="h-6 w-56" />
                <Shimmer className="h-4 w-72 max-w-full" />
              </div>
            </div>
            <div className="flex gap-2">
              <Shimmer className="h-10 w-24" />
              <Shimmer className="h-10 w-36" />
            </div>
          </div>
        </div>
        <div className={dashSectionBodyCls}>
          <Shimmer className="h-16 w-full" />
        </div>
      </div>

      <div className={`${dashCardCls} p-4`}>
        <Shimmer className="h-10 w-full max-w-md" />
      </div>

      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={`${dashCardCls} overflow-hidden`}>
          <div className={dashSectionHeadCls}>
            <Shimmer className="h-11 w-11 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Shimmer className="h-4 w-40" />
              <Shimmer className="h-3 w-56" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
