"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  ChevronRight,
  Loader2,
  RefreshCw,
  UsersRound,
  X,
} from "lucide-react";
import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import {
  btnBrandCls,
  btnGhostCls,
  dashSectionMetaCls,
  dashSectionTitleCls,
  iconBadgeCls,
} from "@/components/portal-dashboard/home/dashboardTokens";
import {
  readEmployeeDashboardHomeCache,
  shouldRefreshEmployeeDashboardHomeCache,
  writeEmployeeDashboardHomeCache,
} from "@/lib/employeeDashboardHomeCache";
import {
  activeTeamAssignments,
  displayTeamTitle,
  fetchEmployeeTeamAssignments,
  isTeamReportingManager,
  teamGroupHref,
  type EmployeeTeamAssignment,
} from "@/lib/employeeTeams";

function TeamRow({
  team,
  orgId,
  currentUserName,
  onEnter,
}: {
  team: EmployeeTeamAssignment;
  orgId: string;
  currentUserName?: string | null;
  onEnter: () => void;
}) {
  const teamId = team.team_id;
  const title = displayTeamTitle(team.team_name);
  const managerName = team.team_admin_name?.trim() || "—";
  const memberCount = Number(team.total_number_of_members ?? 0);
  const isLead = isTeamReportingManager(currentUserName, managerName);
  const href = teamGroupHref(orgId, teamId);

  return (
    <li className="rounded-xl border border-slate-100 bg-white px-3 py-3 transition hover:border-[#008CD3]/20 hover:bg-[#F8FCFF] hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-slate-900">{title}</p>
          <p className="mt-0.5 text-[12px] text-slate-500">
            {managerName} · {memberCount || "—"} members
          </p>
        </div>
        {isLead ? (
          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">
            Lead
          </span>
        ) : null}
      </div>
      <Link
        href={href}
        onClick={onEnter}
        className={`mt-2.5 ${btnBrandCls(true)} !min-h-[36px] !text-[12px]`}
      >
        Enter team
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </li>
  );
}

export default function HeaderTeamsPanel() {
  const params = useParams();
  const router = useRouter();
  const orgId = String(params?.org_id ?? "");
  const orgIdNum = Number(orgId);
  const dashboardCtx = useManagementDashboardContext();
  const currentUserName = dashboardCtx?.user?.user_name ?? null;

  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<EmployeeTeamAssignment[]>([]);

  const activeTeams = useMemo(() => activeTeamAssignments(teams), [teams]);
  const teamCount = activeTeams.length;

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadTeams = useCallback(
    async (forceRefresh = false) => {
      if (!orgId || Number.isNaN(orgIdNum)) return;
      const token = localStorage.getItem("token");
      if (!token) return;

      setError(null);

      const cached = readEmployeeDashboardHomeCache(orgIdNum);
      const cachedTeams = (cached?.data?.teams ?? []) as EmployeeTeamAssignment[];
      if (cachedTeams.length > 0 && !forceRefresh) {
        setTeams(cachedTeams);
        if (!shouldRefreshEmployeeDashboardHomeCache(orgIdNum)) {
          return;
        }
      }

      setLoading(true);
      try {
        const result = await fetchEmployeeTeamAssignments(orgIdNum, token);
        const nextTeams = result.teams ?? [];
        setTeams(nextTeams);

        const existing = readEmployeeDashboardHomeCache(orgIdNum);
        writeEmployeeDashboardHomeCache(orgIdNum, {
          data: { ...(existing?.data ?? {}), teams: nextTeams },
          addresses: existing?.addresses ?? [],
          addressesError: existing?.addressesError ?? null,
          handoverPendingCount: existing?.handoverPendingCount ?? 0,
        });
      } catch (e) {
        if (!cachedTeams.length || forceRefresh) {
          setTeams([]);
        }
        setError(e instanceof Error ? e.message : "Could not load teams");
      } finally {
        setLoading(false);
      }
    },
    [orgId, orgIdNum],
  );

  useEffect(() => {
    if (!orgId || Number.isNaN(orgIdNum)) return;
    void loadTeams(false);
  }, [orgId, orgIdNum, loadTeams]);

  useEffect(() => {
    if (!open) return;
    void loadTeams(false);
  }, [open, loadTeams]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onPointer(e: MouseEvent) {
      const target = e.target as Node;
      if (
        panelRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  const panel =
    open && mounted ? (
      <div
        ref={panelRef}
        className="notifications-panel-enter fixed right-3 top-[calc(3.5rem+0.5rem)] z-[100050] flex max-h-[min(78vh,560px)] w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_24px_64px_rgba(15,23,42,0.16)] sm:right-5 sm:w-[min(26rem,calc(100vw-2rem))]"
        role="dialog"
        aria-modal="true"
        aria-label="My teams"
      >
        <div className="border-b border-slate-100 bg-gradient-to-r from-[#F8FAFC] via-white to-[#F0F9FF]/50 px-4 py-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className={iconBadgeCls("blue")}>
                <UsersRound className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <h2 className={dashSectionTitleCls}>My teams</h2>
                <p className={dashSectionMetaCls}>
                  {teamCount} active team{teamCount === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
              aria-label="Close teams panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {loading && teams.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-[#008CD3]" aria-hidden />
              Loading teams…
            </div>
          ) : error && activeTeams.length === 0 ? (
            <div className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-4 text-[13px] text-rose-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          ) : activeTeams.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center">
              <UsersRound className="mx-auto h-8 w-8 text-slate-300" aria-hidden />
              <p className="mt-2 text-[14px] font-medium text-slate-800">No team assigned</p>
              <p className={`mt-1 ${dashSectionMetaCls}`}>
                Your reporting manager or HR will add you to a team.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {activeTeams.map((team) => (
                <TeamRow
                  key={String(team.id ?? team.team_id)}
                  team={team}
                  orgId={orgId}
                  currentUserName={currentUserName}
                  onEnter={() => setOpen(false)}
                />
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/50 px-3 py-3">
          <button
            type="button"
            onClick={() => void loadTeams(true)}
            disabled={loading}
            className={`${btnGhostCls()} flex-1`}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              aria-hidden
            />
            Refresh
          </button>
          {activeTeams.length === 1 ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                router.push(teamGroupHref(orgId, activeTeams[0].team_id));
              }}
              className={`${btnBrandCls()} flex-1`}
            >
              Enter team
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>
    ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`relative inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-200 active:scale-95 ${
          open
            ? "border-[#008CD3]/30 bg-[#E8F4FB] text-[#008CD3]"
            : "border-slate-200/90 bg-white text-slate-600 hover:border-[#008CD3]/25 hover:bg-sky-50/50 hover:text-[#008CD3]"
        }`}
        aria-label={
          teamCount > 0 ? `${teamCount} assigned teams` : "Open my teams"
        }
        aria-expanded={open}
      >
        <UsersRound className="h-[18px] w-[18px]" aria-hidden />
        {teamCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#008CD3] px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
            {teamCount > 9 ? "9+" : teamCount}
          </span>
        ) : null}
      </button>
      {panel && typeof document !== "undefined"
        ? createPortal(panel, document.body)
        : null}
    </>
  );
}
