"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  Suspense,
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
  X,
} from "lucide-react";
import AssignedLeaveTypeSelect from "@/components/portal-dashboard/user-layout/AssignedLeaveTypeSelect";
import { useAssignedLeaveTypes } from "@/hooks/useAssignedLeaveTypes";
import {
  approvalRoleLabel,
  buildLeaveQueryPayload,
  computeLeaveDays,
  createEmployeeLeave,
  deleteEmployeeLeave,
  fetchLeaveReviewers,
  fetchMyEmployeeLeaves,
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

function zohoInputCls() {
  return "w-full rounded-lg border border-[#E4E7EC] bg-white px-3 py-2.5 text-[15px] text-[#1F2937] outline-none transition focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15 lg:text-sm";
}

function zohoSelectCls() {
  return zohoInputCls();
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

function MyLeavesContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgIdParam = String(params?.org_id ?? "");
  const orgId = Number(orgIdParam);
  const initialTeamId = searchParams.get("team_id");
  const wantsApply = searchParams.get("apply") === "1";

  const [tab, setTab] = useState<"list" | "apply">(wantsApply ? "apply" : "list");
  const [leaves, setLeaves] = useState<EmployeeLeaveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

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
      const rows = await fetchLeaveReviewers(
        token,
        orgId,
        teamId.trim() ? teamId : null,
      );
      setReviewerOptions(rows);
      setSelectedReviewerKeys((prev) => {
        const valid = prev.filter((key) =>
          rows.some((row) => reviewerOptionKey(row) === key),
        );
        if (valid.length > 0) return valid;
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
  }, [orgId, teamId]);

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
    router.replace(`/user-dashboard/${orgIdParam}/my-leaves?apply=1`, {
      scroll: false,
    });
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
        router.replace(`/user-dashboard/${orgIdParam}/my-leaves`, {
          scroll: false,
        });
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
        router.replace(`/user-dashboard/${orgIdParam}/my-leaves`, {
          scroll: false,
        });
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

  return (
    <div className="min-h-full bg-[#F5F7FA]">
      <div className="sticky top-0 z-20 border-b border-[#E4E7EC] bg-white shadow-sm">
        <div className="h-[3px] bg-[#008CD3]" aria-hidden />
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link
            href={`/user-dashboard/${orgIdParam}/home`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#6B7280] hover:bg-[#F5F7FA]"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold text-[#1F2937]">
              My Leaves
            </h1>
            <p className="text-xs text-[#6B7280]">
              Apply, track and manage your leave requests
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadLeaves()}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#6B7280] hover:bg-[#F5F7FA]"
            aria-label="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="mx-auto flex max-w-5xl gap-1 border-t border-[#E4E7EC] px-4">
          <button
            type="button"
            onClick={() => {
              setTab("list");
              router.replace(`/user-dashboard/${orgIdParam}/my-leaves`, {
                scroll: false,
              });
            }}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              tab === "list"
                ? "border-[#008CD3] text-[#008CD3]"
                : "border-transparent text-[#6B7280] hover:text-[#1F2937]"
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
                ? "border-[#008CD3] text-[#008CD3]"
                : "border-transparent text-[#6B7280] hover:text-[#1F2937]"
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
                        ? "bg-[#008CD3] text-white ring-[#008CD3]"
                        : "bg-white text-[#6B7280] ring-[#E4E7EC] hover:bg-[#F5F7FA]"
                    }`}
                  >
                    {status}
                  </button>
                ),
              )}
              <button
                type="button"
                onClick={openCreateForm}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-[#008CD3] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#007AB8]"
              >
                <Plus className="h-3.5 w-3.5" />
                Apply leave
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-[#008CD3]" />
              </div>
            ) : filteredLeaves.length === 0 ? (
              <div className="rounded-xl border border-[#E4E7EC] bg-white px-6 py-12 text-center">
                <CalendarDays className="mx-auto h-10 w-10 text-[#9CA3AF]" />
                <p className="mt-3 text-sm font-medium text-[#1F2937]">
                  No leave requests
                </p>
                <p className="mt-1 text-xs text-[#6B7280]">
                  Submit your first leave application to get started.
                </p>
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="mt-4 rounded-lg bg-[#008CD3] px-4 py-2 text-sm font-semibold text-white"
                >
                  Apply leave
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLeaves.map((leave) => (
                  <article
                    key={leave.id}
                    className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-[#1F2937]">
                          {leave.leave_type_name}
                        </p>
                        <p className="text-xs text-[#6B7280]">
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

                    <p className="mt-2 text-sm text-[#374151]">
                      {formatDate(leave.start_date)}
                      {leave.end_date !== leave.start_date
                        ? ` → ${formatDate(leave.end_date)}`
                        : null}
                      {leave.session_info
                        ? ` · ${leave.session_info.replace("_", " ")}`
                        : null}
                      {leave.timing ? ` · ${leave.timing.slice(0, 5)}` : null}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-[#6B7280]">
                      {leave.reason}
                    </p>

                    {leave.reviewers_info.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {leave.reviewers_info.map((reviewer) => (
                          <span
                            key={`${reviewer.reviewer_id}-${reviewer.approval_role}`}
                            className="rounded-md bg-[#F5F7FA] px-2 py-0.5 text-[10px] text-[#6B7280]"
                          >
                            {reviewer.reviewer_name} (
                            {approvalRoleLabel(reviewer.approval_role)})
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {leave.leave_status === "pending" ||
                    leave.leave_status === "rejected" ? (
                      <div className="mt-3 flex gap-2 border-t border-[#F0F2F5] pt-3">
                        {leave.leave_status === "pending" ? (
                          <button
                            type="button"
                            onClick={() => openEditForm(leave)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#E4E7EC] px-3 py-1.5 text-xs font-medium text-[#1F2937] hover:bg-[#F5F7FA]"
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
            className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm lg:p-6"
          >
            <h2 className="text-base font-semibold text-[#1F2937]">
              {formMode === "edit" ? "Edit leave request" : "New leave application"}
            </h2>
            <p className="mt-1 text-xs text-[#6B7280]">
              All fields are validated before submission.
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
                className={zohoSelectCls()}
                labelClassName="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#6B7280]"
              />

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                  Duration
                </label>
                <select
                  value={leaveDuration}
                  onChange={(e) =>
                    setLeaveDuration(e.target.value as LeaveDuration)
                  }
                  className={zohoSelectCls()}
                >
                  <option value="full_day">Full day</option>
                  <option value="half_day">Half day</option>
                  <option value="short_leave">Short leave</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                  Start date
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={zohoInputCls()}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
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
                  className={zohoInputCls()}
                />
              </div>

              {leaveDuration === "half_day" ? (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                    Session
                  </label>
                  <select
                    value={sessionInfo}
                    onChange={(e) =>
                      setSessionInfo(e.target.value as SessionInfo | "")
                    }
                    required
                    className={zohoSelectCls()}
                  >
                    <option value="">Select session</option>
                    <option value="session_1">Session 1 (morning)</option>
                    <option value="session_2">Session 2 (afternoon)</option>
                  </select>
                </div>
              ) : null}

              {leaveDuration === "short_leave" ? (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                    Leave time (09:00–18:00)
                  </label>
                  <input
                    type="time"
                    required
                    min="09:00"
                    max="18:00"
                    value={timing}
                    onChange={(e) => setTiming(e.target.value)}
                    className={zohoInputCls()}
                  />
                </div>
              ) : null}

              {teamId ? (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                    Team
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={teamId}
                    className={`${zohoInputCls()} bg-[#F5F7FA]`}
                  />
                </div>
              ) : null}
            </div>

            {startDate ? (
              <p className="mt-3 text-xs text-[#6B7280]">
                Requesting <strong>{leaveDays}</strong> day
                {leaveDays === 1 ? "" : "s"}
                {selectedBalance != null
                  ? ` · ${selectedBalance} remaining for selected type`
                  : null}
              </p>
            ) : null}

            <div className="mt-4">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                Reason
              </label>
              <textarea
                rows={3}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe the reason for your leave..."
                className={`${zohoInputCls()} resize-none`}
              />
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                  Reviewers
                </label>
                <button
                  type="button"
                  onClick={() => void loadReviewers()}
                  className="text-xs text-[#008CD3] hover:underline"
                >
                  Refresh
                </button>
              </div>
              {reviewersLoading ? (
                <p className="text-sm text-[#6B7280]">Loading reviewers…</p>
              ) : reviewerOptions.length === 0 ? (
                <p className="text-sm text-amber-700">
                  No reviewers found. Contact HR or ensure you are assigned to a
                  team.
                </p>
              ) : (
                <div className="space-y-2 rounded-lg border border-[#E4E7EC] p-3">
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
                            ? "border-[#008CD3]/40 bg-[#008CD3]/5"
                            : "border-[#E4E7EC] bg-white"
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
                          <span className="block text-sm font-medium text-[#1F2937]">
                            {reviewer.reviewer_name}
                          </span>
                          <span className="block text-xs text-[#6B7280]">
                            {approvalRoleLabel(reviewer.approval_role)}
                            {reviewer.team_name
                              ? ` · ${reviewer.team_name}`
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
                  router.replace(`/user-dashboard/${orgIdParam}/my-leaves`, {
                    scroll: false,
                  });
                }}
                className="rounded-lg border border-[#E4E7EC] bg-white px-4 py-2 text-sm font-medium text-[#1F2937]"
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
                className="inline-flex items-center gap-2 rounded-lg bg-[#008CD3] px-4 py-2 text-sm font-semibold text-white hover:bg-[#007AB8] disabled:opacity-60"
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
          <div className="w-full max-w-md rounded-xl border border-[#E4E7EC] bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-[#1F2937]">
              Delete leave request?
            </h3>
            <p className="mt-2 text-sm text-[#6B7280]">
              This will permanently remove your{" "}
              {deleteTarget.leave_type_name} request (
              {formatDate(deleteTarget.start_date)}).
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-[#E4E7EC] px-3 py-2 text-sm"
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

export default function MyLeavesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center bg-[#F5F7FA]">
          <Loader2 className="h-8 w-8 animate-spin text-[#008CD3]" />
        </div>
      }
    >
      <MyLeavesContent />
    </Suspense>
  );
}
