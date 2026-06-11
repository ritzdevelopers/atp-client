"use client";

import type { LucideIcon } from "lucide-react";
import {
  Building2,
  CalendarDays,
  Clock,
  LayoutGrid,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import "./portal-page-loader.css";

type LoaderSize = "sm" | "md" | "lg";

type LoaderPage = {
  pageId: number;
  color: "blue" | "green" | "orange" | "purple" | "teal" | "red";
  Icon: LucideIcon;
};

const LOADER_PAGES: LoaderPage[] = [
  { pageId: 1, color: "blue", Icon: Clock },
  { pageId: 2, color: "green", Icon: Users },
  { pageId: 3, color: "orange", Icon: CalendarDays },
  { pageId: 4, color: "purple", Icon: ShieldCheck },
  { pageId: 5, color: "teal", Icon: Building2 },
  { pageId: 6, color: "red", Icon: Wallet },
  { pageId: 7, color: "blue", Icon: LayoutGrid },
];

export type PortalPageLoaderProps = {
  message?: string;
  overlay?: boolean;
  size?: LoaderSize;
  className?: string;
};

function FoldingCircleLoader({ size = "lg" }: { size?: LoaderSize }) {
  return (
    <div className={`portal-page-loader portal-page-loader--${size}`}>
      {LOADER_PAGES.map(({ pageId, color, Icon }) => (
        <LoaderPage key={`page-${pageId}`} pageId={pageId} color={color} Icon={Icon} />
      ))}
    </div>
  );
}

function LoaderPage({
  pageId,
  color,
  Icon,
}: Readonly<{ pageId: number; color: LoaderPage["color"]; Icon: LucideIcon }>) {
  return (
    <>
      <div
        className={`portal-page-loader__page portal-page-loader__page--${color} portal-page-loader__page--left portal-page-loader__page--${pageId}a`}
      >
        <Icon className="portal-page-loader__icon" strokeWidth={2.2} />
      </div>
      <div
        className={`portal-page-loader__page portal-page-loader__page--${color} portal-page-loader__page--right portal-page-loader__page--${pageId}b`}
      >
        <Icon className="portal-page-loader__icon" strokeWidth={2.2} />
      </div>
    </>
  );
}

export default function PortalPageLoader({
  message = "Loading…",
  overlay = false,
  size = "lg",
  className = "",
}: PortalPageLoaderProps) {
  const content = (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <FoldingCircleLoader size={size} />
      {message ? (
        <p className="max-w-[220px] text-center text-[14px] font-medium text-[#374151]">
          {message}
        </p>
      ) : null}
    </div>
  );

  if (overlay) {
    return (
      <div
        className="fixed inset-0 z-[10070] flex items-center justify-center bg-[#1F2937]/45 backdrop-blur-[2px]"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="rounded-2xl border border-[#E4E7EC] bg-white/95 px-8 py-8 shadow-2xl">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div role="status" aria-live="polite" aria-busy="true">
      {content}
    </div>
  );
}
