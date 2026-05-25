"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { GlobeLock, Loader2, CheckCircle2, AlertCircle, Network, Info } from "lucide-react";
import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import { addCompanyIPAddress } from "@/services/organizationSettings";

function labelCls(mobile = false) {
  return mobile
    ? "mb-1.5 block text-[13px] font-medium text-[#6B7280]"
    : "mb-1.5 block text-sm font-medium text-[#0C123A]";
}

function inputCls() {
  return "w-full rounded-lg border border-[#E4E7EC] bg-white px-3.5 py-3 text-[15px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15 lg:border-slate-200 lg:py-2.5 lg:text-sm lg:text-[#0C123A] lg:shadow-sm lg:focus:border-[#C99237] lg:focus:ring-[#C99237]/20";
}

function zohoPrimaryBtnCls(full = false) {
  return `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#008CD3] px-5 py-2.5 text-[15px] font-medium text-white transition active:scale-[0.98] hover:bg-[#0070AA] disabled:pointer-events-none disabled:opacity-50 lg:bg-[#C99237] lg:text-sm lg:font-bold lg:text-[#0C123A] lg:hover:bg-[#b87d2e] ${full ? "w-full" : ""}`;
}

function zohoSecondaryBtnCls(full = false) {
  return `inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[#E4E7EC] bg-white px-4 py-2.5 text-[15px] font-medium text-[#1F2937] transition active:scale-[0.98] hover:bg-[#F5F7FA] lg:border-slate-200 lg:text-sm lg:font-semibold lg:text-[#0C123A] lg:shadow-sm lg:hover:bg-slate-50 ${full ? "w-full" : ""}`;
}

/** Lightweight client check; server is authoritative. */
function isPlausibleIp(value: string): boolean {
  const t = value.trim();
  if (!t) return false;
  const v4 =
    /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/.test(t);
  if (v4) return true;
  const normalized = t.replace(/^\[|\]$/g, "");
  if (normalized.includes(":") && /^[0-9a-fA-F:.]+$/i.test(normalized)) return true;
  return false;
}

