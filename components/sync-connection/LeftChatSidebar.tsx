"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  MdAdd,
  MdArrowBack,
  MdCall,
  MdGroups,
  MdOutlineSearch,
  MdPerson,
  MdRadioButtonChecked,
} from "react-icons/md";
import ChatListItem from "./ChatListItem";
import CreateGroupModal from "./CreateGroupModal";
import {
  DUMMY_CALLS,
  DUMMY_STATUS,
  getAvatarColor,
  getInitials,
} from "./dummyData";
import { useChatContext } from "./ChatContext";
import type { ChatParticipant, ChatTab } from "./types";
import ChatAvatar from "./ChatAvatar";
import { SocketContext } from "@/components/sockets/Socket.Provider";
import {
  fetchChatOrgUsers,
  fetchMyIndividualChatsViaSocket,
  jwtUserId,
  mergeChatListUpdate,
  type ChatListUpdateSocketResponse,
  type ChatOrgUser,
} from "@/services/chatApplication";

const TABS: {
  id: ChatTab;
  label: string;
  path: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "individual",
    label: "Chats",
    path: "",
    icon: <MdPerson className="text-[18px]" aria-hidden />,
  },
  {
    id: "groups",
    label: "Groups",
    path: "/groups",
    icon: <MdGroups className="text-[18px]" aria-hidden />,
  },
  {
    id: "calls",
    label: "Calls",
    path: "/calls",
    icon: <MdCall className="text-[18px]" aria-hidden />,
  },
  {
    id: "status",
    label: "Status",
    path: "/status",
    icon: <MdRadioButtonChecked className="text-[18px]" aria-hidden />,
  },
];

function tabFromPathname(pathname: string | null, base: string): ChatTab {
  if (pathname?.startsWith(`${base}/groups`)) return "groups";
  if (pathname?.startsWith(`${base}/calls`)) return "calls";
  if (pathname?.startsWith(`${base}/status`)) return "status";
  return "individual";
}

