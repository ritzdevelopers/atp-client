import Button from "@/components/website/ui/Button";

export default function ContactPage() {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-[#0C123A]">Contact Us</h1>
        <p className="mt-2 text-sm text-slate-600">
          Send us a message and our team will get back to you shortly.
        </p>

        <form className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#0C123A]">
              Name
            </label>
            <input
              type="text"
              name="name"
              placeholder="Your name"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#C99237] focus:ring-2 focus:ring-[#C99237]/30"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#0C123A]">
              Email
            </label>
            <input
              type="email"
              name="email"
              placeholder="you@company.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#C99237] focus:ring-2 focus:ring-[#C99237]/30"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#0C123A]">
              Message
            </label>
            <textarea
              name="message"
              rows={5}
              placeholder="Write your message"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#C99237] focus:ring-2 focus:ring-[#C99237]/30"
            />
          </div>

          <Button type="submit">Send Message</Button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-[#0C123A]">Company Info</h2>
        <div className="mt-5 space-y-3 text-sm text-slate-600">
          <p>
            <span className="font-semibold text-[#0C123A]">Email:</span>{" "}
            support@attendanceportal.com
          </p>
          <p>
            <span className="font-semibold text-[#0C123A]">Phone:</span> +1 (800)
            123-4567
          </p>
          <p>
            <span className="font-semibold text-[#0C123A]">Address:</span> 221B
            Innovation Street, Suite 12
          </p>
        </div>
      </section>
    </div>
  );
}
