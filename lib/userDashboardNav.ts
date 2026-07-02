import type { ComponentType } from "react";
import {
  MdCalendarMonth,
  MdDashboard,
  MdExitToApp,
  MdGroups,
  MdInventory2,
  MdOutlineChat,
} from "react-icons/md";
import { BiTask } from "react-icons/bi";
import { LuFileSpreadsheet } from "react-icons/lu";

export type UserDashboardNavIcon = ComponentType<{ className?: string }>;

export type UserDashboardNavItem = {
  id: string;
  label: string;
  icon: UserDashboardNavIcon;
  href: string;
  description: string;
};

export const USER_DASHBOARD_NAV_ITEMS: UserDashboardNavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: MdDashboard,
    href: "/user-dashboard/[org_id]/home",
    description: "Home overview",
  },
  {
    id: "my-team",
    label: "My team",
    icon: MdGroups,
    href: "/user-dashboard/[org_id]/my-team",
    description: "Team members & leave",
  },
  {
    id: "asset-handover",
    label: "Asset handover",
    icon: MdInventory2,
    href: "/user-dashboard/[org_id]/asset-handover",
    description: "Assigned assets",
  },
  {
    id: "my-leaves",
    label: "My leaves",
    icon: MdCalendarMonth,
    href: "/user-dashboard/[org_id]/my-leaves",
    description: "Apply & track leave",
  },
  {
    id: "attendance-history",
    label: "Attendance history",
    icon: LuFileSpreadsheet,
    href: "/user-dashboard/[org_id]/attendance-history",
    description: "Punch & hours log",
  },
  {
    id: "tasks-management",
    label: "Tasks",
    icon: BiTask,
    href: "/user-dashboard/[org_id]/tasks-management",
    description: "Your assignments",
  },
  {
    id: "chat",
    label: "Chat",
    icon: MdOutlineChat,
    href: "/user-dashboard/[org_id]/sync-connection",
    description: "Messages & calls",
  },
  {
    id: "exit-process",
    label: "Exit process",
    icon: MdExitToApp,
    href: "/user-dashboard/[org_id]/exit-process",
    description: "Offboarding",
  },
];

export function resolveUserDashboardHref(template: string, orgId: string): string {
  return template.replace("[org_id]", orgId);
}

export function userDashboardRouteActive(
  pathname: string | null,
  href: string,
): boolean {
  if (!pathname) return false;
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}
