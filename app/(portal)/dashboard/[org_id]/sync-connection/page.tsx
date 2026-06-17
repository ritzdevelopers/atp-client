"use client";

import { useEffect } from "react";
import { useChatContext } from "@/components/sync-connection/ChatContext";

export default function SyncConnectionPage() {
  const { refreshIndividualChats } = useChatContext();

  useEffect(() => {
    void refreshIndividualChats();
  }, [refreshIndividualChats]);

  return null;
}
