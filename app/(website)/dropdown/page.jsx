"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles, Layers, BookOpen, ArrowRight } from "lucide-react";

function Tst() {
  const [showMenu, setShowMenu] = useState(0);

  const handleShowMenu = (menuID) => {
    if (showMenu === menuID) {
      setShowMenu(0);
    } else {
      setShowMenu(menuID);
    }
  };

  const rowIcons = [Sparkles, Layers, BookOpen, ArrowRight, Layers];

  return (
    <div className="min-h-[50vh] bg-gradient-to-b from-slate-50 to-slate-100/80 px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-600">
            Navigation demo
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Expandable sections
          </h1>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
      <div className={`overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-900/5 transition-shadow hover:shadow-md `}>
        <button
          type="button"
          onClick={() => handleShowMenu(1)}
          aria-expanded={showMenu === 1 ? true : false}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50/90"
        >
          <span>
            <span className="block text-xs font-medium uppercase tracking-wider text-slate-400">
              Product
            </span>
            <span className="mt-0.5 block text-base font-semibold text-slate-900">
              Build and ship faster
            </span>
          </span>
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm"
            aria-hidden
          >
            {showMenu === 1 ? (
              <ChevronUp className="h-5 w-5" strokeWidth={2.25} />
            ) : (
              <ChevronDown className="h-5 w-5" strokeWidth={2.25} />
            )}
          </span>
        </button>
        {showMenu === 1 ? (
          <ul className="space-y-0 border-t border-slate-100 bg-slate-50/40 px-3 py-2">
            {[
              ["Overview", "Platform at a glance"],
              ["Features", "What you can do today"],
              ["Pricing", "Plans for every team"],
              ["Changelog", "Latest improvements"],
              ["Roadmap", "What we’re shipping next"],
            ].map(([label, hint], i) => {
              const RowIcon = rowIcons[i % rowIcons.length];
              return (
                <li key={label}>
                  <a
                    href="#"
                    className="group flex items-start gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-white hover:shadow-sm"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 group-hover:bg-teal-100">
                      <RowIcon className="h-4 w-4" strokeWidth={2} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-slate-900 group-hover:text-teal-800">
                        {label}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>
                    </span>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-teal-600" aria-hidden />
                  </a>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <div className={`overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-900/5 transition-shadow hover:shadow-md`}>
        <button
          type="button"
          onClick={() => handleShowMenu(2)}
          aria-expanded={showMenu === 2 ? true : false}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50/90"
        >
          <span>
            <span className="block text-xs font-medium uppercase tracking-wider text-slate-400">
              Resources
            </span>
            <span className="mt-0.5 block text-base font-semibold text-slate-900">
              Learn and get help
            </span>
          </span>
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm"
            aria-hidden
          >
            {showMenu === 2 ? (
              <ChevronUp className="h-5 w-5" strokeWidth={2.25} />
            ) : (
              <ChevronDown className="h-5 w-5" strokeWidth={2.25} />
            )}
          </span>
        </button>
        {showMenu === 2 ? (
          <ul className="space-y-0 border-t border-slate-100 bg-slate-50/40 px-3 py-2">
            {[
              ["Documentation", "Guides and API reference"],
              ["Blog", "Ideas and product updates"],
              ["Support", "We’re here to help"],
              ["Community", "Connect with others"],
              ["Status", "System health"],
            ].map(([label, hint], i) => {
              const RowIcon = rowIcons[i % rowIcons.length];
              return (
                <li key={label}>
                  <a
                    href="#"
                    className="group flex items-start gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-white hover:shadow-sm"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 group-hover:bg-teal-100">
                      <RowIcon className="h-4 w-4" strokeWidth={2} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-slate-900 group-hover:text-teal-800">
                        {label}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>
                    </span>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-teal-600" aria-hidden />
                  </a>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <div className={`overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-900/5 transition-shadow hover:shadow-md`}>
        <button
          type="button"
          onClick={() => handleShowMenu(3)}
          aria-expanded={showMenu === 3 ? true : false}
          className="flex w-full items-center  justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50/90"
        >
          <span>
            <span className="block text-xs font-medium uppercase tracking-wider text-slate-400">
              Company
            </span>
            <span className="mt-0.5 block text-base font-semibold text-slate-900">
              About us & more
            </span>
          </span>
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm"
            aria-hidden
          >
            {showMenu === 3 ? (
              <ChevronUp className="h-5 w-5" strokeWidth={2.25} />
            ) : (
              <ChevronDown className="h-5 w-5" strokeWidth={2.25} />
            )}
          </span>
        </button>
        {showMenu === 3 ? (
          <ul className="space-y-0 border-t border-slate-100 bg-slate-50/40 px-3 py-2">
            {[
              ["About", "Mission and story"],
              ["Careers", "Join the team"],
              ["Press", "News and assets"],
              ["Partners", "Work with us"],
              ["Contact", "Say hello"],
            ].map(([label, hint], i) => {
              const RowIcon = rowIcons[i % rowIcons.length];
              return (
                <li key={label}>
                  <a
                    href="#"
                    className="group flex items-start gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-white hover:shadow-sm"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 group-hover:bg-teal-100">
                      <RowIcon className="h-4 w-4" strokeWidth={2} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-slate-900 group-hover:text-teal-800">
                        {label}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>
                    </span>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-teal-600" aria-hidden />
                  </a>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
        </div>
      </div>
    </div>
  );
}

export default Tst;
