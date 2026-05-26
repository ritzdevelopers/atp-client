"use client";

// import DraggableClock from "@/components/portal-dashboard/user-layout/DraggableClock";
import LeftSideBar from "@/components/portal-dashboard/user-layout/LeftSideBar";
import RightMainSide from "@/components/portal-dashboard/user-layout/RightMainSide";

function UserDashboardComponent({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-slate-50">
      {/* <DraggableClock /> */}
      <LeftSideBar />
      <div className="w-full pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-14 lg:pb-0 lg:pl-[250px] lg:pt-0">
        <RightMainSide>{children}</RightMainSide>
      </div>
    </main>
  );
}

export default function UserDashboardOrgClientLayout({ children }: { children: React.ReactNode }) {
  return <UserDashboardComponent>{children}</UserDashboardComponent>;
}
