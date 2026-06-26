"use client";

import Link from "next/link";
import { ChevronRight, UsersRound } from "lucide-react";
import type { EmployeeTeamAssignment } from "../types";
import { badgeBase, cardBase, cardPadding, cardTitle, sectionLabel } from "../cardStyles";

type TeamMembersProps = {
  teams: EmployeeTeamAssignment[];
  orgId: string;
};

export default function TeamMembers({ teams, orgId }: TeamMembersProps) {
  const teamHref = `/user-dashboard/${encodeURIComponent(orgId)}/my-team`;

  return (
    <article className={`${cardBase} ${cardPadding}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={sectionLabel}>Teams</p>
          <h2 className={`${cardTitle} mt-1`}>Your teams</h2>
        </div>
        <Link
          href={teamHref}
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
        >
          Manage
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      {teams.length === 0 ? (
        <div className="mt-5 flex flex-col items-center rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center">
          <UsersRound className="h-10 w-10 text-slate-300" aria-hidden />
          <p className="mt-3 text-sm font-medium text-slate-700">No team assigned</p>
          <p className="mt-1 max-w-xs text-xs text-slate-500">
            Your reporting manager or HR will add you to a team.
          </p>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {teams.map((team) => (
            <li
              key={String(team.team_id)}
              className="rounded-xl border border-slate-100 p-4 transition hover:border-indigo-100 hover:bg-slate-50/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800">
                    {team.team_name || `Team #${team.team_id}`}
                  </p>
                  {team.team_info ? (
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                      {team.team_info}
                    </p>
                  ) : null}
                </div>
                <span className={`${badgeBase} shrink-0 bg-indigo-50 text-indigo-700`}>
                  {team.total_number_of_members ?? 0} members
                </span>
              </div>
              {team.team_admin_name ? (
                <p className="mt-3 text-xs text-slate-500">
                  Lead:{" "}
                  <span className="font-medium text-slate-700">
                    {team.team_admin_name}
                  </span>
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
