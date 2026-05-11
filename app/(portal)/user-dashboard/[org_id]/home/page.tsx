"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { MdNotificationsNone, MdSearch } from "react-icons/md";
import {
  formatAttendanceLogLocal,
  formatAttendanceTimeLocal,
  getAttendanceDayVisual,
  getLocalYmdFromDate,
  getTodayLocalYmd,
  localYmdFromAttendanceValue,
} from "@/lib/attendanceDates";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const HOME_CACHE_TTL_MS = 5 * 60 * 1000;

type AttendanceHistoryRow = {
  attendance_date?: string;
  check_in?: string | null;
  check_out?: string | null;
  attendance_status?: string | null;
  working_time?: string | number | null;
};

type UserAddressRow = {
  id?: number | string;
  user_id?: number | string;
  org_id?: number | string;
  country?: string | null;
  state?: string | null;
  district?: string | null;
  city?: string | null;
  is_from_village?: boolean | number | string | null;
  village_name?: string | null;
  street?: string | null;
  house_number?: string | null;
  zip_code?: string | null;
};

type EmployeeDashboardResponse = {
  message?: string;
  owner?: {
    user_name?: string;
    user_email?: string;
  };
  organization?: {
    id?: number | string;
    org_name?: string;
    org_email?: string;
    org_phone?: string;
    created_at?: string;
    [key: string]: unknown;
  };
  employee?: {
    id?: number | string;
    user_name?: string;
    user_email?: string;
    user_phone?: string;
    user_address?: string;
    user_emergency_contact?: string;
    user_image?: string;
    user_shift_name?: string;
    user_shift_start_time?: string;
    user_shift_end_time?: string;
    mark_attendance_late_after?: string;
    is_night_shift?: boolean | number;
    total_leaves?: number | string | null;
    used_leaves?: number | string | null;
    remaining_leaves?: number | string | null;
    user_role_name?: string;
    created_at?: string;
    [key: string]: unknown;
  };
  /** Legacy shape */
  employees?: EmployeeDashboardResponse["employee"];
  attendance_history?: AttendanceHistoryRow[];
};

type HomeCachePayload = {
  savedAt: number;
  data: EmployeeDashboardResponse;
  addresses: UserAddressRow[];
};

function formatElapsedDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

