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
    user_name: chat.participant_info.receiver_name,
    user_profile: chat.participant_info.receiver_profile_img || null,
    user_last_message: chat.last_message || undefined,
    last_message_at: formatChatTimestamp(chat.last_message_time),
    unread_count: 0,
  };
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
    ? result.data.map(mapPrivateChatToParticipant)
    : [];
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
