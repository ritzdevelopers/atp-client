import { PortalFeature } from "@/services/organization";
import {
  fetchOrganizationFeatureGroups,
  getOrganizationParentGroup,
  organizationHasParentFeature,
  organizationHasSubFeature,
  persistOrganizationFeatureAccess,
  readOrganizationFeatureSnapshot,
  type OrgFeatureGroup,
} from "@/lib/orgFeatureAccess";
import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import { useRouter, useParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { BiSolidUserPlus, BiTask } from "react-icons/bi";
import {
  MdAdminPanelSettings,
  MdEvent,
  MdFactCheck,
  MdHistory,
  MdHome,
  MdSchedule,
  MdMenu,
  MdLogout,
  MdClose,
  MdChevronRight,
  MdVpnKey,
  MdWifi,
  MdPayments,
  MdOutlineEventNote,
  MdOutlineManageAccounts,
  MdSpaceDashboard,
} from "react-icons/md";

/** Desktop (lg+) nav icons — mobile keeps `NavItem.icon` unchanged. */
const LG_ICON = "shrink-0 text-[17px] leading-none";

function desktopNavIcon(
  id: string,
  fallback: React.ReactNode,
): React.ReactNode {
  switch (id) {
    case "home":
      return <MdHome className={LG_ICON} aria-hidden />;
    case "manage-organization-information":
      return <MdOutlineManageAccounts className={LG_ICON} aria-hidden />;
    case "employee-management":
      return <BiSolidUserPlus className={LG_ICON} aria-hidden />;
    case "employees-roles-management":
      return <MdAdminPanelSettings className={LG_ICON} aria-hidden />;
    case "employees-features-management":
      return <MdVpnKey className={LG_ICON} aria-hidden />;
    case "dashboard-management":
      return <MdSpaceDashboard className={LG_ICON} aria-hidden />;
    case "company-ip-addresses-management":
      return <MdWifi className={LG_ICON} aria-hidden />;
    case "company-shift-management":
      return <MdSchedule className={LG_ICON} aria-hidden />;
    case "company-holiday-management":
      return <MdEvent className={LG_ICON} aria-hidden />;
    case "company-attendance-management":
      return <MdFactCheck className={LG_ICON} aria-hidden />;
    case "company-leave-management":
      return <MdOutlineEventNote className={LG_ICON} aria-hidden />;
    case "payroll-management":
      return <MdPayments className={LG_ICON} aria-hidden />;
    default:
      return fallback;
  }
}

const LG_SIDEBAR_STYLES = `
@media (min-width: 1024px) {
  @keyframes lgSidebarSubIn {
    from { opacity: 0; transform: translateX(-8px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes lgSidebarRailIn {
    from { opacity: 0; transform: translateX(-4px); }
    to { opacity: 1; transform: translateX(0); }
  }
  .lg-sidebar-sub-in {
    animation: lgSidebarSubIn 0.22s cubic-bezier(0.4, 0, 0.2, 1) both;
  }
  .lg-sidebar-rail-in {
    animation: lgSidebarRailIn 0.18s ease-out both;
  }
}
`;

/** Admin mobile bottom bar: quick-access tabs (fourth slot is Menu). */
const ADMIN_BOTTOM_TAB_IDS: string[] = [
  "home",
  "employee-management",
  "employees-roles-management",
];

/** Nav slots on the bottom bar before the Menu button (< lg). */
const MAX_MOBILE_BOTTOM_NAV_SLOTS = 3;

const MOBILE_BOTTOM_LIGHT =
  "border-t border-slate-200 bg-[#FAFAF8] text-slate-700 shadow-[0_-1px_0_0_rgba(15,23,42,0.06)]";
const MOBILE_DRAWER_PANEL =
  "border-l border-slate-200 bg-[#FAFAF8] text-slate-800";

function shortBottomLabel(item: NavItem): string {
  const short: Record<string, string> = {
    home: "Home",
    "employee-management": "Employees",
    "employees-roles-management": "Roles",
    "employees-features-management": "Features",
    "dashboard-management": "Dashboards",
    "company-ip-addresses-management": "IP",
    "company-shift-management": "Shifts",
    "company-holiday-management": "Holidays",
    "company-attendance-management": "Attendance",
  };
  return (
    short[item.id] ??
    (item.name.length > 14 ? `${item.name.slice(0, 12)}…` : item.name)
  );
}

function readRoleNameFromToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const part = token.split(".")[1];
    if (!part) return null;
    const payload = JSON.parse(atob(part)) as { user_role_name?: string };
    return payload.user_role_name ?? null;
  } catch {
    return null;
  }
}

