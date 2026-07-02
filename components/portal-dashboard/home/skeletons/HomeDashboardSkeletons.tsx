import {
  dashCardCls,
  dashPanelCls,
  dashSectionBodyCls,
  dashSectionHeadCls,
} from "@/components/portal-dashboard/home/dashboardTokens";

function Shimmer({ className = "" }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-lg ${className}`} />;
}

export function HomeHeaderSkeleton() {
  return (
    <header className={`${dashCardCls} px-5 py-5 sm:px-6 sm:py-6`}>
      <div className="flex items-center gap-4">
        <Shimmer className="h-11 w-11 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Shimmer className="h-3 w-28" />
          <Shimmer className="h-7 w-48 max-w-full" />
          <Shimmer className="h-4 w-36" />
        </div>
        <Shimmer className="hidden h-10 w-10 rounded-lg sm:block" />
      </div>
    </header>
  );
}

export function QuickNavRailSkeleton() {
  return (
    <div>
      <Shimmer className="mb-2.5 h-4 w-20" />
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <Shimmer key={i} className="h-9 w-28 shrink-0 rounded-full" />
        ))}
      </div>
    </div>
  );
}

export function AttendanceCardSkeleton() {
  return (
    <section className={dashCardCls}>
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shimmer className="h-10 w-10 rounded-xl" />
            <div className="space-y-2">
              <Shimmer className="h-4 w-36" />
              <Shimmer className="h-3 w-24" />
            </div>
          </div>
          <Shimmer className="h-10 w-24" />
        </div>
      </div>
      <div className={dashSectionBodyCls}>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Shimmer key={i} className="h-16 rounded-xl" />
          ))}
        </div>
        <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
          <Shimmer className="h-10 w-24 rounded-lg" />
          <Shimmer className="h-10 w-24 rounded-lg" />
          <Shimmer className="h-10 w-20 rounded-lg" />
        </div>
      </div>
    </section>
  );
}

export function LivePanelListSkeleton() {
  return (
    <ul className="divide-y divide-slate-100 px-1 py-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 px-4 py-2.5">
          <Shimmer className="h-8 w-8 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Shimmer className="h-3.5 w-32" />
            <Shimmer className="h-3 w-44" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function LivePanelShellSkeleton({ title }: { title: string }) {
  return (
    <aside className={dashPanelCls} aria-label={`${title} loading`}>
      <div className="border-b border-slate-100 px-4 py-3">
        <Shimmer className="h-3 w-24" />
        <Shimmer className="mt-2 h-4 w-40" />
        <Shimmer className="mt-3 h-9 w-full rounded-lg" />
      </div>
      <LivePanelListSkeleton />
    </aside>
  );
}

export function AssetHandoverCardSkeleton() {
  return (
    <section className={dashCardCls}>
      <div className="px-5 py-5">
        <div className="flex items-center gap-3">
          <Shimmer className="h-9 w-9 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Shimmer className="h-4 w-32" />
            <Shimmer className="h-3 w-24" />
          </div>
        </div>
        <Shimmer className="mt-4 h-20 w-full rounded-xl" />
      </div>
    </section>
  );
}

export function MyTeamsSkeleton() {
  return (
    <section className={dashCardCls}>
      <div className={dashSectionHeadCls}>
        <Shimmer className="h-9 w-9 rounded-xl" />
        <div className="space-y-2">
          <Shimmer className="h-4 w-24" />
          <Shimmer className="h-3 w-20" />
        </div>
      </div>
      <div className={dashSectionBodyCls}>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Shimmer key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    </section>
  );
}

export function ProfileSummarySkeleton() {
  return (
    <section className={`${dashCardCls} min-w-0`}>
      <div className={dashSectionHeadCls}>
        <Shimmer className="h-9 w-9 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <Shimmer className="h-4 w-36" />
          <Shimmer className="h-3 w-44" />
        </div>
      </div>
      <div className={`${dashSectionBodyCls} flex flex-col gap-4`}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Shimmer key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    </section>
  );
}

export function AddressesSkeleton() {
  return (
    <section className={dashCardCls}>
      <div className={dashSectionHeadCls}>
        <Shimmer className="h-9 w-9 rounded-xl" />
        <div className="space-y-2">
          <Shimmer className="h-4 w-28" />
          <Shimmer className="h-3 w-24" />
        </div>
      </div>
      <div className={dashSectionBodyCls}>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Shimmer key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomePageLoadingSkeleton({
  showAttendance = true,
}: {
  showAttendance?: boolean;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-6">
      <HomeHeaderSkeleton />
      <QuickNavRailSkeleton />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
        <div className="flex flex-col gap-5 lg:col-span-8">
          {showAttendance ? <AttendanceCardSkeleton /> : null}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <LivePanelShellSkeleton title="Team presence" />
            <LivePanelShellSkeleton title="Biometric feed" />
          </div>
          {showAttendance ? <MyTeamsSkeleton /> : null}
        </div>
        <div className="flex flex-col gap-5 lg:col-span-4">
          <ProfileSummarySkeleton />
          <AssetHandoverCardSkeleton />
        </div>
        <div className="lg:col-span-12">
          <AddressesSkeleton />
        </div>
      </div>
    </div>
  );
}
