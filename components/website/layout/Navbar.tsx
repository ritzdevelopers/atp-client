"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getMe, type ApiError } from "@/services/auth";

const ADMIN_ORGS_SESSION_KEY = "admin_org_data";
const NAVBAR_AUTH_CACHE_KEY = "navbar_auth_cache_v1";

const baseNavLinks = [
  { label: "About Us", href: "/about" },
  { label: "Pricing", href: "/pricing" },
  { label: "Contact Us", href: "/contact" },
];

type CachedNavbarAuth = {
  isAuthenticated: boolean;
  role: string;
  orgId: string | null;
};

type Role = "admin" | "hr" | "manager" | "employee" | "";

function toRole(value: unknown): Role {
  const role = String(value || "").trim().toLowerCase();
  if (role === "admin" || role === "hr" || role === "manager" || role === "employee") {
    return role;
  }
  return "";
}

function pickOrgId(result: any): string | null {
  if (Array.isArray(result?.org_details) && result.org_details[0]?.id != null) {
    return String(result.org_details[0].id);
  }
  if (result?.org_details?.id != null) {
    return String(result.org_details.id);
  }
  if (result?.organization_id != null) {
    return String(result.organization_id);
  }
  if (result?.data?.org_id != null) {
    return String(result.data.org_id);
  }
  return null;
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [auth, setAuth] = useState<CachedNavbarAuth>({
    isAuthenticated: false,
    role: "",
    orgId: null,
  });
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const syncAuthState = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        if (isMounted) {
          sessionStorage.removeItem(NAVBAR_AUTH_CACHE_KEY);
          sessionStorage.removeItem(ADMIN_ORGS_SESSION_KEY);
          setAuth({ isAuthenticated: false, role: "", orgId: null });
          setIsAuthLoading(false);
        }
        return;
      }

      const cached = sessionStorage.getItem(NAVBAR_AUTH_CACHE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as CachedNavbarAuth;
          if (isMounted) {
            setAuth({
              isAuthenticated: Boolean(parsed?.isAuthenticated),
              role: toRole(parsed?.role),
              orgId: parsed?.orgId ? String(parsed.orgId) : null,
            });
            setIsAuthLoading(false);
          }
          // Still call getMe below so auth stays fresh and expired tokens are cleared.
        } catch {
          sessionStorage.removeItem(NAVBAR_AUTH_CACHE_KEY);
        }
      }

      try {
        const result: any = await getMe(token);
        if (!isMounted) {
          return;
        }

        const resolvedUserId = result?.admin_details?.id ?? result?.user_details?.id;
        if (resolvedUserId !== undefined && resolvedUserId !== null) {
          localStorage.setItem("user_id", String(resolvedUserId));
        }

        const role = toRole(result?.role ?? result?.data?.user_role ?? result?.data?.role_name);
        const orgId = pickOrgId(result);
        if (orgId) {
          localStorage.setItem("org_id", orgId);
        }

        const nextAuth: CachedNavbarAuth = {
          isAuthenticated: Boolean(result?.success) && Boolean(role),
          role,
          orgId,
        };

        setAuth(nextAuth);
        sessionStorage.setItem(NAVBAR_AUTH_CACHE_KEY, JSON.stringify(nextAuth));
        setIsAuthLoading(false);

        if (role === "admin" && Array.isArray(result?.org_details) && result.org_details.length > 0) {
          sessionStorage.setItem(
            ADMIN_ORGS_SESSION_KEY,
            JSON.stringify({
              user_role: role,
              org_details: result.org_details,
            }),
          );
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const apiError = error as ApiError;
        if (apiError.status === 401 || apiError.status === 403) {
          localStorage.removeItem("token");
          localStorage.removeItem("org_id");
          localStorage.removeItem("user_id");
          sessionStorage.removeItem(ADMIN_ORGS_SESSION_KEY);
          sessionStorage.removeItem(NAVBAR_AUTH_CACHE_KEY);
          setAuth({ isAuthenticated: false, role: "", orgId: null });
        }
        setIsAuthLoading(false);
      }
    };

    syncAuthState();

    return () => {
      isMounted = false;
    };
  }, []);

  const navLinks = useMemo(() => {
    if (isAuthLoading) {
      return [...baseNavLinks, { label: "Checking...", href: "#" }];
    }

    if (!auth.isAuthenticated) {
      return [
        ...baseNavLinks,
        { label: "Login", href: "/login" },
        { label: "Register", href: "/register" },
      ];
    }

    if (auth.role === "admin") {
      return [...baseNavLinks, { label: "Admin Panel", href: "/portal" }];
    }

    if (auth.role === "hr" || auth.role === "manager" || auth.role === "employee") {
      return [...baseNavLinks, { label: "Dashboard", href: "/dashboard" }];
    }

    return [
      ...baseNavLinks,
      { label: "Login", href: "/login" },
      { label: "Register", href: "/register" },
    ];
  }, [auth, isAuthLoading]);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="text-lg font-bold text-[#0C123A]">
          Attendance Portal
        </Link>

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-[#0C123A] md:hidden"
          aria-label="Toggle menu"
        >
          Menu
        </button>

        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            link.href === "#" ? (
              <span key={`${link.label}-desktop`} className="text-sm font-medium text-[#0C123A]">
                {link.label}
              </span>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-[#0C123A] transition-colors hover:text-[#C99237]"
              >
                {link.label}
              </Link>
            )
          ))}
        </nav>
      </div>

      {isOpen ? (
        <nav className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
          <ul className="space-y-2">
            {navLinks.map((link) => (
              <li key={link.href}>
                {link.href === "#" ? (
                  <span className="block rounded-md px-3 py-2 text-sm font-medium text-[#0C123A]">
                    {link.label}
                  </span>
                ) : (
                  <Link
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="block rounded-md px-3 py-2 text-sm font-medium text-[#0C123A] hover:bg-slate-100"
                  >
                    {link.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
