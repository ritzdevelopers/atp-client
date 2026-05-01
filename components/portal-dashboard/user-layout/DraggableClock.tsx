"use client";

import { useEffect, useRef, useState } from "react";

export default function DraggableClock() {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [position, setPosition] = useState({ x: 24, y: 24 });
  const draggingRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!draggingRef.current) return;
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 170, e.clientX - offsetRef.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 70, e.clientY - offsetRef.current.y)),
      });
    }
    function onUp() {
      draggingRef.current = false;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    draggingRef.current = true;
    offsetRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  }

  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const mo = String(now.getMonth() + 1).padStart(2, "0");
  const yy = now.getFullYear();

  return (
    <div
      onPointerDown={onPointerDown}
      className="fixed z-50 cursor-grab select-none rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur active:cursor-grabbing"
      style={{ left: position.x, top: position.y }}
      aria-label="Draggable clock"
    >
      <p className="text-sm font-bold text-[#0C123A] tabular-nums">
        {mounted ? `${hh}:${mm}:${ss}` : "--:--:--"}
      </p>
      <p className="text-[11px] text-slate-500 tabular-nums">
        {mounted ? `${dd}:${mo}:${yy}` : "--:--:----"}
      </p>
    </div>
  );
}
