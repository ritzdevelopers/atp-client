"use client";

import { Video } from "lucide-react";
import { badgeBase, cardBase, cardPadding, cardTitle, sectionLabel } from "../cardStyles";

type Meeting = {
  id: string;
  title: string;
  time: string;
  attendees: number;
  type: "standup" | "review" | "sync";
};

type UpcomingMeetingsProps = {
  shiftStart?: string;
};

function buildMeetings(shiftStart?: string): Meeting[] {
  const now = new Date();
  const baseHour = shiftStart ? Number(shiftStart.slice(0, 2)) : 10;

  const formatTime = (hours: number, minutes = 0) => {
    const d = new Date(now);
    d.setHours(hours, minutes, 0, 0);
    return d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return [
    {
      id: "standup",
      title: "Daily standup",
      time: formatTime(baseHour, 30),
      attendees: 8,
      type: "standup",
    },
    {
      id: "review",
      title: "Sprint review",
      time: formatTime(baseHour + 3),
      attendees: 12,
      type: "review",
    },
    {
      id: "sync",
      title: "Team sync",
      time: formatTime(baseHour + 5, 30),
      attendees: 5,
      type: "sync",
    },
  ];
}

const typeStyles = {
  standup: "bg-sky-100 text-sky-700",
  review: "bg-violet-100 text-violet-700",
  sync: "bg-emerald-100 text-emerald-700",
};

export default function UpcomingMeetings({ shiftStart }: UpcomingMeetingsProps) {
  const meetings = buildMeetings(shiftStart);

  return (
    <article className={`${cardBase} ${cardPadding}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={sectionLabel}>Meetings</p>
          <h2 className={`${cardTitle} mt-1`}>Upcoming today</h2>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
          <Video className="h-5 w-5" aria-hidden />
        </div>
      </div>

      <ul className="mt-5 space-y-3">
        {meetings.map((meeting) => (
          <li
            key={meeting.id}
            className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-indigo-100 hover:bg-slate-50/50"
          >
            <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
              <span className="text-[10px] font-bold uppercase leading-none">Today</span>
              <span className="text-xs font-bold tabular-nums">{meeting.time}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">
                {meeting.title}
              </p>
              <p className="text-xs text-slate-500">
                {meeting.attendees} attendees
              </p>
            </div>
            <span className={`${badgeBase} ${typeStyles[meeting.type]}`}>
              {meeting.type}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
