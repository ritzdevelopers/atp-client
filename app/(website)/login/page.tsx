"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import Button from "@/components/website/ui/Button";
import Input from "@/components/website/ui/Input";
import Loader from "@/components/website/ui/Loader";
import Modal from "@/components/website/ui/Modal";
import { type ApiError, loginUser } from "@/services/auth";

const LOGIN_REDIRECT_TO_CREATE_ORG_MESSAGES = new Set([
  "error fetching user role name",
  "user role not found",
  "error fetching user role",
  "user role name not found",
]);

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const result = await loginUser(formData);
      localStorage.setItem("token", result.token);
      router.push("/");
    } catch (error) {
      const apiError = error as ApiError;
      const message = (apiError.message || "").trim().toLowerCase();

      if (LOGIN_REDIRECT_TO_CREATE_ORG_MESSAGES.has(message)) {
        const ownerId = apiError.user_id;
        if (typeof window !== "undefined" && ownerId != null && ownerId !== "") {
          sessionStorage.setItem("onboarding_owner_id", String(ownerId));
          localStorage.setItem("user_id", String(ownerId));
        }
        router.replace("/create-organization");
        return;
      }

      if (apiError.status === 401) {
        setErrorMessage("Invalid credentials");
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
    <div className="mx-auto flex w-full max-w-xl items-center justify-center">
      <section className="w-full rounded-2xl border border-slate-200 bg-[#FFFFFF] p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-[#0C123A]">Login</h1>
        <p className="mt-2 text-sm text-slate-600">Sign in to continue managing your portal.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
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
            placeholder="Enter your password"
            value={formData.password}
            onChange={(value) => setFormData((prev) => ({ ...prev, password: value }))}
            required
          />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loader text="Logging in..." /> : "Login"}
          </Button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          New here?{" "}
          <Link href="/register" className="font-medium text-[#C99237] hover:underline">
            Create an account
          </Link>
        </p>
      </section>

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
