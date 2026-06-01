"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { OrganizationAddress } from "@/services/organization";
import type { RightMainSideOrganization, RightMainSideUser } from "./RightMainSide";

export type ManagementDashboardContextValue = {
  organization: RightMainSideOrganization | null;
  user: RightMainSideUser | null;
  organizationAddresses: OrganizationAddress[];
  loading: boolean;
};

const ManagementDashboardContext = createContext<ManagementDashboardContextValue | null>(
  null,
);

export function ManagementDashboardProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: ManagementDashboardContextValue;
}) {
  return (
    <ManagementDashboardContext.Provider value={value}>
      {children}
    </ManagementDashboardContext.Provider>
  );
}

/** Safe for routes that may render outside management layout (e.g. other org IDs). */
export function useManagementDashboardContext(): ManagementDashboardContextValue | null {
  return useContext(ManagementDashboardContext);
}
