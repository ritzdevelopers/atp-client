"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, usePathname, useRouter } from "next/navigation";
import { MdCalendarMonth, MdClose, MdLogout, MdMenu } from "react-icons/md";
import { useManagementShellOptional } from "@/components/portal-dashboard/Layout/ManagementShellContext";
import { btnBrandCls } from "@/components/portal-dashboard/home/dashboardTokens";
import {
  MAX_USER_MOBILE_BOTTOM_SLOTS,
  USER_DASHBOARD_NAV_ITEMS,
  resolveUserDashboardHref,
  userBottomTabShortLabel,
  userDashboardRouteActive,
  userNavIconBadgeCls,
} from "@/lib/userDashboardNav";

const MOBILE_BOTTOM_LIGHT =
  "border-t border-slate-200/90 bg-white/95 text-slate-700 shadow-[0_-1px_0_0_rgba(15,23,42,0.06)] backdrop-blur-md";

const LG_ICON = "shrink-0 text-[17px] leading-none";

function LeftSideBar() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const orgSlug = String(params?.org_id ?? "");
  const managementShell = useManagementShellOptional();
  const appsPanelOpen = managementShell?.appsPanelOpen ?? false;
  const closeAppsPanel = managementShell?.closeAppsPanel;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const myLeavesHref = resolveUserDashboardHref(
    "/user-dashboard/[org_id]/my-leaves",
    orgSlug,
  );
  const applyLeaveHref = `${myLeavesHref}?apply=1`;

  const bottomNavItems = useMemo(
    () => USER_DASHBOARD_NAV_ITEMS.slice(0, MAX_USER_MOBILE_BOTTOM_SLOTS),
    [],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setMobileMenuOpen(false);
      closeAppsPanel?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeAppsPanel]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!managementShell) return;
    if (typeof window === "undefined") return;
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    if (!isDesktop) {
      setMobileMenuOpen(appsPanelOpen);
    }
  }, [appsPanelOpen, managementShell]);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
    closeAppsPanel?.();
  }, [closeAppsPanel]);

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen((open) => {
      const next = !open;
      if (managementShell) {
        managementShell.setAppsPanelOpen(next);
      }
      return next;
    });
  }, [managementShell]);

  const pushNav = useCallback(
    (href: string) => {
      router.push(href);
      closeMobileMenu();
      closeAppsPanel?.();
    },
    [router, closeMobileMenu, closeAppsPanel],
  );

  function confirmLogout() {
    try {
      localStorage.removeItem("token");
    } catch {
      /* ignore */
    }
    setShowLogoutConfirm(false);
    closeMobileMenu();
    router.push("/");
  }

  function openLeaveFromMenu() {
    closeMobileMenu();
    router.push(applyLeaveHref);
  }

  function openLogoutFromMenu() {
    closeMobileMenu();
    setShowLogoutConfirm(true);
  }

  const desktopNavButtonCls = (active: boolean) =>
    `group mb-0.5 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] font-medium transition-all duration-200 ${
      active
        ? "bg-[#E8F4FB]/90 text-[#0077B6] shadow-[inset_3px_0_0_0_#008CD3]"
        : "text-slate-700 hover:bg-slate-50 hover:text-[#008CD3]"
    }`;

  const mobileDrawerItemCls = (active: boolean) =>
    `flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left text-sm font-medium transition-colors duration-150 ${
      active
        ? "bg-sky-50/80 text-[#0077B6]"
        : "text-slate-800 active:bg-slate-50"
    }`;

  const logoutDialog =
    showLogoutConfirm && typeof document !== "undefined" ? (
      <div
        className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-logout-dialog-title"
        onClick={(e) =>
          e.target === e.currentTarget && setShowLogoutConfirm(false)
        }
      >
        <div className="relative w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xl">
          <h3
            id="user-logout-dialog-title"
            className="text-base font-semibold text-slate-900"
          >
            Sign out?
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            You will be signed out of the portal. You must sign in again to continue.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(false)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmLogout}
              className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <>
      {/* Desktop (lg+): floating apps panel — toggled from header */}
      <div className="pointer-events-none hidden lg:block" aria-hidden={!appsPanelOpen}>
        <div
          className={`fixed inset-0 z-[10015] bg-slate-900/25 backdrop-blur-[3px] transition-opacity duration-300 ${
            appsPanelOpen
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0"
          }`}
          onClick={() => closeAppsPanel?.()}
          aria-hidden={!appsPanelOpen}
        />
        <div
          className={`fixed left-4 top-[calc(3.75rem+0.75rem)] z-[10020] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            appsPanelOpen
              ? "pointer-events-auto translate-x-0 opacity-100"
              : "pointer-events-none -translate-x-4 opacity-0"
          }`}
        >
          <aside
            className={`flex max-h-[min(78vh,640px)] w-[min(19rem,88vw)] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_24px_64px_rgba(15,23,42,0.14)] ${
              appsPanelOpen ? "apps-panel-enter" : ""
            }`}
            role="dialog"
            aria-modal={appsPanelOpen}
            aria-label="Your workspace"
            aria-hidden={!appsPanelOpen}
          >
            <div className="border-b border-slate-100 bg-gradient-to-r from-[#F8FAFC] via-white to-[#F0F9FF]/40 px-4 py-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                Your workspace
              </p>
              <p className="mt-0.5 text-[13px] font-medium text-slate-600">
                Jump to any feature below
              </p>
            </div>

            <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 [scrollbar-width:thin]">
              {USER_DASHBOARD_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const href = resolveUserDashboardHref(item.href, orgSlug);
                const isActive = userDashboardRouteActive(pathname, href);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => pushNav(href)}
                    className={desktopNavButtonCls(isActive)}
                  >
                    <span className={userNavIconBadgeCls(item.id, isActive)}>
                      <Icon className={LG_ICON} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1 leading-snug">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="space-y-2 border-t border-slate-100 p-3">
              <button
                type="button"
                onClick={openLeaveFromMenu}
                className={`${btnBrandCls()} w-full`}
              >
                <MdCalendarMonth className="h-4 w-4" aria-hidden />
                Apply leave
              </button>
              <button
                type="button"
                onClick={openLogoutFromMenu}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200/80 bg-rose-50/50 px-3 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
              >
                <MdLogout className="text-[18px]" aria-hidden />
                Sign out
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* Bottom tab bar: quick tabs + Menu */}
      <nav
        className={`fixed bottom-0 left-0 right-0 z-[10040] lg:hidden ${MOBILE_BOTTOM_LIGHT}`}
        style={{
          paddingBottom: "max(10px, env(safe-area-inset-bottom))",
        }}
        aria-label="Primary navigation"
      >
        <div className="mx-auto flex max-w-xl items-stretch">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const href = resolveUserDashboardHref(item.href, orgSlug);
            const isActive = userDashboardRouteActive(pathname, href);
            const theme = isActive;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => pushNav(href)}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 border-r border-slate-100 px-1 py-2 transition-colors duration-200 ${
                  theme ? "text-[#008CD3]" : "text-slate-600"
                }`}
              >
                <span className={userNavIconBadgeCls(item.id, isActive, "sm")}>
                  <Icon className="text-[15px]" aria-hidden />
                </span>
                <span className="line-clamp-2 w-full text-center text-[10px] font-semibold leading-tight">
                  {userBottomTabShortLabel(item)}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={toggleMobileMenu}
            className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 transition-colors duration-200 ${
              mobileMenuOpen ? "text-[#008CD3]" : "text-slate-600"
            }`}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-300 ${
                mobileMenuOpen
                  ? "bg-[#E8F4FB] text-[#008CD3] ring-2 ring-[#008CD3]/15"
                  : "bg-slate-50 text-slate-600"
              }`}
            >
              <span className={`text-[20px] leading-none transition-transform duration-300 ${mobileMenuOpen ? "rotate-90" : ""}`}>
                {mobileMenuOpen ? <MdClose /> : <MdMenu />}
              </span>
            </span>
            <span className="line-clamp-2 w-full text-center text-[10px] font-semibold leading-tight">
              Menu
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile drawer: all routes */}
      <div className="lg:hidden" aria-hidden={!mobileMenuOpen}>
        <div
          className={`fixed inset-0 z-[10045] bg-slate-900/30 backdrop-blur-[2px] transition-opacity duration-300 ease-out ${
            mobileMenuOpen
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0"
          }`}
          onClick={closeMobileMenu}
          aria-hidden={!mobileMenuOpen}
        />
        <div
          className={`fixed left-0 top-0 z-[10046] flex h-full w-[min(20rem,88vw)] flex-col border-r border-slate-200/90 bg-white shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform ${
            mobileMenuOpen
              ? "pointer-events-auto translate-x-0"
              : "pointer-events-none -translate-x-full"
          }`}
          role="dialog"
          aria-modal={mobileMenuOpen}
          aria-label="Navigation menu"
          aria-hidden={!mobileMenuOpen}
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-gradient-to-r from-[#F8FAFC] via-white to-[#F0F9FF]/40 px-4 py-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                Workspace
              </p>
              <span className="truncate text-sm font-semibold text-slate-900">
                All features
              </span>
            </div>
            <button
              type="button"
              onClick={closeMobileMenu}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 text-slate-600 transition active:scale-95 hover:bg-slate-50"
              aria-label="Close menu"
            >
              <MdClose className="text-xl" />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
            <div className="border-b border-slate-100 px-4 py-4">
              <img
                src="/portal/layout/logo.png"
                alt="Company"
                className="h-8 w-auto max-w-[180px] object-contain object-left"
              />
            </div>
            {USER_DASHBOARD_NAV_ITEMS.map((item, index) => {
              const Icon = item.icon;
              const href = resolveUserDashboardHref(item.href, orgSlug);
              const isActive = userDashboardRouteActive(pathname, href);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => pushNav(href)}
                  className={`${mobileDrawerItemCls(isActive)} apps-subitem-enter`}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <span className={userNavIconBadgeCls(item.id, isActive)}>
                    <Icon className="text-[15px]" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block">{item.label}</span>
                    <span className="text-[11px] font-normal text-slate-500">
                      {item.description}
                    </span>
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={openLeaveFromMenu}
              className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left text-sm font-medium text-[#008CD3] transition active:bg-sky-50"
            >
              <span className={userNavIconBadgeCls("my-leaves", false)}>
                <MdCalendarMonth className="text-[15px]" aria-hidden />
              </span>
              Apply leave
            </button>
            <button
              type="button"
              onClick={openLogoutFromMenu}
              className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left text-sm font-medium text-rose-600 transition active:bg-rose-50"
            >
              <MdLogout className="shrink-0 text-xl" />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {logoutDialog ? createPortal(logoutDialog, document.body) : null}
    </>
  );
}

export default LeftSideBar;
