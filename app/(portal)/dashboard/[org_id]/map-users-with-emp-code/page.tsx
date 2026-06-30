"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  BadgeCheck,
  Hash,
  Loader2,
  RefreshCw,
  Save,
  Search,
  UserRound,
  Users,
} from "lucide-react";
import PortalPageLoader from "@/components/portal-dashboard/ui/PortalPageLoader";
import PortalResponseModal, {
  type PortalResponseVariant,
} from "@/components/portal-dashboard/ui/PortalResponseModal";
import {
  getUsersForMapping,
  mapUsersBulk,
  type MapUserRow,
} from "@/services/mapUsers";

const ACCENT = "#008CD3";
const ACCENT_SOFT = "#E8F4FB";

type EditableRow = MapUserRow & {
  draftEmpCode: string;
};

function authToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase();
}

function avatarColorClass(seed: string) {
  const colors = [
    "bg-[#E8F4FB] text-[#008CD3]",
    "bg-[#E6F4EA] text-[#0F9D58]",
    "bg-[#FEF3E6] text-[#E8710A]",
    "bg-[#F3E8FD] text-[#7B1FA2]",
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length]!;
}

function inputCls(hasError = false) {
  return [
    "w-full rounded-lg border bg-white px-3 py-2 text-[13px] font-medium uppercase tracking-wide text-[#1F2937] outline-none transition placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-[#9CA3AF]",
    hasError
      ? "border-[#D93025] focus:border-[#D93025] focus:ring-2 focus:ring-[#D93025]/15"
      : "border-[#E4E7EC] focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15",
  ].join(" ");
}

