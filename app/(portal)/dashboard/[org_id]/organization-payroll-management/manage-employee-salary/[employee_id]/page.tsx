import {
  STATIC_EXPORT_PLACEHOLDER_ID,
  generateOrgScopedPlaceholderStaticParams,
} from "@/lib/static-export";
import { EmployeeSalaryPageClientWithSuspense } from "./EmployeeSalaryPageClient";

export function generateStaticParams() {
  return generateOrgScopedPlaceholderStaticParams(
    "employee_id",
    STATIC_EXPORT_PLACEHOLDER_ID,
  );
}

export default function EmployeeSalaryDetailPage() {
  return <EmployeeSalaryPageClientWithSuspense />;
}
