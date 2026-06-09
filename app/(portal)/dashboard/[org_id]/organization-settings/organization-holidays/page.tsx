"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Calendar from "react-calendar";
import {
  CalendarDays,
  Search,
  Loader2,
  AlertCircle,
  Pencil,
  Trash2,
  X,
  Building2,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CalendarCheck,
  CalendarOff,
  TrendingUp,
  Filter,
  Info,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import {
  createCompanyHoliday,
  deleteCompanyHoliday,
  getCompanyHolidays,
  type CompanyHolidayRow,
  updateCompanyHoliday,
} from "@/services/organizationSettings";

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

function toYmdFromDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizeDateOnly(value: string | null | undefined) {
  if (!value) return "";
  const s = String(value).trim();
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return m ? m[1] : "";
}

function formatYmdPretty(ymd: string) {
  const clean = normalizeDateOnly(ymd);
  if (!clean) return "Invalid date";
  const d = new Date(`${clean}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatMonthLabel(monthIndex: number) {
  const d = new Date(new Date().getFullYear(), monthIndex, 1);
  return d.toLocaleDateString(undefined, { month: "long" });
}

function dateBlock(ymd: string) {
  const clean = normalizeDateOnly(ymd);
  if (!clean) {
    return { day: "--", mon: "---", year: "----" };
  }
  const d = new Date(`${clean}T00:00:00`);
  return {
    day: String(d.getDate()).padStart(2, "0"),
    mon: d.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
    year: String(d.getFullYear()),
  };
}

function zohoSearchCls() {
  return "w-full rounded-lg border border-[#E4E7EC] bg-white py-2.5 pl-10 pr-4 text-[15px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15 lg:text-sm";
}

function zohoInputCls() {
  return "w-full rounded-lg border border-[#E4E7EC] bg-white px-3.5 py-2.5 text-[15px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15 lg:text-sm";
}

function zohoPrimaryBtnCls(full = false) {
  return `inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-[#008CD3] px-4 py-2 text-[14px] font-medium text-white transition active:scale-[0.98] hover:bg-[#0070AA] disabled:pointer-events-none disabled:opacity-50 ${full ? "w-full" : ""}`;
}

function zohoSecondaryBtnCls(full = false) {
  return `inline-flex min-h-[40px] items-center justify-center rounded-lg border border-[#E4E7EC] bg-white px-4 py-2 text-[14px] font-medium text-[#1F2937] transition active:scale-[0.98] hover:bg-[#F5F7FA] disabled:pointer-events-none disabled:opacity-50 lg:border-slate-200 lg:text-sm lg:font-semibold lg:text-[#0C123A] lg:shadow-sm lg:hover:bg-slate-50 ${full ? "w-full" : ""}`;
}

function zohoEditIconBtnCls() {
  return "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#008CD3] active:bg-[#E8F4FB]";
}

function zohoDangerIconBtnCls() {
  return "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#FFCDD2] text-[#C62828] active:bg-[#FFECEC]";
}

type MobileHolidayRowProps = {
  holiday: CompanyHolidayRow;
  today: string;
  onEdit: () => void;
  onDelete: () => void;
};

function MobileHolidayRow({ holiday, today, onEdit, onDelete }: MobileHolidayRowProps) {
  const normalizedDate = normalizeDateOnly(holiday.holiday_date);
  const block = dateBlock(normalizedDate);
  const isPast = normalizedDate < today;
  const isToday = normalizedDate === today;

  return (
    <li>
      <div className="px-4 py-3.5">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg ${
              isToday
                ? "bg-[#0F9D58] text-white"
                : isPast
                  ? "bg-[#F5F7FA] text-[#6B7280]"
                  : "bg-[#E8F4FB] text-[#008CD3]"
            }`}
          >
            <span className="text-[10px] font-semibold uppercase leading-none">{block.mon}</span>
            <span className="text-lg font-bold leading-tight">{block.day}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate text-[16px] font-medium text-[#1F2937]">
                {holiday.holiday_name}
              </p>
              {isToday ? (
                <span className="shrink-0 rounded-full bg-[#E6F4EA] px-2 py-0.5 text-[11px] font-semibold text-[#0F9D58]">
                  Today
                </span>
              ) : isPast ? (
                <span className="shrink-0 rounded-full bg-[#F5F7FA] px-2 py-0.5 text-[11px] font-medium text-[#6B7280]">
                  Past
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 truncate text-[13px] text-[#6B7280]">
              {formatYmdPretty(normalizedDate)}
            </p>
            <p className="mt-1 text-[12px] text-[#9CA3AF]">
              By {holiday.holiday_created_by_name?.trim() || "System"}
            </p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={onEdit} className={`flex-1 ${zohoSecondaryBtnCls()}`}>
            <Pencil className="h-4 w-4" />
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className={zohoDangerIconBtnCls()}
            aria-label="Delete holiday"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </li>
  );
}

function OrganizationHolidaysPage() {
  const params = useParams();
  const orgIdParam = params?.org_id;
  const ctx = useManagementDashboardContext();

  const orgId =
    ctx?.organization?.id != null
      ? Number(ctx.organization.id)
      : Number(orgIdParam);
  const orgMissing = !orgId || Number.isNaN(orgId);
  const orgName =
    ctx?.organization?.org_name?.trim() || `Organization ${orgIdParam ?? ""}`;

  const [holidays, setHolidays] = useState<CompanyHolidayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addDate, setAddDate] = useState("");
  const [addEndDate, setAddEndDate] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [addSubmitting, setAddSubmitting] = useState(false);

  const [editTarget, setEditTarget] = useState<CompanyHolidayRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<CompanyHolidayRow | null>(
    null
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [mobileMainTab, setMobileMainTab] = useState<
    "holidays" | "calendar" | "overview"
  >("holidays");

  const holidayDateSet = useMemo(
    () =>
      new Set(
        holidays.map((h) => normalizeDateOnly(h.holiday_date)).filter(Boolean)
      ),
    [holidays]
  );
  const today = todayYmd();

  const filteredHolidays = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? holidays.filter((h) => h.holiday_name?.toLowerCase().includes(q))
      : holidays;
    return [...list].sort((a, b) =>
      normalizeDateOnly(a.holiday_date).localeCompare(normalizeDateOnly(b.holiday_date))
    );
  }, [holidays, search]);

  const totalHolidays = holidays.length;
  const leftHolidays = useMemo(
    () =>
      holidays.filter((h) => normalizeDateOnly(h.holiday_date) >= today).length,
    [holidays, today]
  );
  const upcomingHoliday = useMemo(() => {
    const future = holidays
      .filter((h) => normalizeDateOnly(h.holiday_date) >= today)
      .sort((a, b) =>
        normalizeDateOnly(a.holiday_date).localeCompare(
          normalizeDateOnly(b.holiday_date)
        )
      );
    return future[0] || null;
  }, [holidays, today]);

  const loadHolidays = useCallback(async () => {
    if (orgMissing) {
      setLoading(false);
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Not signed in.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getCompanyHolidays(token, orgId);
      setHolidays(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load holidays.");
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, orgMissing]);

  useEffect(() => {
    void loadHolidays();
  }, [loadHolidays]);

  function openEdit(holiday: CompanyHolidayRow) {
    setEditTarget(holiday);
    setEditName(holiday.holiday_name || "");
    setEditDate(normalizeDateOnly(holiday.holiday_date));
    setEditError(null);
  }

  function closeEdit() {
    if (editSubmitting) return;
    setEditTarget(null);
    setEditError(null);
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    if (!editName.trim() || !editDate) {
      setEditError("Holiday name and holiday date are required.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setEditError("Not signed in.");
      return;
    }
    setEditSubmitting(true);
    setEditError(null);
    try {
      await updateCompanyHoliday(token, {
        holiday_id: editTarget.id,
        holiday_name: editName,
        holiday_date: editDate,
      });
      closeEdit();
      await loadHolidays();
    } catch (e) {
      setEditError(
        e instanceof Error ? e.message : "Could not update holiday."
      );
    } finally {
      setEditSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const token = localStorage.getItem("token");
    if (!token) {
      setDeleteError("Not signed in.");
      return;
    }
    setDeleteSubmitting(true);
    setDeleteError(null);
    try {
      await deleteCompanyHoliday(token, { holiday_id: deleteTarget.id });
      setDeleteTarget(null);
      await loadHolidays();
    } catch (e) {
      setDeleteError(
        e instanceof Error ? e.message : "Could not delete holiday."
      );
    } finally {
      setDeleteSubmitting(false);
    }
  }

  function openAdd() {
    setAddOpen(true);
    setAddName("");
    setAddDate("");
    setAddEndDate("");
    setAddError(null);
  }

  function closeAdd() {
    if (addSubmitting) return;
    setAddOpen(false);
    setAddError(null);
  }

  async function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addName.trim() || !addDate) {
      setAddError("Holiday name and start date are required.");
      return;
    }
    const trimmedEndDate = addEndDate.trim();
    if (trimmedEndDate && trimmedEndDate < addDate) {
      setAddError("End date cannot be before start date.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setAddError("Not signed in.");
      return;
    }
    setAddSubmitting(true);
    setAddError(null);
    try {
      await createCompanyHoliday(token, {
        org_id: orgId,
        holiday_name: addName,
        holiday_date: addDate,
        end_date: trimmedEndDate || null,
      });
      closeAdd();
      await loadHolidays();
    } catch (e) {
      setAddError(
        e instanceof Error ? e.message : "Could not create holiday."
      );
    } finally {
      setAddSubmitting(false);
    }
  }

  const mobileTabs = [
    { id: "holidays" as const, label: "Holidays", count: holidays.length },
    { id: "calendar" as const, label: "Calendar" },
    { id: "overview" as const, label: "Overview" },
  ];

  return (
    <div className="min-h-full bg-[#F5F7FA] lg:bg-transparent lg:space-y-6 lg:p-1 lg:pb-0">
      {/* Mobile & tablet: Zoho admin portal style */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-20 border-b border-[#E4E7EC] bg-white shadow-sm">
          <div className="flex items-center gap-2 px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[17px] font-semibold text-[#1F2937]">Holidays</h1>
              <p className="truncate text-[13px] text-[#6B7280]">
                {loading
                  ? "Loading…"
                  : `${holidays.length} holiday${holidays.length === 1 ? "" : "s"} · ${orgName}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadHolidays()}
              disabled={loading || orgMissing}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#008CD3] active:bg-[#F5F7FA] disabled:opacity-50"
              aria-label="Refresh holidays"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={openAdd}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#008CD3] text-white active:scale-[0.98]"
              aria-label="Add holiday"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          <div className="px-4 pb-3">
            <div className="flex rounded-lg bg-[#F5F7FA] p-1">
              {mobileTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMobileMainTab(tab.id)}
                  className={`flex flex-1 items-center justify-center gap-1 rounded-md py-2 text-[12px] font-medium transition sm:text-[13px] ${
                    mobileMainTab === tab.id
                      ? "bg-white text-[#008CD3] shadow-sm"
                      : "text-[#6B7280]"
                  }`}
                >
                  {tab.label}
                  {"count" in tab && tab.count != null ? (
                    <span
                      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] ${
                        mobileMainTab === tab.id
                          ? "bg-[#E8F4FB] text-[#008CD3]"
                          : "bg-[#E4E7EC] text-[#6B7280]"
                      }`}
                    >
                      {tab.count > 99 ? "99+" : tab.count}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          {mobileMainTab === "holidays" ? (
            <div className="border-t border-[#E4E7EC] px-4 py-2.5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search holidays"
                  className={zohoSearchCls()}
                />
              </div>
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="mx-4 mt-3 flex items-start gap-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-4 py-3 text-[14px] text-[#D93025]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {orgMissing ? (
          <div className="mx-4 mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[14px] text-amber-950">
            Invalid organization context.
          </div>
        ) : null}

        {loading && !error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-[#6B7280]">
            <Loader2 className="h-9 w-9 animate-spin text-[#008CD3]" />
            <p className="text-[15px]">Loading holidays…</p>
          </div>
        ) : null}

        {!loading && !error && mobileMainTab === "overview" ? (
          <div className="space-y-3 p-4">
            <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Total holidays
              </p>
              <p className="mt-1 text-3xl font-semibold text-[#1F2937]">{totalHolidays}</p>
            </div>
            <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Upcoming
              </p>
              <p className="mt-1 text-3xl font-semibold text-[#0F9D58]">{leftHolidays}</p>
              <p className="mt-1 text-[14px] text-[#6B7280]">Remaining this year</p>
            </div>
            <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Next holiday
              </p>
              <p className="mt-1 text-[17px] font-semibold text-[#1F2937]">
                {upcomingHoliday ? upcomingHoliday.holiday_name : "None scheduled"}
              </p>
              {upcomingHoliday ? (
                <p className="mt-1 text-[14px] text-[#6B7280]">
                  {formatYmdPretty(normalizeDateOnly(upcomingHoliday.holiday_date))}
                </p>
              ) : null}
            </div>
            <div className="rounded-xl border border-[#E4E7EC] bg-[#E8F4FB] p-4">
              <div className="flex gap-3">
                <Info className="h-5 w-5 shrink-0 text-[#008CD3]" />
                <p className="text-[14px] leading-relaxed text-[#4B5563]">
                  Company holidays appear on attendance calendars. Add dates for public holidays,
                  office closures, and optional days off.
                </p>
              </div>
            </div>
            <button type="button" onClick={openAdd} className={zohoPrimaryBtnCls(true)}>
              <Plus className="h-4 w-4" />
              Add holiday
            </button>
          </div>
        ) : null}

        {!loading && !error && mobileMainTab === "calendar" ? (
          <div className="space-y-3 p-4">
            <div className="rounded-xl border border-[#E4E7EC] bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-[#E4E7EC] px-4 py-3">
                <div>
                  <p className="text-[15px] font-semibold text-[#1F2937]">
                    {formatMonthLabel(selectedMonth)} {new Date().getFullYear()}
                  </p>
                  <p className="text-[13px] text-[#6B7280]">Tap arrows to change month</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedMonth((prev) => (prev === 0 ? 11 : prev - 1))
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#6B7280] active:bg-[#F5F7FA]"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedMonth((prev) => (prev === 11 ? 0 : prev + 1))
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#6B7280] active:bg-[#F5F7FA]"
                    aria-label="Next month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 border-b border-[#E4E7EC] px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#0F9D58]" />
                  <span className="text-[12px] text-[#6B7280]">Today</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#008CD3]" />
                  <span className="text-[12px] text-[#6B7280]">Sunday</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#D93025]" />
                  <span className="text-[12px] text-[#6B7280]">Holiday</span>
                </div>
              </div>
              <div className="p-3">
                <Calendar
                  value={new Date(new Date().getFullYear(), selectedMonth, 1) as Value}
                  view="month"
                  activeStartDate={new Date(new Date().getFullYear(), selectedMonth, 1)}
                  showNavigation={false}
                  showNeighboringMonth={false}
                  tileClassName={({ date, view }) => {
                    if (view !== "month") return "";
                    const ymd = toYmdFromDate(date);
                    if (ymd === todayYmd()) return "holiday-today";
                    if (holidayDateSet.has(ymd)) return "holiday-day";
                    if (date.getDay() === 0) return "holiday-sunday";
                    return "";
                  }}
                />
              </div>
            </div>
          </div>
        ) : null}

        {!loading && !error && mobileMainTab === "holidays" && holidays.length === 0 ? (
          <div className="mx-4 mt-4 rounded-xl border border-dashed border-[#E4E7EC] bg-white px-6 py-16 text-center">
            <CalendarOff className="mx-auto h-10 w-10 text-[#9CA3AF]" />
            <p className="mt-4 text-[17px] font-semibold text-[#1F2937]">No holidays yet</p>
            <p className="mt-2 text-[14px] text-[#6B7280]">
              Add your first company holiday to mark non-working days.
            </p>
            <button type="button" onClick={openAdd} className={`mt-6 ${zohoPrimaryBtnCls()}`}>
              <Plus className="h-4 w-4" />
              Add holiday
            </button>
          </div>
        ) : null}

        {!loading && !error && mobileMainTab === "holidays" && holidays.length > 0 ? (
          <ul className="mt-1 divide-y divide-[#E4E7EC] border-t border-[#E4E7EC] bg-white">
            {filteredHolidays.length === 0 ? (
              <li className="px-4 py-12 text-center text-[15px] text-[#6B7280]">
                No holidays match your search.
              </li>
            ) : (
              filteredHolidays.map((holiday) => (
                <MobileHolidayRow
                  key={String(holiday.id)}
                  holiday={holiday}
                  today={today}
                  onEdit={() => openEdit(holiday)}
                  onDelete={() => {
                    setDeleteError(null);
                    setDeleteTarget(holiday);
                  }}
                />
              ))
            )}
          </ul>
        ) : null}
      </div>

      {/* Desktop layout (unchanged) */}
      <div className="hidden space-y-6 lg:block">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Holidays Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage company holidays for {orgName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void loadHolidays()}
            disabled={loading || orgMissing}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:from-indigo-700 hover:to-indigo-800 hover:shadow-xl hover:shadow-indigo-300"
          >
            <Plus className="h-4 w-4" />
            Add Holiday
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Total Holidays
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {totalHolidays}
              </p>
            </div>
            <div className="rounded-lg bg-indigo-50 p-3">
              <CalendarCheck className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
            <CalendarDays className="h-3.5 w-3.5" />
            All registered holidays
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Upcoming</p>
              <p className="mt-2 text-3xl font-bold text-emerald-600">
                {leftHolidays}
              </p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
            <CalendarOff className="h-3.5 w-3.5" />
            Remaining this year
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-gradient-to-br from-indigo-600 to-indigo-700 p-6 text-white shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-100">
                Next Holiday
              </p>
              <p className="mt-2 text-lg font-bold">
                {upcomingHoliday ? upcomingHoliday.holiday_name : "No upcoming"}
              </p>
            </div>
            <div className="rounded-lg bg-white/20 p-3">
              <CalendarCheck className="h-6 w-6" />
            </div>
          </div>
          {upcomingHoliday && (
            <p className="mt-2 text-xs text-indigo-200">
              {formatYmdPretty(
                normalizeDateOnly(upcomingHoliday.holiday_date)
              )}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Year</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {new Date().getFullYear()}
              </p>
            </div>
            <div className="rounded-lg bg-amber-50 p-3">
              <Building2 className="h-6 w-6 text-amber-600" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
            <Filter className="h-3.5 w-3.5" />
            Current calendar year
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search holidays by name..."
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-3 pl-12 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Holidays List */}
        <section className="lg:col-span-5">
          <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Company Holidays
                </h2>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                  {filteredHolidays.length} holidays
                </span>
              </div>
            </div>

            <div className="p-6">
              {error && (
                <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                  <p className="mt-3 text-sm">Loading holidays...</p>
                </div>
              ) : filteredHolidays.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50/50 px-6 py-16 text-center">
                  <CalendarOff className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-sm font-semibold text-gray-900">
                    No holidays found
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {search
                      ? "No holidays match your search criteria."
                      : "Start by adding your first company holiday."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredHolidays.map((holiday) => {
                    const normalizedDate = normalizeDateOnly(
                      holiday.holiday_date
                    );
                    const block = dateBlock(normalizedDate);
                    const isPast = normalizedDate < today;
                    const isToday = normalizedDate === today;

                    return (
                      <div
                        key={String(holiday.id)}
                        className="group rounded-lg border border-gray-100 bg-white p-4 transition-all hover:border-indigo-200 hover:shadow-md"
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-lg ${
                              isToday
                                ? "bg-emerald-600 text-white"
                                : isPast
                                ? "bg-gray-100 text-gray-600"
                                : "bg-indigo-600 text-white"
                            }`}
                          >
                            <span className="text-xs font-medium uppercase">
                              {block.mon}
                            </span>
                            <span className="text-2xl font-bold">
                              {block.day}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="font-semibold text-gray-900">
                                  {holiday.holiday_name}
                                </h3>
                                <p className="mt-1 text-sm text-gray-500">
                                  {formatYmdPretty(normalizedDate)}
                                </p>
                              </div>
                              {isToday && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                                  Today
                                </span>
                              )}
                              {isPast && !isToday && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                                  Past
                                </span>
                              )}
                            </div>
                            <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                              <span>
                                By {holiday.holiday_created_by_name || "System"}
                              </span>
                              <span>•</span>
                              <span>
                                {holiday.created_at
                                  ? new Date(
                                      holiday.created_at
                                    ).toLocaleDateString()
                                  : "N/A"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3">
                          <button
                            type="button"
                            onClick={() => openEdit(holiday)}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError(null);
                              setDeleteTarget(holiday);
                            }}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-600 transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Calendar Section */}
        <section className="lg:col-span-7">
          <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Calendar View
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {formatMonthLabel(selectedMonth)} {new Date().getFullYear()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setSelectedMonth((prev) => (prev === 0 ? 11 : prev - 1))
                    }
                    className="rounded-lg border border-gray-200 p-2 text-gray-500 transition-all hover:bg-gray-50 hover:text-gray-700"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() =>
                      setSelectedMonth((prev) => (prev === 11 ? 0 : prev + 1))
                    }
                    className="rounded-lg border border-gray-200 p-2 text-gray-500 transition-all hover:bg-gray-50 hover:text-gray-700"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-6 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-3 w-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200" />
                  <span className="text-xs font-medium text-gray-600">
                    Today
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-3 w-3 rounded-full bg-blue-500 shadow-sm shadow-blue-200" />
                  <span className="text-xs font-medium text-gray-600">
                    Sunday
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-3 w-3 rounded-full bg-red-500 shadow-sm shadow-red-200" />
                  <span className="text-xs font-medium text-gray-600">
                    Holiday
                  </span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 12 }, (_, monthIndex) => (
                  <div
                    key={monthIndex}
                    className={`overflow-hidden rounded-lg border transition-all ${
                      monthIndex === selectedMonth
                        ? "border-indigo-300 bg-indigo-50/50 shadow-md"
                        : "border-gray-100 bg-gray-50/30"
                    }`}
                  >
                    <div className="border-b border-gray-100 px-3 py-2">
                      <h3 className="text-center text-sm font-semibold text-gray-900">
                        {formatMonthLabel(monthIndex)}
                      </h3>
                    </div>
                    <div className="p-2">
                      <Calendar
                        value={
                          new Date(
                            new Date().getFullYear(),
                            monthIndex,
                            1
                          ) as Value
                        }
                        view="month"
                        activeStartDate={
                          new Date(new Date().getFullYear(), monthIndex, 1)
                        }
                        showNavigation={false}
                        showNeighboringMonth={false}
                        tileClassName={({ date, view }) => {
                          if (view !== "month") return "";
                          const ymd = toYmdFromDate(date);
                          if (ymd === todayYmd()) return "holiday-today";
                          if (holidayDateSet.has(ymd)) return "holiday-day";
                          if (date.getDay() === 0) return "holiday-sunday";
                          return "";
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
      </div>

      {/* Edit Modal */}
      {editTarget && (
        <div
          className="fixed inset-0 z-[999] flex items-end justify-center bg-[#1F2937]/40 p-0 backdrop-blur-[1px] sm:items-center sm:bg-gray-900/60 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 sm:bg-gray-900/60 sm:backdrop-blur-sm"
            onClick={closeEdit}
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-t-2xl border border-[#E4E7EC] bg-white shadow-2xl sm:rounded-2xl sm:border-gray-200 sm:[border-top:3px_solid_#008CD3]">
            <div className="border-b border-[#E4E7EC] bg-white px-4 py-4 sm:border-gray-100 sm:bg-gradient-to-r sm:from-indigo-50 sm:to-white sm:px-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[17px] font-semibold text-[#1F2937] sm:text-lg sm:text-gray-900">
                  Edit Holiday
                </h3>
                <button
                  type="button"
                  onClick={closeEdit}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#6B7280] active:bg-[#F5F7FA] sm:border-0 sm:p-1.5 sm:hover:bg-gray-100"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <form onSubmit={submitEdit} className="space-y-4 p-4 sm:space-y-5 sm:p-6">
              {editError && (
                <div className="flex items-start gap-3 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] p-3 text-[14px] text-[#D93025] sm:border-red-200 sm:bg-red-50 sm:text-red-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}
              <div>
                <label className="mb-2 block text-[14px] font-medium text-[#374151] sm:text-sm sm:text-gray-700">
                  Holiday Name
                </label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={zohoInputCls()}
                  placeholder="Enter holiday name"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-[14px] font-medium text-[#374151] sm:text-sm sm:text-gray-700">
                  Holiday Date
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className={zohoInputCls()}
                  required
                />
              </div>
              <div className="flex flex-col-reverse gap-2 border-t border-[#E4E7EC] pt-4 sm:flex-row sm:justify-end sm:border-gray-100 sm:gap-3">
                <button type="button" onClick={closeEdit} className={zohoSecondaryBtnCls(true)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className={zohoPrimaryBtnCls(true)}
                >
                  {editSubmitting && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {addOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-end justify-center bg-[#1F2937]/40 p-0 backdrop-blur-[1px] sm:items-center sm:bg-gray-900/60 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 sm:bg-gray-900/60 sm:backdrop-blur-sm"
            onClick={closeAdd}
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-t-2xl border border-[#E4E7EC] bg-white shadow-2xl sm:rounded-2xl sm:border-gray-200 sm:[border-top:3px_solid_#008CD3]">
            <div className="border-b border-[#E4E7EC] bg-white px-4 py-4 sm:border-gray-100 sm:bg-gradient-to-r sm:from-indigo-50 sm:to-white sm:px-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[17px] font-semibold text-[#1F2937] sm:text-lg sm:text-gray-900">
                  Add New Holiday
                </h3>
                <button
                  type="button"
                  onClick={closeAdd}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#6B7280] active:bg-[#F5F7FA] sm:border-0 sm:p-1.5 sm:hover:bg-gray-100"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <form onSubmit={submitAdd} className="space-y-4 p-4 sm:space-y-5 sm:p-6">
              {addError && (
                <div className="flex items-start gap-3 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] p-3 text-[14px] text-[#D93025] sm:border-red-200 sm:bg-red-50 sm:text-red-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{addError}</span>
                </div>
              )}
              <div>
                <label className="mb-2 block text-[14px] font-medium text-[#374151] sm:text-sm sm:text-gray-700">
                  Holiday Name
                </label>
                <input
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className={zohoInputCls()}
                  placeholder="Enter holiday name"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-[14px] font-medium text-[#374151] sm:text-sm sm:text-gray-700">
                  Start date
                </label>
                <input
                  type="date"
                  value={addDate}
                  onChange={(e) => setAddDate(e.target.value)}
                  className={zohoInputCls()}
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-[14px] font-medium text-[#374151] sm:text-sm sm:text-gray-700">
                  End date{" "}
                  <span className="font-normal text-[#9CA3AF]">(optional)</span>
                </label>
                <input
                  type="date"
                  value={addEndDate}
                  min={addDate || undefined}
                  onChange={(e) => setAddEndDate(e.target.value)}
                  className={zohoInputCls()}
                />
                <p className="mt-1.5 text-[12px] text-[#6B7280]">
                  Leave blank for a single-day holiday.
                </p>
              </div>
              <div className="flex flex-col-reverse gap-2 border-t border-[#E4E7EC] pt-4 sm:flex-row sm:justify-end sm:border-gray-100 sm:gap-3">
                <button type="button" onClick={closeAdd} className={zohoSecondaryBtnCls(true)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSubmitting}
                  className={zohoPrimaryBtnCls(true)}
                >
                  {addSubmitting && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Add Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#1F2937]/40 p-0 backdrop-blur-[1px] sm:items-center sm:bg-gray-900/60 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 sm:bg-gray-900/60 sm:backdrop-blur-sm"
            onClick={() => !deleteSubmitting && setDeleteTarget(null)}
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-t-2xl border border-[#E4E7EC] bg-white shadow-2xl sm:rounded-2xl sm:border-gray-200">
            <div className="border-b border-[#FFCDD2] bg-[#FCE8E6] px-4 py-4 sm:border-red-100 sm:bg-gradient-to-r sm:from-red-50 sm:to-white sm:px-6">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FFCDD2] sm:h-12 sm:w-12 sm:bg-red-100">
                  <Trash2 className="h-5 w-5 text-[#C62828] sm:h-6 sm:w-6 sm:text-red-600" />
                </div>
                <div>
                  <h3 className="text-[17px] font-semibold text-[#1F2937] sm:text-lg sm:text-gray-900">
                    Delete Holiday
                  </h3>
                  <p className="mt-1 text-[14px] text-[#6B7280] sm:text-sm sm:text-gray-600">
                    Are you sure you want to delete{" "}
                    <span className="font-semibold text-[#1F2937] sm:text-gray-900">
                      {deleteTarget.holiday_name}
                    </span>
                    ? This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
            {deleteError && (
              <div className="mx-4 mt-4 flex items-start gap-3 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] p-3 text-[14px] text-[#D93025] sm:mx-6 sm:border-red-200 sm:bg-red-50 sm:text-red-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}
            <div className="flex flex-col-reverse gap-2 p-4 sm:flex-row sm:justify-end sm:gap-3 sm:p-6">
              <button
                type="button"
                disabled={deleteSubmitting}
                onClick={() => setDeleteTarget(null)}
                className={zohoSecondaryBtnCls(true)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteSubmitting}
                onClick={() => void confirmDelete()}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#D93025] px-4 py-2.5 text-[15px] font-medium text-white transition active:scale-[0.98] hover:bg-[#B71C1C] disabled:opacity-60 sm:w-auto sm:bg-gradient-to-r sm:from-red-600 sm:to-red-700 sm:text-sm sm:font-semibold sm:shadow-lg sm:shadow-red-200 sm:hover:from-red-700 sm:hover:to-red-800"
              >
                {deleteSubmitting && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Delete Holiday
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .react-calendar {
          width: 100%;
          border: 0;
          background: transparent;
          font-family: inherit;
          line-height: 1.25;
          font-size: 11px;
        }
        .react-calendar__month-view__weekdays__weekday {
          text-align: center;
          font-size: 10px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          padding-bottom: 6px;
        }
        .react-calendar__tile {
          border-radius: 8px;
          border: none;
          background: transparent;
          padding: 6px 3px;
          color: #111827;
          font-weight: 500;
          transition: all 0.2s;
        }
        .react-calendar__tile:enabled:hover {
          background: #f3f4f6;
        }
        .react-calendar__tile:enabled:focus {
          background: #e0e7ff;
          color: #4338ca;
        }
        .react-calendar__tile.holiday-day {
          background: #fef2f2 !important;
          color: #dc2626 !important;
          font-weight: 700;
          border-radius: 8px;
        }
        .react-calendar__tile.holiday-sunday {
          background: #eff6ff !important;
          color: #3b82f6 !important;
          font-weight: 600;
          border-radius: 8px;
        }
        .react-calendar__tile.holiday-today {
          background: #10b981 !important;
          color: white !important;
          font-weight: 700;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
        }
        .react-calendar__navigation {
          display: none;
        }
        @media (max-width: 1023px) {
          .react-calendar {
            font-size: 14px;
          }
          .react-calendar__month-view__weekdays__weekday {
            font-size: 11px;
          }
          .react-calendar__tile {
            padding: 10px 4px;
            border-radius: 10px;
          }
        }
      `}</style>
    </div>
  );
}

export default OrganizationHolidaysPage;