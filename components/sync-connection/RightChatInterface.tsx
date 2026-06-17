"use client";

import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams } from "next/navigation";
import {
  MdArrowBack,
  MdAttachFile,
  MdCall,
  MdDone,
  MdDoneAll,
  MdEmojiEmotions,
  MdMoreVert,
  MdSearch,
  MdSend,
  MdVideocam,
} from "react-icons/md";
import { SocketContext } from "@/components/sockets/Socket.Provider";
import {
  fetchPrivateChatHistory,
  jwtUserId,
  mapSocketMessageToChatMessage,
  type SocketMessageRecord,
} from "@/services/chatApplication";
import ChatAvatar from "./ChatAvatar";
import { useChatContext } from "./ChatContext";
import type { ChatMessage } from "./types";

export default function RightChatInterface() {
  const params = useParams();
  const orgId = String(params?.org_id ?? "");
  const { selectedChat, mobileShowChat, setMobileShowChat } = useChatContext();
  const { socket, isConnected } = useContext(SocketContext);

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentUserId = useMemo(() => {
    if (typeof window === "undefined") return null;
    return jwtUserId(localStorage.getItem("token"));
  }, []);

  const contactUserId = selectedChat ? Number(selectedChat.user_id) : null;

  useEffect(() => {
    if (!socket || !isConnected || currentUserId == null) return;
    socket.emit("join_user_room", currentUserId);
  }, [socket, isConnected, currentUserId]);

  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      setChatId(null);
      return;
    }

    const nextChatId = selectedChat.chat_id ?? null;
    setChatId(nextChatId);

    if (!nextChatId) {
      setMessages([]);
      return;
    }

    const chatIdToLoad = nextChatId;
    let cancelled = false;
    async function loadHistory() {
      setLoadingHistory(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const history = await fetchPrivateChatHistory(
          token,
          orgId,
          chatIdToLoad,
        );
        if (!cancelled) setMessages(history);
      } catch {
        if (!cancelled) setMessages([]);
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    }

    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [selectedChat, orgId]);

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
        if (prev.some((m) => m.message_id === mapped.message_id)) {
          return prev.map((m) =>
            m.message_id === mapped.message_id ? mapped : m,
          );
        }
        return [...prev, mapped];
      });
    };

    socket.on("receive_private_message", handleReceive);
    return () => {
      socket.off("receive_private_message", handleReceive);
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
          onClick={() => setMobileShowChat(false)}
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
      </header>

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
          ) : messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#6B7280]">
              No messages yet. Say hello!
            </p>
          ) : (
            <>
              <DateDivider label="Today" />
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.message_id}
                  message={msg}
                  contactName={selectedChat.user_name}
                  contactProfile={selectedChat.user_profile}
                />
              ))}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <footer className="shrink-0 border-t border-[#E4E7EC] bg-[#F9FAFB] px-3 py-3 sm:px-4">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
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
      </footer>
    </section>
  );
}

function EmptyWorkspace() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
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
}: {
  message: ChatMessage;
  contactName: string;
  contactProfile?: string | null;
}) {
  const isOutgoing = message.is_outgoing;
  const profileImage = message.user_profile ?? contactProfile;

  return (
    <div
      className={`flex items-end gap-1.5 ${isOutgoing ? "justify-end" : "justify-start"}`}
    >
      {!isOutgoing && (
        <ChatAvatar
          name={contactName}
          imageUrl={profileImage}
          size="xs"
          className="mb-0.5"
        />
      )}
      <div
        className={`relative max-w-[85%] rounded-xl px-3 py-2 shadow-sm sm:max-w-[70%] ${
          isOutgoing ? "rounded-br-sm bg-[#DCF8C6]" : "rounded-bl-sm bg-white"
        }`}
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
          {isOutgoing && message.status && (
            <span className="text-[#53BDEB]" aria-label={message.status}>
              {message.status === "read" ? (
                <MdDoneAll className="text-sm" />
              ) : (
                <MdDone className="text-sm" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function IconButton({
  label,
  icon,
  className = "",
}: {
  label: string;
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-[#6B7280] outline-none transition hover:bg-[#F3F4F6] hover:text-[#374151] ${className}`}
      aria-label={label}
    >
      {icon}
    </button>
  );
}
