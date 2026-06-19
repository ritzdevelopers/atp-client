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
  MdDelete,
  MdDone,
  MdDoneAll,
  MdEdit,
  MdEmojiEmotions,
  MdInfoOutline,
  MdMoreVert,
  MdPersonAdd,
  MdPersonRemove,
  MdReply,
  MdSend,
  MdBlock,
} from "react-icons/md";
import { SocketContext } from "@/components/sockets/Socket.Provider";
import {
  fetchGroupChatHistory,
  fetchGroupMembers,
  fetchPrivateChatHistory,
  fileToDataUrl,
  formatLastActiveLabel,
  inferChatMessageTypeFromMime,
  jwtUserId,
  mapSocketMessageToChatMessage,
  mapSocketMessageToGroupChatMessage,
  validateChatMediaFile,
  type SeenPrivateMessagePayload,
  type TypingIndicatorPayload,
  type SocketMessageRecord,
} from "@/services/chatApplication";
import { getSyncConnectionBase } from "@/lib/syncConnectionPaths";
import ChatAvatar from "./ChatAvatar";
import GroupManagePanel, {
  type GroupManageView,
} from "./GroupManagePanel";
import { useChatContext } from "./ChatContext";
import MobileEmojiPicker from "./MobileEmojiPicker";
import type {
  ChatMessage,
  ChatMessageReply,
  ChatTab,
  GroupChat,
} from "./types";

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
  const syncConnectionBase = useMemo(
    () => getSyncConnectionBase(pathname, orgId),
    [pathname, orgId],
  );
  const activeTab = useMemo(
    () => tabFromPathname(pathname, syncConnectionBase),
    [pathname, syncConnectionBase],
  );
  const isLgScreen = useIsLgScreen();
  const { selectedChat, mobileShowChat, setMobileShowChat, refreshGroupChats, selectChat } =
    useChatContext();
  const { socket, isConnected, getUserActiveStatus } = useContext(SocketContext);

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [groupManageOpen, setGroupManageOpen] = useState(false);
  const [groupManageView, setGroupManageView] =
    useState<GroupManageView>("menu");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [openMessageMenuId, setOpenMessageMenuId] = useState<string | null>(
    null,
  );
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedDeleteIds, setSelectedDeleteIds] = useState<string[]>([]);
  const [deletingMessages, setDeletingMessages] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessageReply | null>(null);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const isGroupChat = activeTab === "groups";
  const [groupTyperName, setGroupTyperName] = useState<string | null>(null);
  const [contactIsTyping, setContactIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const groupMemberNamesRef = useRef<Map<number, string>>(new Map());
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const joinedChatIdRef = useRef<string | null>(null);
  const joinedRoomIsGroupRef = useRef(false);
  const messageMenuRef = useRef<HTMLDivElement>(null);
  const pendingEditRef = useRef<{ messageId: string; originalText: string } | null>(
    null,
  );
  const pendingDeleteRef = useRef<{
    snapshot: ChatMessage[];
    pendingIds: Set<string>;
  } | null>(null);
  const pendingReplyRef = useRef<{
    optimisticMessage: ChatMessage;
  } | null>(null);
  const pendingMediaRef = useRef<{
    optimisticMessage: ChatMessage;
    localPreviewUrl?: string;
  } | null>(null);
  const isTypingActiveRef = useRef(false);
  const typingStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const contactTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

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

  const contactActiveStatus = useMemo(() => {
    if (!selectedChat) {
      return { isOnline: false, lastActiveTime: null };
    }
    return getUserActiveStatus(selectedChat.user_id);
  }, [selectedChat, getUserActiveStatus]);

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

  const openGroupManage = useCallback((view: GroupManageView = "menu") => {
    setGroupManageView(view);
    setGroupManageOpen(true);
    setMoreMenuOpen(false);
  }, []);

  const handleGroupUpdated = useCallback(
    (patch?: { group_name?: string; member_count?: number }) => {
      void refreshGroupChats();
      if (!selectedChat) return;
      if (!patch) {
        selectChat(null);
        setMobileShowChat(false);
        return;
      }
      selectChat({
        ...selectedChat,
        ...(patch.group_name ? { user_name: patch.group_name } : {}),
        ...(patch.member_count != null
          ? { member_count: patch.member_count }
          : {}),
      } as GroupChat);
    },
    [refreshGroupChats, selectedChat, selectChat, setMobileShowChat],
  );

  const exitDeleteMode = useCallback(() => {
    setDeleteMode(false);
    setSelectedDeleteIds([]);
    setDeleteError(null);
    setOpenMessageMenuId(null);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingMessageId(null);
    setMessage("");
    setEditError(null);
    pendingEditRef.current = null;
  }, []);

  const clearPendingDelete = useCallback(() => {
    pendingDeleteRef.current = null;
    setDeletingMessages(false);
  }, []);

  const cancelReply = useCallback(() => {
    setReplyingTo(null);
    setReplyError(null);
    pendingReplyRef.current = null;
  }, []);

  const clearPendingMedia = useCallback(() => {
    if (pendingMediaRef.current?.localPreviewUrl) {
      URL.revokeObjectURL(pendingMediaRef.current.localPreviewUrl);
    }
    pendingMediaRef.current = null;
    setUploadingMedia(false);
    setMediaError(null);
  }, []);

  const startReplyMessage = useCallback(
    (msg: ChatMessage) => {
      if (msg.message_id.startsWith("temp-")) return;
      setOpenMessageMenuId(null);
      cancelEditing();
      setReplyError(null);
      const senderId = msg.is_outgoing
        ? Number(currentUserId)
        : isGroupChat
          ? 0
          : Number(contactUserId);
      setReplyingTo({
        message_id: msg.message_id,
        text: msg.text,
        sender_id: senderId,
        sender_name: msg.is_outgoing
          ? "You"
          : isGroupChat
            ? (msg.sender_name ?? "Member")
            : (selectedChat?.user_name ?? "Contact"),
        is_outgoing: msg.is_outgoing,
      });
      requestAnimationFrame(() => {
        if (window.matchMedia("(min-width: 768px)").matches) {
          desktopInputRef.current?.focus();
        } else {
          mobileInputRef.current?.focus();
        }
      });
    },
    [currentUserId, contactUserId, selectedChat?.user_name, cancelEditing, isGroupChat],
  );

  const startEditingMessage = useCallback((msg: ChatMessage) => {
    setOpenMessageMenuId(null);
    setDeleteMode(false);
    cancelReply();
    setEditError(null);
    setEditingMessageId(msg.message_id);
    setMessage(msg.text);
    pendingEditRef.current = null;
    requestAnimationFrame(() => {
      if (window.matchMedia("(min-width: 768px)").matches) {
        desktopInputRef.current?.focus();
      } else {
        mobileInputRef.current?.focus();
      }
    });
  }, [cancelReply]);

  const enterDeleteMode = useCallback((messageId?: string) => {
    setDeleteMode(true);
    setDeleteError(null);
    cancelReply();
    setOpenMessageMenuId(null);
    setSelectedDeleteIds(messageId ? [messageId] : []);
  }, [cancelReply]);

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

  const handleConfirmDelete = useCallback(() => {
    if (
      !chatId ||
      selectedDeleteIds.length === 0 ||
      !socket ||
      currentUserId == null
    ) {
      return;
    }

    setDeletingMessages(true);
    setDeleteError(null);

    const deleteSet = new Set(selectedDeleteIds.map(String));

    setMessages((prev) => {
      pendingDeleteRef.current = {
        snapshot: prev,
        pendingIds: new Set(deleteSet),
      };
      return prev.filter((msg) => !deleteSet.has(msg.message_id));
    });
    exitDeleteMode();

    socket.emit(isGroupChat ? "delete_group_message" : "delete_message", {
      chat_id: chatId,
      user_id: currentUserId,
      message_ids: selectedDeleteIds,
    });
  }, [
    chatId,
    selectedDeleteIds,
    socket,
    currentUserId,
    isGroupChat,
    exitDeleteMode,
  ]);

  const displayedMessages = messages;

  const leaveChatRoom = useCallback(
    (roomId?: string | null) => {
      if (!socket) return;
      const id = roomId ?? joinedChatIdRef.current;
      if (!id) return;
      if (joinedRoomIsGroupRef.current) {
        socket.emit("leave_group_chat", id);
      } else {
        socket.emit("leave_chat_room", id);
      }
      if (joinedChatIdRef.current === id) {
        joinedChatIdRef.current = null;
        joinedRoomIsGroupRef.current = false;
      }
    },
    [socket],
  );

  const isViewingChat = Boolean(
    selectedChat &&
      chatId &&
      (activeTab === "individual" || activeTab === "groups") &&
      (isLgScreen || mobileShowChat),
  );

  const emitTypingStop = useCallback(() => {
    if (!socket || !chatId || currentUserId == null || !isTypingActiveRef.current) {
      return;
    }

    isTypingActiveRef.current = false;
    if (isGroupChat) {
      socket.emit("group_typing_stop", {
        chat_id: chatId,
        user_id: currentUserId,
      });
      return;
    }

    if (contactUserId == null) return;
    socket.emit("typing_stop", {
      chat_id: chatId,
      user_id: currentUserId,
      receiver_id: contactUserId,
    });
  }, [socket, chatId, currentUserId, contactUserId, isGroupChat]);

  const handleMessageChange = useCallback(
    (value: string) => {
      setMessage(value);

      if (
        deleteMode ||
        !socket ||
        !chatId ||
        currentUserId == null ||
        !isViewingChat
      ) {
        return;
      }

      if (!isGroupChat && contactUserId == null) {
        return;
      }

      const trimmed = value.trim();
      if (!trimmed) {
        if (typingStopTimeoutRef.current) {
          clearTimeout(typingStopTimeoutRef.current);
          typingStopTimeoutRef.current = null;
        }
        emitTypingStop();
        return;
      }

      if (!isTypingActiveRef.current) {
        isTypingActiveRef.current = true;
        if (isGroupChat) {
          socket.emit("group_typing_indicator", {
            chat_id: chatId,
            user_id: currentUserId,
            user_name: "You",
          });
        } else {
          socket.emit("typing_indicator", {
            chat_id: chatId,
            user_id: currentUserId,
            receiver_id: contactUserId,
          });
        }
      }

      if (typingStopTimeoutRef.current) {
        clearTimeout(typingStopTimeoutRef.current);
      }
      typingStopTimeoutRef.current = setTimeout(() => {
        emitTypingStop();
        typingStopTimeoutRef.current = null;
      }, 2000);
    },
    [
      socket,
      chatId,
      currentUserId,
      contactUserId,
      isViewingChat,
      isGroupChat,
      deleteMode,
      emitTypingStop,
    ],
  );

  const handleMessageBlur = useCallback(() => {
    if (typingStopTimeoutRef.current) {
      clearTimeout(typingStopTimeoutRef.current);
      typingStopTimeoutRef.current = null;
    }
    emitTypingStop();
  }, [emitTypingStop]);

  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      handleMessageChange(message + emoji);
      mobileInputRef.current?.focus();
    },
    [handleMessageChange, message],
  );

  useEffect(() => {
    setContactIsTyping(false);
    setGroupTyperName(null);
    isTypingActiveRef.current = false;
    if (typingStopTimeoutRef.current) {
      clearTimeout(typingStopTimeoutRef.current);
      typingStopTimeoutRef.current = null;
    }
  }, [selectedChat?.user_id, chatId]);

  useEffect(() => {
    return () => {
      if (typingStopTimeoutRef.current) {
        clearTimeout(typingStopTimeoutRef.current);
      }
      if (contactTypingTimeoutRef.current) {
        clearTimeout(contactTypingTimeoutRef.current);
      }
      emitTypingStop();
    };
  }, [emitTypingStop]);

  useEffect(() => {
    if (!socket || !isConnected || currentUserId == null) return;
    socket.emit("join_user_room", currentUserId);
  }, [socket, isConnected, currentUserId]);

  useEffect(() => {
    if (!socket || currentUserId == null) return;

    const clearContactTypingLater = () => {
      if (contactTypingTimeoutRef.current) {
        clearTimeout(contactTypingTimeoutRef.current);
      }
      contactTypingTimeoutRef.current = setTimeout(() => {
        setContactIsTyping(false);
        setGroupTyperName(null);
        contactTypingTimeoutRef.current = null;
      }, 3000);
    };

    const resolveTyperName = (userId: number, fallback?: string) => {
      const fromMembers = groupMemberNamesRef.current.get(userId);
      if (fromMembers) return fromMembers;
      if (fallback && fallback !== "You") return fallback;
      return "Someone";
    };

    const handlePrivateTyping = (payload: TypingIndicatorPayload) => {
      if (isGroupChat) return;
      if (Number(payload.user_id) === currentUserId) return;

      const typerUserId = String(payload.user_id);
      const activeChatId = chatId ?? selectedChat?.chat_id ?? null;

      if (
        !selectedChat ||
        !isViewingChat ||
        !activeChatId ||
        String(payload.chat_id) !== String(activeChatId) ||
        typerUserId !== String(selectedChat.user_id)
      ) {
        return;
      }

      setContactIsTyping(true);
      clearContactTypingLater();
    };

    const handlePrivateTypingStop = (payload: TypingIndicatorPayload) => {
      if (isGroupChat) return;
      if (Number(payload.user_id) === currentUserId) return;
      if (String(payload.user_id) !== String(selectedChat?.user_id ?? "")) {
        return;
      }

      if (contactTypingTimeoutRef.current) {
        clearTimeout(contactTypingTimeoutRef.current);
        contactTypingTimeoutRef.current = null;
      }
      setContactIsTyping(false);
    };

    const handleGroupTyping = (payload: TypingIndicatorPayload) => {
      if (!isGroupChat) return;
      if (Number(payload.user_id) === currentUserId) return;

      const activeChatId = chatId ?? selectedChat?.chat_id ?? selectedChat?.user_id ?? null;
      if (
        !selectedChat ||
        !isViewingChat ||
        !activeChatId ||
        String(payload.chat_id) !== String(activeChatId)
      ) {
        return;
      }

      setGroupTyperName(
        resolveTyperName(Number(payload.user_id), payload.user_name),
      );
      clearContactTypingLater();
    };

    const handleGroupTypingStop = (payload: TypingIndicatorPayload) => {
      if (!isGroupChat) return;
      if (Number(payload.user_id) === currentUserId) return;

      if (contactTypingTimeoutRef.current) {
        clearTimeout(contactTypingTimeoutRef.current);
        contactTypingTimeoutRef.current = null;
      }
      setGroupTyperName(null);
    };

    socket.on("typing_indicator", handlePrivateTyping);
    socket.on("typing_stop", handlePrivateTypingStop);
    socket.on("group_typing_indicator", handleGroupTyping);
    socket.on("group_typing_stop", handleGroupTypingStop);

    return () => {
      socket.off("typing_indicator", handlePrivateTyping);
      socket.off("typing_stop", handlePrivateTypingStop);
      socket.off("group_typing_indicator", handleGroupTyping);
      socket.off("group_typing_stop", handleGroupTypingStop);
      if (contactTypingTimeoutRef.current) {
        clearTimeout(contactTypingTimeoutRef.current);
      }
    };
  }, [socket, currentUserId, selectedChat, chatId, isViewingChat, isGroupChat]);

  useEffect(() => {
    if (!isGroupChat || !chatId || !orgId) {
      groupMemberNamesRef.current = new Map();
      return;
    }

    let cancelled = false;
    const activeGroupId = chatId;

    async function loadMemberNames() {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const data = await fetchGroupMembers(token, orgId, activeGroupId);
        if (cancelled) return;
        const map = new Map<number, string>();
        for (const member of data.members) {
          map.set(member.id, member.name);
        }
        groupMemberNamesRef.current = map;
      } catch {
        /* member names are optional for typing display */
      }
    }

    void loadMemberNames();
    return () => {
      cancelled = true;
    };
  }, [
    isGroupChat,
    chatId,
    orgId,
    isGroupChat ? (selectedChat as GroupChat | null)?.member_count : null,
  ]);

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

    if (isGroupChat) {
      socket.emit("join_group_chat", chatId, currentUserId);
      joinedRoomIsGroupRef.current = true;
    } else {
      socket.emit("join_chat_room", chatId, currentUserId);
      joinedRoomIsGroupRef.current = false;
    }
    joinedChatIdRef.current = chatId;

    if (isGroupChat) {
      socket.emit("seen_group_message", {
        chat_id: chatId,
        user_id: currentUserId,
      });
    } else {
      socket.emit("seen_private_message", {
        chat_id: chatId,
        user_id: currentUserId,
      });
    }

    return () => {
      leaveChatRoom(chatId);
    };
  }, [socket, currentUserId, chatId, isViewingChat, isGroupChat, leaveChatRoom]);

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
      setMoreMenuOpen(false);
      setGroupManageOpen(false);
      setEmojiPickerOpen(false);
      exitDeleteMode();
      cancelEditing();
      clearPendingDelete();
      cancelReply();
      clearPendingMedia();
      return;
    }

    const nextChatId = isGroupChat
      ? (selectedChat.chat_id ?? selectedChat.user_id ?? null)
      : (selectedChat.chat_id ?? null);
    setChatId(nextChatId);
    exitDeleteMode();
    cancelEditing();
    clearPendingDelete();
    cancelReply();
    clearPendingMedia();

    if (!nextChatId) {
      setMessages([]);
      return;
    }

    if (
      !socket ||
      !isConnected ||
      currentUserId == null ||
      (!isGroupChat && contactUserId == null)
    ) {
      return;
    }

    const chatIdToLoad = nextChatId;
    let cancelled = false;

    setLoadingHistory(true);
    const historyPromise = isGroupChat
      ? fetchGroupChatHistory(socket, chatIdToLoad, currentUserId)
      : fetchPrivateChatHistory(
          socket,
          chatIdToLoad,
          currentUserId,
          contactUserId!,
          selectedChat.user_profile,
          { contactName: selectedChat.user_name },
        );

    historyPromise
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
  }, [selectedChat, socket, isConnected, currentUserId, contactUserId, isGroupChat, exitDeleteMode, cancelEditing, clearPendingDelete, cancelReply, clearPendingMedia]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!socket || !selectedChat || currentUserId == null) return;
    if (!isGroupChat && contactUserId == null) return;

    const contactName = selectedChat.user_name;

    const mapIncoming = (raw: SocketMessageRecord) => {
      if (isGroupChat) {
        return mapSocketMessageToGroupChatMessage(raw, currentUserId);
      }
      return mapSocketMessageToChatMessage(
        raw,
        currentUserId,
        contactUserId!,
        selectedChat.user_profile,
        contactName,
      );
    };

    const mergeIncomingMessage = (raw: SocketMessageRecord) => {
      const incomingChatId = raw.chat_id ? String(raw.chat_id) : null;
      const activeChatId =
        chatId ?? selectedChat.chat_id ?? selectedChat.user_id ?? null;

      if (
        activeChatId &&
        incomingChatId &&
        incomingChatId !== activeChatId
      ) {
        return;
      }

      const mapped = mapIncoming(raw);
      if (!mapped) return;

      if (!activeChatId && incomingChatId) {
        setChatId(incomingChatId);
      }

      if (pendingReplyRef.current?.optimisticMessage.message_id.startsWith("temp-")) {
        const pending = pendingReplyRef.current.optimisticMessage;
        const sameReplyTarget =
          (pending.reply_to?.message_id ?? null) ===
          (mapped.reply_to?.message_id ?? null);
        if (
          mapped.is_outgoing &&
          mapped.text === pending.text &&
          sameReplyTarget
        ) {
          pendingReplyRef.current = null;
          setReplyError(null);
        }
      }

      if (pendingMediaRef.current?.optimisticMessage.message_id.startsWith("temp-media-")) {
        const pending = pendingMediaRef.current.optimisticMessage;
        if (
          mapped.is_outgoing &&
          mapped.text === pending.text &&
          (mapped.type ?? "text") === (pending.type ?? "text")
        ) {
          if (pendingMediaRef.current.localPreviewUrl) {
            URL.revokeObjectURL(pendingMediaRef.current.localPreviewUrl);
          }
          pendingMediaRef.current = null;
          setMediaError(null);
          setUploadingMedia(false);
        }
      }

      setMessages((prev) => {
        const withoutMatchingOptimistic =
          mapped.is_outgoing
            ? prev.filter((m) => {
                if (!m.message_id.startsWith("temp-") || !m.is_outgoing) {
                  return true;
                }
                if (m.message_id.startsWith("temp-media-")) {
                  const sameMedia =
                    m.text === mapped.text &&
                    (m.type ?? "text") === (mapped.type ?? "text");
                  return !sameMedia;
                }
                if (m.text !== mapped.text) return true;
                const sameReply =
                  (m.reply_to?.message_id ?? null) ===
                  (mapped.reply_to?.message_id ?? null);
                return !sameReply;
              })
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

    const handleReceive = (raw: SocketMessageRecord) => {
      mergeIncomingMessage(raw);
    };

    const handleReply = (raw: SocketMessageRecord) => {
      mergeIncomingMessage(raw);
    };

    const handleMedia = (raw: SocketMessageRecord) => {
      mergeIncomingMessage(raw);
    };

    const handleSeen = (payload: SeenPrivateMessagePayload) => {
      const activeChatId =
        chatId ?? selectedChat.chat_id ?? selectedChat.user_id ?? null;
      if (!activeChatId || String(payload.chat_id) !== String(activeChatId)) {
        return;
      }

      if (isGroupChat) {
        if (Number(payload.seen_by) === currentUserId) return;
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
        return;
      }

      if (Number(payload.seen_by) !== contactUserId) {
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

    const handleEdited = (raw: SocketMessageRecord) => {
      const incomingChatId = raw.chat_id ? String(raw.chat_id) : null;
      const activeChatId =
        chatId ?? selectedChat.chat_id ?? selectedChat.user_id ?? null;

      if (
        activeChatId &&
        incomingChatId &&
        incomingChatId !== activeChatId
      ) {
        return;
      }

      const mapped = mapIncoming(raw);
      if (!mapped) return;

      if (pendingEditRef.current?.messageId === mapped.message_id) {
        pendingEditRef.current = null;
        setEditError(null);
      }

      setMessages((prev) => {
        const exists = prev.some((m) => m.message_id === mapped.message_id);
        if (!exists) return prev;
        return prev.map((m) =>
          m.message_id === mapped.message_id ? mapped : m,
        );
      });

      if (editingMessageId === mapped.message_id) {
        setEditingMessageId(null);
        setMessage("");
      }
    };

    const handleDeleted = (raw: SocketMessageRecord) => {
      const messageId = String(raw._id);
      const incomingChatId = raw.chat_id ? String(raw.chat_id) : null;
      const activeChatId =
        chatId ?? selectedChat.chat_id ?? selectedChat.user_id ?? null;

      if (
        activeChatId &&
        incomingChatId &&
        incomingChatId !== activeChatId
      ) {
        return;
      }

      const pendingDelete = pendingDeleteRef.current;
      if (pendingDelete) {
        pendingDelete.pendingIds.delete(messageId);
        if (pendingDelete.pendingIds.size === 0) {
          pendingDeleteRef.current = null;
          setDeletingMessages(false);
          setDeleteError(null);
        }
      }

      setMessages((prev) =>
        prev.filter((msg) => msg.message_id !== messageId),
      );
    };

    const handleSocketError = (err: { message?: string }) => {
      const pendingEdit = pendingEditRef.current;
      if (pendingEdit) {
        setMessages((prev) =>
          prev.map((m) =>
            m.message_id === pendingEdit.messageId
              ? { ...m, text: pendingEdit.originalText }
              : m,
          ),
        );
        pendingEditRef.current = null;
        setEditingMessageId(pendingEdit.messageId);
        setEditError(err.message || "Could not edit message.");
        return;
      }

      const pendingDelete = pendingDeleteRef.current;
      if (pendingDelete) {
        setMessages(pendingDelete.snapshot);
        pendingDeleteRef.current = null;
        setDeletingMessages(false);
        setDeleteError(err.message || "Could not delete messages.");
        return;
      }

      const pendingReply = pendingReplyRef.current;
      if (pendingReply) {
        setMessages((prev) =>
          prev.filter(
            (m) => m.message_id !== pendingReply.optimisticMessage.message_id,
          ),
        );
        pendingReplyRef.current = null;
        setReplyError(err.message || "Could not send reply.");
        return;
      }

      const pendingMedia = pendingMediaRef.current;
      if (pendingMedia) {
        setMessages((prev) =>
          prev.filter(
            (m) => m.message_id !== pendingMedia.optimisticMessage.message_id,
          ),
        );
        if (pendingMedia.localPreviewUrl) {
          URL.revokeObjectURL(pendingMedia.localPreviewUrl);
        }
        pendingMediaRef.current = null;
        setUploadingMedia(false);
        setMediaError(err.message || "Could not send media.");
      }
    };

    if (isGroupChat) {
      socket.on("receive_group_message", handleReceive);
      socket.on("receive_group_reply_message", handleReply);
      socket.on("receive_group_media_message", handleMedia);
      socket.on("seen_group_message", handleSeen);
      socket.on("receive_group_edited_message", handleEdited);
      socket.on("receive_group_deleted_message", handleDeleted);
    } else {
      socket.on("receive_private_message", handleReceive);
      socket.on("receive_reply_message", handleReply);
      socket.on("receive_media_message", handleMedia);
      socket.on("seen_private_message", handleSeen);
      socket.on("receive_edited_message", handleEdited);
      socket.on("receive_deleted_message", handleDeleted);
    }
    socket.on("error", handleSocketError);
    return () => {
      if (isGroupChat) {
        socket.off("receive_group_message", handleReceive);
        socket.off("receive_group_reply_message", handleReply);
        socket.off("receive_group_media_message", handleMedia);
        socket.off("seen_group_message", handleSeen);
        socket.off("receive_group_edited_message", handleEdited);
        socket.off("receive_group_deleted_message", handleDeleted);
      } else {
        socket.off("receive_private_message", handleReceive);
        socket.off("receive_reply_message", handleReply);
        socket.off("receive_media_message", handleMedia);
        socket.off("seen_private_message", handleSeen);
        socket.off("receive_edited_message", handleEdited);
        socket.off("receive_deleted_message", handleDeleted);
      }
      socket.off("error", handleSocketError);
    };
  }, [socket, selectedChat, currentUserId, contactUserId, chatId, editingMessageId, isGroupChat]);

  const handleSaveEdit = useCallback(() => {
    const text = message.trim();
    if (
      !text ||
      !socket ||
      !selectedChat ||
      currentUserId == null ||
      !chatId ||
      !editingMessageId
    ) {
      return;
    }

    const original = messages.find((m) => m.message_id === editingMessageId);
    if (!original) return;

    if (text === original.text) {
      cancelEditing();
      return;
    }

    if (typingStopTimeoutRef.current) {
      clearTimeout(typingStopTimeoutRef.current);
      typingStopTimeoutRef.current = null;
    }
    emitTypingStop();

    pendingEditRef.current = {
      messageId: editingMessageId,
      originalText: original.text,
    };
    setEditError(null);

    setMessages((prev) =>
      prev.map((m) =>
        m.message_id === editingMessageId
          ? { ...m, text, is_edited: true, status: "sent" as const }
          : m,
      ),
    );
    setEditingMessageId(null);
    setMessage("");

    socket.emit(isGroupChat ? "edit_group_message" : "edit_chat", {
      chat_id: chatId,
      user_id: currentUserId,
      message_id: pendingEditRef.current.messageId,
      new_content: text,
    });
  }, [
    message,
    socket,
    selectedChat,
    currentUserId,
    chatId,
    editingMessageId,
    messages,
    cancelEditing,
    emitTypingStop,
    isGroupChat,
  ]);

  const handleSendMedia = useCallback(
    async (file: File) => {
      if (!socket || !selectedChat || currentUserId == null || uploadingMedia) {
        return;
      }

      const validationError = validateChatMediaFile(file);
      if (validationError) {
        setMediaError(validationError);
        return;
      }

      setMediaError(null);
      setUploadingMedia(true);

      if (typingStopTimeoutRef.current) {
        clearTimeout(typingStopTimeoutRef.current);
        typingStopTimeoutRef.current = null;
      }
      emitTypingStop();

      const localPreviewUrl = URL.createObjectURL(file);
      const messageType = inferChatMessageTypeFromMime(file.type);
      const optimisticId = `temp-media-${Date.now()}`;
      const optimisticMessage: ChatMessage = {
        message_id: optimisticId,
        text: file.name,
        timestamp: new Date().toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        }),
        is_outgoing: true,
        status: "sent",
        type: messageType,
        attachments: [
          {
            url: localPreviewUrl,
            file_name: file.name,
            mime_type: file.type,
            size: file.size,
          },
        ],
        media_uploading: true,
        reply_to: replyingTo,
      };

      pendingMediaRef.current = { optimisticMessage, localPreviewUrl };
      setMessages((prev) => [...prev, optimisticMessage]);

      try {
        const dataUrl = await fileToDataUrl(file);
        if (isGroupChat) {
          socket.emit("send_group_media", {
            sender: currentUserId,
            company_id: Number(orgId),
            chat_id: chatId,
            type: messageType,
            content: file.name,
            ...(replyingTo ? { reply_to: replyingTo.message_id } : {}),
            attachments: [
              {
                data: dataUrl,
                file_name: file.name,
                mime_type: file.type,
                size: file.size,
              },
            ],
          });
        } else {
          socket.emit("send_media", {
            sender: currentUserId,
            delivered_to: Number(selectedChat.user_id),
            company_id: Number(orgId),
            type: messageType,
            content: file.name,
            chat_type: "private",
            ...(chatId ? { chat_id: chatId } : {}),
            ...(replyingTo ? { reply_to: replyingTo.message_id } : {}),
            attachments: [
              {
                data: dataUrl,
                file_name: file.name,
                mime_type: file.type,
                size: file.size,
              },
            ],
          });
        }
        setReplyingTo(null);
      } catch {
        setMessages((prev) =>
          prev.filter((msg) => msg.message_id !== optimisticId),
        );
        URL.revokeObjectURL(localPreviewUrl);
        pendingMediaRef.current = null;
        setMediaError("Could not prepare file for upload.");
      } finally {
        setUploadingMedia(false);
      }
    },
    [
      socket,
      selectedChat,
      currentUserId,
      uploadingMedia,
      orgId,
      chatId,
      replyingTo,
      emitTypingStop,
      isGroupChat,
    ],
  );

  const handleAttachClick = useCallback(() => {
    if (deleteMode || editingMessageId || uploadingMedia) return;
    fileInputRef.current?.click();
  }, [deleteMode, editingMessageId, uploadingMedia]);

  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (file) void handleSendMedia(file);
    },
    [handleSendMedia],
  );

  const handleSendMessage = useCallback(() => {
    if (editingMessageId) {
      handleSaveEdit();
      return;
    }

    const text = message.trim();
    if (!text || !socket || !selectedChat || currentUserId == null) return;

    if (typingStopTimeoutRef.current) {
      clearTimeout(typingStopTimeoutRef.current);
      typingStopTimeoutRef.current = null;
    }
    emitTypingStop();

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
      reply_to: replyingTo,
    };

    setMessage("");
    setMessages((prev) => [...prev, optimisticMessage]);

    if (replyingTo) {
      pendingReplyRef.current = { optimisticMessage };
      setReplyError(null);

      if (isGroupChat) {
        socket.emit("reply_to_group_message", {
          chat_id: chatId,
          user_id: currentUserId,
          message_id: replyingTo.message_id,
          content: text,
          company_id: Number(orgId),
          type: "text",
        });
      } else {
        socket.emit("reply_to_message", {
          chat_id: chatId,
          user_id: currentUserId,
          message_id: replyingTo.message_id,
          content: text,
          delivered_to: Number(selectedChat.user_id),
          company_id: Number(orgId),
          chat_type: "private",
          type: "text",
        });
      }

      setReplyingTo(null);
      return;
    }

    if (isGroupChat) {
      socket.emit("send_group_message", {
        sender: currentUserId,
        company_id: Number(orgId),
        chat_id: chatId,
        type: "text",
        content: text,
      });
      return;
    }

    socket.emit("send_private_message", {
      sender: currentUserId,
      delivered_to: Number(selectedChat.user_id),
      type: "text",
      content: text,
      company_id: Number(orgId),
      chat_type: "private",
      ...(chatId ? { chat_id: chatId } : {}),
    });
  }, [message, socket, selectedChat, currentUserId, orgId, chatId, emitTypingStop, editingMessageId, handleSaveEdit, replyingTo, isGroupChat]);

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
          showOnline={!isGroupChat}
          isOnline={!isGroupChat && contactActiveStatus.isOnline}
        />

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-semibold text-[#111827]">
            {selectedChat.user_name}
          </h2>
          <p className="text-xs">
            {isGroupChat && groupTyperName ? (
              <span className="font-medium text-[#008CD3]">
                {groupTyperName} is typing…
              </span>
            ) : !isGroupChat && contactIsTyping ? (
              <span className="font-medium text-[#008CD3]">typing…</span>
            ) : !isConnected ? (
              <span className="text-[#6B7280]">Connecting…</span>
            ) : isGroupChat ? (
              <span className="text-[#9CA3AF]">
                {(selectedChat as GroupChat).member_count
                  ? `${(selectedChat as GroupChat).member_count} members`
                  : "Group chat"}
              </span>
            ) : contactActiveStatus.isOnline ? (
              <span className="font-medium text-emerald-600">online</span>
            ) : (
              <span className="text-[#9CA3AF]">
                {contactActiveStatus.lastActiveTime
                  ? formatLastActiveLabel(
                      contactActiveStatus.lastActiveTime,
                      false,
                    )
                  : "offline"}
              </span>
            )}
          </p>
        </div>

        {isGroupChat ? (
          <div className="flex items-center gap-0.5">
            <IconButton
              label="Add members"
              icon={<MdPersonAdd className="text-xl" />}
              onClick={() => openGroupManage("add")}
            />
            <div ref={moreMenuRef} className="relative">
              <IconButton
                label="More options"
                icon={<MdMoreVert className="text-xl" />}
                onClick={() => setMoreMenuOpen((open) => !open)}
              />
              {moreMenuOpen ? (
                <div className="absolute right-0 top-full z-50 mt-1 min-w-[12rem] overflow-hidden rounded-xl border border-[#E4E7EC] bg-white py-1 shadow-lg">
                  <MobileMenuItem
                    icon={<MdInfoOutline className="text-lg text-[#008CD3]" />}
                    label="View group info"
                    onClick={() => openGroupManage("info")}
                  />
                  <MobileMenuItem
                    icon={<MdPersonAdd className="text-lg text-[#008CD3]" />}
                    label="Add members"
                    onClick={() => openGroupManage("add")}
                  />
                  <MobileMenuItem
                    icon={<MdPersonRemove className="text-lg text-[#008CD3]" />}
                    label="Remove members"
                    onClick={() => openGroupManage("remove")}
                  />
                  <MobileMenuItem
                    icon={<MdEdit className="text-lg text-[#008CD3]" />}
                    label="Edit group"
                    onClick={() => openGroupManage("edit")}
                  />
                  <MobileMenuItem
                    icon={<MdBlock className="text-lg text-[#DC2626]" />}
                    label="Deactivate group"
                    onClick={() => openGroupManage("menu")}
                  />
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </header>

      {isGroupChat && chatId ? (
        <GroupManagePanel
          open={groupManageOpen}
          onClose={() => setGroupManageOpen(false)}
          orgId={orgId}
          groupId={chatId}
          initialView={groupManageView}
          onGroupUpdated={handleGroupUpdated}
        />
      ) : null}

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
              No messages yet. Say hello!
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
                  onEdit={() => startEditingMessage(msg)}
                  onReply={() => startReplyMessage(msg)}
                  onDelete={() => enterDeleteMode(msg.message_id)}
                  isGroupChat={isGroupChat}
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
        {editingMessageId ? (
          <div className="mx-auto mb-2 flex max-w-3xl items-center justify-between gap-3 rounded-lg border border-[#B8E0F5] bg-[#E8F4FB] px-3 py-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#008CD3]">Edit message</p>
              <p className="truncate text-xs text-[#6B7280]">
                Press Enter or send to save changes
              </p>
            </div>
            <button
              type="button"
              onClick={cancelEditing}
              className="shrink-0 cursor-pointer rounded-md border-0 bg-transparent px-2 py-1 text-xs font-medium text-[#6B7280] outline-none hover:bg-white/70 hover:text-[#374151]"
            >
              Cancel
            </button>
          </div>
        ) : null}
        {editError ? (
          <p className="mx-auto mb-2 max-w-3xl text-center text-xs text-[#DC2626]">
            {editError}
          </p>
        ) : null}
        {replyingTo ? (
          <div className="mx-auto mb-2 flex max-w-3xl items-stretch gap-2 rounded-lg border border-[#E4E7EC] bg-white px-3 py-2 shadow-sm">
            <div
              className="w-1 shrink-0 rounded-full"
              style={{
                backgroundColor: replyingTo.is_outgoing ? "#06CF9C" : "#008CD3",
              }}
            />
            <div className="min-w-0 flex-1">
              <p
                className="text-xs font-semibold"
                style={{
                  color: replyingTo.is_outgoing ? "#06CF9C" : "#008CD3",
                }}
              >
                {replyingTo.sender_name}
              </p>
              <p className="truncate text-xs text-[#6B7280]">{replyingTo.text}</p>
            </div>
            <button
              type="button"
              onClick={cancelReply}
              className="shrink-0 cursor-pointer self-start rounded-md border-0 bg-transparent px-2 py-1 text-xs font-medium text-[#6B7280] outline-none hover:bg-[#F3F4F6] hover:text-[#374151]"
            >
              Cancel
            </button>
          </div>
        ) : null}
        {replyError ? (
          <p className="mx-auto mb-2 max-w-3xl text-center text-xs text-[#DC2626]">
            {replyError}
          </p>
        ) : null}
        {mediaError ? (
          <p className="mx-auto mb-2 max-w-3xl text-center text-xs text-[#DC2626]">
            {mediaError}
          </p>
        ) : null}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
          className="hidden"
          onChange={handleFileInputChange}
          aria-hidden
        />
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
            onClick={handleAttachClick}
            disabled={!isConnected || uploadingMedia || deleteMode || !!editingMessageId}
          />
          <div className="min-w-0 flex-1">
            <input
              ref={desktopInputRef}
              type="text"
              value={message}
              onChange={(e) => handleMessageChange(e.target.value)}
              onBlur={handleMessageBlur}
              onKeyDown={handleKeyDown}
              placeholder={editingMessageId ? "Edit message" : "Type a message"}
              disabled={!isConnected}
              className="w-full rounded-xl border border-[#E4E7EC] bg-white px-4 py-2.5 text-sm text-[#111827] outline-none placeholder:text-[#9CA3AF] disabled:cursor-not-allowed disabled:opacity-70"
              aria-label={editingMessageId ? "Edit message input" : "Message input"}
            />
          </div>
          <button
            type="button"
            onClick={handleSendMessage}
            disabled={!isConnected || message.trim() === ""}
            className="mb-0.5 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-[#008CD3] text-white outline-none transition hover:bg-[#0070AA] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={editingMessageId ? "Save edited message" : "Send message"}
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
              onChange={(e) => handleMessageChange(e.target.value)}
              onBlur={handleMessageBlur}
              onKeyDown={handleKeyDown}
              onFocus={() => setEmojiPickerOpen(false)}
              placeholder={editingMessageId ? "Edit message" : "Message"}
              disabled={!isConnected}
              className="min-w-0 flex-1 border-0 bg-transparent py-2 text-sm text-[#111827] outline-none placeholder:text-[#9CA3AF] disabled:cursor-not-allowed disabled:opacity-70"
              aria-label={editingMessageId ? "Edit message input" : "Message input"}
            />

            <button
              type="button"
              onClick={handleAttachClick}
              disabled={!isConnected || uploadingMedia || deleteMode || !!editingMessageId}
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-[#6B7280] outline-none transition hover:bg-[#F3F4F6] disabled:cursor-not-allowed disabled:opacity-50"
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
            aria-label={editingMessageId ? "Save edited message" : "Send message"}
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

function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function MessageMediaContent({ message }: { message: ChatMessage }) {
  const attachment = message.attachments?.[0];
  if (!attachment?.url) return null;

  const messageType = message.type ?? "file";
  const fileName = attachment.file_name || message.text || "File";

  if (messageType === "image") {
    return (
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-1 block overflow-hidden rounded-lg"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.url}
          alt={fileName}
          className="max-h-64 max-w-full rounded-lg object-cover"
        />
      </a>
    );
  }

  if (messageType === "video") {
    return (
      <video
        src={attachment.url}
        controls
        className="mb-1 max-h-64 max-w-full rounded-lg"
      >
        <track kind="captions" />
      </video>
    );
  }

  if (messageType === "audio") {
    return (
      <audio src={attachment.url} controls className="mb-1 w-full min-w-[220px]">
        <track kind="captions" />
      </audio>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mb-1 flex items-center gap-3 rounded-lg bg-black/[0.04] px-3 py-2 transition hover:bg-black/[0.07]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#008CD3]/10 text-[#008CD3]">
        <MdAttachFile className="text-xl" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-[#111827]">
          {fileName}
        </span>
        {attachment.size ? (
          <span className="text-[11px] text-[#6B7280]">
            {formatFileSize(attachment.size)}
          </span>
        ) : null}
      </span>
    </a>
  );
}

function ReplyQuote({ reply }: { reply: ChatMessageReply }) {
  const accentColor = reply.is_outgoing ? "#06CF9C" : "#008CD3";

  return (
    <div
      className="mb-1.5 rounded-md bg-black/[0.04] px-2 py-1.5"
      style={{ borderLeft: `3px solid ${accentColor}` }}
    >
      <p
        className="text-[11px] font-semibold leading-tight"
        style={{ color: accentColor }}
      >
        {reply.sender_name}
      </p>
      <p className="truncate text-[12px] leading-snug text-[#667781]">
        {reply.text}
      </p>
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
  onReply,
  onDelete,
  isGroupChat = false,
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
  onReply?: () => void;
  onDelete?: () => void;
  isGroupChat?: boolean;
}) {
  const isOutgoing = message.is_outgoing;
  const displayName = isGroupChat
    ? (message.sender_name ?? contactName)
    : contactName;
  const profileImage = message.user_profile ?? contactProfile;
  const isTextMessage = (message.type ?? "text") === "text";
  const hasMedia = Boolean(message.attachments?.[0]?.url);
  const canDelete =
    isOutgoing &&
    !message.message_id.startsWith("temp-") &&
    !message.media_uploading;
  const canEdit = canDelete && isTextMessage;
  const canReply = !message.message_id.startsWith("temp-") && !message.media_uploading;
  const showDeleteCheckbox = deleteMode && canDelete;
  const showMessageMenu = canReply && !deleteMode;

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
          name={displayName}
          imageUrl={profileImage}
          size="xs"
          className="mb-0.5"
        />
      )}

      <div className="relative max-w-[85%] sm:max-w-[70%]">
        {isGroupChat && !isOutgoing && message.sender_name ? (
          <p className="mb-0.5 px-1 text-[11px] font-semibold text-[#008CD3]">
            {message.sender_name}
          </p>
        ) : null}
        {showMessageMenu && (
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
                    onReply?.();
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-3 py-2 text-left text-sm text-[#111827] outline-none hover:bg-[#F3F4F6]"
                >
                  <MdReply className="text-base text-[#008CD3]" />
                  Reply
                </button>
                {canEdit ? (
                  <>
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
                  </>
                ) : null}
              </div>
            )}
          </div>
        )}

        <div
          className={`rounded-xl px-3 py-2 shadow-sm ${
            isOutgoing ? "rounded-br-sm bg-[#DCF8C6]" : "rounded-bl-sm bg-white"
          } ${isSelectedForDelete ? "ring-2 ring-[#008CD3]/40" : ""}`}
          onClick={() => {
            if (deleteMode && canDelete) onToggleDeleteSelect?.();
          }}
          onKeyDown={(e) => {
            if (
              deleteMode &&
              canDelete &&
              (e.key === "Enter" || e.key === " ")
            ) {
              e.preventDefault();
              onToggleDeleteSelect?.();
            }
          }}
          role={deleteMode && canDelete ? "button" : undefined}
          tabIndex={deleteMode && canDelete ? 0 : undefined}
        >
          {message.reply_to ? <ReplyQuote reply={message.reply_to} /> : null}
          {hasMedia ? <MessageMediaContent message={message} /> : null}
          {message.media_uploading ? (
            <p className="mb-1 text-[11px] italic text-[#6B7280]">Uploading…</p>
          ) : null}
          {isTextMessage || (!hasMedia && message.text) ? (
            <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-[#111827]">
              {message.text}
            </p>
          ) : null}
          <div
            className={`mt-1 flex items-center justify-end gap-1 ${
              isOutgoing ? "text-[#6B7280]" : "text-[#9CA3AF]"
            }`}
          >
            {message.is_edited ? (
              <span className="text-[10px] italic">edited</span>
            ) : null}
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
  disabled = false,
}: {
  label: string;
  icon: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-[#6B7280] outline-none transition hover:bg-[#F3F4F6] hover:text-[#374151] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      aria-label={label}
    >
      {icon}
    </button>
  );
}
