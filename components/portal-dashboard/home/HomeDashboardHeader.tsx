"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { MdWorkspacePremium } from "react-icons/md";
import {
  avatarCls,
  dashCardCls,
  roleBadgeClass,
  userInitials,
} from "@/components/portal-dashboard/home/dashboardTokens";

type HomeDashboardHeaderProps = {
  greeting: string;
  displayName: string;
  orgTitle: string;
  roleBadgeLabel: string;
  roleKey: string;
  refreshing: boolean;
  onRefresh: () => void;
};

function formatHeaderDateTime(now: Date): string {
  return now.toLocaleString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function HomeDashboardHeader({
  greeting,
  displayName,
  orgTitle,
  roleBadgeLabel,
  roleKey,
  refreshing,
  onRefresh,
}: HomeDashboardHeaderProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <header className={`${dashCardCls} px-5 py-5 sm:px-6 sm:py-6`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span className={avatarCls()} aria-hidden>
            {userInitials(displayName)}
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-slate-500">{greeting}</p>
            <h1 className="mt-0.5 flex items-center gap-2 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              <span className="truncate">{displayName}</span>
              <MdWorkspacePremium
                className="h-[18px] w-[18px] shrink-0 text-amber-500"
                aria-label="Premium"
              />
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <p className="truncate text-[13px] text-slate-500">{orgTitle}</p>
              <span className="hidden text-slate-300 sm:inline">·</span>
              <span className={roleBadgeClass(roleKey)}>{roleBadgeLabel}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:shrink-0">
          <time
            dateTime={now.toISOString()}
            className="hidden text-right text-[12px] leading-snug text-slate-500 lg:block"
          >
            {formatHeaderDateTime(now)}
          </time>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
            aria-label="Refresh dashboard"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              aria-hidden
            />
          </button>
        </div>
      </div>
    </header>
  );
}
