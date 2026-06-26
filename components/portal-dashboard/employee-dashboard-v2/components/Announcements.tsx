"use client";

import { Megaphone, Pin } from "lucide-react";
import { cardBase, cardPadding, cardTitle, sectionLabel } from "../cardStyles";

type Announcement = {
  id: string;
  title: string;
  body: string;
  date: string;
  pinned?: boolean;
};

type AnnouncementsProps = {
  orgName?: string;
  handoverPending?: number;
};

export default function Announcements({
  orgName,
  handoverPending = 0,
}: AnnouncementsProps) {
  const today = new Date().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  const items: Announcement[] = [
    {
      id: "welcome",
      title: `Welcome to ${orgName || "your organization"} portal`,
      body: "Your new employee dashboard is live. Explore attendance, leave, tasks, and team updates in one place.",
      date: today,
      pinned: true,
    },
    ...(handoverPending > 0
      ? [
          {
            id: "handover",
            title: "Asset handover pending",
            body: `You have ${handoverPending} pending asset handover item${handoverPending === 1 ? "" : "s"} requiring your attention.`,
            date: today,
            pinned: true,
          },
        ]
      : []),
    {
      id: "policy",
      title: "Q2 policy update",
      body: "Updated remote work guidelines are now available in the HR knowledge base. Please review before your next leave request.",
      date: today,
    },
  ];

  return (
    <article className={`${cardBase} ${cardPadding}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={sectionLabel}>Announcements</p>
          <h2 className={`${cardTitle} mt-1`}>Company updates</h2>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
          <Megaphone className="h-5 w-5" aria-hidden />
        </div>
      </div>

      <ul className="mt-5 space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-slate-100 bg-gradient-to-br from-white to-slate-50/80 p-4 transition hover:border-indigo-100"
          >
            <div className="flex items-start gap-2">
              {item.pinned ? (
                <Pin className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" aria-hidden />
              ) : (
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-400" />
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                  <span className="text-[10px] font-medium text-slate-400">{item.date}</span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.body}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}
