import { type ReactNode } from "react";

type CardProps = {
  title: string;
  description?: string;
  children?: ReactNode;
  highlight?: boolean;
};

export default function Card({
  title,
  description,
  children,
  highlight = false,
}: CardProps) {
  return (
    <article
      className={`rounded-2xl border bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${
        highlight ? "border-[#C99237] ring-1 ring-[#C99237]" : "border-slate-200"
      }`}
    >
      <h3 className="text-xl font-bold text-[#0C123A]">{title}</h3>
      {description ? (
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
      ) : null}
      {children ? <div className="mt-5">{children}</div> : null}
    </article>
  );
}
