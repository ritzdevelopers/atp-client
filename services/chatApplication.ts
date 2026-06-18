import type { Socket } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export type ApiError = Error & { status?: number };

export type ChatOrgUser = {
  user_id: number | string;
  user_name: string;
  user_email: string;
  user_profile?: string | null;
};

export type ChatGroupRecord = {
  _id: string;
  group_name: string;
  group_image?: string;
  group_description?: string;
  group_admins?: number[];
  participants?: number[];
  company_id?: number;
  chat_type?: string;
  last_message_time?: string | null;
};

function authHeaders(token: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export function jwtUserId(token: string | null): number | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1] || "")) as {
      id?: number | string;
      user_id?: number | string;
    };
    const raw = payload.id ?? payload.user_id;
    if (raw == null || raw === "") return null;
    const n = Number(raw);
    return Number.isNaN(n) ? null : n;
  } catch {
    return null;
  }
}

export async function fetchChatOrgUsers(
  token: string,
  orgId: string,
): Promise<ChatOrgUser[]> {
  const q = encodeURIComponent(orgId);
  const res = await fetch(
    `${API_URL}/api/chat-application/get-org-users-for-chat?org_id=${q}`,
    {
      method: "GET",
      headers: authHeaders(token),
    },
  );

  const result = (await res.json()) as {
    success?: boolean;
    message?: string;
    data?: ChatOrgUser[];
  };

  if (!res.ok) {
    const error: ApiError = new Error(
      result.message || "Failed to load organization users",
    );
    error.status = res.status;
    throw error;
  }

  return Array.isArray(result.data) ? result.data : [];
}

export type CreateGroupPayload = {
  group_name: string;
  group_description?: string;
  group_image?: string;
  group_admins: number[];
  participants: number[];
};

export async function createChatGroup(
  token: string,
  orgId: string,
  payload: CreateGroupPayload,
): Promise<ChatGroupRecord> {
  const q = encodeURIComponent(orgId);
  const res = await fetch(
    `${API_URL}/api/chat-application/create-new-group?org_id=${q}`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({
        org_id: Number(orgId),
        ...payload,
      }),
    },
  );

  const result = (await res.json()) as {
    success?: boolean;
    message?: string;
    data?: ChatGroupRecord;
  };

  if (!res.ok) {
    const error: ApiError = new Error(
      result.message || "Failed to create group",
    );
    error.status = res.status;
    throw error;
  }

  if (!result.data) {
    throw new Error("Group created but no data returned");
  }

  return result.data;
}

export async function fetchMyChatGroups(
  token: string,
  orgId: string,
): Promise<ChatGroupRecord[]> {
  const q = encodeURIComponent(orgId);
  const res = await fetch(
    `${API_URL}/api/chat-application/get-all-groups?org_id=${q}`,
    {
      method: "GET",
      headers: authHeaders(token),
    },
  );

  const result = (await res.json()) as {
    success?: boolean;
    message?: string;
    data?: ChatGroupRecord[];
  };

  if (res.status === 404) return [];
  if (!res.ok) {
    const error: ApiError = new Error(
      result.message || "Failed to load groups",
    );
    error.status = res.status;
    throw error;
  }

  return Array.isArray(result.data) ? result.data : [];
}

import type { ChatParticipant, GroupChat } from "@/components/sync-connection/types";

export type PrivateChatRecord = {
  _id: string;
  participant_info: {
    receiver_profile_img?: string | null;
    receiver_name: string;
    receiver_email: string;
    receiver_id: number | string;
  };
  last_message?: string;
  last_message_status?: string;
  last_message_time?: string | null;
  unread_count?: number;
};

