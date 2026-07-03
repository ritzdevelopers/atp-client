"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  computeMonthAnalyticsFromSheet,
  type SheetMonthAnalyticsResult,
} from "@/lib/attendanceMonthAnalytics";
import {
  fetchAttendanceSheetCalculation,
  type AttendanceExportResponse,
} from "@/services/attendanceHistory";

type UseAttendanceSheetCalculationOptions = {
  orgId: string | number | null | undefined;
  employeeId?: string | number | null;
  month: number;
  year: number;
  enabled?: boolean;
};

export function useAttendanceSheetCalculation({
  orgId,
  employeeId,
  month,
  year,
  enabled = true,
}: UseAttendanceSheetCalculationOptions) {
  const [sheetResponse, setSheetResponse] = useState<AttendanceExportResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (force = false) => {
      if (!enabled || !orgId) return;

      const token = localStorage.getItem("token");
      if (!token) {
        setError("Not signed in.");
        setSheetResponse(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await fetchAttendanceSheetCalculation(
          token,
          String(orgId),
          employeeId,
          { month, year },
        );
        setSheetResponse(data);
      } catch (err) {
        if (force) setSheetResponse(null);
        setError(
          err instanceof Error ? err.message : "Could not load attendance calculation.",
        );
      } finally {
        setLoading(false);
      }
    },
    [enabled, orgId, employeeId, month, year],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const analytics = useMemo<SheetMonthAnalyticsResult | null>(() => {
    if (!sheetResponse) return null;
    return computeMonthAnalyticsFromSheet(sheetResponse, year, month);
  }, [sheetResponse, year, month]);

  const statusByDate = analytics?.monthAttendance.statusByDate ?? new Map();

  return {
    sheetResponse,
    analytics,
    statusByDate,
    sheetReport: analytics?.sheetReport ?? null,
    loading,
    error,
    reload: () => load(true),
  };
}
