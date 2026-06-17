import SyncConnectionShell from "@/components/sync-connection/SyncConnectionShell";

export default function SyncConnectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SyncConnectionShell>{children}</SyncConnectionShell>;
}
