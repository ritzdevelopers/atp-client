"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarRange, Download, Loader2, X } from "lucide-react";
import type { EmployeeAttendanceRow } from "@/services/attendanceHistory";
import {
  fetchAttendanceExportData,
  type AttendanceExportMode,
} from "@/services/attendanceHistory";
import { downloadAttendanceHistoryExcel } from "@/lib/exportAttendanceHistoryExcel";
import {
  clampMonthToExportable,
  getExportableMonthsForYear,
  isFutureCalendarMonth,
} from "@/lib/attendanceExportPeriod";

type ExportAttendanceHistoryModalProps = {
  open: boolean;
  onClose: () => void;
  orgId: string;
  employee: EmployeeAttendanceRow | null;
};

function zohoInputCls() {
  return "w-full rounded-lg border border-[#E4E7EC] bg-white px-3 py-2.5 text-[13px] text-[#1F2937] outline-none transition focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15";
}

export default function ExportAttendanceHistoryModal({
  open,
  onClose,
  orgId,
  employee,
}: ExportAttendanceHistoryModalProps) {
  const now = new Date();
  const [mode, setMode] = useState<AttendanceExportMode>("monthly");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMode("monthly");
    setMonth(now.getMonth() + 1);
    setYear(now.getFullYear());
    setError(null);
    setExporting(false);
  }, [open, employee]);

  useEffect(() => {
    if (mode !== "monthly") return;
    setMonth((current) => clampMonthToExportable(year, current, now));
  }, [year, mode]);

  const yearOptions = useMemo(() => {
    const current = now.getFullYear();
    return Array.from({ length: 8 }, (_, i) => current - i);
  }, [now]);

  const exportableMonths = useMemo(
    () => getExportableMonthsForYear(year, now),
    [year, now],
  );

  const isFutureMonthSelected =
    mode === "monthly" && isFutureCalendarMonth(year, month, now);

  if (!open || !employee) return null;

  const portalUserId = employee.user_id ?? employee.employee_id;

  async function handleExport() {
    const token = localStorage.getItem("token");
    if (!token || !portalUserId) {
      setError("Please sign in again to export attendance.");
      return;
    }

    setExporting(true);
    setError(null);

    try {
      const payload = await fetchAttendanceExportData(
        token,
        orgId,
        portalUserId,
        mode === "monthly" ? { mode, month, year } : { mode },
      );
      await downloadAttendanceHistoryExcel(payload);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not export attendance history.",
      );
    } finally {
      setExporting(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[10050] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0"
        onClick={exporting ? undefined : onClose}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-t-2xl border border-[#E4E7EC] bg-white shadow-xl sm:rounded-2xl">
        <div className="border-b border-[#E4E7EC] bg-gradient-to-r from-[#E8F4FB] to-white px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#008CD3] ring-1 ring-[#008CD3]/15">
                <Download className="h-3.5 w-3.5" />
                Excel export
              </div>
              <h2 className="text-lg font-semibold text-[#111827]">
                Export attendance history
              </h2>
              <p className="mt-0.5 text-sm text-[#6B7280]">
                {employee.employee_name}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={exporting}
              className="rounded-lg p-1.5 text-[#9CA3AF] transition hover:bg-white hover:text-[#374151] disabled:opacity-50"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode("full")}
              className={[
                "rounded-xl border px-4 py-3 text-left transition",
                mode === "full"
                  ? "border-[#008CD3] bg-[#E8F4FB] ring-2 ring-[#008CD3]/15"
                  : "border-[#E4E7EC] bg-white hover:bg-[#F9FAFB]",
              ].join(" ")}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
                <CalendarRange className="h-4 w-4 text-[#008CD3]" />
                Full history
              </div>
              <p className="mt-1 text-xs text-[#6B7280]">
                From employee joining date until today.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setMode("monthly")}
              className={[
                "rounded-xl border px-4 py-3 text-left transition",
                mode === "monthly"
                  ? "border-[#008CD3] bg-[#E8F4FB] ring-2 ring-[#008CD3]/15"
                  : "border-[#E4E7EC] bg-white hover:bg-[#F9FAFB]",
              ].join(" ")}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
                <CalendarRange className="h-4 w-4 text-[#008CD3]" />
                Monthly
              </div>
              <p className="mt-1 text-xs text-[#6B7280]">
                Pick a month such as July 2025 or June 2026.
              </p>
            </button>
          </div>

          <div className="rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-4 py-3 text-sm text-[#6B7280]">
            Attendance status, payable days, approved leaves, comp off balance, and
            regularization adjustments are calculated on the server using company rules.
          </div>

          {mode === "monthly" ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                  Month
                </label>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className={zohoInputCls()}
                >
                  {exportableMonths.map(({ value, label }) => (
                    <option key={label} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                  Year
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className={zohoInputCls()}
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-4 py-3 text-sm text-[#6B7280]">
              The export includes an overview, a calendar grid with each day as a
              column (Sunday through Saturday), company attendance rules, and a daily
              log. Weekday absences are highlighted in red; Sundays are marked as
              weekly off.
            </div>
          )}

          {mode === "monthly" ? (
            <div className="rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-4 py-3 text-sm text-[#6B7280]">
              Only completed or current months can be exported. Future months (for example
              August while July is in progress) are not available.
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-[#F5C2C0] bg-[#FCE8E6] px-3 py-2 text-sm text-[#B71C1C]">
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex gap-2 border-t border-[#E4E7EC] bg-[#FCFCFD] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={exporting}
            className="inline-flex flex-1 items-center justify-center rounded-lg border border-[#E4E7EC] bg-white px-4 py-2.5 text-sm font-medium text-[#374151] transition hover:bg-[#F9FAFB] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={exporting || isFutureMonthSelected}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#008CD3] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0070AA] disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {exporting ? "Generating…" : "Download Excel"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
