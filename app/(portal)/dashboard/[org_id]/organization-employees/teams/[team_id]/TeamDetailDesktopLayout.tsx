"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  BarChart3,
  ClipboardList,
  Crown,
  Eye,
  RefreshCw,
  Search,
  Settings2,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import type { OrgTeamDetail, OrgTeamMemberRow } from "@/services/orgTeams";
import type { EmployeeExitProcessRow } from "@/services/employeeExit";
import TeamMemberAttendancePanel from "../../team-group/TeamMemberAttendancePanel";

type AttendanceMember = { user_id: number; user_name: string };

type TeamDetailDesktopLayoutProps = {
  orgId: string;
  teamId: string;
  title: string;
  detail: OrgTeamDetail;
  loading: boolean;
  banner: { type: "ok" | "err"; text: string } | null;
  memberTableSearch: string;
  onMemberSearchChange: (value: string) => void;
  filteredMembers: OrgTeamMemberRow[];
  exitProcesses: EmployeeExitProcessRow[];
  exitListError: string | null;
  exitTotalRecords: number | null;
  exitListLimit: number;
  attendancePanelMember: AttendanceMember | null;
  onOpenAttendance: (member: AttendanceMember) => void;
  onCloseAttendance: () => void;
  onBack: () => void;
  onRefresh: () => void;
  onAddMembers: () => void;
  onChangeAdmin: () => void;
  onUpdateInfo: () => void;
  onRemoveMembers: () => void;
  fmtLong: (iso: string | null | undefined) => string;
  memberInitials: (name: string | null | undefined) => string;
  memberHasExitProcess: (m: OrgTeamMemberRow) => boolean;
  MemberExitStatusBadge: (props: { status: string }) => ReactNode;
  exitStatusPillClass: (status: string) => string;
  zohoCardCls: () => string;
  zohoDesktopPrimaryBtnCls: () => string;
  zohoDesktopSecondaryBtnCls: () => string;
  zohoDesktopDangerBtnCls: () => string;
  searchFieldCls: () => string;
  mobileLabelCls: string;
  mobileCaptionCls: string;
};

