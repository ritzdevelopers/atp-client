"use client";

import { useEffect } from "react";
import { useChatContext } from "@/components/sync-connection/ChatContext";

export default function GroupChatsPage() {
  const { refreshGroupChats } = useChatContext();

  useEffect(() => {
    void refreshGroupChats();
  }, [refreshGroupChats]);

  return null;
}
