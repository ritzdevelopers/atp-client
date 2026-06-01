"use client";

import { useCallback, useEffect, useState, startTransition } from "react";
import { useParams } from "next/navigation";
import {
  MapPin,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Pencil,
  Building2,
  Info,
  Plus,
  X,
} from "lucide-react";
import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import {
  type OrganizationAddress,
  type OrganizationAddressPayload,
  createOrganizationAddress,
  getOrganizationAddresses,
  updateOrganizationAddress,
} from "@/services/organization";

type AddressFormState = {
  address_line: string;
  city: string;
  district: string;
  state: string;
  country: string;
  zip_code: string;
};

type SheetMode = "add" | "edit" | null;

const EMPTY_FORM: AddressFormState = {
  address_line: "",
  city: "",
  district: "",
  state: "",
  country: "",
  zip_code: "",
};

function addressToForm(addr: OrganizationAddress): AddressFormState {
  return {
    address_line: addr.address_line?.trim() ?? "",
    city: addr.city?.trim() ?? "",
    district: addr.district?.trim() ?? "",
    state: addr.state?.trim() ?? "",
    country: addr.country?.trim() ?? "",
    zip_code: addr.zip_code?.trim() ?? "",
  };
}

function formatAddressText(addr: OrganizationAddress): string {
  return formatAddressLine(addressToForm(addr));
}

function labelCls(mobile = false) {
  return mobile
    ? "mb-1.5 block text-[13px] font-medium text-[#6B7280]"
    : "mb-1.5 block text-sm font-medium text-[#0C123A]";
}

function inputCls() {
  return "w-full rounded-lg border border-[#E4E7EC] bg-white px-3.5 py-3 text-[15px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15 disabled:bg-[#F5F7FA] disabled:text-[#6B7280] lg:border-slate-200 lg:py-2.5 lg:text-sm lg:text-[#0C123A] lg:shadow-sm lg:focus:border-[#C99237] lg:focus:ring-[#C99237]/20";
}

function zohoPrimaryBtnCls(full = false) {
  return `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#008CD3] px-5 py-2.5 text-[15px] font-medium text-white transition active:scale-[0.98] hover:bg-[#0070AA] disabled:pointer-events-none disabled:opacity-50 lg:bg-[#C99237] lg:text-sm lg:font-bold lg:text-[#0C123A] lg:hover:bg-[#b87d2e] ${full ? "w-full" : ""}`;
}

function zohoSecondaryBtnCls(full = false) {
  return `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-[#E4E7EC] bg-white px-4 py-2.5 text-[15px] font-medium text-[#1F2937] transition active:scale-[0.98] hover:bg-[#F5F7FA] disabled:pointer-events-none disabled:opacity-50 lg:border-slate-200 lg:text-sm lg:font-semibold lg:text-[#0C123A] lg:shadow-sm lg:hover:bg-slate-50 ${full ? "w-full" : ""}`;
}

function formatAddressLine(form: AddressFormState): string {
  const parts = [
    form.address_line,
    [form.city, form.district, form.state].filter(Boolean).join(", "),
    [form.country, form.zip_code].filter(Boolean).join(" "),
  ].filter((p) => p.trim() !== "");
  return parts.join("\n");
}

function validateForm(form: AddressFormState): string | null {
  if (!form.city.trim()) return "City is required.";
  if (!form.state.trim()) return "State is required.";
  if (!form.district.trim()) return "District is required.";
  if (!form.country.trim()) return "Country is required.";
  return null;
}

function formToPayload(
  form: AddressFormState,
  orgId: number,
): OrganizationAddressPayload {
  return {
    org_id: orgId,
    city: form.city,
    state: form.state,
    district: form.district,
    country: form.country,
    zip_code: form.zip_code || null,
    address_line: form.address_line || null,
  };
}

