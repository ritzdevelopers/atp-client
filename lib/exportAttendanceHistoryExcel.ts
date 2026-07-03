import type {
  AttendanceExportPayload,
  AttendanceSheetReport,
} from "@/services/attendanceHistory";
import {
  applyRulesToCalendarDay,
  ATTENDANCE_RULE_LABELS,
  buildCalendarDaysFromPunches,
  buildPayrollExportSummary,
  dayCameToWork,
  dayIsWeekend,
  dayWasHalfDay,
  dayWasLate,
  hasAttendanceOnDay,
  isWeekendDay,
  plainAttendanceResult,
  summarizeCalendarDaysClient,
  type CalendarDayExport,
  type PayrollExportSummary,
} from "@/lib/attendanceRules";
import {
  isPayrollExceptionEmpCode,
  listPayrollExceptionEmpCodes,
  PAYROLL_EXCEPTION_DESCRIPTION,
  payrollDayCreditLabel,
} from "@/lib/attendancePayrollExceptions";
import { formatAttendanceTimeLocal } from "@/lib/attendanceDates";

export type ExportExcelOptions = {
  /** @deprecated Server now calculates attendance; kept for special payroll fallback only. */
  clientSideCalculation?: boolean;
};

function payrollFromSheetReport(
  sheetReport: AttendanceSheetReport,
): PayrollExportSummary {
  return {
    workingDays:
      sheetReport.calendar_days_in_month ?? sheetReport.total_days,
    daysPresent: sheetReport.present_days,
    onTimeDays: Math.max(0, sheetReport.full_days - sheetReport.late_marks),
    lateDays: sheetReport.late_marks,
    absentDays: sheetReport.absent_days,
    halfDayDays: sheetReport.half_days,
    shortLeaveDays: sheetReport.short_leaves,
    weeklyOffDays: sheetReport.weekly_offs ?? sheetReport.weekly_off_days ?? 0,
    leaveFromLates: sheetReport.late_leave_deduction,
    halfDayDeduction: sheetReport.half_days * 0.5,
    payDays: sheetReport.payable_days,
    totalWorkingHours: sheetReport.total_working_hours,
    attendanceWorkingDays: sheetReport.working_days,
    paidLeaves: sheetReport.paid_leaves,
    unpaidLeaves: sheetReport.unpaid_leaves,
    halfDayLeaves: sheetReport.half_day_leaves,
    compOffBalance: sheetReport.comp_off_balance,
    usesSheetReportFormula: true,
  };
}

function formatSheetReportPayableFormula(sheetReport: AttendanceSheetReport): string {
  const weeklyOffs = sheetReport.weekly_offs ?? sheetReport.weekly_off_days ?? 0;
  return [
    `Working days (${sheetReport.working_days})`,
    `+ Paid leaves (${sheetReport.paid_leaves})`,
    `+ Weekly offs (${weeklyOffs})`,
    `+ Comp off balance (${sheetReport.comp_off_balance})`,
    `− Late leave deduction (${sheetReport.late_leave_deduction})`,
    `= ${sheetReport.payable_days} payable days`,
  ].join(" ");
}

export type AttendanceExportSummary = AttendanceExportPayload["summary"];

const FONT_FAMILY = "Segoe UI";

const PALETTE = {
  brand: "FF008CD3",
  brandDark: "FF0F4C75",
  brandLight: "FFE8F4FB",
  white: "FFFFFFFF",
  text: "FF1F2937",
  muted: "FF6B7280",
  border: "FFE4E7EC",
  sundayBg: "FFF3F4F6",
  sundayHeader: "FFD1D5DB",
  absentBg: "FFFECACA",
  absentHeader: "FFDC2626",
  absentText: "FF991B1B",
  presentBg: "FFD1FAE5",
  presentText: "FF047857",
  weekendPresentBg: "FF0F9D58",
  weekendPresentText: "FFFFFFFF",
  lateBg: "FFFEF3C7",
  lateText: "FFB45309",
  halfDayBg: "FFDBEAFE",
  halfDayText: "FF1D4ED8",
  shortLeaveBg: "FFF3E8FF",
  shortLeaveText: "FF7C3AED",
  leaveBg: "FFFCE7F3",
  leaveText: "FFBE185D",
  futureBg: "FFF9FAFB",
  weeklyOffBg: "FFE5E7EB",
};

const STATUS_STYLES: Record<
  string,
  { fill: string; font: string; label: string }
> = {
  present: { fill: PALETTE.presentBg, font: PALETTE.presentText, label: "Present" },
  late: { fill: PALETTE.lateBg, font: PALETTE.lateText, label: "Late" },
  absent: { fill: PALETTE.absentBg, font: PALETTE.absentText, label: "Absent" },
  half_day: { fill: PALETTE.halfDayBg, font: PALETTE.halfDayText, label: "Half day" },
  short_leave: {
    fill: PALETTE.shortLeaveBg,
    font: PALETTE.shortLeaveText,
    label: "Short leave",
  },
  leave: { fill: PALETTE.leaveBg, font: PALETTE.leaveText, label: "On leave" },
  on_leave: { fill: PALETTE.leaveBg, font: PALETTE.leaveText, label: "On leave" },
  weekly_off: {
    fill: PALETTE.weeklyOffBg,
    font: PALETTE.muted,
    label: "Weekly off",
  },
  future: { fill: PALETTE.futureBg, font: PALETTE.muted, label: "Future" },
  not_joined: { fill: PALETTE.futureBg, font: PALETTE.muted, label: "Not joined" },
  default: { fill: PALETTE.white, font: PALETTE.text, label: "N/A" },
};

function resolveStatusStyle(status: string | undefined) {
  const value = String(status || "").trim().toLowerCase();
  if (!value) return STATUS_STYLES.default;
  if (value.includes("weekly")) return STATUS_STYLES.weekly_off;
  if (value.includes("future")) return STATUS_STYLES.future;
  if (value.includes("not_joined")) return STATUS_STYLES.not_joined;
  if (value.includes("half")) return STATUS_STYLES.half_day;
  if (value.includes("short")) return STATUS_STYLES.short_leave;
  if (value.includes("leave")) return STATUS_STYLES.leave;
  if (value.includes("late")) return STATUS_STYLES.late;
  if (value.includes("absent")) return STATUS_STYLES.absent;
  if (value.includes("present")) return STATUS_STYLES.present;
  return STATUS_STYLES.default;
}

