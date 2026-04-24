"use client";
import LeftSideBar from "./LeftSideBar";
import RightMainSide from "./RightMainSide";
import Header from "./Header";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getOrganization } from "@/services/organization";

function ManagementDashboard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    useEffect(()=>{
      const token = localStorage.getItem("token");
      console.log("Token: ", token);
      if(!token){
        router.push("/login");
      }
      async function fetchOrganization(){
        const organization = await getOrganization(token as string);
        console.log("Organization: ", organization);
      }
      fetchOrganization();
    }, [])
  return (
    <main className="w-full relative">
      {/* Header  */}
    <Header></Header>

      {/* Main Content  */}
      <div className="flex w-full relative z-5">
        <LeftSideBar />
        <section className="flex-1">
          <RightMainSide children={children} />
        </section>
      </div>
    </main>
  );
}

export default ManagementDashboard;
