"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import Button from "@/components/website/ui/Button";
import Input from "@/components/website/ui/Input";
import Loader from "@/components/website/ui/Loader";
import Modal from "@/components/website/ui/Modal";
import { type ApiError } from "@/services/auth";
import { createOrganization } from "@/services/organization";

export default function CreateOrganizationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orgData, setOrgData] = useState({
    organization_name: "",
    organization_email: "",
    organization_phone: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const ownerId = useMemo(() => {
    const ownerFromQuery = searchParams.get("owner_id");
    const ownerFromLocalStorage =
      typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
    const ownerFromSession =
      typeof window !== "undefined" ? sessionStorage.getItem("onboarding_owner_id") : null;
    return ownerFromQuery || ownerFromLocalStorage || ownerFromSession || "";
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    if (!ownerId) {
      setErrorMessage("User not found");
      setIsSubmitting(false);
      return;
    }

    try {
      await createOrganization({
        organization_name: orgData.organization_name,
        owner_id: ownerId,
        organization_email: orgData.organization_email,
        organization_phone: orgData.organization_phone,
      });
      setShowSuccessModal(true);
    } catch (error) {
      const apiError = error as ApiError;

      if (apiError.status === 400) {
        setErrorMessage("All fields are required");
      } else if (apiError.status === 404) {
        setErrorMessage("User not found");
      } else {
        setErrorMessage("Failed to create organization");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-xl items-center justify-center">
      <section className="w-full rounded-2xl border border-slate-200 bg-[#FFFFFF] p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-[#0C123A]">Create Your Organization</h1>
        <p className="mt-2 text-sm text-slate-600">Set up your organization profile to continue onboarding.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <Input
            label="Organization Name"
            name="organization_name"
            placeholder="Enter organization name"
            value={orgData.organization_name}
            onChange={(value) => setOrgData((prev) => ({ ...prev, organization_name: value }))}
            required
          />
          <Input
            label="Organization Email"
            name="organization_email"
            type="email"
            placeholder="Enter organization email"
            value={orgData.organization_email}
            onChange={(value) => setOrgData((prev) => ({ ...prev, organization_email: value }))}
            required
          />
          <Input
            label="Organization Phone"
            name="organization_phone"
            type="tel"
            placeholder="Enter organization phone"
            value={orgData.organization_phone}
            onChange={(value) => setOrgData((prev) => ({ ...prev, organization_phone: value }))}
            required
          />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loader text="Creating Organization..." /> : "Create Organization"}
          </Button>
        </form>
      </section>

      <Modal
        isOpen={showSuccessModal}
        title="Organization Created"
        message="Organization created successfully"
        buttonLabel="Continue"
        onClose={() => {
          setShowSuccessModal(false);
          router.push("/");
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
