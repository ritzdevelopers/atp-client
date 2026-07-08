"use client";

import LeftSideBar from "@/components/portal-dashboard/user-layout/LeftSideBar";
import RightMainSide from "@/components/portal-dashboard/user-layout/RightMainSide";
import UserHeader from "@/components/portal-dashboard/user-layout/UserHeader";
import { ManagementShellProvider } from "@/components/portal-dashboard/Layout/ManagementShellContext";
import { useIsSyncConnectionRoute } from "@/lib/useIsSyncConnectionRoute";
import { useIsDashboardV2Home } from "@/lib/useIsDashboardV2Home";
import { useEffect } from "react";

function UserDashboardComponent({
  children,
  containScroll = false,
}: {
  children: React.ReactNode;
  containScroll?: boolean;
}) {
  return (
    <main
      className={`relative w-full bg-slate-50 ${
        containScroll
          ? "flex h-dvh max-h-dvh min-h-0 overflow-hidden"
          : "min-h-screen overflow-x-hidden"
      }`}
    >
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
  );
}

export default function UserDashboardOrgClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isSyncConnection = useIsSyncConnectionRoute();
  const isDashboardV2Home = useIsDashboardV2Home();
  const containScroll = isSyncConnection || isDashboardV2Home;

  useEffect(() => {
    if (!containScroll) return;

    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, [containScroll]);

  return (
    <ManagementShellProvider>
      <UserDashboardComponent containScroll={containScroll}>
        {children}
      </UserDashboardComponent>
    </ManagementShellProvider>
  );
}