export default function LeftChatSidebar() {
  const params = useParams();
  const pathname = usePathname();
  const orgId = String(params?.org_id ?? "");
  const base = `/dashboard/${orgId}/sync-connection`;

  const {
    individualChats,
    groupChats,
    refreshGroupChats,
    selectedChat,
    searchQuery,
    setSearchQuery,
    setActiveTab,
    mobileShowChat,
    selectChat,
    setIndividualChats,
  } = useChatContext();
  const { socket, isConnected } = useContext(SocketContext);

  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showNewChatPicker, setShowNewChatPicker] = useState(false);
  const [orgUsers, setOrgUsers] = useState<ChatOrgUser[]>([]);
  const [loadingOrgUsers, setLoadingOrgUsers] = useState(false);
  const [loadingChats, setLoadingChats] = useState(false);

  const currentUserId = useMemo(() => {
    if (typeof window === "undefined") return null;
    return jwtUserId(localStorage.getItem("token"));
  }, []);

  const activeTab = tabFromPathname(pathname, base);

  useEffect(() => {
    if (
      !socket ||
      !isConnected ||
      !orgId ||
      currentUserId == null ||
      activeTab !== "individual"
    ) {
      return;
    }

    let cancelled = false;

    const onChatListUpdate = (payload: ChatListUpdateSocketResponse) => {
      if (!payload.success || !payload.data) return;
      setIndividualChats((prev) => mergeChatListUpdate(prev, payload.data!));
    };

    socket.on("receive_chat_list_update", onChatListUpdate);

    setLoadingChats(true);
    fetchMyIndividualChatsViaSocket(
      socket,
      currentUserId,
      Number(orgId),
    )
      .then((chats) => {
        if (!cancelled) setIndividualChats(chats);
      })
      .catch(() => {
        if (!cancelled) setIndividualChats([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingChats(false);
      });

    return () => {
      cancelled = true;
      socket.off("receive_chat_list_update", onChatListUpdate);
    };
  }, [
    socket,
    isConnected,
    orgId,
    currentUserId,
    activeTab,
    setIndividualChats,
  ]);

  const loadOrgUsers = useCallback(async () => {
    setLoadingOrgUsers(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const users = await fetchChatOrgUsers(token, orgId);
      const currentUserId = jwtUserId(token);
      setOrgUsers(
        users.filter((u) => Number(u.user_id) !== Number(currentUserId ?? -1)),
      );
    } catch {
      setOrgUsers([]);
    } finally {
      setLoadingOrgUsers(false);
    }
  }, [orgId]);

  const openNewChatPicker = useCallback(() => {
    setShowNewChatPicker(true);
    setSearchQuery("");
    void loadOrgUsers();
  }, [loadOrgUsers, setSearchQuery]);

  const closeNewChatPicker = useCallback(() => {
    setShowNewChatPicker(false);
    setSearchQuery("");
  }, [setSearchQuery]);

  useEffect(() => {
    if (activeTab !== "individual") {
      setShowNewChatPicker(false);
    }
  }, [activeTab]);

  const filteredIndividuals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return individualChats;
    return individualChats.filter(
      (c) =>
        c.user_name.toLowerCase().includes(q) ||
        c.user_last_message?.toLowerCase().includes(q),
    );
  }, [individualChats, searchQuery]);

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groupChats;
    return groupChats.filter(
      (g) =>
        g.user_name.toLowerCase().includes(q) ||
        g.user_last_message?.toLowerCase().includes(q),
    );
  }, [groupChats, searchQuery]);

  const filteredCalls = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return DUMMY_CALLS;
    return DUMMY_CALLS.filter((c) => c.user_name.toLowerCase().includes(q));
  }, [searchQuery]);

  const filteredStatus = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return DUMMY_STATUS;
    return DUMMY_STATUS.filter(
      (s) =>
        s.user_name.toLowerCase().includes(q) ||
        s.preview_text?.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const filteredOrgUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return orgUsers;
    return orgUsers.filter(
      (u) =>
        u.user_name.toLowerCase().includes(q) ||
        u.user_email.toLowerCase().includes(q),
    );
  }, [orgUsers, searchQuery]);

  const searchPlaceholder =
    activeTab === "individual" && showNewChatPicker
      ? "Search users"
      : activeTab === "individual"
        ? "Search chats"
        : activeTab === "groups"
          ? "Search groups"
          : activeTab === "calls"
            ? "Search calls"
            : "Search status";

  return (
    <aside
      className={`flex h-full w-full flex-col border-r border-[#E4E7EC] bg-white lg:w-[360px] lg:max-w-[360px] lg:shrink-0 ${
        mobileShowChat ? "hidden lg:flex" : "flex"
      }`}
      aria-label="Chat sidebar"
    >
      <header className="shrink-0 border-b border-[#E4E7EC] bg-[#F9FAFB] px-4 py-4">
        <h1 className="text-lg font-semibold tracking-tight text-[#111827]">
          Messages
        </h1>
        <p className="mt-0.5 text-xs text-[#6B7280]">
          Connect with your team in real time
        </p>
      </header>

      <nav
        className="flex shrink-0 border-b border-[#E4E7EC] bg-white"
        aria-label="Chat categories"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const href = `${base}${tab.path}`;
          return (
            <Link
              key={tab.id}
              href={href}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 flex-col items-center gap-1 border-0 px-1 py-2.5 text-center no-underline outline-none transition-colors ${
                isActive
                  ? "border-b-2 border-[#008CD3] text-[#008CD3]"
                  : "border-b-2 border-transparent text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#374151]"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              {tab.icon}
              <span className="text-[10px] font-medium leading-tight">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {(activeTab !== "individual" ||
        showNewChatPicker ||
        individualChats.length > 0) && (
        <div className="shrink-0 border-b border-[#E4E7EC] bg-white px-3 py-2.5">
          {activeTab === "individual" && showNewChatPicker && (
            <button
              type="button"
              onClick={closeNewChatPicker}
              className="mb-2 flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-sm font-medium text-[#008CD3] outline-none"
            >
              <MdArrowBack className="text-base" aria-hidden />
              Back to chats
            </button>
          )}
          <label className="relative block">
            <span className="sr-only">Search</span>
            <MdOutlineSearch
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-[#9CA3AF]"
              aria-hidden
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] py-2 pl-9 pr-3 text-sm text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:bg-white focus:ring-2 focus:ring-[#008CD3]/15"
            />
          </label>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
        {activeTab === "individual" && showNewChatPicker && (
          <div role="list" aria-label="Select user to chat">
            {loadingOrgUsers ? (
              <EmptyState message="Loading users…" />
            ) : filteredOrgUsers.length === 0 ? (
              <EmptyState message="No users match your search" />
            ) : (
              filteredOrgUsers.map((user) => (
                <OrgUserListItem
                  key={user.user_id}
                  user={user}
                  selectChat={selectChat}
                />
              ))
            )}
          </div>
        )}

        {activeTab === "individual" && !showNewChatPicker && (
          <div role="list" aria-label="Individual chats">
            <div className="border-b border-[#E4E7EC] px-3 py-2.5">
              <button
                type="button"
                onClick={openNewChatPicker}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[#008CD3]/50 bg-[#E8F4FB]/60 px-3 py-2.5 text-sm font-medium text-[#008CD3] outline-none transition hover:bg-[#E8F4FB]"
              >
                <MdAdd className="text-lg" aria-hidden />
                Start new chat
              </button>
            </div>
            {loadingChats ? (
              <EmptyState message="Loading chats…" />
            ) : filteredIndividuals.length === 0 ? (
              <EmptyState
                message={
                  individualChats.length === 0
                    ? "No chat found"
                    : "No chats match your search"
                }
              />
            ) : (
              filteredIndividuals.map((chat) => (
                <ChatListItem
                  key={chat.user_id}
                  chat={chat}
                  isActive={selectedChat?.user_id === chat.user_id}
                />
              ))
            )}
          </div>
        )}

        {activeTab === "groups" && (
          <div role="list" aria-label="Group chats">
            <div className="border-b border-[#E4E7EC] px-3 py-2.5">
              <button
                type="button"
                onClick={() => setShowCreateGroup(true)}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[#008CD3]/50 bg-[#E8F4FB]/60 px-3 py-2.5 text-sm font-medium text-[#008CD3] outline-none transition hover:bg-[#E8F4FB]"
              >
                <MdAdd className="text-lg" aria-hidden />
                Create new group
              </button>
            </div>
            {filteredGroups.length === 0 ? (
              <EmptyState
                message={
                  groupChats.length === 0
                    ? "No groups yet. Create one to get started."
                    : "No groups match your search"
                }
              />
            ) : (
              filteredGroups.map((group) => (
                <ChatListItem
                  key={group.user_id}
                  chat={group}
                  subtitle={
                    group.member_count
                      ? `${group.member_count} members · ${group.user_last_message}`
                      : group.user_last_message
                  }
                  isActive={selectedChat?.user_id === group.user_id}
                />
              ))
            )}
          </div>
        )}

        {activeTab === "calls" && (
          <div role="list" aria-label="Call history">
            {filteredCalls.length === 0 ? (
              <EmptyState message="No calls match your search" />
            ) : (
              filteredCalls.map((call) => (
                <div
                  key={call.call_id}
                  role="listitem"
                  className="flex w-full cursor-default items-center gap-3 border-b border-[#F3F4F6] bg-white px-4 py-3 text-left transition hover:bg-[#F9FAFB]"
                >
                  <ChatAvatar
                    name={call.user_name}
                    imageUrl={call.user_profile}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-[#111827]">
                      {call.user_name}
                    </p>
                    <p
                      className={`mt-0.5 text-[13px] ${
                        call.call_type === "missed"
                          ? "text-red-500"
                          : "text-[#6B7280]"
                      }`}
                    >
                      {call.call_type === "incoming" && "Incoming "}
                      {call.call_type === "outgoing" && "Outgoing "}
                      {call.call_type === "missed" && "Missed "}
                      {call.call_mode} call
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-[#9CA3AF]">
                    {call.timestamp}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "status" && (
          <div role="list" aria-label="Status updates">
            <div className="border-b border-[#E4E7EC] px-4 py-3">
              <button
                type="button"
                className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-dashed border-[#008CD3]/40 bg-[#E8F4FB]/50 px-3 py-2.5 text-left transition hover:bg-[#E8F4FB]"
              >
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-[#008CD3] text-2xl text-white"
                  aria-hidden
                >
                  +
                </span>
                <span className="text-sm font-medium text-[#008CD3]">
                  Add status update
                </span>
              </button>
            </div>
            {filteredStatus.length === 0 ? (
              <EmptyState message="No status updates match your search" />
            ) : (
              filteredStatus.map((status) => (
                <button
                  key={status.status_id}
                  type="button"
                  className="flex w-full cursor-pointer items-center gap-3 border-0 border-b border-[#F3F4F6] bg-white px-4 py-3 text-left outline-none transition hover:bg-[#F9FAFB]"
                >
                  <div className="relative">
                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-full text-base font-semibold text-white ring-2 ${
                        status.viewed ? "ring-[#E4E7EC]" : "ring-[#008CD3]"
                      }`}
                      style={{
                        backgroundColor: getAvatarColor(status.user_name),
                      }}
                    >
                      {getInitials(status.user_name)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-[#111827]">
                      {status.user_name}
                    </p>
                    <p className="mt-0.5 truncate text-[13px] text-[#6B7280]">
                      {status.preview_text}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-[#9CA3AF]">
                    {status.timestamp}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <CreateGroupModal
        open={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        orgId={orgId}
        onCreated={() => void refreshGroupChats()}
      />
    </aside>
  );
}

function OrgUserListItem({
  user,
  selectChat,
}: {
  user: ChatOrgUser;
  selectChat: (user: ChatParticipant) => void;
}) {
  const chatParticipant: ChatParticipant = {
    user_id: user.user_id.toString(),
    user_name: user.user_name,
    user_profile: user.user_profile,
    user_last_message: null,
    last_message_at: null,
    unread_count: 0,
    is_online: false,
    is_typing: false,
  };
  return (
    <div
      onClick={() => selectChat(chatParticipant)}
      role="listitem"
      className="flex w-full items-center gap-3 border-b border-[#F3F4F6] bg-white px-4 py-3"
    >
      <ChatAvatar
        name={user.user_name}
        imageUrl={user.user_profile}
        size="md"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-[#111827]">
          {user.user_name}
        </p>
        <p className="truncate text-[13px] text-[#6B7280]">{user.user_email}</p>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-sm text-[#6B7280]">{message}</p>
    </div>
  );
}
