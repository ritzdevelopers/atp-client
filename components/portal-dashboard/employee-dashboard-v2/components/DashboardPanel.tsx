"use client";

import type { ReactNode } from "react";

type DashboardPanelProps = {
  children: ReactNode;
  /** Allow inner scroll only when a section has more content than the viewport */
  scrollable?: boolean;
};

export default function DashboardPanel({
  children,
  scrollable = true,
}: DashboardPanelProps) {
  return (
    <div
      className={`h-full min-h-0 ${scrollable ? "overflow-y-auto overscroll-contain" : "overflow-hidden"}`}
    >
      <div className="pb-2">{children}</div>
    </div>
  );
}
