"use client";

import { Mail, MapPin, Phone, Shield, UserRound } from "lucide-react";
import { formatEmployeeCode, formatShiftRange } from "../utils";
import { badgeBase, cardBase, cardPadding, cardTitle } from "../cardStyles";

type ProfileCardProps = {
  name: string;
  employeeId?: number | string;
  email?: string;
  phone?: string;
  roleName?: string;
  shiftStart?: string;
  shiftEnd?: string;
  shiftName?: string;
  joinedDate?: string;
  managerName?: string;
  orgName?: string;
  imageUrl?: string | null;
  addressCount?: number;
  emergencyContact?: string;
};

export default function ProfileCard({
  name,
  employeeId,
  email,
  phone,
  roleName,
  shiftStart,
  shiftEnd,
  shiftName,
  joinedDate,
  managerName,
  orgName,
  imageUrl,
  addressCount = 0,
  emergencyContact,
}: ProfileCardProps) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const joinedLabel = joinedDate
    ? new Date(joinedDate).toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    <article className={`${cardBase} overflow-hidden`}>
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 px-5 py-6 text-white sm:px-6">
        <div className="flex items-start gap-4">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt=""
              className="h-16 w-16 rounded-2xl border-2 border-white/20 object-cover shadow-lg"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-xl font-bold backdrop-blur-sm">
              {initials || <UserRound className="h-8 w-8" />}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className={cardTitle}>{name}</p>
            <p className="mt-0.5 text-sm text-indigo-100/90">
              {formatEmployeeCode(employeeId)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {roleName ? (
                <span className={`${badgeBase} bg-white/15 text-white`}>
                  {roleName}
                </span>
              ) : null}
              {shiftName ? (
                <span className={`${badgeBase} bg-sky-400/20 text-sky-100`}>
                  {shiftName}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className={`${cardPadding} space-y-4`}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Joined
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{joinedLabel}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Shift
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {formatShiftRange(shiftStart, shiftEnd, shiftName)}
            </p>
          </div>
        </div>

        <ul className="space-y-2.5 text-sm text-slate-600">
          {orgName ? (
            <li className="flex items-center gap-2.5">
              <Shield className="h-4 w-4 shrink-0 text-indigo-500" aria-hidden />
              <span className="truncate">{orgName}</span>
            </li>
          ) : null}
          {email ? (
            <li className="flex items-center gap-2.5">
              <Mail className="h-4 w-4 shrink-0 text-indigo-500" aria-hidden />
              <span className="truncate">{email}</span>
            </li>
          ) : null}
          {phone ? (
            <li className="flex items-center gap-2.5">
              <Phone className="h-4 w-4 shrink-0 text-indigo-500" aria-hidden />
              <span>{phone}</span>
            </li>
          ) : null}
          {managerName ? (
            <li className="flex items-center gap-2.5">
              <UserRound className="h-4 w-4 shrink-0 text-indigo-500" aria-hidden />
              <span>Reports to {managerName}</span>
            </li>
          ) : null}
          <li className="flex items-center gap-2.5">
            <MapPin className="h-4 w-4 shrink-0 text-indigo-500" aria-hidden />
            <span>
              {addressCount} saved address{addressCount === 1 ? "" : "es"}
            </span>
          </li>
        </ul>

        {emergencyContact ? (
          <div className="rounded-xl border border-amber-100 bg-amber-50/80 px-3 py-2.5 text-sm text-amber-900">
            <span className="font-semibold">Emergency:</span> {emergencyContact}
          </div>
        ) : null}
      </div>
    </article>
  );
}
