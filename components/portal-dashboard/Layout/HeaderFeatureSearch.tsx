"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Command,
  Loader2,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  fetchOrganizationFeatureGroups,
  readOrganizationFeatureSnapshot,
  type OrgFeatureGroup,
} from "@/lib/orgFeatureAccess";
import {
  buildFeatureSearchCatalog,
  filterFeatureSearchCatalog,
  highlightMatch,
  type FeatureSearchEntry,
} from "@/lib/headerFeatureSearch";
import { isCurrentUserOrgAdmin, readRoleNameFromToken } from "@/lib/orgAdminAccess";
import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";

type FlatResult = FeatureSearchEntry & {
  section: "your" | "organization";
};

function HighlightedText({ text, query }: { text: string; query: string }) {
  const parts = highlightMatch(text, query);
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
  entry: FlatResult;
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
      className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition ${
        active ? "bg-[#E8F4FB] ring-1 ring-[#008CD3]/20" : "hover:bg-[#F9FAFB]"
      }`}
    >
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          entry.accessible ? "bg-[#E8F4FB] text-[#008CD3]" : "bg-[#F3F4F6] text-[#6B7280]"
        }`}
      >
        {Icon ? <Icon className="h-4 w-4" aria-hidden /> : <Building2 className="h-4 w-4" aria-hidden />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[14px] font-medium text-[#1F2937]">
            <HighlightedText text={entry.title} query={query} />
          </span>
          {entry.accessible ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#E6F4EA] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#0F9D58]">
              <ShieldCheck className="h-3 w-3" aria-hidden />
              Your access
            </span>
          ) : (
            <span className="inline-flex rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
              Org only
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-[12px] text-[#6B7280]">
          <HighlightedText text={entry.subtitle} query={query} />
        </span>
        <span className="mt-1 inline-flex rounded-md bg-[#F9FAFB] px-1.5 py-0.5 text-[10px] font-medium capitalize text-[#9CA3AF]">
          {entry.category}
        </span>
      </span>
      {entry.href ? (
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[#9CA3AF]" aria-hidden />
      ) : null}
    </button>
  );
}

export default function HeaderFeatureSearch() {
  const router = useRouter();
  const params = useParams();
  const orgId = String(params?.org_id ?? "1");
  const dashboardCtx = useManagementDashboardContext();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [groups, setGroups] = useState<OrgFeatureGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const roleName = dashboardCtx?.user?.user_role_name ?? readRoleNameFromToken();
  const isAdmin = isCurrentUserOrgAdmin(roleName);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadFeatures() {
      setLoadError(null);
      const cached = readOrganizationFeatureSnapshot(orgId);
      if (cached?.groups?.length) {
        setGroups(cached.groups);
        setLoading(false);
      } else {
        setLoading(true);
      }

      try {
        const token = localStorage.getItem("token");
        if (!token) {
          if (!cancelled) setLoading(false);
          return;
        }
        const nextGroups = await fetchOrganizationFeatureGroups(orgId, token);
        if (!cancelled) {
          setGroups(nextGroups);
          setLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Could not load organization features",
          );
          setLoading(false);
        }
      }
    }

    void loadFeatures();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const catalog = useMemo(
    () => buildFeatureSearchCatalog(orgId, groups, isAdmin),
    [orgId, groups, isAdmin],
  );

  const { yourFeatures, organizationFeatures } = useMemo(
    () => filterFeatureSearchCatalog(catalog, query),
    [catalog, query],
  );

  const flatResults = useMemo<FlatResult[]>(() => {
    const yours = yourFeatures.map((entry) => ({ ...entry, section: "your" as const }));
    const org = organizationFeatures.map((entry) => ({
      ...entry,
      section: "organization" as const,
    }));
    return [...yours, ...org];
  }, [yourFeatures, organizationFeatures]);

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
    (entry: FeatureSearchEntry) => {
      if (!entry.href || !entry.accessible) return;
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
          flatResults.length === 0 ? 0 : (prev + 1) % flatResults.length,
        );
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((prev) =>
          flatResults.length === 0
            ? 0
            : (prev - 1 + flatResults.length) % flatResults.length,
        );
        return;
      }

      if (event.key === "Enter" && flatResults[activeIndex]) {
        event.preventDefault();
        const entry = flatResults[activeIndex];
        if (entry.href && entry.accessible) navigateTo(entry);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    activeIndex,
    closeAll,
    flatResults,
    mobileOpen,
    navigateTo,
    openSearch,
    showPanel,
  ]);

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
            className="fixed z-[100000] w-[min(100vw-1.5rem,36rem)] overflow-hidden rounded-xl border border-[#E4E7EC] bg-white shadow-2xl"
            style={{
              top: (inputRef.current?.getBoundingClientRect().bottom ?? 64) + 8,
              left: Math.max(
                12,
                Math.min(
                  (inputRef.current?.getBoundingClientRect().left ?? 12),
                  window.innerWidth - Math.min(window.innerWidth - 24, 576) - 12,
                ),
              ),
            }}
            role="listbox"
            aria-label="Feature search results"
          >
            <SearchResultsBody
              query={query}
              loading={loading}
              loadError={loadError}
              yourFeatures={yourFeatures}
              organizationFeatures={organizationFeatures}
              flatResults={flatResults}
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
            <div className="border-b border-[#E4E7EC] px-3 py-3">
              <div className="flex items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]"
                    aria-hidden
                  />
                  <input
                    ref={mobileInputRef}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search organization & your features…"
                    className="w-full rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] py-2.5 pl-9 pr-3 text-[15px] text-[#1F2937] outline-none placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:bg-white focus:ring-2 focus:ring-[#008CD3]/15"
                    autoComplete="off"
                    aria-label="Search features"
                  />
                </div>
                <button
                  type="button"
                  onClick={closeAll}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#6B7280]"
                  aria-label="Close search"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-2 text-[11px] text-[#9CA3AF]">
                Filter organization modules and features assigned to you.
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
              <SearchResultsBody
                query={query}
                loading={loading}
                loadError={loadError}
                yourFeatures={yourFeatures}
                organizationFeatures={organizationFeatures}
                flatResults={flatResults}
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
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]"
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
            placeholder="Search organization & assigned features…"
            className="w-full rounded-xl border border-[#E4E7EC] bg-[#F9FAFB]/90 py-2 pl-9 pr-20 text-[14px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:bg-white focus:ring-2 focus:ring-[#008CD3]/15"
            autoComplete="off"
            aria-label="Search organization features"
            aria-expanded={showPanel}
            aria-controls="header-feature-search-results"
          />
          <span className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-md border border-[#E4E7EC] bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#9CA3AF] sm:inline-flex">
            <Command className="h-3 w-3" aria-hidden />
            K
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => openSearch(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] text-[#6B7280] transition hover:border-[#008CD3]/30 hover:text-[#008CD3] md:hidden"
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
  loading,
  loadError,
  yourFeatures,
  organizationFeatures,
  flatResults,
  activeIndex,
  setActiveIndex,
  onSelect,
}: {
  query: string;
  loading: boolean;
  loadError: string | null;
  yourFeatures: FeatureSearchEntry[];
  organizationFeatures: FeatureSearchEntry[];
  flatResults: FlatResult[];
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  onSelect: (entry: FeatureSearchEntry) => void;
}) {
  if (!query.trim()) {
    return (
      <div className="px-4 py-8 text-center">
        <Search className="mx-auto mb-2 h-7 w-7 text-[#D1D5DB]" aria-hidden />
        <p className="text-[14px] font-medium text-[#374151]">Search company features</p>
        <p className="mt-1 text-[12px] text-[#6B7280]">
          Find organization modules and features assigned to your role.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 px-4 py-10 text-[13px] text-[#6B7280]">
        <Loader2 className="h-4 w-4 animate-spin text-[#008CD3]" aria-hidden />
        Loading feature catalog…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-start gap-2 px-4 py-6 text-[13px] text-[#1F2937]">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#D93025]" aria-hidden />
        <span>{loadError}</span>
      </div>
    );
  }

  if (flatResults.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-[14px] font-medium text-[#374151]">No matching features</p>
        <p className="mt-1 text-[12px] text-[#6B7280]">
          Try another keyword such as attendance, leave, payroll, or employees.
        </p>
      </div>
    );
  }

  let runningIndex = 0;

  return (
    <div id="header-feature-search-results" className="max-h-[min(70vh,420px)] overflow-y-auto p-2">
      {yourFeatures.length > 0 ? (
        <section className="mb-2">
          <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
            Your assigned features
          </p>
          <div className="space-y-0.5">
            {yourFeatures.map((entry) => {
              const index = runningIndex;
              runningIndex += 1;
              return (
                <ResultRow
                  key={entry.id}
                  entry={{ ...entry, section: "your" }}
                  query={query}
                  active={activeIndex === index}
                  onHover={() => setActiveIndex(index)}
                  onSelect={() => onSelect(entry)}
                />
              );
            })}
          </div>
        </section>
      ) : null}

      {organizationFeatures.length > 0 ? (
        <section>
          <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
            Organization features
          </p>
          <div className="space-y-0.5">
            {organizationFeatures.map((entry) => {
              const index = runningIndex;
              runningIndex += 1;
              return (
                <ResultRow
                  key={entry.id}
                  entry={{ ...entry, section: "organization" }}
                  query={query}
                  active={activeIndex === index}
                  onHover={() => setActiveIndex(index)}
                  onSelect={() => onSelect(entry)}
                />
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
