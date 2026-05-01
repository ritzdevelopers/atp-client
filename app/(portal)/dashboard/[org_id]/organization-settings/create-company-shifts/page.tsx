"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Clock3, Loader2, AlertCircle, CheckCircle2, CalendarDays } from "lucide-react";
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

function labelCls() {
  return "mb-1.5 block text-sm font-medium text-[#0C123A]";
}

function inputCls() {
  return "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#0C123A] shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#C99237] focus:ring-2 focus:ring-[#C99237]/20";
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
      return;
    }
    if (workingDays.size === 0) {
      setFormError("Select at least one working day.");
      return;
    }

    if (!lateAfter || !halfDayHours || !shortLeaveHours) {
      setFormError("Late after, half-day hours and short-leave hours are required.");
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
      } as any);
      setSuccess("Shift created successfully.");
      resetForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not create shift.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#C99237]/12">
            <Clock3 className="h-6 w-6 text-[#C99237]" aria-hidden />
          </span>
          <div>
            <h1 className="text-xl font-bold text-[#0C123A] sm:text-2xl">Create company shift</h1>
            <p className="mt-1 text-sm text-slate-500">
              Define attendance rules for <span className="font-medium text-slate-700">{orgName}</span>{" "}
              including timings, grace period and working days.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
        {success && (
          <div
            className="mb-6 flex flex-col gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 sm:flex-row sm:items-center sm:justify-between"
            role="status"
          >
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              <span>{success}</span>
            </div>
            <Link
              href={`${basePath}/manage-company-shifts`}
              className="font-semibold text-emerald-800 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-950"
            >
              View shifts →
            </Link>
          </div>
        )}

        {formError && (
          <div
            className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="org-context-shift" className={labelCls()}>
              Organization
            </label>
            <input
              id="org-context-shift"
              type="text"
              className={`${inputCls()} bg-slate-50 text-slate-600`}
              value={orgMissing ? "—" : `${orgName} (ID: ${organizationIdNum})`}
              readOnly
              tabIndex={-1}
              aria-readonly
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="shift-name" className={labelCls()}>
                Shift name <span className="text-red-500">*</span>
              </label>
              <input
                id="shift-name"
                type="text"
                className={inputCls()}
                value={shiftName}
                onChange={(e) => setShiftName(e.target.value)}
                placeholder="e.g. Morning Shift"
                disabled={orgMissing}
                required
              />
            </div>

            <div>
              <label htmlFor="start-time" className={labelCls()}>
                Start time <span className="text-red-500">*</span>
              </label>
              <input
                id="start-time"
                type="time"
                className={inputCls()}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={orgMissing}
                required
              />
            </div>

            <div>
              <label htmlFor="end-time" className={labelCls()}>
                End time <span className="text-red-500">*</span>
              </label>
              <input
                id="end-time"
                type="time"
                className={inputCls()}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={orgMissing}
                required
              />
            </div>

            <div>
              <label htmlFor="late-after" className={labelCls()}>
                Late after <span className="text-red-500">*</span>
              </label>
              <input
                id="late-after"
                type="time"
                className={inputCls()}
                value={lateAfter}
                onChange={(e) => setLateAfter(e.target.value)}
                disabled={orgMissing}
                required
              />
            </div>

            <div>
              <label htmlFor="half-day-hours" className={labelCls()}>
                Half-day hours <span className="text-red-500">*</span>
              </label>
              <input
                id="half-day-hours"
                type="time"
                className={inputCls()}
                value={halfDayHours}
                onChange={(e) => setHalfDayHours(e.target.value)}
                disabled={orgMissing}
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="short-leave-hours" className={labelCls()}>
                Short-leave hours <span className="text-red-500">*</span>
              </label>
              <input
                id="short-leave-hours"
                type="time"
                className={inputCls()}
                value={shortLeaveHours}
                onChange={(e) => setShortLeaveHours(e.target.value)}
                disabled={orgMissing}
                required
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-[#C99237]" aria-hidden />
              <h2 className="text-sm font-semibold text-[#0C123A]">
                Working days <span className="text-red-500">*</span>
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
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
                      selected
                        ? "bg-[#C99237] text-[#0C123A]"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Selected: {workingDays.size > 0 ? Array.from(workingDays).join(", ") : "None"}
            </p>
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={isNightShift}
              onChange={(e) => setIsNightShift(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#C99237] focus:ring-[#C99237]"
              disabled={orgMissing}
            />
            <span>
              <span className="font-medium text-[#0C123A]">Night shift</span>
              <br />
              Mark this when the shift crosses midnight (e.g. 10:00 PM to 06:00 AM).
            </span>
          </label>

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href={`${basePath}/manage-company-shifts`}
              className="text-sm font-semibold text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-[#0C123A]"
            >
              Back to manage shifts
            </Link>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => {
                  setFormError(null);
                  setSuccess(null);
                  resetForm();
                }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0C123A] shadow-sm transition hover:bg-slate-50"
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={submitting || orgMissing}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#C99237] px-5 py-2.5 text-sm font-bold text-[#0C123A] shadow-sm transition hover:bg-[#b87d2e] disabled:cursor-not-allowed disabled:opacity-60"
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
  );
}