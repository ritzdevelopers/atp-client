"use client";

import Link from "next/link";
import {
  CalendarCheck,
  CalendarClock,
  ClipboardList,
  Fingerprint,
  MessageSquare,
  Package,
  Palmtree,
  RotateCcw,
  UsersRound,
  Video,
} from "lucide-react";
import { cardBase, cardPadding, cardTitle, sectionLabel } from "../cardStyles";
import { iconBadgeCls } from "@/components/portal-dashboard/home/dashboardTokens";

type QuickActionsProps = {
  orgId: string;
  handoverPending?: number;
  compact?: boolean;
};

const actions = [
  {
    key: "attendance",
    label: "Attendance",
    desc: "View history",
    icon: Fingerprint,
    variant: "emerald" as const,
    path: "attendance-history",
  },
  {
    key: "regularization",
    label: "Regularization",
    desc: "Fix attendance",
    icon: RotateCcw,
    variant: "violet" as const,
    path: "regularization",
  },
  {
    key: "comp-off",
    label: "Comp off",
    desc: "Earn time off",
    icon: CalendarCheck,
    variant: "blue" as const,
    path: "comp-off",
  },
  {
    key: "leave",
    label: "Apply leave",
    desc: "Request time off",
    icon: Palmtree,
    variant: "amber" as const,
    path: "my-leaves?apply=1",
  },
  {
    key: "tasks",
    label: "Tasks",
    desc: "Manage work",
    icon: ClipboardList,
    variant: "violet" as const,
    path: "tasks-management",
  },
  {
    key: "team",
    label: "My team",
    desc: "Collaborate",
    icon: UsersRound,
    variant: "blue" as const,
    path: "my-team",
  },
  {
    key: "chat",
    label: "Chat",
    desc: "Messages",
    icon: MessageSquare,
    variant: "violet" as const,
    path: "sync-connection",
  },
  {
    key: "handover",
    label: "Assets",
    desc: "Handovers",
    icon: Package,
    variant: "amber" as const,
    path: "asset-handover",
  },
  {
    key: "meetings",
    label: "Video call",
    desc: "Start VC",
    icon: Video,
    variant: "emerald" as const,
    path: "sync-connection/calls",
  },
  {
    key: "schedule",
    label: "Schedule",
    desc: "Shift info",
    icon: CalendarClock,
    variant: "blue" as const,
    path: "attendance-history",
  },
] as const;

export default function QuickActions({
  orgId,
  handoverPending = 0,
  compact = false,
}: QuickActionsProps) {
  const base = `/user-dashboard/${encodeURIComponent(orgId)}`;

  if (compact) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {actions.map((action) => {
          const Icon = action.icon;
          const href = `${base}/${action.path}`;
          const badge =
            action.key === "handover" && handoverPending > 0 ? handoverPending : null;
          return (
            <Link
              key={action.key}
              href={href}
              className="group relative inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-[#008CD3]/25 hover:shadow-md sm:text-[13px]"
            >
              <span className={iconBadgeCls(action.variant)}>
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </span>
              {action.label}
              {badge ? (
                <span className="rounded-full bg-rose-500 px-1.5 text-[10px] text-white">
                  {badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <article className={`${cardBase} ${cardPadding}`}>
      <div>
        <p className={sectionLabel}>Quick actions</p>
        <h2 className={`${cardTitle} mt-1`}>Get things done</h2>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {actions.map((action, index) => {
          const Icon = action.icon;
          const href = `${base}/${action.path}`;
          const badge =
            action.key === "handover" && handoverPending > 0 ? handoverPending : null;

          return (
            <Link
              key={action.key}
              href={href}
              className="card-fade-in group relative flex flex-col items-start rounded-2xl border border-slate-200/90 bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#008CD3]/20 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              {badge ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {badge}
                </span>
              ) : null}
              <span className={iconBadgeCls(action.variant)}>
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <div className="mt-3">
                <p className="text-sm font-semibold text-slate-900">{action.label}</p>
                <p className="text-xs text-slate-500">{action.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </article>
  );
}
