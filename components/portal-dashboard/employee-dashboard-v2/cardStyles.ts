import {
  dashCardCls,
  dashLabelCls,
  dashSectionMetaCls,
  dashSectionTitleCls,
} from "@/components/portal-dashboard/home/dashboardTokens";

export const cardBase = `${dashCardCls} transition duration-200 hover:border-[#008CD3]/15 hover:shadow-[0_4px_20px_rgba(15,23,42,0.08)]`;

export const cardPadding = "p-5 sm:p-6";

export const cardTitle = dashSectionTitleCls;

export const cardSubtitle = dashSectionMetaCls;

export const sectionLabel = `${dashLabelCls} font-semibold uppercase tracking-[0.08em]`;

export const badgeBase =
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold";

export const iconWrap =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl";
