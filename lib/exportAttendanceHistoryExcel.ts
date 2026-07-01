import type { AttendanceExportPayload } from "@/services/attendanceHistory";
import {
  applyRulesToCalendarDay,
  ATTENDANCE_RULE_LABELS,
  buildCalendarDaysFromPunches,
  dayIsWeekend,
  hasAttendanceOnDay,
  isWeekendDay,
  summarizeCalendarDaysClient,
  type CalendarDayExport,
} from "@/lib/attendanceRules";

export type ExportExcelOptions = {
  /** When true, status/summary are derived from check-in/check-out only (company rules). */
  clientSideCalculation?: boolean;
};

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
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
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
    return payload.calendar_days.map(applyRulesToCalendarDay);
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

function addOverviewSheet(
  workbook: import("exceljs").Workbook,
  payload: AttendanceExportPayload,
  calendarDays: CalendarDayExport[],
) {
  const employee = payload.employee;
  const period = payload.period;
  const summary = payload.summary;
  const sheet = workbook.addWorksheet("Overview", {
    views: [{ state: "frozen", ySplit: 3 }],
  });

  sheet.columns = [
    { width: 28 },
    { width: 34 },
    { width: 22 },
    { width: 22 },
  ];

  const titleRow = sheet.addRow(["Employee Attendance Report"]);
  sheet.mergeCells(titleRow.number, 1, titleRow.number, 4);
  titleRow.height = 34;
  styleTitleCell(titleRow.getCell(1), "Employee Attendance Report");

  sheet.addRow([]);
  const infoTitle = sheet.addRow(["Employee information"]);
  sheet.mergeCells(infoTitle.number, 1, infoTitle.number, 4);
  styleSectionTitle(infoTitle.getCell(1));

  const infoRows: [string, string][] = [
    ["Employee name", employee.user_name],
    ["Employee code", employee.emp_code || String(employee.user_id)],
    ["Portal user ID", String(employee.user_id)],
    ["Email", employee.user_email || "—"],
    ["Phone", employee.user_phone || "—"],
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
  }

  sheet.addRow([]);
  const summaryTitle = sheet.addRow(["Attendance summary"]);
  sheet.mergeCells(summaryTitle.number, 1, summaryTitle.number, 4);
  styleSectionTitle(summaryTitle.getCell(1));

  const summaryRows: [string, string | number][] = [
    ["Working days in period", summary.total_days],
    ["Present", summary.present_days],
    ["Late (raw count)", summary.late_days],
    [
      "Leave from lates (floor(lates ÷ 3))",
      summary.late_derived_leaves ?? summary.on_leave_days ?? 0,
    ],
    ["Absent (weekdays only)", summary.absent_days],
    [
      "Total absent incl. leave from lates",
      summary.total_absent_with_late_leaves ??
        summary.absent_days + (summary.late_derived_leaves ?? summary.on_leave_days ?? 0),
    ],
    ["Half day", summary.half_day_days],
    ["Short leave", summary.short_leave_days],
    ["Sat / Sun (week off)", summary.weekly_off_days ?? calendarDays.filter((d) => dayIsWeekend(d) && !hasAttendanceOnDay(d)).length],
    ["Total working hours", `${summary.total_working_hours}h`],
  ];

  for (const [label, value] of summaryRows) {
    const row = sheet.addRow([label, value]);
    styleLabelCell(row.getCell(1));
    const valueCell = row.getCell(2);
    styleValueCell(valueCell);
    valueCell.font = {
      name: FONT_FAMILY,
      bold: true,
      size: 10,
      color: { argb: PALETTE.brand },
    };
  }

  sheet.addRow([]);
  const rulesTitle = sheet.addRow(["Company attendance rules"]);
  sheet.mergeCells(rulesTitle.number, 1, rulesTitle.number, 4);
  styleSectionTitle(rulesTitle.getCell(1));

  for (const rule of ATTENDANCE_RULE_LABELS) {
    const row = sheet.addRow([rule.label, rule.value]);
    styleLabelCell(row.getCell(1));
    styleValueCell(row.getCell(2));
  }

  sheet.addRow([]);
  const legendTitle = sheet.addRow(["Color legend"]);
  sheet.mergeCells(legendTitle.number, 1, legendTitle.number, 4);
  styleSectionTitle(legendTitle.getCell(1));

  const legendItems = [
  ["Absent (weekday)", PALETTE.absentBg, PALETTE.absentText],
  ["Sat / Sun week off", PALETTE.weeklyOffBg, PALETTE.muted],
  ["Present on weekend", PALETTE.weekendPresentBg, PALETTE.weekendPresentText],
  ["Present", PALETTE.presentBg, PALETTE.presentText],
  ["Late", PALETTE.lateBg, PALETTE.lateText],
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
) {
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
      label: "Status",
      values: days.map((day) => formatStatusLabel(day.attendance_status)),
      bold: true,
    },
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
              : metric.label === "Status"
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
              : metric.label === "Status"
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
) {
  const sheet = workbook.addWorksheet("Daily log", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = [
    { width: 14 },
    { width: 14 },
    { width: 12 },
    { width: 14 },
    { width: 14 },
    { width: 16 },
    { width: 14 },
  ];

  const header = sheet.addRow([
    "Date",
    "Day",
    "Check in",
    "Check out",
    "Status",
    "Working hours",
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
      formatStatusLabel(day.attendance_status),
      formatWorkingHours(day.working_time),
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
            : colNumber === 5
              ? statusStyle.font
              : PALETTE.text,
        },
        bold: colNumber === 5 || isAbsentWeekday,
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
                : colNumber === 5
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
  const exportPayload: AttendanceExportPayload = options?.clientSideCalculation
    ? {
        ...payload,
        summary: summarizeCalendarDaysClient(calendarDays),
        calendar_days: calendarDays,
      }
    : payload;

  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Attendance Portal";
  workbook.created = new Date();

  addOverviewSheet(workbook, exportPayload, calendarDays);

  const monthGroups = groupDaysByMonth(calendarDays);
  for (const [monthKey, days] of monthGroups) {
    const label = monthLabelFromKey(monthKey);
    const sheetName = label.replace(/\s+/g, " ");
    addCalendarSheet(workbook, sheetName, label, days);
  }

  addDailyLogSheet(workbook, calendarDays);

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

export type { AttendanceExportPayload };
