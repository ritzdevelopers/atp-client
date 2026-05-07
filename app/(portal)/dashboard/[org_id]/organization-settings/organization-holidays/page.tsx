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
  return d.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
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

function cardDateStyle(ymd: string, isFuture: boolean) {
  if (ymd === todayYmd()) {
    return "from-green-500 to-emerald-600 text-white";
  }
  return isFuture ? "from-[#C99237] to-amber-600 text-[#0C123A]" : "from-slate-200 to-slate-100 text-slate-700";
}

function OrganizationHolidaysPage() {
  const params = useParams();
  const orgIdParam = params?.org_id;
  const ctx = useManagementDashboardContext();

  const orgId = ctx?.organization?.id != null ? Number(ctx.organization.id) : Number(orgIdParam);
  const orgMissing = !orgId || Number.isNaN(orgId);
  const orgName = ctx?.organization?.org_name?.trim() || `Organization ${orgIdParam ?? ""}`;

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

  const [deleteTarget, setDeleteTarget] = useState<CompanyHolidayRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const holidayDateSet = useMemo(
    () => new Set(holidays.map((h) => normalizeDateOnly(h.holiday_date)).filter(Boolean)),
    [holidays],
  );
  const today = todayYmd();

  const filteredHolidays = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return holidays;
    return holidays.filter((h) => h.holiday_name?.toLowerCase().includes(q));
  }, [holidays, search]);

  const totalHolidays = holidays.length;
  const leftHolidays = useMemo(
    () => holidays.filter((h) => normalizeDateOnly(h.holiday_date) >= today).length,
    [holidays, today],
  );

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
      setEditError(e instanceof Error ? e.message : "Could not update holiday.");
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
      setDeleteError(e instanceof Error ? e.message : "Could not delete holiday.");
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
      setAddError(e instanceof Error ? e.message : "Could not create holiday.");
    } finally {
      setAddSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-[#0C123A]">Organization holidays</h1>
            <p className="text-xs text-slate-500">{orgName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadHolidays()}
              disabled={loading || orgMissing}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-[#0C123A] shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#C99237] to-amber-500 px-3.5 text-xs font-extrabold text-[#0C123A] shadow-sm transition hover:brightness-105"
            >
              <Plus className="h-3.5 w-3.5" />
              Add holiday
            </button>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-12">
          <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-3 lg:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total</p>
            <p className="mt-1 text-xl font-black text-[#0C123A]">{totalHolidays}</p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-3 lg:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Left</p>
            <p className="mt-1 text-xl font-black text-[#0C123A]">{leftHolidays}</p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-[#0C123A] to-[#18245e] p-3 text-white lg:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60">Year</p>
            <p className="mt-1 text-sm font-bold">{new Date().getFullYear()}</p>
          </div>
          <div className="relative lg:col-span-6">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search holiday by name..."
              className="h-full min-h-[58px] w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-4 text-sm font-medium text-[#0C123A] outline-none transition focus:border-[#C99237] focus:bg-white focus:ring-4 focus:ring-[#C99237]/15"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="lg:col-span-5">
          <div className="h-full rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-[#0C123A]">Company holidays</h2>
              <CalendarDays className="h-5 w-5 text-[#C99237]" />
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-20 text-slate-500">
                <Loader2 className="h-7 w-7 animate-spin text-[#C99237]" />
              </div>
            ) : filteredHolidays.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-5 py-14 text-center text-sm text-slate-500">
                {search ? "No holidays found for this search." : "No holidays found."}
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredHolidays.map((holiday) => {
                  const normalizedDate = normalizeDateOnly(holiday.holiday_date);
                  const block = dateBlock(normalizedDate);
                  const isFuture = normalizedDate >= today;
                  return (
                    <article
                      key={String(holiday.id)}
                      className="overflow-hidden rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/60 shadow-sm"
                    >
                      <div className="p-3.5">
                        <div className="flex gap-3">
                          <div className={`flex w-[72px] shrink-0 flex-col items-center justify-center rounded-lg bg-gradient-to-br px-2 py-2.5 ${cardDateStyle(normalizedDate, isFuture)}`}>
                            <span className="text-[11px] font-semibold tracking-wide">{block.mon}</span>
                            <span className="text-2xl font-black leading-none">{block.day}</span>
                            <span className="mt-1 text-[10px] font-semibold">{block.year}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-sm font-extrabold text-[#0C123A]">{holiday.holiday_name}</h3>
                            <p className="mt-1 text-xs text-slate-500">{formatYmdPretty(normalizedDate)}</p>
                            <div className="mt-2 rounded-lg border border-slate-100 bg-white px-2.5 py-1.5 text-[11px] text-slate-600">
                              <p>
                                <span className="font-semibold text-slate-700">Created by: </span>
                                {holiday.holiday_created_by_name || "—"}
                              </p>
                              <p>
                                <span className="font-semibold text-slate-700">Created at: </span>
                                {holiday.created_at ? new Date(holiday.created_at).toLocaleString() : "—"}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2 border-t border-slate-100 pt-2.5">
                          <button
                            type="button"
                            onClick={() => openEdit(holiday)}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-bold text-[#0C123A] shadow-sm transition hover:border-[#C99237]/50 hover:bg-[#C99237]/[0.08]"
                          >
                            <Pencil className="h-4 w-4 text-[#C99237]" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError(null);
                              setDeleteTarget(holiday);
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-100 bg-red-50/90 px-3 py-1.5 text-xs font-bold text-red-700 shadow-sm transition hover:bg-red-100"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="lg:col-span-7">
          <div className="h-full rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-[#0C123A]">Year calendar</h2>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                <Building2 className="h-3.5 w-3.5 text-[#C99237]" />
                {new Date().getFullYear()}
              </span>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-green-500" /> Today
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-blue-500" /> Sunday
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-red-500" /> Holiday
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 12 }, (_, monthIndex) => (
                <div key={monthIndex} className="overflow-hidden rounded-xl border border-slate-200/90 bg-slate-50/40 p-2.5">
                  <h3 className="mb-2 text-center text-sm font-extrabold text-[#0C123A]">{formatMonthLabel(monthIndex)}</h3>
                  <Calendar
                    value={new Date(new Date().getFullYear(), monthIndex, 1) as Value}
                    view="month"
                    activeStartDate={new Date(new Date().getFullYear(), monthIndex, 1)}
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
              ))}
            </div>
          </div>
        </section>
      </div>

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button className="absolute inset-0 bg-[#0C123A]/60 backdrop-blur-sm" type="button" onClick={closeEdit} />
          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-lg font-extrabold text-[#0C123A]">Edit holiday</h3>
              <button type="button" onClick={closeEdit} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submitEdit} className="space-y-4 px-6 py-5">
              {editError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-600">Holiday name</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-[#0C123A] outline-none focus:border-[#C99237] focus:ring-4 focus:ring-[#C99237]/15"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-600">Holiday date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-[#0C123A] outline-none focus:border-[#C99237] focus:ring-4 focus:ring-[#C99237]/15"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeEdit} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0C123A]">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#C99237] to-amber-500 px-5 py-2.5 text-sm font-extrabold text-[#0C123A] disabled:opacity-60"
                >
                  {editSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button className="absolute inset-0 bg-[#0C123A]/60 backdrop-blur-sm" type="button" onClick={closeAdd} />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <h3 className="text-base font-extrabold text-[#0C123A]">Add holiday</h3>
              <button type="button" onClick={closeAdd} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submitAdd} className="space-y-3.5 px-5 py-4">
              {addError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{addError}</span>
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-600">Holiday name</label>
                <input
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-[#0C123A] outline-none focus:border-[#C99237] focus:ring-4 focus:ring-[#C99237]/15"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-600">Holiday date</label>
                <input
                  type="date"
                  value={addDate}
                  onChange={(e) => setAddDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-[#0C123A] outline-none focus:border-[#C99237] focus:ring-4 focus:ring-[#C99237]/15"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={closeAdd} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0C123A]">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#C99237] to-amber-500 px-5 py-2.5 text-sm font-extrabold text-[#0C123A] disabled:opacity-60"
                >
                  {addSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Add holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button
            className="absolute inset-0 bg-[#0C123A]/60 backdrop-blur-sm"
            type="button"
            onClick={() => !deleteSubmitting && setDeleteTarget(null)}
          />
          <div className="relative w-full max-w-md rounded-3xl border border-red-100 bg-white shadow-2xl">
            <div className="border-b border-red-100 bg-gradient-to-br from-red-50 to-white px-6 py-4">
              <h3 className="text-lg font-extrabold text-[#0C123A]">Delete holiday?</h3>
              <p className="mt-1 text-sm text-slate-600">
                This will permanently remove <span className="font-semibold">{deleteTarget.holiday_name}</span>.
              </p>
            </div>
            {deleteError && (
              <div className="mx-6 mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}
            <div className="flex justify-end gap-2 px-6 py-4">
              <button
                type="button"
                disabled={deleteSubmitting}
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0C123A]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteSubmitting}
                onClick={() => void confirmDelete()}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {deleteSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete
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
          font-size: 12px;
        }
        .react-calendar__month-view__weekdays__weekday {
          text-align: center;
          font-size: 10px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          padding-bottom: 6px;
        }
        .react-calendar__tile {
          border-radius: 10px;
          border: none;
          background: transparent;
          padding: 7px 4px;
          color: #0c123a;
          font-weight: 600;
        }
        .react-calendar__tile:enabled:hover {
          background: #f1f5f9;
        }
        .react-calendar__tile.holiday-day {
          background: #fee2e2 !important;
          color: #b91c1c !important;
          font-weight: 800;
        }
        .react-calendar__tile.holiday-sunday {
          background: #dbeafe !important;
          color: #1d4ed8 !important;
          font-weight: 700;
        }
        .react-calendar__tile.holiday-today {
          background: #dcfce7 !important;
          color: #15803d !important;
          font-weight: 900;
        }
      `}</style>
    </div>
  );
}

export default OrganizationHolidaysPage;