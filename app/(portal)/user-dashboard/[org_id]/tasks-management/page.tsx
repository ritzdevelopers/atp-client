"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Calendar,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  Filter,
  Flag,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import PortalPageLoader from "@/components/portal-dashboard/ui/PortalPageLoader";
import PortalResponseModal, {
  type PortalResponseVariant,
} from "@/components/portal-dashboard/ui/PortalResponseModal";
import { buildStaticDetailHref } from "@/lib/static-export";
import {
  clearMyTasksCaches,
  readMyTasksCache,
  shouldRefreshMyTasksCache,
  stableFilterKey,
  writeMyTasksCache,
} from "@/lib/employeeManagementCache";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const PRIORITIES = ["high", "medium", "low"] as const;
const TASK_STATUSES = [
  "pending",
  "received",
  "in-progress",
  "delay",
  "completed",
] as const;
const COMPLETE_STATUSES = ["pending", "approved", "rejected"] as const;
const SORT_OPTIONS = [
  { value: "created_at", label: "Created" },
  { value: "updated_at", label: "Updated" },
  { value: "task_deadline", label: "Deadline" },
  { value: "task_start_date", label: "Start date" },
  { value: "task_title", label: "Title" },
  { value: "task_priority", label: "Priority" },
  { value: "task_status", label: "Status" },
] as const;

type TaskPriority = (typeof PRIORITIES)[number];
type TaskStatus = (typeof TASK_STATUSES)[number];
type CompleteStatus = (typeof COMPLETE_STATUSES)[number];

type TaskRow = {
  task_id: number;
  employee_id: number;
  task_title: string;
  task_description?: string | null;
  task_priority: TaskPriority;
  task_status: TaskStatus;
  complete_status: CompleteStatus;
  task_start_date: string;
  task_deadline: string;
  assigned_by_name?: string;
  reporting_manager_name?: string;
  created_at?: string;
};