function formatUpdatedAt(value: string | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

type AddressFieldsProps = {
  form: AddressFormState;
  setForm: React.Dispatch<React.SetStateAction<AddressFormState>>;
  disabled: boolean;
  mobile?: boolean;
  idPrefix: string;
};

function AddressFields({ form, setForm, disabled, mobile = false, idPrefix }: AddressFieldsProps) {
  const set =
    (key: keyof AddressFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor={`${idPrefix}-address_line`} className={labelCls(mobile)}>
          Street address
        </label>
        <textarea
          id={`${idPrefix}-address_line`}
          rows={3}
          className={`${inputCls()} min-h-[88px] resize-y`}
          value={form.address_line}
          onChange={set("address_line")}
          placeholder="Building, street, suite"
          disabled={disabled}
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-city`} className={labelCls(mobile)}>
          City <span className="text-red-500">*</span>
        </label>
        <input
          id={`${idPrefix}-city`}
          type="text"
          className={inputCls()}
          value={form.city}
          onChange={set("city")}
          required
          disabled={disabled}
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-district`} className={labelCls(mobile)}>
          District <span className="text-red-500">*</span>
        </label>
        <input
          id={`${idPrefix}-district`}
          type="text"
          className={inputCls()}
          value={form.district}
          onChange={set("district")}
          required
          disabled={disabled}
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-state`} className={labelCls(mobile)}>
          State <span className="text-red-500">*</span>
        </label>
        <input
          id={`${idPrefix}-state`}
          type="text"
          className={inputCls()}
          value={form.state}
          onChange={set("state")}
          required
          disabled={disabled}
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-country`} className={labelCls(mobile)}>
          Country <span className="text-red-500">*</span>
        </label>
        <input
          id={`${idPrefix}-country`}
          type="text"
          className={inputCls()}
          value={form.country}
          onChange={set("country")}
          required
          disabled={disabled}
        />
      </div>
      <div className="sm:col-span-2 sm:max-w-xs">
        <label htmlFor={`${idPrefix}-zip`} className={labelCls(mobile)}>
          ZIP / postal code
        </label>
        <input
          id={`${idPrefix}-zip`}
          type="text"
          className={inputCls()}
          value={form.zip_code}
          onChange={set("zip_code")}
          placeholder="Optional"
          disabled={disabled}
        />
      </div>
    </div>
  );
}

type AddressCardProps = {
  addr: OrganizationAddress;
  index: number;
  onEdit: () => void;
  compact?: boolean;
};

