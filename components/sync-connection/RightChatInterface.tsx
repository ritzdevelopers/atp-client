"use client";

import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, usePathname } from "next/navigation";
import {
  MdArrowBack,
  MdAttachFile,
  MdCall,
  MdDelete,
  MdDone,
  MdDoneAll,
  MdEdit,
  MdEmojiEmotions,
  MdMoreVert,
  MdSearch,
  MdSend,
  MdVideocam,
} from "react-icons/md";
import { SocketContext } from "@/components/sockets/Socket.Provider";
import {
  deletePrivateMessages,
  fetchPrivateChatHistory,
  jwtUserId,
  mapSocketMessageToChatMessage,
  type SeenPrivateMessagePayload,
  type SocketMessageRecord,
} from "@/services/chatApplication";
import ChatAvatar from "./ChatAvatar";
import { useChatContext } from "./ChatContext";
import MobileEmojiPicker from "./MobileEmojiPicker";
import type { ChatMessage, ChatTab } from "./types";

function tabFromPathname(pathname: string | null, base: string): ChatTab {
  if (pathname?.startsWith(`${base}/groups`)) return "groups";
  if (pathname?.startsWith(`${base}/calls`)) return "calls";
  if (pathname?.startsWith(`${base}/status`)) return "status";
  return "individual";
}

function useIsLgScreen() {
  const [isLg, setIsLg] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsLg(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return isLg;
}

function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  onClose: () => void,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (ref.current && !ref.current.contains(target)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [ref, onClose, enabled]);
}