function formatMinutesAsHours(
  value: string | number | null | undefined,
): string {
  if (value == null || value === "") return "—";
  const minutes = Number(value);
  if (Number.isNaN(minutes) || minutes < 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function historyByLocalYmd(
  history: AttendanceHistoryRow[] | undefined,
): Map<string, AttendanceHistoryRow> {
  const map = new Map<string, AttendanceHistoryRow>();
  if (!history) return map;
  for (const row of history) {
    const key = localYmdFromAttendanceValue(row.attendance_date);
    if (key) map.set(key, row);
  }
  return map;
}

function isVillageAddress(value: UserAddressRow["is_from_village"]): boolean {
  return (
    value === true ||
    value === 1 ||
    String(value).toLowerCase() === "true" ||
    String(value) === "1"
  );
}

function joinAddressParts(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");
}

function parseJwtUserId(token: string | null): string {
  if (!token) return "anonymous";
  try {
    const payload = JSON.parse(atob(token.split(".")[1] || "")) as {
      user_id?: string | number;
      id?: string | number;
    };
    return String(payload.user_id ?? payload.id ?? "anonymous");
  } catch {
    return "anonymous";
  }
}

function getHomeCacheKey(orgId: number, token: string | null): string {
  return `user-dashboard-home:${orgId}:${parseJwtUserId(token)}`;
}

function readHomeCache(cacheKey: string): HomeCachePayload | null {
  try {
    const raw = sessionStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HomeCachePayload;
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > HOME_CACHE_TTL_MS) {
      sessionStorage.removeItem(cacheKey);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeHomeCache(
  cacheKey: string,
  data: EmployeeDashboardResponse,
  addresses: UserAddressRow[],
) {
  try {
    sessionStorage.setItem(
      cacheKey,
      JSON.stringify({ savedAt: Date.now(), data, addresses }),
    );
  } catch {
    // Ignore storage quota/private mode.
  }
}

function clearHomeCache(orgId: number, token: string | null) {
  try {
    sessionStorage.removeItem(getHomeCacheKey(orgId, token));
  } catch {
    // Ignore storage quota/private mode.
  }
}

function upsertTodayHistory(
  prev: EmployeeDashboardResponse | null,
  todayYmd: string,
  patch: Partial<AttendanceHistoryRow>,
): EmployeeDashboardResponse | null {
  if (!prev) return null;
  const history = [...(prev.attendance_history || [])];
  const idx = history.findIndex(
    (r) => localYmdFromAttendanceValue(r.attendance_date) === todayYmd,
  );
  if (idx >= 0) {
    history[idx] = { ...history[idx], ...patch };
  } else {
    history.unshift({
      attendance_date: todayYmd,
      check_in: patch.check_in ?? null,
      check_out: patch.check_out ?? null,
      attendance_status: patch.attendance_status ?? undefined,
      working_time: patch.working_time ?? null,
    });
  }
  return { ...prev, attendance_history: history };
}

const LEGEND_ITEMS: {
  sampleClass: string;
  label: string;
  description: string;
}[] = [
  {
    sampleClass: "bg-emerald-600",
    label: "Green",
    description: "Full working day completed",
  },
  {
    sampleClass: "bg-amber-500",
    label: "Amber",
    description: "Checked in on time, partial day (not full shift yet)",
  },
  {
    sampleClass: "bg-orange-500",
    label: "Orange",
    description: "Late arrival",
  },
  {
    sampleClass: "bg-red-600",
    label: "Red",
    description: "Absent or insufficient hours",
  },
  {
    sampleClass: "bg-pink-500",
    label: "Pink",
    description: "Half day",
  },
  {
    sampleClass: "bg-rose-950",
    label: "Maroon",
    description: "Short leave",
  },
  {
    sampleClass: "bg-slate-100 border border-slate-200",
    label: "Gray",
    description: "No attendance record",
  },
];

function Home() {
  const params = useParams();
  const orgIdParam = params?.org_id;
  const orgId = Number(orgIdParam);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EmployeeDashboardResponse | null>(null);
  const [addresses, setAddresses] = useState<UserAddressRow[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressesError, setAddressesError] = useState<string | null>(null);
  const [checkInSubmitting, setCheckInSubmitting] = useState(false);
  const [checkOutSubmitting, setCheckOutSubmitting] = useState(false);
  const [attendanceActionError, setAttendanceActionError] = useState<
    string | null
  >(null);
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);
  const [tick, setTick] = useState(0);

  const loadDashboardData = useCallback(
    async (forceRefresh = false) => {
      await Promise.resolve();
      if (!orgId || Number.isNaN(orgId)) {
        setError("Invalid organization.");
        setLoading(false);
        return;
      }
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Not signed in.");
        setLoading(false);
        return;
      }

      const cacheKey = getHomeCacheKey(orgId, token);
      if (!forceRefresh) {
        const cached = readHomeCache(cacheKey);
        if (cached) {
          setData(cached.data);
          setAddresses(cached.addresses);
          setError(null);
          setAddressesError(null);
          setLoading(false);
          setAddressesLoading(false);
          return;
        }
      }

      setLoading(true);
      setError(null);
      try {
        const q = encodeURIComponent(String(orgId));
        const res = await fetch(
          `${API_URL}/api/employees/get-employees-full-information?org_id=${q}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        const result = (await res.json()) as EmployeeDashboardResponse;
        if (!res.ok) {
          throw new Error(
            result.message || "Could not load employee information",
          );
        }
        setData(result);

        let nextAddresses: UserAddressRow[] = [];
        const employee = result.employee ?? result.employees;
        const employeeId = employee?.id;
        if (employeeId != null) {
          setAddressesLoading(true);
          setAddressesError(null);
          try {
            const addressRes = await fetch(
              `${API_URL}/api/user/get-user-address/${q}/${encodeURIComponent(String(employeeId))}`,
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            );
            const addressResult = (await addressRes.json()) as {
              data?: UserAddressRow[];
              message?: string;
            };
            if (!addressRes.ok) {
              throw new Error(
                addressResult.message || "Could not load employee addresses",
              );
            }
            nextAddresses = Array.isArray(addressResult.data)
              ? addressResult.data
              : [];
            setAddresses(nextAddresses);
          } catch (addressError) {
            setAddresses([]);
            setAddressesError(
              addressError instanceof Error
                ? addressError.message
                : "Could not load employee addresses",
            );
          } finally {
            setAddressesLoading(false);
          }
        } else {
          setAddresses([]);
          setAddressesError(null);
        }

        writeHomeCache(cacheKey, result, nextAddresses);
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Could not load employee information",
        );
        setData(null);
        setAddresses([]);
      } finally {
        setLoading(false);
      }
    },
    [orgId],
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      void loadDashboardData();
    }, 0);
    return () => window.clearTimeout(t);
  }, [loadDashboardData]);

  const emp = data?.employee ?? data?.employees;
  const owner = data?.owner;
  const org = data?.organization;
  const attendanceHistory = data?.attendance_history;

  const now = new Date();
  const todayYmd = getTodayLocalYmd(now);

  const historyMap = useMemo(
    () => historyByLocalYmd(attendanceHistory),
    [attendanceHistory],
  );
  const todayRecord = historyMap.get(todayYmd);

  const hasCheckedInToday = Boolean(todayRecord?.check_in);
  const hasCheckedOutToday = Boolean(todayRecord?.check_out);

  const checkInInstant = todayRecord?.check_in
    ? new Date(String(todayRecord.check_in))
    : null;
  const checkInValid =
    checkInInstant && !Number.isNaN(checkInInstant.getTime());

  const showLiveTimer = Boolean(
    checkInValid && hasCheckedInToday && !hasCheckedOutToday,
  );

  useEffect(() => {
    if (!showLiveTimer) return;
    const firstTick = window.setTimeout(() => setTick(Date.now()), 0);
    const id = window.setInterval(() => setTick(Date.now()), 1000);
    return () => {
      window.clearTimeout(firstTick);
      window.clearInterval(id);
    };
  }, [showLiveTimer]);

  const liveElapsedMs =
    showLiveTimer && checkInValid && tick > 0
      ? tick - checkInInstant.getTime()
      : 0;

  const workingHoursDisplay = showLiveTimer
    ? formatElapsedDuration(liveElapsedMs)
    : formatMinutesAsHours(todayRecord?.working_time);

  const todayLog = hasCheckedInToday
    ? formatAttendanceLogLocal(todayRecord?.check_in)
    : "—";
  const checkOutTime = hasCheckedOutToday
    ? formatAttendanceTimeLocal(todayRecord?.check_out)
    : "—";

  const attendanceStatusRaw = todayRecord?.attendance_status;
  const attendanceStatus = String(attendanceStatusRaw || "—").toLowerCase();

  const attendanceDays = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - idx));
    const day = d
      .toLocaleDateString(undefined, { weekday: "short" })
      .slice(0, 1);
    const dateNum = String(d.getDate());
    const ymd = getLocalYmdFromDate(d);
    const active = ymd === todayYmd;
    const row = historyMap.get(ymd);
    const visual = getAttendanceDayVisual(row?.attendance_status);
    return { day, dateNum, ymd, active, visual };
  });

  const imgSrc = emp?.user_image || "https://i.pravatar.cc/120?img=12";
  const employeeName = emp?.user_name || "Employee";
  const employeeCode =
    emp?.id != null ? `#E-${String(emp.id).padStart(4, "0")}` : "—";
  const emergency = emp?.user_emergency_contact || "+91-9220516777";
  const roleName = emp?.user_role_name || "—";
  const managerName = owner?.user_name || "—";
  const jobType = emp?.is_night_shift ? "NIGHT SHIFT" : "DAY SHIFT";
  const shiftRange =
    emp?.user_shift_start_time && emp?.user_shift_end_time
      ? `${String(emp.user_shift_start_time).slice(0, 5)} - ${String(emp.user_shift_end_time).slice(0, 5)}`
      : "Not assigned";
  const lateAfter = emp?.mark_attendance_late_after
    ? String(emp.mark_attendance_late_after).slice(0, 5)
    : "—";

  const fmtLeave = (v: number | string | null | undefined) =>
    v == null ? "—" : String(v);

  const totalLeaves = fmtLeave(emp?.total_leaves);
  const usedLeaves = fmtLeave(emp?.used_leaves);
  const leftLeaves = fmtLeave(emp?.remaining_leaves);

  const addressCards = useMemo(
    () =>
      addresses.map((address, index) => {
        const fromVillage = isVillageAddress(address.is_from_village);
        return {
          key: String(address.id ?? `${address.user_id}-${index}`),
          label: `Address ${index + 1}`,
          typeLabel: fromVillage ? "Village" : "City",
          lineOne:
            joinAddressParts([
              address.house_number,
              address.street,
              fromVillage ? address.village_name : null,
            ]) || "Address line not provided",
          lineTwo:
            joinAddressParts([
              address.city,
              address.district,
              address.state,
              address.country,
            ]) || "Location not provided",
          zipCode: address.zip_code || "—",
        };
      }),
    [addresses],
  );

  function getCurrentDateAndTime() {
    const n = new Date();
    const yyyy = n.getFullYear();
    const mm = String(n.getMonth() + 1).padStart(2, "0");
    const dd = String(n.getDate()).padStart(2, "0");
    const hh = String(n.getHours()).padStart(2, "0");
    const min = String(n.getMinutes()).padStart(2, "0");
    return {
      user_date: `${yyyy}-${mm}-${dd}`,
      user_time: `${hh}:${min}`,
    };
  }

  async function markCheckIn() {
    if (!orgId || Number.isNaN(orgId)) return;
    const token = localStorage.getItem("token");
    if (!token) {
      setAttendanceActionError("Not signed in.");
      return;
    }
    const { user_date, user_time } = getCurrentDateAndTime();
    setCheckInSubmitting(true);
    setAttendanceActionError(null);
    try {
      const res = await fetch(
        `${API_URL}/api/employees/mark-attendance-check-in`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ org_id: orgId, user_date, user_time }),
        },
      );
      const result = (await res.json()) as {
        message?: string;
        status?: string;
      };
      if (!res.ok) throw new Error(result.message || "Could not mark check-in");
      const checkInIso = new Date().toISOString();
      clearHomeCache(orgId, token);
      setData((prev) =>
        upsertTodayHistory(prev, todayYmd, {
          check_in: checkInIso,
          check_out: null,
          attendance_status: result.status || "present",
          working_time: null,
        }),
      );
      setTick(0);
    } catch (e) {
      setAttendanceActionError(
        e instanceof Error ? e.message : "Could not mark check-in.",
      );
    } finally {
      setCheckInSubmitting(false);
    }
  }

  async function markCheckOut() {
    if (!orgId || Number.isNaN(orgId)) return;
    const token = localStorage.getItem("token");
    if (!token) {
      setAttendanceActionError("Not signed in.");
      return;
    }
    const { user_date } = getCurrentDateAndTime();
    const user_time = new Date().toISOString();
    setCheckOutSubmitting(true);
    setAttendanceActionError(null);
    try {
      const res = await fetch(
        `${API_URL}/api/employees/mark-attendance-check-out`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ org_id: orgId, user_date, user_time }),
        },
      );
      const result = (await res.json()) as {
        message?: string;
        finalStatus?: string;
        workingMinutes?: number;
      };
      if (!res.ok)
        throw new Error(result.message || "Could not mark check-out");
      setShowCheckoutConfirm(false);
      const wm = result.workingMinutes;
      const workingDisplay =
        wm != null && !Number.isNaN(Number(wm)) ? Number(wm) / 60 : undefined;
      const patch: Partial<AttendanceHistoryRow> = { check_out: user_time };
      if (result.finalStatus != null)
        patch.attendance_status = result.finalStatus;
      if (workingDisplay !== undefined) patch.working_time = workingDisplay;
      clearHomeCache(orgId, token);
      setData((prev) => upsertTodayHistory(prev, todayYmd, patch));
    } catch (e) {
      setAttendanceActionError(
        e instanceof Error ? e.message : "Could not mark check-out.",
      );
    } finally {
      setCheckOutSubmitting(false);
    }
  }

  const monthYearLabel = now.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <section className="min-h-screen flex-1 bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-6 py-4 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div className="relative max-w-[420px] flex-1">
            <MdSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search dashboard..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none ring-indigo-200 placeholder:text-slate-400 focus:ring-2"
            />
          </div>
          <button
            type="button"
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Notifications"
          >
            <MdNotificationsNone className="text-[22px]" />
          </button>
        </div>
      </header>

      <div className="space-y-5 p-6">
        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
            Loading employee information...
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <section className="grid gap-5 xl:grid-cols-[2fr_1fr]">
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start gap-4">
              <img
                src={imgSrc}
                alt="Employee avatar"
                className="h-20 w-20 rounded-xl object-cover"
              />
              <div className="min-w-[240px] flex-1">
                <h2 className="text-lg font-semibold text-slate-800">
                  {employeeName}
                </h2>
                <p className="text-sm text-slate-500">
                  Employee ID: {employeeCode}
                </p>
                <div className="mt-4 grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Saved Addresses
                    </p>
                    <p>{addresses.length} address{addresses.length === 1 ? "" : "es"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Emergency Contact
                    </p>
                    <p>{emergency}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
                    {org?.org_name || "Organization"}
                  </span>
                  <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
                    {emp?.user_email || "Email not available"}
                  </span>
                  <span className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700">
                    {emp?.user_phone || "Phone not available"}
                  </span>
                </div>
              </div>
            </div>
          </article>

          <article className="rounded-xl bg-indigo-700 p-5 text-white shadow-sm">
            <h3 className="text-sm font-semibold">Job Details</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between border-b border-indigo-500/70 pb-2">
                <span className="text-indigo-100">Joined</span>
                <span>
                  {emp?.created_at
                    ? new Date(String(emp.created_at)).toLocaleDateString()
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-indigo-500/70 pb-2">
                <span className="text-indigo-100">Role</span>
                <span>{roleName}</span>
              </div>
              <div className="flex items-center justify-between border-b border-indigo-500/70 pb-2">
                <span className="text-indigo-100">Admin</span>
                <span>{managerName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-indigo-100">Type</span>
                <span className="rounded bg-indigo-500 px-2 py-1 text-xs">
                  {jobType}
                </span>
              </div>
            </div>
          </article>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">
                User Address
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                All saved address records for your employee profile.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {addresses.length} saved
            </span>
          </div>

          {addressesLoading ? (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              Loading addresses...
            </div>
          ) : null}

          {addressesError ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {addressesError}
            </div>
          ) : null}

          {!addressesLoading && !addressesError && addresses.length === 0 ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              No address has been added to your profile yet.
            </div>
          ) : null}

          {!addressesLoading && !addressesError && addressCards.length > 0 ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {addressCards.map((address) => (
                <article
                  key={address.key}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">
                      {address.label}
                    </p>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      {address.typeLabel}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    <p className="font-medium text-slate-800">
                      {address.lineOne}
                    </p>
                    <p>{address.lineTwo}</p>
                    <p>
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        ZIP / PIN:
                      </span>{" "}
                      {address.zipCode}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>

        <section className="grid gap-5 xl:grid-cols-[2fr_1fr]">
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">
                Attendance History
              </h3>
              <span className="text-xs text-slate-500">{monthYearLabel}</span>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {attendanceDays.map((day) => (
                <div
                  key={day.ymd}
                  className={`rounded-lg border p-2 text-center text-[10px] font-medium leading-tight ${day.visual.boxClass} ${
                    day.active ? "ring-2 ring-indigo-400 ring-offset-1" : ""
                  }`}
                  title={day.visual.meaning}
                >
                  <p className="opacity-90">{day.day}</p>
                  <p className="text-sm font-semibold">{day.dateNum}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Color key
              </p>
              <ul className="mt-2 space-y-1.5 text-[11px] text-slate-600">
                {LEGEND_ITEMS.map((item) => (
                  <li key={item.label} className="flex items-start gap-2">
                    <span
                      className={`mt-0.5 h-3 w-3 shrink-0 rounded-sm ${item.sampleClass}`}
                      aria-hidden
                    />
                    <span>
                      <span className="font-semibold text-slate-800">
                        {item.label}:
                      </span>{" "}
                      {item.description}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-5">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  Today Log
                </p>
                <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-800">
                  {todayLog}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void markCheckIn()}
                    disabled={hasCheckedInToday || checkInSubmitting}
                    className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {checkInSubmitting ? "Marking..." : "Check In"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCheckoutConfirm(true)}
                    disabled={hasCheckedOutToday || checkOutSubmitting}
                    className="rounded-md bg-rose-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {hasCheckedOutToday
                      ? "Checked Out"
                      : checkOutSubmitting
                        ? "Processing..."
                        : "Check Out"}
                  </button>
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  {showLiveTimer ? "Working (live)" : "Working Hours"}
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-800">
                  {String(workingHoursDisplay)}
                </p>
                {showLiveTimer ? (
                  <p className="mt-1 text-[10px] text-slate-500">
                    Timer runs until you check out
                  </p>
                ) : null}
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  Late After
                </p>
                <p className="mt-1 text-lg font-semibold text-rose-500">
                  {lateAfter}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  Check Out Time
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-800">
                  {checkOutTime}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  Attendance Status
                </p>
                <p
                  className={`mt-1 text-lg font-semibold ${
                    attendanceStatus.includes("absent")
                      ? "text-red-600"
                      : attendanceStatus.includes("half_day")
                        ? "text-pink-600"
                        : attendanceStatus.includes("short_leave")
                          ? "text-rose-900"
                          : attendanceStatus.includes("full_day")
                            ? "text-emerald-600"
                            : attendanceStatus.startsWith("late")
                              ? "text-orange-600"
                              : attendanceStatus === "—"
                                ? "text-slate-500"
                                : "text-amber-600"
                  }`}
                >
                  {attendanceStatus === "—"
                    ? "—"
                    : attendanceStatus.replace(/_/g, " ").toUpperCase()}
                </p>
              </div>
            </div>
            {attendanceActionError && (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {attendanceActionError}
              </div>
            )}
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700">
              Leave Balance
            </h3>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-2xl font-semibold text-slate-800">
                  {totalLeaves}
                </p>
                <p className="text-[11px] text-slate-400">TOTAL</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-800">
                  {usedLeaves}
                </p>
                <p className="text-[11px] text-slate-400">USED</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-800">
                  {leftLeaves}
                </p>
                <p className="text-[11px] text-slate-400">LEFT</p>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-xs text-slate-600">
              <div className="flex items-center justify-between rounded-md bg-slate-50 p-2">
                <span>Current Shift</span>
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  {emp?.user_shift_name || "NOT ASSIGNED"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-md bg-slate-50 p-2">
                <span>Shift Timings</span>
                <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                  {shiftRange}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-md bg-slate-50 p-2">
                <span>Owner</span>
                <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700">
                  {owner?.user_email || "—"}
                </span>
              </div>
            </div>
          </article>
        </section>
      </div>
      {showCheckoutConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => !checkOutSubmitting && setShowCheckoutConfirm(false)}
          />
          <div className="relative w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-slate-800">
              Confirm Check Out
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to mark your check-out attendance?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCheckoutConfirm(false)}
                disabled={checkOutSubmitting}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void markCheckOut()}
                disabled={checkOutSubmitting}
                className="rounded-md bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white"
              >
                {checkOutSubmitting ? "Confirming..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default Home;
