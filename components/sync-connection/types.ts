export type ChatTab = "individual" | "groups" | "calls" | "status";

export type ChatParticipant = {
  user_id: string;
  user_name: string;
  user_profile?: string | null;
  user_last_message?: string | null;
  last_message_at?: string | null;
  unread_count?: number;
  is_online?: boolean;
  is_typing?: boolean;
};

export type GroupChat = ChatParticipant & {
  member_count?: number;
};

export type CallEntry = {
  call_id: string;
  user_name: string;
  user_profile?: string | null;
  call_type: "incoming" | "outgoing" | "missed";
  call_mode: "voice" | "video";
  timestamp: string;
};

export type StatusEntry = {
  status_id: string;
  user_name: string;
  user_profile?: string | null;
  preview_text?: string;
  timestamp: string;
  viewed?: boolean;
};

export type ChatMessage = {
  message_id: string;
  text: string;
  timestamp: string;
  is_outgoing: boolean;
  user_profile?: string | null;
  status?: "sent" | "delivered" | "read";
};
