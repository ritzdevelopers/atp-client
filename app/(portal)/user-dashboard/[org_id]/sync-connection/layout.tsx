import SyncConnectionShell from "@/components/sync-connection/SyncConnectionShell";

export default function SyncConnectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-hidden">
      <SyncConnectionShell>{children}</SyncConnectionShell>
    </div>
  );
}
