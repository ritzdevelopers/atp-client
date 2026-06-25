"use client";

import { useCallback, useContext, useEffect, useState } from "react";
import { SocketContext } from "@/components/sockets/Socket.Provider";
import type { BiometricLiveEvent } from "@/services/biometricAttendance";

const MAX_EVENTS = 50;

export function useBiometricAttendanceFeed(orgId: string | null | undefined) {
  const { socket, isConnected } = useContext(SocketContext);
  const [events, setEvents] = useState<BiometricLiveEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<BiometricLiveEvent | null>(null);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
  }, []);

  useEffect(() => {
    if (!socket || !isConnected || !orgId) return;

    const handler = (payload: BiometricLiveEvent) => {
      if (!payload || String(payload.org_id) !== String(orgId)) return;
      setLastEvent(payload);
      setEvents((prev) => [payload, ...prev].slice(0, MAX_EVENTS));
    };

    socket.on("attendance_live_update", handler);
    return () => {
      socket.off("attendance_live_update", handler);
    };
  }, [socket, isConnected, orgId]);

  return { events, lastEvent, clearEvents, isConnected };
}
