"use client";

import ChatAvatar from "./ChatAvatar";
import type { ChatParticipant } from "./types";
import { useChatContext } from "./ChatContext";

type ChatListItemProps = {
  chat: ChatParticipant;
  subtitle?: string | null;
  isActive?: boolean;
};

export default function ChatListItem({
  chat,
  subtitle,
  isActive = false,
}: ChatListItemProps) {
  const { selectChat } = useChatContext();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      selectChat(chat);
    }
  };

  return (
    <div
      role="listitem"
      tabIndex={0}
      onClick={() => selectChat(chat)}
      onKeyDown={handleKeyDown}
      className={`flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#008CD3]/30 ${
        isActive
          ? "bg-[#E8F4FB]"
          : "bg-white hover:bg-[#F9FAFB]"
      }`}
    >
      <ChatAvatar
        name={chat.user_name}
        imageUrl={chat.user_profile}
        showOnline
        isOnline={chat.is_online}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[15px] font-semibold text-[#111827]">
            {chat.user_name}
          </span>
          {chat.last_message_at && (
            <span
              className={`shrink-0 text-[11px] ${
                (chat.unread_count ?? 0) > 0
                  ? "font-medium text-[#008CD3]"
                  : "text-[#9CA3AF]"
              }`}
            >
              {chat.last_message_at}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className="truncate text-[13px] text-[#6B7280]">
            {chat.is_typing ? (
              <span className="font-medium text-[#008CD3]">typing…</span>
            ) : (
              subtitle ?? chat.user_last_message
            )}
          </p>
          {(chat.unread_count ?? 0) > 0 && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#008CD3] px-1.5 text-[10px] font-semibold text-white">
              {chat.unread_count}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
