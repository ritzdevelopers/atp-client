"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import AssignedLeaveTypeSelect from "@/components/portal-dashboard/user-layout/AssignedLeaveTypeSelect";
import { useAssignedLeaveTypes } from "@/hooks/useAssignedLeaveTypes";
import {
  allReviewerOptionKeys,
  approvalRoleLabel,
  buildLeaveQueryPayload,
  computeLeaveDays,
  createEmployeeLeave,
  deleteEmployeeLeave,
  fetchLeaveReviewers,
  fetchLeaveReviewersHrAdmin,
  fetchMyEmployeeLeaves,
  filterManagementLeaveReviewers,
  isUnpaidLeaveTypeId,
  leaveDurationLabel,
  leaveStatusBadgeClass,
  mapReviewersToPayload,
  reviewerOptionKey,
  UNPAID_LEAVE_OPTION,
  updateEmployeeLeave,
  validateLeaveForm,
  type EmployeeLeaveRow,
  type LeaveDuration,
  type LeaveReviewerOption,
  type SessionInfo,
} from "@/services/employeeLeaveManagement";

export type MyLeavesWorkspaceVariant = "employee" | "management";

export type MyLeavesWorkspaceProps = {
  variant?: MyLeavesWorkspaceVariant;
  applicantRoleKey?: string;
};

