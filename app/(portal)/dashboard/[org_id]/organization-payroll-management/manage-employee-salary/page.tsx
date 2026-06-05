"use client";

import { useCallback, useEffect, useMemo, useState, startTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  BadgeIndianRupee,
  Loader2,
  AlertCircle,
  RefreshCw,
  Search,
  ChevronRight,
  Users,
  X,
} from "lucide-react";
import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import { STATIC_EXPORT_PLACEHOLDER_ID } from "@/lib/static-export";
import { dedupeOrgUserRows, getAllOrgUsers, type OrgUserRow } from "@/services/adminUser";

const mobileCaptionCls = "text-[11px] leading-snug text-[#6B7280]";
const mobileValueCls = "text-[13px] font-semibold text-[#1F2937]";

function zohoSearchCls() {
  return "w-full rounded-md border border-[#E4E7EC] bg-white py-2 pl-9 pr-3 text-[13px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15 lg:rounded-lg lg:text-[14px]";
}

function zohoSecondaryBtnCls() {
  return "inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-[#E4E7EC] bg-white px-3 py-2 text-[13px] font-medium text-[#374151] transition hover:bg-[#F9FAFB] disabled:pointer-events-none disabled:opacity-50";
}

function avatarUrl(seed: string) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

function profileImageUrlFromRow(userImage: unknown): string | null {
  const image = String(userImage ?? "").trim();
  return image || null;
}

function resolveAvatarSrc(userImage: unknown, seed: string) {
  const image = profileImageUrlFromRow(userImage);
  if (image) return image;
  return avatarUrl(seed);
}

function ProfilePhotoZoomModal({
  open,
  imageUrl,
  alt,
  onClose,
}: {
  open: boolean;
  imageUrl: string;
  alt: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10060] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="salary-employee-photo-zoom-title"
    >
      <button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label="Close profile photo"
      />
      <div className="relative z-[1] w-full max-w-sm">
        <button
          type="button"
          onClick={onClose}
          className="absolute -right-1 -top-1 z-[2] flex h-9 w-9 items-center justify-center rounded-full border border-[#E4E7EC] bg-white text-[#1F2937] shadow-lg active:scale-95"
          aria-label="Close"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={alt}
          className="max-h-[min(78vh,560px)] w-full rounded-xl bg-white object-contain shadow-2xl ring-1 ring-[#E4E7EC]"
        />
        <p
          id="salary-employee-photo-zoom-title"
          className="mt-2.5 text-center text-[13px] font-medium text-white"
        >
          {alt}
        </p>
      </div>
    </div>
  );
}

function EmployeeListAvatar({
  emp,
  onZoom,
}: {
  emp: EmployeeListItem;
  onZoom: (imageUrl: string, alt: string) => void;
}) {
  const img = (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={emp.avatarSrc}
      alt=""
      className="h-9 w-9 rounded-full border border-[#E4E7EC] bg-[#F9FAFB] object-cover object-top"
      onError={(e) => {
        e.currentTarget.src = avatarUrl(emp.avatarSeed);
      }}
    />
  );

  if (emp.profileImageUrl) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onZoom(emp.profileImageUrl!, emp.name);
        }}
        className="shrink-0 rounded-full transition active:opacity-90"
        aria-label={`View ${emp.name} profile photo`}
      >
        {img}
      </button>
    );
  }

  return <span className="shrink-0">{img}</span>;
}

function formatRoleLabel(role: string | undefined) {
  const r = (role ?? "").trim().toLowerCase();
  if (!r) return "Employee";
  if (r === "hr") return "HR";
  if (r === "admin") return "Admin";
  return r.replace(/\b\w/g, (c) => c.toUpperCase());
}

function isOrgMemberActive(value: unknown): boolean {
  if (value === false || value === 0 || value === "0") return false;
  return true;
}

type EmployeeListItem = {
  id: string;
  name: string;
  email: string;
  roleLabel: string;
  avatarSeed: string;
  avatarSrc: string;
  profileImageUrl: string | null;
};

function mapRow(row: OrgUserRow): EmployeeListItem | null {
  if (row.id == null) return null;
  if (!isOrgMemberActive(row.is_active)) return null;
  const name = row.user_name?.trim() || row.user_email?.trim() || "Employee";
  const userImage = (row as { user_image?: unknown }).user_image;
  return {
    id: String(row.id),
    name,
    email: row.user_email?.trim() ?? "—",
    roleLabel: formatRoleLabel(row.role_name ?? row.user_role_name),
    avatarSeed: name,
    avatarSrc: resolveAvatarSrc(userImage, name),
    profileImageUrl: profileImageUrlFromRow(userImage),
  };
}

