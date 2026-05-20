"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  Crown,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
  UserPlus,
  Users,
  UserMinus,
} from "lucide-react";
import { getAllOrgUsers, type OrgUserRow } from "@/services/adminUser";
import {
  addMemberToOrgTeam,
  fetchOrgTeamById,
  removeMemberFromOrgTeam,
  updateOrgTeam,
  type OrgTeamDetail,
  type OrgTeamRow,
} from "@/services/orgTeams";

type ModalKind = null | "add" | "remove" | "admin" | "update";

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
      aria-labelledby="team-detail-modal"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl">
        <div
          className="border-b border-slate-100 px-5 py-4"
          style={{ borderTop: "3px solid #0d9488" }}
        >
          <h2
            id="team-detail-modal"
            className="text-lg font-bold tracking-tight text-slate-900"
          >
            {title}
          </h2>
        </div>
        <div className="max-h-[min(60vh,500px)] overflow-y-auto px-5 py-4">
          {children}
        </div>
        {footer ? (
          <div className="border-t border-slate-100 bg-slate-50/90 px-5 py-3">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

export default function TeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = String(params?.org_id ?? "");
  const teamId = String(params?.team_id ?? "");

  const [detail, setDetail] = useState<OrgTeamDetail | null>(null);
  const [orgUsers, setOrgUsers] = useState<OrgUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );
  const [memberTableSearch, setMemberTableSearch] = useState("");

  const [modal, setModal] = useState<ModalKind>(null);
  const [addSearch, setAddSearch] = useState("");
  const [removeSearch, setRemoveSearch] = useState("");
  const [adminSearch, setAdminSearch] = useState("");
  const [updateName, setUpdateName] = useState("");
  const [updateInfo, setUpdateInfo] = useState("");

  const backHref = `/dashboard/${orgId}/organization-employees/manage-teams`;

  const loadAll = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    setBanner(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setBanner({ type: "err", text: "Sign in required." });
        return;
      }
      const [d, users] = await Promise.all([
        fetchOrgTeamById(token, teamId),
        getAllOrgUsers(token),
      ]);
      setDetail(d);
      setOrgUsers(users);
    } catch (e) {
      setDetail(null);
      setBanner({
        type: "err",
        text: e instanceof Error ? e.message : "Failed to load team.",
      });
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const focusRow = useMemo(
    () => (detail ? detailToRow(detail) : null),
    [detail],
  );

  function closeModal() {
    setModal(null);
    setAddSearch("");
    setRemoveSearch("");
    setAdminSearch("");
    setUpdateName("");
    setUpdateInfo("");
  }

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

  const adminCandidates = useMemo(() => {
    if (!focusRow) return [];
    const q = adminSearch.trim().toLowerCase();
    return focusRow.members.filter((m) => {
      if (!q) return true;
      const name = String(m.user_name ?? "").toLowerCase();
      const email = String(m.user_email ?? "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [focusRow, adminSearch]);

  const filteredTableMembers = useMemo(() => {
    if (!detail) return [];
    const q = memberTableSearch.trim().toLowerCase();
    return detail.members.filter((m) => {
      if (!q) return true;
      const name = String(m.user_name ?? "").toLowerCase();
      const email = String(m.user_email ?? "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [detail, memberTableSearch]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setBanner(null);
    try {
      await action();
      await loadAll();
      closeModal();
      setBanner({ type: "ok", text: "Saved." });
    } catch (e) {
      setBanner({
        type: "err",
        text: e instanceof Error ? e.message : "Something went wrong.",
      });
    } finally {
      setBusy(false);
    }
  }

  if (loading && !detail) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-[#f4f6f9] text-slate-600">
        <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
        Loading team…
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <p className="text-slate-700">Team could not be loaded.</p>
        {banner?.type === "err" ? (
          <p className="mt-2 text-sm text-rose-600">{banner.text}</p>
        ) : null}
        <Link
          href={backHref}
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to team management
        </Link>
      </div>
    );
  }

  const title = displayTeamTitle(detail.team_name);
  const token = () => localStorage.getItem("token");

  return (
    <div className="min-h-full bg-[#f4f6f9] pb-24">
      <div className="relative isolate overflow-hidden bg-slate-950 px-4 pb-16 pt-8 sm:px-8 sm:pb-20">
        <div className="pointer-events-none absolute -left-20 top-0 h-72 w-72 rounded-full bg-teal-500/20 blur-[90px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-indigo-500/15 blur-[80px]" />

        <div className="relative mx-auto max-w-6xl">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => router.push(backHref)}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-teal-100 transition hover:bg-white/15"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Teams
            </button>
            <button
              type="button"
              onClick={() => void loadAll()}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-teal-100 transition hover:bg-white/15"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-300/90">
                Team workspace
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
                {detail.team_info?.trim() || "No description yet — add context so others know what this team owns."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setModal("add");
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-lg shadow-black/20 transition hover:bg-slate-100"
              >
                <UserPlus className="h-4 w-4" />
                Add members
              </button>
              <button
                type="button"
                onClick={() => setModal("admin")}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
              >
                <Crown className="h-4 w-4 text-amber-300" />
                Change admin
              </button>
              <button
                type="button"
                onClick={() => {
                  setUpdateName(detail.team_name);
                  setUpdateInfo(detail.team_info ?? "");
                  setModal("update");
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
              >
                <Settings2 className="h-4 w-4" />
                Update info
              </button>
              <button
                type="button"
                onClick={() => setModal("remove")}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-400/40 bg-rose-500/15 px-4 py-2.5 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/25"
              >
                <UserMinus className="h-4 w-4" />
                Remove members
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-6xl -mt-10 px-4 sm:px-8">
        {banner ? (
          <div
            className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${
              banner.type === "ok"
                ? "border-teal-200 bg-teal-50 text-teal-900"
                : "border-rose-200 bg-rose-50 text-rose-900"
            }`}
          >
            {banner.text}
          </div>
        ) : null}

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-lg shadow-slate-200/30 ring-1 ring-slate-950/[0.04]">
            <div className="flex items-center gap-2 text-slate-500">
              <Users className="h-4 w-4 text-teal-600" />
              <span className="text-[11px] font-semibold uppercase tracking-wide">
                Total members
              </span>
            </div>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-slate-900">
              {detail.total_number_of_members}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-lg shadow-slate-200/30 ring-1 ring-slate-950/[0.04]">
            <div className="flex items-center gap-2 text-slate-500">
              <Crown className="h-4 w-4 text-amber-500" />
              <span className="text-[11px] font-semibold uppercase tracking-wide">
                Team admin
              </span>
            </div>
            <p className="mt-3 truncate text-lg font-semibold text-slate-900">
              {detail.admin_name ?? `User #${detail.admin_id}`}
            </p>
            <p className="mt-1 truncate text-xs text-slate-500">ID { String(detail.admin_id) }</p>
          </div>
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-lg shadow-slate-200/30 ring-1 ring-slate-950/[0.04]">
            <div className="flex items-center gap-2 text-slate-500">
              <CalendarClock className="h-4 w-4 text-teal-600" />
              <span className="text-[11px] font-semibold uppercase tracking-wide">
                Team created
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold leading-snug text-slate-900">
              {fmtLong(detail.created_at)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              By {detail.created_by_name ?? `User #${detail.created_by ?? "—"}`}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-lg shadow-slate-200/30 ring-1 ring-slate-950/[0.04]">
            <div className="flex items-center gap-2 text-slate-500">
              <Layers className="h-4 w-4 text-indigo-500" />
              <span className="text-[11px] font-semibold uppercase tracking-wide">
                Last updated
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold leading-snug text-slate-900">
              {fmtLong(detail.updated_at)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Schema: team record</p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 p-6 shadow-lg shadow-slate-200/25 lg:col-span-2">
            <h2 className="text-sm font-semibold text-slate-900">Admin membership</h2>
            <p className="mt-1 text-xs text-slate-500">
              How this person entered the team roster.
            </p>
            <dl className="mt-5 space-y-4 text-sm">
              <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                <dt className="text-slate-500">Joined team</dt>
                <dd className="text-right font-medium text-slate-900">
                  {fmtLong(detail.admin_joined_date)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                <dt className="text-slate-500">Added by</dt>
                <dd className="max-w-[60%] truncate text-right font-medium text-slate-900">
                  {detail.admin_added_by_name ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Team description</dt>
                <dd className="max-w-[55%] text-right text-slate-700">
                  {detail.team_info?.trim() ? detail.team_info : "—"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-0 shadow-lg shadow-slate-200/25 lg:col-span-3">
            <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Roster</h2>
                <p className="text-xs text-slate-500">
                  Join dates and who added each member.
                </p>
              </div>
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  placeholder="Search roster…"
                  value={memberTableSearch}
                  onChange={(e) => setMemberTableSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2 pl-9 pr-3 text-sm outline-none focus:border-teal-500/60 focus:bg-white focus:ring-2 focus:ring-teal-500/15"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3">Member</th>
                    <th className="px-5 py-3">Contact</th>
                    <th className="px-5 py-3">Joined</th>
                    <th className="px-5 py-3">Added by</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTableMembers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-12 text-center text-slate-500">
                        No members match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredTableMembers.map((m) => (
                      <tr
                        key={m.team_member_id}
                        className="bg-white transition hover:bg-slate-50/80"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            {Number(m.user_id) === Number(detail.admin_id) ? (
                              <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                            ) : null}
                            <span className="font-medium text-slate-900">{m.user_name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          <div className="text-xs">{m.user_email}</div>
                          {m.user_phone ? (
                            <div className="text-xs text-slate-400">{m.user_phone}</div>
                          ) : null}
                        </td>
                        <td className="px-5 py-3 text-slate-700">{fmtLong(m.joined_date)}</td>
                        <td className="px-5 py-3 text-slate-700">
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

      {modal && focusRow
        ? (() => {
            const team = focusRow;
            if (modal === "add") {
              return modalShell(
                "Add member — " + displayTeamTitle(team.team_name),
                closeModal,
                <>
                  <p className="text-sm text-slate-600">
                    Only people not already on this team are listed.
                  </p>
                  <div className="relative mt-3">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-teal-500/20"
                      placeholder="Search name or email…"
                      value={addSearch}
                      onChange={(e) => setAddSearch(e.target.value)}
                    />
                  </div>
                  <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                    {addCandidates.length === 0 ? (
                      <li className="py-8 text-center text-sm text-slate-500">No matches.</li>
                    ) : (
                      addCandidates.map((u) => (
                        <li
                          key={String(u.id)}
                          className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{u.user_name}</div>
                            <div className="truncate text-xs text-slate-500">{u.user_email}</div>
                          </div>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              run(async () => {
                                const t = token();
                                if (!t) throw new Error("Sign in required.");
                                await addMemberToOrgTeam(t, team.team_id, u.id as number | string);
                              })
                            }
                            className="shrink-0 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
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
                "Remove member — " + displayTeamTitle(team.team_name),
                closeModal,
                <>
                  <p className="text-sm text-rose-800/90">
                    Soft-removes the member from the active roster.
                  </p>
                  <div className="relative mt-3">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-teal-500/20"
                      placeholder="Search…"
                      value={removeSearch}
                      onChange={(e) => setRemoveSearch(e.target.value)}
                    />
                  </div>
                  <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                    {removeCandidates.map((m) => (
                      <li
                        key={m.team_member_id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2"
                      >
                        <div>
                          <div className="text-sm font-medium">{m.user_name}</div>
                          <div className="text-xs text-slate-500">{m.user_email}</div>
                        </div>
                        <button
                          type="button"
                          disabled={Number(m.user_id) === Number(team.admin_id)}
                          title={
                            Number(m.user_id) === Number(team.admin_id)
                              ? "Change admin first."
                              : undefined
                          }
                          onClick={() =>
                            run(async () => {
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
            if (modal === "admin") {
              return modalShell(
                "Change admin — " + displayTeamTitle(team.team_name),
                closeModal,
                <>
                  <p className="text-sm text-slate-600">
                    New admin must be an active member of this team.
                  </p>
                  <div className="relative mt-3">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-teal-500/20"
                      placeholder="Search member…"
                      value={adminSearch}
                      onChange={(e) => setAdminSearch(e.target.value)}
                    />
                  </div>
                  <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                    {adminCandidates.filter((m) => Number(m.user_id) !== Number(team.admin_id))
                      .length === 0 ? (
                      <li className="py-8 text-center text-sm text-slate-500">
                        No other members to promote.
                      </li>
                    ) : (
                      adminCandidates
                        .filter((m) => Number(m.user_id) !== Number(team.admin_id))
                        .map((m) => (
                          <li
                            key={m.team_member_id}
                            className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2"
                          >
                            <span className="text-sm font-medium">{m.user_name}</span>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                run(async () => {
                                  const t = token();
                                  if (!t) throw new Error("Sign in required.");
                                  await updateOrgTeam(t, {
                                    team_id: team.team_id,
                                    new_admin_id: m.user_id,
                                  });
                                })
                              }
                              className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-amber-400 disabled:opacity-50"
                            >
                              Make admin
                            </button>
                          </li>
                        ))
                    )}
                  </ul>
                </>,
                null,
              );
            }
            if (modal === "update") {
              return modalShell(
                "Update team — " + displayTeamTitle(team.team_name),
                closeModal,
                <>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                    Name
                  </label>
                  <input
                    className="mb-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500/20"
                    value={updateName}
                    onChange={(e) => setUpdateName(e.target.value)}
                  />
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                    Description
                  </label>
                  <textarea
                    className="min-h-[100px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500/20"
                    value={updateInfo}
                    onChange={(e) => setUpdateInfo(e.target.value)}
                  />
                </>,
                <button
                  type="button"
                  disabled={busy || !updateName.trim()}
                  onClick={() =>
                    run(async () => {
                      const t = token();
                      if (!t) throw new Error("Sign in required.");
                      await updateOrgTeam(t, {
                        team_id: team.team_id,
                        team_name: updateName.trim(),
                        team_info: updateInfo.trim(),
                      });
                    })
                  }
                  className="w-full rounded-xl bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  Save changes
                </button>,
              );
            }
            return null;
          })()
        : null}
    </div>
  );
}
