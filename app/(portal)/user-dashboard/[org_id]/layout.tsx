import UserDashboardOrgClientLayout from "./UserDashboardOrgClientLayout";
import { generateOrgStaticParams } from "@/lib/static-export";

export function generateStaticParams() {
  return generateOrgStaticParams();
}

export default function UserDashboardOrgLayout({ children }: { children: React.ReactNode }) {
  return <UserDashboardOrgClientLayout>{children}</UserDashboardOrgClientLayout>;
}
