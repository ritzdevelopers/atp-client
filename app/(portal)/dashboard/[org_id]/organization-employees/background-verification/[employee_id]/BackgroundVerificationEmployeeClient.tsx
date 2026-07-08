"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CalendarDays,
  ChevronRight,
  Mail,
  Pencil,
  Phone,
  RefreshCw,
  ShieldCheck,
  User,
  UserCheck,
  X,
} from "lucide-react";
import {
  getAllUserBackgroundVerifications,
  getSingleUserBackgroundVerification,
  updateEmployeeBackgroundVerificationStatus,
  updateUserBackgroundVerification,
  type BackgroundVerificationDetailRow,
  type BackgroundVerificationInfoPayload,
  type BackgroundVerificationPersonRole,
  type BackgroundVerificationStatus,
} from "@/services/adminUser";
import {
  clearBgvEmployeeDetailCache,
  clearBgvListCaches,
  readBgvEmployeeDetailCache,
  shouldRefreshBgvEmployeeDetailCache,
  writeBgvEmployeeDetailCache,
} from "@/lib/employeeManagementCache";
import {
  btnBrandCls,
  btnGhostCls,
  dashCardCls,
  dashPageCls,
  dashSectionMetaCls,
  iconBadgeCls,
  userInitials as tokenUserInitials,
} from "@/components/portal-dashboard/home/dashboardTokens";

const STATUS_OPTIONS: { value: BackgroundVerificationStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "verified", label: "Verified" },
  { value: "failed", label: "Failed" },
  { value: "unable_to_contact", label: "Unable to contact" },
];

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function personRoleLabel(role: string): string {
  if (role === "hr") return "HR";
  if (role === "reporting_manager") return "Reporting manager";
  return role;
}

function statusLabel(status: string): string {
  const found = STATUS_OPTIONS.find((o) => o.value === status);
  return found?.label ?? status.replace(/_/g, " ");
}

function statusBadgeClass(status: string): string {
  const s = String(status).toLowerCase();
  if (s === "verified") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70";
  if (s === "failed") return "bg-rose-50 text-rose-700 ring-1 ring-rose-200/70";
  if (s === "in_progress") return "bg-[#E8F4FB] text-[#008CD3] ring-1 ring-[#008CD3]/20";
  if (s === "unable_to_contact") return "bg-slate-100 text-slate-600 ring-1 ring-slate-200/80";
  return "bg-amber-50 text-amber-700 ring-1 ring-amber-200/70";
}

function canShowVerifyButton(status: string): boolean {
  const s = String(status).toLowerCase();
  return s !== "verified" && s !== "failed";
}

function telHref(phone: string | null | undefined): string | null {
  if (!phone || !String(phone).trim()) return null;
  const digits = String(phone).replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : null;
}

function mailHref(email: string | null | undefined): string | null {
  if (!email || !String(email).trim()) return null;
  return `mailto:${String(email).trim()}`;
}

function userInitials(name: string): string {
  return tokenUserInitials(name);
}

