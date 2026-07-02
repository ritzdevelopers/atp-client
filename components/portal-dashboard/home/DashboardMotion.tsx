"use client";

import type { CSSProperties, ReactNode } from "react";

type FadeSlideInProps = {
  children: ReactNode;
  delayMs?: number;
  className?: string;
};

export function FadeSlideIn({
  children,
  delayMs = 0,
  className = "",
}: FadeSlideInProps) {
  return (
    <div
      className={`card-fade-in ${className}`.trim()}
      style={{ animationDelay: `${delayMs}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}

type StaggerGroupProps = {
  children: ReactNode;
  className?: string;
};

export function StaggerGroup({ children, className = "" }: StaggerGroupProps) {
  return <div className={className}>{children}</div>;
}

type SuccessBannerProps = {
  message: string;
  onDismiss?: () => void;
};

export function SuccessBanner({ message, onDismiss }: SuccessBannerProps) {
  return (
    <div
      role="status"
      className="success-banner-enter mt-3 flex items-center gap-2.5 rounded-lg border border-emerald-200/80 bg-emerald-50 px-3.5 py-2.5 text-[13px] text-emerald-800"
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
        ✓
      </span>
      <span className="min-w-0 flex-1 font-medium">{message}</span>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-md px-2 py-1 text-[12px] text-emerald-700 hover:bg-emerald-100"
          aria-label="Dismiss"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
