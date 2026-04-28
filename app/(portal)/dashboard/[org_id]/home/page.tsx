"use client";

import { BarChart3, Building2, UserCircle } from "lucide-react";
import { MdWorkspacePremium } from "react-icons/md";
import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import type {
  RightMainSideOrganization,
  RightMainSideUser,
} from "@/components/portal-dashboard/Layout/RightMainSide";

function formatJoinedDate(value: string | Date | null | undefined): string {
  if (value == null || value === "") return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function greetingForHour(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function displayNameFromEmail(email: string | null | undefined): string {
  if (!email?.trim()) return "there";
  const local = email.split("@")[0] ?? "";
  const cleaned = local.replace(/[._-]+/g, " ").trim();
  if (!cleaned) return "there";
  return cleaned
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function formatRoleLabel(role: string | null | undefined): string {
  const r = (role ?? "").trim().toLowerCase();
  if (r === "admin") return "Admin";
  if (r === "hr") return "HR";
  if (r === "manager" || r === "manger") return "Manager";
  if (!r) return "Member";
  return r.charAt(0).toUpperCase() + r.slice(1).toLowerCase();
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  const display = value != null && String(value).length > 0 ? String(value) : "—";
  return (
    <div className="flex flex-row items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0 last:pb-0 first:pt-0">
      <span className="shrink-0 text-sm text-slate-500">{label}</span>
      <span className="min-w-0 text-right text-sm font-semibold text-[#0C123A]">{display}</span>
    </div>
  );
}

function DashboardCard({
  icon: Icon,
  title,
  delayMs,
  children,
  id,
}: {
  icon: typeof Building2;
  title: string;
  delayMs: number;
  children: React.ReactNode;
  id: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="dashboard-enter rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition-all duration-300 hover:border-slate-300 hover:shadow-md"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C99237]/12">
          <Icon className="h-5 w-5 shrink-0 text-[#C99237]" aria-hidden />
        </span>
        <h2 id={`${id}-title`} className="text-base font-semibold text-[#0C123A]">
          {title}
        </h2>
      </div>
      <div className="my-4 border-t border-slate-100" />
      <div className="flex flex-col">{children}</div>
    </section>
  );
}

function HomeOverview({
  organization,
  user,
}: {
  organization: RightMainSideOrganization;
  user: RightMainSideUser;
}) {
  const roleKey = user.user_role_name?.trim().toLowerCase() ?? "";
  const roleBadgeLabel = formatRoleLabel(user.user_role_name);
  const displayName = user.user_name?.trim() || displayNameFromEmail(user.user_email);
  const orgTitle = organization.org_name?.trim() || "Your organization";

  const roleBadgeClass =
    roleKey === "admin"
      ? "bg-[#C99237] text-[#0C123A]"
      : roleKey === "hr"
        ? "bg-[#0C123A] text-white"
        : roleKey === "manager" || roleKey === "manger"
          ? "border-2 border-[#C99237] bg-white text-[#0C123A]"
          : "bg-slate-200 text-[#0C123A]";

  return (
    <div className="space-y-8">
      <header
        className="dashboard-enter rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8"
        style={{ animationDelay: "0ms" }}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-3 text-2xl font-bold tracking-tight text-[#0C123A] sm:text-3xl">
              <span>
                {greetingForHour()}, {displayName}
              </span>
              <MdWorkspacePremium
                className="h-8 w-8 shrink-0 text-[#C99237] sm:h-9 sm:w-9"
                aria-hidden
              />
            </h1>
            <p className="mt-2 text-sm text-slate-500">{orgTitle}</p>
          </div>
          <span
            className={`inline-flex w-fit shrink-0 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide ${roleBadgeClass}`}
          >
            {roleBadgeLabel}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <DashboardCard icon={Building2} title="Organization" delayMs={100} id="dash-org-card">
          <InfoRow label="Name" value={organization.org_name} />
          <InfoRow label="Email" value={organization.org_email} />
          <InfoRow label="Phone" value={organization.org_phone} />
        </DashboardCard>

        <DashboardCard icon={UserCircle} title="Owner" delayMs={200} id="dash-owner-card">
          <InfoRow label="Name" value={organization.owner_name ?? organization.owner_info?.name} />
          <InfoRow label="Email" value={organization.owner_email ?? organization.owner_info?.email} />
          <InfoRow label="Phone" value={organization.owner_phone} />
        </DashboardCard>

        <DashboardCard icon={BarChart3} title="Your account" delayMs={300} id="dash-account-card">
          <InfoRow label="Full name" value={user.user_name} />
          <InfoRow label="Email" value={user.user_email} />
          <InfoRow label="Phone" value={user.user_phone} />
          <InfoRow label="Role" value={formatRoleLabel(user.user_role_name)} />
          <InfoRow label="Member since" value={formatJoinedDate(user.user_created_at)} />
        </DashboardCard>
      </div>
    </div>
  );
}

export default function HomePage() {
  const ctx = useManagementDashboardContext();

  if (!ctx) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-[#0C123A]">Home</p>
      </div>
    );
  }

  const { organization, user, loading } = ctx;

  if (loading || !organization || !user) {
    return (
      <div
        className="dashboard-enter rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
        style={{ animationDelay: "0ms" }}
      >
        <p className="text-base font-medium text-[#0C123A]">
          {loading ? "Loading dashboard…" : "Could not load organization."}
        </p>
      </div>
    );
  }

  return <HomeOverview organization={organization} user={user} />;
}
