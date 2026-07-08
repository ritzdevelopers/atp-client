"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { LayoutGrid, LogOut } from "lucide-react";
import UserHeaderFeatureSearch from "@/components/portal-dashboard/user-layout/UserHeaderFeatureSearch";
import { useManagementShell } from "@/components/portal-dashboard/Layout/ManagementShellContext";
import { btnGhostCls } from "@/components/portal-dashboard/home/dashboardTokens";

function headerIconBtnCls(active = false) {
  return `inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-200 active:scale-95 ${
    active
      ? "border-[#008CD3]/30 bg-[#E8F4FB] text-[#008CD3] shadow-sm"
      : "border-slate-200/90 bg-white text-slate-600 hover:border-[#008CD3]/25 hover:bg-sky-50/50 hover:text-[#008CD3]"
  }`;
}

export default function UserHeader() {
  const router = useRouter();
  const params = useParams();
  const orgId = String(params?.org_id ?? "");
  const homeHref = orgId ? `/user-dashboard/${orgId}/home` : "/";
  const { appsPanelOpen, toggleAppsPanel } = useManagementShell();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const confirmLogout = useCallback(() => {
    try {
      localStorage.removeItem("token");
    } catch {
      /* ignore */
    }
    setShowLogoutConfirm(false);
    router.push("/");
  }, [router]);

  return (
    <>
      <header className="sticky top-0 z-[10010] w-full border-b border-slate-200/80 bg-white/90 shadow-[0_1px_3px_rgba(15,23,42,0.05)] backdrop-blur-lg">
        <div className="mx-auto flex h-14 min-h-14 w-full max-w-[min(100%,1880px)] min-w-0 items-center gap-2 px-3 sm:gap-3 sm:px-5 lg:px-6">
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={toggleAppsPanel}
              className={headerIconBtnCls(appsPanelOpen)}
              aria-label={appsPanelOpen ? "Close apps menu" : "Open apps menu"}
              aria-expanded={appsPanelOpen}
            >
              <LayoutGrid className="h-[18px] w-[18px]" aria-hidden />
            </button>

            <Link
              href={homeHref}
              className="flex min-h-0 min-w-0 shrink-0 cursor-pointer items-center rounded-xl px-1 py-1 transition-opacity hover:opacity-80 md:max-w-[220px] lg:max-w-[260px]"
              aria-label="Go to home"
            >
              <img
                src="/portal/layout/logo.png"
                alt="Company"
                className="h-8 w-auto max-w-[min(160px,32vw)] shrink-0 object-contain object-left sm:h-9"
              />
            </Link>
          </div>

          <div className="min-w-0 flex-1">
            <UserHeaderFeatureSearch />
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-600 transition-all duration-200 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 active:scale-95"
              aria-label="Sign out"
            >
              <LogOut className="h-[18px] w-[18px]" aria-hidden />
            </button>
          </div>
        </div>
      </header>

      {showLogoutConfirm ? (
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-header-logout-title"
        >
          <div className="w-full max-w-sm rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xl">
            <h2
              id="user-header-logout-title"
              className="text-base font-semibold text-slate-900"
            >
              Sign out?
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              You will need to sign in again to access the portal.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className={btnGhostCls()}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-rose-600 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-rose-700"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
