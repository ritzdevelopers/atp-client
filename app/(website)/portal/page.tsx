"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import Loader from "@/components/website/ui/Loader";
import { getMe, type ApiError } from "@/services/auth";

const ADMIN_ORGS_SESSION_KEY = "admin_org_data";

type Organization = {
  id: number;
  org_name: string;
  owner_id: number;
  org_email: string;
  org_phone: string;
  created_at?: string;
};

type SessionAdminData = {
  user_role: string;
  org_details: Organization[];
};

export default function AdminPortalPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadAdminData = async () => {
      try {
        const cachedDataRaw = sessionStorage.getItem(ADMIN_ORGS_SESSION_KEY);
        if (cachedDataRaw) {
          const cachedData = JSON.parse(cachedDataRaw) as SessionAdminData;
          const isAdmin = (cachedData.user_role || "").toLowerCase() === "admin";
          const hasOrganizations =
            Array.isArray(cachedData.org_details) && cachedData.org_details.length > 0;

          if (isAdmin && hasOrganizations) {
            if (isMounted) {
              setOrganizations(cachedData.org_details);
              setIsLoading(false);
            }
            return;
          }
        }

        const token = localStorage.getItem("token");
        if (!token) {
          router.replace("/login");
          return;
        }

        const result = await getMe(token);
        const userRole = (result.data?.user_role || result.data?.role_name || "").toLowerCase();
        const orgDetails = Array.isArray(result.data?.org_details)
          ? (result.data.org_details as Organization[])
          : [];

        if (userRole !== "admin" || orgDetails.length === 0) {
          if (isMounted) {
            setErrorMessage("Admin organizations not found.");
            setIsLoading(false);
          }
          return;
        }

        sessionStorage.setItem(
          ADMIN_ORGS_SESSION_KEY,
          JSON.stringify({ user_role: userRole, org_details: orgDetails }),
        );

        if (isMounted) {
          setOrganizations(orgDetails);
          setIsLoading(false);
        }
      } catch (error) {
        const apiError = error as ApiError;
        if (apiError.status === 401 || apiError.status === 403) {
          localStorage.removeItem("token");
          sessionStorage.removeItem(ADMIN_ORGS_SESSION_KEY);
          router.replace("/login");
          return;
        }

        if (isMounted) {
          setErrorMessage("Unable to load admin organizations right now.");
          setIsLoading(false);
        }
      }
    };

    loadAdminData();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const totalOrganizations = useMemo(() => organizations.length, [organizations.length]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader text="Loading admin panel..." />
      </div>
    );
  }

  return (
    <section className="space-y-8">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-[#0C123A] via-[#1E2A75] to-[#4F46E5] p-8 text-white shadow-xl">
        <p className="text-sm uppercase tracking-[0.16em] text-white/70">Admin Portal</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Manage Your Organizations</h1>
        <p className="mt-3 max-w-2xl text-sm text-white/80 sm:text-base">
          Centralized access to all organizations you own. Select one organization to enter and
          continue managing attendance, users, and roles.
        </p>
        <div className="mt-6 inline-flex items-center rounded-full bg-white/15 px-4 py-2 text-sm font-medium">
          {totalOrganizations} Organization{totalOrganizations === 1 ? "" : "s"}
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        {organizations.map((organization) => (
          <article
            key={organization.id}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-indigo-100/70 blur-2xl transition-all group-hover:bg-indigo-200/80" />
            <div className="relative z-10 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">
                    Organization #{organization.id}
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-[#0C123A]">{organization.org_name}</h2>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  Active
                </span>
              </div>

              <div className="space-y-2 text-sm text-slate-600">
                <p>
                  <span className="font-semibold text-slate-800">Email:</span> {organization.org_email}
                </p>
                <p>
                  <span className="font-semibold text-slate-800">Phone:</span> {organization.org_phone}
                </p>
                <p>
                  <span className="font-semibold text-slate-800">Owner ID:</span> {organization.owner_id}
                </p>
                <p>
                  <span className="font-semibold text-slate-800">Created:</span>{" "}
                  {organization.created_at
                    ? new Date(organization.created_at).toLocaleString()
                    : "N/A"}
                </p>
              </div>

              <Link
                href={`/dashboard/${organization.id}/home`}
                className="inline-flex w-full items-center justify-center rounded-xl bg-[#0C123A] px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-[#151e59]"
              >
                Enter Organization
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

