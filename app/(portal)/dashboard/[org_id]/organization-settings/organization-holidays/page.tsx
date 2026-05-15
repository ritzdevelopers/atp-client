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
    if (!q) return holidays;
    return holidays.filter((h) => h.holiday_name?.toLowerCase().includes(q));
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
      setAddError("Holiday name and holiday date are required.");
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

  return (
    <div className="space-y-6 p-1">
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

      {/* Edit Modal */}
      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            onClick={closeEdit}
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Edit Holiday
                </h3>
                <button
                  type="button"
                  onClick={closeEdit}
                  className="rounded-lg p-1.5 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <form onSubmit={submitEdit} className="space-y-5 p-6">
              {editError && (
                <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Holiday Name
                </label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  placeholder="Enter holiday name"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Holiday Date
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-60"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            onClick={closeAdd}
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Add New Holiday
                </h3>
                <button
                  type="button"
                  onClick={closeAdd}
                  className="rounded-lg p-1.5 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <form onSubmit={submitAdd} className="space-y-5 p-6">
              {addError && (
                <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{addError}</span>
                </div>
              )}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Holiday Name
                </label>
                <input
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  placeholder="Enter holiday name"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Holiday Date
                </label>
                <input
                  type="date"
                  value={addDate}
                  onChange={(e) => setAddDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeAdd}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-60"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            onClick={() => !deleteSubmitting && setDeleteTarget(null)}
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="border-b border-red-100 bg-gradient-to-r from-red-50 to-white px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Delete Holiday
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Are you sure you want to delete{" "}
                    <span className="font-semibold text-gray-900">
                      {deleteTarget.holiday_name}
                    </span>
                    ? This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
            {deleteError && (
              <div className="mx-6 mt-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}
            <div className="flex justify-end gap-3 p-6">
              <button
                type="button"
                disabled={deleteSubmitting}
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteSubmitting}
                onClick={() => void confirmDelete()}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-red-600 to-red-700 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-200 transition-all hover:from-red-700 hover:to-red-800 disabled:opacity-60"
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
      `}</style>
    </div>
  );
}

export default OrganizationHolidaysPage;