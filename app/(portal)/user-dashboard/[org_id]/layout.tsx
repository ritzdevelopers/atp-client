import LeftSideBar from "@/components/portal-dashboard/user-layout/LeftSideBar";
import RightMainSide from "@/components/portal-dashboard/user-layout/RightMainSide";

function UserDashboardComponent({ children }: { children: React.ReactNode }) { 
    return (
        <main className="relative flex min-h-screen w-full overflow-x-hidden bg-slate-50">
            <LeftSideBar />
            <RightMainSide>{children}</RightMainSide>
        </main>
    )
}


export default function UserDashboardLayout({ children }: { children: React.ReactNode }) { 
    return <UserDashboardComponent>{children}</UserDashboardComponent>;
}