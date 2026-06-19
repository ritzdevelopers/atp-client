export type ChatTab = "individual" | "groups" | "calls" | "status";

export type ChatParticipant = {
  user_id: string;
  user_name: string;
  user_profile?: string | null;
  chat_id?: string | null;
  user_last_message?: string | null;
  last_message_at?: string | null;
  /** Raw ISO timestamp for sorting — not for display */
  last_message_time?: string | null;
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

export type ChatMessageReply = {
  message_id: string;
  text: string;
  sender_id: number;
  sender_name: string;
  is_outgoing: boolean;
};

export type ChatAttachment = {
  url: string;
  file_name?: string;
  mime_type?: string;
  size?: number;
};

export type ChatMessageType =
  | "text"
  | "image"
  | "audio"
  | "video"
  | "file"
  | "link"
  | "location";

export type ChatMessage = {
  message_id: string;
  text: string;
  timestamp: string;
  is_outgoing: boolean;
  user_profile?: string | null;
  status?: "sent" | "delivered" | "read";
  is_edited?: boolean;
  reply_to?: ChatMessageReply | null;
  type?: ChatMessageType;
  attachments?: ChatAttachment[];
  media_uploading?: boolean;
  sender_name?: string;
};
