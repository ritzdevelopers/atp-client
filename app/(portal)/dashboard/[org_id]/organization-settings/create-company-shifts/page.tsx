"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Clock3, Loader2, AlertCircle, CheckCircle2, CalendarDays, Info } from "lucide-react";
import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import { createCompanyWorkShift } from "@/services/organizationSettings";

const DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

const mobileCaptionCls = "text-[11px] leading-snug text-[#6B7280]";

function labelCls() {
  return "mb-1 block text-[12px] font-medium text-[#374151]";
}

function inputCls() {
  return "w-full rounded-md border border-[#E4E7EC] bg-white px-2.5 py-2 text-[13px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15";
}

function zohoPrimaryBtnCls(full = false) {
  return `inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-[#008CD3] px-4 py-2 text-[14px] font-medium text-white transition active:scale-[0.98] hover:bg-[#0070AA] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full" : ""}`;
}

function zohoSecondaryBtnCls(full = false) {
  return `inline-flex min-h-[40px] items-center justify-center rounded-lg border border-[#E4E7EC] bg-white px-3 py-2 text-[13px] font-medium text-[#374151] transition active:scale-[0.98] hover:bg-[#F9FAFB] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full" : ""}`;
}

function formPanelCls() {
  return "rounded-lg border border-[#E4E7EC] bg-white p-3 shadow-sm";
}

function withSeconds(time: string) {
  return time ? `${time}:00` : "";
}

