"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ManagementShellContextValue = {
  appsPanelOpen: boolean;
  setAppsPanelOpen: (open: boolean) => void;
  toggleAppsPanel: () => void;
  closeAppsPanel: () => void;
};

const ManagementShellContext = createContext<ManagementShellContextValue | null>(
  null,
);

export function ManagementShellProvider({ children }: { children: ReactNode }) {
  const [appsPanelOpen, setAppsPanelOpen] = useState(false);

  const toggleAppsPanel = useCallback(() => {
    setAppsPanelOpen((open) => !open);
  }, []);

  const closeAppsPanel = useCallback(() => {
    setAppsPanelOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      appsPanelOpen,
      setAppsPanelOpen,
      toggleAppsPanel,
      closeAppsPanel,
    }),
    [appsPanelOpen, toggleAppsPanel, closeAppsPanel],
  );

  return (
    <ManagementShellContext.Provider value={value}>
      {children}
    </ManagementShellContext.Provider>
  );
}

export function useManagementShell(): ManagementShellContextValue {
  const ctx = useContext(ManagementShellContext);
  if (!ctx) {
    throw new Error("useManagementShell must be used within ManagementShellProvider");
  }
  return ctx;
}

/** Safe when layout may not wrap with shell provider. */
export function useManagementShellOptional(): ManagementShellContextValue | null {
  return useContext(ManagementShellContext);
}
