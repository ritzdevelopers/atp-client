"use client";

import { type ComponentType, useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  MdCalendarMonth,
  MdClose,
  MdDashboard,
  MdExitToApp,
  MdGroups,
  MdLogout,
  MdMenu,
} from "react-icons/md";
import { LuFileSpreadsheet } from "react-icons/lu";

type NavIcon = ComponentType<{ className?: string }>;

const navigationItems: { id: string; label: string; icon: NavIcon; href: string }[] =
  [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: MdDashboard,
      href: "/user-dashboard/[org_id]/home",
    },
    {
      id: "my-team",
      label: "My team",
      icon: MdGroups,
      href: "/user-dashboard/[org_id]/my-team",
    },
    {
      id: "attendance-history",
      label: "Attendance History",
      icon: LuFileSpreadsheet,
      href: "/user-dashboard/[org_id]/attendance-history",
    },
    {
      id: "exit-process",
      label: "Exit Process",
      icon: MdExitToApp,
      href: "/user-dashboard/[org_id]/exit-process",
    },
  ];

const BOTTOM_TAB_COUNT = 4;

const MOBILE_BOTTOM_LIGHT =
  "border-t border-slate-200 bg-[#FAFAF8] text-slate-700 shadow-[0_-1px_0_0_rgba(15,23,42,0.06)]";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

function resolveHref(template: string, orgId: string): string {
  return template.replace("[org_id]", orgId);
}

function routeActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

function bottomTabShortLabel(item: (typeof navigationItems)[number]): string {
  switch (item.id) {
    case "dashboard":
      return "Home";
    case "my-team":
      return "Team";
    case "attendance-history":
      return "History";
    case "exit-process":
      return "Exit";
    default:
      return item.label.length > 11 ? `${item.label.slice(0, 10)}…` : item.label;
  }
}

