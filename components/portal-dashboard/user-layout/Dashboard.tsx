"use client";

import DraggableClock from "./DraggableClock";
import LeftSideBar from "./LeftSideBar";
import RightMainSide from "./RightMainSide";

export default function UserDashboard({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen w-full overflow-x-hidden bg-slate-50">
      <DraggableClock />
      <LeftSideBar />
      <RightMainSide>{children}</RightMainSide>
    </main>
  );
}
