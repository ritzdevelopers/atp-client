"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BIOMETRIC_LIVE_POLL_MS,
  fetchLivePunches,
  type DevicePunch,
} from "@/services/biometricAttendance";
const MAX_EVENTS = 50;

export function useLivePunchFeed(orgId: string | null | undefined) {
  const [events, setEvents] = useState<DevicePunch[]>([]);
  const sinceIdRef = useRef(0);
  const [isPolling, setIsPolling] = useState(false);

  const poll = useCallback(async () => {
    if (!orgId) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    const isInitial = sinceIdRef.current === 0;
    setIsPolling(true);
    try {
      const res = await fetchLivePunches(
        String(orgId),
        token,
        sinceIdRef.current,
        50,
      );

      if (res.data?.length) {
        setEvents((prev) => {
          if (isInitial) {
            return [...res.data]
              .sort((a, b) => b.device_log_id - a.device_log_id)
              .slice(0, MAX_EVENTS);
          }
          const byId = new Map<number, DevicePunch>();
          for (const punch of [...res.data, ...prev]) {
            byId.set(punch.device_log_id, punch);
          }
          return Array.from(byId.values())
            .sort((a, b) => b.device_log_id - a.device_log_id)
            .slice(0, MAX_EVENTS);
        });
      }

      if (res.latest_device_log_id > sinceIdRef.current) {
        sinceIdRef.current = res.latest_device_log_id;
      }
    } catch {
      /* retry next interval */
    } finally {
      setIsPolling(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;
    sinceIdRef.current = 0;
    setEvents([]);
    void poll();
    const timer = setInterval(poll, BIOMETRIC_LIVE_POLL_MS);
    return () => clearInterval(timer);
  }, [orgId, poll]);

  return { events, isPolling, refresh: poll };
}