export default function ManageEmployeeSalaryPage() {
  const params = useParams();
  const router = useRouter();
  const ctx = useManagementDashboardContext();
  const orgIdParam = params?.org_id;

  const organizationIdNum =
    ctx?.organization?.id != null ? Number(ctx.organization.id) : Number(orgIdParam);
  const orgName = ctx?.organization?.org_name?.trim() || `Organization ${orgIdParam ?? ""}`;
  const orgMissing = !organizationIdNum || Number.isNaN(organizationIdNum);
  const basePath = `/dashboard/${orgIdParam ?? ""}/organization-payroll-management/manage-employee-salary`;

  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [photoZoom, setPhotoZoom] = useState<{
    imageUrl: string;
    alt: string;
  } | null>(null);

  const loadEmployees = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent === true;
      if (orgMissing) {
        setEmployees([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const token = localStorage.getItem("token");
      if (!token) {
        setLoadError("Not signed in.");
        setLoading(false);
        setRefreshing(false);
        return;
      }
      setLoadError(null);
      if (silent) setRefreshing(true);
      else setLoading(true);
      try {
        const rows = await getAllOrgUsers(token);
        const list = dedupeOrgUserRows(rows)
          .map(mapRow)
          .filter((e): e is EmployeeListItem => e != null);
        setEmployees(list);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Could not load employees.");
        setEmployees([]);
      } finally {
        if (silent) setRefreshing(false);
        else setLoading(false);
      }
    },
    [orgMissing],
  );

  useEffect(() => {
    startTransition(() => {
      void loadEmployees();
    });
  }, [loadEmployees]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.roleLabel.toLowerCase().includes(q) ||
        e.id.includes(q),
    );
  }, [employees, search]);

  function openSalaryStack(employeeId: string) {
    router.push(
      `${basePath}/${STATIC_EXPORT_PLACEHOLDER_ID}?employee_id=${encodeURIComponent(employeeId)}`,
    );
  }

  const photoHint =
    employees.some((e) => e.profileImageUrl) ? " · tap photo to enlarge" : "";

  return (
    <div className="min-h-full bg-[#F5F7FA] pb-3 [font-family:var(--font-inter),system-ui,sans-serif] max-lg:-mx-1 sm:max-lg:-mx-2 lg:pb-8">
      {/* Mobile & tablet */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-20 border-b border-[#E4E7EC] bg-white shadow-sm">
          <div className="flex items-center gap-2 px-3 py-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
              <BadgeIndianRupee className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[15px] font-semibold text-[#1F2937]">
                Employee salary
              </h1>
              <p className={`truncate ${mobileCaptionCls}`}>
                {loading
                  ? "Loading…"
                  : `${employees.length} active${photoHint}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadEmployees({ silent: true })}
              disabled={loading || refreshing}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#E4E7EC] text-[#008CD3] disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
            </button>
          </div>
          <div className="border-t border-[#E4E7EC] px-3 py-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9CA3AF]" aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search employees…"
                className={zohoSearchCls()}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop header */}
      <div className="mx-auto hidden max-w-6xl lg:block lg:px-0 lg:pt-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
              <BadgeIndianRupee className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h1 className="text-[18px] font-semibold text-[#1F2937]">
                Manage employee salary
              </h1>
              <p className="text-[13px] text-[#6B7280]">
                Select an employee to view or set salary for{" "}
                <span className="font-medium text-[#374151]">{orgName}</span>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadEmployees({ silent: true })}
            disabled={orgMissing || loading || refreshing}
            className={zohoSecondaryBtnCls()}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
            Refresh
          </button>
        </div>
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or role…"
            className={zohoSearchCls()}
          />
        </div>
      </div>

      <div className="mx-auto max-w-6xl lg:mt-4">
        {loadError ? (
          <div className="mx-3 mt-2 flex items-start gap-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2 text-[12px] text-[#D93025] lg:mx-0">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{loadError}</span>
          </div>
        ) : null}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-[#6B7280]">
            <Loader2 className="h-7 w-7 animate-spin text-[#008CD3]" aria-hidden />
            <p className="text-[13px]">Loading employees…</p>
          </div>
        ) : null}

        {!loading && filtered.length === 0 ? (
          <div className="mx-3 mt-3 rounded-lg border border-dashed border-[#E4E7EC] bg-white px-4 py-12 text-center lg:mx-0">
            <Users className="mx-auto h-8 w-8 text-[#9CA3AF]" aria-hidden />
            <p className={`mt-3 ${mobileValueCls}`}>No employees found</p>
            <p className={`mt-1 ${mobileCaptionCls}`}>
              {search.trim() ? "Try a different search." : "No active members in this organization."}
            </p>
          </div>
        ) : null}

        {!loading && filtered.length > 0 ? (
          <ul className="mt-2 divide-y divide-[#E4E7EC] border-t border-[#E4E7EC] bg-white lg:mt-0 lg:overflow-hidden lg:rounded-lg lg:border lg:border-[#E4E7EC] lg:shadow-sm">
            {filtered.map((emp) => (
              <li key={emp.id} className="transition hover:bg-[#F9FAFB] active:bg-[#F5F7FA]">
                <div className="flex w-full items-center gap-2 px-3 py-3 lg:gap-2.5 lg:px-4">
                  <EmployeeListAvatar
                    emp={emp}
                    onZoom={(imageUrl, alt) => setPhotoZoom({ imageUrl, alt })}
                  />
                  <button
                    type="button"
                    onClick={() => openSalaryStack(emp.id)}
                    className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className={`truncate ${mobileValueCls}`}>{emp.name}</p>
                      <p className={`truncate ${mobileCaptionCls}`}>{emp.email}</p>
                      <span className="mt-0.5 inline-flex rounded-md bg-[#F5F7FA] px-1.5 py-0.5 text-[10px] font-medium text-[#6B7280]">
                        {emp.roleLabel}
                      </span>
                    </div>
                    <span className="hidden shrink-0 text-[12px] font-medium text-[#008CD3] md:inline">
                      Salary
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#9CA3AF]" aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <ProfilePhotoZoomModal
        open={photoZoom != null}
        imageUrl={photoZoom?.imageUrl ?? ""}
        alt={photoZoom?.alt ?? ""}
        onClose={() => setPhotoZoom(null)}
      />
    </div>
  );
}