type NavSubItem = {
  id: string;
  name: string;
  /** If set, sub-item navigates here when clicked. */
  path?: string;
  requiredFeature?: string;
};

type NavItem = {
  id: string;
  name: string;
  value: string;
  icon: React.ReactNode;
  children: NavSubItem[];
  /** If set, main item navigates here when clicked. Omit to only expand / show sub-menu. */
  path?: string;
  /** User must have this feature slug (checks accessible features). */
  requiredFeature?: string;
  /** If set, access is granted when any listed feature matches (e.g. legacy role aliases). */
  requiredFeatureAny?: string[];
};

function LeftSideBar({
  accessableFeatures: _accessableFeatures,
}: {
  accessableFeatures: PortalFeature[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const orgId = String(params?.org_id ?? "1");
  const base = `/dashboard/${orgId}`;
  const dashboardCtx = useManagementDashboardContext();
  const [roleHydrated, setRoleHydrated] = useState(false);
  useEffect(() => {
    setRoleHydrated(true);
  }, []);
  const effectiveRoleName =
    dashboardCtx?.user?.user_role_name ?? readRoleNameFromToken();
  const isAdmin =
    roleHydrated &&
    String(effectiveRoleName || "")
      .trim()
      .toLowerCase() === "admin";
  const myHistoryActive = Boolean(pathname?.includes("/my-attendance-history"));
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [orgFeatureGroups, setOrgFeatureGroups] = useState<OrgFeatureGroup[]>(
    [],
  );
  const [featuresLoaded, setFeaturesLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function ensureOrgFeatures() {
      const cached = readOrganizationFeatureSnapshot(orgId);
      if (cached?.groups?.length) {
        if (!cancelled) {
          setOrgFeatureGroups(cached.groups);
          setFeaturesLoaded(true);
        }
      }

      try {
        const token = localStorage.getItem("token");
        if (!token) {
          if (!cancelled) setFeaturesLoaded(true);
          return;
        }
        const groups = await fetchOrganizationFeatureGroups(orgId, token);
        if (!cancelled) {
          setOrgFeatureGroups(groups);
          setFeaturesLoaded(true);
        }
      } catch {
        if (!cancelled) setFeaturesLoaded(true);
      }
    }
    void ensureOrgFeatures();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const hasFeatureAccess = useCallback(
    (requiredFeature?: string) =>
      organizationHasParentFeature(orgFeatureGroups, requiredFeature),
    [orgFeatureGroups],
  );

  const hasSubFeatureAccess = useCallback(
    (parentFeature?: string, subFeaturePath?: string) =>
      organizationHasSubFeature(
        orgFeatureGroups,
        parentFeature,
        subFeaturePath,
      ),
    [orgFeatureGroups],
  );

  const navItems: NavItem[] = useMemo(
    () => [
      {
        id: "home",
        name: "Home",
        value: "get-organization",
        icon: <MdHome />,
        children: [],
        path: `${base}/home`,
        requiredFeature: "get-organization-info",
      },

      {
        id: "employee-management",
        name: "Employee Management",
        value: "employee-management",
        icon: <BiSolidUserPlus />,
        path: `${base}/organization-employees/manage-employees`,
        children: [
          {
            id: "manage-employee",
            name: "Manage Employees",
            path: `${base}/organization-employees/manage-employees`,
          },
          {
            id: "employee-onboarding",
            name: "New Hires",
            path: `${base}/organization-employees/employee-onboarding`,
          },
          {
            id: "background-verification",
            name: "Background verification",
            path: `${base}/organization-employees/background-verification`,
          },
          {
            id: "employee-leave-management",
            name: "Manage Employee Leaves",
            path: `${base}/organization-employees/manage-employee-leaves`,
          },
          {
            id: "create-team",
            name: "Team creation",
            path: `${base}/organization-employees/create-team`,
          },
          {
            id: "team-management",
            name: "Team management",
            path: `${base}/organization-employees/manage-teams`,
          },
        ],
        requiredFeature: "employee-management",
      },
      // employees-roles-management (either feature slug may grant access)
      {
        id: "employees-roles-management",
        name: "Organization Roles",
        value: "employees-roles-management",
        icon: <MdAdminPanelSettings />,
        children: [
          {
            id: "create-new-role",
            name: "Create New Role",
            path: `${base}/organization-roles/create-new-role`,
          },
          {
            id: "manage-roles",
            name: "Manage Roles",
            path: `${base}/organization-roles/manage-roles`,
          },
        ],
        path: `${base}/organization-roles/create-new-role`,
        requiredFeatureAny: [
          "employees-roles-management",
          "organization-roles",
        ],
      },

      {
        id: "employees-features-management",
        name: "Company Features Access Management",
        value: "employees-features-management",
        icon: <MdVpnKey />,
        path: `${base}/organization-features/manage-organization-features`,
        requiredFeature: "employees-features-management",
        children: [
          {
            id: "manage-organization-features",
            name: "Manage Organization Features",
            path: `${base}/organization-features/manage-organization-features`,
          },
          // {
          //   id: "get-employee-accessible-features",
          //   name: "Get Employee Accessible Features",
          //   path: `${base}/organization-features/get-employee-accessible-features`,
          // },
          //assign-features-role-wise
          // {
          //   id: "assign-features-role-wise",
          //   name: "Assign Features Role Wise",
          //   path: `${base}/organization-features/assign-features-role-wise`,
          // },
          {
            id: "assign-features-to-the-employee",
            name: "Assign Features To Employee",
            path: `${base}/organization-features/assign-features-to-the-employee`,
          },
        ],
      },
      {
        id: "dashboard-management",
        name: "Dashboard Management",
        value: "dashboard-management",
        icon: <MdSpaceDashboard />,
        path: `${base}/dashboard-management/manage-assigned-dashboards`,
        requiredFeature: "dashboard-management",
        children: [
          {
            id: "manage-assigned-dashboards",
            name: "Manage Assigned Dashboards",
            path: `${base}/dashboard-management/manage-assigned-dashboards`,
          },
          {
            id: "assign-dashboard-to-employee",
            name: "Assign Dashboard To Employee",
            path: `${base}/dashboard-management/assign-dashboard-to-employee`,
          },
        ],
      },
      // company-ip-addresses-management
      {
        id: "company-ip-addresses-management",
        name: "Company IP Addresses Management",
        value: "company-ip-addresses-management",
        icon: <MdWifi />,
        children: [
          {
            id: "create-new-ip-address",
            name: "Create New IP Address",
            path: `${base}/organization-settings/create-new-ip-address`,
          },
          {
            id: "manage-ip-addresses",
            name: "Manage IP Addresses",
            path: `${base}/organization-settings/manage-ip-addresses`,
          },
        ],
        requiredFeature: "company-ip-addresses-management",
      },

      // company-shift-management
      {
        id: "company-shift-management",
        name: "Company Shift Management",
        value: "company-shift-management",
        icon: <MdSchedule />,
        path: `${base}/organization-settings/manage-company-shifts`,
        children: [
          {
            id: "manage-shifts",
            name: "Manage Shifts",
            path: `${base}/organization-settings/manage-company-shifts`,
          },
          {
            id: "create-new-shift",
            name: "Create New Shift",
            path: `${base}/organization-settings/create-company-shifts`,
          },
        ],
        requiredFeature: "company-shift-management",
      },

      // company-holiday-management
      {
        id: "company-holiday-management",
        name: "Company Holiday Management",
        value: "company-holiday-management",
        icon: <MdEvent />,
        path: `${base}/organization-settings/organization-holidays`,
        children: [
          {
            id: "manage-holidays",
            name: "Manage Holidays",
            path: `${base}/organization-settings/organization-holidays`,
          },
        ],
        requiredFeature: "company-holiday-management",
      },

      // company-attendance-management
      {
        id: "company-attendance-management",
        name: "Company Attendance Management",
        value: "company-attendance-management",
        icon: <MdFactCheck />,
        path: `${base}/attendance-management/manage-attendance`,
        children: [
          {
            id: "manage-attendances",
            name: "Manage Attendances",
            path: `${base}/attendance-management/manage-attendance`,
          },
        ],
        requiredFeature: "company-attendance-management",
      },

      // company-leave-management
      {
        id: "company-leave-management",
        name: "Company Leave Management",
        value: "company-leave-management",
        icon: <MdEvent />,
        path: `${base}/organization-leave/manage-leave-types`,
        children: [
          {
            id: "manage-leave-types",
            name: "Manage Leave Types",
            path: `${base}/organization-leave/manage-leave-types`,
          },
        ],
        requiredFeature: "company-leave-management",
      },

      {
        id: "payroll-management",
        name: "Payroll Management",
        value: "payroll-management",
        icon: <MdEvent />,
        path: `${base}/organization-payroll-management/manage-employee-salary`,
        children: [
          {
            id: "manage-salary",
            name: "Manage Salary",
            path: `${base}/organization-payroll-management/manage-employee-salary`,
          },
        ],
        requiredFeature: "payroll-management",
      },
      {
        id: "task-management",
        name: "Task Management",
        value: "task-management",
        icon: <BiTask />,
        children: [
          {
            id: "manage-employees-tasks",
            name: "Manage Employees Tasks",
            path: `${base}/tasks-management/manage-employees-tasks`,
          },
          {
            id: "assign-task-to-employees",
            name: "Assign Task To Employees",
            path: `${base}/tasks-management/assign-task-to-employees`,
          },
        ], 
        requiredFeature: "task-management",
      },
      {
        id: "manage-organization-information",
        name: "Manage Organization Information",
        value: "manage-organization-information",
        icon: <MdOutlineManageAccounts />,
        children: [],
        path: `${base}/organization-settings/manage-organization-information`,
        requiredFeature: "manage-organization-information",
      },
    ],
    [base],
  );

  const filteredNavItems = useMemo(() => {
    if (!featuresLoaded) return [];
    const result: NavItem[] = [];
    for (const item of navItems) {
      const matchedParentSlug = item.requiredFeatureAny?.length
        ? item.requiredFeatureAny.find((slug) => hasFeatureAccess(slug))
        : item.requiredFeature;
      const canSeeParent = item.requiredFeatureAny?.length
        ? Boolean(matchedParentSlug)
        : hasFeatureAccess(item.requiredFeature);
      if (!canSeeParent) continue;

      const parentFeatureKey =
        matchedParentSlug || item.requiredFeature || item.value || item.id;
      const parentGroup = getOrganizationParentGroup(
        orgFeatureGroups,
        parentFeatureKey,
      );
      const assignedSubCount = parentGroup?.sub_features?.length ?? 0;

      let children: NavSubItem[] = [];
      if (item.children.length > 0) {
        if (assignedSubCount === 0) {
          children = item.children;
        } else {
          children = item.children.filter((sub) =>
            hasSubFeatureAccess(parentFeatureKey, sub.id),
          );
        }
        if (assignedSubCount > 0 && children.length === 0) continue;
      }

      result.push({
        ...item,
        children,
        path: item.path ?? children[0]?.path,
      });
    }
    return result;
  }, [
    navItems,
    featuresLoaded,
    orgFeatureGroups,
    hasFeatureAccess,
    hasSubFeatureAccess,
  ]);

  useEffect(() => {
    if (!featuresLoaded) return;
    const allowedPaths: string[] = [];
    for (const item of filteredNavItems) {
      if (item.path) allowedPaths.push(item.path);
      for (const sub of item.children) {
        if (sub.path) allowedPaths.push(sub.path);
      }
    }
    persistOrganizationFeatureAccess(orgId, orgFeatureGroups, allowedPaths);
  }, [orgId, orgFeatureGroups, filteredNavItems, featuresLoaded, pathname]);

  const [activeMain, setActiveMain] = useState("organization");
  const [activeSub, setActiveSub] = useState("employee");
  const [mobileFullMenuOpen, setMobileFullMenuOpen] = useState(false);
  const [mobileSubParent, setMobileSubParent] = useState<NavItem | null>(null);

  type BottomSlot = { kind: "nav"; item: NavItem } | { kind: "my-attendance" };

  const bottomSlots: BottomSlot[] = useMemo(() => {
    if (isAdmin) {
      const slots: BottomSlot[] = [];
      for (const id of ADMIN_BOTTOM_TAB_IDS) {
        const item = filteredNavItems.find((i) => i.id === id);
        if (item) slots.push({ kind: "nav", item });
      }
      return slots.slice(0, MAX_MOBILE_BOTTOM_NAV_SLOTS);
    }
    const slots: BottomSlot[] = [];
    const home = filteredNavItems.find((i) => i.id === "home");
    if (home) slots.push({ kind: "nav", item: home });
    slots.push({ kind: "my-attendance" });
    for (const item of filteredNavItems) {
      if (item.id === "home") continue;
      if (slots.length >= MAX_MOBILE_BOTTOM_NAV_SLOTS) break;
      slots.push({ kind: "nav", item });
    }
    return slots.slice(0, MAX_MOBILE_BOTTOM_NAV_SLOTS);
  }, [isAdmin, filteredNavItems]);

  useEffect(() => {
    if (!pathname || filteredNavItems.length === 0) return;
    let bestMain: string | null = null;
    let bestSubId: string | null = null;
    let bestLen = -1;
    for (const item of filteredNavItems) {
      for (const sub of item.children) {
        if (
          sub.path &&
          pathname.startsWith(sub.path) &&
          sub.path.length > bestLen
        ) {
          bestLen = sub.path.length;
          bestMain = item.id;
          bestSubId = sub.id;
        }
      }
      if (
        item.path &&
        pathname.startsWith(item.path) &&
        item.path.length > bestLen
      ) {
        bestLen = item.path.length;
        bestMain = item.id;
        bestSubId = null;
      }
    }
    if (bestMain) {
      setActiveMain((prev) => (prev === bestMain ? prev : bestMain!));
      if (bestSubId)
        setActiveSub((prev) => (prev === bestSubId ? prev : bestSubId));
    }
  }, [pathname, filteredNavItems]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setMobileFullMenuOpen(false);
      setMobileSubParent(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const lock = mobileFullMenuOpen || mobileSubParent != null;
    document.body.style.overflow = lock ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileFullMenuOpen, mobileSubParent]);

  const toggleMobileMenu = useCallback(() => {
    setMobileSubParent(null);
    setMobileFullMenuOpen((open) => !open);
  }, []);

  useEffect(() => {
    if (filteredNavItems.length === 0) return;
    const t = window.setTimeout(() => {
      const active = filteredNavItems.find((item) => item.id === activeMain);
      if (!active) {
        setActiveMain(filteredNavItems[0].id);
        setActiveSub(filteredNavItems[0].children[0]?.id ?? "");
        return;
      }
      if (
        active.children.length > 0 &&
        !active.children.some((sub) => sub.id === activeSub)
      ) {
        setActiveSub(active.children[0].id);
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, [filteredNavItems, activeMain, activeSub]);

  const activeItem = filteredNavItems.find((item) => item.id === activeMain);
  const subItems = activeItem?.children || [];

  const handleMainClick = (item: NavItem) => {
    setActiveMain(item.id);
    if (item.children.length > 0) {
      setActiveSub(item.children[0].id);
    }
    if (item.path) {
      router.push(item.path);
    }
  };

  const handleSubClick = (sub: NavSubItem) => {
    setActiveSub(sub.id);
    if (sub.path) {
      router.push(sub.path);
    }
  };

  const selectMobileNavItem = useCallback(
    (item: NavItem) => {
      setActiveMain(item.id);
      if (item.children.length > 0) {
        setActiveSub(item.children[0]?.id ?? "");
      }
      if (item.path) {
        router.push(item.path);
      }
      if (item.children.length > 0) {
        setMobileSubParent(item);
      } else {
        setMobileSubParent(null);
      }
      setMobileFullMenuOpen(false);
    },
    [router],
  );

  const closeMobileDrawers = useCallback(() => {
    setMobileFullMenuOpen(false);
    setMobileSubParent(null);
  }, []);

  const isMobileBottomSlotActive = useCallback(
    (slot: BottomSlot) => {
      if (slot.kind === "my-attendance") return myHistoryActive;
      const item = slot.item;
      if (!pathname) return false;
      if (item.path && pathname.startsWith(item.path)) return true;
      return item.children.some((c) => c.path && pathname.startsWith(c.path));
    },
    [pathname, myHistoryActive],
  );

  function confirmLogout() {
    try {
      localStorage.removeItem("token");
    } catch {
      // ignore
    }
    setShowLogoutConfirm(false);
    router.push("/");
  }

  const logoutDialog =
    showLogoutConfirm && typeof document !== "undefined" ? (
      <div
        className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-dialog-title"
      >
        <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
          <h2
            id="logout-dialog-title"
            className="text-base font-semibold text-slate-900"
          >
            Sign out?
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            You will be signed out of the portal. Unsaved work may be lost. You
            must sign in again to continue.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(false)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmLogout}
              className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <>
      {/* Desktop (lg+): Zoho-style light icon rail + animated sub panel */}
      <div className="relative hidden h-screen shrink-0 lg:flex lg:sticky lg:top-0">
        <style dangerouslySetInnerHTML={{ __html: LG_SIDEBAR_STYLES }} />
        {/* ── LEFT RAIL ── */}
        <div className="lg-sidebar-rail-in flex w-[58px] flex-shrink-0 flex-col items-center overflow-y-auto overflow-x-hidden border-r border-[#E4E7EC] bg-white py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-full flex-1 flex-col items-center">
            {filteredNavItems.map((item) => {
              const isActive = activeMain === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleMainClick(item)}
                  title={item.name}
                  className={`
                  relative flex w-full cursor-pointer flex-col items-center justify-center gap-0.5 border-0 bg-transparent px-0.5 py-1.5 outline-none transition-colors duration-150
                  ${
                    isActive
                      ? "text-[#008CD3] bg-[#E8F4FB]"
                      : "text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#374151]"
                  }
                `}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-[50%] w-[3px] -translate-y-1/2 rounded-r-sm bg-[#008CD3]" />
                  )}

                  <span className="flex h-[26px] w-[26px] items-center justify-center">
                    {desktopNavIcon(item.id, item.icon)}
                  </span>

                  <span className="line-clamp-2 w-full px-0.5 text-center text-[8.5px] font-medium leading-[1.15] tracking-tight">
                    {item.name}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-1 flex w-full flex-col items-center border-t border-[#E4E7EC] pt-1">
            {isAdmin ? (
              <>
                {/* <button
                type="button"
                onClick={handleMoreClick}
                className={`
              relative flex flex-col items-center justify-center w-full px-1 py-[10px] gap-[5px]
              cursor-pointer transition-all duration-150 border-0 bg-transparent outline-none
              ${
                activeMain === "more"
                  ? "text-white bg-white/[0.06]"
                  : "text-[#8A9BAD] hover:text-[#CBD5DF] hover:bg-white/[0.04]"
              }
            `}
              >
                {activeMain === "more" && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[55%] bg-[#C99237] rounded-r-[2px]" />
                )}
                <span className="text-[20px] leading-none flex items-center justify-center">
                  <MdMoreHoriz />
                </span>
                <span
                  className="text-[10px] font-medium text-center leading-[1.25] w-full px-1"
                  style={{
                    letterSpacing: "0.01em",
                    wordBreak: "break-word",
                    hyphens: "auto",
                  }}
                >
                  More
                </span>
              </button>

              <button
                type="button"
                className="flex flex-col items-center justify-center w-full px-1 py-[10px] gap-[5px]
              cursor-pointer transition-all duration-150 border-0 bg-transparent outline-none
              text-[#8A9BAD] hover:text-[#CBD5DF] hover:bg-white/[0.04]"
              >
                <span className="text-[20px] leading-none flex items-center justify-center">
                  <MdSettings />
                </span>
                <span
                  className="text-[10px] font-medium text-center leading-[1.25]"
                  style={{ letterSpacing: "0.01em" }}
                >
                  Settings
                </span>
              </button>

              <button
                type="button"
                className="flex items-center justify-center w-full px-1 py-[12px]
              cursor-pointer transition-all duration-150 border-0 bg-transparent outline-none
              text-[#8A9BAD] hover:text-[#CBD5DF] hover:bg-white/[0.04]"
                aria-label="Menu"
              >
                <span className="text-[20px] leading-none flex items-center justify-center">
                  <MdMenu />
                </span>
              </button> */}
              </>
            ) : (
              <button
                type="button"
                onClick={() => router.push(`${base}/my-attendance-history`)}
                className={`
              relative flex w-full cursor-pointer flex-col items-center justify-center gap-0.5 border-0 bg-transparent px-0.5 py-1.5 outline-none transition-colors duration-150
              ${
                myHistoryActive
                  ? "bg-[#E8F4FB] text-[#008CD3]"
                  : "text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#374151]"
              }
            `}
                title="View your own attendance history (read-only)"
              >
                {myHistoryActive && (
                  <span className="absolute left-0 top-1/2 h-[50%] w-[3px] -translate-y-1/2 rounded-r-sm bg-[#008CD3]" />
                )}
                <span className="flex h-[26px] w-[26px] items-center justify-center">
                  <MdHistory className={LG_ICON} aria-hidden />
                </span>
                <span className="line-clamp-2 w-full px-0.5 text-center text-[8.5px] font-medium leading-[1.15]">
                  My attendance
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="flex w-full cursor-pointer flex-col items-center justify-center gap-0.5 border-0 bg-transparent px-0.5 py-1.5 text-[#6B7280] outline-none transition-colors duration-150 hover:bg-[#FCE8E6] hover:text-[#D93025]"
              title="Sign out"
            >
              <span className="flex h-[26px] w-[26px] items-center justify-center">
                <MdLogout className={LG_ICON} aria-hidden />
              </span>
              <span className="line-clamp-2 w-full px-0.5 text-center text-[8.5px] font-medium leading-[1.15]">
                Log out
              </span>
            </button>
          </div>
        </div>

        {subItems.length > 0 && (
          <aside
            key={activeMain}
            className="lg-sidebar-sub-in flex w-[11rem] flex-shrink-0 flex-col overflow-y-auto border-r border-[#E4E7EC] bg-[#F9FAFB] py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            aria-label={activeItem ? `${activeItem.name} submenu` : "Submenu"}
          >
            {activeItem && (
              <p className="mb-1 truncate px-3 text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                {activeItem.name}
              </p>
            )}
            {subItems.map((sub) => {
              const isSubActive = activeSub === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => handleSubClick(sub)}
                  className={`
                  mx-1.5 w-[calc(100%-0.75rem)] cursor-pointer rounded-md border-0 px-2.5 py-1.5 text-left text-[12px] font-medium outline-none transition-colors duration-150
                  ${
                    isSubActive
                      ? "bg-[#E8F4FB] text-[#008CD3]"
                      : "bg-transparent text-[#374151] hover:bg-white hover:text-[#008CD3]"
                  }
                `}
                >
                  <span className="line-clamp-2 leading-snug">{sub.name}</span>
                </button>
              );
            })}
          </aside>
        )}
      </div>

      {/* Bottom tab bar (< lg): quick tabs + Menu */}
      <nav
        className={`fixed bottom-0 left-0 right-0 z-[10040] lg:hidden ${MOBILE_BOTTOM_LIGHT}`}
        style={{
          paddingBottom: "max(10px, env(safe-area-inset-bottom))",
        }}
        aria-label="Primary navigation"
      >
        <div className="mx-auto flex max-w-3xl items-stretch">
          {bottomSlots.map((slot) => {
            const isActive = isMobileBottomSlotActive(slot);
            if (slot.kind === "my-attendance") {
              return (
                <button
                  key="my-attendance"
                  type="button"
                  onClick={() => {
                    router.push(`${base}/my-attendance-history`);
                    closeMobileDrawers();
                  }}
                  className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 border-r border-slate-200 px-1 py-2 transition-colors duration-200 ${
                    isActive ? "text-amber-800" : "text-slate-600"
                  }`}
                >
                  <span className="text-[22px] leading-none text-slate-700">
                    <MdHistory />
                  </span>
                  <span className="line-clamp-2 w-full text-center text-[10px] font-medium leading-tight">
                    My attendance
                  </span>
                </button>
              );
            }
            const item = slot.item;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectMobileNavItem(item)}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 border-r border-slate-200 px-1 py-2 transition-colors duration-200 ${
                  isActive ? "text-amber-800" : "text-slate-600"
                }`}
              >
                <span className="text-[22px] leading-none text-slate-700">
                  {item.icon}
                </span>
                <span className="line-clamp-2 w-full text-center text-[10px] font-medium leading-tight">
                  {shortBottomLabel(item)}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={toggleMobileMenu}
            className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 transition-colors duration-200 ${
              mobileFullMenuOpen
                ? "bg-amber-50/90 text-amber-900"
                : "text-slate-600"
            }`}
            aria-label={mobileFullMenuOpen ? "Close menu" : "Open all features"}
            aria-expanded={mobileFullMenuOpen}
          >
            <span
              className={`text-[22px] leading-none transition-transform duration-300 ${
                mobileFullMenuOpen
                  ? "rotate-90 text-amber-800"
                  : "text-slate-700"
              }`}
            >
              {mobileFullMenuOpen ? <MdClose /> : <MdMenu />}
            </span>
            <span className="line-clamp-2 w-full text-center text-[10px] font-medium leading-tight">
              Menu
            </span>
          </button>
        </div>
      </nav>

      {/* Left sheet: all accessible features (animated) */}
      <div
        className="lg:hidden"
        aria-hidden={!mobileFullMenuOpen && !mobileSubParent}
      >
        <div
          className={`fixed inset-0 z-[10045] bg-slate-900/30 transition-opacity duration-300 ease-out ${
            mobileFullMenuOpen
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0"
          }`}
          onClick={() => setMobileFullMenuOpen(false)}
          aria-hidden={!mobileFullMenuOpen}
        />
        <div
          className={`fixed left-0 top-0 z-[10046] flex h-full w-[min(20rem,88vw)] flex-col border-r border-slate-200 bg-[#FAFAF8] shadow-xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform lg:hidden ${
            mobileFullMenuOpen
              ? "pointer-events-auto translate-x-0"
              : "pointer-events-none -translate-x-full"
          }`}
          role="dialog"
          aria-modal={mobileFullMenuOpen}
          aria-label="Navigation menu"
          aria-hidden={!mobileFullMenuOpen}
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <span className="text-sm font-semibold text-slate-900">
              All features
            </span>
            <button
              type="button"
              onClick={() => setMobileFullMenuOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition active:scale-95"
              aria-label="Close menu"
            >
              <MdClose className="text-xl" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {filteredNavItems.length === 0 ? (
              <p className="border-b border-slate-200 px-4 py-3 text-sm text-slate-500">
                No features available for your role.
              </p>
            ) : (
              filteredNavItems.map((item) => {
                const itemActive =
                  activeMain === item.id ||
                  Boolean(item.path && pathname?.startsWith(item.path)) ||
                  item.children.some(
                    (c) => c.path && pathname?.startsWith(c.path),
                  );
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectMobileNavItem(item)}
                    className={`flex w-full items-center gap-3 border-b border-slate-200 px-4 py-3 text-left text-sm font-medium transition-colors duration-150 ${
                      itemActive
                        ? "bg-amber-50/80 text-amber-900"
                        : "text-slate-800 active:bg-slate-100"
                    }`}
                  >
                    <span className="text-xl text-slate-600">{item.icon}</span>
                    <span className="min-w-0 flex-1 leading-snug">
                      {item.name}
                    </span>
                    {item.children.length > 0 ? (
                      <MdChevronRight
                        className="shrink-0 text-lg text-slate-400"
                        aria-hidden
                      />
                    ) : null}
                  </button>
                );
              })
            )}
            <button
              type="button"
              onClick={() => {
                setMobileFullMenuOpen(false);
                setShowLogoutConfirm(true);
              }}
              className="flex w-full items-center gap-3 border-b border-slate-200 px-4 py-3 text-left text-sm font-medium text-rose-700 transition-colors duration-150 active:bg-rose-50"
            >
              <span className="text-xl">
                <MdLogout />
              </span>
              Sign out
            </button>
          </div>
        </div>

        {/* Right sheet: submenu when a section has children (animated) */}
        <div
          className={`fixed inset-0 z-[10047] bg-slate-900/30 transition-opacity duration-300 ease-out ${
            mobileSubParent && mobileSubParent.children.length > 0
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0"
          }`}
          onClick={() => setMobileSubParent(null)}
          aria-hidden={!mobileSubParent}
        />
        <aside
          className={`fixed right-0 top-0 z-[10048] flex h-full flex-col transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform lg:hidden ${MOBILE_DRAWER_PANEL} ${
            mobileSubParent && mobileSubParent.children.length > 0
              ? "pointer-events-auto translate-x-0"
              : "pointer-events-none translate-x-full"
          }`}
          style={{
            width: "min(80vw, 22rem)",
          }}
          aria-label={
            mobileSubParent ? `${mobileSubParent.name} links` : "Submenu"
          }
          aria-hidden={!mobileSubParent}
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-3">
            <span className="min-w-0 truncate text-sm font-semibold text-slate-900">
              {mobileSubParent?.name ?? ""}
            </span>
            <button
              type="button"
              onClick={() => setMobileSubParent(null)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition active:scale-95"
              aria-label="Close submenu"
            >
              <MdClose className="text-xl" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {(mobileSubParent?.children ?? []).map((sub) => {
              const subActive = Boolean(
                sub.path && pathname?.startsWith(sub.path),
              );
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => {
                    handleSubClick(sub);
                    setMobileSubParent(null);
                  }}
                  className={`w-full border-b border-slate-200 px-4 py-3 text-left text-sm font-medium transition-colors duration-150 ${
                    subActive
                      ? "bg-slate-100 text-amber-900"
                      : "text-slate-800 active:bg-slate-50"
                  }`}
                >
                  {sub.name}
                </button>
              );
            })}
          </div>
        </aside>
      </div>

      {logoutDialog ? createPortal(logoutDialog, document.body) : null}
    </>
  );
}

export default LeftSideBar;
