import LeftSideBar from "./LeftSideBar";
import RightMainSide from "./RightMainSide";

function UserDashboard({ children }: { children: React.ReactNode }) {
    return (
        <main className="flex w-full">
            <LeftSideBar />
            <section className="flex-1">
                <RightMainSide children={children}/>
            </section>
        </main>
    )
}

export default UserDashboard;