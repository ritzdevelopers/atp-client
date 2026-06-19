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
  /** When false, renders a span instead of a button (for use inside other buttons). */
  interactive?: boolean;
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
  interactive = true,
}: ChatAvatarProps) {
  const { openAvatarPreview } = useChatContext();
  const color = getAvatarColor(name);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    openAvatarPreview({ name, imageUrl, color });
  };

  const content = (
    <>
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
    </>
  );

  const wrapperClass = `relative shrink-0 rounded-full ${interactive ? "cursor-pointer border-0 bg-transparent p-0 outline-none transition-transform hover:scale-105 active:scale-95" : ""} ${className}`;

  if (!interactive) {
    return <span className={wrapperClass}>{content}</span>;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={wrapperClass}
      aria-label={`View ${name}'s profile photo`}
    >
      {content}
    </button>
  );
}
