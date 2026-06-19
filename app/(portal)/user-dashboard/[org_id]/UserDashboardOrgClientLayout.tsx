"use client";

import LeftSideBar from "@/components/portal-dashboard/user-layout/LeftSideBar";
import RightMainSide from "@/components/portal-dashboard/user-layout/RightMainSide";
import { useIsSyncConnectionRoute } from "@/lib/useIsSyncConnectionRoute";
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
      <div
        className={
          containScroll
            ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0 lg:pl-[250px]"
            : "w-full pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0 lg:pl-[250px]"
        }
      >
        <RightMainSide containScroll={containScroll}>{children}</RightMainSide>
      </div>
    </main>
  );
}

export default function UserDashboardOrgClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isSyncConnection = useIsSyncConnectionRoute();

  useEffect(() => {
    if (!isSyncConnection) return;

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
  }, [isSyncConnection]);

  return (
    <UserDashboardComponent containScroll={isSyncConnection}>
      {children}
    </UserDashboardComponent>
  );
}
