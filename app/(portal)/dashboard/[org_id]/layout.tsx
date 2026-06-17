import SocketProvider from "@/components/sockets/Socket.Provider";
import DashboardOrgClientLayout from "./DashboardOrgClientLayout";
import { generateOrgStaticParams } from "@/lib/static-export";

export function generateStaticParams() {
  return generateOrgStaticParams();
}

export default function DashboardOrgLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardOrgClientLayout>
      <SocketProvider>{children}</SocketProvider>
    </DashboardOrgClientLayout>
  );
}
