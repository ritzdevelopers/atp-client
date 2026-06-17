"use client";

import DraggableClock from "./DraggableClock";
import LeftSideBar from "./LeftSideBar";
import RightMainSide from "./RightMainSide";

export default function UserDashboard({
  children,
  containScroll = false,
}: {
  children: React.ReactNode;
  containScroll?: boolean;
}) {
  return (
    <main
      className={`relative flex w-full bg-slate-50 ${
        containScroll
          ? "h-dvh max-h-dvh min-h-0 overflow-hidden"
          : "min-h-screen overflow-x-hidden"
      }`}
    >
      {!containScroll && <DraggableClock />}
      <LeftSideBar />
      <div
        className={
          containScroll
            ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
            : "contents"
        }
      >
        <RightMainSide containScroll={containScroll}>{children}</RightMainSide>
      </div>
    </main>
  );
}
