import { PortalFeature } from "@/services/organization";
import { useRouter, useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { BiSolidUserPlus } from "react-icons/bi";
import {
  MdApartment,
  MdHome,
  MdMoreHoriz,
  MdSettings,
  MdMenu,
  MdSecurity,
} from "react-icons/md";

type NavSubItem = {
  id: string;
  name: string;
  /** If set, sub-item navigates here when clicked. */
  path?: string;
};

type NavItem = {
  id: string;
  name: string;
  value: string;
  icon: React.ReactNode;
  children: NavSubItem[];
  /** If set, main item navigates here when clicked. Omit to only expand / show sub-menu. */
  path?: string;
};

function LeftSideBar({
  accessableFeatures,
}: {
  accessableFeatures: PortalFeature[];
}) {
  const router = useRouter();
  const params = useParams();
  const orgId = String(params?.org_id ?? "1");
  const base = `/dashboard/${orgId}`;
  console.log("accessableFeatures", accessableFeatures);
  const navItems: NavItem[] = useMemo(
    () => [
      {
        id: "home",
        name: "Home",
        value: "get-organization",
        icon: <MdHome />,
        children: [],
        path: `${base}/home`,
      },

      {
        id: "employee-onboarding",
        name: "Employee Onboarding",
        value: "employee-onboarding",
        icon: <BiSolidUserPlus />,
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
        ],
        path: `${base}/organization-employees/manage-employees`,
      },
      {
        id: "organization-roles",
        name: "Organization Roles",
        value: "organization-roles",
        icon: <MdSecurity />,
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
      },
    ],
    [base],
  );

  const [activeMain, setActiveMain] = useState("organization");
  const [activeSub, setActiveSub] = useState("employee");

  const activeItem = navItems.find((item) => item.id === activeMain);
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
    router.push(base);
  };

  return (
    <div className="flex h-screen sticky top-0">
      {/* ── LEFT RAIL ── */}
      <div
        className="flex flex-col items-center w-[72px] py-3 overflow-y-auto overflow-x-hidden flex-shrink-0 scrollbar-hide"
        style={{ backgroundColor: "#131C23" }}
      >
        <div className="flex flex-col items-center w-full flex-1">
          {navItems.map((item) => {
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
        </div>
      </div>

      {subItems.length > 0 && (
        <div
          className="flex flex-col w-48 py-4 flex-shrink-0 overflow-y-auto"
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
