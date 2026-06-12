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
  MdInventory2,
  MdLogout,
  MdMenu,
} from "react-icons/md";
import { LuFileSpreadsheet } from "react-icons/lu";
import AssignedLeaveTypeSelect from "./AssignedLeaveTypeSelect";
import { useAssignedLeaveTypes } from "@/hooks/useAssignedLeaveTypes";
import {
  countInclusiveLeaveDays,
  isUnpaidLeaveTypeId,
  validateLeaveApplication,
} from "@/services/employeeLeaves";
import { BiTask } from "react-icons/bi";

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
      id: "asset-handover",
      label: "Asset handover",
      icon: MdInventory2,
      href: "/user-dashboard/[org_id]/asset-handover",
    },
    {
      id: "attendance-history",
      label: "Attendance History",
      icon: LuFileSpreadsheet,
      href: "/user-dashboard/[org_id]/attendance-history",
    },
    {
      id: "tasks-management",
      label: "Tasks Management",
      icon: BiTask,
      href: "/user-dashboard/[org_id]/tasks-management",
    },
    {
      id: "exit-process",
      label: "Exit Process",
      icon: MdExitToApp,
      href: "/user-dashboard/[org_id]/exit-process",
    },
  ];

/** Quick-access tabs on the bottom bar; last slot is Menu (< lg). */
const MAX_MOBILE_BOTTOM_NAV_SLOTS = 3;

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
    case "asset-handover":
      return "Handover";
    case "attendance-history":
      return "History";
    case "tasks-management":
      return "Tasks";
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
  const {
    options: assignedLeaveOptions,
    selectedLeaveTypeId,
    setSelectedLeaveTypeId,
    loading: assignedLeavesLoading,
    error: assignedLeavesError,
  } = useAssignedLeaveTypes(
    Number.isNaN(orgIdNum) ? undefined : orgIdNum,
    showLeaveModal,
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [leaveSuccess, setLeaveSuccess] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const leaveDaysRequested = useMemo(
    () => countInclusiveLeaveDays(startDate, endDate),
    [startDate, endDate],
  );

  const leaveValidationError = useMemo(() => {
    if (!showLeaveModal || !selectedLeaveTypeId || !startDate) return null;
    return validateLeaveApplication({
      startDate,
      endDate,
      selectedLeaveTypeId,
      assignedOptions: assignedLeaveOptions,
    });
  }, [
    showLeaveModal,
    startDate,
    endDate,
    selectedLeaveTypeId,
    assignedLeaveOptions,
  ]);

  const bottomNavItems = useMemo(
    () => navigationItems.slice(0, MAX_MOBILE_BOTTOM_NAV_SLOTS),
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

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen((open) => !open);
  }, []);

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
    const validationError = validateLeaveApplication({
      startDate,
      endDate,
      selectedLeaveTypeId,
      assignedOptions: assignedLeaveOptions,
    });
    if (validationError) {
      setLeaveError(validationError);
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
          leave_type_id: isUnpaidLeaveTypeId(selectedLeaveTypeId)
            ? "000"
            : selectedLeaveTypeId,
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

            <AssignedLeaveTypeSelect
              options={assignedLeaveOptions}
              loading={assignedLeavesLoading}
              error={assignedLeavesError}
              selectedLeaveTypeId={selectedLeaveTypeId}
              onSelectLeaveTypeId={setSelectedLeaveTypeId}
            />

            {startDate && selectedLeaveTypeId && !isUnpaidLeaveTypeId(selectedLeaveTypeId) ? (
              <p className="text-xs text-slate-500">
                Requesting {leaveDaysRequested} day
                {leaveDaysRequested === 1 ? "" : "s"}
                {leaveValidationError ? (
                  <span className="mt-1 block text-red-600">{leaveValidationError}</span>
                ) : null}
              </p>
            ) : null}

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
                disabled={
                  submittingLeave ||
                  assignedLeavesLoading ||
                  !selectedLeaveTypeId ||
                  Boolean(leaveValidationError)
                }
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
            const href = resolveHref(item.href, orgSlug);
            const isActive = routeActive(pathname, href);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => pushNav(href)}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 border-r border-slate-200 px-1 py-2 transition-colors duration-200 ${
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
          <button
            type="button"
            onClick={toggleMobileMenu}
            className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 transition-colors duration-200 ${
              mobileMenuOpen
                ? "bg-indigo-50/90 text-indigo-800"
                : "text-slate-600"
            }`}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            <span
              className={`text-[22px] leading-none transition-transform duration-300 ${
                mobileMenuOpen ? "rotate-90 text-indigo-700" : "text-slate-700"
              }`}
            >
              {mobileMenuOpen ? <MdClose /> : <MdMenu />}
            </span>
            <span className="line-clamp-2 w-full text-center text-[10px] font-medium leading-tight">
              Menu
            </span>
          </button>
        </div>
      </nav>

      {/* Drawer: all routes + Apply leave + Sign out (animated) */}
      <div className="lg:hidden" aria-hidden={!mobileMenuOpen}>
        <div
          className={`fixed inset-0 z-[10045] bg-slate-900/30 transition-opacity duration-300 ease-out ${
            mobileMenuOpen
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0"
          }`}
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden={!mobileMenuOpen}
        />
        <div
          className={`fixed left-0 top-0 z-[10046] flex h-full w-[min(20rem,88vw)] flex-col border-r border-slate-200 bg-[#FAFAF8] shadow-xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform ${
            mobileMenuOpen
              ? "pointer-events-auto translate-x-0"
              : "pointer-events-none -translate-x-full"
          }`}
          role="dialog"
          aria-modal={mobileMenuOpen}
          aria-label="Navigation menu"
          aria-hidden={!mobileMenuOpen}
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
            <span className="truncate text-sm font-semibold text-slate-900">
              All features
            </span>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition active:scale-95"
              aria-label="Close menu"
            >
              <MdClose className="text-xl" />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
            <div className="border-b border-slate-200 px-4 py-4">
              <img
                src="/portal/layout/logo.png"
                alt="Company"
                className="h-8 w-auto max-w-[180px] object-contain object-left"
              />
            </div>
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const href = resolveHref(item.href, orgSlug);
              const isActive = routeActive(pathname, href);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => pushNav(href)}
                  className={`flex w-full items-center gap-3 border-b border-slate-200 px-4 py-3 text-left text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? "bg-indigo-50 text-indigo-800"
                      : "text-slate-800 active:bg-slate-100"
                  }`}
                >
                  <Icon className="shrink-0 text-xl text-slate-600" />
                  <span className="min-w-0">{item.label}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={openLeaveFromMenu}
              className="flex w-full items-center gap-3 border-b border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-800 transition-colors duration-150 active:bg-slate-100"
            >
              <MdCalendarMonth className="shrink-0 text-xl text-indigo-700" />
              Apply Leave
            </button>
            <button
              type="button"
              onClick={openLogoutFromMenu}
              className="flex w-full items-center gap-3 border-b border-slate-200 px-4 py-3 text-left text-sm font-medium text-rose-700 transition-colors duration-150 active:bg-rose-50"
            >
              <MdLogout className="shrink-0 text-xl" />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {logoutDialog ? createPortal(logoutDialog, document.body) : null}
      {leaveModal ? createPortal(leaveModal, document.body) : null}
    </>
  );
}

export default LeftSideBar;
