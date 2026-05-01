"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { GlobeLock, Loader2, CheckCircle2, AlertCircle, Network } from "lucide-react";
import { useManagementDashboardContext } from "@/components/portal-dashboard/Layout/ManagementDashboardContext";
import { addCompanyIPAddress } from "@/services/organizationSettings";

function labelCls() {
  return "mb-1.5 block text-sm font-medium text-[#0C123A]";
}

function inputCls() {
  return "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#0C123A] shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#C99237] focus:ring-2 focus:ring-[#C99237]/20";
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

  const organizationIdNum =
    ctx?.organization?.id != null ? Number(ctx.organization.id) : Number(orgIdParam);
  const orgName = ctx?.organization?.org_name?.trim() || `Organization ${orgIdParam ?? ""}`;
  const orgMissing = !organizationIdNum || Number.isNaN(organizationIdNum);

  const basePath = `/dashboard/${orgIdParam ?? ""}/organization-settings`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);

    const trimmedIp = ipAddress.trim();
    if (!trimmedIp) {
      setFormError("Enter an IP address.");
      return;
    }
    if (!isPlausibleIp(trimmedIp)) {
      setFormError("Enter a valid IPv4 or IPv6 address (e.g. 203.0.113.42 or 2001:db8::1).");
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
      setSuccess("IP address saved. Employees can only clock in from allowed addresses when IP rules are enforced.");
      setIpAddress("");
      setLabel("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not add IP address.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
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

        {success && (
          <div
            className="mb-6 flex flex-col gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 sm:flex-row sm:items-center sm:justify-between"
            role="status"
          >
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              <span>{success}</span>
            </div>
            <Link
              href={`${basePath}/manage-ip-addresses`}
              className="shrink-0 text-sm font-semibold text-emerald-800 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-950"
            >
              View all IP addresses →
            </Link>
          </div>
        )}

        {formError && (
          <div
            className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="org-context-ip" className={labelCls()}>
              Organization
            </label>
            <input
              id="org-context-ip"
              type="text"
              className={`${inputCls()} bg-slate-50 text-slate-600`}
              value={orgMissing ? "—" : `${orgName} (ID: ${organizationIdNum})`}
              readOnly
              tabIndex={-1}
              aria-readonly
            />
          </div>

          <div>
            <label htmlFor="ip-address" className={labelCls()}>
              IP address <span className="text-red-500">*</span>
            </label>
            <input
              id="ip-address"
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
            <p className="mt-1.5 text-xs text-slate-500">
              IPv4 or IPv6. Duplicate addresses for this organization are rejected.
            </p>
          </div>

          <div>
            <label htmlFor="ip-label" className={labelCls()}>
              Label <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="ip-label"
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
            <p className="mt-1.5 text-xs text-slate-500">
              Helps admins recognize this address in logs and lists.
            </p>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href={`${basePath}/manage-ip-addresses`}
              className="text-center text-sm font-semibold text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-[#0C123A] sm:text-left"
            >
              Back to manage IP addresses
            </Link>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => {
                  setFormError(null);
                  setSuccess(null);
                  setIpAddress("");
                  setLabel("");
                }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0C123A] shadow-sm transition hover:bg-slate-50"
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={submitting || orgMissing}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#C99237] px-5 py-2.5 text-sm font-bold text-[#0C123A] shadow-sm transition hover:bg-[#b87d2e] disabled:cursor-not-allowed disabled:opacity-60"
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
  );
}