function inputCls() {
  return "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[15px] text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 lg:text-sm";
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type FormMode = "create" | "edit";

export default function MyLeavesWorkspace({
  variant = "employee",
  applicantRoleKey = "",
}: MyLeavesWorkspaceProps) {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgIdParam = String(params?.org_id ?? "");
  const orgId = Number(orgIdParam);
  const initialTeamId = searchParams.get("team_id");
  const wantsApply = searchParams.get("apply") === "1";
  const isManagement = variant === "management";

  const homeHref = isManagement
    ? `/dashboard/${orgIdParam}/home`
    : `/user-dashboard/${orgIdParam}/home`;
  const leavesPath = isManagement
    ? `/dashboard/${orgIdParam}/my-leaves`
    : `/user-dashboard/${orgIdParam}/my-leaves`;

  const [tab, setTab] = useState<"list" | "apply">(wantsApply ? "apply" : "list");
  const [leaves, setLeaves] = useState<EmployeeLeaveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");

  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editingLeave, setEditingLeave] = useState<EmployeeLeaveRow | null>(null);
  const [teamId, setTeamId] = useState<string>(initialTeamId ?? "");

  useEffect(() => {
    if (initialTeamId) setTeamId(initialTeamId);
  }, [initialTeamId]);

  const [leaveDuration, setLeaveDuration] = useState<LeaveDuration>("full_day");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | "">("");
  const [timing, setTiming] = useState("09:30");
  const [reason, setReason] = useState("");

  const [reviewerOptions, setReviewerOptions] = useState<LeaveReviewerOption[]>([]);
  const [reviewersLoading, setReviewersLoading] = useState(false);
  const [selectedReviewerKeys, setSelectedReviewerKeys] = useState<string[]>([]);

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeLeaveRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const {
    options: assignedLeaveOptions,
    selectedLeaveTypeId,
    setSelectedLeaveTypeId,
    loading: assignedLeavesLoading,
    error: assignedLeavesError,
    reload: reloadAssignedLeaves,
  } = useAssignedLeaveTypes(Number.isNaN(orgId) ? undefined : orgId, true);

  const paidLeaveOptions = useMemo(
    () =>
      assignedLeaveOptions.filter(
        (row) =>
          !isUnpaidLeaveTypeId(row.leave_type_id) &&
          String(row.leave_type_id) !== "000",
      ),
    [assignedLeaveOptions],
  );

  const leaveTypeOptions = useMemo(() => {
    const options = assignedLeaveOptions.filter(
      (row) => String(row.leave_type_id) !== "000",
    );
    if (!options.some((row) => isUnpaidLeaveTypeId(row.leave_type_id))) {
      options.push(UNPAID_LEAVE_OPTION);
    }
    return options;
  }, [assignedLeaveOptions]);

  const selectedLeaveTypeIdNumber = useMemo(() => {
    if (selectedLeaveTypeId === "") return null;
    return Number(selectedLeaveTypeId);
  }, [selectedLeaveTypeId]);

  const selectedBalance = useMemo(() => {
    if (isUnpaidLeaveTypeId(selectedLeaveTypeId)) return undefined;
    const row = paidLeaveOptions.find(
      (o) => String(o.leave_type_id) === selectedLeaveTypeId,
    );
    return row ? Number(row.remaining_leaves ?? 0) : undefined;
  }, [paidLeaveOptions, selectedLeaveTypeId]);

  const leaveDays = useMemo(() => {
    const end = endDate || startDate;
    if (!startDate) return 0;
    return computeLeaveDays(leaveDuration, startDate, end);
  }, [leaveDuration, startDate, endDate]);

  const reviewerHint = useMemo(() => {
    if (!isManagement) return null;
    const role = applicantRoleKey.trim().toLowerCase();
    if (role === "hr") {
      return "As HR, your leave request is sent to the organization admin for approval.";
    }
    return "Your leave request is sent to HR and admin for approval.";
  }, [isManagement, applicantRoleKey]);

  const loadLeaves = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Not signed in.");
      setLeaves([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchMyEmployeeLeaves(token, orgId);
      setLeaves(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load leaves");
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  const loadReviewers = useCallback(async () => {
    if (!orgId || Number.isNaN(orgId)) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    setReviewersLoading(true);
    try {
      let rows: LeaveReviewerOption[];
      if (isManagement) {
        const all = await fetchLeaveReviewersHrAdmin(token, orgId);
        rows = filterManagementLeaveReviewers(all, applicantRoleKey);
      } else {
        rows = await fetchLeaveReviewers(
          token,
          orgId,
          teamId.trim() ? teamId : null,
        );
      }
      setReviewerOptions(rows);
      setSelectedReviewerKeys((prev) => {
        const valid = prev.filter((key) =>
          rows.some((row) => reviewerOptionKey(row) === key),
        );
        if (valid.length > 0) return valid;
        if (isManagement) return allReviewerOptionKeys(rows);
        const reportingManager = rows.find(
          (row) => row.approval_role === "reporting_manager",
        );
        if (reportingManager) return [reviewerOptionKey(reportingManager)];
        return rows.length ? [reviewerOptionKey(rows[0]!)] : [];
      });
    } catch (e) {
      setFormError(
        e instanceof Error ? e.message : "Could not load reviewers",
      );
      setReviewerOptions([]);
    } finally {
      setReviewersLoading(false);
    }
  }, [orgId, teamId, isManagement, applicantRoleKey]);

  useEffect(() => {
    void loadLeaves();
  }, [loadLeaves]);

  useEffect(() => {
    if (tab === "apply") void loadReviewers();
  }, [tab, loadReviewers]);

  useEffect(() => {
    if (leaveDuration === "half_day" || leaveDuration === "short_leave") {
      setEndDate(startDate);
    }
  }, [leaveDuration, startDate]);

  const filteredLeaves = useMemo(() => {
    if (statusFilter === "all") return leaves;
    return leaves.filter((row) => row.leave_status === statusFilter);
  }, [leaves, statusFilter]);

  function resetForm() {
    setFormMode("create");
    setEditingLeave(null);
    setLeaveDuration("full_day");
    setStartDate("");
    setEndDate("");
    setSessionInfo("");
    setTiming("09:30");
    setReason("");
    setFormError(null);
    setFormSuccess(null);
    setSelectedReviewerKeys([]);
  }

  function openCreateForm() {
    resetForm();
    setTab("apply");
    router.replace(`${leavesPath}?apply=1`, { scroll: false });
  }

  function openEditForm(leave: EmployeeLeaveRow) {
    if (leave.leave_status !== "pending") return;
    setFormMode("edit");
    setEditingLeave(leave);
    setTeamId(leave.team_id != null ? String(leave.team_id) : "");
    setLeaveDuration(leave.leave_duration);
    setStartDate(leave.start_date);
    setEndDate(leave.end_date);
    setSessionInfo(leave.session_info ?? "");
    setTiming(leave.timing?.slice(0, 5) ?? "09:30");
    setReason(leave.reason);
    setSelectedLeaveTypeId(
      leave.leave_type_name?.toLowerCase() === "unpaid leave"
        ? "0"
        : String(leave.leave_type_id),
    );
    setSelectedReviewerKeys(
      leave.reviewers_info.map((r) => `${r.reviewer_id}-${r.approval_role}`),
    );
    setFormError(null);
    setFormSuccess(null);
    setTab("apply");
  }

  function toggleReviewer(key: string) {
    setSelectedReviewerKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  async function onSubmitForm(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const token = localStorage.getItem("token");
    if (!token) {
      setFormError("Not signed in.");
      return;
    }

    const validationError = validateLeaveForm({
      leave_type_id: selectedLeaveTypeIdNumber,
      leave_duration: leaveDuration,
      start_date: startDate,
      end_date: endDate || startDate,
      reason,
      session_info: sessionInfo,
      timing: timing ? `${timing}:00` : undefined,
      leave_days: leaveDays,
      selectedReviewerKeys,
      remainingBalance: selectedBalance,
    });
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const leaveQuery = buildLeaveQueryPayload({
      team_id: teamId.trim() ? Number(teamId) : null,
      leave_type_id: selectedLeaveTypeIdNumber ?? 0,
      leave_duration: leaveDuration,
      start_date: startDate,
      end_date: endDate || startDate,
      session_info: sessionInfo || null,
      timing: timing ? `${timing}:00` : null,
      reason,
    });

    setSubmitting(true);
    try {
      if (formMode === "create") {
        const leave_reviewer = mapReviewersToPayload(
          reviewerOptions,
          selectedReviewerKeys,
        );
        const result = await createEmployeeLeave(token, orgId, {
          leave_query: [leaveQuery],
          leave_reviewer,
        });
        setFormSuccess(result.message || "Leave submitted successfully.");
        resetForm();
        setTab("list");
        router.replace(leavesPath, { scroll: false });
      } else if (editingLeave) {
        const patchPayload: Record<string, unknown> = {
          team_id: leaveQuery.team_id,
          leave_type_id: leaveQuery.leave_type_id,
          leave_duration: leaveQuery.leave_duration,
          start_date: leaveQuery.start_date,
          end_date: leaveQuery.end_date,
          leave_days: leaveQuery.leave_days,
          session_info: leaveQuery.session_info,
          timing: leaveQuery.timing,
          reason: leaveQuery.reason,
        };
        const newReviewers = mapReviewersToPayload(
          reviewerOptions.filter(
            (option) =>
              !editingLeave.reviewers_info.some(
                (existing) =>
                  existing.reviewer_id === option.reviewer_id &&
                  existing.approval_role === option.approval_role,
              ),
          ),
          selectedReviewerKeys.filter(
            (key) =>
              !editingLeave.reviewers_info.some(
                (existing) =>
                  `${existing.reviewer_id}-${existing.approval_role}` === key,
              ),
          ),
        );
        if (newReviewers.length > 0) {
          patchPayload.leave_reviewer = newReviewers;
        }
        await updateEmployeeLeave(token, orgId, editingLeave.id, patchPayload);
        setFormSuccess("Leave updated successfully.");
        resetForm();
        setTab("list");
        router.replace(leavesPath, { scroll: false });
      }
      await loadLeaves();
      await reloadAssignedLeaves();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Could not save leave request",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    setDeleting(true);
    try {
      await deleteEmployeeLeave(token, orgId, deleteTarget.id);
      setDeleteTarget(null);
      await loadLeaves();
      await reloadAssignedLeaves();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete leave");
    } finally {
      setDeleting(false);
    }
  }

  const pendingCount = leaves.filter((l) => l.leave_status === "pending").length;
  const reviewersEmptyMessage = isManagement
    ? applicantRoleKey.trim().toLowerCase() === "hr"
      ? "No admin reviewers found. Contact your organization owner."
      : "No HR or admin reviewers found for this organization."
    : "No reviewers found. Contact HR or ensure you are assigned to a team.";

  return (
    <div className="min-h-full bg-slate-50/80">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link
            href={homeHref}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold text-slate-900">
              My leaves
            </h1>
            <p className="text-xs text-slate-500">
              Apply, track and manage your leave requests
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadLeaves()}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            aria-label="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="mx-auto flex max-w-5xl gap-1 border-t border-slate-100 px-4">
          <button
            type="button"
            onClick={() => {
              setTab("list");
              router.replace(leavesPath, { scroll: false });
            }}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              tab === "list"
                ? "border-sky-600 text-sky-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            My requests
            {pendingCount > 0 ? (
              <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                {pendingCount}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={openCreateForm}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              tab === "apply"
                ? "border-sky-600 text-sky-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {formMode === "edit" ? "Edit request" : "Apply leave"}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-4 px-4 py-4 pb-24 lg:pb-6">
        {error ? (
          <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : null}

        {tab === "list" ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {(["all", "pending", "approved", "rejected"] as const).map(
                (status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-full px-3 py-1 text-xs font-medium capitalize ring-1 ring-inset transition ${
                      statusFilter === status
                        ? "bg-sky-600 text-white ring-sky-600"
                        : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {status}
                  </button>
                ),
              )}
              <button
                type="button"
                onClick={openCreateForm}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Apply leave
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
              </div>
            ) : filteredLeaves.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
                <CalendarDays className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm font-medium text-slate-800">
                  No leave requests
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Submit your first leave application to get started.
                </p>
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="mt-4 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Apply leave
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLeaves.map((leave) => (
                  <article
                    key={leave.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {leave.leave_type_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {leaveDurationLabel(leave.leave_duration)} ·{" "}
                          {leave.leave_days} day{leave.leave_days === 1 ? "" : "s"}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ring-1 ring-inset ${leaveStatusBadgeClass(leave.leave_status)}`}
                      >
                        {leave.leave_status}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-700">
                      {formatDate(leave.start_date)}
                      {leave.end_date !== leave.start_date
                        ? ` → ${formatDate(leave.end_date)}`
                        : null}
                      {leave.session_info
                        ? ` · ${leave.session_info.replace("_", " ")}`
                        : null}
                      {leave.timing ? ` · ${leave.timing.slice(0, 5)}` : null}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                      {leave.reason}
                    </p>

                    {leave.reviewers_info.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {leave.reviewers_info.map((reviewer) => (
                          <span
                            key={`${reviewer.reviewer_id}-${reviewer.approval_role}`}
                            className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600"
                          >
                            {reviewer.reviewer_name} (
                            {approvalRoleLabel(reviewer.approval_role)})
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {leave.leave_status === "pending" ||
                    leave.leave_status === "rejected" ? (
                      <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                        {leave.leave_status === "pending" ? (
                          <button
                            type="button"
                            onClick={() => openEditForm(leave)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(leave)}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </>
        ) : (
          <form
            onSubmit={onSubmitForm}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6"
          >
            <h2 className="text-base font-semibold text-slate-900">
              {formMode === "edit" ? "Edit leave request" : "New leave application"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Leave balance is checked before submission.
            </p>

            {formError ? (
              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {formError}
              </div>
            ) : null}
            {formSuccess ? (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                {formSuccess}
              </div>
            ) : null}

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <AssignedLeaveTypeSelect
                options={leaveTypeOptions}
                loading={assignedLeavesLoading}
                error={assignedLeavesError}
                selectedLeaveTypeId={selectedLeaveTypeId}
                onSelectLeaveTypeId={setSelectedLeaveTypeId}
                className={inputCls()}
                labelClassName="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              />

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Duration
                </label>
                <select
                  value={leaveDuration}
                  onChange={(e) =>
                    setLeaveDuration(e.target.value as LeaveDuration)
                  }
                  className={inputCls()}
                >
                  <option value="full_day">Full day</option>
                  <option value="half_day">Half day</option>
                  <option value="short_leave">Short leave</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Start date
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={inputCls()}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  End date
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  min={startDate || undefined}
                  disabled={
                    leaveDuration === "half_day" ||
                    leaveDuration === "short_leave"
                  }
                  onChange={(e) => setEndDate(e.target.value)}
                  className={inputCls()}
                />
              </div>

              {leaveDuration === "half_day" ? (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Session
                  </label>
                  <select
                    value={sessionInfo}
                    onChange={(e) =>
                      setSessionInfo(e.target.value as SessionInfo | "")
                    }
                    required
                    className={inputCls()}
                  >
                    <option value="">Select session</option>
                    <option value="session_1">Session 1 (morning)</option>
                    <option value="session_2">Session 2 (afternoon)</option>
                  </select>
                </div>
              ) : null}

              {leaveDuration === "short_leave" ? (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Leave time (09:00–18:00)
                  </label>
                  <input
                    type="time"
                    required
                    min="09:00"
                    max="18:00"
                    value={timing}
                    onChange={(e) => setTiming(e.target.value)}
                    className={inputCls()}
                  />
                </div>
              ) : null}

              {!isManagement && teamId ? (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Team
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={teamId}
                    className={`${inputCls()} bg-slate-50`}
                  />
                </div>
              ) : null}
            </div>

            {startDate ? (
              <p className="mt-3 text-xs text-slate-500">
                Requesting <strong>{leaveDays}</strong> day
                {leaveDays === 1 ? "" : "s"}
                {selectedBalance != null
                  ? ` · ${selectedBalance} remaining for selected type`
                  : null}
              </p>
            ) : null}

            <div className="mt-4">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Reason
              </label>
              <textarea
                rows={3}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe the reason for your leave..."
                className={`${inputCls()} resize-none`}
              />
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Reviewers
                </label>
                <button
                  type="button"
                  onClick={() => void loadReviewers()}
                  className="text-xs text-sky-600 hover:underline"
                >
                  Refresh
                </button>
              </div>
              {reviewerHint ? (
                <p className="mb-2 text-xs text-slate-500">{reviewerHint}</p>
              ) : null}
              {reviewersLoading ? (
                <p className="text-sm text-slate-500">Loading reviewers…</p>
              ) : reviewerOptions.length === 0 ? (
                <p className="text-sm text-amber-700">{reviewersEmptyMessage}</p>
              ) : (
                <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                  {reviewerOptions.map((reviewer) => {
                    const key = reviewerOptionKey(reviewer);
                    const checked = selectedReviewerKeys.includes(key);
                    const locked =
                      formMode === "edit" &&
                      editingLeave?.reviewers_info.some(
                        (existing) =>
                          `${existing.reviewer_id}-${existing.approval_role}` ===
                          key,
                      );
                    return (
                      <label
                        key={key}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 transition ${
                          checked
                            ? "border-sky-200 bg-sky-50/50"
                            : "border-slate-200 bg-white"
                        } ${locked ? "opacity-70" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={locked}
                          onChange={() => toggleReviewer(key)}
                          className="mt-1"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-slate-900">
                            {reviewer.reviewer_name}
                          </span>
                          <span className="block break-words text-xs text-slate-500">
                            {approvalRoleLabel(reviewer.approval_role)}
                            {reviewer.reviewer_email
                              ? ` · ${reviewer.reviewer_email}`
                              : ""}
                            {reviewer.reviewer_emp_code
                              ? ` · ${reviewer.reviewer_emp_code}`
                              : ""}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  resetForm();
                  setTab("list");
                  router.replace(leavesPath, { scroll: false });
                }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  submitting ||
                  assignedLeavesLoading ||
                  reviewersLoading ||
                  selectedLeaveTypeId === ""
                }
                className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : formMode === "edit" ? (
                  "Update request"
                ) : (
                  "Submit request"
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">
              Delete leave request?
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              This will permanently remove your {deleteTarget.leave_type_name}{" "}
              request ({formatDate(deleteTarget.start_date)}).
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void confirmDelete()}
                className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
