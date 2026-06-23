"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import Loader from "@/components/website/ui/Loader";
import { getMe, type ApiError } from "@/services/auth";

const USER_DASHBOARD_CACHE_KEY = "website_dashboard_data_v1";

type UserInfo = {
  id?: number | string;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  created_at?: string;
};

type OrgInfo = {
  id: number | string;
  org_name?: string;
  org_email?: string;
  org_phone?: string;
  owner_id?: number | string;
  created_at?: string;
  dashboard_type?: DashboardType;
};

type DashboardType = "management" | "employee";

type DashboardPayload = {
  role: string;
  user: UserInfo | null;
  organizations: OrgInfo[];
  dashboardType: DashboardType;
};

function normalizeOrganizations(orgDetails: unknown): OrgInfo[] {
  if (Array.isArray(orgDetails)) {
    return orgDetails.filter((o) => o && (o as OrgInfo).id != null) as OrgInfo[];
  }
  if (orgDetails && (orgDetails as OrgInfo).id != null) {
    return [orgDetails as OrgInfo];
  }
  return [];
}

function resolveOrgDashboardType(org: OrgInfo, fallback: DashboardType): DashboardType {
  const fromOrg = String(org.dashboard_type ?? "").trim().toLowerCase();
  if (fromOrg === "management" || fromOrg === "employee") {
    return fromOrg;
  }
  return fallback;
}

function buildOrgHomeHref(orgId: string | number, dashboardType: DashboardType): string {
  return dashboardType === "management"
    ? `/dashboard/${orgId}/home`
    : `/user-dashboard/${orgId}/home`;
}

function dashboardTypeLabel(dashboardType: DashboardType): string {
  return dashboardType === "management" ? "Management dashboard" : "Employee dashboard";
}

