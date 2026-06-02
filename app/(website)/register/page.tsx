"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import Button from "@/components/website/ui/Button";
import Input from "@/components/website/ui/Input";
import Loader from "@/components/website/ui/Loader";
import Modal from "@/components/website/ui/Modal";
import { type ApiError, registerUser } from "@/services/auth";

const planLabels: Record<string, string> = {
  basic: "Basic (Free)",
  medium: "Medium (₹499/mo)",
  pro: "Pro (₹999/mo)",
  proplus: "Pro+ (₹1999/mo)",
};

const getUserIdentifier = (payload: {
  id?: string | number;
  user_id?: string | number;
  owner_id?: string | number;
  user?: { id?: string | number; user_id?: string | number; owner_id?: string | number };
}) =>
  payload.owner_id ??
  payload.user_id ??
  payload.id ??
  payload.user?.owner_id ??
  payload.user?.user_id ??
  payload.user?.id;

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPlan = searchParams.get("plan") || "basic";
  const selectedPlanLabel = useMemo(
    () => planLabels[selectedPlan] || planLabels.basic,
    [selectedPlan],
  );

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const result = await registerUser(formData);
      if (result.status !== 200) {
        setErrorMessage("Something went wrong");
        return;
      }

      const userIdentifier = getUserIdentifier(result);

      if (typeof window !== "undefined" && userIdentifier) {
        sessionStorage.setItem("onboarding_owner_id", String(userIdentifier));
      }

      setShowSuccessModal(true);
    } catch (error) {
      const apiError = error as ApiError;

      if (apiError.status === 409) {
        setErrorMessage("User already exists");
      } else if (apiError.status === 400) {
        setErrorMessage("All fields required");
      } else {
        setErrorMessage("Something went wrong");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl">
      <section className="rounded-2xl border border-slate-200 bg-[#FFFFFF] p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-[#0C123A]">Register</h1>
        <p className="mt-2 text-sm text-slate-600">Create your account to start using the portal.</p>
        <p className="mt-2 rounded-lg bg-[#C99237]/10 px-3 py-2 text-sm font-medium text-[#0C123A]">
          Selected plan: {selectedPlanLabel}
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <Input
            label="Name"
            name="name"
            placeholder="Enter your name"
            value={formData.name}
            onChange={(value) => setFormData((prev) => ({ ...prev, name: value }))}
            required
          />
          <Input
            label="Email"
            name="email"
            type="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={(value) => setFormData((prev) => ({ ...prev, email: value }))}
            required
          />
          <Input
            label="Password"
            name="password"
            type="password"
            placeholder="Enter password"
            value={formData.password}
            onChange={(value) => setFormData((prev) => ({ ...prev, password: value }))}
            required
          />
          <Input
            label="Phone"
            name="phone"
            type="tel"
            placeholder="Enter phone number"
            value={formData.phone}
            onChange={(value) => setFormData((prev) => ({ ...prev, phone: value }))}
            required
          />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loader text="Creating Account..." /> : "Create Account"}
          </Button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-[#C99237] hover:underline">
            Login
          </Link>
        </p>
      </section>

      <Modal
        isOpen={showSuccessModal}
        title="Account Created"
        message="Account created successfully"
        buttonLabel="Continue"
        onClose={() => {
          setShowSuccessModal(false);
          router.push("/create-organization");
        }}
      />

      <Modal
        isOpen={Boolean(errorMessage)}
        title="Error"
        message={errorMessage}
        buttonLabel="Close"
        onClose={() => setErrorMessage("")}
      />
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-xl p-8 text-center text-sm text-slate-500">Loading...</div>}>
      <RegisterPageContent />
    </Suspense>
  );
}
