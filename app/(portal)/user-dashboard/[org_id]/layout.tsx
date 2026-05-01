"use client";

import DraggableClock from "@/components/portal-dashboard/user-layout/DraggableClock";
import LeftSideBar from "@/components/portal-dashboard/user-layout/LeftSideBar";
import RightMainSide from "@/components/portal-dashboard/user-layout/RightMainSide";

function UserDashboardComponent({ children }: { children: React.ReactNode }) { 
    return (
        <main className="relative flex min-h-screen w-full overflow-x-hidden bg-slate-50">
            <DraggableClock />
            <LeftSideBar />
            <RightMainSide>{children}</RightMainSide>
        </main>
    )
}


export default function UserDashboardLayout({ children }: { children: React.ReactNode }) { 
    return <UserDashboardComponent>{children}</UserDashboardComponent>;
}