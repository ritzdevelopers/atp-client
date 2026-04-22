import Button from "@/components/website/ui/Button";
import Card from "@/components/website/ui/Card";

const plans = [
  {
    name: "Free Tier",
    price: "$0/mo",
    features: ["Up to 10 users", "Basic attendance logs", "Email support"],
  },
  {
    name: "Basic Plan",
    price: "$19/mo",
    features: ["Up to 50 users", "HR dashboard", "Monthly reports"],
  },
  {
    name: "Pro Plan",
    price: "$49/mo",
    features: [
      "Up to 250 users",
      "Advanced analytics",
      "Role-based controls",
      "Priority support",
    ],
    highlight: true,
  },
  {
    name: "Pro+",
    price: "$99/mo",
    features: ["Unlimited users", "Custom policy engine", "Dedicated onboarding"],
  },
];

export default function CheckoutPage() {
  return (
    <div>
      <section className="mb-8">
        <h1 className="text-4xl font-bold text-[#0C123A]">Checkout Plans</h1>
        <p className="mt-3 text-slate-600">
          Choose a plan that fits your team size and growth stage.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            title={plan.name}
            description={plan.highlight ? "Most Popular" : undefined}
            highlight={Boolean(plan.highlight)}
          >
            <p className="text-3xl font-bold text-[#0C123A]">{plan.price}</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              {plan.features.map((feature) => (
                <li key={feature}>- {feature}</li>
              ))}
            </ul>
            <div className="mt-6">
              <Button className="w-full">Choose Plan</Button>
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
