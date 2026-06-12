"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Flag,
  Loader2,
  Pencil,
  Save,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import PortalPageLoader from "@/components/portal-dashboard/ui/PortalPageLoader";
import PortalResponseModal, {
  type PortalResponseVariant,
} from "@/components/portal-dashboard/ui/PortalResponseModal";
import { getAllOrgUsers, type OrgUserRow } from "@/services/adminUser";
import { fetchAllOrgTeams, type OrgTeamRow } from "@/services/orgTeams";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const PRIORITIES = ["high", "medium", "low"] as const;
type TaskPriority = (typeof PRIORITIES)[number];

type TaskDetail = {
  task_id: number;
  employee_id: number;
  team_id?: number | null;
  assigned_by_id: number;
  reporting_manager_id: number;
  task_title: string;
  task_description?: string | null;
  task_priority: TaskPriority;
  task_status: string;
  complete_status: string;
  task_start_date: string;
  task_deadline: string;
  employee_completed_at?: string | null;
  manager_remarks?: string | null;
  employee_name?: string;
  assigned_by_name?: string;
  reporting_manager_name?: string;
  created_at?: string;
  updated_at?: string;
};

const PRIORITY_STYLES: Record<
  TaskPriority,
  { label: string; chip: string; dot: string }
> = {
  high: {
    label: "High",
    chip: "bg-[#FCE8E6] text-[#D93025] border-[#F5C6C1]",
    dot: "bg-[#D93025]",
  },
  medium: {
    label: "Medium",
    chip: "bg-[#FEF3E6] text-[#E8710A] border-[#F9DFC8]",
    dot: "bg-[#E8710A]",
  },
  low: {
    label: "Low",
    chip: "bg-[#E8F4FB] text-[#008CD3] border-[#C5E4F3]",
    dot: "bg-[#008CD3]",
  },
};

const STATUS_LABELS: Record<string, string> = {
  pending: "To Do",
  "in-progress": "In Progress",
  delay: "Delayed",
  completed: "Done",
};

const REVIEW_LABELS: Record<string, string> = {
  pending: "Review pending",
  approved: "Approved",
  rejected: "Rejected",
};

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function inputCls() {
  return "w-full rounded-lg border border-[#E4E7EC] bg-white px-3 py-2.5 text-[14px] text-[#1F2937] outline-none transition focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15";
}

function selectCls() {
  return `${inputCls()} appearance-none`;
}

