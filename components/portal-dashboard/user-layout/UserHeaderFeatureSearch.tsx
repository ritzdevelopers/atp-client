"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { ArrowRight, Command, Search, X } from "lucide-react";
import {
  buildUserFeatureSearchCatalog,
  filterUserFeatureSearchCatalog,
  highlightUserSearchMatch,
  type UserFeatureSearchEntry,
} from "@/lib/userDashboardNav";

function HighlightedText({ text, query }: { text: string; query: string }) {
  const parts = highlightUserSearchMatch(text, query);
  return (
    <>
      {parts.map((part, index) =>
        part.match ? (
          <mark
            key={`${part.text}-${index}`}
            className="rounded bg-[#E8F4FB] px-0.5 font-semibold text-[#0070AA] not-italic"
          >
            {part.text}
          </mark>
        ) : (
          <span key={`${part.text}-${index}`}>{part.text}</span>
        ),
      )}
    </>
  );
}

function ResultRow({
  entry,
  query,
  active,
  onSelect,
  onHover,
}: {
  entry: UserFeatureSearchEntry;
  query: string;
  active: boolean;
  onSelect: () => void;
  onHover: () => void;
}) {
  const Icon = entry.icon;
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onMouseEnter={onHover}
      onClick={onSelect}
      className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition ${
        active ? "bg-[#E8F4FB] ring-1 ring-[#008CD3]/20" : "hover:bg-slate-50"
      }`}
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-[14px] font-medium text-slate-900">
          <HighlightedText text={entry.title} query={query} />
        </span>
        <span className="mt-0.5 block truncate text-[12px] text-slate-500">
          <HighlightedText text={entry.subtitle} query={query} />
        </span>
      </span>
      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
    </button>
  );
}

export default function UserHeaderFeatureSearch() {
  const router = useRouter();
  const params = useParams();
  const orgId = String(params?.org_id ?? "");

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const catalog = useMemo(
    () => buildUserFeatureSearchCatalog(orgId),
    [orgId],
  );

  const results = useMemo(
    () => filterUserFeatureSearchCatalog(catalog, query),
    [catalog, query],
  );

  const showPanel = open && query.trim().length > 0;

  const openSearch = useCallback((mobile = false) => {
    if (mobile) {
      setMobileOpen(true);
      window.setTimeout(() => mobileInputRef.current?.focus(), 50);
    } else {
      setOpen(true);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, []);

  const closeAll = useCallback(() => {
    setOpen(false);
    setMobileOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  const navigateTo = useCallback(
    (entry: UserFeatureSearchEntry) => {
      closeAll();
      router.push(entry.href);
    },
    [closeAll, router],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isShortcut =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (isShortcut) {
        event.preventDefault();
        if (window.innerWidth < 768) openSearch(true);
        else openSearch(false);
        return;
      }

      if (!showPanel && !mobileOpen) return;

      if (event.key === "Escape") {
        event.preventDefault();
        closeAll();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((prev) =>
          results.length === 0 ? 0 : (prev + 1) % results.length,
        );
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((prev) =>
          results.length === 0 ? 0 : (prev - 1 + results.length) % results.length,
        );
        return;
      }

      if (event.key === "Enter" && results[activeIndex]) {
        event.preventDefault();
        navigateTo(results[activeIndex]);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, closeAll, mobileOpen, navigateTo, openSearch, results, showPanel]);

  useEffect(() => {
    if (!showPanel) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (inputRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [showPanel]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const desktopDropdown =
    mounted && showPanel
      ? createPortal(
          <div
            ref={panelRef}
            className="fixed z-[100000] w-[min(100vw-1.5rem,32rem)] overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl"
            style={{
              top: (inputRef.current?.getBoundingClientRect().bottom ?? 64) + 8,
              left: Math.max(
                12,
                Math.min(
                  inputRef.current?.getBoundingClientRect().left ?? 12,
                  window.innerWidth - Math.min(window.innerWidth - 24, 512) - 12,
                ),
              ),
            }}
            role="listbox"
            aria-label="Feature search results"
          >
            <SearchResultsBody
              query={query}
              results={results}
              activeIndex={activeIndex}
              setActiveIndex={setActiveIndex}
              onSelect={navigateTo}
            />
          </div>,
          document.body,
        )
      : null;

  const mobileOverlay =
    mounted && mobileOpen
      ? createPortal(
          <div className="fixed inset-0 z-[100000] flex flex-col bg-white">
            <div className="border-b border-slate-100 px-3 py-3">
              <div className="flex items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden
                  />
                  <input
                    ref={mobileInputRef}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search your workspace features…"
                    className="w-full rounded-xl border border-slate-200/90 bg-slate-50 py-2.5 pl-9 pr-3 text-[15px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#008CD3] focus:bg-white focus:ring-2 focus:ring-[#008CD3]/15"
                    autoComplete="off"
                    aria-label="Search features"
                  />
                </div>
                <button
                  type="button"
                  onClick={closeAll}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 text-slate-500"
                  aria-label="Close search"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                Jump to leaves, team, tasks, chat, and more.
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
              <SearchResultsBody
                query={query}
                results={results}
                activeIndex={activeIndex}
                setActiveIndex={setActiveIndex}
                onSelect={navigateTo}
              />
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className="hidden min-w-0 flex-1 items-center justify-center px-3 md:flex lg:px-6">
        <div className="relative w-full max-w-xl">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search features…"
            className="w-full rounded-xl border border-slate-200/90 bg-slate-50/90 py-2 pl-9 pr-20 text-[14px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#008CD3] focus:bg-white focus:ring-2 focus:ring-[#008CD3]/15"
            autoComplete="off"
            aria-label="Search user dashboard features"
            aria-expanded={showPanel}
          />
          <span className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-md border border-slate-200/90 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:inline-flex">
            <Command className="h-3 w-3" aria-hidden />
            K
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => openSearch(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/90 bg-slate-50 text-slate-500 transition hover:border-[#008CD3]/30 hover:text-[#008CD3] md:hidden"
        aria-label="Search features"
      >
        <Search className="h-4 w-4" />
      </button>

      {desktopDropdown}
      {mobileOverlay}
    </>
  );
}

function SearchResultsBody({
  query,
  results,
  activeIndex,
  setActiveIndex,
  onSelect,
}: {
  query: string;
  results: UserFeatureSearchEntry[];
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  onSelect: (entry: UserFeatureSearchEntry) => void;
}) {
  if (!query.trim()) {
    return (
      <div className="px-4 py-8 text-center">
        <Search className="mx-auto mb-2 h-7 w-7 text-slate-300" aria-hidden />
        <p className="text-[14px] font-medium text-slate-700">Search workspace features</p>
        <p className="mt-1 text-[12px] text-slate-500">
          Try leaves, team, attendance, tasks, or chat.
        </p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-[14px] font-medium text-slate-700">No matching features</p>
        <p className="mt-1 text-[12px] text-slate-500">
          Try another keyword such as leave, team, or tasks.
        </p>
      </div>
    );
  }

  return (
    <div className="max-h-[min(70vh,420px)] overflow-y-auto p-2">
      <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        Your features
      </p>
      <div className="space-y-0.5">
        {results.map((entry, index) => (
          <ResultRow
            key={entry.id}
            entry={entry}
            query={query}
            active={activeIndex === index}
            onHover={() => setActiveIndex(index)}
            onSelect={() => onSelect(entry)}
          />
        ))}
      </div>
    </div>
  );
}
