"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  Crown,
  HelpCircle,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { getAllOrgUsers, type OrgUserRow } from "@/services/adminUser";
import {
  applyForLeave,
  fetchMyLeaveQueries,
  respondToLeaveRequest,
  type LeaveQueryRow as EmployeeLeaveRow,
} from "@/services/employeeLeaves";
import {
  addMemberToOrgTeam,
  fetchMyOrgTeam,
  fetchTeamActivityFeed,
  removeMemberFromOrgTeam,
  type OrgTeamDetail,
  type OrgTeamRow,
  type TeamActivityNotification,
  type TeamLeaveQueryRow,
} from "@/services/orgTeams";
import {
  attendanceCategoryLabel,
  fetchAllAttendanceQueries,
  fetchMyAttendanceQueries,
  raiseAttendanceQuery,
  updateAttendanceQueryStatus,
  type AttendanceQueryCategory,
  type AttendanceQueryRow,
} from "@/services/attendanceQueries";

function displayTeamTitle(raw: string) {
  return raw
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function fmtLong(iso: string | null | undefined) {
  if (iso == null || iso === "") return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function fmtDateOnly(value: string | null | undefined) {
  if (value == null || value === "") return "—";
  const raw = String(value);
  const ymd = raw.length >= 10 ? raw.slice(0, 10) : raw;
  const d = new Date(ymd);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function attendeeFromQuery(
  row: AttendanceQueryRow,
  detail: OrgTeamDetail,
  users: OrgUserRow[],
): { name: string; email: string; phone: string | null } {
  const member = detail.members.find(
    (m) => Number(m.user_id) === Number(row.user_id),
  );
  if (member) {
    return {
      name: member.user_name,
      email: member.user_email,
      phone: member.user_phone ?? null,
    };
  }
  const u = users.find((x) => Number(x.id) === Number(row.user_id));
  if (u) {
    return {
      name: String(u.user_name ?? ""),
      email: String(u.user_email ?? ""),
      phone: null,
    };
  }
  return {
    name: `User #${row.user_id}`,
    email: "",
    phone: null,
  };
}

function actionLabel(type: string): string {
  switch (type) {
    case "CREATE_ORG_TEAM":
      return "Team created";
    case "UPDATE_ORG_TEAM":
      return "Team updated";
    case "ADD_MEMBER_TO_TEAM":
      return "Member added";
    case "REMOVE_MEMBER_FROM_TEAM":
      return "Member removed";
    default:
      return type.replace(/_/g, " ");
  }
}

function leaveTypeLabel(t: string): string {
  return t.replace(/_/g, " ");
}

function leaveStatusChipClass(status: string): string {
  const s = String(status).toLowerCase();
  if (s === "approved") return "bg-emerald-500/15 text-emerald-800 ring-emerald-500/25";
  if (s === "rejected") return "bg-rose-500/15 text-rose-800 ring-rose-500/25";
  return "bg-amber-500/15 text-amber-900 ring-amber-500/25";
}

function initialsFromName(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0]![0] ?? "?").toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase() || "?";
}

function jwtRoleName(token: string | null): string {
  if (!token) return "";
  try {
    const payload = JSON.parse(atob(token.split(".")[1] || "")) as {
      user_role_name?: string;
    };
    return String(payload.user_role_name || "").toLowerCase();
  } catch {
    return "";
  }
}

function detailToRow(d: OrgTeamDetail): OrgTeamRow {
  return {
    team_id: d.team_id,
    team_name: d.team_name,
    team_info: d.team_info,
    total_number_of_members: d.total_number_of_members,
    admin_id: d.admin_id,
    admin_name: d.admin_name,
    members: d.members.map((m) => ({
      team_member_id: m.team_member_id,
      user_id: m.user_id,
      user_name: m.user_name,
      user_email: m.user_email,
      user_phone: m.user_phone,
      joined_date: m.joined_date,
      leave_date: m.leave_date,
      added_by_id: m.added_by_id,
      added_by_name: m.added_by_name,
      removed_by_id: m.removed_by_id,
      removed_by_name: m.removed_by_name,
    })),
  };
}

function modalShell(
  title: string,
  onClose: () => void,
  children: ReactNode,
  footer?: ReactNode,
) {
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-950/50 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-5 py-4" style={{ borderTop: "3px solid #C99237" }}>
          <h2 className="text-lg font-bold tracking-tight text-[#0C123A]">{title}</h2>
        </div>
        <div className="max-h-[min(55vh,420px)] overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="border-t border-slate-100 bg-slate-50/90 px-5 py-3">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

export default function TeamGroupPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = String(params?.org_id ?? "");

  const [detail, setDetail] = useState<OrgTeamDetail | null>(null);
  const [noTeam, setNoTeam] = useState(false);
  const [notifications, setNotifications] = useState<TeamActivityNotification[]>([]);
  const [leaveQueries, setLeaveQueries] = useState<TeamLeaveQueryRow[]>([]);
  const [activityTab, setActivityTab] = useState<
    "notifications" | "leaves" | "attendance"
  >("notifications");
  const [leaveBusyId, setLeaveBusyId] = useState<number | null>(null);
  const [attendanceQueries, setAttendanceQueries] = useState<
    AttendanceQueryRow[]
  >([]);
  const [attendanceListError, setAttendanceListError] = useState<string | null>(
    null,
  );
  const [attResolveModal, setAttResolveModal] = useState<{
    id: number;
    action: "approved" | "rejected";
  } | null>(null);
  const [attResolveNote, setAttResolveNote] = useState("");
  const [attResolveSubmitting, setAttResolveSubmitting] = useState(false);
  const [orgUsers, setOrgUsers] = useState<OrgUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [tableSearch, setTableSearch] = useState("");

  const [modal, setModal] = useState<null | "add" | "remove">(null);
  const [addSearch, setAddSearch] = useState("");
  const [removeSearch, setRemoveSearch] = useState("");

  const [myLeaveRows, setMyLeaveRows] = useState<EmployeeLeaveRow[]>([]);
  const [myAttRows, setMyAttRows] = useState<AttendanceQueryRow[]>([]);
  const [myRequestsError, setMyRequestsError] = useState<string | null>(null);

  const [adminLeaveModalOpen, setAdminLeaveModalOpen] = useState(false);
  const [adminAttModalOpen, setAdminAttModalOpen] = useState(false);
  const [leaveType, setLeaveType] = useState<
    "full_day" | "half_day" | "short_leave"
  >("full_day");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [leaveFormError, setLeaveFormError] = useState<string | null>(null);
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);

  const [attCategory, setAttCategory] =
    useState<AttendanceQueryCategory>("forget_punch_in");
  const [attDate, setAttDate] = useState("");
  const [attMessage, setAttMessage] = useState("");
  const [attFormError, setAttFormError] = useState<string | null>(null);
  const [attSubmitting, setAttSubmitting] = useState(false);

  const backHref = `/dashboard/${orgId}/home`;

  const reloadMyHrRequests = useCallback(async () => {
    const t = localStorage.getItem("token");
    if (!t || !detail?.is_admin) return;
    const orgIdNum = Number(orgId);
    if (Number.isNaN(orgIdNum)) return;
    try {
      const [ml, ma] = await Promise.all([
        fetchMyLeaveQueries(t, orgIdNum),
        fetchMyAttendanceQueries(t, orgIdNum),
      ]);
      setMyLeaveRows(ml);
      setMyAttRows(ma);
      setMyRequestsError(null);
    } catch (e) {
      setMyRequestsError(
        e instanceof Error ? e.message : "Could not load your HR requests.",
      );
    }
  }, [detail?.is_admin, orgId]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setBanner(null);
    setNoTeam(false);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setBanner({ type: "err", text: "Sign in required." });
        return;
      }
      const orgIdNum = Number(orgId);
      if (!orgId || Number.isNaN(orgIdNum)) {
        setBanner({ type: "err", text: "Invalid organization." });
        return;
      }
      const my = await fetchMyOrgTeam(token, orgIdNum);
      setDetail(my);
      const [feed, users] = await Promise.all([
        fetchTeamActivityFeed(token, my.team_id, orgIdNum),
        getAllOrgUsers(token),
      ]);
      setNotifications(feed.notifications);
      setLeaveQueries(feed.leave_queries);
      setOrgUsers(users);
      try {
        const rows = await fetchAllAttendanceQueries(token, orgIdNum, {
          team_id: my.team_id,
        });
        setAttendanceQueries(rows);
        setAttendanceListError(null);
      } catch (attErr) {
        setAttendanceQueries([]);
        setAttendanceListError(
          attErr instanceof Error
            ? attErr.message
            : "Could not load attendance queries.",
        );
      }
      if (my.is_admin) {
        try {
          const [ml, ma] = await Promise.all([
            fetchMyLeaveQueries(token, orgIdNum),
            fetchMyAttendanceQueries(token, orgIdNum),
          ]);
          setMyLeaveRows(ml);
          setMyAttRows(ma);
          setMyRequestsError(null);
        } catch (me) {
          setMyLeaveRows([]);
          setMyAttRows([]);
          setMyRequestsError(
            me instanceof Error
              ? me.message
              : "Could not load your HR requests.",
          );
        }
      } else {
        setMyLeaveRows([]);
        setMyAttRows([]);
        setMyRequestsError(null);
      }
    } catch (e) {
      const err = e as { status?: number; message?: string };
      if (err.status === 404) {
        setNoTeam(true);
        setDetail(null);
        setLeaveQueries([]);
        setNotifications([]);
        setAttendanceQueries([]);
        setAttendanceListError(null);
        setMyLeaveRows([]);
        setMyAttRows([]);
        setMyRequestsError(null);
      } else {
        setDetail(null);
        setLeaveQueries([]);
        setNotifications([]);
        setAttendanceQueries([]);
        setAttendanceListError(null);
        setMyLeaveRows([]);
        setMyAttRows([]);
        setMyRequestsError(null);
        setBanner({
          type: "err",
          text: e instanceof Error ? e.message : "Could not load team.",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const refreshActivityFeed = useCallback(async () => {
    const t = localStorage.getItem("token");
    if (!t || !detail) return;
    const orgIdNum = Number(orgId);
    if (Number.isNaN(orgIdNum)) return;
    try {
      const feed = await fetchTeamActivityFeed(t, detail.team_id, orgIdNum);
      setNotifications(feed.notifications);
      setLeaveQueries(feed.leave_queries);
    } catch {
      // keep existing feed on error
    }
    try {
      const rows = await fetchAllAttendanceQueries(t, orgIdNum, {
        team_id: detail.team_id,
      });
      setAttendanceQueries(rows);
      setAttendanceListError(null);
    } catch (attErr) {
      setAttendanceListError(
        attErr instanceof Error
          ? attErr.message
          : "Could not load attendance queries.",
      );
    }
    if (detail.is_admin) {
      await reloadMyHrRequests();
    }
  }, [detail, orgId, reloadMyHrRequests]);

  const focusRow = useMemo(() => (detail ? detailToRow(detail) : null), [detail]);
  const isTeamAdmin = Boolean(detail?.is_admin);

  const pendingLeaveCount = useMemo(
    () =>
      leaveQueries.filter((q) => String(q.status).toLowerCase() === "pending")
        .length,
    [leaveQueries],
  );

  const pendingAttendanceCount = useMemo(
    () =>
      attendanceQueries.filter(
        (q) => String(q.query_status).toLowerCase() === "pending",
      ).length,
    [attendanceQueries],
  );

  const myPendingLeaveCount = useMemo(
    () =>
      myLeaveRows.filter((r) => String(r.status).toLowerCase() === "pending")
        .length,
    [myLeaveRows],
  );

  const myPendingAttCount = useMemo(
    () =>
      myAttRows.filter(
        (r) => String(r.query_status).toLowerCase() === "pending",
      ).length,
    [myAttRows],
  );

  function roleCanApproveLeaves(): boolean {
    const t =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const role = jwtRoleName(t);
    return ["admin", "hr", "manager"].includes(role);
  }

  /** Matches `leaveResponseController`: admin, HR, or manager only (not team-admin alone). */
  const showLeaveApproveButtons = roleCanApproveLeaves();

  const inTeamIds = useCallback((row: OrgTeamRow) => {
    const s = new Set<number>();
    for (const m of row.members) s.add(Number(m.user_id));
    return s;
  }, []);

  const addCandidates = useMemo(() => {
    if (!focusRow) return [];
    const ids = inTeamIds(focusRow);
    const q = addSearch.trim().toLowerCase();
    return orgUsers.filter((u) => {
      const id = Number(u.id);
      if (ids.has(id)) return false;
      if (!q) return true;
      const name = String(u.user_name ?? "").toLowerCase();
      const email = String(u.user_email ?? "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [focusRow, orgUsers, addSearch, inTeamIds]);

  const removeCandidates = useMemo(() => {
    if (!focusRow) return [];
    const q = removeSearch.trim().toLowerCase();
    return focusRow.members.filter((m) => {
      if (!q) return true;
      const name = String(m.user_name ?? "").toLowerCase();
      const email = String(m.user_email ?? "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [focusRow, removeSearch]);

  const filteredMembers = useMemo(() => {
    if (!detail) return [];
    const q = tableSearch.trim().toLowerCase();
    return detail.members.filter((m) => {
      if (!q) return true;
      const name = String(m.user_name ?? "").toLowerCase();
      const email = String(m.user_email ?? "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [detail, tableSearch]);

  function closeModal() {
    setModal(null);
    setAddSearch("");
    setRemoveSearch("");
  }

  async function runAction(action: () => Promise<void>) {
    setBusy(true);
    setBanner(null);
    try {
      await action();
      await loadAll();
      closeModal();
      setBanner({ type: "ok", text: "Updated." });
    } catch (e) {
      setBanner({
        type: "err",
        text: e instanceof Error ? e.message : "Something went wrong.",
      });
    } finally {
      setBusy(false);
    }
  }

  function openAttResolveModal(queryId: number, action: "approved" | "rejected") {
    setAttResolveModal({ id: queryId, action });
    setAttResolveNote("");
    setBanner(null);
  }

  async function submitAttResolveModal() {
    const t = localStorage.getItem("token");
    if (!t || !attResolveModal) {
      setBanner({ type: "err", text: "Sign in required." });
      return;
    }
    const orgIdNum = Number(orgId);
    if (Number.isNaN(orgIdNum)) return;

    const note = attResolveNote.trim();
    if (!note) {
      setBanner({
        type: "err",
        text: "Please enter a management note (visible to the employee).",
      });
      return;
    }


    setAttResolveSubmitting(true);
    setBanner(null);
    try {
      await updateAttendanceQueryStatus(t, {
        org_id: orgIdNum,
        query_id: attResolveModal.id,
        query_status: attResolveModal.action === "approved" ? "approved" : "rejected",
        admin_response: note,
      });
      setBanner({
        type: "ok",
        text:
          attResolveModal.action === "approved"
            ? "Attendance query approved."
            : "Attendance query rejected.",
      });
      setAttResolveModal(null);
      await refreshActivityFeed();
    } catch (e) {
      setBanner({
        type: "err",
        text:
          e instanceof Error
            ? e.message
            : "Could not update attendance query.",
      });
    } finally {
      setAttResolveSubmitting(false);
    }
  }

  async function handleLeaveResponse(
    leaveId: number,
    status: "approved" | "rejected",
  ) {
    const t = localStorage.getItem("token");
    if (!t) {
      setBanner({ type: "err", text: "Sign in required." });
      return;
    }
    const orgIdNum = Number(orgId);
    if (Number.isNaN(orgIdNum)) return;
    setLeaveBusyId(leaveId);
    setBanner(null);
    try {
      await respondToLeaveRequest(t, {
        leave_id: leaveId,
        org_id: orgIdNum,
        status,
      });
      setBanner({
        type: "ok",
        text: status === "approved" ? "Leave approved." : "Leave rejected.",
      });
      await refreshActivityFeed();
    } catch (e) {
      setBanner({
        type: "err",
        text: e instanceof Error ? e.message : "Could not update leave.",
      });
    } finally {
      setLeaveBusyId(null);
    }
  }

  function openAdminLeaveModal() {
    setLeaveType("full_day");
    setStartDate("");
    setEndDate("");
    setReason("");
    setLeaveFormError(null);
    setAdminLeaveModalOpen(true);
  }

  async function onSubmitAdminLeave(e: FormEvent) {
    e.preventDefault();
    setLeaveFormError(null);
    const t = localStorage.getItem("token");
    if (!t || !detail) {
      setLeaveFormError("Sign in required.");
      return;
    }
    const orgIdNum = Number(orgId);
    if (Number.isNaN(orgIdNum) || !startDate) {
      setLeaveFormError("Start date is required.");
      return;
    }
    setLeaveSubmitting(true);
    try {
      await applyForLeave(t, {
        org_id: orgIdNum,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate || null,
        reason: reason.trim() || null,
        team_id: detail.team_id,
      });
      setAdminLeaveModalOpen(false);
      setBanner({ type: "ok", text: "Your leave request was submitted." });
      await reloadMyHrRequests();
    } catch (err) {
      setLeaveFormError(
        err instanceof Error ? err.message : "Could not submit leave.",
      );
    } finally {
      setLeaveSubmitting(false);
    }
  }

  function openAdminAttModal() {
    setAttCategory("forget_punch_in");
    setAttDate("");
    setAttMessage("");
    setAttFormError(null);
    setAdminAttModalOpen(true);
  }

  async function onSubmitAdminAtt(e: FormEvent) {
    e.preventDefault();
    setAttFormError(null);
    const t = localStorage.getItem("token");
    if (!t || !detail) {
      setAttFormError("Sign in required.");
      return;
    }
    const orgIdNum = Number(orgId);
    if (Number.isNaN(orgIdNum)) return;
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
      await raiseAttendanceQuery(t, {
        org_id: orgIdNum,
        category: attCategory,
        query_message: msg,
        attendance_date: attDate.slice(0, 10),
      });
      setAdminAttModalOpen(false);
      setBanner({ type: "ok", text: "Attendance query submitted to HR." });
      await reloadMyHrRequests();
    } catch (err) {
      setAttFormError(
        err instanceof Error ? err.message : "Could not submit query.",
      );
    } finally {
      setAttSubmitting(false);
    }
  }

  const token = () => localStorage.getItem("token");

  if (loading && !detail && !noTeam) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 bg-[#f5f6fa] text-slate-600">
        <Loader2 className="h-10 w-10 animate-spin text-[#C99237]" />
        Opening your team…
      </div>
    );
  }

  if (noTeam || !detail) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <Users className="mx-auto h-12 w-12 text-slate-300" />
        <h1 className="mt-4 text-xl font-semibold text-[#0C123A]">No team assigned</h1>
        <p className="mt-2 text-sm text-slate-600">
          You are not on an active team roster yet. Ask your organization admin to add you to a team.
        </p>
        <Link
          href={backHref}
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#0C123A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#151f52]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>
    );
  }

  const title = displayTeamTitle(detail.team_name);

  return (
    <div className="relative min-h-full overflow-x-hidden bg-[#f0f2f8] pb-16">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(ellipse_75%_55%_at_50%_-12%,rgba(12,18,58,0.06),transparent_58%)]"
        aria-hidden
      />
      <header className="relative isolate overflow-hidden border-b border-[#0C123A]/10 bg-[#0C123A] pb-14 pt-6 sm:pb-16 sm:pt-8">
        <div className="pointer-events-none absolute -right-20 top-0 h-64 w-64 rounded-full bg-[#C99237]/25 blur-[80px]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 rounded-full bg-white/5 blur-[60px]" />

        <div className="relative mx-auto w-full max-w-[1680px] px-4 sm:px-8 lg:px-10">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => router.push(backHref)}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 transition hover:bg-white/15"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Home
            </button>
            <button
              type="button"
              onClick={() => void loadAll()}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 transition hover:bg-white/15"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C99237]">
                My team group
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
                {detail.team_info?.trim() || "Collaborate with your squad — roster, history, and updates in one place."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/15">
                  <Users className="h-3.5 w-3.5" />
                  {detail.total_number_of_members} members
                </span>
                {isTeamAdmin ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#C99237]/25 px-3 py-1 text-xs font-semibold text-[#C99237] ring-1 ring-[#C99237]/40">
                    <Crown className="h-3.5 w-3.5" />
                    You are team admin
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Member view — admin manages roster
                  </span>
                )}
              </div>
            </div>

            {isTeamAdmin ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setModal("add")}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#C99237] px-4 py-2.5 text-sm font-semibold text-[#0C123A] shadow-lg shadow-black/20 transition hover:bg-[#d9a343]"
                >
                  <UserPlus className="h-4 w-4" />
                  Add member
                </button>
                <button
                  type="button"
                  onClick={() => setModal("remove")}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-400/50 bg-rose-500/20 px-4 py-2.5 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/30"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove member
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto w-full max-w-[1680px] -mt-8 px-4 sm:px-8 lg:px-10">
        {banner ? (
          <div
            className={`mb-6 flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm shadow-sm ${
              banner.type === "ok"
                ? "border-emerald-200/80 bg-emerald-50/95 text-emerald-950 ring-1 ring-emerald-500/10"
                : "border-rose-200/80 bg-rose-50/95 text-rose-950 ring-1 ring-rose-500/10"
            }`}
          >
            {banner.type === "ok" ? (
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
              </span>
            ) : (
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-700">
                <AlertCircle className="h-4 w-4" aria-hidden />
              </span>
            )}
            <p className="min-w-0 pt-0.5 font-medium leading-snug">{banner.text}</p>
          </div>
        ) : null}

        <div className="flex flex-col gap-8">
          <div className="w-full space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/90 p-5 shadow-md ring-1 ring-slate-950/[0.03] transition hover:shadow-lg">
                <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[#C99237]/10 blur-2xl transition group-hover:bg-[#C99237]/15" aria-hidden />
                <div className="relative flex items-start justify-between gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C99237]/15 text-[#C99237] ring-1 ring-[#C99237]/25">
                    <CalendarClock className="h-5 w-5" aria-hidden />
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Timeline
                  </span>
                </div>
                <p className="relative mt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  Team created
                </p>
                <p className="relative mt-1.5 text-base font-semibold leading-snug text-[#0C123A]">
                  {fmtLong(detail.created_at)}
                </p>
                <p className="relative mt-2 flex items-center gap-1.5 text-xs text-slate-600">
                  <Users className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                  <span>
                    By{" "}
                    <span className="font-medium text-slate-700">
                      {detail.created_by_name ?? `User #${detail.created_by ?? "—"}`}
                    </span>
                  </span>
                </p>
              </div>
              <div className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/90 p-5 shadow-md ring-1 ring-slate-950/[0.03] transition hover:shadow-lg">
                <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[#0C123A]/8 blur-2xl transition group-hover:bg-[#0C123A]/12" aria-hidden />
                <div className="relative flex items-start justify-between gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0C123A]/10 text-[#0C123A] ring-1 ring-[#0C123A]/15">
                    <Layers className="h-5 w-5" aria-hidden />
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Audit
                  </span>
                </div>
                <p className="relative mt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  Last updated
                </p>
                <p className="relative mt-1.5 text-base font-semibold leading-snug text-[#0C123A]">
                  {fmtLong(detail.updated_at)}
                </p>
                <p className="relative mt-2 text-xs leading-snug text-slate-500">
                  Metadata refreshes when roster or team details change.
                </p>
              </div>
              <div className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-amber-50/40 to-slate-50/90 p-5 shadow-md ring-1 ring-slate-950/[0.03] transition hover:shadow-lg">
                <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-400/15 blur-2xl" aria-hidden />
                <div className="relative flex items-start justify-between gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/25">
                    <Crown className="h-5 w-5" aria-hidden />
                  </div>
                  <span className="rounded-full bg-amber-100/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900/80">
                    Lead
                  </span>
                </div>
                <p className="relative mt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  Team admin
                </p>
                <p className="relative mt-1.5 truncate text-base font-semibold text-[#0C123A]">
                  {detail.admin_name ?? `User #${detail.admin_id}`}
                </p>
                <p className="relative mt-2 text-xs leading-relaxed text-slate-600">
                  Joined {fmtLong(detail.admin_joined_date)}
                  <span className="text-slate-400"> · </span>
                  Added by{" "}
                  <span className="font-medium text-slate-700">
                    {detail.admin_added_by_name ?? "—"}
                  </span>
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md ring-1 ring-slate-950/[0.03]">
              <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0C123A]/10 text-[#0C123A]">
                      <Users className="h-4 w-4" aria-hidden />
                    </span>
                    <div>
                      <h2 className="text-sm font-semibold text-[#0C123A]">Members</h2>
                      <p className="text-xs text-slate-500">
                        {detail.total_number_of_members} on roster · search filters the table
                      </p>
                    </div>
                  </div>
                </div>
                <div className="relative w-full sm:max-w-sm lg:max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    placeholder="Search by name or email…"
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm outline-none transition focus:border-[#C99237]/50 focus:ring-2 focus:ring-[#C99237]/15"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/90 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3">Member</th>
                      <th className="px-5 py-3">Contact</th>
                      <th className="px-5 py-3">Joined</th>
                      <th className="px-5 py-3">Invited by</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMembers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-12 text-center">
                          <div className="mx-auto flex max-w-xs flex-col items-center gap-2">
                            <Search className="h-8 w-8 text-slate-300" aria-hidden />
                            <p className="text-sm font-medium text-slate-600">No matches</p>
                            <p className="text-xs text-slate-500">
                              Try a different search, or clear the filter to see everyone.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredMembers.map((m) => (
                        <tr
                          key={m.team_member_id}
                          className="transition hover:bg-slate-50/95"
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <span
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0C123A] to-[#252f6e] text-xs font-bold text-white shadow-sm ring-2 ring-white"
                                aria-hidden
                              >
                                {initialsFromName(m.user_name)}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  {Number(m.user_id) === Number(detail.admin_id) ? (
                                    <span title="Team admin">
                                      <Crown
                                        className="h-3.5 w-3.5 shrink-0 text-amber-500"
                                        aria-hidden
                                      />
                                    </span>
                                  ) : null}
                                  <span className="truncate font-medium text-[#0C123A]">
                                    {m.user_name}
                                  </span>
                                </div>
                                <p className="truncate text-[11px] text-slate-500">
                                  ID #{m.user_id}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="min-w-0 max-w-[min(380px,36vw)] px-5 py-3 text-xs text-slate-600">
                            <div className="truncate" title={m.user_email}>
                              {m.user_email}
                            </div>
                            {m.user_phone ? (
                              <div className="truncate text-slate-400">{m.user_phone}</div>
                            ) : null}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 text-slate-700">
                            {fmtLong(m.joined_date)}
                          </td>
                          <td className="px-5 py-3 text-slate-700">
                            {m.added_by_name ?? (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="w-full">
            <div
              className={
                isTeamAdmin
                  ? "flex flex-col gap-5 lg:flex-row lg:items-stretch"
                  : "flex flex-col gap-5"
              }
            >
            {isTeamAdmin ? (
              <div className="min-w-0 flex-1 shrink-0">
              <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-lg shadow-slate-900/[0.06] ring-1 ring-slate-950/[0.04]">
                <div className="relative border-b border-slate-100 bg-gradient-to-br from-[#0C123A] via-[#121a4a] to-[#0C123A] px-4 py-4 sm:px-5">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_100%_-20%,rgba(201,146,55,0.22),transparent_50%)]" aria-hidden />
                  <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#C99237]/20 text-[#C99237] ring-1 ring-[#C99237]/35">
                          <Sparkles className="h-4 w-4" aria-hidden />
                        </span>
                        <div>
                          <h3 className="text-sm font-bold tracking-tight text-white">
                            Your HR inbox
                          </h3>
                          <p className="mt-0.5 flex items-start gap-1 text-[11px] leading-snug text-slate-300">
                            <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#C99237]/90" aria-hidden />
                            <span>
                              Leave and attendance fixes for you (the team lead) — same queue
                              org HR uses. Team-wide items stay in{" "}
                              <span className="font-semibold text-white/95">Team activity</span>{" "}
                              in the panel to the right.
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="relative mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-black/25 px-2.5 py-2 ring-1 ring-white/10 backdrop-blur-sm">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                        Pending leave
                      </p>
                      <p className="mt-0.5 flex items-baseline gap-1 text-lg font-bold tabular-nums text-white">
                        {myPendingLeaveCount}
                        {myPendingLeaveCount > 0 ? (
                          <Clock className="mb-0.5 inline h-3.5 w-3.5 text-amber-300" aria-hidden />
                        ) : null}
                      </p>
                    </div>
                    <div className="rounded-xl bg-black/25 px-2.5 py-2 ring-1 ring-white/10 backdrop-blur-sm">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                        Pending att.
                      </p>
                      <p className="mt-0.5 flex items-baseline gap-1 text-lg font-bold tabular-nums text-white">
                        {myPendingAttCount}
                        {myPendingAttCount > 0 ? (
                          <Clock className="mb-0.5 inline h-3.5 w-3.5 text-cyan-300" aria-hidden />
                        ) : null}
                      </p>
                    </div>
                    <div className="rounded-xl bg-black/25 px-2.5 py-2 ring-1 ring-white/10 backdrop-blur-sm">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                        Total items
                      </p>
                      <p className="mt-0.5 text-lg font-bold tabular-nums text-white">
                        {myLeaveRows.length + myAttRows.length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-2.5 p-4 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={openAdminLeaveModal}
                    className="group flex flex-col items-start gap-2 rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/90 p-3.5 text-left shadow-sm ring-1 ring-slate-950/[0.02] transition hover:border-[#C99237]/40 hover:shadow-md hover:ring-[#C99237]/20"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-700 ring-1 ring-indigo-500/20 transition group-hover:bg-indigo-500/15">
                      <CalendarDays className="h-5 w-5" aria-hidden />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-[#0C123A]">
                        Request leave
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
                        Full, half, or short-day — tied to this team.
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={openAdminAttModal}
                    className="group flex flex-col items-start gap-2 rounded-2xl border border-slate-200/90 bg-gradient-to-br from-[#0C123A] to-[#151f52] p-3.5 text-left text-white shadow-md transition hover:shadow-lg hover:brightness-105"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-[#C99237] ring-1 ring-white/20">
                      <ClipboardList className="h-5 w-5" aria-hidden />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">
                        Attendance query
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-slate-300">
                        Missed punch-in/out or corrections for a date.
                      </span>
                    </span>
                  </button>
                </div>

                {myRequestsError ? (
                  <div className="mx-4 mb-4 flex items-start gap-2 rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2.5 text-xs text-amber-950">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                    <span>{myRequestsError}</span>
                  </div>
                ) : null}

                <div className="grid gap-0 border-t border-slate-100 bg-slate-50/50 sm:grid-cols-2">
                  <div className="border-b border-slate-100 p-4 sm:border-b-0 sm:border-r">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        Your leave
                      </p>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200/80">
                        {myLeaveRows.length}
                      </span>
                    </div>
                    {myLeaveRows.length === 0 ? (
                      <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-white/80 px-3 py-6 text-center">
                        <CalendarDays className="mx-auto h-8 w-8 text-slate-300" aria-hidden />
                        <p className="mt-2 text-xs font-medium text-slate-600">Nothing submitted yet</p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          Use <span className="font-semibold text-[#0C123A]">Request leave</span> above.
                        </p>
                      </div>
                    ) : (
                      <ul className="mt-3 max-h-56 space-y-2.5 overflow-y-auto pr-1">
                        {myLeaveRows.map((r) => (
                          <li
                            key={r.id}
                            className="rounded-xl border border-slate-100/90 bg-white px-3 py-2.5 shadow-sm ring-1 ring-slate-950/[0.02]"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex min-w-0 items-start gap-2">
                                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                  <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                                </span>
                                <div className="min-w-0">
                                  <span className="font-semibold capitalize text-[#0C123A]">
                                    {leaveTypeLabel(r.leave_type)}
                                  </span>
                                  <p className="mt-0.5 text-[11px] leading-snug text-slate-600">
                                    {fmtLong(r.start_date)}
                                    {r.end_date ? ` → ${fmtLong(r.end_date)}` : ""}
                                  </p>
                                  {r.reason ? (
                                    <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-slate-500">
                                      “{r.reason}”
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ring-1 ${leaveStatusChipClass(r.status)}`}
                              >
                                {r.status}
                              </span>
                            </div>
                            {r.approved_by_name ? (
                              <p className="mt-2 border-t border-slate-100 pt-2 text-[10px] text-slate-500">
                                <span className="font-semibold text-slate-600">Reviewer: </span>
                                {r.approved_by_name}
                              </p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        Your attendance
                      </p>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200/80">
                        {myAttRows.length}
                      </span>
                    </div>
                    {myAttRows.length === 0 ? (
                      <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-white/80 px-3 py-6 text-center">
                        <ClipboardList className="mx-auto h-8 w-8 text-slate-300" aria-hidden />
                        <p className="mt-2 text-xs font-medium text-slate-600">No queries yet</p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          Tap <span className="font-semibold text-[#0C123A]">Attendance query</span> for HR.
                        </p>
                      </div>
                    ) : (
                      <ul className="mt-3 max-h-56 space-y-2.5 overflow-y-auto pr-1">
                        {myAttRows.map((r) => (
                          <li
                            key={r.id}
                            className="rounded-xl border border-slate-100/90 bg-white px-3 py-2.5 shadow-sm ring-1 ring-slate-950/[0.02]"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex min-w-0 items-start gap-2">
                                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
                                  <ClipboardList className="h-3.5 w-3.5" aria-hidden />
                                </span>
                                <div className="min-w-0">
                                  <span className="font-semibold text-[#0C123A]">
                                    {attendanceCategoryLabel(r.category)}
                                  </span>
                                  <p className="mt-0.5 text-[11px] text-slate-600">
                                    Work date:{" "}
                                    <span className="font-medium">{fmtDateOnly(r.attendance_date)}</span>
                                  </p>
                                  {r.query_message ? (
                                    <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-slate-500">
                                      {r.query_message}
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ring-1 ${leaveStatusChipClass(r.query_status)}`}
                              >
                                {r.query_status}
                              </span>
                            </div>
                            {r.admin_response ? (
                              <p className="mt-2 rounded-lg border border-slate-100 bg-slate-50/90 px-2 py-1.5 text-[10px] leading-snug text-slate-700">
                                <span className="font-semibold text-slate-800">HR note: </span>
                                {r.admin_response}
                              </p>
                            ) : null}
                            {r.approved_by_name &&
                            String(r.query_status).toLowerCase() !== "pending" ? (
                              <p className="mt-1.5 text-[10px] text-slate-500">
                                By {r.approved_by_name}
                              </p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
              </div>
            ) : null}

            <div className="min-w-0 flex-1 lg:min-h-0">
            <div className="sticky top-6 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xl shadow-slate-900/[0.08] ring-1 ring-slate-950/[0.04]">
              <div className="relative border-b border-slate-100 bg-gradient-to-r from-[#0C123A] via-[#121a4a] to-[#0C123A] px-3 py-4">
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_40%,rgba(201,146,55,0.08)_100%)]" aria-hidden />
                <div className="relative flex items-start justify-between gap-2 px-1">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#C99237]/25 text-[#C99237] ring-1 ring-[#C99237]/40">
                      <Bell className="h-4 w-4" aria-hidden />
                    </span>
                    <div>
                      <h2 className="text-sm font-bold tracking-tight text-white">
                        Team activity
                      </h2>
                      <p className="mt-0.5 max-w-2xl text-[11px] leading-snug text-slate-300">
                        Org-wide alerts, leave queue, and attendance corrections for{" "}
                        <span className="font-semibold text-white/95">{title}</span>.
                      </p>
                    </div>
                  </div>
                  <span className="hidden shrink-0 rounded-lg bg-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#C99237] ring-1 ring-white/15 sm:inline">
                    Live feed
                  </span>
                </div>
                <div className="relative mt-3 flex gap-1 rounded-xl bg-black/25 p-1 ring-1 ring-white/10">
                  <button
                    type="button"
                    onClick={() => setActivityTab("notifications")}
                    className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] font-semibold transition ${
                      activityTab === "notifications"
                        ? "bg-white text-[#0C123A] shadow-md"
                        : "text-white/85 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Bell className="h-3.5 w-3.5 shrink-0 opacity-90" />
                    <span className="truncate">Alerts</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivityTab("leaves")}
                    className={`relative flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] font-semibold transition ${
                      activityTab === "leaves"
                        ? "bg-white text-[#0C123A] shadow-md"
                        : "text-white/85 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <CalendarDays className="h-3.5 w-3.5 shrink-0 opacity-90" />
                    <span className="truncate">Leaves</span>
                    {pendingLeaveCount > 0 ? (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold text-white ring-2 ring-[#0C123A]">
                        {pendingLeaveCount > 9 ? "9+" : pendingLeaveCount}
                      </span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivityTab("attendance")}
                    className={`relative flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] font-semibold transition ${
                      activityTab === "attendance"
                        ? "bg-white text-[#0C123A] shadow-md"
                        : "text-white/85 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <ClipboardList className="h-3.5 w-3.5 shrink-0 opacity-90" />
                    <span className="truncate">Attendance</span>
                    {pendingAttendanceCount > 0 ? (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-cyan-500 px-1 text-[9px] font-bold text-white ring-2 ring-[#0C123A]">
                        {pendingAttendanceCount > 9
                          ? "9+"
                          : pendingAttendanceCount}
                      </span>
                    ) : null}
                  </button>
                </div>
              </div>

              {activityTab === "notifications" ? (
                <div className="flex items-start gap-2 border-b border-slate-100 bg-slate-50/90 px-4 py-3">
                  <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#C99237]" aria-hidden />
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    <span className="font-semibold text-[#0C123A]">Roster log.</span>{" "}
                    Adds, removals, and team updates appear in chronological order.
                  </p>
                </div>
              ) : null}
              {activityTab === "leaves" ? (
                <div className="flex items-start gap-2 border-b border-slate-100 bg-indigo-50/50 px-4 py-3">
                  <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" aria-hidden />
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    <span className="font-semibold text-indigo-900">Team leave queue.</span>{" "}
                    Approve or reject only if your org role allows (admin, HR, or manager).
                  </p>
                </div>
              ) : null}
              {activityTab === "attendance" ? (
                <div className="flex items-start gap-2 border-b border-slate-100 bg-cyan-50/50 px-4 py-3">
                  <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" aria-hidden />
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    <span className="font-semibold text-cyan-950">Correction requests.</span>{" "}
                    Same approval rules — org admin, HR, or manager can resolve pending items.
                  </p>
                </div>
              ) : null}

              <div className="max-h-[min(70vh,560px)] overflow-y-auto">
                {activityTab === "notifications" ? (
                  notifications.length === 0 ? (
                    <p className="px-4 py-10 text-center text-sm text-slate-500">
                      No activity yet. Adds, removals, and updates will appear here.
                    </p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {notifications.map((n) => (
                        <li
                          key={n.id}
                          className="relative border-l-[3px] border-l-[#C99237]/70 pl-4 pr-4 py-3 transition hover:bg-slate-50/90"
                        >
                          <p className="text-[10px] font-bold uppercase tracking-wide text-[#C99237]">
                            {actionLabel(n.action_type)}
                          </p>
                          <p className="mt-1 text-sm font-medium text-[#0C123A]">
                            {n.action_reason}
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-x-2 text-[11px] text-slate-500">
                            <span>{fmtLong(n.created_at)}</span>
                            {n.performed_by_name ? (
                              <span>· {n.performed_by_name}</span>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )
                ) : null}

                {activityTab === "leaves" ? (
                  leaveQueries.length === 0 ? (
                    <p className="px-4 py-10 text-center text-sm text-slate-500">
                      No leave requests for this team yet.
                    </p>
                  ) : (
                    <ul className="space-y-3 p-3">
                      {leaveQueries.map((q) => {
                        const pending =
                          String(q.status).toLowerCase() === "pending";
                        return (
                          <li
                            key={q.id}
                            className="rounded-xl border border-slate-100 bg-slate-50/90 p-3 shadow-sm"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-semibold text-[#0C123A]">
                                  {q.user_name}
                                </p>
                                <p className="text-[11px] text-slate-600">
                                  {q.user_email}
                                  {q.user_phone ? ` · ${q.user_phone}` : ""}
                                </p>
                              </div>
                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${leaveStatusChipClass(q.status)}`}
                              >
                                {q.status}
                              </span>
                            </div>
                            <p className="mt-2 text-sm font-medium capitalize text-slate-800">
                              {leaveTypeLabel(q.leave_type)}
                            </p>
                            <p className="text-xs text-slate-600">
                              {fmtLong(q.start_date)}
                              {q.end_date ? ` → ${fmtLong(q.end_date)}` : ""}
                            </p>
                            {q.reason ? (
                              <p className="mt-1 line-clamp-3 text-xs text-slate-600">
                                {q.reason}
                              </p>
                            ) : null}
                            <p className="mt-1 text-[10px] text-slate-400">
                              Submitted {fmtLong(q.created_at)}
                            </p>
                            {pending && showLeaveApproveButtons ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  disabled={leaveBusyId === q.id}
                                  onClick={() =>
                                    void handleLeaveResponse(q.id, "rejected")
                                  }
                                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50 sm:flex-initial"
                                >
                                  <X className="h-3.5 w-3.5" />
                                  Reject
                                </button>
                                <button
                                  type="button"
                                  disabled={leaveBusyId === q.id}
                                  onClick={() =>
                                    void handleLeaveResponse(q.id, "approved")
                                  }
                                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50 sm:flex-initial"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  Approve
                                </button>
                              </div>
                            ) : null}
                            {pending && !showLeaveApproveButtons ? (
                              <p className="mt-2 text-[11px] text-amber-800/90">
                                Pending — only organization admin, HR, or manager
                                can approve or reject.
                              </p>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )
                ) : null}

                {activityTab === "attendance" ? (
                  attendanceListError ? (
                    <p className="px-4 py-6 text-center text-sm text-amber-800">
                      {attendanceListError}
                    </p>
                  ) : attendanceQueries.length === 0 ? (
                    <p className="px-4 py-10 text-center text-sm text-slate-500">
                      No attendance queries for this team yet.
                    </p>
                  ) : (
                    <ul className="space-y-3 p-3">
                      {attendanceQueries.map((row) => {
                        const pending =
                          String(row.query_status).toLowerCase() === "pending";
                        const who = attendeeFromQuery(row, detail, orgUsers);
                        return (
                          <li
                            key={row.id}
                            className="rounded-xl border border-slate-100 bg-slate-50/90 p-3 shadow-sm"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-semibold text-[#0C123A]">
                                  {who.name}
                                </p>
                                {who.email ? (
                                  <p className="text-[11px] text-slate-600">
                                    {who.email}
                                    {who.phone ? ` · ${who.phone}` : ""}
                                  </p>
                                ) : null}
                              </div>
                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${leaveStatusChipClass(row.query_status)}`}
                              >
                                {row.query_status}
                              </span>
                            </div>
                            <p className="mt-2 text-sm font-medium text-slate-800">
                              {attendanceCategoryLabel(row.category)}
                            </p>
                            <p className="text-xs text-slate-600">
                              Date: {fmtDateOnly(row.attendance_date)}
                            </p>
                            <p className="mt-1 text-sm text-slate-700">
                              {row.query_message}
                            </p>
                            {row.admin_response ? (
                              <p className="mt-2 rounded-lg border border-slate-100 bg-white px-2.5 py-2 text-xs text-slate-600">
                                <span className="font-semibold text-slate-800">
                                  Response
                                </span>
                                {" — "}
                                {row.admin_response}
                                {row.approved_by_name ? (
                                  <span className="mt-1 block text-[11px] text-slate-500">
                                    — {row.approved_by_name}
                                    {row.resolved_at
                                      ? ` · ${fmtLong(row.resolved_at)}`
                                      : ""}
                                  </span>
                                ) : null}
                              </p>
                            ) : null}
                            <p className="mt-1 text-[10px] text-slate-400">
                              Submitted {fmtLong(row.created_at)}
                            </p>
                            {pending && showLeaveApproveButtons ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  disabled={
                                    attResolveSubmitting &&
                                    attResolveModal?.id === row.id
                                  }
                                  onClick={() =>
                                    openAttResolveModal(row.id, "rejected")
                                  }
                                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50 sm:flex-initial"
                                >
                                  <X className="h-3.5 w-3.5" />
                                  Reject
                                </button>
                                <button
                                  type="button"
                                  disabled={
                                    attResolveSubmitting &&
                                    attResolveModal?.id === row.id
                                  }
                                  onClick={() =>
                                    openAttResolveModal(row.id, "approved")
                                  }
                                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50 sm:flex-initial"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  Approve
                                </button>
                              </div>
                            ) : null}
                            {pending && !showLeaveApproveButtons ? (
                              <p className="mt-2 text-[11px] text-amber-800/90">
                                Pending — only organization admin, HR, or manager
                                can approve or reject.
                              </p>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )
                ) : null}
              </div>
            </div>
            </div>
          </div>
          </div>
        </div>
      </div>

      {adminLeaveModalOpen ? (
        <div
          className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-950/50 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-leave-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close"
            onClick={() => !leaveSubmitting && setAdminLeaveModalOpen(false)}
          />
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200/90 bg-white shadow-2xl">
            <div
              className="sticky top-0 z-[1] flex items-start justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4"
              style={{ borderTop: "3px solid #C99237" }}
            >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 ring-1 ring-indigo-500/15">
                    <CalendarDays className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <h2
                      id="admin-leave-title"
                      className="text-lg font-bold tracking-tight text-[#0C123A]"
                    >
                      Request leave
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Submitted to HR for this organization (linked to your team).
                    </p>
                  </div>
                </div>
              <button
                type="button"
                disabled={leaveSubmitting}
                onClick={() => setAdminLeaveModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={onSubmitAdminLeave} className="space-y-4 px-5 py-4">
              {leaveFormError ? (
                <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-100">
                  {leaveFormError}
                </p>
              ) : null}
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">Leave type</span>
                <select
                  value={leaveType}
                  onChange={(e) =>
                    setLeaveType(e.target.value as typeof leaveType)
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-[#C99237]/60 focus:ring-2 focus:ring-[#C99237]/25"
                >
                  <option value="full_day">Full day</option>
                  <option value="half_day">Half day</option>
                  <option value="short_leave">Short leave</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">Start date</span>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-[#C99237]/60 focus:ring-2 focus:ring-[#C99237]/25"
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
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-[#C99237]/60 focus:ring-2 focus:ring-[#C99237]/25"
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
                  placeholder="Context for HR…"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-[#C99237]/60 focus:ring-2 focus:ring-[#C99237]/25"
                />
              </label>
              <div className="-mx-5 mt-4 flex gap-2 border-t border-slate-100 bg-slate-50/90 px-5 py-4">
                <button
                  type="button"
                  disabled={leaveSubmitting}
                  onClick={() => setAdminLeaveModalOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={leaveSubmitting}
                  className="flex-1 rounded-xl bg-[#0C123A] py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#151f52] disabled:opacity-50"
                >
                  {leaveSubmitting ? "Submitting…" : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {adminAttModalOpen ? (
        <div
          className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-950/50 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-att-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close"
            onClick={() => !attSubmitting && setAdminAttModalOpen(false)}
          />
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200/90 bg-white shadow-2xl">
            <div
              className="sticky top-0 z-[1] flex items-start justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4"
              style={{ borderTop: "3px solid #C99237" }}
            >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-700 ring-1 ring-cyan-500/20">
                    <ClipboardList className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <h2
                      id="admin-att-title"
                      className="text-lg font-bold tracking-tight text-[#0C123A]"
                    >
                      Attendance query to HR
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Report a missed punch or timing issue for a specific day.
                    </p>
                  </div>
                </div>
              <button
                type="button"
                disabled={attSubmitting}
                onClick={() => setAdminAttModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={onSubmitAdminAtt} className="space-y-4 px-5 py-4">
              {attFormError ? (
                <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-100">
                  {attFormError}
                </p>
              ) : null}
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">Issue type</span>
                <select
                  value={attCategory}
                  onChange={(e) =>
                    setAttCategory(e.target.value as AttendanceQueryCategory)
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-[#C99237]/60 focus:ring-2 focus:ring-[#C99237]/25"
                >
                  <option value="forget_punch_in">Forgot punch in</option>
                  <option value="forget_punch_out">Forgot punch out</option>
                  <option value="late_punch_in">Late punch in</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">Attendance date</span>
                <input
                  type="date"
                  required
                  value={attDate}
                  onChange={(e) => setAttDate(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-[#C99237]/60 focus:ring-2 focus:ring-[#C99237]/25"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">Explanation</span>
                <textarea
                  value={attMessage}
                  onChange={(e) => setAttMessage(e.target.value)}
                  rows={4}
                  required
                  placeholder="What happened? Include times if relevant."
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-[#C99237]/60 focus:ring-2 focus:ring-[#C99237]/25"
                />
              </label>
              <div className="-mx-5 mt-4 flex gap-2 border-t border-slate-100 bg-slate-50/90 px-5 py-4">
                <button
                  type="button"
                  disabled={attSubmitting}
                  onClick={() => setAdminAttModalOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={attSubmitting}
                  className="flex-1 rounded-xl bg-[#0C123A] py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#151f52] disabled:opacity-50"
                >
                  {attSubmitting ? "Submitting…" : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {attResolveModal ? (
        <div
          className="fixed inset-0 z-[1001] flex items-end justify-center bg-slate-950/50 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="att-resolve-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close"
            onClick={() => !attResolveSubmitting && setAttResolveModal(null)}
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl">
            <div
              className="border-b border-slate-100 px-5 py-4"
              style={{ borderTop: "3px solid #C99237" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2
                    id="att-resolve-title"
                    className="text-lg font-bold tracking-tight text-[#0C123A]"
                  >
                    {attResolveModal.action === "approved"
                      ? "Approve attendance query"
                      : "Reject attendance query"}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Your note is saved as the admin response and shown to the
                    employee.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={attResolveSubmitting}
                  onClick={() => setAttResolveModal(null)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                  aria-label="Close dialog"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="px-5 py-4">
              <label className="block">
                <span className="text-xs font-semibold text-slate-700">
                  Management note
                </span>
                <textarea
                  value={attResolveNote}
                  onChange={(e) => setAttResolveNote(e.target.value)}
                  rows={4}
                  placeholder="Explain the decision (required)…"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#C99237]/25"
                />
              </label>
            </div>
            <div className="flex gap-2 border-t border-slate-100 bg-slate-50/90 px-5 py-3">
              <button
                type="button"
                disabled={attResolveSubmitting}
                onClick={() => setAttResolveModal(null)}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={attResolveSubmitting}
                onClick={() => void submitAttResolveModal()}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50 ${
                  attResolveModal.action === "approved"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {attResolveSubmitting
                  ? "Submitting…"
                  : attResolveModal.action === "approved"
                    ? "Submit approval"
                    : "Submit rejection"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {modal && focusRow && isTeamAdmin
        ? (() => {
            const team = focusRow;
            if (modal === "add") {
              return modalShell(
                "Add member",
                closeModal,
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#C99237]/25"
                      placeholder="Search…"
                      value={addSearch}
                      onChange={(e) => setAddSearch(e.target.value)}
                    />
                  </div>
                  <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
                    {addCandidates.length === 0 ? (
                      <li className="py-8 text-center text-sm text-slate-500">No one to add.</li>
                    ) : (
                      addCandidates.map((u) => (
                        <li
                          key={String(u.id)}
                          className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{u.user_name}</div>
                            <div className="truncate text-xs text-slate-500">{u.user_email}</div>
                          </div>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              runAction(async () => {
                                const t = token();
                                if (!t) throw new Error("Sign in required.");
                                await addMemberToOrgTeam(t, team.team_id, u.id as number | string);
                              })
                            }
                            className="shrink-0 rounded-lg bg-[#0C123A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#151f52] disabled:opacity-50"
                          >
                            Add
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </>,
                null,
              );
            }
            if (modal === "remove") {
              return modalShell(
                "Remove member",
                closeModal,
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#C99237]/25"
                      placeholder="Search…"
                      value={removeSearch}
                      onChange={(e) => setRemoveSearch(e.target.value)}
                    />
                  </div>
                  <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
                    {removeCandidates.map((m) => (
                      <li
                        key={m.team_member_id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                      >
                        <div>
                          <div className="text-sm font-medium">{m.user_name}</div>
                          <div className="text-xs text-slate-500">{m.user_email}</div>
                        </div>
                        <button
                          type="button"
                          disabled={Number(m.user_id) === Number(team.admin_id)}
                          onClick={() =>
                            runAction(async () => {
                              const t = token();
                              if (!t) throw new Error("Sign in required.");
                              await removeMemberFromOrgTeam(t, team.team_id, m.user_id);
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-40"
                        >
                          <Trash2 className="h-3 w-3" />
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </>,
                null,
              );
            }
            return null;
          })()
        : null}
    </div>
  );
}
