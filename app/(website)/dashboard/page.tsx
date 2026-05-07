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
};

type DashboardPayload = {
  role: string;
  user: UserInfo | null;
  organizations: OrgInfo[];
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

export default function WebsiteDashboardPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<DashboardPayload>({
    role: "",
    user: null,
    organizations: [],
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

        const role = String(result?.role || "").toLowerCase();
        const user = (result?.admin_details ?? result?.user_details ?? null) as UserInfo | null;
        const organizations = normalizeOrganizations(result?.org_details);

        const nextPayload: DashboardPayload = { role, user, organizations };
        setPayload(nextPayload);
        sessionStorage.setItem(USER_DASHBOARD_CACHE_KEY, JSON.stringify(nextPayload));
        setIsLoading(false);
      } catch (error) {
        const apiError = error as ApiError;
        if (apiError.status === 401 || apiError.status === 403) {
          localStorage.removeItem("token");
          localStorage.removeItem("org_id");
          localStorage.removeItem("user_id");
          sessionStorage.removeItem(USER_DASHBOARD_CACHE_KEY);
          router.replace("/login");
          return;
        }

        if (isMounted) {
          setErrorMessage("Unable to load dashboard data right now.");
          setIsLoading(false);
        }
      }
    };

    void loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const title = useMemo(() => {
    if (payload.role === "admin") return "Admin Dashboard";
    if (payload.role === "hr" || payload.role === "manager") return "Team Dashboard";
    if (payload.role === "employee") return "Employee Dashboard";
    return "Dashboard";
  }, [payload.role]);

  const isManagementRole = payload.role === "hr" || payload.role === "manager";

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader text="Loading dashboard..." />
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
        <h1 className="mt-2 text-2xl font-bold text-[#0C123A]">Welcome, {payload.user?.user_name || "User"}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Your profile and organizations are loaded from `get-me` and refreshed securely.
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">User Information</h2>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <p>
              <span className="font-semibold text-slate-800">Name:</span> {payload.user?.user_name || "—"}
            </p>
            <p>
              <span className="font-semibold text-slate-800">Email:</span> {payload.user?.user_email || "—"}
            </p>
            <p>
              <span className="font-semibold text-slate-800">Phone:</span> {payload.user?.user_phone || "—"}
            </p>
            <p>
              <span className="font-semibold text-slate-800">Role:</span> {payload.role || "—"}
            </p>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">Organizations</h2>
          <p className="mt-1 text-sm text-slate-500">
            {payload.organizations.length} organization{payload.organizations.length === 1 ? "" : "s"} found
          </p>
          <div className="mt-4 space-y-3">
            {payload.organizations.length === 0 ? (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">No organization found.</p>
            ) : (
              payload.organizations.map((org) => (
                <div key={String(org.id)} className="rounded-xl border border-slate-200 p-3">
                  <p className="font-semibold text-[#0C123A]">{org.org_name || `Organization #${String(org.id)}`}</p>
                  <p className="mt-1 text-xs text-slate-500">{org.org_email || "No email"}</p>
                  <Link
                    href={
                      isManagementRole
                        ? `/dashboard/${org.id}/home`
                        : `/user-dashboard/${org.id}/home`
                    }
                    onClick={() => localStorage.setItem("org_id", String(org.id))}
                    className="mt-3 inline-flex rounded-lg bg-[#0C123A] px-3 py-2 text-xs font-semibold text-white hover:bg-[#151e59]"
                  >
                    Enter Organization
                  </Link>
                </div>
              ))
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

