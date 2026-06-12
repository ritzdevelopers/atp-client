"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Flag,
  Loader2,
  MessageSquare,
  PlayCircle,
} from "lucide-react";
import PortalPageLoader from "@/components/portal-dashboard/ui/PortalPageLoader";
import PortalResponseModal, {
  type PortalResponseVariant,
} from "@/components/portal-dashboard/ui/PortalResponseModal";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type TaskDetail = {
  task_id: number;
  employee_id: number;
  task_title: string;
  task_description?: string | null;
  task_priority: string;
  task_status: string;
  complete_status: string;
  task_start_date: string;
  task_deadline: string;
  employee_completed_at?: string | null;
  manager_remarks?: string | null;
  assigned_by_name?: string;
  reporting_manager_name?: string;
  created_at?: string;
  updated_at?: string;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "New",
  received: "Received",
  "in-progress": "In Progress",
  delay: "Delayed",
  completed: "Done",
};

const REVIEW_LABELS: Record<string, string> = {
  pending: "Awaiting review",
  approved: "Approved",
  rejected: "Rejected",
};

const REVIEW_CHIP: Record<string, string> = {
  pending: "bg-[#FEF3E6] text-[#E8710A] border-[#F9DFC8]",
  approved: "bg-[#E6F4EA] text-[#188038] border-[#CEEAD6]",
  rejected: "bg-[#FCE8E6] text-[#D93025] border-[#F5C6C1]",
};

const STATUS_CHIP: Record<string, string> = {
  pending: "bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]",
  received: "bg-[#EDE7F6] text-[#5E35B1] border-[#D1C4E9]",
  "in-progress": "bg-[#E8F4FB] text-[#0070AA] border-[#C5E4F3]",
  delay: "bg-[#FEF3E6] text-[#E8710A] border-[#F9DFC8]",
  completed: "bg-[#E6F4EA] text-[#188038] border-[#CEEAD6]",
};

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
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

