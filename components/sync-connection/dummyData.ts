import type {
  CallEntry,
  ChatMessage,
  ChatParticipant,
  GroupChat,
  StatusEntry,
} from "./types";

export const DUMMY_INDIVIDUAL_CHATS: ChatParticipant[] = [
  {
    user_id: "u1",
    user_name: "Sarah Chen",
    user_profile: "https://i.pravatar.cc/150?u=sarah-chen",
    user_last_message: "The attendance report looks good. I'll review it tonight.",
    last_message_at: "10:42 AM",
    unread_count: 2,
    is_online: true,
  },
  {
    user_id: "u2",
    user_name: "James Wilson",
    user_last_message: "Can you approve my leave request?",
    last_message_at: "Yesterday",
    unread_count: 0,
    is_online: false,
  },
  {
    user_id: "u3",
    user_name: "Priya Sharma",
    user_profile: "https://i.pravatar.cc/150?u=priya-sharma",
    user_last_message: "Meeting moved to 3 PM tomorrow.",
    last_message_at: "Yesterday",
    unread_count: 1,
    is_online: true,
  },
  {
    user_id: "u4",
    user_name: "Michael Torres",
    user_profile: "https://i.pravatar.cc/150?u=michael-torres",
    user_last_message: "Thanks for the update!",
    last_message_at: "Mon",
    unread_count: 0,
    is_online: false,
  },
  {
    user_id: "u5",
    user_name: "Emily Nakamura",
    user_last_message: "Shared the payroll documents.",
    last_message_at: "Sun",
    unread_count: 0,
    is_online: true,
  },
  {
    user_id: "u6",
    user_name: "David Okonkwo",
    user_profile: "https://i.pravatar.cc/150?u=david-okonkwo",
    user_last_message: "See you at the standup.",
    last_message_at: "Sat",
    unread_count: 0,
    is_online: false,
  },
  {
    user_id: "u7",
    user_name: "Lisa Anderson",
    user_last_message: "Got it, will sync with HR.",
    last_message_at: "Fri",
    unread_count: 3,
    is_online: false,
  },
];

export const DUMMY_GROUP_CHATS: GroupChat[] = [
  {
    user_id: "g1",
    user_name: "Engineering Team",
    user_last_message: "Alex: Deploy scheduled for Friday",
    last_message_at: "11:05 AM",
    unread_count: 5,
    member_count: 24,
  },
  {
    user_id: "g2",
    user_name: "HR Announcements",
    user_last_message: "Reminder: Benefits enrollment closes soon",
    last_message_at: "9:30 AM",
    unread_count: 0,
    member_count: 156,
  },
  {
    user_id: "g3",
    user_name: "Project Alpha",
    user_last_message: "Maya: Updated the sprint board",
    last_message_at: "Yesterday",
    unread_count: 12,
    member_count: 8,
  },
  {
    user_id: "g4",
    user_name: "Office Updates",
    user_last_message: "New parking policy effective next week",
    last_message_at: "Tue",
    unread_count: 0,
    member_count: 89,
  },
];

export const DUMMY_CALLS: CallEntry[] = [
  {
    call_id: "c1",
    user_name: "Sarah Chen",
    call_type: "incoming",
    call_mode: "video",
    timestamp: "Today, 10:15 AM",
  },
  {
    call_id: "c2",
    user_name: "James Wilson",
    call_type: "outgoing",
    call_mode: "voice",
    timestamp: "Yesterday, 4:22 PM",
  },
  {
    call_id: "c3",
    user_name: "Priya Sharma",
    call_type: "missed",
    call_mode: "voice",
    timestamp: "Yesterday, 11:08 AM",
  },
  {
    call_id: "c4",
    user_name: "Michael Torres",
    call_type: "incoming",
    call_mode: "voice",
    timestamp: "Mon, 2:45 PM",
  },
];

export const DUMMY_STATUS: StatusEntry[] = [
  {
    status_id: "s1",
    user_name: "Sarah Chen",
    preview_text: "At the conference this week",
    timestamp: "2h ago",
    viewed: false,
  },
  {
    status_id: "s2",
    user_name: "Emily Nakamura",
    preview_text: "Team offsite photos",
    timestamp: "5h ago",
    viewed: true,
  },
  {
    status_id: "s3",
    user_name: "David Okonkwo",
    preview_text: "Q2 goals update",
    timestamp: "Yesterday",
    viewed: false,
  },
];

export const DUMMY_CHAT_HISTORY: Record<string, ChatMessage[]> = {
  u1: [
    {
      message_id: "m1",
      text: "Hi Sarah, did you get a chance to look at the attendance summary?",
      timestamp: "10:30 AM",
      is_outgoing: true,
      status: "read",
    },
    {
      message_id: "m2",
      text: "Yes! I went through it this morning.",
      timestamp: "10:35 AM",
      is_outgoing: false,
      user_profile: "https://i.pravatar.cc/150?u=sarah-chen",
    },
    {
      message_id: "m3",
      text: "The numbers for last week look accurate. Great work on the export.",
      timestamp: "10:36 AM",
      is_outgoing: false,
      user_profile: "https://i.pravatar.cc/150?u=sarah-chen",
    },
    {
      message_id: "m4",
      text: "Thanks! I'll send the final version to management by EOD.",
      timestamp: "10:38 AM",
      is_outgoing: true,
      status: "read",
    },
    {
      message_id: "m5",
      text: "The attendance report looks good. I'll review it tonight.",
      timestamp: "10:42 AM",
      is_outgoing: false,
      user_profile: "https://i.pravatar.cc/150?u=sarah-chen",
    },
  ],
  u2: [
    {
      message_id: "m1",
      text: "Hey James, how can I help?",
      timestamp: "Yesterday",
      is_outgoing: true,
      status: "delivered",
    },
    {
      message_id: "m2",
      text: "Can you approve my leave request?",
      timestamp: "Yesterday",
      is_outgoing: false,
    },
  ],
  u3: [
    {
      message_id: "m1",
      text: "Quick heads up about tomorrow's meeting.",
      timestamp: "Yesterday",
      is_outgoing: false,
      user_profile: "https://i.pravatar.cc/150?u=priya-sharma",
    },
    {
      message_id: "m2",
      text: "Meeting moved to 3 PM tomorrow.",
      timestamp: "Yesterday",
      is_outgoing: false,
      user_profile: "https://i.pravatar.cc/150?u=priya-sharma",
    },
  ],
  g1: [
    {
      message_id: "m1",
      text: "Sprint review is at 4 PM today.",
      timestamp: "10:00 AM",
      is_outgoing: false,
      user_profile: "https://i.pravatar.cc/150?u=alex-dev",
    },
    {
      message_id: "m2",
      text: "Alex: Deploy scheduled for Friday",
      timestamp: "11:05 AM",
      is_outgoing: false,
      user_profile: "https://i.pravatar.cc/150?u=alex-dev",
    },
  ],
};

/** First name initial + last name initial (WhatsApp-style). */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return parts[0]?.[0]?.toUpperCase() ?? "?";
}

const AVATAR_COLORS = [
  "#008CD3",
  "#0C123A",
  "#7C3AED",
  "#059669",
  "#D97706",
  "#DC2626",
  "#0891B2",
  "#4F46E5",
];

export function getAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
