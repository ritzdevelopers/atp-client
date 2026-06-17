"use client";

import { useEffect } from "react";
import { useChatContext } from "./ChatContext";

export default function AvatarPopup() {
  const { avatarPreview, closeAvatarPreview } = useChatContext();

  useEffect(() => {
    if (!avatarPreview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAvatarPreview();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [avatarPreview, closeAvatarPreview]);

  if (!avatarPreview) return null;

  return (
    <div
      className="fixed inset-0 z-[10060] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={closeAvatarPreview}
      role="dialog"
      aria-modal="true"
      aria-label={`${avatarPreview.name} profile photo`}
    >
      <div className="flex flex-col items-center gap-4">
        {avatarPreview.imageUrl ? (
          <img
            src={avatarPreview.imageUrl}
            alt={avatarPreview.name}
            className="h-64 w-64 rounded-full object-cover shadow-2xl ring-4 ring-white/20 sm:h-80 sm:w-80"
          />
        ) : (
          <div
            className="flex h-64 w-64 items-center justify-center rounded-full text-5xl font-semibold text-white shadow-2xl ring-4 ring-white/20 sm:h-80 sm:w-80 sm:text-6xl"
            style={{ backgroundColor: avatarPreview.color }}
          >
            {avatarPreview.name
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
        )}
        <p className="text-lg font-medium text-white">{avatarPreview.name}</p>
      </div>
    </div>
  );
}
