"use client";

import HeaderFeatureSearch from "@/components/portal-dashboard/Layout/HeaderFeatureSearch";

function Header() {
  return (
    <header className="sticky top-0 z-[9999] w-full border-b border-gray-200/80 bg-white/90 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/75">
      <div className="flex h-12 min-h-12 w-full min-w-0 items-center gap-2 px-3 sm:h-14 sm:min-h-14 sm:gap-3 sm:px-4 md:h-16 md:min-h-16 md:px-6 lg:px-8">
        <div className="flex min-h-0 min-w-0 shrink-0 items-center md:max-w-[220px] lg:max-w-[280px]">
          <img
            src="/portal/layout/logo.png"
            alt="Company"
            className="h-7 w-auto max-w-[min(140px,34vw)] shrink-0 object-contain object-left sm:h-8 sm:max-w-[min(180px,30vw)] md:h-9 md:max-w-[min(220px,28vw)] lg:max-w-[280px]"
          />
        </div>

        <HeaderFeatureSearch />

        <div className="hidden w-[72px] shrink-0 md:block lg:w-[88px]" aria-hidden />
      </div>
    </header>
  );
}

export default Header;
