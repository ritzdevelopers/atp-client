"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function CreateNewRoleRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params?.org_id;

  useEffect(() => {
    if (!orgId) return;
    router.replace(
      `/dashboard/${encodeURIComponent(String(orgId))}/organization-roles/manage-roles?tab=create`,
    );
  }, [orgId, router]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-[#6B7280]">
      <Loader2 className="h-9 w-9 animate-spin text-[#008CD3]" />
      <p className="text-[15px]">Opening roles…</p>
    </div>
  );
}