export default function WebsiteDashboardPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<DashboardPayload>({
    role: "",
    user: null,
    organizations: [],
    dashboardType: "employee",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const cachedRaw = sessionStorage.getItem(USER_DASHBOARD_CACHE_KEY);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw) as DashboardPayload;
          if (isMounted && Array.isArray(cached.organizations)) {
            if (cached.role === "admin") {
              router.replace("/portal");
              return;
            }
            setPayload(cached);
            setIsLoading(false);
          }
        }
      } catch {
        sessionStorage.removeItem(USER_DASHBOARD_CACHE_KEY);
      }

      try {
        const result: any = await getMe(token);
        if (!isMounted) return;

        const role = String(result?.role || result?.data?.user_role || "").toLowerCase();
        if (role === "admin") {
          router.replace("/portal");
          return;
        }

        const user = (result?.admin_details ?? result?.user_details ?? null) as UserInfo | null;
        const organizations = normalizeOrganizations(result?.org_details);
        const rootDashboard = String(result?.dashboard_type || "").trim().toLowerCase();
        const dashboardType: DashboardType =
          rootDashboard === "management" ? "management" : "employee";

        const resolvedUserId = result?.admin_details?.id ?? result?.user_details?.id;
        if (resolvedUserId !== undefined && resolvedUserId !== null) {
          localStorage.setItem("user_id", String(resolvedUserId));
        }

        const nextPayload: DashboardPayload = { role, user, organizations, dashboardType };
        localStorage.setItem("dashboard_type", dashboardType);
        if (organizations[0]?.id != null) {
          localStorage.setItem("org_id", String(organizations[0].id));
        }
        setPayload(nextPayload);
        sessionStorage.setItem(USER_DASHBOARD_CACHE_KEY, JSON.stringify(nextPayload));
        setIsLoading(false);
      } catch (error) {
        const apiError = error as ApiError;
        if (apiError.status === 401 || apiError.status === 403) {
          localStorage.removeItem("token");
          localStorage.removeItem("org_id");
          localStorage.removeItem("user_id");
          localStorage.removeItem("dashboard_type");
          sessionStorage.removeItem(USER_DASHBOARD_CACHE_KEY);
          router.replace("/login");
          return;
        }

        if (isMounted) {
          setErrorMessage("Unable to load your portal entrance right now.");
          setIsLoading(false);
        }
      }
    };

    void loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const portalTitle = useMemo(() => {
    if (payload.dashboardType === "management") return "Team Portal Entrance";
    return "My Portal Entrance";
  }, [payload.dashboardType]);

  const portalSubtitle = useMemo(() => {
    if (payload.role === "hr") return "Review your organization details before entering the management workspace.";
    if (payload.role === "manager") return "Review your organization details before entering the management workspace.";
    if (payload.role === "employee") return "Review your organization details before entering your employee workspace.";
    return "Review your organization details before continuing.";
  }, [payload.role]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader text="Loading your portal..." />
      </div>
    );
  }

  return (
    <section className="space-y-8">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-[#0C123A] via-[#1E2A75] to-[#008CD3] p-8 text-white shadow-xl">
        <p className="text-sm uppercase tracking-[0.16em] text-white/70">{portalTitle}</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
          Welcome back, {payload.user?.user_name || "User"}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-white/80 sm:text-base">{portalSubtitle}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full bg-white/15 px-4 py-2 text-sm font-medium capitalize">
            Role: {payload.role || "—"}
          </span>
          <span className="inline-flex items-center rounded-full bg-white/15 px-4 py-2 text-sm font-medium">
            {dashboardTypeLabel(payload.dashboardType)}
          </span>
          <span className="inline-flex items-center rounded-full bg-white/15 px-4 py-2 text-sm font-medium">
            {payload.organizations.length} Organization
            {payload.organizations.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
            Your profile
          </h2>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <p>
              <span className="font-semibold text-slate-800">Name:</span>{" "}
              {payload.user?.user_name || "—"}
            </p>
            <p>
              <span className="font-semibold text-slate-800">Email:</span>{" "}
              {payload.user?.user_email || "—"}
            </p>
            <p>
              <span className="font-semibold text-slate-800">Phone:</span>{" "}
              {payload.user?.user_phone || "—"}
            </p>
            <p>
              <span className="font-semibold text-slate-800">Member since:</span>{" "}
              {payload.user?.created_at
                ? new Date(payload.user.created_at).toLocaleDateString()
                : "—"}
            </p>
          </div>
        </article>

        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-[#0C123A]">Your organizations</h2>
            <p className="mt-1 text-sm text-slate-500">
              Select an organization to enter your {payload.dashboardType === "management" ? "management" : "employee"} dashboard.
            </p>
          </div>

          {payload.organizations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              No organization found for this account.
            </div>
          ) : (
            payload.organizations.map((org) => {
              const orgDashboardType = resolveOrgDashboardType(org, payload.dashboardType);
              const enterHref = buildOrgHomeHref(org.id, orgDashboardType);

              return (
                <article
                  key={String(org.id)}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-sky-100/70 blur-2xl transition-all group-hover:bg-sky-200/80" />
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#008CD3]">
                          Organization #{String(org.id)}
                        </p>
                        <h3 className="mt-1 text-xl font-bold text-[#0C123A]">
                          {org.org_name || `Organization #${String(org.id)}`}
                        </h3>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          orgDashboardType === "management"
                            ? "bg-indigo-50 text-indigo-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {orgDashboardType === "management" ? "Management" : "Employee"}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-slate-600">
                      <p>
                        <span className="font-semibold text-slate-800">Email:</span>{" "}
                        {org.org_email || "—"}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-800">Phone:</span>{" "}
                        {org.org_phone || "—"}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-800">Created:</span>{" "}
                        {org.created_at
                          ? new Date(org.created_at).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>

                    <Link
                      href={enterHref}
                      onClick={() => {
                        const dashboardType = orgDashboardType;
                        localStorage.setItem("org_id", String(org.id));
                        localStorage.setItem("dashboard_type", dashboardType);
                        sessionStorage.setItem("org_details", JSON.stringify(org));
                      }}
                      className="inline-flex w-full items-center justify-center rounded-xl bg-[#0C123A] px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-[#151e59]"
                    >
                      Enter {orgDashboardType === "management" ? "Management" : "Employee"} Dashboard
                    </Link>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
