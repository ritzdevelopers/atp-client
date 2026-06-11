"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

export type PortalResponseVariant = "success" | "error" | "info";

export type PortalResponseModalProps = {
  open: boolean;
  variant: PortalResponseVariant;
  title: string;
  message: string;
  detail?: string;
  confirmLabel?: string;
  onClose: () => void;
};

const VARIANT_STYLES: Record<
  PortalResponseVariant,
  {
    topBorder: string;
    headerBg: string;
    iconWrap: string;
    iconColor: string;
    button: string;
    Icon: typeof CheckCircle2;
  }
> = {
  success: {
    topBorder: "border-t-[#0F9D58]",
    headerBg: "bg-gradient-to-r from-[#E6F4EA] to-white",
    iconWrap: "bg-[#C8E6C9]",
    iconColor: "text-[#0F9D58]",
    button:
      "bg-[#008CD3] hover:bg-[#0070AA] shadow-[#008CD3]/20 focus-visible:ring-[#008CD3]/30",
    Icon: CheckCircle2,
  },
  error: {
    topBorder: "border-t-[#D93025]",
    headerBg: "bg-gradient-to-r from-[#FCE8E6] to-white",
    iconWrap: "bg-[#FFCDD2]",
    iconColor: "text-[#D93025]",
    button:
      "bg-[#D93025] hover:bg-[#B71C1C] shadow-[#D93025]/20 focus-visible:ring-[#D93025]/30",
    Icon: AlertCircle,
  },
  info: {
    topBorder: "border-t-[#008CD3]",
    headerBg: "bg-gradient-to-r from-[#E8F4FB] to-white",
    iconWrap: "bg-[#BBDEFB]",
    iconColor: "text-[#008CD3]",
    button:
      "bg-[#008CD3] hover:bg-[#0070AA] shadow-[#008CD3]/20 focus-visible:ring-[#008CD3]/30",
    Icon: Info,
  },
};

export default function PortalResponseModal({
  open,
  variant,
  title,
  message,
  detail,
  confirmLabel = "OK",
  onClose,
}: PortalResponseModalProps) {
  if (!open) return null;

  const styles = VARIANT_STYLES[variant];
  const Icon = styles.Icon;

  return (
    <div
      className="fixed inset-0 z-[10080] flex items-end justify-center bg-[#1F2937]/40 p-0 backdrop-blur-[1px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="portal-response-title"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-transparent"
        onClick={onClose}
      />

      <div
        className={`relative w-full max-w-md overflow-hidden rounded-t-2xl border border-[#E4E7EC] bg-white shadow-2xl sm:rounded-2xl border-t-[3px] ${styles.topBorder}`}
      >
        <div className={`border-b border-[#E4E7EC] px-5 py-5 sm:px-6 ${styles.headerBg}`}>
          <div className="flex items-start gap-3.5">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${styles.iconWrap}`}
            >
              <Icon className={`h-6 w-6 ${styles.iconColor}`} strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
                {variant === "success"
                  ? "Success"
                  : variant === "error"
                    ? "Action failed"
                    : "Notice"}
              </p>
              <h3
                id="portal-response-title"
                className="mt-0.5 text-[18px] font-semibold text-[#1F2937]"
              >
                {title}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#E4E7EC] p-2 text-[#6B7280] transition hover:bg-white/80"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-3 px-5 py-5 sm:px-6">
          <p className="text-[14px] leading-relaxed text-[#374151]">{message}</p>
          {detail ? (
            <div className="rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] px-3.5 py-3 text-[13px] text-[#6B7280]">
              {detail}
            </div>
          ) : null}
        </div>

        <div className="border-t border-[#E4E7EC] bg-[#F9FAFB] px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className={`inline-flex min-h-[44px] w-full items-center justify-center rounded-xl px-5 text-[14px] font-semibold text-white shadow-md transition focus-visible:outline-none focus-visible:ring-2 ${styles.button}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
