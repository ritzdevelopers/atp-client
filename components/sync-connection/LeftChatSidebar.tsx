"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  MdAdd,
  MdArrowBack,
  MdCall,
  MdGroups,
  MdOutlineSearch,
  MdPerson,
  MdRadioButtonChecked,
} from "react-icons/md";
import { getSyncConnectionBase } from "@/lib/syncConnectionPaths";
import ChatListItem from "./ChatListItem";
import CreateGroupModal from "./CreateGroupModal";
import { useChatContext } from "./ChatContext";
import type { ChatParticipant, ChatTab } from "./types";
import ChatAvatar from "./ChatAvatar";
import { SocketContext } from "@/components/sockets/Socket.Provider";
import {
  dedupeIndividualChats,
  fetchChatOrgUsers,
  fetchMyIndividualChatsViaSocket,
  getIndividualChatKey,
  jwtUserId,
  mergeChatListUpdate,
  sortIndividualChatsByLastMessage,
  type ChatListUpdateSocketResponse,
  type ChatOrgUser,
  type TypingIndicatorPayload,
} from "@/services/chatApplication";

function useIsLgScreen() {
  const [isLg, setIsLg] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsLg(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isLg;
}

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
  const base = useMemo(
    () => getSyncConnectionBase(pathname, orgId),
    [pathname, orgId],
  );

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
  const isLgScreen = useIsLgScreen();

  const typingClearTimeoutsRef = useRef<
    Map<string, ReturnType<typeof setTimeout>>
  >(new Map());

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

  const isActivelyViewingUser = useCallback(
    (userId: string) => {
      if (!selectedChat || selectedChat.user_id !== userId) return false;
      if (activeTab !== "individual") return false;
      return isLgScreen || mobileShowChat;
    },
    [selectedChat, activeTab, isLgScreen, mobileShowChat],
  );

  useEffect(() => {
    if (!socket || currentUserId == null) return;

    const scheduleTypingClear = (userId: string) => {
      const existing = typingClearTimeoutsRef.current.get(userId);
      if (existing) clearTimeout(existing);
      typingClearTimeoutsRef.current.set(
        userId,
        setTimeout(() => {
          setIndividualChats((prev) =>
            prev.map((chat) =>
              chat.user_id === userId ? { ...chat, is_typing: false } : chat,
            ),
          );
          typingClearTimeoutsRef.current.delete(userId);
        }, 3000),
      );
    };

    const handleTyping = (payload: TypingIndicatorPayload) => {
      const userId = String(payload.user_id);
      if (Number(payload.user_id) === currentUserId) return;
      if (isActivelyViewingUser(userId)) return;

      setIndividualChats((prev) => {
        if (!prev.some((chat) => chat.user_id === userId)) return prev;
        return prev.map((chat) =>
          chat.user_id === userId ? { ...chat, is_typing: true } : chat,
        );
      });
      scheduleTypingClear(userId);
    };

    const handleTypingStop = (payload: TypingIndicatorPayload) => {
      const userId = String(payload.user_id);
      const existing = typingClearTimeoutsRef.current.get(userId);
      if (existing) {
        clearTimeout(existing);
        typingClearTimeoutsRef.current.delete(userId);
      }
      setIndividualChats((prev) =>
        prev.map((chat) =>
          chat.user_id === userId ? { ...chat, is_typing: false } : chat,
        ),
      );
    };

    socket.on("typing_indicator", handleTyping);
    socket.on("typing_stop", handleTypingStop);

    return () => {
      socket.off("typing_indicator", handleTyping);
      socket.off("typing_stop", handleTypingStop);
      typingClearTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      typingClearTimeoutsRef.current.clear();
    };
  }, [socket, currentUserId, isActivelyViewingUser, setIndividualChats]);

  useEffect(() => {
    if (!selectedChat) return;
    const userId = selectedChat.user_id;
    if (!isActivelyViewingUser(userId)) return;

    const existing = typingClearTimeoutsRef.current.get(userId);
    if (existing) {
      clearTimeout(existing);
      typingClearTimeoutsRef.current.delete(userId);
    }

    setIndividualChats((prev) =>
      prev.map((chat) =>
        chat.user_id === userId ? { ...chat, is_typing: false } : chat,
      ),
    );
  }, [selectedChat, isActivelyViewingUser, setIndividualChats]);

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
      setIndividualChats((prev) =>
        mergeChatListUpdate(prev, payload.data!),
      );
    };

    socket.on("receive_chat_list_update", onChatListUpdate);

    setLoadingChats(true);
    fetchMyIndividualChatsViaSocket(
      socket,
      currentUserId,
      Number(orgId),
    )
      .then((chats) => {
        if (!cancelled) setIndividualChats(dedupeIndividualChats(chats));
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
    if (activeTab === "calls" || activeTab === "status") {
      setSearchQuery("");
    }
  }, [activeTab, setSearchQuery]);

  const filteredIndividuals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = !q
      ? individualChats
      : individualChats.filter(
          (c) =>
            c.user_name.toLowerCase().includes(q) ||
            c.user_last_message?.toLowerCase().includes(q),
        );
    return sortIndividualChatsByLastMessage(list);
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
        : "Search groups";

  const showSearchBar =
    activeTab === "individual" || activeTab === "groups";

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

      {(showSearchBar &&
        (activeTab !== "individual" ||
          showNewChatPicker ||
          individualChats.length > 0)) && (
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
                  key={getIndividualChatKey(chat)}
                  chat={chat}
                  isActive={
                    selectedChat != null &&
                    getIndividualChatKey(selectedChat) ===
                      getIndividualChatKey(chat)
                  }
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
          <ComingSoonFeature
            title="Calls"
            description="Voice and video calls are on the way. You'll be able to connect with your team directly from here."
            icon={<MdCall className="text-3xl text-[#008CD3]" aria-hidden />}
          />
        )}

        {activeTab === "status" && (
          <ComingSoonFeature
            title="Status"
            description="Share quick updates with your team. Status stories are coming soon."
            icon={
              <MdRadioButtonChecked
                className="text-3xl text-[#008CD3]"
                aria-hidden
              />
            }
          />
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
  const { getUserActiveStatus } = useContext(SocketContext);
  const { isOnline } = getUserActiveStatus(user.user_id);

  const chatParticipant: ChatParticipant = {
    user_id: user.user_id.toString(),
    user_name: user.user_name,
    user_profile: user.user_profile,
    user_last_message: null,
    last_message_at: null,
    unread_count: 0,
    is_online: isOnline,
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
        showOnline
        isOnline={isOnline}
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

function ComingSoonFeature({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-[280px] flex-col items-center justify-center px-8 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#E8F4FB]">
        {icon}
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider text-[#008CD3]">
        Coming soon
      </p>
      <h2 className="mt-2 text-lg font-semibold text-[#111827]">{title}</h2>
      <p className="mt-2 max-w-[240px] text-sm leading-relaxed text-[#6B7280]">
        {description}
      </p>
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
