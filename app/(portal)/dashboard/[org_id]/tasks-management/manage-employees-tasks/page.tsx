"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Calendar,
  ChevronRight,
  ClipboardList,
  Filter,
  Flag,
  Loader2,
  RefreshCw,
  Search,
  User,
  UserCheck,
  Users,
} from "lucide-react";
import PortalPageLoader from "@/components/portal-dashboard/ui/PortalPageLoader";
import PortalResponseModal, {
  type PortalResponseVariant,
} from "@/components/portal-dashboard/ui/PortalResponseModal";
import { getAllOrgUsers, type OrgUserRow } from "@/services/adminUser";
import { buildStaticDetailHref } from "@/lib/static-export";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const THEME = {
  bg: "#F5F7FA",
  border: "#E4E7EC",
  blue: "#008CD3",
  blueSoft: "#E8F4FB",
  text: "#1F2937",
  muted: "#6B7280",
};

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
type TaskTab = "all" | "created_by_me" | "reporting_manager" | "by_employee";

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
  employee_completed_at?: string | null;
  assigned_by_id: number;
  reporting_manager_id: number;
  employee_name?: string;
  assigned_by_name?: string;
  reporting_manager_name?: string;
  created_at?: string;
  updated_at?: string;
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
  pending: { label: "To Do", chip: "bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]" },
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

const REVIEW_STYLES: Record<CompleteStatus, { label: string; chip: string }> = {
  pending: { label: "Review pending", chip: "bg-[#F3F4F6] text-[#6B7280]" },
  approved: { label: "Approved", chip: "bg-[#E6F4EA] text-[#188038]" },
  rejected: { label: "Rejected", chip: "bg-[#FCE8E6] text-[#D93025]" },
};

const TAB_CONFIG: { id: TaskTab; label: string; icon: typeof ClipboardList }[] = [
  { id: "all", label: "All tasks", icon: ClipboardList },
  { id: "created_by_me", label: "Created by me", icon: User },
  { id: "reporting_manager", label: "Reporting manager", icon: UserCheck },
  { id: "by_employee", label: "By employee", icon: Users },
];