export default function CreateCompanyShiftsPage() {
  const params = useParams();
  const orgIdParam = params?.org_id;
  const ctx = useManagementDashboardContext();

  const organizationIdNum =
    ctx?.organization?.id != null ? Number(ctx.organization.id) : Number(orgIdParam);
  const orgName = ctx?.organization?.org_name?.trim() || `Organization ${orgIdParam ?? ""}`;
  const orgMissing = !organizationIdNum || Number.isNaN(organizationIdNum);
  const basePath = `/dashboard/${orgIdParam ?? ""}/organization-settings`;

  const defaultWorkingDays = useMemo(
    () => new Set<string>(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]),
    [],
  );

  const [shiftName, setShiftName] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [lateAfter, setLateAfter] = useState("00:15");
  const [halfDayHours, setHalfDayHours] = useState("04:00");
  const [shortLeaveHours, setShortLeaveHours] = useState("02:00");
  const [isNightShift, setIsNightShift] = useState(false);
  const [workingDays, setWorkingDays] = useState<Set<string>>(defaultWorkingDays);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mobileMainTab, setMobileMainTab] = useState<"basic" | "rules" | "schedule">("basic");

  function toggleWorkingDay(day: string) {
    setWorkingDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  function resetForm() {
    setShiftName("");
    setStartTime("");
    setEndTime("");
    setLateAfter("00:15");
    setHalfDayHours("04:00");
    setShortLeaveHours("02:00");
    setIsNightShift(false);
    setWorkingDays(new Set(defaultWorkingDays));
  }

  function clearForm() {
    setFormError(null);
    setSuccess(null);
    resetForm();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccess(null);

    if (orgMissing) {
      setFormError("Invalid organization.");
      return;
    }
    if (!shiftName.trim() || !startTime || !endTime) {
      setFormError("Shift name, start time and end time are required.");
      setMobileMainTab("basic");
      return;
    }
    if (workingDays.size === 0) {
      setFormError("Select at least one working day.");
      setMobileMainTab("schedule");
      return;
    }

    if (!lateAfter || !halfDayHours || !shortLeaveHours) {
      setFormError("Late after, half-day hours and short-leave hours are required.");
      setMobileMainTab("rules");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setFormError("Not signed in.");
      return;
    }

    setSubmitting(true);
    try {
      await createCompanyWorkShift(token, {
        org_id: organizationIdNum,
        shift_name: shiftName,
        start_time: withSeconds(startTime),
        end_time: withSeconds(endTime),
        late_after: withSeconds(lateAfter),
        half_day_hours: withSeconds(halfDayHours),
        short_leave_hours: withSeconds(shortLeaveHours),
        is_night_shift: isNightShift,
        working_days: Array.from(workingDays).join(","),
      } as Parameters<typeof createCompanyWorkShift>[1]);
      setSuccess("Shift created successfully.");
      resetForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not create shift.");
    } finally {
      setSubmitting(false);
    }
  }

  const mobileTabs = [
    { id: "basic" as const, label: "Basic" },
    { id: "rules" as const, label: "Rules" },
    { id: "schedule" as const, label: "Schedule", badge: workingDays.size },
  ];

  const statusBanner = success ? (
    <div
      className="flex flex-col gap-1.5 rounded-lg border border-[#A8DAB5] bg-[#E6F4EA] px-3 py-2 text-[12px] text-[#0F9D58] sm:flex-row sm:items-center sm:justify-between"
      role="status"
    >
      <div className="flex items-start gap-2">
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>{success}</span>
      </div>
      <Link
        href={`${basePath}/manage-company-shifts`}
        className="shrink-0 font-medium text-[#008CD3] hover:underline"
      >
        View shifts →
      </Link>
    </div>
  ) : formError ? (
    <div
      className="flex items-start gap-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2 text-[12px] text-[#D93025]"
      role="alert"
    >
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{formError}</span>
    </div>
  ) : null;

  const orgField = (idSuffix: string) => (
    <div>
      <label htmlFor={`org-context-shift-${idSuffix}`} className={labelCls()}>
        Organization
      </label>
      <input
        id={`org-context-shift-${idSuffix}`}
        type="text"
        className={`${inputCls()} bg-[#F9FAFB] text-[#6B7280]`}
        value={orgMissing ? "—" : `${orgName} (ID: ${organizationIdNum})`}
        readOnly
        tabIndex={-1}
        aria-readonly
      />
    </div>
  );

  const basicFields = (idSuffix: string) => (
    <>
      {orgField(idSuffix)}
      <div>
        <label htmlFor={`shift-name-${idSuffix}`} className={labelCls()}>
          Shift name <span className="text-[#D93025]">*</span>
        </label>
        <input
          id={`shift-name-${idSuffix}`}
          type="text"
          className={inputCls()}
          value={shiftName}
          onChange={(e) => setShiftName(e.target.value)}
          placeholder="e.g. Morning Shift"
          disabled={orgMissing}
          required
        />
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2">
        <div>
          <label htmlFor={`start-time-${idSuffix}`} className={labelCls()}>
            Start time <span className="text-[#D93025]">*</span>
          </label>
          <input
            id={`start-time-${idSuffix}`}
            type="time"
            className={inputCls()}
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            disabled={orgMissing}
            required
          />
        </div>
        <div>
          <label htmlFor={`end-time-${idSuffix}`} className={labelCls()}>
            End time <span className="text-[#D93025]">*</span>
          </label>
          <input
            id={`end-time-${idSuffix}`}
            type="time"
            className={inputCls()}
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            disabled={orgMissing}
            required
          />
        </div>
      </div>
      <label className="flex items-start gap-2 rounded-md border border-[#E4E7EC] bg-[#F9FAFB] px-2.5 py-2 text-[12px] text-[#4B5563]">
        <input
          type="checkbox"
          checked={isNightShift}
          onChange={(e) => setIsNightShift(e.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-[#E4E7EC] text-[#008CD3] focus:ring-[#008CD3]"
          disabled={orgMissing}
        />
        <span>
          <span className="font-medium text-[#1F2937]">Night shift</span>
          <span className={`block ${mobileCaptionCls}`}>
            Crosses midnight (e.g. 10 PM – 6 AM).
          </span>
        </span>
      </label>
    </>
  );

  const rulesFields = (idSuffix: string) => (
    <div className="grid gap-2.5 sm:grid-cols-2">
      <div>
        <label htmlFor={`late-after-${idSuffix}`} className={labelCls()}>
          Late after <span className="text-[#D93025]">*</span>
        </label>
        <input
          id={`late-after-${idSuffix}`}
          type="time"
          className={inputCls()}
          value={lateAfter}
          onChange={(e) => setLateAfter(e.target.value)}
          disabled={orgMissing}
          required
        />
        <p className={`mt-0.5 ${mobileCaptionCls}`}>Grace before marking late.</p>
      </div>
      <div>
        <label htmlFor={`half-day-hours-${idSuffix}`} className={labelCls()}>
          Half-day hours <span className="text-[#D93025]">*</span>
        </label>
        <input
          id={`half-day-hours-${idSuffix}`}
          type="time"
          className={inputCls()}
          value={halfDayHours}
          onChange={(e) => setHalfDayHours(e.target.value)}
          disabled={orgMissing}
          required
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`short-leave-hours-${idSuffix}`} className={labelCls()}>
          Short-leave hours <span className="text-[#D93025]">*</span>
        </label>
        <input
          id={`short-leave-hours-${idSuffix}`}
          type="time"
          className={inputCls()}
          value={shortLeaveHours}
          onChange={(e) => setShortLeaveHours(e.target.value)}
          disabled={orgMissing}
          required
        />
      </div>
    </div>
  );

  const scheduleFields = (showHint: boolean) => (
    <div className="rounded-md border border-[#E4E7EC] bg-[#F9FAFB] p-2.5">
      <div className="mb-2 flex items-center gap-1.5">
        <CalendarDays className="h-3.5 w-3.5 text-[#008CD3]" aria-hidden />
        <h2 className="text-[12px] font-semibold text-[#1F2937]">
          Working days <span className="text-[#D93025]">*</span>
        </h2>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {DAYS.map((day) => {
          const selected = workingDays.has(day);
          return (
            <button
              key={day}
              type="button"
              onClick={() => toggleWorkingDay(day)}
              disabled={orgMissing}
              className={`min-h-[32px] min-w-[2.5rem] rounded-md px-2 py-1 text-[11px] font-semibold transition active:scale-[0.98] ${
                selected
                  ? "bg-[#008CD3] text-white"
                  : "border border-[#E4E7EC] bg-white text-[#6B7280] hover:bg-[#F5F7FA]"
              }`}
            >
              {day.slice(0, 3)}
            </button>
          );
        })}
      </div>
      <p className={`mt-2 ${mobileCaptionCls}`}>
        Selected: {workingDays.size > 0 ? Array.from(workingDays).join(", ") : "None"}
      </p>
      {showHint ? (
        <div className="mt-2 flex gap-2 rounded-md border border-[#E8F4FB] bg-[#E8F4FB]/50 px-2 py-1.5">
          <Info className="h-3.5 w-3.5 shrink-0 text-[#008CD3]" aria-hidden />
          <p className={mobileCaptionCls}>Tap days to include or exclude from this shift.</p>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="min-h-full bg-[#F5F7FA] pb-24 [font-family:var(--font-inter),system-ui,sans-serif] max-lg:-mx-1 sm:max-lg:-mx-2 lg:pb-8">
      {/* Mobile & tablet */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-20 border-b border-[#E4E7EC] bg-white shadow-sm">
          <div className="flex items-center gap-2 px-3 py-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
              <Clock3 className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[15px] font-semibold text-[#1F2937]">Create shift</h1>
              <p className={`truncate ${mobileCaptionCls}`}>{orgName}</p>
            </div>
          </div>

          <div className="px-3 pb-2.5">
            <div className="flex gap-0.5 rounded-md bg-[#F5F7FA] p-0.5">
              {mobileTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMobileMainTab(tab.id)}
                  className={`flex min-w-0 flex-1 items-center justify-center gap-0.5 rounded-[5px] px-1.5 py-1.5 text-[12px] font-medium transition active:scale-[0.98] ${
                    mobileMainTab === tab.id
                      ? "bg-white text-[#008CD3] shadow-sm"
                      : "text-[#6B7280]"
                  }`}
                >
                  {tab.label}
                  {tab.badge != null && tab.badge > 0 ? (
                    <span
                      className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[10px] ${
                        mobileMainTab === tab.id
                          ? "bg-[#E8F4FB] text-[#008CD3]"
                          : "bg-[#E4E7EC] text-[#6B7280]"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-3 py-3">
          {statusBanner ? <div className="mb-3">{statusBanner}</div> : null}

          <form id="create-shift-mobile-form" onSubmit={handleSubmit} className="space-y-3">
            {mobileMainTab === "basic" ? (
              <div className={`${formPanelCls()} space-y-2.5`}>{basicFields("mobile")}</div>
            ) : null}

            {mobileMainTab === "rules" ? (
              <div className={formPanelCls()}>{rulesFields("mobile")}</div>
            ) : null}

            {mobileMainTab === "schedule" ? (
              <div className={formPanelCls()}>{scheduleFields(true)}</div>
            ) : null}
          </form>

          <Link
            href={`${basePath}/manage-company-shifts`}
            className="mt-3 block text-center text-[13px] font-medium text-[#008CD3]"
          >
            View existing shifts
          </Link>
        </div>

        <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 border-t border-[#E4E7EC] bg-white px-3 py-2 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <div className="flex gap-2">
            <button type="button" onClick={clearForm} className={zohoSecondaryBtnCls(true)}>
              Clear
            </button>
            <button
              type="submit"
              form="create-shift-mobile-form"
              disabled={submitting || orgMissing}
              className={zohoPrimaryBtnCls(true)}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  Creating…
                </>
              ) : (
                <>
                  <Clock3 className="h-3.5 w-3.5" aria-hidden />
                  Create shift
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop: compact single-column form */}
      <div className="mx-auto hidden max-w-xl space-y-4 px-0 lg:block lg:pt-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
            <Clock3 className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-[18px] font-semibold text-[#1F2937]">Create company shift</h1>
            <p className="text-[13px] text-[#6B7280]">
              Timings, grace period and working days for{" "}
              <span className="font-medium text-[#374151]">{orgName}</span>.
            </p>
          </div>
        </div>

        <div className={formPanelCls()}>
          {statusBanner ? <div className="mb-3">{statusBanner}</div> : null}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2.5">{basicFields("desktop")}</div>
            <div className="border-t border-[#E4E7EC] pt-3">{rulesFields("desktop")}</div>
            <div className="border-t border-[#E4E7EC] pt-3">{scheduleFields(false)}</div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E4E7EC] pt-3">
              <Link
                href={`${basePath}/manage-company-shifts`}
                className="text-[13px] font-medium text-[#008CD3] hover:underline"
              >
                Back to manage shifts
              </Link>
              <div className="flex gap-2">
                <button type="button" onClick={clearForm} className={zohoSecondaryBtnCls()}>
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={submitting || orgMissing}
                  className={zohoPrimaryBtnCls()}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      Creating…
                    </>
                  ) : (
                    <>
                      <Clock3 className="h-3.5 w-3.5" aria-hidden />
                      Create shift
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
