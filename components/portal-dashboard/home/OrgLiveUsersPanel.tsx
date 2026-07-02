"use client";

import { useContext, useEffect, useMemo, useState } from "react";
import { Activity, Search, Users, Wifi } from "lucide-react";
import { SocketContext } from "@/components/sockets/Socket.Provider";
import {
  fetchChatOrgUsers,
  formatLastActiveLabel,
  type ChatOrgUser,
} from "@/services/chatApplication";
import { LivePanelListSkeleton } from "@/components/portal-dashboard/home/skeletons/HomeDashboardSkeletons";
import { dashPanelCls } from "@/components/portal-dashboard/home/dashboardTokens";

type OrgLiveUsersPanelProps = {
  orgId: string;
  className?: string;
  embedded?: boolean;
};

type PresenceTab = "live" | "offline";

function avatarColor(name: string): string {
  const palette = ["#008CD3", "#0C123A", "#C99237", "#1B7F4B", "#5B4BB4"];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

function getInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export default function OrgLiveUsersPanel({
  orgId,
  className = "",
  embedded = false,
}: OrgLiveUsersPanelProps) {
  const { getUserActiveStatus } = useContext(SocketContext);
  const [employees, setEmployees] = useState<ChatOrgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<PresenceTab>("live");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;

    async function loadEmployees() {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setEmployees([]);
          return;
        }
        const users = await fetchChatOrgUsers(token, orgId);
        if (!cancelled) setEmployees(users);
      } catch (e) {
        if (!cancelled) {
          setEmployees([]);
          setError(
            e instanceof Error ? e.message : "Could not load employees",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadEmployees();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  useEffect(() => {
    setSearchQuery("");
  }, [tab]);

  const { liveUsers, offlineUsers, liveCount } = useMemo(() => {
    const live: ChatOrgUser[] = [];
    const offline: ChatOrgUser[] = [];
    for (const employee of employees) {
      const status = getUserActiveStatus(employee.user_id);
      if (status.isOnline) live.push(employee);
      else offline.push(employee);
    }
    live.sort((a, b) => a.user_name.localeCompare(b.user_name));
    offline.sort((a, b) => a.user_name.localeCompare(b.user_name));
    return { liveUsers: live, offlineUsers: offline, liveCount: live.length };
  }, [employees, getUserActiveStatus]);

  const list = tab === "live" ? liveUsers : offlineUsers;
  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (e) =>
        e.user_name.toLowerCase().includes(q) ||
        e.user_email.toLowerCase().includes(q),
    );
  }, [list, searchQuery]);

  const livePercent =
    employees.length > 0 ? Math.round((liveCount / employees.length) * 100) : 0;

  const shellClass = embedded
    ? `flex h-full min-h-0 flex-col overflow-hidden bg-slate-50/50 ${className}`
    : `${dashPanelCls} ${className}`;

  return (
    <aside className={shellClass} aria-label="Organization live users">
      <div className="shrink-0 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Team presence
            </p>
            <p className="mt-0.5 text-[14px] font-semibold text-slate-900">
              <span className="text-emerald-600">{loading ? "—" : liveCount}</span>
              <span className="font-normal text-slate-500"> online · </span>
              <span>{loading ? "—" : employees.length}</span>
              <span className="font-normal text-slate-500"> total</span>
            </p>
          </div>
          <div className="w-20">
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${livePercent}%` }}
              />
            </div>
            <p className="mt-1 text-right text-[10px] text-slate-400">{livePercent}%</p>
          </div>
        </div>

        <div className="mt-3 flex gap-1 rounded-lg bg-slate-100/80 p-1">
          <button
            type="button"
            onClick={() => setTab("live")}
            className={`flex flex-1 items-center justify-center gap-1 rounded-md border-0 py-1.5 text-[12px] font-medium outline-none transition-colors ${
              tab === "live"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Wifi className="h-3.5 w-3.5" />
            Live ({liveCount})
          </button>
          <button
            type="button"
            onClick={() => setTab("offline")}
            className={`flex flex-1 items-center justify-center gap-1 rounded-md border-0 py-1.5 text-[12px] font-medium outline-none transition-colors ${
              tab === "offline"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            Away ({offlineUsers.length})
          </button>
        </div>

        <label className="relative mt-3 block">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search people…"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-[12px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
        {loading ? (
          <LivePanelListSkeleton />
        ) : error ? (
          <p className="px-3 py-6 text-center text-[11px] text-red-600">{error}</p>
        ) : filteredList.length === 0 ? (
          <p className="px-3 py-6 text-center text-[11px] text-[#9CA3AF]">
            {searchQuery.trim() ? "No matches" : tab === "live" ? "No one online" : "All online"}
          </p>
        ) : (
          <ul className="divide-y divide-[#F1F3F6]">
            {filteredList.map((employee) => {
              const status = getUserActiveStatus(employee.user_id);
              const name = employee.user_name?.trim() || "Unknown";
              const email = employee.user_email?.trim() || "—";

              return (
                <li
                  key={String(employee.user_id)}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-slate-50"
                >
                  <div className="relative shrink-0">
                    {employee.user_profile ? (
                      <img
                        src={employee.user_profile}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold text-white"
                        style={{ backgroundColor: avatarColor(name) }}
                      >
                        {getInitials(name)}
                      </span>
                    )}
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${
                        status.isOnline ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-slate-900">
                      {name}
                    </p>
                    <p className="truncate text-[11px] text-slate-500">{email}</p>
                    {tab === "offline" ? (
                      <p className="truncate text-[9px] text-[#9CA3AF]">
                        {formatLastActiveLabel(status.lastActiveTime, false)}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {!embedded ? (
        <div className="shrink-0 border-t border-slate-100 px-4 py-2 text-center text-[10px] text-slate-400">
          <Users className="mr-1 inline h-3 w-3" />
          Real-time presence
        </div>
      ) : null}
    </aside>
  );
}
