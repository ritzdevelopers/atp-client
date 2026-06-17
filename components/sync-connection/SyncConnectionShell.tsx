"use client";

import AvatarPopup from "./AvatarPopup";
import { ChatProvider } from "./ChatContext";
import LeftChatSidebar from "./LeftChatSidebar";
import RightChatInterface from "./RightChatInterface";

type SyncConnectionShellProps = {
  children: React.ReactNode;
};

export default function SyncConnectionShell({
  children,
}: SyncConnectionShellProps) {
  return (
    <ChatProvider>
      <div className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-1 overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-sm lg:rounded-xl">
        <LeftChatSidebar />
        <RightChatInterface />
        <div className="hidden" aria-hidden>
          {children}
        </div>
      </div>
      <AvatarPopup />
    </ChatProvider>
  );
}
