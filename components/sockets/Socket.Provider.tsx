"use client";

import { io, Socket } from "socket.io-client";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  jwtUserId,
  type UserActiveStatusRecord,
} from "@/services/chatApplication";

export type UserActiveStatus = {
  isOnline: boolean;
  lastActiveTime: string | null;
};

export const SocketContext = createContext<{
  socket: Socket | null;
  socket_id: string | null;
  isConnected: boolean;
  getUserActiveStatus: (userId: number | string) => UserActiveStatus;
}>({
  socket: null,
  socket_id: null,
  isConnected: false,
  getUserActiveStatus: () => ({ isOnline: false, lastActiveTime: null }),
});

function getOrgIdFromPathname(pathname: string | null): string | null {
  const match = pathname?.match(/\/(?:dashboard|user-dashboard)\/([^/]+)/);
  return match?.[1] ?? null;
}

function SocketProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const orgId = getOrgIdFromPathname(pathname);

  const [socket, setSocket] = useState<Socket | null>(null);
  const [socket_id, setSocket_id] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userStatusMap, setUserStatusMap] = useState<
    Record<string, UserActiveStatus>
  >({});

  const currentUserIdRef = useRef<number | null>(null);
  const orgIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    currentUserIdRef.current = jwtUserId(localStorage.getItem("token"));
  }, []);

  useEffect(() => {
    orgIdRef.current = orgId;
  }, [orgId]);

  const applyStatusRecords = useCallback((records: UserActiveStatusRecord[]) => {
    setUserStatusMap((prev) => {
      const next = { ...prev };
      for (const record of records) {
        const key = String(record.user_id);
        const isOnline = Boolean(record.is_online);
        next[key] = {
          isOnline,
          lastActiveTime: isOnline
            ? (next[key]?.lastActiveTime ?? null)
            : record.last_active_time
              ? new Date(record.last_active_time).toISOString()
              : (next[key]?.lastActiveTime ?? null),
        };
      }
      return next;
    });
  }, []);

  const emitActiveStatus = useCallback((socketInstance: Socket) => {
    const userId = currentUserIdRef.current;
    const org = orgIdRef.current;
    if (userId == null || !org) return;
    socketInstance.emit("user_active_status", userId, Number(org));
    socketInstance.emit("get_all_active_users", userId, Number(org));
  }, []);

  const emitInactiveStatus = useCallback((socketInstance: Socket) => {
    const userId = currentUserIdRef.current;
    const org = orgIdRef.current;
    if (userId == null || !org) return;
    socketInstance.emit("user_inactive_status", userId, Number(org));
  }, []);

  useEffect(() => {
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL as string, {
      transports: ["websocket", "polling"],
    });

    const onConnect = () => {
      setIsConnected(true);
      setSocket(socketInstance);
      setSocket_id(socketInstance.id ?? null);
      emitActiveStatus(socketInstance);
    };

    const onDisconnect = () => {
      setIsConnected(false);
      setSocket_id(null);
    };

    const onAllActiveUsers = (records: UserActiveStatusRecord[]) => {
      if (!Array.isArray(records)) return;
      applyStatusRecords(records);
    };

    const onUserStatusUpdate = (record: UserActiveStatusRecord) => {
      if (!record?.user_id) return;
      applyStatusRecords([record]);
    };

    socketInstance.on("connect", onConnect);
    socketInstance.on("disconnect", onDisconnect);
    socketInstance.on("all_active_users", onAllActiveUsers);
    socketInstance.on("user_status_update", onUserStatusUpdate);

    return () => {
      emitInactiveStatus(socketInstance);
      socketInstance.off("connect", onConnect);
      socketInstance.off("disconnect", onDisconnect);
      socketInstance.off("all_active_users", onAllActiveUsers);
      socketInstance.off("user_status_update", onUserStatusUpdate);
      socketInstance.disconnect();
      setIsConnected(false);
      setSocket(null);
      setSocket_id(null);
    };
  }, [applyStatusRecords, emitActiveStatus, emitInactiveStatus]);

  useEffect(() => {
    if (!socket || !isConnected || !orgId) return;
    emitActiveStatus(socket);
  }, [socket, isConnected, orgId, emitActiveStatus]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        emitInactiveStatus(socket);
      } else {
        emitActiveStatus(socket);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [socket, isConnected, emitActiveStatus, emitInactiveStatus]);

  const getUserActiveStatus = useCallback(
    (userId: number | string): UserActiveStatus => {
      return (
        userStatusMap[String(userId)] ?? {
          isOnline: false,
          lastActiveTime: null,
        }
      );
    },
    [userStatusMap],
  );

  const value = useMemo(
    () => ({
      socket,
      socket_id,
      isConnected,
      getUserActiveStatus,
    }),
    [socket, socket_id, isConnected, getUserActiveStatus],
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export default SocketProvider;
