"use client";

import { useMemo, useState } from "react";
import { MdClose, MdSearch } from "react-icons/md";
import { COMMON_EMOJIS, EMOJI_CATEGORIES } from "./emojiData";

type MobileEmojiPickerProps = {
  onSelect: (emoji: string) => void;
  onClose: () => void;
};

export default function MobileEmojiPicker({
  onSelect,
  onClose,
}: MobileEmojiPickerProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("Smileys");

  const filteredEmojis = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) {
      return COMMON_EMOJIS.filter(
        (item) =>
          item.name.includes(q) ||
          item.emoji.includes(q) ||
          item.category.toLowerCase().includes(q),
      );
    }
    return COMMON_EMOJIS.filter((item) => item.category === activeCategory);
  }, [query, activeCategory]);

  return (
    <div
      className="absolute bottom-full left-0 right-0 z-50 mb-2 rounded-t-2xl border border-[#E4E7EC] bg-white shadow-xl"
      role="dialog"
      aria-label="Emoji picker"
    >
      <div className="flex items-center justify-between border-b border-[#E4E7EC] px-3 py-2">
        <span className="text-sm font-semibold text-[#111827]">Emoji</span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-[#6B7280] outline-none hover:bg-[#F3F4F6]"
          aria-label="Close emoji picker"
        >
          <MdClose className="text-lg" />
        </button>
      </div>

      <div className="border-b border-[#E4E7EC] px-3 py-2">
        <div className="relative">
          <MdSearch className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-lg text-[#9CA3AF]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search emoji"
            className="w-full rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] py-2 pl-9 pr-3 text-sm text-[#111827] outline-none placeholder:text-[#9CA3AF] focus:border-[#008CD3]"
            aria-label="Search emoji"
          />
        </div>
      </div>

      {!query.trim() && (
        <div className="flex gap-1 overflow-x-auto border-b border-[#E4E7EC] px-2 py-1.5 [scrollbar-width:thin]">
          {EMOJI_CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`shrink-0 cursor-pointer rounded-full border-0 px-2.5 py-1 text-[11px] font-medium outline-none transition ${
                activeCategory === category
                  ? "bg-[#008CD3] text-white"
                  : "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      <div className="grid max-h-48 grid-cols-8 gap-0.5 overflow-y-auto p-2 [scrollbar-width:thin]">
        {filteredEmojis.length === 0 ? (
          <p className="col-span-8 py-6 text-center text-sm text-[#9CA3AF]">
            No emoji found
          </p>
        ) : (
          filteredEmojis.map((item) => (
            <button
              key={`${item.emoji}-${item.name}`}
              type="button"
              onClick={() => onSelect(item.emoji)}
              className="flex h-9 w-full cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-xl outline-none transition hover:bg-[#F3F4F6] active:scale-95"
              aria-label={item.name}
            >
              {item.emoji}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
