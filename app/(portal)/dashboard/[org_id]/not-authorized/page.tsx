"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export default function NotAuthorizedPage() {
  const params = useParams();
  const orgId = String(params?.org_id ?? "");

  return (
    <section className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
        Access denied
      </p>
      <h1 className="mt-3 text-2xl font-bold text-[#0C123A]">
        You Are Not Authorized to View This Page
      </h1>
      <p className="mt-3 text-sm text-slate-600">
        This page is not included in your organization&apos;s assigned features or sub-features.
        Contact your administrator if you believe this is a mistake.
      </p>
      <Link
        href={`/dashboard/${orgId}/home`}
        className="mt-8 inline-flex rounded-lg bg-[#0C123A] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1a2564]"
      >
        Go to Home
      </Link>
    </section>
  );
}
