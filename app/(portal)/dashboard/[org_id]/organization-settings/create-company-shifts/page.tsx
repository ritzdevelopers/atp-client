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

function labelCls(mobile = false) {
  return mobile
    ? "mb-1.5 block text-[13px] font-medium text-[#6B7280]"
    : "mb-1.5 block text-sm font-medium text-[#0C123A]";
}

function inputCls() {
  return "w-full rounded-lg border border-[#E4E7EC] bg-white px-3.5 py-3 text-[15px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15 lg:border-slate-200 lg:py-2.5 lg:text-sm lg:text-[#0C123A] lg:shadow-sm lg:focus:border-[#C99237] lg:focus:ring-[#C99237]/20";
}

function zohoPrimaryBtnCls(full = false) {
  return `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#008CD3] px-5 py-2.5 text-[15px] font-medium text-white transition active:scale-[0.98] hover:bg-[#0070AA] disabled:pointer-events-none disabled:opacity-50 lg:bg-[#C99237] lg:text-sm lg:font-bold lg:text-[#0C123A] lg:hover:bg-[#b87d2e] ${full ? "w-full" : ""}`;
}

function zohoSecondaryBtnCls(full = false) {
  return `inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[#E4E7EC] bg-white px-4 py-2.5 text-[15px] font-medium text-[#1F2937] transition active:scale-[0.98] hover:bg-[#F5F7FA] lg:border-slate-200 lg:text-sm lg:font-semibold lg:text-[#0C123A] lg:shadow-sm lg:hover:bg-slate-50 ${full ? "w-full" : ""}`;
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
      className="flex flex-col gap-2 rounded-lg border border-[#A8DAB5] bg-[#E6F4EA] px-4 py-3 text-[14px] text-[#0F9D58] lg:flex-row lg:items-center lg:justify-between lg:border-emerald-200 lg:bg-emerald-50 lg:text-sm lg:text-emerald-900"
      role="status"
    >
      <div className="flex items-start gap-2">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 lg:text-emerald-600" aria-hidden />
        <span>{success}</span>
      </div>
      <Link
        href={`${basePath}/manage-company-shifts`}
        className="font-semibold text-[#0F9D58] underline decoration-[#A8DAB5] underline-offset-2 lg:text-emerald-800 lg:decoration-emerald-300 lg:hover:text-emerald-950"
      >
        View shifts →
      </Link>
    </div>
  ) : formError ? (
    <div
      className="flex items-start gap-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-4 py-3 text-[14px] text-[#D93025] lg:border-red-200 lg:bg-red-50 lg:text-sm lg:text-red-900"
      role="alert"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 lg:text-red-600" aria-hidden />
      <span>{formError}</span>
    </div>
  ) : null;

  const orgField = (mobile: boolean) => (
    <div>
      <label htmlFor={mobile ? "org-context-shift-mobile" : "org-context-shift"} className={labelCls(mobile)}>
        Organization
      </label>
      <input
        id={mobile ? "org-context-shift-mobile" : "org-context-shift"}
        type="text"
        className={`${inputCls()} bg-[#F5F7FA] text-[#6B7280] lg:bg-slate-50`}
        value={orgMissing ? "—" : `${orgName} (ID: ${organizationIdNum})`}
        readOnly
        tabIndex={-1}
        aria-readonly
      />
    </div>
  );

  const basicFields = (mobile: boolean) => (
    <>
      {orgField(mobile)}
      <div>
        <label htmlFor={mobile ? "shift-name-mobile" : "shift-name"} className={labelCls(mobile)}>
          Shift name <span className="text-[#D93025] lg:text-red-500">*</span>
        </label>
        <input
          id={mobile ? "shift-name-mobile" : "shift-name"}
          type="text"
          className={inputCls()}
          value={shiftName}
          onChange={(e) => setShiftName(e.target.value)}
          placeholder="e.g. Morning Shift"
          disabled={orgMissing}
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={mobile ? "start-time-mobile" : "start-time"} className={labelCls(mobile)}>
            Start time <span className="text-[#D93025] lg:text-red-500">*</span>
          </label>
          <input
            id={mobile ? "start-time-mobile" : "start-time"}
            type="time"
            className={inputCls()}
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            disabled={orgMissing}
            required
          />
        </div>
        <div>
          <label htmlFor={mobile ? "end-time-mobile" : "end-time"} className={labelCls(mobile)}>
            End time <span className="text-[#D93025] lg:text-red-500">*</span>
          </label>
          <input
            id={mobile ? "end-time-mobile" : "end-time"}
            type="time"
            className={inputCls()}
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            disabled={orgMissing}
            required
          />
        </div>
      </div>
      <label className="flex items-start gap-3 rounded-xl border border-[#E4E7EC] bg-white px-4 py-3 text-[14px] text-[#4B5563] lg:border-slate-200 lg:text-sm lg:text-slate-700">
        <input
          type="checkbox"
          checked={isNightShift}
          onChange={(e) => setIsNightShift(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-[#E4E7EC] text-[#008CD3] focus:ring-[#008CD3] lg:border-slate-300 lg:text-[#C99237] lg:focus:ring-[#C99237]"
          disabled={orgMissing}
        />
        <span>
          <span className="font-medium text-[#1F2937] lg:text-[#0C123A]">Night shift</span>
          <br />
          Mark when the shift crosses midnight (e.g. 10:00 PM to 06:00 AM).
        </span>
      </label>
    </>
  );

  const rulesFields = (mobile: boolean) => (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor={mobile ? "late-after-mobile" : "late-after"} className={labelCls(mobile)}>
          Late after <span className="text-[#D93025] lg:text-red-500">*</span>
        </label>
        <input
          id={mobile ? "late-after-mobile" : "late-after"}
          type="time"
          className={inputCls()}
          value={lateAfter}
          onChange={(e) => setLateAfter(e.target.value)}
          disabled={orgMissing}
          required
        />
        <p className="mt-1 text-[12px] text-[#9CA3AF] lg:text-xs lg:text-slate-500">
          Grace period before marking late.
        </p>
      </div>
      <div>
        <label htmlFor={mobile ? "half-day-hours-mobile" : "half-day-hours"} className={labelCls(mobile)}>
          Half-day hours <span className="text-[#D93025] lg:text-red-500">*</span>
        </label>
        <input
          id={mobile ? "half-day-hours-mobile" : "half-day-hours"}
          type="time"
          className={inputCls()}
          value={halfDayHours}
          onChange={(e) => setHalfDayHours(e.target.value)}
          disabled={orgMissing}
          required
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={mobile ? "short-leave-hours-mobile" : "short-leave-hours"} className={labelCls(mobile)}>
          Short-leave hours <span className="text-[#D93025] lg:text-red-500">*</span>
        </label>
        <input
          id={mobile ? "short-leave-hours-mobile" : "short-leave-hours"}
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

  const scheduleFields = (mobile: boolean) => (
    <div className="rounded-xl border border-[#E4E7EC] bg-[#F5F7FA] p-4 lg:border-slate-200 lg:bg-slate-50/50">
      <div className="mb-3 flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-[#008CD3] lg:text-[#C99237]" aria-hidden />
        <h2 className="text-[14px] font-semibold text-[#1F2937] lg:text-sm lg:text-[#0C123A]">
          Working days <span className="text-[#D93025] lg:text-red-500">*</span>
        </h2>
      </div>
      <div className="flex flex-wrap gap-2">
        {DAYS.map((day) => {
          const selected = workingDays.has(day);
          return (
            <button
              key={day}
              type="button"
              onClick={() => toggleWorkingDay(day)}
              disabled={orgMissing}
              className={`min-w-[44px] rounded-lg px-3 py-2 text-[13px] font-semibold transition lg:py-1.5 lg:text-xs lg:sm:text-sm ${
                selected
                  ? "bg-[#008CD3] text-white lg:bg-[#C99237] lg:text-[#0C123A]"
                  : "border border-[#E4E7EC] bg-white text-[#6B7280] active:bg-[#F5F7FA] lg:border-slate-200 lg:text-slate-600 lg:hover:bg-slate-50"
              }`}
            >
              {day.slice(0, 3)}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-[12px] text-[#6B7280] lg:text-xs lg:text-slate-500">
        Selected: {workingDays.size > 0 ? Array.from(workingDays).join(", ") : "None"}
      </p>
      {mobile ? (
        <div className="mt-4 flex gap-3 rounded-lg border border-[#E8F4FB] bg-[#E8F4FB]/60 p-3">
          <Info className="h-5 w-5 shrink-0 text-[#008CD3]" />
          <p className="text-[13px] leading-relaxed text-[#4B5563]">
            Tap days to include or exclude them from this shift schedule.
          </p>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="min-h-full bg-[#F5F7FA] pb-28 lg:bg-transparent lg:space-y-6 lg:pb-0">
      {/* Mobile & tablet: Zoho admin portal style */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-20 border-b border-[#E4E7EC] bg-white shadow-sm">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
              <Clock3 className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[17px] font-semibold text-[#1F2937]">Create shift</h1>
              <p className="truncate text-[13px] text-[#6B7280]">{orgName}</p>
            </div>
          </div>

          <div className="px-4 pb-3">
            <div className="flex rounded-lg bg-[#F5F7FA] p-1">
              {mobileTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMobileMainTab(tab.id)}
                  className={`relative flex flex-1 items-center justify-center gap-1 rounded-md py-2 text-[13px] font-medium transition ${
                    mobileMainTab === tab.id
                      ? "bg-white text-[#008CD3] shadow-sm"
                      : "text-[#6B7280]"
                  }`}
                >
                  {tab.label}
                  {tab.badge != null && tab.badge > 0 ? (
                    <span
                      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] ${
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

        <div className="p-4">
          {statusBanner ? <div className="mb-4">{statusBanner}</div> : null}

          <form id="create-shift-mobile-form" onSubmit={handleSubmit} className="space-y-4">
            {mobileMainTab === "basic" ? (
              <div className="space-y-4 rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
                {basicFields(true)}
              </div>
            ) : null}

            {mobileMainTab === "rules" ? (
              <div className="space-y-4 rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
                {rulesFields(true)}
              </div>
            ) : null}

            {mobileMainTab === "schedule" ? (
              <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
                {scheduleFields(true)}
              </div>
            ) : null}
          </form>

          <Link
            href={`${basePath}/manage-company-shifts`}
            className="mt-4 block text-center text-[14px] font-medium text-[#008CD3]"
          >
            View existing shifts
          </Link>
        </div>

        <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 border-t border-[#E4E7EC] bg-white px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
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
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Creating…
                </>
              ) : (
                <>
                  <Clock3 className="h-4 w-4" aria-hidden />
                  Create shift
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop layout (unchanged) */}
      <div className="hidden space-y-6 lg:block">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#C99237]/12">
              <Clock3 className="h-6 w-6 text-[#C99237]" aria-hidden />
            </span>
            <div>
              <h1 className="text-xl font-bold text-[#0C123A] sm:text-2xl">Create company shift</h1>
              <p className="mt-1 text-sm text-slate-500">
                Define attendance rules for{" "}
                <span className="font-medium text-slate-700">{orgName}</span> including timings,
                grace period and working days.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
          {statusBanner ? <div className="mb-6">{statusBanner}</div> : null}

          <form onSubmit={handleSubmit} className="space-y-5">
            {basicFields(false)}
            {rulesFields(false)}
            {scheduleFields(false)}

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href={`${basePath}/manage-company-shifts`}
                className="text-sm font-semibold text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-[#0C123A]"
              >
                Back to manage shifts
              </Link>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Creating…
                    </>
                  ) : (
                    <>
                      <Clock3 className="h-4 w-4" aria-hidden />
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