export default function RightChatInterface() {
  const params = useParams();
  const pathname = usePathname();
  const orgId = String(params?.org_id ?? "");
  const syncConnectionBase = `/dashboard/${orgId}/sync-connection`;
  const activeTab = useMemo(
    () => tabFromPathname(pathname, syncConnectionBase),
    [pathname, syncConnectionBase],
  );
  const isLgScreen = useIsLgScreen();
  const { selectedChat, mobileShowChat, setMobileShowChat } = useChatContext();
  const { socket, isConnected } = useContext(SocketContext);

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [callMenuOpen, setCallMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [openMessageMenuId, setOpenMessageMenuId] = useState<string | null>(
    null,
  );
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedDeleteIds, setSelectedDeleteIds] = useState<string[]>([]);
  const [deletingMessages, setDeletingMessages] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const callMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const joinedChatIdRef = useRef<string | null>(null);
  const messageMenuRef = useRef<HTMLDivElement>(null);

  useClickOutside(callMenuRef, () => setCallMenuOpen(false), callMenuOpen);
  useClickOutside(moreMenuRef, () => setMoreMenuOpen(false), moreMenuOpen);
  useClickOutside(
    messageMenuRef,
    () => setOpenMessageMenuId(null),
    openMessageMenuId != null,
  );

  const currentUserId = useMemo(() => {
    if (typeof window === "undefined") return null;
    return jwtUserId(localStorage.getItem("token"));
  }, []);

  const contactUserId = selectedChat ? Number(selectedChat.user_id) : null;

  const deletableMessages = useMemo(
    () =>
      messages.filter(
        (msg) => msg.is_outgoing && !msg.message_id.startsWith("temp-"),
      ),
    [messages],
  );

  const allDeletableSelected =
    deletableMessages.length > 0 &&
    deletableMessages.every((msg) =>
      selectedDeleteIds.includes(msg.message_id),
    );

  const exitDeleteMode = useCallback(() => {
    setDeleteMode(false);
    setSelectedDeleteIds([]);
    setDeleteError(null);
    setOpenMessageMenuId(null);
  }, []);

  const enterDeleteMode = useCallback((messageId?: string) => {
    setDeleteMode(true);
    setDeleteError(null);
    setOpenMessageMenuId(null);
    setSelectedDeleteIds(messageId ? [messageId] : []);
  }, []);

  const toggleDeleteSelection = useCallback((messageId: string) => {
    setSelectedDeleteIds((prev) =>
      prev.includes(messageId)
        ? prev.filter((id) => id !== messageId)
        : [...prev, messageId],
    );
  }, []);

  const toggleSelectAllDeletable = useCallback(() => {
    setSelectedDeleteIds((prev) => {
      if (allDeletableSelected) return [];
      return deletableMessages.map((msg) => msg.message_id);
    });
  }, [allDeletableSelected, deletableMessages]);

  const handleConfirmDelete = useCallback(async () => {
    if (!chatId || selectedDeleteIds.length === 0) return;

    const token = localStorage.getItem("token");
    if (!token) {
      setDeleteError("You must be signed in to delete messages.");
      return;
    }

    setDeletingMessages(true);
    setDeleteError(null);

    try {
      const deletedIds = await deletePrivateMessages(
        token,
        orgId,
        chatId,
        selectedDeleteIds,
      );
      const deletedSet = new Set(deletedIds.map(String));
      setMessages((prev) =>
        prev.filter((msg) => !deletedSet.has(msg.message_id)),
      );
      exitDeleteMode();
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Failed to delete messages",
      );
    } finally {
      setDeletingMessages(false);
    }
  }, [chatId, selectedDeleteIds, orgId, exitDeleteMode]);

  const displayedMessages = useMemo(() => {
    const q = chatSearchQuery.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter((msg) => msg.text.toLowerCase().includes(q));
  }, [messages, chatSearchQuery]);

  const handleEmojiSelect = useCallback((emoji: string) => {
    setMessage((prev) => prev + emoji);
    mobileInputRef.current?.focus();
  }, []);

  const leaveChatRoom = useCallback(
    (roomId?: string | null) => {
      if (!socket) return;
      const id = roomId ?? joinedChatIdRef.current;
      if (!id) return;
      socket.emit("leave_chat_room", id);
      if (joinedChatIdRef.current === id) {
        joinedChatIdRef.current = null;
      }
    },
    [socket],
  );

  const isViewingChat = Boolean(
    selectedChat &&
      chatId &&
      activeTab === "individual" &&
      (isLgScreen || mobileShowChat),
  );

  useEffect(() => {
    if (!socket || !isConnected || currentUserId == null) return;
    socket.emit("join_user_room", currentUserId);
  }, [socket, isConnected, currentUserId]);

  useEffect(() => {
    if (!socket || currentUserId == null) {
      leaveChatRoom();
      return;
    }

    if (!isViewingChat || !chatId) {
      leaveChatRoom();
      return;
    }

    if (joinedChatIdRef.current && joinedChatIdRef.current !== chatId) {
      leaveChatRoom(joinedChatIdRef.current);
    }

    socket.emit("join_chat_room", chatId, currentUserId);
    joinedChatIdRef.current = chatId;

    socket.emit("seen_private_message", {
      chat_id: chatId,
      user_id: currentUserId,
    });

    return () => {
      leaveChatRoom(chatId);
    };
  }, [socket, currentUserId, chatId, isViewingChat, leaveChatRoom]);

  useEffect(() => {
    return () => {
      leaveChatRoom();
    };
  }, [leaveChatRoom]);

  const handleBackToList = useCallback(() => {
    leaveChatRoom();
    setMobileShowChat(false);
  }, [leaveChatRoom, setMobileShowChat]);

  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      setChatId(null);
      setChatSearchQuery("");
      setCallMenuOpen(false);
      setMoreMenuOpen(false);
      setEmojiPickerOpen(false);
      exitDeleteMode();
      return;
    }

    const nextChatId = selectedChat.chat_id ?? null;
    setChatId(nextChatId);
    exitDeleteMode();

    if (!nextChatId) {
      setMessages([]);
      return;
    }

    if (
      !socket ||
      !isConnected ||
      currentUserId == null ||
      contactUserId == null
    ) {
      return;
    }

    const chatIdToLoad = nextChatId;
    let cancelled = false;

    setLoadingHistory(true);
    fetchPrivateChatHistory(
      socket,
      chatIdToLoad,
      currentUserId,
      contactUserId,
      selectedChat.user_profile,
    )
      .then((history) => {
        if (!cancelled) setMessages(history);
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedChat, socket, isConnected, currentUserId, contactUserId, exitDeleteMode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!socket || !selectedChat || currentUserId == null || contactUserId == null) {
      return;
    }

    const handleReceive = (raw: SocketMessageRecord) => {
      const incomingChatId = raw.chat_id ? String(raw.chat_id) : null;
      const activeChatId = chatId ?? selectedChat.chat_id ?? null;

      if (
        activeChatId &&
        incomingChatId &&
        incomingChatId !== activeChatId
      ) {
        return;
      }

      const mapped = mapSocketMessageToChatMessage(
        raw,
        currentUserId,
        contactUserId,
        selectedChat.user_profile,
      );
      if (!mapped) return;

      if (!activeChatId && incomingChatId) {
        setChatId(incomingChatId);
      }

      setMessages((prev) => {
        const withoutMatchingOptimistic =
          mapped.is_outgoing
            ? prev.filter(
                (m) =>
                  !(
                    m.message_id.startsWith("temp-") &&
                    m.is_outgoing &&
                    m.text === mapped.text
                  ),
              )
            : prev;

        if (
          withoutMatchingOptimistic.some(
            (m) => m.message_id === mapped.message_id,
          )
        ) {
          return withoutMatchingOptimistic.map((m) =>
            m.message_id === mapped.message_id ? mapped : m,
          );
        }
        return [...withoutMatchingOptimistic, mapped];
      });
    };

    const handleSeen = (payload: SeenPrivateMessagePayload) => {
      const activeChatId = chatId ?? selectedChat.chat_id ?? null;
      if (
        !activeChatId ||
        String(payload.chat_id) !== String(activeChatId) ||
        Number(payload.seen_by) !== contactUserId
      ) {
        return;
      }

      setMessages((prev) =>
        prev.map((msg) => {
          if (!msg.is_outgoing) return msg;
          if (
            payload.message_ids.length > 0 &&
            !payload.message_ids.includes(msg.message_id)
          ) {
            return msg;
          }
          return { ...msg, status: "read" as const };
        }),
      );
    };

    socket.on("receive_private_message", handleReceive);
    socket.on("seen_private_message", handleSeen);
    return () => {
      socket.off("receive_private_message", handleReceive);
      socket.off("seen_private_message", handleSeen);
    };
  }, [socket, selectedChat, currentUserId, contactUserId, chatId]);

  const handleSendMessage = useCallback(() => {
    const text = message.trim();
    if (!text || !socket || !selectedChat || currentUserId == null) return;

    const optimisticId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      message_id: optimisticId,
      text,
      timestamp: new Date().toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }),
      is_outgoing: true,
      status: "sent",
    };
 
    setMessage("");
    setMessages((prev) => [...prev, optimisticMessage]);

    socket.emit("send_private_message", {
      sender: currentUserId,
      delivered_to: Number(selectedChat.user_id),
      type: "text",
      content: text,
      company_id: Number(orgId),
      chat_type: "private",
      ...(chatId ? { chat_id: chatId } : {}),
    });
  }, [message, socket, selectedChat, currentUserId, orgId, chatId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!selectedChat) {
    return (
      <section
        className={`flex h-full min-w-0 flex-1 flex-col bg-[#F3F4F6] ${
          mobileShowChat ? "hidden lg:flex" : "flex"
        }`}
        aria-label="Chat workspace"
      >
        <EmptyWorkspace />
      </section>
    );
  }

  return (
    <section
      className={`flex h-full min-w-0 flex-1 flex-col bg-[#ECEFF1] ${
        mobileShowChat ? "flex" : "hidden lg:flex"
      }`}
      aria-label={`Chat with ${selectedChat.user_name}`}
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-[#E4E7EC] bg-white px-3 py-2.5 shadow-sm sm:px-4">
        <button
          type="button"
          onClick={handleBackToList}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-[#374151] outline-none transition hover:bg-[#F3F4F6] lg:hidden"
          aria-label="Back to chat list"
        >
          <MdArrowBack className="text-xl" />
        </button>

        <ChatAvatar
          name={selectedChat.user_name}
          imageUrl={selectedChat.user_profile}
          size="sm"
          showOnline
          isOnline={selectedChat.is_online}
        />

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-semibold text-[#111827]">
            {selectedChat.user_name}
          </h2>
          <p className="text-xs text-[#6B7280]">
            {isConnected ? "Connected" : "Connecting…"}
          </p>
        </div>

        <div className="flex items-center gap-0.5">
          {/* Desktop header actions — unchanged at md+ */}
          <div className="hidden items-center gap-0.5 md:flex">
            <IconButton
              label="Search in chat"
              icon={<MdSearch className="text-xl" />}
            />
            <IconButton
              label="Voice call"
              icon={<MdCall className="text-xl" />}
            />
            <IconButton
              label="Video call"
              icon={<MdVideocam className="text-xl" />}
            />
            <IconButton
              label="More options"
              icon={<MdMoreVert className="text-xl" />}
            />
          </div>

          {/* Mobile header — single call dropdown + menu with search */}
          <div className="flex items-center gap-0.5 md:hidden">
            <div ref={callMenuRef} className="relative">
              <IconButton
                label="Call"
                icon={<MdCall className="text-xl" />}
                onClick={() => {
                  setCallMenuOpen((open) => !open);
                  setMoreMenuOpen(false);
                }}
              />
              {callMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 min-w-[10.5rem] overflow-hidden rounded-xl border border-[#E4E7EC] bg-white py-1 shadow-lg">
                  <MobileMenuItem
                    icon={<MdCall className="text-lg text-[#008CD3]" />}
                    label="Voice call"
                    onClick={() => setCallMenuOpen(false)}
                  />
                  <MobileMenuItem
                    icon={<MdVideocam className="text-lg text-[#008CD3]" />}
                    label="Video call"
                    onClick={() => setCallMenuOpen(false)}
                  />
                </div>
              )}
            </div>

            <div ref={moreMenuRef} className="relative">
              <IconButton
                label="More options"
                icon={<MdMoreVert className="text-xl" />}
                onClick={() => {
                  setMoreMenuOpen((open) => !open);
                  setCallMenuOpen(false);
                }}
              />
              {moreMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-xl border border-[#E4E7EC] bg-white p-2 shadow-lg">
                  <div className="relative">
                    <MdSearch className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-lg text-[#9CA3AF]" />
                    <input
                      type="search"
                      value={chatSearchQuery}
                      onChange={(e) => setChatSearchQuery(e.target.value)}
                      placeholder="Search messages"
                      className="w-full rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] py-2 pl-9 pr-3 text-sm text-[#111827] outline-none placeholder:text-[#9CA3AF] focus:border-[#008CD3]"
                      aria-label="Search in chat"
                      autoFocus
                    />
                  </div>
                  {chatSearchQuery.trim() && (
                    <button
                      type="button"
                      onClick={() => setChatSearchQuery("")}
                      className="mt-2 w-full cursor-pointer rounded-lg border-0 bg-transparent py-1.5 text-left text-xs text-[#008CD3] outline-none hover:bg-[#F3F4F6]"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {deleteMode && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#FECACA] bg-[#FEF2F2] px-4 py-2.5">
          <label className="flex min-w-0 cursor-pointer items-center gap-2 text-sm text-[#111827]">
            <input
              type="checkbox"
              checked={allDeletableSelected}
              onChange={toggleSelectAllDeletable}
              className="h-4 w-4 shrink-0 cursor-pointer rounded border-[#D1D5DB] text-[#008CD3] focus:ring-[#008CD3]"
              aria-label="Select all messages"
            />
            <span className="truncate font-medium">
              {allDeletableSelected ? "Deselect all" : "Select all"}
              {selectedDeleteIds.length > 0
                ? ` (${selectedDeleteIds.length} selected)`
                : ""}
            </span>
          </label>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={exitDeleteMode}
              className="cursor-pointer rounded-lg border-0 bg-transparent px-2 py-1 text-sm font-medium text-[#6B7280] outline-none hover:bg-white/70"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleConfirmDelete()}
              disabled={selectedDeleteIds.length === 0 || deletingMessages}
              className="flex cursor-pointer items-center gap-1 rounded-lg border-0 bg-[#DC2626] px-3 py-1.5 text-sm font-medium text-white outline-none transition hover:bg-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <MdDelete className="text-base" />
              {deletingMessages ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      )}

      {deleteError && (
        <p className="shrink-0 bg-[#FEF2F2] px-4 py-2 text-center text-xs text-[#DC2626]">
          {deleteError}
        </p>
      )}

      <div
        className="min-h-0 flex-1 overflow-y-auto px-4 py-4 [scrollbar-width:thin]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d1d5db' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          {loadingHistory ? (
            <p className="py-8 text-center text-sm text-[#6B7280]">
              Loading messages…
            </p>
          ) : displayedMessages.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#6B7280]">
              {chatSearchQuery.trim()
                ? "No messages match your search"
                : "No messages yet. Say hello!"}
            </p>
          ) : (
            <>
              <DateDivider label="Today" />
              {displayedMessages.map((msg) => (
                <MessageBubble
                  key={msg.message_id}
                  message={msg}
                  contactName={selectedChat.user_name}
                  contactProfile={selectedChat.user_profile}
                  deleteMode={deleteMode}
                  isSelectedForDelete={selectedDeleteIds.includes(msg.message_id)}
                  isMenuOpen={openMessageMenuId === msg.message_id}
                  menuContainerRef={
                    openMessageMenuId === msg.message_id
                      ? messageMenuRef
                      : undefined
                  }
                  onToggleDeleteSelect={() =>
                    toggleDeleteSelection(msg.message_id)
                  }
                  onOpenMenu={() => setOpenMessageMenuId(msg.message_id)}
                  onCloseMenu={() => setOpenMessageMenuId(null)}
                  onEdit={() => setOpenMessageMenuId(null)}
                  onDelete={() => enterDeleteMode(msg.message_id)}
                />
              ))}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <footer className="shrink-0 border-t border-[#E4E7EC] bg-[#F9FAFB] px-3 py-3 sm:px-4">
        {deleteMode ? (
          <p className="mx-auto max-w-3xl text-center text-sm text-[#6B7280]">
            Select messages to delete, then tap Delete above.
          </p>
        ) : (
          <>
        {/* Desktop footer — unchanged at md+ */}
        <div className="mx-auto hidden max-w-3xl items-end gap-2 md:flex">
          <IconButton
            label="Emoji"
            icon={<MdEmojiEmotions className="text-xl text-[#6B7280]" />}
            className="mb-1"
          />
          <IconButton
            label="Attach file"
            icon={<MdAttachFile className="text-xl text-[#6B7280]" />}
            className="mb-1"
          />
          <div className="min-w-0 flex-1">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message"
              disabled={!isConnected}
              className="w-full rounded-xl border border-[#E4E7EC] bg-white px-4 py-2.5 text-sm text-[#111827] outline-none placeholder:text-[#9CA3AF] disabled:cursor-not-allowed disabled:opacity-70"
              aria-label="Message input"
            />
          </div>
          <button
            type="button"
            onClick={handleSendMessage}
            disabled={!isConnected || message.trim() === ""}
            className="mb-0.5 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-[#008CD3] text-white outline-none transition hover:bg-[#0070AA] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Send message"
          >
            <MdSend className="text-xl" />
          </button>
        </div>

        {/* Mobile footer — WhatsApp-style inline icons */}
        <div className="relative mx-auto flex max-w-3xl items-end gap-2 md:hidden">
          {emojiPickerOpen && (
            <MobileEmojiPicker
              onSelect={handleEmojiSelect}
              onClose={() => setEmojiPickerOpen(false)}
            />
          )}

          <div className="flex min-w-0 flex-1 items-center gap-1 rounded-full border border-[#E4E7EC] bg-white px-1.5 py-1 shadow-sm">
            <button
              type="button"
              onClick={() => setEmojiPickerOpen((open) => !open)}
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-[#6B7280] outline-none transition hover:bg-[#F3F4F6]"
              aria-label="Emoji"
            >
              <MdEmojiEmotions className="text-[22px]" />
            </button>

            <input
              ref={mobileInputRef}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setEmojiPickerOpen(false)}
              placeholder="Message"
              disabled={!isConnected}
              className="min-w-0 flex-1 border-0 bg-transparent py-2 text-sm text-[#111827] outline-none placeholder:text-[#9CA3AF] disabled:cursor-not-allowed disabled:opacity-70"
              aria-label="Message input"
            />

            <button
              type="button"
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-[#6B7280] outline-none transition hover:bg-[#F3F4F6]"
              aria-label="Attach file"
            >
              <MdAttachFile className="text-[22px]" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleSendMessage}
            disabled={!isConnected || message.trim() === ""}
            className="mb-0.5 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-[#008CD3] text-white outline-none transition hover:bg-[#0070AA] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Send message"
          >
            <MdSend className="text-xl" />
          </button>
        </div>
          </>
        )}
      </footer>
    </section>
  );
}

function EmptyWorkspace() {
  return (
    <div className="hidden lg:flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-[#E4E7EC]">
        <svg
          className="h-12 w-12 text-[#008CD3]/60"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-[#111827]">Team messaging</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#6B7280]">
        Select a conversation from the sidebar to view messages. Your chats are
        end-to-end ready for real-time sync.
      </p>
    </div>
  );
}

function DateDivider({ label }: { label: string }) {
  return (
    <div className="my-2 flex justify-center">
      <span className="rounded-lg bg-white/90 px-3 py-1 text-[11px] font-medium text-[#6B7280] shadow-sm">
        {label}
      </span>
    </div>
  );
}

function MessageBubble({
  message,
  contactName,
  contactProfile,
  deleteMode = false,
  isSelectedForDelete = false,
  isMenuOpen = false,
  menuContainerRef,
  onToggleDeleteSelect,
  onOpenMenu,
  onCloseMenu,
  onEdit,
  onDelete,
}: {
  message: ChatMessage;
  contactName: string;
  contactProfile?: string | null;
  deleteMode?: boolean;
  isSelectedForDelete?: boolean;
  isMenuOpen?: boolean;
  menuContainerRef?: React.RefObject<HTMLDivElement | null>;
  onToggleDeleteSelect?: () => void;
  onOpenMenu?: () => void;
  onCloseMenu?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const isOutgoing = message.is_outgoing;
  const profileImage = message.user_profile ?? contactProfile;
  const canManage =
    isOutgoing && !message.message_id.startsWith("temp-");
  const showDeleteCheckbox = deleteMode && canManage;

  return (
    <div
      className={`group flex items-end gap-1.5 ${isOutgoing ? "justify-end" : "justify-start"}`}
    >
      {showDeleteCheckbox && (
        <label className="mb-2 flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={isSelectedForDelete}
            onChange={onToggleDeleteSelect}
            className="h-4 w-4 cursor-pointer rounded border-[#D1D5DB] text-[#008CD3] focus:ring-[#008CD3]"
            aria-label={`Select message: ${message.text}`}
          />
        </label>
      )}

      {!isOutgoing && (
        <ChatAvatar
          name={contactName}
          imageUrl={profileImage}
          size="xs"
          className="mb-0.5"
        />
      )}

      <div className="relative max-w-[85%] sm:max-w-[70%]">
        {canManage && !deleteMode && (
          <div
            ref={isMenuOpen ? menuContainerRef : undefined}
            className={`absolute top-1/2 z-20 -translate-y-1/2 ${
              isOutgoing ? "-left-8" : "-right-8"
            }`}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isMenuOpen) onCloseMenu?.();
                else onOpenMenu?.();
              }}
              className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-0 bg-white text-[#6B7280] shadow-sm outline-none transition hover:bg-[#F3F4F6] hover:text-[#374151] max-md:opacity-100 ${
                isMenuOpen
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100 focus:opacity-100"
              }`}
              aria-label="Message options"
              aria-expanded={isMenuOpen}
            >
              <MdMoreVert className="text-lg" />
            </button>

            {isMenuOpen && (
              <div
                className={`absolute top-full z-30 mt-1 min-w-[9rem] overflow-hidden rounded-xl border border-[#E4E7EC] bg-white py-1 shadow-lg ${
                  isOutgoing ? "right-0" : "left-0"
                }`}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.();
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-3 py-2 text-left text-sm text-[#111827] outline-none hover:bg-[#F3F4F6]"
                >
                  <MdEdit className="text-base text-[#008CD3]" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.();
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-3 py-2 text-left text-sm text-[#DC2626] outline-none hover:bg-[#FEF2F2]"
                >
                  <MdDelete className="text-base" />
                  Delete
                </button>
              </div>
            )}
          </div>
        )}

        <div
          className={`rounded-xl px-3 py-2 shadow-sm ${
            isOutgoing ? "rounded-br-sm bg-[#DCF8C6]" : "rounded-bl-sm bg-white"
          } ${isSelectedForDelete ? "ring-2 ring-[#008CD3]/40" : ""}`}
          onClick={() => {
            if (deleteMode && canManage) onToggleDeleteSelect?.();
          }}
          onKeyDown={(e) => {
            if (
              deleteMode &&
              canManage &&
              (e.key === "Enter" || e.key === " ")
            ) {
              e.preventDefault();
              onToggleDeleteSelect?.();
            }
          }}
          role={deleteMode && canManage ? "button" : undefined}
          tabIndex={deleteMode && canManage ? 0 : undefined}
        >
          <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-[#111827]">
            {message.text}
          </p>
          <div
            className={`mt-1 flex items-center justify-end gap-1 ${
              isOutgoing ? "text-[#6B7280]" : "text-[#9CA3AF]"
            }`}
          >
            <span className="text-[10px]">{message.timestamp}</span>
            {isOutgoing && (
              <span
                className={
                  message.status === "read" ? "text-[#53BDEB]" : "text-[#9CA3AF]"
                }
                aria-label={
                  message.status === "read"
                    ? "Read"
                    : message.status === "delivered"
                      ? "Delivered"
                      : "Sent"
                }
              >
                {message.status === "read" || message.status === "delivered" ? (
                  <MdDoneAll className="text-sm" />
                ) : (
                  <MdDone className="text-sm" />
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileMenuItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-3 py-2.5 text-left text-sm text-[#111827] outline-none transition hover:bg-[#F3F4F6]"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function IconButton({
  label,
  icon,
  className = "",
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-[#6B7280] outline-none transition hover:bg-[#F3F4F6] hover:text-[#374151] ${className}`}
      aria-label={label}
    >
      {icon}
    </button>
  );
}
