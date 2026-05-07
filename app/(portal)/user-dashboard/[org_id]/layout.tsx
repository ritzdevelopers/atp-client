"use client";

import DraggableClock from "@/components/portal-dashboard/user-layout/DraggableClock";
import LeftSideBar from "@/components/portal-dashboard/user-layout/LeftSideBar";
import RightMainSide from "@/components/portal-dashboard/user-layout/RightMainSide";

function UserDashboardComponent({ children }: { children: React.ReactNode }) { 
    return (
        <main className="relative min-h-screen w-full overflow-x-hidden bg-slate-50">
            <DraggableClock />
            <div className="fixed left-0 top-0 z-30 h-screen">
                <LeftSideBar />
            </div>
            <div className="w-full pl-[250px]">
                <RightMainSide>{children}</RightMainSide>
            </div>
        </main>
    )
}


export default function UserDashboardLayout({ children }: { children: React.ReactNode }) { 
    return <UserDashboardComponent>{children}</UserDashboardComponent>;
}