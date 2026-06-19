import SocketProvider from "@/components/sockets/Socket.Provider";
import UserDashboardOrgClientLayout from "./UserDashboardOrgClientLayout";
import { generateOrgStaticParams } from "@/lib/static-export";

export function generateStaticParams() {
  return generateOrgStaticParams();
}

export default function UserDashboardOrgLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserDashboardOrgClientLayout>
      <SocketProvider>{children}</SocketProvider>
    </UserDashboardOrgClientLayout>
  );
}