function formatStatusLabel(status: string | undefined) {
  return resolveStatusStyle(status).label;
}

function formatTime(value: string | undefined | null) {
  if (!value) return "—";
  const formatted = formatAttendanceTimeLocal(value);
  if (formatted === "—") return String(value);
  const timePart = formatted.includes("•")
    ? formatted.split("•").pop()?.trim()
    : formatted;
  if (!timePart) return formatted;
  const [hh, mm] = timePart.split(":");
  if (!hh || !mm) return timePart;
  const hour = Number(hh);
  const minute = Number(mm);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return timePart;
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

function formatWorkingHours(minutes: number | null | undefined) {
  if (!minutes || minutes <= 0) return "—";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function safeFileName(value: string) {
  return value.replace(/[<>:"/\\|?*]+/g, "_").trim() || "employee";
}

function monthKeyFromYmd(ymd: string) {
  return ymd.slice(0, 7);
}

function monthLabelFromKey(key: string) {
  const d = new Date(`${key}-01T12:00:00`);
  if (Number.isNaN(d.getTime())) return key;
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function groupDaysByMonth(days: CalendarDayExport[]) {
  const groups = new Map<string, CalendarDayExport[]>();
  for (const day of days) {
    const key = monthKeyFromYmd(day.date);
    const list = groups.get(key) ?? [];
    list.push(day);
    groups.set(key, list);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function thinBorder(color = PALETTE.border) {
  return {
    top: { style: "thin" as const, color: { argb: color } },
    left: { style: "thin" as const, color: { argb: color } },
    bottom: { style: "thin" as const, color: { argb: color } },
    right: { style: "thin" as const, color: { argb: color } },
  };
}

type ExcelCell = {
  font?: object;
  fill?: object;
  alignment?: object;
  border?: object;
};

function styleTitleCell(cell: ExcelCell, text: string) {
  cell.font = {
    name: FONT_FAMILY,
    bold: true,
    size: 18,
    color: { argb: PALETTE.brandDark },
  };
  cell.alignment = { vertical: "middle", horizontal: "left" };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: PALETTE.brandLight },
  };
  void text;
}

function styleSectionTitle(cell: ExcelCell) {
  cell.font = {
    name: FONT_FAMILY,
    bold: true,
    size: 12,
    color: { argb: PALETTE.brandDark },
  };
  cell.alignment = { vertical: "middle" };
}

function styleLabelCell(cell: ExcelCell) {
  cell.font = {
    name: FONT_FAMILY,
    bold: true,
    size: 10,
    color: { argb: PALETTE.muted },
  };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF9FAFB" },
  };
  cell.border = thinBorder();
}

function styleValueCell(cell: ExcelCell) {
  cell.font = { name: FONT_FAMILY, size: 10, color: { argb: PALETTE.text } };
  cell.border = thinBorder();
}

function stylePayrollValueCell(cell: ExcelCell, highlight = false) {
  cell.font = {
    name: FONT_FAMILY,
    bold: true,
    size: highlight ? 14 : 11,
    color: { argb: highlight ? PALETTE.brandDark : PALETTE.brand },
  };
  cell.border = thinBorder();
  cell.alignment = { vertical: "middle", horizontal: "center" };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: highlight ? PALETTE.brandLight : "FFF9FAFB" },
  };
}

function payrollFromCalendarDays(
  calendarDays: CalendarDayExport[],
  empCode?: string | null,
): PayrollExportSummary {
  return buildPayrollExportSummary(calendarDays, { empCode });
}

function formatPayableDaysFormula(
  payroll: PayrollExportSummary,
  sheetReport?: AttendanceSheetReport,
): string {
  if (sheetReport) {
    return formatSheetReportPayableFormula(sheetReport);
  }

  if (payroll.payrollExceptionApplied) {
    return `Month days (${payroll.workingDays}) − Absent (${payroll.absentDays}) = ${payroll.payDays} payable days — late & half day not deducted (special payroll rule)`;
  }

  return `Month days (${payroll.workingDays}) − Absent (${payroll.absentDays}) − Half day (${payroll.halfDayDays} × 0.5 = ${payroll.halfDayDeduction}) − Leave from lates (${payroll.leaveFromLates}) = ${payroll.payDays} payable days`;
}

function addGuideSheet(workbook: import("exceljs").Workbook) {
  const sheet = workbook.addWorksheet("How to read this report", {
    views: [{ state: "frozen", ySplit: 2 }],
  });
  sheet.columns = [{ width: 34 }, { width: 72 }];

  const titleRow = sheet.addRow(["Attendance report — quick guide"]);
  sheet.mergeCells(titleRow.number, 1, titleRow.number, 2);
  titleRow.height = 32;
  styleTitleCell(titleRow.getCell(1), "Guide");

  const rows: [string, string][] = [
    [
      "Days present (came to work)",
      "Count of weekdays when the employee came to office. Includes on-time, late, half day, and short leave. One day = one mark, regardless of how late they were.",
    ],
    [
      "Late arrivals",
      "Number of weekdays when check-in was after 9:45 AM. Shown separately from days present. Late with 8+ hours still counts as a full day.",
    ],
    [
      "Leave from lates",
      "For every 3 late arrivals in the month, 1 day is counted as leave (example: 5 lates → 1 leave).",
    ],
    [
      "Payable days",
      "Working days + Paid leaves + Weekly offs + Comp off balance − Late leave deduction (floor(lates ÷ 3)).",
    ],
    [
      "Working day credits",
      "Full day (present/late) = 1, Half day = 0.5, Short leave = 0.75. Working days can be decimals (e.g. 22.5, 25.75).",
    ],
    [
      "Half day in working days",
      "Each half day counts as 0.5 working day. Short leave counts as 0.75.",
    ],
    [
      "Working days (month total)",
      "All calendar days in this month (e.g. 30 for June). Includes Saturdays and Sundays. Future dates in the current month are excluded.",
    ],
    [
      "Absent",
      "Weekdays with no attendance and no approved weekly off.",
    ],
    [
      "Daily log — Came to work?",
      "Yes = employee checked in that day (any time). No = absent or weekly off without work.",
    ],
    [
      "Daily log — Was late?",
      "Yes when check-in was after 9:45 AM on a working day (including full-day attendance with 8+ hours).",
    ],
    [
      "Daily log — Half day?",
      "Yes when: check-in after 10:30 AM, check-out before 5:30 PM, worked under 8 hours, or 8+ hours but check-out not after 6:20 PM (and not in short-leave window). Each half day = 0.5 working day.",
    ],
    [
      "Daily log — Short leave?",
      "Yes when check-out is between 5:40 PM and 6:20 PM with 8+ hours worked. Counts as 0.75 working day.",
    ],
    [
      "Color coding",
      "Green = present, Orange = late, Red = absent, Blue = half day, Yellow = short leave, Grey = weekly off.",
    ],
    [
      "Special payroll employees",
      `${listPayrollExceptionEmpCodes().join(", ")} — ${PAYROLL_EXCEPTION_DESCRIPTION}`,
    ],
    [
      "Payroll day credit (special employees)",
      "On the daily log, attended weekdays count as Full day (payroll rule) even if the employee was late or on half day. Only absent days reduce payable days.",
    ],
    [
      "Two payroll sheets (special employees)",
      `Employees ${listPayrollExceptionEmpCodes().join(", ")} get two payroll summary sheets: (1) Special rule — only absent reduces pay; (2) Standard rules — normal late, half-day, and leave-from-lates calculations for comparison.`,
    ],
  ];

  for (const [label, value] of rows) {
    const row = sheet.addRow([label, value]);
    row.height = 42;
    styleLabelCell(row.getCell(1));
    const valueCell = row.getCell(2);
    styleValueCell(valueCell);
    valueCell.alignment = { vertical: "top", wrapText: true };
  }
}

function styleHeaderCell(cell: ExcelCell, fill = PALETTE.brand) {
  cell.font = {
    name: FONT_FAMILY,
    bold: true,
    size: 10,
    color: { argb: PALETTE.white },
  };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: fill },
  };
  cell.alignment = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true,
  };
  cell.border = thinBorder();
}

