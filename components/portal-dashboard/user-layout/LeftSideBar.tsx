import { MdCalendarMonth, MdDashboard, MdOutlineSettings } from "react-icons/md";
import { BsPerson } from "react-icons/bs";
import { PiBagSimple } from "react-icons/pi";
import { LuFileSpreadsheet } from "react-icons/lu";
import { RiQuestionLine } from "react-icons/ri";

const navigationItems = [
  { id: "dashboard", label: "Dashboard", icon: MdDashboard, active: true },
  { id: "profile", label: "Personal Profile", icon: BsPerson, active: false },
  { id: "attendance", label: "Attendance", icon: PiBagSimple, active: false },
  { id: "leave", label: "Leave Management", icon: LuFileSpreadsheet, active: false },
];

function LeftSideBar() {
  return (
    <aside className="sticky top-0 flex h-screen w-[250px] flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-5">
        <h1 className="text-[17px] font-semibold text-slate-800">EnterpriseOne</h1>
        <p className="text-[11px] text-slate-400">Employee Portal</p>
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
    </aside>
  );
}

export default LeftSideBar;