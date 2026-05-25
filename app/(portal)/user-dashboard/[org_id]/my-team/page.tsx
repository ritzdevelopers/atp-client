"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CalendarDays,
  ClipboardList,
  Loader2,
  Mail,
  Pencil,
  RefreshCw,
  Shield,
  UserRound,
  Users,
  X,
} from "lucide-react";
import type { ApiError } from "@/services/auth";
import {
  applyForLeave,
  fetchMyLeaveQueries,
  type LeaveQueryRow,
} from "@/services/employeeLeaves";
import {
  attendanceCategoryLabel,
  correctAttendanceQuery,
  fetchMyAttendanceQueries,
  raiseAttendanceQuery,
  type AttendanceQueryCategory,
  type AttendanceQueryRow,
} from "@/services/attendanceQueries";
import { fetchMyOrgTeam } from "@/services/orgTeams";
import type { OrgTeamDetail, OrgTeamMemberRow } from "@/services/orgTeams";

function formatDate(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function initialsFromName(name: string | null | undefined): string {
  if (name == null || !String(name).trim()) return "?";
  const parts = String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((p) => p[0]!.toUpperCase()).join("") || "?";
}

function leaveStatusTone(
  status: string,
): "emerald" | "rose" | "amber" {
  const s = String(status).toLowerCase();
  if (s === "approved") return "emerald";
  if (s === "rejected") return "rose";
  return "amber";
}

function attendanceStatusTone(
  status: string,
): "emerald" | "rose" | "amber" {
  return leaveStatusTone(status);
}

const toneChip: Record<
  "emerald" | "rose" | "amber",
  string
> = {
  emerald:
    "border-emerald-200/70 bg-emerald-50/90 text-emerald-800 shadow-sm shadow-emerald-900/5",
  rose: "border-rose-200/70 bg-rose-50/90 text-rose-800 shadow-sm shadow-rose-900/5",
  amber:
    "border-amber-200/70 bg-amber-50/90 text-amber-900 shadow-sm shadow-amber-900/5",
};

const accentBar: Record<"emerald" | "rose" | "amber", string> = {
  emerald: "border-l-4 border-l-emerald-500",
  rose: "border-l-4 border-l-rose-500",
  amber: "border-l-4 border-l-amber-400",
};

const panelClass =
  "overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_36px_-12px_rgba(15,23,42,0.12)]";

export default function UserMyTeamPage() {
  const params = useParams();
  const orgIdParam = params?.org_id;
  const orgId = Number(orgIdParam);

  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [team, setTeam] = useState<OrgTeamDetail | null>(null);
  const [noTeam, setNoTeam] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);

  const [leaveRows, setLeaveRows] = useState<LeaveQueryRow[]>([]);
  const [leaveLoadError, setLeaveLoadError] = useState<string | null>(null);
  const [attendanceRows, setAttendanceRows] = useState<AttendanceQueryRow[]>(
    [],
  );
  const [attendanceLoadError, setAttendanceLoadError] = useState<string | null>(
    null,
  );

  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveType, setLeaveType] = useState<
    "full_day" | "half_day" | "short_leave"
  >("full_day");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveFormError, setLeaveFormError] = useState<string | null>(null);
  const [leaveFormSuccess, setLeaveFormSuccess] = useState<string | null>(null);

  const [attModalOpen, setAttModalOpen] = useState(false);
  const [attEditRow, setAttEditRow] = useState<AttendanceQueryRow | null>(null);
  const [attCategory, setAttCategory] =
    useState<AttendanceQueryCategory>("forget_punch_in");
  const [attDate, setAttDate] = useState("");
  const [attMessage, setAttMessage] = useState("");
  const [attSubmitting, setAttSubmitting] = useState(false);
  const [attFormError, setAttFormError] = useState<string | null>(null);
  const [attFormSuccess, setAttFormSuccess] = useState<string | null>(null);

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (!orgId || Number.isNaN(orgId)) {
        setLoading(false);
        setTeamError("Invalid organization.");
        return;
      }
      const t = localStorage.getItem("token");
      if (!t) {
        setLoading(false);
        setTeamError("Not signed in.");
        return;
      }
      setToken(t);
      if (isRefresh) setRefreshing(true);
      else {
        setLoading(true);
      }
      setTeamError(null);
      setNoTeam(false);
      setLeaveLoadError(null);
      setAttendanceLoadError(null);

      try {
        const data = await fetchMyOrgTeam(t, orgId);
        setTeam(data);
      } catch (e) {
        const err = e as ApiError;
        if (err.status === 404) {
          setTeam(null);
          setNoTeam(true);
        } else {
          setTeam(null);
          setTeamError(err.message || "Could not load team.");
        }
      }

      const [leaveRes, attRes] = await Promise.allSettled([
        fetchMyLeaveQueries(t, orgId),
        fetchMyAttendanceQueries(t, orgId),
      ]);

      if (leaveRes.status === "fulfilled") {
        setLeaveRows(leaveRes.value);
      } else {
        setLeaveRows([]);
        setLeaveLoadError(
          leaveRes.reason instanceof Error
            ? leaveRes.reason.message
            : "Could not load leave history.",
        );
      }

      if (attRes.status === "fulfilled") {
        setAttendanceRows(attRes.value);
      } else {
        setAttendanceRows([]);
        setAttendanceLoadError(
          attRes.reason instanceof Error
            ? attRes.reason.message
            : "Could not load attendance queries.",
        );
      }

      setLoading(false);
      setRefreshing(false);
    },
    [orgId],
  );

  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  const pendingLeaveCount = useMemo(
    () => leaveRows.filter((r) => String(r.status).toLowerCase() === "pending")
      .length,
    [leaveRows],
  );
  const pendingAttCount = useMemo(
    () =>
      attendanceRows.filter(
        (r) => String(r.query_status).toLowerCase() === "pending",
      ).length,
    [attendanceRows],
  );

  function openNewAttendanceModal() {
    setAttEditRow(null);
    setAttCategory("forget_punch_in");
    setAttDate("");
    setAttMessage("");
    setAttFormError(null);
    setAttFormSuccess(null);
    setAttModalOpen(true);
  }

  function openEditAttendanceModal(row: AttendanceQueryRow) {
    setAttEditRow(row);
    setAttCategory(row.category as AttendanceQueryCategory);
    const d = row.attendance_date;
    setAttDate(
      d && String(d).length >= 10 ? String(d).slice(0, 10) : String(d ?? ""),
    );
    setAttMessage(row.query_message ?? "");
    setAttFormError(null);
    setAttFormSuccess(null);
    setAttModalOpen(true);
  }

  async function onSubmitAttendance(e: React.FormEvent) {
    e.preventDefault();
    setAttFormError(null);
    setAttFormSuccess(null);
    const t = token ?? localStorage.getItem("token");
    if (!t) {
      setAttFormError("Not signed in.");
      return;
    }
    if (!attDate) {
      setAttFormError("Attendance date is required.");
      return;
    }
    const msg = attMessage.trim();
    if (!msg) {
      setAttFormError("Please describe what happened.");
      return;
    }

    setAttSubmitting(true);
    try {
      if (attEditRow) {
        const body: Parameters<typeof correctAttendanceQuery>[1] = {
          org_id: orgId,
          query_id: attEditRow.id,
        };
        if (attCategory !== attEditRow.category) body.category = attCategory;
        if (msg !== attEditRow.query_message) body.query_message = msg;
        const dNorm = attDate.slice(0, 10);
        const prev =
          attEditRow.attendance_date &&
          String(attEditRow.attendance_date).length >= 10
            ? String(attEditRow.attendance_date).slice(0, 10)
            : "";
        if (dNorm !== prev) body.attendance_date = dNorm;
        if (
          body.category === undefined &&
          body.query_message === undefined &&
          body.attendance_date === undefined
        ) {
          setAttFormError("No changes to save.");
          setAttSubmitting(false);
          return;
        }
        await correctAttendanceQuery(t, body);
        setAttFormSuccess("Request updated successfully.");
      } else {
        await raiseAttendanceQuery(t, {
          org_id: orgId,
          category: attCategory,
          query_message: msg,
          attendance_date: attDate.slice(0, 10),
        });
        setAttFormSuccess("Attendance query submitted.");
        setAttDate("");
        setAttMessage("");
        setAttCategory("forget_punch_in");
      }
      const rows = await fetchMyAttendanceQueries(t, orgId);
      setAttendanceRows(rows);
    } catch (err) {
      setAttFormError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setAttSubmitting(false);
    }
  }

  async function onSubmitLeave(e: React.FormEvent) {
    e.preventDefault();
    setLeaveFormError(null);
    setLeaveFormSuccess(null);
    const t = token ?? localStorage.getItem("token");
    if (!t) {
      setLeaveFormError("Not signed in.");
      return;
    }
    if (!startDate) {
      setLeaveFormError("Start date is required.");
      return;
    }
    setLeaveSubmitting(true);
    try {
      await applyForLeave(t, {
        org_id: orgId,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate || null,
        reason: reason.trim() || null,
        team_id: team?.team_id ?? null,
      });
      setLeaveFormSuccess("Leave request submitted successfully.");
      setStartDate("");
      setEndDate("");
      setReason("");
      setLeaveType("full_day");
      const rows = await fetchMyLeaveQueries(t, orgId);
      setLeaveRows(rows);
    } catch (err) {
      setLeaveFormError(
        err instanceof Error ? err.message : "Could not submit leave request.",
      );
    } finally {
      setLeaveSubmitting(false);
    }
  }

  const adminMember: OrgTeamMemberRow | undefined = team
    ? team.members.find((m) => Number(m.user_id) === Number(team.admin_id))
    : undefined;

  const otherMembers =
    team?.members.filter((m) => Number(m.user_id) !== Number(team.admin_id)) ??
    [];

  return (
    <div className="relative min-h-screen flex-1 overflow-x-hidden bg-slate-50">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_75%_55%_at_50%_-8%,rgba(99,102,241,0.13),transparent_58%)]"
        aria-hidden
      />
      <div className="relative">
      <header className="border-b border-slate-200/60 bg-white/85 backdrop-blur-md supports-[backdrop-filter]:bg-white/70">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <Link
                href={`/user-dashboard/${orgIdParam}/home`}
                className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
              </Link>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-600">
                  Workspace
                </p>
                <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                  My team
                </h1>
                <p className="mt-1 max-w-xl text-sm leading-snug text-slate-500">
                  {loading
                    ? "Loading your roster and requests…"
                    : team
                      ? "Roster, approvals, and attendance corrections in one place."
                      : noTeam
                        ? "Track requests while you wait for a team assignment."
                        : "Roster, leave, and attendance requests."}
                </p>
                {!loading && team ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
                      <span
                        className="h-2 w-2 rounded-full bg-indigo-500"
                        aria-hidden
                      />
                      {team.members.length} members
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
                      <span
                        className="h-2 w-2 rounded-full bg-amber-400"
                        aria-hidden
                      />
                      {pendingLeaveCount} leave pending
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
                      <span
                        className="h-2 w-2 rounded-full bg-cyan-500"
                        aria-hidden
                      />
                      {pendingAttCount} attendance pending
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <button
                type="button"
                onClick={() => void loadData(true)}
                disabled={loading || refreshing}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  aria-hidden
                />
                Sync
              </button>
              <button
                type="button"
                onClick={() => {
                  setLeaveModalOpen(true);
                  setLeaveFormError(null);
                  setLeaveFormSuccess(null);
                }}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-md shadow-indigo-600/25 transition hover:bg-indigo-700"
              >
                <CalendarDays className="h-4 w-4" aria-hidden />
                Request time off
              </button>
              <button
                type="button"
                onClick={openNewAttendanceModal}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                <ClipboardList className="h-4 w-4" aria-hidden />
                Correction
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {loading ? (
          <div
            className={`flex min-h-[42vh] flex-col items-center justify-center gap-4 ${panelClass} p-14`}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
              <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-900">
                Preparing your workspace
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Fetching team roster and your recent requests.
              </p>
            </div>
          </div>
        ) : null}

        {!loading && teamError && !noTeam ? (
          <div className="rounded-2xl border border-red-200/80 bg-red-50/90 p-6 text-sm text-red-900 shadow-sm">
            <p className="font-semibold">Something went wrong</p>
            <p className="mt-1 text-red-800/90">{teamError}</p>
          </div>
        ) : null}

        {!loading && noTeam ? (
          <div className="grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-10">
            <section
              className={`${panelClass} flex min-w-0 flex-col items-center px-8 pb-12 pt-12 text-center sm:px-12`}
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-slate-100 shadow-inner">
                <Building2 className="h-9 w-9 text-indigo-600" aria-hidden />
              </div>
              <h2 className="mt-6 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                You&apos;re not on a team yet
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600">
                When HR or your manager adds you to a roster, it will show up
                here. You can still submit and track leave and attendance
                corrections from the panel on the right.
              </p>
              <Link
                href={`/user-dashboard/${orgIdParam}/home`}
                className="mt-8 inline-flex rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800"
              >
                Back to dashboard
              </Link>
            </section>
            <ActivityColumn
              leaveLoadError={leaveLoadError}
              leaveRows={leaveRows}
              attendanceLoadError={attendanceLoadError}
              attendanceRows={attendanceRows}
              onEditAttendance={openEditAttendanceModal}
            />
          </div>
        ) : null}

        {!loading && team ? (
          <div className="grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-10">
            <div className="min-w-0 space-y-8">
              <section className={panelClass}>
                <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-white via-indigo-50/35 to-white px-6 py-6 sm:px-8 sm:py-8">
                  <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-indigo-500 to-violet-500" />
                  <div className="relative pl-4 sm:pl-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-indigo-700">
                          Team overview
                        </p>
                        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.65rem]">
                          {team.team_name}
                        </h2>
                        {team.team_info?.trim() ? (
                          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
                            {team.team_info}
                          </p>
                        ) : (
                          <p className="mt-3 text-sm text-slate-500">
                            Collaboration hub for this organization.
                          </p>
                        )}
                      </div>
                      {team.is_admin ? (
                        <span className="inline-flex w-fit shrink-0 items-center rounded-full bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm">
                          Team admin
                        </span>
                      ) : (
                        <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600 shadow-sm">
                          <Shield className="h-3.5 w-3.5 text-slate-500" />
                          Member
                        </span>
                      )}
                    </div>

                    <dl className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="flex gap-3 rounded-xl border border-slate-200/60 bg-white/90 px-4 py-3 shadow-sm">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                          <Calendar className="h-4 w-4" aria-hidden />
                        </div>
                        <div className="min-w-0">
                          <dt className="text-[11px] font-medium text-slate-500">
                            Created
                          </dt>
                          <dd className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                            {formatDate(team.created_at ?? null)}
                          </dd>
                        </div>
                      </div>
                      <div className="flex gap-3 rounded-xl border border-slate-200/60 bg-white/90 px-4 py-3 shadow-sm">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                          <UserRound className="h-4 w-4" aria-hidden />
                        </div>
                        <div className="min-w-0">
                          <dt className="text-[11px] font-medium text-slate-500">
                            Created by
                          </dt>
                          <dd className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                            {team.created_by_name ?? "—"}
                          </dd>
                        </div>
                      </div>
                      <div className="flex gap-3 rounded-xl border border-slate-200/60 bg-white/90 px-4 py-3 shadow-sm">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
                          <Users className="h-4 w-4" aria-hidden />
                        </div>
                        <div className="min-w-0">
                          <dt className="text-[11px] font-medium text-slate-500">
                            Members
                          </dt>
                          <dd className="mt-0.5 text-sm font-semibold text-slate-900">
                            {team.members.length} active
                          </dd>
                        </div>
                      </div>
                      <div className="flex gap-3 rounded-xl border border-slate-200/60 bg-white/90 px-4 py-3 shadow-sm">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                          <RefreshCw className="h-4 w-4" aria-hidden />
                        </div>
                        <div className="min-w-0">
                          <dt className="text-[11px] font-medium text-slate-500">
                            Last updated
                          </dt>
                          <dd className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                            {formatDate(team.updated_at ?? null)}
                          </dd>
                        </div>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className="p-6 sm:p-8">
                  <div className="flex flex-col gap-5 rounded-2xl border border-slate-200/60 bg-gradient-to-br from-slate-50/80 to-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div className="flex min-w-0 gap-4">
                      <div
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white shadow-md shadow-indigo-600/25"
                        aria-hidden
                      >
                        {initialsFromName(team.admin_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Team lead
                        </p>
                        <p className="mt-1 truncate text-lg font-semibold text-slate-900">
                          {team.admin_name ?? "—"}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Joined{" "}
                          <span className="font-medium text-slate-800">
                            {formatDate(adminMember?.joined_date ?? null)}
                          </span>
                          {adminMember?.added_by_name
                            ? ` · Added by ${adminMember.added_by_name}`
                            : ""}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          Roster
                        </h3>
                        <p className="mt-0.5 text-sm text-slate-500">
                          Everyone on your team except the lead.
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-[13px]">
                          <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/80 text-left">
                              <th className="whitespace-nowrap px-4 py-3.5 text-xs font-semibold text-slate-600">
                                Member
                              </th>
                              <th className="whitespace-nowrap px-4 py-3.5 text-xs font-semibold text-slate-600">
                                Contact
                              </th>
                              <th className="whitespace-nowrap px-4 py-3.5 text-xs font-semibold text-slate-600">
                                Joined
                              </th>
                              <th className="whitespace-nowrap px-4 py-3.5 text-xs font-semibold text-slate-600">
                                Added by
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {otherMembers.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={4}
                                  className="px-4 py-14 text-center text-sm text-slate-500"
                                >
                                  No other members on this roster yet.
                                </td>
                              </tr>
                            ) : (
                              otherMembers.map((m) => (
                                <tr
                                  key={m.team_member_id}
                                  className="transition-colors hover:bg-slate-50/80"
                                >
                                  <td className="px-4 py-3.5">
                                    <div className="flex items-center gap-3">
                                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600">
                                        {initialsFromName(m.user_name)}
                                      </span>
                                      <span className="font-medium text-slate-900">
                                        {m.user_name}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3.5 text-slate-600">
                                    <div className="flex items-center gap-1.5 text-slate-900">
                                      <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                      <span className="break-all">
                                        {m.user_email}
                                      </span>
                                    </div>
                                    {m.user_phone ? (
                                      <p className="mt-1 pl-5 text-xs text-slate-500">
                                        {m.user_phone}
                                      </p>
                                    ) : null}
                                  </td>
                                  <td className="whitespace-nowrap px-4 py-3.5 text-slate-700">
                                    {formatDate(m.joined_date)}
                                  </td>
                                  <td className="px-4 py-3.5 text-slate-700">
                                    {m.added_by_name ?? "—"}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <ActivityColumn
              leaveLoadError={leaveLoadError}
              leaveRows={leaveRows}
              attendanceLoadError={attendanceLoadError}
              attendanceRows={attendanceRows}
              onEditAttendance={openEditAttendanceModal}
            />
          </div>
        ) : null}
      </main>
      </div>

      {/* Leave modal */}
      {leaveModalOpen ? (
        <ModalScrim onClose={() => setLeaveModalOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-[0_24px_80px_-12px_rgba(15,23,42,0.35)] ring-1 ring-slate-900/10">
            <div className="sticky top-0 z-[1] flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-indigo-50/90 to-white px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Request time off
                </h2>
                <p className="text-xs text-slate-500">
                  Submit to your approver for this organization.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLeaveModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={onSubmitLeave} className="space-y-4 p-6">
              {leaveFormError ? (
                <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-100">
                  {leaveFormError}
                </p>
              ) : null}
              {leaveFormSuccess ? (
                <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
                  {leaveFormSuccess}
                </p>
              ) : null}
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">
                  Leave type
                </span>
                <select
                  value={leaveType}
                  onChange={(e) =>
                    setLeaveType(e.target.value as typeof leaveType)
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none ring-indigo-500/0 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="full_day">Full day</option>
                  <option value="half_day">Half day</option>
                  <option value="short_leave">Short leave</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">
                  Start date
                </span>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/20"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">
                  End date <span className="font-normal text-slate-400">(optional)</span>
                </span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/20"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">
                  Reason <span className="font-normal text-slate-400">(optional)</span>
                </span>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Context for your manager…"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/20"
                />
              </label>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setLeaveModalOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={leaveSubmitting}
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {leaveSubmitting ? "Submitting…" : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </ModalScrim>
      ) : null}

      {/* Attendance modal */}
      {attModalOpen ? (
        <ModalScrim
          onClose={() => {
            setAttModalOpen(false);
            setAttEditRow(null);
          }}
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-[0_24px_80px_-12px_rgba(15,23,42,0.35)] ring-1 ring-slate-900/10">
            <div className="sticky top-0 z-[1] flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-cyan-50/70 to-white px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {attEditRow
                    ? "Edit attendance request"
                    : "Attendance correction"}
                </h2>
                <p className="text-xs text-slate-500">
                  {attEditRow
                    ? "Only pending requests can be updated."
                    : "Report missed punch or timing issues for a specific day."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAttModalOpen(false);
                  setAttEditRow(null);
                }}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={onSubmitAttendance} className="space-y-4 p-6">
              {attFormError ? (
                <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-100">
                  {attFormError}
                </p>
              ) : null}
              {attFormSuccess ? (
                <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
                  {attFormSuccess}
                </p>
              ) : null}
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">
                  Issue type
                </span>
                <select
                  value={attCategory}
                  onChange={(e) =>
                    setAttCategory(e.target.value as AttendanceQueryCategory)
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                >
                  <option value="forget_punch_in">Forgot punch in</option>
                  <option value="forget_punch_out">Forgot punch out</option>
                  <option value="late_punch_in">Late punch in</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">
                  Attendance date
                </span>
                <input
                  type="date"
                  required
                  value={attDate}
                  onChange={(e) => setAttDate(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">
                  Explanation
                </span>
                <textarea
                  value={attMessage}
                  onChange={(e) => setAttMessage(e.target.value)}
                  rows={4}
                  required
                  placeholder="What happened? Include times if relevant."
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                />
              </label>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAttModalOpen(false);
                    setAttEditRow(null);
                  }}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={attSubmitting}
                  className="flex-1 rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {attSubmitting
                    ? "Saving…"
                    : attEditRow
                      ? "Save changes"
                      : "Submit request"}
                </button>
              </div>
            </form>
          </div>
        </ModalScrim>
      ) : null}
    </div>
  );
}

function ModalScrim({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg">{children}</div>
    </div>
  );
}

function ActivityColumn({
  leaveRows,
  leaveLoadError,
  attendanceRows,
  attendanceLoadError,
  onEditAttendance,
}: {
  leaveRows: LeaveQueryRow[];
  leaveLoadError: string | null;
  attendanceRows: AttendanceQueryRow[];
  attendanceLoadError: string | null;
  onEditAttendance: (row: AttendanceQueryRow) => void;
}) {
  return (
    <aside className="min-w-0 space-y-6 xl:sticky xl:top-6 xl:self-start">
      <div className={panelClass}>
        <div className="flex items-start gap-3 border-b border-slate-100 bg-gradient-to-r from-indigo-50/50 to-white px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/60">
            <CalendarDays className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">
              Leave requests
            </h2>
            <p className="mt-0.5 text-xs leading-snug text-slate-500">
              Newest first. Status updates when HR reviews your request.
            </p>
          </div>
        </div>
        <div className="max-h-[min(52vh,440px)] overflow-y-auto p-4 sm:p-5">
          {leaveLoadError ? (
            <p className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-800">
              {leaveLoadError}
            </p>
          ) : null}
          {!leaveLoadError && leaveRows.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <CalendarDays className="h-6 w-6" aria-hidden />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-700">
                No leave requests yet
              </p>
              <p className="mt-1 max-w-[220px] text-xs text-slate-500">
                Use Request time off in the header when you need time away.
              </p>
            </div>
          ) : null}
          <ul className="space-y-3">
            {leaveRows.map((row) => {
              const tone = leaveStatusTone(row.status);
              return (
                <li
                  key={row.id}
                  className={`rounded-xl border border-slate-100/80 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.03] pl-3 ${accentBar[tone]}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${toneChip[tone]}`}
                    >
                      {row.status}
                    </span>
                    <time
                      className="text-[11px] tabular-nums text-slate-400"
                      dateTime={row.created_at ?? undefined}
                    >
                      {formatDate(row.created_at)}
                    </time>
                  </div>
                  <p className="mt-2 text-sm font-semibold capitalize text-slate-900">
                    {row.leave_type.replace(/_/g, " ")}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {formatDate(row.start_date)}
                    {row.end_date ? ` → ${formatDate(row.end_date)}` : ""}
                  </p>
                  {row.reason ? (
                    <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-600">
                      {row.reason}
                    </p>
                  ) : null}
                  {row.approved_by_name ? (
                    <p className="mt-3 text-[11px] font-medium text-slate-500">
                      Reviewer: {row.approved_by_name}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className={panelClass}>
        <div className="flex items-start gap-3 border-b border-slate-100 bg-gradient-to-r from-cyan-50/40 to-white px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-cyan-700 shadow-sm ring-1 ring-slate-200/60">
            <ClipboardList className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">
              Attendance corrections
            </h2>
            <p className="mt-0.5 text-xs leading-snug text-slate-500">
              Punch issues for this org. Edit while the request is still
              pending.
            </p>
          </div>
        </div>
        <div className="max-h-[min(52vh,440px)] overflow-y-auto p-4 sm:p-5">
          {attendanceLoadError ? (
            <p className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-800">
              {attendanceLoadError}
            </p>
          ) : null}
          {!attendanceLoadError && attendanceRows.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <ClipboardList className="h-6 w-6" aria-hidden />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-700">
                No corrections yet
              </p>
              <p className="mt-1 max-w-[240px] text-xs text-slate-500">
                Use Correction in the header to report a missed punch or timing
                issue.
              </p>
            </div>
          ) : null}
          <ul className="space-y-3">
            {attendanceRows.map((row) => {
              const tone = attendanceStatusTone(row.query_status);
              const pending =
                String(row.query_status).toLowerCase() === "pending";
              return (
                <li
                  key={row.id}
                  className={`rounded-xl border border-slate-100/80 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.03] pl-3 ${accentBar[tone]}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${toneChip[tone]}`}
                    >
                      {row.query_status}
                    </span>
                    {pending ? (
                      <button
                        type="button"
                        onClick={() => onEditAttendance(row)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-white"
                      >
                        <Pencil className="h-3 w-3" aria-hidden />
                        Edit
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {attendanceCategoryLabel(row.category)}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Day{" "}
                    <span className="font-medium text-slate-800">
                      {formatDate(row.attendance_date)}
                    </span>
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    {row.query_message}
                  </p>
                  {row.admin_response ? (
                    <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-700">
                      <span className="font-semibold text-slate-800">
                        Response
                      </span>
                      <span className="text-slate-600">
                        {" "}
                        — {row.admin_response}
                      </span>
                      {row.approved_by_name ? (
                        <span className="mt-1.5 block text-[11px] text-slate-500">
                          {row.approved_by_name}
                          {row.resolved_at
                            ? ` · ${formatDateTime(row.resolved_at)}`
                            : ""}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  <p className="mt-2 text-[10px] tabular-nums text-slate-400">
                    Submitted {formatDateTime(row.created_at)}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </aside>
  );
}
