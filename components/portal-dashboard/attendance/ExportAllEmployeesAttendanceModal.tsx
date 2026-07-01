"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarRange, Download, Loader2, Users, X } from "lucide-react";
import type { EmployeeAttendanceRow } from "@/services/attendanceHistory";
import {
  fetchAttendanceExportData,
  type AttendanceExportMode,
} from "@/services/attendanceHistory";
import {
  downloadAllEmployeesAttendanceExcel,
  prepareEmployeeExportPayload,
} from "@/lib/exportAttendanceHistoryExcel";

type ExportAllEmployeesAttendanceModalProps = {
  open: boolean;
  onClose: () => void;
  orgId: string;
  employees: EmployeeAttendanceRow[];
  defaultMonth: number;
  defaultYear: number;
  filterDescription: string;
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function zohoInputCls() {
  return "w-full rounded-lg border border-[#E4E7EC] bg-white px-3 py-2.5 text-[13px] text-[#1F2937] outline-none transition focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15";
}

export default function ExportAllEmployeesAttendanceModal({
  open,
  onClose,
  orgId,
  employees,
  defaultMonth,
  defaultYear,
  filterDescription,
}: ExportAllEmployeesAttendanceModalProps) {
  const now = new Date();
  const [mode, setMode] = useState<AttendanceExportMode>("monthly");
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const exportableEmployees = useMemo(
    () =>
      employees.filter((employee) => {
        const portalUserId = employee.user_id ?? employee.employee_id;
        return portalUserId != null && String(portalUserId).trim() !== "";
      }),
    [employees],
  );

  useEffect(() => {
    if (!open) return;
    setMode("monthly");
    setMonth(defaultMonth);
    setYear(defaultYear);
    setError(null);
    setExporting(false);
    setProgress({ done: 0, total: 0 });
  }, [open, defaultMonth, defaultYear]);

  if (!open) return null;

  async function handleExport() {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Please sign in again to export attendance.");
      return;
    }
    if (!exportableEmployees.length) {
      setError("No portal-mapped employees in the current filtered list.");
      return;
    }

    setExporting(true);
    setError(null);
    setProgress({ done: 0, total: exportableEmployees.length });

    try {
      const prepared = [];
      let firstPeriod: {
        label: string;
        from_date: string;
        to_date: string;
        mode: AttendanceExportMode;
      } | null = null;

      for (let index = 0; index < exportableEmployees.length; index += 1) {
        const employee = exportableEmployees[index];
        const portalUserId = employee.user_id ?? employee.employee_id;
        const payload = await fetchAttendanceExportData(
          token,
          orgId,
          portalUserId,
          mode === "monthly" ? { mode, month, year } : { mode },
        );

        if (!firstPeriod) {
          firstPeriod = {
            label: payload.period.label,
            from_date: payload.period.from_date,
            to_date: payload.period.to_date,
            mode: payload.period.mode,
          };
        }

        prepared.push(
          prepareEmployeeExportPayload(payload, { clientSideCalculation: true }),
        );
        setProgress({ done: index + 1, total: exportableEmployees.length });
      }

      const period = firstPeriod ?? {
        label: mode === "monthly" ? `${MONTHS[month - 1]} ${year}` : "Full history",
        from_date: "",
        to_date: "",
        mode,
      };

      const fileSlug =
        period.mode === "monthly" && period.from_date.length >= 7
          ? period.from_date.slice(0, 7)
          : "full-history";

      await downloadAllEmployeesAttendanceExcel(prepared, {
        periodLabel: period.label,
        fromDate: period.from_date,
        toDate: period.to_date,
        filterDescription,
        fileSlug,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not export attendance for all employees.",
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
                <Users className="h-3.5 w-3.5" />
                Bulk Excel export
              </div>
              <h2 className="text-lg font-semibold text-[#111827]">
                Export all employees
              </h2>
              <p className="mt-0.5 text-sm text-[#6B7280]">
                {exportableEmployees.length} employee
                {exportableEmployees.length === 1 ? "" : "s"} in current filtered list
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
          <div className="rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-4 py-3 text-sm text-[#6B7280]">
            Uses the same company attendance rules as single-employee export: on time until
            9:45 AM, late from 9:46 AM, absent if worked under 4 hours, and every 3 lates = 1
            leave (floor division).
          </div>

          <div className="rounded-xl border border-[#E4E7EC] bg-white px-4 py-3 text-sm text-[#4B5563]">
            <p className="font-medium text-[#1F2937]">Current list filters</p>
            <p className="mt-1 leading-relaxed">{filterDescription}</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode("full")}
              disabled={exporting}
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
                From each employee joining date until today.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setMode("monthly")}
              disabled={exporting}
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
                Defaults to the month of your selected daily view.
              </p>
            </button>
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
                  disabled={exporting}
                  className={zohoInputCls()}
                >
                  {MONTHS.map((label, index) => (
                    <option key={label} value={index + 1}>
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
                  disabled={exporting}
                  className={zohoInputCls()}
                >
                  {Array.from({ length: 8 }, (_, i) => now.getFullYear() - i).map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-4 py-3 text-sm text-[#6B7280]">
              The workbook includes a summary sheet for every listed employee plus a
              combined daily log with the same status calculations.
            </div>
          )}

          {exporting && progress.total > 0 ? (
            <div className="rounded-lg border border-[#CFE8F7] bg-[#E8F4FB] px-3 py-2 text-sm text-[#0070AA]">
              Preparing export {progress.done} of {progress.total}…
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
            disabled={exporting || exportableEmployees.length === 0}
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
