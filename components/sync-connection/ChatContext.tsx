"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useParams } from "next/navigation";
import {
  fetchMyChatGroups,
  mapGroupToChatParticipant,
} from "@/services/chatApplication";
import { DUMMY_INDIVIDUAL_CHATS } from "./dummyData";
import type { ChatParticipant, ChatTab, GroupChat } from "./types";

type AvatarPreview = {
  name: string;
  imageUrl?: string | null;
  color: string;
};

type ChatContextValue = {
  activeTab: ChatTab;
  setActiveTab: (tab: ChatTab) => void;
  individualChats: ChatParticipant[];
  setIndividualChats: (chats: ChatParticipant[]) => void;
  groupChats: GroupChat[];
  setGroupChats: (chats: GroupChat[]) => void;
  refreshGroupChats: () => Promise<void>;
  selectedChat: ChatParticipant | null;
  selectChat: (chat: ChatParticipant | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  avatarPreview: AvatarPreview | null;
  openAvatarPreview: (preview: AvatarPreview) => void;
  closeAvatarPreview: () => void;
  mobileShowChat: boolean;
  setMobileShowChat: (show: boolean) => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const params = useParams();
  const orgId = String(params?.org_id ?? "");

  const [activeTab, setActiveTab] = useState<ChatTab>("individual");
  const [individualChats, setIndividualChats] = useState<ChatParticipant[]>(
    DUMMY_INDIVIDUAL_CHATS,
  );
  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatParticipant | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<AvatarPreview | null>(
    null,
  );
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const selectChat = useCallback((chat: ChatParticipant | null) => {
    setSelectedChat(chat);
    if (chat) setMobileShowChat(true);
  }, []);

  const openAvatarPreview = useCallback((preview: AvatarPreview) => {
    setAvatarPreview(preview);
  }, []);

  const closeAvatarPreview = useCallback(() => {
    setAvatarPreview(null);
  }, []);

  const refreshGroupChats = useCallback(async () => {
    if (!orgId) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const groups = await fetchMyChatGroups(token, orgId);
      setGroupChats(groups.map(mapGroupToChatParticipant));
    } catch {
      /* keep existing list on failure */
    }
  }, [orgId]);

  const value = useMemo(
    () => ({
      activeTab,
      setActiveTab,
      individualChats,
      setIndividualChats,
      groupChats,
      setGroupChats,
      refreshGroupChats,
      selectedChat,
      selectChat,
      searchQuery,
      setSearchQuery,
      avatarPreview,
      openAvatarPreview,
      closeAvatarPreview,
      mobileShowChat,
      setMobileShowChat,
    }),
    [
      activeTab,
      individualChats,
      groupChats,
      refreshGroupChats,
      selectedChat,
      selectChat,
      searchQuery,
      avatarPreview,
      openAvatarPreview,
      closeAvatarPreview,
      mobileShowChat,
    ],
  );

  return (
    <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
  );
}

export function useChatContext() {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error("useChatContext must be used within ChatProvider");
  }
  return ctx;
}
