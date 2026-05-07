import LeftSide from "@/components/super-admin/LeftSide";
import RightSide from "@/components/super-admin/RightSide";
export default function SuperAdminPanelLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <div className="flex min-h-screen bg-slate-50">
        <LeftSide />
        <RightSide>
            {children}
        </RightSide>
    </div>;
}