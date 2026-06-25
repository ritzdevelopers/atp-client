"use client";

import { useEffect, useState } from "react";
import {
  fetchMyLiveAttendance,
  type DeviceLiveAttendance,
} from "@/services/biometricAttendance";

const POLL_MS = 5000;

export function useDeviceLiveAttendance(orgId: string | null | undefined) {
  const [attendance, setAttendance] = useState<DeviceLiveAttendance | null>(null);
  const [mapped, setMapped] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;

    let cancelled = false;

    const poll = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const res = await fetchMyLiveAttendance(String(orgId), token);
        if (cancelled) return;
        setMapped(res.mapped);
        setAttendance(res.data);
      } catch {
        /* keep last good value */
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [orgId]);

  return { attendance, mapped, loading };
}