function formatChatTimestamp(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function mapPrivateChatToParticipant(
  chat: PrivateChatRecord,
): ChatParticipant {
  return {
    user_id: String(chat.participant_info.receiver_id),
    chat_id: String(chat._id),
    user_name: chat.participant_info.receiver_name,
    user_profile: chat.participant_info.receiver_profile_img || null,
    user_last_message: chat.last_message || undefined,
    last_message_at: formatChatTimestamp(chat.last_message_time),
    unread_count: chat.unread_count ?? 0,
  };
}

export type PrivateChatMessageRecord = {
  _id: string;
  content?: string;
  sent_by_me?: boolean;
  created_at?: string | null;
  sender?: {
    id?: number | string;
    profile_picture?: string | null;
  };
  seen_by?: Array<{ id?: number | string }>;
  delivered_to?: Array<{ id?: number | string }>;
};

function resolveOutgoingMessageStatus(
  msg: PrivateChatMessageRecord,
  contactUserId?: number | null,
): "sent" | "delivered" | "read" {
  const recipientId =
    contactUserId ??
    (msg.delivered_to?.[0]?.id != null
      ? Number(msg.delivered_to[0].id)
      : null);
  if (recipientId == null || Number.isNaN(recipientId)) return "sent";

  const seenByIds = (msg.seen_by ?? [])
    .map((user) => Number(user.id))
    .filter((id) => !Number.isNaN(id));

  if (seenByIds.includes(recipientId)) return "read";

  const deliveredToIds = (msg.delivered_to ?? [])
    .map((user) => Number(user.id))
    .filter((id) => !Number.isNaN(id));

  return deliveredToIds.includes(recipientId) ? "delivered" : "sent";
}

export function mapPrivateChatMessage(
  msg: PrivateChatMessageRecord,
  contactUserId?: number | null,
): import("@/components/sync-connection/types").ChatMessage {
  return {
    message_id: String(msg._id),
    text: msg.content ?? "",
    timestamp: formatChatTimestamp(msg.created_at) ?? "Now",
    is_outgoing: Boolean(msg.sent_by_me),
    user_profile: msg.sender?.profile_picture ?? null,
    status: msg.sent_by_me
      ? resolveOutgoingMessageStatus(msg, contactUserId)
      : undefined,
  };
}

export type SocketMessageRecord = {
  _id: string;
  sender: number | string;
  content?: string;
  chat_id?: string;
  createdAt?: string;
  created_at?: string;
  seen_by?: Array<number | string>;
  delivered_to?: Array<number | string>;
};

export function mapSocketMessageToChatMessage(
  msg: SocketMessageRecord,
  currentUserId: number,
  contactUserId: number,
  contactProfile?: string | null,
): import("@/components/sync-connection/types").ChatMessage | null {
  const senderId = Number(msg.sender);
  const isOutgoing = senderId === currentUserId;
  const isIncoming = senderId === contactUserId;

  if (!isOutgoing && !isIncoming) return null;

  const seenByIds = (msg.seen_by ?? []).map(Number);
  const deliveredToIds = (msg.delivered_to ?? []).map(Number);
  const recipientId = Number(contactUserId);
  const isRead = isOutgoing && seenByIds.includes(recipientId);
  const isDelivered =
    isOutgoing && !isRead && deliveredToIds.includes(recipientId);

  return {
    message_id: String(msg._id),
    text: msg.content ?? "",
    timestamp:
      formatChatTimestamp(msg.createdAt ?? msg.created_at) ?? "Now",
    is_outgoing: isOutgoing,
    user_profile: isIncoming ? contactProfile : null,
    status: isOutgoing
      ? isRead
        ? "read"
        : isDelivered
          ? "delivered"
          : "sent"
      : undefined,
  };
}

export type SeenPrivateMessagePayload = {
  chat_id: string;
  seen_by: number;
  message_ids: string[];
  sender_ids: number[];
};

export type SingleChatHistorySocketResponse = {
  success?: boolean;
  message?: string;
  data?: {
    chat?: { _id?: string };
    messages?: SocketMessageRecord[];
  };
};

export function fetchPrivateChatHistory(
  socket: Socket,
  chatId: string,
  userId: number,
  contactUserId: number,
  contactProfile?: string | null,
  options: { page?: number; limit?: number } = {},
): Promise<import("@/components/sync-connection/types").ChatMessage[]> {
  return new Promise((resolve, reject) => {
    const timeoutMs = 15000;
    let settled = false;

    const cleanup = () => {
      clearTimeout(timeoutId);
      socket.off("receive_single_chat_history", onHistory);
      socket.off("error", onError);
    };

    const onHistory = (payload: SingleChatHistorySocketResponse) => {
      if (settled) return;

      const responseChatId = payload.data?.chat?._id;
      if (!responseChatId || String(responseChatId) !== String(chatId)) return;

      if (!payload.success) {
        settled = true;
        cleanup();
        reject(new Error(payload.message || "Failed to load chat history"));
        return;
      }

      const rows = payload.data?.messages ?? [];
      const mapped = rows
        .map((msg) =>
          mapSocketMessageToChatMessage(
            { ...msg, chat_id: chatId },
            userId,
            contactUserId,
            contactProfile,
          ),
        )
        .filter(
          (
            msg,
          ): msg is import("@/components/sync-connection/types").ChatMessage =>
            msg != null,
        );

      settled = true;
      cleanup();
      resolve(mapped);
    };

    const onError = (err: { message?: string }) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(err?.message || "Failed to load chat history"));
    };

    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("Chat history request timed out"));
    }, timeoutMs);

    socket.on("receive_single_chat_history", onHistory);
    socket.on("error", onError);
    socket.emit("get_single_chat_history", {
      chat_id: chatId,
      user_id: userId,
      page: options.page ?? 1,
      limit: options.limit ?? 50,
    });
  });
}

