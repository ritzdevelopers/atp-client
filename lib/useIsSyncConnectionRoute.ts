"use client";

import { usePathname } from "next/navigation";

export function useIsSyncConnectionRoute(): boolean {
  const pathname = usePathname();
  return Boolean(pathname?.includes("/sync-connection"));
}