function getColumnFill(day: CalendarDayExport) {
  const isWeekend = dayIsWeekend(day);
  if (isWeekend) {
    if (hasAttendanceOnDay(day)) {
      return {
        fill: PALETTE.weekendPresentBg,
        header: PALETTE.weekendPresentBg,
        text: PALETTE.weekendPresentText,
      };
    }
    return { fill: PALETTE.weeklyOffBg, header: PALETTE.sundayHeader, text: PALETTE.muted };
  }
  if (day.is_absent) {
    return { fill: PALETTE.absentBg, header: PALETTE.absentHeader, text: PALETTE.absentText };
  }
  if (day.is_weekly_off) {
    return { fill: PALETTE.weeklyOffBg, header: PALETTE.sundayHeader, text: PALETTE.muted };
  }
  if (day.is_future) {
    return { fill: PALETTE.futureBg, header: PALETTE.sundayHeader, text: PALETTE.muted };
  }
  const style = resolveStatusStyle(day.attendance_status);
  return { fill: style.fill, header: PALETTE.brand, text: style.font };
}

function addDaysToYmd(ymd: string, days: number) {
  const d = new Date(`${ymd}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildCalendarDaysFromPayload(
  payload: AttendanceExportPayload,
  options?: ExportExcelOptions,
): CalendarDayExport[] {
  if (options?.clientSideCalculation) {
    return buildCalendarDaysFromPunches(
      payload.period.from_date,
      payload.period.to_date,
      payload.rows ?? [],
    );
  }

  if (payload.calendar_days?.length) {
    return payload.calendar_days.map((day) => {
      const mapped: CalendarDayExport = {
        date: day.date,
        day_name: day.day_name,
        day_short: day.day_short,
        is_sunday: day.is_sunday,
        is_weekend: day.is_weekend,
        is_weekly_off: day.is_weekly_off,
        is_future: day.is_future,
        is_absent: day.is_absent,
        is_late: day.is_late,
        check_in: day.check_in ?? null,
        check_out: day.check_out ?? null,
        attendance_status: day.attendance_status,
        stored_status: day.stored_status ?? null,
        working_time:
          day.working_time != null ? Number(day.working_time) : null,
        working_hours: day.working_hours ?? null,
      };
      return applyRulesToCalendarDay(mapped);
    });
  }

  const from = payload.period.from_date;
  const to = payload.period.to_date;
  const rowByDate = new Map(
    (payload.rows ?? []).map((row) => [String(row.attendance_date), row]),
  );
  const days: CalendarDayExport[] = [];
  let current = from;

  while (current <= to) {
    const d = new Date(`${current}T12:00:00`);
    const dayIndex = d.getDay();
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const record = rowByDate.get(current);
    const isSunday = dayIndex === 0;
    const isWeekend = isWeekendDay(dayIndex);

    days.push(
      applyRulesToCalendarDay({
        date: current,
        day_name: dayNames[dayIndex],
        day_short: dayNames[dayIndex].slice(0, 3),
        is_sunday: isSunday,
        is_weekend: isWeekend,
        is_weekly_off: isWeekend && !record,
        is_future: current > new Date().toISOString().slice(0, 10),
        is_absent: !record && !isWeekend,
        check_in: record?.check_in ?? null,
        check_out: record?.check_out ?? null,
        attendance_status:
          record?.attendance_status ?? (isWeekend ? "weekly_off" : "absent"),
        working_time: Number(record?.working_time ?? 0) || null,
      }),
    );

    current = addDaysToYmd(current, 1);
  }

  return days;
}

type PayrollSheetMode = "default" | "special" | "standard";

function addOverviewSheet(
  workbook: import("exceljs").Workbook,
  payload: AttendanceExportPayload,
  calendarDays: CalendarDayExport[],
  options?: {
    sheetName?: string;
    payroll?: PayrollExportSummary;
    sheetReport?: AttendanceSheetReport;
    mode?: PayrollSheetMode;
  },
) {
  const employee = payload.employee;
  const period = payload.period;
  const empCode = employee.emp_code || String(employee.user_id);
  const mode =
    options?.mode ??
    (isPayrollExceptionEmpCode(empCode) ? "special" : "default");
  const payroll =
    options?.payroll ??
    (options?.sheetReport
      ? payrollFromSheetReport(options.sheetReport)
      : payrollFromCalendarDays(calendarDays, empCode));
  const sheetReport = options?.sheetReport;
  const sheetTitleByMode: Record<PayrollSheetMode, string> = {
    default: "Employee attendance & payroll summary",
    special: "Employee attendance & payroll summary (special rule)",
    standard: "Employee attendance & payroll summary (standard rules)",
  };
  const sheetNameByMode: Record<PayrollSheetMode, string> = {
    default: "Payroll summary",
    special: "Payroll (special rule)",
    standard: "Payroll (standard rules)",
  };
  const sheet = workbook.addWorksheet(
    options?.sheetName ?? sheetNameByMode[mode],
    {
    views: [{ state: "frozen", ySplit: 3 }],
  },
  );

  sheet.columns = [
    { width: 14 },
    { width: 16 },
    { width: 14 },
    { width: 12 },
    { width: 14 },
    { width: 14 },
    { width: 12 },
    { width: 14 },
  ];

  const titleRow = sheet.addRow([sheetTitleByMode[mode]]);
  sheet.mergeCells(titleRow.number, 1, titleRow.number, 8);
  titleRow.height = 34;
  styleTitleCell(titleRow.getCell(1), "Employee Attendance Report");

  sheet.addRow([]);
  const infoTitle = sheet.addRow(["Employee information"]);
  sheet.mergeCells(infoTitle.number, 1, infoTitle.number, 8);
  styleSectionTitle(infoTitle.getCell(1));

  const infoRows: [string, string][] = [
    ["Employee name", employee.user_name],
    ["Employee code", employee.emp_code || String(employee.user_id)],
    ["Email", employee.user_email || "—"],
    ["Role", employee.user_role_name || "—"],
    ["Joined on", employee.joining_date || "—"],
    ["Report period", period.label],
    ["From", period.from_date],
    ["To", period.to_date],
  ];

  for (const [label, value] of infoRows) {
    const row = sheet.addRow([label, value]);
    styleLabelCell(row.getCell(1));
    styleValueCell(row.getCell(2));
    sheet.mergeCells(row.number, 2, row.number, 8);
  }

  if (mode === "special") {
    const exceptionRow = sheet.addRow([
      "Special payroll rule",
      PAYROLL_EXCEPTION_DESCRIPTION,
    ]);
    exceptionRow.height = 36;
    styleLabelCell(exceptionRow.getCell(1));
    const exceptionValue = exceptionRow.getCell(2);
    styleValueCell(exceptionValue);
    exceptionValue.alignment = { vertical: "top", wrapText: true };
    sheet.mergeCells(exceptionRow.number, 2, exceptionRow.number, 8);
  } else if (mode === "standard" && isPayrollExceptionEmpCode(empCode)) {
    const standardRow = sheet.addRow([
      "Standard rules comparison",
      "Same employee calculated with normal company rules: late arrivals, half-day deductions (×0.5), and leave from lates (every 3 lates = 1 leave) all apply.",
    ]);
    standardRow.height = 36;
    styleLabelCell(standardRow.getCell(1));
    const standardValue = standardRow.getCell(2);
    styleValueCell(standardValue);
    standardValue.alignment = { vertical: "top", wrapText: true };
    sheet.mergeCells(standardRow.number, 2, standardRow.number, 8);
  }

  sheet.addRow([]);
  const payrollTitle = sheet.addRow(["Key numbers for payroll (this period)"]);
  sheet.mergeCells(payrollTitle.number, 1, payrollTitle.number, 8);
  styleSectionTitle(payrollTitle.getCell(1));

  const payrollHeader = sheet.addRow([
    "Month days\n(full month)",
    "Days present\n(came to work)",
    "Late\narrivals",
    "Half\ndays",
    "Half day\ndeduct (×0.5)",
    "Leave from\nlates",
    "Absent\ndays",
    "Payable days",
  ]);
  payrollHeader.height = 40;
  payrollHeader.eachCell((cell) => styleHeaderCell(cell));

  const payrollValues = sheet.addRow([
    payroll.workingDays,
    payroll.daysPresent,
    payroll.lateDays,
    payroll.halfDayDays,
    payroll.halfDayDeduction,
    payroll.leaveFromLates,
    payroll.absentDays,
    payroll.payDays,
  ]);
  payrollValues.height = 32;
  payrollValues.eachCell((cell, colNumber) => {
    stylePayrollValueCell(cell, colNumber === 2 || colNumber === 4 || colNumber === 8);
  });

  sheet.addRow([]);
  const formulaRow = sheet.addRow([
    "How payable days are calculated:",
    formatPayableDaysFormula(payroll, sheetReport),
  ]);
  sheet.mergeCells(formulaRow.number, 2, formulaRow.number, 8);
  styleLabelCell(formulaRow.getCell(1));
  styleValueCell(formulaRow.getCell(2));
  formulaRow.getCell(2).alignment = { wrapText: true, vertical: "middle" };

  sheet.addRow([]);
  const detailTitle = sheet.addRow(["Additional breakdown"]);
  sheet.mergeCells(detailTitle.number, 1, detailTitle.number, 8);
  styleSectionTitle(detailTitle.getCell(1));

  const detailRows: [string, string | number][] = sheetReport
    ? [
        ["Attendance working days (full=1, half=0.5, short leave=0.75)", sheetReport.working_days],
        ["Paid leaves (approved)", sheetReport.paid_leaves],
        ["Unpaid leaves (approved)", sheetReport.unpaid_leaves],
        ["Half day leaves (approved)", sheetReport.half_day_leaves],
        ["Weekly offs", sheetReport.weekly_offs ?? sheetReport.weekly_off_days ?? 0],
        ["Comp off balance", sheetReport.comp_off_balance],
        ["Late marks", sheetReport.late_marks],
        ["Late leave deduction (floor(lates ÷ 3))", sheetReport.late_leave_deduction],
        ["Short leave (attendance)", sheetReport.short_leaves],
        ["Total hours worked", `${sheetReport.total_working_hours}h`],
      ]
    : [
        ["On-time arrivals only (by 9:45 AM)", payroll.onTimeDays],
        ["Half days (count)", payroll.halfDayDays],
        ["Half day pay deduction (days × 0.5)", payroll.halfDayDeduction],
        ["Short leave", payroll.shortLeaveDays],
        ["Saturday / Sunday (weekly off)", payroll.weeklyOffDays],
        ["Total hours worked", `${payroll.totalWorkingHours}h`],
      ];

  for (const [label, value] of detailRows) {
    const row = sheet.addRow([label, value]);
    styleLabelCell(row.getCell(1));
    styleValueCell(row.getCell(2));
    sheet.mergeCells(row.number, 2, row.number, 8);
  }

  sheet.addRow([]);
  const rulesTitle = sheet.addRow(["Company attendance rules"]);
  sheet.mergeCells(rulesTitle.number, 1, rulesTitle.number, 8);
  styleSectionTitle(rulesTitle.getCell(1));

  for (const rule of ATTENDANCE_RULE_LABELS) {
    const row = sheet.addRow([rule.label, rule.value]);
    styleLabelCell(row.getCell(1));
    styleValueCell(row.getCell(2));
    sheet.mergeCells(row.number, 2, row.number, 8);
  }

  sheet.addRow([]);
  const legendTitle = sheet.addRow(["Color legend (daily sheets)"]);
  sheet.mergeCells(legendTitle.number, 1, legendTitle.number, 8);
  styleSectionTitle(legendTitle.getCell(1));

  const legendItems = [
    ["Did not come (absent)", PALETTE.absentBg, PALETTE.absentText],
    ["Saturday / Sunday off", PALETTE.weeklyOffBg, PALETTE.muted],
    ["Worked on weekend", PALETTE.weekendPresentBg, PALETTE.weekendPresentText],
    ["Came on time", PALETTE.presentBg, PALETTE.presentText],
    ["Came late", PALETTE.lateBg, PALETTE.lateText],
    ["Half day", PALETTE.halfDayBg, PALETTE.halfDayText],
    ["Short leave", PALETTE.shortLeaveBg, PALETTE.shortLeaveText],
  ];

  for (const [label, fill, font] of legendItems) {
    const row = sheet.addRow([label, "Sample"]);
    styleLabelCell(row.getCell(1));
    const sample = row.getCell(2);
    sample.font = { name: FONT_FAMILY, bold: true, size: 10, color: { argb: font } };
    sample.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
    sample.border = thinBorder();
    sample.alignment = { horizontal: "center" };
  }
}

function addCalendarSheet(
  workbook: import("exceljs").Workbook,
  sheetName: string,
  monthLabel: string,
  days: CalendarDayExport[],
  empCode?: string | null,
) {
  const payrollExceptionApplied = isPayrollExceptionEmpCode(empCode);
  const sheet = workbook.addWorksheet(sheetName.slice(0, 31), {
    views: [{ state: "frozen", xSplit: 1, ySplit: 4 }],
  });

  const titleRow = sheet.addRow([`${monthLabel} — Daily attendance`]);
  sheet.mergeCells(titleRow.number, 1, titleRow.number, days.length + 1);
  titleRow.height = 28;
  styleTitleCell(titleRow.getCell(1), monthLabel);

  sheet.addRow([]);

  const headerRow = sheet.addRow([
    "",
    ...days.map((day) => {
      const dateNum = Number(day.date.slice(8, 10));
      return `${day.day_name}\n${dateNum}`;
    }),
  ]);
  headerRow.height = 36;
  headerRow.getCell(1).value = "Metric";
  styleHeaderCell(headerRow.getCell(1));

  days.forEach((day, index) => {
    const cell = headerRow.getCell(index + 2);
    const colors = getColumnFill(day);
    styleHeaderCell(cell, colors.header);
    if (day.is_absent && !dayIsWeekend(day)) {
      cell.font = {
        name: FONT_FAMILY,
        bold: true,
        size: 10,
        color: { argb: PALETTE.white },
      };
    } else if (dayIsWeekend(day) && !hasAttendanceOnDay(day)) {
      cell.font = {
        name: FONT_FAMILY,
        bold: true,
        size: 10,
        color: { argb: PALETTE.text },
      };
    }
  });

  const metricRows: Array<{
    label: string;
    values: (string | number)[];
    bold?: boolean;
  }> = [
    {
      label: "Day",
      values: days.map((day) => day.day_short),
    },
    {
      label: "Date",
      values: days.map((day) => day.date),
    },
    {
      label: "Check in",
      values: days.map((day) => formatTime(day.check_in)),
    },
    {
      label: "Check out",
      values: days.map((day) => formatTime(day.check_out)),
    },
    {
      label: "Result",
      values: days.map((day) => plainAttendanceResult(day)),
      bold: true,
    },
    {
      label: "Came to work?",
      values: days.map((day) => (dayCameToWork(day) ? "Yes" : "No")),
    },
    {
      label: "Was late?",
      values: days.map((day) => (dayWasLate(day) ? "Yes" : "No")),
    },
    {
      label: "Half day?",
      values: days.map((day) => (dayWasHalfDay(day) ? "Yes" : "No")),
    },
    ...(payrollExceptionApplied
      ? [
          {
            label: "Payroll day credit",
            values: days.map((day) => payrollDayCreditLabel(day, empCode)),
            bold: true,
          },
        ]
      : []),
    {
      label: "Working hours",
      values: days.map((day) => formatWorkingHours(day.working_time)),
    },
  ];

  for (const metric of metricRows) {
    const row = sheet.addRow([metric.label, ...metric.values]);
    row.height = 22;
    const labelCell = row.getCell(1);
    styleLabelCell(labelCell);
    labelCell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };

    days.forEach((day, index) => {
      const cell = row.getCell(index + 2);
      const colors = getColumnFill(day);
      const statusStyle = resolveStatusStyle(day.attendance_status);

      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb:
            day.is_absent && !dayIsWeekend(day)
              ? PALETTE.absentBg
              : metric.label === "Status" || metric.label === "Result"
                ? statusStyle.fill
                : colors.fill,
        },
      };
      cell.font = {
        name: FONT_FAMILY,
        size: 10,
        bold: metric.bold || (day.is_absent && !dayIsWeekend(day)),
        color: {
          argb:
            day.is_absent && !dayIsWeekend(day)
              ? PALETTE.absentText
              : metric.label === "Status" || metric.label === "Result"
                ? statusStyle.font
                : colors.text,
        },
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true,
      };
      cell.border = thinBorder();
    });
  }

  sheet.getColumn(1).width = 16;
  for (let i = 0; i < days.length; i += 1) {
    sheet.getColumn(i + 2).width = 14;
  }
}

function addDailyLogSheet(
  workbook: import("exceljs").Workbook,
  calendarDays: CalendarDayExport[],
  empCode?: string | null,
) {
  const payrollExceptionApplied = isPayrollExceptionEmpCode(empCode);
  const sheet = workbook.addWorksheet("Daily log", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = [
    { width: 14 },
    { width: 14 },
    { width: 12 },
    { width: 14 },
    { width: 14 },
    { width: 12 },
    { width: 12 },
    { width: 22 },
    ...(payrollExceptionApplied ? [{ width: 22 }] : []),
    { width: 14 },
    { width: 12 },
    { width: 14 },
    { width: 28 },
  ];

  const header = sheet.addRow([
    "Date",
    "Day",
    "Check in",
    "Check out",
    "Came to work?",
    "Was late?",
    "Half day?",
    "Attendance result",
    ...(payrollExceptionApplied ? ["Payroll day credit"] : []),
    "Hours worked",
    "Status code",
    "Notes",
  ]);
  header.height = 24;
  header.eachCell((cell) => styleHeaderCell(cell));

  for (const day of calendarDays) {
    if (day.attendance_status === "future" || day.attendance_status === "not_joined") {
      continue;
    }

    const note = dayIsWeekend(day)
      ? hasAttendanceOnDay(day)
        ? "Worked on weekly off"
        : "Weekly off"
      : day.is_absent
        ? "Absent — no attendance record"
        : "";

    const row = sheet.addRow([
      day.date,
      day.day_name,
      formatTime(day.check_in),
      formatTime(day.check_out),
      dayCameToWork(day) ? "Yes" : "No",
      dayWasLate(day) ? "Yes" : "No",
      dayWasHalfDay(day) ? "Yes" : "No",
      plainAttendanceResult(day),
      ...(payrollExceptionApplied
        ? [payrollDayCreditLabel(day, empCode)]
        : []),
      formatWorkingHours(day.working_time),
      formatStatusLabel(day.attendance_status),
      note,
    ]);
    row.height = 20;

    const statusStyle = resolveStatusStyle(day.attendance_status);
    const resultCol = 8;
    const statusCol = payrollExceptionApplied ? 11 : 10;
    row.eachCell((cell, colNumber) => {
      const isAbsentWeekday = day.is_absent && !dayIsWeekend(day);
      const isWeekendOff = dayIsWeekend(day) && !hasAttendanceOnDay(day);
      const isWeekendPresent = dayIsWeekend(day) && hasAttendanceOnDay(day);
      cell.border = thinBorder();
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.font = {
        name: FONT_FAMILY,
        size: 10,
        color: {
          argb: isAbsentWeekday
            ? PALETTE.absentText
            : colNumber === resultCol || colNumber === statusCol
              ? statusStyle.font
              : PALETTE.text,
        },
        bold: colNumber === resultCol || colNumber === statusCol || isAbsentWeekday,
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: isAbsentWeekday
            ? PALETTE.absentBg
            : isWeekendPresent
              ? PALETTE.weekendPresentBg
              : isWeekendOff
                ? PALETTE.weeklyOffBg
                : colNumber === resultCol || colNumber === statusCol
                  ? statusStyle.fill
                  : PALETTE.white,
        },
      };
    });
  }
}

export async function downloadAttendanceHistoryExcel(
  payload: AttendanceExportPayload,
  options?: ExportExcelOptions,
) {
  const employee = payload.employee ?? {
    user_id: "",
    user_name: "Employee",
    user_email: "",
    user_phone: "",
    user_role_name: "",
    emp_code: "",
    joining_date: "",
  };
  const period = payload.period ?? {
    mode: "monthly" as const,
    from_date: "",
    to_date: "",
    label: "Attendance export",
  };

  const calendarDays = buildCalendarDaysFromPayload(payload, options);
  const empCode = employee.emp_code;
  const isSpecial = isPayrollExceptionEmpCode(empCode);
  const sheetReport = !isSpecial ? payload.sheet_report : undefined;

  const exportPayload: AttendanceExportPayload = {
    ...payload,
    summary: payload.summary ?? summarizeCalendarDaysClient(calendarDays),
    calendar_days: calendarDays,
  };

  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Attendance Portal";
  workbook.created = new Date();

  addGuideSheet(workbook);

  if (isSpecial) {
    addOverviewSheet(workbook, exportPayload, calendarDays, {
      mode: "special",
      payroll: buildPayrollExportSummary(calendarDays, { empCode }),
    });
    addOverviewSheet(workbook, exportPayload, calendarDays, {
      mode: "standard",
      payroll: buildPayrollExportSummary(calendarDays, {
        empCode,
        forceStandardRules: true,
      }),
    });
  } else {
    addOverviewSheet(workbook, exportPayload, calendarDays, {
      sheetReport,
      payroll: sheetReport
        ? payrollFromSheetReport(sheetReport)
        : buildPayrollExportSummary(calendarDays, { empCode }),
    });
  }

  const monthGroups = groupDaysByMonth(calendarDays);
  for (const [monthKey, days] of monthGroups) {
    const label = monthLabelFromKey(monthKey);
    const sheetName = label.replace(/\s+/g, " ");
    addCalendarSheet(workbook, sheetName, label, days, employee.emp_code);
  }

  addDailyLogSheet(workbook, calendarDays, employee.emp_code);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const fromDate = period.from_date || "export";
  const periodSlug =
    period.mode === "monthly" && fromDate.length >= 7
      ? fromDate.slice(0, 7)
      : "full-history";
  anchor.href = url;
  anchor.download = `${safeFileName(employee.user_name)}_attendance_${periodSlug}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export type PreparedEmployeeExport = {
  employee: AttendanceExportPayload["employee"];
  period: AttendanceExportPayload["period"];
  summary: AttendanceExportSummary;
  calendarDays: CalendarDayExport[];
  payroll: PayrollExportSummary;
  /** Standard-rules payroll for special employees (comparison sheet). */
  payrollStandard?: PayrollExportSummary;
  sheetReport?: AttendanceSheetReport;
};

export function prepareEmployeeExportPayload(
  payload: AttendanceExportPayload,
  options?: ExportExcelOptions,
): PreparedEmployeeExport {
  const calendarDays = buildCalendarDaysFromPayload(payload, options);
  const summary = payload.summary ?? summarizeCalendarDaysClient(calendarDays);

  const empCode = payload.employee.emp_code;
  const isSpecial = isPayrollExceptionEmpCode(empCode);
  const sheetReport = !isSpecial ? payload.sheet_report : undefined;
  const payroll = sheetReport
    ? payrollFromSheetReport(sheetReport)
    : buildPayrollExportSummary(calendarDays, { empCode });
  const payrollStandard = isSpecial
    ? buildPayrollExportSummary(calendarDays, {
        empCode,
        forceStandardRules: true,
      })
    : undefined;

  return {
    employee: payload.employee,
    period: payload.period,
    summary,
    calendarDays,
    payroll,
    payrollStandard,
    sheetReport,
  };
}

function addAllEmployeesSummarySheet(
  workbook: import("exceljs").Workbook,
  entries: PreparedEmployeeExport[],
  meta: {
    periodLabel: string;
    fromDate: string;
    toDate: string;
    filterDescription: string;
  },
  options?: {
    sheetName?: string;
    title?: string;
    tableTitle?: string;
    payrollResolver?: (entry: PreparedEmployeeExport) => PayrollExportSummary;
    formulaNote?: string;
    showSpecialPayrollColumn?: boolean;
  },
) {
  const showSpecialColumn = options?.showSpecialPayrollColumn ?? true;
  const sheet = workbook.addWorksheet(
    options?.sheetName ?? "All employees payroll",
    {
    views: [{ state: "frozen", ySplit: 5 }],
  },
  );

  sheet.columns = [
    { width: 12 },
    { width: 24 },
    { width: 26 },
    { width: 14 },
    { width: 12 },
    { width: 14 },
    { width: 12 },
    { width: 12 },
    { width: 10 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 14 },
    { width: 12 },
    { width: 12 },
    { width: 10 },
  ];

  const titleRow = sheet.addRow([
    options?.title ?? "All employees — attendance & payroll summary",
  ]);
  sheet.mergeCells(titleRow.number, 1, titleRow.number, 17);
  titleRow.height = 34;
  styleTitleCell(titleRow.getCell(1), "All employees attendance report");

  sheet.addRow([]);
  const metaRows: [string, string][] = [
    ["Report period", meta.periodLabel],
    ["From", meta.fromDate],
    ["To", meta.toDate],
    ["List filters applied", meta.filterDescription],
    [
      "Payable days formula",
      options?.formulaNote ??
        "Month days − Absent weekdays − (Half days × 0.5) − Leave from lates (every 3 lates = 1 leave). Special payroll employees: Month days − Absent only.",
    ],
    ...(showSpecialColumn
      ? [
          [
            "Special payroll employees",
            `${listPayrollExceptionEmpCodes().join(", ")} — ${PAYROLL_EXCEPTION_DESCRIPTION}`,
          ] as [string, string],
        ]
      : []),
  ];
  for (const [label, value] of metaRows) {
    const row = sheet.addRow([label, value]);
    styleLabelCell(row.getCell(1));
    styleValueCell(row.getCell(2));
    sheet.mergeCells(row.number, 2, row.number, 17);
  }

  sheet.addRow([]);
  const tableTitle = sheet.addRow([
    options?.tableTitle ?? "Employee payroll summary",
  ]);
  sheet.mergeCells(tableTitle.number, 1, tableTitle.number, 17);
  styleSectionTitle(tableTitle.getCell(1));

  const header = sheet.addRow([
    "Emp code",
    "Employee name",
    "Email",
    "Role",
    "Month days\n(full month)",
    "Days present\n(came to work)",
    "Late\narrivals",
    "On-time\nonly",
    "Half\ndays",
    "Half day\ndeduct",
    "Short\nleave",
    "Absent\ndays",
    "Leave from\nlates",
    "Payable\ndays",
    "Total\nhours",
    ...(showSpecialColumn ? ["Special\npayroll"] : []),
  ]);
  header.height = 44;
  header.eachCell((cell) => styleHeaderCell(cell));

  let totals = {
    workingDays: 0,
    daysPresent: 0,
    lateDays: 0,
    onTimeDays: 0,
    halfDayDays: 0,
    halfDayDeduction: 0,
    shortLeaveDays: 0,
    absentDays: 0,
    leaveFromLates: 0,
    payDays: 0,
    totalHours: 0,
  };

  const resolvePayroll =
    options?.payrollResolver ?? ((entry: PreparedEmployeeExport) => entry.payroll);

  for (const entry of entries) {
    const { employee } = entry;
    const payroll = resolvePayroll(entry);

    totals.workingDays += payroll.workingDays;
    totals.daysPresent += payroll.daysPresent;
    totals.lateDays += payroll.lateDays;
    totals.onTimeDays += payroll.onTimeDays;
    totals.halfDayDays += payroll.halfDayDays;
    totals.halfDayDeduction += payroll.halfDayDeduction;
    totals.shortLeaveDays += payroll.shortLeaveDays;
    totals.absentDays += payroll.absentDays;
    totals.leaveFromLates += payroll.leaveFromLates;
    totals.payDays += payroll.payDays;
    totals.totalHours += payroll.totalWorkingHours;

    const row = sheet.addRow([
      employee.emp_code || String(employee.user_id),
      employee.user_name,
      employee.user_email || "—",
      employee.user_role_name || "—",
      payroll.workingDays,
      payroll.daysPresent,
      payroll.lateDays,
      payroll.onTimeDays,
      payroll.halfDayDays,
      payroll.halfDayDeduction,
      payroll.shortLeaveDays,
      payroll.absentDays,
      payroll.leaveFromLates,
      payroll.payDays,
      payroll.totalWorkingHours,
      ...(showSpecialColumn
        ? [payroll.payrollExceptionApplied ? "Yes" : "No"]
        : []),
    ]);
    row.height = 22;
    row.eachCell((cell, colNumber) => {
      cell.border = thinBorder();
      cell.alignment = { vertical: "middle", horizontal: colNumber >= 5 ? "center" : "left", wrapText: true };
      cell.font = {
        name: FONT_FAMILY,
        size: 10,
        color: {
          argb:
            colNumber === 6 || colNumber === 9 || colNumber === 15
              ? PALETTE.brandDark
              : PALETTE.text,
        },
        bold: colNumber === 6 || colNumber === 9 || colNumber === 15,
      };
      if (colNumber === 6 || colNumber === 9 || colNumber === 15) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: PALETTE.brandLight },
        };
      }
    });
  }

  if (entries.length > 0) {
    const totalsRow = sheet.addRow([
      "TOTALS",
      `${entries.length} employees`,
      "",
      "",
      totals.workingDays,
      totals.daysPresent,
      totals.lateDays,
      totals.onTimeDays,
      totals.halfDayDays,
      Math.round(totals.halfDayDeduction * 100) / 100,
      totals.shortLeaveDays,
      totals.absentDays,
      totals.leaveFromLates,
      Math.round(totals.payDays * 100) / 100,
      Math.round(totals.totalHours * 100) / 100,
      ...(showSpecialColumn ? [""] : []),
    ]);
    totalsRow.height = 24;
    totalsRow.eachCell((cell, colNumber) => {
      cell.border = thinBorder();
      cell.alignment = { vertical: "middle", horizontal: colNumber >= 5 ? "center" : "left" };
      cell.font = {
        name: FONT_FAMILY,
        size: 10,
        bold: true,
        color: { argb: PALETTE.brandDark },
      };
      if (colNumber >= 5) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE5E7EB" },
        };
      }
    });
  }
}

