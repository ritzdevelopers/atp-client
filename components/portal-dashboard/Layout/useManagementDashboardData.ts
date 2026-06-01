"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getOrganization,
  normalizeOrganization,
  type OrganizationAddress,
  type PortalFeature,
} from "@/services/organization";
import type { RightMainSideOrganization, RightMainSideUser } from "./RightMainSide";

function mapOrganizationPayload(
  raw: Record<string, unknown> | null,
): RightMainSideOrganization | null {
  if (!raw) return null;
  const orgId = raw.id ?? raw.org_id;
  if (orgId == null) return null;
  const ownerInfo = raw.owner_info as
    | { owner_id?: string | number | null; name?: string | null; email?: string | null; phone?: string | null }
    | undefined;
  return {
    id: orgId as string | number,
    org_name: (raw.org_name as string | null | undefined) ?? null,
    org_email: (raw.org_email as string | null | undefined) ?? null,
    org_phone: (raw.org_phone as string | null | undefined) ?? null,
    owner_name:
      ownerInfo?.name ??
      (raw.owner_name as string | null | undefined) ??
      null,
    owner_email:
      ownerInfo?.email ??
      (raw.owner_email as string | null | undefined) ??
      null,
    owner_phone:
      ownerInfo?.phone ??
      (raw.owner_phone as string | null | undefined) ??
      null,
    owner_id:
      ownerInfo?.owner_id ??
      (raw.owner_id as string | number | null | undefined) ??
      null,
    created_at: (raw.created_at as string | Date | null | undefined) ?? null,
    owner_info: {
      name:
        ownerInfo?.name ??
        (raw.owner_name as string | null | undefined) ??
        null,
      email:
        ownerInfo?.email ??
        (raw.owner_email as string | null | undefined) ??
        null,
    },
  };
}

function mapOrganizationAddresses(raw: unknown): OrganizationAddress[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw as OrganizationAddress[];
  if (typeof raw === "object") return [raw as OrganizationAddress];
  return [];
}

function mapUserPayload(raw: Record<string, unknown> | null): RightMainSideUser | null {
  if (!raw) return null;
  const id = raw.user_id ?? raw.id;
  if (id == null) return null;
  return {
    user_id: id as string | number,
    user_name:
      (raw.user_name as string | null | undefined) ??
      (raw.name as string | null | undefined) ??
      null,
    user_email:
      (raw.user_email as string | null | undefined) ??
      (raw.email as string | null | undefined) ??
      null,
    user_phone:
      (raw.user_phone as string | null | undefined) ??
      (raw.phone as string | null | undefined) ??
      null,
    user_created_at: (raw.created_at as string | Date | null | undefined) ?? null,
    user_role_id:
      (raw.user_role_id as string | number | null | undefined) ??
      (raw.role_id as string | number | null | undefined) ??
      null,
    user_role_name:
      (raw.user_role_name as string | null | undefined) ??
      (raw.role_name as string | null | undefined) ??
      null,
  };
}

export function useManagementDashboardData() {
  const router = useRouter();
  const [organization, setOrganization] = useState<RightMainSideOrganization | null>(null);
  const [user, setUser] = useState<RightMainSideUser | null>(null);
  const [organizationAddresses, setOrganizationAddresses] = useState<OrganizationAddress[]>([]);
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
          setOrganizationAddresses([]);
          setAccessableFeatures([]);
          return;
        }
        const payload = result.data as Record<string, unknown>;
        const orgRaw = (payload.organization ?? null) as Record<string, unknown> | null;
        const userRaw = ((payload.user_info ?? payload.user ?? null) as Record<string, unknown> | null);
        const featuresRaw =
          ((payload.user_features_access as { accessible_features?: unknown[] } | undefined)
            ?.accessible_features ??
            (payload.features as unknown[] | undefined) ??
            []) as unknown[];
        const normalizedFeatures: PortalFeature[] = Array.isArray(featuresRaw)
          ? featuresRaw.map((f) => {
              const x = f as Record<string, unknown>;
              return {
                id: (x.id ?? x.feature_id) as string | number | undefined,
                feature_name: (x.feature_name as string | undefined) ?? undefined,
                slug: (x.slug as string | undefined) ?? (x.feature_val as string | undefined) ?? undefined,
              };
            })
          : [];
        setAccessableFeatures(normalizedFeatures);
        try {
          sessionStorage.setItem("accessible_features", JSON.stringify(normalizedFeatures));
        } catch {
          /* ignore quota / private mode */
        }
        const normalized = normalizeOrganization(orgRaw);
        setOrganization(
          mapOrganizationPayload((normalized ?? null) as Record<string, unknown> | null),
        );
        setUser(mapUserPayload((userRaw ?? null) as Record<string, unknown> | null));
        setOrganizationAddresses(mapOrganizationAddresses(payload.organization_address));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchOrganization();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return { organization, user, organizationAddresses, loading, accessableFeatures };
}
