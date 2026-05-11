import { PortalFeature } from "@/services/organization";
import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import { useRouter, useParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BiSolidUserPlus } from "react-icons/bi";
import {
  MdAdminPanelSettings,
  MdEvent,
  MdFactCheck,
  MdHistory,
  MdHome,
  MdMoreHoriz,
  MdSchedule,
  MdSettings,
  MdMenu,
  MdVpnKey,
  MdWifi,
} from "react-icons/md";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

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
  requiredFeature?: string;
};

function LeftSideBar({
  accessableFeatures,
}: {
  accessableFeatures: PortalFeature[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const orgId = String(params?.org_id ?? "1");
  const base = `/dashboard/${orgId}`;
  const dashboardCtx = useManagementDashboardContext();
  const effectiveRoleName =
    dashboardCtx?.user?.user_role_name ?? readRoleNameFromToken();
  const isAdmin = String(effectiveRoleName || "").trim().toLowerCase() === "admin";
  const myHistoryActive = Boolean(pathname?.includes("/my-attendance-history"));
  const [resolvedFeatures, setResolvedFeatures] = useState<PortalFeature[]>(
    Array.isArray(accessableFeatures) ? accessableFeatures : [],
  );

  useEffect(() => {
    let cancelled = false;
    async function ensureFeatures() {
      try {
        const fromSession = sessionStorage.getItem("accessible_features");
        if (fromSession) {
          const parsed = JSON.parse(fromSession) as PortalFeature[];
          if (!cancelled && Array.isArray(parsed) && parsed.length > 0) {
            setResolvedFeatures(parsed);
            return;
          }
        }
      } catch {
        // ignore session parse issues
      }

      if (Array.isArray(accessableFeatures) && accessableFeatures.length > 0) {
        setResolvedFeatures(accessableFeatures);
        try {
          sessionStorage.setItem(
            "accessible_features",
            JSON.stringify(accessableFeatures),
          );
        } catch {
          // ignore quota / private mode
        }
        return;
      }

      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await fetch(`${API_URL}/api/auth/get-accessible-features`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json()) as {
          accessible_features?: PortalFeature[];
        };
        if (!res.ok) return;
        const list = Array.isArray(data.accessible_features)
          ? data.accessible_features
          : [];
        if (!cancelled) setResolvedFeatures(list);
        try {
          sessionStorage.setItem("accessible_features", JSON.stringify(list));
        } catch {
          // ignore quota / private mode
        }
      } catch {
        // silently ignore feature fetch issues
      }
    }
    void ensureFeatures();
    return () => {
      cancelled = true;
    };
  }, [accessableFeatures]);

  const accessibleTokens = useMemo(() => {
    const set = new Set<string>();
    for (const f of resolvedFeatures) {
      const vals = [
        f.feature_name,
        f.name,
        f.slug,
        (f as { feature_val?: string }).feature_val,
        (f as { value?: string }).value,
      ];
      for (const v of vals) {
        if (v && String(v).trim()) {
          set.add(String(v).trim().toLowerCase());
        }
      }
    }
    return set;
  }, [resolvedFeatures]);

  const hasFeatureAccess = useCallback((requiredFeature?: string) => {
    if (!requiredFeature) return true;
    const wanted = requiredFeature.toLowerCase();
    if (accessibleTokens.has(wanted)) return true;
    if (
      wanted === "get-organization" &&
      accessibleTokens.has("get-organization-info")
    )
      return true;
    return false;
  }, [accessibleTokens]);

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
            id: "manage-employees",
            name: "Manage Employees",
            path: `${base}/organization-employees/manage-employees`,
          },
          {
            id: "new-hires",
            name: "New Hires",
            path: `${base}/organization-employees/employee-onboarding`,
          },
          {
            id: "employee-leaves",
            name: "Manage Employee Leaves",
            path: `${base}/organization-employees/manage-employee-leaves`,
          }
        ],
        requiredFeature: "employee-management",
      },
      // employees-roles-management
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
        requiredFeature: "employees-roles-management",
      },
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
        requiredFeature: "organization-roles",
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
          {
            id: "get-employee-accessible-features",
            name: "Get Employee Accessible Features",
            path: `${base}/organization-features/get-employee-accessible-features`,
          },
          //assign-features-role-wise
          {
            id: "assign-features-role-wise",
            name: "Assign Features Role Wise",
            path: `${base}/organization-features/assign-features-role-wise`,
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
    ],
    [base],
  );

  const filteredNavItems = useMemo(() => {
    const result: NavItem[] = [];
    for (const item of navItems) {
      if (!hasFeatureAccess(item.requiredFeature)) continue;
      const children = item.children;
      result.push({
        ...item,
        children,
        path: item.path ?? children[0]?.path,
      });
    }
    return result;
  }, [navItems, hasFeatureAccess]);

  const [activeMain, setActiveMain] = useState("organization");
  const [activeSub, setActiveSub] = useState("employee");

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

  const handleMoreClick = () => {
    setActiveMain("more");
    router.push(`${base}/home`);
  };

  return (
    <div className="flex h-screen sticky top-0">
      {/* ── LEFT RAIL ── */}
      <div
        className="flex flex-col items-center w-[72px] py-3 overflow-y-auto overflow-x-hidden flex-shrink-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        style={{ backgroundColor: "#131C23" }}
      >
        <div className="flex flex-col items-center w-full flex-1">
          {filteredNavItems.map((item) => {
            const isActive = activeMain === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleMainClick(item)}
                className={`
                  relative flex flex-col items-center justify-center w-full px-1 py-[10px] gap-[5px]
                  cursor-pointer transition-all duration-150 border-0 bg-transparent outline-none
                  ${
                    isActive
                      ? "text-white bg-white/[0.06]"
                      : "text-[#8A9BAD] hover:text-[#CBD5DF] hover:bg-white/[0.04]"
                  }
                `}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[55%] bg-[#C99237] rounded-r-[2px]" />
                )}

                <span className="text-[20px] leading-none flex items-center justify-center">
                  {item.icon}
                </span>

                <span
                  className="text-[10px] font-medium text-center leading-[1.25] w-full px-1"
                  style={{
                    letterSpacing: "0.01em",
                    wordBreak: "break-word",
                    hyphens: "auto",
                  }}
                >
                  {item.name}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col items-center w-full">
          {isAdmin ? (
            <>
              <button
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
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => router.push(`${base}/my-attendance-history`)}
              className={`
              relative flex flex-col items-center justify-center w-full px-1 py-[10px] gap-[5px]
              cursor-pointer transition-all duration-150 border-0 bg-transparent outline-none
              ${
                myHistoryActive
                  ? "text-white bg-white/[0.06]"
                  : "text-[#8A9BAD] hover:text-[#CBD5DF] hover:bg-white/[0.04]"
              }
            `}
              title="View your own attendance history (read-only)"
            >
              {myHistoryActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[55%] bg-[#C99237] rounded-r-[2px]" />
              )}
              <span className="text-[20px] leading-none flex items-center justify-center">
                <MdHistory />
              </span>
              <span
                className="text-[10px] font-medium text-center leading-[1.25] w-full px-1"
                style={{
                  letterSpacing: "0.01em",
                  wordBreak: "break-word",
                  hyphens: "auto",
                }}
              >
                My attendance
              </span>
            </button>
          )}
        </div>
      </div>

      {subItems.length > 0 && (
        <div
          className="flex flex-col w-48 py-4 flex-shrink-0 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          style={{ backgroundColor: "#1E2C39" }}
        >
          {subItems.map((sub) => {
            const isSubActive = activeSub === sub.id;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => handleSubClick(sub)}
                className={`
                  w-full text-left px-5 py-[10px] text-[13.5px] font-medium
                  cursor-pointer transition-all duration-150 border-0 bg-transparent outline-none
                  ${
                    isSubActive
                      ? "text-[#C99237] bg-white/[0.05]"
                      : "text-[#8A9BAD] hover:text-[#CBD5DF] hover:bg-white/[0.04]"
                  }
                `}
              >
                {sub.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default LeftSideBar;
