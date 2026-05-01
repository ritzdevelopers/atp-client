"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { MdCalendarMonth, MdDashboard, MdOutlineSettings } from "react-icons/md";
import { BsPerson } from "react-icons/bs";
import { PiBagSimple } from "react-icons/pi";
import { LuFileSpreadsheet } from "react-icons/lu";
import { RiQuestionLine } from "react-icons/ri";

const navigationItems = [
  { id: "dashboard", label: "Dashboard", icon: MdDashboard, active: true },  
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

function LeftSideBar() {
  const params = useParams();
  const orgIdParam = params?.org_id;
  const orgId = Number(orgIdParam);

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveType, setLeaveType] = useState<"full_day" | "half_day" | "short_leave">("full_day");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [leaveSuccess, setLeaveSuccess] = useState<string | null>(null);

  async function submitLeave(e: React.FormEvent) {
    e.preventDefault();
    setLeaveError(null);
    setLeaveSuccess(null);

    if (!orgId || Number.isNaN(orgId)) {
      setLeaveError("Invalid organization.");
      return;
    }
    if (!startDate) {
      setLeaveError("Start date is required.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setLeaveError("Not signed in.");
      return;
    }

    setSubmittingLeave(true);
    try {
      const res = await fetch(`${API_URL}/api/employees/apply-for-leave`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          org_id: orgId,
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate || null,
          reason: reason.trim() || null,
        }),
      });
      const result = (await res.json()) as { message?: string };
      if (!res.ok) {
        throw new Error(result.message || "Could not submit leave request");
      }
      setLeaveSuccess(result.message || "Leave request submitted successfully.");
      setLeaveType("full_day");
      setStartDate("");
      setEndDate("");
      setReason("");
    } catch (error) {
      setLeaveError(error instanceof Error ? error.message : "Could not submit leave request.");
    } finally {
      setSubmittingLeave(false);
    }
  }

  return (
    <aside className="sticky top-0 flex h-screen w-[250px] flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="flex min-w-0 flex-shrink-0 items-center">
          <img
            src="/portal/layout/logo.png"
            alt="Company"
            className="h-8 w-auto max-w-[160px] object-contain object-left sm:h-9"
          />
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                item.active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className="text-[18px]" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>


      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={() => setShowLeaveModal(true)}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-indigo-700 px-3 py-2.5 text-sm font-medium text-white hover:bg-indigo-800"
        >
          <MdCalendarMonth className="text-[18px]" />
          Apply Leave
        </button>
      </div>

      <div className="space-y-1 border-t border-slate-200 px-3 py-4">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
        >
          <MdOutlineSettings className="text-[18px]" />
          Settings
        </button>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
        >
          <RiQuestionLine className="text-[18px]" />
          Support
        </button>
      </div>

      {showLeaveModal && (
        <div 
        style={{ zIndex: 1000 }}
        className="fixed inset-0  flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute"
            onClick={() => !submittingLeave && setShowLeaveModal(false)}
          />
          <div className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-800">Apply for Leave</h3>
              <p className="mt-1 text-xs text-slate-500">Submit your leave query to management.</p>
            </div>
            <form onSubmit={submitLeave} className="space-y-3 px-5 py-4">
              {leaveError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {leaveError}
                </div>
              )}
              {leaveSuccess && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  {leaveSuccess}
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Leave type
                </label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as "full_day" | "half_day" | "short_leave")}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="full_day">Full Day</option>
                  <option value="half_day">Half Day</option>
                  <option value="short_leave">Short Leave</option>
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Start date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    End date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Reason
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Optional reason..."
                  className="w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={submittingLeave}
                  onClick={() => setShowLeaveModal(false)}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLeave}
                  className="inline-flex items-center gap-2 rounded-md bg-indigo-700 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submittingLeave ? "Submitting..." : "Submit Query"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}

export default LeftSideBar;