"use client";

import AvatarPopup from "./AvatarPopup";
import { ChatProvider } from "./ChatContext";
import LeftChatSidebar from "./LeftChatSidebar";
import RightChatInterface from "./RightChatInterface";

const SHELL_OFFSET =
  "-mx-3 -mt-4 mb-[-1rem] h-[calc(100dvh-3rem-env(safe-area-inset-bottom,0px)-4.5rem)] min-h-[480px] sm:-mx-5 sm:-mt-6 sm:mb-[-1.5rem] md:-mx-6 md:-mt-8 md:mb-[-2rem] lg:mb-0 lg:h-[calc(100dvh-4rem)] lg:pb-0";

type SyncConnectionShellProps = {
  children: React.ReactNode;
};

export default function SyncConnectionShell({
  children,
}: SyncConnectionShellProps) {
  return (
    <ChatProvider>
      <div
        className={`relative flex overflow-hidden rounded-none border border-[#E4E7EC] bg-white shadow-sm lg:rounded-xl ${SHELL_OFFSET}`}
      >
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
