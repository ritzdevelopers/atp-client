import { MdNotificationsNone, MdSearch } from "react-icons/md";

const attendanceDays = [
  { day: "M", date: "5", active: false },
  { day: "T", date: "6", active: true },
  { day: "W", date: "7", active: false },
  { day: "T", date: "8", active: false },
  { day: "F", date: "9", active: false },
  { day: "S", date: "10", active: false },
  { day: "S", date: "11", active: false },
];

function RightMainSide({ children }: { children: React.ReactNode }) {
  return (
    <section className="min-h-screen flex-1 bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-6 py-4 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div className="relative max-w-[420px] flex-1">
            <MdSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search dashboard..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none ring-indigo-200 placeholder:text-slate-400 focus:ring-2"
            />
          </div>
          <button
            type="button"
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Notifications"
          >
            <MdNotificationsNone className="text-[22px]" />
          </button>
        </div>
      </header>

      <div className="space-y-5 p-6">
        <section className="grid gap-5 xl:grid-cols-[2fr_1fr]">
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start gap-4">
              <img
                src="https://i.pravatar.cc/120?img=12"
                alt="Employee avatar"
                className="h-20 w-20 rounded-xl object-cover"
              />
              <div className="min-w-[240px] flex-1">
                <h2 className="text-lg font-semibold text-slate-800">Alex Rivers</h2>
                <p className="text-sm text-slate-500">Employee ID: #E1-9920</p>
                <div className="mt-4 grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Address
                    </p>
                    <p>2245 Bluebird Ln, San Francisco, CA 94103</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Emergency Contact
                    </p>
                    <p>Sarah Rivers - +1 (555) 012-3456</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
                    Government_ID.pdf
                  </span>
                  <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
                    MBA_Certificate.pdf
                  </span>
                  <button className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700">
                    + Upload New
                  </button>
                </div>
              </div>
            </div>
          </article>

          <article className="rounded-xl bg-indigo-700 p-5 text-white shadow-sm">
            <h3 className="text-sm font-semibold">Job Details</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between border-b border-indigo-500/70 pb-2">
                <span className="text-indigo-100">Joined</span>
                <span>12 Mar 2021</span>
              </div>
              <div className="flex items-center justify-between border-b border-indigo-500/70 pb-2">
                <span className="text-indigo-100">Role</span>
                <span>Senior Designer</span>
              </div>
              <div className="flex items-center justify-between border-b border-indigo-500/70 pb-2">
                <span className="text-indigo-100">Manager</span>
                <span>Helena Hills</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-indigo-100">Type</span>
                <span className="rounded bg-indigo-500 px-2 py-1 text-xs">FULL-TIME</span>
              </div>
            </div>
          </article>
        </section>

        <section className="grid gap-5 xl:grid-cols-[2fr_1fr]">
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Attendance History</h3>
              <span className="text-xs text-slate-500">October 2023</span>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {attendanceDays.map((day) => (
                <div
                  key={day.date}
                  className={`rounded-lg border p-2 text-center ${
                    day.active
                      ? "border-indigo-700 bg-indigo-700 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}
                >
                  <p className="text-[10px]">{day.day}</p>
                  <p className="text-sm font-semibold">{day.date}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Today Log</p>
                <p className="mt-1 text-lg font-semibold text-slate-800">09:02 AM</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Mid Hours</p>
                <p className="mt-1 text-lg font-semibold text-slate-800">164.5</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Late Marks</p>
                <p className="mt-1 text-lg font-semibold text-rose-500">02</p>
              </div>
            </div>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700">Leave Balance</h3>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-2xl font-semibold text-slate-800">12</p>
                <p className="text-[11px] text-slate-400">SICK</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-800">08</p>
                <p className="text-[11px] text-slate-400">CASUAL</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-800">15</p>
                <p className="text-[11px] text-slate-400">PAID</p>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-xs text-slate-600">
              <div className="flex items-center justify-between rounded-md bg-slate-50 p-2">
                <span>Sick Leave</span>
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  APPROVED
                </span>
              </div>
              <div className="flex items-center justify-between rounded-md bg-slate-50 p-2">
                <span>Casual Leave</span>
                <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                  PENDING
                </span>
              </div>
              <div className="flex items-center justify-between rounded-md bg-slate-50 p-2">
                <span>Paid Leave</span>
                <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700">
                  REJECTED
                </span>
              </div>
            </div>
          </article>
        </section>

        {children ? <div className="rounded-xl bg-white p-5 shadow-sm">{children}</div> : null}
      </div>
    </section>
  );
}

export default RightMainSide;
