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
  keywords?: string[];
};

export const USER_DASHBOARD_NAV_ITEMS: UserDashboardNavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: MdDashboard,
    href: "/user-dashboard/[org_id]/home",
    description: "Home overview & quick actions",
    keywords: ["home", "overview", "workspace"],
  },
  {
    id: "my-team",
    label: "My team",
    icon: MdGroups,
    href: "/user-dashboard/[org_id]/my-team",
    description: "Team members & leave approvals",
    keywords: ["team", "members", "manager"],
  },
  {
    id: "asset-handover",
    label: "Asset handover",
    icon: MdInventory2,
    href: "/user-dashboard/[org_id]/asset-handover",
    description: "Assigned assets & handover",
    keywords: ["assets", "inventory", "equipment"],
  },
  {
    id: "my-leaves",
    label: "My leaves",
    icon: MdCalendarMonth,
    href: "/user-dashboard/[org_id]/my-leaves",
    description: "Apply & track leave requests",
    keywords: ["leave", "vacation", "pto", "apply leave"],
  },
  {
    id: "attendance-history",
    label: "Attendance history",
    icon: LuFileSpreadsheet,
    href: "/user-dashboard/[org_id]/attendance-history",
    description: "Punch log & hours summary",
    keywords: ["attendance", "punch", "hours", "history"],
  },
  {
    id: "tasks-management",
    label: "Tasks",
    icon: BiTask,
    href: "/user-dashboard/[org_id]/tasks-management",
    description: "Your task assignments",
    keywords: ["tasks", "projects", "assignments"],
  },
  {
    id: "chat",
    label: "Chat",
    icon: MdOutlineChat,
    href: "/user-dashboard/[org_id]/sync-connection",
    description: "Messages & sync connection",
    keywords: ["chat", "messages", "sync"],
  },
  {
    id: "exit-process",
    label: "Exit process",
    icon: MdExitToApp,
    href: "/user-dashboard/[org_id]/exit-process",
    description: "Offboarding & exit requests",
    keywords: ["exit", "resign", "offboarding"],
  },
];

export const USER_DASHBOARD_BOTTOM_TAB_IDS = ["dashboard", "my-leaves", "chat"] as const;

export const MAX_USER_MOBILE_BOTTOM_SLOTS = 3;

type NavIconTheme = {
  bg: string;
  text: string;
  activeBg: string;
  activeRing: string;
};

export const USER_NAV_ICON_THEMES: Record<string, NavIconTheme> = {
  dashboard: {
    bg: "bg-sky-50",
    text: "text-sky-600",
    activeBg: "bg-sky-100",
    activeRing: "ring-sky-200/80",
  },
  "my-team": {
    bg: "bg-violet-50",
    text: "text-violet-600",
    activeBg: "bg-violet-100",
    activeRing: "ring-violet-200/80",
  },
  "asset-handover": {
    bg: "bg-amber-50",
    text: "text-amber-600",
    activeBg: "bg-amber-100",
    activeRing: "ring-amber-200/80",
  },
  "my-leaves": {
    bg: "bg-fuchsia-50",
    text: "text-fuchsia-600",
    activeBg: "bg-fuchsia-100",
    activeRing: "ring-fuchsia-200/80",
  },
  "attendance-history": {
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    activeBg: "bg-emerald-100",
    activeRing: "ring-emerald-200/80",
  },
  "tasks-management": {
    bg: "bg-purple-50",
    text: "text-purple-600",
    activeBg: "bg-purple-100",
    activeRing: "ring-purple-200/80",
  },
  chat: {
    bg: "bg-cyan-50",
    text: "text-cyan-600",
    activeBg: "bg-cyan-100",
    activeRing: "ring-cyan-200/80",
  },
  "exit-process": {
    bg: "bg-rose-50",
    text: "text-rose-600",
    activeBg: "bg-rose-100",
    activeRing: "ring-rose-200/80",
  },
};

const DEFAULT_USER_NAV_ICON_THEME: NavIconTheme = {
  bg: "bg-slate-50",
  text: "text-slate-600",
  activeBg: "bg-slate-100",
  activeRing: "ring-slate-200/80",
};

export function userNavIconTheme(id: string): NavIconTheme {
  return USER_NAV_ICON_THEMES[id] ?? DEFAULT_USER_NAV_ICON_THEME;
}

export function userNavIconBadgeCls(id: string, active: boolean, size: "md" | "sm" = "md"): string {
  const theme = userNavIconTheme(id);
  const dim = size === "sm" ? "h-8 w-8 rounded-lg" : "h-9 w-9 rounded-xl";
  return `flex ${dim} shrink-0 items-center justify-center transition-all duration-200 ${
    active
      ? `${theme.activeBg} ${theme.text} ring-2 ${theme.activeRing}`
      : `${theme.bg} ${theme.text} group-hover:scale-105`
  }`;
}

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

export function userBottomTabShortLabel(item: UserDashboardNavItem): string {
  switch (item.id) {
    case "dashboard":
      return "Home";
    case "my-team":
      return "Team";
    case "asset-handover":
      return "Handover";
    case "my-leaves":
      return "Leaves";
    case "attendance-history":
      return "History";
    case "tasks-management":
      return "Tasks";
    case "chat":
      return "Chat";
    case "exit-process":
      return "Exit";
    default:
      return item.label.length > 11 ? `${item.label.slice(0, 10)}…` : item.label;
  }
}

export type UserFeatureSearchEntry = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  icon: UserDashboardNavIcon;
};

export function buildUserFeatureSearchCatalog(orgId: string): UserFeatureSearchEntry[] {
  return USER_DASHBOARD_NAV_ITEMS.map((item) => ({
    id: item.id,
    title: item.label,
    subtitle: item.description,
    href: resolveUserDashboardHref(item.href, orgId),
    icon: item.icon,
  }));
}

export function filterUserFeatureSearchCatalog(
  catalog: UserFeatureSearchEntry[],
  query: string,
): UserFeatureSearchEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return catalog.filter((entry) => {
    const item = USER_DASHBOARD_NAV_ITEMS.find((n) => n.id === entry.id);
    const haystack = [
      entry.title,
      entry.subtitle,
      ...(item?.keywords ?? []),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q) || q.split(/\s+/).every((word) => haystack.includes(word));
  });
}

export function highlightUserSearchMatch(
  text: string,
  query: string,
): { text: string; match: boolean }[] {
  const q = query.trim();
  if (!q) return [{ text, match: false }];
  const lower = text.toLowerCase();
  const qLower = q.toLowerCase();
  const idx = lower.indexOf(qLower);
  if (idx === -1) return [{ text, match: false }];
  const parts: { text: string; match: boolean }[] = [];
  if (idx > 0) parts.push({ text: text.slice(0, idx), match: false });
  parts.push({ text: text.slice(idx, idx + q.length), match: true });
  if (idx + q.length < text.length) {
    parts.push({ text: text.slice(idx + q.length), match: false });
  }
  return parts;
}
