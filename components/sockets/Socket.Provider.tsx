"use client";
import { io, Socket } from "socket.io-client";
import { createContext, useState, useEffect } from "react";

export const SocketContext = createContext<{
  socket: Socket | null;
  socket_id: string | null;
  isConnected: boolean;
}>({ socket: null, socket_id: null, isConnected: false });

function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socket_id, setSocket_id] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL as string, {
        transports: ["websocket","polling"],
    });
    if(!isConnected) {
    socket.on("connect", () => {
      setIsConnected(true);
      setSocket(socket);
      setSocket_id(socket.id as string);
    });
    }
    
    return () => {
      socket.disconnect();
      setIsConnected(false);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, socket_id, isConnected }}>
      {children}{" "}
    </SocketContext.Provider>
  );
}

export default SocketProvider;
