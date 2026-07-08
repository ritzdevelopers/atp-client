"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  ChevronRight,
  LayoutDashboard,
  MapPin,
  Plus,
  Sparkles,
  UsersRound,
} from "lucide-react";
import {
  countPendingHandoverItems,
  fetchHandoverAssignedToMe,
} from "@/services/handoverAssigned";
import type { OrganizationAddress } from "@/services/organization";
import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import type {
  RightMainSideOrganization,
  RightMainSideUser,
} from "@/components/portal-dashboard/Layout/RightMainSide";
import {
  formatAttendanceLogLocal,
  formatAttendanceTimeLocal,
  formatWorkingTimeDisplay,
  getAttendanceDayVisual,
  getTodayLocalYmd,
  localYmdFromAttendanceValue,
  parseAttendanceNaiveLocal,
} from "@/lib/attendanceDates";
import {
  clearEmployeeDashboardHomeCache,
  patchEmployeeDashboardHomeCache,
  readEmployeeDashboardHomeCache,
  shouldRefreshEmployeeDashboardHomeCache,
  writeEmployeeDashboardHomeCache,
} from "@/lib/employeeDashboardHomeCache";
import OrgLiveUsersPanel from "@/components/portal-dashboard/home/OrgLiveUsersPanel";
import BiometricLiveAttendanceFeed from "@/components/portal-dashboard/home/BiometricLiveAttendanceFeed";
import HomeDashboardHeader from "@/components/portal-dashboard/home/HomeDashboardHeader";
import HomeDashboardTab from "@/components/portal-dashboard/home/HomeDashboardTab";
import HomeTodayAttendanceMonitor from "@/components/portal-dashboard/home/HomeTodayAttendanceMonitor";
import HomeFeaturesSlider from "@/components/portal-dashboard/home/HomeFeaturesSlider";
import HomeAllToolsPanel from "@/components/portal-dashboard/home/HomeAllToolsPanel";
import HomeAttendanceCard from "@/components/portal-dashboard/home/HomeAttendanceCard";
import AssetHandoverCard from "@/components/portal-dashboard/home/AssetHandoverCard";
import HomeLeaveQuickActions from "@/components/portal-dashboard/home/HomeLeaveQuickActions";
import {
  btnBrandCls,
  btnGhostCls,
  dashCardCls,
  dashLabelCls,
  dashPageCls,
  dashSectionBodyCls,
  dashSectionHeadCls,
  dashSectionMetaCls,
  dashSectionTitleCls,
  homePageTabCls,
  iconBadgeCls,
  mobileCaptionCls,
} from "@/components/portal-dashboard/home/dashboardTokens";
import {
  AddressesSkeleton,
  MyTeamsSkeleton,
  ProfileSummarySkeleton,
  HomePageLoadingSkeleton,
} from "@/components/portal-dashboard/home/skeletons/HomeDashboardSkeletons";
import { useDeviceLiveAttendance } from "@/hooks/useDeviceLiveAttendance";
import {
  buildManagementDashboardNavTiles,
  filterManagementNavTiles,
  type ManagementNavTile,
} from "@/lib/managementDashboardNav";
import {
  fetchOrganizationFeatureGroups,
  readOrganizationFeatureSnapshot,
} from "@/lib/orgFeatureAccess";
import { fetchMyEmployeeLeaves } from "@/services/employeeLeaveManagement";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type AttendanceHistoryRow = {
  id?: number | string;
  attendance_date?: string;
  check_in?: string | null;
  check_out?: string | null;
  attendance_status?: string | null;
  working_time?: string | number | null;
};

type EmployeeTeamAssignment = {
  id?: number | string;
  user_id?: number | string;
  team_id: number | string;
  org_id?: number | string;
  joined_date?: string | null;
  leave_date?: string | null;
  team_name?: string | null;
  team_info?: string | null;
  total_number_of_members?: number | null;
  team_admin_name?: string | null;
};

type EmployeeDashboardResponse = {
  attendance_history?: AttendanceHistoryRow[];
  employee?: {
    mark_attendance_late_after?: string | null;
    user_name?: string | null;
  };
  employees?: {
    mark_attendance_late_after?: string | null;
  };
  teams?: EmployeeTeamAssignment[];
};

function formatElapsedDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