function addAllEmployeesDailyLogSheet(
  workbook: import("exceljs").Workbook,
  entries: PreparedEmployeeExport[],
) {
  const sheet = workbook.addWorksheet("Daily log (all)", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = [
    { width: 12 },
    { width: 22 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 22 },
    { width: 22 },
    { width: 14 },
    { width: 12 },
    { width: 24 },
  ];

  const header = sheet.addRow([
    "Emp code",
    "Employee name",
    "Date",
    "Day",
    "Check in",
    "Check out",
    "Came to work?",
    "Was late?",
    "Half day?",
    "Attendance result",
    "Payroll day credit",
    "Hours worked",
    "Status code",
    "Notes",
  ]);
  header.height = 24;
  header.eachCell((cell) => styleHeaderCell(cell));

  for (const entry of entries) {
    const empCode = entry.employee.emp_code || String(entry.employee.user_id);
    const empName = entry.employee.user_name;

    for (const day of entry.calendarDays) {
      if (day.attendance_status === "future" || day.attendance_status === "not_joined") {
        continue;
      }

      const note = dayIsWeekend(day)
        ? hasAttendanceOnDay(day)
          ? "Worked on weekly off"
          : "Weekly off"
        : day.is_absent
          ? "Absent — no attendance record"
          : "";

      const row = sheet.addRow([
        empCode,
        empName,
        day.date,
        day.day_name,
        formatTime(day.check_in),
        formatTime(day.check_out),
        dayCameToWork(day) ? "Yes" : "No",
        dayWasLate(day) ? "Yes" : "No",
        dayWasHalfDay(day) ? "Yes" : "No",
        plainAttendanceResult(day),
        payrollDayCreditLabel(day, empCode) || plainAttendanceResult(day),
        formatWorkingHours(day.working_time),
        formatStatusLabel(day.attendance_status),
        note,
      ]);
      row.height = 20;

      const statusStyle = resolveStatusStyle(day.attendance_status);
      row.eachCell((cell, colNumber) => {
        const isAbsentWeekday = day.is_absent && !dayIsWeekend(day);
        const isWeekendOff = dayIsWeekend(day) && !hasAttendanceOnDay(day);
        const isWeekendPresent = dayIsWeekend(day) && hasAttendanceOnDay(day);
        cell.border = thinBorder();
        cell.alignment = { vertical: "middle", wrapText: true };
        cell.font = {
          name: FONT_FAMILY,
          size: 10,
          color: {
            argb: isAbsentWeekday
              ? PALETTE.absentText
              : colNumber === 10 || colNumber === 12
                ? statusStyle.font
                : PALETTE.text,
          },
          bold: colNumber === 10 || colNumber === 12 || isAbsentWeekday,
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: isAbsentWeekday
              ? PALETTE.absentBg
              : isWeekendPresent
                ? PALETTE.weekendPresentBg
                : isWeekendOff
                  ? PALETTE.weeklyOffBg
                  : colNumber === 10 || colNumber === 12
                    ? statusStyle.fill
                    : PALETTE.white,
          },
        };
      });
    }
  }
}

