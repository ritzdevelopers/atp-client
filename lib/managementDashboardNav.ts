import type { ComponentType } from "react";
import { BiSolidUserPlus, BiTask } from "react-icons/bi";
import {
  MdAdminPanelSettings,
  MdEvent,
  MdFactCheck,
  MdHistory,
  MdHome,
  MdOutlineChat,
  MdOutlineEventNote,
  MdOutlineManageAccounts,
  MdPayments,
  MdSchedule,
  MdSpaceDashboard,
  MdVpnKey,
  MdWifi,
} from "react-icons/md";
import { Package } from "lucide-react";
import {
  organizationHasParentFeature,
  organizationHasSubFeature,
  type OrgFeatureGroup,
} from "@/lib/orgFeatureAccess";

export type ManagementNavIcon = ComponentType<{ className?: string }>;

export type ManagementNavTile = {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: ManagementNavIcon;
  requiredFeature?: string;
  requiredFeatureAny?: string[];
  parentFeatureKey?: string;
  subFeatureId?: string;
};

type NavTemplate = Omit<ManagementNavTile, "href"> & {
  path: string;
};

function dashboardPath(orgId: string | number, suffix: string): string {
  const base = `/dashboard/${encodeURIComponent(String(orgId))}`;
  return suffix.startsWith("/") ? `${base}${suffix}` : `${base}/${suffix}`;
}

function templatesForOrg(orgId: string | number): NavTemplate[] {
  return [
    {
      id: "home",
      label: "Home",
      description: "Organization overview",
      path: "/home",
      icon: MdHome,
      requiredFeature: "get-organization-info",
    },
    {
      id: "manage-employees",
      label: "Manage employees",
      description: "Employee directory",
      path: "/organization-employees/manage-employees",
      icon: BiSolidUserPlus,
      requiredFeature: "employee-management",
      parentFeatureKey: "employee-management",
      subFeatureId: "manage-employee",
    },
    {
      id: "employee-onboarding",
      label: "New hires",
      description: "Onboarding pipeline",
      path: "/organization-employees/employee-onboarding",
      icon: BiSolidUserPlus,
      requiredFeature: "employee-management",
      parentFeatureKey: "employee-management",
      subFeatureId: "employee-onboarding",
    },
    {
      id: "background-verification",
      label: "Background verification",
      description: "Verification queue",
      path: "/organization-employees/background-verification",
      icon: BiSolidUserPlus,
      requiredFeature: "employee-management",
      parentFeatureKey: "employee-management",
      subFeatureId: "background-verification",
    },
    {
      id: "manage-employee-leaves",
      label: "Manage employee leaves",
      description: "Review leave requests",
      path: "/organization-employees/manage-employee-leaves",
      icon: MdOutlineEventNote,
      requiredFeature: "employee-management",
      parentFeatureKey: "employee-management",
      subFeatureId: "employee-leave-management",
    },
    {
      id: "create-team",
      label: "Team creation",
      description: "Create new teams",
      path: "/organization-employees/create-team",
      icon: BiSolidUserPlus,
      requiredFeature: "employee-management",
      parentFeatureKey: "employee-management",
      subFeatureId: "create-team",
    },
    {
      id: "team-management",
      label: "Team management",
      description: "Manage org teams",
      path: "/organization-employees/manage-teams",
      icon: BiSolidUserPlus,
      requiredFeature: "employee-management",
      parentFeatureKey: "employee-management",
      subFeatureId: "team-management",
    },
    {
      id: "organization-roles",
      label: "Organization roles",
      description: "Roles & permissions",
      path: "/organization-roles/manage-roles",
      icon: MdAdminPanelSettings,
      requiredFeatureAny: ["employees-roles-management", "organization-roles"],
    },
    {
      id: "manage-organization-features",
      label: "Organization features",
      description: "Feature access control",
      path: "/organization-features/manage-organization-features",
      icon: MdVpnKey,
      requiredFeature: "employees-features-management",
      parentFeatureKey: "employees-features-management",
      subFeatureId: "manage-organization-features",
    },
    {
      id: "assign-features-to-the-employee",
      label: "Assign features",
      description: "Per-employee access",
      path: "/organization-features/assign-features-to-the-employee",
      icon: MdVpnKey,
      requiredFeature: "employees-features-management",
      parentFeatureKey: "employees-features-management",
      subFeatureId: "assign-features-to-the-employee",
    },
    {
      id: "assign-dashboard-to-employee",
      label: "Assign dashboards",
      description: "Employee dashboards",
      path: "/dashboard-management/assign-dashboard-to-employee",
      icon: MdSpaceDashboard,
      requiredFeature: "dashboard-management",
      parentFeatureKey: "dashboard-management",
      subFeatureId: "assign-dashboard-to-employee",
    },
    {
      id: "create-new-ip-address",
      label: "Create IP address",
      description: "Add allowed IP",
      path: "/organization-settings/create-new-ip-address",
      icon: MdWifi,
      requiredFeature: "company-ip-addresses-management",
      parentFeatureKey: "company-ip-addresses-management",
      subFeatureId: "create-new-ip-address",
    },
    {
      id: "manage-ip-addresses",
      label: "Manage IP addresses",
      description: "Office IP allowlist",
      path: "/organization-settings/manage-ip-addresses",
      icon: MdWifi,
      requiredFeature: "company-ip-addresses-management",
      parentFeatureKey: "company-ip-addresses-management",
      subFeatureId: "manage-ip-addresses",
    },
    {
      id: "manage-company-shifts",
      label: "Manage shifts",
      description: "Shift schedules",
      path: "/organization-settings/manage-company-shifts",
      icon: MdSchedule,
      requiredFeature: "company-shift-management",
      parentFeatureKey: "company-shift-management",
      subFeatureId: "manage-shifts",
    },
    {
      id: "create-company-shifts",
      label: "Create shift",
      description: "New shift template",
      path: "/organization-settings/create-company-shifts",
      icon: MdSchedule,
      requiredFeature: "company-shift-management",
      parentFeatureKey: "company-shift-management",
      subFeatureId: "create-new-shift",
    },
    {
      id: "organization-holidays",
      label: "Company holidays",
      description: "Holiday calendar",
      path: "/organization-settings/organization-holidays",
      icon: MdEvent,
      requiredFeature: "company-holiday-management",
      parentFeatureKey: "company-holiday-management",
      subFeatureId: "manage-holidays",
    },
    {
      id: "manage-attendance",
      label: "Manage attendance",
      description: "Org attendance records",
      path: "/attendance-management/manage-attendance",
      icon: MdFactCheck,
      requiredFeature: "company-attendance-management",
      parentFeatureKey: "company-attendance-management",
      subFeatureId: "manage-attendances",
    },
    {
      id: "manage-leave-types",
      label: "Manage leave types",
      description: "Leave policies",
      path: "/organization-leave/manage-leave-types",
      icon: MdOutlineEventNote,
      requiredFeature: "company-leave-management",
      parentFeatureKey: "company-leave-management",
      subFeatureId: "manage-leave-types",
    },
    {
      id: "manage-employee-salary",
      label: "Manage salary",
      description: "Payroll & compensation",
      path: "/organization-payroll-management/manage-employee-salary",
      icon: MdPayments,
      requiredFeature: "payroll-management",
      parentFeatureKey: "payroll-management",
      subFeatureId: "manage-salary",
    },
    {
      id: "manage-employees-tasks",
      label: "Employee tasks",
      description: "Task overview",
      path: "/tasks-management/manage-employees-tasks",
      icon: BiTask,
      requiredFeature: "task-management",
      parentFeatureKey: "task-management",
      subFeatureId: "manage-employees-tasks",
    },
    {
      id: "assign-task-to-employees",
      label: "Assign tasks",
      description: "Delegate work",
      path: "/tasks-management/assign-task-to-employees",
      icon: BiTask,
      requiredFeature: "task-management",
      parentFeatureKey: "task-management",
      subFeatureId: "assign-task-to-employees",
    },
    {
      id: "manage-organization-information",
      label: "Organization info",
      description: "Company profile & addresses",
      path: "/organization-settings/manage-organization-information",
      icon: MdOutlineManageAccounts,
      requiredFeature: "manage-organization-information",
    },
    {
      id: "my-attendance-history",
      label: "My attendance",
      description: "Your punch history",
      path: "/my-attendance-history",
      icon: MdHistory,
    },
    {
      id: "sync-connection",
      label: "Chat",
      description: "Messages & calls",
      path: "/sync-connection",
      icon: MdOutlineChat,
    },
    {
      id: "asset-handover",
      label: "Asset handover",
      description: "Assigned assets",
      path: "/asset-handover",
      icon: Package,
    },
  ];
}

