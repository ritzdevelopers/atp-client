"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { LayoutGrid, LogOut } from "lucide-react";
import HeaderFeatureSearch from "@/components/portal-dashboard/Layout/HeaderFeatureSearch";
import { useManagementShell } from "@/components/portal-dashboard/Layout/ManagementShellContext";

function Header() {
  const router = useRouter();
  const params = useParams();
  const orgId = String(params?.org_id ?? "");
  const homeHref = orgId ? `/dashboard/${orgId}/home` : "/";
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
      <header className="sticky top-0 z-[10010] w-full border-b border-[#E4E7EC]/90 bg-white/95 shadow-[0_1px_3px_rgba(16,24,40,0.06)] backdrop-blur-md">
        <div className="flex h-14 min-h-14 w-full min-w-0 items-center gap-2 px-3 sm:gap-3 sm:px-4 md:px-5 lg:px-6">
          <button
            type="button"
            onClick={toggleAppsPanel}
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-200 active:scale-95 ${
              appsPanelOpen
                ? "border-[#008CD3]/30 bg-[#E8F4FB] text-[#008CD3]"
                : "border-[#E4E7EC] bg-[#F9FAFB] text-[#6B7280] hover:border-[#008CD3]/25 hover:text-[#008CD3]"
            }`}
            aria-label={appsPanelOpen ? "Close apps menu" : "Open apps menu"}
            aria-expanded={appsPanelOpen}
          >
            <LayoutGrid className="h-[18px] w-[18px]" aria-hidden />
          </button>

          <Link
            href={homeHref}
            className="flex min-h-0 min-w-0 shrink-0 cursor-pointer items-center rounded-lg transition-opacity hover:opacity-80 md:max-w-[220px] lg:max-w-[260px]"
            aria-label="Go to home"
          >
            <img
              src="/portal/layout/logo.png"
              alt="Company"
              className="h-8 w-auto max-w-[min(160px,32vw)] shrink-0 object-contain object-left sm:h-9"
            />
          </Link>

          <HeaderFeatureSearch />

          <div className="flex shrink-0 items-center">
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] text-[#6B7280] transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              aria-label="Sign out"
            >
              <LogOut className="h-[18px] w-[18px]" aria-hidden />
            </button>
          </div>
        </div>
      </header>

      {showLogoutConfirm ? (
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="header-logout-title"
        >
          <div className="w-full max-w-sm rounded-2xl border border-[#E4E7EC] bg-white p-5 shadow-2xl">
            <h2 id="header-logout-title" className="text-base font-semibold text-[#1F2937]">
              Sign out?
            </h2>
            <p className="mt-2 text-sm text-[#6B7280]">
              You will need to sign in again to access the portal.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="rounded-lg border border-[#E4E7EC] bg-white px-3 py-2 text-sm font-medium text-[#374151] hover:bg-[#F9FAFB]"
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
      ) : null}
    </>
  );
}

export default Header;
