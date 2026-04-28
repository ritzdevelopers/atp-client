"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getOrganization,
  normalizeOrganization,
  type PortalFeature,
} from "@/services/organization";
import type { RightMainSideOrganization, RightMainSideUser } from "./RightMainSide";

function mapOrganizationPayload(
  raw: Record<string, unknown> | null,
): RightMainSideOrganization | null {
  if (!raw || raw.id == null) return null;
  const ownerInfo = raw.owner_info as { name?: string | null; email?: string | null } | undefined;
  return {
    id: raw.id as string | number,
    org_name: (raw.org_name as string | null | undefined) ?? null,
    org_email: (raw.org_email as string | null | undefined) ?? null,
    org_phone: (raw.org_phone as string | null | undefined) ?? null,
    owner_name: (raw.owner_name as string | null | undefined) ?? null,
    owner_email: (raw.owner_email as string | null | undefined) ?? null,
    owner_phone: (raw.owner_phone as string | null | undefined) ?? null,
    owner_id: (raw.owner_id as string | number | null | undefined) ?? null,
    created_at: (raw.created_at as string | Date | null | undefined) ?? null,
    owner_info: {
      name: ownerInfo?.name ?? (raw.owner_name as string | null | undefined) ?? null,
      email: ownerInfo?.email ?? (raw.owner_email as string | null | undefined) ?? null,
    },
  };
}

function mapUserPayload(raw: Record<string, unknown> | null): RightMainSideUser | null {
  if (!raw) return null;
  const id = raw.user_id ?? raw.id;
  if (id == null) return null;
  return {
    user_id: id as string | number,
    user_name: (raw.user_name as string | null | undefined) ?? null,
    user_email: (raw.user_email as string | null | undefined) ?? null,
    user_phone: (raw.user_phone as string | null | undefined) ?? null,
    user_created_at: (raw.created_at as string | Date | null | undefined) ?? null,
    user_role_id: (raw.user_role_id as string | number | null | undefined) ?? null,
    user_role_name: (raw.user_role_name as string | null | undefined) ?? null,
  };
}

export function useManagementDashboardData() {
  const router = useRouter();
  const [organization, setOrganization] = useState<RightMainSideOrganization | null>(null);
  const [user, setUser] = useState<RightMainSideUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessableFeatures, setAccessableFeatures] = useState<PortalFeature[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const authToken = token;
    let cancelled = false;

    async function fetchOrganization() {
      setLoading(true);
      try {
        const result = await getOrganization(authToken);
        if (cancelled) return;

        if (!result?.success || !result?.data) {
          setOrganization(null);
          setUser(null);
          setAccessableFeatures([]);
          return;
        }
        const { organization: orgRaw, user: userRaw, features } = result.data;
        setAccessableFeatures(Array.isArray(features) ? features : []);
        const normalized = normalizeOrganization(orgRaw);
        setOrganization(
          mapOrganizationPayload((normalized ?? null) as Record<string, unknown> | null),
        );
        setUser(mapUserPayload((userRaw ?? null) as Record<string, unknown> | null));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchOrganization();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return { organization, user, loading, accessableFeatures };
}