export function buildManagementDashboardNavTiles(
  orgId: string | number,
): ManagementNavTile[] {
  return templatesForOrg(orgId).map((item) => ({
    id: item.id,
    label: item.label,
    description: item.description,
    href: dashboardPath(orgId, item.path),
    icon: item.icon,
    requiredFeature: item.requiredFeature,
    requiredFeatureAny: item.requiredFeatureAny,
    parentFeatureKey: item.parentFeatureKey,
    subFeatureId: item.subFeatureId,
  }));
}

export function filterManagementNavTiles(
  tiles: ManagementNavTile[],
  groups: OrgFeatureGroup[],
  isAdmin: boolean,
): ManagementNavTile[] {
  if (isAdmin) return tiles;

  return tiles.filter((tile) => {
    if (!tile.requiredFeature && !tile.requiredFeatureAny?.length) {
      return true;
    }

    const matchedParentSlug = tile.requiredFeatureAny?.length
      ? tile.requiredFeatureAny.find((slug) =>
          organizationHasParentFeature(groups, slug),
        )
      : tile.requiredFeature;

    const canSeeParent = tile.requiredFeatureAny?.length
      ? Boolean(matchedParentSlug)
      : organizationHasParentFeature(groups, tile.requiredFeature);

    if (!canSeeParent) return false;

    if (!tile.subFeatureId || !tile.parentFeatureKey) return true;

    return organizationHasSubFeature(
      groups,
      matchedParentSlug || tile.parentFeatureKey,
      tile.subFeatureId,
    );
  });
}

export function managementRouteActive(
  pathname: string | null,
  href: string,
): boolean {
  if (!pathname) return false;
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}