type TaskFilters = {
  task_status: string;
  task_priority: string;
  complete_status: string;
  start_date: string;
  end_date: string;
  sort_by: string;
  is_ascending: boolean;
  search: string;
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

const STATUS_STYLES: Record<TaskStatus, { label: string; chip: string }> = {
  pending: { label: "New", chip: "bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]" },
  received: {
    label: "Received",
    chip: "bg-[#EDE7F6] text-[#5E35B1] border-[#D1C4E9]",
  },
  "in-progress": {
    label: "In Progress",
    chip: "bg-[#E8F4FB] text-[#0070AA] border-[#C5E4F3]",
  },
  delay: { label: "Delayed", chip: "bg-[#FEF3E6] text-[#E8710A] border-[#F9DFC8]" },
  completed: {
    label: "Done",
    chip: "bg-[#E6F4EA] text-[#188038] border-[#CEEAD6]",
  },
};

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function defaultFilters(): TaskFilters {
  return {
    task_status: "",
    task_priority: "",
    complete_status: "",
    start_date: "",
    end_date: "",
    sort_by: "created_at",
    is_ascending: false,
    search: "",
  };
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function inputCls() {
  return "w-full rounded-lg border border-[#E4E7EC] bg-white px-3 py-2 text-[13px] text-[#1F2937] outline-none transition focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15";
}

function selectCls() {
  return `${inputCls()} appearance-none`;
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const style = PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.medium;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${style.chip}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${style.chip}`}
    >
      {style.label}
    </span>
  );
}

function buildApiFilterKey(filters: TaskFilters): string {
  return stableFilterKey({
    task_status: filters.task_status,
    task_priority: filters.task_priority,
    complete_status: filters.complete_status,
    start_date: filters.start_date,
    end_date: filters.end_date,
    sort_by: filters.sort_by,
    is_ascending: filters.is_ascending,
  });
}

export default function MyTasksPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = String(params?.org_id ?? "");

  const [filters, setFilters] = useState<TaskFilters>(defaultFilters);
  const [showFilters, setShowFilters] = useState(true);

  const apiFilterKey = useMemo(() => buildApiFilterKey(filters), [filters]);
  const cachedTasks = orgId ? readMyTasksCache<TaskRow>(orgId, apiFilterKey) : null;

  const [tasks, setTasks] = useState<TaskRow[]>(() => cachedTasks ?? []);
  const [loading, setLoading] = useState(() => !cachedTasks);
  const [refreshing, setRefreshing] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalVariant, setModalVariant] = useState<PortalResponseVariant>("error");
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");

  const showModal = useCallback(
    (variant: PortalResponseVariant, title: string, message: string) => {
      setModalVariant(variant);
      setModalTitle(title);
      setModalMessage(message);
      setModalOpen(true);
    },
    [],
  );

  const buildQueryString = useCallback(() => {
    const qs = new URLSearchParams();
    qs.set("org_id", orgId);
    if (filters.task_status) qs.set("task_status", filters.task_status);
    if (filters.task_priority) qs.set("task_priority", filters.task_priority);
    if (filters.complete_status) qs.set("complete_status", filters.complete_status);
    if (filters.start_date) qs.set("start_date", filters.start_date);
    if (filters.end_date) qs.set("end_date", filters.end_date);
    qs.set("sort_by", filters.sort_by);
    qs.set("is_ascending", filters.is_ascending ? "ASC" : "DESC");
    return qs.toString();
  }, [orgId, filters]);

  const fetchTasks = useCallback(
    async (force = false) => {
      if (!orgId) return;

      const filterKey = buildApiFilterKey(filters);
      const cached = readMyTasksCache<TaskRow>(orgId, filterKey);

      if (cached && !force) {
        setTasks(cached);
        setLoading(false);
        if (!shouldRefreshMyTasksCache(orgId, filterKey)) {
          return;
        }
        setRefreshing(true);
      } else {
        if (force) {
          clearMyTasksCaches(orgId);
        }
        if (force) setRefreshing(true);
        else setLoading(true);
      }

      try {
        const res = await fetch(
          `${API_URL}/api/task-management/get-my-tasks?${buildQueryString()}`,
          { method: "GET", headers: authHeaders() },
        );
        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.message || "Failed to load your tasks");
        }
        const rows = Array.isArray(result.data) ? result.data : [];
        setTasks(rows);
        writeMyTasksCache(orgId, filterKey, rows);
      } catch (err) {
        if (!cached || force) {
          setTasks([]);
        }
        showModal(
          "error",
          "Could not load tasks",
          err instanceof Error ? err.message : "Unknown error",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orgId, buildQueryString, filters, showModal],
  );

  useEffect(() => {
    void fetchTasks(false);
  }, [fetchTasks]);

  const filteredTasks = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((t) => {
      const haystack = [
        t.task_title,
        t.assigned_by_name,
        t.reporting_manager_name,
        String(t.task_id),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [tasks, filters.search]);

  const openTask = (task: TaskRow) => {
    router.push(
      buildStaticDetailHref(`/user-dashboard/${orgId}/tasks-management`, {
        task_id: task.task_id,
      }),
    );
  };

  if (loading && tasks.length === 0) {
    return <PortalPageLoader message="Loading your tasks…" />;
  }

  return (
    <div className="min-h-full bg-[#F5F7FA]">
      <div className="mx-auto max-w-[1200px] px-4 py-5 sm:px-6 lg:py-8">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#008CD3]">
              Tasks
            </p>
            <h1 className="mt-1 text-[22px] font-bold text-[#1F2937] sm:text-[26px]">
              My tasks
            </h1>
            <p className="mt-1 text-[14px] text-[#6B7280]">
              Work assigned to you — open an issue to view details and update progress.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void fetchTasks(true)}
            disabled={loading || refreshing}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-[#E4E7EC] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#1F2937] shadow-sm transition hover:bg-[#F9FAFB] disabled:opacity-60"
          >
            {loading || refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#008CD3]" />
            ) : (
              <RefreshCw className="h-4 w-4 text-[#008CD3]" />
            )}
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="mb-4 rounded-xl border border-[#E4E7EC] bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#1F2937]">
              <Filter className="h-4 w-4 text-[#008CD3]" />
              Filters &amp; sort
            </span>
            <span className="text-[12px] text-[#6B7280]">
              {showFilters ? "Hide" : "Show"}
            </span>
          </button>

          {showFilters ? (
            <div className="border-t border-[#E4E7EC] px-4 pb-4 pt-3">
              <div className="mb-3">
                <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                  Search
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, search: e.target.value }))
                    }
                    placeholder="Search by title or ID…"
                    className={`${inputCls()} pl-9`}
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase text-[#6B7280]">
                    Status
                  </label>
                  <select
                    value={filters.task_status}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, task_status: e.target.value }))
                    }
                    className={selectCls()}
                  >
                    <option value="">All</option>
                    {TASK_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_STYLES[s].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase text-[#6B7280]">
                    Priority
                  </label>
                  <select
                    value={filters.task_priority}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, task_priority: e.target.value }))
                    }
                    className={selectCls()}
                  >
                    <option value="">All</option>
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {PRIORITY_STYLES[p].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase text-[#6B7280]">
                    Sort
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={filters.sort_by}
                      onChange={(e) =>
                        setFilters((f) => ({ ...f, sort_by: e.target.value }))
                      }
                      className={selectCls()}
                    >
                      {SORT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        setFilters((f) => ({ ...f, is_ascending: !f.is_ascending }))
                      }
                      className="inline-flex shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] px-3 text-[#008CD3]"
                    >
                      {filters.is_ascending ? (
                        <ArrowUpAZ className="h-4 w-4" />
                      ) : (
                        <ArrowDownAZ className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase text-[#6B7280]">
                    Deadline until
                  </label>
                  <input
                    type="date"
                    value={filters.end_date}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, end_date: e.target.value }))
                    }
                    className={inputCls()}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <p className="mb-3 text-[13px] text-[#6B7280]">
          {loading || refreshing
            ? "Loading…"
            : `${filteredTasks.length} issue${filteredTasks.length === 1 ? "" : "s"}`}
        </p>

        {loading && tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[#E4E7EC] bg-white py-20">
            <Loader2 className="h-9 w-9 animate-spin text-[#008CD3]" />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="rounded-xl border border-[#E4E7EC] bg-white px-6 py-16 text-center">
            <ClipboardList className="mx-auto mb-3 h-10 w-10 text-[#9CA3AF]" />
            <p className="text-[15px] font-semibold text-[#1F2937]">No tasks assigned</p>
            <p className="mt-1 text-[13px] text-[#6B7280]">
              When your manager assigns work, it will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => (
              <article
                key={task.task_id}
                className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm transition hover:border-[#C5E4F3] sm:p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-[#9CA3AF]">
                      TASK-{task.task_id}
                    </p>
                    <h2 className="mt-0.5 text-[16px] font-semibold text-[#1F2937] sm:text-[18px]">
                      {task.task_title}
                    </h2>
                    {task.task_description ? (
                      <p className="mt-2 line-clamp-2 text-[13px] text-[#6B7280]">
                        {task.task_description}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <StatusBadge status={task.task_status} />
                      <PriorityBadge priority={task.task_priority} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#6B7280]">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Due {formatDate(task.task_deadline)}
                      </span>
                      {task.assigned_by_name ? (
                        <span>From {task.assigned_by_name}</span>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openTask(task)}
                    className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-lg bg-[#008CD3] px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#0070AA] active:scale-[0.98]"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View full task
                    <ChevronRight className="h-4 w-4 opacity-80" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <PortalResponseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        variant={modalVariant}
        title={modalTitle}
        message={modalMessage}
      />
    </div>
  );
}