function formatJoinedDate(value: string | Date | null | undefined): string {
  if (value == null || value === "") return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function displayTeamTitle(raw: string | null | undefined): string {
  if (!raw?.trim()) return "Team";
  return raw
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function teamGroupHref(orgId: number, teamId: number | string): string {
  return `/dashboard/${orgId}/organization-employees/team-group?team_id=${encodeURIComponent(String(teamId))}`;
}

function activeTeamAssignments(
  teams: EmployeeTeamAssignment[] | undefined,
): EmployeeTeamAssignment[] {
  return (teams ?? []).filter(
    (team) => team.leave_date == null || team.leave_date === "",
  );
}

type HomePageTab = "welcome" | "dashboard";

function homeTabStorageKey(orgId: number) {
  return `portal-home-tab-${orgId}`;
}

function HomePageTabBar({
  activeTab,
  onTabChange,
  leavePendingCount,
}: {
  activeTab: HomePageTab;
  onTabChange: (tab: HomePageTab) => void;
  leavePendingCount: number;
}) {
  return (
    <nav
      className="card-fade-in sticky top-[3.25rem] z-20 overflow-hidden rounded-2xl border border-[#E4E7EC] bg-white/95 shadow-[0_4px_20px_rgba(15,23,42,0.06)] backdrop-blur-md"
      aria-label="Home sections"
    >
      <div className="flex border-b border-[#EEF2F6]" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "welcome"}
          onClick={() => onTabChange("welcome")}
          className={homePageTabCls(activeTab === "welcome")}
        >
          <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
          Welcome
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "dashboard"}
          onClick={() => onTabChange("dashboard")}
          className={homePageTabCls(activeTab === "dashboard")}
        >
          <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden />
          Dashboard
          {leavePendingCount > 0 ? (
            <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#FFF4E5] px-1.5 text-[10px] font-bold text-[#E8710A]">
              {leavePendingCount > 99 ? "99+" : leavePendingCount}
            </span>
          ) : null}
        </button>
      </div>
    </nav>
  );
}

