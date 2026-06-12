"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  ClipboardList,
  Flag,
  Layers,
  Loader2,
  Plus,
  Trash2,
  User,
  Users,
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

type AssignMode = "single" | "bulk";

type TaskDraft = {
  key: string;
  employee_id: string;
  assignViaTeam: boolean;
  team_id: string;
  reporting_manager: string;
  task_title: string;
  task_description: string;
  task_priority: TaskPriority;
  task_start_date: string;
  task_deadline: string;
};

const THEME = {
  bg: "#F5F7FA",
  border: "#E4E7EC",
  blue: "#008CD3",
  blueSoft: "#E8F4FB",
  text: "#1F2937",
  muted: "#6B7280",
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

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function newTaskKey() {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyTaskDraft(): TaskDraft {
  return {
    key: newTaskKey(),
    employee_id: "",
    assignViaTeam: false,
    team_id: "",
    reporting_manager: "",
    task_title: "",
    task_description: "",
    task_priority: "medium",
    task_start_date: "",
    task_deadline: "",
  };
}

function isActiveEmployee(row: OrgUserRow) {
  const active = row.is_active;
  if (active === undefined || active === null) return true;
  if (typeof active === "boolean") return active;
  return Number(active) === 1;
}

function employeeId(row: OrgUserRow) {
  return String(row.id ?? "");
}

function employeeLabel(row: OrgUserRow) {
  const name = row.user_name?.trim() || "Unnamed";
  const email = row.user_email?.trim();
  return email ? `${name} · ${email}` : name;
}

function fieldLabelCls() {
  return "mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]";
}

function inputCls() {
  return "w-full rounded-lg border border-[#E4E7EC] bg-white px-3 py-2.5 text-[14px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15";
}

function selectCls() {
  return `${inputCls()} appearance-none`;
}

function sectionCardCls() {
  return "rounded-xl border border-[#E4E7EC] bg-white shadow-sm";
}

function buildTaskPayload(draft: TaskDraft) {
  const payload: Record<string, unknown> = {
    employee_id: Number(draft.employee_id),
    task_title: draft.task_title.trim(),
    task_description: draft.task_description.trim() || null,
    task_start_date: draft.task_start_date,
    task_deadline: draft.task_deadline,
    task_priority: draft.task_priority,
  };

  if (draft.assignViaTeam && draft.team_id) {
    payload.team_id = Number(draft.team_id);
    payload.reporting_manager = Number(draft.reporting_manager);
  }

  return payload;
}

function validateTaskDraft(draft: TaskDraft, index?: number): string | null {
  const prefix = index !== undefined ? `Task #${index + 1}: ` : "";
  if (!draft.employee_id) return `${prefix}Select an employee.`;
  if (!draft.task_title.trim()) return `${prefix}Task title is required.`;
  if (!draft.task_start_date) return `${prefix}Start date is required.`;
  if (!draft.task_deadline) return `${prefix}Deadline is required.`;
  if (new Date(draft.task_deadline) < new Date(draft.task_start_date)) {
    return `${prefix}Deadline cannot be before start date.`;
  }
  if (draft.assignViaTeam) {
    if (!draft.team_id) return `${prefix}Select a team.`;
    if (!draft.reporting_manager) {
      return `${prefix}Reporting manager is required for team tasks.`;
    }
  }
  return null;
}

type PriorityPickerProps = {
  value: TaskPriority;
  onChange: (value: TaskPriority) => void;
  compact?: boolean;
};

function PriorityPicker({ value, onChange, compact }: PriorityPickerProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${compact ? "" : "mt-1"}`}>
      {PRIORITIES.map((priority) => {
        const active = value === priority;
        const style = PRIORITY_STYLES[priority];
        return (
          <button
            key={priority}
            type="button"
            onClick={() => onChange(priority)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition ${
              active
                ? style.chip
                : "border-[#E4E7EC] bg-[#F9FAFB] text-[#6B7280] hover:border-[#C5E4F3] hover:bg-white"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${style.dot}`} />
            {style.label}
          </button>
        );
      })}
    </div>
  );
}

type TaskFormFieldsProps = {
  draft: TaskDraft;
  employees: OrgUserRow[];
  teams: OrgTeamRow[];
  onChange: (patch: Partial<TaskDraft>) => void;
  showRemove?: boolean;
  onRemove?: () => void;
  index?: number;
};

