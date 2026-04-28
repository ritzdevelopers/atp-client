import { useState } from "react";
import { MdSearch, MdAddCircleOutline, MdNotificationsNone } from "react-icons/md";

function Header() {
  const [search, setSearch] = useState("");

  return (
    <header className="w-full sticky top-0 z-20 border-b border-gray-200/80 bg-white/90 backdrop-blur-md shadow-sm supports-[backdrop-filter]:bg-white/75">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex min-w-0 flex-shrink-0 items-center">
          <img
            src="/portal/layout/logo.png"
            alt="Company"
            className="h-8 w-auto max-w-[160px] object-contain object-left sm:h-9"
          />
        </div>

        {/* Search */}
        <div className="mx-auto max-w-md flex-1 px-2 sm:px-6">
          <label className="group relative block">
            <span className="sr-only">Search employees</span>
            <div className="flex items-center gap-2 rounded-full border border-gray-200/90 bg-gradient-to-b from-gray-50/80 to-[#F5F6FA] px-3 py-2.5 shadow-inner transition duration-200 focus-within:border-blue-200 focus-within:from-white focus-within:shadow-md focus-within:ring-2 focus-within:ring-blue-500/15 sm:px-4">
              <button
                type="button"
                className="flex shrink-0 items-center justify-center text-gray-400 transition-colors group-focus-within:text-blue-500 hover:text-gray-600"
                aria-label="Search"
              >
                <MdSearch className="text-[20px]" />
              </button>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search employees, teams, ID…"
                className="min-w-0 flex-1 border-0 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none"
                autoComplete="off"
              />
            </div>
          </label>
        </div>

        {/* Actions */}
        <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 active:scale-95"
            aria-label="Add new"
            title="Add new"
          >
            <MdAddCircleOutline className="text-[22px]" />
          </button>

          <button
            type="button"
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 active:scale-95"
            aria-label="Notifications"
            title="Notifications"
          >
            <MdNotificationsNone className="text-[22px]" />
            <span
              className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-rose-500"
              aria-hidden
            />
          </button>

          <div
            className="mx-1 hidden h-8 w-px bg-gray-200 sm:block"
            aria-hidden
          />

          <button
            type="button"
            className="ml-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-gray-200/80 transition-all hover:ring-blue-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 active:scale-95 sm:h-10 sm:w-10"
            aria-label="Account menu"
            title="Account"
          >
            <img
              src="https://i.pravatar.cc/100?img=47"
              alt=""
              className="h-full w-full object-cover"
            />
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