export default function TeamDetailDesktopLayout({
  orgId,
  teamId,
  title,
  detail,
  loading,
  banner,
  memberTableSearch,
  onMemberSearchChange,
  filteredMembers,
  exitProcesses,
  exitListError,
  exitTotalRecords,
  exitListLimit,
  attendancePanelMember,
  onOpenAttendance,
  onCloseAttendance,
  onBack,
  onRefresh,
  onAddMembers,
  onChangeAdmin,
  onUpdateInfo,
  onRemoveMembers,
  fmtLong,
  memberInitials,
  memberHasExitProcess,
  MemberExitStatusBadge,
  exitStatusPillClass,
  zohoCardCls,
  zohoDesktopPrimaryBtnCls,
  zohoDesktopSecondaryBtnCls,
  zohoDesktopDangerBtnCls,
  searchFieldCls,
  mobileLabelCls,
  mobileCaptionCls,
}: TeamDetailDesktopLayoutProps) {
  return (
    <div className="hidden lg:block lg:h-[calc(100vh-4rem)] lg:overflow-hidden">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes teamDetailPanelIn {
              from { opacity: 0; transform: translateY(8px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .team-detail-panel-in {
              animation: teamDetailPanelIn 0.24s cubic-bezier(0.22, 1, 0.36, 1) both;
            }
            @media (prefers-reduced-motion: reduce) {
              .team-detail-panel-in { animation: none; }
            }
          `,
        }}
      />
      <div className="mx-auto flex h-full w-full max-w-none flex-col gap-3 px-5 py-3 xl:px-10 xl:py-4">
        {banner ? (
          <div
            className={`flex shrink-0 items-start gap-3 rounded-xl border px-4 py-2.5 text-sm ${
              banner.type === "ok"
                ? "border-[#0F9D58]/30 bg-[#E6F4EA] text-[#0B8043]"
                : "border-[#F5C6C2] bg-[#FCE8E6] text-[#D93025]"
            }`}
          >
            <p className="min-w-0 font-medium leading-snug">{banner.text}</p>
          </div>
        ) : null}

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(520px,42%)] gap-6">
          <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-0.5">
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <span className="h-7 w-1 shrink-0 rounded-full bg-[#008CD3]" aria-hidden />
              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] font-semibold tracking-tight text-[#1F2937]">
                  Team management
                </h2>
                <p className="text-[11px] text-[#6B7280]">
                  {title} · {detail.total_number_of_members} members · Admin:{" "}
                  {detail.admin_name ?? "—"}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button type="button" onClick={onBack} className={zohoDesktopSecondaryBtnCls()}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button type="button" onClick={onRefresh} className={zohoDesktopSecondaryBtnCls()}>
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
                <button type="button" onClick={onAddMembers} className={zohoDesktopPrimaryBtnCls()}>
                  <UserPlus className="h-4 w-4" />
                  Add
                </button>
                <button type="button" onClick={onChangeAdmin} className={zohoDesktopSecondaryBtnCls()}>
                  <Crown className="h-4 w-4" />
                  Admin
                </button>
                <button type="button" onClick={onUpdateInfo} className={zohoDesktopSecondaryBtnCls()}>
                  <Settings2 className="h-4 w-4" />
                  Info
                </button>
                <button type="button" onClick={onRemoveMembers} className={zohoDesktopDangerBtnCls()}>
                  <UserMinus className="h-4 w-4" />
                  Remove
                </button>
              </div>
            </div>

            <div className={`${zohoCardCls()} shrink-0`}>
              <div className="flex flex-wrap items-center gap-4 px-5 py-3.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#008CD3] text-white shadow-sm">
                  <Users className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <h1 className="text-[22px] font-semibold tracking-tight text-[#1F2937]">{title}</h1>
                  <p className="mt-0.5 line-clamp-2 text-[13px] text-[#6B7280]">
                    {detail.team_info?.trim() ||
                      "Manage roster, attendance history, and exit records in one view."}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-y divide-[#E4E7EC] border-t border-[#E4E7EC] xl:grid-cols-4 xl:divide-y-0">
                <div className="px-4 py-2.5">
                  <p className={mobileLabelCls}>Members</p>
                  <p className="mt-0.5 text-[18px] font-bold tabular-nums text-[#008CD3]">
                    {detail.total_number_of_members}
                  </p>
                </div>
                <div className="px-4 py-2.5">
                  <p className={mobileLabelCls}>Admin</p>
                  <p className="mt-0.5 truncate text-[13px] font-semibold text-[#1F2937]">
                    {detail.admin_name ?? "—"}
                  </p>
                </div>
                <div className="px-4 py-2.5">
                  <p className={mobileLabelCls}>Created</p>
                  <p className="mt-0.5 text-[13px] font-semibold text-[#1F2937]">
                    {fmtLong(detail.created_at)}
                  </p>
                </div>
                <div className="px-4 py-2.5">
                  <p className={mobileLabelCls}>Updated</p>
                  <p className="mt-0.5 text-[13px] font-semibold text-[#1F2937]">
                    {fmtLong(detail.updated_at)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="h-7 w-1 shrink-0 rounded-full bg-[#008CD3]" aria-hidden />
                <div>
                  <h2 className="text-[15px] font-semibold text-[#1F2937]">Team roster</h2>
                  <p className="text-[11px] text-[#6B7280]">
                    {attendancePanelMember
                      ? `Viewing ${attendancePanelMember.user_name}'s attendance on the right`
                      : "Click View attendance to open history on the right panel"}
                  </p>
                </div>
              </div>
              <div className="relative w-full max-w-xs sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="search"
                  placeholder="Search members…"
                  value={memberTableSearch}
                  onChange={(e) => onMemberSearchChange(e.target.value)}
                  className={searchFieldCls()}
                />
              </div>
            </div>

            <div className={`${zohoCardCls()} flex min-h-[240px] shrink-0 flex-col`}>
              <div className="flex shrink-0 items-center gap-2 border-b border-[#E4E7EC] bg-[#F9FAFB] px-4 py-2.5">
                <Users className="h-4 w-4 shrink-0 text-[#008CD3]" aria-hidden />
                <h3 className="text-[13px] font-semibold text-[#1F2937]">
                  All members ({filteredMembers.length})
                </h3>
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#E4E7EC] bg-[#F9FAFB] text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                      <th className="px-4 py-2">Member</th>
                      <th className="px-4 py-2">Contact</th>
                      <th className="px-4 py-2">Joined</th>
                      <th className="px-4 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF2F6]">
                    {filteredMembers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-12 text-center text-[#6B7280]">
                          No members match your search.
                        </td>
                      </tr>
                    ) : (
                      filteredMembers.map((m) => {
                        const isAdmin = Number(m.user_id) === Number(detail.admin_id);
                        const selected =
                          attendancePanelMember?.user_id === Number(m.user_id);
                        return (
                          <tr
                            key={m.team_member_id}
                            className={`transition ${selected ? "bg-[#E8F4FB]/60" : "hover:bg-[#F9FAFB]"}`}
                          >
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                                    isAdmin
                                      ? "bg-[#FFF8E1] text-[#8D6E00]"
                                      : "bg-[#E8F4FB] text-[#008CD3]"
                                  }`}
                                >
                                  {memberInitials(m.user_name)}
                                </span>
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-[#1F2937]">
                                    {m.user_name}
                                  </p>
                                  {isAdmin ? (
                                    <span className="text-[10px] font-semibold text-[#0F9D58]">
                                      Team admin
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </td>
                            <td className="min-w-0 px-4 py-2 text-xs text-[#6B7280]">
                              <div className="truncate">{m.user_email}</div>
                              {m.user_phone ? (
                                <div className="truncate text-[#9CA3AF]">{m.user_phone}</div>
                              ) : null}
                            </td>
                            <td className="whitespace-nowrap px-4 py-2 text-[#374151]">
                              {fmtLong(m.joined_date)}
                            </td>
                            <td className="px-4 py-2 text-right">
                              <div className="flex flex-col items-end gap-1.5">
                                {memberHasExitProcess(m) ? (
                                  <MemberExitStatusBadge
                                    status={String(m.exit_process_application_status)}
                                  />
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() =>
                                    onOpenAttendance({
                                      user_id: Number(m.user_id),
                                      user_name: m.user_name,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 rounded-lg border border-[#B8DDF0] bg-[#E8F4FB] px-2.5 py-1.5 text-[11px] font-semibold text-[#0070AA] transition hover:bg-[#008CD3] hover:text-white"
                                >
                                  <BarChart3 className="h-3.5 w-3.5" />
                                  View attendance
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={`${zohoCardCls()} flex min-h-0 max-h-[280px] shrink-0 flex-col`}>
              <div className="flex shrink-0 items-center gap-2 border-b border-[#E4E7EC] bg-[#F9FAFB] px-4 py-2.5">
                <ClipboardList className="h-4 w-4 shrink-0 text-[#008CD3]" aria-hidden />
                <div className="min-w-0 flex-1">
                  <h3 className="text-[13px] font-semibold text-[#1F2937]">Exit & offboarding</h3>
                  <p className={mobileCaptionCls}>
                    {exitTotalRecords ?? exitProcesses.length} record
                    {(exitTotalRecords ?? exitProcesses.length) !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-auto p-3">
                {exitListError ? (
                  <p className="rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2 text-[12px] text-[#D93025]">
                    {exitListError}
                  </p>
                ) : exitProcesses.length === 0 ? (
                  <p className="py-8 text-center text-[12px] text-[#6B7280]">
                    No exit processes for this team yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {exitProcesses.slice(0, 8).map((row) => (
                      <li
                        key={row.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-[#E4E7EC] bg-[#FAFBFC] px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-semibold text-[#1F2937]">
                            {row.employee_name ?? `Employee #${row.employee_id}`}
                          </p>
                          <p className="text-[10px] capitalize text-[#6B7280]">{row.action_type}</p>
                        </div>
                        <Link
                          href={`/dashboard/${orgId}/organization-employees/teams/0/exit/0?team_id=${encodeURIComponent(teamId)}&exit_process_id=${encodeURIComponent(String(row.id))}`}
                          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#B8DDF0] bg-white px-2 py-1 text-[10px] font-semibold text-[#0070AA] hover:bg-[#E8F4FB]"
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="flex min-h-0 min-w-0 flex-col">
            {attendancePanelMember ? (
              <TeamMemberAttendancePanel
                orgId={orgId}
                teamId={detail.team_id}
                employeeId={attendancePanelMember.user_id}
                employeeName={attendancePanelMember.user_name}
                onClose={onCloseAttendance}
                accessMode="org_admin"
              />
            ) : (
              <div
                className={`${zohoCardCls()} team-detail-panel-in flex min-h-0 flex-1 flex-col items-center justify-center p-8 text-center`}
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8F4FB] text-[#008CD3]">
                  <BarChart3 className="h-7 w-7" aria-hidden />
                </span>
                <h3 className="mt-4 text-[16px] font-semibold text-[#1F2937]">Attendance history</h3>
                <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-[#6B7280]">
                  Select a team member and click{" "}
                  <span className="font-semibold text-[#0070AA]">View attendance</span> to see
                  monthly KPIs, charts, and check-in logs here without scrolling the whole page.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2 text-[11px] text-[#9CA3AF]">
                  <span className="rounded-full bg-[#F5F7FA] px-2.5 py-1">Day / month filters</span>
                  <span className="rounded-full bg-[#F5F7FA] px-2.5 py-1">Status charts</span>
                  <span className="rounded-full bg-[#F5F7FA] px-2.5 py-1">Activity log</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
