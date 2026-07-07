/** Shared presentation tokens — clean, light dashboard aesthetic. */

export const dashPageCls =
  "mx-auto flex w-full max-w-[1360px] flex-col gap-6 px-1 py-1 sm:px-0 lg:gap-7";

export const dashCardCls =
  "card-fade-in overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]";

export const dashPanelCls =
  "flex h-[320px] min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]";

/** @deprecated Use section headers instead — kept for gradual migration */
export const dashCardAccent = "hidden";

export const dashSectionHeadCls =
  "flex items-center gap-3 border-b border-slate-100 px-5 py-4";

export const dashSectionBodyCls = "px-5 py-4";

export const dashSectionTitleCls =
  "text-[15px] font-semibold tracking-tight text-slate-900";

export const dashSectionMetaCls = "text-[13px] text-slate-500";

export const dashLabelCls = "text-[11px] font-medium text-slate-500";

export const dashValueCls = "text-[14px] font-semibold text-slate-900";

export const mobileLabelCls = dashLabelCls;
export const mobileCaptionCls = "text-[13px] leading-relaxed text-slate-500";

export function iconBadgeCls(variant: "blue" | "amber" | "emerald" | "violet" | "slate" = "blue") {
  const map = {
    blue: "bg-sky-50 text-sky-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
    slate: "bg-slate-100 text-slate-600",
  };
  return `flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${map[variant]}`;
}

export function statBoxCls(accent?: "sky" | "amber" | "emerald" | "default") {
  const bg =
    accent === "sky"
      ? "bg-sky-50/60"
      : accent === "amber"
        ? "bg-amber-50/60"
        : accent === "emerald"
          ? "bg-emerald-50/60"
          : "bg-slate-50/80";
  return `rounded-xl ${bg} px-3.5 py-3`;
}

export function btnPrimaryCls(full = false) {
  return `inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-[#0C123A] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#1a2563] disabled:pointer-events-none disabled:opacity-40 ${full ? "w-full" : ""}`;
}

export function btnBrandCls(full = false) {
  return `inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-[#008CD3] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#0070AA] disabled:pointer-events-none disabled:opacity-40 ${full ? "w-full" : ""}`;
}

export function btnDangerCls(full = false) {
  return `inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-red-700 disabled:pointer-events-none disabled:opacity-40 ${full ? "w-full" : ""}`;
}

export function btnGhostCls(full = false) {
  return `inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 ${full ? "w-full flex-1" : ""}`;
}

export const mobilePrimaryBtnCls = btnBrandCls;
export const mobileDangerBtnCls = btnDangerCls;
export const mobileSecondaryBtnCls = btnGhostCls;
export const mobileGoldBtnCls = btnPrimaryCls;

export function roleBadgeClass(roleKey: string): string {
  const base =
    "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold";
  if (roleKey === "admin") return `${base} bg-amber-100 text-amber-900`;
  if (roleKey === "hr") return `${base} bg-[#0C123A] text-white`;
  if (roleKey === "manager" || roleKey === "manger")
    return `${base} bg-slate-100 text-slate-800 ring-1 ring-amber-200`;
  return `${base} bg-slate-100 text-slate-600`;
}

export function userInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function avatarCls(size: "sm" | "md" = "md"): string {
  return size === "sm"
    ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-[#008CD3] text-xs font-semibold text-white"
    : "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-[#008CD3] text-sm font-semibold text-white shadow-sm";
}
