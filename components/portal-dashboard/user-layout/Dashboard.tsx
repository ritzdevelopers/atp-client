"use client";

import LeftSideBar from "@/components/portal-dashboard/user-layout/LeftSideBar";
import RightMainSide from "@/components/portal-dashboard/user-layout/RightMainSide";
import UserHeader from "@/components/portal-dashboard/user-layout/UserHeader";
import { ManagementShellProvider } from "@/components/portal-dashboard/Layout/ManagementShellContext";
import DraggableClock from "@/components/portal-dashboard/user-layout/DraggableClock";

export default function UserDashboard({
  children,
  containScroll = false,
}: {
  children: React.ReactNode;
  containScroll?: boolean;
}) {
  return (
    <ManagementShellProvider>
      <main
        className={`relative flex w-full bg-slate-50 ${
          containScroll
            ? "h-dvh max-h-dvh min-h-0 overflow-hidden"
            : "min-h-screen overflow-x-hidden"
        }`}
      >
        {!containScroll && <DraggableClock />}
        <LeftSideBar />
        <section
          className={
            containScroll
              ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0"
              : "flex min-w-0 flex-1 flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0"
          }
        >
          <UserHeader />
          <div className={containScroll ? "min-h-0 flex-1 overflow-hidden" : "flex-1"}>
            <RightMainSide containScroll={containScroll}>{children}</RightMainSide>
          </div>
        </section>
      </main>
    </ManagementShellProvider>
  );
}