function AddressCard({ addr, index, onEdit, compact = false }: AddressCardProps) {
  const updated = formatUpdatedAt(addr.updated_at);
  const label = [addr.city, addr.state].filter(Boolean).join(", ") || `Address ${index + 1}`;

  if (compact) {
    return (
      <li className="border-b border-[#E4E7EC] last:border-b-0">
        <div className="px-4 py-3.5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
              <MapPin className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[16px] font-medium text-[#1F2937]">{label}</p>
              <p className="mt-1 line-clamp-3 whitespace-pre-line text-[14px] leading-snug text-[#6B7280]">
                {formatAddressText(addr)}
              </p>
              {updated ? (
                <p className="mt-1 text-[12px] text-[#9CA3AF]">Updated {updated}</p>
              ) : null}
            </div>
          </div>
          <button type="button" onClick={onEdit} className={`mt-3 ${zohoSecondaryBtnCls(true)}`}>
            <Pencil className="h-4 w-4" />
            Edit
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex flex-col rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:border-[#C99237]/40 hover:shadow-md">
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#C99237]/12 text-[#C99237]">
            <MapPin className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Location {index + 1}
            </p>
            <p className="mt-0.5 truncate font-semibold text-[#0C123A]">{label}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
          #{String(addr.id)}
        </span>
      </div>
      <p className="mt-3 flex-1 whitespace-pre-line text-sm leading-relaxed text-slate-700">
        {formatAddressText(addr)}
      </p>
      {updated ? <p className="mt-2 text-xs text-slate-500">Last updated: {updated}</p> : null}
      <button
        type="button"
        onClick={onEdit}
        className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-[#0C123A] shadow-sm transition hover:bg-slate-50 sm:w-auto"
      >
        <Pencil className="h-4 w-4" />
        Edit address
      </button>
    </li>
  );
}

export default function ManageOrganizationInformationPage() {
  const params = useParams();
  const orgIdParam = params?.org_id;
  const ctx = useManagementDashboardContext();

  const [addresses, setAddresses] = useState<OrganizationAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [editingAddress, setEditingAddress] = useState<OrganizationAddress | null>(null);
  const [form, setForm] = useState<AddressFormState>({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"addresses" | "guide">("addresses");

  const organizationIdNum =
    ctx?.organization?.id != null ? Number(ctx.organization.id) : Number(orgIdParam);
  const orgName = ctx?.organization?.org_name?.trim() || `Organization ${orgIdParam ?? ""}`;
  const orgMissing = !organizationIdNum || Number.isNaN(organizationIdNum);
  const addressCount = addresses.length;

  const loadAddresses = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent === true;
      if (orgMissing) {
        setLoading(false);
        setRefreshing(false);
        setAddresses([]);
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
        const rows = await getOrganizationAddresses(token, organizationIdNum);
        setAddresses(rows);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Could not load addresses.");
        setAddresses([]);
      } finally {
        if (silent) setRefreshing(false);
        else setLoading(false);
      }
    },
    [orgMissing, organizationIdNum],
  );

  useEffect(() => {
    startTransition(() => {
      void loadAddresses();
    });
  }, [loadAddresses]);

  function openAdd() {
    setFormError(null);
    setSuccess(null);
    setEditingAddress(null);
    setForm({ ...EMPTY_FORM });
    setSheetMode("add");
    setMobileTab("addresses");
  }

  function openEdit(addr: OrganizationAddress) {
    setFormError(null);
    setSuccess(null);
    setEditingAddress(addr);
    setForm(addressToForm(addr));
    setSheetMode("edit");
    setMobileTab("addresses");
  }

  function closeSheet(force = false) {
    if (submitting && !force) return;
    setSheetMode(null);
    setEditingAddress(null);
    setForm({ ...EMPTY_FORM });
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);

    const validationError = validateForm(form);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    if (orgMissing) {
      setFormError("Invalid organization.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setFormError("Not signed in.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = formToPayload(form, organizationIdNum);
      if (sheetMode === "edit" && editingAddress?.id != null) {
        await updateOrganizationAddress(token, {
          ...payload,
          organization_address_id: editingAddress.id,
        });
        setSuccess("Address updated successfully.");
      } else {
        await createOrganizationAddress(token, payload);
        setSuccess("Address added successfully.");
      }
      closeSheet(true);
      await loadAddresses({ silent: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save address.");
    } finally {
      setSubmitting(false);
    }
  }

  const mobileTabs = [
    { id: "addresses" as const, label: "Addresses", count: addressCount },
    { id: "guide" as const, label: "Guide" },
  ];

  const statusBanner = success ? (
    <div
      className="flex items-start gap-2 rounded-lg border border-[#A8DAB5] bg-[#E6F4EA] px-4 py-3 text-[14px] text-[#0F9D58] lg:border-emerald-200 lg:bg-emerald-50 lg:text-sm lg:text-emerald-900"
      role="status"
    >
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{success}</span>
    </div>
  ) : null;

  const sheetTitle = sheetMode === "edit" ? "Edit address" : "Add address";
  const sheetOpen = sheetMode != null;

  return (
    <div className="min-h-full bg-[#F5F7FA] lg:bg-transparent lg:space-y-6">
      {/* Mobile & tablet */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-20 border-b border-[#E4E7EC] bg-white shadow-sm">
          <div className="flex items-center gap-2 px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
              <MapPin className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[17px] font-semibold text-[#1F2937]">
                Organization addresses
              </h1>
              <p className="truncate text-[13px] text-[#6B7280]">
                {loading
                  ? "Loading…"
                  : `${addressCount} location${addressCount === 1 ? "" : "s"}`}{" "}
                · {orgName}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadAddresses({ silent: true })}
              disabled={orgMissing || loading || refreshing}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#008CD3] active:bg-[#F5F7FA] disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={openAdd}
              disabled={orgMissing}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#008CD3] text-white active:scale-[0.98] disabled:opacity-50"
              aria-label="Add address"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
          <div className="px-4 pb-3">
            <div className="flex rounded-lg bg-[#F5F7FA] p-1">
              {mobileTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMobileTab(tab.id)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-[13px] font-medium transition ${
                    mobileTab === tab.id
                      ? "bg-white text-[#008CD3] shadow-sm"
                      : "text-[#6B7280]"
                  }`}
                >
                  {tab.label}
                  {"count" in tab && tab.count != null ? (
                    <span
                      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] ${
                        mobileTab === tab.id
                          ? "bg-[#E8F4FB] text-[#008CD3]"
                          : "bg-[#E4E7EC] text-[#6B7280]"
                      }`}
                    >
                      {tab.count > 99 ? "99+" : tab.count}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loadError ? (
          <div className="mx-4 mt-3 flex items-start gap-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-4 py-3 text-[14px] text-[#D93025]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{loadError}</span>
          </div>
        ) : null}

        {orgMissing ? (
          <div className="mx-4 mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[14px] text-amber-950">
            Invalid organization context.
          </div>
        ) : null}

        {loading && !loadError ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-[#6B7280]">
            <Loader2 className="h-9 w-9 animate-spin text-[#008CD3]" />
            <p className="text-[15px]">Loading addresses…</p>
          </div>
        ) : null}

        {!loading && mobileTab === "guide" ? (
          <div className="space-y-3 p-4">
            <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Organization
              </p>
              <p className="mt-1 text-lg font-semibold text-[#1F2937]">{orgName}</p>
            </div>
            <div className="rounded-xl border border-[#E4E7EC] bg-[#E8F4FB] p-4">
              <div className="flex gap-3">
                <Info className="h-5 w-5 shrink-0 text-[#008CD3]" />
                <p className="text-[14px] leading-relaxed text-[#4B5563]">
                  Add multiple addresses for branches, warehouses, or other locations. Only the
                  organization owner can add or edit addresses.
                </p>
              </div>
            </div>
            <button type="button" onClick={openAdd} className={zohoPrimaryBtnCls(true)}>
              <Plus className="h-4 w-4" />
              Add another address
            </button>
          </div>
        ) : null}

        {!loading && mobileTab === "addresses" ? (
          <div className="pb-8">
            {statusBanner ? <div className="mx-4 mt-3">{statusBanner}</div> : null}

            {!loadError && addressCount === 0 ? (
              <div className="mx-4 mt-4 rounded-xl border border-dashed border-[#E4E7EC] bg-white px-6 py-14 text-center">
                <MapPin className="mx-auto h-10 w-10 text-[#9CA3AF]" />
                <p className="mt-4 text-[17px] font-semibold text-[#1F2937]">No addresses yet</p>
                <p className="mt-2 text-[14px] text-[#6B7280]">
                  Add your first office or branch location.
                </p>
                <button type="button" onClick={openAdd} className={`mt-6 ${zohoPrimaryBtnCls()}`}>
                  <Plus className="h-4 w-4" />
                  Add address
                </button>
              </div>
            ) : null}

            {addressCount > 0 ? (
              <>
                <div className="mx-4 mt-3">
                  <button type="button" onClick={openAdd} className={zohoPrimaryBtnCls(true)}>
                    <Plus className="h-4 w-4" />
                    Add another address
                  </button>
                </div>
                <ul className="mt-3 divide-y divide-[#E4E7EC] border-t border-[#E4E7EC] bg-white">
                  {addresses.map((addr, i) => (
                    <AddressCard
                      key={String(addr.id)}
                      addr={addr}
                      index={i}
                      onEdit={() => openEdit(addr)}
                      compact
                    />
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Desktop */}
      <div className="hidden space-y-6 lg:block">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#C99237]/12">
                <Building2 className="h-6 w-6 text-[#C99237]" aria-hidden />
              </span>
              <div>
                <h1 className="text-xl font-bold text-[#0C123A] sm:text-2xl">
                  Manage organization information
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Registered addresses for{" "}
                  <span className="font-medium text-slate-700">{orgName}</span>. Add as many
                  locations as you need (branches, offices, warehouses).
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => void loadAddresses({ silent: true })}
                disabled={orgMissing || loading || refreshing}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0C123A] shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button
                type="button"
                onClick={openAdd}
                disabled={orgMissing}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#C99237] px-4 py-2.5 text-sm font-bold text-[#0C123A] shadow-sm transition hover:bg-[#b87d2e] disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {addressCount === 0 ? "Add address" : "Add another address"}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
          {loadError ? (
            <div className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {loadError}
            </div>
          ) : null}

          {orgMissing ? (
            <p className="text-sm text-slate-500">Invalid organization context.</p>
          ) : null}

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-[#C99237]" />
              <p className="text-sm">Loading addresses…</p>
            </div>
          ) : (
            <>
              {statusBanner ? <div className="mb-6">{statusBanner}</div> : null}

              <div className="grid gap-8 xl:grid-cols-[1fr,minmax(280px,360px)]">
                <div>
                  {addressCount === 0 ? (
                    <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-14 text-center">
                      <MapPin className="mb-3 h-10 w-10 text-slate-300" aria-hidden />
                      <p className="text-sm font-medium text-[#0C123A]">No addresses yet</p>
                      <p className="mt-1 max-w-sm text-sm text-slate-500">
                        Register one or more locations for this organization.
                      </p>
                      <button
                        type="button"
                        onClick={openAdd}
                        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#C99237] px-4 py-2 text-sm font-bold text-[#0C123A] shadow-sm hover:bg-[#b87d2e]"
                      >
                        <Plus className="h-4 w-4" />
                        Add address
                      </button>
                    </div>
                  ) : (
                    <ul className="grid gap-4 sm:grid-cols-2">
                      {addresses.map((addr, i) => (
                        <AddressCard
                          key={String(addr.id)}
                          addr={addr}
                          index={i}
                          onEdit={() => openEdit(addr)}
                        />
                      ))}
                    </ul>
                  )}
                </div>

                <aside className="space-y-4">
                  <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Organization
                    </p>
                    <p className="mt-1 font-semibold text-[#0C123A]">{orgName}</p>
                    <p className="mt-2 text-sm text-slate-500">ID: {organizationIdNum}</p>
                    <p className="mt-3 text-sm font-medium text-[#0C123A]">
                      {addressCount} saved address{addressCount === 1 ? "" : "es"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-sky-100 bg-sky-50/80 p-5">
                    <div className="flex gap-3">
                      <Info className="h-5 w-5 shrink-0 text-sky-700" />
                      <p className="text-sm leading-relaxed text-slate-600">
                        Use &quot;Add another address&quot; for each branch or site. City, state,
                        district, and country are required.
                      </p>
                    </div>
                  </div>
                  {addressCount > 0 ? (
                    <button
                      type="button"
                      onClick={openAdd}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#C99237]/50 bg-[#C99237]/5 px-4 py-3 text-sm font-semibold text-[#0C123A] transition hover:bg-[#C99237]/10"
                    >
                      <Plus className="h-4 w-4 text-[#C99237]" />
                      Add another address
                    </button>
                  ) : null}
                </aside>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add / edit sheet */}
      {sheetOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#1F2937]/40 p-0 backdrop-blur-[1px] sm:items-center sm:bg-black/40 sm:p-4"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeSheet(false);
          }}
        >
          <div
            className="flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-[#E4E7EC] bg-white shadow-xl sm:max-h-[min(90vh,720px)] sm:rounded-2xl sm:border-slate-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="address-sheet-title"
          >
            <div className="shrink-0 border-b border-[#E4E7EC] bg-white p-4 sm:p-6 sm:pb-4 sm:[border-top:3px_solid_#008CD3] lg:[border-top-color:#C99237]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2
                    id="address-sheet-title"
                    className="text-[17px] font-semibold text-[#1F2937] sm:text-lg sm:font-bold sm:text-[#0C123A]"
                  >
                    {sheetTitle}
                  </h2>
                  <p className="mt-1 text-[14px] text-[#6B7280] sm:text-sm sm:text-slate-600">
                    {orgName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => closeSheet()}
                  disabled={submitting}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#6B7280] active:bg-[#F5F7FA]"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
                {formError ? (
                  <div className="mb-4 flex items-start gap-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-3 py-2 text-sm text-[#D93025]">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {formError}
                  </div>
                ) : null}
                <AddressFields
                  form={form}
                  setForm={setForm}
                  disabled={submitting}
                  mobile
                  idPrefix={sheetMode === "edit" ? "edit" : "add"}
                />
              </div>
              <div className="shrink-0 flex flex-col-reverse gap-2 border-t border-[#E4E7EC] bg-white p-4 sm:flex-row sm:justify-end sm:p-6">
                <button
                  type="button"
                  onClick={() => closeSheet()}
                  disabled={submitting}
                  className={zohoSecondaryBtnCls(true)}
                >
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className={zohoPrimaryBtnCls(true)}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : sheetMode === "edit" ? (
                    "Save changes"
                  ) : (
                    "Save address"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
