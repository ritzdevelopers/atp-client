"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { getMe, type ApiError } from "@/services/auth";

const ADMIN_ORGS_SESSION_KEY = "admin_org_data";

const baseNavLinks = [
  { label: "About Us", href: "/about" },
  { label: "Pricing", href: "/pricing" },
  { label: "Contact Us", href: "/contact" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasOrganization, setHasOrganization] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let isMounted = true;

    const syncAuthState = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        if (isMounted) {
          setIsAuthenticated(false);
          setHasOrganization(false);
          setUserRole("");
          setIsAuthLoading(false);
        }
        return;
      }

      try {
        const result = await getMe(token);
        console.log("result", result);
        if (!isMounted) {
          return;
        }

        const resolvedUserId =
          result.user?.user_id ??
          result.user?.id ??
          result.data?.user_id ??
          result.data?.id;
        if (resolvedUserId !== undefined && resolvedUserId !== null) {
          localStorage.setItem("user_id", String(resolvedUserId));
        }

        const resolvedRole = (result.data?.user_role || result.data?.role_name || "").toLowerCase();
        const adminOrgDetails = Array.isArray(result.data?.org_details)
          ? result.data.org_details
          : [];
        const orgExists = Boolean(
          result.organization_id ||
            result.data?.org_id ||
            adminOrgDetails.length > 0,
        );
        setIsAuthenticated(true);
        setHasOrganization(orgExists);
        setUserRole(resolvedRole);
        setIsAuthLoading(false);

        if (resolvedRole === "admin" && adminOrgDetails.length > 0) {
          sessionStorage.setItem(
            ADMIN_ORGS_SESSION_KEY,
            JSON.stringify({
              user_role: resolvedRole,
              org_details: adminOrgDetails,
            }),
          );
        }

        if (!orgExists && pathname !== "/create-organization") {
          router.replace("/create-organization");
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const apiError = error as ApiError;
        if (apiError.status === 401 || apiError.status === 403) {
          localStorage.removeItem("token");
          sessionStorage.removeItem(ADMIN_ORGS_SESSION_KEY);
          setIsAuthenticated(false);
          setHasOrganization(false);
          setUserRole("");
          if (pathname !== "/login") {
            router.replace("/login");
          }
        }
        setIsAuthLoading(false);
      }
    };

    syncAuthState();

    return () => {
      isMounted = false;
    };
  }, [pathname, router]);

  const navLinks = useMemo(() => {
    if (isAuthLoading) {
      return [...baseNavLinks, { label: "Checking...", href: "#" }];
    }

    if (!isAuthenticated) {
      return [
        ...baseNavLinks,
        { label: "Login", href: "/login" },
        { label: "Register", href: "/register" },
      ];
    }

    if (hasOrganization && userRole === "admin") {
      return [...baseNavLinks, { label: "Admin Panel", href: "/portal" }];
    }

    if (hasOrganization) {
      return [...baseNavLinks, { label: "Dashboard", href: "/dashboard" }];
    }

    return baseNavLinks;
  }, [hasOrganization, isAuthLoading, isAuthenticated, userRole]);

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
