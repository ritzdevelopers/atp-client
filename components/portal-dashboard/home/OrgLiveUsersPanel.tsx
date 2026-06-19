"use client";

import { useContext, useEffect, useMemo, useState } from "react";
import { Activity, Search, Users, Wifi } from "lucide-react";
import { SocketContext } from "@/components/sockets/Socket.Provider";
import {
  fetchChatOrgUsers,
  formatLastActiveLabel,
  type ChatOrgUser,
} from "@/services/chatApplication";

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
    ? `flex h-full min-h-0 flex-col overflow-hidden bg-[#FAFBFC] ${className}`
    : `flex h-[340px] min-h-0 flex-col overflow-hidden rounded-xl border border-[#E4E7EC] bg-white shadow-sm ${className}`;

  return (
    <aside className={shellClass} aria-label="Organization live users">
      <div className="shrink-0 border-b border-[#E8EBF0] bg-white px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#008CD3]">
              Team presence
            </p>
            <p className="text-xs font-semibold text-[#0C123A]">
              <span className="text-emerald-600">{loading ? "—" : liveCount}</span>
              <span className="font-normal text-[#6B7280]"> live · </span>
              <span>{loading ? "—" : employees.length}</span>
              <span className="font-normal text-[#6B7280]"> total</span>
            </p>
          </div>
          <div className="w-20">
            <div className="h-1 overflow-hidden rounded-full bg-[#EEF2F6]">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${livePercent}%` }}
              />
            </div>
            <p className="mt-0.5 text-right text-[9px] text-[#9CA3AF]">{livePercent}%</p>
          </div>
        </div>

        <div className="mt-2 flex gap-1 rounded-lg bg-[#F1F3F6] p-0.5">
          <button
            type="button"
            onClick={() => setTab("live")}
            className={`flex flex-1 items-center justify-center gap-1 rounded-md border-0 py-1 text-[11px] font-semibold outline-none ${
              tab === "live"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-[#6B7280]"
            }`}
          >
            <Wifi className="h-3 w-3" />
            Live ({liveCount})
          </button>
          <button
            type="button"
            onClick={() => setTab("offline")}
            className={`flex flex-1 items-center justify-center gap-1 rounded-md border-0 py-1 text-[11px] font-semibold outline-none ${
              tab === "offline"
                ? "bg-white text-[#374151] shadow-sm"
                : "text-[#6B7280]"
            }`}
          >
            <Activity className="h-3 w-3" />
            Away ({offlineUsers.length})
          </button>
        </div>

        <label className="relative mt-2 block">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name or email"
            className="w-full rounded-md border border-[#E4E7EC] bg-[#F9FAFB] py-1.5 pl-7 pr-2 text-[11px] outline-none focus:border-[#008CD3] focus:bg-white"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
        {loading ? (
          <p className="px-3 py-6 text-center text-[11px] text-[#9CA3AF]">Loading…</p>
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
                  className="flex items-center gap-2.5 px-3 py-2 hover:bg-white"
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
                    <p className="truncate text-[12px] font-semibold text-[#111827]">
                      {name}
                    </p>
                    <p className="truncate text-[10px] text-[#6B7280]">{email}</p>
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
        <div className="shrink-0 border-t border-[#E8EBF0] px-3 py-1.5 text-center text-[9px] text-[#9CA3AF]">
          <Users className="mr-1 inline h-3 w-3" />
          Real-time presence
        </div>
      ) : null}
    </aside>
  );
}