function greetingForHour(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function displayNameFromEmail(email: string | null | undefined): string {
  if (!email?.trim()) return "there";
  const local = email.split("@")[0] ?? "";
  const cleaned = local.replace(/[._-]+/g, " ").trim();
  if (!cleaned) return "there";
  return cleaned
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function formatOrganizationAddress(addr: OrganizationAddress): string {
  const parts = [
    addr.address_line?.trim(),
    [addr.city, addr.district, addr.state].filter(Boolean).join(", "),
    [addr.country, addr.zip_code?.trim()].filter(Boolean).join(" "),
  ].filter((p): p is string => !!p && p.length > 0);
  return parts.join("\n");
}

function addressLocationLabel(
  addr: OrganizationAddress,
  index: number,
): string {
  const cityState = [addr.city, addr.state].filter(Boolean).join(", ");
  return cityState.trim() || `Location ${index + 1}`;
}

function formatRoleLabel(role: string | null | undefined): string {
  const r = (role ?? "").trim().toLowerCase();
  if (r === "admin") return "Admin";
  if (r === "hr") return "HR";
  if (r === "manager" || r === "manger") return "Manager";
  if (!r) return "Member";
  return r.charAt(0).toUpperCase() + r.slice(1).toLowerCase();
}

function MyTeamsSection({
  teams,
  orgId,
  currentUserName,
  delayMs,
  loading = false,
}: {
  teams: EmployeeTeamAssignment[];
  orgId: number;
  currentUserName: string;
  delayMs: number;
  loading?: boolean;
}) {
  const activeTeams = activeTeamAssignments(teams);

  if (loading) {
    return <MyTeamsSkeleton />;
  }

  return (
    <section className={dashCardCls} style={{ animationDelay: `${delayMs}ms` }}>
      <div className={dashSectionHeadCls}>
        <span className={iconBadgeCls("blue")}>
          <UsersRound className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className={dashSectionTitleCls}>My teams</h2>
          <p className={dashSectionMetaCls}>
            {activeTeams.length} active team{activeTeams.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className={dashSectionBodyCls}>
        {activeTeams.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">
            <UsersRound className="mx-auto h-8 w-8 text-slate-300" aria-hidden />
            <p className="mt-2 text-[14px] font-medium text-slate-800">No team assigned</p>
            <p className={`mt-1 ${mobileCaptionCls}`}>
              Your reporting manager or HR will add you to a team.
            </p>
          </div>
        ) : (
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {activeTeams.map((team) => {
              const teamId = team.team_id;
              const title = displayTeamTitle(team.team_name);
              const managerName = team.team_admin_name?.trim() || "—";
              const isReportingManager =
                !!currentUserName &&
                !!managerName &&
                currentUserName.trim().toLowerCase() ===
                  managerName.toLowerCase();
              const memberCount = Number(team.total_number_of_members ?? 0);

              return (
                <li
                  key={String(team.id ?? teamId)}
                  className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 transition-colors hover:border-slate-300 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-[14px] font-semibold text-slate-900">
                        {title}
                      </h3>
                      <p className="mt-1 text-[12px] text-slate-500">
                        {managerName} · {memberCount || "—"} members
                      </p>
                    </div>
                    {isReportingManager ? (
                      <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">
                        Lead
                      </span>
                    ) : null}
                  </div>
                  <Link
                    href={teamGroupHref(orgId, teamId)}
                    className={`mt-3 ${btnGhostCls(true)} !min-h-[36px] !text-[12px]`}
                  >
                    Open team
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  const display =
    value != null && String(value).length > 0 ? String(value) : "—";

  return (
    <div className="min-w-0 border-b border-slate-100/80 py-2.5 last:border-0">
      <dt className="text-[11px] font-medium text-slate-500">{label}</dt>
      <dd className="mt-0.5 break-words text-[13px] font-medium leading-snug text-slate-900 [overflow-wrap:anywhere]">
        {display}
      </dd>
    </div>
  );
}

function ProfileInfoBlock({
  title,
  children,
  variant = "default",
}: {
  title: string;
  children: ReactNode;
  variant?: "default" | "owner";
}) {
  const boxCls =
    variant === "owner"
      ? "rounded-xl border border-amber-100 bg-amber-50/30 p-4"
      : "rounded-xl border border-slate-100 bg-slate-50/40 p-4";
  const titleCls =
    variant === "owner"
      ? "mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-600/80"
      : "mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400";

  return (
    <div className={`min-w-0 ${boxCls}`}>
      <p className={titleCls}>{title}</p>
      <dl className="min-w-0">{children}</dl>
    </div>
  );
}

function ProfileSummaryCard({
  organization,
  user,
  ownerName,
  ownerEmail,
  ownerPhone,
  ownerMatchesUser,
  delayMs,
  loading = false,
}: {
  organization: RightMainSideOrganization;
  user: RightMainSideUser;
  ownerName: string | null | undefined;
  ownerEmail: string | null | undefined;
  ownerPhone: string | null | undefined;
  ownerMatchesUser: boolean;
  delayMs: number;
  loading?: boolean;
}) {
  if (loading) {
    return <ProfileSummarySkeleton />;
  }

  return (
    <section className={`${dashCardCls} min-w-0`} style={{ animationDelay: `${delayMs}ms` }}>
      <div className={`${dashSectionHeadCls} min-w-0`}>
        <span className={iconBadgeCls("slate")}>
          <Building2 className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className={dashSectionTitleCls}>Company & profile</h2>
          <p className={`${dashSectionMetaCls} break-words`}>
            Organization and account details
          </p>
        </div>
      </div>
      <div className={`${dashSectionBodyCls} flex min-w-0 flex-col gap-4`}>
        <ProfileInfoBlock title="Organization">
          <InfoRow label="Name" value={organization.org_name} />
          <InfoRow label="Email" value={organization.org_email} />
          <InfoRow label="Phone" value={organization.org_phone} />
        </ProfileInfoBlock>

        <ProfileInfoBlock title={ownerMatchesUser ? "Your account" : "You"}>
          <InfoRow label="Name" value={user.user_name} />
          <InfoRow label="Email" value={user.user_email} />
          <InfoRow label="Role" value={formatRoleLabel(user.user_role_name)} />
          <InfoRow label="Since" value={formatJoinedDate(user.user_created_at)} />
        </ProfileInfoBlock>

        {!ownerMatchesUser ? (
          <ProfileInfoBlock title="Owner" variant="owner">
            <InfoRow label="Name" value={ownerName} />
            <InfoRow label="Email" value={ownerEmail} />
            <InfoRow label="Phone" value={ownerPhone} />
          </ProfileInfoBlock>
        ) : null}
      </div>
    </section>
  );
}

function OrganizationAddressesSection({
  addresses,
  orgId,
  delayMs,
  loading = false,
}: {
  addresses: OrganizationAddress[];
  orgId: number;
  delayMs: number;
  loading?: boolean;
}) {
  const manageHref = `/dashboard/${orgId}/organization-settings/manage-organization-information`;
  const hasAddresses = addresses.length > 0;

  if (loading) {
    return <AddressesSkeleton />;
  }

  return (
    <section
      id="dash-addresses"
      aria-labelledby="dash-addresses-title"
      className={dashCardCls}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className={`${dashSectionHeadCls} justify-between`}>
        <div className="flex items-center gap-3">
          <span className={iconBadgeCls("violet")}>
            <MapPin className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2 id="dash-addresses-title" className={dashSectionTitleCls}>
              Locations
            </h2>
            <p className={dashSectionMetaCls}>
              {hasAddresses ? `${addresses.length} address${addresses.length === 1 ? "" : "es"}` : "No addresses yet"}
            </p>
          </div>
        </div>
        {hasAddresses ? (
          <Link
            href={manageHref}
            className="shrink-0 text-[13px] font-medium text-sky-600 hover:text-sky-700"
          >
            Manage
          </Link>
        ) : null}
      </div>

      <div className={dashSectionBodyCls}>
        {!hasAddresses ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-10 text-center">
            <MapPin className="mx-auto h-8 w-8 text-slate-300" aria-hidden />
            <p className="mt-2 text-[14px] font-medium text-slate-800">No address added yet</p>
            <p className={`mt-1 ${mobileCaptionCls}`}>
              Add office or branch locations for this organization.
            </p>
            <Link href={manageHref} className={`mt-4 ${btnBrandCls()}`}>
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Add address
            </Link>
          </div>
        ) : (
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {addresses.map((addr, index) => (
              <li
                key={String(addr.id ?? index)}
                className="rounded-xl border border-slate-200 bg-slate-50/40 p-4"
              >
                <p className={dashLabelCls}>{addressLocationLabel(addr, index)}</p>
                <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-slate-700">
                  {formatOrganizationAddress(addr)}
                </p>
              </li>
            ))}
          </ul>
        )}
        {hasAddresses ? (
          <Link
            href={manageHref}
            className={`mt-3 ${btnGhostCls(true)} !border-dashed`}
          >
            <Plus className="h-4 w-4 text-slate-500" aria-hidden />
            Add another address
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function HomeOverview({
  organization,
  user,
  orgId,
  organizationAddresses,
}: {
  organization: RightMainSideOrganization;
  user: RightMainSideUser;
  orgId: number;
  organizationAddresses: OrganizationAddress[];
}) {
  const roleKey = user.user_role_name?.trim().toLowerCase() ?? "";
  const roleBadgeLabel = formatRoleLabel(user.user_role_name);
  const displayName =
    user.user_name?.trim() || displayNameFromEmail(user.user_email);
  const orgTitle = organization.org_name?.trim() || "Your organization";
  const ownerName = organization.owner_name ?? organization.owner_info?.name;
  const ownerEmail = organization.owner_email ?? organization.owner_info?.email;
  const ownerPhone = organization.owner_phone;

  const normalized = (v: string | number | null | undefined) =>
    String(v ?? "")
      .trim()
      .toLowerCase();
  const ownerMatchesUser =
    (organization.owner_id != null &&
      String(organization.owner_id) === String(user.user_id)) ||
    (!!normalized(ownerEmail) &&
      normalized(ownerEmail) === normalized(user.user_email)) ||
    (!!normalized(ownerPhone) &&
      normalized(ownerPhone) === normalized(user.user_phone)) ||
    (!!normalized(ownerName) &&
      normalized(ownerName) === normalized(user.user_name));
  const showAttendance = roleKey !== "admin";
  const cachedHome =
    orgId && !Number.isNaN(orgId) ? readEmployeeDashboardHomeCache(orgId) : null;

  const [attendanceLoading, setAttendanceLoading] = useState(() => {
    if (!showAttendance) return false;
    return !cachedHome;
  });
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [attendanceActionError, setAttendanceActionError] = useState<
    string | null
  >(null);
  const [attendanceData, setAttendanceData] =
    useState<EmployeeDashboardResponse | null>(
      () => (cachedHome?.data as EmployeeDashboardResponse | undefined) ?? null,
    );
  const [checkInSubmitting, setCheckInSubmitting] = useState(false);
  const [checkOutSubmitting, setCheckOutSubmitting] = useState(false);
  const [logSubmitting, setLogSubmitting] = useState(false);
  const [logSuccessMessage, setLogSuccessMessage] = useState<string | null>(
    null,
  );
  const [tick, setTick] = useState(0);
  const [handoverPendingCount, setHandoverPendingCount] = useState(
    () => cachedHome?.handoverPendingCount ?? 0,
  );
  const [navTiles, setNavTiles] = useState<ManagementNavTile[]>([]);
  const [navTilesLoading, setNavTilesLoading] = useState(true);
  const [leavePendingCount, setLeavePendingCount] = useState(0);
  const [activeHomeTab, setActiveHomeTab] = useState<HomePageTab>("welcome");
  const pathname = usePathname();

  const handoverHref =
    orgId && !Number.isNaN(orgId)
      ? `/dashboard/${encodeURIComponent(String(orgId))}/asset-handover`
      : "#";

  const loadHomeOverviewData = useCallback(
    async (forceRefresh = false) => {
      if (!orgId || Number.isNaN(orgId)) return;
      const token = localStorage.getItem("token");
      if (!token) return;

      const cached = readEmployeeDashboardHomeCache(orgId);
      if (cached && !forceRefresh) {
        if (showAttendance) {
          setAttendanceData(cached.data as EmployeeDashboardResponse);
        }
        setHandoverPendingCount(cached.handoverPendingCount ?? 0);
        setAttendanceError(null);
        setAttendanceLoading(false);
        if (!shouldRefreshEmployeeDashboardHomeCache(orgId)) {
          return;
        }
      } else if (forceRefresh) {
        clearEmployeeDashboardHomeCache(orgId);
      }

      if (showAttendance && (!cached || forceRefresh)) {
        setAttendanceLoading(true);
      }
      setAttendanceError(null);

      try {
        const q = encodeURIComponent(String(orgId));
        const [dashboardRes, handoverResult] = await Promise.all([
          showAttendance
            ? fetch(
                `${API_URL}/api/employees/get-employees-full-information?org_id=${q}`,
                {
                  method: "GET",
                  headers: { Authorization: `Bearer ${token}` },
                },
              )
            : Promise.resolve(null),
          fetchHandoverAssignedToMe(token, orgId).catch(() => null),
        ]);

        let nextData = cached?.data as EmployeeDashboardResponse | undefined;
        if (dashboardRes) {
          const result = (await dashboardRes.json()) as EmployeeDashboardResponse & {
            message?: string;
          };
          if (!dashboardRes.ok) {
            throw new Error(result.message || "Could not load attendance");
          }
          nextData = result;
          setAttendanceData(result);
        }

        const nextHandoverCount = handoverResult
          ? countPendingHandoverItems(handoverResult)
          : 0;
        setHandoverPendingCount(nextHandoverCount);

        if (nextData || handoverResult) {
          writeEmployeeDashboardHomeCache(orgId, {
            data: nextData ?? cached?.data ?? {},
            addresses: cached?.addresses ?? [],
            addressesError: cached?.addressesError ?? null,
            handoverPendingCount: nextHandoverCount,
          });
        }
      } catch (e) {
        if (!cached || forceRefresh) {
          if (showAttendance) {
            setAttendanceData(null);
          }
          setHandoverPendingCount(0);
        }
        setAttendanceError(
          e instanceof Error ? e.message : "Could not load attendance",
        );
      } finally {
        setAttendanceLoading(false);
      }
    },
    [orgId, showAttendance],
  );

  useEffect(() => {
    void loadHomeOverviewData();
  }, [loadHomeOverviewData]);

  useEffect(() => {
    if (!orgId || Number.isNaN(orgId)) return;
    try {
      const stored = sessionStorage.getItem(homeTabStorageKey(orgId));
      if (stored === "welcome" || stored === "dashboard") {
        setActiveHomeTab(stored);
      }
    } catch {
      /* ignore */
    }
  }, [orgId]);

  const handleHomeTabChange = useCallback(
    (tab: HomePageTab) => {
      setActiveHomeTab(tab);
      if (!orgId || Number.isNaN(orgId)) return;
      try {
        sessionStorage.setItem(homeTabStorageKey(orgId), tab);
      } catch {
        /* ignore */
      }
    },
    [orgId],
  );

  useEffect(() => {
    if (!orgId || Number.isNaN(orgId)) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    const authToken = token;
    let cancelled = false;

    async function loadLeavePending() {
      try {
        const rows = await fetchMyEmployeeLeaves(authToken, orgId);
        if (!cancelled) {
          setLeavePendingCount(
            rows.filter((row) => row.leave_status === "pending").length,
          );
        }
      } catch {
        if (!cancelled) setLeavePendingCount(0);
      }
    }

    void loadLeavePending();
    return () => {
      cancelled = true;
    };
  }, [orgId, attendanceLoading]);

  useEffect(() => {
    let cancelled = false;
    const allTiles = buildManagementDashboardNavTiles(orgId);
    const isAdminRole = roleKey === "admin";

    async function loadNavTiles() {
      setNavTilesLoading(true);
      if (isAdminRole) {
        if (!cancelled) {
          setNavTiles(allTiles);
          setNavTilesLoading(false);
        }
        return;
      }

      const cachedFeatures = readOrganizationFeatureSnapshot(String(orgId));
      if (cachedFeatures?.groups?.length) {
        if (!cancelled) {
          setNavTiles(
            filterManagementNavTiles(allTiles, cachedFeatures.groups, false),
          );
          setNavTilesLoading(false);
        }
        return;
      }

      try {
        const token = localStorage.getItem("token");
        if (!token) {
          if (!cancelled) {
            setNavTiles(
              allTiles.filter(
                (tile) => !tile.requiredFeature && !tile.requiredFeatureAny?.length,
              ),
            );
            setNavTilesLoading(false);
          }
          return;
        }
        const groups = await fetchOrganizationFeatureGroups(String(orgId), token);
        if (!cancelled) {
          setNavTiles(filterManagementNavTiles(allTiles, groups, false));
          setNavTilesLoading(false);
        }
      } catch {
        if (!cancelled) {
          setNavTiles(
            allTiles.filter(
              (tile) => !tile.requiredFeature && !tile.requiredFeatureAny?.length,
            ),
          );
          setNavTilesLoading(false);
        }
      }
    }

    void loadNavTiles();
    return () => {
      cancelled = true;
    };
  }, [orgId, roleKey]);

  async function refreshAttendanceData(token: string) {
    if (!orgId || Number.isNaN(orgId) || !showAttendance) return;
    const q = encodeURIComponent(String(orgId));
    const refresh = await fetch(
      `${API_URL}/api/employees/get-employees-full-information?org_id=${q}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    const refreshData = (await refresh.json()) as EmployeeDashboardResponse & {
      message?: string;
    };
    if (refresh.ok) {
      setAttendanceData(refreshData);
      patchEmployeeDashboardHomeCache(orgId, { data: refreshData });
    }
  }

  const todayYmd = getTodayLocalYmd(new Date());
  const { attendance: deviceAttendance } = useDeviceLiveAttendance(
    orgId ? String(orgId) : undefined,
  );
  const historyMap = useMemo(() => {
    const map = new Map<string, AttendanceHistoryRow>();
    for (const row of attendanceData?.attendance_history ?? []) {
      const key = localYmdFromAttendanceValue(row.attendance_date);
      if (key) map.set(key, row);
    }
    return map;
  }, [attendanceData?.attendance_history]);
  const todayRecord = historyMap.get(todayYmd);
  const effectiveTodayRecord = useMemo(() => {
    if (!deviceAttendance?.check_in) return todayRecord;
    return {
      ...todayRecord,
      attendance_date: deviceAttendance.attendance_date ?? todayYmd,
      check_in: deviceAttendance.check_in,
      check_out: deviceAttendance.check_out ?? todayRecord?.check_out ?? null,
      attendance_status: todayRecord?.attendance_status ?? "present",
    };
  }, [deviceAttendance, todayRecord, todayYmd]);
  const hasCheckedInToday = Boolean(effectiveTodayRecord?.check_in);
  const hasCheckedOutToday = Boolean(effectiveTodayRecord?.check_out);
  const latestMachinePunch = deviceAttendance?.latest_punch_at ?? null;
  const machinePunchCount = deviceAttendance?.punch_count ?? 0;
  const showLatestMachinePunch = Boolean(
    hasCheckedInToday &&
      !hasCheckedOutToday &&
      machinePunchCount > 1 &&
      latestMachinePunch &&
      latestMachinePunch !== effectiveTodayRecord?.check_out,
  );
  const checkInInstant = parseAttendanceNaiveLocal(effectiveTodayRecord?.check_in);
  const checkInValid =
    checkInInstant && !Number.isNaN(checkInInstant.getTime());
  const showLiveTimer = Boolean(
    checkInValid && hasCheckedInToday && !hasCheckedOutToday,
  );

  useEffect(() => {
    if (!showLiveTimer) return;
    const firstTick = window.setTimeout(() => setTick(Date.now()), 0);
    const id = window.setInterval(() => setTick(Date.now()), 1000);
    return () => {
      window.clearTimeout(firstTick);
      window.clearInterval(id);
    };
  }, [showLiveTimer]);

  const liveElapsedMs =
    showLiveTimer && checkInValid && tick > 0
      ? tick - checkInInstant.getTime()
      : 0;
  const workingHoursDisplay = showLiveTimer
    ? formatElapsedDuration(liveElapsedMs)
    : formatWorkingTimeDisplay(effectiveTodayRecord?.working_time);
  const attendanceEmployee =
    attendanceData?.employee ?? attendanceData?.employees;
  const lateAfter = attendanceEmployee?.mark_attendance_late_after
    ? String(attendanceEmployee.mark_attendance_late_after).slice(0, 5)
    : "—";

  async function markCheckIn() {
    if (!orgId || Number.isNaN(orgId)) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    setCheckInSubmitting(true);
    setAttendanceActionError(null);
    setLogSuccessMessage(null);
    try {
      const n = new Date();
      const yyyy = n.getFullYear();
      const mm = String(n.getMonth() + 1).padStart(2, "0");
      const dd = String(n.getDate()).padStart(2, "0");
      const hh = String(n.getHours()).padStart(2, "0");
      const min = String(n.getMinutes()).padStart(2, "0");
      const res = await fetch(
        `${API_URL}/api/employees/mark-attendance-check-in`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            org_id: orgId,
            user_date: `${yyyy}-${mm}-${dd}`,
            user_time: `${hh}:${min}`,
          }),
        },
      );
      const result = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(result.message || "Could not mark check-in");
      await refreshAttendanceData(token);
    } catch (e) {
      setAttendanceActionError(
        e instanceof Error ? e.message : "Could not mark check-in.",
      );
    } finally {
      setCheckInSubmitting(false);
    }
  }

  async function markCheckOut() {
    if (!orgId || Number.isNaN(orgId)) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    setCheckOutSubmitting(true);
    setAttendanceActionError(null);
    setLogSuccessMessage(null);
    try {
      const n = new Date();
      const yyyy = n.getFullYear();
      const mm = String(n.getMonth() + 1).padStart(2, "0");
      const dd = String(n.getDate()).padStart(2, "0");
      const hh = String(n.getHours()).padStart(2, "0");
      const min = String(n.getMinutes()).padStart(2, "0");
      const res = await fetch(
        `${API_URL}/api/employees/mark-attendance-check-out`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            org_id: orgId,
            user_date: `${yyyy}-${mm}-${dd}`,
            user_time: `${hh}:${min}`,
          }),
        },
      );
      const result = (await res.json()) as { message?: string };
      if (!res.ok)
        throw new Error(result.message || "Could not mark check-out");
      await refreshAttendanceData(token);
    } catch (e) {
      setAttendanceActionError(
        e instanceof Error ? e.message : "Could not mark check-out.",
      );
    } finally {
      setCheckOutSubmitting(false);
    }
  }

  async function markAttendanceLog() {
    if (!orgId || Number.isNaN(orgId)) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    const attendanceId = todayRecord?.id;
    if (attendanceId == null || attendanceId === "") {
      setAttendanceActionError("No attendance row for today. Check in first.");
      return;
    }
    setLogSubmitting(true);
    setAttendanceActionError(null);
    setLogSuccessMessage(null);
    try {
      const res = await fetch(`${API_URL}/api/employees/add-attendance-log`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ org_id: orgId, attendance_id: attendanceId }),
      });
      const result = (await res.json()) as {
        success?: boolean;
        message?: string;
        data?: { action_type?: string; message?: string };
      };
      if (!res.ok)
        throw new Error(result.message || "Could not mark attendance log");
      const action = result.data?.action_type;
      setLogSuccessMessage(
        action
          ? `Recorded: ${action}`
          : (result.data?.message ?? result.message ?? "Log saved."),
      );
    } catch (e) {
      setAttendanceActionError(
        e instanceof Error ? e.message : "Could not mark attendance log.",
      );
    } finally {
      setLogSubmitting(false);
    }
  }

  const statusLabel = effectiveTodayRecord?.attendance_status
    ? String(effectiveTodayRecord.attendance_status).replace(/_/g, " ")
    : "No status";
  const statusTone = String(effectiveTodayRecord?.attendance_status || "")
    .toLowerCase()
    .includes("late")
    ? "bg-amber-100 text-amber-800"
    : String(effectiveTodayRecord?.attendance_status || "")
          .toLowerCase()
          .includes("full_day")
      ? "bg-emerald-100 text-emerald-800"
      : "bg-slate-100 text-slate-700";
  const dayVisual = getAttendanceDayVisual(effectiveTodayRecord?.attendance_status);
  const overviewDataLoading = showAttendance && attendanceLoading;
  const checkInDisplay = effectiveTodayRecord?.check_in
    ? formatAttendanceLogLocal(effectiveTodayRecord.check_in)
    : "—";
  const checkOutDisplay = effectiveTodayRecord?.check_out
    ? formatAttendanceTimeLocal(effectiveTodayRecord.check_out)
    : "—";
  const attendanceHistoryHref =
    orgId && !Number.isNaN(orgId)
      ? `/dashboard/${orgId}/my-attendance-history`
      : undefined;
  const activeTeamCount = activeTeamAssignments(attendanceData?.teams ?? []).length;

  return (
    <div className={`${dashPageCls} relative`}>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-gradient-to-b from-[#FDE8F3]/35 via-[#F4F6F9] to-transparent"
        aria-hidden
      />

      <HomePageTabBar
        activeTab={activeHomeTab}
        onTabChange={handleHomeTabChange}
        leavePendingCount={leavePendingCount}
      />

      {activeHomeTab === "welcome" ? (
        <div role="tabpanel" aria-label="Welcome" className="space-y-6">
          <HomeDashboardHeader
            greeting={greetingForHour()}
            displayName={displayName}
            orgTitle={orgTitle}
            roleBadgeLabel={roleBadgeLabel}
            roleKey={roleKey}
            refreshing={attendanceLoading}
            onRefresh={() => void loadHomeOverviewData(true)}
            showAttendanceStrip={showAttendance && !attendanceLoading}
            checkInLabel={checkInDisplay}
            checkOutLabel={checkOutDisplay}
            workingHoursDisplay={String(workingHoursDisplay)}
            showLiveTimer={showLiveTimer}
            statusLabel={statusLabel}
            attendanceHistoryHref={attendanceHistoryHref}
          />

          <HomeFeaturesSlider
            tiles={navTiles}
            pathname={pathname}
            handoverPendingCount={handoverPendingCount}
            loading={navTilesLoading}
          />

          <AssetHandoverCard
            handoverHref={handoverHref}
            handoverPendingCount={handoverPendingCount}
            loading={attendanceLoading && !cachedHome}
            delayMs={100}
          />
        </div>
      ) : (
        <HomeDashboardTab
          orgTitle={orgTitle}
          displayName={displayName}
          roleBadgeLabel={roleBadgeLabel}
          roleKey={roleKey}
          refreshing={attendanceLoading}
          onRefresh={() => void loadHomeOverviewData(true)}
          showAttendance={showAttendance}
          workingHoursDisplay={String(workingHoursDisplay)}
          statusLabel={statusLabel}
          showLiveTimer={showLiveTimer}
          leavePendingCount={leavePendingCount}
          activeTeamCount={activeTeamCount}
          addressCount={organizationAddresses.length}
          todayPanel={
            showAttendance ? (
              <HomeAttendanceCard
                loading={attendanceLoading}
                workingHoursDisplay={String(workingHoursDisplay)}
                showLiveTimer={showLiveTimer}
                statusLabel={statusLabel}
                statusTone={statusTone}
                attendanceError={attendanceError}
                hasCheckedInToday={hasCheckedInToday}
                hasCheckedOutToday={hasCheckedOutToday}
                effectiveCheckIn={effectiveTodayRecord?.check_in}
                effectiveCheckOut={effectiveTodayRecord?.check_out}
                showLatestMachinePunch={showLatestMachinePunch}
                latestMachinePunch={latestMachinePunch}
                formatCheckIn={formatAttendanceLogLocal}
                formatCheckOut={formatAttendanceTimeLocal}
                lateAfter={lateAfter}
                dayVisual={dayVisual}
                checkInSubmitting={checkInSubmitting}
                checkOutSubmitting={checkOutSubmitting}
                logSubmitting={logSubmitting}
                canLog={
                  hasCheckedInToday &&
                  !hasCheckedOutToday &&
                  todayRecord?.id != null &&
                  todayRecord?.id !== ""
                }
                logSuccessMessage={logSuccessMessage}
                attendanceActionError={attendanceActionError}
                onCheckIn={() => void markCheckIn()}
                onCheckOut={() => void markCheckOut()}
                onLog={() => void markAttendanceLog()}
                onDismissSuccess={() => setLogSuccessMessage(null)}
                delayMs={30}
              />
            ) : null
          }
          leavePanel={
            <HomeLeaveQuickActions
              orgId={orgId}
              pendingCount={leavePendingCount}
              delayMs={20}
              variant="dashboard"
            />
          }
          attendanceMonitorPanel={
            <HomeTodayAttendanceMonitor orgId={String(orgId)} />
          }
          livePresencePanel={
            <OrgLiveUsersPanel
              orgId={String(orgId)}
              className="h-full"
              embedded
            />
          }
          biometricPanel={
            <BiometricLiveAttendanceFeed
              orgId={String(orgId)}
              className="h-full"
              embedded
            />
          }
          profilePanel={
            <ProfileSummaryCard
              organization={organization}
              user={user}
              ownerName={ownerName}
              ownerEmail={ownerEmail}
              ownerPhone={ownerPhone}
              ownerMatchesUser={ownerMatchesUser}
              delayMs={40}
            />
          }
          teamsPanel={
            roleKey !== "admin" ? (
              <MyTeamsSection
                teams={attendanceData?.teams ?? []}
                orgId={orgId}
                currentUserName={user.user_name?.trim() || displayName}
                delayMs={50}
                loading={overviewDataLoading}
              />
            ) : undefined
          }
          locationsPanel={
            <OrganizationAddressesSection
              addresses={organizationAddresses}
              orgId={orgId}
              delayMs={60}
            />
          }
          allToolsPanel={
            <HomeAllToolsPanel
              tiles={navTiles}
              pathname={pathname}
              handoverPendingCount={handoverPendingCount}
              loading={navTilesLoading}
              variant="dashboard"
            />
          }
        />
      )}
    </div>
  );
}

export default function HomePage() {
  const ctx = useManagementDashboardContext();
  const params = useParams();
  const orgId = Number(params?.org_id);
 
  if (!ctx) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-[#0C123A]">Home</p>
      </div>
    );
  }

  const { organization, user, organizationAddresses, loading } = ctx;

  if (loading) {
    return <HomePageLoadingSkeleton showAttendance />;
  }

  if (!organization || !user) {
    return (
      <div className={`${dashCardCls} p-6`}>
        <p className="text-[14px] font-medium text-slate-800">
          Could not load organization.
        </p>
      </div>
    );
  }

  return (
    <HomeOverview
      organization={organization}
      user={user}
      orgId={orgId}
      organizationAddresses={organizationAddresses}
    />
  );
}
