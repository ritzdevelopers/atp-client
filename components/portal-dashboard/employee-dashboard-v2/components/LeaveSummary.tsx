"use client";

import { Palmtree } from "lucide-react";
import type { LeaveBalanceDisplayRow } from "@/lib/leaveBalanceDisplay";
import { cardBase, cardPadding, cardTitle, sectionLabel } from "../cardStyles";

type LeaveSummaryProps = {
  balances: LeaveBalanceDisplayRow[];
  summary?: {
    total_leaves: number;
    used_leaves: number;
    remaining_leaves: number;
  };
};

const palette = [
  "from-indigo-500 to-violet-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-sky-500 to-cyan-500",
  "from-rose-500 to-pink-500",
];

export default function LeaveSummary({ balances, summary }: LeaveSummaryProps) {
  const total = summary?.total_leaves ?? 0;
  const used = summary?.used_leaves ?? 0;
  const remaining = summary?.remaining_leaves ?? 0;
  const usedPct = total > 0 ? Math.round((used / total) * 100) : 0;

  return (
    <article className={`${cardBase} ${cardPadding}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={sectionLabel}>Leave balance</p>
          <h2 className={`${cardTitle} mt-1`}>Your entitlements</h2>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <Palmtree className="h-5 w-5" aria-hidden />
        </div>
      </div>

      <div className="mt-5 rounded-xl bg-gradient-to-r from-slate-50 to-indigo-50/50 p-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-3xl font-bold text-slate-900">{remaining}</p>
            <p className="text-sm text-slate-500">days remaining</p>
          </div>
          <div className="text-right text-sm text-slate-600">
            <p>
              <span className="font-semibold text-slate-800">{used}</span> used
            </p>
            <p>
              of <span className="font-semibold text-slate-800">{total}</span> total
            </p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
            style={{ width: `${usedPct}%` }}
            role="progressbar"
            aria-valuenow={usedPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Leave utilization"
          />
        </div>
      </div>

      <ul className="mt-5 space-y-3">
        {balances.length === 0 ? (
          <li className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
            No leave types assigned yet.
          </li>
        ) : (
          balances.map((row, index) => {
            const pct =
              row.total_leaves > 0
                ? Math.round((row.used_leaves / row.total_leaves) * 100)
                : 0;
            const gradient = palette[index % palette.length];
            return (
              <li
                key={String(row.leave_type_id)}
                className="rounded-xl border border-slate-100 p-3 transition hover:border-indigo-100 hover:bg-slate-50/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">
                    {row.leave_type_name}
                  </p>
                  <p className="text-sm tabular-nums text-slate-600">
                    <span className="font-bold text-slate-900">
                      {row.remaining_leaves}
                    </span>
                    <span className="text-slate-400"> / {row.total_leaves}</span>
                  </p>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${gradient}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })
        )}
      </ul>
    </article>
  );
}
