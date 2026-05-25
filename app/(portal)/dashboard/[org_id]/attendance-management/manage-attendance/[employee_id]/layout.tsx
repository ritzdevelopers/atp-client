import { generatePlaceholderStaticParams } from "@/lib/static-export";

export function generateStaticParams() {
  return generatePlaceholderStaticParams("employee_id");
}

export default function EmployeeAttendanceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