function LeftSideBar() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const orgIdParam = params?.org_id;
  const orgSlug = String(orgIdParam ?? "");
  const orgIdNum = Number(orgIdParam);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveType, setLeaveType] = useState<"full_day" | "half_day" | "short_leave">(
    "full_day",
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [leaveSuccess, setLeaveSuccess] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const bottomNavItems = useMemo(
    () => navigationItems.slice(0, BOTTOM_TAB_COUNT),
    [],
  );
  const overflowNavItems = useMemo(
    () => navigationItems.slice(BOTTOM_TAB_COUNT),
    [],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setMobileMenuOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  const pushNav = useCallback(
    (href: string) => {
      router.push(href);
      closeMobileMenu();
    },
    [router, closeMobileMenu],
  );

  async function submitLeave(e: React.FormEvent) {
    e.preventDefault();
    setLeaveError(null);
    setLeaveSuccess(null);

    if (!orgIdNum || Number.isNaN(orgIdNum)) {
      setLeaveError("Invalid organization.");
      return;
    }
    if (!startDate) {
      setLeaveError("Start date is required.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setLeaveError("Not signed in.");
      return;
    }

    setSubmittingLeave(true);
    try {
      const res = await fetch(`${API_URL}/api/employees/apply-for-leave`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          org_id: orgIdNum,
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate || null,
          reason: reason.trim() || null,
        }),
      });
      const result = (await res.json()) as { message?: string };
      if (!res.ok) {
        throw new Error(result.message || "Could not submit leave request");
      }
      setLeaveSuccess(result.message || "Leave request submitted successfully.");
      setLeaveType("full_day");
      setStartDate("");
      setEndDate("");
      setReason("");
    } catch (error) {
      setLeaveError(
        error instanceof Error ? error.message : "Could not submit leave request.",
      );
    } finally {
      setSubmittingLeave(false);
    }
  }

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
    setMobileMenuOpen(false);
    setShowLeaveModal(true);
  }

  function openLogoutFromMenu() {
    setMobileMenuOpen(false);
    setShowLogoutConfirm(true);
  }

  const navButtonClass = useCallback(
    (active: boolean) =>
      `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
        active
          ? "bg-indigo-50 text-indigo-700"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`,
    [],
  );

  const logoutDialog =
    showLogoutConfirm && typeof document !== "undefined" ? (
      <div
        className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/40 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-logout-dialog-title"
        onClick={(e) =>
          e.target === e.currentTarget && setShowLogoutConfirm(false)
        }
      >
        <div className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3
              id="user-logout-dialog-title"
              className="text-base font-semibold text-slate-800"
            >
              Sign out?
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              You will be signed out of the portal. Unsaved work may be lost. You must
              sign in again to continue.
            </p>
          </div>
          <div className="flex justify-end gap-2 px-5 py-4">
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(false)}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmLogout}
              className="rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    ) : null;

  const leaveModal =
    showLeaveModal && typeof document !== "undefined" ? (
      <div
        className="fixed inset-0 z-[99998] flex items-center justify-center bg-slate-900/40 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-leave-dialog-title"
        onClick={(e) =>
          !submittingLeave &&
          e.target === e.currentTarget &&
          setShowLeaveModal(false)
        }
      >
        <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3
              id="user-leave-dialog-title"
              className="text-base font-semibold text-slate-800"
            >
              Apply for Leave
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Submit your leave query to management.
            </p>
          </div>
          <form onSubmit={submitLeave} className="space-y-3 px-5 py-4">
            {leaveError ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {leaveError}
              </div>
            ) : null}
            {leaveSuccess ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                {leaveSuccess}
              </div>
            ) : null}

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Leave type
              </label>
              <select
                value={leaveType}
                onChange={(e) =>
                  setLeaveType(
                    e.target.value as "full_day" | "half_day" | "short_leave",
                  )
                }
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
              >
                <option value="full_day">Full Day</option>
                <option value="half_day">Half Day</option>
                <option value="short_leave">Short Leave</option>
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Start date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  End date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Reason
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Optional reason..."
                className="w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={submittingLeave}
                onClick={() => setShowLeaveModal(false)}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingLeave}
                className="inline-flex items-center gap-2 rounded-md bg-indigo-700 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submittingLeave ? "Submitting..." : "Submit Query"}
              </button>
            </div>
          </form>
        </div>
      </div>
    ) : null;

  return (
    <>
      {/* Desktop / tablet landscape: fixed sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden h-screen w-[250px] flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex min-w-0 flex-shrink-0 items-center">
            <img
              src="/portal/layout/logo.png"
              alt="Company"
              className="h-8 w-auto max-w-[160px] object-contain object-left sm:h-9"
            />
          </div>
        </div>

        <nav className="flex flex-1 flex-col space-y-1 overflow-y-auto px-3 py-4">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const href = resolveHref(
              item.href ?? "/user-dashboard/[org_id]/home",
              orgSlug,
            );
            const isActive = routeActive(pathname, href);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => router.push(href)}
                className={navButtonClass(isActive)}
              >
                <Icon className="text-[18px] shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={() => setShowLeaveModal(true)}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-indigo-700 px-3 py-2.5 text-sm font-medium text-white hover:bg-indigo-800"
          >
            <MdCalendarMonth className="text-[18px]" />
            Apply Leave
          </button>
        </div>

        <div className="space-y-1 border-t border-slate-200 px-3 py-4">
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-rose-600 transition hover:bg-rose-50 hover:text-rose-700"
          >
            <MdLogout className="text-[18px]" />
            Log out
          </button>
        </div>
      </aside>

      {/* Mobile & small tablet: hamburger */}
      <button
        type="button"
        onClick={() => setMobileMenuOpen(true)}
        className="fixed left-3 top-3 z-[60] flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-[#FAFAF8] text-slate-800 shadow-sm lg:hidden"
        aria-label="Open menu"
        aria-expanded={mobileMenuOpen}
      >
        <MdMenu className="text-[22px]" />
      </button>

      {/* Bottom tab bar: first 4 routes */}
      <nav
        className={`fixed bottom-0 left-0 right-0 z-[55] lg:hidden ${MOBILE_BOTTOM_LIGHT}`}
        style={{
          paddingBottom: "max(10px, env(safe-area-inset-bottom))",
        }}
        aria-label="Primary navigation"
      >
        <div className="mx-auto flex max-w-xl items-stretch justify-around">
          {bottomNavItems.map((item, index) => {
            const Icon = item.icon;
            const href = resolveHref(item.href, orgSlug);
            const isActive = routeActive(pathname, href);
            const borderClass =
              index < bottomNavItems.length - 1 ? "border-r border-slate-200" : "";
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => pushNav(href)}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 ${borderClass} ${
                  isActive ? "text-indigo-700" : "text-slate-600"
                }`}
              >
                <Icon className="text-[22px] shrink-0 text-slate-700" />
                <span className="line-clamp-2 w-full text-center text-[10px] font-medium leading-tight">
                  {bottomTabShortLabel(item)}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Drawer: overflow links + Apply leave + Sign out */}
      {mobileMenuOpen ? (
        <>
          <div
            className="fixed inset-0 z-[62] bg-slate-900/25 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden
          />
          <div className="fixed left-0 top-0 z-[63] flex h-full w-[min(20rem,88vw)] flex-col border-r border-slate-200 bg-[#FAFAF8] shadow-lg lg:hidden">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
              <span className="truncate text-sm font-semibold text-slate-900">
                Menu
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700"
                aria-label="Close menu"
              >
                <MdClose className="text-xl" />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              <div className="border-b border-slate-200 px-4 py-4">
                <img
                  src="/portal/layout/logo.png"
                  alt="Company"
                  className="h-8 w-auto max-w-[180px] object-contain object-left"
                />
              </div>
              {overflowNavItems.map((item) => {
                const Icon = item.icon;
                const href = resolveHref(item.href, orgSlug);
                const isActive = routeActive(pathname, href);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => pushNav(href)}
                    className={`flex w-full items-center gap-3 border-b border-slate-200 px-4 py-3 text-left text-sm font-medium ${
                      isActive ? "bg-indigo-50 text-indigo-800" : "text-slate-800"
                    }`}
                  >
                    <Icon className="text-xl shrink-0 text-slate-600" />
                    <span className="min-w-0">{item.label}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={openLeaveFromMenu}
                className="flex w-full items-center gap-3 border-b border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-800"
              >
                <MdCalendarMonth className="text-xl shrink-0 text-indigo-700" />
                Apply Leave
              </button>
              <button
                type="button"
                onClick={openLogoutFromMenu}
                className="flex w-full items-center gap-3 border-b border-slate-200 px-4 py-3 text-left text-sm font-medium text-rose-700"
              >
                <MdLogout className="text-xl shrink-0" />
                Sign out
              </button>
            </div>
          </div>
        </>
      ) : null}

      {logoutDialog ? createPortal(logoutDialog, document.body) : null}
      {leaveModal ? createPortal(leaveModal, document.body) : null}
    </>
  );
}

export default LeftSideBar;
