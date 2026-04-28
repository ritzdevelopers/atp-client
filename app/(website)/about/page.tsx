export default function AboutPage() {
  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-4xl font-bold text-[#0C123A]">About Us</h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Attendance Management Portal is a modern SaaS product designed to help
          companies track attendance accurately, reduce manual HR effort, and make
          operations more transparent for leadership teams.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#0C123A]">Mission</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Make attendance operations simple, reliable, and scalable for every
            organization.
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#0C123A]">Vision</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Be the trusted workforce attendance platform for HR and operations
            teams worldwide.
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#0C123A]">Purpose</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Deliver clarity and accountability through secure, data-driven
            attendance workflows.
          </p>
        </article>
      </section>
    </div>
  );
}
