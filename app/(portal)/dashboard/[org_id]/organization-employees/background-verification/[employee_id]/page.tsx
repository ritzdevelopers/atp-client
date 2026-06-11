import {
  STATIC_EXPORT_PLACEHOLDER_ID,
  generateOrgScopedPlaceholderStaticParams,
} from "@/lib/static-export";
import { BackgroundVerificationEmployeeClientWithSuspense } from "./BackgroundVerificationEmployeeClient";

export function generateStaticParams() {
  return generateOrgScopedPlaceholderStaticParams(
    "employee_id",
    STATIC_EXPORT_PLACEHOLDER_ID,
  );
}

export default function BackgroundVerificationEmployeePage() {
  return <BackgroundVerificationEmployeeClientWithSuspense />;
}
