import Button from "@/components/website/ui/Button";
import Card from "@/components/website/ui/Card";

const features = [
  {
    title: "Admin Control",
    description:
      "Manage roles, approvals, and system access from one central dashboard.",
  },
  {
    title: "HR Management",
    description:
      "Handle employee profiles, attendance policies, and team workflows easily.",
  },
  {
    title: "Employee Tracking",
    description:
      "Track daily check-ins, work patterns, and attendance reports in real time.",
  },
  {
    title: "Secure System",
    description:
      "Protect your data with role-based access and secure activity monitoring.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-16 bg-[#FFFFFF]">
      <section className="rounded-3xl border border-slate-200 bg-[#FFFFFF] px-6 py-14 shadow-sm sm:px-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#C99237]">SaaS Onboarding</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight text-[#0C123A] sm:text-5xl">
          Smart Attendance Management for Modern Teams
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
          Simplify employee tracking, empower HR teams, and streamline your attendance workflows with a clean and scalable platform.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button href="/pricing">View Pricing</Button>
        </div>
      </section>

      <section>
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-[#0C123A]">Features</h2>
          <p className="mt-2 text-slate-600">Everything your organization needs for reliable attendance management.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Card
              key={feature.title}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