function MyTaskDetailContent() {
  const params = useParams();
  const router = useRouter();
  const orgId = String(params?.org_id ?? "");
  const taskId = String(params?.task_id ?? "");

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showManagerResponse, setShowManagerResponse] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalVariant, setModalVariant] = useState<PortalResponseVariant>("info");
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalOnClose, setModalOnClose] = useState<(() => void) | undefined>();

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

  const updateTaskStatus = useCallback(
    async (nextStatus: string, silent = false) => {
      setUpdatingStatus(true);
      try {
        const res = await fetch(
          `${API_URL}/api/task-management/update-task-status?org_id=${encodeURIComponent(orgId)}`,
          {
            method: "PATCH",
            headers: authHeaders(),
            body: JSON.stringify({
              task_id: Number(taskId),
              task_status: nextStatus,
            }),
          },
        );
        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.message || "Failed to update status");
        }
        if (!silent && result.message) {
          showModal(
            result.data?.unchanged ? "info" : "success",
            result.data?.unchanged ? "No change" : "Status updated",
            result.message,
          );
        }
        return result.data as { task_status?: string; unchanged?: boolean };
      } catch (err) {
        if (!silent) {
          showModal(
            "error",
            "Update failed",
            err instanceof Error ? err.message : "Could not update status",
          );
        }
        return null;
      } finally {
        setUpdatingStatus(false);
      }
    },
    [orgId, taskId, showModal],
  );

  const loadTask = useCallback(async () => {
    const userId =
      typeof window !== "undefined" ? localStorage.getItem("user_id") ?? "" : "";
    if (!orgId || !taskId || !userId) {
      setLoading(false);
      return null;
    }
    setLoading(true);

    try {
      const qs = new URLSearchParams({
        org_id: orgId,
        employee_id: userId,
      });
      const res = await fetch(
        `${API_URL}/api/task-management/get-my-task-information/${taskId}?${qs}`,
        { method: "GET", headers: authHeaders() },
      );
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || "Failed to load task");
      }
      const data = result.data as TaskDetail;
      setTask(data);
      return data;
    } catch (err) {
      showModal(
        "error",
        "Could not load task",
        err instanceof Error ? err.message : "Unknown error",
        () => router.push(`/user-dashboard/${orgId}/tasks-management`),
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, [orgId, taskId, showModal, router]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const data = await loadTask();
      if (cancelled || !data || data.task_status !== "pending") return;

      const ack = await updateTaskStatus("received", true);
      if (cancelled || !ack || ack.unchanged) return;

      if (ack.task_status) {
        setTask((prev) =>
          prev ? { ...prev, task_status: ack.task_status! } : prev,
        );
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [loadTask, updateTaskStatus]);

  const awaitingManagerReview =
    task?.task_status === "completed" && task?.complete_status === "pending";

  const hasManagerResponse =
    task &&
    (task.complete_status === "approved" ||
      task.complete_status === "rejected" ||
      Boolean(task.manager_remarks?.trim()));

  const canUpdateStatus =
    task &&
    task.task_status !== "completed" &&
    (task.complete_status === "pending" || task.complete_status === "rejected");

  const handleStatusClick = async (status: "in-progress" | "completed") => {
    const result = await updateTaskStatus(status);
    if (result?.task_status) {
      setTask((prev) =>
        prev
          ? {
              ...prev,
              task_status: result.task_status!,
              employee_completed_at:
                result.task_status === "completed"
                  ? new Date().toISOString()
                  : prev.employee_completed_at,
            }
          : prev,
      );
    }
  };

  if (loading) {
    return <PortalPageLoader message="Loading task…" />;
  }

  if (!task) {
    return (
      <div className="p-6 text-center text-sm text-[#6B7280]">
        Task not found or you do not have access.
      </div>
    );
  }

  const statusChip = STATUS_CHIP[task.task_status] ?? STATUS_CHIP.pending;

  return (
    <div className="min-h-full bg-[#F5F7FA]">
      <div className="mx-auto max-w-[1000px] px-4 py-5 sm:px-6 lg:py-8">
        <button
          type="button"
          onClick={() => router.push(`/user-dashboard/${orgId}/tasks-management`)}
          className="mb-5 inline-flex items-center gap-2 text-[13px] font-semibold text-[#008CD3] hover:text-[#0070AA]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to my tasks
        </button>

        <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
          <div className="rounded-xl border border-[#E4E7EC] bg-white shadow-sm">
            <div className="border-b border-[#E4E7EC] px-5 py-4 sm:px-6">
              <p className="text-[12px] font-medium text-[#9CA3AF]">TASK-{task.task_id}</p>
              <h1 className="mt-1 text-[22px] font-bold text-[#1F2937] sm:text-[26px]">
                {task.task_title}
              </h1>
              <div className="mt-3">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[12px] font-semibold ${statusChip}`}
                >
                  {STATUS_LABELS[task.task_status] ?? task.task_status}
                </span>
              </div>
            </div>

            <div className="px-5 py-5 sm:px-6">
              <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Description
              </h2>
              <div className="rounded-lg border border-[#F3F4F6] bg-[#F9FAFB] px-4 py-3 text-[14px] leading-relaxed text-[#374151]">
                {task.task_description?.trim() ? (
                  task.task_description
                ) : (
                  <span className="text-[#9CA3AF]">No description provided.</span>
                )}
              </div>

              {awaitingManagerReview ? (
                <div className="mt-6 rounded-xl border border-[#F9DFC8] bg-[#FEF3E6]/60 px-4 py-4">
                  <p className="text-[14px] font-semibold text-[#E8710A]">
                    Awaiting manager review
                  </p>
                  <p className="mt-1 text-[13px] text-[#6B7280]">
                    You marked this task complete. Your manager or task creator will
                    approve or reject the submission.
                  </p>
                </div>
              ) : null}

              {hasManagerResponse ? (
                <div className="mt-6 border-t border-[#E4E7EC] pt-6">
                  <button
                    type="button"
                    onClick={() => setShowManagerResponse((v) => !v)}
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-[#E4E7EC] bg-white px-4 py-2.5 text-[14px] font-semibold text-[#1F2937] shadow-sm transition hover:bg-[#F9FAFB] sm:w-auto"
                  >
                    <MessageSquare className="h-4 w-4 text-[#008CD3]" />
                    {showManagerResponse ? "Hide manager response" : "View manager response"}
                  </button>
                  {showManagerResponse ? (
                    <div className="mt-4 rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] p-4">
                      <div className="mb-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[12px] font-semibold ${
                            REVIEW_CHIP[task.complete_status] ?? REVIEW_CHIP.pending
                          }`}
                        >
                          {REVIEW_LABELS[task.complete_status] ?? task.complete_status}
                        </span>
                      </div>
                      {task.manager_remarks?.trim() ? (
                        <p className="text-[14px] leading-relaxed text-[#374151]">
                          {task.manager_remarks}
                        </p>
                      ) : (
                        <p className="text-[14px] text-[#9CA3AF]">
                          No remarks were provided.
                        </p>
                      )}
                      {task.complete_status === "rejected" ? (
                        <p className="mt-3 text-[13px] font-medium text-[#D93025]">
                          This task was sent back to you. Update progress and mark it
                          complete again when ready.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {canUpdateStatus ? (
                <div className="mt-6 border-t border-[#E4E7EC] pt-6">
                  <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                    Update progress
                  </h2>
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <button
                      type="button"
                      disabled={updatingStatus || task.task_status === "completed"}
                      onClick={() => handleStatusClick("in-progress")}
                      className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg border border-[#C5E4F3] bg-[#E8F4FB] px-4 py-2.5 text-[14px] font-semibold text-[#0070AA] transition hover:bg-[#D6EDFA] disabled:opacity-50 sm:flex-none sm:min-w-[160px]"
                    >
                      {updatingStatus ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <PlayCircle className="h-4 w-4" />
                      )}
                      In progress
                    </button>
                    <button
                      type="button"
                      disabled={updatingStatus || task.task_status === "completed"}
                      onClick={() => handleStatusClick("completed")}
                      className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-[#0F9D58] px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm transition hover:bg-[#0B8043] disabled:opacity-50 sm:flex-none sm:min-w-[160px]"
                    >
                      {updatingStatus ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Mark completed
                    </button>
                  </div>
                  <p className="mt-3 text-[12px] text-[#6B7280]">
                    Opening a new task marks it as received automatically. Use the
                    buttons above to start work or mark it done.
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Details
              </h3>
              <dl className="space-y-3 text-[13px]">
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
                      Completed
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
                  <dt className="text-[#9CA3AF]">Assigned by</dt>
                  <dd className="mt-0.5 font-semibold text-[#1F2937]">
                    {task.assigned_by_name || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#9CA3AF]">Reporting manager</dt>
                  <dd className="mt-0.5 font-medium text-[#374151]">
                    {task.reporting_manager_name || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#9CA3AF]">Review</dt>
                  <dd className="mt-1">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                        REVIEW_CHIP[task.complete_status] ?? REVIEW_CHIP.pending
                      }`}
                    >
                      {REVIEW_LABELS[task.complete_status] ?? task.complete_status}
                    </span>
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
          </aside>
        </div>
      </div>

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

export default function MyTaskDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-[#6B7280]">
          <Loader2 className="h-9 w-9 animate-spin text-[#008CD3]" />
          <p className="text-[15px]">Loading task…</p>
        </div>
      }
    >
      <MyTaskDetailContent />
    </Suspense>
  );
}
