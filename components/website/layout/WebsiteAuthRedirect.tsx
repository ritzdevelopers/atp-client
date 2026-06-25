"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { getMe, type ApiError } from "@/services/auth";

const PORTAL_ENTRANCE_PATH = "/dashboard";
const ADMIN_PORTAL_PATH = "/portal";

const AUTO_REDIRECT_PATHS = new Set([
  "/",
  "/login",
  "/about",
  "/pricing",
  "/contact",
]);

function resolvePortalPath(result: unknown): string | null {
  const role = String((result as { role?: string })?.role ?? "")
    .trim()
    .toLowerCase();
  if (role === "admin") return ADMIN_PORTAL_PATH;
  if (role === "hr" || role === "manager" || role === "employee") {
    return PORTAL_ENTRANCE_PATH;
  }
  return null;
}

export default function WebsiteAuthRedirect() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!AUTO_REDIRECT_PATHS.has(pathname)) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    let cancelled = false;

    const redirectAuthenticatedUser = async () => {
      try {
        const result = await getMe(token);
        if (cancelled) return;

        const portalPath = resolvePortalPath(result);
        if (portalPath) {
          router.replace(portalPath);
        }
      } catch (error) {
        if (cancelled) return;
        const apiError = error as ApiError;
        if (apiError.status === 401 || apiError.status === 403) {
          localStorage.removeItem("token");
          localStorage.removeItem("org_id");
          localStorage.removeItem("user_id");
          localStorage.removeItem("dashboard_type");
        }
      }
    };

    void redirectAuthenticatedUser();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return null;
}
