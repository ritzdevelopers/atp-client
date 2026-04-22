import Button from "@/components/website/ui/Button";
import Card from "@/components/website/ui/Card";

const plans = [
  {
    key: "basic",
    name: "Basic",
    price: "Free",
    features: ["Up to 10 employees", "Daily attendance logs", "Email support"],
  },
  {
    key: "medium",
    name: "Medium",
    price: "₹499/mo",
    features: ["Up to 50 employees", "Shift tracking", "Weekly reports"],
  },
  {
    key: "pro",
    name: "Pro",
    price: "₹999/mo",
    features: ["Up to 200 employees", "Advanced analytics", "Priority support"],
  },
  {
    key: "proplus",
    name: "Pro+",
    price: "₹1999/mo",
    features: ["Unlimited employees", "Custom workflows", "Dedicated success manager"],
  },
];

export default function PricingPage() {
  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-[#FFFFFF] p-8 shadow-sm">
        <h1 className="text-4xl font-bold text-[#0C123A]">Choose Your Plan</h1>
        <p className="mt-3 text-slate-600">Pick the plan that fits your team and get started in minutes.</p>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => (
          <Card key={plan.key} title={plan.name} highlight={plan.key === "pro"}>
            <p className="text-2xl font-bold text-[#0C123A]">{plan.price}</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              {plan.features.map((feature) => (
                <li key={feature}>- {feature}</li>
              ))}
            </ul>
            <Button href={`/register?plan=${plan.key}`} className="mt-6 w-full">
              Choose Plan
            </Button>
          </Card>
        ))}
      </section>
    </div>
  );
}