export type AllMessagesSocketResponse = {
  success?: boolean;
  message?: string;
  data?: PrivateChatRecord[];
  pagination?: { page: number; limit: number; returned: number };
};

export type ChatListUpdateSocketResponse = {
  success?: boolean;
  data?: PrivateChatRecord;
};

export function getIndividualChatKey(chat: ChatParticipant): string {
  return chat.chat_id ? String(chat.chat_id) : `user-${chat.user_id}`;
}

export function dedupeIndividualChats(
  chats: ChatParticipant[],
): ChatParticipant[] {
  const byUserId = new Map<string, ChatParticipant>();

  for (const chat of chats) {
    const userKey = String(chat.user_id);
    const existing = byUserId.get(userKey);
    if (!existing) {
      byUserId.set(userKey, chat);
      continue;
    }
    if (chat.chat_id && !existing.chat_id) {
      byUserId.set(userKey, chat);
    }
  }

  return Array.from(byUserId.values());
}

export function mergeChatListUpdate(
  chats: ChatParticipant[],
  update: PrivateChatRecord,
): ChatParticipant[] {
  const mapped = mapPrivateChatToParticipant(update);
  const without = chats.filter((chat) => {
    if (mapped.chat_id && chat.chat_id === mapped.chat_id) return false;
    if (chat.user_id === mapped.user_id) return false;
    return true;
  });
  return dedupeIndividualChats([mapped, ...without]);
}

export function fetchMyIndividualChatsViaSocket(
  socket: Socket,
  userId: number,
  companyId: number,
  options: { page?: number; limit?: number } = {},
): Promise<ChatParticipant[]> {
  return new Promise((resolve, reject) => {
    const timeoutMs = 15000;
    let settled = false;

    const cleanup = () => {
      clearTimeout(timeoutId);
      socket.off("receive_all_messages", onMessages);
      socket.off("error", onError);
    };

    const onMessages = (payload: AllMessagesSocketResponse) => {
      if (settled) return;

      if (!payload.success) {
        settled = true;
        cleanup();
        reject(new Error(payload.message || "Failed to load chats"));
        return;
      }

      const rows = payload.data ?? [];
      settled = true;
      cleanup();
      resolve(dedupeIndividualChats(rows.map(mapPrivateChatToParticipant)));
    };

    const onError = (err: { message?: string }) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(err?.message || "Failed to load chats"));
    };

    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("Chat list request timed out"));
    }, timeoutMs);

    socket.on("receive_all_messages", onMessages);
    socket.on("error", onError);
    socket.emit("get_all_messages", {
      user_id: userId,
      company_id: companyId,
      page: options.page ?? 1,
      limit: options.limit ?? 50,
    });
  });
}

export async function fetchMyIndividualChats(
  token: string,
  orgId: string,
): Promise<ChatParticipant[]> {
  const q = encodeURIComponent(orgId);
  const res = await fetch(
    `${API_URL}/api/chat-application/get-my-all-chats?org_id=${q}`,
    {
      method: "GET",
      headers: authHeaders(token),
    },
  );

  const result = (await res.json()) as {
    success?: boolean;
    message?: string;
    data?: PrivateChatRecord[];
  };

  if (res.status === 404) return [];
  if (!res.ok) {
    const error: ApiError = new Error(
      result.message || "Failed to load chats",
    );
    error.status = res.status;
    throw error;
  }

  return Array.isArray(result.data)
    ? dedupeIndividualChats(result.data.map(mapPrivateChatToParticipant))
    : [];
}

export async function deletePrivateMessages(
  token: string,
  orgId: string,
  chatId: string,
  messageIds: string[],
): Promise<string[]> {
  const orgQ = encodeURIComponent(orgId);
  const res = await fetch(
    `${API_URL}/api/chat-application/delete-my-messages/${encodeURIComponent(chatId)}?org_id=${orgQ}`,
    {
      method: "DELETE",
      headers: authHeaders(token),
      body: JSON.stringify({ message_ids: messageIds }),
    },
  );

  const result = (await res.json()) as {
    success?: boolean;
    message?: string;
    data?: { deleted_message_ids?: string[] };
  };

  if (!res.ok) {
    const error: ApiError = new Error(
      result.message || "Failed to delete messages",
    );
    error.status = res.status;
    throw error;
  }

  return result.data?.deleted_message_ids ?? messageIds;
}

export function mapGroupToChatParticipant(group: ChatGroupRecord): GroupChat {
  return {
    user_id: String(group._id),
    user_name: group.group_name,
    user_profile: group.group_image || null,
    user_last_message: group.group_description || "No messages yet",
    last_message_at: group.last_message_time
      ? new Date(group.last_message_time).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })
      : undefined,
    unread_count: 0,
    member_count: group.participants?.length ?? 0,
  };
}
