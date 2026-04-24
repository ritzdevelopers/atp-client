import { useRouter } from "next/navigation";
import { useState } from "react";
import { BiSolidUser, BiSolidUserPlus } from "react-icons/bi";
import {
  MdApartment,
  MdHome,
  MdEventNote,
  MdAccessTime,
  MdSchedule,
  MdConnectingAirports,
  MdMoreHoriz,
  MdSettings,
  MdMenu,
  MdMiscellaneousServices,
} from "react-icons/md";

const navItems = [
  {
    id: "home",
    name: "Home",
    value: "get-organization",
    icon: <MdHome />,
    children: [],
    path: "/dashboard/1",
  },
  {
    id: "organization",
    name: "Organization",
    value: "get-organization",
    icon: <MdApartment />,
    children: [
      { id: "department", name: "Department", path: "/dashboard/1" },
      {
        id: "designation",
        name: "Designation",
        path: "/dashboard/1/designation",
      },
      { id: "employee", name: "Employee", path: "/dashboard/1" },
      {
        id: "exit-details",
        name: "Exit Details",
        path: "/dashboard/1",
      },
      {
        id: "company-policy",
        name: "Company Policy",
        path: "/dashboard/1",
      },
      {
        id: "offer-letter",
        name: "Offer Letter Form",
        path: "/dashboard/1",
      },
      {
        id: "travel-expense",
        name: "Travel Expense",
        path: "/dashboard/1",
      },
    ],
  },

  {
    id: "employee-onboarding",
    name: "Employee Onboarding",
    value: "employee-onboarding",
    icon: <BiSolidUserPlus />,
    children: [
      {
        id: "onboarding-tasks",
        name: "Onboarding Tasks",
        path: "/dashboard/1",
      },
      { id: "new-hires", name: "New Hires", path: "/dashboard/1" },
    ],
    path: "/dashboard/1",
  },
];

function LeftSideBar() {
  const [activeMain, setActiveMain] = useState("organization");
  const [activeSub, setActiveSub] = useState("employee");
  const router = useRouter();
  const activeItem = navItems.find((item) => item.id === activeMain);
  const subItems = activeItem?.children || [];

  const handleMainClick = (item: (typeof navItems)[number]) => {
    if (item.path) {
      setActiveMain(item.id);
      router.push(`${item.path}`);

      if (item.children.length > 0) {
        setActiveSub(item.children[0].id);
      }
    } else {
      setActiveMain(item.id);
      if (item.children.length > 0) {
        setActiveSub(item.children[0].id);
      }
    }
  };

  const handleMoreClick = () => {
    setActiveMain("more");
    router.push("/dashboard/1");
  };

  return (
    <div className="flex h-screen">
      {/* ── LEFT RAIL ── */}
      <div
        className="flex flex-col items-center w-[72px] py-3 overflow-y-auto overflow-x-hidden flex-shrink-0 scrollbar-hide"
        style={{ backgroundColor: "#131C23" }}
      >
        {/* Nav Items */}
        <div className="flex flex-col items-center w-full flex-1">
          {navItems.map((item) => {
            const isActive = activeMain === item.id;
            return (
              <button
                key={item.id}
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
                {/* Active indicator bar */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[55%] bg-[#C99237] rounded-r-[2px]" />
                )}

                {/* Icon */}
                <span className="text-[20px] leading-none flex items-center justify-center">
                  {item.icon}
                </span>

                {/* Label — breaks long words so they wrap inside the narrow rail */}
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

        {/* Bottom: More + Settings + Hamburger */}
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

      {/* ── RIGHT SUB-MENU PANEL ── */}
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
                onClick={() => setActiveSub(sub.id)}
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
