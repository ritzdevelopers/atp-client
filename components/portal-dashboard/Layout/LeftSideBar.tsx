import { PortalFeature } from "@/services/organization";
import {
  fetchOrganizationFeatureGroups,
  organizationHasParentFeature,
  organizationHasSubFeature,
  persistOrganizationFeatureAccess,
  readOrganizationFeatureSnapshot,
  type OrgFeatureGroup,
} from "@/lib/orgFeatureAccess";
import { isCurrentUserOrgAdmin, readRoleNameFromToken } from "@/lib/orgAdminAccess";
import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import { useManagementShellOptional } from "@/components/portal-dashboard/Layout/ManagementShellContext";
import { useRouter, useParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  MdOutlineChat,
} from "react-icons/md";

/** Desktop (lg+) nav icons — mobile keeps `NavItem.icon` unchanged. */
const LG_ICON = "shrink-0 text-[17px] leading-none";

type NavIconTheme = {
  bg: string;
  text: string;
  activeBg: string;
  activeRing: string;
};

const NAV_ICON_THEMES: Record<string, NavIconTheme> = {
  home: {
    bg: "bg-sky-50",
    text: "text-sky-600",
    activeBg: "bg-sky-100",
    activeRing: "ring-sky-200/80",
  },
  "manage-organization-information": {
    bg: "bg-indigo-50",
    text: "text-indigo-600",
    activeBg: "bg-indigo-100",
    activeRing: "ring-indigo-200/80",
  },
  "employee-management": {
    bg: "bg-violet-50",
    text: "text-violet-600",
    activeBg: "bg-violet-100",
    activeRing: "ring-violet-200/80",
  },
  "employees-roles-management": {
    bg: "bg-amber-50",
    text: "text-amber-600",
    activeBg: "bg-amber-100",
    activeRing: "ring-amber-200/80",
  },
  "employees-features-management": {
    bg: "bg-rose-50",
    text: "text-rose-600",
    activeBg: "bg-rose-100",
    activeRing: "ring-rose-200/80",
  },
  "dashboard-management": {
    bg: "bg-cyan-50",
    text: "text-cyan-600",
    activeBg: "bg-cyan-100",
    activeRing: "ring-cyan-200/80",
  },
  "company-ip-addresses-management": {
    bg: "bg-teal-50",
    text: "text-teal-600",
    activeBg: "bg-teal-100",
    activeRing: "ring-teal-200/80",
  },
  "company-shift-management": {
    bg: "bg-blue-50",
    text: "text-blue-600",
    activeBg: "bg-blue-100",
    activeRing: "ring-blue-200/80",
  },
  "company-holiday-management": {
    bg: "bg-orange-50",
    text: "text-orange-600",
    activeBg: "bg-orange-100",
    activeRing: "ring-orange-200/80",
  },
  "company-attendance-management": {
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    activeBg: "bg-emerald-100",
    activeRing: "ring-emerald-200/80",
  },
  "company-leave-management": {
    bg: "bg-fuchsia-50",
    text: "text-fuchsia-600",
    activeBg: "bg-fuchsia-100",
    activeRing: "ring-fuchsia-200/80",
  },
  "payroll-management": {
    bg: "bg-lime-50",
    text: "text-lime-700",
    activeBg: "bg-lime-100",
    activeRing: "ring-lime-200/80",
  },
  "task-management": {
    bg: "bg-purple-50",
    text: "text-purple-600",
    activeBg: "bg-purple-100",
    activeRing: "ring-purple-200/80",
  },
};

const DEFAULT_NAV_ICON_THEME: NavIconTheme = {
  bg: "bg-slate-50",
  text: "text-slate-600",
  activeBg: "bg-slate-100",
  activeRing: "ring-slate-200/80",
};

function navIconTheme(id: string): NavIconTheme {
  return NAV_ICON_THEMES[id] ?? DEFAULT_NAV_ICON_THEME;
}

