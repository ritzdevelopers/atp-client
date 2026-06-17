"use client";

import { getAvatarColor, getInitials } from "./dummyData";
import { useChatContext } from "./ChatContext";

type ChatAvatarProps = {
  name: string;
  imageUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  showOnline?: boolean;
  isOnline?: boolean;
  className?: string;
};

const SIZE_MAP = {
  xs: "h-8 w-8 text-[11px]",
  sm: "h-10 w-10 text-sm",
  md: "h-12 w-12 text-base",
  lg: "h-14 w-14 text-lg",
};

export default function ChatAvatar({
  name,
  imageUrl,
  size = "md",
  showOnline = false,
  isOnline = false,
  className = "",
}: ChatAvatarProps) {
  const { openAvatarPreview } = useChatContext();
  const color = getAvatarColor(name);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    openAvatarPreview({ name, imageUrl, color });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`relative shrink-0 cursor-pointer rounded-full border-0 bg-transparent p-0 outline-none transition-transform hover:scale-105 active:scale-95 ${className}`}
      aria-label={`View ${name}'s profile photo`}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className={`${SIZE_MAP[size]} rounded-full object-cover`}
        />
      ) : (
        <span
          className={`${SIZE_MAP[size]} flex items-center justify-center rounded-full font-semibold text-white`}
          style={{ backgroundColor: color }}
        >
          {getInitials(name)}
        </span>
      )}
      {showOnline && (
        <span
          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
            isOnline ? "bg-emerald-500" : "bg-slate-300"
          }`}
          aria-hidden
        />
      )}
    </button>
  );
}
