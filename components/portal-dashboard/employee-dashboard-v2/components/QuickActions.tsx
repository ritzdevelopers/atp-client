"use client";

import Link from "next/link";
import {
  CalendarClock,
  ClipboardList,
  Fingerprint,
  MessageSquare,
  Package,
  Palmtree,
  UsersRound,
  Video,
} from "lucide-react";
import { cardBase, cardPadding, cardTitle, sectionLabel } from "../cardStyles";

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
    color: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100",
    path: "attendance-history",
  },
  {
    key: "leave",
    label: "Apply leave",
    desc: "Request time off",
    icon: Palmtree,
    color: "bg-amber-50 text-amber-600 group-hover:bg-amber-100",
    path: "my-team",
  },
  {
    key: "tasks",
    label: "Tasks",
    desc: "Manage work",
    icon: ClipboardList,
    color: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100",
    path: "tasks-management",
  },
  {
    key: "team",
    label: "My team",
    desc: "Collaborate",
    icon: UsersRound,
    color: "bg-sky-50 text-sky-600 group-hover:bg-sky-100",
    path: "my-team",
  },
  {
    key: "chat",
    label: "Chat",
    desc: "Messages",
    icon: MessageSquare,
    color: "bg-violet-50 text-violet-600 group-hover:bg-violet-100",
    path: "sync-connection",
  },
  {
    key: "handover",
    label: "Assets",
    desc: "Handovers",
    icon: Package,
    color: "bg-orange-50 text-orange-600 group-hover:bg-orange-100",
    path: "asset-handover",
  },
  {
    key: "meetings",
    label: "Video call",
    desc: "Start VC",
    icon: Video,
    color: "bg-rose-50 text-rose-600 group-hover:bg-rose-100",
    path: "sync-connection/calls",
  },
  {
    key: "schedule",
    label: "Schedule",
    desc: "Shift info",
    icon: CalendarClock,
    color: "bg-teal-50 text-teal-600 group-hover:bg-teal-100",
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
            action.key === "handover" && handoverPending > 0
              ? handoverPending
              : null;
          return (
            <Link
              key={action.key}
              href={href}
              className="relative inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-800"
            >
              <Icon className="h-4 w-4 text-indigo-600" aria-hidden />
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

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;
          const href = action.path ? `${base}/${action.path}` : "#";
          const badge =
            action.key === "handover" && handoverPending > 0
              ? handoverPending
              : null;

          const inner = (
            <>
              {badge ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {badge}
                </span>
              ) : null}
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${action.color}`}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <div className="mt-3">
                <p className="text-sm font-semibold text-slate-800">{action.label}</p>
                <p className="text-xs text-slate-500">{action.desc}</p>
              </div>
            </>
          );

          return (
            <Link
              key={action.key}
              href={href}
              className="group relative flex flex-col items-start rounded-xl border border-slate-100 bg-white p-4 transition hover:border-indigo-200 hover:shadow-md"
            >
              {inner}
            </Link>
          );
        })}
      </div>
    </article>
  );
}