export default function CreateNewIPAddressPage() {
  const params = useParams();
  const orgIdParam = params?.org_id;
  const ctx = useManagementDashboardContext();

  const [ipAddress, setIpAddress] = useState("");
  const [label, setLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mobileMainTab, setMobileMainTab] = useState<"add" | "guide">("add");

  const organizationIdNum =
    ctx?.organization?.id != null ? Number(ctx.organization.id) : Number(orgIdParam);
  const orgName = ctx?.organization?.org_name?.trim() || `Organization ${orgIdParam ?? ""}`;
  const orgMissing = !organizationIdNum || Number.isNaN(organizationIdNum);

  const basePath = `/dashboard/${orgIdParam ?? ""}/organization-settings`;

  function clearForm() {
    setFormError(null);
    setSuccess(null);
    setIpAddress("");
    setLabel("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);

    const trimmedIp = ipAddress.trim();
    if (!trimmedIp) {
      setFormError("Enter an IP address.");
      setMobileMainTab("add");
      return;
    }
    if (!isPlausibleIp(trimmedIp)) {
      setFormError("Enter a valid IPv4 or IPv6 address (e.g. 203.0.113.42 or 2001:db8::1).");
      setMobileMainTab("add");
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
      await addCompanyIPAddress(token, {
        org_id: organizationIdNum,
        ip_address: trimmedIp,
        label: label.trim() || undefined,
      });
      setSuccess(
        "IP address saved. Employees can only clock in from allowed addresses when IP rules are enforced.",
      );
      setIpAddress("");
      setLabel("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not add IP address.");
    } finally {
      setSubmitting(false);
    }
  }

  const mobileTabs = [
    { id: "add" as const, label: "Add IP" },
    { id: "guide" as const, label: "Guide" },
  ];

  const statusBanner = success ? (
    <div
      className="flex flex-col gap-3 rounded-lg border border-[#A8DAB5] bg-[#E6F4EA] px-4 py-3 text-[14px] text-[#0F9D58] lg:flex-row lg:items-center lg:justify-between lg:border-emerald-200 lg:bg-emerald-50 lg:text-sm lg:text-emerald-900"
      role="status"
    >
      <div className="flex items-start gap-2">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 lg:text-emerald-600" aria-hidden />
        <span>{success}</span>
      </div>
      <Link
        href={`${basePath}/manage-ip-addresses`}
        className="shrink-0 font-semibold text-[#0F9D58] underline decoration-[#A8DAB5] underline-offset-2 lg:text-sm lg:text-emerald-800 lg:decoration-emerald-300 lg:hover:text-emerald-950"
      >
        View all IP addresses →
      </Link>
    </div>
  ) : formError ? (
    <div
      className="flex items-start gap-2 rounded-lg border border-[#F5C6C2] bg-[#FCE8E6] px-4 py-3 text-[14px] text-[#D93025] lg:border-red-200 lg:bg-red-50 lg:text-sm lg:text-red-900"
      role="alert"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 lg:text-red-600" aria-hidden />
      <span>{formError}</span>
    </div>
  ) : null;

  const formFields = (mobile: boolean) => (
    <>
      <div>
        <label htmlFor={mobile ? "org-context-ip-mobile" : "org-context-ip"} className={labelCls(mobile)}>
          Organization
        </label>
        <input
          id={mobile ? "org-context-ip-mobile" : "org-context-ip"}
          type="text"
          className={`${inputCls()} bg-[#F5F7FA] text-[#6B7280] lg:bg-slate-50`}
          value={orgMissing ? "—" : `${orgName} (ID: ${organizationIdNum})`}
          readOnly
          tabIndex={-1}
          aria-readonly
        />
      </div>

      <div>
        <label htmlFor={mobile ? "ip-address-mobile" : "ip-address"} className={labelCls(mobile)}>
          IP address <span className="text-[#D93025] lg:text-red-500">*</span>
        </label>
        <input
          id={mobile ? "ip-address-mobile" : "ip-address"}
          name="ip_address"
          type="text"
          inputMode="text"
          autoComplete="off"
          className={inputCls()}
          value={ipAddress}
          onChange={(e) => setIpAddress(e.target.value)}
          placeholder="e.g. 203.0.113.10 or 2001:db8::42"
          disabled={orgMissing}
          required
        />
        <p className="mt-1.5 text-[13px] text-[#6B7280] lg:text-xs lg:text-slate-500">
          IPv4 or IPv6. Duplicate addresses for this organization are rejected.
        </p>
      </div>

      <div>
        <label htmlFor={mobile ? "ip-label-mobile" : "ip-label"} className={labelCls(mobile)}>
          Label{" "}
          <span className="font-normal text-[#9CA3AF] lg:text-slate-400">(optional)</span>
        </label>
        <input
          id={mobile ? "ip-label-mobile" : "ip-label"}
          name="label"
          type="text"
          autoComplete="off"
          className={inputCls()}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Main office, VPN gateway"
          disabled={orgMissing}
          maxLength={120}
        />
        <p className="mt-1.5 text-[13px] text-[#6B7280] lg:text-xs lg:text-slate-500">
          Helps admins recognize this address in logs and lists.
        </p>
      </div>
    </>
  );

  return (
    <div className="min-h-full bg-[#F5F7FA] pb-28 lg:bg-transparent lg:space-y-6 lg:pb-0">
      {/* Mobile & tablet: Zoho admin portal style */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-20 border-b border-[#E4E7EC] bg-white shadow-sm">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8F4FB] text-[#008CD3]">
              <GlobeLock className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[17px] font-semibold text-[#1F2937]">Add IP address</h1>
              <p className="truncate text-[13px] text-[#6B7280]">{orgName}</p>
            </div>
          </div>

          <div className="px-4 pb-3">
            <div className="flex rounded-lg bg-[#F5F7FA] p-1">
              {mobileTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMobileMainTab(tab.id)}
                  className={`flex flex-1 items-center justify-center rounded-md py-2 text-[13px] font-medium transition ${
                    mobileMainTab === tab.id
                      ? "bg-white text-[#008CD3] shadow-sm"
                      : "text-[#6B7280]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {mobileMainTab === "add" ? (
          <div className="p-4">
            {statusBanner ? <div className="mb-4">{statusBanner}</div> : null}

            <form id="add-ip-mobile-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
                {formFields(true)}
              </div>
            </form>

            <Link
              href={`${basePath}/manage-ip-addresses`}
              className="mt-4 block text-center text-[14px] font-medium text-[#008CD3]"
            >
              View existing IP addresses
            </Link>
          </div>
        ) : null}

        {mobileMainTab === "guide" ? (
          <div className="space-y-3 p-4">
            <div className="flex gap-3 rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
              <Network className="h-5 w-5 shrink-0 text-[#008CD3]" />
              <div>
                <p className="text-[14px] font-medium text-[#1F2937]">Find your office IP</p>
                <p className="mt-1 text-[14px] leading-relaxed text-[#4B5563]">
                  Search &quot;what is my IP&quot; from the office network to copy the address your
                  team shares when on-site.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Supported formats
              </p>
              <ul className="mt-3 space-y-3">
                {[
                  "IPv4 — e.g. 203.0.113.42",
                  "IPv6 — e.g. 2001:db8::1",
                  "Duplicate IPs for the same organization are rejected.",
                ].map((item) => (
                  <li key={item} className="flex gap-3 text-[14px] text-[#4B5563]">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E8F4FB] text-[11px] font-semibold text-[#008CD3]">
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-[#E4E7EC] bg-[#E8F4FB] p-4">
              <div className="flex gap-3">
                <Info className="h-5 w-5 shrink-0 text-[#008CD3]" />
                <p className="text-[14px] leading-relaxed text-[#4B5563]">
                  Register the public IP your office or VPN exits from so attendance checks can match
                  your policy when IP rules are enforced.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {mobileMainTab === "add" ? (
          <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 border-t border-[#E4E7EC] bg-white px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
            <div className="flex gap-2">
              <button type="button" onClick={clearForm} className={zohoSecondaryBtnCls(true)}>
                Clear
              </button>
              <button
                type="submit"
                form="add-ip-mobile-form"
                disabled={submitting || orgMissing}
                className={zohoPrimaryBtnCls(true)}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Saving…
                  </>
                ) : (
                  <>
                    <GlobeLock className="h-4 w-4" aria-hidden />
                    Add IP address
                  </>
                )}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Desktop layout (unchanged) */}
      <div className="hidden space-y-6 lg:block">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#C99237]/12">
              <GlobeLock className="h-6 w-6 text-[#C99237]" aria-hidden />
            </span>
            <div>
              <h1 className="text-xl font-bold text-[#0C123A] sm:text-2xl">Add company IP address</h1>
              <p className="mt-1 text-sm text-slate-500">
                Register a trusted network address for{" "}
                <span className="font-medium text-slate-700">{orgName}</span>. Use the public IP your
                office or VPN exits from so attendance checks can match your policy.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-xs text-slate-600">
            <Network className="h-4 w-4 shrink-0 text-[#C99237]" aria-hidden />
            <span>
              Tip: search &quot;what is my IP&quot; from the office network to copy the address your
              team shares when on-site.
            </span>
          </div>

          {statusBanner ? <div className="mb-6">{statusBanner}</div> : null}

          <form onSubmit={handleSubmit} className="space-y-5">
            {formFields(false)}

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href={`${basePath}/manage-ip-addresses`}
                className="text-center text-sm font-semibold text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-[#0C123A] sm:text-left"
              >
                Back to manage IP addresses
              </Link>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button type="button" onClick={clearForm} className={zohoSecondaryBtnCls()}>
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={submitting || orgMissing}
                  className={zohoPrimaryBtnCls()}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Saving…
                    </>
                  ) : (
                    <>
                      <GlobeLock className="h-4 w-4" aria-hidden />
                      Add IP address
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
