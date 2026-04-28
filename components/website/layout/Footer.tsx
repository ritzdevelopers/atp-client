import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-16 bg-[#0C123A] text-white">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-2 md:items-center">
        <div>
          <h3 className="text-lg font-semibold">Attendance Management Portal</h3>
          <p className="mt-2 text-sm text-slate-200">
            Streamline attendance, improve HR operations, and keep your workforce
            data secure.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 md:justify-end">
          <Link href="/about" className="text-sm text-slate-100 hover:text-[#C99237]">
            About
          </Link>
          <Link
            href="/contact"
            className="text-sm text-slate-100 hover:text-[#C99237]"
          >
            Contact
          </Link>
          <Link
            href="/pricing"
            className="text-sm text-slate-100 hover:text-[#C99237]"
          >
            Plans
          </Link>
        </div>
      </div>
      <div className="border-t border-slate-700 px-4 py-4 text-center text-xs text-slate-300">
        Copyright {new Date().getFullYear()} Attendance Management Portal. All
        rights reserved.
      </div>
    </footer>
  );
}