function TaskFormFields({
  draft,
  employees,
  teams,
  onChange,
  showRemove,
  onRemove,
  index,
}: TaskFormFieldsProps) {
  const selectedTeam = useMemo(
    () => teams.find((t) => String(t.team_id) === draft.team_id),
    [teams, draft.team_id],
  );

  const employeeOptions = useMemo(() => {
    if (!draft.assignViaTeam || !selectedTeam) return employees;
    const memberIds = new Set(
      selectedTeam.members.map((m) => String(m.user_id)),
    );
    return employees.filter((e) => memberIds.has(employeeId(e)));
  }, [draft.assignViaTeam, selectedTeam, employees]);

  useEffect(() => {
    if (draft.assignViaTeam && selectedTeam) {
      const managerId = String(selectedTeam.admin_id ?? "");
      if (managerId && draft.reporting_manager !== managerId) {
        onChange({ reporting_manager: managerId });
      }
    }
  }, [draft.assignViaTeam, draft.reporting_manager, selectedTeam, onChange]);

  useEffect(() => {
    if (
      draft.employee_id &&
      !employeeOptions.some((e) => employeeId(e) === draft.employee_id)
    ) {
      onChange({ employee_id: "" });
    }
  }, [draft.employee_id, employeeOptions, onChange]);

  return (
    <div className="space-y-4">
      {index !== undefined ? (
        <div className="flex items-center justify-between gap-3 border-b border-[#E4E7EC] pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#E8F4FB] text-[12px] font-bold text-[#008CD3]">
              {index + 1}
            </span>
            <p className="text-[14px] font-semibold text-[#1F2937]">
              Issue {index + 1}
            </p>
          </div>
          {showRemove ? (
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex items-center gap-1 rounded-lg border border-[#F5C6C1] bg-[#FCE8E6] px-2.5 py-1.5 text-[12px] font-semibold text-[#D93025] transition hover:bg-[#FAD4D0]"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={fieldLabelCls()}>Assignment type</label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                onChange({
                  assignViaTeam: false,
                  team_id: "",
                  reporting_manager: "",
                })
              }
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-medium transition ${
                !draft.assignViaTeam
                  ? "border-[#008CD3] bg-[#E8F4FB] text-[#0070AA]"
                  : "border-[#E4E7EC] bg-white text-[#6B7280] hover:bg-[#F9FAFB]"
              }`}
            >
              <User className="h-4 w-4" />
              Direct assign
            </button>
            <button
              type="button"
              onClick={() => onChange({ assignViaTeam: true })}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-medium transition ${
                draft.assignViaTeam
                  ? "border-[#008CD3] bg-[#E8F4FB] text-[#0070AA]"
                  : "border-[#E4E7EC] bg-white text-[#6B7280] hover:bg-[#F9FAFB]"
              }`}
            >
              <Users className="h-4 w-4" />
              Team assign
            </button>
          </div>
        </div>

        {draft.assignViaTeam ? (
          <div className="sm:col-span-2">
            <label className={fieldLabelCls()} htmlFor={`team-${draft.key}`}>
              Team
            </label>
            <select
              id={`team-${draft.key}`}
              value={draft.team_id}
              onChange={(e) =>
                onChange({
                  team_id: e.target.value,
                  employee_id: "",
                  reporting_manager: "",
                })
              }
              className={selectCls()}
            >
              <option value="">Select team</option>
              {teams.map((team) => (
                <option key={team.team_id} value={String(team.team_id)}>
                  {team.team_name}
                  {team.admin_name ? ` · Lead: ${team.admin_name}` : ""}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className={draft.assignViaTeam ? "" : "sm:col-span-2"}>
          <label className={fieldLabelCls()} htmlFor={`employee-${draft.key}`}>
            Assignee
          </label>
          <select
            id={`employee-${draft.key}`}
            value={draft.employee_id}
            onChange={(e) => onChange({ employee_id: e.target.value })}
            className={selectCls()}
            disabled={draft.assignViaTeam && !draft.team_id}
          >
            <option value="">
              {draft.assignViaTeam && !draft.team_id
                ? "Select a team first"
                : "Select employee"}
            </option>
            {employeeOptions.map((emp) => (
              <option key={employeeId(emp)} value={employeeId(emp)}>
                {employeeLabel(emp)}
              </option>
            ))}
          </select>
        </div>

        {draft.assignViaTeam && selectedTeam ? (
          <div>
            <label className={fieldLabelCls()}>Reporting manager</label>
            <div className="flex min-h-[42px] items-center rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] px-3 text-[14px] text-[#1F2937]">
              {selectedTeam.admin_name || `User #${selectedTeam.admin_id}`}
            </div>
          </div>
        ) : null}

        <div className="sm:col-span-2">
          <label className={fieldLabelCls()} htmlFor={`title-${draft.key}`}>
            Task title
          </label>
          <input
            id={`title-${draft.key}`}
            type="text"
            value={draft.task_title}
            onChange={(e) => onChange({ task_title: e.target.value })}
            placeholder="e.g. Prepare monthly attendance report"
            className={inputCls()}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={fieldLabelCls()} htmlFor={`desc-${draft.key}`}>
            Description
          </label>
          <textarea
            id={`desc-${draft.key}`}
            value={draft.task_description}
            onChange={(e) => onChange({ task_description: e.target.value })}
            rows={3}
            placeholder="Add context, acceptance criteria, or links…"
            className={`${inputCls()} resize-y min-h-[88px]`}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={fieldLabelCls()}>Priority</label>
          <PriorityPicker
            value={draft.task_priority}
            onChange={(task_priority) => onChange({ task_priority })}
          />
        </div>

        <div>
          <label className={fieldLabelCls()} htmlFor={`start-${draft.key}`}>
            Start date
          </label>
          <input
            id={`start-${draft.key}`}
            type="datetime-local"
            value={draft.task_start_date}
            onChange={(e) => onChange({ task_start_date: e.target.value })}
            className={inputCls()}
          />
        </div>

        <div>
          <label className={fieldLabelCls()} htmlFor={`deadline-${draft.key}`}>
            Deadline
          </label>
          <input
            id={`deadline-${draft.key}`}
            type="datetime-local"
            value={draft.task_deadline}
            onChange={(e) => onChange({ task_deadline: e.target.value })}
            className={inputCls()}
          />
        </div>
      </div>
    </div>
  );
}

export default function AssignTaskToEmployeesPage() {
  const params = useParams();
  const orgId = String(params?.org_id ?? "");

  const [mode, setMode] = useState<AssignMode>("single");
  const [pageLoading, setPageLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [employees, setEmployees] = useState<OrgUserRow[]>([]);
  const [teams, setTeams] = useState<OrgTeamRow[]>([]);

  const [singleDraft, setSingleDraft] = useState<TaskDraft>(emptyTaskDraft);
  const [bulkDrafts, setBulkDrafts] = useState<TaskDraft[]>([emptyTaskDraft()]);

  const [responseModal, setResponseModal] = useState<{
    open: boolean;
    variant: PortalResponseVariant;
    title: string;
    message: string;
    detail?: string;
  }>({
    open: false,
    variant: "success",
    title: "",
    message: "",
  });

  const showResponse = useCallback(
    (
      variant: PortalResponseVariant,
      title: string,
      message: string,
      detail?: string,
    ) => {
      setResponseModal({ open: true, variant, title, message, detail });
    },
    [],
  );

  const closeResponseModal = useCallback(() => {
    setResponseModal((prev) => ({ ...prev, open: false }));
  }, []);

  const loadPageData = useCallback(async () => {
    setPageLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not signed in.");

      const [users, teamsData] = await Promise.all([
        getAllOrgUsers(token),
        fetchAllOrgTeams(token).catch(() => ({
          teams: [] as OrgTeamRow[],
          users_not_in_teams: [],
        })),
      ]);

      setEmployees(users.filter(isActiveEmployee));
      setTeams(teamsData.teams);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Could not load assignment data";
      showResponse("error", "Could not load data", message);
      setEmployees([]);
      setTeams([]);
    } finally {
      setPageLoading(false);
    }
  }, [showResponse]);

  useEffect(() => {
    void loadPageData();
  }, [loadPageData]);

  function resetSingleForm() {
    setSingleDraft(emptyTaskDraft());
  }

  function resetBulkForm() {
    setBulkDrafts([emptyTaskDraft()]);
  }

  function updateBulkDraft(key: string, patch: Partial<TaskDraft>) {
    setBulkDrafts((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function addBulkRow() {
    setBulkDrafts((prev) => [...prev, emptyTaskDraft()]);
  }

  function removeBulkRow(key: string) {
    setBulkDrafts((prev) => {
      if (prev.length <= 1) return [emptyTaskDraft()];
      return prev.filter((row) => row.key !== key);
    });
  }

  async function submitSingle() {
    const validationError = validateTaskDraft(singleDraft);
    if (validationError) {
      showResponse("error", "Check the form", validationError);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `${API_URL}/api/task-management/create-and-assign-task-to-employee?org_id=${encodeURIComponent(orgId)}`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(buildTaskPayload(singleDraft)),
        },
      );
      const data = (await res.json()) as {
        success?: boolean;
        message?: string;
        data?: { task_id?: number };
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.message || data.error || "Assignment failed");
      }
      showResponse(
        "success",
        "Task assigned",
        data.message || "Task created and assigned successfully.",
        data.data?.task_id
          ? `Task ID: ${data.data.task_id}`
          : undefined,
      );
      resetSingleForm();
    } catch (e) {
      showResponse(
        "error",
        "Could not assign task",
        e instanceof Error ? e.message : "Assignment failed",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function submitBulk() {
    for (let index = 0; index < bulkDrafts.length; index++) {
      const validationError = validateTaskDraft(bulkDrafts[index], index);
      if (validationError) {
        showResponse("error", "Check the form", validationError);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `${API_URL}/api/task-management/create-tasks-in-bulk?org_id=${encodeURIComponent(orgId)}`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            tasks: bulkDrafts.map(buildTaskPayload),
          }),
        },
      );
      const data = (await res.json()) as {
        success?: boolean;
        message?: string;
        data?: { created_count?: number; task_ids?: number[] };
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.message || data.error || "Bulk assignment failed");
      }
      const count = data.data?.created_count ?? bulkDrafts.length;
      showResponse(
        "success",
        "Bulk assignment complete",
        data.message || `${count} task(s) assigned successfully.`,
        data.data?.task_ids?.length
          ? `Task IDs: ${data.data.task_ids.join(", ")}`
          : undefined,
      );
      resetBulkForm();
    } catch (e) {
      showResponse(
        "error",
        "Bulk assignment failed",
        e instanceof Error ? e.message : "Could not assign tasks",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "single") void submitSingle();
    else void submitBulk();
  }

  if (pageLoading) {
    return (
      <div
        className="flex min-h-[50vh] items-center justify-center px-4"
        style={{ backgroundColor: THEME.bg }}
      >
        <PortalPageLoader message="Loading employees and teams…" />
      </div>
    );
  }

  return (
    <div
      className="min-h-full px-4 py-5 sm:px-6 lg:px-8 lg:py-8"
      style={{ backgroundColor: THEME.bg }}
    >
      {submitting ? (
        <PortalPageLoader message="Assigning tasks…" overlay />
      ) : null}

      <PortalResponseModal
        open={responseModal.open}
        variant={responseModal.variant}
        title={responseModal.title}
        message={responseModal.message}
        detail={responseModal.detail}
        onClose={closeResponseModal}
      />

      <div className="mx-auto max-w-5xl">
        <header className="mb-6 lg:mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#008CD3]">
                Task management
              </p>
              <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-[#1F2937] sm:text-[26px]">
                Assign tasks to employees
              </h1>
              <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[#6B7280]">
                Create and assign work items with priorities, schedules, and
                optional team routing — similar to Jira issue creation.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-xl border border-[#E4E7EC] bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setMode("single")}
                className={`rounded-lg px-4 py-2 text-[13px] font-semibold transition ${
                  mode === "single"
                    ? "bg-[#008CD3] text-white shadow-sm"
                    : "text-[#6B7280] hover:bg-[#F5F7FA]"
                }`}
              >
                Single task
              </button>
              <button
                type="button"
                onClick={() => setMode("bulk")}
                className={`rounded-lg px-4 py-2 text-[13px] font-semibold transition ${
                  mode === "bulk"
                    ? "bg-[#008CD3] text-white shadow-sm"
                    : "text-[#6B7280] hover:bg-[#F5F7FA]"
                }`}
              >
                Bulk assign
              </button>
            </div>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-5">
            <div className={`${sectionCardCls()} overflow-hidden`}>
              <div className="border-b border-[#E4E7EC] bg-gradient-to-r from-[#E8F4FB] to-white px-4 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[#008CD3] shadow-sm">
                    {mode === "single" ? (
                      <ClipboardList className="h-5 w-5" />
                    ) : (
                      <Layers className="h-5 w-5" />
                    )}
                  </span>
                  <div>
                    <h2 className="text-[16px] font-semibold text-[#1F2937]">
                      {mode === "single" ? "Create one issue" : "Create multiple issues"}
                    </h2>
                    <p className="text-[13px] text-[#6B7280]">
                      {mode === "single"
                        ? "Assign a single task to one employee."
                        : `Add up to many tasks in one submission (${bulkDrafts.length} issue${bulkDrafts.length === 1 ? "" : "s"}).`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-5 p-4 sm:p-6">
                {mode === "single" ? (
                  <TaskFormFields
                    draft={singleDraft}
                    employees={employees}
                    teams={teams}
                    onChange={(patch) =>
                      setSingleDraft((prev) => ({ ...prev, ...patch }))
                    }
                  />
                ) : (
                  <>
                    {bulkDrafts.map((draft, index) => (
                      <div
                        key={draft.key}
                        className="rounded-xl border border-[#E4E7EC] bg-[#FAFBFC] p-4 sm:p-5"
                      >
                        <TaskFormFields
                          draft={draft}
                          employees={employees}
                          teams={teams}
                          index={index}
                          showRemove={bulkDrafts.length > 1}
                          onRemove={() => removeBulkRow(draft.key)}
                          onChange={(patch) => updateBulkDraft(draft.key, patch)}
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addBulkRow}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#008CD3]/40 bg-[#E8F4FB]/40 px-4 py-3 text-[14px] font-semibold text-[#0070AA] transition hover:bg-[#E8F4FB]"
                    >
                      <Plus className="h-4 w-4" />
                      Add another issue
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={mode === "single" ? resetSingleForm : resetBulkForm}
                disabled={submitting}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[#E4E7EC] bg-white px-5 text-[14px] font-semibold text-[#1F2937] transition hover:bg-[#F5F7FA] disabled:opacity-50"
              >
                Reset form
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#008CD3] px-6 text-[14px] font-semibold text-white shadow-md shadow-[#008CD3]/20 transition hover:bg-[#0070AA] disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {mode === "single" ? "Assign task" : `Assign ${bulkDrafts.length} tasks`}
              </button>
            </div>
          </div>

          <aside className="space-y-4">
            <div className={`${sectionCardCls()} p-4 sm:p-5`}>
              <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Quick guide
              </h3>
              <ul className="mt-3 space-y-3 text-[13px] leading-relaxed text-[#374151]">
                <li className="flex gap-2">
                  <Flag className="mt-0.5 h-4 w-4 shrink-0 text-[#008CD3]" />
                  <span>
                    <strong>Direct assign</strong> — you become the reporting
                    manager automatically.
                  </span>
                </li>
                <li className="flex gap-2">
                  <Users className="mt-0.5 h-4 w-4 shrink-0 text-[#008CD3]" />
                  <span>
                    <strong>Team assign</strong> — pick a team; only members
                    appear and the team lead is the reporting manager.
                  </span>
                </li>
                <li className="flex gap-2">
                  <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-[#008CD3]" />
                  <span>Deadline must be on or after the start date.</span>
                </li>
              </ul>
            </div>

            <div className={`${sectionCardCls()} p-4 sm:p-5`}>
              <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Summary
              </h3>
              <dl className="mt-3 space-y-2 text-[13px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-[#6B7280]">Mode</dt>
                  <dd className="font-semibold text-[#1F2937]">
                    {mode === "single" ? "Single" : "Bulk"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#6B7280]">Employees loaded</dt>
                  <dd className="font-semibold text-[#1F2937]">{employees.length}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#6B7280]">Teams loaded</dt>
                  <dd className="font-semibold text-[#1F2937]">{teams.length}</dd>
                </div>
                {mode === "bulk" ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#6B7280]">Issues in queue</dt>
                    <dd className="font-semibold text-[#1F2937]">{bulkDrafts.length}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}
