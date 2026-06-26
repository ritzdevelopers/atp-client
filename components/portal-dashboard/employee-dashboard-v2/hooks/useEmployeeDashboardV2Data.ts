"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { resolveDashboardDataOrgId } from "@/lib/resolveDashboardOrgId";
import {
  clearEmployeeDashboardHomeCache,
  getBootstrappedHomeCache,
  writeEmployeeDashboardHomeCache,
} from "@/lib/employeeDashboardHomeCache";
import { getTodayLocalYmd } from "@/lib/attendanceDates";
import {
  countPendingHandoverItems,
  fetchHandoverAssignedToMe,
} from "@/services/handoverAssigned";
import { getCompanyHolidays } from "@/services/organizationSettings";
import { useBiometricAttendanceFeed } from "@/hooks/useBiometricAttendanceFeed";
import { useDeviceLiveAttendance } from "@/hooks/useDeviceLiveAttendance";
import type { AttendanceHistoryRow, EmployeeDashboardResponse, EmployeeTaskRow, UserAddressRow } from "../types";
import {
  computeMonthlyAttendanceStats,
  getCurrentDateAndTime,
  historyByLocalYmd,
  upsertTodayHistory,
} from "../utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export function useEmployeeDashboardV2Data() {
  const params = useParams();
  const orgIdParam = params?.org_id;
  const routeOrgId = String(orgIdParam ?? "");

  const [orgId, setOrgId] = useState<number | null>(null);
  const [orgResolving, setOrgResolving] = useState(true);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EmployeeDashboardResponse | null>(null);
  const [addresses, setAddresses] = useState<UserAddressRow[]>([]);
  const [addressesError, setAddressesError] = useState<string | null>(null);
  const [handoverPendingCount, setHandoverPendingCount] = useState(0);
  const [holidays, setHolidays] = useState<Awaited<ReturnType<typeof getCompanyHolidays>>>([]);
  const [tasks, setTasks] = useState<EmployeeTaskRow[]>([]);
  const [checkInSubmitting, setCheckInSubmitting] = useState(false);
  const [checkOutSubmitting, setCheckOutSubmitting] = useState(false);
  const [attendanceActionError, setAttendanceActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setOrgResolving(true);
    void resolveDashboardDataOrgId(routeOrgId)
      .then((resolved) => {
        if (!cancelled) setOrgId(resolved);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Could not resolve organization",
          );
          setOrgId(null);
          setLoading(false);
        }
      })
      .finally(() => {
        if (!cancelled) setOrgResolving(false);
      });
    return () => {
      cancelled = true;
    };
  }, [routeOrgId]);

  const loadDashboardData = useCallback(
    async (forceRefresh = false) => {
      await Promise.resolve();
      if (orgResolving || orgId == null || Number.isNaN(orgId)) {
        if (!orgResolving && orgId == null) {
          setLoading(false);
        }
        return;
      }
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Not signed in.");
        setLoading(false);
        return;
      }

      const cached = !forceRefresh ? getBootstrappedHomeCache(orgId) : null;
      if (cached) {
        setData(cached.data as EmployeeDashboardResponse);
        setAddresses(cached.addresses as UserAddressRow[]);
        setAddressesError(cached.addressesError);
        setHandoverPendingCount(cached.handoverPendingCount ?? 0);
        setError(null);
        setLoading(false);
        setRefreshing(true);
      } else if (forceRefresh) {
        clearEmployeeDashboardHomeCache(orgId);
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      let nextAddresses: UserAddressRow[] = [];
      let nextAddressesError: string | null = null;
      let nextHandoverCount = 0;

      try {
        const q = encodeURIComponent(String(orgId));
        const [dashboardRes, handoverResult, holidaysResult, tasksRes] =
          await Promise.all([
            fetch(
              `${API_URL}/api/employees/get-employees-full-information?org_id=${q}`,
              { headers: { Authorization: `Bearer ${token}` } },
            ),
            fetchHandoverAssignedToMe(token, orgId).catch(() => null),
            getCompanyHolidays(token, orgId).catch(() => []),
            fetch(
              `${API_URL}/api/task-management/get-my-tasks?org_id=${q}&limit=8&sort_by=task_deadline&is_ascending=true`,
              { headers: { Authorization: `Bearer ${token}` } },
            ).catch(() => null),
          ]);

        const result = (await dashboardRes.json()) as EmployeeDashboardResponse;
        if (!dashboardRes.ok) {
          throw new Error(result.message || "Could not load employee information");
        }

        setData(result);
        setHolidays(holidaysResult);

        if (handoverResult) {
          nextHandoverCount = countPendingHandoverItems(handoverResult);
          setHandoverPendingCount(nextHandoverCount);
        } else {
          setHandoverPendingCount(0);
        }

        if (tasksRes?.ok) {
          const tasksJson = (await tasksRes.json()) as { data?: EmployeeTaskRow[] };
          setTasks(Array.isArray(tasksJson.data) ? tasksJson.data : []);
        } else {
          setTasks([]);
        }

        const employee = result.employee ?? result.employees;
        const employeeId = employee?.id;
        if (employeeId != null) {
          try {
            const addressRes = await fetch(
              `${API_URL}/api/user/get-user-address/${q}/${encodeURIComponent(String(employeeId))}`,
              { headers: { Authorization: `Bearer ${token}` } },
            );
            const addressResult = (await addressRes.json()) as {
              data?: UserAddressRow[];
              message?: string;
            };
            if (!addressRes.ok) {
              throw new Error(addressResult.message || "Could not load addresses");
            }
            nextAddresses = Array.isArray(addressResult.data) ? addressResult.data : [];
            setAddresses(nextAddresses);
            setAddressesError(null);
          } catch (addressError) {
            nextAddresses = [];
            nextAddressesError =
              addressError instanceof Error
                ? addressError.message
                : "Could not load addresses";
            setAddresses([]);
            setAddressesError(nextAddressesError);
          }
        } else {
          setAddresses([]);
          setAddressesError(null);
        }

        writeEmployeeDashboardHomeCache(orgId, {
          data: result,
          addresses: nextAddresses,
          addressesError: nextAddressesError,
          handoverPendingCount: nextHandoverCount,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load dashboard");
        setData(null);
        setAddresses([]);
        setHandoverPendingCount(0);
        setTasks([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orgId, orgResolving],
  );

  useLayoutEffect(() => {
    if (orgResolving || orgId == null) return;
    void loadDashboardData();
  }, [loadDashboardData, orgResolving, orgId]);

  const emp = data?.employee ?? data?.employees;
  const todayYmd = getTodayLocalYmd();
  const historyMap = useMemo(
    () => historyByLocalYmd(data?.attendance_history),
    [data?.attendance_history],
  );
  const todayRecord = historyMap.get(todayYmd);
  const hasCheckedInToday = Boolean(todayRecord?.check_in);
  const hasCheckedOutToday = Boolean(todayRecord?.check_out);

  const { lastEvent: biometricEvent } = useBiometricAttendanceFeed(
    orgId != null ? String(orgId) : undefined,
  );
  const { attendance: deviceAttendance } = useDeviceLiveAttendance(
    orgId != null ? String(orgId) : undefined,
  );

  const attendanceStats = useMemo(
    () => computeMonthlyAttendanceStats(data?.attendance_history),
    [data?.attendance_history],
  );

  const markCheckIn = useCallback(async () => {
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
      const res = await fetch(`${API_URL}/api/employees/mark-attendance-check-in`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ org_id: orgId, user_date, user_time }),
      });
      const result = (await res.json()) as {
        message?: string;
        status?: string;
        attendance_id?: number | string;
      };
      if (!res.ok) throw new Error(result.message || "Could not mark check-in");
      setData((prev) =>
        upsertTodayHistory(prev, todayYmd, {
          id: result.attendance_id,
          check_in: `${user_date} ${user_time}:00`,
          check_out: null,
          attendance_status: result.status || "present",
          working_time: null,
        }),
      );
    } catch (e) {
      setAttendanceActionError(
        e instanceof Error ? e.message : "Could not mark check-in",
      );
    } finally {
      setCheckInSubmitting(false);
    }
  }, [orgId, todayYmd]);

  const markCheckOut = useCallback(async () => {
    if (!orgId || Number.isNaN(orgId)) return;
    const token = localStorage.getItem("token");
    if (!token) {
      setAttendanceActionError("Not signed in.");
      return;
    }
    const { user_date, user_time } = getCurrentDateAndTime();
    setCheckOutSubmitting(true);
    setAttendanceActionError(null);
    try {
      const res = await fetch(`${API_URL}/api/employees/mark-attendance-check-out`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ org_id: orgId, user_date, user_time }),
      });
      const result = (await res.json()) as {
        message?: string;
        finalStatus?: string;
        workingMinutes?: number;
      };
      if (!res.ok) throw new Error(result.message || "Could not mark check-out");
      const wm = result.workingMinutes;
      const workingDisplay =
        wm != null && !Number.isNaN(Number(wm)) ? Number(wm) / 60 : undefined;
      const patch: Partial<AttendanceHistoryRow> = {
        check_out: `${user_date} ${user_time}:00`,
      };
      if (result.finalStatus != null) patch.attendance_status = result.finalStatus;
      if (workingDisplay !== undefined) patch.working_time = workingDisplay;
      setData((prev) => upsertTodayHistory(prev, todayYmd, patch));
    } catch (e) {
      setAttendanceActionError(
        e instanceof Error ? e.message : "Could not mark check-out",
      );
    } finally {
      setCheckOutSubmitting(false);
    }
  }, [orgId, todayYmd]);

  return {
    orgId,
    orgIdParam: orgId != null ? String(orgId) : routeOrgId,
    routeOrgId,
    orgResolving,
    loading,
    refreshing,
    error,
    data,
    emp,
    owner: data?.owner,
    org: data?.organization,
    teams: data?.teams ?? [],
    addresses,
    addressesError,
    handoverPendingCount,
    holidays,
    tasks,
    attendanceStats,
    todayRecord,
    hasCheckedInToday,
    hasCheckedOutToday,
    biometricEvent,
    deviceAttendance,
    attendanceActionError,
    checkInSubmitting,
    checkOutSubmitting,
    markCheckIn,
    markCheckOut,
    refresh: () => loadDashboardData(true),
    historyMap,
  };
}