function Shimmer({ className = "" }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-xl ${className}`} />;
}

function BgvEmployeeDetailSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading employee verification">
      <div className={`${dashCardCls} overflow-hidden lg:hidden`}>
        <div className="flex items-center gap-3 p-4">
          <Shimmer className="h-9 w-9 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Shimmer className="h-3 w-28" />
            <Shimmer className="h-4 w-40" />
          </div>
          <Shimmer className="h-9 w-9 rounded-xl" />
        </div>
      </div>

      <div className={`${dashCardCls} hidden overflow-hidden lg:block`}>
        <div className="border-b border-slate-100 bg-gradient-to-r from-[#F8FAFC] via-white to-[#F0F9FF]/40 px-6 py-5">
          <div className="flex items-center gap-4">
            <Shimmer className="h-10 w-10 rounded-xl" />
            <div className="space-y-2">
              <Shimmer className="h-3 w-48" />
              <Shimmer className="h-6 w-64" />
              <Shimmer className="h-4 w-80 max-w-full" />
            </div>
          </div>
        </div>
      </div>

      <div className={`${dashCardCls} p-5`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Shimmer className="h-16 w-16 shrink-0 rounded-2xl" />
          <div className="min-w-0 flex-1 space-y-3">
            <Shimmer className="h-5 w-48" />
            <Shimmer className="h-4 w-64 max-w-full" />
            <div className="grid gap-3 sm:grid-cols-3">
              <Shimmer className="h-12" />
              <Shimmer className="h-12" />
              <Shimmer className="h-12" />
            </div>
          </div>
        </div>
      </div>

      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className={`${dashCardCls} space-y-4 p-5`}>
          <div className="flex items-center justify-between gap-3">
            <Shimmer className="h-5 w-40" />
            <Shimmer className="h-8 w-24" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, j) => (
              <div key={j} className="space-y-2">
                <Shimmer className="h-3 w-20" />
                <Shimmer className="h-4 w-32" />
              </div>
            ))}
          </div>
          <Shimmer className="h-24 w-full" />
        </div>
      ))}
    </div>
  );
}

function zohoPanelCls() {
  return `${dashCardCls}`;
}

function zohoPrimaryBtnCls() {
  return btnBrandCls();
}

function zohoSecondaryBtnCls() {
  return btnGhostCls();
}

function labelCls() {
  return "text-[11px] font-semibold uppercase tracking-wide text-slate-400";
}

function valueCls() {
  return "mt-0.5 text-[14px] font-medium text-slate-900";
}

function filterFieldCls() {
  return "w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15";
}

function editLabelCls() {
  return "mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500";
}

type ReferenceEditForm = {
  previous_company_name: string;
  company_email: string;
  employee_code: string;
  designation: string;
  employment_start_date: string;
  employment_end_date: string;
  person_name: string;
  person_role: BackgroundVerificationPersonRole;
  person_contact_number1: string;
  person_contact_number2: string;
  person_contact_email: string;
};

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function refToEditForm(ref: BackgroundVerificationDetailRow): ReferenceEditForm {
  return {
    previous_company_name: ref.previous_company_name ?? "",
    company_email: ref.company_email ?? "",
    employee_code: ref.employee_code ?? "",
    designation: ref.designation ?? "",
    employment_start_date: toDateInputValue(ref.employment_start_date),
    employment_end_date: toDateInputValue(ref.employment_end_date),
    person_name: ref.person_name ?? "",
    person_role: ref.person_role ?? "hr",
    person_contact_number1: ref.person_contact_number1 ?? "",
    person_contact_number2: ref.person_contact_number2 ?? "",
    person_contact_email: ref.person_contact_email ?? "",
  };
}

function editFormToPayload(form: ReferenceEditForm): BackgroundVerificationInfoPayload {
  const payload: BackgroundVerificationInfoPayload = {
    previous_company_name: form.previous_company_name.trim(),
    person_name: form.person_name.trim(),
    person_role: form.person_role,
    person_contact_number1: form.person_contact_number1.trim(),
    person_contact_email: form.person_contact_email.trim(),
  };
  if (form.company_email.trim()) payload.company_email = form.company_email.trim();
  if (form.employee_code.trim()) payload.employee_code = form.employee_code.trim();
  if (form.designation.trim()) payload.designation = form.designation.trim();
  if (form.employment_start_date) payload.employment_start_date = form.employment_start_date;
  if (form.employment_end_date) payload.employment_end_date = form.employment_end_date;
  if (form.person_contact_number2.trim()) {
    payload.person_contact_number2 = form.person_contact_number2.trim();
  }
  return payload;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function ContactLink({
  href,
  children,
  icon,
}: {
  href: string;
  children: React.ReactNode;
  icon: "mail" | "phone";
}) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#008CD3] underline-offset-2 hover:underline"
    >
      {icon === "mail" ? (
        <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
      ) : (
        <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
      )}
      {children}
    </a>
  );
}

function InfoField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className={labelCls()}>{label}</p>
      <div className={valueCls()}>{children}</div>
    </div>
  );
}

function BackgroundVerificationEmployeeClientContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orgId = String(params?.org_id ?? "");
  const employeeId =
    searchParams.get("employee_id") ||
    (String(params?.employee_id ?? "") !== "0"
      ? String(params?.employee_id ?? "")
      : "");
  const cachedReferences =
    orgId && employeeId ? readBgvEmployeeDetailCache(orgId, employeeId) : null;

  const [references, setReferences] = useState<BackgroundVerificationDetailRow[]>(
    () => cachedReferences ?? [],
  );
  const [loading, setLoading] = useState(() => !cachedReferences);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [verifyModal, setVerifyModal] = useState<BackgroundVerificationDetailRow | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<BackgroundVerificationStatus>("in_progress");
  const [verifyNotes, setVerifyNotes] = useState("");
  const [verifySubmitting, setVerifySubmitting] = useState(false);
  const [editModal, setEditModal] = useState<BackgroundVerificationDetailRow | null>(null);
  const [editForm, setEditForm] = useState<ReferenceEditForm | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const listHref = `/dashboard/${orgId}/organization-employees/background-verification`;

  const loadDetails = useCallback(
    async (isManualRefresh = false) => {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Not signed in.");
        setLoading(false);
        setRefreshing(false);
        return;
      }
      if (!orgId || !employeeId) {
        setError("Invalid employee or organization.");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const cached = readBgvEmployeeDetailCache(orgId, employeeId);

      if (cached && !isManualRefresh) {
        setReferences(cached);
        setError(null);
        setLoading(false);
        if (!shouldRefreshBgvEmployeeDetailCache(orgId, employeeId)) {
          return;
        }
        setRefreshing(true);
      } else {
        if (isManualRefresh) {
          clearBgvEmployeeDetailCache(orgId, employeeId);
        }
        if (isManualRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);
      }

      try {
        const listResult = await getAllUserBackgroundVerifications(token, orgId, {
          employee_id: employeeId,
          is_ascending: "DESC",
        });
        const group = Array.isArray(listResult.data) ? listResult.data[0] : null;
        const listRefs = group?.references ?? [];

        if (listRefs.length === 0) {
          setReferences([]);
          writeBgvEmployeeDetailCache(orgId, employeeId, []);
          return;
        }

        const detailResults = await Promise.all(
          listRefs.map((row) =>
            getSingleUserBackgroundVerification(
              token,
              orgId,
              employeeId,
              row.id,
            ).then((res) => res.data),
          ),
        );

        const nextReferences = detailResults.filter(
          (row): row is BackgroundVerificationDetailRow => row != null,
        );
        setReferences(nextReferences);
        writeBgvEmployeeDetailCache(orgId, employeeId, nextReferences);
      } catch (e) {
        if (!cached || isManualRefresh) {
          setReferences([]);
        }
        setError(
          e instanceof Error ? e.message : "Could not load verification details.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [employeeId, orgId],
  );

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  useEffect(() => {
    if (!notice || notice.type !== "ok") return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  const employee = references[0] ?? null;

  const statusSummary = useMemo(() => {
    let verified = 0;
    let pending = 0;
    for (const r of references) {
      const s = String(r.verification_status).toLowerCase();
      if (s === "verified") verified += 1;
      else if (s === "pending" || s === "in_progress") pending += 1;
    }
    return { verified, pending, total: references.length };
  }, [references]);

  const openVerifyModal = (row: BackgroundVerificationDetailRow) => {
    setVerifyModal(row);
    const current = String(row.verification_status).toLowerCase() as BackgroundVerificationStatus;
    setVerifyStatus(
      STATUS_OPTIONS.some((o) => o.value === current) ? current : "in_progress",
    );
    setVerifyNotes(row.verification_notes ?? "");
  };

  const openEditModal = (row: BackgroundVerificationDetailRow) => {
    setEditModal(row);
    setEditForm(refToEditForm(row));
    setEditError(null);
  };

  const submitEdit = async () => {
    if (!editModal || !editForm) return;

    if (!editForm.previous_company_name.trim()) {
      setEditError("Previous company name is required.");
      return;
    }
    if (!editForm.person_name.trim()) {
      setEditError("Reference contact name is required.");
      return;
    }
    if (!editForm.person_contact_number1.trim()) {
      setEditError("Primary phone number is required.");
      return;
    }
    if (!editForm.person_contact_email.trim()) {
      setEditError("Reference contact email is required.");
      return;
    }
    if (!isValidEmail(editForm.person_contact_email)) {
      setEditError("Enter a valid reference contact email.");
      return;
    }
    if (editForm.company_email.trim() && !isValidEmail(editForm.company_email)) {
      setEditError("Enter a valid company email.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setNotice({ type: "err", text: "Not signed in." });
      return;
    }

    setEditSubmitting(true);
    setEditError(null);
    try {
      await updateUserBackgroundVerification(token, {
        org_id: orgId,
        employee_id: editModal.employee_id,
        reference_id: editModal.id,
        background_verification_info: editFormToPayload(editForm),
      });
      setNotice({ type: "ok", text: "Reference updated successfully." });
      setEditModal(null);
      setEditForm(null);
      clearBgvEmployeeDetailCache(orgId, employeeId);
      clearBgvListCaches(orgId);
      await loadDetails(true);
    } catch (e) {
      setEditError(
        e instanceof Error ? e.message : "Could not update reference.",
      );
    } finally {
      setEditSubmitting(false);
    }
  };

  const submitVerification = async () => {
    if (!verifyModal) return;
    const token = localStorage.getItem("token");
    if (!token) {
      setNotice({ type: "err", text: "Not signed in." });
      return;
    }

    setVerifySubmitting(true);
    try {
      await updateEmployeeBackgroundVerificationStatus(token, {
        org_id: orgId,
        employee_id: verifyModal.employee_id,
        verification_info: {
          verification_id: verifyModal.id,
          verification_status: verifyStatus,
          verification_notes: verifyNotes.trim() || null,
        },
      });
      setNotice({ type: "ok", text: "Verification status updated." });
      setVerifyModal(null);
      clearBgvEmployeeDetailCache(orgId, employeeId);
      clearBgvListCaches(orgId);
      await loadDetails(true);
    } catch (e) {
      setNotice({
        type: "err",
        text: e instanceof Error ? e.message : "Could not update verification.",
      });
    } finally {
      setVerifySubmitting(false);
    }
  };

  const isBusy = loading || refreshing;

  if (!employeeId) {
    return (
      <div className={`${dashPageCls} flex min-h-[40vh] items-center justify-center text-center`}>
        <div className={`${dashCardCls} max-w-md px-6 py-10`}>
          <span className={`${iconBadgeCls("blue")} mx-auto`}>
            <ShieldCheck className="h-4 w-4" aria-hidden />
          </span>
          <p className="mt-4 text-[15px] font-semibold text-slate-900">
            Employee not specified
          </p>
          <p className={`mt-1 ${dashSectionMetaCls}`}>
            Open this page from Background verification.
          </p>
          <Link href={listHref} className={`${btnGhostCls()} mt-5`}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to list
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`${dashPageCls} pb-8`}>
      {/* Mobile header */}
      <div className="sticky top-0 z-20 -mx-3 border-b border-slate-200/80 bg-white/95 px-3 pb-3 pt-3 shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur-md sm:-mx-5 sm:px-4 lg:hidden">
        <div className="flex items-center gap-3">
          <Link
            href={listHref}
            className={`${btnGhostCls()} !min-h-[36px] !w-9 !px-0`}
            aria-label="Back to list"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Background verification
            </p>
            <h1 className="truncate text-[17px] font-semibold tracking-tight text-slate-900">
              {employee?.employee_name ?? "Employee detail"}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => void loadDetails(true)}
            disabled={isBusy}
            className={`${btnGhostCls()} !min-h-[36px] !w-9 !px-0`}
            aria-label="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
          </button>
        </div>
      </div>

      {/* Desktop header */}
      <header className={`${dashCardCls} hidden overflow-hidden lg:block`}>
        <div className="border-b border-slate-100 bg-gradient-to-r from-[#F8FAFC] via-white to-[#F0F9FF]/40 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <Link
                href={listHref}
                className={`${btnGhostCls()} !min-h-[40px] !w-10 !px-0`}
                aria-label="Back to background verification list"
              >
                <ArrowLeft className="h-5 w-5" aria-hidden />
              </Link>
              <span className={iconBadgeCls("blue")}>
                <ShieldCheck className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                  Organization · Background verification
                </p>
                <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">
                  Employee verification detail
                </h1>
                <p className={`mt-1 ${dashSectionMetaCls}`}>
                  Full employee profile and previous company reference contacts.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void loadDetails(true)}
              disabled={isBusy}
              className={btnGhostCls()}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>
      </header>

      {notice ? (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${
            notice.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          {notice.text}
        </div>
      ) : null}

      {loading ? (
        <BgvEmployeeDetailSkeleton />
      ) : error ? (
        <div className={`${dashCardCls} px-6 py-14 text-center`}>
          <p className="text-[14px] font-medium text-rose-700">{error}</p>
          <button
            type="button"
            onClick={() => void loadDetails(true)}
            className={`${btnBrandCls()} mt-5`}
          >
            Try again
          </button>
        </div>
      ) : !employee ? (
        <div className={`${dashCardCls} px-6 py-14 text-center`}>
          <span className={`${iconBadgeCls("blue")} mx-auto h-12 w-12`}>
            <ShieldCheck className="h-5 w-5" aria-hidden />
          </span>
          <p className="mt-4 text-[15px] font-semibold text-slate-900">No references found</p>
          <p className={`mt-1 ${dashSectionMetaCls}`}>
            This employee has not submitted any previous company references yet.
          </p>
          <Link href={listHref} className={`${btnGhostCls()} mt-5`}>
            Back to list
          </Link>
        </div>
      ) : (
        <>
          {/* Employee profile */}
          <div className={`${dashCardCls} p-4 sm:p-5`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-sky-400 to-[#008CD3] text-[18px] font-semibold text-white shadow-sm">
                {employee.employee_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={String(employee.employee_image)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  userInitials(employee.employee_name ?? "Employee")
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-[18px] font-semibold tracking-tight text-slate-900">
                      {employee.employee_name ?? `Employee #${employee.employee_id}`}
                    </h2>
                    <p className={`mt-0.5 ${dashSectionMetaCls}`}>
                      Member since {formatDate(employee.member_since ?? employee.employee_joining_date)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[12px] font-semibold text-slate-600">
                      {statusSummary.total} reference{statusSummary.total === 1 ? "" : "s"}
                    </span>
                    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[12px] font-semibold text-emerald-700 ring-1 ring-emerald-200/70">
                      {statusSummary.verified} verified
                    </span>
                    {statusSummary.pending > 0 ? (
                      <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[12px] font-semibold text-amber-700 ring-1 ring-amber-200/70">
                        {statusSummary.pending} pending / in progress
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <InfoField label="Email">
                    {mailHref(employee.employee_email) ? (
                      <ContactLink href={mailHref(employee.employee_email)!} icon="mail">
                        {employee.employee_email}
                      </ContactLink>
                    ) : (
                      "—"
                    )}
                  </InfoField>
                  <InfoField label="Phone">
                    {telHref(employee.employee_phone) ? (
                      <ContactLink href={telHref(employee.employee_phone)!} icon="phone">
                        {employee.employee_phone}
                      </ContactLink>
                    ) : (
                      "—"
                    )}
                  </InfoField>
                  <InfoField label="Employee ID">
                    #{employee.employee_id}
                  </InfoField>
                </div>
              </div>
            </div>
          </div>

          {/* Previous company references */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-0.5">
              <span className={iconBadgeCls("blue")}>
                <Building2 className="h-4 w-4" aria-hidden />
              </span>
              <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">
                Previous company references
              </h2>
            </div>

            {references.map((ref) => (
              <article key={ref.id} className={`${zohoPanelCls()} p-4 sm:p-5`}>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[16px] font-semibold text-slate-900">
                        {ref.previous_company_name}
                      </h3>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusBadgeClass(ref.verification_status)}`}
                      >
                        {statusLabel(ref.verification_status)}
                      </span>
                    </div>
                    {ref.designation ? (
                      <p className="mt-0.5 flex items-center gap-1 text-[13px] text-slate-500">
                        <Briefcase className="h-3.5 w-3.5" aria-hidden />
                        {ref.designation}
                        {ref.employee_code ? ` · Code ${ref.employee_code}` : ""}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(ref)}
                      className={zohoSecondaryBtnCls()}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                      Edit
                    </button>
                    {canShowVerifyButton(ref.verification_status) ? (
                      <button
                        type="button"
                        onClick={() => openVerifyModal(ref)}
                        className={zohoPrimaryBtnCls()}
                      >
                        <UserCheck className="h-3.5 w-3.5" aria-hidden />
                        Update status
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-5 lg:grid-cols-2">
                  {/* Employment & company */}
                  <div className="space-y-4">
                    <p className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-700">
                      <Building2 className="h-4 w-4 text-[#008CD3]" aria-hidden />
                      Company details
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <InfoField label="Employment period">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                          {formatDate(ref.employment_start_date)} –{" "}
                          {formatDate(ref.employment_end_date)}
                        </span>
                      </InfoField>
                      <InfoField label="Company email">
                        {mailHref(ref.company_email) ? (
                          <ContactLink href={mailHref(ref.company_email)!} icon="mail">
                            {ref.company_email}
                          </ContactLink>
                        ) : (
                          "—"
                        )}
                      </InfoField>
                      <InfoField label="Submitted on">
                        {formatDateTime(ref.created_at)}
                      </InfoField>
                      <InfoField label="Last updated">
                        {formatDateTime(ref.updated_at)}
                      </InfoField>
                    </div>
                  </div>

                  {/* Reference contact */}
                  <div className="space-y-4">
                    <p className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-700">
                      <User className="h-4 w-4 text-[#008CD3]" aria-hidden />
                      Reference contact
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <InfoField label="Name">{ref.person_name}</InfoField>
                      <InfoField label="Role">{personRoleLabel(ref.person_role)}</InfoField>
                      <InfoField label="Email">
                        {mailHref(ref.person_contact_email) ? (
                          <ContactLink
                            href={mailHref(ref.person_contact_email)!}
                            icon="mail"
                          >
                            {ref.person_contact_email}
                          </ContactLink>
                        ) : (
                          "—"
                        )}
                      </InfoField>
                      <InfoField label="Primary phone">
                        {telHref(ref.person_contact_number1) ? (
                          <ContactLink
                            href={telHref(ref.person_contact_number1)!}
                            icon="phone"
                          >
                            {ref.person_contact_number1}
                          </ContactLink>
                        ) : (
                          "—"
                        )}
                      </InfoField>
                      {ref.person_contact_number2 ? (
                        <InfoField label="Secondary phone">
                          {telHref(ref.person_contact_number2) ? (
                            <ContactLink
                              href={telHref(ref.person_contact_number2)!}
                              icon="phone"
                            >
                              {ref.person_contact_number2}
                            </ContactLink>
                          ) : (
                            ref.person_contact_number2
                          )}
                        </InfoField>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Verification block */}
                <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                  <p className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-700">
                    <ShieldCheck className="h-4 w-4 text-[#008CD3]" aria-hidden />
                    Verification record
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <InfoField label="Verified by">
                      {ref.verificator_name ?? ref.verification_by_name ?? "—"}
                    </InfoField>
                    <InfoField label="Verified at">
                      {formatDateTime(ref.verified_at)}
                    </InfoField>
                    {ref.verificator_email ? (
                      <InfoField label="Verifier email">
                        {mailHref(ref.verificator_email) ? (
                          <ContactLink href={mailHref(ref.verificator_email)!} icon="mail">
                            {ref.verificator_email}
                          </ContactLink>
                        ) : (
                          ref.verificator_email
                        )}
                      </InfoField>
                    ) : null}
                    {ref.verificator_phone ? (
                      <InfoField label="Verifier phone">
                        {telHref(ref.verificator_phone) ? (
                          <ContactLink href={telHref(ref.verificator_phone)!} icon="phone">
                            {ref.verificator_phone}
                          </ContactLink>
                        ) : (
                          ref.verificator_phone
                        )}
                      </InfoField>
                    ) : null}
                  </div>
                  {ref.verification_notes ? (
                    <div className="mt-3 border-t border-slate-200 pt-3">
                      <p className={labelCls()}>Notes</p>
                      <p className="mt-1 whitespace-pre-wrap text-[14px] text-slate-700">
                        {ref.verification_notes}
                      </p>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          <div className="pb-2">
            <Link
              href={listHref}
              className={`${btnGhostCls()} inline-flex`}
            >
              <ChevronRight className="h-4 w-4 rotate-180" aria-hidden />
              Back to all verifications
            </Link>
          </div>
        </>
      )}

      {/* Verification modal */}
      {verifyModal ? (
        <div
          className="fixed inset-0 z-[99999] flex items-end justify-center bg-slate-900/40 backdrop-blur-[2px] p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="verify-detail-modal-title"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2
                  id="verify-detail-modal-title"
                  className="text-[16px] font-semibold text-slate-900"
                >
                  Update verification
                </h2>
                <p className="mt-0.5 text-[13px] text-slate-500">
                  {verifyModal.previous_company_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVerifyModal(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-[12px] font-medium text-slate-700">
                  Verification status
                </span>
                <select
                  value={verifyStatus}
                  onChange={(e) =>
                    setVerifyStatus(e.target.value as BackgroundVerificationStatus)
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[14px] outline-none focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-[12px] font-medium text-slate-700">
                  Verification notes
                </span>
                <textarea
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  rows={4}
                  placeholder="Record outcome after contacting the reference…"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[14px] outline-none focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15"
                />
              </label>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setVerifyModal(null)}
                disabled={verifySubmitting}
                className={zohoSecondaryBtnCls()}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitVerification()}
                disabled={verifySubmitting}
                className={zohoPrimaryBtnCls()}
              >
                {verifySubmitting ? "Saving…" : "Save verification"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Edit reference modal */}
      {editModal && editForm ? (
        <div
          className="fixed inset-0 z-[99999] flex items-end justify-center bg-slate-900/40 backdrop-blur-[2px] p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-reference-modal-title"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2
                  id="edit-reference-modal-title"
                  className="text-[16px] font-semibold text-slate-900"
                >
                  Edit reference
                </h2>
                <p className="mt-0.5 text-[13px] text-slate-500">
                  Correct company or contact details for this previous employer record.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditModal(null);
                  setEditForm(null);
                  setEditError(null);
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            {editError ? (
              <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-slate-900">
                {editError}
              </p>
            ) : null}

            <div className="space-y-4">
              <p className="text-[13px] font-semibold text-slate-700">Company</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="sm:col-span-2 block">
                  <span className={editLabelCls()}>Previous company name *</span>
                  <input
                    type="text"
                    value={editForm.previous_company_name}
                    onChange={(e) =>
                      setEditForm((p) =>
                        p ? { ...p, previous_company_name: e.target.value } : p,
                      )
                    }
                    className={filterFieldCls()}
                  />
                </label>
                <label className="block">
                  <span className={editLabelCls()}>Company email</span>
                  <input
                    type="email"
                    value={editForm.company_email}
                    onChange={(e) =>
                      setEditForm((p) => (p ? { ...p, company_email: e.target.value } : p))
                    }
                    className={filterFieldCls()}
                  />
                </label>
                <label className="block">
                  <span className={editLabelCls()}>Employee code</span>
                  <input
                    type="text"
                    value={editForm.employee_code}
                    onChange={(e) =>
                      setEditForm((p) => (p ? { ...p, employee_code: e.target.value } : p))
                    }
                    className={filterFieldCls()}
                  />
                </label>
                <label className="block">
                  <span className={editLabelCls()}>Designation</span>
                  <input
                    type="text"
                    value={editForm.designation}
                    onChange={(e) =>
                      setEditForm((p) => (p ? { ...p, designation: e.target.value } : p))
                    }
                    className={filterFieldCls()}
                  />
                </label>
                <label className="block">
                  <span className={editLabelCls()}>Employment start</span>
                  <input
                    type="date"
                    value={editForm.employment_start_date}
                    onChange={(e) =>
                      setEditForm((p) =>
                        p ? { ...p, employment_start_date: e.target.value } : p,
                      )
                    }
                    className={filterFieldCls()}
                  />
                </label>
                <label className="block">
                  <span className={editLabelCls()}>Employment end</span>
                  <input
                    type="date"
                    value={editForm.employment_end_date}
                    onChange={(e) =>
                      setEditForm((p) =>
                        p ? { ...p, employment_end_date: e.target.value } : p,
                      )
                    }
                    className={filterFieldCls()}
                  />
                </label>
              </div>

              <p className="pt-1 text-[13px] font-semibold text-slate-700">Reference contact</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className={editLabelCls()}>Contact name *</span>
                  <input
                    type="text"
                    value={editForm.person_name}
                    onChange={(e) =>
                      setEditForm((p) => (p ? { ...p, person_name: e.target.value } : p))
                    }
                    className={filterFieldCls()}
                  />
                </label>
                <label className="block">
                  <span className={editLabelCls()}>Role *</span>
                  <select
                    value={editForm.person_role}
                    onChange={(e) =>
                      setEditForm((p) =>
                        p
                          ? {
                              ...p,
                              person_role: e.target.value as BackgroundVerificationPersonRole,
                            }
                          : p,
                      )
                    }
                    className={filterFieldCls()}
                  >
                    <option value="hr">HR</option>
                    <option value="reporting_manager">Reporting manager</option>
                  </select>
                </label>
                <label className="block">
                  <span className={editLabelCls()}>Primary phone *</span>
                  <input
                    type="tel"
                    value={editForm.person_contact_number1}
                    onChange={(e) =>
                      setEditForm((p) =>
                        p ? { ...p, person_contact_number1: e.target.value } : p,
                      )
                    }
                    className={filterFieldCls()}
                  />
                </label>
                <label className="block">
                  <span className={editLabelCls()}>Secondary phone</span>
                  <input
                    type="tel"
                    value={editForm.person_contact_number2}
                    onChange={(e) =>
                      setEditForm((p) =>
                        p ? { ...p, person_contact_number2: e.target.value } : p,
                      )
                    }
                    className={filterFieldCls()}
                  />
                </label>
                <label className="sm:col-span-2 block">
                  <span className={editLabelCls()}>Contact email *</span>
                  <input
                    type="email"
                    value={editForm.person_contact_email}
                    onChange={(e) =>
                      setEditForm((p) =>
                        p ? { ...p, person_contact_email: e.target.value } : p,
                      )
                    }
                    className={filterFieldCls()}
                  />
                </label>
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setEditModal(null);
                  setEditForm(null);
                  setEditError(null);
                }}
                disabled={editSubmitting}
                className={zohoSecondaryBtnCls()}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitEdit()}
                disabled={editSubmitting}
                className={zohoPrimaryBtnCls()}
              >
                {editSubmitting ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function BackgroundVerificationEmployeeClientWithSuspense() {
  return (
    <Suspense
      fallback={
        <div className={`${dashPageCls} pb-8`}>
          <BgvEmployeeDetailSkeleton />
        </div>
      }
    >
      <BackgroundVerificationEmployeeClientContent />
    </Suspense>
  );
}