export default function MapUsersWithEmpCodePage() {
  const params = useParams();
  const orgId = String(params?.org_id ?? "");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "mapped" | "unmapped" | "changed">(
    "all",
  );
  const [responseModal, setResponseModal] = useState<{
    open: boolean;
    variant: PortalResponseVariant;
    title: string;
    message: string;
    detail?: string;
  }>({
    open: false,
    variant: "success",
    title: "",
    message: "",
  });

  const showResponse = useCallback(
    (
      variant: PortalResponseVariant,
      title: string,
      message: string,
      detail?: string,
    ) => {
      setResponseModal({ open: true, variant, title, message, detail });
    },
    [],
  );

  const loadUsers = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      const token = authToken();
      if (!token || !orgId) {
        setError("Session expired. Please sign in again.");
        setLoading(false);
        return;
      }

      if (mode === "initial") setLoading(true);
      else setRefreshing(true);
      setError(null);

      try {
        const data = await getUsersForMapping(token, orgId);
        setRows(
          data.map((row) => ({
            ...row,
            draftEmpCode: String(row.emp_code ?? "").trim(),
          })),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load employees");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orgId],
  );

  useEffect(() => {
    void loadUsers("initial");
  }, [loadUsers]);

  const stats = useMemo(() => {
    const total = rows.length;
    const mapped = rows.filter((r) => String(r.emp_code ?? "").trim()).length;
    const changed = rows.filter(
      (r) =>
        r.draftEmpCode.trim().toUpperCase() !==
        String(r.emp_code ?? "").trim().toUpperCase(),
    ).length;
    return {
      total,
      mapped,
      unmapped: total - mapped,
      changed,
    };
  }, [rows]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      const code = row.draftEmpCode.trim();
      const savedCode = String(row.emp_code ?? "").trim();
      const matchesSearch =
        !q ||
        row.user_name.toLowerCase().includes(q) ||
        row.user_email.toLowerCase().includes(q) ||
        code.toLowerCase().includes(q) ||
        savedCode.toLowerCase().includes(q) ||
        String(row.user_id).includes(q);

      if (!matchesSearch) return false;
      if (filter === "mapped") return Boolean(savedCode);
      if (filter === "unmapped") return !savedCode;
      if (filter === "changed") {
        return code.toUpperCase() !== savedCode.toUpperCase();
      }
      return true;
    });
  }, [rows, search, filter]);

  const duplicateCodes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const code = row.draftEmpCode.trim().toUpperCase();
      if (!code) continue;
      counts.set(code, (counts.get(code) ?? 0) + 1);
    }
    return new Set(
      [...counts.entries()].filter(([, count]) => count > 1).map(([code]) => code),
    );
  }, [rows]);

  const changedPayload = useMemo(
    () =>
      rows
        .filter(
          (row) =>
            row.draftEmpCode.trim() &&
            row.draftEmpCode.trim().toUpperCase() !==
              String(row.emp_code ?? "").trim().toUpperCase(),
        )
        .map((row) => ({
          user_id: row.user_id,
          emp_code: row.draftEmpCode.trim().toUpperCase(),
        })),
    [rows],
  );

  const updateEmpCode = (userId: number, value: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.user_id === userId
          ? { ...row, draftEmpCode: value.toUpperCase() }
          : row,
      ),
    );
  };

  const handleSave = async () => {
    const token = authToken();
    if (!token || !orgId) {
      showResponse("error", "Not signed in", "Please sign in again to continue.");
      return;
    }

    if (changedPayload.length === 0) {
      showResponse("info", "Nothing to save", "Update at least one employee code first.");
      return;
    }

    if (duplicateCodes.size > 0) {
      showResponse(
        "error",
        "Duplicate codes found",
        "Each employee code must be unique. Fix highlighted duplicates before saving.",
        [...duplicateCodes].join(", "),
      );
      return;
    }

    setSaving(true);
    try {
      const result = await mapUsersBulk(token, orgId, changedPayload);
      showResponse("success", "Mappings saved", result.message);
      await loadUsers("refresh");
    } catch (err) {
      showResponse(
        "error",
        "Save failed",
        err instanceof Error ? err.message : "Could not save mappings",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PortalPageLoader message="Loading employees…" />;
  }

  return (
    <div className="min-h-full bg-[#F8FAFC] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="overflow-hidden rounded-2xl border border-[#E4E7EC] bg-white shadow-sm">
          <div
            className="border-b border-[#E4E7EC] px-5 py-5 sm:px-6"
            style={{ background: `linear-gradient(135deg, ${ACCENT_SOFT} 0%, #fff 70%)` }}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#008CD3] ring-1 ring-[#008CD3]/15">
                  <Hash className="h-3.5 w-3.5" />
                  Biometric mapping
                </div>
                <h1 className="text-xl font-semibold text-[#111827] sm:text-2xl">
                  Map employees with emp code
                </h1>
                <p className="mt-1 max-w-2xl text-sm text-[#6B7280]">
                  Assign biometric employee codes in bulk so attendance punches sync
                  to the correct portal users.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void loadUsers("refresh")}
                  disabled={refreshing || saving}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#E4E7EC] bg-white px-4 py-2.5 text-sm font-medium text-[#374151] transition hover:bg-[#F9FAFB] disabled:opacity-60"
                >
                  {refreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving || changedPayload.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ backgroundColor: ACCENT }}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save {changedPayload.length > 0 ? `(${changedPayload.length})` : "changes"}
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 border-b border-[#E4E7EC] px-5 py-4 sm:grid-cols-2 lg:grid-cols-4 sm:px-6">
            {[
              { label: "Total employees", value: stats.total, icon: Users },
              { label: "Mapped", value: stats.mapped, icon: BadgeCheck },
              { label: "Unmapped", value: stats.unmapped, icon: UserRound },
              { label: "Pending changes", value: stats.changed, icon: Hash },
            ].map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="rounded-xl border border-[#EEF2F6] bg-[#FCFCFD] px-4 py-3"
              >
                <div className="flex items-center gap-2 text-[#6B7280]">
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-medium">{label}</span>
                </div>
                <p className="mt-1 text-2xl font-semibold text-[#111827]">{value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 border-b border-[#E4E7EC] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, or emp code…"
                className="w-full rounded-lg border border-[#E4E7EC] bg-white py-2.5 pl-9 pr-3 text-sm text-[#1F2937] outline-none transition focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["all", "All"],
                  ["unmapped", "Unmapped"],
                  ["mapped", "Mapped"],
                  ["changed", "Changed"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={[
                    "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                    filter === key
                      ? "bg-[#008CD3] text-white"
                      : "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]",
                  ].join(" ")}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <div className="mx-5 mt-4 flex items-start gap-3 rounded-xl border border-[#F5C2C0] bg-[#FCE8E6] px-4 py-3 text-sm text-[#B71C1C] sm:mx-6">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Could not load employees</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#F9FAFB] text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
                <tr>
                  <th className="px-5 py-3 sm:px-6">Employee</th>
                  <th className="px-5 py-3 sm:px-6">Email</th>
                  <th className="px-5 py-3 sm:px-6">Current code</th>
                  <th className="min-w-[180px] px-5 py-3 sm:px-6">Emp code</th>
                  <th className="px-5 py-3 sm:px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2F6]">
                {visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-[#6B7280] sm:px-6">
                      No employees match your filters.
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((row) => {
                    const savedCode = String(row.emp_code ?? "").trim();
                    const draft = row.draftEmpCode.trim();
                    const isChanged =
                      draft.toUpperCase() !== savedCode.toUpperCase();
                    const isDuplicate = Boolean(
                      draft && duplicateCodes.has(draft.toUpperCase()),
                    );

                    return (
                      <tr key={row.user_id} className="bg-white hover:bg-[#FCFCFD]">
                        <td className="px-5 py-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            {row.user_image ? (
                              <img
                                src={row.user_image}
                                alt=""
                                className="h-10 w-10 rounded-full object-cover ring-1 ring-[#E4E7EC]"
                              />
                            ) : (
                              <div
                                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${avatarColorClass(row.user_name)}`}
                              >
                                {initialsFromName(row.user_name)}
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-[#111827]">{row.user_name}</p>
                              <p className="text-xs text-[#9CA3AF]">ID {row.user_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-[#4B5563] sm:px-6">
                          {row.user_email}
                        </td>
                        <td className="px-5 py-4 sm:px-6">
                          {savedCode ? (
                            <span className="inline-flex rounded-md bg-[#E6F4EA] px-2 py-1 text-xs font-semibold uppercase tracking-wide text-[#0F9D58]">
                              {savedCode}
                            </span>
                          ) : (
                            <span className="text-xs text-[#9CA3AF]">Not mapped</span>
                          )}
                        </td>
                        <td className="px-5 py-4 sm:px-6">
                          <input
                            type="text"
                            value={row.draftEmpCode}
                            onChange={(e) => updateEmpCode(row.user_id, e.target.value)}
                            placeholder="e.g. MV06"
                            className={inputCls(isDuplicate)}
                          />
                          {isDuplicate ? (
                            <p className="mt-1 text-[11px] font-medium text-[#D93025]">
                              Duplicate code
                            </p>
                          ) : null}
                        </td>
                        <td className="px-5 py-4 sm:px-6">
                          {isChanged ? (
                            <span className="inline-flex rounded-full bg-[#FEF3E6] px-2.5 py-1 text-[11px] font-semibold text-[#E8710A]">
                              Unsaved
                            </span>
                          ) : savedCode ? (
                            <span className="inline-flex rounded-full bg-[#E6F4EA] px-2.5 py-1 text-[11px] font-semibold text-[#0F9D58]">
                              Mapped
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[11px] font-semibold text-[#6B7280]">
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-[#E4E7EC] bg-[#FCFCFD] px-5 py-4 text-xs text-[#6B7280] sm:px-6">
            Only changed rows are sent on save. Payload shape:{" "}
            <code className="rounded bg-white px-1.5 py-0.5 text-[11px] text-[#374151] ring-1 ring-[#E4E7EC]">
              {"{ emp_info: [{ user_id, emp_code }] }"}
            </code>
          </div>
        </section>
      </div>

      <PortalResponseModal
        open={responseModal.open}
        variant={responseModal.variant}
        title={responseModal.title}
        message={responseModal.message}
        detail={responseModal.detail}
        onClose={() => setResponseModal((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