function navIconBadgeCls(id: string, active: boolean): string {
  const theme = navIconTheme(id);
  return `flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${
    active
      ? `${theme.activeBg} ${theme.text} ring-2 ${theme.activeRing}`
      : `${theme.bg} ${theme.text} group-hover:scale-105`
  }`;
}

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
    case "task-management":
      return <BiTask className={LG_ICON} aria-hidden />;
    default:
      return fallback;
  }
}

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
  const managementShell = useManagementShellOptional();
  const appsPanelOpen = managementShell?.appsPanelOpen ?? false;
  const closeAppsPanel = managementShell?.closeAppsPanel;
  const [roleHydrated, setRoleHydrated] = useState(false);
  useEffect(() => {
    setRoleHydrated(true);
  }, []);
  const effectiveRoleName =
    dashboardCtx?.user?.user_role_name ?? readRoleNameFromToken();
  const isAdmin = isCurrentUserOrgAdmin(
    roleHydrated ? effectiveRoleName : null,
  );
  const myHistoryActive = Boolean(pathname?.includes("/my-attendance-history"));
  const chatActive = Boolean(pathname?.includes("/sync-connection"));
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
        children: [],
        path: `${base}/organization-roles/manage-roles`,
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
          // {
          //   id: "manage-assigned-dashboards",
          //   name: "Manage Assigned Dashboards",
          //   path: `${base}/dashboard-management/manage-assigned-dashboards`,
          // },
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
      let children: NavSubItem[] = [];
      if (item.children.length > 0) {
        children = item.children.filter((sub) =>
          hasSubFeatureAccess(parentFeatureKey, sub.id),
        );
        if (children.length === 0) continue;
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

  const allNavItemsForAdmin = useMemo(
    () =>
      navItems.map((item) => ({
        ...item,
        path: item.path ?? item.children[0]?.path,
      })),
    [navItems],
  );

  const visibleNavItems = isAdmin ? allNavItemsForAdmin : filteredNavItems;

  useEffect(() => {
    if (!featuresLoaded) return;
    const allowedPaths: string[] = [];
    for (const item of visibleNavItems) {
      if (item.path) allowedPaths.push(item.path);
      for (const sub of item.children) {
        if (sub.path) allowedPaths.push(sub.path);
      }
    }
    persistOrganizationFeatureAccess(orgId, orgFeatureGroups, allowedPaths);
  }, [orgId, orgFeatureGroups, visibleNavItems, featuresLoaded, pathname]);

  const [activeMain, setActiveMain] = useState("organization");
  const [activeSub, setActiveSub] = useState("employee");
  const [mobileFullMenuOpen, setMobileFullMenuOpen] = useState(false);
  const [mobileSubParent, setMobileSubParent] = useState<NavItem | null>(null);
  const [hoveredNavId, setHoveredNavId] = useState<string | null>(null);
  const hoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHoverCloseTimer = useCallback(() => {
    if (hoverCloseTimerRef.current != null) {
      clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
  }, []);

  const openHoverPanel = useCallback(
    (itemId: string) => {
      clearHoverCloseTimer();
      setHoveredNavId(itemId);
    },
    [clearHoverCloseTimer],
  );

  const scheduleHoverPanelClose = useCallback(() => {
    clearHoverCloseTimer();
    hoverCloseTimerRef.current = setTimeout(() => {
      setHoveredNavId(null);
      hoverCloseTimerRef.current = null;
    }, 180);
  }, [clearHoverCloseTimer]);

  useEffect(() => {
    return () => {
      clearHoverCloseTimer();
    };
  }, [clearHoverCloseTimer]);

  useEffect(() => {
    if (!appsPanelOpen) {
      setHoveredNavId(null);
      clearHoverCloseTimer();
      return;
    }
    const active = visibleNavItems.find((item) => item.id === activeMain);
    if (active && active.children.length > 0) {
      setHoveredNavId(active.id);
    }
  }, [appsPanelOpen, activeMain, visibleNavItems, clearHoverCloseTimer]);

  type BottomSlot = { kind: "nav"; item: NavItem } | { kind: "my-attendance" };

  const bottomSlots: BottomSlot[] = useMemo(() => {
    if (isAdmin) {
      const slots: BottomSlot[] = [];
      for (const id of ADMIN_BOTTOM_TAB_IDS) {
        const item = visibleNavItems.find((i) => i.id === id);
        if (item) slots.push({ kind: "nav", item });
      }
      return slots.slice(0, MAX_MOBILE_BOTTOM_NAV_SLOTS);
    }
    const slots: BottomSlot[] = [];
    const home = visibleNavItems.find((i) => i.id === "home");
    if (home) slots.push({ kind: "nav", item: home });
    slots.push({ kind: "my-attendance" });
    for (const item of visibleNavItems) {
      if (item.id === "home") continue;
      if (slots.length >= MAX_MOBILE_BOTTOM_NAV_SLOTS) break;
      slots.push({ kind: "nav", item });
    }
    return slots.slice(0, MAX_MOBILE_BOTTOM_NAV_SLOTS);
  }, [isAdmin, visibleNavItems]);

  useEffect(() => {
    if (!pathname || visibleNavItems.length === 0) return;
    let bestMain: string | null = null;
    let bestSubId: string | null = null;
    let bestLen = -1;
    for (const item of visibleNavItems) {
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
  }, [pathname, visibleNavItems]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setMobileFullMenuOpen(false);
      setMobileSubParent(null);
      closeAppsPanel?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeAppsPanel]);

  useEffect(() => {
    if (!managementShell) return;
    if (typeof window === "undefined") return;
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    if (!isDesktop) {
      setMobileSubParent(null);
      setMobileFullMenuOpen(appsPanelOpen);
    }
  }, [appsPanelOpen, managementShell]);

  useEffect(() => {
    if (!managementShell) return;
    if (typeof window === "undefined") return;
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    if (!isDesktop && !mobileFullMenuOpen && appsPanelOpen) {
      closeAppsPanel?.();
    }
  }, [mobileFullMenuOpen, appsPanelOpen, managementShell, closeAppsPanel]);

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
    if (visibleNavItems.length === 0) return;
    const t = window.setTimeout(() => {
      const active = visibleNavItems.find((item) => item.id === activeMain);
      if (!active) {
        setActiveMain(visibleNavItems[0].id);
        setActiveSub(visibleNavItems[0].children[0]?.id ?? "");
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
  }, [visibleNavItems, activeMain, activeSub]);

  const hoveredItem = hoveredNavId
    ? visibleNavItems.find((item) => item.id === hoveredNavId)
    : null;
  const flyoutSubItems = hoveredItem?.children ?? [];

  const handleMainClick = (item: NavItem) => {
    setActiveMain(item.id);
    if (item.children.length > 0) {
      setActiveSub(item.children[0].id);
      openHoverPanel(item.id);
      return;
    }
    if (item.path) {
      router.push(item.path);
      closeAppsPanel?.();
    }
  };

  const handleSubClick = (sub: NavSubItem) => {
    setActiveSub(sub.id);
    if (sub.path) {
      router.push(sub.path);
      closeAppsPanel?.();
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
      closeAppsPanel?.();
    },
    [router, closeAppsPanel],
  );

  const closeMobileDrawers = useCallback(() => {
    setMobileFullMenuOpen(false);
    setMobileSubParent(null);
    closeAppsPanel?.();
  }, [closeAppsPanel]);

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
      {/* Desktop (lg+): floating "Your Apps" panel — toggled from header menu */}
      <div className="pointer-events-none hidden lg:block" aria-hidden={!appsPanelOpen}>
        <div
          className={`fixed inset-0 z-[10015] bg-[#1F2937]/25 backdrop-blur-[3px] transition-opacity duration-300 ${
            appsPanelOpen
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0"
          }`}
          onClick={() => closeAppsPanel?.()}
          aria-hidden={!appsPanelOpen}
        />
        <div
          className={`fixed left-4 top-[calc(3.75rem+0.75rem)] z-[10020] flex items-start gap-2 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            appsPanelOpen
              ? "pointer-events-auto translate-x-0 opacity-100"
              : "pointer-events-none -translate-x-4 opacity-0"
          }`}
          onMouseLeave={scheduleHoverPanelClose}
        >
          <aside
            className={`flex max-h-[min(78vh,720px)] w-[min(19rem,88vw)] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_24px_64px_rgba(15,23,42,0.14)] ${
              appsPanelOpen ? "apps-panel-enter" : ""
            }`}
            role="dialog"
            aria-modal={appsPanelOpen}
            aria-label="Your apps"
            aria-hidden={!appsPanelOpen}
          >
            <div className="border-b border-slate-100 bg-gradient-to-r from-[#F8FAFC] via-white to-[#F0F9FF]/40 px-4 py-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                Your Apps
              </p>
              <p className="mt-0.5 text-[13px] font-medium text-slate-600">
                Hover a feature to see sub-pages
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 [scrollbar-width:thin]">
              {visibleNavItems.length === 0 ? (
                <p className="px-3 py-6 text-sm text-slate-500">
                  No features available for your role.
                </p>
              ) : (
                visibleNavItems.map((item) => {
                  const itemActive =
                    activeMain === item.id ||
                    Boolean(item.path && pathname?.startsWith(item.path)) ||
                    item.children.some(
                      (c) => c.path && pathname?.startsWith(c.path),
                    );
                  const isHovered = hoveredNavId === item.id;
                  const hasChildren = item.children.length > 0;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleMainClick(item)}
                      onMouseEnter={() => {
                        if (hasChildren) openHoverPanel(item.id);
                        else {
                          clearHoverCloseTimer();
                          setHoveredNavId(null);
                        }
                      }}
                      onFocus={() => {
                        if (hasChildren) openHoverPanel(item.id);
                      }}
                      className={`group relative mb-0.5 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] font-medium transition-all duration-200 ${
                        itemActive || isHovered
                          ? "bg-[#E8F4FB]/90 text-[#0077B6] shadow-[inset_3px_0_0_0_#008CD3]"
                          : "text-slate-700 hover:bg-slate-50 hover:text-[#008CD3]"
                      }`}
                    >
                      <span className={navIconBadgeCls(item.id, itemActive || isHovered)}>
                        {desktopNavIcon(item.id, item.icon)}
                      </span>
                      <span className="min-w-0 flex-1 leading-snug">{item.name}</span>
                      {hasChildren ? (
                        <MdChevronRight
                          className={`shrink-0 text-lg transition-all duration-200 ${
                            isHovered
                              ? "translate-x-0.5 text-[#008CD3]"
                              : "text-slate-400 group-hover:text-[#008CD3]"
                          }`}
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  );
                })
              )}

              <div className="my-2 border-t border-slate-100" />

              {!isAdmin ? (
                <button
                  type="button"
                  onClick={() => {
                    router.push(`${base}/my-attendance-history`);
                    closeAppsPanel?.();
                  }}
                  onMouseEnter={() => {
                    clearHoverCloseTimer();
                    setHoveredNavId(null);
                  }}
                  className={`group mb-0.5 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] font-medium transition-all duration-200 ${
                    myHistoryActive
                      ? "bg-[#E8F4FB]/90 text-[#0077B6] shadow-[inset_3px_0_0_0_#008CD3]"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className={navIconBadgeCls("company-attendance-management", myHistoryActive)}>
                    <MdHistory className={LG_ICON} aria-hidden />
                  </span>
                  My attendance
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  router.push(`${base}/sync-connection`);
                  closeAppsPanel?.();
                }}
                onMouseEnter={() => {
                  clearHoverCloseTimer();
                  setHoveredNavId(null);
                }}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] font-medium transition-all duration-200 ${
                  chatActive
                    ? "bg-[#E8F4FB]/90 text-[#0077B6] shadow-[inset_3px_0_0_0_#008CD3]"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className={navIconBadgeCls("dashboard-management", chatActive)}>
                  <MdOutlineChat className={LG_ICON} aria-hidden />
                </span>
                Team chat
              </button>
            </div>
          </aside>

          {flyoutSubItems.length > 0 && hoveredItem ? (
            <aside
              className="apps-subpanel-enter flex max-h-[min(78vh,720px)] w-[min(17rem,72vw)] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_20px_56px_rgba(15,23,42,0.12)]"
              role="navigation"
              aria-label={`${hoveredItem.name} sub-pages`}
              onMouseEnter={() => openHoverPanel(hoveredItem.id)}
              onMouseLeave={scheduleHoverPanelClose}
            >
              <div
                className={`border-b border-slate-100 px-4 py-3.5 ${navIconTheme(hoveredItem.id).bg}`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={navIconBadgeCls(hoveredItem.id, true)}>
                    {desktopNavIcon(hoveredItem.id, hoveredItem.icon)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-slate-900">
                      {hoveredItem.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {flyoutSubItems.length} sub-page
                      {flyoutSubItems.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 [scrollbar-width:thin]">
                {flyoutSubItems.map((sub, index) => {
                  const isSubActive = Boolean(
                    sub.path && pathname?.startsWith(sub.path),
                  );
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => handleSubClick(sub)}
                      className={`apps-subitem-enter mb-0.5 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition-all duration-200 ${
                        isSubActive
                          ? "bg-[#E8F4FB] text-[#0077B6] shadow-sm"
                          : "text-slate-700 hover:bg-slate-50 hover:pl-4 hover:text-[#008CD3]"
                      }`}
                      style={{ animationDelay: `${index * 35}ms` }}
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
                          isSubActive ? "bg-[#008CD3]" : "bg-slate-300"
                        }`}
                        aria-hidden
                      />
                      <span className="min-w-0 leading-snug">{sub.name}</span>
                    </button>
                  );
                })}
              </div>
            </aside>
          ) : null}
        </div>
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
          onClick={() => closeMobileDrawers()}
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
          <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-[#F8FAFC] to-white px-4 py-3">
            <div>
              <span className="text-sm font-semibold text-slate-900">
                Your Apps
              </span>
              <p className="text-[11px] text-slate-500">Tap a feature to open</p>
            </div>
            <button
              type="button"
              onClick={() => closeMobileDrawers()}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition active:scale-95"
              aria-label="Close menu"
            >
              <MdClose className="text-xl" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {visibleNavItems.length === 0 ? (
              <p className="border-b border-slate-200 px-4 py-3 text-sm text-slate-500">
                No features available for your role.
              </p>
            ) : (
              visibleNavItems.map((item) => {
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
                    className={`flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left text-sm font-medium transition-colors duration-150 ${
                      itemActive
                        ? "bg-[#E8F4FB]/80 text-[#0077B6]"
                        : "text-slate-800 active:bg-slate-100"
                    }`}
                  >
                    <span className={navIconBadgeCls(item.id, itemActive)}>
                      {desktopNavIcon(item.id, item.icon)}
                    </span>
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
                router.push(`${base}/sync-connection`);
              }}
              className={`flex w-full items-center gap-3 border-b border-slate-200 px-4 py-3 text-left text-sm font-medium transition-colors duration-150 active:bg-slate-100 ${
                chatActive
                  ? "bg-amber-50/80 text-amber-900"
                  : "text-slate-800"
              }`}
            >
              <span className="text-xl text-slate-600">
                <MdOutlineChat />
              </span>
              Team chat
            </button>
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
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-3 py-3">
            <div className="flex min-w-0 items-center gap-2">
              {mobileSubParent ? (
                <span className={navIconBadgeCls(mobileSubParent.id, true)}>
                  {desktopNavIcon(mobileSubParent.id, mobileSubParent.icon)}
                </span>
              ) : null}
              <span className="min-w-0 truncate text-sm font-semibold text-slate-900">
                {mobileSubParent?.name ?? ""}
              </span>
            </div>
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
                  className={`w-full border-b border-slate-100 px-4 py-3 text-left text-sm font-medium transition-all duration-200 ${
                    subActive
                      ? "bg-[#E8F4FB] text-[#0077B6]"
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