const ENDPOINTS: Record<Exclude<TaskTab, "by_employee">, string> = {
  all: "/get-all-employees-tasks",
  created_by_me: "/get-all-tasks-created-by-me",
  reporting_manager: "/get-all-tasks-assigned-to-me-as-reporting-manager",
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

function employeeLabel(row: OrgUserRow) {
  const name = row.user_name?.trim() || "Unnamed";
  const email = row.user_email?.trim();
  return email ? `${name} · ${email}` : name;
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

function ReviewBadge({ status }: { status: CompleteStatus }) {
  const style = REVIEW_STYLES[status] ?? REVIEW_STYLES.pending;
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${style.chip}`}
    >
      {style.label}
    </span>
  );
}

export default function ManageEmployeesTasksPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = String(params?.org_id ?? "");

  const [activeTab, setActiveTab] = useState<TaskTab>("all");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [filters, setFilters] = useState<TaskFilters>(defaultFilters);
  const [showFilters, setShowFilters] = useState(true);

  const [employees, setEmployees] = useState<OrgUserRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);

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

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setLoadingEmployees(true);
    getAllOrgUsers(token)
      .then(setEmployees)
      .catch((err: Error) =>
        showModal("error", "Failed to load employees", err.message),
      )
      .finally(() => setLoadingEmployees(false));
  }, [showModal]);

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
    if (activeTab === "by_employee" && selectedEmployeeId) {
      qs.set("employee_id", selectedEmployeeId);
    }
    return qs.toString();
  }, [orgId, filters, activeTab, selectedEmployeeId]);

  const fetchTasks = useCallback(async () => {
    if (!orgId) return;
    if (activeTab === "by_employee" && !selectedEmployeeId) {
      setTasks([]);
      return;
    }

    let path: string;
    if (activeTab === "by_employee") {
      path = "/get-single-employee-tasks";
    } else {
      path = ENDPOINTS[activeTab];
    }

    setLoadingTasks(true);
    try {
      const res = await fetch(
        `${API_URL}/api/task-management${path}?${buildQueryString()}`,
        { method: "GET", headers: authHeaders() },
      );
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || "Failed to load tasks");
      }
      setTasks(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      setTasks([]);
      showModal(
        "error",
        "Could not load tasks",
        err instanceof Error ? err.message : "Unknown error",
      );
    } finally {
      setLoadingTasks(false);
    }
  }, [orgId, activeTab, selectedEmployeeId, buildQueryString, showModal]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const filteredTasks = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((t) => {
      const haystack = [
        t.task_title,
        t.employee_name,
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
      buildStaticDetailHref(
        `/dashboard/${orgId}/tasks-management/manage-employees-tasks`,
        { task_id: task.task_id, employee_id: task.employee_id },
      ),
    );
  };

  if (loadingEmployees) {
    return <PortalPageLoader message="Loading task management…" />;
  }

  return (
    <div className="min-h-full" style={{ backgroundColor: THEME.bg }}>
      <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 lg:py-8">
        {/* Header */}
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-[12px] font-medium uppercase tracking-wide text-[#6B7280]">
              <ClipboardList className="h-3.5 w-3.5" />
              Task Management
            </div>
            <h1 className="text-[22px] font-bold text-[#1F2937] sm:text-[26px]">
              Manage employees tasks
            </h1>
            <p className="mt-1 text-[14px] text-[#6B7280]">
              Browse, filter, and open tasks across your organization — Jira-style board view.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fetchTasks()}
            disabled={loadingTasks}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-[#E4E7EC] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#1F2937] shadow-sm transition hover:bg-[#F9FAFB] disabled:opacity-60"
          >
            {loadingTasks ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#008CD3]" />
            ) : (
              <RefreshCw className="h-4 w-4 text-[#008CD3]" />
            )}
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-4 overflow-x-auto rounded-xl border border-[#E4E7EC] bg-white p-1 shadow-sm">
          <div className="flex min-w-max gap-1">
            {TAB_CONFIG.map(({ id, label, icon: Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition sm:px-4 ${
                    active
                      ? "bg-[#008CD3] text-white shadow-sm"
                      : "text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#1F2937]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Employee picker for By employee tab */}
        {activeTab === "by_employee" ? (
          <div className="mb-4 rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
            <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
              Target employee
            </label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className={selectCls()}
            >
              <option value="">Select an employee to view their tasks</option>
              {employees.map((emp) => (
                <option key={String(emp.id)} value={String(emp.id)}>
                  {employeeLabel(emp)}
                </option>
              ))}
            </select>
          </div>
        ) : null}

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
                  Quick search
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, search: e.target.value }))
                    }
                    placeholder="Search by title, assignee, or ID…"
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
                    <option value="">All statuses</option>
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
                    <option value="">All priorities</option>
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {PRIORITY_STYLES[p].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase text-[#6B7280]">
                    Review
                  </label>
                  <select
                    value={filters.complete_status}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, complete_status: e.target.value }))
                    }
                    className={selectCls()}
                  >
                    <option value="">All reviews</option>
                    {COMPLETE_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {REVIEW_STYLES[s].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase text-[#6B7280]">
                    Sort by
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
                      title={filters.is_ascending ? "Ascending" : "Descending"}
                      onClick={() =>
                        setFilters((f) => ({ ...f, is_ascending: !f.is_ascending }))
                      }
                      className="inline-flex shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] px-3 text-[#008CD3] transition hover:bg-white"
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
                    Start from
                  </label>
                  <input
                    type="date"
                    value={filters.start_date}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, start_date: e.target.value }))
                    }
                    className={inputCls()}
                  />
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

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFilters(defaultFilters())}
                  className="rounded-lg border border-[#E4E7EC] px-3 py-1.5 text-[12px] font-semibold text-[#6B7280] transition hover:bg-[#F9FAFB]"
                >
                  Clear filters
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Results summary */}
        <div className="mb-3 flex items-center justify-between text-[13px] text-[#6B7280]">
          <span>
            {loadingTasks
              ? "Loading…"
              : `${filteredTasks.length} task${filteredTasks.length === 1 ? "" : "s"}`}
          </span>
        </div>

        {/* Task list */}
        {activeTab === "by_employee" && !selectedEmployeeId ? (
          <div className="rounded-xl border border-dashed border-[#C5E4F3] bg-[#E8F4FB]/40 px-6 py-16 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-[#008CD3]" />
            <p className="text-[15px] font-semibold text-[#1F2937]">
              Select an employee
            </p>
            <p className="mt-1 text-[13px] text-[#6B7280]">
              Choose a team member above to load their assigned tasks.
            </p>
          </div>
        ) : loadingTasks ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[#E4E7EC] bg-white py-20">
            <Loader2 className="h-9 w-9 animate-spin text-[#008CD3]" />
            <p className="text-[14px] text-[#6B7280]">Loading tasks…</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="rounded-xl border border-[#E4E7EC] bg-white px-6 py-16 text-center">
            <ClipboardList className="mx-auto mb-3 h-10 w-10 text-[#9CA3AF]" />
            <p className="text-[15px] font-semibold text-[#1F2937]">No tasks found</p>
            <p className="mt-1 text-[13px] text-[#6B7280]">
              Try adjusting filters or switch to another tab.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-xl border border-[#E4E7EC] bg-white shadow-sm md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-[#E4E7EC] bg-[#F9FAFB] text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
                      <th className="px-4 py-3">Task</th>
                      <th className="px-4 py-3">Assignee</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Priority</th>
                      <th className="px-4 py-3">Deadline</th>
                      <th className="px-4 py-3">Review</th>
                      <th className="px-4 py-3 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.map((task) => (
                      <tr
                        key={task.task_id}
                        onClick={() => openTask(task)}
                        className="cursor-pointer border-b border-[#F3F4F6] transition hover:bg-[#F9FAFB] last:border-0"
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-[#1F2937]">
                            {task.task_title}
                          </div>
                          <div className="mt-0.5 text-[11px] text-[#9CA3AF]">
                            TASK-{task.task_id}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#4B5563]">
                          {task.employee_name || `User #${task.employee_id}`}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={task.task_status} />
                        </td>
                        <td className="px-4 py-3">
                          <PriorityBadge priority={task.task_priority} />
                        </td>
                        <td className="px-4 py-3 text-[#4B5563]">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-[#9CA3AF]" />
                            {formatDate(task.task_deadline)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <ReviewBadge status={task.complete_status} />
                        </td>
                        <td className="px-4 py-3">
                          <ChevronRight className="h-4 w-4 text-[#9CA3AF]" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {filteredTasks.map((task) => (
                <button
                  key={task.task_id}
                  type="button"
                  onClick={() => openTask(task)}
                  className="w-full rounded-xl border border-[#E4E7EC] bg-white p-4 text-left shadow-sm transition active:scale-[0.99]"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-medium text-[#9CA3AF]">
                        TASK-{task.task_id}
                      </p>
                      <p className="text-[15px] font-semibold text-[#1F2937]">
                        {task.task_title}
                      </p>
                    </div>
                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[#9CA3AF]" />
                  </div>
                  <p className="mb-3 text-[13px] text-[#6B7280]">
                    {task.employee_name || `User #${task.employee_id}`}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={task.task_status} />
                    <PriorityBadge priority={task.task_priority} />
                    <ReviewBadge status={task.complete_status} />
                  </div>
                  <p className="mt-3 inline-flex items-center gap-1 text-[12px] text-[#6B7280]">
                    <Flag className="h-3.5 w-3.5" />
                    Due {formatDate(task.task_deadline)}
                  </p>
                </button>
              ))}
            </div>
          </>
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