function fieldLabelCls() {
  return "mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]";
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function employeeLabel(row: OrgUserRow) {
  const name = row.user_name?.trim() || "Unnamed";
  const email = row.user_email?.trim();
  return email ? `${name} · ${email}` : name;
}

function TaskDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const orgId = String(params?.org_id ?? "");
  const taskId = String(params?.task_id ?? "");
  const employeeId = searchParams.get("employee_id") ?? "";

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [employees, setEmployees] = useState<OrgUserRow[]>([]);
  const [teams, setTeams] = useState<OrgTeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reviewRemarks, setReviewRemarks] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const [form, setForm] = useState({
    employee_id: "",
    team_id: "",
    reporting_manager: "",
    assignViaTeam: false,
    task_title: "",
    task_description: "",
    task_priority: "medium" as TaskPriority,
    task_start_date: "",
    task_deadline: "",
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [modalVariant, setModalVariant] = useState<PortalResponseVariant>("error");
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalOnClose, setModalOnClose] = useState<(() => void) | undefined>();

  const currentUserId = useMemo(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("user_id") ?? "";
  }, []);

  const canManage = useMemo(() => {
    if (!task || !currentUserId) return false;
    return String(task.assigned_by_id) === String(currentUserId);
  }, [task, currentUserId]);

  const canReview = useMemo(() => {
    if (!task || !currentUserId) return false;
    return (
      String(task.assigned_by_id) === String(currentUserId) ||
      String(task.reporting_manager_id) === String(currentUserId)
    );
  }, [task, currentUserId]);

  const canSubmitReview =
    task?.task_status === "completed" &&
    task?.complete_status === "pending" &&
    Boolean(task?.employee_completed_at);

  const showModal = useCallback(
    (
      variant: PortalResponseVariant,
      title: string,
      message: string,
      onClose?: () => void,
    ) => {
      setModalVariant(variant);
      setModalTitle(title);
      setModalMessage(message);
      setModalOnClose(() => onClose);
      setModalOpen(true);
    },
    [],
  );

  const selectedTeam = useMemo(
    () => teams.find((t) => String(t.team_id) === form.team_id),
    [teams, form.team_id],
  );

  const loadTask = useCallback(async () => {
    if (!orgId || !taskId || !employeeId) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        org_id: orgId,
        employee_id: employeeId,
      });
      const res = await fetch(
        `${API_URL}/api/task-management/get-single-task-information/${taskId}?${qs}`,
        { method: "GET", headers: authHeaders() },
      );
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || "Failed to load task");
      }
      const data = result.data as TaskDetail;
      setTask(data);
      setForm({
        employee_id: String(data.employee_id),
        team_id: data.team_id ? String(data.team_id) : "",
        reporting_manager: String(data.reporting_manager_id),
        assignViaTeam: Boolean(data.team_id),
        task_title: data.task_title,
        task_description: data.task_description ?? "",
        task_priority: data.task_priority,
        task_start_date: formatDate(data.task_start_date),
        task_deadline: formatDate(data.task_deadline),
      });
    } catch (err) {
      showModal(
        "error",
        "Could not load task",
        err instanceof Error ? err.message : "Unknown error",
        () => router.push(`/dashboard/${orgId}/tasks-management/manage-employees-tasks`),
      );
    } finally {
      setLoading(false);
    }
  }, [orgId, taskId, employeeId, showModal, router]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    Promise.all([getAllOrgUsers(token), fetchAllOrgTeams(token)])
      .then(([users, teamsRes]) => {
        setEmployees(users);
        setTeams(teamsRes.teams ?? []);
      })
      .catch(() => {});
  }, [orgId]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  const handleSave = async () => {
    if (!task) return;
    if (!form.task_title.trim()) {
      showModal("error", "Validation", "Task title is required.");
      return;
    }
    if (!form.task_start_date || !form.task_deadline) {
      showModal("error", "Validation", "Start date and deadline are required.");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        task_id: task.task_id,
        task_title: form.task_title.trim(),
        task_description: form.task_description.trim() || null,
        task_priority: form.task_priority,
        task_start_date: form.task_start_date,
        task_deadline: form.task_deadline,
        employee_id: Number(form.employee_id),
      };

      if (form.assignViaTeam && form.team_id) {
        payload.team_id = Number(form.team_id);
        payload.reporting_manager = Number(form.reporting_manager);
      } else {
        payload.team_id = null;
      }

      const res = await fetch(
        `${API_URL}/api/task-management/update-task-information?org_id=${encodeURIComponent(orgId)}`,
        {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify(payload),
        },
      );
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || "Failed to update task");
      }

      setEditMode(false);
      showModal("success", "Task updated", "Task information saved successfully.", () =>
        loadTask(),
      );
    } catch (err) {
      showModal(
        "error",
        "Update failed",
        err instanceof Error ? err.message : "Unknown error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReview = async (completeStatus: "approved" | "rejected") => {
    if (!task) return;
    if (completeStatus === "rejected" && !reviewRemarks.trim()) {
      showModal("error", "Remarks required", "Please add manager remarks when rejecting a task.");
      return;
    }

    setSubmittingReview(true);
    try {
      const res = await fetch(
        `${API_URL}/api/task-management/update-task-complete-status?org_id=${encodeURIComponent(orgId)}`,
        {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({
            task_info_status: [
              {
                task_id: task.task_id,
                employee_id: task.employee_id,
                employee_completed_at: task.employee_completed_at,
                complete_status: completeStatus,
                manager_remarks: reviewRemarks.trim() || null,
              },
            ],
          }),
        },
      );
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || "Failed to submit review");
      }
      setReviewRemarks("");
      showModal(
        "success",
        completeStatus === "approved" ? "Task approved" : "Task rejected",
        result.message ||
          (completeStatus === "approved"
            ? "The task has been marked as approved."
            : "The task was sent back to the employee as pending."),
        () => loadTask(),
      );
    } catch (err) {
      showModal(
        "error",
        "Review failed",
        err instanceof Error ? err.message : "Could not submit review",
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `${API_URL}/api/task-management/delete-task?org_id=${encodeURIComponent(orgId)}`,
        {
          method: "DELETE",
          headers: authHeaders(),
          body: JSON.stringify({ task_id: task.task_id }),
        },
      );
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || "Failed to delete task");
      }
      showModal("success", "Task deleted", "The task was removed successfully.", () =>
        router.push(`/dashboard/${orgId}/tasks-management/manage-employees-tasks`),
      );
    } catch (err) {
      showModal(
        "error",
        "Delete failed",
        err instanceof Error ? err.message : "Unknown error",
      );
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (!employeeId) {
    return (
      <div className="p-6 text-center text-sm text-[#6B7280]">
        Employee context missing. Open this task from the task list.
      </div>
    );
  }

  if (loading) {
    return <PortalPageLoader message="Loading task details…" />;
  }

  if (!task) {
    return (
      <div className="p-6 text-center text-sm text-[#6B7280]">
        Task not found or access denied.
      </div>
    );
  }

  const priorityStyle = PRIORITY_STYLES[task.task_priority] ?? PRIORITY_STYLES.medium;

  return (
    <div className="min-h-full bg-[#F5F7FA]">
      <div className="mx-auto max-w-[1200px] px-4 py-5 sm:px-6 lg:py-8">
        {/* Top bar */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() =>
              router.push(`/dashboard/${orgId}/tasks-management/manage-employees-tasks`)
            }
            className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#008CD3] transition hover:text-[#0070AA]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to tasks
          </button>

          {canManage ? (
            <div className="flex flex-wrap gap-2">
              {editMode ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditMode(false);
                      setForm({
                        employee_id: String(task.employee_id),
                        team_id: task.team_id ? String(task.team_id) : "",
                        reporting_manager: String(task.reporting_manager_id),
                        assignViaTeam: Boolean(task.team_id),
                        task_title: task.task_title,
                        task_description: task.task_description ?? "",
                        task_priority: task.task_priority,
                        task_start_date: formatDate(task.task_start_date),
                        task_deadline: formatDate(task.task_deadline),
                      });
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#E4E7EC] bg-white px-3 py-2 text-[13px] font-semibold text-[#6B7280]"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#008CD3] px-4 py-2 text-[13px] font-semibold text-white shadow-sm disabled:opacity-60"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save changes
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setEditMode(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#C5E4F3] bg-[#E8F4FB] px-3 py-2 text-[13px] font-semibold text-[#0070AA]"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#F5C6C1] bg-[#FCE8E6] px-3 py-2 text-[13px] font-semibold text-[#D93025]"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </>
              )}
            </div>
          ) : null}
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
          {/* Main panel */}
          <div className="rounded-xl border border-[#E4E7EC] bg-white shadow-sm">
            <div className="border-b border-[#E4E7EC] px-5 py-4 sm:px-6">
              <p className="text-[12px] font-medium text-[#9CA3AF]">TASK-{task.task_id}</p>
              {editMode ? (
                <input
                  type="text"
                  value={form.task_title}
                  onChange={(e) => setForm((f) => ({ ...f, task_title: e.target.value }))}
                  className={`${inputCls()} mt-2 text-[20px] font-bold`}
                />
              ) : (
                <h1 className="mt-1 text-[22px] font-bold text-[#1F2937] sm:text-[26px]">
                  {task.task_title}
                </h1>
              )}
            </div>

            <div className="px-5 py-5 sm:px-6">
              <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Description
              </h2>
              {editMode ? (
                <textarea
                  value={form.task_description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, task_description: e.target.value }))
                  }
                  rows={6}
                  placeholder="Add a description…"
                  className={`${inputCls()} min-h-[140px] resize-y`}
                />
              ) : (
                <div className="rounded-lg border border-[#F3F4F6] bg-[#F9FAFB] px-4 py-3 text-[14px] leading-relaxed text-[#374151]">
                  {task.task_description?.trim() ? (
                    task.task_description
                  ) : (
                    <span className="text-[#9CA3AF]">No description provided.</span>
                  )}
                </div>
              )}

              {editMode ? (
                <div className="mt-6 space-y-4 border-t border-[#E4E7EC] pt-6">
                  <div>
                    <label className={fieldLabelCls()}>Assignment type</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            assignViaTeam: false,
                            team_id: "",
                          }))
                        }
                        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-medium ${
                          !form.assignViaTeam
                            ? "border-[#008CD3] bg-[#E8F4FB] text-[#0070AA]"
                            : "border-[#E4E7EC] bg-white text-[#6B7280]"
                        }`}
                      >
                        <User className="h-4 w-4" />
                        Direct
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, assignViaTeam: true }))}
                        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-medium ${
                          form.assignViaTeam
                            ? "border-[#008CD3] bg-[#E8F4FB] text-[#0070AA]"
                            : "border-[#E4E7EC] bg-white text-[#6B7280]"
                        }`}
                      >
                        <Users className="h-4 w-4" />
                        Team
                      </button>
                    </div>
                  </div>

                  {form.assignViaTeam ? (
                    <div>
                      <label className={fieldLabelCls()}>Team</label>
                      <select
                        value={form.team_id}
                        onChange={(e) => {
                          const team = teams.find(
                            (t) => String(t.team_id) === e.target.value,
                          );
                          setForm((f) => ({
                            ...f,
                            team_id: e.target.value,
                            reporting_manager: team
                              ? String(team.admin_id)
                              : f.reporting_manager,
                          }));
                        }}
                        className={selectCls()}
                      >
                        <option value="">Select team</option>
                        {teams.map((team) => (
                          <option key={team.team_id} value={String(team.team_id)}>
                            {team.team_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  <div>
                    <label className={fieldLabelCls()}>Assignee</label>
                    <select
                      value={form.employee_id}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, employee_id: e.target.value }))
                      }
                      className={selectCls()}
                    >
                      {employees.map((emp) => (
                        <option key={String(emp.id)} value={String(emp.id)}>
                          {employeeLabel(emp)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={fieldLabelCls()}>Start date</label>
                      <input
                        type="date"
                        value={form.task_start_date}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, task_start_date: e.target.value }))
                        }
                        className={inputCls()}
                      />
                    </div>
                    <div>
                      <label className={fieldLabelCls()}>Deadline</label>
                      <input
                        type="date"
                        value={form.task_deadline}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, task_deadline: e.target.value }))
                        }
                        className={inputCls()}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={fieldLabelCls()}>Priority</label>
                    <div className="flex flex-wrap gap-2">
                      {PRIORITIES.map((p) => {
                        const active = form.task_priority === p;
                        const style = PRIORITY_STYLES[p];
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() =>
                              setForm((f) => ({ ...f, task_priority: p }))
                            }
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold ${
                              active
                                ? style.chip
                                : "border-[#E4E7EC] bg-[#F9FAFB] text-[#6B7280]"
                            }`}
                          >
                            <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                            {style.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}

              {canReview && canSubmitReview ? (
                <div className="mt-6 border-t border-[#E4E7EC] pt-6">
                  <h2 className="mb-1 text-[13px] font-semibold uppercase tracking-wide text-[#6B7280]">
                    Manager review
                  </h2>
                  <p className="mb-4 text-[13px] text-[#6B7280]">
                    The employee marked this task complete. Approve the work or send it
                    back for revision.
                  </p>
                  <label className={fieldLabelCls()} htmlFor="manager-remarks">
                    Manager remarks
                  </label>
                  <textarea
                    id="manager-remarks"
                    value={reviewRemarks}
                    onChange={(e) => setReviewRemarks(e.target.value)}
                    rows={3}
                    placeholder="Add feedback for the employee (required when rejecting)…"
                    className={`${inputCls()} mb-4 min-h-[88px] resize-y`}
                  />
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      disabled={submittingReview}
                      onClick={() => handleReview("approved")}
                      className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-[#0F9D58] px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm hover:bg-[#0B8043] disabled:opacity-50"
                    >
                      {submittingReview ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ThumbsUp className="h-4 w-4" />
                      )}
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={submittingReview}
                      onClick={() => handleReview("rejected")}
                      className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg border border-[#F5C6C1] bg-[#FCE8E6] px-4 py-2.5 text-[14px] font-semibold text-[#D93025] hover:bg-[#FAD4D0] disabled:opacity-50"
                    >
                      {submittingReview ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ThumbsDown className="h-4 w-4" />
                      )}
                      Reject
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Details
              </h3>
              <dl className="space-y-3 text-[13px]">
                <div>
                  <dt className="text-[#9CA3AF]">Status</dt>
                  <dd className="mt-0.5 font-semibold text-[#1F2937]">
                    {STATUS_LABELS[task.task_status] ?? task.task_status}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#9CA3AF]">Priority</dt>
                  <dd className="mt-1">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${priorityStyle.chip}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${priorityStyle.dot}`} />
                      {priorityStyle.label}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-[#9CA3AF]">Review</dt>
                  <dd className="mt-0.5 font-semibold text-[#1F2937]">
                    {REVIEW_LABELS[task.complete_status] ?? task.complete_status}
                  </dd>
                </div>
                <div>
                  <dt className="inline-flex items-center gap-1 text-[#9CA3AF]">
                    <Calendar className="h-3.5 w-3.5" />
                    Start
                  </dt>
                  <dd className="mt-0.5 font-medium text-[#374151]">
                    {formatDateTime(task.task_start_date)}
                  </dd>
                </div>
                <div>
                  <dt className="inline-flex items-center gap-1 text-[#9CA3AF]">
                    <Flag className="h-3.5 w-3.5" />
                    Deadline
                  </dt>
                  <dd className="mt-0.5 font-medium text-[#374151]">
                    {formatDateTime(task.task_deadline)}
                  </dd>
                </div>
                {task.employee_completed_at ? (
                  <div>
                    <dt className="inline-flex items-center gap-1 text-[#9CA3AF]">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Completed at
                    </dt>
                    <dd className="mt-0.5 font-medium text-[#374151]">
                      {formatDateTime(task.employee_completed_at)}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>

            <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                People
              </h3>
              <dl className="space-y-3 text-[13px]">
                <div>
                  <dt className="text-[#9CA3AF]">Assignee</dt>
                  <dd className="mt-0.5 font-semibold text-[#1F2937]">
                    {task.employee_name || `User #${task.employee_id}`}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#9CA3AF]">Created by</dt>
                  <dd className="mt-0.5 font-medium text-[#374151]">
                    {task.assigned_by_name || `User #${task.assigned_by_id}`}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#9CA3AF]">Reporting manager</dt>
                  <dd className="mt-0.5 font-medium text-[#374151]">
                    {task.reporting_manager_name ||
                      `User #${task.reporting_manager_id}`}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Activity
              </h3>
              <dl className="space-y-2 text-[12px] text-[#6B7280]">
                <div className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Created {formatDateTime(task.created_at)}
                </div>
                <div className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Updated {formatDateTime(task.updated_at)}
                </div>
              </dl>
              {task.manager_remarks ? (
                <div className="mt-3 rounded-lg bg-[#F9FAFB] px-3 py-2 text-[13px] text-[#374151]">
                  <p className="mb-1 text-[11px] font-semibold uppercase text-[#9CA3AF]">
                    Manager remarks
                  </p>
                  {task.manager_remarks}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      {confirmDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-[18px] font-bold text-[#1F2937]">Delete task?</h3>
            <p className="mt-2 text-[14px] text-[#6B7280]">
              This will permanently remove &ldquo;{task.task_title}&rdquo;. This action
              cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg border border-[#E4E7EC] px-4 py-2 text-[13px] font-semibold text-[#6B7280]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-lg bg-[#D93025] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <PortalResponseModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          modalOnClose?.();
          setModalOnClose(undefined);
        }}
        variant={modalVariant}
        title={modalTitle}
        message={modalMessage}
      />
    </div>
  );
}

export default function TaskDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-[#6B7280]">
          <Loader2 className="h-9 w-9 animate-spin text-[#008CD3]" />
          <p className="text-[15px]">Loading task…</p>
        </div>
      }
    >
      <TaskDetailContent />
    </Suspense>
  );
}
