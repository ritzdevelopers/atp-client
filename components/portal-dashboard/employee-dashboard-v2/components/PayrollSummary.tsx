"use client";

import { IndianRupee, Wallet } from "lucide-react";
import { badgeBase, cardBase, cardPadding, cardTitle, sectionLabel } from "../cardStyles";

type PayrollSummaryProps = {
  roleName?: string;
  shiftName?: string;
  joinedDate?: string;
};

export default function PayrollSummary({
  roleName,
  shiftName,
  joinedDate,
}: PayrollSummaryProps) {
  const tenureMonths = joinedDate
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(joinedDate).getTime()) / (1000 * 60 * 60 * 24 * 30),
        ),
      )
    : 0;

  return (
    <article className={`${cardBase} ${cardPadding}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={sectionLabel}>Payroll</p>
          <h2 className={`${cardTitle} mt-1`}>Compensation overview</h2>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <Wallet className="h-5 w-5" aria-hidden />
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 p-4 ring-1 ring-emerald-100">
          <div className="flex items-center gap-2 text-emerald-700">
            <IndianRupee className="h-4 w-4" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Pay cycle
            </span>
          </div>
          <p className="mt-2 text-lg font-bold text-slate-900">Monthly</p>
          <p className="text-xs text-slate-500">Next payout on last working day</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Tenure
          </p>
          <p className="mt-2 text-lg font-bold text-slate-900">
            {tenureMonths < 1 ? "< 1 month" : `${tenureMonths} months`}
          </p>
          <p className="text-xs text-slate-500">Since joining</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {roleName ? (
          <span className={`${badgeBase} bg-indigo-50 text-indigo-700`}>{roleName}</span>
        ) : null}
        {shiftName ? (
          <span className={`${badgeBase} bg-sky-50 text-sky-700`}>{shiftName}</span>
        ) : null}
        <span className={`${badgeBase} bg-slate-100 text-slate-600`}>
          Tax docs available
        </span>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        Detailed payslips and tax documents are available through your HR
        administrator. Contact payroll for specific compensation questions.
      </p>
    </article>
  );
}