export async function downloadAllEmployeesAttendanceExcel(
  entries: PreparedEmployeeExport[],
  meta: {
    periodLabel: string;
    fromDate: string;
    toDate: string;
    filterDescription: string;
    fileSlug: string;
  },
) {
  if (!entries.length) {
    throw new Error("No employees to export.");
  }

  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Attendance Portal";
  workbook.created = new Date();

  addGuideSheet(workbook);

  const exceptionEntries = entries.filter((entry) =>
    isPayrollExceptionEmpCode(entry.employee.emp_code),
  );
  const regularEntries = entries.filter(
    (entry) => !isPayrollExceptionEmpCode(entry.employee.emp_code),
  );

  if (exceptionEntries.length > 0) {
    addAllEmployeesSummarySheet(workbook, exceptionEntries, meta, {
      sheetName: "Payroll (special rule)",
      title: "Special employees — payroll (special rule)",
      tableTitle: "Special payroll employees — special rule applied",
      formulaNote:
        "Month days − Absent only. Late and half-day do not reduce payable days.",
      showSpecialPayrollColumn: false,
    });
    addAllEmployeesSummarySheet(workbook, exceptionEntries, meta, {
      sheetName: "Payroll (standard rules)",
      title: "Special employees — payroll (standard rules)",
      tableTitle: "Standard company rules (for comparison)",
      payrollResolver: (entry) =>
        entry.payrollStandard ??
        buildPayrollExportSummary(entry.calendarDays, {
          empCode: entry.employee.emp_code,
          forceStandardRules: true,
        }),
      formulaNote:
        "Month days − Absent weekdays − (Half days × 0.5) − Leave from lates (every 3 lates = 1 leave).",
      showSpecialPayrollColumn: false,
    });
  }

  if (regularEntries.length > 0) {
    addAllEmployeesSummarySheet(workbook, regularEntries, meta, {
      sheetName:
        exceptionEntries.length > 0
          ? "All other employees payroll"
          : "All employees payroll",
      formulaNote:
        "Working days + Paid leaves + Weekly offs + Comp off balance − Late leave deduction (floor(lates ÷ 3)).",
    });
  }

  addAllEmployeesDailyLogSheet(workbook, entries);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `all_employees_attendance_${meta.fileSlug}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export type { AttendanceExportPayload };
